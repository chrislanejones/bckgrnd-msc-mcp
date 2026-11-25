# ADR-002: `bckgrnd_check_setup` reports compatibility, with capability flags derived from the advertised tools
Date: 2026-11-25   Status: draft

## Context
Agents had no way to ask what a given install supports. They guessed from the
tool descriptions and passed arguments the server did not accept. 0.4.0 vendors
project v4 contracts, 20 tracks, 8 stems and 4 fill styles, but only 2 of the 7
capabilities agents ask about (project rendering, beat mapping) have a tool
behind them. Night 2+ will add more, and a hand-kept list would drift from the
tools the first time someone forgot to update it.

## Decision
`bckgrnd_check_setup` keeps `{ ok, checks, connections }` and spreads in a flat
compatibility block from `src/capabilities.ts`, and it gains an `outputSchema`.
Versions, build stamp, sections and stems are read from `vendor/contracts`,
`vendor/SOURCE.json` and `vendor/library` at call time. The 7 `capabilities`
flags are derived: the module starts a fresh server (`createServer` +
`InMemoryTransport` + `listTools`), and each flag is a predicate that names the
tool or input argument that would provide it (`project_editing` is a
`bckgrnd_edit_project` tool; `individual_stem_volume` is a `stem_volumes` or
`stem_volume` argument on any tool). `engine_features` lists what the engine and
contracts contain, kept apart from `capabilities` (what a tool accepts) so agents
don't pass arguments no tool takes. All new fields are optional in the schema. If
the bundle can't be read they are omitted and a `capabilities` check fails.

## Consequences
+ A later release flips a flag by adding the tool or argument. There is no list
  to maintain, and no flag can claim a tool that isn't registered.
+ Additive and flat: 0.3.1 consumers see the same three fields they read before,
  pinned by `test/legacy.test.ts`.
- The predicate names (`bckgrnd_edit_project`, `stem_volumes`, `scene_launches`,
  `fill_style`, `bckgrnd_render_timeline`/`timeline`) are now a naming commitment.
  If Night 2 names its argument differently, it must update the predicate (and
  the `capabilitiesOf` test) or the flag stays false.
- The hosted server (`src/remote.ts`) doesn't register `bckgrnd_check_setup`, so
  hosted clients get no capability report.
- Every call builds a second full server and reads all 20 track files to report
  on the first one.

## Alternatives rejected
- Hand-maintained capabilities constant: drifts from the tools the first time a
  release forgets it, which is the problem this solves.
- Separate `bckgrnd_capabilities` tool: an 11th tool breaks the 10-tool test and
  docs, and hosted clients still couldn't call it.
- Nesting under a `compatibility` key: doesn't match the proposed response shape.
- Reading `_registeredTools` off the MCP server: private SDK API that can change
  in any patch release.

## Pre-mortem
It is six months later and this was a mistake. Most likely reason: the
predicates match too loosely or too strictly. `hasArgument` checks every tool, so
an unrelated `timeline` argument on some later tool turns `timeline_rendering`
on for a feature that doesn't exist. Or Night 2 ships `stem_gains` instead of
`stem_volumes`, nobody touches the predicate, and agents are told a shipped
feature is unsupported. Either way the flag is wrong while looking derived, which
is worse than a hand list everyone knows to distrust.
Early warning sign to watch for: a release that adds a tool argument and leaves
`src/capabilities.ts` and the `reports only what a registered tool provides`
test untouched.
