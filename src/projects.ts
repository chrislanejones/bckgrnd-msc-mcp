import { createHash, randomUUID } from 'node:crypto';
import { readFileSync, statSync, writeFileSync } from 'node:fs';
import { isAbsolute, join } from 'node:path';
import { Worker } from 'node:worker_threads';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { readSnapshot, canonical, resolvedArrangement, RENDERER_VERSION, type TrackArrangement, type TrackSummary, type RenderSettings, type renderProject } from '../vendor/shared/runtime.js';
import { atomicOutput, defaultOutDir, outputProblem } from './paths.js';
import { toolJob, type JobOptions } from './jobs.js';

const vendor = new URL('../vendor/', import.meta.url);
const sha = (s: string | Uint8Array) => createHash('sha256').update(s).digest('hex');
type Bundle = { commit: string; dirty: boolean; buildId: string; renderer: string; files: Record<string, string> };

export function verifyProjectBundle(): Bundle {
  const stamp = JSON.parse(readFileSync(new URL('SOURCE.json', vendor), 'utf8')) as Bundle;
  if (stamp.renderer !== RENDERER_VERSION || !stamp.buildId || !stamp.files) throw new Error('Project renderer bundle is incomplete. Reinstall the complete MCP package.');
  for (const [file, hash] of Object.entries(stamp.files)) {
    if (!/^(engine|library|contracts|shared|fixtures)\//.test(file) || file.includes('..')) throw new Error('Invalid bundle path in SOURCE.json.');
    if (sha(readFileSync(new URL(file, vendor))) !== hash) throw new Error(`Bundle mismatch: ${file}. Reinstall the matching engine, library and contracts.`);
  }
  return stamp;
}

export async function loadProject(projectPath: string) {
  if (!isAbsolute(projectPath)) throw new Error('project_path must be an absolute path to a saved .bckgrnd.json project.');
  if (statSync(projectPath).size > 16 * 1024 * 1024) throw new Error('Project exceeds the 16 MiB document limit.');
  const bundle = verifyProjectBundle();
  const library = JSON.parse(readFileSync(new URL('library/index.json', vendor), 'utf8')) as { tracks: TrackSummary[] };
  let source: TrackArrangement | undefined;
  const snapshot = await readSnapshot(JSON.parse(readFileSync(projectPath, 'utf8')), library.tracks, async (id) => {
    if (!library.tracks.some((t) => t.id === id)) throw new Error(`Unavailable source dependency: ${id}.`);
    source = JSON.parse(readFileSync(new URL(`library/${id}.json`, vendor), 'utf8')).track as TrackArrangement;
    return source;
  });
  return { snapshot, source: source!, bundle, identity: {
    project_id: snapshot.id, project_revision: snapshot.revision, project_sha256: sha(canonical(snapshot.project)),
    renderer: RENDERER_VERSION, build_id: bundle.buildId, app_commit: bundle.commit,
    resolved_events_sha256: sha(canonical(resolvedArrangement(source!, snapshot.project.patterns))),
    source_sha256: snapshot.source.sha256,
    warnings: bundle.dirty ? ['This bundle was built from an uncommitted development state; it is not a release artifact.'] : [],
  } };
}
export type LoadedProject = Awaited<ReturnType<typeof loadProject>>;
type Rendered = Awaited<ReturnType<typeof renderProject>>;

export async function renderSavedProject(project: LoadedProject, settings: RenderSettings, outputPath: string, overwrite = false, job: JobOptions = {}) {
  const problem = outputProblem(outputPath, ['.wav'], overwrite); if (problem) throw new Error(problem);
  const started = performance.now(); job.signal?.throwIfAborted();
  const immutable = structuredClone({ snapshot: project.snapshot, source: project.source, settings });
  return atomicOutput(outputPath, overwrite, async (temporary) => {
    const result = await new Promise<Rendered>((resolve, reject) => {
      const worker = new Worker(new URL('../dist/project-worker.js', import.meta.url), { workerData: immutable });
      let settled = false;
      const finish = (error?: Error, value?: Rendered) => {
        if (settled) return; settled = true;
        job.signal?.removeEventListener('abort', abort);
        void worker.terminate().then(() => error ? reject(error) : resolve(value!));
      };
      const abort = () => finish(new Error('Project render cancelled; no partial output was published.'));
      job.signal?.addEventListener('abort', abort, { once: true });
      worker.on('error', (error) => finish(error));
      worker.on('exit', (code) => { if (!settled) finish(new Error(`Project renderer exited before completion (${code}).`)); });
      worker.on('message', (m: { result?: Rendered; error?: string; progress?: number }) => {
        if (m.error) finish(new Error(m.error));
        else if (m.result) finish(undefined, m.result);
        else if (m.progress !== undefined) void job.onProgress?.(m.progress, 'Rendering saved project').catch((e: Error) => finish(e));
      });
      if (job.signal?.aborted) abort();
    });
    job.signal?.throwIfAborted(); writeFileSync(temporary, result.wav);
    return { ...project.identity, path: outputPath, seconds: result.seconds, frames: result.frames, sample_rate: result.sampleRate,
      format: result.format, peak: result.peak, rms: result.rms, render_ms: Math.round(performance.now() - started),
      settings, warnings: [...project.identity.warnings, ...result.warnings] };
  }, job);
}

export function registerProjects(server: McpServer) {
  server.registerTool('bckgrnd_validate_project', {
    title: 'Validate a saved musical project',
    description: 'Validate an immutable saved project, supported schema, source content hash and renderer assets without changing it. Scenes remain alternatives. Held effects, previews and A/B are excluded. Returns revision, build identity and resolved event hash.',
    inputSchema: { project_path: z.string().min(1) },
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ project_path }) => {
    try {
      const p = await loadProject(project_path);
      const result = { valid: true, ...p.identity, name: p.snapshot.project.name, schema_version: p.snapshot.project.version };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result };
    } catch (e) { return { isError: true, content: [{ type: 'text', text: (e as Error).message }] }; }
  });
  server.registerTool('bckgrnd_render_project', {
    title: 'Render the saved project revision to WAV',
    description: 'Render accepted notes, explicit empty lanes, mix and sustained effects using the shared browser/desktop renderer. Does not launch stored scenes or apply stock-track cuts/evolving arrangements. Range, fades and tail are explicit; no ffmpeg is needed. Output is atomic and cancelled renders publish no partial file.',
    inputSchema: {
      project_path: z.string().min(1), seconds: z.number().positive().max(600), start_seconds: z.number().min(0).max(600).default(0),
      fade_in_seconds: z.number().min(0).max(600).default(0), fade_out_seconds: z.number().min(0).max(600).default(0.02),
      tail_seconds: z.number().min(0).max(30).default(0), sample_rate: z.union([z.literal(44100), z.literal(48000)]).default(48000),
      output_path: z.string().optional(), overwrite: z.boolean().default(false),
    }, annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
  }, async (args, extra) => {
    try {
      const project = await loadProject(args.project_path);
      const result = await renderSavedProject(project, { startSeconds: args.start_seconds, seconds: args.seconds, fadeInSeconds: args.fade_in_seconds,
        fadeOutSeconds: args.fade_out_seconds, tailSeconds: args.tail_seconds, sampleRate: args.sample_rate },
      args.output_path ?? join(defaultOutDir(), `project-r${project.snapshot.revision}-${randomUUID()}.wav`), args.overwrite, toolJob(extra));
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result };
    } catch (e) { return { isError: true, content: [{ type: 'text', text: (e as Error).message }] }; }
  });
}
