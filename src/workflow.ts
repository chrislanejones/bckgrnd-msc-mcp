import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, isAbsolute } from 'node:path';
import { z } from 'zod';
import { findTrack, unknownTrackMessage } from './library.js';
import { durationSeconds, levelsFor, loudnessLufs, mixUnderVoice, SILENCE_LUFS } from './mix.js';
import { outputProblem } from './paths.js';
import { renderTrack } from './render.js';
import { mixInputShape, withDefaults } from './settings.js';
import { resolveSettings } from './presets.js';
import type { JobOptions } from './jobs.js';

export const mixInputSchema = z.object({ ...mixInputShape, voice_path: z.string().min(1) });
export type MixInput = z.input<typeof mixInputSchema>;

export async function mixNarration(input: MixInput, job: JobOptions = {}) {
  const parsed = mixInputSchema.parse(input);
  const args = { ...parsed, ...withDefaults(resolveSettings(parsed)) };
  if (Boolean(args.track) === Boolean(args.music_path)) throw new Error('Give exactly one of track or music_path, directly or in a preset.');
  if (!isAbsolute(args.voice_path) || (args.music_path && !isAbsolute(args.music_path))) throw new Error('Input paths must be absolute.');
  if (!existsSync(args.voice_path)) throw new Error(`voice_path not found: ${args.voice_path}`);
  if (args.music_path && !existsSync(args.music_path)) throw new Error(`music_path not found: ${args.music_path}`);
  if (args.true_peak_dbfs !== undefined && args.final_lufs === undefined) throw new Error('Set final_lufs when specifying a true-peak ceiling.');
  if (args.music_path && args.arrangement === 'evolving') throw new Error('Evolving arrangements require a synthesized track, not music_path.');
  const track = args.track ? findTrack(args.track) : undefined;
  if (args.track && !track) throw new Error(unknownTrackMessage(args.track));
  const musicName = track ? track.id : basename(args.music_path!, extname(args.music_path!));
  const outputPath = args.output_path ?? join(dirname(args.voice_path), `${basename(args.voice_path, extname(args.voice_path))}.with-${musicName}.mp3`);
  const problem = outputProblem(outputPath, ['.mp3', '.wav'], args.overwrite);
  if (problem) throw new Error(problem);
  let scratch: string | undefined;
  try {
    const voiceSeconds = await durationSeconds(args.voice_path, job);
    const totalSeconds = args.lead_in_seconds + voiceSeconds + args.tail_seconds;
    if (totalSeconds > 3600) throw new Error('The limit including lead-in and tail is 3600 seconds.');
    let musicPath = args.music_path!;
    if (track) {
      scratch = mkdtempSync(join(tmpdir(), 'bckgrnd-mix-'));
      musicPath = join(scratch, `${track.id}.wav`);
      await renderTrack({ ...job, onProgress: async (p, message) => job.onProgress?.(p * 0.6, message), track, seconds: totalSeconds, outputPath: musicPath, cut: args.cut, arrangement: args.arrangement, fadeInSeconds: 1, fadeOutSeconds: 0 });
    }
    await job.onProgress?.(65, 'Measuring voice and music');
    const [voiceLufs, musicLufs] = await Promise.all([loudnessLufs(args.voice_path, job), loudnessLufs(musicPath, job)]);
    if (voiceLufs <= SILENCE_LUFS) throw new Error(`${args.voice_path} is silent, so there is no voice level to match.`);
    const levels = levelsFor(voiceLufs, musicLufs, args.loudness_lufs, args.music_db);
    await job.onProgress?.(80, 'Mixing narration and music');
    const measured = await mixUnderVoice({ ...job, voicePath: args.voice_path, musicPath, outputPath, totalSeconds,
      leadInSeconds: args.lead_in_seconds, tailSeconds: args.tail_seconds, ...levels,
      duck: args.duck, ducking: args.ducking, overwrite: args.overwrite, finalLufs: args.final_lufs, truePeakDbfs: args.true_peak_dbfs,
    });
    await job.onProgress?.(100, 'Mix complete');
    return {
      ...measured, path: outputPath, voice_seconds: Math.round(voiceSeconds * 10) / 10, total_seconds: Math.round(totalSeconds * 10) / 10,
      music: track ? track.name : args.music_path!, music_db: args.music_db, loudness_lufs: args.loudness_lufs,
      voice_lufs: voiceLufs, music_lufs: musicLufs, voice_gain_db: levels.voiceGainDb, music_gain_db: levels.musicGainDb,
      duck: args.duck, ducking: args.ducking, arrangement: args.arrangement, cut: args.cut ?? [],
      lead_in_seconds: args.lead_in_seconds, tail_seconds: args.tail_seconds,
      ...(args.preset ? { preset: args.preset } : {}),
      ...(args.final_lufs !== undefined ? { final_lufs: args.final_lufs, true_peak_dbfs: args.true_peak_dbfs ?? -1.5,
        mastering_target_met: Math.abs(measured.output_lufs - args.final_lufs) <= 0.7 && measured.output_true_peak_dbfs <= (args.true_peak_dbfs ?? -1.5) + 0.1 } : {}),
    };
  } finally { if (scratch) rmSync(scratch, { recursive: true, force: true }); }
}
