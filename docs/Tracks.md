# Tracks

Eighteen tracks from [bckgrnd-msc](https://github.com/chrislanejones/bckgrnd-msc),
in three sections. Each one is a 16-bar song in four parts (Intro, Groove, Break,
Drop) that loops for as long as you ask.

## The library

| Section | Style | Tracks | bpm | Energy | Mood |
|---|---|---|---|---|---|
| Lofi | Chillhop | Rain, Study, Porch | 76–92 | 1 | relaxed, unhurried |
| Lofi | Dusty | Tape, Nightbus | 80–88 | 1 | warm, nostalgic |
| Lofi | Jazz | Kettle | 78 | 1 | cozy, jazzy |
| EDM | Deep | Night Drive, Glass | 110–116 | 2 | moody, late-night |
| EDM | House | Warehouse, Basement, Tunnel | 122–128 | 3 | upbeat, steady |
| EDM | Acid | Acid Line | 134 | 4 | intense, squelchy |
| Breaks | Garage | Southside, Pirate | 132–134 | 3 | bouncy, swung |
| Breaks | Breakbeat | Bricks, Rave Tape | 130–136 | 4 | energetic, rave |
| Breaks | Liquid DnB | Lowtide, Slipstream | 172–174 | 3 | fast but smooth |

Energy runs 1 (barely there) to 5 (wants your attention). Anything at 3 or above
competes with dense speech.

## The stems

Every track has the same eight.

| Stem | What it is | Under a voice |
|---|---|---|
| `kick` | The pulse | Fine, keeps time |
| `clap` | Backbeat | Fine. Cut it for a softer bed |
| `hats` | The top | Fine. Cut it if the bed feels busy |
| `bass` | Low end | Sits under a voice well |
| `stab` | Chords | Usually fine |
| `lead` | The hook | **Cut it.** A melody fights words |
| `pad` | The bed | Sits under a voice best |
| `arp` | Glitter | Cut it if the lead's gone and it's still busy |

## Matching music to content

| Content | Track | Cut |
|---|---|---|
| Long articles, explainers, how-tos | Rain, Study, Porch | `lead` |
| Stories, history, personal essays | Tape, Nightbus | `lead` |
| Food, travel, culture, interviews | Kettle | nothing |
| Tech, science, analysis | Night Drive, Glass | `lead` |
| News roundups, changelogs, demos | Warehouse, Basement, Tunnel | `lead`, `arp` |
| Sports, pop culture, light takes | Southside, Pirate | `lead` |
| Recaps, fast explainers | Lowtide, Slipstream | `lead`, `hats` |
| Trailers, hype, gaming | Bricks, Rave Tape, Acid Line | nothing |

The longer the listen, the lower the energy. Anything over ten minutes should be
energy 1 or 2, whatever the topic.

## Where the moods come from

They're a first pass, set per style from the style and the tempo, not from
listening to each track under narration. They live in
[src/moods.ts](../src/moods.ts), and they'll move as I listen to more narration
over them.
