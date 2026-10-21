# bckgrnd-msc-mcp

An MCP server that puts music under a voice. Hand it a narration MP3 and a track
name, and it renders the music to the right length, sets it under the voice by
measured loudness, dips it while the voice talks, and hands back one file.

The music comes from [bckgrnd-msc](https://github.com/chrislanejones/bckgrnd-msc), a
stem machine: eighteen tracks, eight stems each, synthesized live by a Rust engine.
This server runs that same engine, compiled to WebAssembly, in Node. No samples, no
streaming service, no licensing questions. The music is made on your machine when
you ask for it.

## Quick start

```sh
claude mcp add bckgrnd-msc -- npx -y bckgrnd-msc-mcp
```

Any other MCP client: run `npx -y bckgrnd-msc-mcp` as a stdio server. It needs
Node 20 or newer. Mixing under a voice also needs ffmpeg.

| System | ffmpeg |
|---|---|
| macOS | `brew install ffmpeg` |
| Debian / Ubuntu | `sudo apt install ffmpeg` |
| Windows | `winget install Gyan.FFmpeg` |

Then ask for it in plain words: "put Rain under `~/notes/article.mp3`."

## The skill

The server does the work. The skill teaches an agent the taste: which track suits
which content, where to set the level, and what to change when the listener says
"I can't hear the words."

```sh
npx skills add chrislanejones/bckgrnd-msc-mcp
```

It's in [skills/bckgrnd-music/SKILL.md](skills/bckgrnd-music/SKILL.md).

## Tools

| Tool | What it does |
|---|---|
| `bckgrnd_list_tracks` | The eighteen tracks, with bpm, mood, energy (1 to 5) and what each one suits |
| `bckgrnd_render_track` | One track to a 48 kHz stereo WAV of any length, up to an hour. Cut any stems, set the fades |
| `bckgrnd_mix_under_voice` | A voice file plus a track, or your own music file, to one MP3 or WAV |

## How the level is set

Every voice file comes in at a different volume. A fixed "music at -16 dB" is too loud
under a quiet text-to-speech file and too quiet under a hot podcast take. So nothing
here is fixed.

1. Both files are measured in LUFS, the loudness scale podcasts and streaming services
   use.
2. The voice is turned up or down to `loudness_lufs` (default **-16**, the usual
   spoken-word level).
3. The music is set `music_db` under the voice (default **-14 LU**).
4. The voice drives a compressor on the music, so the music dips while someone is
   talking and comes back between paragraphs.

A quiet voice and a loud voice through the same settings come out at the same
loudness, with the same balance. The tests check that.

## The tracks

| Section | Style | Tracks | bpm | Energy |
|---|---|---|---|---|
| Lofi | Chillhop | Rain, Study, Porch | 76–92 | 1 |
| Lofi | Dusty | Tape, Nightbus | 80–88 | 1 |
| Lofi | Jazz | Kettle | 78 | 1 |
| EDM | Deep | Night Drive, Glass | 110–116 | 2 |
| EDM | House | Warehouse, Basement, Tunnel | 122–128 | 3 |
| EDM | Acid | Acid Line | 134 | 4 |
| Breaks | Garage | Southside, Pirate | 132–134 | 3 |
| Breaks | Breakbeat | Bricks, Rave Tape | 130–136 | 4 |
| Breaks | Liquid DnB | Lowtide, Slipstream | 172–174 | 3 |

The stems are kick, clap, hats, bass, stab, lead, pad and arp. Under speech, cut the
lead. A melody fights words.

The moods and energy ratings are a first pass, set by style and tempo. They live in
[src/moods.ts](src/moods.ts) and they'll move as I listen to more narration over them.

## Speed

Rendering runs about twenty times faster than real time. Seven minutes of music takes
about eighteen seconds on a laptop.

## Updating the engine

The engine and the track library are copied in from a built bckgrnd-msc checkout.
This repo never builds Rust.

```sh
cd ../bckgrnd-msc && pnpm run build:engine
cd ../bckgrnd-msc-mcp && pnpm run sync-engine ../bckgrnd-msc
```

`vendor/SOURCE.json` records which bckgrnd-msc commit the copy came from.

## Development

```sh
pnpm install
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
```

The tests run the real server in memory, render real audio and, when ffmpeg is
installed, mix real files.

## License

MIT
