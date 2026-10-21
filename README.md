# bckgrnd-msc-mcp

[![skills.sh](https://skills.sh/b/chrislanejones/bckgrnd-msc-mcp)](https://skills.sh/chrislanejones/bckgrnd-msc-mcp)

An MCP server that puts music under a voice. Hand it a narration MP3 and a track
name, and it renders the music to the right length, sets it under the voice by
**measured loudness**, dips it while the voice talks, and hands back one file.

The music comes from [bckgrnd-msc](https://github.com/chrislanejones/bckgrnd-msc), a
stem machine with eighteen tracks and eight stems each, synthesized by a **Rust**
engine. This server runs that same engine, compiled to **WebAssembly**, in Node. No
samples, no streaming service, no licensing questions. The music is made on your
machine when you ask for it.

## Quick start

Needs Node 20 or newer. Mixing under a voice also needs ffmpeg
(`brew install ffmpeg`, `sudo apt install ffmpeg` or `winget install Gyan.FFmpeg`).

npm accepted publication of `bckgrnd-msc-mcp@0.2.0`, but registry processing is still pending. If the pinned command returns a version-not-found error, use the local [source-build instructions](https://github.com/chrislanejones/bckgrnd-msc-mcp/blob/main/docs/Getting-Started.md#from-a-clone) until the version becomes available.

Use the local server by default, pinned to version 0.2.0:

```sh
claude mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.2.0
pnpm dlx skills add chrislanejones/bckgrnd-msc-mcp --skill background-music
```

Local processing keeps narration on your machine rather than uploading it to
our hosted MCP. You can also [run from a clone](docs/Getting-Started.md#from-a-clone).
The current skills installer requires Node 22.20+.

For an explicitly chosen hosted alternative (clips up to two minutes), read
[ownership, source and audio-processing details](docs/Vercel.md#ownership-and-audio-processing)
before uploading narration:

```sh
claude mcp add --transport http bckgrnd-msc https://bckgrnd-msc-mcp.vercel.app/mcp
```

Then ask for it in plain words: "put Rain under `~/notes/article.mp3`."

The server gives an agent the tools. The skill gives it the taste: which track
suits which content, where to set the level, and what to change when the listener
says "I can't hear the words." Other clients, settings and running from a clone →
**[Getting Started](docs/Getting-Started.md)**.

## Documentation

- **[Vercel hosting](docs/Vercel.md)**: remote MCP endpoint, audio uploads and hosted clip limits.
- **[Getting Started](docs/Getting-Started.md)**: install it in Claude Code, Claude Desktop or any client, add the skill, the settings.
- **[Tools](docs/Tools.md)**: the local and hosted tools, every argument, what comes back, and what the errors mean.
- **[Levels](docs/Levels.md)**: how the music level is set by measured loudness, the ducking, and which numbers to pick for which content.
- **[Tracks](docs/Tracks.md)**: the eighteen tracks and eight stems, their moods and energy, and matching music to content.
- **[Architecture](docs/Architecture.md)**: one engine in two places, streaming to disk, and the ffmpeg mix step by step.
- **[File Map](docs/File-Map.md)**: where everything lives.
- **[Updating the Engine](docs/Updating-the-Engine.md)**: copying a new engine or new tracks in from bckgrnd-msc.
- **[Development](docs/Development.md)**: the gates, what the tests check, and releasing.
- **[Change Summary](docs/Change-summary.md)**: the full dated release history.
- **[The skill](skills/background-music/SKILL.md)**: what the agent reads.

Design decisions live in **[docs/adr/](docs/adr/INDEX.md)**. Each one says what was
decided, what was turned down, and what would make it the wrong call later.

| ADR | Decision |
|---|---|
| [001](docs/adr/001-typescript-server-over-vendored-wasm.md) | A TypeScript server runs bckgrnd-msc's own `.wasm` build, and ffmpeg does the mix |

## Tools

| Tool | What it does |
|---|---|
| `bckgrnd_list_tracks` | The eighteen tracks, with bpm, mood, energy (1 to 5) and what each one suits |
| `bckgrnd_render_track` | One track to a 48 kHz stereo WAV of any length, up to an hour. Cut any stems, set the fades |
| `bckgrnd_preview_tracks` | Compare up to three tracks under the same short narration excerpt (local server) |
| `bckgrnd_mix_under_voice` | A voice file plus a track, or your own music file, to one MP3 or WAV |

Rendering runs about **20x faster** than real time. Seven minutes of music takes
about eighteen seconds.

## Tech Stack

- **Rust → WebAssembly**: the bckgrnd-msc engine, built with `wasm-pack`, copied into `vendor/`
- **TypeScript** on **Node 20+**: the server
- **MCP TypeScript SDK**: the protocol, over stdio
- **Zod**: tool argument checking
- **ffmpeg**: loudness measuring (`ebur128`), ducking (`sidechaincompress`) and MP3 encoding
- **Vitest**: tests against the real server, real audio and real ffmpeg

## Changelog

Latest release below. Full dated history → **[docs/Change-summary.md](docs/Change-summary.md)**.

### v0.2.0: 10-21-2026

Vercel HTTP hosting, atomic file writes, unique render filenames, cancellation
and progress, measured export loudness/true peak, narration previews, and CI
with isolated package-install checks. The hosted service has three tools; the
local server adds `bckgrnd_preview_tracks`.

### v0.1.0: 10-21-2026

**First release. Music under a voice, with levels set by measured loudness.**

Three tools: list the tracks, render one to a WAV, and mix one under a narration.
The mix measures both files, sets the voice to -16 LUFS and the music 14 LU under
it, and dips the music while the voice talks. A quiet voice file and a loud one
come out at the same level. The `background-music` skill matches tracks to content.

## License

MIT
