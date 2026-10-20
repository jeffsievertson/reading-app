#!/usr/bin/env python3
"""Dev check of the Level 1 letter intros (run after build_audio.py, with tts-venv):
  tts-venv/bin/python tools/audio/verify_letters.py
For every letter: the name sentence ("This is the letter E.") and the lone name are checked
with Whisper and a phoneme recognizer; the letter-sound clip gets acoustic sanity checks
(length, level, clipping, voicing, hiss, vowel formants) and a phoneme-recognizer pass on
the stitched intro "It makes the sound [eh] [eh]". Writes tools/audio/letters-report.json."""
import json, os, subprocess, sys, tempfile, re
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from engines import SR, silence, write_wav
import phonics
from build_audio import whisper, phone_judge, coarse, lev, NAME_IPA, NAME_HEARD, intro_ph

SOUND = {'a': 'æ', 'b': 'b', 'c': 'k', 'd': 'd', 'e': 'ɛ', 'f': 'f', 'g': 'ɡ', 'h': 'h', 'i': 'ɪ', 'j': 'dʒ', 'k': 'k',
         'l': 'l', 'm': 'm', 'n': 'n', 'o': 'ɑ', 'p': 'p', 'q': 'kw', 'r': 'ɹ', 's': 's', 't': 't', 'u': 'ʌ', 'v': 'v',
         'w': 'w', 'x': 'ks', 'y': 'j', 'z': 'z'}
KIND = {**{c: 'vowel' for c in 'aeiou'}, **{c: 'hiss' for c in 'sfh'}, **{c: 'voiced-cont' for c in 'mnlrvz'},
        **{c: 'stop' for c in 'tpkc'}, **{c: 'voiced-stop' for c in 'bdgj'}, 'w': 'glide', 'y': 'glide', 'x': 'hiss', 'q': 'stop+glide'}

def load(rel):
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: wav = f.name
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(ROOT, 'audio', rel), '-ac', '1', '-ar', str(SR), wav], check=True)
    import wave
    with wave.open(wav) as w: x = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.0
    os.remove(wav); return x.astype(np.float32)

def acoustics(x, l):
    from engines import trim
    core = trim(x, thresh_db=-40, pad_ms=0)
    t, v = phonics.voicing(core)
    a = {'dur_ms': round(len(core) / SR * 1000), 'peak_db': round(20 * np.log10(np.max(np.abs(x)) + 1e-9), 1),
         'rms_db': round(phonics.rms_db(core), 1), 'voiced': round(float(np.mean(v)) if len(v) else 0, 2),
         'hiss': round(phonics.band_ratio(core, 3000, 10000), 2)}
    if KIND[l] == 'vowel':
        f1, f2, _ = phonics.formants(core); a['F1'] = round(f1 or 0); a['F2'] = round(f2 or 0)
        r1, r2 = phonics.VOWEL_REF[SOUND[l]]; a['formant_err'] = round(((a['F1'] - r1) / r1) ** 2 + ((a['F2'] - r2) / r2) ** 2, 3)
    k = KIND[l]; probs = []
    if a['peak_db'] > -0.2: probs.append('clipping')
    if a['rms_db'] < -30: probs.append('quiet')
    if k == 'vowel' and (a['voiced'] < 0.7 or a.get('formant_err', 0) > 0.15): probs.append('vowel quality')
    if k == 'hiss' and l != 'x' and a['voiced'] > 0.15: probs.append('hiss is voiced')
    if k == 'voiced-cont' and a['voiced'] < 0.5: probs.append('not voiced enough')
    if k in ('stop', 'voiced-stop', 'stop+glide') and a['dur_ms'] > 450: probs.append('long for a stop')
    if k == 'stop' and a['voiced'] > 0.5: probs.append('stop has a vowel')
    a['problems'] = probs
    return a

m = json.load(open(os.path.join(ROOT, 'audio', 'clips.json')))
tmp = tempfile.mkdtemp()
ims = load(m['clips']['it makes the sound'])
rows, files_intro, files_name, files_stitch = {}, {}, {}, {}
for l in 'abcdefghijklmnopqrstuvwxyz':
    snd = load(m['letters']['letters/' + l]); intro = load(m['clips']['this is the letter ' + l]); name = load(m['clips'][l])
    rows[l] = {'sound_acoustics': acoustics(snd, l)}
    for d, x, tag in ((files_intro, intro, 'intro'), (files_name, name, 'name')):
        f = os.path.join(tmp, f'{l}-{tag}.wav'); write_wav(f, x); d[l] = f
    f = os.path.join(tmp, f'{l}-stitch.wav'); write_wav(f, np.concatenate([ims, silence(150), snd, silence(350), snd])); files_stitch[l] = f
wh = whisper(list(files_intro.values()) + list(files_name.values()))
ph = phone_judge(list(files_intro.values()) + list(files_name.values()) + list(files_stitch.values())) or {}
pre = coarse('ɪt mˌeɪks ðə sˈaʊnd')
for l, r in rows.items():
    t = re.sub(r"[^a-z ]", ' ', wh.get(files_intro[l], '').lower()).split()
    r['intro_whisper'] = wh.get(files_intro[l], '')
    r['intro_name_ok'] = len(t) >= 5 and t[:4] == ['this', 'is', 'the', 'letter'] and t[4] in NAME_HEARD[l].split()
    got = coarse(ph.get(files_intro[l], '').replace(' ', '')); n = coarse(NAME_IPA[l])
    r['intro_phonemes'] = ph.get(files_intro[l], '')
    r['intro_name_dist'] = round(min(lev(n, got[-k:]) for k in range(1, len(n) + 3)) / len(n), 2) if got else 1
    r['name_whisper'] = wh.get(files_name[l], ''); r['name_phonemes'] = ph.get(files_name[l], '')
    st = ph.get(files_stitch[l], ''); r['stitched_phonemes'] = st
    tail = coarse(st.replace(' ', ''))
    tail = tail[len(pre) - 2:] if tail.startswith(pre[:4]) else tail
    want = coarse(SOUND[l])
    r['sound_heard_after_intro'] = tail
    r['sound_found'] = want in tail
    flags = list(r['sound_acoustics']['problems'])
    if not r['intro_name_ok'] or r['intro_name_dist'] > 0.34: flags.append('name in intro doubtful')
    if not r['sound_found']: flags.append('recognizer did not find the sound')
    r['flags'] = flags
json.dump(rows, open(os.path.join(HERE, 'letters-report.json'), 'w'), indent=1, ensure_ascii=False, default=float)
for l, r in rows.items():
    a = r['sound_acoustics']
    print(f"{l}: intro='{r['intro_whisper']}' name_dist={r['intro_name_dist']} | sound heard '{r['sound_heard_after_intro']}' "
          f"dur={a['dur_ms']} voiced={a['voiced']} hiss={a['hiss']}{' F1/F2=%d/%d' % (a['F1'], a['F2']) if 'F1' in a else ''} | flags: {', '.join(r['flags']) or '-'}")
