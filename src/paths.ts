/**
 * Where output goes, and the checks that keep a tool call from writing somewhere
 * it shouldn't.
 *
 * An MCP server is started by the client from a working directory nobody chose,
 * so relative paths are refused rather than guessed at.
 */

import { existsSync, mkdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, isAbsolute, join } from 'node:path';

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
