# Getting Started

## What you need

| Need | Why | Install |
|---|---|---|
| Node 22 or newer | Runs the server | [nodejs.org](https://nodejs.org/) |
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
tools do not appear. Inspect this entry with `codex mcp get bckgrnd-msc`.

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

Ask your agent: "list the bckgrnd-msc tracks." You should get twenty back (eighteen
on 0.3.1, which predates the Hip-hop section). Then
"render 30 seconds of Rain" should hand you a WAV path in a second or two.

## The 0.4.0 release candidate

`0.4.0-rc.2` is not on npm. Until it is, install it from the packed archive (the
`.tgz` attached to the draft GitHub release, or `pnpm pack` in a checkout of
`night1/mcp-release-integration`) into a folder of its own:

```sh
mkdir -p ~/.local/share/bckgrnd-msc/0.4.0-rc.2 && cd ~/.local/share/bckgrnd-msc/0.4.0-rc.2
pnpm add /absolute/path/to/bckgrnd-msc-mcp-0.4.0-rc.2.tgz
node node_modules/bckgrnd-msc-mcp/dist/index.js --check
```

The `--check` output ends with `connections`: the exact Node and `dist/index.js`
paths for this install, already quoted. Use those, not `pnpm dlx`, which would
fetch 0.3.1 from npm. Then connect one client.

### Claude Code

```sh
claude mcp add bckgrnd-msc -- /absolute/path/to/node /absolute/path/to/dist/index.js
```

Start a new session and ask: "check the bckgrnd-msc setup." The answer should
name `server_version 0.4.0-rc.2` and list `project_rendering` and `beat_mapping`
as supported.

### Codex

```sh
codex mcp add bckgrnd-msc -- /absolute/path/to/node /absolute/path/to/dist/index.js
```

### T3 Code

T3 Code runs Claude Code or Codex underneath, and each reads its own MCP list. Add
the server with the `claude` or `codex` command above for the provider the thread
uses, then start a new thread (or reconnect the provider) so it finds the new
server. An existing thread keeps the server it started with. Check by calling
`bckgrnd_check_setup` from the thread and reading `server_version`; then
`bckgrnd_validate_project`, `bckgrnd_render_project` and `bckgrnd_mix_under_voice`
on the same saved project. A terminal `--check` alone isn't a client test.

Keep stdout for protocol messages; logs go to stderr. No network bridge is needed.

### Local and hosted

| | Local (stdio) | Hosted (HTTP) |
|---|---|---|
| Tools | all ten | five: list, render, mix, preview, beat map |
| Narration | read from your disk, never uploaded | uploaded as base64, two minutes at most |
| Saved projects | validate, render, mix | not available |
| Video, presets, setup check | yes | no |
| Capability report | `bckgrnd_check_setup` | not available; read the tool list |
| Setup | you add it | you add it; agents never add or switch to it |

A failed local setup never falls back to the hosted server. The desktop app
bundles its own PHP, Electron and audio assets; it doesn't install Node or ffmpeg
for an MCP client. Project WAV rendering needs Node 22+; narration and video also
need ffmpeg and ffprobe on the configured process's `PATH`.
