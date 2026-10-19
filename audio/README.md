# Optional recorded sounds

Computer voices are bad at saying single letter *sounds* (they often say the letter
*name*, or a strange noise). For the best results a person can record real sounds.

1. Record short MP3 clips, e.g. `letters/s.mp3` saying "sss", `letters/a.mp3` saying the
   short "a" in *apple*. Record only the sound itself; the app adds the keyword
   around it ("sun … [your sss] … sun") and also plays it when a letter in a word is tapped.
2. Put them in this folder: `audio/letters/s.mp3`, `audio/letters/qu.mp3`, …
3. List each clip name (without `.mp3`) in `audio/clips.json`, e.g.
   `["letters/s", "letters/a"]`.
4. Add the files to the `ASSETS` list in `sw.js` and bump `CACHE` (e.g. `read-aloud-v2`)
   so they work offline.

Clips not listed in `clips.json` are never requested; the app falls back to the phone's
built-in voice. Only use recordings you made yourself or that you have the right to use.
