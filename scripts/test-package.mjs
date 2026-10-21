import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const root = process.cwd();
const dir = mkdtempSync(join(tmpdir(), 'bckgrnd-package-'));
const client = new Client({ name: 'package-smoke', version: '1' });
try {
  execFileSync('pnpm', ['pack', '--pack-destination', dir], { stdio: 'pipe' });
  const tarball = readdirSync(dir).find((name) => name.endsWith('.tgz'));
  if (!tarball) throw new Error('No package tarball produced');
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ private: true, dependencies: { 'bckgrnd-msc-mcp': `file:${join(dir, tarball)}` } }));
  execFileSync('pnpm', ['install', '--ignore-scripts'], { cwd: dir, stdio: 'pipe' });
  const installed = join(dir, 'node_modules/bckgrnd-msc-mcp');
  // Start outside the repository: the published package must contain every asset.
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(installed, 'dist/index.js')], cwd: dir, stderr: 'pipe' }));
  const { tools } = await client.listTools();
  if (tools.length !== 4) throw new Error('Packaged tool list is incomplete');
  const output = join(dir, 'render.wav');
  const result = await client.callTool({ name: 'bckgrnd_render_track', arguments: { track: 'rain', seconds: 1, output_path: output } });
  if (result.isError || readFileSync(output).toString('ascii', 0, 4) !== 'RIFF') throw new Error('Packaged WASM render failed');
  const mixed = await client.callTool({ name: 'bckgrnd_mix_under_voice', arguments: { voice_path: resolve(root, 'test/fixtures/speech.wav'), track: 'rain', output_path: join(dir, 'mixed.mp3') } });
  if (mixed.isError) throw new Error(`Packaged mix failed: ${JSON.stringify(mixed.content)}`);
  console.log('Packed package installed outside repo: stdio handshake, four tools, WASM render and ffmpeg mix passed.');
} finally {
  await client.close();
  rmSync(dir, { recursive: true, force: true });
}
