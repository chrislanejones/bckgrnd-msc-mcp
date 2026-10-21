# Getting Started

## What you need

| Need | Why | Install |
|---|---|---|
| Node 20 or newer | Runs the server | [nodejs.org](https://nodejs.org/) |
| ffmpeg and ffprobe | Only for `bckgrnd_mix_under_voice`. Rendering a track on its own doesn't need them | See below |

| System | ffmpeg |
|---|---|
| macOS | `brew install ffmpeg` |
| Debian / Ubuntu | `sudo apt install ffmpeg` |
| Windows | `winget install Gyan.FFmpeg` |

## Add it to your client

It's a stdio server. Every client starts it the same way: `npx -y bckgrnd-msc-mcp`.

### Claude Code

```sh
claude mcp add bckgrnd-msc -- npx -y bckgrnd-msc-mcp
```

### Claude Desktop, Cursor and other JSON configs

```json
{
  "mcpServers": {
    "bckgrnd-msc": {
      "command": "npx",
      "args": ["-y", "bckgrnd-msc-mcp"]
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

The server gives an agent the tools. The skill tells it how to use them well: which
track suits which content, where to set the level, and what to change when the
listener complains.

```sh
npx skills add chrislanejones/bckgrnd-msc-mcp
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
claude mcp add bckgrnd-msc -e BCKGRND_MSC_OUT_DIR="$HOME/Music/beds" -- npx -y bckgrnd-msc-mcp
```

## Check it works

Ask your agent: "list the bckgrnd-msc tracks." You should get eighteen back. Then
"render 30 seconds of Rain" should hand you a WAV path in a second or two.
