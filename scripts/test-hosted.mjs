import { URL } from 'node:url';
import { Buffer } from 'node:buffer';
import { readFileSync, mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';

const endpoint = process.argv[2] ?? 'https://bckgrnd-msc-mcp.vercel.app/mcp';
const version = JSON.parse(readFileSync(new URL('../package.json', import.meta.url))).version;
const dir = mkdtempSync(join(tmpdir(), 'bckgrnd-hosted-check-'));
const client = new Client({ name: 'bckgrnd-release-check', version });
let counter = 0;
async function call(name, args) {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 60_000 });
  if (result.isError) throw new Error(`${name}: ${JSON.stringify(result.content)}`);
  if (JSON.stringify(result.structuredContent).includes('/tmp/')) throw new Error(`${name} exposed server paths`);
  for (const content of result.content) {
    if (content.type !== 'audio') continue;
    const path = join(dir, `${++counter}.mp3`);
    writeFileSync(path, Buffer.from(content.data, 'base64'));
    const duration = Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path], { encoding: 'utf8' }).trim());
    if (!(duration > 0 && duration <= 121)) throw new Error('Invalid hosted audio duration');
  }
  return result;
}
try {
  await client.connect(new StreamableHTTPClientTransport(new URL(endpoint)));
  if (client.getServerVersion()?.version !== version) throw new Error(`Expected ${version}, got ${client.getServerVersion()?.version}`);
  const { tools } = await client.listTools();
  if (tools.length !== 4 || JSON.stringify(tools).includes('output_path')) throw new Error('Unexpected hosted schemas');
  const tracks = await call('bckgrnd_list_tracks', {});
  if (tracks.structuredContent.tracks.length !== 18) throw new Error('Track library incomplete');
  await call('bckgrnd_render_track', { track: 'rain', seconds: 2, arrangement: 'evolving' });
  const upload = { voice_format: 'wav', voice_base64: readFileSync(new URL('../test/fixtures/speech.wav', import.meta.url)).toString('base64') };
  const mixed = await call('bckgrnd_mix_under_voice', { ...upload, track: 'rain', ducking: 'subtle', final_lufs: -18, true_peak_dbfs: -2 });
  if (!mixed.structuredContent.mastering_target_met) throw new Error(`Hosted mastering missed target: ${JSON.stringify(mixed.structuredContent)}`);
  const preview = await call('bckgrnd_preview_tracks', { ...upload, content: 'tutorial', seconds: 15, ducking: 'subtle' });
  if (preview.content.filter((c) => c.type === 'audio').length !== 2) throw new Error('Missing comparison audio');
  console.log(JSON.stringify({ endpoint, version, tools: tools.length, tracks: 18, decoded_audio_files: counter, mixed_lufs: mixed.structuredContent.output_lufs, mixed_true_peak: mixed.structuredContent.output_true_peak_dbfs, previews: preview.structuredContent.previews.map((p) => p.track) }, null, 2));
} finally {
  await client.close();
  rmSync(dir, { recursive: true, force: true });
}
