# Handoff – Read Aloud (Oct 26, 2026)

## Latest (v12): Whitney tone + adult imagery
- **Tone:** Audited UI/spoken copy in `js/app.js` (also checked content/rewards/speech/index). Dropped kid cheer (“Great job”, “Amazing”, “Great work”, “Yes!”, “Great.”, star/trophy praise). Calm adult lines instead (“Done.”, “Got it.”, “You finished this section.”, “teaches reading”). Milestone praise in `rewards.js` left as-is. Log: `tools/tone-rewrite-log.md`. Regenerated Kokoro af_heart clips for changed lines (`AUDIO_VERSION` fd171bc8). Human letter clips untouched.
- **Imagery:** 42 adult WebP photos under `images/` (Wikimedia / Unsplash; see `tools/imagery-sources.md`, `LICENSES.md`). Wired via `img` on levels, L4 cats, concrete L2 words, signs, menu, and some letter keywords. CSS: `.tile-photo`, `.lesson-photo`, `.sign-photo`, etc. Gaps: abstract/function words, form fields, sight words — emoji/CSS only.
- Cache **`read-aloud-v12-`** + precache of `images/*.webp`. Screenshots: `screenshots/27-home-imagery.png`, `28-sign-stop-imagery.png`.

## Still true (v7–v11)
Rewards/streak/milestones; human Wikimedia letter sounds (Jeffrey may replace later — leave alone). Live: https://jeffsievertson.github.io/reading-app/

## Tests
`clip-test` now asserts tone-rewrite clip coverage + photos on home / L2-cat / STOP / L4 cats. content/match/rewards suites still pass.

## Next
Whitney’s longer write-up when it arrives. Optional: fill imagery gaps; custom letter recording when Jeffrey has it. On phone: open twice for v12 cache, check home photos + a sign lesson.
