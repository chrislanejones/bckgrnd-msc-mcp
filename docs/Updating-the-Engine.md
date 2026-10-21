# Updating the Engine

The engine and the track library aren't built here. They're copied in from a built
bckgrnd-msc checkout, so this repo never needs Rust or `wasm-pack`.

## When to sync

| Changed in bckgrnd-msc | Sync? |
|---|---|
| Anything in `engine-core/` (the sound) | Yes |
| A track added or rewritten (`app/Support/Music/`) | Yes |
| The website's UI | No |

## How

```sh
cd ../bckgrnd-msc
pnpm run build:engine                         # rebuild the .wasm
php tools/export-library.php public/library   # only if tracks changed

cd ../bckgrnd-msc-mcp
pnpm run sync-engine ../bckgrnd-msc
pnpm test
```

The path can also come from `BCKGRND_MSC_DIR`. Without either, the script looks
for `../bckgrnd-msc`.

## What it writes

| File | From |
|---|---|
| `vendor/engine/bckgrnd_msc_engine.js` | `public/wasm/` |
| `vendor/engine/bckgrnd_msc_engine.d.ts` | `public/wasm/` |
| `vendor/engine/bckgrnd_msc_engine_bg.wasm` | `public/wasm/` |
| `vendor/library/*.json` | `public/library/` |
| `vendor/SOURCE.json` | The checkout's commit, and whether the engine or tracks had uncommitted changes |

Don't release from a sync where `SOURCE.json` says `"dirty": true`. That copy
can't be traced back to a commit.

## After a sync

- Run `pnpm test`. The render tests catch an engine that won't boot or plays silence.
- If a track was added, give its style an entry in `src/moods.ts`. A style with no
  entry shows up as `unrated`, and the test that checks every track has a mood fails.
- If `bckgrnd_msc_engine.js` changed but nothing under `engine-core/src` did, a
  wasm-bindgen update changed the glue. Read the diff before you release.
