# Vercel deployment

The hosted server uses stateless MCP Streamable HTTP at `/mcp`. Each request has
its own MCP server and temporary audio directory, so it does not require Redis,
Blob storage or sticky sessions. Node runs the existing WASM music engine;
ffmpeg and ffprobe are bundled at build time.

## Hosted limits

- Render and mix output: at most 120 seconds, including lead-in and tail.
- Narration upload: at most 2 MiB, supplied as real base64 file contents and
  `voice_format` (`mp3`, `wav`, `ogg`, `flac`). Local filesystem paths are not accepted.
- Output: embedded MCP audio (`audio/mpeg`, 96 kbps), with metadata. Clients must
  support audio content or save its base64 bytes as an MP3. There is no persistent
  download URL. Temporary files are removed after the response is prepared.
- Custom music files and longer narration remain available through local stdio.
- Two audio jobs per warm instance; this is not a global rate limit. Vercel plan
  quotas still apply. The function has a 60-second execution budget.

## Deploy

Import this GitHub repository into Vercel with framework **Other**, Node 22 or
24, and the repository root as the project directory. `vercel.json` configures
pnpm, the build, binary inclusion and the `/mcp` route. No paid storage add-on is
required. Check your account's plan and usage limits before sharing widely.

`pnpm run build:vercel` compiles the server and copies only the current platform's
audio binaries into the deployment. These binaries are excluded from Git and
the published local-server package.

Optional: set `BCKGRND_MSC_API_TOKEN` in Vercel to require a bearer token. Without
it the endpoint is public wherever Vercel deployment protection permits access.
Preview protection may block ordinary MCP clients; use the production URL or
configure access intentionally in the Vercel dashboard.

## Connect

```sh
claude mcp add --transport http bckgrnd-msc https://YOUR-PROJECT.vercel.app/mcp
```

For other clients, select Streamable HTTP and use that same URL. The root URL
returns a JSON description of the service; it is not the MCP endpoint.

The companion skill must follow the connected server's tool schema: hosted
calls use `voice_base64` and return audio, while local calls use `voice_path`
and return paths. Never invent audio bytes or send a local path to the host.
