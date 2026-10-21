# Change Summary

## v0.1.0: 10-21-2026

**First release. Music under a voice, with levels set by measured loudness.**

- `bckgrnd_list_tracks` lists the eighteen bckgrnd-msc tracks, with bpm, mood,
  energy and what each one suits.
- `bckgrnd_render_track` renders any track to a WAV, up to an hour, with stems cut
  and fades. About 20x faster than real time.
- `bckgrnd_mix_under_voice` puts a track, or your own music file, under a
  narration. It measures both, sets the voice to -16 LUFS and the music 14 LU
  under it, and dips the music while the voice talks.
- The `bckgrnd-music` skill: which track for which content, where to set the
  level, what to change when the listener says "I can't hear the words."
- Engine and tracks from bckgrnd-msc `bd79af5`.
