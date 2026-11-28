# Session log: Night 1, MCP synchronization and release readiness (11-25-2026)

Branch `night1/mcp-release-integration`, worktree `~/ai-repo/bckgrnd-mcp-night1`.
PR #3 to `main`. Draft prerelease `v0.4.0-rc.2` (untagged).

## Decisions

| Decision | Why |
|---|---|
| Branch from `night9/mcp-v4`, PR to `main` | History is linear (`main` ⊂ Night 6 ⊂ Night 9); one fast-forward PR carries all three, no conflicts. PR #2 becomes redundant |
| App commit `c57013d` (PR #12 head) | Latest reviewed Night 9 commit; one past `7b2741b`, UI-only. App worktree `~/ai-repo/bckgrnd-msc-night1`, clean build |
| Version `0.4.0-rc.2`, not `0.4.0` | PR #12 is unmerged and nothing has been listened to; the brief says stay a candidate then |
| Keep `vendor/library/variations/` | First resync dropped them (app `build` ran before `build:static`). Rebuilt in the right order and resynced; documented |
| Flat capability fields in `bckgrnd_check_setup` | Matches the proposed shape and stays additive for 0.3.1 consumers. ADR-002 (draft) |
| Flags derived from a fresh server's tool list | No hand-kept list to go stale |
| Version from `package.json`, versions/assets from `vendor/` | The brief: read from what ships |

## Gates

| Gate | Result |
|---|---|
| resync (sync, stamp, typecheck, lint, test, parity, package) | pass, twice (second run with variations) |
| Final: typecheck, lint | pass |
| Final: vitest | **84/84** |
| Final: verify-parity | **48/48** byte-identical |
| Final: test:package | pass |
| Claude Code client on installed archive | **pass** |
| Codex client on installed archive | **pass** |
| T3 Code client on rc.2 | **not tested** (thread had rc.1) |
| Listening | **not done** |

## Skipped or blocked

- Two heavy-lock waits behind another session's Night 10 jobs; one timed out
  (exit 75, nothing ran) and was re-queued.
- No npm publish, no Vercel production deploy, no tag, no client config change,
  no change to PR #2 or any other branch.
- Installed companion skill not updated.

## Night 2 should pick up

- Name new arguments to match ADR-002's predicates (`stem_volumes`,
  `scene_launches`, `fill_style`, `timeline`) or update the predicates and test.
- Scope each predicate to its owning tool (parking lot).
- Stem volume, transport, EQ, filter, echo and reverb: the contracts already list
  them under `engine_features`.
