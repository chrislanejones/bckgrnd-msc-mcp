# Tools

Eight local tools. The hosted server exposes list, render, mix, preview and beat map with upload/audio schemas; see [Vercel hosting](Vercel.md). All paths are absolute. The server is started from a folder nobody
picked, so a relative path would land somewhere surprising, and it refuses them
instead. No tool replaces an existing file unless you pass `overwrite: true`.

## `bckgrnd_list_tracks`

The eighteen tracks with tempo, mood, energy and what each one suits. Read-only.

| Argument | Type | Default | What it does |
|---|---|---|---|
| `section` | `EDM`, `Lofi` or `Breaks` | all | Only list one section |
| `max_energy` | 1 to 5 | all | Only list tracks at or below this energy |

Returns `{ tracks: [{ id, name, section, style, bpm, kind, mood, energy, good_for }], stems }`.

## `bckgrnd_render_track`

One track to a 48 kHz, 16-bit stereo WAV. The 16-bar song loops until the time is
up, then fades out.

| Argument | Type | Default | What it does |
|---|---|---|---|
| `track` | string | required | Track id or name, any case: `rain`, `Night Drive` |
| `seconds` | 1 to 3600 | required | Length |
| `cut` | stem list | none | Stems to silence for the whole take, e.g. `["kick", "clap"]` |
| `arrangement` | `loop`, `evolving` | `loop` | Original repetition or gradual stem-level variation |
| `fade_in_seconds` | 0 to 30 | `1` | Fade-in |
| `fade_out_seconds` | 0 to 60 | `4` | Fade-out |
| `output_path` | string | temp file | Must end in `.wav` |
| `overwrite` | boolean | `false` | Replace `output_path` if it exists |

Returns `{ path, track, bpm, seconds, sample_rate, cut, peak_dbfs, render_ms, arrangement }`.

Without an `output_path`, a unique UUID is appended to the filename in
`BCKGRND_MSC_OUT_DIR`. Repeated and concurrent renders preserve earlier files.
All exports are written to a temporary sibling and published atomically only
after success. Cancellation or encoding errors preserve an existing output.

## `bckgrnd_mix_under_voice`

A voice recording plus music to one file. The music starts a little before the
voice, dips while the voice is talking, and fades out after it. Needs ffmpeg.

Give exactly one of `track` or `music_path`, directly or through a saved preset. Explicit values override preset settings; an explicit music_path replaces a saved track.

| Argument | Type | Default | What it does |
|---|---|---|---|
| `voice_path` | string | required | The narration. Anything ffmpeg reads: MP3, WAV, M4A |
| `track` | string | | A bckgrnd-msc track. Rendered to the right length for you |
| `music_path` | string | | Your own music file instead. Loops if it's shorter than the voice |
| `music_db` | -40 to 0 | `-14` | Music loudness relative to the voice, in LU |
| `loudness_lufs` | -30 to -9 | `-16` | Loudness of the voice in the result |
| `preset` | string | | Saved local mix settings |
| `ducking` | `subtle`, `normal`, `strong` | `normal` | Strength and recovery of ducking |
| `arrangement` | `loop`, `evolving` | `loop` | Gradual variation for synthesized tracks |
| `final_lufs` | -30 to -9 | off | Optional loudness target for the complete export |
| `true_peak_dbfs` | -9 to -0.5 | -1.5 | Peak ceiling; requires final_lufs |
| `duck` | boolean | `true` | Dip the music further while the voice talks |
| `cut` | stem list | none | Stems to silence (only with `track`) |
| `lead_in_seconds` | 0 to 30 | `2` | Music before the voice starts |
| `tail_seconds` | 0 to 30 | `3` | Music after the voice ends, fading out |
| `output_path` | string | next to the voice | Must end in `.mp3` or `.wav` |
| `overwrite` | boolean | `false` | Replace `output_path` if it exists |

Returns `{ path, voice_seconds, total_seconds, music, music_db, loudness_lufs, voice_lufs, music_lufs, voice_gain_db, music_gain_db, duck, ducking, arrangement, cut, lead_in_seconds, tail_seconds, output_lufs, output_true_peak_dbfs }`. When applicable, also returns `preset`, `final_lufs`, `true_peak_dbfs` and `mastering_target_met`.

The default output is `<voice name>.with-<track>.mp3` in the voice file's folder.
`voice_lufs` and `music_lufs` are what was measured before anything was turned up
or down. [Levels](Levels.md) covers what the numbers mean.

## `bckgrnd_preview_tracks`

Compare one to three tracks on the same excerpt. Local arguments: absolute
`voice_path`, optional `tracks` (1–3 ids), `content` (`narration`, `tutorial`,
`story`, `tech`, `news`, `hype`; default narration), `seconds` (15–30, default 20),
optional `start_seconds`, `preset`, and mix settings for levels, cuts, ducking,
arrangement and mastering. Omitting tracks recommends two; omitting the start
selects a window with substantial audible activity. This is not transcription.

Each preview has no lead-in and a one-second tail. Returns `{ previews,
start_seconds, excerpt_seconds, selection }`. Each local preview includes mix
metadata, `track`, a playable path and `full_mix_arguments` for the original
recording. Files land in a unique previews folder under `BCKGRND_MSC_OUT_DIR`.
The narration may be at most one hour. Explicit starts past its end are rejected.

Hosted previews accept `voice_base64`/`voice_format`, not paths or presets, and
return labeled MP3 audio with measurements. See [Vercel hosting](Vercel.md).

## `bckgrnd_presets` (local)

`action`: `list`, `get`, `save`, or `delete`. `name` is required except for list;
use 1–64 lowercase letters, digits and hyphens. Save accepts a `settings` object
with track, levels, cuts, ducking, arrangement, intro/tail and mastering options.
Unknown fields and media paths are rejected. Existing names require
`overwrite: true`. List returns `{ presets: string[] }`; get/save return
`{ name, settings }`; delete returns `{ name, deleted: true }`.

Files live in `~/.config/bckgrnd-msc/presets` or below the absolute
`BCKGRND_MSC_CONFIG_DIR`. Files are published atomically. Callers must explicitly
request save/delete; ordinary rendering never persists preferences.

## `bckgrnd_mix_video` (local)

Required `video_path`: an existing absolute input path. Accepts the audio mix
settings, `preset`, `track` or `music_path`, and optional absolute `.mp4`
`output_path` and `overwrite`. Intro/tail arguments are not exposed; saved
intro/tail values are ignored to retain the source video timing.

Defaults to `<video>.with-music.mp4`. Copies the first non-cover H.264, HEVC, AV1
or MPEG-4 video stream, mixes the first audio stream and encodes AAC. Requires
both video and audible audio, with duration at most one hour. Input paths cannot
be overwritten. The output contains one video and one audio stream. Source
music, if any, remains part of the input; no vocal separation is performed.
Returns audio mix metadata plus `video_codec`, `video_copied: true` and
`audio_offset_seconds`. Final loudness is measured from the actual MP4.

## `bckgrnd_check_setup` (local)

No arguments. Checks Node, ffmpeg/ffprobe, writable output storage and a real
short WASM render, removing its temporary files. Returns `{ ok, checks,
connections }` with specific diagnostic messages and installation commands.
The CLI exposes the same check as `--check` or `doctor`, returning exit 0 when
all checks pass and 1 otherwise. It never modifies client configuration.

## `bckgrnd_beat_map`

The exact time of every beat and bar in a track, for cutting video, timing
captions or placing animation on the beat. Nothing is rendered, so it answers
right away.

The times come from the engine, not from the bpm. The engine starts every
sixteenth on a whole sample, so a bar runs a few samples longer than the bpm
says: Rain's bar is 137,152 samples, not 137,142.86. That's nothing in one bar
and about a quarter of a second after an hour, which is a missed cut. The map
matches the WAV to the sample at any length.

The music starts at 0:00 in `bckgrnd_render_track` files and in both mix
results; the lead-in only delays the voice. So pass the render's `seconds` or
the mix's `total_seconds` and leave `offset_seconds` at 0.

| Argument | Type | Default | What it does |
|---|---|---|---|
| `track` | string | required | Track id or name |
| `seconds` | 1 to 3600 | required | Length of the music |
| `offset_seconds` | 0 to 3600 | `0` | Added to every time, for music placed later on your timeline |
| `output_path` | string | none | Save every beat; must end in `.csv` (`time,bar,beat`) or `.json` (local) |
| `overwrite` | boolean | `false` | Replace `output_path` if it exists (local) |

Returns `{ track, bpm, measured_bpm, sample_rate, beats_per_bar, beat_seconds,
bar_seconds, beat_samples, bar_samples, seconds, offset_seconds, beat_count,
bar_count, beats: [{ time, bar, beat }], path? }`. Bars and beats count from 1;
beat 1 is the downbeat. Times have six decimals, finer than one sample.

Up to 1,000 beats come back inline. A longer list is saved as CSV in
`BCKGRND_MSC_OUT_DIR` and only its `path` comes back. The hosted tool has no
files, so past 1,000 beats it returns the grid alone: beat n starts at
`offset_seconds + n * beat_samples / sample_rate`, exactly.

## Progress and cancellation

Local calls support MCP progress notifications when the caller supplies a
progress token, and MCP cancellation stops rendering and ffmpeg processes.
Individual ffmpeg/ffprobe processes have a two-minute timeout. Hosted audio jobs
have a 45-second processing deadline within the 60-second Vercel function limit;
stateless HTTP cancellation across separate requests is not supported.

## Errors

Errors come back as tool errors with the fix in the message.

| Message starts with | Cause | Fix |
|---|---|---|
| `No track called` | Wrong track name | The message lists the real ids |
| `output_path must be absolute` | Relative path | Give a full path |
| `... already exists` | The file is there | `overwrite: true`, or a new path |
| `"ffmpeg" isn't installed` | No ffmpeg on `PATH` | The message has the install line |
| `Give exactly one of track or music_path` | Both or neither | Pick one |
| `... is silent` | The voice file has no sound | Check the file |

## Saved projects (0.4.0-rc.1 candidate, local)

`bckgrnd_validate_project({project_path})` validates an absolute snapshot file,
source library hash, schema versions and the complete bundled renderer. It returns
identity/revision, renderer/build/app commit, resolved-event/source/content hashes,
name and warnings. It never changes the file.

`bckgrnd_render_project` accepts `project_path`, required `seconds` (0–600),
`start_seconds` (0–600), `fade_in_seconds` (default 0), `fade_out_seconds` (0.02),
`tail_seconds` (0–30), `sample_rate` (44100 or 48000, default 48000), optional
`output_path` and `overwrite` (false). Fades must fit within the musical range.
Output is atomic PCM16 stereo WAV; cancellation publishes no partial file. Results
include path, revision/build identity, frames, duration, peak/RMS and render time.
Malformed patterns, unknown formats/versions and missing dependencies fail first.

Accepted notes/mix/effects render exactly as saved. An explicitly empty lane stays
empty. Scenes are alternatives, not an automatic sequence. Transient performance
and unaccepted auditions are excluded. Kick tuning stays on the source root.

`bckgrnd_mix_under_voice` accepts exactly one source: `track`, `music_path` or
`project_path`. Project sources reject explicit cuts and evolving arrangements.
A named preset can supply voice loudness/ducking/mastering; inherited stock track,
cuts and arrangement are excluded for a project source. Music and voice processing
remain independent. Output reports the project identity alongside mix measurements.

`bckgrnd_presets` action `migrate` requires `name`, backs up the original as
`.original`, and creates a musical project sidecar. The preset's voice settings
remain untouched. Evolving arrangement settings are retained in the original and
reported as unconverted. Existing stock-track calls keep their prior behavior.
