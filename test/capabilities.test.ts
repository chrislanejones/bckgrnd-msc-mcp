import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { capabilitiesOf, type Tool } from '../src/capabilities.js';
import { createServer } from '../src/server.js';

const vendor = (path: string) => JSON.parse(readFileSync(new URL(`../vendor/${path}`, import.meta.url), 'utf8'));
let client: Client;

beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: 'test', version: '0' });
  await client.connect(clientSide);
});
afterAll(async () => { await client.close(); });

type Setup = Record<string, unknown> & {
  ok: boolean; checks: Array<{ name: string; ok: boolean }>; connections: Record<string, string>;
  tools: string[]; capabilities: Record<string, boolean>; engine_features: Record<string, unknown>;
};

describe('bckgrnd_check_setup capabilities', () => {
  let setup: Setup;
  let text: string;
  beforeAll(async () => {
    const result = await client.callTool({ name: 'bckgrnd_check_setup', arguments: {} });
    setup = result.structuredContent as Setup;
    text = (result.content as Array<{ text: string }>)[0]!.text;
  }, 60_000);

  it('keeps the 0.3.1 fields and adds a capabilities check', () => {
    expect(typeof setup.ok).toBe('boolean');
    expect(Object.keys(setup.connections).sort()).toEqual(['claude', 'codex', 'skill']);
    expect(setup.checks.find((c) => c.name === 'capabilities')?.ok).toBe(true);
  });

  it('reads versions, build and library from the vendored bundle', () => {
    const stamp = vendor('SOURCE.json');
    const index = vendor('library/index.json');
    expect(setup).toMatchObject({
      server_version: JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8')).version,
      project_version: vendor('contracts/project.schema.json').properties.version.const,
      snapshot_version: vendor('contracts/snapshot.schema.json').properties.version.const,
      renderer: stamp.renderer,
      app_commit: stamp.commit,
      build_id: stamp.buildId,
      bundle_dirty: false,
      track_count: index.tracks.length,
      stems: vendor('contracts/parameters.json').stems,
      stem_count: 8,
    });
    expect(setup.track_count).toBe(20);
    expect(setup.project_version).toBe(4);
    expect(setup.readable_project_versions).toEqual([1, 2, 3, 4]);
    expect(setup.sections).toEqual({ EDM: 6, 'Hip-hop': 2, Lofi: 6, Breaks: 6 });
  });

  it('lists exactly the tools the server registers', async () => {
    const { tools } = await client.listTools();
    expect([...setup.tools].sort()).toEqual(tools.map((t) => t.name).sort());
    expect(setup.tools).toHaveLength(10);
  });

  it('reports only what a registered tool provides', () => {
    expect(setup.capabilities).toEqual({
      project_rendering: true, project_editing: false, beat_mapping: true, timeline_rendering: false,
      individual_stem_volume: false, scheduled_scene_launches: false, fill_style_rendering: false,
    });
    expect(text).toContain('Not supported yet: project_editing');
  });

  it('lists engine features separately from what the tools accept', () => {
    expect(setup.engine_features).toMatchObject({
      stem_parameters: ['volume', 'send', 'muted', 'solo'],
      scene_slots: ['full', 'sparse', 'build', 'drop'],
      pattern_lanes: ['kick', 'clap', 'hat', 'hatOpen', 'bass', 'stab', 'lead', 'pad', 'arp'],
      fill_styles: ['classic', 'simple', 'busy', 'syncopated'],
      tracks_with_fill_styles: 20,
      beat_fill_styles: ['classic', 'simple', 'busy', 'syncopated'],
      tracks_with_beat_fill_styles: 20,
      performance_take_version: 2,
    });
    expect(setup.engine_features.parameters).toContain('fx.reverbMix');
  });
});

describe('capabilitiesOf', () => {
  const tool = (name: string, ...args: string[]): Tool => ({ name, inputSchema: { properties: Object.fromEntries(args.map((a) => [a, {}])) } });

  it('turns a flag on only when a tool or argument provides it', () => {
    const none = capabilitiesOf([tool('bckgrnd_list_tracks')]);
    expect(Object.values(none).every((v) => v === false)).toBe(true);
    const later = capabilitiesOf([
      tool('bckgrnd_render_project', 'stem_volumes', 'scene_launches', 'fill_style'),
      tool('bckgrnd_edit_project'), tool('bckgrnd_beat_map'), tool('bckgrnd_render_timeline'),
    ]);
    expect(Object.values(later).every((v) => v === true)).toBe(true);
  });
});
