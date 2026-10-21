import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { isAbsolute, join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { findTrack, STEMS, unknownTrackMessage } from './library.js';
import { defaultOutDir } from './paths.js';
import { durationSeconds, extractPreview } from './mix.js';
import { toolJob } from './jobs.js';

export function registerPreview(server: McpServer): void {
  server.registerTool('bckgrnd_preview_tracks', {
    title: 'Compare music under a narration excerpt',
    description: 'Compare one to three tracks under the same 15–30 second narration excerpt before committing to a full mix. Returns separate MP3 paths and measured levels. Use start_seconds to select the excerpt.',
    inputSchema: {
      voice_path: z.string().min(1),
      tracks: z.array(z.string().min(1)).min(1).max(3),
      seconds: z.number().min(15).max(30).default(20),
      start_seconds: z.number().min(0).default(0),
      cut: z.array(z.enum(STEMS)).optional(),
      music_db: z.number().min(-40).max(0).default(-14),
      loudness_lufs: z.number().min(-30).max(-9).default(-16),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (args, extra): Promise<CallToolResult> => {
    const job = toolJob(extra);
    let scratch: string | undefined;
    let outDir: string | undefined;
    let complete = false;
    let client: Client | undefined;
    let internal: McpServer | undefined;
    try {
      if (!isAbsolute(args.voice_path)) throw new Error('voice_path must be absolute.');
      for (const name of args.tracks) if (!findTrack(name)) throw new Error(unknownTrackMessage(name));
      const duration = await durationSeconds(args.voice_path, job);
      if (args.start_seconds >= duration) throw new Error('start_seconds must be before the end of the narration.');
      scratch = mkdtempSync(join(tmpdir(), 'bckgrnd-preview-'));
      outDir = mkdtempSync(join(defaultOutDir(), 'previews-'));
      const excerpt = join(scratch, 'excerpt.wav');
      await extractPreview(args.voice_path, excerpt, args.start_seconds, args.seconds, job);
      const { createServer } = await import('./server.js');
      internal = createServer();
      client = new Client({ name: 'preview', version: '1' });
      const [a, b] = InMemoryTransport.createLinkedPair();
      await internal.connect(b);
      await client.connect(a);
      const previews: Record<string, unknown>[] = [];
      for (const [i, track] of args.tracks.entries()) {
        job.signal?.throwIfAborted();
        const result = await client.callTool({ name: 'bckgrnd_mix_under_voice', arguments: {
          voice_path: excerpt, track, cut: args.cut, music_db: args.music_db,
          loudness_lufs: args.loudness_lufs, lead_in_seconds: 0, tail_seconds: 1,
          output_path: join(outDir, `${i + 1}-${findTrack(track)!.id}.mp3`),
        } }, undefined, { signal: job.signal, timeout: 180_000, onprogress: (p) => { void job.onProgress?.((i * 100 + p.progress) / args.tracks.length, `Preview ${i + 1}: ${p.message ?? track}`).catch(() => {}); } });
        if (result.isError) throw new Error((result.content as Array<{ text?: string }>)[0]?.text ?? 'Preview mix failed.');
        previews.push(result.structuredContent as Record<string, unknown>);
      }
      await job.onProgress?.(100, 'Previews complete');
      complete = true;
      return { content: [{ type: 'text', text: previews.map((p) => `${p.music}: ${p.path}`).join('\n') }], structuredContent: { previews, start_seconds: args.start_seconds } };
    } catch (cause) {
      return { isError: true, content: [{ type: 'text', text: cause instanceof Error ? cause.message : String(cause) }] };
    } finally {
      await client?.close();
      await internal?.close();
      if (scratch) rmSync(scratch, { recursive: true, force: true });
      if (!complete && outDir) rmSync(outDir, { recursive: true, force: true });
    }
  });
}
