/**
 * What this server can do, read from what it actually ships.
 *
 * Versions, stems, scenes and fill styles come from the vendored contracts and
 * library. The capability flags come from the tools this server registers: each
 * flag names the tool or argument that would provide it, so a flag only turns on
 * when that tool or argument exists. Agents can read this instead of guessing.
 */

import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { RENDERER_VERSION } from '../vendor/shared/runtime.js';

const vendor = new URL('../vendor/', import.meta.url);
const json = <T>(path: string): T => JSON.parse(readFileSync(new URL(path, vendor), 'utf8')) as T;

/** Project v1 is the first saved format; the shared runtime migrates every version up to the contract's. */
const FIRST_PROJECT_VERSION = 1;

export type Tool = { name: string; inputSchema: { properties?: Record<string, unknown> } };
const hasTool = (tools: Tool[], name: string) => tools.some((t) => t.name === name);
const hasArgument = (tools: Tool[], names: string[]) => tools.some((t) => names.some((n) => n in (t.inputSchema.properties ?? {})));

/**
 * Each flag is true only when the server advertises the tool or argument that provides it.
 * The names on the right are the ones a future release would add; none exist in 0.4.0.
 */
const CAPABILITIES = {
  project_rendering: (t: Tool[]) => hasTool(t, 'bckgrnd_render_project'),
  project_editing: (t: Tool[]) => hasTool(t, 'bckgrnd_edit_project'),
  beat_mapping: (t: Tool[]) => hasTool(t, 'bckgrnd_beat_map'),
  timeline_rendering: (t: Tool[]) => hasTool(t, 'bckgrnd_render_timeline') || hasArgument(t, ['timeline']),
  individual_stem_volume: (t: Tool[]) => hasArgument(t, ['stem_volumes', 'stem_volume']),
  scheduled_scene_launches: (t: Tool[]) => hasArgument(t, ['scene_launches', 'scene_schedule']),
  fill_style_rendering: (t: Tool[]) => hasArgument(t, ['fill_style', 'fill_styles']),
} as const;
export type CapabilityName = keyof typeof CAPABILITIES;

/** Which capabilities a tool list provides. */
export function capabilitiesOf(tools: Tool[]): Record<CapabilityName, boolean> {
  return Object.fromEntries(Object.entries(CAPABILITIES).map(([name, provided]) => [name, provided(tools)])) as Record<CapabilityName, boolean>;
}

/** The tools a fresh server instance advertises, with their input schemas. */
async function advertisedTools(): Promise<Tool[]> {
  // Imported here, not at the top: server.ts registers the doctor, which uses this module.
  const { createServer } = await import('./server.js');
  const server = createServer();
  const client = new Client({ name: 'capability-probe', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  try {
    await server.connect(b);
    await client.connect(a);
    return (await client.listTools()).tools as Tool[];
  } finally {
    await client.close();
    await server.close();
  }
}

type Stamp = { commit: string; buildId: string; dirty: boolean };
type LibraryIndex = { tracks: Array<{ id: string; section: string }> };
type FillStyle = { id: string };

export async function compatibility() {
  const { VERSION } = await import('./server.js');
  const stamp = json<Stamp>('SOURCE.json');
  const projectVersion = json<{ properties: { version: { const: number } } }>('contracts/project.schema.json').properties.version.const;
  const snapshotVersion = json<{ properties: { version: { const: number } } }>('contracts/snapshot.schema.json').properties.version.const;
  const parameters = json<{ stems: string[]; parameters: Array<{ id: string }>; stemParameters: Array<{ id: string }> }>('contracts/parameters.json');
  const scenes = json<{ slots: string[] }>('contracts/scenes.json');
  const patterns = json<{ lanes: Array<{ id: string }> }>('contracts/patterns.json');
  const library = json<LibraryIndex>('library/index.json');

  const sections: Record<string, number> = {};
  for (const track of library.tracks) sections[track.section] = (sections[track.section] ?? 0) + 1;
  // A track's first fill style is its own written fill, which the app labels Classic.
  const fillStyles = new Set<string>();
  let tracksWithFillStyles = 0;
  for (const track of library.tracks) {
    const styles = json<{ fillStyles?: FillStyle[] }>(`library/${track.id}.json`).fillStyles ?? [];
    if (styles.length) tracksWithFillStyles++;
    styles.forEach((style, i) => fillStyles.add(i === 0 ? 'classic' : style.id));
  }

  const tools = await advertisedTools();
  const capabilities = capabilitiesOf(tools);
  return {
    server_version: VERSION,
    project_version: projectVersion,
    readable_project_versions: Array.from({ length: projectVersion - FIRST_PROJECT_VERSION + 1 }, (_, i) => FIRST_PROJECT_VERSION + i),
    snapshot_version: snapshotVersion,
    renderer: RENDERER_VERSION,
    app_commit: stamp.commit,
    build_id: stamp.buildId,
    bundle_dirty: stamp.dirty,
    track_count: library.tracks.length,
    sections,
    stem_count: parameters.stems.length,
    stems: parameters.stems,
    tools: tools.map((t) => t.name),
    capabilities,
    // In the vendored engine and contracts. Present here does not mean a tool accepts it:
    // check `capabilities` and the tool's input schema before passing an argument.
    engine_features: {
      parameters: parameters.parameters.map((p) => p.id),
      stem_parameters: parameters.stemParameters.map((p) => p.id),
      scene_slots: scenes.slots,
      pattern_lanes: patterns.lanes.map((l) => l.id),
      fill_styles: [...fillStyles],
      tracks_with_fill_styles: tracksWithFillStyles,
    },
  };
}
export type Compatibility = Awaited<ReturnType<typeof compatibility>>;
