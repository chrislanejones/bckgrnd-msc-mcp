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

## Night 6 project-aware candidate

`0.4.0-rc.1` adds `bckgrnd_validate_project` and `bckgrnd_render_project`, and
`project_path` as a narration source. It uses the browser/desktop shared renderer,
including accepted edited notes, explicit empty lanes, sustained effects and the
selected revision. Scenes remain alternative snapshots. Narration loudness,
ducking, mastering and encoding stay outside the project.

This candidate is built from a local packed artifact; **it is not the published
0.3.1 release below**. [Candidate setup](docs/Getting-Started.md#night-6-candidate-in-t3-code)
uses the actual installed Node/server paths. The packed-install test exercises all
ten local tools. Actual T3 connection and release evidence are tracked separately.

## Quick start

Needs Node 20 or newer. Mixing under a voice also needs ffmpeg
(`brew install ffmpeg`, `sudo apt install ffmpeg` or `winget install Gyan.FFmpeg`).

Use the local server by default, pinned to version 0.3.1:

```sh
claude mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.3.1
pnpm dlx skills add chrislanejones/bckgrnd-msc-mcp --skill background-music
```

Local processing keeps narration on your machine rather than uploading it to
our hosted MCP. You can also [run from a clone](docs/Getting-Started.md#from-a-clone)
or install the [v0.3.1 release archive](https://github.com/chrislanejones/bckgrnd-msc-mcp/releases/tag/v0.3.1).
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

## Preview, remember and export

Ask your agent:

- "Compare two gentle tracks under this tutorial before mixing the whole file."
- "Save these as my podcast settings; use subtle ducking and an evolving arrangement."
- "Add music to this screen recording and keep the video synchronized."
- "Master the finished export to -18 LUFS with a -2 dBTP ceiling."
- "Give me the beat times for 90 seconds of Slipstream so I can cut the video to it."

Local setup check: `pnpm dlx bckgrnd-msc-mcp@0.3.1 --check`.
Codex setup: `codex mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.3.1`.

[Workflow examples](docs/Workflows.md) cover previews, presets, video exports
and mastering. All ten candidate tools run locally; the published release has its older tool set. Hosted processing adds previews,
ducking controls, arrangements and mastering for short uploaded audio; saved
presets, video and setup diagnostics stay local.

## Documentation

- **[Vercel hosting](docs/Vercel.md)**: remote MCP endpoint, audio uploads and hosted clip limits.
- **[Getting Started](docs/Getting-Started.md)**: install it in Claude Code, Claude Desktop or any client, add the skill, the settings.
- **[Tools](docs/Tools.md)**: the local and hosted tools, every argument, what comes back, and what the errors mean.
- **[Workflows](docs/Workflows.md)**: compare music, save favorites, export video and master final loudness.
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
| `bckgrnd_validate_project` | Validate snapshot/schema/source/build compatibility without changing the file |
| `bckgrnd_render_project` | Render an immutable saved revision to PCM WAV with explicit range, fades and tail |
| `bckgrnd_render_track` | One track to a 48 kHz stereo WAV of any length, up to an hour. Cut any stems, set the fades |
| `bckgrnd_preview_tracks` | Automatically select an audible excerpt and compare up to three tracks locally or hosted |
| `bckgrnd_mix_under_voice` | Narration plus music to MP3/WAV, with optional presets, ducking strength, evolving arrangements and final mastering |
| `bckgrnd_mix_video` | Synchronized MP4 export, copying the original picture (local) |
| `bckgrnd_presets` | Save, list, retrieve, delete or migrate favorite mix settings with an original backup (local) |
| `bckgrnd_check_setup` | Check dependencies, output access and the actual music engine (local) |
| `bckgrnd_beat_map` | The exact time of every beat and bar, read from the engine, for cutting video to the music. Inline, or saved as CSV or JSON |

Project outputs report measured render time, revision, build identity, duration, format, peak and RMS. Performance depends on the host and composition.

## Tech Stack

- **Rust → WebAssembly**: the bckgrnd-msc engine, built with `wasm-pack`, copied into `vendor/`
- **TypeScript** on **Node 20+**: the server
- **MCP TypeScript SDK**: the protocol, over stdio
- **Zod**: tool argument checking
- **ffmpeg**: loudness measuring (`ebur128`), ducking (`sidechaincompress`) and MP3 encoding
- **Vitest**: tests against the real server, real audio and real ffmpeg

## Changelog

Latest release below. Full dated history → **[docs/Change-summary.md](docs/Change-summary.md)**.

### v0.3.1: 10-31-2026

The companion skill no longer carries the hosted server's address or the
commands to connect it, which clears the skills.sh security warning. Agents
only use a remote server you added yourself; hosted setup lives in
[docs/Vercel.md](docs/Vercel.md). The MCP server itself is unchanged.

### v0.3.0: 10-31-2026

Automatic preview selection and recommendations, persistent favorite presets,
three ducking strengths, synchronized video export, evolving stem arrangements,
finished-export mastering and a setup health check. Seven local tools and four
hosted tools. The companion skill covers the complete workflow for Claude and
Codex. Existing calls retain their defaults; limiter delay is now compensated.

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

Current candidate evidence: [Night 6 release record](docs/Night6-Release.md).
