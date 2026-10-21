// Copy the engine and the track library out of a bckgrnd-msc checkout.
//
// The server never builds Rust. It loads the same .wasm the bckgrnd-msc site
// plays in the browser, so the checkout has to be built first:
//
//   cd <bckgrnd-msc> && pnpm run build:engine
//
// Usage: node scripts/sync-engine.mjs [path-to-bckgrnd-msc]
// The path can also come from BCKGRND_MSC_DIR. Default: ../bckgrnd-msc.

import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(process.argv[2] ?? process.env.BCKGRND_MSC_DIR ?? join(root, '..', 'bckgrnd-msc'));

const engineFiles = ['bckgrnd_msc_engine.js', 'bckgrnd_msc_engine.d.ts', 'bckgrnd_msc_engine_bg.wasm'];
const wasmDir = join(source, 'public', 'wasm');
const libraryDir = join(source, 'public', 'library');

for (const file of engineFiles) {
  if (!existsSync(join(wasmDir, file))) {
    console.error(`Missing ${join(wasmDir, file)}. Run "pnpm run build:engine" in ${source} first.`);
    process.exit(1);
  }
}
if (!existsSync(join(libraryDir, 'index.json'))) {
  console.error(`Missing ${join(libraryDir, 'index.json')}. Is ${source} a bckgrnd-msc checkout?`);
  process.exit(1);
}

const engineOut = join(root, 'vendor', 'engine');
const libraryOut = join(root, 'vendor', 'library');
rmSync(engineOut, { recursive: true, force: true });
rmSync(libraryOut, { recursive: true, force: true });
mkdirSync(engineOut, { recursive: true });
mkdirSync(libraryOut, { recursive: true });

for (const file of engineFiles) copyFileSync(join(wasmDir, file), join(engineOut, file));
const tracks = readdirSync(libraryDir).filter((f) => f.endsWith('.json'));
for (const file of tracks) copyFileSync(join(libraryDir, file), join(libraryOut, file));

const git = (...args) => execFileSync('git', ['-C', source, ...args], { encoding: 'utf8' }).trim();
const stamp = {
  repository: 'https://github.com/chrislanejones/bckgrnd-msc',
  commit: git('rev-parse', 'HEAD'),
  dirty: git('status', '--porcelain', '--', 'engine-core', 'app/Support/Music', 'public/library') !== '',
};
writeFileSync(join(root, 'vendor', 'SOURCE.json'), JSON.stringify(stamp, null, 2) + '\n');

console.log(`Synced ${engineFiles.length} engine files and ${tracks.length} library files from ${stamp.commit.slice(0, 7)}${stamp.dirty ? ' (dirty)' : ''}.`);
