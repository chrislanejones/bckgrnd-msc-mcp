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
pnpm run resync ../bckgrnd-msc --expect-commit <app-sha>
```

`resync` runs, stopping at the first failure:

| Step | What it does |
|---|---|
| `scripts/sync-engine.mjs` | Stage, hash-check and swap in the bundle; refuse a different app commit |
| `scripts/stamp-project-fixtures.mjs` | Re-stamp `source.sha256` in `test/fixtures/project-*.bckgrnd.json` after a library change |
| `typecheck`, `lint`, `test` | The usual gates (`pretest` builds `dist/`) |
| `scripts/verify-parity.mjs <app> --baseline .vendor-previous` | Every track at 44.1/48 kHz plus the project fixtures, MCP vs the app's built engine, byte-identical; the stock tracks also against the previous bundle |
| `test:package` | Packed install outside the repo |

Each step also runs on its own (`pnpm run sync-engine`, `pnpm run verify-parity`).
The supported project and snapshot versions are read from the vendored contracts
(`properties.version.const`), cross-checked against the app's build manifest, and
written to `SOURCE.json`. Sync also checks that the shared runtime writes that
version and refuses the next one.

`BCKGRND_MSC_DIR` can supply the source checkout. `--allow-dirty` is development
only and produces an explicit warning in project-tool results. Do not publish a
bundle with `SOURCE.json.dirty: true`.

The sync stages engine, library, contracts, generated shared runtime/declarations
and fixtures, verifies their build hashes, boots the engine and resolves all
tracks, then swaps the validated directory into `vendor/`. A normal failure leaves
the old bundle intact. `.vendor-previous` is retained for rollback. Syncing again
renames an existing one to `.vendor-previous-<commit>-<time>` (never deletes it);
archive those outside the repo once inspected. A crash between directory
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
