import { fileURLToPath } from 'node:url';
import { verifyProjectBundle } from './projects.js';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { tool } from './mix.js';
import { defaultOutDir } from './paths.js';
import { findTrack, listTracks } from './library.js';
import { renderTrack } from './render.js';
import type { JobOptions } from './jobs.js';
import { toolJob } from './jobs.js';
import { z } from 'zod';
import { compatibility, type Compatibility } from './capabilities.js';

export async function checkSetup(job: JobOptions = {}) {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
  checks.push({ name: 'Node.js', ok: Number(process.versions.node.split('.')[0]) >= 22, detail: process.version });
  for (const name of ['ffmpeg', 'ffprobe']) {
    try {
      const { stdout } = await tool(process.env[name === 'ffmpeg' ? 'FFMPEG_PATH' : 'FFPROBE_PATH'] || name, ['-version'], job);
      checks.push({ name, ok: true, detail: stdout.split('\n')[0] ?? name });
    } catch (error) { checks.push({ name, ok: false, detail: (error as Error).message }); }
  }
  try { const bundle = verifyProjectBundle(); checks.push({ name: 'project bundle', ok: true, detail: `${bundle.renderer} · ${bundle.buildId}` }); }
  catch (error) { checks.push({ name: 'project bundle', ok: false, detail: (error as Error).message }); }
  let scratch: string | undefined;
  try {
    scratch = mkdtempSync(join(defaultOutDir(), '.health-'));
    writeFileSync(join(scratch, 'write-check'), 'ok');
    checks.push({ name: 'output folder', ok: true, detail: defaultOutDir() });
    const tracks = listTracks();
    const rendered = await renderTrack({ ...job, track: findTrack('rain')!, seconds: 0.5, outputPath: join(scratch, 'engine.wav') });
    checks.push({ name: 'music engine', ok: tracks.length === 20 && rendered.peak_dbfs > -70, detail: `${tracks.length} tracks; WASM rendered a short audio check.` });
  } catch (error) { checks.push({ name: scratch ? 'music engine' : 'output folder', ok: false, detail: (error as Error).message }); }
  finally { if (scratch) rmSync(scratch, { recursive: true, force: true }); }
  // What this install can do, from its contracts, library and registered tools.
  let compat: Partial<Compatibility> = {};
  try {
    const found = await compatibility();
    compat = found;
    checks.push({ name: 'capabilities', ok: true, detail: `project v${found.readable_project_versions[0]}-v${found.project_version}, ${found.track_count} tracks, ${found.tools.length} tools` });
  } catch (error) { checks.push({ name: 'capabilities', ok: false, detail: (error as Error).message }); }
  return { ok: checks.every((c) => c.ok), checks,
    connections: {
      claude: `claude mcp add bckgrnd-msc -- ${JSON.stringify(process.execPath)} ${JSON.stringify(fileURLToPath(new URL('./index.js', import.meta.url)))}`,
      codex: `codex mcp add bckgrnd-msc -- ${JSON.stringify(process.execPath)} ${JSON.stringify(fileURLToPath(new URL('./index.js', import.meta.url)))}`,
      skill: 'pnpm dlx skills add chrislanejones/bckgrnd-msc-mcp --skill background-music',
    },
    ...compat,
  };
}

const capabilityFlags = z.object({
  project_rendering: z.boolean(), project_editing: z.boolean(), beat_mapping: z.boolean(), timeline_rendering: z.boolean(),
  individual_stem_volume: z.boolean(), scheduled_scene_launches: z.boolean(), fill_style_rendering: z.boolean(),
});
const setupOutput = {
  ok: z.boolean(),
  checks: z.array(z.object({ name: z.string(), ok: z.boolean(), detail: z.string() })),
  connections: z.object({ claude: z.string(), codex: z.string(), skill: z.string() }),
  // Absent only when the vendored bundle can't be read; the `capabilities` check then says why.
  server_version: z.string().optional(),
  project_version: z.number().int().optional(),
  readable_project_versions: z.array(z.number().int()).optional(),
  snapshot_version: z.number().int().optional(),
  renderer: z.string().optional(),
  app_commit: z.string().optional(),
  build_id: z.string().optional(),
  bundle_dirty: z.boolean().optional(),
  track_count: z.number().int().optional(),
  sections: z.record(z.string(), z.number().int()).optional(),
  stem_count: z.number().int().optional(),
  stems: z.array(z.string()).optional(),
  tools: z.array(z.string()).optional(),
  capabilities: capabilityFlags.optional(),
  engine_features: z.object({
    parameters: z.array(z.string()), stem_parameters: z.array(z.string()), scene_slots: z.array(z.string()),
    pattern_lanes: z.array(z.string()), fill_styles: z.array(z.string()), tracks_with_fill_styles: z.number().int(),
  }).optional(),
};

export function registerDoctor(server: McpServer): void {
  server.registerTool('bckgrnd_check_setup', {
    title: 'Check local audio setup and capabilities',
    description: `Check Node, ffmpeg/ffprobe, output-folder access and the actual WASM engine. Writes and removes a tiny temporary render. Returns fixes and Claude/Codex connection commands; it does not change client configuration.

Also reports what this install can do, read from its vendored contracts, library and registered tools: server_version, project_version and readable_project_versions, snapshot_version, renderer, app_commit, build_id, track_count, sections, stems, tools and capabilities.

capabilities: { project_rendering, project_editing, beat_mapping, timeline_rendering, individual_stem_volume, scheduled_scene_launches, fill_style_rendering }. A flag is true only when a registered tool provides it. engine_features lists what the engine and contracts contain (parameters, stem_parameters, scene_slots, pattern_lanes, fill_styles); being listed there does not mean any tool accepts it. Before passing an argument, check that the tool's input schema has it.`,
    inputSchema: {}, outputSchema: setupOutput, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (_args, extra) => {
    const result = await checkSetup(toolJob(extra));
    const lines = result.checks.map((c) => `${c.ok ? 'OK' : 'FAIL'} ${c.name}: ${c.detail}`);
    if (result.capabilities) {
      const on = Object.entries(result.capabilities).filter(([, v]) => v).map(([k]) => k);
      const off = Object.entries(result.capabilities).filter(([, v]) => !v).map(([k]) => k);
      lines.push('', `Server ${result.server_version}, app ${result.app_commit?.slice(0, 7)}, ${result.renderer}.`, `Supported: ${on.join(', ')}.`, `Not supported yet: ${off.join(', ')}.`);
    }
    return { content: [{ type: 'text', text: lines.join('\n') }], structuredContent: result };
  });
}
