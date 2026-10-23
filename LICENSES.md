# Licenses and third-party content

## Summary
**No third-party code, libraries, fonts, images, or CDNs are shipped in this app.** The only third-party-derived content is the generated voice audio (Apache-2.0 model, see below).

| Item | Source | License |
|---|---|---|
| All HTML, CSS, JavaScript (`index.html`, `css/`, `js/`, `sw.js`, `manifest.json`) | Written for this project | Owner's choice (suggest MIT – see below) |
| App icons (`icons/icon.svg` and the PNGs rendered from it) | Drawn for this project (simple shapes) | Same as code |
| Signs, menu, and form graphics | Drawn with CSS in `css/styles.css`, no images | Same as code |
| Lesson word lists, sentences, sign/menu/form text | Written for this project (common English words) | Same as code |
| Bible verses (Level 4) | **King James Version** (Authorized Version, standard 1769 text) | **Public domain in the United States.** (In the UK the KJV is under perpetual Crown patent; this app is intended for US use.) No other translations are used. |
| Emoji (e.g. ☀️ 🍎 🔊) | Unicode characters drawn by the phone's own system emoji font; no emoji images are bundled | Not distributed by this app |
| Natural-voice audio clips (`audio/af_heart/`, `audio/clips.json`) | Generated for this project with the **Kokoro-82M** v1.0 text-to-speech model (by hexgrad, https://huggingface.co/hexgrad/Kokoro-82M), voice `af_heart`, run locally with **kokoro-onnx** | Kokoro-82M model and voices: **Apache License 2.0**. The audio is our own output of that model; no recordings of real people are included. Letter sounds were cut from generated words with our own script. |
| Fallback voices / speech recognition | The phone's built-in Web Speech API (Apple/Google/OS voices) | Provided by the browser/OS; not distributed by this app |
| Word bank / streak / milestones (`js/rewards.js`) | Written for this project; no libraries | Same as code |
| Success/error tones | Generated at runtime with the Web Audio API (sine waves) | Same as code |

## Kokoro-82M attribution
This app's voice audio was generated with Kokoro-82M (by hexgrad), licensed under the
Apache License, Version 2.0. You may obtain a copy of the License at
http://www.apache.org/licenses/LICENSE-2.0. The model is distributed "AS IS", WITHOUT
WARRANTIES OR CONDITIONS OF ANY KIND. The model itself is not shipped with the app; only
audio generated with it.

## Development-only tools (not shipped, not needed to run the app)
- **kokoro-onnx** (MIT License, Copyright (c) 2025 github.com/thewh1teagle) – runs Kokoro locally to build the
  clips. Not shipped. It depends on **onnxruntime** (MIT), **phonemizer** (GPL-3.0) and
  **espeak-ng** via espeakng-loader (GPL-3.0) for phonemes.
- **praat-parselmouth** (GPL-3.0, bundles Praat, GPL) – used by `tools/audio/phonics.py` to
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
