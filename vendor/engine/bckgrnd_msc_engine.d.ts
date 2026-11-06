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
     * The request id of the fill playing now, if one is.
     */
    active_fill(): number | undefined;
    /**
     * Capture the last ~1.35 s of output and play it backwards with a rising rate.
     *
     * This replaces the original's `ScriptProcessorNode` tap. If nothing worth
     * reversing has played yet, a synthetic sweep stands in, as the original did.
     */
    backspin(): void;
    brake(): void;
    /**
     * Cancel the queued fill if it is `request_id` (`fill cancelled`, reason 10).
     * False when it is not queued: never queued, already started (a playing fill
     * runs its bar), or already cancelled.
     */
    cancel_fill(request_id: number): boolean;
    /**
     * Withdraw a pending pattern revision (standalone or scene-linked) by request id.
     * False when it is not pending: already applied, replaced or unknown.
     */
    cancel_patterns(request_id: number): boolean;
    /**
     * Cancel whatever scene and fill are pending, and cut short an active fill, for
     * a structural reason the host knows about and the engine does not (an auto-mix
     * starting or a promote is 4). False when there was none of those. Held
     * gestures are not touched; see [`Engine::release_gestures`].
     */
    cancel_pending(why: number): boolean;
    /**
     * Cancel the pending scene if it is `request_id`, reported as `cancelled` with
     * reason 10. False when it is not pending: already applied, replaced, cancelled,
     * or never queued.
     */
    cancel_scene(request_id: number): boolean;
    /**
     * Events overwritten before they were drained, since the engine was made. The
     * ring keeps the newest [`scene::EVENT_CAPACITY`]; anything above zero here means
     * requests arrived faster than the host drained them.
     */
    dropped_events(): number;
    /**
     * Whether the latched throw is on. Says nothing about held gestures: nothing
     * here reads an override back as if it were the base.
     */
    echo_enabled(): boolean;
    /**
     * Offline end of score: stop new events, release notes, retain effect tails.
     * Unlike the interactive Stop command this deliberately does not reset returns.
     */
    end_score(): void;
    /**
     * Events waiting to be drained. Cheap, so the worklet can ask every block and
     * only pay for [`Engine::take_events_into`] when there is something to take.
     */
    event_count(): number;
    /**
     * Begin a temporary override (`docs/NIGHT3_PROTOCOL.md`, Gestures): kind 1 Echo
     * Throw, 2 Filter Hold. False (nothing changed) for an unknown kind, a token
     * already held, or when four are already held. The override expires after 3 s
     * of rendered audio unless [`Engine::gesture_renew`] is called (event 21).
     */
    gesture_begin(token: number, kind: number): boolean;
    /**
     * End `token`'s override only, revealing the next held one of its kind or the
     * base as it is now. False when the token is not held.
     */
    gesture_end(token: number): boolean;
    /**
     * Restart `token`'s 3 s lease. False when the token is not held.
     */
    gesture_renew(token: number): boolean;
    is_playing(): boolean;
    /**
     * Cue or seek. Cancels a pending scene and fill and ends an active fill
     * (`transport`).
     */
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
    /**
     * Panic: cancel the pending scene and fill (`panic`), cut short an active fill,
     * release every gesture and the latched throw, stop playback and clear the
     * tails. Not the same as [`Engine::cancel_pending`], which only withdraws what
     * is queued.
     */
    panic(): void;
    /**
     * The request id of the queued fill, if one is waiting for its bar.
     */
    pending_fill(): number | undefined;
    /**
     * The request id of the pending standalone edit, if any.
     */
    pending_patterns(): number | undefined;
    /**
     * The request id of the pending scene, if one is pending.
     */
    pending_scene(): number | undefined;
    play(): void;
    /**
     * Render `out_l`/`out_r` in place. This is the audio callback's entry point and
     * does no allocation on the audio path.
     */
    process(out_l: Float32Array, out_r: Float32Array): void;
    /**
     * Queue fill `index` of the loaded track for the next bar line
     * (`docs/NIGHT3_PROTOCOL.md`, Fills). Returns 0 when accepted, otherwise the
     * reason, also reported as `fill rejected` (15): 1 no such fill, 7 not playing,
     * 3 a scratch, brake or backspin is running, 8 a fill is already queued or
     * playing (no stacking, and no replacing: the queued one keeps its bar; the UI
     * cancels it with [`Engine::cancel_fill`]).
     *
     * It starts on the first bar onset after the request (the onset-serial rule
     * scenes use), plays exactly sixteen steps, and the track's own drums carry on
     * from the step after.
     */
    queue_fill(request_id: number, index: number): number;
    /**
     * Queue a scene (`docs/NIGHT3_PROTOCOL.md`). Returns 0 when accepted, otherwise
     * the reason it was refused, which is also reported as a `rejected` event.
     *
     * `values` is the 44-value scene vector; it is validated as a whole first, and a
     * refused vector changes nothing (a scene already pending stays pending).
     * `timing` is 0 Now, 1 Next Beat, 2 Next Bar. While stopped the scene applies
     * here and now and playback does not start; while a scratch, brake or backspin is
     * in progress it is refused (`transport`).
     * Stage a pattern revision (docs/NIGHT4_PROTOCOL.md). Returns 0 when accepted,
     * otherwise the reason it was refused, also reported as `patterns rejected`.
     *
     * `data` is the compiled payload ([`patterns::PatternSet::parse`]), validated as a
     * whole: a refused payload changes nothing and leaves whatever was pending,
     * pending. Lanes are built here, in the message handler, never on the audio path.
     *
     * - `link` 0: a standalone edit. While stopped it applies here and now (`applied`
     *   with step -1) and does not start playback. While playing it waits for the
     *   boundary `timing` names (0 Now: the next render call; 1 the next beat; 2 the
     *   next bar), reporting `queued` with the predicted bar. A newer edit replaces a
     *   pending one (`replaced`) and keeps the boundary already announced unless it
     *   is Now.
     * - `link` = a scene request id: the lanes that scene sets. They apply when that
     *   scene commits, after any edit due on the same onset, and are withdrawn with
     *   it. The host queues them just before the scene.
     */
    queue_patterns(request_id: number, timing: number, link: number, data: Float32Array): number;
    queue_scene(request_id: number, timing: number, values: Float32Array): number;
    /**
     * End every override, and the latched echo throw, leaving the working mix as it
     * is: Release FX. Echo repeats already in the line ring out on the base feedback.
     */
    release_gestures(): void;
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
    /**
     * The latched echo throw (the older UI toggle). Kept alongside the Echo Throw
     * gesture: the throw is engaged while this is on or any Echo Throw is held.
     * Deprecated compatibility latch. New hosts use tokened gestures. Kept for
     * existing consumers and pinned by perform_tests and tests/smoothing.rs.
     */
    set_echo(on: boolean): void;
    /**
     * The echo's feedback, 0 to 0.9 (default 0.3). The echo throw lifts it while held.
     */
    set_echo_feedback(amount: number): void;
    /**
     * How loud the echo returns, 0 to 1 (default 0.24). The throw overrides it while held.
     */
    set_echo_return(amount: number): void;
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
    /**
     * The filter's resonance as it closes, a Q from 0.5 to 6 (default 0.85).
     */
    set_filter_q(q: number): void;
    /**
     * Set or clear the loop. A pending scene keeps its boundary (the next eligible
     * onset), but which step that is may have moved, so `queued` is reported again.
     */
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
    /**
     * The room's decay, 0.2 to 2.5 s (default 0.32 s).
     */
    set_reverb_decay(seconds: number): void;
    /**
     * How much room is mixed in, 0 to 0.5 (default 0.07).
     */
    set_reverb_mix(amount: number): void;
    /**
     * Set a scene's targets right away, with no scheduling and no events, whatever
     * the transport is doing. For the worklet's idle deck, which follows the live
     * deck's scenes so a later handover does not bring back the old mix. Validated
     * like [`Engine::queue_scene`]; false (and nothing changed) when invalid.
     */
    set_scene(values: Float32Array): boolean;
    set_send_index(index: number, amount: number): void;
    set_solo_index(index: number, solo: boolean): void;
    /**
     * Hardware-style balance, 0..1: 0.5 (center) leaves both channels at unity,
     * lower fades the right channel, higher fades the left, and each end silences
     * the opposite side. The continuous form of [`Engine::set_stereo_mode`].
     */
    set_stereo_balance(balance: number): void;
    /**
     * The old three-way switch, kept for callers that still send it: 0, 1 and 2 map
     * to balance 0.0, 0.5 and 1.0. Since the balance became a hardware-style balance,
     * 0 is hard left (right channel silent) and 2 is hard right (left silent), not
     * mono; mono is `set_width(0.0)`.
     */
    set_stereo_mode(mode: number): void;
    set_swing(swing: number): void;
    set_volume_index(index: number, vol: number): void;
    /**
     * Stereo width: 0 mono, 1 as mixed (the default), up to 1.5 wider.
     */
    set_width(width: number): void;
    stop(): void;
    /**
     * Move waiting events into `out`, four numbers each (`[kind, request id, a, b]`),
     * oldest first. Returns how many were moved; any that did not fit stay queued.
     */
    take_events_into(out: Float64Array): number;
    visual_step(): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_engine_free: (a: number, b: number) => void;
    readonly engine_active_fill: (a: number) => number;
    readonly engine_backspin: (a: number) => void;
    readonly engine_brake: (a: number) => void;
    readonly engine_cancel_fill: (a: number, b: number) => number;
    readonly engine_cancel_patterns: (a: number, b: number) => number;
    readonly engine_cancel_pending: (a: number, b: number) => number;
    readonly engine_cancel_scene: (a: number, b: number) => number;
    readonly engine_dropped_events: (a: number) => number;
    readonly engine_echo_enabled: (a: number) => number;
    readonly engine_end_score: (a: number) => void;
    readonly engine_event_count: (a: number) => number;
    readonly engine_gesture_begin: (a: number, b: number, c: number) => number;
    readonly engine_gesture_end: (a: number, b: number) => number;
    readonly engine_gesture_renew: (a: number, b: number) => number;
    readonly engine_is_playing: (a: number) => number;
    readonly engine_jump: (a: number, b: number) => void;
    readonly engine_levels_into: (a: number, b: number, c: number, d: any) => void;
    readonly engine_levels_json: (a: number) => [number, number];
    readonly engine_load_track_wasm: (a: number, b: number, c: number) => number;
    readonly engine_new: (a: number) => number;
    readonly engine_new_wasm: (a: number) => number;
    readonly engine_nudge: (a: number, b: number) => void;
    readonly engine_panic: (a: number) => void;
    readonly engine_pending_fill: (a: number) => number;
    readonly engine_pending_patterns: (a: number) => number;
    readonly engine_pending_scene: (a: number) => number;
    readonly engine_play: (a: number) => void;
    readonly engine_process: (a: number, b: number, c: number, d: any, e: number, f: number, g: any) => void;
    readonly engine_queue_fill: (a: number, b: number, c: number) => number;
    readonly engine_queue_patterns: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
    readonly engine_queue_scene: (a: number, b: number, c: number, d: number, e: number) => number;
    readonly engine_release_gestures: (a: number) => void;
    readonly engine_samples_to_next_downbeat: (a: number, b: number, c: number) => number;
    readonly engine_scope_json: (a: number) => [number, number];
    readonly engine_scratch_end: (a: number, b: number) => void;
    readonly engine_scratch_rate: (a: number, b: number) => void;
    readonly engine_scratch_release: (a: number) => void;
    readonly engine_scratch_start: (a: number) => void;
    readonly engine_set_bands: (a: number, b: number, c: number, d: number) => void;
    readonly engine_set_bpm: (a: number, b: number) => void;
    readonly engine_set_echo: (a: number, b: number) => void;
    readonly engine_set_echo_feedback: (a: number, b: number) => void;
    readonly engine_set_echo_return: (a: number, b: number) => void;
    readonly engine_set_echo_time: (a: number, b: number) => void;
    readonly engine_set_filter: (a: number, b: number) => void;
    readonly engine_set_filter_q: (a: number, b: number) => void;
    readonly engine_set_loop: (a: number, b: number) => void;
    readonly engine_set_master: (a: number, b: number) => void;
    readonly engine_set_muted_index: (a: number, b: number, c: number) => void;
    readonly engine_set_output_gain: (a: number, b: number) => void;
    readonly engine_set_output_gain_wasm: (a: number, b: number) => void;
    readonly engine_set_reverb_decay: (a: number, b: number) => void;
    readonly engine_set_reverb_mix: (a: number, b: number) => void;
    readonly engine_set_scene: (a: number, b: number, c: number) => number;
    readonly engine_set_send_index: (a: number, b: number, c: number) => void;
    readonly engine_set_solo_index: (a: number, b: number, c: number) => void;
    readonly engine_set_stereo_balance: (a: number, b: number) => void;
    readonly engine_set_stereo_mode: (a: number, b: number) => void;
    readonly engine_set_swing: (a: number, b: number) => void;
    readonly engine_set_volume_index: (a: number, b: number, c: number) => void;
    readonly engine_set_width: (a: number, b: number) => void;
    readonly engine_stop: (a: number) => void;
    readonly engine_take_events_into: (a: number, b: number, c: number, d: any) => number;
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
