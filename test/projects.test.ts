import { mkdtempSync, readFileSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, expect, it } from 'vitest';
import { loadProject, renderSavedProject } from '../src/projects.js';
import { mixNarration } from '../src/workflow.js';
import { migratePreset, readPreset } from '../src/presets.js';
import { projectFromTrack, snapshotOf } from '../vendor/shared/runtime.js';

const temp = mkdtempSync(join(tmpdir(), 'bckgrnd project café '));
const fixture = fileURLToPath(new URL('../vendor/fixtures/release/edited.bckgrnd.json', import.meta.url));
const silent = fileURLToPath(new URL('../vendor/fixtures/release/silent.bckgrnd.json', import.meta.url));
const voice = fileURLToPath(new URL('./fixtures/speech.wav', import.meta.url));
const settings = { seconds: 4, startSeconds: 0, fadeInSeconds: 0, fadeOutSeconds: 0.02, tailSeconds: 0, sampleRate: 48000 };
afterAll(() => rmSync(temp, { recursive: true, force: true }));

it('validates edited notes, explicit empty drums, pinned alternatives and sustained effects', async () => {
  const loaded = await loadProject(fixture);
  expect(loaded.identity.project_revision).toBe(7);
  expect(loaded.snapshot.project.patterns.kick?.events).toEqual([]);
  expect(loaded.snapshot.project.patterns.bass?.events[0]).toMatchObject({ notes: [38] });
  const first = join(temp, 'first.wav'), second = join(temp, 'second.wav');
  const result = await renderSavedProject(loaded, settings, first);
  expect(result.frames).toBe(192000); expect(result.rms).toBeGreaterThan(0.001);
  // A scene is an alternative, never an implied timeline. Previous render RNG
  // state must not leak into the next render.
  loaded.snapshot.project.scenes.slots[3]!.patterns = {};
  await renderSavedProject(loaded, settings, second);
  expect(readFileSync(first).equals(readFileSync(second))).toBe(true);
  const factory = projectFromTrack(loaded.source);
  loaded.snapshot = await snapshotOf(factory, loaded.source, 'factory', 1);
  const stock = join(temp, 'stock.wav'); await renderSavedProject(loaded, settings, stock);
  expect(readFileSync(first).equals(readFileSync(stock))).toBe(false);
});

it('renders intentional silence with exact range and tail frames', async () => {
  const result = await renderSavedProject(await loadProject(silent), { ...settings, sampleRate: 44100, seconds: 1, tailSeconds: 0.5 }, join(temp, 'silent.wav'));
  expect(result.frames).toBe(66150); expect(result.peak).toBe(0); expect(result.rms).toBe(0);
  expect(readFileSync(result.path).subarray(44).some((b) => b !== 0)).toBe(false);
});

it('refuses malformed data, future versions and library drift before publishing output', async () => {
  for (const mutate of [
    (s: Record<string, unknown>) => { s.version = 99; },
    (s: Record<string, unknown>) => { s.renderer = 'future'; },
    (s: Record<string, unknown>) => { s.source = { trackId: 'warehouse', sha256: '0'.repeat(64) }; },
    (s: Record<string, unknown>) => { (s.project as { patterns: unknown }).patterns = { kick: { lane: 'unknown' } }; },
  ]) {
    const raw = JSON.parse(readFileSync(fixture, 'utf8')); mutate(raw);
    const path = join(temp, 'invalid.json'); writeFileSync(path, JSON.stringify(raw));
    await expect(loadProject(path)).rejects.toThrow();
  }
  await expect(renderSavedProject(await loadProject(fixture), settings, join(temp, 'bad.mp3'))).rejects.toThrow('must end in');
  expect(existsSync(join(temp, 'bad.mp3'))).toBe(false);
});

it('cancels without publishing or replacing an existing output', async () => {
  const abort = new AbortController(); const path = join(temp, 'cancelled.wav'); writeFileSync(path, 'previous');
  await expect(renderSavedProject(await loadProject(fixture), { ...settings, seconds: 120 }, path, true, {
    signal: abort.signal, onProgress: async () => { abort.abort(); },
  })).rejects.toThrow('cancelled');
  expect(readFileSync(path, 'utf8')).toBe('previous');
});

it('mixes the same saved revision locally and separates voice settings from music', async () => {
  const result = await mixNarration({ project_path: fixture, voice_path: voice, output_path: join(temp, 'narration.wav'), duck: false, lead_in_seconds: 0, tail_seconds: 0 });
  expect(result.project?.project_revision).toBe(7);
  expect(result.project?.project_sha256).toBe((await loadProject(fixture)).identity.project_sha256);
  await expect(mixNarration({ project_path: fixture, track: 'rain', voice_path: voice })).rejects.toThrow('exactly one');
  await expect(mixNarration({ project_path: fixture, cut: ['bass'], voice_path: voice })).rejects.toThrow('owns its musical settings');
});

it('reports a missing narration executable while project WAV rendering still works', async () => {
  const previous = process.env.FFPROBE_PATH; process.env.FFPROBE_PATH = join(temp, 'missing ffprobe');
  try {
    await expect(mixNarration({ project_path: fixture, voice_path: voice })).rejects.toThrow(/ffmpeg|ffprobe|not found|ENOENT/i);
    const rendered = await renderSavedProject(await loadProject(fixture), { ...settings, seconds: 1 }, join(temp, 'independent.wav'));
    expect(rendered.rms).toBeGreaterThan(0);
  } finally { if (previous === undefined) delete process.env.FFPROBE_PATH; else process.env.FFPROBE_PATH = previous; }
});

it('backs up preset migration and retains all voice and performance settings', async () => {
  const previous = process.env.BCKGRND_MSC_CONFIG_DIR; process.env.BCKGRND_MSC_CONFIG_DIR = temp;
  const { mkdirSync } = await import('node:fs'); mkdirSync(join(temp, 'presets'));
  const settings = { track: 'rain', cut: ['lead'], music_db: -22, ducking: 'strong', final_lufs: -18, arrangement: 'evolving' };
  const raw = JSON.stringify(settings); writeFileSync(join(temp, 'presets/favorite.json'), raw);
  try {
    const migrated = await migratePreset('favorite');
    expect(readFileSync(migrated.original_backup, 'utf8')).toBe(raw);
    expect(readPreset('favorite')).toEqual(settings);
    expect(migrated.voice_settings).toMatchObject({ music_db: -22, ducking: 'strong', final_lufs: -18 });
    expect((await loadProject(migrated.project_path)).snapshot.project.stems.lead.muted).toBe(true);
  } finally { if (previous === undefined) delete process.env.BCKGRND_MSC_CONFIG_DIR; else process.env.BCKGRND_MSC_CONFIG_DIR = previous; }
});
