/**
 * Scenes and Compare A/B, as the UI reasons about them. Pure: no React, no engine.
 *
 * Three kinds of state are kept apart (docs/NIGHT3_PROTOCOL.md):
 *
 * - **Stored snapshots**: the project's four scene slots, plus the session-only
 *   Compare A/B slots. Changed only by an explicit action (capture, rename,
 *   duplicate, reset, update).
 * - **Working mix**: what the knobs and faders show and the engine's base values.
 * - **Temporary overrides**: held gestures, which live in the engine only and are
 *   never part of the working mix, so a capture can never pick one up.
 *
 * A scene is applied by the engine at a musical boundary. The UI's idea of what is
 * active changes only when the engine says `applied`.
 */
import { type ParamId, type Scene, type SceneSlotId, type Scenes, type StemSettings } from './contract.js';
import type { StemId, TrackArrangement, TrackSummary } from './types.js';
import type { ScenePatterns } from './patterns.js';
export { factoryScenes } from './contract.js';
/** The part of the working mix a scene covers. */
export type SceneMix = {
    params: Record<ParamId, number>;
    stems: Record<StemId, StemSettings>;
};
/** Length of the engine's scene vector: 8 stems x 4, then the scene parameters. */
export declare const SCENE_VECTOR_LENGTH: number;
/** The engine's scene vector for a mix (layout in docs/NIGHT3_PROTOCOL.md). */
export declare function sceneVector(mix: SceneMix): Float32Array;
/**
 * A mix laid out like the engine's scene vector, but in the store's own doubles. The
 * engine's copy (`sceneVector`) is float32; this is what those floats came from.
 */
export declare function sceneValues(mix: SceneMix): number[];
/**
 * An engine vector read back without its float32 rounding, wherever the engine is
 * only holding a value the host gave it. Each slot takes the first of `known` (mixes
 * as `sceneValues`) whose float32 is exactly the engine's; a slot that matches none
 * (a build part way between two values) keeps the engine's number.
 *
 * Without this, following a build wrote float32 into the store: Echo time 1/8T came
 * back as 0.3333333432674408, which is not one of the registry's options, so a
 * project saved after it would not open again.
 */
export declare function exactValues(engine: ArrayLike<number>, known: readonly (readonly number[])[]): number[];
/** A copy of just the scene part of a mix, so later edits cannot reach a snapshot. */
export declare function copyMix(mix: SceneMix): SceneMix;
/** Whether two mixes sound the same as far as a scene is concerned. */
export declare function sameMix(a: SceneMix, b: SceneMix): boolean;
/** The slot index, for the menu's "Duplicate to" list and keyboard shortcuts. */
export declare const slotIndex: (slot: SceneSlotId) => number;
/**
 * Capture the working mix into a slot. The name, factory recipe and Crash on launch
 * stay; the revision goes up, so anything already queued from the old revision is not changed
 * by this (the engine holds its own copy).
 */
export declare function captureScene(scenes: Scenes, slot: SceneSlotId, working: SceneMix, patterns?: ScenePatterns): Scenes;
/** Rename a slot. Trimmed, 1 to 40 characters; anything else is refused (null). */
export declare function renameScene(scenes: Scenes, slot: SceneSlotId, name: string): Scenes | null;
/** Copy one slot's mix (and name) into another slot. The target keeps its own Crash on launch. */
export declare function duplicateScene(scenes: Scenes, from: SceneSlotId, to: SceneSlotId): Scenes;
/**
 * Put a slot back to its factory mix for this track. Crash on launch is the user's
 * own choice, not part of the recipe, so it stays as it was.
 */
export declare function resetScene(scenes: Scenes, slot: SceneSlotId, track: TrackSummary | TrackArrangement): Scenes;
/**
 * Turn Crash on launch on or off for one slot (ADR-022). Explicit only: nothing else
 * ever sets it. The revision moves, as for a rename, so the slot reads as changed;
 * a launch already queued keeps the accent it was sent with.
 */
export declare function setSceneCrash(scenes: Scenes, slot: SceneSlotId, crash: boolean): Scenes;
/** Stored levels for the miniature mixer, accounting for both cuts and solos. */
export declare function sceneLevels(scene: SceneMix): number[];
/** Describe the stored mix, not the slot's original recipe after a capture or copy. */
export declare function scenePreview(scene: Scene, track: TrackSummary | TrackArrangement): {
    summary: string;
    description: string;
};
export type Timing = 'now' | 'beat' | 'bar';
export declare const TIMING_CODE: Record<Timing, number>;
/**
 * What a launch is of: a scene slot, one of the session-only compare slots, or the
 * working mix from before a comparison or scene selection began.
 */
export type LaunchTarget = SceneSlotId | 'compareA' | 'compareB' | 'restore' | 'restoreScene';
/** Whether a launch target is one of the four scene slots. */
export declare const isSceneSlot: (t: LaunchTarget) => t is SceneSlotId;
/**
 * Compare A/B: two session-only mixes of the same track on the same engine and
 * playhead. Never saved, never a scene, nothing to do with Deck A / Deck B.
 */
export type Compare = {
    a: SceneMix | null;
    b: SceneMix | null;
    /** Which one the engine last applied, or null before either was heard. */
    listening: 'a' | 'b' | null;
    /** Exit's return point: the first capture, or the mix restored by Cancel scene. */
    before: SceneMix;
    /** The scene that was active then, restored with it. */
    beforeActive: {
        slot: SceneSlotId;
        mix: SceneMix;
    } | null;
};
export type RequestStatus = 'sending' | 'queued' | 'building' | 'applied' | 'cancelled' | 'replaced' | 'rejected';
/** How many bars a timed build rises over (docs/NIGHT7_PROTOCOL.md). */
export type BuildBars = 2 | 4 | 8;
export declare const BUILD_BAR_CHOICES: readonly BuildBars[];
export type SceneRequest = {
    requestId: number;
    target: LaunchTarget;
    /** The slot's revision when the request was made: what is about to play. */
    revision: number;
    generation: number;
    timing: Timing;
    status: RequestStatus;
    /** The bar (1-based, of the 16-bar song) the engine predicts it lands on. */
    bar?: number;
    reason?: number;
    /** The exact mix that was sent, so `applied` can become the working mix. */
    mix: SceneMix;
    /** The lanes the launch sets (Night 4), adopted as the working patterns on `applied`. */
    lanes?: ScenePatterns;
    /**
     * Set when the launch is a timed build (Night 7): the mix rises to the scene over
     * `bars` bars instead of switching on one onset. `bar` is the bar of the build now
     * playing (1 to `bars`) once it has started. `fill` (Rise + Fill, Night 8) is the fill
     * that plays its last bar, under its own request id; `filling` once it has started.
     */
    build?: {
        bars: BuildBars;
        bar?: number;
        fill?: LinkedFill;
    };
    /**
     * Set when the launch is the scene half of a Fill into (Night 8): it lands on the
     * onset its fill ends. `filling` once that fill has started.
     */
    fillInto?: LinkedFill;
};
/** The fill a Fill into's scene or a Rise waits on (docs/NIGHT8_PROTOCOL.md). */
export type LinkedFill = {
    fillId: number;
    filling?: boolean;
};
/** Engine event kinds (docs/NIGHT3_PROTOCOL.md). */
export declare const EVENT: {
    readonly sceneQueued: 1;
    readonly sceneApplied: 2;
    readonly sceneCancelled: 3;
    readonly sceneReplaced: 4;
    readonly sceneRejected: 5;
    readonly fillQueued: 11;
    readonly fillStarted: 12;
    readonly fillEnded: 13;
    readonly fillCancelled: 14;
    readonly fillRejected: 15;
    readonly gestureExpired: 21;
    readonly buildQueued: 41;
    readonly buildApplied: 42;
    readonly buildCancelled: 43;
    readonly buildReplaced: 44;
    readonly buildRejected: 45;
    readonly buildStarted: 46;
    readonly buildProgress: 47;
    readonly fillLinked: 51;
    readonly fillUnlinked: 52;
    readonly accentFired: 53;
};
/** Why something was refused or cancelled, in words for the status line. */
export declare const REASON: Record<number, string>;
/**
 * Why a build was not started, where a scene's wording would mislead: a build is
 * refused (not cancelled) during a scratch, brake or backspin, and needs playback.
 */
export declare const BUILD_REFUSAL: Record<number, string>;
export type EngineEvent = {
    kind: number;
    id: number;
    a: number;
    b: number;
};
/** Split the worklet's flat event list (four numbers each) into events. */
export declare function readEvents(flat: ArrayLike<number>): EngineEvent[];
/**
 * Fold one scene event into the pending request. Returns the updated request, or the
 * same object when the event is about some other request. A request that has
 * already settled (applied, cancelled, replaced, rejected) never changes again, so a
 * late or duplicated event cannot resurrect it.
 */
export declare function foldSceneEvent(request: SceneRequest, event: EngineEvent): SceneRequest;
/** Where a fill request stands (docs/NIGHT3_PROTOCOL.md, docs/NIGHT8_PROTOCOL.md). */
export type FillStatus = 'sending' | 'queued' | 'playing' | 'ended' | 'cancelled' | 'rejected';
export type FillRequest = {
    requestId: number;
    status: FillStatus;
    /** The bar it plays (1-based), from `fillQueued`: a phrase fill's is the phrase's last. */
    bar?: number;
    /** The request it leads into (a Fill into's scene), from `fillLinked` until `fillUnlinked`. */
    linkedTo?: number;
    /** The step that request is predicted to land on, while linked. */
    landing?: number;
    reason?: number;
    /** For a refused linked request, the part refused (`b` of `fillRejected`). */
    part?: number;
};
/** Whether a fill request may still start or is playing. */
export declare const isFillPending: (f: FillRequest | null) => f is FillRequest;
/**
 * Fold one engine event into a fill request (kinds 11-15, 51, 52). Returns the same
 * object for another request's event, and once the fill has ended, been cancelled or
 * been refused, nothing moves it again. A late `fillQueued` cannot rewind a playing fill.
 */
export declare function foldFillEvent<F extends FillRequest>(fill: F, event: EngineEvent): F;
/** Whether an engine event kind belongs to a fill (kinds 11-15, 51 and 52). */
export declare const isFillEvent: (kind: number) => boolean;
/**
 * The status line for `accentFired` (kind 53, `b`: 0 silent under a solo, 1 played,
 * 2 merged with the Drop's own crash). A crash you could hear is said; a silent one
 * under a solo says nothing, so the line stays "<name> active".
 */
export declare function accentStatus(name: string, b: number): string | null;
/** Whether an engine event kind belongs to a scene launch or a timed build. */
export declare const isLaunchEvent: (kind: number) => boolean;
/** A pending request is one the engine may still apply. */
export declare const isPending: (r: SceneRequest | null) => r is SceneRequest;
/**
 * The host's record of its launches, one per request id. The engine settles every
 * request with exactly one of applied, cancelled, replaced or refused
 * (docs/NIGHT7_PROTOCOL.md), so each pending one is kept until its own outcome
 * arrives. The host never guesses what a newer request did to an older one: a refused
 * or cancelled newer request leaves an older one pending, and a scene queued over a
 * running Rise only replaces the Rise if it commits.
 */
export type RequestBook = {
    /** Every request the engine may still apply, oldest first. */
    pending: readonly SceneRequest[];
    /**
     * The request the pads, Cancel and the status line speak for: the newest sent, or,
     * once that one settles without landing, the newest still pending. Null before any.
     */
    shown: SceneRequest | null;
};
export declare const EMPTY_BOOK: RequestBook;
/** A request just sent: it is the one shown, and every older pending one is kept. */
export declare function bookSend(book: RequestBook, request: SceneRequest): RequestBook;
/** The pending request with this id, or the shown one if it has it. */
export declare function bookFind(book: RequestBook, id: number): SceneRequest | null;
/** The newest pending timed build, if one is running or waiting. */
export declare function bookBuild(book: RequestBook): SceneRequest | null;
/** A request's record replaced by `next` (same id), wherever the book holds it. */
export declare function bookUpdate(book: RequestBook, next: SceneRequest): RequestBook;
/** What one engine event did to the book. */
export type BookStep = {
    book: RequestBook;
    /** The request the event was about, before and after. Equal when nothing moved. */
    prev: SceneRequest | null;
    next: SceneRequest | null;
    /** Whether that request was the one shown. */
    wasShown: boolean;
    /**
     * An older request shown again because the shown one settled without landing:
     * the engine is still running it.
     */
    resumed: SceneRequest | null;
};
/**
 * Fold one launch event (kinds 1-5, 41-47) into the book. An event for a request the
 * book does not hold, or one that moves nothing, returns the book unchanged.
 */
export declare function foldBookEvent(book: RequestBook, event: EngineEvent): BookStep;
/** The inverse of `sceneVector`: the mix a 44-value engine vector describes. */
export declare function mixFromVector(values: ArrayLike<number>): SceneMix;
