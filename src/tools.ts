import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { findTrack, listTracks, STEMS, unknownTrackMessage } from './library.js';
import { durationSeconds, levelsFor, loudnessLufs, mixUnderVoice, SILENCE_LUFS } from './mix.js';
import { defaultOutDir, outputProblem } from './paths.js';
import { renderTrack } from './render.js';

const MAX_SECONDS = 3600;

const trackSchema = z.object({
  id: z.string(),
  name: z.string(),
  section: z.string(),
  style: z.string(),
  bpm: z.number(),
  kind: z.string(),
  mood: z.string(),
  energy: z.number(),
  good_for: z.array(z.string()),
});

function fail(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: `Error: ${message}` }] };
}

function ok<T extends Record<string, unknown>>(text: string, structured: T): CallToolResult {
  return { content: [{ type: 'text', text }], structuredContent: structured };
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function registerTools(server: McpServer): void {
  server.registerTool(
    'bckgrnd_list_tracks',
    {
      title: 'List bckgrnd-msc tracks',
      description: `List the tracks bckgrnd-msc can render, with tempo, mood, energy and what each suits. Use it to pick music that fits the content being read.

Every track is a 16-bar loop with eight stems: ${STEMS.join(', ')}. Energy runs 1 (barely there) to 5 (wants attention). Under dense speech, stay at energy 1-2; the Lofi tracks are energy 1.

Args:
  - section ('EDM' | 'Lofi' | 'Breaks', optional): only list one section
  - max_energy (1-5, optional): only list tracks at or below this energy

Returns: { tracks: [{ id, name, section, style, bpm, kind, mood, energy, good_for }], stems: string[] }`,
      inputSchema: {
        section: z.enum(['EDM', 'Lofi', 'Breaks']).optional().describe('Only list tracks from this section'),
        max_energy: z.number().int().min(1).max(5).optional().describe('Only list tracks at or below this energy'),
      },
      outputSchema: {
        tracks: z.array(trackSchema),
        stems: z.array(z.string()),
      },
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ section, max_energy }) => {
      const tracks = listTracks().filter(
        (t) => (!section || t.section === section) && (!max_energy || t.energy <= max_energy),
      );
      const lines = ['| id | name | style | bpm | energy | mood | good for |', '|---|---|---|---|---|---|---|'];
      for (const t of tracks) {
        lines.push(`| ${t.id} | ${t.name} | ${t.style} | ${t.bpm} | ${t.energy} | ${t.mood} | ${t.good_for.join(', ')} |`);
      }
      lines.push('', `Stems: ${STEMS.join(', ')}`);
      return ok(lines.join('\n'), { tracks, stems: [...STEMS] });
    },
  );

  server.registerTool(
    'bckgrnd_render_track',
    {
      title: 'Render a bckgrnd-msc track to WAV',
      description: `Render a track to a 48 kHz 16-bit stereo WAV file of any length. The 16-bar song loops until the time is up, then fades out.

Rendering runs about 20x faster than real time: a 7-minute bed takes around 20 seconds.

Args:
  - track (string): track id or name from bckgrnd_list_tracks, e.g. "rain"
  - seconds (number): length, 1-${MAX_SECONDS}
  - cut (string[], optional): stems to silence, e.g. ["kick", "clap"] for a softer bed
  - fade_in_seconds (number, default 1), fade_out_seconds (number, default 4)
  - output_path (string, optional): absolute path ending in .wav. Default: a file in BCKGRND_MSC_OUT_DIR or the system temp folder
  - overwrite (boolean, default false): replace output_path if it exists

Returns: { path, track, bpm, seconds, sample_rate, cut, peak_dbfs, render_ms }

Use bckgrnd_mix_under_voice instead when the music is going under a narration; it renders the right length itself.`,
      inputSchema: {
        track: z.string().min(1).describe('Track id or name, e.g. "rain"'),
        seconds: z.number().min(1).max(MAX_SECONDS).describe('Length of the WAV in seconds'),
        cut: z.array(z.enum(STEMS)).optional().describe('Stems to silence for the whole take'),
        fade_in_seconds: z.number().min(0).max(30).default(1).describe('Fade-in length'),
        fade_out_seconds: z.number().min(0).max(60).default(4).describe('Fade-out length'),
        output_path: z.string().optional().describe('Absolute path ending in .wav'),
        overwrite: z.boolean().default(false).describe('Replace output_path if it already exists'),
      },
      outputSchema: {
        path: z.string(),
        track: z.string(),
        bpm: z.number(),
        seconds: z.number(),
        sample_rate: z.number(),
        cut: z.array(z.string()),
        peak_dbfs: z.number(),
        render_ms: z.number(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      const track = findTrack(args.track);
      if (!track) return fail(unknownTrackMessage(args.track));
      const cutTag = args.cut?.length ? `-no-${[...new Set(args.cut)].join('-')}` : '';
      const outputPath = args.output_path ?? join(defaultOutDir(), `${track.id}-${Math.round(args.seconds)}s${cutTag}.wav`);
      const problem = outputProblem(outputPath, ['.wav'], args.overwrite || !args.output_path);
      if (problem) return fail(problem);
      try {
        const result = await renderTrack({
          track,
          seconds: args.seconds,
          outputPath,
          cut: args.cut,
          fadeInSeconds: args.fade_in_seconds,
          fadeOutSeconds: args.fade_out_seconds,
          overwrite: args.overwrite || !args.output_path,
        });
        const cutNote = result.cut.length ? `, cut: ${result.cut.join(', ')}` : '';
        return ok(
          `Rendered ${result.track} (${result.bpm} bpm${cutNote}), ${result.seconds.toFixed(1)} s, peak ${result.peak_dbfs} dBFS, in ${result.render_ms} ms.\n${result.path}`,
          { ...result },
        );
      } catch (error) {
        return fail(errorText(error));
      }
    },
  );

  server.registerTool(
    'bckgrnd_mix_under_voice',
    {
      title: 'Mix music under a narration',
      description: `Lay a music bed under a voice recording (a TTS MP3, a podcast take, any audio ffmpeg reads). The music starts a moment before the voice, dips while the voice is talking, and fades out after it. Needs ffmpeg and ffprobe on PATH.

Levels are measured, not guessed: both files are measured in LUFS, the voice is brought to loudness_lufs, and the music is set music_db LU below the voice. The same settings give the same balance whether the voice file is quiet or hot.

Give exactly one of:
  - track (string): a bckgrnd-msc track id or name. It's rendered to the right length automatically. Pick one with bckgrnd_list_tracks to suit the content.
  - music_path (string): an absolute path to your own music file. It loops if it's shorter than the voice.

Args:
  - voice_path (string): absolute path to the narration
  - music_db (number, default -14): music loudness relative to the voice, in LU. -18 to -22 for dense or technical reading, -10 to -12 for light content where the music is part of the feel
  - loudness_lufs (number, default -16): loudness of the voice in the result. -16 is the usual spoken-word and podcast level; -14 is louder, -19 quieter
  - duck (boolean, default true): turn the music down further while the voice is talking
  - cut (string[], optional, track only): stems to silence, e.g. ["lead"] so a melody doesn't fight the words
  - lead_in_seconds (number, default 2), tail_seconds (number, default 3)
  - output_path (string, optional): absolute path ending in .mp3 or .wav. Default: next to the voice file, named <voice>.with-<track>.mp3
  - overwrite (boolean, default false)

Returns: { path, voice_seconds, total_seconds, music, music_db, loudness_lufs, voice_lufs, music_lufs, voice_gain_db, music_gain_db, duck }`,
      inputSchema: {
        voice_path: z.string().min(1).describe('Absolute path to the narration audio'),
        track: z.string().optional().describe('bckgrnd-msc track id or name, e.g. "rain"'),
        music_path: z.string().optional().describe('Absolute path to your own music file instead of a track'),
        music_db: z.number().min(-40).max(0).default(-14).describe('Music loudness relative to the voice, in LU'),
        loudness_lufs: z.number().min(-30).max(-9).default(-16).describe('Loudness of the voice in the result, in LUFS'),
        duck: z.boolean().default(true).describe('Dip the music while the voice talks'),
        cut: z.array(z.enum(STEMS)).optional().describe('Stems to silence when rendering a track'),
        lead_in_seconds: z.number().min(0).max(30).default(2).describe('Music before the voice starts'),
        tail_seconds: z.number().min(0).max(30).default(3).describe('Music after the voice ends, fading out'),
        output_path: z.string().optional().describe('Absolute path ending in .mp3 or .wav'),
        overwrite: z.boolean().default(false).describe('Replace output_path if it already exists'),
      },
      outputSchema: {
        path: z.string(),
        voice_seconds: z.number(),
        total_seconds: z.number(),
        music: z.string(),
        music_db: z.number(),
        loudness_lufs: z.number(),
        voice_lufs: z.number(),
        music_lufs: z.number(),
        voice_gain_db: z.number(),
        music_gain_db: z.number(),
        duck: z.boolean(),
      },
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async (args) => {
      if (Boolean(args.track) === Boolean(args.music_path)) {
        return fail('Give exactly one of track or music_path.');
      }
      if (!existsSync(args.voice_path)) return fail(`voice_path not found: ${args.voice_path}`);
      if (args.music_path && !existsSync(args.music_path)) return fail(`music_path not found: ${args.music_path}`);
      const track = args.track ? findTrack(args.track) : undefined;
      if (args.track && !track) return fail(unknownTrackMessage(args.track));

      const musicName = track ? track.id : basename(args.music_path!, extname(args.music_path!));
      const outputPath =
        args.output_path ??
        join(dirname(args.voice_path), `${basename(args.voice_path, extname(args.voice_path))}.with-${musicName}.mp3`);
      const problem = outputProblem(outputPath, ['.mp3', '.wav'], args.overwrite);
      if (problem) return fail(problem);

      let scratch: string | null = null;
      try {
        const voiceSeconds = await durationSeconds(args.voice_path);
        const totalSeconds = args.lead_in_seconds + voiceSeconds + args.tail_seconds;
        if (totalSeconds > MAX_SECONDS) {
          return fail(`The voice is ${Math.round(voiceSeconds)} s; the limit with lead-in and tail is ${MAX_SECONDS} s.`);
        }

        let musicPath = args.music_path!;
        if (track) {
          scratch = mkdtempSync(join(tmpdir(), 'bckgrnd-mix-'));
          musicPath = join(scratch, `${track.id}.wav`);
          // The fade-out is ffmpeg's job here, timed against the voice.
          await renderTrack({ track, seconds: totalSeconds, outputPath: musicPath, cut: args.cut, fadeInSeconds: 1, fadeOutSeconds: 0 });
        }

        const [voiceLufs, musicLufs] = await Promise.all([loudnessLufs(args.voice_path), loudnessLufs(musicPath)]);
        if (voiceLufs <= SILENCE_LUFS) return fail(`${args.voice_path} is silent, so there's no level to match the music to.`);
        const levels = levelsFor(voiceLufs, musicLufs, args.loudness_lufs, args.music_db);

        await mixUnderVoice({
          voicePath: args.voice_path,
          musicPath,
          outputPath,
          totalSeconds,
          leadInSeconds: args.lead_in_seconds,
          tailSeconds: args.tail_seconds,
          ...levels,
          duck: args.duck,
          overwrite: args.overwrite,
        });

        const result = {
          path: outputPath,
          voice_seconds: Math.round(voiceSeconds * 10) / 10,
          total_seconds: Math.round(totalSeconds * 10) / 10,
          music: track ? track.name : args.music_path!,
          music_db: args.music_db,
          loudness_lufs: args.loudness_lufs,
          voice_lufs: voiceLufs,
          music_lufs: musicLufs,
          voice_gain_db: levels.voiceGainDb,
          music_gain_db: levels.musicGainDb,
          duck: args.duck,
        };
        return ok(
          `Mixed ${result.music} under ${basename(args.voice_path)}: voice ${voiceLufs} → ${args.loudness_lufs} LUFS, music ${args.music_db} LU under it${result.duck ? ', ducking while the voice talks' : ''}. ${result.total_seconds} s total.\n${result.path}`,
          result,
        );
      } catch (error) {
        return fail(errorText(error));
      } finally {
        if (scratch) rmSync(scratch, { recursive: true, force: true });
      }
    },
  );
}
