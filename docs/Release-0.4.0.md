# 0.4.0 release candidate record

`0.4.0-rc.2`, 11-25-2026. A candidate for approval, **not published** to npm and
not deployed. It stays a candidate until bckgrnd-msc PR #12 (Night 9) merges and
someone listens to it.

## What it's built from

| | Value |
|---|---|
| MCP branch | `night1/mcp-release-integration` (contains Night 6 and Night 9, PR #2) |
| App commit | `c57013d7d8f3db6f8d9d691f099dda665d772f56` (head of bckgrnd-msc PR #12, unmerged) |
| App build id | `9e747ff3c9ecf855e4dd830c1e3dbdb08ca4fb7f4b5c032e8debff77049845f4` |
| App tree | clean (`dirty: false`); built with `build:engine`, `build:static`, `build` |
| Project / snapshot version | 4 / 1 |
| Renderer | `project-renderer-1` |
| Package archive | `bckgrnd-msc-mcp-0.4.0-rc.2.tgz`, SHA-256 `631a7347…fe032`, 489,113 bytes |
| Local release folder | `~/.local/share/bckgrnd-msc/releases/mcp-0.4.0-rc.2-11-25-2026/` (archive, hashes, gate and parity logs) |

## Gates (all run on 11-25-2026)

| Gate | Result |
|---|---|
| `pnpm run typecheck` | pass |
| `pnpm run lint` | pass |
| `pnpm test` | **84/84** (the Night 9 baseline was 74; 10 new) |
| `verify-parity ../bckgrnd-msc-night1 --baseline <7b2741b bundle>` | **48/48** byte-identical: app, MCP and previous bundle |
| `pnpm run test:package` | pass: packed install outside the repo, ten tools, project validate/render/narration, mastered mix |

Parity covers all twenty tracks at 44.1 and 48 kHz plus four project fixtures
(v3, v4 with crash, edited, silent). It's an automated byte comparison of WAV
files. **Nobody has listened to this build.** That includes the four fill styles,
which the app's PR #12 also lists as unheard.

## MCP clients

| Client | Tested with rc.2 | How |
|---|---|---|
| Claude Code 2.1.332 | **yes, pass** | `claude -p` with a one-off `--mcp-config` on the installed archive: check_setup, validate, render, project narration, beat map |
| Codex 0.166.0 | **yes, pass** | `codex exec` with one-off `-c mcp_servers…`: check_setup, validate, render at 44.1 kHz, beat map |
| T3 Code | **no** | The T3 thread available tonight was connected to the older rc.1 install (`f89830d`). No client config was changed |

Neither saved client configuration was changed. To test T3, add the server with
the `claude` or `codex` command from `--check`, start a new thread and call
`bckgrnd_check_setup`; it should say `server_version: 0.4.0-rc.2`.

## Compatibility report

| Area | From 0.3.1 | From 0.4.0-rc.1 |
|---|---|---|
| Tool names | all 7 kept; 3 added | same 10 |
| Arguments, types, defaults, enums, ranges | **unchanged** (pinned by `test/legacy.test.ts`) | unchanged |
| `bckgrnd_check_setup` result | `ok`, `checks`, `connections` kept; new fields added; one new `capabilities` check | same, plus the new fields |
| Track list | 18 → 20 (Cipher, Boulevard) | 20 |
| Stock-track audio | **byte-different on all 18 tracks** (engine and library from `bd79af5` → Night 6+) | identical to the `7b2741b` sync |
| Track content hashes | n/a: 0.3.1 has no project tools | **unchanged**, so saved projects still match |
| Project files | n/a | v1-v4 read, v5+ refused, files never rewritten |
| Hosted server | 4 tools → 5 (adds `bckgrnd_beat_map`) | unchanged |

Version 0.3.1 sounds different because it still runs the very first engine sync.
Calls that worked keep working and mean the same thing, but a re-render of an
old bed won't be bit-identical to the 0.3.1 file.

## Before publishing (needs Chris)

| Step | Command or action |
|---|---|
| Merge bckgrnd-msc PR #12, then confirm `main` still builds `c57013d`'s bundle | resync with `--expect-commit <merge sha>` if the merge commit differs |
| Listen to project renders, the narration mix and two stock tracks | human |
| Accept ADR-002 | `docs/adr/` |
| Set the version | `pnpm version 0.4.0 --no-git-tag-version`, update `server_version` row in docs/Tools.md and the skill's `metadata.version` |
| Swap the install pins | `@0.3.1` → `@0.4.0` in README, Getting-Started, Workflows and the skill |
| Merge the integration PR to `main` | GitHub |
| Publish | `pnpm publish --access public` (runs every gate in `prepublishOnly`) |
| Tag and release | publish the draft GitHub release as `v0.4.0` |
| Deploy hosted, then check it | Vercel production, then `pnpm run test:hosted` |
| Reinstall the companion skill | `pnpm dlx skills add chrislanejones/bckgrnd-msc-mcp --skill background-music` |

## Rolling back

| What went wrong | Do this |
|---|---|
| A client misbehaves on rc.2 | Point it back at 0.3.1: `claude mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.3.1` (or `codex mcp add …`), or at the rc.1 install folder |
| 0.4.0 published and broken | `npm deprecate bckgrnd-msc-mcp@0.4.0 "<reason>"` and move the `latest` tag back: `npm dist-tag add bckgrnd-msc-mcp@0.3.1 latest`. Never unpublish |
| Hosted deploy broken | Promote the previous production deployment in Vercel |
| The vendored bundle is wrong | `git revert` the sync commit; `vendor/` is fully in git. The `.vendor-previous*` folders in the worktree hold the earlier bundles too |
| The integration PR is wrong | Close it. `main`, `night6/linux-release-candidate` and `night9/mcp-v4` are untouched |

Projects need no rollback: no file is ever rewritten, and 0.3.1 never read them.
