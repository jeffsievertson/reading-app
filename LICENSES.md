# Licenses and third-party content

## Summary
**No third-party code, libraries, fonts, images, or CDNs are shipped in this app.** The only third-party-derived content is audio: the generated voice clips (Apache-2.0 model) and the 26 Level 1 letter sounds, which are cut from human recordings on Wikimedia Commons (CC BY-SA 3.0 / public domain). See below.

| Item | Source | License |
|---|---|---|
| All HTML, CSS, JavaScript (`index.html`, `css/`, `js/`, `sw.js`, `manifest.json`) | Written for this project | Owner's choice (suggest MIT – see below) |
| App icons (`icons/icon.svg` and the PNGs rendered from it) | Drawn for this project (simple shapes) | Same as code |
| Signs, menu, and form graphics | Drawn with CSS in `css/styles.css`, no images | Same as code |
| Lesson word lists, sentences, sign/menu/form text | Written for this project (common English words) | Same as code |
| Bible verses (Level 4) | **King James Version** (Authorized Version, standard 1769 text) | **Public domain in the United States.** (In the UK the KJV is under perpetual Crown patent; this app is intended for US use.) No other translations are used. |
| Emoji (e.g. ☀️ 🍎 🔊) | Unicode characters drawn by the phone's own system emoji font; no emoji images are bundled | Not distributed by this app |
| Natural-voice audio clips (`audio/af_heart/`, `audio/clips.json`) | Generated for this project with the **Kokoro-82M** v1.0 text-to-speech model (by hexgrad, https://huggingface.co/hexgrad/Kokoro-82M), voice `af_heart`, run locally with **kokoro-onnx** | Kokoro-82M model and voices: **Apache License 2.0**. The audio is our own output of that model. (The letter sounds themselves are human recordings; see the next row.) |
| Level 1 letter sounds (`audio/human/letters/`, sources in `tools/audio/human/`) | Real human recordings from **Wikimedia Commons** by **Peter Isotalo** (B C D F G H K L M N P Q R S T V W X Y Z), **Denelson83** (A E I O U) and **Octane** (J). Full list in `tools/audio/human-sounds-sources.md` | **CC BY-SA 3.0** (Isotalo, Denelson83). **Public domain** (Octane). Our cut clips are shared under CC BY-SA 3.0. |
| Fallback voices / speech recognition | The phone's built-in Web Speech API (Apple/Google/OS voices) | Provided by the browser/OS; not distributed by this app |
| Word bank / streak / milestones (`js/rewards.js`) | Written for this project; no libraries | Same as code |
| Success/error tones | Generated at runtime with the Web Audio API (sine waves) | Same as code |

## Kokoro-82M attribution
This app's voice audio was generated with Kokoro-82M (by hexgrad), licensed under the
Apache License, Version 2.0. You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0. The model is distributed "AS IS", WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND. The model itself is not shipped with the app; only
audio generated with it.

## Letter-sound attribution (CC BY-SA 3.0)
The letter-sound clips in `audio/human/letters/` are adapted from these recordings on Wikimedia Commons (checked 2026-10-23). The original 2005–2006 file versions were used.

**Peter Isotalo** (User:Karmosin). License: CC BY-SA 3.0, https://creativecommons.org/licenses/by-sa/3.0/
- B: https://commons.wikimedia.org/wiki/File:Voiced_bilabial_plosive.ogg
- D: https://commons.wikimedia.org/wiki/File:Voiced_alveolar_plosive.ogg
- G: https://commons.wikimedia.org/wiki/File:Voiced_velar_plosive.ogg
- F: https://commons.wikimedia.org/wiki/File:Voiceless_labiodental_fricative.ogg
- V: https://commons.wikimedia.org/wiki/File:Voiced_labiodental_fricative.ogg
- S, and the s of X: https://commons.wikimedia.org/wiki/File:Voiceless_alveolar_sibilant.ogg (2005-05-02 version)
- Z: https://commons.wikimedia.org/wiki/File:Voiced_alveolar_sibilant.ogg
- H: https://commons.wikimedia.org/wiki/File:Voiceless_glottal_fricative.ogg
- L: https://commons.wikimedia.org/wiki/File:Alveolar_lateral_approximant.ogg
- M: https://commons.wikimedia.org/wiki/File:Bilabial_nasal.ogg
- N: https://commons.wikimedia.org/wiki/File:Alveolar_nasal.ogg
- R: https://commons.wikimedia.org/wiki/File:Alveolar_approximant.ogg (2005-05-02 version)
- W, and the w of Q: https://commons.wikimedia.org/wiki/File:Voiced_labio-velar_approximant.ogg
- Y: https://commons.wikimedia.org/wiki/File:Palatal_approximant.ogg
- C, K, and the k of Q and X: https://commons.wikimedia.org/wiki/File:Sv-kon.ogg
- P: https://commons.wikimedia.org/wiki/File:Sv-pol.ogg
- T: https://commons.wikimedia.org/wiki/File:Sv-tand_stor.ogg

**Denelson83**. License: CC BY-SA 3.0. All are the 2005-07-20 versions.
- A: https://commons.wikimedia.org/wiki/File:Near-open_front_unrounded_vowel.ogg
- E: https://commons.wikimedia.org/wiki/File:Open-mid_front_unrounded_vowel.ogg
- I: https://commons.wikimedia.org/wiki/File:Near-close_near-front_unrounded_vowel.ogg
- O: https://commons.wikimedia.org/wiki/File:Open_back_unrounded_vowel.ogg
- U: https://commons.wikimedia.org/wiki/File:Open-mid_back_unrounded_vowel.ogg

**Octane** (en.wikipedia). Public domain (released by the author).
- J: https://commons.wikimedia.org/wiki/File:Voiced_palato-alveolar_affricate.ogg

**Changes made:** cut to the single sound (stops taken from the start of a word or syllable), faded in and out, lengthened (L M N R V Z, Praat overlap-add), spliced (X = k+s, Q = k+w), resampled to 24 kHz mono, loudness-normalised and peak-limited, padded with silence, and encoded as 48 kbps MP3. The adapted clips are licensed CC BY-SA 3.0 (J: public domain). The app plays them after a Kokoro-generated frame ("This is the letter E. It makes the sound …"). The frame is a separate clip.

## Development-only tools (not shipped, not needed to run the app)
- **kokoro-onnx** (MIT License, Copyright (c) 2025 github.com/thewh1teagle) – runs Kokoro locally to build the
  clips. Not shipped. It depends on **onnxruntime** (MIT), **phonemizer** (GPL-3.0) and
  **espeak-ng** via espeakng-loader (GPL-3.0) for phonemes.
- **praat-parselmouth** (GPL-3.0, bundles Praat, GPL) – used by `tools/audio/phonics.py` / `human.py` to
  cut/stretch letter sounds. Not shipped.
- numpy (BSD), soundfile (BSD) / libsndfile (LGPL), ffmpeg + LAME (LGPL/GPL builds) – audio
  processing/MP3 encoding on the build machine. Not shipped.
- Optional QA only: openai-whisper (MIT) and facebook/wav2vec2-lv-60-espeak-cv-ft (Apache-2.0)
  check that clips are intelligible. Not shipped.
- The GPL tools only process data on the build machine; the generated MP3s contain no GPL code,
  and nothing from these tools is distributed with the app.
- `tools/smoke-test.mjs` and `tools/render-icons.mjs` use **playwright-core** (Apache-2.0) with a locally installed Chrome. Install separately with `npm i playwright-core` if you want to re-run them.
- `python3 -m http.server` (Python standard library, PSF License) for local serving.

## Suggested license for the project code
Not yet chosen – owner's decision. MIT is a simple permissive option:

```
MIT License
Copyright (c) 2026 <owner>
Permission is hereby granted, free of charge, to any person obtaining a copy of this
software and associated documentation files (the "Software"), to deal in the Software
without restriction, including without limitation the rights to use, copy, modify, merge,
publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons
to whom the Software is furnished to do so, subject to the following conditions:
The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED.
```
