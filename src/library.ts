/**
 * The track library, read from the JSON bckgrnd-msc exports.
 *
 * `vendor/library/index.json` lists the tracks; each `<id>.json` holds the full
 * arrangement under `track`, which is the exact object the engine's
 * `load_track_wasm` parses.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { moodFor, type Mood } from './moods.js';

const libraryDir = fileURLToPath(new URL('../vendor/library/', import.meta.url));

/** The eight stems, in the engine's mixer order (`Stem::ALL`). */
export const STEMS = ['kick', 'clap', 'hats', 'bass', 'stab', 'lead', 'pad', 'arp'] as const;
export type StemId = (typeof STEMS)[number];

export interface TrackSummary extends Mood {
  id: string;
  name: string;
  section: string;
  style: string;
  bpm: number;
  kind: string;
}

interface IndexFile {
  tracks: Array<Omit<TrackSummary, keyof Mood> & Record<string, unknown>>;
}

let cached: TrackSummary[] | null = null;

/** Every track, in library order. */
export function listTracks(): TrackSummary[] {
  if (!cached) {
    const index = JSON.parse(readFileSync(`${libraryDir}index.json`, 'utf8')) as IndexFile;
    cached = index.tracks.map(({ id, name, section, style, bpm, kind }) => ({
      id,
      name,
      section,
      style,
      bpm,
      kind,
      ...moodFor(style),
    }));
  }
  return cached;
}

/** Find a track by id or display name, ignoring case. */
export function findTrack(idOrName: string): TrackSummary | undefined {
  const key = idOrName.trim().toLowerCase();
  return listTracks().find((t) => t.id === key || t.name.toLowerCase() === key);
}

/** The arrangement JSON for one track, ready for `Engine.load_track_wasm`. */
export function arrangementJson(id: string): string {
  const file = JSON.parse(readFileSync(`${libraryDir}${id}.json`, 'utf8')) as { track: unknown };
  return JSON.stringify(file.track);
}

/** An error message that names the tracks that do exist. */
export function unknownTrackMessage(asked: string): string {
  const ids = listTracks()
    .map((t) => t.id)
    .join(', ');
  return `No track called "${asked}". Use one of: ${ids}. Call bckgrnd_list_tracks for styles and tempos.`;
}
