import { type Snapshot } from './snapshot.js';
import type { TrackArrangement } from './types.js';
export type RenderSettings = {
    startSeconds: number;
    seconds: number;
    fadeInSeconds: number;
    fadeOutSeconds: number;
    tailSeconds: number;
    sampleRate: number;
};
export declare const DEFAULT_RENDER: RenderSettings;
export interface RenderEngine {
    load_track_wasm(json: string): boolean;
    set_bpm(value: number): void;
    set_swing(value: number): void;
    set_master(value: number): void;
    queue_scene(id: number, timing: number, values: Float32Array): number;
    queue_patterns(id: number, timing: number, link: number, values: Float32Array): number;
    play(): void;
    end_score(): void;
    process(left: Float32Array, right: Float32Array): void;
    free(): void;
}
export declare function applyProject(engine: RenderEngine, snapshot: Snapshot, source: TrackArrangement): void;
export declare function renderProject(EngineClass: new (rate: number) => RenderEngine, snapshot: Snapshot, source: TrackArrangement, settings: RenderSettings, signal?: AbortSignal, progress?: (percent: number) => void): Promise<{
    wav: Uint8Array<ArrayBuffer>;
    projectId: string;
    revision: number;
    renderer: string;
    frames: number;
    sampleRate: number;
    seconds: number;
    format: string;
    peak: number;
    rms: number;
    warnings: string[];
}>;
