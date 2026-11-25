/** Portable immutable project file. The envelope versions persistence separately
 * from the musical contract (project version 4); old apps refuse its unknown format
 * safely. Every snapshot written before Night 8 holds a version 3 project: it is
 * migrated on read and never rewritten until the user saves (ADR-023). */
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
/**
 * The oldest musical version a snapshot may hold. Snapshots arrived with version 3
 * (Night 6), so no stored snapshot holds a v1 or v2 project; bare v1/v2 project files
 * still open, through `migrateProject`.
 */
export declare const OLDEST_SNAPSHOT_PROJECT = 3;
/**
 * A stored project as the current version would state it, without reading or
 * repairing anything: v3 → v4 only says `crash: false` on every scene. Used to hold a
 * migrated snapshot to the canonical check, and to see that a stored v3 revision and
 * its migrated reading are the same music. Anything else is returned as it is.
 */
export declare function asCurrentVersion(project: unknown): unknown;
export declare function canonical(value: unknown): string;
export declare function contentHash(value: unknown): Promise<string>;
export declare function snapshotOf(project: Project, source: TrackArrangement, id: string, revision: number): Promise<Snapshot>;
/**
 * The source hash says which library data a project was saved against. A render has to
 * reproduce that exactly, so without `onSourceChanged` a different library is refused.
 * The app passes it: a library update must not lock anyone out of their own work.
 */
export declare function readSnapshot(raw: unknown, tracks: TrackSummary[], source: (id: string) => Promise<TrackArrangement>, onSourceChanged?: (trackId: string) => void): Promise<Snapshot>;
