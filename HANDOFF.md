# Handoff – Read Aloud rewards (Oct 23, 2026)

## Goal
Motivate Adam (adult, learning to read) with grown-up rewards: a word bank, a gentle daily
streak, and milestones he can share with Jeffrey himself. No kid tone, big buttons, all readable aloud.

## Decisions
- **Mastered** = lesson completed (`readAloud.v1` → `done[id]` set), the same rule as the ✓ marks.
- **Word bank** = Level 2 words, Level 3 tricky words (incl. "I"), Level 4 signs + menu.
  Not letters, sentences, form labels or verses. Keyed lowercase (sign "STOP" = "stop").
  Backfilled from existing progress on first load. Max today: 63 words.
- **Streak**: local calendar day; a day counts when any lesson item (incl. a repeat or a
  letter) is finished. 2 skips; a missed day uses one; +1 skip per 7 practiced days while
  below 2. More missed days than skips → "New start today", day 1 with skips full, best kept.
  Not backfilled (old progress only stores the last completion time per item).
- **Milestones** (25/50/100/250/500 words, 7/30 days) fire once, on the done screen, read aloud.
  Ones already passed at backfill are recorded silently (`shown:false`).
- **Tell Jeffrey** (approved Oct 23; number = team Google Voice): 💬 button on each milestone = `sms:+18127275260&body=…`
  (`?body=` on Android). Opens a pre-written text; Adam taps Send. No backend, nothing automatic.
- New spoken lines use the built-in voice (no new Kokoro clips).
- Erase progress also erases the word bank, streak and milestones.

## Key files
`js/rewards.js` (logic, key `readAloud.rewards.v1`), `js/app.js` (home stats, `#/words`,
done-screen milestone card), `css/styles.css` (end of file), `sw.js` (cache v8, precaches
rewards.js), `tools/rewards-test.mjs`, `screenshots/25-home-rewards.png`, `26-word-bank.png`.

## Open questions
- Only 63 bank words exist, so 100/250/500 can't fire until more content is added.
- Should finishing a *repeat* lesson count for the streak? (Currently yes.)
- Real-iPhone check of the sms: link and message wording.
- Kokoro clips for the new lines, if the built-in voice sounds off next to them.

## Next action
On Adam's iPhone: open the app twice to pick up cache v8, check the 📅/📚 rows, and test
💬 Tell Jeffrey on the next milestone (or with seeded data).
