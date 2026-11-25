# Night 6 companion candidate — 2026-11-06

Version `0.4.0-rc.1` is a local release candidate, not a registry publication.
The frozen app source is `4f5a5e3083521bdb2e0bf825c5de805a9f63e628` and the shared
build ID is `885e516519d1db0725cd5adf0cd34e7cc1d7e46705cae64517f7f5c6d700605e`.
Snapshot v1 contains musical project v3, interpreted by `project-renderer-1`.
The optimized engine SHA256 is
`6ed97035573c5598c6e262d75d1e9954c1a8ed24f2510298604d2187a8972daa`.

The original eight tools, including beat-map, remain. Project validation and
rendering bring the count to ten. The packed package includes engine, library
(including variation dependencies), contracts, shared resolver/renderer and fixtures.
Sync stages and validates the replacement before swapping it; `.vendor-previous`
retains the previous bundle. A process crash between the two renames requires
restoring that directory as documented in [Updating the Engine](Updating-the-Engine.md).

Fresh typecheck, lint, 63 tests and clean packed installation pass. The installed
stdio process runs from a path containing spaces, another working directory and
restricted PATH. It validates the file saved by the installed Linux app, produces
a WAV identical to the native and production-browser exports, and mixes that same
revision under the local narration fixture. Missing ffmpeg/ffprobe gives an explicit
error; standalone musical rendering still succeeds. No upload fallback is used.

The acceptance WAV SHA256 is
`b381a1e8a94bc94111ef613de5da065b957ed685663c2cd3ee01c6f43a667a7e`
(1462857 frames, 48 kHz, stereo PCM16). Controlled noise state and encoding make
byte identity meaningful for this fixture; arbitrary future encoders need a stated
tolerance. Stored scenes remain alternatives, never a sequence.

## T3 Code connection

Only the `bckgrnd-msc` entry was added to the existing Codex configuration. Other
client configuration and unrelated `.agents/`, `.playwright-mcp/` and
`skills-lock.json` were preserved. The installed process uses absolute Node/server
paths and explicit `/usr/bin/ffmpeg` and `/usr/bin/ffprobe` locations. It reserves
stdout for protocol messages and logs on stderr.

This active T3 session has not discovered the new tools. A real T3 call remains
**unverified**, even though the same configured executable passes an SDK stdio
acceptance test. Reconnect the provider's MCP session, then validate, render and mix
`native-saved.bckgrnd.json` from the app's release evidence folder. Do not describe
the terminal test or a configuration entry as client signoff.

The local release folder is
`~/.local/share/bckgrnd-msc/releases/night6-rc1-4f5a5e3/`; it contains the installed
package archive, acceptance projects/audio, hashes and detailed test evidence.
The app's `docs/sessions/2026-11-06-night6-release.md` is the overall handoff.
Windows/macOS and real mobile devices are untested; installed Linux speaker
listening and physical interruption tests remain open.
