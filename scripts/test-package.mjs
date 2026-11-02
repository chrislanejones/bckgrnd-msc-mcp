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
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [join(installed, 'dist/index.js')], cwd: dir, stderr: 'pipe', env: { ...process.env, BCKGRND_MSC_CONFIG_DIR: join(dir, 'settings') } }));
  const { tools } = await client.listTools();
  const expected = ['bckgrnd_list_tracks', 'bckgrnd_render_track', 'bckgrnd_mix_under_voice', 'bckgrnd_preview_tracks', 'bckgrnd_mix_video', 'bckgrnd_presets', 'bckgrnd_check_setup', 'bckgrnd_beat_map'];
  if (tools.length !== expected.length || expected.some((name) => !tools.some((tool) => tool.name === name))) throw new Error('Packaged tool list is incomplete');
  const health = JSON.parse(execFileSync(process.execPath, [join(installed, 'dist/index.js'), '--check'], { cwd: dir, encoding: 'utf8' }));
  if (!health.ok) throw new Error('Packaged setup check failed');
  if (!readFileSync(join(installed, 'skills/background-music/references/hosted.md'), 'utf8').includes('voice_base64')) throw new Error('Packaged skill reference is missing');
  const saved = await client.callTool({ name: 'bckgrnd_presets', arguments: { action: 'save', name: 'package-check', settings: { track: 'rain', ducking: 'subtle', arrangement: 'evolving', final_lufs: -18 } } });
  if (saved.isError) throw new Error('Packaged preset save failed');
  const output = join(dir, 'render.wav');
  const result = await client.callTool({ name: 'bckgrnd_render_track', arguments: { track: 'rain', seconds: 1, output_path: output } });
  if (result.isError || readFileSync(output).toString('ascii', 0, 4) !== 'RIFF') throw new Error('Packaged WASM render failed');
  const mixed = await client.callTool({ name: 'bckgrnd_mix_under_voice', arguments: { voice_path: resolve(root, 'test/fixtures/speech.wav'), preset: 'package-check', output_path: join(dir, 'mixed.mp3') } });
  if (mixed.isError || !mixed.structuredContent.mastering_target_met) throw new Error(`Packaged mix failed: ${JSON.stringify(mixed.content)}`);
  console.log('Packed package installed outside repo: stdio handshake, eight tools, CLI health, packaged skill, saved preset, WASM render and mastered ffmpeg mix passed.');
} finally {
  await client.close();
  rmSync(dir, { recursive: true, force: true });
}
