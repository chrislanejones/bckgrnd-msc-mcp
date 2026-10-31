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

Use the local server by default. These commands use the versioned GitHub release archive; npm registry publication is pending maintainer reauthentication.

It's a stdio server. Every client starts it the same way: `pnpm dlx https://github.com/chrislanejones/bckgrnd-msc-mcp/releases/download/v0.3.0/bckgrnd-msc-mcp-0.3.0.tgz`.

### Claude Code

```sh
claude mcp add bckgrnd-msc -- pnpm dlx https://github.com/chrislanejones/bckgrnd-msc-mcp/releases/download/v0.3.0/bckgrnd-msc-mcp-0.3.0.tgz
```

### Codex

```sh
codex mcp add bckgrnd-msc -- pnpm dlx https://github.com/chrislanejones/bckgrnd-msc-mcp/releases/download/v0.3.0/bckgrnd-msc-mcp-0.3.0.tgz
```

The skill and MCP connection are separate. Restart the client if newly added
tools do not appear. Check configured entries with `codex mcp list`.

### Claude Desktop, Cursor and other JSON configs

```json
{
  "mcpServers": {
    "bckgrnd-msc": {
      "command": "pnpm",
      "args": ["dlx", "https://github.com/chrislanejones/bckgrnd-msc-mcp/releases/download/v0.3.0/bckgrnd-msc-mcp-0.3.0.tgz"]
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
claude mcp add bckgrnd-msc -e BCKGRND_MSC_OUT_DIR="$HOME/Music/beds" -- pnpm dlx https://github.com/chrislanejones/bckgrnd-msc-mcp/releases/download/v0.3.0/bckgrnd-msc-mcp-0.3.0.tgz
```

## Check it works

Run the setup check first:

```sh
pnpm dlx https://github.com/chrislanejones/bckgrnd-msc-mcp/releases/download/v0.3.0/bckgrnd-msc-mcp-0.3.0.tgz --check
```

It returns JSON, exits 0 on success (1 on a failed check), and checks Node,
ffmpeg/ffprobe, output-folder access and a real short WASM render. It removes
its temporary files and prints connection commands without changing client
configuration. The same check is available as `bckgrnd_check_setup`.

Ask your agent: "list the bckgrnd-msc tracks." You should get eighteen back. Then
"render 30 seconds of Rain" should hand you a WAV path in a second or two.
