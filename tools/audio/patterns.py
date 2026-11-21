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
    raise ValueError(pid)
