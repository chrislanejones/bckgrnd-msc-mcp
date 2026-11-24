# Speech fixture

`speech.wav` was synthesized locally with ffmpeg's Flite `slt` voice from:

> Clear narration should remain easy to understand while background music plays quietly.

It is 48 kHz stereo PCM with three seconds of silence appended. It contains no
recording of a real speaker. Tests use it to check music attenuation during
speech and recovery during pauses. Flite is needed only to regenerate it.

```sh
ffmpeg -f lavfi -i "flite=text='Clear narration should remain easy to understand while background music plays quietly.':voice=slt" -af apad=pad_dur=3 -ar 48000 -ac 2 -c:a pcm_s16le test/fixtures/speech.wav
```

# Project version fixtures

| File | What it is |
|---|---|
| `project-v3.bckgrnd.json` | A stored v3 snapshot (the Night 6 edited release fixture). Opens as v4, every scene `crash: false`. |
| `project-v4-crash.bckgrnd.json` | The same music saved as v4 with the Drop scene's crash on (revision 8). |
| `project-v5.bckgrnd.json` | The v4 file claiming version 5. Must be refused. |

They name the vendored warehouse track by content hash. After a sync that changes the
library, `node scripts/stamp-project-fixtures.mjs` re-stamps `source.sha256` and
nothing else (`pnpm run resync` does it for you).
