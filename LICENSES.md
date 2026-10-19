# Licenses and third-party content

## Summary
**No third-party code, libraries, fonts, images, sounds, or CDNs are shipped in this app.**

| Item | Source | License |
|---|---|---|
| All HTML, CSS, JavaScript (`index.html`, `css/`, `js/`, `sw.js`, `manifest.json`) | Written for this project | Owner's choice (suggest MIT – see below) |
| App icons (`icons/icon.svg` and the PNGs rendered from it) | Drawn for this project (simple shapes) | Same as code |
| Signs, menu, and form graphics | Drawn with CSS in `css/styles.css`, no images | Same as code |
| Lesson word lists, sentences, sign/menu/form text | Written for this project (common English words) | Same as code |
| Bible verses (Level 4) | **King James Version** (Authorized Version, standard 1769 text) | **Public domain in the United States.** (In the UK the KJV is under perpetual Crown patent; this app is intended for US use.) No other translations are used. |
| Emoji (e.g. ☀️ 🍎 🔊) | Unicode characters drawn by the phone's own system emoji font; no emoji images are bundled | Not distributed by this app |
| Voices / speech recognition | The phone's built-in Web Speech API (Apple/Google/OS voices) | Provided by the browser/OS; not distributed by this app |
| Success/error tones | Generated at runtime with the Web Audio API (sine waves) | Same as code |

## Development-only tools (not shipped, not needed to run the app)
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
