/**
 * Offline rendering: drive the bckgrnd-msc engine faster than real time and
 * stream what it plays into a WAV file.
 *
 * The engine is the same `.wasm` the site runs inside an `AudioWorklet`. In the
 * browser the worklet calls `process()` with 128-frame blocks as the sound card
 * asks for them; here a loop calls it as fast as it returns.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Engine, initSync } from '../vendor/engine/bckgrnd_msc_engine.js';
import { arrangementJson, STEMS, type StemId, type TrackSummary } from './library.js';
import { WavWriter } from './wav.js';
import { atomicOutput } from './paths.js';
import type { JobOptions } from './jobs.js';
import type { MixSettings } from './settings.js';

export const SAMPLE_RATE = 48_000;
const BLOCK = 128;
/** Hand the event loop back this often, so a long render doesn't stall the server. */
const YIELD_EVERY_FRAMES = SAMPLE_RATE * 5;

let booted = false;

function boot(): void {
  if (booted) return;
  const wasm = readFileSync(fileURLToPath(new URL('../vendor/engine/bckgrnd_msc_engine_bg.wasm', import.meta.url)));
  initSync({ module: wasm });
  booted = true;
}

export interface RenderOptions extends JobOptions {
  track: TrackSummary;
  seconds: number;
  outputPath: string;
  /** Stems to silence for the whole take. */
  cut?: readonly StemId[];
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  overwrite?: boolean;
  arrangement?: MixSettings['arrangement'];
}

export interface RenderResult {
  path: string;
  track: string;
  bpm: number;
  seconds: number;
  sample_rate: number;
  cut: StemId[];
  peak_dbfs: number;
  render_ms: number;
  arrangement: 'loop' | 'evolving';
}

export async function renderTrack(opts: RenderOptions): Promise<RenderResult> {
  return atomicOutput(opts.outputPath, opts.overwrite ?? false, async (temporary) => {
    const result = await renderToFile({ ...opts, outputPath: temporary });
    return { ...result, path: opts.outputPath };
  }, opts);
}

async function renderToFile(opts: RenderOptions): Promise<RenderResult> {
  opts.signal?.throwIfAborted();
  await opts.onProgress?.(0, 'Rendering music');
  boot();
  const started = performance.now();
  const frames = Math.round(opts.seconds * SAMPLE_RATE);
  const fadeIn = Math.min(frames, Math.round((opts.fadeInSeconds ?? 0) * SAMPLE_RATE));
  const fadeOut = Math.min(frames - fadeIn, Math.round((opts.fadeOutSeconds ?? 0) * SAMPLE_RATE));
  const cut = [...new Set(opts.cut ?? [])];

  const engine = new Engine(SAMPLE_RATE);
  const arrangement = opts.arrangement ?? 'loop';
  const song = JSON.parse(arrangementJson(opts.track.id)) as { mix: Record<string, number> };
  let writer: WavWriter | undefined;
  let peak = 0;
  try {
    writer = new WavWriter(opts.outputPath, frames, SAMPLE_RATE, true);
    if (!engine.load_track_wasm(arrangementJson(opts.track.id))) {
      throw new Error(`The engine rejected the arrangement for "${opts.track.id}". Re-run the engine sync.`);
    }
    for (const stem of cut) engine.set_muted_index(STEMS.indexOf(stem), true);
    engine.play();

    const left = new Float32Array(BLOCK);
    const right = new Float32Array(BLOCK);
    let sinceYield = 0;
    for (let done = 0; done < frames; done += BLOCK) {
      if (arrangement === 'evolving') {
        const phrase = done / SAMPLE_RATE / (16 * 4 * 60 / opts.track.bpm);
        for (const [index, stem] of STEMS.entries()) {
          engine.set_volume_index(index, (song.mix[stem] ?? 0) * evolvingGain(stem, phrase));
        }
      }
      engine.process(left, right);
      const count = Math.min(BLOCK, frames - done);
      for (let i = 0; i < count; i++) {
        const g = fadeGain(done + i, frames, fadeIn, fadeOut);
        const l = (left[i] ?? 0) * g;
        const r = (right[i] ?? 0) * g;
        left[i] = l;
        right[i] = r;
        peak = Math.max(peak, Math.abs(l), Math.abs(r));
      }
      writer.write(left, right, count);
      sinceYield += count;
      if (sinceYield >= YIELD_EVERY_FRAMES) {
        sinceYield = 0;
        await new Promise((resolve) => setImmediate(resolve));
        opts.signal?.throwIfAborted();
        await opts.onProgress?.(Math.min(99, Math.floor((done + count) / frames * 100)), 'Rendering music');
      }
    }
    opts.signal?.throwIfAborted();
  } finally {
    writer?.close();
    engine.free();
  }

  return {
    path: opts.outputPath,
    track: opts.track.name,
    bpm: opts.track.bpm,
    seconds: frames / SAMPLE_RATE,
    sample_rate: SAMPLE_RATE,
    cut,
    peak_dbfs: peak > 0 ? Math.round(20 * Math.log10(peak) * 10) / 10 : -120,
    render_ms: Math.round(performance.now() - started),
    arrangement,
  };
}

/** A four-phrase arc; cosine transitions avoid sudden stem changes. Cuts always stay muted. */
export function evolvingGain(stem: StemId, phrase: number): number {
  const levels: Record<StemId, readonly number[]> = {
    kick: [0.65, 1, 0.45, 0.85], clap: [0.35, 0.7, 0.15, 0.6],
    hats: [0.4, 0.8, 0.25, 0.65], bass: [0.9, 1, 0.85, 1],
    stab: [0.55, 0.8, 0.35, 0.7], lead: [0.25, 0.55, 0.1, 0.4],
    pad: [1, 0.85, 1, 0.9], arp: [0.2, 0.55, 0.15, 0.4],
  };
  const part = Math.floor(phrase) % 4;
  const blend = (1 - Math.cos(Math.PI * (phrase % 1))) / 2;
  return levels[stem][part]! * (1 - blend) + levels[stem][(part + 1) % 4]! * blend;
}

/** Raised-cosine fades, so the ends don't start or stop on a corner. */
export function fadeGain(frame: number, frames: number, fadeIn: number, fadeOut: number): number {
  if (fadeIn > 0 && frame < fadeIn) return 0.5 - 0.5 * Math.cos((Math.PI * frame) / fadeIn);
  const fromEnd = frames - 1 - frame;
  if (fadeOut > 0 && fromEnd < fadeOut) return 0.5 - 0.5 * Math.cos((Math.PI * fromEnd) / fadeOut);
  return 1;
}
