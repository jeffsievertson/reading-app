# Pattern / digraph sounds (v21)

Temporary Kokoro-82M `af_heart` cuts, one file per sound under `audio/patterns/`.
Mapped in `audio/clips.json` as `patterns.sh`, `patterns.ch`, `patterns.th`,
`patterns.th-voiced`, `patterns.wh`, `patterns.ng` (clip names `patterns/<id>`).

To swap in Whitney's recordings later: replace each file and point the same
`patterns` key at the new path. Do not change `letters/` (her A–Z clips).

| id | Sound | Keyword | How it was made | Swap note |
|---|---|---|---|---|
| sh | /ʃ/ | shop | Kokoro cut, Nov 21, 2026 | replace `audio/patterns/sh-*.mp3` |
| ch | /tʃ/ | chip | Kokoro cut, Nov 21, 2026 | replace `audio/patterns/ch-*.mp3` |
| th | /θ/ | path | Kokoro cut, Nov 21, 2026 | voiceless th |
| th-voiced | /ð/ | that | Kokoro cut, Nov 21, 2026 | voiced th |
| wh | /w/ | when | Kokoro cut, Nov 21, 2026 | taught as /w/ (US) |
| ng | /ŋ/ | ring | Kokoro cut, Nov 21, 2026 | not /n/ + /g/ |

Recipe details are written into `tools/audio/build-report.json` under `patterns`.

# Ending / starting blends and suffixes (v22)

Temporary Kokoro-82M `af_heart` phoneme clips for the new units. Same swap path as the
digraphs: replace the file and keep the `patterns/<id>` key. Do not change `letters/`.

| id | Sound | Keyword | How it was made | Swap note |
|---|---|---|---|---|
| st, nt, nd, mp, nk, lk, lp | clusters | last, went, hand, jump, bank, milk, help | Kokoro phonemes, Nov 21, 2026 | ending blends |
| pl, tr, dr, fl, sl, gr, str | clusters | plan, truck, drop, flag, slip, grab, strap | Kokoro phonemes, Nov 21, 2026 | starting blends |
| es | /ɪz/ | boxes | Kokoro phonemes | suffix -es |
| ed-id | /ɪd/ | handed | Kokoro phonemes | suffix -ed /ɪd/; /t/ and /d/ reuse Whitney letters/t and letters/d |
| ing | /ɪŋ/ | fixing | Kokoro phonemes | suffix -ing |

These are listed for a human listen. Bots cannot hear them.
