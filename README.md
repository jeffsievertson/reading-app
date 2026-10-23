# Read Aloud – learn to read with phonics (prototype)

A free, private, phone-friendly web app (PWA) that teaches an adult to read from
scratch. Everything on screen can be heard aloud, so it works for someone who cannot
read the instructions yet. Plain HTML/CSS/vanilla JS – no build step, no frameworks,
no CDNs, no accounts, no server, no analytics or trackers.

## Run it

```bash
cd /workspace/reading-app
python3 -m http.server 8765
# open http://localhost:8765 in Chrome or Safari
```

Notes
- The service worker (offline mode) and speech recognition only work in a **secure
  context**: `http://localhost` or **HTTPS**. Opening the phone browser at
  `http://192.168.x.x:8765` will show the app, but it will *not* install/work offline
  and the microphone will not work. To use it on a phone for real it must be served
  over HTTPS (see "Hosting" below).
- After the first visit everything is cached and works offline (airplane mode).
- To ship an update, change files and bump `CACHE` in `sw.js` (e.g. `read-aloud-v2`).

### Install on a phone ("Add to Home Screen")
- **iPhone (Safari):** Share button → *Add to Home Screen*.
- **Android (Chrome):** menu ⋮ → *Install app* / *Add to Home screen* (an 📲 button
  also appears on the home screen of the app when Chrome offers installation).

## How it works for the learner

- First screen: one big ▶. Tapping it starts a spoken welcome.
- 🔊 (top-right on every screen) speaks the instructions for that screen.
- **Hold a finger on any button** to hear what it does without pressing it.
- 🏠 / ◀ go back. ▶ always means "next / keep going". The home screen's big ▶ jumps
  to the next unfinished lesson, so he never has to navigate menus.
- Dots at the top show the steps of the current lesson.

### Levels
1. **Sounds 🔤** – the 26 letters A to Z, each with its usual sound (Q is taught with
   the /kw/ sound in "queen"). Each lesson starts with the letter's **name, then its sound**:
   "This is the letter E. It makes the sound … eh … eh." (the sound is the real cut-out
   letter-sound clip, played twice), then the usual "This letter makes the first sound
   in egg …". Names are generated from phonemes so "A" is "ay", not the article "uh";
   the built-in-voice fallback uses respellings (ay, ee, eye, oh, you, why …). Each: see the letter + a
   keyword ("sun"), hear "sun … sss … sss … sun", then a hear-and-pick quiz
   ("Which letter starts the word sun?").
2. **Words 🧩** – 36 CVC words (sat, pin, map, dog, cat, bed, sun, box…). Tap each
   letter to hear its sound, 🧩 blends them (sound-by-sound highlight → slow word →
   word), then **say it** (microphone), then find the word among three. The picture is
   only revealed *after* he reads it, so he decodes instead of guessing from pictures.
3. **Sentences 💬** – 10 "tricky" sight words (the, I, is, to, my, we, he, see, was, you),
   then 14 short decodable sentences ("The cat sat on a mat."). Tap any word to hear it,
   🐢 reads word-by-word with highlighting, then say the sentence.
4. **Real Life 🏙️**
   - Signs (drawn in CSS): STOP, EXIT, OPEN, CLOSED, PUSH, PULL, RESTROOM, DANGER – with a
     spoken meaning ("Pull. Pull the door toward you.").
   - Menu: Coffee, Eggs, Burger, Fries, Chicken, Soup, Salad, Water, Pizza with prices.
   - Forms: Name, Address, Phone, Date of Birth, Signature – with what to write there.
   - Bible: 8 short **King James Version** verses (John 11:35, 1 Thess 5:16, 5:17,
     Genesis 1:3, Psalm 23:1, Genesis 1:1, Philippians 4:13, Psalm 118:24).

### Natural voice (pre-recorded clips)
- Everything the app says is pre-generated with the free **Kokoro-82M** neural voice
  (voice `af_heart`, Apache-2.0) as small MP3 clips in `audio/af_heart/` (~500 files,
  ~5.6 MB, cached for offline use). The same voice plays on every phone, iPhone included.
- The 26 letter sounds are **cut from real words** (e.g. the /t/ from "tip", the /m/
  from "map") instead of asking the voice to say "tuh", so stops are crisp and
  continuous sounds (sss, mmm, fff, lll, rrr) are stretched without a vowel.
- Playback goes through the Web Audio API: clips start after the first tap (iOS rule),
  word blending plays the letter sounds back-to-back on the audio clock (gapless), and
  the 🐢/🚶/🏃 speed setting speeds clips up/down without changing pitch.
- **Fallback:** if a clip is missing, can't be loaded/decoded, or hasn't started within
  ~1.5 s (slow network, locked audio), that text is spoken with the phone's built-in voice
  instead, so the app never goes silent.
- ⚙️ Voice: **Natural voice (recommended)** is the default; the phone's own voices are
  listed as alternatives ("Phone voice: …"). Picking a phone voice turns the clips off.
- On iOS 17+ the app asks for the "playback" audio session so clips are heard even with
  the ring/silent switch on silent (older iOS: flip the switch off silent).
- Rebuilding the clips (only needed after changing lesson text): see *Rebuilding the
  audio* below.

### "Say it" step (speech recognition)
- Every say-it step says: **"Tap the mic, then read it out loud. When you're done, tap
  the thumbs up."** (sentences/verses: "…read the sentence/verse out loud…"). The screen
  shows 🔊, 🎤 and 👍 in that order, 🎤 and 👍 the same big size, on every phone and in
  the iPhone home-screen app.
- If the browser supports `SpeechRecognition`/`webkitSpeechRecognition`, the 🎤 button
  listens once and checks the answer (accepts several recognizer alternatives, common
  homophones like sun/son, and ~75% of the words for sentences).
- Listening can never lock the screen: a watchdog gives up if the recognizer hasn't
  started within ~3–4 s (e.g. stuck behind the first mic-permission prompt; the first try
  is retried once automatically) and caps listening at 7–12 s. While listening the 🎤
  becomes ⏹ (tap to stop). 👍 always works, with or without the mic.
- On an iPhone home-screen app (standalone mode), where Apple's recognizer is unreliable,
  the mic uses a shorter watchdog; if it doesn't start it is hidden for the rest of the
  session and the instruction changes to "Read it out loud. When you're done, tap the
  thumbs up."
- If the mic is blocked/unsupported/turned off in ⚙️ the step is simply "Read it out
  loud. When you're done, tap the thumbs up." 

### Settings ⚙️
Voice speed (🐢 🚶 🏃), voice (Natural voice – recommended – or a phone voice), microphone on/off, erase progress (two taps),
install instructions.

### Progress
Saved only in `localStorage` on that phone (key `readAloud.v1`). No account, nothing
leaves the device (except audio sent by the browser's own speech recognizer – see below).
Clearing browser data / uninstalling erases progress.

### Word bank, streak, milestones (`js/rewards.js`, key `readAloud.rewards.v1`)
- **Word bank 📚** (home → 📚): every mastered word (lesson completed, same as the ✓) from
  Level 2 words, Level 3 tricky words and Level 4 signs + menu. Letters, sentences, form
  labels and verses are not words for the bank. Tap a word to hear it. Existing progress is
  backfilled on first load.
- **Streak 📅**: a local-calendar day counts when at least one lesson item is finished.
  2 free skip days; a missed day uses a skip. 1 skip comes back per 7 practiced days (max 2).
  Missing more days than skips left starts a new streak ("New start today"), with skips full.
- **Milestones**: 25/50/100/250/500 words, 7/30-day streak. Recorded once; shown and read
  aloud on the done screen with a 💬 **Tell Jeffrey** button: an `sms:` link to +18127275260 (team Google Voice) that opens a
  pre-written text on the phone. Adam taps Send himself; nothing is sent automatically,
  no backend. Milestones already passed before the feature existed are recorded silently.

## Files

```
index.html            app shell (strict Content-Security-Policy: only same-origin files)
manifest.json         PWA manifest
sw.js                 service worker: precache + offline
css/styles.css        all styling (signs/menu/forms drawn with CSS)
js/content.js         all lesson content (edit here to add words/sentences/verses)
js/speech.js          speech: natural-voice clip player (Web Audio) with built-in-voice
                      fallback, recognition with watchdogs, answer matching
js/app.js             screens, lessons, progress, settings, word bank screen
js/rewards.js         word bank, streak, milestones (pure logic, no DOM)
icons/                icon.svg + PNGs (192, 512, maskable 512, apple-touch 180)
audio/clips.json      text -> clip map (generated)
audio/af_heart/       generated Kokoro af_heart MP3 clips (t/ texts, slow/ slow words,
                      letters/ the 26 letter sounds) – see audio/README.md
tools/                dev-only tests (smoke, mic, mic-robust, clip, match, content, level1, rewards) + render-icons
tools/audio/          dev-only audio build (build_audio.py, phonics.py, collect-texts.mjs)
screenshots/          390×844 phone screenshots from the headless test
LICENSES.md           third-party content (none shipped)
```

## Testing that was done
- `node --check` on every JS file; `node tools/match-test.js` (answer-matching unit tests).
- `tools/smoke-test.mjs` (Playwright + headless Chrome, 390×844 mobile viewport): walks
  welcome → home → Level 1 lesson (wrong + right answer) → done, Level 2 blend and say,
  a sentence, all Level 4 categories, settings; checks progress is saved, the service
  worker activates, the app reloads **offline**, and the no-microphone fallback (👍)
  completes a lesson. Zero console errors, page errors, or failed requests.
  Run: `npm i playwright-core` then `node tools/smoke-test.mjs` (server must be running).
- `tools/mic-robust-test.mjs`: misbehaving fake recognizers (never fires any event, starts
  but never ends, throws on start, first start dies then works, every error code, iOS
  home-screen mode) – checks the say-step never stays blocked and always offers ⏹ / 👍.
- `tools/clip-test.mjs`: natural-voice playback on an iPhone user agent – clip plays after
  a tap; built-in voice takes over for locked audio, a missing text, a 404, a corrupt file
  and a slow (>1.5 s) clip; speed setting → clip speed; blending is gapless; voice setting
  (natural / phone / migrated old setting); say-it instruction, 🔊🎤👍 order and mic after
  clips in Safari and home-screen mode; and a crawl of all 116 lessons checking every
  spoken text has a clip.
- `tools/content-test.js` (node): Level 1 is the letters A–Z, keyed by letter, with Q (never
  "qu"); every letter has a sound clip; no spoken text says "qu"; all clip files exist.
- `tools/level1-test.mjs`: name-then-sound intro for all 26 letters (clip order checked), Level 1 list A–Z, the Q lesson (shows Q q, says queen + the Q
  sound), quiz choices for every letter (no c/k/q mix-ups), migration of old "qu" progress,
  "keep going"/"next" follow A–Z. Writes screenshots 20–22.
- `tools/mic-test.mjs`: fakes a speech recognizer to check the 🎤 path – correct word ✓ + ▶,
  wrong word shows what was heard, mic permission denied → 👍 fallback.
- `tools/rewards-test.mjs`: word bank backfill + count, streak with a skip used, restart after
  too many missed days, skip refill, milestones fire once, Tell Jeffrey sms link. Writes screenshots 25–26.
- Not yet tested on a real iPhone or Android phone (needs HTTPS hosting – see below).

## Known limitations
- **Letter sounds are cut from computer-voice words.** They are much better than asking
  a voice to say "tuh", but a few are still approximations: the glides (w, y), q (/kw/), j, the
  voiced stops (b, d, g) and z/v/r/l. Every sound is still wrapped in a keyword
  ("sun … sss … sun") and the quizzes ask about the keyword. A person can replace any
  sound with a real recording (see `audio/README.md`).
- With **Phone voice** selected in ⚙️ (or if clips can't play) the phone's own voice is
  used, and its letter sounds are worse.
- **Speech recognition support varies:**
  - *Android + Chrome:* works well. Needs internet (Google's servers do the
    recognition), mic permission, HTTPS.
  - *iPhone/iPad:* Safari 14.5+ exposes `webkitSpeechRecognition` (uses Siri/dictation;
    Siri & Dictation must be enabled). It is less reliable, may stop early, and when the
    app is launched from the Home Screen (standalone mode) it is often unavailable or
    fails on some iOS versions. Chrome/Firefox on iPhone use the same engine with the
    same limits. The app falls back to the 👍 button automatically.
  - *Firefox (desktop/Android):* no speech recognition → 👍 fallback.
  - Recognizers are tuned to understand sentences, not single short words or lone
    sounds, so one-word answers can be misheard; that's why matching is lenient and
    👍 appears after two misses. Level 1 uses tap-to-choose quizzes instead of the mic.
  - **Privacy:** on most phones the browser sends the microphone audio to Google
    (Android Chrome) or Apple (iOS) to be recognised. The app itself stores and sends
    nothing. The mic can be turned off in ⚙️.
- **Voices:** quality depends on the phone. iPhone: Settings → Accessibility → Spoken
  Content → Voices → download an "Enhanced" English voice for a better sound. Text-to-speech
  works offline on most phones; some Android voices download on first use.
- iOS only lets web pages play sound after a tap, so the app never talks before the first
  tap on each launch. If iOS interrupts audio (phone call, other app), the next text falls
  back to the phone voice until the next tap.
- The `say` check cannot tell if he *read* the word or repeated it after tapping 🔊 –
  this is a practice tool, not a test.
- Content is a starter set (116 lessons). No digraphs (sh, ch, th, ck), long vowels or
  blends yet – the natural next levels.

## Hosting
Live on GitHub Pages: https://jeffsievertson.github.io/reading-app/ (static folder, no
build step; any HTTPS static host works).

### Getting an update on the phone
Updates download by themselves when the app is opened online; the new version is used
from the next launch. To get it right away: open the app (or the Safari page) while
online, wait ~10 seconds, then close it completely (iPhone: swipe it away in the app
switcher) and open it again. ⚙️ → Voice should say **Natural voice (recommended)**.

## Rebuilding the audio (dev only, not part of the app)
After changing any text in `js/content.js` or `js/app.js`:
```
python3 -m venv tts-venv && tts-venv/bin/pip install kokoro-onnx soundfile praat-parselmouth
# model files kokoro-v1.0.onnx + voices-v1.0.bin (github.com/thewh1teagle/kokoro-onnx releases)
TTS_MODELS=/path/to/models tts-venv/bin/python tools/audio/build_audio.py
```
It collects every spoken text (`tools/audio/collect-texts.mjs`, which also lists any text
it can't cover), renders only new/changed clips, rewrites `audio/clips.json`, removes old
files and stamps the audio version into `sw.js` (so phones download the new clips). For
short words it renders a few variants and lets a phoneme recognizer pick the cleanest
(`picks.json`); `--qa` checks longer texts with Whisper (`overrides.json`). Both
recognizers are optional dev tools.

**These generation tools are not shipped.** kokoro-onnx uses **espeak-ng** (via
phonemizer / espeakng-loader) for phonemes, and the letter-sound cutting uses **Praat**
(via praat-parselmouth); espeak-ng and Praat are **GPL**-licensed. They only run on the
build machine. The app ships only the generated MP3 files, which contain no GPL code.

## Content sources
- Word lists, sentences, sign/menu/form text and all instructions: written for this project.
- Bible verses: King James Version (public domain in the US).
- No copyrighted translations (NIV, ESV, NLT, etc.) are used.
