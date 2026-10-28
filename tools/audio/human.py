"""Letter sounds from Whitney's alphabet pronunciation recording.

Source: tools/audio/human/whitney-alphabet-pronunciations.m4a
(arranged by Jeffrey Sievertson for this app; voice talent Whitney, Oct 2026).
See whitney-sounds-sources.md for per-letter timestamps and LICENSES.md for attribution.

Each lesson still uses Kokoro for the frame ("This is the letter E. It makes the sound…")
then plays this human phoneme clip twice. Q is /kw/ (she said "qua"), not the letter name "cue".

Historical note: earlier builds used Wikimedia Commons clips (Isotalo / Denelson83 / Octane);
those .ogg files remain under tools/audio/human/ for reference but are no longer cut into
audio/human/letters/.
"""
import os, subprocess, tempfile, wave
import numpy as np
from engines import fade, silence, SR
from phonics import lengthen, noise_extend

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'human')
SOURCE = 'whitney-alphabet-pronunciations.m4a'

# Hand-mapped phoneme windows (seconds) on the Whitney take — second sound take when available.
# Verified with silence chunking + Whisper small.en + spectrograms (2026-10-27 evening).
CUTS = {
    'a': (5.97, 6.64),     # /æ/
    'b': (14.40, 14.70),   # /b/
    'c': (21.55, 21.78),   # /k/
    'd': (28.70, 28.95),   # /d/
    'e': (35.20, 35.48),   # /ɛ/ (short — lengthened)
    'f': (41.90, 42.42),   # /f/
    'g': (48.72, 49.10),   # /g/
    'h': (53.68, 54.08),   # /h/
    'i': (61.94, 62.22),   # /ɪ/ (short — lengthened)
    'j': (71.88, 72.20),   # /dʒ/
    'k': (77.96, 78.35),   # /k/
    'l': (83.70, 84.08),   # /l/ (short — lengthened)
    'm': (89.36, 89.70),   # /m/ (short — lengthened)
    'n': (94.90, 95.68),   # /n/
    'o': (106.23, 107.12), # /ɑ/~/oʊ/
    'p': (117.80, 118.18), # /p/
    'q': (123.22, 123.70), # /kw/ ("qua")
    'r': (128.60, 129.00), # /ɹ/ (short — lengthened)
    's': (134.32, 134.85), # /s/
    't': (140.52, 140.92), # /t/
    'u': (149.42, 150.11), # /ʌ/
    'v': (155.35, 155.95), # /v/
    'w': (161.22, 161.65), # /w/
    'x': (167.08, 167.78), # /ks/
    'y': (173.32, 173.98), # /j/
    'z': (179.55, 180.10), # /z/ (lengthened)
}

# Continuants / short vowels to stretch toward app clip lengths (ms).
LENGTHEN_MS = {
    'a': 400, 'e': 400, 'i': 400, 'o': 400, 'u': 400,
    'l': 450, 'm': 450, 'n': 450, 'r': 450, 'v': 420, 'z': 450,
    'f': 480, 's': 480, 'h': 450,
}

_cache = None

def _load_source():
    global _cache
    if _cache is not None:
        return _cache
    src = os.path.join(DIR, SOURCE)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f:
        wav = f.name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', src,
                    '-ac', '1', '-ar', str(SR), '-c:a', 'pcm_s16le', wav], check=True)
    with wave.open(wav) as w:
        x = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.0
    os.remove(wav)
    _cache = x.astype(np.float32)
    return _cache

def cut(a, b, fin=6, fout=30):
    x = _load_source()[int(a * SR): int(b * SR)].copy()
    if not len(x):
        raise ValueError(f'empty cut {a}-{b}')
    n = min(int(fout / 1000 * SR), max(1, len(x) // 2))
    x[-n:] *= np.linspace(1, 0, n) ** 2
    m = min(int(fin / 1000 * SR), max(1, len(x) // 2))
    x[:m] *= np.linspace(0, 1, m)
    return x

def vowel_center(a, b, ms=400):
    """Take the voiced middle of a vowel window, ~ms long."""
    x = cut(a, b, fin=10, fout=20)
    e = np.convolve(x ** 2, np.ones(240) / 240, 'same')
    on = np.where(e > e.max() * 10 ** (-30 / 10))[0]
    if len(on):
        x = x[on[0]: on[-1] + 1]
    mid = len(x) // 2
    h = int(ms / 2000 * SR)
    x = x[max(0, mid - h): mid + h].copy()
    return fade(x, 40)

def hold(x, ms):
    return fade(lengthen(x, ms), 25)

def make_one(l):
    a, b = CUTS[l]
    # Stops / affricates: tight fade-in so the burst isn't softened away
    stops = set('bcdgjkpqtx')
    fin, fout = (2, 40) if l in stops else (8, 35)
    if l in 'aeiou':
        target = LENGTHEN_MS.get(l, 400)
        x = vowel_center(a, b, min(target, int((b - a) * 1000)))
        if len(x) / SR * 1000 < target * 0.9:
            x = hold(x, target)
        # trim over-long nuclei
        max_n = int(target / 1000 * SR * 1.15)
        if len(x) > max_n:
            mid = len(x) // 2; h = max_n // 2
            x = fade(x[mid - h: mid + h].copy(), 40)
        how = f"Whitney vowel [{l}] {a:.2f}-{b:.2f}s, centred"
    elif l in 'fs':
        x = cut(a, b, fin=15, fout=40)
        x = fade(noise_extend(x, LENGTHEN_MS[l]), 20)
        how = f"Whitney [{l}] hiss {a:.2f}-{b:.2f}s, noise-extended"
    elif l == 'h':
        x = cut(a, b, fin=20, fout=50)
        if LENGTHEN_MS.get(l):
            x = fade(noise_extend(x, LENGTHEN_MS[l]), 25)
        how = f"Whitney [h] {a:.2f}-{b:.2f}s"
    elif l in LENGTHEN_MS and l in 'lmnrvz':
        x = cut(a, b, fin=fin, fout=fout)
        target = LENGTHEN_MS[l]
        if len(x) / SR * 1000 < target * 0.9:
            x = hold(x, target)
        else:
            # already long enough — gently fade; trim if far over target
            max_n = int(target / 1000 * SR * 1.2)
            if len(x) > max_n:
                mid = len(x) // 2; h = max_n // 2
                x = x[mid - h: mid + h].copy()
            x = fade(x, 25)
        how = f"Whitney [{l}] {a:.2f}-{b:.2f}s, lengthened"
    else:
        x = cut(a, b, fin=fin, fout=fout)
        how = f"Whitney [{l}] {a:.2f}-{b:.2f}s"
    if l == 'q':
        how = f"Whitney /kw/ (“qua”) {a:.2f}-{b:.2f}s"
    return x.astype(np.float32), how

RECIPES = {l: ((lambda L=l: make_one(L)[0]), f"Whitney {l}") for l in CUTS}

# Replace recipe text with the detailed how-string at make time
def make_letter(l):
    return make_one(l)

def source_hash():
    import hashlib
    h = hashlib.sha1(open(__file__, 'rb').read())
    h.update(open(os.path.join(DIR, SOURCE), 'rb').read())
    return h.hexdigest()[:8]
