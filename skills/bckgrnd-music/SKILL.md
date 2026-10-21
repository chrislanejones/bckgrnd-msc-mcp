---
name: bckgrnd-music
description: Put background music under narration, podcasts, screen recordings or any audio, using the bckgrnd-msc MCP server. Picks a track that fits the content, sets the music level against the voice by measured loudness, and dips it while the voice talks. Use for "add music under this", "put a beat behind this narration", "make this MP3 less dry", "background music for this video", or after a text-to-speech step when the listener wants music under the reading.
---

# bckgrnd-music: music under a voice

The bckgrnd-msc MCP server renders eighteen synthesized tracks (house, deep,
acid, lofi, garage, breakbeat, liquid drum & bass) to audio files of any length,
and lays them under a voice. You pick the track and the level; the server does
the measuring.

## Setup

The server needs Node 20+ and, for mixing, ffmpeg.

```sh
claude mcp add bckgrnd-msc -- npx -y bckgrnd-msc-mcp
```

Other clients: run `npx -y bckgrnd-msc-mcp` as a stdio server.

If a tool says ffmpeg is missing, give the user the install line for their
system and stop. Don't switch tools.

| System | Install |
|---|---|
| macOS | `brew install ffmpeg` |
| Debian / Ubuntu | `sudo apt install ffmpeg` |
| Windows | `winget install Gyan.FFmpeg` |

## The tools

When connected to the hosted Vercel server, follow its tool schemas: clips are
limited to 120 seconds including lead-in/tail, narration uses `voice_base64`
and `voice_format` (2 MiB maximum), and results contain embedded MP3 audio.
Read and encode the actual file using available file tools; never invent bytes.
Save or present the returned audio if the client supports it. If the client
cannot upload/save audio, or the request exceeds these limits, explain that the
local stdio server is required. Hosted calls do not accept filesystem paths,
custom music files or overwrite options. The examples below describe local use.

| Tool | What it does |
|---|---|
| `bckgrnd_list_tracks` | Every track with bpm, mood, energy (1-5) and what it suits. Filter with `section` or `max_energy` |
| `bckgrnd_render_track` | One track to a WAV of any length, with stems cut and fades |
| `bckgrnd_mix_under_voice` | A voice file plus a track (or the user's own music) to one MP3 or WAV, levels matched |

For music under a voice, use `bckgrnd_mix_under_voice` with `track`. It renders
the right length itself. Only reach for `bckgrnd_render_track` when the user
wants the music on its own.

## Step 1: pick music for the content

Read or skim what the voice is saying first. Then call `bckgrnd_list_tracks`
and match on `good_for` and `energy`. The rules of thumb:

| Content | Track | Energy | Cut |
|---|---|---|---|
| Long articles, explainers, how-tos | Rain, Study, Porch (Chillhop) | 1 | `lead` |
| Stories, history, personal essays | Tape, Nightbus (Dusty) | 1 | `lead` |
| Food, travel, culture, interviews | Kettle (Jazz) | 1 | nothing |
| Tech, science, analysis | Night Drive, Glass (Deep) | 2 | `lead` |
| News roundups, changelogs, demos | Warehouse, Basement, Tunnel (House) | 3 | `lead`, `arp` |
| Sports, pop culture, light takes | Southside, Pirate (Garage) | 3 | `lead` |
| Recaps, fast explainers | Lowtide, Slipstream (Liquid DnB) | 3 | `lead`, `hats` |
| Trailers, hype, gaming | Bricks, Rave Tape, Acid Line | 4 | nothing |

- **The longer the listen, the lower the energy.** Anything over ten minutes
  should be energy 1 or 2, whatever the topic.
- **Cut the `lead` under dense speech.** It's the hook melody, and a melody
  competes with words. `pad` and `bass` are the stems that sit under a voice
  best.
- **Sad, serious or sensitive content** (loss, hard news) gets no
  music, or Rain with `cut: ["kick", "clap", "lead"]` at `music_db: -22`. Ask
  first if you're unsure.
- If the user names a track or a mood, that wins over this table.

## Step 2: set the level

Levels are measured. The server measures the voice and the music in LUFS,
brings the voice to `loudness_lufs`, and puts the music `music_db` LU under the
voice. The same numbers give the same balance whether the voice file came in
quiet or loud, so pick by content, not by the file.

| Situation | `music_db` |
|---|---|
| Dense, technical or fast reading | `-18` to `-22` |
| Normal articles and narration (default) | `-14` |
| Light content where the music is part of the feel | `-10` to `-12` |
| Intro or outro with little talking | `-6` to `-8` |

| Where it's going | `loudness_lufs` |
|---|---|
| Podcasts, spoken word, most players (default) | `-16` |
| Phone speakers, noisy places | `-14` |
| Quiet listening, or matching a library mastered quieter | `-19` |

Leave `duck: true` (the default). It turns the music down further while the
voice talks and lets it come back between paragraphs. Turn it off only when
the user wants a steady bed.

## Step 3: mix

```json
{
  "voice_path": "/abs/path/article.mp3",
  "track": "study",
  "cut": ["lead"],
  "music_db": -14
}
```

The result lands next to the voice as `<voice>.with-<track>.mp3` unless you
give `output_path`. Paths must be absolute. Existing files are never replaced
unless you pass `overwrite: true`.

Report back in a short table: track, why it fits, `music_db`, the measured
`voice_lufs`, and the output path.

## Step 4: adjust by ear

The user's ear outranks every number here. Map what they say to one change:

| They say | Change |
|---|---|
| "Can't hear the words" / "music's too loud" | `music_db` down 4 |
| "Can't hear the music" | `music_db` up 4 |
| "The melody's distracting" | add `lead` (then `arp`) to `cut` |
| "Too busy" / "too much going on" | lower energy track, or cut `hats` and `clap` |
| "Too sleepy" | one energy step up |
| "The whole thing's too quiet" | `loudness_lufs` up 2 |

Re-run with `overwrite: true` and the same `output_path`.
