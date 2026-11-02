import { createServer, request } from 'node:http';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, expect, it } from 'vitest';
import handler from '../api/mcp.js';

const http = createServer(handler);
const client = new Client({ name: 'remote-test', version: '1' });
let url: URL;
beforeAll(async () => {
  await new Promise<void>((resolve) => http.listen(0, '127.0.0.1', resolve));
  const address = http.address() as { port: number };
  url = new URL(`http://127.0.0.1:${address.port}/mcp`);
  await client.connect(new StreamableHTTPClientTransport(url));
});
afterAll(async () => {
  await client.close();
  await new Promise<void>((resolve, reject) => http.close((err) => err ? reject(err) : resolve()));
});

it('lists tools over real stateless HTTP without filesystem inputs', async () => {
  const { tools } = await client.listTools();
  expect(tools).toHaveLength(5);
  expect(JSON.stringify(tools)).not.toContain('output_path');
  const result = await client.callTool({ name: 'bckgrnd_list_tracks', arguments: {} });
  expect(result.isError).not.toBe(true);
  expect(((result.structuredContent as Record<string, unknown>)?.tracks as unknown[]).length).toBe(18);
});

it('renders decodable MP3 audio over HTTP', async () => {
  const result = await client.callTool({ name: 'bckgrnd_render_track', arguments: { track: 'rain', seconds: 2 } });
  expect(result.isError, JSON.stringify(result)).not.toBe(true);
  const audio = (result.content as Array<{ type: string; data?: string }>).find((c) => c.type === 'audio');
  expect(Buffer.from(audio!.data!, 'base64').length).toBeGreaterThan(1000);
  expect(result.structuredContent).not.toHaveProperty('path');
});

it('mixes an uploaded narration using bundled audio binaries', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'remote-test-'));
  try {
    const voice = join(dir, 'voice.wav');
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=300:duration=2', voice]);
    const result = await client.callTool({ name: 'bckgrnd_mix_under_voice', arguments: { track: 'rain', voice_format: 'wav', voice_base64: readFileSync(voice).toString('base64') } });
    expect(result.isError, JSON.stringify(result)).not.toBe(true);
    expect((result.structuredContent as Record<string, unknown>)?.mime_type).toBe('audio/mpeg');
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

it('rejects long renders, invalid uploads, malformed JSON and foreign origins', async () => {
  const result = await client.callTool({ name: 'bckgrnd_render_track', arguments: { track: 'rain', seconds: 121 } });
  expect(result.isError).toBe(true);
  const invalid = await client.callTool({ name: 'bckgrnd_mix_under_voice', arguments: { track: 'rain', voice_format: 'wav', voice_base64: '!!!!' } });
  expect(invalid.isError).toBe(true);
  expect((await fetch(url, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{' })).status).toBe(400);
  expect((await fetch(url, { method: 'POST', headers: { origin: 'https://untrusted.example' }, body: '{}' })).status).toBe(403);
});

it('rejects oversized declared uploads before waiting for the body', async () => {
  const status = await new Promise<number | undefined>((resolve, reject) => {
    const req = request(url, { method: 'POST', headers: {
      'content-type': 'application/json', 'content-length': String(3 * 1024 * 1024 + 1),
    } }, (res) => {
      resolve(res.statusCode);
      res.resume();
      req.destroy();
    });
    req.on('error', reject);
    req.setTimeout(2000, () => req.destroy(new Error('Server waited for an oversized body')));
    req.flushHeaders(); // Deliberately send no body: rejection must be immediate.
  });
  expect(status).toBe(413);
});

it('rejects non-JSON media types and accepts JSON with a charset', async () => {
  expect((await fetch(url, { method: 'POST', headers: { 'content-type': 'text/plain' }, body: '{}' })).status).toBe(415);
  const response = await fetch(url, { method: 'POST', headers: {
    'content-type': 'application/json; charset=utf-8', accept: 'application/json, text/event-stream',
  }, body: JSON.stringify({ jsonrpc: '2.0', id: 99, method: 'tools/list', params: {} }) });
  expect(response.status).toBe(200);
  const body = await response.json() as { result: { tools: unknown[] } };
  expect(body.result.tools).toHaveLength(5);
});

it('maps beats over HTTP inline, and returns only the exact grid for long lists', async () => {
  const short = await client.callTool({ name: 'bckgrnd_beat_map', arguments: { track: 'rain', seconds: 10 } });
  expect(short.isError).not.toBe(true);
  expect(short.structuredContent).toMatchObject({ beat_samples: 34_288, beat_count: 14 });
  expect((short.structuredContent as { beats: unknown[] }).beats).toHaveLength(14);
  const long = await client.callTool({ name: 'bckgrnd_beat_map', arguments: { track: 'slipstream', seconds: 3600 } });
  expect(long.structuredContent).not.toHaveProperty('beats');
  expect(long.structuredContent).not.toHaveProperty('path');
  expect(long.structuredContent).toMatchObject({ beat_samples: 16_552 });
});

it('returns two labeled hosted previews with no local paths and mastered MP3 measurements', async () => {
  const fixture = readFileSync(new URL('./fixtures/speech.wav', import.meta.url)).toString('base64');
  const result = await client.callTool({ name: 'bckgrnd_preview_tracks', arguments: {
    voice_base64: fixture, voice_format: 'wav', content: 'tech', seconds: 15,
    ducking: 'subtle', arrangement: 'evolving', final_lufs: -18, true_peak_dbfs: -2,
  } });
  expect(result.isError, JSON.stringify(result.content)).not.toBe(true);
  const audio = (result.content as Array<{ type: string; data?: string }>).filter((c) => c.type === 'audio');
  expect(audio).toHaveLength(2);
  expect(audio.every((c) => Buffer.from(c.data!, 'base64').length > 1000)).toBe(true);
  expect(JSON.stringify(result.structuredContent)).not.toContain('/tmp/');
  const data = result.structuredContent as { previews: Array<{ track: string; output_lufs: number; output_true_peak_dbfs: number; mastering_target_met: boolean }> };
  expect(data.previews.map((p) => p.track)).toEqual(['drive', 'glass']);
  for (const p of data.previews) {
    expect(p.mastering_target_met, JSON.stringify(p)).toBe(true);
    expect(Math.abs(p.output_lufs + 18)).toBeLessThanOrEqual(0.7);
    expect(p.output_true_peak_dbfs).toBeLessThanOrEqual(-1.9);
  }
}, 30_000);
