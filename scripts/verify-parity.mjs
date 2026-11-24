// Render parity: the MCP's own project path (file -> loadProject -> worker render)
// against the app checkout's built engine and shared renderer, for every library
// track at 44.1 and 48 kHz plus the saved-project fixtures. WAVs must be
// byte-identical. Each render gets a fresh worker, so a fresh WASM instance and
// noise stream, the way the browser export worker and the MCP do it.
//
//   pnpm run build && node scripts/verify-parity.mjs [app-dir] [--baseline <vendor-dir>]
//
// --baseline also renders the stock tracks with an older vendored bundle (for
// example a .vendor-previous) to show an engine update left the audio alone.
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { Worker } from 'node:worker_threads';
const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const at = args.indexOf('--baseline');
const baseline = at >= 0 ? resolve(args.splice(at, 2)[1]) : undefined;
const app = resolve(args[0] ?? process.env.BCKGRND_MSC_DIR ?? join(root, '../bckgrnd-msc'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const settings = { startSeconds: 0.25, seconds: 8, fadeInSeconds: 0.01, fadeOutSeconds: 0.02, tailSeconds: 0.25, sampleRate: 48000 };
const bundles = {
  app: { runtime: join(app, 'public/shared/runtime.js'), engine: join(app, 'public/wasm'), library: join(app, 'public/library') },
  mcp: { runtime: join(root, 'vendor/shared/runtime.js'), engine: join(root, 'vendor/engine'), library: join(root, 'vendor/library') },
  ...(baseline ? { baseline: { runtime: join(baseline, 'shared/runtime.js'), engine: join(baseline, 'engine'), library: join(baseline, 'library') } } : {}),
};
const manifest = JSON.parse(readFileSync(join(app, 'public/build-manifest.json'), 'utf8'));
const stamp = JSON.parse(readFileSync(join(root, 'vendor/SOURCE.json'), 'utf8'));
const { loadProject, renderSavedProject } = await import(pathToFileURL(join(root, 'dist/projects.js')).href);

// Render one stock track (factory project) or one saved file in a fresh worker.
const worker = `
const { workerData, parentPort } = require('node:worker_threads');
const { readFileSync } = require('node:fs');
(async () => {
  const { bundle, track, file, settings } = workerData;
  const rt = await import(bundle.runtime);
  const { Engine, initSync } = await import(bundle.engineJs);
  initSync({ module: readFileSync(bundle.wasm) });
  const index = JSON.parse(readFileSync(bundle.library + '/index.json', 'utf8'));
  const src = async (id) => JSON.parse(readFileSync(bundle.library + '/' + id + '.json', 'utf8')).track;
  let snapshot, source;
  if (file) { snapshot = await rt.readSnapshot(JSON.parse(readFileSync(file, 'utf8')), index.tracks, src); source = await src(snapshot.project.trackId); }
  else { source = await src(track); snapshot = await rt.snapshotOf(rt.projectFromTrack(index.tracks.find((t) => t.id === track)), source, 'parity', 1); }
  const r = await rt.renderProject(Engine, snapshot, source, settings);
  parentPort.postMessage({ wav: r.wav, frames: r.frames, peak: r.peak, version: snapshot.project.version });
})().catch((e) => parentPort.postMessage({ error: e.message }));`;
function renderIn(name, job) {
  const b = bundles[name];
  const bundle = { runtime: pathToFileURL(b.runtime).href, engineJs: pathToFileURL(join(b.engine, 'bckgrnd_msc_engine.js')).href, wasm: join(b.engine, 'bckgrnd_msc_engine_bg.wasm'), library: b.library };
  return new Promise((ok, fail) => {
    const w = new Worker(worker, { eval: true, workerData: { bundle, ...job } });
    w.once('message', (m) => {
      void w.terminate();
      if (m.error) fail(new Error(`${name}: ${m.error}`));
      else ok({ sha256: sha(m.wav), frames: m.frames, peak: m.peak, version: m.version });
    });
    w.once('error', fail);
  });
}
const folder = mkdtempSync(join(tmpdir(), 'bckgrnd-mcp-parity-'));
// The MCP leg goes through its real entry point: a saved file on disk.
async function renderMcp(job) {
  let file = job.file;
  if (!file) {
    const rt = await import(pathToFileURL(bundles.mcp.runtime).href);
    const index = JSON.parse(readFileSync(join(bundles.mcp.library, 'index.json'), 'utf8'));
    const source = JSON.parse(readFileSync(join(bundles.mcp.library, `${job.track}.json`), 'utf8')).track;
    file = join(folder, `${job.track}.bckgrnd.json`);
    writeFileSync(file, JSON.stringify(await rt.snapshotOf(rt.projectFromTrack(index.tracks.find((t) => t.id === job.track)), source, 'parity', 1)));
  }
  const project = await loadProject(file);
  const out = join(folder, `${job.track ?? 'file'}-${job.settings.sampleRate}-${Math.random().toString(36).slice(2)}.wav`);
  const r = await renderSavedProject(project, job.settings, out);
  return { sha256: sha(readFileSync(out)), frames: r.frames, peak: r.peak, version: project.identity.schema_version, stored: project.identity.stored_schema_version };
}

const tracks = JSON.parse(readFileSync(join(bundles.app.library, 'index.json'), 'utf8')).tracks.map((t) => t.id);
const files = ['test/fixtures/project-v3.bckgrnd.json', 'test/fixtures/project-v4-crash.bckgrnd.json', 'vendor/fixtures/release/edited.bckgrnd.json', 'vendor/fixtures/release/silent.bckgrnd.json'];
const rows = [];
let failed = 0;
for (const sampleRate of [44100, 48000]) {
  const s = { ...settings, sampleRate };
  for (const job of [...tracks.map((track) => ({ track })), ...files.map((f) => ({ file: join(root, f), label: f }))]) {
    const full = { ...job, settings: s };
    const results = { app: await renderIn('app', full), mcp: await renderMcp(full) };
    if (baseline && job.track) results.baseline = await renderIn('baseline', full);
    const ref = results.app;
    const same = Object.values(results).every((r) => r.sha256 === ref.sha256 && r.frames === ref.frames);
    const audible = job.label?.includes('silent') ? ref.peak === 0 : ref.peak > 0.01;
    if (!same || !audible) failed++;
    rows.push({ item: job.track ?? job.label, rate: sampleRate, frames: ref.frames, peak: Number(ref.peak.toFixed(4)), sha256: ref.sha256, identical: same, ...Object.fromEntries(Object.entries(results).map(([k, r]) => [k, r.sha256.slice(0, 12)])) });
    console.log(`${same && audible ? 'ok  ' : 'FAIL'}  ${String(sampleRate).padEnd(5)}  ${(job.track ?? job.label).padEnd(46)} ${ref.frames} frames  peak ${ref.peak.toFixed(3)}  ${Object.entries(results).map(([k, r]) => `${k}=${r.sha256.slice(0, 12)}`).join(' ')}`);
  }
}
const evidence = { app: { dir: app, commit: manifest.appCommit, buildId: manifest.buildId, engine: manifest.engine['bckgrnd_msc_engine_bg.wasm'] }, mcp: { commit: stamp.commit, buildId: stamp.buildId, engine: stamp.files['engine/bckgrnd_msc_engine_bg.wasm'] }, baseline, settings, rows };
writeFileSync(join(folder, 'evidence.json'), JSON.stringify(evidence, null, 2));
console.log(`${failed ? 'FAIL' : 'PASS'}: ${rows.length - failed}/${rows.length} byte-identical (app ${manifest.appCommit.slice(0, 7)} build ${manifest.buildId.slice(0, 8)}, MCP bundle ${stamp.commit.slice(0, 7)} build ${stamp.buildId.slice(0, 8)}${baseline ? `, baseline ${baseline}` : ''}). Evidence: ${folder}`);
process.exit(failed ? 1 : 0);
