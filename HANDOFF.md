# Handoff – Read Aloud (Nov 22, 2026, v23 delta fix)

## Latest (v23 delta fix, local main only, on top of 1fd7e95): Sentinel delta-check items
- **Cache** `read-aloud-v23-d55fce0f` (was `read-aloud-v23-af9dff89`). Not pushed.
- **D-FIX 1 (blocking):** `stepSayIt` now uses `answerText(it)` (`it.text || it.label`) as the mic target. `say` is speech-only (help, find, hear, TTS fallback still use `spoken(it)`). Saying “live” on SW-live is accepted; using `say:'liv'` as the target would reject it. `match-test` checks every item with a `say` field; `mic-test` opens SW-live and feeds “live”.
- **D-FIX 2:** u-e is cut at the F2 rise (~0.22 s of clean low-F2 body), then lengthened to ~450 ms with a 40 ms fade-out. Shipped clip `u-e-2acdeab6`: while voiced (dB > −25, 0.10–0.44 s) F2 is 1074–1581 Hz (median 1184), with no 1800–2300 Hz tail at full volume. Whisper of the whole clip: “No.” (was “Do it.” / tail “Bye.” / “What?”).
- **D-FIX 3:** the 10 ms fade-in is applied at the detected voice onset (not sample 0). Leading silence is trimmed (`pad_ms=0`) before the fade; `finish_letter` then adds the 40 ms pad. Versus the 1fd7e95 clips, onset high-pass peak dropped 2.9–5.1× and waveform peak 3.1–5.2× on a-e / i-e / o-e / e-e (worst was o-e).
- **D-FIX 4:** `.credit-body` has `overflow-wrap:anywhere`. v23-levels-test checks that credit text stays inside the viewport and shots the long menu author at 320/390 (`80-credits-menu-*`).
- **D-FIX 5:** dog credits “Elf (English Wikipedia); derivative by Djmirko”. chicken credits “Uploaded by H Padleckas (photographer not named)”. map source is `https://unsplash.com/photos/photo-1524661135-423995f22d0b`. `photo-credits-test` now fails if a credit author does not match `imagery-sources.json` (also cleaned the duplicated “Unknown authorUnknown author” on danger).
- **Remade clips (this commit only):** `patterns/a-e-60312f11`, `i-e-617b7879`, `o-e-63d8c41e`, `u-e-2acdeab6`, `e-e-2d8cd669`. **Unchanged:** th-voiced, ng, name, home, and all other clips (build made 5, reused 1384, pruned 5).
- **Tests:** full suite (content, photo-credits, image-safety, match, rewards, tile-fit, sign-fit, listen-note, level1, v20–v23 with `SHOTS=0` on v20–v22, smoke, clip, mic / mic-timeout / mic-robust). Do **not** push until Jeffrey says so.
- **Listen list:** SW-live mic check (say “live”); u-e all the way through (no “uh/eh” tail); a-e / i-e / o-e / e-e onsets for residual click; Photo credits long author names at 320.

## Previous (v23 audit fix, local main only, on top of ec332ee): Sentinel v23 items
- **Cache** `read-aloud-v23-af9dff89` (was `read-aloud-v23-6a3ebd43`). Not pushed.
- **a-e intro:** speaking “A and E” was read as the article /ɐ/. Spoken override (and `introTts` / intro part `tts`) is “These letters are eigh and E, with a letter in the middle.” Phonemizer: /eɪ/; Whisper still hears “A and E”. “ay” was not used — isolated “ay” phonemizes as /aɪ/.
- **Find-step wrap:** `.letter-choice` is `white-space:nowrap`, visible labels use a non-breaking hyphen (U+2011), and `fitChoices()` also requires a single client rect and no `scrollWidth` spill. `v23-levels-test` checks every silent-e find step at 320 and 390 and writes `screenshots/80-pattern-*-find-{320,390}.png`. Inspected: a-e / i-e / o-e / u-e / e-e stay on one line at both widths.
- **live /lɪv/:** `SW-live` now has `say:'liv'` (display text/label stay “live”), so the help line, “Find the word: live”, and the `spoken(it)` fallback all key and speak `liv`. Phonemizer: /lɪv/ on all three, not /laɪv/.
- **Photo credits:** Settings → Photo credits (`#/credits`). `js/credits.js` lists every `images/*.webp` (subject, author, licence + link, source link, and a modified note). CC BY/BY-SA attribution is complete; PD/CC0 are marked; house notes that it was cropped. `tools/photo-credits-test.mjs` fails if any `images/*.webp` lacks a credit, or if an attribution licence is missing author/links/modified, or if a PD/CC0 file is not marked. `LICENSES.md` points at the in-app screen.
- **u-e clip:** remade from the steady low-F2 tail of a slow Kokoro /uː/ (no y-glide). Whisper: “Do it.” (was “You go away.”). All five long-vowel clips get a ~10 ms fade-in to remove the onset click.
- **Stall log (optional):** after a failed `playRun` retry (`res==='stall'`), those retry clip-log entries are retagged `how:'stalled'`.
- **Remade clips:** `patterns/a-e-2944ac06`, `i-e-02e64694`, `o-e-18204aab`, `u-e-713475f0`, `e-e-9ff194c4`; a-e intro `these-letters-are-a-and-e-with-a-letter-487eb197`; `find-the-word-liv-1f1a90bf`; live help `this-is-a-heart-word-you-remember-it-it-f114da1c`; credits lines `photo-credits-7cf751e9`, `these-photos-are-used-in-the-app-ed6cf5da`, `photo-credits-these-photos-are-used-in-t-bd300d88`, `these-photos-are-used-in-the-app-credit-5ec2f723`, `who-took-the-photos-in-this-app-and-the-a0101651`, plus chip-like `licence-be9dab6a` and `photo-8c6a4aca`. Renamed only (same hash): `live-8fc3866c.mp3` → `liv-8fc3866c.mp3`. **Unchanged:** th-voiced, ng, name, home, and the other non-VCe pattern files (build_audio reuses them when the pattern id is not in the VCe remake set).
- **Tests:** full suite passed (content, photo-credits, image-safety, match, rewards, tile-fit, sign-fit, listen-note, level1, v20–v23 with `SHOTS=0` on v20–v22, smoke, clip, mic / mic-timeout / mic-robust). New shots: `screenshots/80-pattern-*-find-*.png`, `screenshots/80-credits*.png`. Do **not** push until Jeffrey says so.
- **Listen list:** a-e intro; live help / “Find the word: live” / the word itself; all five long-vowel clips (u-e quality and the fade-in click on each); Photo credits spoken lines.

## Previous (v23, local main only): Silent e (Book 7) + safer Words/Sentences/Signs photos
- **New level order:** 1–9 unchanged · **10 Silent e** (Book 7 hearts `does, done, give, live, love`, then a-e / i-e / o-e / u-e / e-e with cap/cape-style pairs, 13 words including `these`, 8 sentences) · **11 Real Life** · **12 Bible**. Inserted after Starting blends, before Real Life (same style as v21/v22).
  Old item ids kept; `C.REAL_LIFE` is 11, `C.BIBLE` is 12. `#/level/6/signs`, `#/level/8/signs`, `#/level/10/signs`, and `#/level/4/menu` still work.
- **Silent e teaching:** VCe post-pass on `segments()` (`name` → n|a|m|e). Tapping the vowel plays the long-vowel clip; tapping final e says “This e is silent.” Blending highlights the vowel and e together and plays the long vowel once (does not say “silent” during the blend). Heart-word lookalikes (`give`, `live`, `love`, `does`, `done`, `come`, `some`, `have`, …) and r-controlled endings (`care`, `fire`) are not treated as VCe. `these` is th-voiced | long e | s as /z/ | silent e.
- **Long-vowel sounds** are temporary Kokoro clips (`patterns/a-e` … `e-e`), never phoneme spellings in TTS text. u-e is taught as /uː/ (tube, rule), not /juː/ (cute).
- **Images (inspected):** replaced the Words tile (Serbian-English dictionaries, `level-2.webp` removed) with `books.webp` (Auntieruth55, CC BY-SA 4.0, stack of history books). Replaced the Sentences tile (Wikipedia “ignore all rules” notebook, `level-3.webp` removed) with `writing.webp` (Petar Milošević, CC BY-SA 4.0, fountain pen on handwriting). Silent e home tile is `house.webp` (Carol M. Highsmith, Public domain, Lathrop House, Montrose, CO). `signs.webp` was a byte-identical copy of `level-4.webp` and was removed; Signs now reuses the already-reviewed `exit` photo; Real Life keeps the fingerpost. `tools/image-safety-test.mjs` forbids the removed files, allows the v23 cache prefix, and fails on duplicate image hashes.
- **Stall relabel:** if a clip in a stalled run was logged twice, every matching entry is marked `how:'stalled'` (was unique-key count).
- **Audio:** overrides for `live` (verb /lɪv/, speak `liv`), and end-punctuated `ride.`, `cape.`, `tube.`, `tub.`, `rule.` after a focused Whisper check. New cache **`read-aloud-v23-6a3ebd43`**.
- Tests: `tools/v23-levels-test.mjs` (order, ids, VCe segments, decodability, clips, migration, screenshots `screenshots/80-*-<390|320>.png`). `v22-levels-test` now uses `C.REAL_LIFE` / `C.BIBLE` / `C.levels.length`. Full suite passed (content, image-safety, match, rewards, tile-fit, sign-fit, listen-note, level1, v20–v23, smoke, clip, mic / mic-timeout / mic-robust). Do **not** push until Jeffrey says so.

## Previous (v22, rebased on v21.1 hotfix): Ending blends + Starting blends (Books 5–6)
- **New level order:** 1–7 unchanged · **8 Ending blends** (Book 5 hearts `from, your, one, come, some`, then 12 words and 8 sentences) · **9 Starting blends** (Book 6 hearts `again, could, would, should, who`, then -es/-ed/-ing, 10 blend words, 8 suffix words, 8 sentences) · **10 Real Life** · **11 Bible**. Inserted after Sounds together, before Real Life (same style as v21).
  Old item ids kept; `C.REAL_LIFE` is 10, `C.BIBLE` is 11. `#/level/6/signs`, `#/level/8/signs`, and `#/level/4/menu` still work.
- **Carries the v21.1 image and -s intro fixes.** Level 8 home tile does not use the removed tent photo (reuses `map`). The word `camp` uses ⛺, not a photo. `-ed` intro speaks “E D at the end of a word can make three sounds.” then plays `letters/t`, `letters/d`, and `patterns/ed-id`.
- **L5 rent/milk/help** still show blend tiles (`r-e-nt`, etc.). Left as they are; Jeffrey’s call whether Everyday should stay letter-by-letter.
- **Hardening:** `route()` always calls `S.setNoTts(false)` so a letter/pattern silent flag cannot leak. `level1-test` waits 4 s (was 2.5 s) for “tap the big letter plays M”.
- **Grapheme tiles:** ending/starting blends stay together (`last` is l-a-st, `strap` is str-a-p). Suffixes `-es`, `-ed` (3 sounds), `-ing` only after a 3+ letter stem, so `red` stays r-e-d and `ring` stays r-i-ng. Doubled consonants (`grabbed` → gr-a-bb-ed). `-ed` /t/ and /d/ reuse Whitney; /ɪd/ is a temporary Kokoro clip.
- **Pattern sounds:** more temporary Kokoro clips in `audio/patterns/` (st, nt, …, str, es, ed-id, ing). Listed in `tools/audio/pattern-sounds-sources.md` for a human listen.
- Tests: `tools/v22-levels-test.mjs` (order, ids, segments, decodability, clips, migration, screenshots `screenshots/60-*-<390|320>.png`). `v21-levels-test` uses `C.REAL_LIFE` / `C.BIBLE`. `tools/image-safety-test.mjs` still applies.
- Cache **`read-aloud-v22-af890202`**. Not pushed. Needs a real-phone listen of the new blend/suffix phonemes, heart words (`one`, `who`, `could` / `would` / `should`), the rewritten `-ed` intro, and new sentences.

## Previous (v21.1 hotfix, branch `hotfix-v21-1`, from live 30a36f9): unsafe/mismatched photos + plural -s intro
- Removed lesson photos (emoji used instead): tent (unsafe; file deleted, never opened), sun (plain blue sky), van (colour-inverted stone cross), water (kids' Smurfs cartoon glass), fish (market crowd, no clear fish). Level 7 home tile now reuses `lamp`.
- Plural -s intro no longer puts "sss" / "zzz" in spoken text. `introParts` play `letters/s` and `letters/z`. New clip for the stem "S at the end of a word can say".
- Cache **`read-aloud-v21-1-447c7bda`**. Test: `tools/image-safety-test.mjs`; screenshots `screenshots/70-*-<390|320>.png`. Do not push until Jeffrey says so.

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
