/**
 * Beat maps: where every beat and bar of a rendered track lands, read from the
 * engine rather than worked out from the nominal tempo.
 *
 * The engine starts each sixteenth on a whole sample, so a bar runs a few
 * samples longer than 4 × 60 / bpm says. Rain's bar is 137,152 samples, not
 * 137,142.86. Over an hour that drift reaches a quarter of a second, which is a
 * visible miss on a video cut. So the grid is measured: one bar is played a
 * sample at a time and the start of each step recorded. Swing moves only the
 * off-beat sixteenths, so the quarter-note beats stay evenly spaced, and the
 * bar repeats exactly.
 */

import { writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { Engine } from '../vendor/engine/bckgrnd_msc_engine.js';
import { arrangementJson, findTrack, unknownTrackMessage, type TrackSummary } from './library.js';
import { boot, SAMPLE_RATE } from './render.js';
import { atomicOutput, defaultOutDir, outputProblem } from './paths.js';

export const STEPS_PER_BAR = 16;
export const BEATS_PER_BAR = 4;
const STEPS_PER_BEAT = STEPS_PER_BAR / BEATS_PER_BAR;
/** Past this many beats the list goes to a file instead of the tool result. */
export const MAX_INLINE_BEATS = 1000;
const MAX_SECONDS = 3600;

export interface Grid {
  /** Samples from one beat to the next. Always a whole number. */
  beatSamples: number;
  barSamples: number;
}

const grids = new Map<string, Grid>();

/** Play one bar a sample at a time and read where the engine starts each step. */
export function measureGrid(track: TrackSummary): Grid {
  const cached = grids.get(track.id);
  if (cached) return cached;
  boot();
  const engine = new Engine(SAMPLE_RATE);
  try {
    if (!engine.load_track_wasm(arrangementJson(track.id))) {
      throw new Error(`The engine rejected the arrangement for "${track.id}". Re-run the engine sync.`);
    }
    engine.play();
    const left = new Float32Array(1);
    const right = new Float32Array(1);
    const starts: number[] = [];
    let last = engine.visual_step();
    // A bar is under four seconds at the slowest tempo; ten is a generous ceiling.
    for (let frame = 0; starts.length <= STEPS_PER_BAR && frame < SAMPLE_RATE * 10; frame++) {
      engine.process(left, right);
      const step = engine.visual_step();
      if (step !== last) {
        if (step !== starts.length) throw new Error(`Step ${starts.length} expected at sample ${frame}, the engine reported ${step}.`);
        starts.push(frame);
        last = step;
      }
    }
    if (starts.length <= STEPS_PER_BAR || starts[0] !== 0) throw new Error(`Could not measure a full bar of "${track.id}".`);
    const barSamples = starts[STEPS_PER_BAR]!;
    const beatSamples = barSamples / BEATS_PER_BAR;
    for (let beat = 0; beat < BEATS_PER_BAR; beat++) {
      if (starts[beat * STEPS_PER_BEAT] !== beat * beatSamples) {
        throw new Error(`The beats of "${track.id}" are not evenly spaced; its grid can't be mapped.`);
      }
    }
    const grid = { beatSamples, barSamples };
    grids.set(track.id, grid);
    return grid;
  } finally {
    engine.free();
  }
}

export interface Beat {
  /** Seconds from the start of the music, plus any offset. */
  time: number;
  /** Bar number, counting from 1. */
  bar: number;
  /** Beat within the bar, 1 to 4. Beat 1 is the downbeat. */
  beat: number;
}

/** Every beat that starts inside `seconds` of music. */
export function beatList(grid: Grid, seconds: number, offsetSeconds = 0): Beat[] {
  const frames = Math.round(seconds * SAMPLE_RATE);
  const beats: Beat[] = [];
  for (let index = 0; index * grid.beatSamples < frames; index++) {
    beats.push({
      time: round6(offsetSeconds + (index * grid.beatSamples) / SAMPLE_RATE),
      bar: Math.floor(index / BEATS_PER_BAR) + 1,
      beat: (index % BEATS_PER_BAR) + 1,
    });
  }
  return beats;
}

/** Six decimals keeps sample accuracy: one sample at 48 kHz is about 21 µs. */
function round6(value: number): number {
  return Math.round(value * 1e6) / 1e6;
}

function beatsCsv(beats: readonly Beat[]): string {
  return ['time,bar,beat', ...beats.map((b) => `${b.time},${b.bar},${b.beat}`)].join('\n') + '\n';
}

export const beatMapInput = {
  track: z.string().min(1).describe('Track id or name, e.g. "rain"'),
  seconds: z.number().min(1).max(MAX_SECONDS).describe('Length of the music, the same seconds you render or the total_seconds of a mix'),
  offset_seconds: z.number().min(0).max(MAX_SECONDS).default(0).describe('Where the music starts on your timeline; added to every time'),
};

export const beatMapOutput = {
  track: z.string(),
  bpm: z.number(),
  measured_bpm: z.number(),
  sample_rate: z.number(),
  beats_per_bar: z.number(),
  beat_seconds: z.number(),
  bar_seconds: z.number(),
  beat_samples: z.number(),
  bar_samples: z.number(),
  seconds: z.number(),
  offset_seconds: z.number(),
  beat_count: z.number(),
  bar_count: z.number(),
  beats: z.array(z.object({ time: z.number(), bar: z.number(), beat: z.number() })).optional(),
  path: z.string().optional(),
};

export interface BeatMap {
  track: string;
  bpm: number;
  measured_bpm: number;
  sample_rate: number;
  beats_per_bar: number;
  beat_seconds: number;
  bar_seconds: number;
  /** Exact, in whole samples: beat n starts at offset + n * beat_samples / sample_rate. */
  beat_samples: number;
  bar_samples: number;
  seconds: number;
  offset_seconds: number;
  beat_count: number;
  bar_count: number;
  beats: Beat[];
}

export function beatMap(track: TrackSummary, seconds: number, offsetSeconds = 0): BeatMap {
  const grid = measureGrid(track);
  const beats = beatList(grid, seconds, offsetSeconds);
  return {
    track: track.name,
    bpm: track.bpm,
    measured_bpm: Math.round((60 * SAMPLE_RATE / grid.beatSamples) * 1e4) / 1e4,
    sample_rate: SAMPLE_RATE,
    beats_per_bar: BEATS_PER_BAR,
    beat_seconds: round6(grid.beatSamples / SAMPLE_RATE),
    bar_seconds: round6(grid.barSamples / SAMPLE_RATE),
    beat_samples: grid.beatSamples,
    bar_samples: grid.barSamples,
    seconds,
    offset_seconds: offsetSeconds,
    beat_count: beats.length,
    bar_count: beats.length ? beats.at(-1)!.bar : 0,
    beats,
  };
}

function summary(map: BeatMap, path?: string): string {
  const head = `${map.track}: ${map.beat_count} beats in ${map.bar_count} bars, one beat every ${map.beat_seconds} s (${map.measured_bpm} bpm as rendered).`;
  return path ? `${head}\n${path}` : head;
}

export function registerBeatMap(server: McpServer): void {
  server.registerTool('bckgrnd_beat_map', {
    title: 'Map the beats of a track',
    description: `List the exact time of every beat and bar in a rendered track, for cutting video, timing captions or placing animation on the beat. Nothing is rendered; it is instant.

The times come from the engine itself, not from the bpm, and match the WAV sample for sample at any length. The nominal bpm drifts: about 0.25 s over an hour at 84 bpm.

The music starts at 0:00 in bckgrnd_render_track output and in bckgrnd_mix_under_voice and bckgrnd_mix_video results (the lead-in delays only the voice), so pass the same seconds (or the mix's total_seconds) and leave offset_seconds at 0. Use offset_seconds when you place the music later on your own timeline.

Args:
  - track (string): track id or name from bckgrnd_list_tracks
  - seconds (number): length of the music, 1-${MAX_SECONDS}
  - offset_seconds (number, default 0): added to every time
  - output_path (string, optional): absolute path ending in .json or .csv (time,bar,beat) to save every beat

Returns: { track, bpm, measured_bpm, sample_rate, beats_per_bar, beat_seconds, bar_seconds, beat_samples, bar_samples, seconds, offset_seconds, beat_count, bar_count, beats?: [{ time, bar, beat }], path? }
beats is inline up to ${MAX_INLINE_BEATS}; a longer list is saved to a file and its path returned instead. beat_samples is exact: beat n starts at offset_seconds + n * beat_samples / sample_rate.`,
    inputSchema: {
      ...beatMapInput,
      output_path: z.string().optional().describe('Absolute path ending in .json or .csv'),
      overwrite: z.boolean().default(false).describe('Replace output_path if it already exists'),
    },
    outputSchema: beatMapOutput,
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, async ({ track: asked, seconds, offset_seconds, output_path, overwrite }) => {
    try {
      const track = findTrack(asked);
      if (!track) throw new Error(unknownTrackMessage(asked));
      const map = beatMap(track, seconds, offset_seconds);
      const path = output_path ?? (map.beat_count > MAX_INLINE_BEATS ? join(defaultOutDir(), `${track.id}-${Math.round(seconds)}s-beats-${randomUUID()}.csv`) : undefined);
      if (path) {
        const problem = outputProblem(path, ['.json', '.csv'], overwrite);
        if (problem) throw new Error(problem);
        const body = extname(path).toLowerCase() === '.csv' ? beatsCsv(map.beats) : JSON.stringify(map, null, 2) + '\n';
        await atomicOutput(path, overwrite, async (temporary) => { writeFileSync(temporary, body); });
      }
      const { beats, ...grid } = map;
      const result = beats.length <= MAX_INLINE_BEATS ? { ...map, ...(path ? { path } : {}) } : { ...grid, path: path! };
      return { content: [{ type: 'text', text: summary(map, path) }], structuredContent: result };
    } catch (error) {
      return { isError: true, content: [{ type: 'text', text: `Error: ${(error as Error).message}` }] };
    }
  });
}
