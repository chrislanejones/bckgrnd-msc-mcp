# Levels

How `bckgrnd_mix_under_voice` decides how loud the music is.

## Why nothing is fixed

Every voice file comes in at a different volume. A text-to-speech MP3 might sit
around -18 LUFS, a podcast take mastered hot around -12. A fixed "music at -16 dB"
is too loud under the first and too quiet under the second. So the mix measures
first and sets the gains from what it found.

LUFS is the loudness scale podcasts and streaming services normalize to. It
measures how loud something sounds, not how high its peaks go. A difference
between two LUFS figures is counted in LU, and 1 LU is 1 dB.

## The four steps

1. **Measure.** Both files go through ffmpeg's `ebur128` filter, which reports
   integrated loudness: one number for the whole file.
2. **Set the voice.** The voice gets whatever gain lands it on `loudness_lufs`.
   A voice at -18.5 with the default target of -16 gets +2.5 dB.
3. **Set the music.** The music gets whatever gain lands it `music_db` under the
   voice's target. At the defaults that's -16 + -14 = -30 LUFS.
4. **Duck.** The voice is the key to a sidechain compressor on the music. While
   someone is talking, the music drops further. In the gaps between sentences
   and paragraphs it comes back up.

A limiter at the end catches the odd peak the gain pushed over. It doesn't set the
level. The gains do that.

Because the voice is brought to its target before it reaches the compressor, the
compressor's threshold means the same thing for every voice file. A quiet
recording ducks the music just as much as a loud one.

## What the defaults sound like

| Setting | Default | Result |
|---|---|---|
| `loudness_lufs` | **-16** | The usual spoken-word level. Matches most podcast players |
| `music_db` | **-14** | Music clearly there in the pauses, well under the words |
| `duck` | **on** | Ratio 6:1, 30 ms attack, 600 ms release |

Measured on a 90-second Emma narration that came in at -18.5 LUFS, with Study and
with Night Drive under it: both mixes came out at **-15.6 LUFS**, peaks around
-3 dBFS. The music adds about 0.4 LU on top of the voice.

## Picking numbers

| Content | `music_db` |
|---|---|
| Dense, technical or fast reading | `-18` to `-22` |
| Normal articles and narration | `-14` |
| Light content where the music is part of the feel | `-10` to `-12` |
| Intro or outro with little talking | `-6` to `-8` |

| Where it's going | `loudness_lufs` |
|---|---|
| Podcasts, spoken word, most players | `-16` |
| Phone speakers, noisy places | `-14` |
| Quiet listening | `-19` |

## When the listener says

| They say | Change |
|---|---|
| "Can't hear the words" | `music_db` down 4 |
| "Can't hear the music" | `music_db` up 4 |
| "The whole thing's too quiet" | `loudness_lufs` up 2 |
| "The music keeps swelling and dropping" | `duck: false` |

The ear wins. These are starting points.
