# Whitney letter sounds — source map

**Voice talent:** Whitney (recording arranged by Jeffrey Sievertson for Read Aloud).  
**Date recorded / received:** 2026-10-27 (evening; email subject “Alphabet pronunciations”).  
**Source file:** `tools/audio/human/whitney-alphabet-pronunciations.m4a` (also `assets/whitney-alphabet-pronunciations.m4a`)  
**Format:** AAC stereo 48 kHz → decoded mono 24 kHz for cuts. Duration ≈ 180.8 s.  
**License:** Created for this app; free to use in Read Aloud. Attribute Whitney as letter-sound voice talent.

## What she recorded

For each letter A–Z she typically said the **letter name** (twice) then the **phoneme/sound** (twice). We cut the **sound** take (preferring the clearer second take) for `audio/human/letters/`. Kokoro still speaks the intro frame (“This is the letter E. It makes the sound…”).

**Q:** She produced a /kw/ (“qua”), not the letter name “cue” and not “qu” as a digraph label — matches the teaching rule (Q = /kw/).

## Per-letter cut points (seconds on the source take)

| Letter | Start–end (s) | Phoneme | Notes |
|---|---|---|---|
| A | 5.97–6.64 | /æ/ | vowel, centred ~400 ms |
| B | 14.40–14.70 | /b/ | stop |
| C | 21.55–21.78 | /k/ | = K |
| D | 28.70–28.95 | /d/ | stop |
| E | 35.20–35.48 | /ɛ/ | short take, lengthened |
| F | 41.90–42.42 | /f/ | hiss, noise-extended |
| G | 48.72–49.10 | /g/ | stop |
| H | 53.68–54.08 | /h/ | breath, extended |
| I | 61.94–62.22 | /ɪ/ | short take, lengthened |
| J | 71.88–72.20 | /dʒ/ | affricate |
| K | 77.96–78.35 | /k/ | stop |
| L | 83.70–84.08 | /l/ | lengthened |
| M | 89.36–89.70 | /m/ | lengthened |
| N | 94.90–95.68 | /n/ | trimmed/lengthened |
| O | 106.23–107.12 | /ɑ/~/oʊ/ | vowel, centred |
| P | 117.80–118.18 | /p/ | stop (“pa”) |
| Q | 123.22–123.70 | /kw/ | “qua” |
| R | 128.60–129.00 | /ɹ/ | lengthened |
| S | 134.32–134.85 | /s/ | hiss, noise-extended |
| T | 140.52–140.92 | /t/ | stop |
| U | 149.42–150.11 | /ʌ/ | vowel, centred |
| V | 155.35–155.95 | /v/ | lengthened |
| W | 161.22–161.65 | /w/ | glide |
| X | 167.08–167.78 | /ks/ | fricative cluster |
| Y | 173.32–173.98 | /j/ | glide |
| Z | 179.55–180.10 | /z/ | lengthened |

## Gaps

None — all 26 letters have a usable Whitney phoneme take. (Older Wikimedia clips are no longer wired through `clips.json`.)

## Build

`tools/audio/human.py` → `make_letter()` → `phonics.finish_letter()` (−16 dB RMS + pads) → `audio/human/letters/<l>-<hash>.mp3`.
