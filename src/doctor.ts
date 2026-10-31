import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { tool } from './mix.js';
import { defaultOutDir } from './paths.js';
import { findTrack, listTracks } from './library.js';
import { renderTrack } from './render.js';
import type { JobOptions } from './jobs.js';
import { toolJob } from './jobs.js';

export async function checkSetup(job: JobOptions = {}) {
  const checks: Array<{ name: string; ok: boolean; detail: string }> = [];
  checks.push({ name: 'Node.js', ok: Number(process.versions.node.split('.')[0]) >= 20, detail: process.version });
  for (const name of ['ffmpeg', 'ffprobe']) {
    try {
      const { stdout } = await tool(process.env[name === 'ffmpeg' ? 'FFMPEG_PATH' : 'FFPROBE_PATH'] || name, ['-version'], job);
      checks.push({ name, ok: true, detail: stdout.split('\n')[0] ?? name });
    } catch (error) { checks.push({ name, ok: false, detail: (error as Error).message }); }
  }
  let scratch: string | undefined;
  try {
    scratch = mkdtempSync(join(defaultOutDir(), '.health-'));
    writeFileSync(join(scratch, 'write-check'), 'ok');
    checks.push({ name: 'output folder', ok: true, detail: defaultOutDir() });
    const tracks = listTracks();
    const rendered = await renderTrack({ ...job, track: findTrack('rain')!, seconds: 0.5, outputPath: join(scratch, 'engine.wav') });
    checks.push({ name: 'music engine', ok: tracks.length === 18 && rendered.peak_dbfs > -70, detail: `${tracks.length} tracks; WASM rendered a short audio check.` });
  } catch (error) { checks.push({ name: scratch ? 'music engine' : 'output folder', ok: false, detail: (error as Error).message }); }
  finally { if (scratch) rmSync(scratch, { recursive: true, force: true }); }
  return { ok: checks.every((c) => c.ok), checks,
    connections: {
      claude: 'claude mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.3.1',
      codex: 'codex mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.3.1',
      skill: 'pnpm dlx skills add chrislanejones/bckgrnd-msc-mcp --skill background-music',
    },
  };
}

export function registerDoctor(server: McpServer): void {
  server.registerTool('bckgrnd_check_setup', {
    title: 'Check local audio setup', description: 'Check Node, ffmpeg/ffprobe, output-folder access and the actual WASM engine. Writes and removes a tiny temporary render. Returns fixes and Claude/Codex connection commands; it does not change client configuration.',
    inputSchema: {}, annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async (_args, extra) => {
    const result = await checkSetup(toolJob(extra));
    return { content: [{ type: 'text', text: result.checks.map((c) => `${c.ok ? 'OK' : 'FAIL'} ${c.name}: ${c.detail}`).join('\n') }], structuredContent: result };
  });
}
