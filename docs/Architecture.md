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
separate build for every system and wouldn't install with `npx`, which is the
line every MCP client's setup docs show. The engine is already Rust; the server
around it is mostly plumbing. The full reasoning is in
[ADR-001](adr/001-typescript-server-over-vendored-wasm.md).
