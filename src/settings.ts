import { z } from 'zod';
import { STEMS } from './library.js';

export const duckingSchema = z.enum(['subtle', 'normal', 'strong']);
export const arrangementSchema = z.enum(['loop', 'evolving']);
export const mixSettingsShape = {
  track: z.string().min(1).max(100).optional(),
  music_db: z.number().min(-40).max(0).optional(),
  loudness_lufs: z.number().min(-30).max(-9).optional(),
  duck: z.boolean().optional(),
  ducking: duckingSchema.optional().describe('Ducking strength; normal preserves the original compressor. duck:false disables it.'),
  cut: z.array(z.enum(STEMS)).max(8).optional(),
  lead_in_seconds: z.number().min(0).max(30).optional(),
  tail_seconds: z.number().min(0).max(30).optional(),
  arrangement: arrangementSchema.optional().describe('loop keeps the original arrangement; evolving gently changes stem levels every 16 bars.'),
  final_lufs: z.number().min(-30).max(-9).optional().describe('Optional loudness target for the finished mix, distinct from the voice target.'),
  true_peak_dbfs: z.number().min(-9).max(-0.5).optional().describe('Peak ceiling when final_lufs is set; default -1.5 dBTP.'),
};
export const mixSettingsSchema = z.object(mixSettingsShape).strict();
export type MixSettings = z.infer<typeof mixSettingsSchema>;
export const presetNameSchema = z.string().regex(/^[a-z0-9][a-z0-9-]{0,63}$/, 'Use 1–64 lowercase letters, digits or hyphens.');
export const mixInputShape = {
  ...mixSettingsShape,
  preset: presetNameSchema.optional().describe('Saved local preset; explicitly supplied settings override it.'),
  music_path: z.string().min(1).optional(),
  output_path: z.string().optional(),
  overwrite: z.boolean().default(false),
};

export function withDefaults(settings: MixSettings) {
  const defined = Object.fromEntries(Object.entries(settings).filter(([, value]) => value !== undefined)) as MixSettings;
  return {
    music_db: -14, loudness_lufs: -16, duck: true, ducking: 'normal' as const,
    lead_in_seconds: 2, tail_seconds: 3, arrangement: 'loop' as const,
    ...defined,
  };
}
