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

Use the local server by default. The commands pin version 0.2.0.

It's a stdio server. Every client starts it the same way: `pnpm dlx bckgrnd-msc-mcp@0.2.0`.

### Claude Code

```sh
claude mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.2.0
```

### Claude Desktop, Cursor and other JSON configs

```json
{
  "mcpServers": {
    "bckgrnd-msc": {
      "command": "pnpm",
      "args": ["dlx", "bckgrnd-msc-mcp@0.2.0"]
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
claude mcp add bckgrnd-msc -e BCKGRND_MSC_OUT_DIR="$HOME/Music/beds" -- pnpm dlx bckgrnd-msc-mcp@0.2.0
```

## Check it works

Ask your agent: "list the bckgrnd-msc tracks." You should get eighteen back. Then
"render 30 seconds of Rain" should hand you a WAV path in a second or two.
