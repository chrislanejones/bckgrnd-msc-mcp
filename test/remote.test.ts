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
  expect(tools).toHaveLength(3);
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
  expect(body.result.tools).toHaveLength(3);
});
