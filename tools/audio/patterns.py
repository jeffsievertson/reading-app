"""Kokoro cuts for v21 digraph sounds (sh, ch, th, th-voiced, wh, ng).

Each sound is one file under audio/patterns/, keyed in clips.json as patterns/<id>.
A later Whitney take is a file swap in that one place; do not change letter clips.

Temporary: cut from a Kokoro af_heart carrier word (same pipeline as the old
synthetic letter sounds). US English: wh is /w/.
"""
import phonics as P

# id -> (maker description used in the report)
def make_pattern(voice, pid):
    V = voice
    if pid == 'sh':
        carriers = ['ʃˈɑp', 'ʃˈɪp', 'fˈɪʃ']
        cands = [P.initial_unvoiced(V, c, 600) for c in carriers[:2]] + [P.final_unvoiced(V, carriers[2])]
        x, sc, i = P.best(cands, P.hiss_score)
        return x, f"sh cut from {['start of shop','start of ship','end of fish'][i]}, lengthened"
    if pid == 'ch':
        x = P.clipped_onset(V, 'tʃˈɪp', 50, 30, loud_db=6)
        return x, "start of 'chip', clipped"
    if pid == 'th':
        cands = [P.initial_unvoiced(V, 'θˈɪn', 500), P.final_unvoiced(V, 'pˈæθ')]
        x, sc, i = P.best(cands, P.hiss_score)
        return x, f"voiceless th cut from {['start of thin','end of path'][i]}"
    if pid == 'th-voiced':
        x = P.initial_voiced_cont(V, 'ðˈæt', 500, ratio_jump=False)
        return x, "start of 'that', lengthened"
    if pid == 'wh':
        x = P.glide_onset(V, 'wˈɛn', 170)
        return x, "start of 'when' (glide /w/), clipped"
    if pid == 'ng':
        cands = [P.final_voiced_cont(V, 'ɹˈɪŋ', 550), P.final_voiced_cont(V, 'sˈɪŋ', 550),
                 P.final_voiced_cont(V, 'lˈɔŋ', 550)]
        x, sc, i = P.best(cands, P.murmur_score)
        return x, f"ng cut from {['end of ring','end of sing','end of long'][i]}, lengthened"
    # v22 temporary cluster / suffix clips (Kokoro phonemes, trimmed). Swap later like digraphs.
    CLUSTERS = {
        'st':  ('st',  'st cluster (as in last, stop)'),
        'nt':  ('nt',  'nt cluster (as in went)'),
        'nd':  ('nd',  'nd cluster (as in hand)'),
        'mp':  ('mp',  'mp cluster (as in jump)'),
        'nk':  ('ŋk',  'nk cluster (as in bank, think)'),
        'lk':  ('lk',  'lk cluster (as in milk)'),
        'lp':  ('lp',  'lp cluster (as in help)'),
        'pl':  ('pl',  'pl cluster (as in plan)'),
        'tr':  ('tɹ',  'tr cluster (as in truck)'),
        'dr':  ('dɹ',  'dr cluster (as in drop)'),
        'fl':  ('fl',  'fl cluster (as in flag)'),
        'sl':  ('sl',  'sl cluster (as in slip)'),
        'gr':  ('ɡɹ',  'gr cluster (as in grab)'),
        'str': ('stɹ', 'str cluster (as in strap)'),
        'es':  ('ɪz',  'suffix -es /ɪz/ (as in boxes)'),
        'ed-id': ('ɪd', 'suffix -ed /ɪd/ (as in handed)'),
        'ing': ('ɪŋ',  'suffix -ing (as in fixing)')
    }
    LONG = {
        'a-e': ('eɪ', 'long a as in cape'),
        'i-e': ('aɪ', 'long i as in pine'),
        'o-e': ('oʊ', 'long o as in hope'),
        'u-e': ('uː', 'long u as in tube / rule'),
        'e-e': ('iː', 'long e as in these')
    }
    if pid in LONG:
        ph, note = LONG[pid]
        SR = __import__('engines').SR
        np = __import__('numpy')

        def voice_onset(x, thresh_db=-40):
            """Index of the first frame whose level is within thresh_db of the peak."""
            if not len(x):
                return 0
            fr = max(1, int(SR * 0.005))
            peak = float(np.max(np.abs(x))) + 1e-12
            for i in range(0, len(x), fr):
                rms = float(np.sqrt(np.mean(x[i:i + fr] ** 2) + 1e-12))
                if 20 * np.log10(rms / peak) > thresh_db:
                    return i
            return 0

        def fade_in_at(x, onset, ms=10):
            """10 ms ramp at the voice onset, not at sample 0 (which may be silence)."""
            x = x.copy()
            if onset > 0:
                x[:onset] = 0
            n = min(int(SR * ms / 1000), max(1, (len(x) - onset) // 4))
            if n > 0 and onset < len(x):
                x[onset:onset + n] *= np.linspace(0, 1, n).astype(x.dtype)
            return x

        def fade_out(x, ms=40):
            x = x.copy()
            n = min(int(SR * ms / 1000), max(1, len(x) // 4))
            if n > 0:
                x[-n:] *= np.linspace(1, 0, n).astype(x.dtype)
            return x

        def median_f2(fm, t, win=0.08):
            vals = []
            for tt in np.arange(t, min(t + win, fm.xs()[-1] if hasattr(fm, 'xs') else t + win), 0.01):
                v = fm.get_value_at_time(2, float(tt))
                if v == v:
                    vals.append(v)
            return float(np.median(vals)) if len(vals) >= 4 else None

        if pid == 'u-e':
            # Isolated Kokoro "uː" often starts with a /j/ glide ("you") and can
            # front again at the end. Keep only the steady low-F2 body, then
            # lengthen that body so the clip is a natural-length clean /uː/.
            raw = P.trim(__import__('engines').synth(voice, ph='uː', speed=0.65), thresh_db=-40, pad_ms=0)
            start = int(0.26 * SR)
            end = len(raw)
            try:
                import parselmouth
                snd = parselmouth.Sound(raw.astype(np.float64), SR)
                fm = snd.to_formant_burg(time_step=0.01, max_number_of_formants=5, maximum_formant=5500)
                dur = snd.duration
                times = np.arange(0.05, max(0.06, dur - 0.05), 0.01)
                start_t = None
                for t0 in times:
                    m = median_f2(fm, t0)
                    if m is not None and m < 1550:
                        start_t = t0
                        break
                if start_t is None:
                    start_t = 0.26
                start = int(start_t * SR)
                # Cut at the first later F2 rise (fronted off-glide), with a
                # short minimum body so we don't stop on a single noisy frame.
                end_t = dur
                min_end = start_t + 0.12
                for t0 in np.arange(start_t + 0.10, max(start_t + 0.11, dur - 0.03), 0.01):
                    m = median_f2(fm, t0)
                    if t0 >= min_end and m is not None and m > 1650:
                        end_t = t0
                        break
                end = int(end_t * SR)
            except Exception:
                end = start + int(0.22 * SR)
            x = raw[start:end]
            if len(x) < int(0.10 * SR) and len(raw) > start:
                x = raw[start:start + int(0.22 * SR)]
            # Natural isolated-vowel length, then a soft fade-out.
            if len(x) > 0:
                x = P.lengthen(x, 450)
            note = 'long u /uː/ from the steady low-F2 body of a Kokoro /uː/, trimmed before the fronted tail, lengthened (as in tube / rule)'
        else:
            synth = P.synth_ph if hasattr(P, 'synth_ph') else (lambda voice, ph: __import__('engines').synth(voice, ph=ph, speed=0.75))
            x = P.trim(synth(voice, ph), thresh_db=-45, pad_ms=0)
            if len(x) < int(0.35 * SR):
                x = P.trim(__import__('engines').synth(voice, ph=ph, speed=0.65), thresh_db=-45, pad_ms=0)
            if len(x) < int(0.28 * SR) and len(x) > 0:
                x = np.concatenate([x, x])
        # Fade at the voice onset (the burst is often 40–100 ms in after padding
        # or residual quiet). A fade at sample 0 would land in leading silence.
        onset = voice_onset(x)
        x = fade_in_at(x, onset, 10)
        x = fade_out(x, 40 if pid == 'u-e' else 10)
        x = P.loud(x)
        return x, note
    if pid in CLUSTERS:
        ph, note = CLUSTERS[pid]
        x = P.loud(P.fade(P.trim(P.synth_ph(voice, ph) if hasattr(P, 'synth_ph') else __import__('engines').synth(voice, ph=ph, speed=0.9))))
        if len(x) < int(0.08 * __import__('engines').SR):
            # too short: seed with a short schwa and keep the tail
            raw = __import__('engines').synth(voice, ph='ə' + ph, speed=0.9)
            raw = P.trim(raw)
            cut = int(0.06 * __import__('engines').SR)
            x = P.loud(P.fade(raw[cut:] if len(raw) > cut * 2 else raw))
        return x, note
    raise ValueError(pid)
