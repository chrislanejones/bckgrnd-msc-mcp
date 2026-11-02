---
name: background-music
description: Add background music to narration, podcasts, screen recordings or videos using the bckgrnd-msc MCP server. Compare short previews, reuse favorite settings, keep speech clear, and export audio or synchronized video. Use when someone asks to put music under a voice, add a beat to a recording, or improve a narrated MP3 or video.
metadata:
  version: "0.3.1"
---

# Background music under a voice

Use the bckgrnd-msc MCP server to choose music, compare it under actual speech,
and export a mix. The server synthesizes eighteen tracks with eight stems;
ffmpeg measures levels and lowers music while the voice talks. Respect the
listener's requested track, level and workflow over the suggestions below.

## Connect and check

Installing the skill adds instructions; connect the MCP separately. Local
processing is the default: Node 20+, pnpm, ffmpeg and ffprobe are needed.

Claude Code:
```sh
claude mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.3.1
```

Codex:
```sh
codex mcp add bckgrnd-msc -- pnpm dlx bckgrnd-msc-mcp@0.3.1
```

Other clients: command `pnpm`, arguments `dlx`, `bckgrnd-msc-mcp@0.3.1`.
Run `pnpm dlx bckgrnd-msc-mcp@0.3.1 --check`, or call `bckgrnd_check_setup`,
when setup is new or a dependency fails. It tests Node, ffmpeg/ffprobe, output
access and a real engine render, and provides fixes without changing settings.

If ffmpeg is missing: macOS `brew install ffmpeg`, Debian/Ubuntu
`sudo apt install ffmpeg`, Windows `winget install Gyan.FFmpeg`.

Chris Lane Jones maintains the [source](https://github.com/chrislanejones/bckgrnd-msc-mcp)
and [package](https://www.npmjs.com/package/bckgrnd-msc-mcp/v/0.3.1).
The version pin selects the release, not a security certification. Local audio
processing does not upload narration to the hosted service; the AI client's
handling of files and conversation data is separate.

If the user has already connected a remote bckgrnd-msc server and chooses to
upload their selected narration to it, read
[references/hosted.md](references/hosted.md). Never add or switch to a remote
server yourself, including when local setup fails. Follow the connected tool
schemas: older servers may lack the new tools or options.

## Choose music and preview it

1. Read available narration text or the user's description; do not pretend to
   know the recording's contents when you have not heard or transcribed it.
2. Call `bckgrnd_list_tracks` for valid ids, moods and energy.
3. When a user has not settled on music for a longer recording, offer two short
   previews before exporting the full file. Skip comparison when they already
   chose a track, ask you to choose, or explicitly want a direct export.
4. Call `bckgrnd_preview_tracks` with an absolute `voice_path`. Omit `tracks`
   for two recommendations and set `content` to `narration`, `tutorial`,
   `story`, `tech`, `news` or `hype`. Or pass 1–3 selected track ids.
   `seconds` defaults to 20 (15–30 allowed).
5. Omit `start_seconds` to select an audible section automatically; this detects
   audio activity, not words. Use an explicit start when the user names a part.
   Present the playable outputs and let the listener choose.
6. Each local preview returns `full_mix_arguments` for the original narration.
   Use those for the chosen track, with the requested output path or subsequent
   changes. Do not accidentally export the temporary excerpt as the full mix.

| Content | Good starting tracks | Stem cuts |
|---|---|---|
| Articles, tutorials, long explainers | rain, study, porch | lead |
| Stories and personal essays | tape, nightbus | lead |
| Food, travel and interviews | kettle | none |
| Tech, science and analysis | drive, glass | lead |
| News, updates and demos | warehouse, basement, tunnel | lead, arp |
| Sports and light commentary | southside, pirate | lead |
| Fast recaps | lowtide, slipstream | lead, hats |
| Trailers and gaming | bricks, ravetape, acid | none |

For recordings over ten minutes, favor energy 1–2. Under dense speech, cut the
lead melody. For sad or sensitive material, consider no music or very quiet Rain
with `cut: ["kick", "clap", "lead"]`; ask if the listener's preference is unclear.

## Levels, ducking and arrangement

| Situation | `music_db` |
|---|---|
| Dense or technical speech | -18 to -22 |
| Ordinary narration | -14 |
| Light content with prominent music | -10 to -12 |

`loudness_lufs` sets the voice's level (default -16), while `music_db` puts the
music that many LU below it. Both are based on measured input loudness.

Keep `duck: true` unless a steady music bed is requested. Choose `ducking`:
- `subtle`: gentle reduction and slower recovery for a smooth background.
- `normal`: the original defaults.
- `strong`: deeper reduction to give speech more space.

For a longer synthesized bed, offer `arrangement: "evolving"`. It gradually
changes instrument levels over successive 16-bar phrases while respecting
`cut`. `arrangement: "loop"` preserves the original repeating arrangement.
Evolving arrangements do not apply to a user's custom `music_path`.

When a user requests a finished loudness target, set `final_lufs` and optionally
`true_peak_dbfs` (default -1.5). This masters the complete export, separately
from the voice target. Report the measured `output_lufs`,
`output_true_peak_dbfs` and `mastering_target_met`; do not claim a target was
met when the returned flag is false. These are user-selected targets, not a
promise of platform certification.

## Export audio or video

For audio, call `bckgrnd_mix_under_voice`. Give a `voice_path` and either `track`
or the user's `music_path`. The server renders music to the required length;
do not render a separate bed first. Default audio output is
`<voice>.with-<track>.mp3`; choose an absolute `.mp3` or `.wav` `output_path`.
Audio defaults to a two-second lead-in and a three-second tail.

For an actual video deliverable, use local `bckgrnd_mix_video` with `video_path`.
It exports MP4, copies the picture without re-encoding and preserves narration
synchronization. It ignores a preset's lead-in and tail to retain video timing.
It mixes the first source audio stream, including any music already in it; it
does not separate voices from existing music. Supported copied video codecs
are H.264, HEVC, AV1 and MPEG-4. The output contains one picture and one mixed
audio stream. Report unsupported inputs rather than promising arbitrary video
conversion. Videos without narration need a different workflow.

Local exports are limited to one hour. Existing outputs require
`overwrite: true`; choose a new path unless replacing the previous result is
part of the user's request. Input files cannot be overwritten.

Use `bckgrnd_render_track` only when the user wants standalone music.

## Cut to the beat

When the user wants to cut video, time captions or animate to the music, call
`bckgrnd_beat_map` with the same `track` and the render's `seconds` (or the
mix's `total_seconds`). The music starts at 0:00 in every result, so leave
`offset_seconds` at 0 unless the user places the music later on their own
timeline. Use its times as given. Don't work beats out from the bpm: the
rendered tempo is a touch slower, and the difference reaches a quarter of a
second over an hour. Beat 1 of each bar is the downbeat, the natural place for
a cut. Pass a `.csv` or `.json` `output_path` when an editor or script will
read the list.

## Favorite settings

When asked to remember a preferred mix, use local `bckgrnd_presets`:
- `action: "save"`, a lowercase hyphenated `name`, and `settings` containing
  the chosen track, levels, ducking, cuts, arrangement and intro/outro/mastering.
- `action: "list"` or `"get"` to find existing settings.
- Pass `preset: "my-podcast"` to audio, preview or video tools. Explicit
  arguments override saved values. Video always retains its original timing.
- Replacing a saved preset requires `overwrite: true`; delete only when asked.

Presets are local files. They do not store narration or output paths and are
not available on the public hosted server. Do not save preferences implicitly
just because a listener accepted one mix.

## Adjust and deliver

| Listener feedback | Adjustment |
|---|---|
| Music too loud / words unclear | decrease `music_db` by 4 |
| Music too quiet | increase `music_db` by 4 |
| Melody distracting | cut lead, then arp |
| Music swells between phrases | try subtle ducking; disable duck only for a steady bed |
| Too busy | lower energy or cut hats/clap |
| Whole export too quiet | raise requested voice or final loudness target by 2 |

Stay within tool ranges. Reuse the previous output with `overwrite: true` when
the user asks to replace that mix. Deliver the playable file or video, track,
brief reason, music level and measured export loudness. Mention an unmet
mastering target when applicable.
