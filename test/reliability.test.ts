import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createServer } from '../src/server.js';
import { renderTrack } from '../src/render.js';
import { findTrack } from '../src/library.js';
import { durationSeconds, measureAudio, mixUnderVoice } from '../src/mix.js';
import { atomicOutput } from '../src/paths.js';

const dir = mkdtempSync(join(tmpdir(), 'bckgrnd-reliability-'));
const voice = fileURLToPath(new URL('./fixtures/speech.wav', import.meta.url));
const client = new Client({ name: 'reliability', version: '1' });
const server = createServer();
beforeAll(async () => {
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b);
  await client.connect(a);
});
afterAll(async () => { await client.close(); await server.close(); rmSync(dir, { recursive: true, force: true }); });

it('preserves an existing output and removes scratch files after cancellation', async () => {
  const path = join(dir, 'keep.wav');
  writeFileSync(path, 'original');
  const controller = new AbortController();
  await expect(renderTrack({ track: findTrack('rain')!, seconds: 60, outputPath: path, overwrite: true, signal: controller.signal,
    onProgress: async (p) => { if (p > 0) controller.abort(); },
  })).rejects.toThrow();
  expect(readFileSync(path, 'utf8')).toBe('original');
  expect(readdirSync(dir).filter((name) => name.startsWith('.bckgrnd-'))).toEqual([]);
});

it('allows only one concurrent writer to claim a destination', async () => {
  const path = join(dir, 'race.wav');
  const results = await Promise.allSettled([1, 2].map(() => renderTrack({ track: findTrack('rain')!, seconds: 6, outputPath: path })));
  expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
  expect(results.filter((r) => r.status === 'rejected')).toHaveLength(1);
  expect(readFileSync(path).length).toBe(44 + 6 * 48000 * 4);
});

it('keeps an old export when generation fails', async () => {
  const path = join(dir, 'old.mp3');
  writeFileSync(path, 'old');
  await expect(atomicOutput(path, true, async (temporary) => {
    writeFileSync(temporary, 'partial');
    throw new Error('encoder failed');
  })).rejects.toThrow('encoder failed');
  expect(readFileSync(path, 'utf8')).toBe('old');
});

it('cancels an ffmpeg mix and preserves the previous destination', async () => {
  const outputPath = join(dir, 'cancelled-mix.wav');
  writeFileSync(outputPath, 'original');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30);
  try {
    await expect(mixUnderVoice({ voicePath: voice, musicPath: voice, outputPath, totalSeconds: 3600, leadInSeconds: 0, tailSeconds: 0, voiceGainDb: 0, musicGainDb: -20, duck: true, overwrite: true, signal: controller.signal })).rejects.toThrow();
    expect(readFileSync(outputPath, 'utf8')).toBe('original');
  } finally { clearTimeout(timer); }
});

it('honors MCP cancellation after progress begins', async () => {
  const outputPath = join(dir, 'cancelled-mcp.wav');
  writeFileSync(outputPath, 'original');
  const controller = new AbortController();
  await expect(client.callTool({ name: 'bckgrnd_render_track', arguments: { track: 'rain', seconds: 600, output_path: outputPath, overwrite: true } }, undefined, {
    signal: controller.signal,
    onprogress: (p) => { if (p.progress > 0) controller.abort(); },
  })).rejects.toThrow();
  await expect.poll(() => readdirSync(dir).filter((name) => name.startsWith('.bckgrnd-')).length).toBe(0);
  expect(readFileSync(outputPath, 'utf8')).toBe('original');
});

it('reports MCP progress and uses unique default filenames', async () => {
  const progress: number[] = [];
  const results = [];
  for (let i = 0; i < 2; i++) {
    const result = await client.callTool({ name: 'bckgrnd_render_track', arguments: { track: 'rain', seconds: 6 } }, undefined, {
      onprogress: (p) => { progress.push(p.progress); },
    });
    expect(result.isError).not.toBe(true);
    results.push((result.structuredContent as { path: string }).path);
  }
  expect(results[0]).not.toBe(results[1]);
  expect(progress).toContain(100);
  expect(progress.some((p) => p > 0 && p < 100)).toBe(true);
  results.forEach((path) => rmSync(path));
});

it('returns two playable previews with measured exported levels', async () => {
  const result = await client.callTool({ name: 'bckgrnd_preview_tracks', arguments: { voice_path: voice, tracks: ['rain', 'study'], seconds: 15 } });
  expect(result.isError, JSON.stringify(result)).not.toBe(true);
  const previews = (result.structuredContent as { previews: Array<{ path: string; output_lufs: number; output_true_peak_dbfs: number }> }).previews;
  expect(previews).toHaveLength(2);
  try {
    for (const preview of previews) {
      expect(existsSync(preview.path)).toBe(true);
      expect(preview.output_lufs).toBe((await measureAudio(preview.path)).output_lufs);
      expect(Number.isFinite(preview.output_true_peak_dbfs)).toBe(true);
    }
  } finally { rmSync(join(previews[0]!.path, '..'), { recursive: true, force: true }); }
});

function pcm(path: string): Float32Array {
  const bytes = execFileSync('ffmpeg', ['-v', 'error', '-i', path, '-f', 'f32le', '-ac', '1', '-ar', '48000', 'pipe:1'], { maxBuffer: 8 * 1024 * 1024 });
  return new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
}
function residual(a: Float32Array, voiceOnly: Float32Array, from: number, to: number): number {
  let sum = 0;
  let count = 0;
  for (let i = Math.floor(from * 48000); i < Math.min(a.length, Math.floor(to * 48000)); i++) {
    sum += ((a[i] ?? 0) - (voiceOnly[i] ?? 0)) ** 2;
    count++;
  }
  return Math.sqrt(sum / count);
}

it('ducks music during real speech and recovers during its silent tail', async () => {
  const seconds = await durationSeconds(voice);
  const music = join(dir, 'tone.wav');
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', `sine=frequency=1000:duration=${seconds}`, music]);
  const outputs = [];
  for (const [name, duck, gain] of [['voice', false, -120], ['steady', false, -12], ['ducked', true, -12]] as const) {
    const outputPath = join(dir, `${name}.wav`);
    await mixUnderVoice({ voicePath: voice, musicPath: music, outputPath, totalSeconds: seconds, leadInSeconds: 0, tailSeconds: 0, voiceGainDb: 0, musicGainDb: gain, duck, overwrite: false });
    outputs.push(pcm(outputPath));
  }
  const [only, steady, ducked] = outputs as [Float32Array, Float32Array, Float32Array];
  expect(residual(ducked, only, 0.5, 2.5)).toBeLessThan(residual(steady, only, 0.5, 2.5) * 0.8);
  expect(residual(ducked, only, seconds - 0.8, seconds - 0.1)).toBeGreaterThan(residual(steady, only, seconds - 0.8, seconds - 0.1) * 0.85);
});
