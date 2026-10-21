# Tools

Four local tools. The hosted server exposes the first three with upload/audio schemas; see [Vercel hosting](Vercel.md). All paths are absolute. The server is started from a folder nobody
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
| `fade_in_seconds` | 0 to 30 | `1` | Fade-in |
| `fade_out_seconds` | 0 to 60 | `4` | Fade-out |
| `output_path` | string | temp file | Must end in `.wav` |
| `overwrite` | boolean | `false` | Replace `output_path` if it exists |

Returns `{ path, track, bpm, seconds, sample_rate, cut, peak_dbfs, render_ms }`.

Without an `output_path`, a unique UUID is appended to the filename in
`BCKGRND_MSC_OUT_DIR`. Repeated and concurrent renders preserve earlier files.
All exports are written to a temporary sibling and published atomically only
after success. Cancellation or encoding errors preserve an existing output.

## `bckgrnd_mix_under_voice`

A voice recording plus music to one file. The music starts a little before the
voice, dips while the voice is talking, and fades out after it. Needs ffmpeg.

Give exactly one of `track` or `music_path`.

| Argument | Type | Default | What it does |
|---|---|---|---|
| `voice_path` | string | required | The narration. Anything ffmpeg reads: MP3, WAV, M4A |
| `track` | string | | A bckgrnd-msc track. Rendered to the right length for you |
| `music_path` | string | | Your own music file instead. Loops if it's shorter than the voice |
| `music_db` | -40 to 0 | `-14` | Music loudness relative to the voice, in LU |
| `loudness_lufs` | -30 to -9 | `-16` | Loudness of the voice in the result |
| `duck` | boolean | `true` | Dip the music further while the voice talks |
| `cut` | stem list | none | Stems to silence (only with `track`) |
| `lead_in_seconds` | 0 to 30 | `2` | Music before the voice starts |
| `tail_seconds` | 0 to 30 | `3` | Music after the voice ends, fading out |
| `output_path` | string | next to the voice | Must end in `.mp3` or `.wav` |
| `overwrite` | boolean | `false` | Replace `output_path` if it exists |

Returns `{ path, voice_seconds, total_seconds, music, music_db, loudness_lufs, voice_lufs, music_lufs, voice_gain_db, music_gain_db, duck, output_lufs, output_true_peak_dbfs }`.

The default output is `<voice name>.with-<track>.mp3` in the voice file's folder.
`voice_lufs` and `music_lufs` are what was measured before anything was turned up
or down. [Levels](Levels.md) covers what the numbers mean.

## `bckgrnd_preview_tracks` (local)

Compare one to three tracks under the same excerpt. Arguments: absolute
`voice_path`, `tracks` (1–3 ids), `seconds` (15–30, default 20),
`start_seconds` (default 0), optional `cut`, `music_db` (default -14), and
`loudness_lufs` (default -16). If less narration remains, the excerpt is shorter.
Each preview has no lead-in and a one-second tail. Returns `{ previews,
start_seconds }`; each preview contains the mix metadata, path and measurements.
Files land in a unique `previews-*` folder under `BCKGRND_MSC_OUT_DIR`.

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
