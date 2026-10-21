/**
 * Offline rendering: drive the bckgrnd-msc engine faster than real time and
 * stream what it plays into a WAV file.
 *
 * The engine is the same `.wasm` the site runs inside an `AudioWorklet`. In the
 * browser the worklet calls `process()` with 128-frame blocks as the sound card
 * asks for them; here a loop calls it as fast as it returns.
 */

import { readFileSync, unlinkSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Engine, initSync } from '../vendor/engine/bckgrnd_msc_engine.js';
import { arrangementJson, STEMS, type StemId, type TrackSummary } from './library.js';
import { WavWriter } from './wav.js';

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

export interface RenderOptions {
  track: TrackSummary;
  seconds: number;
  outputPath: string;
  /** Stems to silence for the whole take. */
  cut?: readonly StemId[];
  fadeInSeconds?: number;
  fadeOutSeconds?: number;
  overwrite?: boolean;
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
}

export async function renderTrack(opts: RenderOptions): Promise<RenderResult> {
  boot();
  const started = performance.now();
  const frames = Math.round(opts.seconds * SAMPLE_RATE);
  const fadeIn = Math.min(frames, Math.round((opts.fadeInSeconds ?? 0) * SAMPLE_RATE));
  const fadeOut = Math.min(frames - fadeIn, Math.round((opts.fadeOutSeconds ?? 0) * SAMPLE_RATE));
  const cut = [...new Set(opts.cut ?? [])];

  const engine = new Engine(SAMPLE_RATE);
  const writer = new WavWriter(opts.outputPath, frames, SAMPLE_RATE, !opts.overwrite);
  let peak = 0;
  let finished = false;
  try {
    if (!engine.load_track_wasm(arrangementJson(opts.track.id))) {
      throw new Error(`The engine rejected the arrangement for "${opts.track.id}". Re-run the engine sync.`);
    }
    for (const stem of cut) engine.set_muted_index(STEMS.indexOf(stem), true);
    engine.play();

    const left = new Float32Array(BLOCK);
    const right = new Float32Array(BLOCK);
    let sinceYield = 0;
    for (let done = 0; done < frames; done += BLOCK) {
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
      }
    }
    finished = true;
  } finally {
    writer.close();
    engine.free();
    // A half-written WAV has a header that promises samples it doesn't have.
    if (!finished) unlinkSync(opts.outputPath);
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
  };
}

/** Raised-cosine fades, so the ends don't start or stop on a corner. */
export function fadeGain(frame: number, frames: number, fadeIn: number, fadeOut: number): number {
  if (fadeIn > 0 && frame < fadeIn) return 0.5 - 0.5 * Math.cos((Math.PI * frame) / fadeIn);
  const fromEnd = frames - 1 - frame;
  if (fadeOut > 0 && fromEnd < fadeOut) return 0.5 - 0.5 * Math.cos((Math.PI * fromEnd) / fadeOut);
  return 1;
}
