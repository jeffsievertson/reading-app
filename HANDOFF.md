# Handoff – Read Aloud (Oct 23, 2026)

## Latest change (v11): human letter sounds
- Level 1's 26 letter sounds are now real human recordings from Wikimedia Commons, not
  cuts from Kokoro words. The frame stays Kokoro af_heart: "This is the letter E. It makes
  the sound … eh … eh." The same files play in the intro, the 🔊 button, the big letter,
  and the Level 2 tiles and blending. Find-the-letter only says the prompt and keyword.
- Speakers: Peter Isotalo (CC BY-SA 3.0) for B C D F G H K L M N P Q R S T V W X Y Z,
  Denelson83 (CC BY-SA 3.0) for A E I O U, and Octane (public domain) for J.
  Only the original 2005–2006 file versions are used (GFDL license-migration cutoff).
  P, T and K come from the start of Swedish words (pol, tand, kon) so they are aspirated.
  X = k+s and Q = k+w are spliced.
- Sources and licenses: `tools/audio/human-sounds-sources.md`, `tools/audio/human/sources.json`,
  and `LICENSES.md`. Cuts are in `tools/audio/human.py`, with the originals in `tools/audio/human/`.
  `build_audio.py` uses them and falls back to `phonics.py` for any letter not in `RECIPES`.
- Listen: `/workspace/voice-samples/human-letter-sounds-all.mp3` (all 26 intros).

## Rewards (v7–v10, unchanged)
- Word bank (Level 2/3/4 words), daily streak with 2 skips, and milestones (25/50/100/250/500
  words, 7/30 days) shown once on the done screen. 💬 Tell Jeffrey = `sms:+18127275260`
  with a pre-written text, nothing automatic. The reward lines are Kokoro clips.
  Logic is in `js/rewards.js`. Tests: `tools/rewards-test.mjs`.

## Tests
`level1-test` now checks that every letter resolves to `human/letters/<l>-*.mp3` (clips.json,
precache list, build report, served) and that the intro, 🔊, big letter and tiles play it.
All 8 suites pass.

## Open questions
- Listen-check by a person: r (Swedish [ɹ]), j (different speaker), q/x (splices),
  b/d/g (short vowel sliver), h. Is a mix of speakers OK for Adam?
- Only 63 bank words exist, so the 100/250/500 milestones can't fire yet.
- Real-iPhone check of the sms link and the audio.

## Next action
On Adam's iPhone, open the app twice to pick up cache v11, then play a few letters (A, E, R, Q, X).
If any sound is wrong, edit its cut in `human.py` and rebuild.
