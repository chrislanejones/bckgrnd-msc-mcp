# Getting Started

## What you need

| Need | Why | Install |
|---|---|---|
| Node 20 or newer | Runs the server | [nodejs.org](https://nodejs.org/) |
| ffmpeg and ffprobe | For mixing and previews. Rendering a track on its own doesn't need them | See below |

| System | ffmpeg |
|---|---|
| macOS | `brew install ffmpeg` |
| Debian / Ubuntu | `sudo apt install ffmpeg` |
| Windows | `winget install Gyan.FFmpeg` |

## Add the local server to your client

Use the local server by default. The commands pin version 0.3.1 from npm.
The same package is also attached to the
[GitHub release](https://github.com/chrislanejones/bckgrnd-msc-mcp/releases/tag/v0.3.1):
swap `bckgrnd-msc-mcp@0.3.1` for `https://github.com/chrislanejones/bckgrnd-msc-mcp/releases/download/v0.3.1/bckgrnd-msc-mcp-0.3.1.tgz` to install from there.

It's a stdio server. Every client starts it the same way: `pnpm dlx bckgrnd-msc-mcp@0.3.1`.

### Claude Code

```sh
claude mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.3.1
```

### Codex

```sh
codex mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.3.1
```

The skill and MCP connection are separate. Restart the client if newly added
tools do not appear. Check configured entries with `codex mcp list`.

### Claude Desktop, Cursor and other JSON configs

```json
{
  "mcpServers": {
    "bckgrnd-msc": {
      "command": "pnpm",
      "args": ["dlx", "bckgrnd-msc-mcp@0.3.1"]
    }
  }
}
```

### From a clone

```sh
git clone https://github.com/chrislanejones/bckgrnd-msc-mcp.git
cd bckgrnd-msc-mcp
pnpm install
pnpm run build
claude mcp add bckgrnd-msc -- node "$PWD/dist/index.js"
```

## Optional hosted server

Choose this only if you want narration processed remotely by the project operator
on Vercel. Read [ownership and audio processing](Vercel.md#ownership-and-audio-processing).
The hosted endpoint is not pinned to the local package version.

```sh
claude mcp add --transport http bckgrnd-msc https://bckgrnd-msc-mcp.vercel.app/mcp
```

Hosted calls need no local ffmpeg but have the upload and duration limits in
[Vercel hosting](Vercel.md). Do not configure both transports under the same
client entry; replace the existing entry if changing transports.

## Add the skill

The current skills CLI requires Node 22.20 or newer.

The server gives an agent the tools. The skill tells it how to use them well: which
track suits which content, where to set the level, and what to change when the
listener complains.

```sh
pnpm dlx skills add chrislanejones/bckgrnd-msc-mcp --skill background-music
```

Choose Claude Code and/or Codex in the installer. For a shared global install:

```sh
pnpm dlx skills add chrislanejones/bckgrnd-msc-mcp --skill background-music -g -a claude-code codex -y
```

Update just this global skill with `pnpm dlx skills update background-music -g`.
Avoid installing both global and repository copies unless you want both scopes.
The public skill lives in GitHub under `skills/background-music`; skills.sh
indexes installations rather than accepting a separate skill package upload.
See the [skills.sh FAQ](https://skills.sh/docs/faq).

## Settings

Everything is optional.

| Variable | Default | What it does |
|---|---|---|
| `BCKGRND_MSC_OUT_DIR` | `<system temp>/bckgrnd-msc` | Where `bckgrnd_render_track` writes when no `output_path` is given |
| `BCKGRND_MSC_CONFIG_DIR` | `~/.config/bckgrnd-msc` | Absolute folder for saved presets |
| `FFMPEG_PATH` | `ffmpeg` on `PATH` | A specific ffmpeg binary |
| `FFPROBE_PATH` | `ffprobe` on `PATH` | A specific ffprobe binary |

Pass them through your client's `env` block, or put them before the command:

```sh
claude mcp add bckgrnd-msc -e BCKGRND_MSC_OUT_DIR="$HOME/Music/beds" -- pnpm dlx bckgrnd-msc-mcp@0.3.1
```

## Check it works

Run the setup check first:

```sh
pnpm dlx bckgrnd-msc-mcp@0.3.1 --check
```

It returns JSON, exits 0 on success (1 on a failed check), and checks Node,
ffmpeg/ffprobe, output-folder access and a real short WASM render. It removes
its temporary files and prints connection commands without changing client
configuration. The same check is available as `bckgrnd_check_setup`.

Ask your agent: "list the bckgrnd-msc tracks." You should get eighteen back. Then
"render 30 seconds of Rain" should hand you a WAV path in a second or two.

## Night 6 candidate in T3 Code

Use the tested `0.4.0-rc.1` tarball from this checkout, not an unpublished registry
version. Install it into a stable local directory with pnpm and no dev dependencies.
Run the installed `dist/index.js --check`; its `connections` output includes the
actual Node executable and server entrypoint. Configure only `bckgrnd-msc`:

```sh
codex mcp add bckgrnd-msc -- /absolute/path/to/node /absolute/path/to/installed/dist/index.js
```

T3 Code's Codex provider must reconnect its MCP session to discover a newly added
server. Verify by calling `bckgrnd_validate_project`, `bckgrnd_render_project`, then
`bckgrnd_mix_under_voice` with the same saved project. An SDK/terminal smoke test is
not this client test. Keep stdout reserved for protocol messages; logs use stderr.
Use local stdio; no network bridge is needed.

The desktop bundles its own PHP/Electron/audio assets. It does not install Node or
ffmpeg for the MCP client. Project WAV rendering needs Node 20+; narration/video
also need ffmpeg and ffprobe accessible to that configured process. A missing
executable returns a useful limitation and leaves standalone rendering usable.
No local failure uploads narration to the hosted service.
