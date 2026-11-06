# Updating the shared render bundle

The app builds WASM and the shared project renderer. MCP vendors that complete
bundle; a clean package install requires no sibling app checkout or Rust tools.
Sync after engine, source library, project contracts, resolver or rendering changes.
A UI-only change may retain audio behavior, but a release still records one exact
reviewed app build and commit.

```sh
cd ../bckgrnd-msc
pnpm run build:engine
pnpm run build
# Source must already be committed before this release build.
cd ../bckgrnd-msc-mcp
pnpm run sync-engine ../bckgrnd-msc
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run test:package
```

`BCKGRND_MSC_DIR` can supply the source checkout. `--allow-dirty` is development
only and produces an explicit warning in project-tool results. Do not publish a
bundle with `SOURCE.json.dirty: true`.

The sync stages engine, library, contracts, generated shared runtime/declarations
and fixtures, verifies their build hashes, boots the engine and resolves all
tracks, then swaps the validated directory into `vendor/`. A normal failure leaves
the old bundle intact. `.vendor-previous` is retained for rollback; archive it
outside the repo after inspecting it before another sync. A crash between directory
renames requires restoring `.vendor-previous`; this is a maintainer operation,
not a live updater. Never copy individual files into an installed package.

`vendor/SOURCE.json` records app commit, build identity, supported versions and a
content hash for every asset. Project tools verify this before rendering. The
package allowlist includes contracts/shared/fixtures as well as engine/library.
The pack test installs in a fresh directory containing spaces and non-ASCII text,
starts stdio with a restricted PATH and exercises project validation/render/narration
and existing stock/preset tools. It caught wasm-pack's nested `.gitignore`
excluding WASM from the package; sync omits that generated ignore file.

After an audio change, rebuild and repeat app and MCP audio/parity checks. Use the
app's `tools/verify-render-parity.mjs` with an actual installed Linux executable.
Byte equality is asserted only for isolated WASM noise state, matching engine and
fixed PCM metadata. Preserve an earlier packed artifact alongside the source stamp.
