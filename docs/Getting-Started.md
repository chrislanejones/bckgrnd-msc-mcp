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

## Hosted server (available now)

```sh
claude mcp add --transport http bckgrnd-msc https://bckgrnd-msc-mcp.vercel.app/mcp
```

See [Vercel hosting](Vercel.md) for the two-minute clip limit and audio upload/output
requirements. No local ffmpeg install is needed for hosted calls.

## Add the local server to your client

The registry package is not published yet. Use **From a clone** below until it is.
The following package commands are for after publication.

It's a stdio server. Every client starts it the same way: `pnpm dlx bckgrnd-msc-mcp`.

### Claude Code

```sh
claude mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp
```

### Claude Desktop, Cursor and other JSON configs

```json
{
  "mcpServers": {
    "bckgrnd-msc": {
      "command": "pnpm",
      "args": ["dlx", "bckgrnd-msc-mcp"]
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

## Add the skill

The current skills CLI requires Node 22.20 or newer.

The server gives an agent the tools. The skill tells it how to use them well: which
track suits which content, where to set the level, and what to change when the
listener complains.

```sh
pnpm dlx skills add chrislanejones/bckgrnd-msc-mcp
```

## Settings

Everything is optional.

| Variable | Default | What it does |
|---|---|---|
| `BCKGRND_MSC_OUT_DIR` | `<system temp>/bckgrnd-msc` | Where `bckgrnd_render_track` writes when no `output_path` is given |
| `FFMPEG_PATH` | `ffmpeg` on `PATH` | A specific ffmpeg binary |
| `FFPROBE_PATH` | `ffprobe` on `PATH` | A specific ffprobe binary |

Pass them through your client's `env` block, or put them before the command:

```sh
claude mcp add bckgrnd-msc -e BCKGRND_MSC_OUT_DIR="$HOME/Music/beds" -- pnpm dlx bckgrnd-msc-mcp
```

## Check it works

Ask your agent: "list the bckgrnd-msc tracks." You should get eighteen back. Then
"render 30 seconds of Rain" should hand you a WAV path in a second or two.
