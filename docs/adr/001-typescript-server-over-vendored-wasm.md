# ADR-001: A TypeScript MCP server renders offline through the website's own vendored wasm build
Date: 2026-10-21   Status: draft

## Context
bckgrnd-msc is a stem machine: a Rust DSP engine compiled to wasm, run in an
`AudioWorklet`, playing song data authored in PHP and exported to JSON in
`public/library`. Agents need that engine to render music beds and lay them
under narration (first consumer: the smart-voice TTS pipeline), without
changing the bckgrnd-msc repo. The exported JSON is already the engine's whole
input contract, so nothing upstream of it has to move.

## Decision
A TypeScript MCP server (`@modelcontextprotocol/sdk` 1.32.1, zod 4, stdio)
loads the same wasm-pack `--target web` build the site plays, via
`initSync({ module: bytes })` in Node, and renders offline by calling
`Engine.process()` in 128-frame blocks as fast as it returns: 60 s of Rain in
2.5 s (~24x real time), 420 s of Study in 18 s. `scripts/sync-engine.mjs`
vendors the engine and library into `vendor/` from a built checkout;
`vendor/SOURCE.json` records the upstream commit (bd79af5) and a dirty flag.
Mixing under voice shells out to ffmpeg: ebur128 loudness on both files, voice
to a target (default -16 LUFS), music N LU below it (default -14), then
sidechain-compressed by the voice. Ships as npm `bckgrnd-msc-mcp` plus
`skills/bckgrnd-music/SKILL.md` for skills.sh.

## Consequences
+ One engine: agents render through the same `.wasm` the website plays, so
  there is no second DSP implementation to drift.
+ `npx bckgrnd-msc-mcp` is the whole install, matching how MCP client config
  examples are written.
- The server only knows the 18 vendored tracks. A new track needs a re-sync
  and an npm release, and nothing flags a `vendor/` that is behind upstream.
- ffmpeg is an external dependency the package cannot install; missing it is
  an actionable error, not a working mix.
- Mood, energy and good_for in `src/moods.ts` are first-pass editorial
  guesses per style until Chris tunes them by ear.

## Alternatives rejected
- (B) Native Rust MCP server (rmcp) as per-OS binaries: fastest and one file,
  but ~5 cross-compiled release targets and no `npx` one-line install.
- (C) Port the PHP arranger: not needed; the exported JSON is the contract.

## Pre-mortem
It is six months later and this was a mistake. Most likely reason: the
`--target web` glue is built for browsers, and Node is a guest. A wasm-bindgen
bump in bckgrnd-msc changed the generated `initSync` shape or started reaching
for a browser global, a re-sync broke rendering, and it surfaced as an npm
release that crashed on first call. Close behind: Node drift past `>=20`
changing wasm or ESM loading, and Windows users who have no ffmpeg on PATH
hitting the mix error as their first impression, which pushes the mix into
Rust anyway and erases half the reason for staying in TypeScript.
Early warning sign to watch for: a `sync-engine` run where
`vendor/engine/bckgrnd_msc_engine.js` changes but no `.rs` file upstream did,
or a mix-failure issue that mentions Windows.
