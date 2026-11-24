// Stage, hash and validate one coherent app bundle before replacing vendor/.
//
//   pnpm run sync-engine [app-dir] [--expect-commit <sha>] [--allow-dirty]
//
// Re-runnable: an earlier .vendor-previous is renamed aside (never deleted), and
// the supported project/snapshot versions come from the vendored contracts.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const flag = (name) => { const i = args.indexOf(name); if (i < 0) return undefined; const v = args[i + 1]; if (!v || v.startsWith('--')) throw new Error(`${name} needs a value.`); args.splice(i, 2); return v; };
const expectCommit = flag('--expect-commit');
const allowDirty = args.includes('--allow-dirty');
const source = resolve(args.find((a) => !a.startsWith('--')) ?? process.env.BCKGRND_MSC_DIR ?? join(root, '../bckgrnd-msc'));
const git = (...a) => execFileSync('git', ['-C', source, ...a], { encoding: 'utf8' }).trim();
const head = git('rev-parse', 'HEAD');
if (expectCommit && !head.startsWith(expectCommit.toLowerCase())) throw new Error(`App checkout is at ${head.slice(0, 7)}, not ${expectCommit}. Check out that commit and rebuild the app first.`);
const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'engine-core', 'app/Support/Music', 'contracts', 'frontend', 'scripts', 'tests/fixtures', 'public/library', 'package.json', 'pnpm-lock.yaml') !== '';
if (dirty && !allowDirty) throw new Error('Release source is dirty. Commit, rebuild, then sync; --allow-dirty is for development bundles only.');
const manifest = JSON.parse(readFileSync(join(source, 'public/build-manifest.json'), 'utf8'));
if (manifest.appCommit !== head) throw new Error('Build manifest is from another commit. Rebuild the app first.');
const backup = join(root, '.vendor-previous');
const vendor = join(root, 'vendor');
const stage = mkdtempSync(join(root, '.vendor-stage-'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
try {
  for (const [from, to] of [['public/wasm', 'engine'], ['public/library', 'library'], ['contracts', 'contracts'], ['public/shared', 'shared'], ['tests/fixtures', 'fixtures']]) cpSync(join(source, from), join(stage, to), { recursive: true, filter: (path) => basename(path) !== '.gitignore' });
  for (const [name, folder] of [['engine', 'engine'], ['library', 'library'], ['contracts', 'contracts'], ['shared', 'shared']]) {
    for (const [file, hash] of Object.entries(manifest[name])) if (file !== '.gitignore' && sha(readFileSync(join(stage, folder, file))) !== hash) throw new Error(`Build hash mismatch: ${folder}/${file}`);
  }
  // The contracts say which versions this bundle reads; the build manifest must agree.
  const versionOf = (file) => JSON.parse(readFileSync(join(stage, 'contracts', file), 'utf8')).properties?.version?.const;
  const projectVersion = versionOf('project.schema.json'), snapshotVersion = versionOf('snapshot.schema.json');
  if (!Number.isInteger(projectVersion) || !Number.isInteger(snapshotVersion)) throw new Error('Contracts do not state a project/snapshot version const.');
  for (const [key, value] of [['projectVersion', projectVersion], ['snapshotVersion', snapshotVersion]]) if (manifest[key] !== undefined && manifest[key] !== value) throw new Error(`Build manifest ${key} ${manifest[key]} disagrees with the contracts (${value}).`);
  const files = {};
  function visit(dir) { for (const e of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, e.name); if (e.isDirectory()) visit(path); else files[relative(stage, path).replaceAll('\\', '/')] = sha(readFileSync(path)); } }
  visit(stage);
  const stamp = { repository: 'https://github.com/chrislanejones/bckgrnd-msc', commit: manifest.appCommit, dirty: dirty || manifest.dirty, buildId: manifest.buildId, renderer: manifest.renderer, projectVersion, snapshotVersion, files };
  const runtime = await import(pathToFileURL(join(stage, 'shared/runtime.js')).href);
  const library = JSON.parse(readFileSync(join(stage, 'library/index.json'), 'utf8'));
  if (runtime.RENDERER_VERSION !== stamp.renderer || library.tracks.length !== 20) throw new Error('Bundle contract/library validation failed.');
  const { Engine, initSync } = await import(pathToFileURL(join(stage, 'engine/bckgrnd_msc_engine.js')).href);
  initSync({ module: readFileSync(join(stage, 'engine/bckgrnd_msc_engine_bg.wasm')) });
  const engine = new Engine(48000);
  try {
    if (typeof engine.end_score !== 'function') throw new Error('Engine lacks the supported offline tail API.');
    for (const track of library.tracks) {
      const source = JSON.parse(readFileSync(join(stage, 'library', `${track.id}.json`), 'utf8')).track;
      const snapshot = await runtime.snapshotOf(runtime.projectFromTrack(track), source, 'sync-validation', 1);
      if (snapshot.project.version !== projectVersion) throw new Error(`Shared runtime writes project v${snapshot.project.version}; contracts say v${projectVersion}.`);
      const read = await runtime.readSnapshot(snapshot, library.tracks, async () => source);
      runtime.applyProject(engine, read, source);
      const future = JSON.parse(JSON.stringify(snapshot)); future.project.version = projectVersion + 1;
      if (await runtime.readSnapshot(future, library.tracks, async () => source).then(() => true, () => false)) throw new Error(`Shared runtime accepts project v${projectVersion + 1}.`);
    }
  } finally { engine.free(); }
  writeFileSync(join(stage, 'SOURCE.json'), JSON.stringify(stamp, null, 2) + '\n');
  let aside;
  if (existsSync(backup)) {
    // Keep every earlier backup; vendor/ is also in git history.
    const old = existsSync(join(backup, 'SOURCE.json')) ? JSON.parse(readFileSync(join(backup, 'SOURCE.json'), 'utf8')).commit?.slice(0, 7) : 'unknown';
    aside = `${backup}-${old}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    renameSync(backup, aside);
  }
  if (existsSync(vendor)) renameSync(vendor, backup);
  try { renameSync(stage, vendor); }
  catch (error) { if (existsSync(backup)) renameSync(backup, vendor); throw error; }
  // Kept outside the published allowlist until the next verified release.
  console.log(`Synced build ${stamp.buildId}, source ${stamp.commit}${stamp.dirty ? ' (development; dirty)' : ''}, project v${projectVersion}, snapshot v${snapshotVersion}. Previous bundle: ${backup}${aside ? ` (older one moved to ${aside})` : ''}`);
} catch (error) { rmSync(stage, { recursive: true, force: true }); throw error; }
