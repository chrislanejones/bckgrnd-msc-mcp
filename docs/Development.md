# Development

```sh
pnpm install
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
pnpm run test:package
```

All checks pass before a release. Tests require ffmpeg and ffprobe; CI installs them explicitly.

## The tests

`test/tools.test.ts` starts the real server and talks to it through the MCP SDK's
in-memory transport, the same way a client would. Nothing is mocked.

| Group | What it checks |
|---|---|
| Tool list | The four local tools are there |
| `bckgrnd_list_tracks` | 18 tracks, 8 stems, every track has a mood, the filters |
| `bckgrnd_render_track` | Real WAV, right length, has sound, silent with every stem cut, fades to nothing, refuses bad paths and existing files |
| Levels | The gain math, silent music left alone, reading ffmpeg's loudness summary |
| Mix graph | The gains, the delay, the fade and the compressor land in the ffmpeg graph |
| `bckgrnd_mix_under_voice` | A real mix comes out the right length. A quiet voice and a loud voice end up within 1.5 LU of the same target |

The original mix tests skip without ffmpeg, but reliability and package tests require it.

## Trying it in a client

```sh
pnpm run build
pnpm run test:package
claude mcp add bckgrnd-msc-dev -- node "$PWD/dist/index.js"
```

Rebuild after every change. The client runs `dist/`, not `src/`.

## Releasing

```sh
pnpm run typecheck && pnpm run lint && pnpm test
pnpm version patch --no-git-tag-version   # or minor
pnpm publish --access public
git push --follow-tags
```

Add the release to [Change Summary](Change-summary.md) and the README first.

## Release checks

`test:package` packs the actual publishable archive, installs it into a fresh
temporary project, launches its stdio executable, and checks discovery, WASM
rendering and an ffmpeg mix. It does not depend on files in the source checkout
except the input speech fixture. `prepublishOnly` runs typecheck, lint, audio
tests and this package check. Publishing requires `pnpm login`; do not mark the
registry package released before publication succeeds.

GitHub Actions runs the checks on Node 22 and 24, including Vercel asset staging.
HTTP tests exercise stateless MCP requests and uploaded audio with bundled
binaries. Reliability tests cover racing writes, cancellation, exported audio,
previews and real synthesized speech followed by silence.
