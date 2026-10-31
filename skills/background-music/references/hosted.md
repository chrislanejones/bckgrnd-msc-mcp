# Optional hosted processing

Chris Lane Jones operates the public Vercel endpoint:
`https://bckgrnd-msc-mcp.vercel.app/mcp`.
Use it when the user chooses remote processing and authorizes uploading the
selected narration. Do not switch from local processing silently.

Claude Code:
```sh
claude mcp add --transport http bckgrnd-msc https://bckgrnd-msc-mcp.vercel.app/mcp
```
Codex:
```sh
codex mcp add bckgrnd-msc --url https://bckgrnd-msc-mcp.vercel.app/mcp
```
Other clients use Streamable HTTP. Replace an existing entry when switching
transports; do not configure two transports under one name.

The hosted server provides list, render, mix and preview tools. Use actual
`voice_base64` bytes and `voice_format` (`mp3`, `wav`, `ogg`, `flac`). Never
invent bytes or pass local paths. Narration must fit 2 MiB and 120 seconds;
full mixes include lead-in and tail in that duration. Previews compare up to
three 15–30-second excerpts and return labeled MP3 attachments.

Ducking strength, evolving arrangements and optional final loudness mastering
work remotely. Saved presets, video exports, custom music files, local setup
checks and longer recordings require local stdio. Follow the connected schema
if an older deployment lacks a feature. Save or present returned MCP audio
when the client supports it; otherwise explain that a capable client or the
local server is needed. There are no public audio download URLs.

Narration is sent over HTTPS to Vercel and processed by Node, WASM and ffmpeg.
The application attempts to delete temporary files after each request, but
abrupt termination can prevent cleanup. It does not intentionally persist
uploaded or generated audio. This does not establish Vercel's infrastructure
logging/retention behavior or the AI client's handling of conversation data.
The endpoint is unversioned and operated by the maintainer; public source does
not attest to the exact deployed code.

Sources: [handler](https://github.com/chrislanejones/bckgrnd-msc-mcp/blob/main/api/mcp.ts),
[audio processing](https://github.com/chrislanejones/bckgrnd-msc-mcp/blob/main/src/remote.ts),
[deployment details](https://github.com/chrislanejones/bckgrnd-msc-mcp/blob/main/docs/Vercel.md).
