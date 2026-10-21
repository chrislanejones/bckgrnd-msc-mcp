import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { fileURLToPath } from 'node:url';
const ffmpegPath = fileURLToPath(new URL('../vendor/runtime/ffmpeg', import.meta.url));
const ffprobePath = fileURLToPath(new URL('../vendor/runtime/ffprobe', import.meta.url));
import { z } from 'zod';
import { durationSeconds } from './mix.js';
import { STEMS } from './library.js';
import { createServer, VERSION } from './server.js';

const run = promisify(execFile);
export const MAX_REMOTE_SECONDS = 120;
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2_000_000;
let running = 0;

function error(message: string): CallToolResult {
  return { isError: true, content: [{ type: 'text', text: message }] };
}

/** Use the same local tools, but never expose their filesystem arguments remotely. */
async function localCall(name: string, args: Record<string, unknown>): Promise<CallToolResult> {
  const server = createServer();
  const client = new Client({ name: 'remote-adapter', version: VERSION });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b);
    await client.connect(a);
    return await client.callTool({ name, arguments: args }) as CallToolResult;
  } finally {
    await client.close();
    await server.close();
  }
}

async function audioJob(work: (dir: string) => Promise<CallToolResult>): Promise<CallToolResult> {
  if (running >= 2) return error('This instance is busy. Retry shortly.');
  running++;
  let dir: string | undefined;
  try {
    if (!ffmpegPath) throw new Error('Audio encoder unavailable on this platform.');
    process.env.FFMPEG_PATH = ffmpegPath;
    process.env.FFPROBE_PATH = ffprobePath;
    dir = await mkdtemp(join(tmpdir(), 'bckgrnd-remote-'));
    return await work(dir);
  } catch (cause) {
    // Do not return ffmpeg stderr or paths from user-supplied media to clients.
    console.error('Remote audio job failed:', cause instanceof Error ? cause.name : 'unknown');
    return error('Audio processing failed. Use a valid MP3, WAV, Ogg or FLAC within the upload and duration limits.');
  } finally {
    if (dir) await rm(dir, { recursive: true, force: true });
    running--;
  }
}

async function encodeResult(source: string, dir: string, metadata: Record<string, unknown>): Promise<CallToolResult> {
  const output = join(dir, 'result.mp3');
  await run(ffmpegPath!, ['-v', 'error', '-nostdin', '-i', source, '-map', '0:a:0', '-c:a', 'libmp3lame', '-b:a', '96k', '-t', String(MAX_REMOTE_SECONDS), output], { timeout: 15_000, maxBuffer: 1024 * 1024 });
  const data = await readFile(output);
  if (data.length > MAX_OUTPUT_BYTES) throw new Error('Encoded output exceeds response limit.');
  return {
    content: [
      { type: 'text', text: 'Generated MP3 attached as MCP audio. Save the audio content as an .mp3 file; no public download URL is stored.' },
      { type: 'audio', mimeType: 'audio/mpeg', data: data.toString('base64') },
    ],
    structuredContent: { ...metadata, mime_type: 'audio/mpeg', bytes: data.length },
  };
}

const musicArgs = {
  track: z.string().min(1).max(100).describe('Track id from bckgrnd_list_tracks'),
  cut: z.array(z.enum(STEMS)).max(8).optional(),
};

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
  }, (args) => audioJob(async (dir) => {
    const output = join(dir, 'render.wav');
    const result = await localCall('bckgrnd_render_track', { ...args, output_path: output });
    if (result.isError) return result;
    const { path: _path, ...metadata } = result.structuredContent!;
    void _path;
    return encodeResult(output, dir, metadata);
  }));

  server.registerTool('bckgrnd_mix_under_voice', {
    description: 'Mix a track beneath uploaded narration. Supply actual base64-encoded audio bytes (not a filename). Maximum upload 2 MiB; narration plus lead-in/tail must fit 120 seconds. Returns embedded MP3 audio. Use local stdio for longer files or custom music.',
    inputSchema: {
      ...musicArgs,
      voice_base64: z.string().min(4).max(Math.ceil(MAX_UPLOAD_BYTES / 3) * 4).describe('Base64 file contents, without a data-URL prefix; never invent these bytes'),
      voice_format: z.enum(['mp3', 'wav', 'ogg', 'flac']),
      music_db: z.number().min(-40).max(0).default(-14),
      loudness_lufs: z.number().min(-30).max(-9).default(-16),
      duck: z.boolean().default(true),
      lead_in_seconds: z.number().min(0).max(10).default(2),
      tail_seconds: z.number().min(0).max(10).default(3),
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, (args) => audioJob(async (dir) => {
    const { voice_base64, voice_format, ...mixArgs } = args;
    const bytes = Buffer.from(voice_base64, 'base64');
    if (bytes.toString('base64') !== voice_base64 || bytes.length > MAX_UPLOAD_BYTES) return error('Invalid base64 or upload exceeds 2 MiB.');
    const input = join(dir, 'upload');
    const voice = join(dir, 'voice.wav');
    const output = join(dir, 'mixed.wav');
    await writeFile(input, bytes);
    // Force a simple audio demuxer: uploaded playlists cannot read server files or URLs.
    await run(ffmpegPath!, ['-v', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe', '-f', voice_format, '-i', input, '-map', '0:a:0', '-t', '121', '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', voice], { timeout: 15_000, maxBuffer: 1024 * 1024 });
    const seconds = await durationSeconds(voice);
    if (seconds + args.lead_in_seconds + args.tail_seconds > MAX_REMOTE_SECONDS) return error('Narration plus lead-in and tail exceeds 120 seconds. Use a shorter clip or the local server.');
    const result = await localCall('bckgrnd_mix_under_voice', { ...mixArgs, voice_path: voice, output_path: output });
    if (result.isError) return error('Could not mix this recording. Check that it contains audible speech and that the track exists.');
    const { path: _path, ...metadata } = result.structuredContent!;
    void _path;
    return encodeResult(output, dir, metadata);
  }));
  return server;
}
