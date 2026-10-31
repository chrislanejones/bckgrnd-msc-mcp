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
| "The music keeps swelling and dropping" | `ducking: "subtle"`; `duck: false` only for a steady bed |

The ear wins. These are starting points.

## Measure the export

Mix results include `output_lufs` and `output_true_peak_dbfs`, measured from the
finished encoded file. These are distinct from input `voice_lufs`/`music_lufs`
and the requested voice target. Music, fades, limiting and MP3 encoding can
change final loudness and peak level. The limiter's automatic makeup gain is
disabled so it does not raise the measured gain settings.

The speech-fixture regression checks that ducking reduces the music during
speech and that it recovers during the silent tail. Measurements describe the
output; this is not a guaranteed streaming-platform mastering target.

## Ducking strength

`ducking` accepts `subtle` (2:1, 60 ms attack, 1200 ms release), `normal`
(original 6:1, 30 ms, 600 ms), or `strong` (10:1, 15 ms, 900 ms). Thresholds also
change to provide progressively deeper reduction. `duck: false` overrides the
strength. These are useful starting points; the listener's preference wins.
The final limiter compensates its lookahead delay, including in video exports.

## Optional final mastering

Set `final_lufs` (-30 to -9) to normalize the complete finished mix, not just the
voice. `true_peak_dbfs` (-9 to -0.5, default -1.5) sets its peak ceiling and requires
`final_lufs`. Two-pass normalization is followed by measurements of the encoded
WAV, MP3 or AAC/MP4. Bounded corrections account for encoding changes.
`mastering_target_met` means loudness is within 0.7 LU and peak within 0.1 dB of
the requested limits; always inspect the returned measurements. Extremely short
or unusual material may miss the loudness target, which is reported explicitly.
Targets are user-selected and are not certification for a streaming platform.
