import { mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync, existsSync, copyFileSync, constants } from 'node:fs';
import { homedir } from 'node:os';
import { join, isAbsolute } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { atomicOutput } from './paths.js';
import { findTrack, unknownTrackMessage } from './library.js';
import { projectFromTrack, snapshotOf, type TrackArrangement } from '../vendor/shared/runtime.js';
import { mixSettingsSchema, presetNameSchema, type MixSettings } from './settings.js';

export function presetDir(): string {
  const root = process.env.BCKGRND_MSC_CONFIG_DIR ?? join(homedir(), '.config', 'bckgrnd-msc');
  if (!isAbsolute(root)) throw new Error('BCKGRND_MSC_CONFIG_DIR must be absolute.');
  return join(root, 'presets');
}
function presetPath(name: string): string { return join(presetDir(), `${presetNameSchema.parse(name)}.json`); }

export function readPreset(name: string): MixSettings {
  const path = presetPath(name);
  if (!existsSync(path)) throw new Error(`No preset called "${name}". List saved settings with bckgrnd_presets.`);
  return mixSettingsSchema.parse(JSON.parse(readFileSync(path, 'utf8')));
}

export function resolveSettings(input: MixSettings & { preset?: string; music_path?: string; project_path?: string }): MixSettings {
  const explicit = Object.fromEntries(Object.entries(input).filter(([key, value]) => key in mixSettingsSchema.shape && value !== undefined));
  const settings = { ...(input.preset ? readPreset(input.preset) : {}), ...explicit };
  if ((input.music_path || input.project_path) && input.track === undefined) delete settings.track;
  if (input.project_path) {
    if (input.cut === undefined) delete settings.cut;
    if (input.arrangement === undefined) delete settings.arrangement;
  }
  return mixSettingsSchema.parse(settings);
}

export function registerPresets(server: McpServer): void {
  server.registerTool('bckgrnd_presets', {
    title: 'Save and reuse favorite mix settings',
    description: 'List, get, save, delete or migrate local named presets. migrate backs up the original and exports its track/cut musical subset to a saved project; voice and performance settings remain intact. Saves track, levels, ducking, stem cuts, arrangement and intro/outro/mastering settings, never media paths. save refuses an existing name unless overwrite:true. Explicit mix arguments override a preset.',
    inputSchema: {
      action: z.enum(['list', 'get', 'save', 'delete', 'migrate']), name: presetNameSchema.optional(),
      settings: mixSettingsSchema.optional(), overwrite: z.boolean().default(false),
    },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, async ({ action, name, settings, overwrite }) => {
    try {
      if (action === 'list') {
        const names = existsSync(presetDir()) ? readdirSync(presetDir()).filter((f) => /^[a-z0-9][a-z0-9-]{0,63}\.json$/.test(f)).map((f) => f.slice(0, -5)).sort() : [];
        return { content: [{ type: 'text', text: names.join('\n') || 'No saved presets yet.' }], structuredContent: { presets: names } };
      }
      if (!name) throw new Error(`name is required for ${action}.`);
      if (action === 'migrate') {
        const result = await migratePreset(name);
        return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result };
      }
      if (action === 'save') {
        if (!settings || Object.keys(settings).length === 0) throw new Error('Provide at least one setting to save.');
        if (settings.track && !findTrack(settings.track)) throw new Error(unknownTrackMessage(settings.track));
        if (settings.true_peak_dbfs !== undefined && settings.final_lufs === undefined) throw new Error('Set final_lufs when specifying a true-peak ceiling.');
        mkdirSync(presetDir(), { recursive: true });
        if (!overwrite && existsSync(presetPath(name))) throw new Error(`Preset "${name}" already exists. Use overwrite:true to replace it.`);
        await atomicOutput(presetPath(name), overwrite, async (temporary) => { writeFileSync(temporary, JSON.stringify(settings, null, 2) + '\n', { mode: 0o600 }); });
      }
      if (action === 'delete') { readPreset(name); unlinkSync(presetPath(name)); }
      const result = { name, ...(action === 'delete' ? { deleted: true } : { settings: readPreset(name) }) };
      return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], structuredContent: result };
    } catch (error) { return { isError: true, content: [{ type: 'text', text: (error as Error).message }] }; }
  });
}

/** Add a portable musical document without rewriting the user's voice preset. */
export async function migratePreset(name: string) {
  const settings = readPreset(name);
  if (!settings.track) throw new Error('This preset has no stock track to migrate.');
  const track = findTrack(settings.track); if (!track) throw new Error(unknownTrackMessage(settings.track));
  const source = JSON.parse(readFileSync(new URL(`../vendor/library/${track.id}.json`, import.meta.url), 'utf8')).track as TrackArrangement;
  const project = projectFromTrack(source); project.name = name;
  for (const stem of settings.cut ?? []) project.stems[stem].muted = true;
  const snapshot = await snapshotOf(project, source, crypto.randomUUID(), 1);
  const backup = `${presetPath(name)}.original`;
  if (!existsSync(backup)) copyFileSync(presetPath(name), backup, constants.COPYFILE_EXCL);
  const dir = join(presetDir(), 'projects'); mkdirSync(dir, { recursive: true });
  const path = join(dir, `${name}.bckgrnd.json`);
  await atomicOutput(path, false, async (temporary) => { writeFileSync(temporary, JSON.stringify(snapshot, null, 2)); });
  const { track: _track, cut: _cut, arrangement, ...voice } = settings;
  void _track; void _cut;
  return { project_path: path, original_backup: backup, voice_settings: voice,
    performance_settings: { arrangement: arrangement ?? 'loop' },
    warnings: arrangement === 'evolving' ? ['Evolving stock arrangements are preserved in the original preset, not converted into a scene sequence.'] : [] };
}
