import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { beforeAll, afterAll, expect, it } from 'vitest';
import { createServer } from '../src/server.js';
import { durationSeconds, measureAudio, mixUnderVoice } from '../src/mix.js';
import { probeMedia } from '../src/video.js';
import { recommendTracks } from '../src/preview.js';
import { findTrack } from '../src/library.js';
import { checkSetup } from '../src/doctor.js';

const dir = mkdtempSync(join(tmpdir(), 'bckgrnd-features-'));
const voice = fileURLToPath(new URL('./fixtures/speech.wav', import.meta.url));
const previousConfig = process.env.BCKGRND_MSC_CONFIG_DIR;
const previousOut = process.env.BCKGRND_MSC_OUT_DIR;
const client = new Client({ name: 'feature-test', version: '1' });
const server = createServer();
beforeAll(async () => {
  process.env.BCKGRND_MSC_CONFIG_DIR = join(dir, 'config');
  process.env.BCKGRND_MSC_OUT_DIR = join(dir, 'output');
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(b); await client.connect(a);
});
afterAll(async () => {
  await client.close(); await server.close();
  if (previousConfig === undefined) delete process.env.BCKGRND_MSC_CONFIG_DIR; else process.env.BCKGRND_MSC_CONFIG_DIR = previousConfig;
  if (previousOut === undefined) delete process.env.BCKGRND_MSC_OUT_DIR; else process.env.BCKGRND_MSC_OUT_DIR = previousOut;
  rmSync(dir, { recursive: true, force: true });
});
async function call(name: string, args: Record<string, unknown>) {
  const result = await client.callTool({ name, arguments: args }, undefined, { timeout: 120_000 });
  expect(result.isError, JSON.stringify(result.content)).not.toBe(true);
  return result.structuredContent as Record<string, unknown>;
}
function ffmpeg(args: string[]): Buffer { return execFileSync('ffmpeg', ['-v', 'error', '-nostdin', ...args], { maxBuffer: 16 * 1024 * 1024 }); }

it('persists favorite settings across connections and honors explicit zero/false overrides', async () => {
  await call('bckgrnd_presets', { action: 'save', name: 'my-podcast', settings: { track: 'study', music_db: -22, duck: true, ducking: 'subtle', cut: ['lead'], lead_in_seconds: 4, tail_seconds: 5, arrangement: 'evolving' } });
  const other = new Client({ name: 'new-session', version: '1' }); const otherServer = createServer();
  const [a, b] = InMemoryTransport.createLinkedPair(); await otherServer.connect(b); await other.connect(a);
  try {
    const saved = await other.callTool({ name: 'bckgrnd_presets', arguments: { action: 'get', name: 'my-podcast' } });
    expect(saved.structuredContent).toMatchObject({ settings: { track: 'study', music_db: -22, ducking: 'subtle' } });
  } finally { await other.close(); await otherServer.close(); }
  const result = await call('bckgrnd_mix_under_voice', { voice_path: voice, preset: 'my-podcast', music_db: 0, duck: false, lead_in_seconds: 0, tail_seconds: 0, output_path: join(dir, 'preset.wav') });
  expect(result).toMatchObject({ music: 'Study', music_db: 0, duck: false, ducking: 'subtle', arrangement: 'evolving', lead_in_seconds: 0, tail_seconds: 0 });
  expect(result.total_seconds).toBeCloseTo(await durationSeconds(voice), 0);
});

it('protects existing presets, rejects traversal and supports deletion', async () => {
  await call('bckgrnd_presets', { action: 'save', name: 'temporary', settings: { track: 'rain' } });
  const duplicate = await client.callTool({ name: 'bckgrnd_presets', arguments: { action: 'save', name: 'temporary', settings: { track: 'study' } } });
  expect(duplicate.isError).toBe(true);
  expect(await call('bckgrnd_presets', { action: 'get', name: 'temporary' })).toMatchObject({ settings: { track: 'rain' } });
  const traversal = await client.callTool({ name: 'bckgrnd_presets', arguments: { action: 'save', name: '../outside', settings: { track: 'rain' } } });
  expect(traversal.isError).toBe(true);
  await call('bckgrnd_presets', { action: 'delete', name: 'temporary' });
  expect((await call('bckgrnd_presets', { action: 'list' })).presets).not.toContain('temporary');
});

it('automatically compares valid recommendations on an audible excerpt after long silence', async () => {
  const input = join(dir, 'late-speech.wav');
  ffmpeg(['-i', voice, '-af', 'adelay=20000:all=1,apad=pad_dur=20', input]);
  const result = await call('bckgrnd_preview_tracks', { voice_path: input, content: 'tutorial', seconds: 15, music_db: -18, ducking: 'subtle' });
  expect(result.start_seconds).toBeGreaterThan(5);
  const previews = result.previews as Array<{ path: string; track: string; full_mix_arguments: Record<string, unknown> }>;
  expect(previews.map((p) => p.track)).toEqual(['study', 'porch']);
  for (const p of previews) {
    expect(existsSync(p.path)).toBe(true);
    expect(p.full_mix_arguments).toMatchObject({ voice_path: input, track: p.track, music_db: -18, ducking: 'subtle' });
    expect(p.full_mix_arguments).not.toHaveProperty('output_path');
  }
  for (const content of ['narration', 'tutorial', 'story', 'tech', 'news', 'hype'] as const) {
    expect(recommendTracks(content, 30).every((id) => findTrack(id))).toBe(true);
    expect(recommendTracks(content, 900).every((id) => findTrack(id)!.energy <= 2)).toBe(true);
  }
});

it('masters the actual WAV and MP3 exports to the requested loudness and peak ceiling', async () => {
  for (const extension of ['wav', 'mp3']) {
    const path = join(dir, `mastered.${extension}`);
    const result = await call('bckgrnd_mix_under_voice', { voice_path: voice, track: 'rain', final_lufs: -18, true_peak_dbfs: -2, output_path: path });
    const measured = await measureAudio(path);
    expect(Math.abs(measured.output_lufs + 18)).toBeLessThanOrEqual(0.7);
    expect(measured.output_true_peak_dbfs).toBeLessThanOrEqual(-1.9);
    expect(result.mastering_target_met).toBe(true);
    expect(result.output_lufs).toBe(measured.output_lufs);
  }
}, 30_000);

function samples(path: string): Float32Array {
  const b = ffmpeg(['-i', path, '-f', 'f32le', '-ac', '1', '-ar', '48000', 'pipe:1']);
  return new Float32Array(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
}
function residue(mix: Float32Array, voiceOnly: Float32Array) {
  let sum = 0;
  for (let i = 24000; i < 120000; i++) sum += (mix[i]! - voiceOnly[i]!) ** 2;
  return Math.sqrt(sum / 96000);
}
it('makes subtle, normal and strong ducking audibly different during speech', async () => {
  const music = join(dir, 'tone.wav'); const seconds = await durationSeconds(voice);
  ffmpeg(['-f', 'lavfi', '-i', `sine=frequency=1000:duration=${seconds}`, music]);
  const baseline = join(dir, 'voice-only.wav');
  const base = { voicePath: voice, musicPath: music, totalSeconds: seconds, leadInSeconds: 0, tailSeconds: 0, voiceGainDb: 0, overwrite: false };
  await mixUnderVoice({ ...base, outputPath: baseline, musicGainDb: -120, duck: false });
  const only = samples(baseline); const levels = [];
  for (const ducking of ['subtle', 'normal', 'strong'] as const) {
    const outputPath = join(dir, `${ducking}.wav`);
    await mixUnderVoice({ ...base, outputPath, musicGainDb: -12, duck: true, ducking });
    levels.push(residue(samples(outputPath), only));
  }
  expect(levels[0]!).toBeGreaterThan(levels[1]!);
  expect(levels[1]!).toBeGreaterThan(levels[2]!);
});

it('renders evolving arrangements while preserving duration and explicitly cut stems', async () => {
  const loop = join(dir, 'loop.wav'), evolving = join(dir, 'evolving.wav'), muted = join(dir, 'muted.wav');
  await call('bckgrnd_render_track', { track: 'warehouse', seconds: 62, output_path: loop });
  await call('bckgrnd_render_track', { track: 'warehouse', seconds: 62, arrangement: 'evolving', output_path: evolving });
  expect(await durationSeconds(evolving)).toBe(62);
  expect(readFileSync(loop).equals(readFileSync(evolving))).toBe(false);
  const result = await call('bckgrnd_render_track', { track: 'rain', seconds: 1, arrangement: 'evolving', cut: ['kick', 'clap', 'hats', 'bass', 'stab', 'lead', 'pad', 'arp'], output_path: muted });
  expect(result.peak_dbfs).toBe(-120);
}, 30_000);

it('copies video frames and duration, keeps narration synchronized and masters its AAC export', async () => {
  const input = join(dir, 'input.mp4'), output = join(dir, 'output.mp4');
  const seconds = await durationSeconds(voice);
  ffmpeg(['-f', 'lavfi', '-i', `color=c=blue:s=96x64:r=25:d=${seconds}`, '-i', voice, '-map', '0:v', '-map', '1:a', '-c:v', 'mpeg4', '-c:a', 'aac', '-shortest', input]);
  const result = await call('bckgrnd_mix_video', { video_path: input, preset: 'my-podcast', final_lufs: -18, true_peak_dbfs: -2, output_path: output });
  expect(result).toMatchObject({ video_copied: true, lead_in_seconds: 0, tail_seconds: 0, mastering_target_met: true });
  expect(Math.abs(await durationSeconds(output) - await durationSeconds(input))).toBeLessThan(0.08);
  const frames = (path: string) => ffmpeg(['-i', path, '-map', '0:v:0', '-f', 'framemd5', '-']).toString();
  expect(frames(output)).toBe(frames(input));
  const media = await probeMedia(output);
  expect(media.streams.map((s) => s.codec_type)).toEqual(['video', 'audio']);
  const a = samples(input), b = samples(output);
  let bestOffset = 0, bestCorrelation = -Infinity;
  for (let offset = -2400; offset <= 2400; offset += 120) {
    let correlation = 0;
    for (let i = 24000; i < Math.min(a.length, b.length) - 2400; i += 10) correlation += a[i]! * b[i + offset]!;
    if (correlation > bestCorrelation) { bestCorrelation = correlation; bestOffset = offset; }
  }
  expect(Math.abs(bestOffset)).toBeLessThanOrEqual(120);
}, 30_000);

it('preserves an existing video on invalid input and refuses writing over the input', async () => {
  const output = join(dir, 'keep.mp4'); writeFileSync(output, 'keep');
  const bad = await client.callTool({ name: 'bckgrnd_mix_video', arguments: { video_path: voice, track: 'rain', output_path: output, overwrite: true } });
  expect(bad.isError).toBe(true); expect(readFileSync(output, 'utf8')).toBe('keep');
  const input = join(dir, 'input.mp4'); const before = readFileSync(input);
  const overwrite = await client.callTool({ name: 'bckgrnd_mix_video', arguments: { video_path: input, track: 'rain', output_path: input, overwrite: true } });
  expect(overwrite.isError).toBe(true); expect(readFileSync(input).equals(before)).toBe(true);
});

it('checks the actual engine and diagnoses missing ffmpeg without losing other results', async () => {
  expect((await checkSetup()).ok).toBe(true);
  const previous = process.env.FFMPEG_PATH;
  process.env.FFMPEG_PATH = join(dir, 'missing-ffmpeg');
  try {
    const result = await checkSetup();
    expect(result.ok).toBe(false);
    expect(result.checks.find((c) => c.name === 'ffmpeg')).toMatchObject({ ok: false });
    expect(result.checks.find((c) => c.name === 'music engine')).toMatchObject({ ok: true });
  } finally { if (previous === undefined) delete process.env.FFMPEG_PATH; else process.env.FFMPEG_PATH = previous; }
});

it('preserves delayed narration in the source video rather than moving it to the first frame', async () => {
  const input = join(dir, 'delayed.mp4'), output = join(dir, 'delayed-mixed.mp4');
  ffmpeg(['-f', 'lavfi', '-i', 'color=c=red:s=96x64:r=25:d=10', '-itsoffset', '0.75', '-i', voice, '-map', '0:v', '-map', '1:a', '-c:v', 'mpeg4', '-c:a', 'aac', input]);
  const result = await call('bckgrnd_mix_video', { video_path: input, track: 'rain', cut: ['kick', 'clap', 'hats', 'bass', 'stab', 'lead', 'pad', 'arp'], output_path: output });
  expect(Number(result.audio_offset_seconds)).toBeGreaterThan(0.7);
  const pcm = samples(output);
  const rms = (from: number, to: number) => {
    let sum = 0;
    for (let i = from * 48000; i < to * 48000; i++) sum += pcm[i]! ** 2;
    return Math.sqrt(sum / ((to - from) * 48000));
  };
  expect(rms(0, 0.6)).toBeLessThan(0.001);
  expect(rms(1, 2)).toBeGreaterThan(0.01);
  expect(Math.abs(await durationSeconds(output) - 10)).toBeLessThan(0.08);
});

it('retains audio before a delayed first video frame and keeps the original container duration', async () => {
  const input = join(dir, 'delayed-picture.mp4'), output = join(dir, 'delayed-picture-mixed.mp4');
  ffmpeg(['-itsoffset', '0.8', '-f', 'lavfi', '-i', 'color=c=green:s=96x64:r=25:d=8', '-i', voice, '-map', '0:v', '-map', '1:a', '-c:v', 'mpeg4', '-fps_mode', 'passthrough', '-c:a', 'aac', input]);
  const before = await probeMedia(input);
  await call('bckgrnd_mix_video', { video_path: input, track: 'rain', output_path: output });
  const after = await probeMedia(output);
  expect(Number(before.streams.find((s) => s.codec_type === 'video')!.start_time)).toBeGreaterThan(0.7);
  expect(Number(after.streams.find((s) => s.codec_type === 'video')!.start_time)).toBeCloseTo(Number(before.streams.find((s) => s.codec_type === 'video')!.start_time), 2);
  expect(Number(after.streams.find((s) => s.codec_type === 'audio')!.start_time)).toBeCloseTo(0, 2);
  expect(Math.abs(Number(after.format.duration) - Number(before.format.duration))).toBeLessThan(0.08);
});
