# Handoff – Read Aloud (Nov 21, 2026, v21.1 hotfix)

## Latest (v21.1 hotfix, branch `hotfix-v21-1`, from live 30a36f9): unsafe/mismatched photos + plural -s intro
- Removed lesson photos (emoji used instead): tent (unsafe; file deleted, never opened), sun (plain blue sky), van (colour-inverted stone cross), water (kids' Smurfs cartoon glass), fish (market crowd, no clear fish). Level 7 home tile now reuses `lamp`.
- Plural -s intro no longer puts "sss" / "zzz" in spoken text. `introParts` play `letters/s` and `letters/z`. New clip for the stem "S at the end of a word can say".
- Cache **`read-aloud-v21-1-447c7bda`**. Test: `tools/image-safety-test.mjs` (fails if a removed photo exists or is referenced); screenshots `screenshots/70-*-<390|320>.png`. Do not push until Jeffrey says so.

# Handoff – Read Aloud (Nov 21, 2026, v21)

## Latest (v21): Hermes 12-book series levels, first two books of new phonics (Spellings + Sounds together)
- **New level order:** 1 Sounds · 2 Words · 3 Missing Letter · 4 Sentences · 5 Everyday ·
  **6 Spellings** (Book 3: ck, FLOSS ff/ll/ss/zz, plural -s) · **7 Sounds together** (Book 4: sh, ch, th, th-voiced, wh, ng) ·
  8 Real Life · 9 Bible. Inserted after Everyday, before Real Life and Bible (Jeffrey, Nov 21).
  Old item ids kept (`L3-…`, `L4-…`); `C.REAL_LIFE` is 8, `C.BIBLE` is 9. `#/level/6/signs` and `#/level/4/menu` still work.
- **Heart words** at the start of each matching level (Jeffrey, Nov 21): Book 3 `of, said, are, they` start Spellings;
  Book 4 `do, have, what, there, where` start Sounds together. Kind is existing `sight` with `heart: true`.
  Spoken frame: “This is a heart word. You remember it. It says:”. Sentences in those levels may use those hearts.
  Later books’ hearts wait for v22/v23.
- **Grapheme tiles:** `C.segments()` keeps digraphs/FLOSS together (`shop` is sh-o-p, `bills` is b-i-ll-s). Final s uses /z/ on words like bills.
- **Pattern sounds:** temporary Kokoro `af_heart` cuts in `audio/patterns/` (one clips.json key each: sh, ch, th, th-voiced, wh, ng).
  Whitney’s letter-W `wuh` was not replaced. Swap path: `tools/audio/pattern-sounds-sources.md`.
- **Q-lesson race:** after a tap, `gestured` could be true while AudioContext was still locked or the clock stalled;
  `sayNow` fell back to `speechSynthesis` and the Q intro said the built-in “cue / kwuh”. Fix is in `js/speech.js`
  (`resetCtx` + retry `ensureRunning`, wait for a later gesture if needed, TTS only after retries; stalled `playRun` recreates the context).
  `tools/level1-test.mjs` passed 5/5 sequential runs, including “no built-in voice used in the Q lesson”.
- **Home grid:** 9 photo tiles are compacted so levels 1–9 all fit above the footer at 320 and 390 (844 tall).
- Tests: `tools/v21-levels-test.mjs` (order, ids, segments, decodability, clips, migration, screenshots `screenshots/50-*-<390|320>.png`).
  `tools/v20-levels-test.mjs` now uses `C.REAL_LIFE` / `C.BIBLE`. rewards-test expected word-bank count is derived from items.
- Cache **`read-aloud-v21-44c0808b`** (was e26470af; bumped after the plural -s intro clip). Not pushed. Needs a real-phone listen of the new clips (especially digraph phonemes, “said”, the heart frame, “I wish I had cash.”, and the plural -s intro — that last line was rewritten in v21.1 so sss/zzz are letter clips, not spoken letter names).


## Latest (v20): tester Chyann Devers' 3 suggestions (approved by Jeffrey Nov 18)
- **New level order:** 1 Sounds · 2 Words · **3 Missing Letter (new)** · 4 Sentences · **5 Everyday (new)** ·
  6 Real Life (signs, menu, forms) · **7 Bible (moved)**. Old item ids kept (`L3-…`, `L4-…`), so saved progress
  and the word bank carry over; `level` is now just the shown number. Real Life = `C.REAL_LIFE` (6);
  `#/level/4/<cat>` routes still work (viewCat ignores the number).
- **Bible:** verses left word-for-word KJV, moved out of Real Life into their own last level, so “Keep going”
  reaches them only after everyday reading. Not paraphrased.
- **Missing letter** (`kind: 'missing'`, `stepMissing` → `stepSayIt`): picture + spoken “Which letter is
  missing?” + the word; gap shown as a dashed `?`; 3 letter choices A–Z, hand-picked so no wrong choice makes
  another real word (c_t: a/e/i, never o/u). Then the mic check on the whole word (7 s window).
- **Everyday:** 10 words (job gas fix pen bin mop cab rent milk help; slow blending clips too) + 10 sentences. These are new everyday decodable words, not reuse of earlier levels' words (Sentinel v20 audit note).
  Swapped out bag / pot (Kokoro said “beg” / “part”).
- Fits: tile names and screen titles stay on one line (shared shrink `fitTileNames`, `fitTitle`); letter tiles
  shrink for 4-letter words at 320 px.
- Test: `node tools/v20-levels-test.mjs` → `screenshots/40-*-<390|320>.png`. rewards-test “all done” case
  updated for the new numbering.
- Cache **`read-aloud-v20-c0110894`** (55 new clip files incl. 10 slow blending; 5 old pruned).
- Known: `level1-test` “no built-in voice used in the Q lesson” fails in headless here on v19 HEAD too
  (first page’s audio stalls); not a v20 change.
- Needs a real-phone listen of the new clips. Not pushed.

## v19: long sign / form / menu words fit their frame on narrow phones

- Bug (Sentinel audit of v18, 320 px): on the RESTROOM sign lesson screen the word ran into the white frame.
- Root cause: only grid tiles had a fit pass (fitGrid). The single big sign / menu line / form field used fixed
  CSS sizes (sign 3rem, menu 2.4rem, form 1.9rem) and min-widths of 240 / 300 / 310 px, wider than the 288 px
  a 320 px screen leaves; the learn-screen button also grew to the word's full width (371 px for RESTROOM).
- Fix: css caps .thing and big .sign / .menu-card / .form-field at min(100%, 100vw − 32px) (min-widths too);
  signs use 20 px side padding at <= 370 px; app.js fitThing() (run with fitItemTiles after every render and on
  resize) shrinks the text 1 px at a time (floor 20 px) until it sits inside the frame's content box. The CSS size
  is the maximum, so short words are unchanged.
- Result: RESTROOM 38 px at 320 (45 px at 390), Date of Birth 27.4 px at 320, Chicken $8.50 34.4 px at 320; all others
  unchanged. Text-to-frame margin is now >= 18 px everywhere (the frame's padding).
- Test: tools/sign-fit-test.mjs (BASE=, SHOTS=0) measures text glyph boxes against the inner frame for every
  sign / form / menu item on the learn and say screens at 320 and 390 (>= 8 px each side, frame on screen, no
  sideways scroll). Screenshots: screenshots/35-fit-<item>-<320|390>.png.
- Cache: read-aloud-v19-1e5c0586 (audio unchanged).


## v18: mic speak window + spoken retry + countdown ring; cleanup
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
