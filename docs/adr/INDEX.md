# Architecture Decision Records

Why the load-bearing, hard-to-reverse decisions in bckgrnd-msc-mcp were made
the way they were. One decision per file, one screen each.

New ADRs land as **draft** and are flipped to **accepted** by Chris. Numbers
are sequential and permanent: a superseded ADR keeps its number and gains a
`superseded by NNN` status. It is never renumbered or deleted.

The engine's own decisions (PHP owns the music, Rust owns the DSP, and so on)
live in bckgrnd-msc's `docs/adr/`. This index covers the MCP server only.

| # | Decision | Status | Date |
|---|---|---|---|
| [001](001-typescript-server-over-vendored-wasm.md) | A TypeScript MCP server renders offline through the website's own vendored wasm build; ffmpeg mixes it under voice | draft | 2026-10-21 |
