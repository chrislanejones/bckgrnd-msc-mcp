/**
 * Patterns: the editable musical data of a project (contract version 3).
 *
 * A project may override any of the nine lanes (`contracts/patterns.json`) with a
 * pattern of its own. The rules every reader keeps (this file, and
 * `App\Support\Project\Patterns` in PHP, held to the same fixtures):
 *
 * - **No override means the factory lane.** A lane missing from `patterns` plays the
 *   track as written. A lane present with no events plays **nothing**: an empty
 *   pattern is silence, never "missing". Clearing a bar can therefore never bring the
 *   factory pattern back.
 * - **Positions are sixteenths of the 16-bar song**, 0..255 (`step`); a note's `len` is
 *   in sixteenths too and must end by step 256. Screen coordinates, selections, scroll
 *   and the playhead are never part of a pattern.
 * - **Every event has a stable `id`**, unique in its pattern. The factory's ids are
 *   derived from lane and step (`h12`), so a project and the factory agree on them.
 * - **Nothing is flattened.** A note event keeps every pitch it has (chords of up to
 *   six), its length, velocity and accent, whether or not the editor shows them.
 * - **A pattern is refused whole** if anything in it is malformed, as scenes are: a
 *   half-read phrase would play something nobody wrote.
 */
import type { TrackArrangement } from './types.js';
export type LaneId = 'kick' | 'clap' | 'hat' | 'hatOpen' | 'bass' | 'stab' | 'lead' | 'pad' | 'arp';
export type LaneKind = 'drum' | 'notes';
export type LaneSpec = {
    id: LaneId;
    stem: string;
    kind: LaneKind;
    label: string;
    prefix: string;
    engine: number;
    editable: boolean;
    velocity: number;
    range?: [number, number];
};
export declare const STEPS: number;
export declare const STEPS_PER_BAR: number;
export declare const BARS: number;
export declare const MAX_NOTES: number;
export declare const LANES: LaneSpec[];
export declare const LANE_IDS: LaneId[];
export declare function laneSpec(id: LaneId): LaneSpec;
export type DrumEvent = {
    id: string;
    step: number;
    vel: number;
};
export type NoteEvent = {
    id: string;
    step: number;
    notes: number[];
    len: number;
    vel: number;
    accent: boolean;
};
export type PatternEvent = DrumEvent | NoteEvent;
/** Where a pattern came from: an edit, a paste, a humanize or a variation, with its settings. */
export type Origin = {
    kind: string;
} & Record<string, unknown>;
export type Pattern = {
    id: string;
    revision: number;
    lane: LaneId;
    length: number;
    events: PatternEvent[];
    origin?: Origin;
};
/** A scene's record of a lane it leaves at the factory pattern. */
export type FactoryRef = {
    factory: true;
};
export type ScenePatterns = Partial<Record<LaneId, Pattern | FactoryRef>>;
export type Patterns = Partial<Record<LaneId, Pattern>>;
/** Locked lanes and events: a variation or a humanize never changes them. */
export type Locks = {
    lanes: LaneId[];
    events: Partial<Record<LaneId, string[]>>;
};
export declare const NO_LOCKS: Locks;
/** Visual projection only; the engine still receives revisions over the original
 * source so editing the bass cannot change the source-root kick tuning. */
export declare function resolvedArrangement(source: TrackArrangement, patterns: Patterns): TrackArrangement;
export declare const isNoteEvent: (e: PatternEvent) => e is NoteEvent;
export declare const isFactoryRef: (p: Pattern | FactoryRef) => p is FactoryRef;
/**
 * Read one pattern strictly. `lane` is the key it was stored under, which must match
 * the pattern's own `lane`. Events come back sorted by step, the canonical order.
 */
export declare function readPattern(raw: unknown, lane: string, where: string): Pattern;
/** Read a project's `patterns`: a map of lane to pattern, in registry order. */
export declare function readPatterns(raw: unknown, where?: string): Patterns;
/** Read a scene's `patterns`: lanes it sets, each a pinned pattern or `{factory: true}`. */
export declare function readScenePatterns(raw: unknown, slot: string): ScenePatterns;
/** Read `locks`: locked lanes, and locked event ids per lane, deduplicated and sorted. */
export declare function readLocks(raw: unknown): Locks;
/** The id the factory gives the event on `step` of `lane`. */
export declare const factoryEventId: (lane: LaneId, step: number) => string;
/**
 * A lane as the track wrote it, as a pattern. Identity `factory-<lane>`, revision 1.
 * Mirrors `Patterns::factory()` in PHP.
 */
export declare function factoryPattern(track: TrackArrangement, lane: LaneId): Pattern;
/** The pattern a lane plays: the project's override, or the factory's. */
export declare function lanePattern(track: TrackArrangement, patterns: Patterns, lane: LaneId): Pattern;
/** Whether two patterns hold the same music (ids of events included, provenance not). */
export declare function sameEvents(a: Pattern, b: Pattern): boolean;
/** A deep copy, so edits never touch a pattern something else still holds. */
export declare const clonePattern: (p: Pattern) => Pattern;
/** Floats per note event in the engine payload: step, len, vel, accent, count, six pitches. */
export declare const NOTE_WIDTH: number;
/**
 * Compile lanes into the engine's pattern payload (docs/NIGHT4_PROTOCOL.md):
 * `[laneCount, (laneIndex, kind, n, ...data)...]`. A drum lane is `kind` 0 with
 * `n` = 256 velocities; a note lane is `kind` 1 with `n` events of NOTE_WIDTH floats
 * each, unused pitch slots -1. Built here, on the main thread, so the worklet only
 * validates and copies.
 */
export declare function compileLanes(lanes: Pattern[]): Float32Array;
/**
 * A content hash of a lane's events on steps `from..to` (inclusive), positions taken
 * relative to `from`, used to match a static variation candidate to its source. The
 * canonical text rounds velocities to thousandths so PHP and JS agree byte for byte.
 * FNV-1a, 32 bits, as eight hex digits. Mirrors `Patterns::sourceHash()`.
 */
export declare function sourceHash(pattern: Pattern, from: number, to: number): string;
