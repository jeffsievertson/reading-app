# Handoff – Read Aloud (Oct 27, 2026)

## Latest (v15): past-tense “read” = /rɛd/
- Success clip “Yes. You read it.” (and long-press “Thumbs up: I read it”) kept that wording;
  Kokoro synth input overridden to “Yes. You red it.” / “Thumbs up: I red it” via
  `tools/audio/overrides.json` (same TTS-only respelling pattern as other fixes).
  Phone fallback uses `tts: ['Yes.','You','red','it.'].join(' ')`. Present-tense “Read it…”
  lines unchanged. Cache **`read-aloud-v15-`** (audio `8d7cf99c`).

## Still true
- v14: item-tile scale-to-fit (Signs/Menu/Forms/L2/Word Bank); `screenshots/29-signs-tiles-fit.png`.
- v13 mic-check UX; v12 adult tone + imagery. Human letter sounds — leave alone.

Live: https://jeffsievertson.github.io/reading-app/

## Next
Whitney’s longer write-up. On phone: hard-refresh twice for v15; confirm success line sounds like “red.”
