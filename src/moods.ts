/**
 * What each style is for, so an agent can match music to what's being read.
 *
 * These are set per style, not per track, and they're editorial: a first pass
 * from the style and tempo, to be tuned by ear. Energy runs 1 (barely there) to
 * 5 (wants your attention). Anything at 3 or above competes with dense speech.
 */

export interface Mood {
  mood: string;
  energy: 1 | 2 | 3 | 4 | 5;
  good_for: string[];
}

export const MOODS: Record<string, Mood> = {
  Chillhop: { mood: 'relaxed, unhurried', energy: 1, good_for: ['long articles', 'explainers', 'study notes', 'how-tos'] },
  Dusty: { mood: 'warm, nostalgic', energy: 1, good_for: ['stories', 'history', 'personal essays', 'memoir'] },
  Jazz: { mood: 'cozy, jazzy', energy: 1, good_for: ['food and travel', 'culture', 'interviews', 'reviews'] },
  Deep: { mood: 'moody, late-night', energy: 2, good_for: ['tech and science', 'analysis', 'night reading'] },
  House: { mood: 'upbeat, steady four-on-the-floor', energy: 3, good_for: ['news roundups', 'product updates', 'changelogs', 'demos'] },
  Acid: { mood: 'intense, squelchy', energy: 4, good_for: ['hype reels', 'launch trailers'] },
  Garage: { mood: 'bouncy, swung', energy: 3, good_for: ['pop culture', 'sports', 'light commentary'] },
  Breakbeat: { mood: 'energetic, rave', energy: 4, good_for: ['gaming', 'trailers', 'montages'] },
  'Liquid DnB': { mood: 'fast but smooth', energy: 3, good_for: ['recaps', 'fast-paced explainers', 'workouts'] },
};

const UNKNOWN: Mood = { mood: 'unrated', energy: 3, good_for: [] };

export function moodFor(style: string): Mood {
  return MOODS[style] ?? UNKNOWN;
}
