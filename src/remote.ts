import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'node:url';
const ffmpegPath = fileURLToPath(new URL('../vendor/runtime/ffmpeg', import.meta.url));
const ffprobePath = fileURLToPath(new URL('../vendor/runtime/ffprobe', import.meta.url));
import { z } from 'zod';
import { durationSeconds, measureAudio, masterAudio } from './mix.js';
import { STEMS } from './library.js';
import { createServer, VERSION } from './server.js';
import { arrangementSchema, duckingSchema } from './settings.js';
import { contentSchema } from './preview.js';

const run = promisify(execFile);
export const MAX_REMOTE_SECONDS = 120;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2_000_000;
let running = 0;

function error(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

/** Use the same local tools, but never expose their filesystem arguments remotely. */
async function localCall(name: string, args: Record<string, unknown>, signal?: AbortSignal): Promise<CallToolResult> {
  const server = createServer();
  const client = new Client({ name: 'remote-adapter', version: VERSION });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b);
    await client.connect(a);
    return await client.callTool({ name, arguments: args }, undefined, { signal, timeout: 55_000 }) as CallToolResult;
  } finally {
    await client.close();
    await server.close();
  }
}

async function audioJob(work: (dir: string, signal: AbortSignal) => Promise<CallToolResult>): Promise<CallToolResult> {
  if (running >= 2) return error('This instance is busy. Retry shortly.');
  running++;
  let dir: string | undefined;
  try {
    if (!ffmpegPath) throw new Error('Audio encoder unavailable on this platform.');
    process.env.FFMPEG_PATH = ffmpegPath;
    process.env.FFPROBE_PATH = ffprobePath;
    dir = await mkdtemp(join(tmpdir(), 'bckgrnd-remote-'));
    return await work(dir, AbortSignal.timeout(45_000));
  } catch (cause) {
    // Do not return ffmpeg stderr or paths from user-supplied media to clients.
    console.error('Remote audio job failed:', cause instanceof Error ? cause.name : 'unknown');
    return error('Audio processing failed. Use a valid MP3, WAV, Ogg or FLAC within the upload and duration limits.');
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true });
    running--;
  }
}

async function encodeResult(source: string, dir: string, metadata: Record<string, unknown>, signal?: AbortSignal): Promise<CallToolResult> {
  const output = join(dir, 'result.mp3');
  if (typeof metadata.final_lufs === 'number') {
    await masterAudio(source, output, metadata.final_lufs, Number(metadata.true_peak_dbfs ?? -1.5), { signal }, ['-c:a', 'libmp3lame', '-b:a', '96k']);
  } else await run(ffmpegPath!, ['-v', 'error', '-nostdin', '-i', source, '-map', '0:a:0', '-c:a', 'libmp3lame', '-b:a', '96k', '-t', String(MAX_REMOTE_SECONDS), output], { timeout: 15_000, signal, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024 });
  const measured = await measureAudio(output, { signal });
  const data = await readFile(output);
  if (data.length > MAX_OUTPUT_BYTES) throw new Error('Encoded output exceeds response limit.');
  return {
    content: [
      { type: 'text', text: 'Generated MP3 attached as MCP audio. Save the audio content as an .mp3 file; no public download URL is stored.' },
      { type: 'audio', mimeType: 'audio/mpeg', data: data.toString('base64') },
    ],
    structuredContent: { ...metadata, ...measured, mime_type: 'audio/mpeg', bytes: data.length,
      ...(typeof metadata.final_lufs === 'number' ? { mastering_target_met: Math.abs(measured.output_lufs - metadata.final_lufs) <= 0.7 && measured.output_true_peak_dbfs <= Number(metadata.true_peak_dbfs ?? -1.5) + 0.1 } : {}),
    },
  };
}

const musicArgs = {
  track: z.string().min(1).max(100).describe('Track id from bckgrnd_list_tracks'),
  cut: z.array(z.enum(STEMS)).max(8).optional(),
  arrangement: arrangementSchema.default('loop'),
};

const uploadArgs = {
  voice_base64: z.string().min(4).max(Math.ceil(MAX_UPLOAD_BYTES / 3) * 4).describe('Actual base64 audio bytes without a data-URL prefix'),
  voice_format: z.enum(['mp3', 'wav', 'ogg', 'flac']),
};
const mixArgsSchema = {
  music_db: z.number().min(-40).max(0).default(-14),
  loudness_lufs: z.number().min(-30).max(-9).default(-16),
  duck: z.boolean().default(true), ducking: duckingSchema.default('normal'),
  final_lufs: z.number().min(-30).max(-9).optional(),
  true_peak_dbfs: z.number().min(-9).max(-0.5).optional(),
};

async function decodeUpload(dir: string, base64: string, format: string, signal: AbortSignal): Promise<string> {
  const bytes = Buffer.from(base64, 'base64');
  if (bytes.toString('base64') !== base64 || bytes.length > MAX_UPLOAD_BYTES) throw new Error('Invalid base64 or oversized upload.');
  const input = join(dir, 'upload'), voice = join(dir, 'voice.wav');
  await writeFile(input, bytes);
  await run(ffmpegPath!, ['-v', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe', '-f', format, '-i', input, '-map', '0:a:0', '-t', '121', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', voice], { timeout: 15_000, signal, killSignal: 'SIGKILL', maxBuffer: 1024 * 1024 });
  return voice;
}

export function createRemoteServer(): McpServer {
  const server = new McpServer({ name: 'bckgrnd-msc', version: VERSION }, {
    instructions: 'Remote audio tools return embedded MP3 audio, not local paths or download URLs. Clips are limited to 120 seconds. For longer files or agents without audio upload/output support, use the local stdio server.',
  });
  server.registerTool('bckgrnd_list_tracks', {
    description: 'List tracks, moods, energy, tempo and stems. Use this before selecting music.',
    inputSchema: { section: z.enum(['EDM', 'Lofi', 'Breaks']).optional(), max_energy: z.number().int().min(1).max(5).optional() },
    annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
  }, (args) => localCall('bckgrnd_list_tracks', args));

  server.registerTool('bckgrnd_render_track', {
    description: 'Render 1–120 seconds of synthesized background music. Returns embedded MP3 audio. No output path is needed. For longer renders use the local server.',
    inputSchema: {
      ...musicArgs,
      seconds: z.number().min(1).max(MAX_REMOTE_SECONDS),
      fade_in_seconds: z.number().min(0).max(30).default(1),
      fade_out_seconds: z.number().min(0).max(60).default(4),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, (args) => audioJob(async (dir, signal) => {
    const output = join(dir, 'render.wav');
    const result = await localCall('bckgrnd_render_track', { ...args, output_path: output }, signal);
    if (result.isError) return result;
    const { path: _path, ...metadata } = result.structuredContent!;
    void _path;
    return encodeResult(output, dir, metadata, signal);
  }));

  server.registerTool('bckgrnd_mix_under_voice', {
    description: 'Mix a track beneath uploaded narration. Supply actual base64-encoded audio bytes (not a filename). Maximum upload 2 MiB; narration plus lead-in/tail must fit 120 seconds. Returns embedded MP3 audio. Use local stdio for longer files or custom music.',
    inputSchema: {
      ...musicArgs,
      ...uploadArgs,
      ...mixArgsSchema,
      lead_in_seconds: z.number().min(0).max(10).default(2),
      tail_seconds: z.number().min(0).max(10).default(3),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, (args) => audioJob(async (dir, signal) => {
    const { voice_base64, voice_format, ...mixArgs } = args;
    const voice = await decodeUpload(dir, voice_base64, voice_format, signal);
    const output = join(dir, 'mixed.wav');
    const seconds = await durationSeconds(voice, { signal });
    if (seconds + args.lead_in_seconds + args.tail_seconds > MAX_REMOTE_SECONDS) return error('Narration plus lead-in and tail exceeds 120 seconds. Use a shorter clip or the local server.');
    if (args.true_peak_dbfs !== undefined && args.final_lufs === undefined) return error('Set final_lufs when specifying a true-peak ceiling.');
    const result = await localCall('bckgrnd_mix_under_voice', { ...mixArgs, final_lufs: undefined, true_peak_dbfs: undefined, voice_path: voice, output_path: output }, signal);
    if (result.isError) return error('Could not mix this recording. Check that it contains audible speech and that the track exists.');
    const { path: _path, ...metadata } = result.structuredContent!;
    void _path;
    return encodeResult(output, dir, { ...metadata, ...(args.final_lufs !== undefined ? { final_lufs: args.final_lufs, true_peak_dbfs: args.true_peak_dbfs ?? -1.5 } : {}) }, signal);
  }));

  server.registerTool('bckgrnd_preview_tracks', {
    description: 'Upload narration to compare 1–3 tracks on the same audible excerpt. Omit tracks for two content-based recommendations; omit start_seconds to skip silence automatically. Returns labeled MP3 audio attachments. Input limit 2 MiB and 120 seconds. Choose a preview before requesting a full mix.',
    inputSchema: {
      ...uploadArgs, ...mixArgsSchema, cut: musicArgs.cut, arrangement: musicArgs.arrangement,
      tracks: z.array(z.string().min(1).max(100)).min(1).max(3).optional(),
      content: contentSchema.default('narration'), seconds: z.number().min(15).max(30).default(20), start_seconds: z.number().min(0).optional(),
    }, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, (args) => audioJob(async (dir, signal) => {
    const { voice_base64, voice_format, ...previewArgs } = args;
    const voice = await decodeUpload(dir, voice_base64, voice_format, signal);
    if (await durationSeconds(voice, { signal }) > MAX_REMOTE_SECONDS) return error('Narration exceeds 120 seconds. Use the local server for longer files.');
    if (args.true_peak_dbfs !== undefined && args.final_lufs === undefined) return error('Set final_lufs when specifying a true-peak ceiling.');
    const result = await localCall('bckgrnd_preview_tracks', { ...previewArgs, final_lufs: undefined, true_peak_dbfs: undefined, voice_path: voice }, signal);
    if (result.isError) return error('Could not preview this recording. Check that it contains audible speech, the track ids are valid and start_seconds is inside the recording.');
    const data = result.structuredContent as { previews: Array<Record<string, unknown> & { path: string }>; start_seconds: number; excerpt_seconds: number };
    const content: CallToolResult['content'] = [];
    const previews = [];
    try {
      for (const [i, preview] of data.previews.entries()) {
        const { path, full_mix_arguments: _args, ...metadata } = preview; void _args;
        const encoded = await encodeResult(path, dir, { ...metadata, ...(args.final_lufs !== undefined ? { final_lufs: args.final_lufs, true_peak_dbfs: args.true_peak_dbfs ?? -1.5 } : {}) }, signal);
        content.push({ type: 'text', text: `Preview ${i + 1}: ${String(metadata.music)} (${String(metadata.track)})` }, ...encoded.content.filter((c) => c.type === 'audio'));
        previews.push(encoded.structuredContent);
        await rm(join(dir, 'result.mp3'), { force: true });
      }
      return { content, structuredContent: { previews, start_seconds: data.start_seconds, excerpt_seconds: data.excerpt_seconds } };
    } finally { for (const folder of new Set(data.previews.map((p) => dirname(p.path)))) await rm(folder, { recursive: true, force: true }); }
  }));
  return server;
}
