# Development

```sh
pnpm install
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

All five pass before every commit.

## The tests

`test/tools.test.ts` starts the real server and talks to it through the MCP SDK's
in-memory transport, the same way a client would. Nothing is mocked.

| Group | What it checks |
|---|---|
| Tool list | The three tools are there |
| `bckgrnd_list_tracks` | 18 tracks, 8 stems, every track has a mood, the filters |
| `bckgrnd_render_track` | Real WAV, right length, has sound, silent with every stem cut, fades to nothing, refuses bad paths and existing files |
| Levels | The gain math, silent music left alone, reading ffmpeg's loudness summary |
| Mix graph | The gains, the delay, the fade and the compressor land in the ffmpeg graph |
| `bckgrnd_mix_under_voice` | A real mix comes out the right length. A quiet voice and a loud voice end up within 1.5 LU of the same target |

The mix tests skip themselves when ffmpeg isn't installed.

## Trying it in a client

```sh
pnpm run build
claude mcp add bckgrnd-msc-dev -- node "$PWD/dist/index.js"
```

Rebuild after every change. The client runs `dist/`, not `src/`.

## Releasing

```sh
pnpm run typecheck && pnpm run lint && pnpm test
pnpm version patch   # or minor
pnpm publish
git push --follow-tags
```

Add the release to [Change Summary](Change-summary.md) and the README first.
