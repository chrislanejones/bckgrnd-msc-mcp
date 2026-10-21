/**
 * Where output goes, and the checks that keep a tool call from writing somewhere
 * it shouldn't.
 *
 * An MCP server is started by the client from a working directory nobody chose,
 * so relative paths are refused rather than guessed at.
 */

import { existsSync, mkdirSync, mkdtempSync, rmSync, renameSync, linkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join } from 'node:path';
import type { JobOptions } from './jobs.js';

/** Build beside the destination, then publish atomically without a check/write race. */
export async function atomicOutput<T>(path: string, overwrite: boolean, work: (temporary: string) => Promise<T>, job: JobOptions = {}): Promise<T> {
  job.signal?.throwIfAborted();
  const dir = mkdtempSync(join(dirname(path), '.bckgrnd-'));
  try {
    const temporary = join(dir, basename(path));
    const result = await work(temporary);
    job.signal?.throwIfAborted();
    if (overwrite) renameSync(temporary, path);
    else linkSync(temporary, path);
    return result;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

/** `BCKGRND_MSC_OUT_DIR`, or a folder in the system temp directory. */
export function defaultOutDir(): string {
  const dir = process.env.BCKGRND_MSC_OUT_DIR || join(tmpdir(), 'bckgrnd-msc');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Validate an output path and return a message if it can't be used.
 * Returns null when the path is fine.
 */
export function outputProblem(path: string, allowed: readonly string[], overwrite: boolean): string | null {
  if (!isAbsolute(path)) return `output_path must be absolute, got "${path}".`;
  const ext = extname(path).toLowerCase();
  if (!allowed.includes(ext)) return `output_path must end in ${allowed.join(' or ')}, got "${ext || 'no extension'}".`;
  if (!overwrite && existsSync(path)) return `${path} already exists. Pass overwrite: true to replace it, or pick another output_path.`;
  return null;
}
