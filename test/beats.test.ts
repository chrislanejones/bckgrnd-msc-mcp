import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { beatMap, MAX_INLINE_BEATS, measureGrid } from '../src/beats.js';
import { findTrack, listTracks, STEMS } from '../src/library.js';
import { SAMPLE_RATE } from '../src/render.js';
import { createServer } from '../src/server.js';

let client: Client;
let dir: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'bckgrnd-beats-'));
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: 'test', version: '0' });
  await client.connect(clientSide);
});

afterAll(async () => {
  await client.close();
  rmSync(dir, { recursive: true, force: true });
});

type Beat = { time: number; bar: number; beat: number };
type Map = Record<string, unknown> & { beats?: Beat[]; beat_samples: number; beat_count: number; path?: string };

async function call(args: Record<string, unknown>) {
  const result = await client.callTool({ name: 'bckgrnd_beat_map', arguments: args });
  const text = (result.content as Array<{ text: string }>)[0]?.text ?? '';
  return { isError: result.isError === true, text, data: result.structuredContent as Map };
}

/** Left channel of a 16-bit stereo WAV, as -1..1. */
function leftChannel(path: string): Float32Array {
  const buf = readFileSync(path);
  const frames = (buf.length - 44) / 4;
  const out = new Float32Array(frames);
  for (let i = 0; i < frames; i++) out[i] = buf.readInt16LE(44 + i * 4) / 32768;
  return out;
}

describe('the measured grid', () => {
  it('is a whole number of samples per beat on every track, a touch slower than the nominal bpm', () => {
    for (const track of listTracks()) {
      const grid = measureGrid(track);
      expect(Number.isInteger(grid.beatSamples), track.id).toBe(true);
      expect(grid.barSamples).toBe(grid.beatSamples * 4);
      const nominal = (60 / track.bpm) * SAMPLE_RATE;
      expect(grid.beatSamples, track.id).toBeGreaterThanOrEqual(nominal);
      expect(grid.beatSamples - nominal, track.id).toBeLessThan(8);
    }
  });

  it('drifts away from bpm arithmetic over a long take, which is why it is measured', () => {
    const rain = beatMap(findTrack('rain')!, 3600);
    const last = rain.beats.at(-1)!;
    const byBpm = (rain.beat_count - 1) * (60 / rain.bpm);
    expect(last.time - byBpm).toBeGreaterThan(0.2);
  });
});

describe('bckgrnd_beat_map', () => {
  it('lists beats from 0:00 with bar and beat numbers', async () => {
    const { isError, text, data } = await call({ track: 'Rain', seconds: 10 });
    expect(isError).toBe(false);
    expect(data).toMatchObject({ track: 'Rain', bpm: 84, beat_samples: 34_288, bar_samples: 137_152, beats_per_bar: 4, beat_count: 14, bar_count: 4 });
    expect(data.beats!.slice(0, 5)).toEqual([
      { time: 0, bar: 1, beat: 1 },
      { time: 0.714333, bar: 1, beat: 2 },
      { time: 1.428667, bar: 1, beat: 3 },
      { time: 2.143, bar: 1, beat: 4 },
      { time: 2.857333, bar: 2, beat: 1 },
    ]);
    expect(text).toContain('14 beats in 4 bars');
  });

  it('lands on the kick in the rendered audio, to the sample', async () => {
    const track = findTrack('rain')!;
    const kick = (JSON.parse(readFileSync(new URL('../vendor/library/rain.json', import.meta.url), 'utf8')) as { track: { kick: boolean[] } }).track.kick;
    const wav = join(dir, 'kick.wav');
    const render = await client.callTool({ name: 'bckgrnd_render_track', arguments: {
      track: track.id, seconds: 20, fade_in_seconds: 0, fade_out_seconds: 0, output_path: wav,
      cut: STEMS.filter((stem) => stem !== 'kick'),
    } });
    expect(render.isError).not.toBe(true);
    const audio = leftChannel(wav);
    const { data } = await call({ track: track.id, seconds: 20 });
    let checked = 0;
    for (const [index, beat] of data.beats!.entries()) {
      if (!kick[(index * 4) % kick.length]) continue;
      const at = index * data.beat_samples;
      expect(Math.round(beat.time * SAMPLE_RATE)).toBe(at);
      // Silent just before the beat, sounding on it.
      const before = Math.max(...Array.from(audio.subarray(Math.max(0, at - 48), at), Math.abs), 0);
      const onset = Math.max(...Array.from(audio.subarray(at, at + 48), Math.abs));
      expect(before, `beat ${index}`).toBeLessThan(0.001);
      expect(onset, `beat ${index}`).toBeGreaterThan(0.01);
      checked++;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('shifts every time by offset_seconds', async () => {
    const { data } = await call({ track: 'slipstream', seconds: 5, offset_seconds: 12.5 });
    expect(data.beats![0]!.time).toBe(12.5);
    expect(data.beats![1]!.time).toBe(Math.round((12.5 + data.beat_samples / SAMPLE_RATE) * 1e6) / 1e6);
  });

  it('saves every beat as CSV or JSON', async () => {
    const csv = join(dir, 'beats.csv');
    const { data } = await call({ track: 'study', seconds: 30, output_path: csv });
    expect(data.path).toBe(csv);
    const rows = readFileSync(csv, 'utf8').trim().split('\n');
    expect(rows[0]).toBe('time,bar,beat');
    expect(rows).toHaveLength(data.beat_count + 1);
    expect(rows[1]).toBe('0,1,1');

    const json = join(dir, 'beats.json');
    await call({ track: 'study', seconds: 30, output_path: json });
    expect(JSON.parse(readFileSync(json, 'utf8'))).toMatchObject({ track: 'Study', beat_count: data.beat_count });
    const again = await call({ track: 'study', seconds: 30, output_path: json });
    expect(again.isError).toBe(true);
    expect(again.text).toContain('already exists');
  });

  it('moves a long list to a file instead of the tool result', async () => {
    const previous = process.env.BCKGRND_MSC_OUT_DIR;
    process.env.BCKGRND_MSC_OUT_DIR = dir;
    try {
      const { data } = await call({ track: 'slipstream', seconds: 3600 });
      expect(data.beat_count).toBeGreaterThan(MAX_INLINE_BEATS);
      expect(data.beats).toBeUndefined();
      expect(readFileSync(data.path!, 'utf8').trim().split('\n')).toHaveLength(data.beat_count + 1);
    } finally {
      if (previous === undefined) delete process.env.BCKGRND_MSC_OUT_DIR; else process.env.BCKGRND_MSC_OUT_DIR = previous;
    }
  });

  it('names the real tracks when asked for one that does not exist', async () => {
    const { isError, text } = await call({ track: 'polka', seconds: 10 });
    expect(isError).toBe(true);
    expect(text).toContain('rain');
  });
});
