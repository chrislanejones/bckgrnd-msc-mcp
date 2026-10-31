import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, isAbsolute, join, resolve } from 'node:path';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { tool, measureAudio, masterAudio } from './mix.js';
import { mixInputShape } from './settings.js';
import { mixNarration } from './workflow.js';
import { atomicOutput, outputProblem } from './paths.js';
import { toolJob, type JobOptions } from './jobs.js';
import { resolveSettings } from './presets.js';

export interface MediaInfo {
  format: { duration?: string; start_time?: string };
  streams: Array<{ index: number; codec_type: string; codec_name: string; duration?: string; start_time?: string; disposition?: { attached_pic?: number } }>;
}
export async function probeMedia(path: string, job: JobOptions = {}): Promise<MediaInfo> {
  const { stdout } = await tool(process.env.FFPROBE_PATH || 'ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', path], job);
  return JSON.parse(stdout) as MediaInfo;
}

export function registerVideo(server: McpServer): void {
  const { lead_in_seconds: _lead, tail_seconds: _tail, ...settings } = mixInputShape;
  void _lead; void _tail;
  server.registerTool('bckgrnd_mix_video', {
    title: 'Add background music to a video',
    description: 'Mix the first audio stream of a local video with music and export MP4. Copies the first non-cover video stream without re-encoding, preserving its timing and duration. Preset intro/outro settings are ignored for synchronization. Requires audible narration and an MP4-compatible video codec; use audio tools for audio-only files. The output contains one video and one mixed audio stream.',
    inputSchema: { ...settings, video_path: z.string().min(1) },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  }, async (args, extra) => {
    let scratch: string | undefined;
    try {
      const job = toolJob(extra);
      if (!isAbsolute(args.video_path) || !existsSync(args.video_path)) throw new Error('video_path must be an existing absolute path.');
      const output = args.output_path ?? join(dirname(args.video_path), `${basename(args.video_path, extname(args.video_path))}.with-music.mp4`);
      const problem = outputProblem(output, ['.mp4'], args.overwrite);
      if (problem) throw new Error(problem);
      if (resolve(output) === resolve(args.video_path) || (args.music_path && resolve(output) === resolve(args.music_path))) throw new Error('Output must differ from input files.');
      const media = await probeMedia(args.video_path, job);
      const video = media.streams.find((s) => s.codec_type === 'video' && !s.disposition?.attached_pic);
      const audio = media.streams.find((s) => s.codec_type === 'audio');
      if (!video || !audio) throw new Error('The input needs both video and audible narration.');
      if (!['h264', 'hevc', 'av1', 'mpeg4'].includes(video.codec_name)) throw new Error(`Video codec ${video.codec_name} cannot be copied by this MP4 exporter. Convert the video to H.264 MP4 first.`);
      const seconds = Number(media.format.duration ?? video.duration);
      if (!Number.isFinite(seconds) || seconds <= 0 || seconds > 3600) throw new Error('Video duration must be between 0 and 3600 seconds.');
      const offset = Number(audio.start_time ?? 0) - Number(video.start_time ?? 0);
      const timelineStart = Number(media.format.start_time ?? 0);
      const audioStart = Number(audio.start_time ?? 0) - timelineStart;
      if (![offset, timelineStart, audioStart].every(Number.isFinite)) throw new Error('Could not read audio/video timing.');
      scratch = mkdtempSync(join(tmpdir(), 'bckgrnd-video-'));
      const voice = join(scratch, 'voice.wav');
      const mixed = join(scratch, 'mixed.wav');
      const encoded = join(scratch, 'mixed.m4a');
      const ffmpeg = process.env.FFMPEG_PATH || 'ffmpeg';
      const timing = audioStart >= 0 ? `asetpts=PTS-STARTPTS,adelay=${Math.round(audioStart * 1000)}:all=1` : `atrim=start=${-audioStart},asetpts=PTS-STARTPTS`;
      await job.onProgress?.(1, 'Reading video narration');
      await tool(ffmpeg, ['-v', 'error', '-nostdin', '-i', args.video_path, '-map', `0:${audio.index}`, '-af', `${timing},apad`, '-t', String(seconds), '-ar', '48000', '-ac', '2', '-c:a', 'pcm_s16le', voice], job);
      const resolved = resolveSettings(args);
      const result = await mixNarration({ ...args, ...resolved, preset: undefined, final_lufs: undefined, true_peak_dbfs: undefined,
        voice_path: voice, output_path: mixed, lead_in_seconds: 0, tail_seconds: 0,
      }, { ...job, onProgress: async (p, message) => job.onProgress?.(5 + p * 0.75, message) });
      await job.onProgress?.(82, 'Encoding video audio');
      if (resolved.true_peak_dbfs !== undefined && resolved.final_lufs === undefined) throw new Error('Set final_lufs when specifying a true-peak ceiling.');
      if (resolved.final_lufs !== undefined) await masterAudio(mixed, encoded, resolved.final_lufs, resolved.true_peak_dbfs ?? -1.5, job, ['-c:a', 'aac', '-b:a', '192k']);
      else await tool(ffmpeg, ['-v', 'error', '-nostdin', '-i', mixed, '-c:a', 'aac', '-b:a', '192k', encoded], job);
      const measured = await atomicOutput(output, args.overwrite, async (temporary) => {
        await job.onProgress?.(94, 'Saving synchronized video');
        await tool(ffmpeg, ['-v', 'error', '-nostdin', '-copyts', '-itsoffset', String(-timelineStart), '-i', args.video_path, '-i', encoded, '-map', `0:${video.index}`, '-map', '1:a:0', '-c', 'copy', '-map_metadata', '0', '-movflags', '+faststart', '-t', String(seconds), temporary], job);
        return measureAudio(temporary, job);
      }, job);
      await job.onProgress?.(100, 'Video complete');
      const data = { ...result, ...measured, path: output, video_codec: video.codec_name, video_copied: true, audio_offset_seconds: offset,
        ...(args.preset ? { preset: args.preset } : {}),
        ...(resolved.final_lufs !== undefined ? { final_lufs: resolved.final_lufs, true_peak_dbfs: resolved.true_peak_dbfs ?? -1.5,
          mastering_target_met: Math.abs(measured.output_lufs - resolved.final_lufs) <= 0.7 && measured.output_true_peak_dbfs <= (resolved.true_peak_dbfs ?? -1.5) + 0.1 } : {}),
      };
      return { content: [{ type: 'text', text: `Mixed ${data.music} into video. Picture copied, narration synchronized.${data.mastering_target_met === false ? ' The final loudness target was not reached; inspect the measured result.' : ''}\n${output}` }], structuredContent: data };
    } catch (error) { return { isError: true, content: [{ type: 'text', text: (error as Error).message }] }; }
    finally { if (scratch) rmSync(scratch, { recursive: true, force: true }); }
  });
}
