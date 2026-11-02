# Change Summary

## Unreleased

- New `bckgrnd_beat_map` tool, local and hosted: the exact time of every beat and bar of a track, with bar and beat numbers, for cutting video or timing animation to the music.
- Times are read from the engine rather than worked out from the bpm. The engine starts each sixteenth on a whole sample, so the nominal bpm drifts from the audio by up to about 0.3 s over an hour. The map matches the rendered WAV to the sample.
- Optional `offset_seconds`, and CSV or JSON output for editors and scripts. Lists over 1,000 beats are saved to a file.

## v0.3.1: 10-31-2026

Distribution: npm (`bckgrnd-msc-mcp@0.3.1`), GitHub release archive and hosted deployment.

- The background-music skill no longer includes the hosted endpoint URL or the commands to connect it. This clears the skills.sh warning about an unverifiable external URL.
- Agents use a remote server only when you connected one yourself. Hosted setup instructions live in docs/Vercel.md, which the skill links to.
- No server, tool or audio changes.

## v0.3.0: 10-31-2026

Distribution: npm (`bckgrnd-msc-mcp@0.3.0`), GitHub release archive and hosted deployment.

- Automatic audible-excerpt selection and two track recommendations, with full-export arguments returned by local previews.
- Hosted previews return labeled MP3 attachments; uploaded audio remains bounded by the existing limits.
- Persistent named local presets with explicit argument overrides and protected replacement.
- Subtle, normal and strong ducking. Existing calls retain normal ducking.
- MP4 exports copy supported video streams, retain source audio offsets and duration, and compensate limiter latency.
- Optional evolving arrangements smoothly vary stem levels over 16-bar phrases without re-enabling cut stems.
- Two-pass final-mix loudness mastering with encoded-output verification and bounded corrections for MP3/AAC peaks and loudness.
- CLI `--check` / `doctor` and MCP setup diagnostics test dependencies, output access and the WASM engine.
- Updated Claude/Codex companion skill, installation instructions, workflow examples and package verification.

## 2026-10-21 — Companion skill rename

- Renamed the companion skill from `bckgrnd-music` to `background-music` and updated installation commands and documentation links.

## Security hardening: 10-21-2026

- Reject oversized declared HTTP bodies and non-JSON media types before reading
  MCP requests. Retain the streaming byte limit for uploads without a length.
- Regression tests cover an oversized upload that never sends its body, rejected
  media types, and valid JSON with a charset.

## v0.2.0: 10-21-2026

- Hosted Streamable HTTP MCP on Vercel, with bounded audio uploads and embedded MP3 results.
- Unique render paths and atomic outputs preserve existing files on failure/cancellation.
- Local MCP progress and cancellation; ffmpeg subprocess timeouts.
- Finished-file LUFS and true-peak measurements; limiter makeup gain disabled.
- Compare up to three tracks under a short narration excerpt using the local preview tool.
- CI on Node 22/24 and an isolated install/stdio smoke test of the actual package archive.
- Published `bckgrnd-msc-mcp@0.2.0` to npm. The companion skill defaults to this pinned local version; hosted processing is an explicit alternative with source and audio-processing disclosures.

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
