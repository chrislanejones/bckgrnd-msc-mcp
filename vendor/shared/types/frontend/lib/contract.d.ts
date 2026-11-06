/**
 * The project and parameter contract, as the UI reads it.
 *
 * `contracts/parameters.json` is the one list of parameters, shared with PHP
 * (`App\Support\Project\Contract`) and the MCP companion. Ranges and defaults are
 * read from it rather than restated here, so a control's limits and a saved
 * project's limits cannot disagree.
 *
 * A project is saved musical data. Telemetry (meters, playhead, live deck) is a
 * different type in `engine.ts` and is never part of a project.
 */
import { type Locks, type Patterns, type ScenePatterns } from './patterns.js';
import type { StemId, TrackArrangement, TrackSummary } from './types.js';
export declare const PROJECT_FORMAT = "bckgrnd-msc/project";
export declare const PROJECT_VERSION = 3;
type Option = {
    value: number;
    label: string;
};
export type ParameterSpec = {
    id: string;
    label: string;
    kind: 'continuous' | 'enum' | 'toggle';
    min?: number;
    max?: number;
    step?: number;
    /** A narrower range the control offers than the engine accepts. */
    control?: {
        min: number;
        max: number;
    };
    options?: Option[];
    default: number | boolean | 'track' | 'stem';
    /** Per-stem defaults, for a stem parameter whose default is "stem". */
    defaults?: Record<string, number>;
    /** How a control should spread the range: linear, log, db, or the engine's own curve. */
    taper?: 'linear' | 'log' | 'db' | 'engine';
    unit: string;
    scope: 'project' | 'performance';
    engine: string;
};
export type ParamId = 'transport.bpm' | 'transport.swing' | 'master.level' | 'fx.low' | 'fx.mid' | 'fx.high' | 'fx.filter' | 'fx.stereo' | 'fx.filterQ' | 'fx.echoFeedback' | 'fx.echoReturn' | 'fx.reverbMix' | 'fx.reverbDecay' | 'fx.width' | 'fx.echoTime';
export declare const PARAMETERS: ParameterSpec[];
export declare const STEMS: StemId[];
/** One parameter's spec. Throws on an id the registry does not list. */
export declare function param(id: string): ParameterSpec;
/** The range a control should offer: its `control` range if narrower, else the engine's. */
export declare function controlRange(id: string): {
    min: number;
    max: number;
    step: number;
};
export declare function stemParam(id: 'volume' | 'send'): ParameterSpec;
/** The range of a per-stem parameter, from the registry's stemParameters. */
export declare function stemRange(id: 'volume' | 'send'): {
    min: number;
    max: number;
    step: number;
};
/** A stem's own default echo send. */
export declare function defaultSend(stem: StemId): number;
/** A fixed default. Throws for a track-relative parameter; use `trackDefault` for those. */
export declare function fixedDefault(id: string): number;
export declare function trackDefault(id: ParamId, track: TrackSummary): number;
export type StemSettings = {
    volume: number;
    send: number;
    muted: boolean;
    solo: boolean;
};
/** The four scene slots, in order (contracts/scenes.json). */
export declare const SCENE_SLOTS: readonly ["full", "sparse", "build", "drop"];
export type SceneSlotId = (typeof SCENE_SLOTS)[number];
/** The parameters a scene holds, in the engine's scene-vector order. */
export declare const SCENE_PARAMS: ParamId[];
type FactoryRecipe = {
    id: string;
    name: string;
    description: string;
    stems: Partial<Record<StemId, {
        scale?: number;
        cut?: boolean;
    }>>;
    params: Partial<Record<ParamId, number>>;
};
export declare const FACTORY_SCENES: FactoryRecipe[];
/**
 * A stored scene: a complete snapshot of the mix (every stem, every scene parameter).
 * `revision` goes up on every overwrite, so a queued launch can pin what it plays.
 */
export type Scene = {
    slot: SceneSlotId;
    name: string;
    factory: string;
    revision: number;
    params: Record<ParamId, number>;
    stems: Record<StemId, StemSettings>;
    /**
     * The lanes this scene sets when it launches (version 3): each a pinned copy of a
     * pattern, or `{factory: true}` for the track's own. A lane the scene leaves out is
     * left alone by a launch. Version 2 scenes have none.
     */
    patterns: ScenePatterns;
};
export type Scenes = {
    slots: Scene[];
};
export type Project = {
    format: typeof PROJECT_FORMAT;
    version: typeof PROJECT_VERSION;
    id?: string;
    name: string;
    createdAt?: string;
    updatedAt?: string;
    trackId: string;
    params: Record<ParamId, number>;
    stems: Record<StemId, StemSettings>;
    /** Lane overrides (version 3). A lane not here plays the factory pattern. */
    patterns: Patterns;
    /** Lanes and events a variation or humanize must never change. */
    locks: Locks;
    scenes: Scenes;
};
/**
 * One factory scene for a track, built from its recipe relative to the track's own
 * mix: `scale` multiplies the track's level, `cut` mutes the stem, anything not
 * listed keeps the track's level and the registry default. Mirrors
 * `Contract::factoryScene()`.
 */
export declare function factoryScene(track: TrackSummary | TrackArrangement, recipeId: string, slot: SceneSlotId, revision?: number): Scene;
/** The four factory scenes for a track: each slot gets the recipe of the same name. */
export declare function factoryScenes(track: TrackSummary | TrackArrangement): Scenes;
/** A fresh project: the track as written, every parameter at its default. */
export declare function projectFromTrack(track: TrackSummary | TrackArrangement): Project;
/**
 * Read version 2 scenes strictly. Every slot present, in order, complete; any
 * unknown key, wrong type, out-of-range value or pattern reference refuses the whole
 * set. Nothing is clamped or filled. Mirrors `Contract::readScenes()`, error text
 * included.
 */
export declare function readScenes(raw: unknown, version?: number): Scenes;
/**
 * Read any supported document into a complete version 2 project.
 *
 * Accepts version 2, version 1 (migrated by adding the track's factory scenes and
 * changing nothing else), and a legacy preset (no `format`). Refuses an unknown
 * format or a newer version rather than half-reading it, and refuses a version 2
 * document whose scenes do not read cleanly. `lookup` resolves the track, so a
 * project for a track this build does not have is refused too.
 *
 * Mirrors `Contract::migrate()` in PHP; `tools/check-contract.mjs` runs both against
 * the same fixtures.
 */
export declare function migrateProject(raw: unknown, lookup: (id: string) => TrackSummary | undefined): Project;
/** Whether two projects describe the same music. Names and timestamps are ignored. */
export declare function sameMusic(a: Project, b: Project): boolean;
export {};
