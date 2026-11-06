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
/** A copy of just the scene part of a mix, so later edits cannot reach a snapshot. */
export declare function copyMix(mix: SceneMix): SceneMix;
/** Whether two mixes sound the same as far as a scene is concerned. */
export declare function sameMix(a: SceneMix, b: SceneMix): boolean;
/** The slot index, for the menu's "Duplicate to" list and keyboard shortcuts. */
export declare const slotIndex: (slot: SceneSlotId) => number;
/**
 * Capture the working mix into a slot. The name and factory recipe stay; the
 * revision goes up, so anything already queued from the old revision is not changed
 * by this (the engine holds its own copy).
 */
export declare function captureScene(scenes: Scenes, slot: SceneSlotId, working: SceneMix, patterns?: ScenePatterns): Scenes;
/** Rename a slot. Trimmed, 1 to 40 characters; anything else is refused (null). */
export declare function renameScene(scenes: Scenes, slot: SceneSlotId, name: string): Scenes | null;
/** Copy one slot's mix (and name) into another slot. */
export declare function duplicateScene(scenes: Scenes, from: SceneSlotId, to: SceneSlotId): Scenes;
/** Put a slot back to its factory recipe for this track. */
export declare function resetScene(scenes: Scenes, slot: SceneSlotId, track: TrackSummary | TrackArrangement): Scenes;
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
export type RequestStatus = 'sending' | 'queued' | 'applied' | 'cancelled' | 'replaced' | 'rejected';
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
};
/** Why something was refused or cancelled, in words for the status line. */
export declare const REASON: Record<number, string>;
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
/** A pending request is one the engine may still apply. */
export declare const isPending: (r: SceneRequest | null) => r is SceneRequest;
