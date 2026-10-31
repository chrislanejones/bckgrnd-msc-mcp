# Preview, save and export

These examples are MCP tool arguments. All local paths must be absolute.

## Compare before exporting

Call `bckgrnd_preview_tracks`:

```json
{
  "voice_path": "/recordings/tutorial.wav",
  "content": "tutorial",
  "seconds": 20,
  "ducking": "subtle",
  "cut": ["lead"]
}
```

Omitting `tracks` selects two recommendations. Content choices are `narration`,
`tutorial`, `story`, `tech`, `news` and `hype`; recordings longer than ten minutes
get low-energy recommendations. Omit `start_seconds` to select a window with
substantial audible activity, or supply it to audition a specific section.
Activity detection is not speech recognition and can include existing music.

Each preview returns a playable MP3 and `full_mix_arguments` referencing the
original recording. After choosing a track, pass those arguments to
`bckgrnd_mix_under_voice`, optionally setting an output path. Preview-specific
intro/tail settings are not carried into the full export.

## Remember favorites

Call `bckgrnd_presets`:

```json
{
  "action": "save",
  "name": "my-podcast",
  "settings": {
    "track": "study",
    "music_db": -18,
    "ducking": "subtle",
    "cut": ["lead"],
    "arrangement": "evolving",
    "lead_in_seconds": 2,
    "tail_seconds": 3,
    "final_lufs": -18,
    "true_peak_dbfs": -2
  }
}
```

Then mix with:

```json
{
  "voice_path": "/recordings/episode.wav",
  "preset": "my-podcast",
  "output_path": "/recordings/episode-finished.mp3"
}
```

Explicit values override saved settings, including zero and `false`. Supplying
`music_path` overrides a saved track; select `arrangement: "loop"` when using
custom music. Use `action: "list"`, `"get"` or `"delete"` to manage presets.
Names accept 1–64 lowercase letters, digits or hyphens; replacements require
`overwrite: true`. Storage is `${BCKGRND_MSC_CONFIG_DIR}/presets`, defaulting to
`~/.config/bckgrnd-msc/presets`. Each preset is a separate atomic JSON file.

## Export a synchronized video

Call `bckgrnd_mix_video`:

```json
{
  "video_path": "/recordings/demo.mp4",
  "preset": "my-podcast",
  "output_path": "/recordings/demo-finished.mp4"
}
```

The first non-cover video stream is copied without re-encoding. The first audio
stream is mixed with music, keeping its offset relative to the video. Video
length is retained; preset lead-in/tail settings are ignored. Supported copied
codecs are H.264, HEVC, AV1 and MPEG-4; MP4 is the output container. A video with
no audio is rejected. Existing source music is part of the narration input;
this tool does not separate voices from music. The output contains one video
and one AAC audio stream, with source metadata.

## Set the finished loudness

Set `final_lufs` to a requested overall loudness and `true_peak_dbfs` to a peak
ceiling. This is different from `loudness_lufs`, which sets the voice before
mixing. Read `output_lufs`, `output_true_peak_dbfs` and `mastering_target_met`
from the finished export. See [Levels](Levels.md) for tolerances and ducking.

## Check setup

```sh
pnpm dlx https://github.com/chrislanejones/bckgrnd-msc-mcp/releases/download/v0.3.0/bckgrnd-msc-mcp-0.3.0.tgz --check
```

The equivalent MCP tool is `bckgrnd_check_setup`. Both test installed binaries,
output-folder access and the actual WASM engine. Diagnostics print Claude and
Codex connection commands without editing client configuration.
