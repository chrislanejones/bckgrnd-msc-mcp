/* @ts-self-types="./bckgrnd_msc_engine.d.ts" */

/**
 * One engine instance. Owns the voices, buses, master chain and transport.
 *
 * Two engines can run side by side against the same output buffer, which is how the
 * desktop build performs a beat-matched auto-mix: it crossfades two of these.
 */
export class Engine {
    static __wrap(ptr) {
        const obj = Object.create(Engine.prototype);
        obj.__wbg_ptr = ptr;
        EngineFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        EngineFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_engine_free(ptr, 0);
    }
    /**
     * The request id of the fill playing now, if one is.
     * @returns {number | undefined}
     */
    active_fill() {
        const ret = wasm.engine_active_fill(this.__wbg_ptr);
        return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
    }
    /**
     * Capture the last ~1.35 s of output and play it backwards with a rising rate.
     *
     * This replaces the original's `ScriptProcessorNode` tap. If nothing worth
     * reversing has played yet, a synthetic sweep stands in, as the original did.
     */
    backspin() {
        wasm.engine_backspin(this.__wbg_ptr);
    }
    brake() {
        wasm.engine_brake(this.__wbg_ptr);
    }
    /**
     * Cancel the queued fill if it is `request_id` (`fill cancelled`, reason 10).
     * False when it is not queued: never queued, already started (a playing fill
     * runs its bar), or already cancelled.
     * @param {number} request_id
     * @returns {boolean}
     */
    cancel_fill(request_id) {
        const ret = wasm.engine_cancel_fill(this.__wbg_ptr, request_id);
        return ret !== 0;
    }
    /**
     * Withdraw a pending pattern revision (standalone or scene-linked) by request id.
     * False when it is not pending: already applied, replaced or unknown.
     * @param {number} request_id
     * @returns {boolean}
     */
    cancel_patterns(request_id) {
        const ret = wasm.engine_cancel_patterns(this.__wbg_ptr, request_id);
        return ret !== 0;
    }
    /**
     * Cancel whatever scene and fill are pending, and cut short an active fill, for
     * a structural reason the host knows about and the engine does not (an auto-mix
     * starting or a promote is 4). False when there was none of those. Held
     * gestures are not touched; see [`Engine::release_gestures`].
     * @param {number} why
     * @returns {boolean}
     */
    cancel_pending(why) {
        const ret = wasm.engine_cancel_pending(this.__wbg_ptr, why);
        return ret !== 0;
    }
    /**
     * Cancel the pending scene if it is `request_id`, reported as `cancelled` with
     * reason 10. False when it is not pending: already applied, replaced, cancelled,
     * or never queued.
     * @param {number} request_id
     * @returns {boolean}
     */
    cancel_scene(request_id) {
        const ret = wasm.engine_cancel_scene(this.__wbg_ptr, request_id);
        return ret !== 0;
    }
    /**
     * Events overwritten before they were drained, since the engine was made. The
     * ring keeps the newest [`scene::EVENT_CAPACITY`]; anything above zero here means
     * requests arrived faster than the host drained them.
     * @returns {number}
     */
    dropped_events() {
        const ret = wasm.engine_dropped_events(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Whether the latched throw is on. Says nothing about held gestures: nothing
     * here reads an override back as if it were the base.
     * @returns {boolean}
     */
    echo_enabled() {
        const ret = wasm.engine_echo_enabled(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Offline end of score: stop new events, release notes, retain effect tails.
     * Unlike the interactive Stop command this deliberately does not reset returns.
     */
    end_score() {
        wasm.engine_end_score(this.__wbg_ptr);
    }
    /**
     * Events waiting to be drained. Cheap, so the worklet can ask every block and
     * only pay for [`Engine::take_events_into`] when there is something to take.
     * @returns {number}
     */
    event_count() {
        const ret = wasm.engine_event_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * Begin a temporary override (`docs/NIGHT3_PROTOCOL.md`, Gestures): kind 1 Echo
     * Throw, 2 Filter Hold. False (nothing changed) for an unknown kind, a token
     * already held, or when four are already held. The override expires after 3 s
     * of rendered audio unless [`Engine::gesture_renew`] is called (event 21).
     * @param {number} token
     * @param {number} kind
     * @returns {boolean}
     */
    gesture_begin(token, kind) {
        const ret = wasm.engine_gesture_begin(this.__wbg_ptr, token, kind);
        return ret !== 0;
    }
    /**
     * End `token`'s override only, revealing the next held one of its kind or the
     * base as it is now. False when the token is not held.
     * @param {number} token
     * @returns {boolean}
     */
    gesture_end(token) {
        const ret = wasm.engine_gesture_end(this.__wbg_ptr, token);
        return ret !== 0;
    }
    /**
     * Restart `token`'s 3 s lease. False when the token is not held.
     * @param {number} token
     * @returns {boolean}
     */
    gesture_renew(token) {
        const ret = wasm.engine_gesture_renew(this.__wbg_ptr, token);
        return ret !== 0;
    }
    /**
     * @returns {boolean}
     */
    is_playing() {
        const ret = wasm.engine_is_playing(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * Cue or seek. Cancels a pending scene and fill and ends an active fill
     * (`transport`).
     * @param {number} step
     */
    jump(step) {
        wasm.engine_jump(this.__wbg_ptr, step);
    }
    /**
     * Copy the eight meter levels into a caller-owned buffer.
     *
     * Telemetry runs at ~30 Hz, not per block, so this exists to avoid
     * serialising to JSON on the audio thread.
     * @param {Float32Array} out
     */
    levels_into(out) {
        var ptr0 = passArrayF32ToWasm0(out, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        wasm.engine_levels_into(this.__wbg_ptr, ptr0, len0, out);
    }
    /**
     * @returns {string}
     */
    levels_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.engine_levels_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @param {string} json
     * @returns {boolean}
     */
    load_track_wasm(json) {
        const ptr0 = passStringToWasm0(json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.engine_load_track_wasm(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @param {number} sample_rate
     * @returns {Engine}
     */
    static new(sample_rate) {
        const ret = wasm.engine_new(sample_rate);
        return Engine.__wrap(ret);
    }
    /**
     * @param {number} sample_rate
     */
    constructor(sample_rate) {
        const ret = wasm.engine_new_wasm(sample_rate);
        this.__wbg_ptr = ret;
        EngineFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} dir
     */
    nudge(dir) {
        wasm.engine_nudge(this.__wbg_ptr, dir);
    }
    /**
     * Panic: cancel the pending scene and fill (`panic`), cut short an active fill,
     * release every gesture and the latched throw, stop playback and clear the
     * tails. Not the same as [`Engine::cancel_pending`], which only withdraws what
     * is queued.
     */
    panic() {
        wasm.engine_panic(this.__wbg_ptr);
    }
    /**
     * The request id of the queued fill, if one is waiting for its bar.
     * @returns {number | undefined}
     */
    pending_fill() {
        const ret = wasm.engine_pending_fill(this.__wbg_ptr);
        return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
    }
    /**
     * The request id of the pending standalone edit, if any.
     * @returns {number | undefined}
     */
    pending_patterns() {
        const ret = wasm.engine_pending_patterns(this.__wbg_ptr);
        return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
    }
    /**
     * The request id of the pending scene, if one is pending.
     * @returns {number | undefined}
     */
    pending_scene() {
        const ret = wasm.engine_pending_scene(this.__wbg_ptr);
        return ret === Number.MAX_SAFE_INTEGER ? undefined : ret;
    }
    play() {
        wasm.engine_play(this.__wbg_ptr);
    }
    /**
     * Render `out_l`/`out_r` in place. This is the audio callback's entry point and
     * does no allocation on the audio path.
     * @param {Float32Array} out_l
     * @param {Float32Array} out_r
     */
    process(out_l, out_r) {
        var ptr0 = passArrayF32ToWasm0(out_l, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArrayF32ToWasm0(out_r, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.engine_process(this.__wbg_ptr, ptr0, len0, out_l, ptr1, len1, out_r);
    }
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
     * @param {number} request_id
     * @param {number} index
     * @returns {number}
     */
    queue_fill(request_id, index) {
        const ret = wasm.engine_queue_fill(this.__wbg_ptr, request_id, index);
        return ret;
    }
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
     * @param {number} request_id
     * @param {number} timing
     * @param {number} link
     * @param {Float32Array} data
     * @returns {number}
     */
    queue_patterns(request_id, timing, link, data) {
        const ptr0 = passArrayF32ToWasm0(data, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.engine_queue_patterns(this.__wbg_ptr, request_id, timing, link, ptr0, len0);
        return ret;
    }
    /**
     * @param {number} request_id
     * @param {number} timing
     * @param {Float32Array} values
     * @returns {number}
     */
    queue_scene(request_id, timing, values) {
        const ptr0 = passArrayF32ToWasm0(values, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.engine_queue_scene(this.__wbg_ptr, request_id, timing, ptr0, len0);
        return ret;
    }
    /**
     * End every override, and the latched echo throw, leaving the working mix as it
     * is: Release FX. Echo repeats already in the line ring out on the base feedback.
     */
    release_gestures() {
        wasm.engine_release_gestures(this.__wbg_ptr);
    }
    /**
     * Samples until the next downbeat `bars` from now, at least `min_ahead` away.
     *
     * The worklet uses this to schedule an auto-mix handover on a musical boundary
     * without a timer — the same job the original did with
     * `nextDownbeat()`.
     * @param {number} bars
     * @param {number} min_ahead
     * @returns {number}
     */
    samples_to_next_downbeat(bars, min_ahead) {
        const ret = wasm.engine_samples_to_next_downbeat(this.__wbg_ptr, bars, min_ahead);
        return ret;
    }
    /**
     * @returns {string}
     */
    scope_json() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.engine_scope_json(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * Let go of the platter and drop the needle at `step` (0..256, the space of
     * [`Engine::jump`] and `visual_step`).
     *
     * The reader fades out over 15 ms while the transport resumes at normal speed,
     * firing `step` on the next sample if it was playing when the scratch began.
     * With a loop set, a step outside it is folded into the loop at the same
     * position in the bar grid. Without a scratch in progress this is a plain jump.
     * @param {number} step
     */
    scratch_end(step) {
        wasm.engine_scratch_end(this.__wbg_ptr, step);
    }
    /**
     * Signed platter speed for a scratch: 1 forward at normal speed, -1 backward, 0
     * held still. Clamped to +/-4; anything not finite reads as 0. The actual speed
     * glides toward this with about 20 ms of inertia. Ignored when not scratching.
     * @param {number} rate
     */
    scratch_rate(rate) {
        wasm.engine_scratch_rate(this.__wbg_ptr, rate);
    }
    /**
     * Let go of a scratch, if there is one, and carry on from the step it was
     * grabbed on. A no-op when not scratching.
     *
     * For a mix: the handover is timed from this deck's next downbeat, and a held
     * transport never reaches one, so the platter has to be released before the
     * mix measures where that downbeat is.
     */
    scratch_release() {
        wasm.engine_scratch_release(this.__wbg_ptr);
    }
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
    scratch_start() {
        wasm.engine_scratch_start(this.__wbg_ptr);
    }
    /**
     * Three-band isolator, given as 0..1 amounts per band.
     * @param {number} low
     * @param {number} mid
     * @param {number} high
     */
    set_bands(low, mid, high) {
        wasm.engine_set_bands(this.__wbg_ptr, low, mid, high);
    }
    /**
     * @param {number} bpm
     */
    set_bpm(bpm) {
        wasm.engine_set_bpm(this.__wbg_ptr, bpm);
    }
    /**
     * The latched echo throw (the older UI toggle). Kept alongside the Echo Throw
     * gesture: the throw is engaged while this is on or any Echo Throw is held.
     * Deprecated compatibility latch. New hosts use tokened gestures. Kept for
     * existing consumers and pinned by perform_tests and tests/smoothing.rs.
     * @param {boolean} on
     */
    set_echo(on) {
        wasm.engine_set_echo(this.__wbg_ptr, on);
    }
    /**
     * The echo's feedback, 0 to 0.9 (default 0.3). The echo throw lifts it while held.
     * @param {number} amount
     */
    set_echo_feedback(amount) {
        wasm.engine_set_echo_feedback(this.__wbg_ptr, amount);
    }
    /**
     * How loud the echo returns, 0 to 1 (default 0.24). The throw overrides it while held.
     * @param {number} amount
     */
    set_echo_return(amount) {
        wasm.engine_set_echo_return(this.__wbg_ptr, amount);
    }
    /**
     * Echo time in beats: 0.25 a sixteenth, 0.75 a dotted eighth (the default), 1 a
     * quarter, and so on; 0 turns the stems' echo off. Kept across track loads and
     * retimed with the tempo.
     * @param {number} beats
     */
    set_echo_time(beats) {
        wasm.engine_set_echo_time(this.__wbg_ptr, beats);
    }
    /**
     * Filter position, 0 (dark) to 1 (open).
     * @param {number} open
     */
    set_filter(open) {
        wasm.engine_set_filter(this.__wbg_ptr, open);
    }
    /**
     * The filter's resonance as it closes, a Q from 0.5 to 6 (default 0.85).
     * @param {number} q
     */
    set_filter_q(q) {
        wasm.engine_set_filter_q(this.__wbg_ptr, q);
    }
    /**
     * Set or clear the loop. A pending scene keeps its boundary (the next eligible
     * onset), but which step that is may have moved, so `queued` is reported again.
     * @param {number} bars
     */
    set_loop(bars) {
        wasm.engine_set_loop(this.__wbg_ptr, bars);
    }
    /**
     * @param {number} gain
     */
    set_master(gain) {
        wasm.engine_set_master(this.__wbg_ptr, gain);
    }
    /**
     * @param {number} index
     * @param {boolean} muted
     */
    set_muted_index(index, muted) {
        wasm.engine_set_muted_index(this.__wbg_ptr, index, muted);
    }
    /**
     * Post-master output trim.
     *
     * Used by the worklet's two-deck host to crossfade between engines during an
     * auto-mix: both render every block, and only their relative trim changes.
     * @param {number} gain
     */
    set_output_gain(gain) {
        wasm.engine_set_output_gain(this.__wbg_ptr, gain);
    }
    /**
     * @param {number} gain
     */
    set_output_gain_wasm(gain) {
        wasm.engine_set_output_gain_wasm(this.__wbg_ptr, gain);
    }
    /**
     * The room's decay, 0.2 to 2.5 s (default 0.32 s).
     * @param {number} seconds
     */
    set_reverb_decay(seconds) {
        wasm.engine_set_reverb_decay(this.__wbg_ptr, seconds);
    }
    /**
     * How much room is mixed in, 0 to 0.5 (default 0.07).
     * @param {number} amount
     */
    set_reverb_mix(amount) {
        wasm.engine_set_reverb_mix(this.__wbg_ptr, amount);
    }
    /**
     * Set a scene's targets right away, with no scheduling and no events, whatever
     * the transport is doing. For the worklet's idle deck, which follows the live
     * deck's scenes so a later handover does not bring back the old mix. Validated
     * like [`Engine::queue_scene`]; false (and nothing changed) when invalid.
     * @param {Float32Array} values
     * @returns {boolean}
     */
    set_scene(values) {
        const ptr0 = passArrayF32ToWasm0(values, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.engine_set_scene(this.__wbg_ptr, ptr0, len0);
        return ret !== 0;
    }
    /**
     * @param {number} index
     * @param {number} amount
     */
    set_send_index(index, amount) {
        wasm.engine_set_send_index(this.__wbg_ptr, index, amount);
    }
    /**
     * @param {number} index
     * @param {boolean} solo
     */
    set_solo_index(index, solo) {
        wasm.engine_set_solo_index(this.__wbg_ptr, index, solo);
    }
    /**
     * Hardware-style balance, 0..1: 0.5 (center) leaves both channels at unity,
     * lower fades the right channel, higher fades the left, and each end silences
     * the opposite side. The continuous form of [`Engine::set_stereo_mode`].
     * @param {number} balance
     */
    set_stereo_balance(balance) {
        wasm.engine_set_stereo_balance(this.__wbg_ptr, balance);
    }
    /**
     * The old three-way switch, kept for callers that still send it: 0, 1 and 2 map
     * to balance 0.0, 0.5 and 1.0. Since the balance became a hardware-style balance,
     * 0 is hard left (right channel silent) and 2 is hard right (left silent), not
     * mono; mono is `set_width(0.0)`.
     * @param {number} mode
     */
    set_stereo_mode(mode) {
        wasm.engine_set_stereo_mode(this.__wbg_ptr, mode);
    }
    /**
     * @param {number} swing
     */
    set_swing(swing) {
        wasm.engine_set_swing(this.__wbg_ptr, swing);
    }
    /**
     * @param {number} index
     * @param {number} vol
     */
    set_volume_index(index, vol) {
        wasm.engine_set_volume_index(this.__wbg_ptr, index, vol);
    }
    /**
     * Stereo width: 0 mono, 1 as mixed (the default), up to 1.5 wider.
     * @param {number} width
     */
    set_width(width) {
        wasm.engine_set_width(this.__wbg_ptr, width);
    }
    stop() {
        wasm.engine_stop(this.__wbg_ptr);
    }
    /**
     * Move waiting events into `out`, four numbers each (`[kind, request id, a, b]`),
     * oldest first. Returns how many were moved; any that did not fit stay queued.
     * @param {Float64Array} out
     * @returns {number}
     */
    take_events_into(out) {
        var ptr0 = passArrayF64ToWasm0(out, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        const ret = wasm.engine_take_events_into(this.__wbg_ptr, ptr0, len0, out);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    visual_step() {
        const ret = wasm.engine_visual_step(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) Engine.prototype[Symbol.dispose] = Engine.prototype.free;
function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_copy_to_typed_array_88899a52af046901: function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        },
        __wbg___wbindgen_throw_41e9ee4f547fc59a: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./bckgrnd_msc_engine_bg.js": import0,
    };
}

const EngineFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_engine_free(ptr, 1));

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

let cachedFloat64ArrayMemory0 = null;
function getFloat64ArrayMemory0() {
    if (cachedFloat64ArrayMemory0 === null || cachedFloat64ArrayMemory0.byteLength === 0) {
        cachedFloat64ArrayMemory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    return decodeText(ptr >>> 0, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF64ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 8, 8) >>> 0;
    getFloat64ArrayMemory0().set(arg, ptr / 8);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasmInstance, wasm;
function __wbg_finalize_init(instance, module) {
    wasmInstance = instance;
    wasm = instance.exports;
    wasmModule = module;
    cachedFloat32ArrayMemory0 = null;
    cachedFloat64ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (!module.ok) {
            throw new Error(`failed to fetch Wasm: ${module.status} ${module.statusText} fetching '${module.url}'`);
        }

        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('bckgrnd_msc_engine_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
