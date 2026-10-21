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
     * @returns {boolean}
     */
    echo_enabled() {
        const ret = wasm.engine_echo_enabled(this.__wbg_ptr);
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
     * @param {boolean} on
     */
    set_echo(on) {
        wasm.engine_set_echo(this.__wbg_ptr, on);
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
     * @param {number} index
     * @param {boolean} solo
     */
    set_solo_index(index, solo) {
        wasm.engine_set_solo_index(this.__wbg_ptr, index, solo);
    }
    /**
     * Where the output sits between the channels: 0 mono-left, 0.5 stereo, 1
     * mono-right. The continuous form of [`Engine::set_stereo_mode`].
     * @param {number} balance
     */
    set_stereo_balance(balance) {
        wasm.engine_set_stereo_balance(this.__wbg_ptr, balance);
    }
    /**
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
    stop() {
        wasm.engine_stop(this.__wbg_ptr);
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
