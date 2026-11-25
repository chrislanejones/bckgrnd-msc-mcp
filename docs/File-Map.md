# File Map

| Path | What's in it |
|---|---|
| `src/index.ts` | Entry point. Starts the server on stdio |
| `src/server.ts` | Builds the `McpServer` and registers the tools. Tests use this directly |
| `src/preview.ts` | Activity-based excerpts, recommendations and track comparisons |
| `src/workflow.ts` | Shared narration mix and preset resolution |
| `src/settings.ts` | Shared validation and default mix settings |
| `src/presets.ts` | Atomic local favorite settings |
| `src/video.ts` | Probe, synchronize, mix and copy MP4 video |
| `src/doctor.ts` | CLI/MCP dependency and engine diagnostics |
| `src/capabilities.ts` | Versions, build, library and capability flags for `bckgrnd_check_setup`, read from `vendor/` and the registered tools |
| `src/projects.ts` | `bckgrnd_validate_project` and `bckgrnd_render_project`: bundle check, loading, the render worker |
| `src/project-worker.ts` | One project render in a fresh worker and WASM instance |
| `src/beats.ts` | `bckgrnd_beat_map` and the measured beat grid |
| `src/jobs.ts` | Cancellation and MCP progress |
| `src/remote.ts` | Hosted upload/audio adapter |
| `api/mcp.ts` | Stateless HTTP endpoint |
| `scripts/test-package.mjs` | Isolated package installation and stdio verification |
| `src/tools.ts` | List, render and mix: schemas, descriptions, handlers |
| `src/library.ts` | Reads the track library, finds tracks by id or name, the stem order |
| `src/moods.ts` | Mood, energy and "good for" per style |
| `src/render.ts` | Boots the `.wasm`, drives `Engine.process()`, fades |
| `src/wav.ts` | The streaming 16-bit stereo WAV writer |
| `src/mix.ts` | ffmpeg and ffprobe: duration, loudness, the mix graph |
| `src/paths.ts` | Output folder and the path checks |
| `vendor/engine/` | The engine, copied from bckgrnd-msc's `public/wasm/` |
| `vendor/contracts/` | Project, snapshot, parameter, pattern and scene contracts, from bckgrnd-msc's `contracts/` |
| `vendor/shared/` | The app's shared project renderer (`runtime.js`) and its type declarations, from `public/shared/` |
| `vendor/fixtures/` | The app's contract, fill and release project fixtures, from `tests/fixtures/` |
| `vendor/library/` | The tracks (with their `fillStyles`) and the static variation catalog, copied from bckgrnd-msc's `public/library/` |
| `vendor/SOURCE.json` | Which bckgrnd-msc commit and build `vendor/` came from, its project/snapshot versions and a SHA-256 for every file |
| `scripts/sync-engine.mjs` | Stages, hash-checks and swaps in a new `vendor/` from a bckgrnd-msc build |
| `scripts/resync.mjs` | `pnpm run resync`: sync, re-stamp fixtures, then every gate |
| `scripts/stamp-project-fixtures.mjs` | Re-stamps `source.sha256` in `test/fixtures/project-*.bckgrnd.json` |
| `scripts/verify-parity.mjs` | MCP vs app build, every track at 44.1/48 kHz plus project fixtures, byte for byte |
| `scripts/test-hosted.mjs` | Post-deploy check of the hosted endpoint |
| `skills/background-music/SKILL.md` | The companion skill discoverable by the skills CLI |
| `test/` | Real audio, video, preset, project, version, beat, capability, legacy-schema, HTTP and reliability checks |
| `test/fixtures/tools-v0.3.1.json` | The tool schemas 0.3.1 advertised, for the legacy test |
| `docs/` | These pages |
| `docs/adr/` | Design decisions |

`dist/` is the build output and isn't committed.
