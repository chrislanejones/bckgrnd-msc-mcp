import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { findTrack, unknownTrackMessage } from './library.js';
import { defaultOutDir } from './paths.js';
import { durationSeconds, extractPreview, loudnessLufs, tool, SILENCE_LUFS } from './mix.js';
import { toolJob, type JobOptions } from './jobs.js';
import { mixNarration } from './workflow.js';
import { mixSettingsShape, presetNameSchema, type MixSettings } from './settings.js';
import { resolveSettings } from './presets.js';

export const contentSchema = z.enum(['narration', 'tutorial', 'story', 'tech', 'news', 'hype']);
export function recommendTracks(content: z.infer<typeof contentSchema>, duration: number): string[] {
  if (duration > 600) return ['rain', 'study'];
  return { narration: ['rain', 'study'], tutorial: ['study', 'porch'], story: ['tape', 'nightbus'], tech: ['drive', 'glass'], news: ['warehouse', 'basement'], hype: ['bricks', 'ravetape'] }[content];
}

/** Select the window with most audible material. This detects activity, not words. */
export async function chooseExcerpt(path: string, duration: number, seconds: number, job: JobOptions = {}): Promise<number> {
  const lufs = await loudnessLufs(path, job);
  if (lufs <= SILENCE_LUFS) throw new Error('Narration is silent. Choose a recording containing speech.');
  const { stderr } = await tool(process.env.FFMPEG_PATH || 'ffmpeg', ['-hide_banner', '-nostats', '-nostdin', '-i', path, '-map', '0:a:0', '-af', `volume=${-20 - lufs}dB,silencedetect=n=-40dB:d=0.35`, '-f', 'null', '-'], job);
  const spans: Array<[number, number]> = [];
  let cursor = 0;
  for (const match of stderr.matchAll(/silence_(start|end):\s*([\d.]+)/g)) {
    const time = Math.min(duration, Number(match[2]));
    if (match[1] === 'start' && time > cursor) spans.push([cursor, time]);
    cursor = time;
  }
  if (cursor < duration - 0.01) spans.push([cursor, duration]);
  if (!spans.length) return 0;
  const candidates = [0, ...spans.flatMap(([start, end]) => [start - 0.2, end - seconds])].map((t) => Math.max(0, Math.min(duration - seconds, t)));
  let best = 0, bestScore = -1;
  for (const start of candidates) {
    const score = spans.reduce((sum, [a, b]) => sum + Math.max(0, Math.min(start + seconds, b) - Math.max(start, a)), 0);
    if (score > bestScore + 0.001) { best = start; bestScore = score; }
  }
  return Math.round(best * 1000) / 1000;
}

export function registerPreview(server: McpServer): void {
  const { track: _track, lead_in_seconds: _lead, tail_seconds: _tail, ...settings } = mixSettingsShape;
  void _track; void _lead; void _tail;
  server.registerTool('bckgrnd_preview_tracks', {
    title: 'Compare music under a narration excerpt',
    description: 'Compare 1–3 tracks on the same 15–30 second excerpt. Omit tracks for two recommendations based on content; omit start_seconds to choose an audible section automatically. Returns playable MP3 paths and ready-to-use full-mix arguments. Present previews and use the listener’s choice for export. Presets and explicit settings are supported; previews have no intro and a one-second tail.',
    inputSchema: {
      ...settings, preset: presetNameSchema.optional(), voice_path: z.string().min(1),
      tracks: z.array(z.string().min(1)).min(1).max(3).optional(), content: contentSchema.default('narration'),
      seconds: z.number().min(15).max(30).default(20), start_seconds: z.number().min(0).optional(),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args, extra) => {
    const job = toolJob(extra);
    let scratch: string | undefined, outDir: string | undefined;
    let complete = false;
    try {
      if (!isAbsolute(args.voice_path)) throw new Error('voice_path must be absolute.');
      const duration = await durationSeconds(args.voice_path, job);
      if (duration > 3600) throw new Error('Local previews support narration up to 3600 seconds.');
      const resolved: MixSettings = resolveSettings(args);
      const tracks = args.tracks ?? (resolved.track ? [resolved.track, ...recommendTracks(args.content, duration).filter((id) => id !== findTrack(resolved.track!)?.id)].slice(0, 2) : recommendTracks(args.content, duration));
      for (const name of tracks) if (!findTrack(name)) throw new Error(unknownTrackMessage(name));
      const start = args.start_seconds ?? await chooseExcerpt(args.voice_path, duration, args.seconds, job);
      if (start >= duration) throw new Error('start_seconds must be before the end of the narration.');
      scratch = mkdtempSync(join(tmpdir(), 'bckgrnd-preview-'));
      outDir = mkdtempSync(join(defaultOutDir(), 'previews-'));
      const excerpt = join(scratch, 'excerpt.wav');
      await extractPreview(args.voice_path, excerpt, start, args.seconds, job);
      const previews = [];
      for (const [i, track] of tracks.entries()) {
        const mix = await mixNarration({ ...resolved, voice_path: excerpt, track, lead_in_seconds: 0, tail_seconds: 1,
          output_path: join(outDir, `${i + 1}-${findTrack(track)!.id}.mp3`),
        }, { ...job, onProgress: async (p, message) => job.onProgress?.((i * 100 + p) / tracks.length, `Preview ${i + 1}: ${message}`) });
        previews.push({ ...mix, track: findTrack(track)!.id, full_mix_arguments: { ...resolved, voice_path: args.voice_path, track: findTrack(track)!.id } });
      }
      complete = true;
      return { content: [{ type: 'text', text: previews.map((p) => `${p.music}: ${p.path}`).join('\n') }], structuredContent: { previews, start_seconds: start, excerpt_seconds: Math.min(args.seconds, duration - start), selection: args.start_seconds === undefined ? 'automatic audio activity' : 'explicit' } };
    } catch (error) { return { isError: true, content: [{ type: 'text', text: (error as Error).message }] }; }
    finally { if (scratch) rmSync(scratch, { recursive: true, force: true }); if (!complete && outDir) rmSync(outDir, { recursive: true, force: true }); }
  });
}
