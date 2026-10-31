# Optional hosted processing

This skill does not connect to a hosted server. Hosted processing is only
relevant when the user has already added a remote bckgrnd-msc MCP server
themselves, following the project's
[hosted setup guide](https://github.com/chrislanejones/bckgrnd-msc-mcp/blob/main/docs/Vercel.md).
Do not add, suggest or switch to a remote server on your own, including when
local setup fails; offer the local fixes from the setup check instead.

When a remote server is connected, use it only after the user authorizes
uploading the selected narration. It provides list, render, mix and preview
tools. Use actual `voice_base64` bytes and `voice_format` (`mp3`, `wav`, `ogg`,
`flac`). Never invent bytes or pass local paths. Narration must fit 2 MiB and
120 seconds; full mixes include lead-in and tail in that duration. Previews
compare up to three 15–30-second excerpts and return labeled MP3 attachments.

Ducking strength, evolving arrangements and optional final loudness mastering
work remotely. Saved presets, video exports, custom music files, local setup
checks and longer recordings require local stdio. Follow the connected schema
if an older deployment lacks a feature. Save or present returned MCP audio
when the client supports it; otherwise explain that a capable client or the
local server is needed. There are no public audio download URLs.

Remote processing sends narration over HTTPS to the server's operator. Explain
that before uploading, and point the user to the hosted setup guide for the
operator's retention and logging details.
