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
1. **Sounds 🔤** – 26 letters/sounds in a systematic-phonics order
   (s a t p i n m d g o c k e u r h b f l j w v y z x qu). Each: see the letter + a
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

### "Say it" step (speech recognition)
- If the browser supports `SpeechRecognition`/`webkitSpeechRecognition`, a big 🎤 button
  listens once and checks the answer (accepts several recognizer alternatives, common
  homophones like sun/son, and ~75% of the words for sentences).
- Listening can never lock the screen: a watchdog gives up if the recognizer hasn't
  started within ~3–4 s (e.g. stuck behind the first mic-permission prompt; the first try
  is retried once automatically) and caps listening at 7–12 s. While listening the 🎤
  becomes ⏹ (tap to stop). 👍 appears after any miss or failure.
- On an iPhone home-screen app (standalone mode), where Apple's recognizer is unreliable,
  👍 is the main button and the 🎤 is an optional extra; if it doesn't start it is hidden
  for the rest of the session.
- After 2 misses, or if the mic is blocked/unsupported/turned off in ⚙️, a 👍 "I said it"
  button appears. Without recognition the step is simply "read it aloud, tap 👍".

### Settings ⚙️
Voice speed (🐢 🚶 🏃), voice choice, microphone on/off, erase progress (two taps),
install instructions.

### Progress
Saved only in `localStorage` on that phone (key `readAloud.v1`). No account, nothing
leaves the device (except audio sent by the browser's own speech recognizer – see below).
Clearing browser data / uninstalling erases progress.

## Files

```
index.html            app shell (strict Content-Security-Policy: only same-origin files)
manifest.json         PWA manifest
sw.js                 service worker: precache + offline
css/styles.css        all styling (signs/menu/forms drawn with CSS)
js/content.js         all lesson content (edit here to add words/sentences/verses)
js/speech.js          Web Speech API wrapper (TTS, recognition, answer matching)
js/app.js             screens, lessons, progress, settings
icons/                icon.svg + PNGs (192, 512, maskable 512, apple-touch 180)
audio/                optional recorded letter sounds (see audio/README.md)
tools/                dev-only tests (smoke-test.mjs, match-test.js, render-icons.mjs)
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
- `tools/mic-test.mjs`: fakes a speech recognizer to check the 🎤 path – correct word ✓ + ▶,
  wrong word shows what was heard, mic permission denied → 👍 fallback.
- Not yet tested on a real iPhone or Android phone (needs HTTPS hosting – see below).

## Known limitations
- **Letter sounds via computer voice are imperfect.** TTS engines are built to speak
  words, not isolated phonemes. "sss", "mmm", "fff" usually work; stop sounds ("tuh",
  "puh") add an extra "uh"; short vowels ("aah", "ih", "eh") are approximations and
  some voices may say the letter *name*. That is why every sound is wrapped in a
  keyword ("sun … sss … sun") and the quizzes ask about the keyword. **Best fix:** record
  real sounds (a teacher/friend, ~26 short clips) into `audio/letters/` – the app plays
  them automatically (see `audio/README.md`).
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
- iOS only lets web pages speak after a tap, so the app never talks before the first tap
  on each launch.
- The `say` check cannot tell if he *read* the word or repeated it after tapping 🔊 –
  this is a practice tool, not a test.
- Content is a starter set (116 lessons). No digraphs (sh, ch, th, ck), long vowels or
  blends yet – the natural next levels.

## Hosting (owner decision – nothing has been published)
To use it on his phone it must be served over HTTPS. Free options for a static folder:
GitHub Pages, Cloudflare Pages, Netlify (free tier). Any of them: upload the folder as-is
(no build). Keeping the repo private or the URL unlisted is up to the owner.

## Content sources
- Word lists, sentences, sign/menu/form text and all instructions: written for this project.
- Bible verses: King James Version (public domain in the US).
- No copyrighted translations (NIV, ESV, NLT, etc.) are used.
