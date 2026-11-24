// Re-stamp the source hash of the project-version fixtures in test/fixtures after a
// sync. Only `source.sha256` changes: a library change (for example new fill styles)
// changes every track's content hash, and a snapshot naming the old hash is refused.
//
//   node scripts/stamp-project-fixtures.mjs
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const root = resolve(import.meta.dirname, '..');
const { contentHash } = await import(pathToFileURL(join(root, 'vendor/shared/runtime.js')).href);
const folder = join(root, 'test/fixtures');
for (const name of readdirSync(folder).filter((f) => /^project-.*\.bckgrnd\.json$/.test(f)).sort()) {
  const path = join(folder, name);
  const doc = JSON.parse(readFileSync(path, 'utf8'));
  const track = JSON.parse(readFileSync(join(root, 'vendor/library', `${doc.source.trackId}.json`), 'utf8')).track;
  const sha256 = await contentHash(track);
  if (doc.source.sha256 === sha256) { console.log(`unchanged  ${name}`); continue; }
  doc.source.sha256 = sha256;
  writeFileSync(path, JSON.stringify(doc, null, 2) + '\n');
  console.log(`restamped  ${name} (${doc.source.trackId} ${sha256.slice(0, 12)})`);
}
