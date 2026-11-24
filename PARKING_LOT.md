# Parking Lot

Adjacent problems and ideas found during other work. Not scheduled.

## Found 11-01-2026 (beat map work)

- **Evolving arrangement phrases drift off the bar lines.** `src/render.ts`
  works out phrase position from the nominal bpm (`16 * 4 * 60 / bpm`), but the
  engine's real bar is a few samples longer (see `src/beats.ts`). Over an hour
  the stem-level transitions slide about 0.25 s past the downbeats. The blends
  are cosine-smoothed over a whole phrase, so it's probably inaudible. Fix: use
  `measureGrid(track).barSamples` for the phrase length.

## Found 11-24-2026 (project v4 resync)

- **A library change makes every saved project unreadable here.** Snapshots name
  their track by content hash of the whole track JSON, `fills` included. Night 9
  adds fill styles to `fills`, so after that sync every project saved before it
  fails with "Source library mismatch". The app opens the same file with a warning
  ("the track has changed in the library... Save to keep it"); the MCP passes no
  `onSourceChanged` to `readSnapshot` and refuses. Options: pass it and report a
  warning (renders never play fills, so base-mix audio may well be unchanged), or
  stay strict and tell users to re-save in the app. Chris's call, before the final
  Night 9 sync.
- **Browser/native leg of parity not run.** `scripts/verify-parity.mjs` compares the
  MCP with the app's built engine and shared renderer in Node. The app's
  `tools/verify-render-parity.mjs` (bundled export worker in Chromium plus the
  installed native app over `NATIVE_CDP`) is the full three-way check for a release.

## Package ideas (11-01-2026)

- Publish from GitHub Actions with npm trusted publishing (provenance badge, no local token or 2FA prompt).
- Drop the pinned `@0.3.1` from README and skill install commands so releases don't need doc edits.
- List the server in the official MCP Registry (`server.json` + `mcpName`).
- Article + music in one ask: smart-voice MP3, then `bckgrnd_mix_under_voice`.
- Change track or energy at section breaks in a long narration.
- End on a bar line with a real ending instead of a fade.
- Export the eight stems as separate WAVs for editors.
- Named mastering targets (`youtube`, `spotify`, `apple`).
- Seamless loop export for streams and menus.
