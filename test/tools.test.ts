import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { levelsFor, loudnessLufs, mixGraph, parseIntegratedLoudness } from '../src/mix.js';
import { fadeGain, SAMPLE_RATE } from '../src/render.js';
import { createServer } from '../src/server.js';

let client: Client;
let dir: string;

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), 'bckgrnd-test-'));
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await createServer().connect(serverSide);
  client = new Client({ name: 'test', version: '0' });
  await client.connect(clientSide);
});

afterAll(async () => {
  await client.close();
  rmSync(dir, { recursive: true, force: true });
});

type Structured = Record<string, unknown>;

async function call(name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args });
  const text = (result.content as Array<{ text: string }>)[0]?.text ?? '';
  return { isError: result.isError === true, text, data: result.structuredContent as Structured };
}

/** Peak of a 16-bit stereo WAV's samples, 0..1, over [from, to) seconds. */
function wavPeak(path: string, from = 0, to = Infinity): number {
  const buf = readFileSync(path);
  const start = 44 + Math.floor(from * SAMPLE_RATE) * 4;
  const end = Math.min(buf.length, 44 + Math.floor(to * SAMPLE_RATE) * 4);
  let peak = 0;
  for (let i = start; i + 1 < end; i += 2) peak = Math.max(peak, Math.abs(buf.readInt16LE(i)) / 32767);
  return peak;
}

const hasFfmpeg = (() => {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
})();

describe('the tool list', () => {
  it('offers the three tools', async () => {
    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'bckgrnd_list_tracks',
      'bckgrnd_mix_under_voice',
      'bckgrnd_render_track',
    ]);
  });
});

describe('bckgrnd_list_tracks', () => {
  it('lists all eighteen tracks and the eight stems', async () => {
    const { data } = await call('bckgrnd_list_tracks', {});
    expect((data.tracks as unknown[]).length).toBe(18);
    expect(data.stems).toEqual(['kick', 'clap', 'hats', 'bass', 'stab', 'lead', 'pad', 'arp']);
  });

  it('gives every track a mood, an energy and what it suits', async () => {
    const { data } = await call('bckgrnd_list_tracks', {});
    const tracks = data.tracks as Array<{ mood: string; energy: number; good_for: string[] }>;
    expect(tracks.every((t) => t.mood !== 'unrated' && t.good_for.length > 0)).toBe(true);
  });

  it('filters by energy', async () => {
    const { data } = await call('bckgrnd_list_tracks', { max_energy: 1 });
    const tracks = data.tracks as Array<{ energy: number; section: string }>;
    expect(tracks.length).toBe(6);
    expect(tracks.every((t) => t.energy === 1 && t.section === 'Lofi')).toBe(true);
  });

  it('filters by section', async () => {
    const { data } = await call('bckgrnd_list_tracks', { section: 'Lofi' });
    const tracks = data.tracks as Array<{ section: string; bpm: number }>;
    expect(tracks.length).toBe(6);
    expect(tracks.every((t) => t.section === 'Lofi' && t.bpm < 100)).toBe(true);
  });
});

describe('bckgrnd_render_track', () => {
  it('writes a WAV of the asked-for length with sound in it', async () => {
    const path = join(dir, 'rain.wav');
    const { isError, data } = await call('bckgrnd_render_track', { track: 'Rain', seconds: 3, output_path: path });
    expect(isError).toBe(false);
    expect(data.track).toBe('Rain');
    const buf = readFileSync(path);
    expect(buf.toString('ascii', 0, 4)).toBe('RIFF');
    expect(buf.readUInt32LE(24)).toBe(SAMPLE_RATE);
    expect(buf.length).toBe(44 + 3 * SAMPLE_RATE * 4);
    expect(wavPeak(path)).toBeGreaterThan(0.05);
    expect(data.peak_dbfs as number).toBeLessThan(0);
  });

  it('is silent with every stem cut', async () => {
    const path = join(dir, 'silent.wav');
    const all = ['kick', 'clap', 'hats', 'bass', 'stab', 'lead', 'pad', 'arp'];
    await call('bckgrnd_render_track', { track: 'rain', seconds: 2, cut: all, output_path: path });
    expect(wavPeak(path)).toBe(0);
  });

  it('fades out to nothing at the end', async () => {
    const path = join(dir, 'fade.wav');
    await call('bckgrnd_render_track', { track: 'warehouse', seconds: 4, fade_out_seconds: 2, output_path: path });
    expect(wavPeak(path, 3.98)).toBeLessThan(0.01);
  });

  it('names the real tracks when it gets a wrong one', async () => {
    const { isError, text } = await call('bckgrnd_render_track', { track: 'nope', seconds: 2 });
    expect(isError).toBe(true);
    expect(text).toContain('rain');
  });

  it('refuses a relative output path', async () => {
    const { isError, text } = await call('bckgrnd_render_track', { track: 'rain', seconds: 1, output_path: 'out.wav' });
    expect(isError).toBe(true);
    expect(text).toContain('absolute');
  });

  it('will not replace a file unless told to', async () => {
    const path = join(dir, 'keep.wav');
    writeFileSync(path, 'mine');
    const refused = await call('bckgrnd_render_track', { track: 'rain', seconds: 1, output_path: path });
    expect(refused.isError).toBe(true);
    expect(readFileSync(path, 'utf8')).toBe('mine');
    const replaced = await call('bckgrnd_render_track', { track: 'rain', seconds: 1, output_path: path, overwrite: true });
    expect(replaced.isError).toBe(false);
  });
});

describe('fades', () => {
  it('start at zero, reach unity and end at zero', () => {
    expect(fadeGain(0, 100, 10, 10)).toBe(0);
    expect(fadeGain(50, 100, 10, 10)).toBe(1);
    expect(fadeGain(99, 100, 10, 10)).toBe(0);
  });
});

describe('levels', () => {
  it('lands the voice on the target and the music under it', () => {
    // A quiet voice at -26 needs +10 to reach -16; music at -12 needs -18 to sit 14 under.
    expect(levelsFor(-26, -12, -16, -14)).toEqual({ voiceGainDb: 10, musicGainDb: -18 });
  });

  it('leaves silent music alone', () => {
    expect(levelsFor(-20, -70, -16, -14).musicGainDb).toBe(0);
  });

  it('reads the whole-file figure out of the ebur128 summary', () => {
    const log = '[Parsed_ebur128_0] t: 1  M: -20 S: -20 I: -21.0 LUFS\nSummary:\n  Integrated loudness:\n    I:         -19.6 LUFS\n';
    expect(parseIntegratedLoudness(log)).toBe(-19.6);
    expect(parseIntegratedLoudness('nothing here')).toBeNull();
  });
});

describe('the mix graph', () => {
  const base = { totalSeconds: 20, leadInSeconds: 2, tailSeconds: 3, voiceGainDb: 4, musicGainDb: -18 };

  it('applies the measured gains', () => {
    const graph = mixGraph({ ...base, duck: true });
    expect(graph).toContain('volume=4dB');
    expect(graph).toContain('volume=-18dB');
  });

  it('keys the music off the voice when ducking', () => {
    const graph = mixGraph({ ...base, duck: true });
    expect(graph).toContain('sidechaincompress');
    expect(graph).toContain('adelay=delays=2000');
    expect(graph).toContain('afade=t=out:st=17.000:d=3.000');
  });

  it('leaves the compressor out when not ducking', () => {
    expect(mixGraph({ ...base, duck: false })).not.toContain('sidechaincompress');
  });
});

describe.skipIf(!hasFfmpeg)('bckgrnd_mix_under_voice', () => {
  it('lays a track under a voice, with lead-in and tail', async () => {
    const voice = join(dir, 'voice.mp3');
    execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'sine=frequency=220:duration=4', '-c:a', 'libmp3lame', voice]);
    const { isError, text, data } = await call('bckgrnd_mix_under_voice', { voice_path: voice, track: 'kettle' });
    expect(isError, text).toBe(false);
    expect(data.path).toBe(join(dir, 'voice.with-kettle.mp3'));
    expect(existsSync(data.path as string)).toBe(true);
    const seconds = Number(
      execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', data.path as string], { encoding: 'utf8' }),
    );
    expect(seconds).toBeGreaterThan(8.5);
    expect(seconds).toBeLessThan(9.5);
  });

  it('brings a quiet voice and a loud voice to the same loudness', async () => {
    const results: number[] = [];
    for (const [name, gain] of [['quiet', -30], ['loud', -6]] as const) {
      const voice = join(dir, `${name}.wav`);
      execFileSync('ffmpeg', ['-v', 'error', '-y', '-f', 'lavfi', '-i', `sine=frequency=300:duration=6,volume=${gain}dB`, voice]);
      const out = join(dir, `${name}-mixed.wav`);
      const { isError, text } = await call('bckgrnd_mix_under_voice', {
        voice_path: voice, track: 'rain', music_db: -40, loudness_lufs: -16, output_path: out,
      });
      expect(isError, text).toBe(false);
      results.push(await loudnessLufs(out));
    }
    // The music is 40 LU down, so the result is the voice's level: both near -16.
    for (const lufs of results) expect(Math.abs(lufs - -16)).toBeLessThan(1.5);
  });

  it('wants exactly one music source', async () => {
    const voice = join(dir, 'voice.mp3');
    const { isError, text } = await call('bckgrnd_mix_under_voice', { voice_path: voice });
    expect(isError).toBe(true);
    expect(text).toContain('exactly one');
  });
});
