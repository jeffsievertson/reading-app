"""Letter sounds from real human recordings (Wikimedia Commons, see human-sounds-sources.md).

Source files are kept unmodified in tools/audio/human/<letter>.ogg (exact Commons file
versions listed in human/sources.json). Each sound is cut out of the recording at hand-checked
times, faded, voiced continuants are gently lengthened (Praat overlap-add, pitch kept),
and the result is loudness-normalized by finish_letter(). x = /k/+/s/ and q = /k/+/w/ are
spliced from the same speaker. Licenses: CC BY-SA 3.0 (Peter Isotalo, Denelson83) and
public domain (Octane) - attribution in LICENSES.md.
"""
import os, subprocess, tempfile, wave
import numpy as np
from engines import fade, silence, SR
from phonics import lengthen

DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'human')

def load(name):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: wav = f.name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(DIR, name + '.ogg'),
                    '-ac', '1', '-ar', str(SR), '-c:a', 'pcm_s16le', wav], check=True)
    with wave.open(wav) as w: x = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.0
    os.remove(wav)
    return x.astype(np.float32)

def cut(name, a, b, fin=6, fout=30):
    x = load(name)[int(a * SR): int(b * SR)].copy()
    n = min(int(fout / 1000 * SR), len(x) // 2)
    x[-n:] *= np.linspace(1, 0, n) ** 2
    m = min(int(fin / 1000 * SR), len(x) // 2)
    x[:m] *= np.linspace(0, 1, m)
    return x

def vowel(name, ms=400):
    x = load(name)
    e = np.convolve(x ** 2, np.ones(240) / 240, 'same')
    on = np.where(e > e.max() * 10 ** (-30 / 10))[0]
    x = x[on[0]: on[-1]]
    mid = len(x) // 2; h = int(ms / 2000 * SR)
    x = x[max(0, mid - h): mid + h].copy()
    return fade(x, 40)

def join(*parts, xf_ms=8):
    out = parts[0]
    for p in parts[1:]:
        n = int(xf_ms / 1000 * SR)
        r = np.linspace(0, 1, n).astype(np.float32)
        out = np.concatenate([out[:-n], out[-n:] * r[::-1] + p[:n] * r, p[n:]])
    return out.astype(np.float32)

def hold(x, ms):
    return fade(lengthen(x, ms), 25)

# letter -> (function, short recipe text). Times are seconds in the Commons recording.
RECIPES = {
    'a': (lambda: vowel('a'), "vowel [æ] (Denelson83), centre 400 ms"),
    'e': (lambda: vowel('e'), "vowel [ɛ] (Denelson83), centre 400 ms"),
    'i': (lambda: vowel('i'), "vowel [ɪ] (Denelson83), centre 400 ms"),
    'o': (lambda: vowel('o'), "vowel [ɑ] (Denelson83), centre 400 ms"),
    'u': (lambda: vowel('u'), "vowel [ʌ] (Denelson83), centre 400 ms"),
    'b': (lambda: cut('b', 0.19, 0.265, 2, 35), "release of [ba] + sliver of vowel (Isotalo)"),
    'd': (lambda: cut('d', 0.19, 0.265, 2, 35), "release of [da] + sliver of vowel (Isotalo)"),
    'g': (lambda: cut('g', 0.645, 0.72, 2, 35), "release in [aɡa] + sliver of vowel (Isotalo)"),
    'k': (lambda: cut('sv-kon', 0.320, 0.50, 2, 60), "burst + aspiration from the start of Swedish 'kon' [kʰ] (Isotalo)"),
    'c': (lambda: cut('sv-kon', 0.320, 0.50, 2, 60), "= k: burst + aspiration from the start of Swedish 'kon' [kʰ] (Isotalo)"),
    'p': (lambda: cut('sv-pol', 0.124, 0.33, 2, 60), "burst + aspiration from the start of Swedish 'pol' [pʰ] (Isotalo)"),
    't': (lambda: cut('sv-tand', 0.141, 0.30, 2, 50), "burst + aspiration from the start of Swedish 'tand' [tʰ] (Isotalo)"),
    'j': (lambda: cut('j', 0.0, 0.21, 4, 50), "[dʒ] + sliver of vowel (Octane, public domain)"),
    'h': (lambda: cut('h', 0.19, 0.53, 30, 60), "breath of [ha] into the vowel onset (Isotalo)"),
    'f': (lambda: cut('f', 0.20, 0.52, 20, 40), "hiss of [afa] (Isotalo)"),
    's': (lambda: cut('s', 1.19, 1.47, 20, 40), "hiss of [asa] (Isotalo)"),
    'v': (lambda: hold(cut('v', 0.24, 0.46, 20, 30), 420), "buzz of [ava], lengthened (Isotalo)"),
    'z': (lambda: hold(cut('z', 0.22, 0.41, 20, 30), 450), "buzz of [za], lengthened (Isotalo)"),
    'l': (lambda: hold(cut('l', 0.20, 0.48, 20, 30), 450), "[l] of [la], lengthened (Isotalo)"),
    'm': (lambda: hold(cut('m', 0.20, 0.37, 20, 30), 450), "hum of [ma], lengthened (Isotalo)"),
    'n': (lambda: hold(cut('n', 0.24, 0.49, 20, 30), 450), "hum of [na], lengthened (Isotalo)"),
    'r': (lambda: hold(cut('r', 0.22, 0.54, 20, 30), 450), "[ɹ] of [ɹa], lengthened (Isotalo)"),
    'w': (lambda: cut('w', 0.01, 0.27, 10, 60), "glide of [wa] (Isotalo)"),
    'y': (lambda: cut('y', 0.22, 0.48, 10, 60), "glide of [ja] (Isotalo)"),
    'x': (lambda: join(cut('sv-kon', 0.320, 0.39, 2, 10), cut('s', 1.21, 1.46, 10, 40)), "/ks/: [k] release + [s] hiss spliced (Isotalo)"),
    'q': (lambda: join(cut('sv-kon', 0.320, 0.38, 2, 6), cut('w', 0.03, 0.27, 6, 60)), "/kw/: [k] release + [w] glide spliced (Isotalo)"),
}

def make_letter(l):
    f, how = RECIPES[l]
    return f(), how

def source_hash():
    import hashlib
    h = hashlib.sha1(open(__file__, 'rb').read())
    for n in sorted(os.listdir(DIR)):
        h.update(open(os.path.join(DIR, n), 'rb').read())
    return h.hexdigest()[:8]
