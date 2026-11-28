# Architecture

## The short version

```text
agent ──stdio──▶ MCP server (Node, TypeScript)
                   │
                   ├─ bckgrnd_render_track ──▶ engine (.wasm) ──▶ WAV, streamed to disk
                   │
                   └─ bckgrnd_mix_under_voice
                        ├─ render the track to a temp WAV
                        ├─ ffmpeg ebur128: measure voice and music
                        └─ ffmpeg: gains, sidechain duck, fade ──▶ MP3 or WAV
```

## One engine, two places

bckgrnd-msc's sound comes from a Rust engine compiled to WebAssembly. On the
website it runs inside an `AudioWorklet`, the browser's audio thread, which calls
`Engine.process()` every time the sound card wants another 128 samples.

This server loads that same `.wasm` file in Node and calls `process()` in a loop,
as fast as it returns. There's no sound card waiting, so nothing has to keep pace
with real time. It runs about **20x faster** than real time: 60 seconds of Rain
renders in 2.5 seconds, seven minutes of Study in 18.

Nothing about the engine changed to make that work. The website's build uses
wasm-pack's `--target web`, and its `initSync()` accepts the raw bytes of the
`.wasm` file. The browser hands those over from a `fetch`, and Node hands them over
from `readFileSync`.

## Saved projects use the app's own renderer

Stock tracks and saved projects take different paths through the server.

```text
bckgrnd_render_track ──▶ src/render.ts ──▶ engine (.wasm), track JSON from vendor/library
bckgrnd_render_project ─▶ src/projects.ts ─▶ worker ─▶ vendor/shared/runtime.js ──▶ engine (.wasm)
```

A saved project is more than a track id: edited notes, lanes cleared on purpose,
a mix, sustained effects and a revision. Rewriting the code that turns all that
into engine calls would give two versions that drift apart. So the server doesn't.
bckgrnd-msc compiles its own project code (`frontend/lib/`) into one file,
`public/shared/runtime.js`, and the sync copies it to `vendor/shared/` next to the
engine it was built with. The app's export worker and this server call the same
`readSnapshot` and `renderProject`.

| Step | Who does it |
|---|---|
| Read the file, migrate v1-v3 in memory, refuse v5+ | `readSnapshot` in the shared runtime |
| Check the track's content hash against the library | the shared runtime |
| Check every vendored file against `SOURCE.json` | `verifyProjectBundle` in `src/projects.ts` |
| Render in a fresh worker, so a fresh WASM instance and noise stream | `src/project-worker.ts` |
| Write to a temporary file, publish only when complete | `atomicOutput` in `src/paths.ts` |

The fresh worker matters for parity: the engine's noise generator starts from
the same seed on every run, the way it does in the browser's export worker.
`pnpm run verify-parity` renders every track and four project fixtures both ways
and needs every WAV byte-identical.

Renders play the project's base mix. They never launch a stored scene, so a
scene's crash accent can't fire, and fills aren't played. The fill styles are in
the library so the bundle matches the app, and `bckgrnd_check_setup` lists them
under `engine_features`, not `capabilities`.

## What the server can do, read from what it ships

`src/capabilities.ts` builds the `bckgrnd_check_setup` report. Versions come from
the contracts, the build from `SOURCE.json`, tracks and fill styles from the
library. The capability flags come from a fresh in-memory server's own tool list:
each flag names the tool or argument that would provide it. Nobody keeps a list of
what's supported by hand, so it can't go stale.

## Streaming to disk

An hour of 48 kHz stereo is 691 MB as 16-bit samples and twice that as floats.
The renderer never holds the whole take. The WAV header is written first (the
length is known up front), then each block is faded, clipped, converted and
appended. The server hands control back to Node every five seconds of audio,
so a long render doesn't lock up the server.

If a render fails partway, the half-written file is deleted. Its header would
promise samples it doesn't have.

## The mix

ffmpeg does the mixing. See [Levels](Levels.md) for the numbers. The filter graph,
in order:

| Step | Voice | Music |
|---|---|---|
| 1 | Convert to 48 kHz stereo float | Convert to 48 kHz stereo float |
| 2 | Gain to `loudness_lufs` | Gain to `music_db` under the voice |
| 3 | Delay by `lead_in_seconds`, pad the end | Fade out over `tail_seconds` |
| 4 | Split: one copy is the compressor's key | Sidechain-compress, keyed by the voice |
| 5 | Sum the two, then a limiter at 0.95 | |

The music input is looped (`-stream_loop -1`) and the output is cut to the exact
length, so your own music file can be shorter than the voice.

## Why TypeScript and not a Rust server

A Rust MCP server would be faster and ship as one file. It would also need a
separate build for every system and wouldn't install with `pnpm dlx`, which is the
line every MCP client's setup docs show. The engine is already Rust; the server
around it is mostly plumbing. The full reasoning is in
[ADR-001](adr/001-typescript-server-over-vendored-wasm.md).

## Shared workflows and optional finishing

`workflow.ts` resolves saved settings and explicit overrides before rendering,
measuring and mixing. Previews use the same path on a selected audible excerpt.
A preset stores settings in one atomically published JSON file; audio paths are
never saved. Local and hosted schemas share enums and workflow behavior, while
the hosted adapter accepts only bounded audio uploads and never local paths.

Evolving renders smoothly automate the existing engine's stem volumes over a
four-phrase arc. They preserve the original track's mixer balance and cut stems.

Optional mastering first mixes to temporary PCM, measures with `loudnorm`, then
encodes with a measured second pass. Encoded loudness and true peak are checked;
at most three encodes correct deviations. A peak ceiling that cannot be met
fails before publishing the output; loudness success is reported explicitly.

Video exports extract the first audio stream with its original offset relative
to the picture, mix for exactly the video duration, encode AAC, and remux it with
the copied video stream. Preset intro/outro is ignored for video. The final MP4
is measured before the atomic output is published. The limiter compensates its
lookahead delay so narration remains aligned.
