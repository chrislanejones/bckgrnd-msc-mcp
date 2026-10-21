# Speech fixture

`speech.wav` was synthesized locally with ffmpeg's Flite `slt` voice from:

> Clear narration should remain easy to understand while background music plays quietly.

It is 48 kHz stereo PCM with three seconds of silence appended. It contains no
recording of a real speaker. Tests use it to check music attenuation during
speech and recovery during pauses. Flite is needed only to regenerate it.

```sh
ffmpeg -f lavfi -i "flite=text='Clear narration should remain easy to understand while background music plays quietly.':voice=slt" -af apad=pad_dur=3 -ar 48000 -ac 2 -c:a pcm_s16le test/fixtures/speech.wav
```
