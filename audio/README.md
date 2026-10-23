# Natural-voice audio (generated)

- `clips.json` – generated map from spoken text to clip file. Keys are normalised text
  (`Speech.clipKey`: lower case, punctuation removed). `letters` maps `letters/<l>` to the
  letter-sound clips, `fixed` lists keys that always play at natural length (the sound hints
  like "sss", "tuh" used in blending), `slow` holds slow versions of the Level 2 words,
  `files` is the full list the service worker caches for offline use.
- `af_heart/t/`, `af_heart/slow/` – MP3 clips (mono, 24 kHz, 48 kbps),
  made with Kokoro-82M voice af_heart (Apache-2.0) by `tools/audio/build_audio.py`.
- `human/letters/` – the 26 letter sounds, cut from real human recordings on Wikimedia
  Commons (CC BY-SA 3.0 / public domain; see `LICENSES.md` and
  `tools/audio/human-sounds-sources.md`), same format.
  File names contain a content hash, so a changed clip always gets a new name.

Do not edit by hand – re-run `tools/audio/build_audio.py` (see the main README).

## Replacing a letter sound with a real recording
Put the original recording in `tools/audio/human/`, add its license/source to
`human/sources.json`, `human-sounds-sources.md` and `LICENSES.md`, and add or edit the
cut in `RECIPES` in `tools/audio/human.py`; then re-run `build_audio.py`. Letters missing from
`RECIPES` fall back to sounds cut from Kokoro words (`phonics.py`). Only use recordings
with a license that allows it (CC0 / PD / CC BY / CC BY-SA).
