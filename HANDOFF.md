# Handoff – Read Aloud (Oct 27, 2026)

## Latest (v13): mic-check UX
- Say-it with mic: **"Tap the mic, then say it out loud. The app will check."** (sentence/verse variants). 👍 is **not** the primary finish.
- Soft fails (wrong match / no-speech): keep “Not quite. Listen.” / “Try again.” After **2** soft fails, 👍 appears as **Continue anyway**. Hard mic failure / iOS-standalone dead recognizer still drops mic → no-mic thumbs-up path.
- Optional scoring: if Continue anyway is tapped and a recent listen result matches, that transcript is credited (`Yes. You read it.`) instead of a free `Got it.`
- Kokoro clips rebuilt for new lines (`AUDIO_VERSION` e5efd8e0). Cache **`read-aloud-v13-`**. Tests: `tools/mic-test.mjs`, `tools/mic-robust-test.mjs` (+ clip-test say-it expectations).

## Still true (v12)
Adult tone + 42 lesson WebPs. Human Wikimedia letter sounds — leave alone (Jeffrey may replace later). Live: https://jeffsievertson.github.io/reading-app/

## Next
Whitney’s longer write-up when it arrives. On phone: open twice for v13; confirm mic must match before Continue anyway appears.
