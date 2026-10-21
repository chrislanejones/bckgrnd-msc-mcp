# Change Summary

## v0.2.0: 10-21-2026 — package publication pending

- Hosted Streamable HTTP MCP on Vercel, with bounded audio uploads and embedded MP3 results.
- Unique render paths and atomic outputs preserve existing files on failure/cancellation.
- Local MCP progress and cancellation; ffmpeg subprocess timeouts.
- Finished-file LUFS and true-peak measurements; limiter makeup gain disabled.
- Compare up to three tracks under a short narration excerpt using the local preview tool.
- CI on Node 22/24 and an isolated install/stdio smoke test of the actual package archive.
- Registry publication still requires authentication; hosted deployment is separate.

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
