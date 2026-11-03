# Handoff – Read Aloud (Nov 3, 2026, v18)

## Latest (v18): mic speak window + spoken retry + countdown ring; cleanup
- **v17 on-screen listen note removed** (“Say the word, then wait. I’ll check it for you.” /
  “Say it, then wait…”): Adam can’t read it. `.listen-note`, `.nowrap` span, `.foot-listening` gone.
  Prompts for the learner must be audio or picture, not text.
- **Speak window** after the mic opens (counted from the recognizer’s real start, `listenMs` in `stepSayIt`):
  - word / letter / sight word / sign / menu / form line: **7 s**
  - sentence / verse: **6 s + 0.5 s per word**, rounded up to whole seconds, **min 8 s, max 20 s**
    (2–6-word sentences 8–9 s; Genesis 1:1, 10 words = 11 s; the 17-word verse = 15 s).
  - Nothing heard in the window → listening stops and the app **says** (Kokoro af_heart clip)
    **“I didn’t hear that, please try again.”**; the mic is ready again (🎤). After the 2nd miss it
    also says **“Or tap Continue anyway.”** and 👍 shows (same 2-miss rule as before; these two clips replace
    “I did not hear you. Try again[, or tap Continue anyway].”). Also used for recognizer no-speech / no-match.
  - Speech (or sound) that starts inside the window clears it (`onspeechstart`/`onsoundstart` in
    `Speech.listen`), so nobody is cut off mid-word; the recognizer ends normally. Safety cap after
    speech starts: max(20 s, 3 × window). If a browser never fires speech/sound events, the window
    acts as the old hard cap (old caps were 7 / 9 / 12 s).
- **Countdown ring** (`countdownRing` in `js/app.js`, `.mic-ring` CSS): thick SVG ring just outside the
  mic/Stop button, drains over the window, green → amber (≤50%) → red (≤25%), plus a big seconds number
  next to ⏹. When speech is heard it stops and stays full green (no number). Removed when listening
  ends (result, timeout, Stop). The pulse animation is off while the ring shows. Reduced motion: drains in
  1-second steps, number still counts down. Stop behavior unchanged.
- Earlier v18 cleanup: Stop / any listen ending without a result clears 👂 / …; tile grids share one label size
  (`fitGrid`, `.items-2col` fallback); cold-load speech fix (`waitForGesture`: a line said before the
  first tap waits for it and plays the Kokoro clip — this was the flaky level1-test).
- Tests: new `tools/mic-timeout-test.mjs` (+ `W=320`, `BASE=` for live) → `screenshots/34-ring-*.png`;
  `listen-note-test.mjs` now asserts the note is gone; `grid-shots.mjs`, level1-test §7, clip-test §2.
- Cache **`read-aloud-v18-` + AUDIO_VERSION** (2 new clips; old “I did not hear you…” clips pruned).
- Needs a real-phone listen: the two new clips, and that iPhone Safari fires speech start (so long answers
  aren’t cut at the window).

## v17: speak-then-wait note while the mic listens
- Problem: Adam said the word, then tapped Stop before the check finished.
- Fix (screen only, nothing spoken while mic is open; Stop behavior unchanged):
  every say-it step shows a big note above the footer buttons only while listening
  (`setListening(on)` toggles `.listen-note`; footer gets `.foot-listening` to wrap).
  - word / sight word / one-word sign or menu item: “Say the word, then wait. I’ll check it for you.”
  - sentence / verse / multi-word form label (e.g. Date of Birth): “Say it, then wait. I’ll check it for you.”
- Test: `node tools/listen-note-test.mjs` → `screenshots/30-listen-*.png` (390×844).
- Cache **`read-aloud-v17-`**. No new audio clips.


## v16: Whitney letter sounds
- Replaced Wikimedia Commons Level 1 letter sounds (A–Z) with Whitney’s alphabet
  pronunciation recording (`tools/audio/human/whitney-alphabet-pronunciations.m4a`,
  also under `assets/`). Cut map: `tools/audio/whitney-sounds-sources.md`.
- Pipeline: `tools/audio/human.py` → `phonics.finish_letter` → `audio/human/letters/`.
  Kokoro still speaks the intro frame; human phoneme plays twice.
- **Q** = /kw/ (“qua” in her take), not “qu” / not letter-name “cue”.
- All 26 letters covered; no Wikimedia fallbacks left in `clips.json`.
- Attribution: Whitney as voice talent (2026-10-27) in `LICENSES.md` / this handoff.
  Prior Wikimedia set kept as historical note only.
- Sample: `/workspace/voice-samples/whitney-letter-sounds-all.mp3` (26 intros A–Z).
- Cache **`read-aloud-v16-`** (AUDIO_VERSION stamped by build).

## Still true
- v15: past-tense “read” = /rɛd/ via overrides.json (“You red it.”).
- v14: item-tile scale-to-fit; v13 mic-check UX; v12 adult tone + imagery.

Live: https://jeffsievertson.github.io/reading-app/

## Next
On phone: hard-refresh twice for v16; spot-check a few letter intros (E, Q, S, L) sound like Whitney.
Do **not** email Whitney.
