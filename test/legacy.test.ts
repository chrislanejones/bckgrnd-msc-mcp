// Every call a v0.3.1 client could make still validates and means the same thing.
// test/fixtures/tools-v0.3.1.json is the tool list the published 0.3.1 server
// advertised (built from main at f6924e0).
import { readFileSync } from 'node:fs';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createServer } from '../src/server.js';

type Schema = { type?: string; default?: unknown; enum?: unknown[]; minimum?: number; maximum?: number; items?: Schema; anyOf?: Schema[] };
type Input = { properties?: Record<string, Schema>; required?: string[] };
const legacy = JSON.parse(readFileSync(new URL('fixtures/tools-v0.3.1.json', import.meta.url), 'utf8')) as { version: string; tools: Array<{ name: string; inputSchema: Input }> };

let current: Map<string, Input>;
let client: Client;
beforeAll(async () => {
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: 'test', version: '0' });
  await client.connect(clientSide);
  current = new Map((await client.listTools()).tools.map((t) => [t.name, t.inputSchema as Input]));
});
afterAll(async () => { await client.close(); });

/** Problems that would turn a valid 0.3.1 value into an error or a different meaning. */
function narrowing(path: string, before: Schema, after: Schema): string[] {
  const out: string[] = [];
  if (before.type !== after.type) out.push(`${path}: type ${before.type} -> ${after.type}`);
  if (JSON.stringify(before.default) !== JSON.stringify(after.default)) out.push(`${path}: default ${JSON.stringify(before.default)} -> ${JSON.stringify(after.default)}`);
  if (before.enum) for (const v of before.enum) if (!after.enum?.includes(v)) out.push(`${path}: lost ${JSON.stringify(v)}`);
  if (before.minimum !== undefined && (after.minimum ?? -Infinity) > before.minimum) out.push(`${path}: minimum ${before.minimum} -> ${after.minimum}`);
  if (before.maximum !== undefined && (after.maximum ?? Infinity) < before.maximum) out.push(`${path}: maximum ${before.maximum} -> ${after.maximum}`);
  if (before.items) out.push(...narrowing(`${path}[]`, before.items, after.items ?? {}));
  if (before.anyOf) out.push(...before.anyOf.flatMap((b, i) => narrowing(`${path}|${i}`, b, after.anyOf?.[i] ?? {})));
  return out;
}

describe(`v${legacy.version} clients`, () => {
  it('still find all seven 0.3.1 tools', () => {
    expect(legacy.tools).toHaveLength(7);
    for (const tool of legacy.tools) expect(current.has(tool.name), tool.name).toBe(true);
  });

  it('keep every argument, type, default, enum value and range, with nothing newly required', () => {
    const problems: string[] = [];
    for (const tool of legacy.tools) {
      const now = current.get(tool.name)!;
      const required = new Set(tool.inputSchema.required ?? []);
      for (const name of now.required ?? []) if (!required.has(name)) problems.push(`${tool.name}.${name}: newly required`);
      for (const [name, before] of Object.entries(tool.inputSchema.properties ?? {})) {
        const after = now.properties?.[name];
        if (!after) { problems.push(`${tool.name}.${name}: removed`); continue; }
        problems.push(...narrowing(`${tool.name}.${name}`, before, after));
      }
    }
    expect(problems).toEqual([]);
  });

  it('get the same answers to plain 0.3.1 calls', async () => {
    const listed = await client.callTool({ name: 'bckgrnd_list_tracks', arguments: { section: 'Lofi', max_energy: 1 } });
    expect((listed.structuredContent as { tracks: Array<{ id: string }> }).tracks.map((t) => t.id)).toEqual(['rain', 'study', 'porch', 'tape', 'nightbus', 'kettle']);
    const setup = await client.callTool({ name: 'bckgrnd_check_setup', arguments: {} });
    expect(Object.keys(setup.structuredContent as object)).toEqual(expect.arrayContaining(['ok', 'checks', 'connections']));
  }, 60_000);
});
