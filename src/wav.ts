/**
 * A 16-bit stereo PCM WAV writer that streams to disk.
 *
 * An hour at 48 kHz is 691 MB of 16-bit samples and twice that as floats, so the
 * renderer never holds the whole take: it writes the header up front (the length
 * is known before the first sample) and appends one chunk at a time.
 */

import { closeSync, openSync, writeSync } from 'node:fs';

const HEADER_BYTES = 44;
const CHANNELS = 2;
const BYTES_PER_SAMPLE = 2;

export function wavHeader(frames: number, sampleRate: number): Buffer {
  const dataBytes = frames * CHANNELS * BYTES_PER_SAMPLE;
  const h = Buffer.alloc(HEADER_BYTES);
  h.write('RIFF', 0, 'ascii');
  h.writeUInt32LE(36 + dataBytes, 4);
  h.write('WAVE', 8, 'ascii');
  h.write('fmt ', 12, 'ascii');
  h.writeUInt32LE(16, 16); // fmt chunk size
  h.writeUInt16LE(1, 20); // PCM
  h.writeUInt16LE(CHANNELS, 22);
  h.writeUInt32LE(sampleRate, 24);
  h.writeUInt32LE(sampleRate * CHANNELS * BYTES_PER_SAMPLE, 28);
  h.writeUInt16LE(CHANNELS * BYTES_PER_SAMPLE, 32);
  h.writeUInt16LE(BYTES_PER_SAMPLE * 8, 34);
  h.write('data', 36, 'ascii');
  h.writeUInt32LE(dataBytes, 40);
  return h;
}

export class WavWriter {
  private fd: number;

  /** `exclusive` fails with EEXIST instead of replacing a file that is already there. */
  constructor(path: string, frames: number, sampleRate: number, exclusive: boolean) {
    this.fd = openSync(path, exclusive ? 'wx' : 'w');
    writeSync(this.fd, wavHeader(frames, sampleRate));
  }

  /** Interleave, clip to [-1, 1] and append `count` frames. */
  write(left: Float32Array, right: Float32Array, count: number): void {
    const out = Buffer.alloc(count * CHANNELS * BYTES_PER_SAMPLE);
    for (let i = 0; i < count; i++) {
      out.writeInt16LE(toInt16(left[i] ?? 0), i * 4);
      out.writeInt16LE(toInt16(right[i] ?? 0), i * 4 + 2);
    }
    writeSync(this.fd, out);
  }

  close(): void {
    closeSync(this.fd);
  }
}

function toInt16(v: number): number {
  const c = v > 1 ? 1 : v < -1 ? -1 : v;
  return Math.round(c * 32767);
}
