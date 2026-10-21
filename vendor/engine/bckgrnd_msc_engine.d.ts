/* tslint:disable */
/* eslint-disable */

/**
 * One engine instance. Owns the voices, buses, master chain and transport.
 *
 * Two engines can run side by side against the same output buffer, which is how the
 * desktop build performs a beat-matched auto-mix: it crossfades two of these.
 */
export class Engine {
    free(): void;
    [Symbol.dispose](): void;
    /**
     * Capture the last ~1.35 s of output and play it backwards with a rising rate.
     *
     * This replaces the original's `ScriptProcessorNode` tap. If nothing worth
     * reversing has played yet, a synthetic sweep stands in, as the original did.
     */
    backspin(): void;
    brake(): void;
    echo_enabled(): boolean;
    is_playing(): boolean;
    jump(step: number): void;
    /**
     * Copy the eight meter levels into a caller-owned buffer.
     *
     * Telemetry runs at ~30 Hz, not per block, so this exists to avoid
     * serialising to JSON on the audio thread.
     */
    levels_into(out: Float32Array): void;
    levels_json(): string;
    load_track_wasm(json: string): boolean;
    static new(sample_rate: number): Engine;
    constructor(sample_rate: number);
    nudge(dir: number): void;
    play(): void;
    /**
     * Render `out_l`/`out_r` in place. This is the audio callback's entry point and
     * does no allocation on the audio path.
     */
    process(out_l: Float32Array, out_r: Float32Array): void;
    /**
     * Samples until the next downbeat `bars` from now, at least `min_ahead` away.
     *
     * The worklet uses this to schedule an auto-mix handover on a musical boundary
     * without a timer — the same job the original did with
     * `nextDownbeat()`.
     */
    samples_to_next_downbeat(bars: number, min_ahead: number): number;
    scope_json(): string;
    /**
     * Let go of the platter and drop the needle at `step` (0..256, the space of
     * [`Engine::jump`] and `visual_step`).
     *
     * The reader fades out over 15 ms while the transport resumes at normal speed,
     * firing `step` on the next sample if it was playing when the scratch began.
     * With a loop set, a step outside it is folded into the loop at the same
     * position in the bar grid. Without a scratch in progress this is a plain jump.
     */
    scratch_end(step: number): void;
    /**
     * Signed platter speed for a scratch: 1 forward at normal speed, -1 backward, 0
     * held still. Clamped to +/-4; anything not finite reads as 0. The actual speed
     * glides toward this with about 20 ms of inertia. Ignored when not scratching.
     */
    scratch_rate(rate: number): void;
    /**
     * Let go of a scratch, if there is one, and carry on from the step it was
     * grabbed on. A no-op when not scratching.
     *
     * For a mix: the handover is timed from this deck's next downbeat, and a held
     * transport never reaches one, so the platter has to be released before the
     * mix measures where that downbeat is.
     */
    scratch_release(): void;
    /**
     * Grab the platter: freeze the recent output for scratching and pause the
     * transport where it is.
     *
     * No steps fire until [`Engine::scratch_end`]; the sequenced voices fade out over
     * 15 ms and are then dropped, so the output is the scratch reader alone, summed
     * into the master like the backspin take. The reader starts at "now", standing
     * still, and can reach back across the ring (just under four seconds once that
     * much has played).
     *
     * Calling this while already scratching is a no-op: the cursor stays where the
     * hand left it. Calling it during the release fade of a scratch recaptures.
     */
    scratch_start(): void;
    /**
     * Three-band isolator, given as 0..1 amounts per band.
     */
    set_bands(low: number, mid: number, high: number): void;
    set_bpm(bpm: number): void;
    set_echo(on: boolean): void;
    /**
     * Echo time in beats: 0.25 a sixteenth, 0.75 a dotted eighth (the default), 1 a
     * quarter, and so on; 0 turns the stems' echo off. Kept across track loads and
     * retimed with the tempo.
     */
    set_echo_time(beats: number): void;
    /**
     * Filter position, 0 (dark) to 1 (open).
     */
    set_filter(open: number): void;
    set_loop(bars: number): void;
    set_master(gain: number): void;
    set_muted_index(index: number, muted: boolean): void;
    /**
     * Post-master output trim.
     *
     * Used by the worklet's two-deck host to crossfade between engines during an
     * auto-mix: both render every block, and only their relative trim changes.
     */
    set_output_gain(gain: number): void;
    set_output_gain_wasm(gain: number): void;
    set_solo_index(index: number, solo: boolean): void;
    /**
     * Where the output sits between the channels: 0 mono-left, 0.5 stereo, 1
     * mono-right. The continuous form of [`Engine::set_stereo_mode`].
     */
    set_stereo_balance(balance: number): void;
    set_stereo_mode(mode: number): void;
    set_swing(swing: number): void;
    set_volume_index(index: number, vol: number): void;
    stop(): void;
    visual_step(): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_engine_free: (a: number, b: number) => void;
    readonly engine_backspin: (a: number) => void;
    readonly engine_brake: (a: number) => void;
    readonly engine_echo_enabled: (a: number) => number;
    readonly engine_is_playing: (a: number) => number;
    readonly engine_jump: (a: number, b: number) => void;
    readonly engine_levels_into: (a: number, b: number, c: number, d: any) => void;
    readonly engine_levels_json: (a: number) => [number, number];
    readonly engine_load_track_wasm: (a: number, b: number, c: number) => number;
    readonly engine_new: (a: number) => number;
    readonly engine_new_wasm: (a: number) => number;
    readonly engine_nudge: (a: number, b: number) => void;
    readonly engine_play: (a: number) => void;
    readonly engine_process: (a: number, b: number, c: number, d: any, e: number, f: number, g: any) => void;
    readonly engine_samples_to_next_downbeat: (a: number, b: number, c: number) => number;
    readonly engine_scope_json: (a: number) => [number, number];
    readonly engine_scratch_end: (a: number, b: number) => void;
    readonly engine_scratch_rate: (a: number, b: number) => void;
    readonly engine_scratch_release: (a: number) => void;
    readonly engine_scratch_start: (a: number) => void;
    readonly engine_set_bands: (a: number, b: number, c: number, d: number) => void;
    readonly engine_set_bpm: (a: number, b: number) => void;
    readonly engine_set_echo: (a: number, b: number) => void;
    readonly engine_set_echo_time: (a: number, b: number) => void;
    readonly engine_set_filter: (a: number, b: number) => void;
    readonly engine_set_loop: (a: number, b: number) => void;
    readonly engine_set_master: (a: number, b: number) => void;
    readonly engine_set_muted_index: (a: number, b: number, c: number) => void;
    readonly engine_set_output_gain: (a: number, b: number) => void;
    readonly engine_set_output_gain_wasm: (a: number, b: number) => void;
    readonly engine_set_solo_index: (a: number, b: number, c: number) => void;
    readonly engine_set_stereo_balance: (a: number, b: number) => void;
    readonly engine_set_stereo_mode: (a: number, b: number) => void;
    readonly engine_set_swing: (a: number, b: number) => void;
    readonly engine_set_volume_index: (a: number, b: number, c: number) => void;
    readonly engine_stop: (a: number) => void;
    readonly engine_visual_step: (a: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
