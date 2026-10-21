# File Map

| Path | What's in it |
|---|---|
| `src/index.ts` | Entry point. Starts the server on stdio |
| `src/server.ts` | Builds the `McpServer` and registers the tools. Tests use this directly |
| `src/tools.ts` | The three tools: schemas, descriptions, handlers |
| `src/library.ts` | Reads the track library, finds tracks by id or name, the stem order |
| `src/moods.ts` | Mood, energy and "good for" per style |
| `src/render.ts` | Boots the `.wasm`, drives `Engine.process()`, fades |
| `src/wav.ts` | The streaming 16-bit stereo WAV writer |
| `src/mix.ts` | ffmpeg and ffprobe: duration, loudness, the mix graph |
| `src/paths.ts` | Output folder and the path checks |
| `vendor/engine/` | The engine, copied from bckgrnd-msc's `public/wasm/` |
| `vendor/library/` | The tracks, copied from bckgrnd-msc's `public/library/` |
| `vendor/SOURCE.json` | Which bckgrnd-msc commit `vendor/` came from |
| `scripts/sync-engine.mjs` | Refreshes `vendor/` from a bckgrnd-msc checkout |
| `skills/bckgrnd-music/SKILL.md` | The skill listed on skills.sh |
| `test/tools.test.ts` | The tests. They run the real server in memory |
| `docs/` | These pages |
| `docs/adr/` | Design decisions |

`dist/` is the build output and isn't committed.
