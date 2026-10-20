# Natural-voice audio (generated)

- `clips.json` – generated map from spoken text to clip file. Keys are normalised text
  (`Speech.clipKey`: lower case, punctuation removed). `letters` maps `letters/<l>` to the
  letter-sound clips, `fixed` lists keys that always play at natural length (the sound hints
  like "sss", "tuh" used in blending), `slow` holds slow versions of the Level 2 words,
  `files` is the full list the service worker caches for offline use.
- `af_heart/t/`, `af_heart/slow/`, `af_heart/letters/` – MP3 clips (mono, 24 kHz, 48 kbps),
  made with Kokoro-82M voice af_heart (Apache-2.0) by `tools/audio/build_audio.py`.
  File names contain a content hash, so a changed clip always gets a new name.

Do not edit by hand – re-run `tools/audio/build_audio.py` (see the main README).

## Replacing a letter sound with a real recording
Record a short clip of just the sound (e.g. "sss", or the short "a" in *apple*), save it
as MP3 in `af_heart/letters/`, and point the matching `letters/<l>` entry (and the sound
hint key in `clips`, e.g. `"sss"`) in `clips.json` at it. Note: the next build run will
overwrite `clips.json`, so keep a note. Only use recordings you have the right to use.
