# bckgrnd-msc MCP

## Tagline
Generate background music and mix it under narration with measured loudness and automatic ducking.

## Description
An open-source MCP server for podcasts, narrated articles, demos and screen recordings.
Choose from 18 synthesized tracks across house, deep house, acid, lofi, garage,
breakbeat and liquid drum & bass. A Rust engine compiled to WebAssembly generates
the music; ffmpeg matches loudness and ducks the music while the voice speaks.
Control eight stems and inspect final loudness and true-peak measurements.

Use the hosted Streamable HTTP endpoint for MP3 clips up to 120 seconds, or run
the local stdio server for filesystem workflows, custom music and track previews.
The service is free, and the source is MIT licensed.

## Setup Requirements
- Hosted endpoint: https://bckgrnd-msc-mcp.vercel.app/mcp (Streamable HTTP).
- The public hosted endpoint needs no account or API key.
- Hosted narration must be base64-encoded audio, with `voice_format` set to mp3,
  wav, ogg or flac; decoded input is limited to 2 MiB. Total output duration,
  including intro and tail, is limited to 120 seconds. Results embed MP3 audio.
- Local setup requires Node.js 20+, pnpm, and ffmpeg for mixing and previews.
  Build from the public repository with `pnpm install` and `pnpm run build`,
  then run `node dist/index.js`. Registry publication is pending.
- `BCKGRND_MSC_API_TOKEN` (optional, self-hosted deployments): require bearer
  authentication on your own deployment. Not required for the public endpoint.

## Category
Content & Media

## Features
- Browse 18 tracks by mood, energy, tempo and use case.
- Render synthesized music with stem controls and fades.
- Mix narration with music using measured loudness and automatic ducking.
- Return output loudness and true-peak measurements.
- Compare tracks against a narration excerpt using the local preview tool.
- Follow the companion bckgrnd-music skill for track selection and mixing guidance.

## Getting Started
- Connect: `claude mcp add --transport http bckgrnd-msc https://bckgrnd-msc-mcp.vercel.app/mcp`
- Install the companion skill: `pnpm dlx skills add chrislanejones/bckgrnd-msc-mcp --skill bckgrnd-music`
- "List some calm tracks for a narrated tutorial."
- "Render 30 seconds of Study without the lead melody."
- "Put quiet background music under this narration and dip it while I speak."
- Tool: `bckgrnd_list_tracks` — browse and filter the music library.
- Tool: `bckgrnd_render_track` — generate a track with stem controls and fades.
- Tool: `bckgrnd_mix_under_voice` — mix narration with a generated track.
- Tool: `bckgrnd_preview_tracks` — compare short mixes locally; unavailable on the hosted endpoint.

## Tags
audio, music, narration, podcast, background-music, ducking, loudness, wasm, typescript, mcp

## Documentation URL
https://github.com/chrislanejones/bckgrnd-msc-mcp#readme

## Repository URL
https://github.com/chrislanejones/bckgrnd-msc-mcp

## Pricing
Free
