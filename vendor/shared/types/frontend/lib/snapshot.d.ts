/** Portable immutable project file. The envelope versions persistence separately
 * from the musical v3 contract; old apps refuse its unknown format safely. */
import { type Project } from './contract.js';
import type { TrackArrangement, TrackSummary } from './types.js';
export declare const RENDERER_VERSION = "project-renderer-1";
export type Snapshot = {
    format: 'bckgrnd-msc/snapshot';
    version: 1;
    id: string;
    revision: number;
    savedAt: string;
    renderer: typeof RENDERER_VERSION;
    source: {
        trackId: string;
        sha256: string;
    };
    project: Project;
};
export declare function canonical(value: unknown): string;
export declare function contentHash(value: unknown): Promise<string>;
export declare function snapshotOf(project: Project, source: TrackArrangement, id: string, revision: number): Promise<Snapshot>;
export declare function readSnapshot(raw: unknown, tracks: TrackSummary[], source: (id: string) => Promise<TrackArrangement>): Promise<Snapshot>;
