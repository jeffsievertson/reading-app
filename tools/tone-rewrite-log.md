# Tone rewrite log (Whitney feedback)

Checked: `js/content.js`, `js/app.js`, `js/rewards.js`, `js/speech.js`, `index.html`.
Date: 2026-10-26. Spoken lines that changed need a new Kokoro clip (rebuilt with `build_audio.py`).

## Rewrites

| File | Before | After | Why |
|---|---|---|---|
| app.js | Welcome. This app will help you learn to read, one sound at a time. | Welcome. This app teaches reading, one sound at a time. | Less “helper talking down”; plain adult statement |
| app.js | You finished everything. Great work. Pick any level to practice again. | You finished everything. Pick any level to go over again. | Dropped cheerleading “Great work” |
| app.js | You finished everything. Great work. | You finished everything. | Same |
| app.js | Yes! | Yes. | Short confirmation, not cheer |
| app.js | Yes! You read it. | Yes. You read it. | Same |
| app.js | Great. | Got it. | Adult acknowledgment |
| app.js | Great job. Tap play for the next one. … | Done. Tap play for the next one. … | Calm done-state, no “job” praise |
| app.js | Great job. Tap play for the next one. | Done. Tap play for the next one. | Same |
| app.js | Amazing. You finished this whole part. Tap play for the next one. | You finished this section. Tap play for the next one. | “Amazing” is over-cheer |
| app.js | …tap the puzzle button… / …tap the puzzle… | …tap Sound it out… | Matches the button; “puzzle” reads kid-app |
| app.js | ⭐ badge on sight words | • badge | Stars-as-praise |
| app.js | 🏆 on section complete | ✓ (same as other done) | Trophy reads kid-reward |

## Left alone (adult / fine)

- Milestone lines in `rewards.js` (“That’s 25 words. Real progress.”, “Solid work.”, etc.) — Whitney cited these as the right tone.
- “Not that one. Try again.” / “Not quite. Listen.” / “I did not hear you…” — clear, not patronizing.
- “This is a tricky word. Just remember it.” — factual.
- “Keep going” on the home play button — common adult UI (fitness apps); not baby talk.
- Letter intros (“This is the letter E. It makes the sound…”) — instructional, needed.
- Content sentences like “Was it fun? Yes!” — reading material, not app praise.
- Level/category names and sign/menu/form meanings — practical, adult.
- Settings / erase / mic lines — neutral.

## speech.js / index.html / content.js

No patronizing UI copy found. `content.js` emoji keywords stay (visual cues; imagery work adds photos alongside). Human letter-sound clips untouched.
