/**
 * Lay a music bed under a narration with ffmpeg.
 *
 * Levels are set by measurement, not by guesswork. Both files are measured in
 * LUFS (EBU R128 integrated loudness, the scale podcasts and streaming services
 * normalize to), the voice is brought to a target loudness, and the music is set
 * a fixed number of LU below the voice. A quiet TTS file and a hot podcast take
 * end up with the same balance.
 *
 * The voice is then the key input to a sidechain compressor on the music, so the
 * bed dips while someone is talking and comes back up in the pauses between
 * paragraphs. Because the voice has already been brought to its target, the
 * compressor's threshold means the same thing for every input. The music starts
 * a moment before the voice and rings out after it, then fades.
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const run = promisify(execFile);

const ffmpeg = () => process.env.FFMPEG_PATH || 'ffmpeg';
const ffprobe = () => process.env.FFPROBE_PATH || 'ffprobe';

const INSTALL_HINT =
  'Install it and try again: macOS "brew install ffmpeg", Debian/Ubuntu "sudo apt install ffmpeg", ' +
  'Windows "winget install Gyan.FFmpeg". Or point FFMPEG_PATH and FFPROBE_PATH at the binaries.';

/** ebur128 reports this for digital silence; anything at or below it has no level to match. */
export const SILENCE_LUFS = -70;

export class MissingFfmpegError extends Error {}

async function tool(cmd: string, args: string[]): Promise<{ stdout: string; stderr: string }> {
  try {
    return await run(cmd, args, { maxBuffer: 64 * 1024 * 1024 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new MissingFfmpegError(`"${cmd}" isn't installed or isn't on PATH. ${INSTALL_HINT}`, { cause: error });
    }
    const stderr = String((error as { stderr?: string }).stderr ?? '').trim();
    const tail = stderr.split('\n').slice(-4).join('\n');
    throw new Error(`${cmd} failed: ${tail || (error as Error).message}`, { cause: error });
  }
}

/** Length of any file ffmpeg can read, in seconds. */
export async function durationSeconds(path: string): Promise<number> {
  const { stdout } = await tool(ffprobe(), ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path]);
  const seconds = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(seconds) || seconds <= 0) {
    throw new Error(`Couldn't read a duration from ${path}. Is it an audio file?`);
  }
  return seconds;
}

/** Integrated loudness of a file, in LUFS. */
export async function loudnessLufs(path: string): Promise<number> {
  const { stderr } = await tool(ffmpeg(), ['-hide_banner', '-nostats', '-nostdin', '-i', path, '-af', 'ebur128=framelog=quiet', '-f', 'null', '-']);
  const lufs = parseIntegratedLoudness(stderr);
  if (lufs === null) throw new Error(`Couldn't measure the loudness of ${path}.`);
  return lufs;
}

/** Pull "I: -19.6 LUFS" out of ebur128's summary. The last one is the whole file. */
export function parseIntegratedLoudness(log: string): number | null {
  const matches = [...log.matchAll(/^\s*I:\s+(-?\d+(?:\.\d+)?)\s+LUFS/gm)];
  const last = matches.at(-1);
  return last ? Number.parseFloat(last[1]!) : null;
}

export interface Levels {
  /** Gain on the voice, in dB, to land it on the target. */
  voiceGainDb: number;
  /** Gain on the music, in dB, to land it `musicDb` below the voice. */
  musicGainDb: number;
}

/**
 * The two gains that put the voice at `targetLufs` and the music `musicDb` LU
 * under it. Silent music is left alone: there's no level to match.
 */
export function levelsFor(voiceLufs: number, musicLufs: number, targetLufs: number, musicDb: number): Levels {
  const round = (v: number) => Math.round(v * 10) / 10;
  const voiceGainDb = voiceLufs > SILENCE_LUFS ? targetLufs - voiceLufs : 0;
  const musicGainDb = musicLufs > SILENCE_LUFS ? targetLufs + musicDb - musicLufs : 0;
  return { voiceGainDb: round(voiceGainDb), musicGainDb: round(musicGainDb) };
}

export interface MixOptions extends Levels {
  voicePath: string;
  musicPath: string;
  outputPath: string;
  /** Total length of the result: lead-in + voice + tail. */
  totalSeconds: number;
  leadInSeconds: number;
  tailSeconds: number;
  duck: boolean;
  overwrite: boolean;
}

type GraphOptions = Pick<MixOptions, 'totalSeconds' | 'leadInSeconds' | 'tailSeconds' | 'voiceGainDb' | 'musicGainDb' | 'duck'>;

/** The `-filter_complex` graph. Exported so the tests can pin it. */
export function mixGraph(o: GraphOptions): string {
  const leadMs = Math.round(o.leadInSeconds * 1000);
  const fadeStart = Math.max(0, o.totalSeconds - o.tailSeconds).toFixed(3);
  const fadeDur = Math.max(0.01, o.tailSeconds).toFixed(3);
  const fmt = 'aformat=sample_fmts=fltp:sample_rates=48000:channel_layouts=stereo';
  const voice = `[0:a]${fmt},volume=${o.voiceGainDb}dB,adelay=delays=${leadMs}:all=1,apad[v]`;
  const bed = `[1:a]${fmt},volume=${o.musicGainDb}dB,afade=t=out:st=${fadeStart}:d=${fadeDur}[m]`;
  // The limiter only catches the odd peak the gain pushed over; levels come from the gains.
  const out = `amix=inputs=2:duration=longest:normalize=0,alimiter=limit=0.95[out]`;
  if (!o.duck) return [voice, bed, `[v][m]${out}`].join(';');
  return [
    voice,
    `[v]asplit=2[vkey][vout]`,
    bed,
    // With the voice at its target, this threshold sits under speech and over room tone.
    `[m][vkey]sidechaincompress=threshold=0.02:ratio=6:attack=30:release=600[md]`,
    `[vout][md]${out}`,
  ].join(';');
}

export async function mixUnderVoice(o: MixOptions): Promise<void> {
  const codec = o.outputPath.toLowerCase().endsWith('.wav') ? ['-c:a', 'pcm_s16le'] : ['-c:a', 'libmp3lame', '-q:a', '2'];
  await tool(ffmpeg(), [
    '-hide_banner',
    '-nostdin',
    o.overwrite ? '-y' : '-n',
    '-i', o.voicePath,
    // Loop the music, so a bed shorter than the voice keeps going; -t cuts it.
    '-stream_loop', '-1',
    '-i', o.musicPath,
    '-filter_complex', mixGraph(o),
    '-map', '[out]',
    '-t', o.totalSeconds.toFixed(3),
    '-ar', '48000',
    ...codec,
    o.outputPath,
  ]);
}
