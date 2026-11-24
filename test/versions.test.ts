import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { isDeepStrictEqual } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import { loadProject, renderSavedProject, supportedProjectVersion, verifyProjectBundle } from '../src/projects.js';
import { migrateProject, projectFromTrack, type TrackSummary } from '../vendor/shared/runtime.js';

const here = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const v3 = here('./fixtures/project-v3.bckgrnd.json');
const v4 = here('./fixtures/project-v4-crash.bckgrnd.json');
const v5 = here('./fixtures/project-v5.bckgrnd.json');
const contract = here('../vendor/fixtures/contract/');
const library = JSON.parse(readFileSync(here('../vendor/library/index.json'), 'utf8')) as { tracks: TrackSummary[] };
const temp = mkdtempSync(join(tmpdir(), 'bckgrnd versions '));
const settings = { seconds: 3, startSeconds: 0.25, fadeInSeconds: 0.01, fadeOutSeconds: 0.02, tailSeconds: 0.25, sampleRate: 48000 };
afterAll(() => rmSync(temp, { recursive: true, force: true }));

describe('project versions', () => {
  it('takes the supported version from the vendored contract, and the bundle and runtime agree', () => {
    const current = supportedProjectVersion();
    expect(current).toBe(4);
    expect(verifyProjectBundle().projectVersion).toBe(current);
    expect(projectFromTrack(library.tracks[0]!).version).toBe(current);
  });

  it('reads every vendored contract fixture exactly as the app does', () => {
    const names = readdirSync(contract).filter((f) => f.endsWith('.input.json')).sort();
    expect(names.length).toBeGreaterThan(20);
    for (const file of names) {
      const name = file.replace('.input.json', '');
      const expected = JSON.parse(readFileSync(join(contract, `${name}.expected.json`), 'utf8'));
      let actual: unknown;
      try { actual = migrateProject(JSON.parse(readFileSync(join(contract, file), 'utf8')), (id) => library.tracks.find((t) => t.id === id)); }
      catch (error) { actual = { error: (error as Error).message }; }
      expect(isDeepStrictEqual(JSON.parse(JSON.stringify(actual)), expected), name).toBe(true);
    }
  });

  it('reads a stored v3 snapshot as v4 with every crash off and leaves the file alone', async () => {
    const bytes = readFileSync(v3, 'utf8');
    const loaded = await loadProject(v3);
    expect(loaded.identity).toMatchObject({ schema_version: 4, stored_schema_version: 3, project_revision: 7, warnings: [] });
    expect(loaded.snapshot.project.scenes.slots.map((s) => s.crash)).toEqual([false, false, false, false]);
    expect(readFileSync(v3, 'utf8')).toBe(bytes);
  });

  it('reads a v4 snapshot and keeps the crash it states', async () => {
    const loaded = await loadProject(v4);
    expect(loaded.identity).toMatchObject({ schema_version: 4, stored_schema_version: 4, project_revision: 8 });
    expect(loaded.snapshot.project.scenes.slots.map((s) => s.crash)).toEqual([false, false, false, true]);
  });

  it('plays no crash: renders never launch a scene, so crash and v3 migration change no bytes', async () => {
    const withCrash = await loadProject(v4);
    const a = join(temp, 'crash.wav'), b = join(temp, 'no-crash.wav'), c = join(temp, 'v3.wav');
    await renderSavedProject(withCrash, settings, a);
    for (const slot of withCrash.snapshot.project.scenes.slots) slot.crash = false;
    await renderSavedProject(withCrash, settings, b);
    await renderSavedProject(await loadProject(v3), settings, c);
    const wav = readFileSync(a);
    expect(wav.length).toBe(44 + Math.round(3.25 * 48000) * 4);
    expect(wav.equals(readFileSync(b))).toBe(true);
    expect(wav.equals(readFileSync(c))).toBe(true);
  });

  it('refuses a v5 snapshot and a bare v5 project by name, before rendering', async () => {
    const message = `Project version 5 is newer than this app understands (${supportedProjectVersion()})`;
    await expect(loadProject(v5)).rejects.toThrow(message);
    const bare = join(temp, 'bare-v5.json');
    writeFileSync(bare, JSON.stringify(JSON.parse(readFileSync(v5, 'utf8')).project));
    await expect(loadProject(bare)).rejects.toThrow(message);
  });

  it('refuses a v4 scene missing crash and a v3 scene carrying one', async () => {
    const missing = JSON.parse(readFileSync(v4, 'utf8')); delete missing.project.scenes.slots[1].crash;
    const carrying = JSON.parse(readFileSync(v3, 'utf8')); carrying.project.scenes.slots[0].crash = true;
    const notBoolean = JSON.parse(readFileSync(v4, 'utf8')); notBoolean.project.scenes.slots[2].crash = 1;
    for (const [name, doc, error] of [['missing', missing, /lacks \["crash"\]/], ['carrying', carrying, /has keys \["crash"\]/], ['not-boolean', notBoolean, /crash must be true or false/]] as const) {
      const path = join(temp, `${name}.json`); writeFileSync(path, JSON.stringify(doc));
      await expect(loadProject(path), name).rejects.toThrow(error);
    }
  });
});
