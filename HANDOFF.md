# Handoff – Read Aloud (Nov 2, 2026)

## Latest (v17): speak-then-wait note while the mic listens
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
