"""Letter sounds cut out of real words ("carrier-word extraction").

TTS engines cannot say an isolated phoneme cleanly: spelled-out text ("sss") is read as
letter names, and raw IPA on its own gets an extra vowel ("tuh"). So we synthesize a
natural word from exact IPA, find the target sound with voicing / intensity / spectral
boundaries, cut it out, and lengthen sounds that can be held (s, m, f, ...).
All signal processing here is plain numpy + Praat (parselmouth) and runs on the CPU.
"""
import numpy as np, parselmouth
from parselmouth.praat import call
from engines import synth, trim, fade, silence, SR

# ---------------------------------------------------------------- analysis helpers
def frames(x, hop=0.005, win=0.02):
    h, w = int(SR * hop), int(SR * win)
    return [(i, x[i:i + w]) for i in range(0, max(1, len(x) - w), h)]

def voicing(x):
    snd = parselmouth.Sound(x.astype(np.float64), SR)
    p = snd.to_pitch(time_step=0.005, pitch_floor=70, pitch_ceiling=500)
    f0 = p.selected_array['frequency']
    t = np.array([p.get_time_from_frame_number(i + 1) for i in range(len(f0))])
    return t, f0 > 0

def voiced_at(t, v, sec):
    if not len(v): return False
    return bool(v[min(np.searchsorted(t, sec), len(v) - 1)])

def band_ratio(seg, lo=1000, hi=5000):
    if len(seg) < 64: return 0.0
    s = np.abs(np.fft.rfft(seg * np.hanning(len(seg)))) ** 2
    f = np.fft.rfftfreq(len(seg), 1 / SR)
    return float(s[(f >= lo) & (f < hi)].sum() / (s.sum() + 1e-12))

def rms_db(seg): return 20 * np.log10(np.sqrt(np.mean(seg ** 2) + 1e-12))

def formants(x):
    """Median F1/F2/F3 over voiced frames (Hz)."""
    snd = parselmouth.Sound(x.astype(np.float64), SR)
    if snd.duration < 0.08: return None, None, None
    fm = snd.to_formant_burg(max_number_of_formants=5, maximum_formant=5500)
    t, v = voicing(x)
    ts = [tt for tt, vv in zip(t, v) if vv]
    if not ts: return None, None, None
    out = []
    for k in (1, 2, 3):
        vals = [fm.get_value_at_time(k, tt) for tt in ts]
        vals = [q for q in vals if q == q]
        out.append(float(np.median(vals)) if vals else None)
    return tuple(out)

# ---------------------------------------------------------------- shaping helpers
def lengthen(x, target_ms):
    """Praat overlap-add lengthening (keeps pitch) in gentle passes."""
    for _ in range(6):
        cur = len(x) / SR * 1000
        if cur >= target_ms * 0.95: break
        snd = parselmouth.Sound(x.astype(np.float64), SR)
        factor = min(2.0, target_ms / cur)
        done = False
        for floor in (75, 100, 150, 200, 300):
            try:
                x = call(snd, 'Lengthen (overlap-add)', floor, 600, factor).values[0].astype(np.float32)
                done = True
                break
            except parselmouth.PraatError:
                continue
        if not done: break
    return x

def noise_extend(x, target_ms, chunk_ms=None, seed=1):
    """Lengthen a hiss (s, f, h, stop aspiration): keep the natural onset and release, and
    fill the middle with fresh noise shaped to the sound's own average spectrum.
    (Repeating chunks of a short hiss makes it periodic/buzzy; shaped noise doesn't.)"""
    n_target = int(SR * target_ms / 1000)
    if len(x) >= n_target or len(x) < 128: return x
    head_n = max(int(0.012 * SR), int(len(x) * 0.25))
    tail_n = max(int(0.012 * SR), int(len(x) * 0.2))
    mid = x[head_n: len(x) - tail_n]
    if len(mid) < 64: mid = x
    nfft = 1024
    # average magnitude spectrum of the steady part (Welch-style)
    segs = [mid[i:i + nfft] for i in range(0, max(1, len(mid) - nfft // 2), nfft // 4)]
    spec = np.zeros(nfft // 2 + 1)
    for sg in segs:
        sg = np.pad(sg, (0, nfft - len(sg)))
        spec += np.abs(np.fft.rfft(sg * np.hanning(nfft)))
    spec /= max(1, len(segs))
    k = 9; spec = np.convolve(spec, np.ones(k) / k, mode='same')   # smooth envelope
    body_len = max(int(0.03 * SR), n_target - head_n - tail_n)
    rng = np.random.default_rng(seed)
    n_full = 1 << int(np.ceil(np.log2(body_len + 2 * nfft)))
    white = rng.standard_normal(n_full)
    W = np.fft.rfft(white)
    env = np.interp(np.linspace(0, 1, len(W)), np.linspace(0, 1, len(spec)), spec)
    body = np.fft.irfft(W * env, n_full)[nfft: nfft + body_len].astype(np.float32)
    r = lambda a: np.sqrt(np.mean(a ** 2) + 1e-12)
    body *= r(mid) / r(body)
    xf = int(0.01 * SR)
    head, tail = x[:head_n].copy(), x[len(x) - tail_n:].copy()
    ramp = np.linspace(0, 1, xf).astype(np.float32)
    out = np.concatenate([head[:-xf], head[-xf:] * ramp[::-1] + body[:xf] * ramp, body[xf:-xf],
                          body[-xf:] * ramp[::-1] + tail[:xf] * ramp, tail[xf:]])
    return out.astype(np.float32)

def loud(x, target_db=-17.0, peak=0.97):
    """Loudness-normalize, never exceeding the peak (short stops end up peak-limited)."""
    if not len(x): return x
    g = min(10 ** ((target_db - rms_db(x)) / 20), peak / (np.max(np.abs(x)) + 1e-9))
    return (x * g).astype(np.float32)

def word(voice, ph):
    return trim(synth(voice, ph=ph), thresh_db=-40, pad_ms=0)

# ---------------------------------------------------------------- extractors
def initial_unvoiced(voice, ph, target_ms=None, breathy_ms=None):
    """Everything before the vowel starts: s, f, h, t, p, k (+ aspiration)."""
    x = word(voice, ph)
    t, v = voicing(x)
    if not v.any(): seg = x
    else:
        onset = t[np.argmax(v)] - 0.012
        seg = x[: max(int(onset * SR), int(0.02 * SR))]
    seg = trim(seg, thresh_db=-35, pad_ms=4)
    if target_ms: seg = noise_extend(seg, target_ms)
    if breathy_ms: seg = noise_extend(seg, breathy_ms, chunk_ms=12)
    return fade(seg, 20 if (target_ms or breathy_ms) else 6)

def final_unvoiced(voice, ph):
    """Everything after the last voiced frame: the 'ks' of box."""
    x = word(voice, ph)
    t, v = voicing(x)
    idx = np.where(v)[0]
    if not len(idx): return x
    off = t[idx[-1]] + 0.01
    seg = trim(x[int(off * SR):], thresh_db=-35, pad_ms=4)
    return fade(seg, 10)

def vowel_nucleus(voice, ph, target_ms=360, keep=(0.15, 0.8)):
    x = word(voice, ph)
    t, v = voicing(x)
    idx = np.where(v)[0]
    if not len(idx): return x
    a, b = t[idx[0]], t[idx[-1]]
    a, b = a + (b - a) * keep[0], a + (b - a) * keep[1]
    seg = lengthen(x[int(a * SR): int(b * SR)], target_ms)
    return fade(seg, 30)

def initial_voiced_cont(voice, ph, target_ms=550, rise_db=5.0, ratio_jump=True):
    """Voiced consonant at the start (m, n, l, v, z, r): from voicing onset until the
    vowel opens (intensity rises and/or 1-5 kHz energy jumps)."""
    x = word(voice, ph)
    t, v = voicing(x)
    fr = frames(x)
    vs = [voiced_at(t, v, i / SR) for i, _ in fr]
    k0 = next((k for k, b in enumerate(vs) if b), 0)
    db = [rms_db(s) for _, s in fr]
    rs = [band_ratio(s) for _, s in fr]
    base_db = float(np.median(db[k0:k0 + 6]))
    base_r = float(np.median(rs[k0:k0 + 6]))
    thr_r = max(0.03, 3 * base_r + 0.015)
    k1 = None
    for k in range(k0 + 4, len(fr)):
        if db[k] > base_db + rise_db or (ratio_jump and rs[k] > thr_r):
            k1 = k; break
    if k1 is None: k1 = min(len(fr) - 1, k0 + 16)
    seg = x[fr[k0][0]: max(fr[k0][0] + int(0.03 * SR), fr[k1][0] - int(0.012 * SR))]
    return fade(lengthen(seg, target_ms), 30)

def final_voiced_cont(voice, ph, target_ms=550, drop_db=4.0):
    """Voiced consonant at the end (…m, …n, …l): after the vowel's energy/brightness drops."""
    x = word(voice, ph)
    t, v = voicing(x)
    fr = frames(x)
    vs = [voiced_at(t, v, i / SR) for i, _ in fr]
    last = max((k for k, b in enumerate(vs) if b), default=len(fr) - 1)
    rs = [band_ratio(s) for _, s in fr]
    tail = rs[max(0, last - 6): last + 1]
    thr = max(0.03, 3 * float(np.median(tail)) + 0.015)
    k_end = max((k for k in range(0, last) if rs[k] > thr), default=0)
    a = fr[min(k_end + 3, last)][0]
    b = fr[last][0] + int(0.015 * SR)
    return fade(lengthen(x[a:b], target_ms), 30)

def clipped_onset(voice, ph, keep_voiced_ms=45, fade_ms=25, loud_db=12):
    """Voiced stops / affricates / glides that cannot be held (b, d, g, j, w, y, q):
    keep the release plus just a sliver of the vowel, then fade fast - a clipped 'b',
    not 'buh'."""
    x = word(voice, ph)
    t, v = voicing(x)
    fr = frames(x)
    # first frame that is voiced AND loud (vowel-ish); pre-voicing murmur stays in
    db = [rms_db(s) for _, s in fr]
    peak = max(db)
    k_on = next((k for k, (i, s) in enumerate(fr) if voiced_at(t, v, i / SR) and db[k] > peak - loud_db), 0)
    end = fr[k_on][0] + int(keep_voiced_ms / 1000 * SR)
    seg = x[:end]
    seg = seg.copy()
    n = min(int(fade_ms / 1000 * SR), len(seg) // 2)
    seg[-n:] *= np.linspace(1, 0, n) ** 2
    return fade(seg, 4)

def glide_onset(voice, ph, dur_ms=160, fade_ms=60):
    """w, y: voiced from the very start; keep the first part of the glide and fade."""
    x = word(voice, ph)
    t, v = voicing(x)
    on = t[np.argmax(v)] - 0.01 if v.any() else 0
    a = max(0, int(on * SR))
    seg = x[a: a + int(dur_ms / 1000 * SR)].copy()
    n = min(int(fade_ms / 1000 * SR), len(seg) // 2)
    seg[-n:] *= np.linspace(1, 0, n) ** 2
    return fade(seg, 4)

# Reference short-vowel formants (adult female, Peterson & Barney 1952 / Hillenbrand 1995 ranges)
VOWEL_REF = {'æ': (860, 2050), 'ɪ': (480, 2370), 'ɛ': (680, 2150), 'ɑ': (900, 1350), 'ʌ': (760, 1420)}
def vowel_score(ipa):
    r1, r2 = VOWEL_REF[ipa]
    def sc(x):
        f1, f2, _ = formants(x)
        if not f1 or not f2: return 1e9
        return ((f1 - r1) / r1) ** 2 + ((f2 - r2) / r2) ** 2
    return sc

def hiss_score(x):
    t, v = voicing(x) if len(x) / SR > 0.07 else (np.array([0]), np.array([False]))
    return -band_ratio(x, 4000, 11000) + 2.0 * float(np.mean(v))

def murmur_score(x):
    rs = [band_ratio(s) for _, s in frames(x) if np.sqrt(np.mean(s ** 2)) > 0.02]
    return float(np.median(rs)) if rs else 1.0

def best(cands, score):
    scored = [(score(c), i, c) for i, c in enumerate(cands)]
    scored.sort(key=lambda z: z[0])
    return scored[0][2], scored[0][0], scored[0][1]

# ---------------------------------------------------------------- the 26 letters
def r_colour(x):
    _, _, f3 = formants(x)
    return f3 if f3 else 9999

VOWELS = {
    'a': ('æ', ['ˈæt', 'kˈæt', 'sˈæt', 'mˈæp']),
    'i': ('ɪ', ['ˈɪt', 'sˈɪt', 'pˈɪn', 'bˈɪɡ']),
    'o': ('ɑ', ['hˈɑt', 'ˈɑn', 'tˈɑp', 'dˈɑɡ']),
    'e': ('ɛ', ['ˈɛɡ', 'ˈɛt', 'bˈɛd', 'tˈɛn']),
    'u': ('ʌ', ['ˈʌp', 'kˈʌp', 'sˈʌn', 'bˈʌs']),
}

def make_letter(voice, l):
    """Returns (audio, recipe-description)."""
    V = voice
    if l in ('s', 'f'):
        carriers = {'s': ['sˈʌn', 'sˈæt', 'sˈɪt'], 'f': ['fˈʌn', 'fˈæn', 'fˈɪʃ']}[l]
        cands = [initial_unvoiced(V, c, 650 if l == 's' else 600) for c in carriers]
        x, sc, i = best(cands, hiss_score)   # most high-frequency hiss, least voicing
        return x, f"start of '{carriers[i]}', hiss lengthened"
    if l == 'h': return initial_unvoiced(V, 'hˈæt', 280), "start of 'hat' (breath)"
    if l == 't':
        c = [initial_unvoiced(V, p, breathy_ms=170) for p in ('tˈɑp', 'tˈɪp')]
        return max(c, key=len), "start of 'top'/'tip', burst + breathy aspiration"
    if l == 'p':
        c = [initial_unvoiced(V, p, breathy_ms=170) for p in ('pˈɑt', 'pˈɪt', 'pˈæn')]
        return max(c, key=len), "start of 'pot'/'pit'/'pan', burst + breathy aspiration"
    if l in ('c', 'k'):
        c = [initial_unvoiced(V, p, breathy_ms=170) for p in ('kˈʌp', 'kˈɪt')]
        return max(c, key=len), "start of 'cup'/'kit', burst + breathy aspiration"
    if l in VOWELS:
        ipa, carriers = VOWELS[l]
        cands = [vowel_nucleus(V, c) for c in carriers]
        x, sc, i = best(cands, vowel_score(ipa))
        return x, f"vowel /{ipa}/ cut from '{carriers[i]}' (closest formants to reference), lengthened"
    if l in ('m', 'n'):
        cands = [initial_voiced_cont(V, f'{l}ˈæp', 600), initial_voiced_cont(V, f'{l}ˈɑt', 600),
                 final_voiced_cont(V, f'ˈʌ{l}', 600), final_voiced_cont(V, f'hˈʌ{l}', 600)]
        x, sc, i = best(cands, murmur_score)
        return x, f"hum cut from {['start of '+l+'ap','start of '+l+'ot','end of u'+l,'end of hu'+l][i]}, lengthened"
    if l == 'l':
        cands = [initial_voiced_cont(V, 'lˈæp', 500), initial_voiced_cont(V, 'lˈɑt', 500),
                 final_voiced_cont(V, 'fˈɪl', 500), final_voiced_cont(V, 'bˈɛl', 500)]
        x, sc, i = best(cands, murmur_score)
        return x, f"'l' cut from {['start of lap','start of lot','end of fill','end of bell'][i]}, lengthened"
    if l == 'r':
        cands = [vowel_nucleus(V, 'hˈɜɹ', 520, keep=(0.3, 0.9)), vowel_nucleus(V, 'fˈɜɹ', 520, keep=(0.3, 0.9)),
                 initial_voiced_cont(V, 'ɹˈʌn', 520, rise_db=4)]
        x, sc, i = best(cands, r_colour)
        return x, f"'rrr' from {['her','fur','start of run'][i]} (lowest F3 = most r-like), lengthened"
    if l == 'v': return initial_voiced_cont(V, 'vˈæn', 500, ratio_jump=False), "start of 'van', lengthened"
    if l == 'z': return initial_voiced_cont(V, 'zˈɪp', 550, ratio_jump=False), "start of 'zip', lengthened"
    if l == 'b': return clipped_onset(V, 'bˈʌɡ'), "start of 'bug', clipped"
    if l == 'd': return clipped_onset(V, 'dˈʌɡ'), "start of 'dug', clipped"
    if l == 'g': return clipped_onset(V, 'ɡˈʌm'), "start of 'gum', clipped"
    if l == 'j': return clipped_onset(V, 'dʒˈʌmp', 45, 25, loud_db=6), "start of 'jump', clipped"
    if l == 'w': return glide_onset(V, 'wˈɛt', 170), "start of 'wet' (glide), clipped"
    if l == 'y': return glide_onset(V, 'jˈɛs', 160), "start of 'yes' (glide), clipped"
    if l in ('q', 'qu'): return clipped_onset(V, 'kwˈɪk', 60, 35, loud_db=6), "start of 'quick' (kw), clipped"
    if l == 'x': return final_unvoiced(V, 'bˈɑks'), "end of 'box' (ks)"
    raise ValueError(l)

def finish_letter(x):
    x = loud(x, -16.0)
    return np.concatenate([silence(40), x, silence(100)]).astype(np.float32)
