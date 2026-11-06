// Stage, hash and validate one coherent app bundle before replacing vendor/.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { basename, join, resolve, relative } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(import.meta.dirname, '..');
const source = resolve(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? process.env.BCKGRND_MSC_DIR ?? join(root, '../bckgrnd-msc'));
const git = (...args) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();
const dirty = git('status', '--porcelain', '--untracked-files=all', '--', 'engine-core', 'app/Support/Music', 'contracts', 'frontend', 'scripts', 'tests/fixtures', 'public/library', 'package.json', 'pnpm-lock.yaml') !== '';
if (dirty && !process.argv.includes('--allow-dirty')) throw new Error('Release source is dirty. Commit, rebuild, then sync; --allow-dirty is for development bundles only.');
const manifest = JSON.parse(readFileSync(join(source, 'public/build-manifest.json'), 'utf8'));
if (manifest.appCommit !== git('rev-parse', 'HEAD')) throw new Error('Build manifest is from another commit. Rebuild the app first.');
const backup = join(root, '.vendor-previous');
const vendor = join(root, 'vendor');
if (existsSync(backup)) throw new Error('A previous sync backup exists. Inspect .vendor-previous before syncing again.');
const stage = mkdtempSync(join(root, '.vendor-stage-'));
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
try {
  for (const [from, to] of [['public/wasm', 'engine'], ['public/library', 'library'], ['contracts', 'contracts'], ['public/shared', 'shared'], ['tests/fixtures', 'fixtures']]) cpSync(join(source, from), join(stage, to), { recursive: true, filter: (path) => basename(path) !== '.gitignore' });
  for (const [name, folder] of [['engine', 'engine'], ['library', 'library'], ['contracts', 'contracts'], ['shared', 'shared']]) {
    for (const [file, hash] of Object.entries(manifest[name])) if (file !== '.gitignore' && sha(readFileSync(join(stage, folder, file))) !== hash) throw new Error(`Build hash mismatch: ${folder}/${file}`);
  }
  const files = {};
  function visit(dir) { for (const e of readdirSync(dir, { withFileTypes: true })) { const path = join(dir, e.name); if (e.isDirectory()) visit(path); else files[relative(stage, path).replaceAll('\\', '/')] = sha(readFileSync(path)); } }
  visit(stage);
  const stamp = { repository: 'https://github.com/chrislanejones/bckgrnd-msc', commit: manifest.appCommit, dirty: dirty || manifest.dirty, buildId: manifest.buildId, renderer: manifest.renderer, projectVersion: 3, snapshotVersion: 1, files };
  const runtime = await import(pathToFileURL(join(stage, 'shared/runtime.js')).href);
  const library = JSON.parse(readFileSync(join(stage, 'library/index.json'), 'utf8'));
  if (runtime.RENDERER_VERSION !== stamp.renderer || library.tracks.length !== 18) throw new Error('Bundle contract/library validation failed.');
  const { Engine, initSync } = await import(pathToFileURL(join(stage, 'engine/bckgrnd_msc_engine.js')).href);
  initSync({ module: readFileSync(join(stage, 'engine/bckgrnd_msc_engine_bg.wasm')) });
  const engine = new Engine(48000);
  try {
    if (typeof engine.end_score !== 'function') throw new Error('Engine lacks the supported offline tail API.');
    for (const track of library.tracks) {
      const source = JSON.parse(readFileSync(join(stage, 'library', `${track.id}.json`), 'utf8')).track;
      const snapshot = await runtime.snapshotOf(runtime.projectFromTrack(track), source, 'sync-validation', 1);
      runtime.applyProject(engine, snapshot, source);
    }
  } finally { engine.free(); }
  writeFileSync(join(stage, 'SOURCE.json'), JSON.stringify(stamp, null, 2) + '\n');
  if (existsSync(vendor)) renameSync(vendor, backup);
  try { renameSync(stage, vendor); }
  catch (error) { if (existsSync(backup)) renameSync(backup, vendor); throw error; }
  // Kept outside the published allowlist until the next verified release.
  console.log(`Synced build ${stamp.buildId}, source ${stamp.commit}${stamp.dirty ? ' (development; dirty)' : ''}. Previous bundle: ${backup}`);
} catch (error) { rmSync(stage, { recursive: true, force: true }); throw error; }
