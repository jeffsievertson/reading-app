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
        synth = P.synth_ph if hasattr(P, 'synth_ph') else (lambda voice, ph: __import__('engines').synth(voice, ph=ph, speed=0.75))
        x = P.loud(P.fade(P.trim(synth(voice, ph))))
        SR = __import__('engines').SR
        # A lone vowel can be too short to hear; stretch or recut from a longer take.
        if len(x) < int(0.35 * SR):
            raw = __import__('engines').synth(voice, ph=ph, speed=0.65)
            x = P.loud(P.fade(P.trim(raw)))
        if len(x) < int(0.28 * SR) and len(x) > 0:
            x = P.loud(P.fade(__import__('numpy').concatenate([x, x])))
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
