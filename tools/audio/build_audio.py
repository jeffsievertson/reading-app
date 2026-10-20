#!/usr/bin/env python3
"""Build the app's natural-voice audio clips (Kokoro-82M, voice af_heart) - run locally.

  /workspace/tts-venv/bin/python tools/audio/build_audio.py [--qa] [--force] [--listen-dir DIR]

1. node tools/audio/collect-texts.mjs   -> tools/audio/texts.json (every spoken text)
2. Kokoro TTS for each text             -> audio/af_heart/t/<slug>-<hash>.mp3
   slow versions of the Level 2 words   -> audio/af_heart/slow/...
   26 letter sounds cut from real words -> audio/af_heart/letters/... (see phonics.py)
3. audio/clips.json (text key -> file), prunes stale files, stamps AUDIO_VERSION in sw.js
4. --qa: transcribe every text clip with Whisper (dev tool) and re-generate mismatches
Already-built clips are reused (file name = hash of text + voice + settings).

Needs: kokoro-onnx + onnxruntime + soundfile + praat-parselmouth (pip), ffmpeg, node,
model files kokoro-v1.0.onnx + voices-v1.0.bin in $TTS_MODELS (default /workspace/tts-models).
Generation tools (espeak-ng via phonemizer, parselmouth) are GPL; they are not shipped -
only the generated MP3s are.
"""
import argparse, hashlib, json, os, re, subprocess, sys, tempfile, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, HERE)
from engines import synth, trim, fade, silence, write_wav, SR   # noqa: E402
import phonics                                                   # noqa: E402

VOICE = 'af_heart'
ENGINE_VOICE = 'kokoro:' + VOICE
SPEED = 0.92          # Kokoro speed for normal clips (app "Normal" rate = natural speed)
SLOW_SPEED = 0.6      # Level 2 blending: word said slowly
BASE_RATE = 0.85      # app rate setting that equals natural clip speed
GEN_VERSION = 'g1'    # bump to force regeneration of every text clip
KBPS = 48
OUT = os.path.join(ROOT, 'audio', VOICE)

def sha(*parts):
    return hashlib.sha1('|'.join(map(str, parts)).encode()).hexdigest()[:8]

def slug(s, n=40):
    return (re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')[:n].strip('-')) or 'x'

def loud(x, target_db=-18.0, peak=0.95):
    if not len(x): return x
    r = 20 * np.log10(np.sqrt(np.mean(x ** 2)) + 1e-12)
    g = min(10 ** ((target_db - r) / 20), peak / (np.max(np.abs(x)) + 1e-9))
    return (x * g).astype(np.float32)

def to_mp3(x, dest):
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: wav = f.name
    write_wav(wav, x)
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', wav, '-map_metadata', '-1', '-ac', '1', '-ar', str(SR),
                    '-codec:a', 'libmp3lame', '-b:a', f'{KBPS}k', dest], check=True)
    os.remove(wav)

def finish(x):
    x = fade(trim(np.asarray(x, np.float32), thresh_db=-45, pad_ms=30), 5)
    x = loud(x)
    return np.concatenate([silence(50), x, silence(120)]).astype(np.float32)

def render_text(speak, speed):
    return finish(synth(ENGINE_VOICE, text=speak, speed=speed))

# ---- short texts (1-2 words): Kokoro is shaky on very short inputs (stray vowel before
# the word, buzzy f/s onsets), so render a few variants and let an independent phoneme
# recognizer pick the one closest to the dictionary pronunciation. Decisions are cached
# in picks.json so later builds are reproducible without the recognizer.
def second_of_pair(x):
    """'Cat. Cat.' -> the second 'Cat' (it has a natural onset). None if no clear pause."""
    fr = int(SR * 0.01)
    env = np.array([np.sqrt(np.mean(x[i:i + fr] ** 2)) for i in range(0, len(x) - fr, fr)])
    db = 20 * np.log10(env / (env.max() + 1e-12) + 1e-12)
    loud_idx = np.where(db > -38)[0]
    if not len(loud_idx): return None
    a, b = loud_idx[0], loud_idx[-1]
    runs, s0 = [], None
    for i in range(a, b + 1):
        q = db[i] < -38
        if q and s0 is None: s0 = i
        if not q and s0 is not None: runs.append((s0, i)); s0 = None
    runs = [r for r in runs if r[1] - r[0] >= 15]
    if not runs: return None
    g = max(runs, key=lambda r: r[1] - r[0])
    return x[max(0, (g[1] - 4) * fr):]

# Letter names as phonemes (espeak/Kokoro IPA). Lone letters are easily misread by TTS
# ("A" as the article "uh"), so letter names are also rendered from these phonemes.
NAME_IPA = {'a': 'ˈeɪ', 'b': 'bˈiː', 'c': 'sˈiː', 'd': 'dˈiː', 'e': 'ˈiː', 'f': 'ˈɛf', 'g': 'dʒˈiː', 'h': 'ˈeɪtʃ',
            'i': 'ˈaɪ', 'j': 'dʒˈeɪ', 'k': 'kˈeɪ', 'l': 'ˈɛl', 'm': 'ˈɛm', 'n': 'ˈɛn', 'o': 'ˈoʊ', 'p': 'pˈiː',
            'q': 'kjˈuː', 'r': 'ˈɑːɹ', 's': 'ˈɛs', 't': 'tˈiː', 'u': 'jˈuː', 'v': 'vˈiː', 'w': 'dˈʌbəljˌuː',
            'x': 'ˈɛks', 'y': 'wˈaɪ', 'z': 'zˈiː'}
# What Whisper may write for each spoken name ("This is the letter ___")
NAME_HEARD = {'a': 'a ay', 'b': 'b bee be', 'c': 'c see sea', 'd': 'd dee', 'e': 'e ee', 'f': 'f eff', 'g': 'g gee jee',
              'h': 'h aitch age', 'i': 'i eye aye', 'j': 'j jay', 'k': 'k kay', 'l': 'l el elle', 'm': 'm em',
              'n': 'n en', 'o': 'o oh', 'p': 'p pee pea', 'q': 'q queue cue', 'r': 'r are ar', 's': 's es ess',
              't': 't tee tea', 'u': 'u you', 'v': 'v vee', 'w': 'w double', 'x': 'x ex', 'y': 'y why',
              'z': 'z zee'}
INTRO_PRE = 'ðɪs ɪz ðə lˈɛɾɚ'

def intro_ph(l, sep=' ', end='.'):
    name = NAME_IPA[l]
    link = 'ɹ' if name.lstrip('ˈ')[0] in 'eɛaɑoɔiɪuʊʌə' and sep == ' ' else ''
    return INTRO_PRE + link + sep + name + end

def letter_of(e):
    if e.get('kind') == 'intro': return e.get('letter')
    k = e['key']
    return k if len(k) == 1 and k in NAME_IPA else None

def variants(speak, e=None):
    l = letter_of(e) if e else None
    if e and e.get('kind') == 'intro':
        return {
            'txt092': lambda: synth(ENGINE_VOICE, text=speak, speed=SPEED),
            'ph092': lambda: synth(ENGINE_VOICE, ph=intro_ph(l), speed=SPEED),
            'ph088': lambda: synth(ENGINE_VOICE, ph=intro_ph(l), speed=0.88),
            'ph100': lambda: synth(ENGINE_VOICE, ph=intro_ph(l), speed=1.0),
            'phc092': lambda: synth(ENGINE_VOICE, ph=intro_ph(l, sep=', '), speed=SPEED),
            'phx092': lambda: synth(ENGINE_VOICE, ph=intro_ph(l, end='!'), speed=SPEED),
        }
    cap = speak[:1].upper() + speak[1:]
    dot = cap if cap.endswith(('.', '!', '?')) else cap + '.'
    extra = {}
    if l:
        extra = {
            'name092': lambda: synth(ENGINE_VOICE, ph=NAME_IPA[l] + '.', speed=SPEED),
            'name100': lambda: synth(ENGINE_VOICE, ph=NAME_IPA[l] + '.', speed=1.0),
            'namenow': lambda: second_of_pair(synth(ENGINE_VOICE, ph='nˈaʊ… ' + NAME_IPA[l] + '.', speed=SPEED)),
            'namecut': lambda: second_of_pair(synth(ENGINE_VOICE, ph=INTRO_PRE + '… ' + NAME_IPA[l] + '.', speed=SPEED)),
            'namecutx': lambda: second_of_pair(synth(ENGINE_VOICE, ph=INTRO_PRE + '… ' + NAME_IPA[l] + '!', speed=SPEED)),
        }
    return {**extra,
        'v092': lambda: synth(ENGINE_VOICE, text=speak, speed=SPEED),
        'dot092': lambda: synth(ENGINE_VOICE, text=dot, speed=SPEED),
        'dot100': lambda: synth(ENGINE_VOICE, text=dot, speed=1.0),
        'v100': lambda: synth(ENGINE_VOICE, text=speak, speed=1.0),
        'pair092': lambda: second_of_pair(synth(ENGINE_VOICE, text=dot + ' ' + dot, speed=SPEED)),
        'ell092': lambda: second_of_pair(synth(ENGINE_VOICE, text=cap.rstrip('.!?') + '... ' + dot, speed=SPEED)),
        'now092': lambda: second_of_pair(synth(ENGINE_VOICE, text='Now... ' + dot, speed=SPEED)),
        'now085': lambda: second_of_pair(synth(ENGINE_VOICE, text='Now... ' + dot, speed=0.85)),
    }

def coarse(ph):
    ph = ph.replace('kh', 'k').replace('tʃ', 'C').replace('dʒ', 'J').replace('ʧ', 'C').replace('ʤ', 'J')
    table = {'æ': 'a', 'ɑ': 'a', 'ʌ': 'a', 'ɐ': 'a', 'ɒ': 'a', 'ɛ': 'e', 'ɪ': 'i', 'ᵻ': 'i', 'ʊ': 'u', 'ɔ': 'o',
             'ə': '@', 'ɚ': '@r', 'ɜ': '@', 'ɹ': 'r', 'ɾ': 't', 'ɡ': 'g', 'ʃ': 'S', 'ʒ': 'Z', 'θ': 'T', 'ð': 'D', 'ŋ': 'N',
             'ɫ': 'l', 'ɬ': 'l', 'x': 'h', 'ø': 'o', 'œ': 'e', 'y': 'j'}
    out = []
    for ch in ph:
        if ch in 'ˈˌː.,!? 0123456789ʔ̃ʰ': continue
        out.append(table.get(ch, ch))
    return ''.join(out)

def phone_judge(wavs):
    py = os.environ.get('PHONE_ASR_PYTHON', '/workspace/asr-venv/bin/python')
    tool = os.environ.get('PHONE_ASR', '/workspace/voice-samples/tools/phone_asr.py')
    if not (os.path.exists(py) and os.path.exists(tool)): return None
    r = subprocess.run([py, tool], input='\n'.join(wavs), text=True, capture_output=True,
                       env=dict(os.environ, HF_HUB_OFFLINE='1'))
    if r.returncode: return None
    return json.load(open('/tmp/phone_asr_last.json'))

def pick_short(entries, picks):
    """Choose the best variant for each short text (cached in picks)."""
    from engines import kokoro
    tok = kokoro().tokenizer
    todo = [e for e in entries if picks.get(e['key'], {}).get('speak') != e['speak']]
    if not todo: return
    tmp = tempfile.mkdtemp()
    wavs, meta = [], {}
    for e in todo:
        for name, fn in variants(e['speak'], e).items():
            x = fn()
            if x is None or len(x) < SR * 0.1: continue
            f = os.path.join(tmp, f"{slug(e['key'])}-{sha(e['key'])}-{name}.wav")
            write_wav(f, finish(x)); wavs.append(f); meta[f] = (e, name)
    heard = phone_judge(wavs)
    if heard is None:
        print('  (phoneme judge not available: short texts use the default rendering)')
        return
    # Whisper as a second judge for the letter-name sentences
    intro_files = [f for f, (e, _) in meta.items() if e.get('kind') == 'intro']
    wh = {}
    if intro_files:
        try: wh = whisper(intro_files)
        except Exception as ex: print('  (whisper not available for intros:', ex, ')')
    ORDER = ['ph092', 'txt092', 'phc092', 'ph088', 'ph100', 'phx092', 'name092', 'namenow', 'name100', 'namecut', 'namecutx',
             'dot092', 'v092', 'now092', 'ell092', 'dot100', 'v100', 'now085', 'pair092']
    best = {}
    for f, (e, name) in meta.items():
        l = letter_of(e)
        if e.get('kind') == 'intro': want = coarse(intro_ph(l))
        elif l: want = coarse(NAME_IPA[l])
        else: want = coarse(tok.phonemize(e['speak'], 'en-us'))
        got = coarse(heard.get(f, '').replace(' ', ''))
        d = lev(want, got) / max(1, len(want))
        info = {}
        if l:   # the name itself must be right: compare the end of what was heard with the name
            n = coarse(NAME_IPA[l])
            dn = min(lev(n, got[-k:]) for k in range(1, len(n) + 3)) / max(1, len(n)) if got else 1.0
            d += 2 * dn; info['name_dist'] = round(dn, 3)
        if e.get('kind') == 'intro':
            t = re.sub(r"[^a-z ]", ' ', wh.get(f, '').lower()).split()
            ok = len(t) >= 5 and t[:4] == ['this', 'is', 'the', 'letter'] and t[4] in NAME_HEARD[l].split()
            if not ok: d += 1.5
            info['whisper'] = wh.get(f, '')
        d += ORDER.index(name) * 1e-3 if name in ORDER else 0.01   # tie-break
        if e['key'] not in best or d < best[e['key']][0]:
            best[e['key']] = (d, name, want, got, info)
    for e in todo:
        if e['key'] in best:
            d, name, want, got, info = best[e['key']]
            picks[e['key']] = {'speak': e['speak'], 'variant': name, 'dist': round(d, 3), 'want': want, 'heard': got, **info}

def render_variant(speak, variant, e=None):
    x = variants(speak, e)[variant]()
    if x is None: x = synth(ENGINE_VOICE, text=speak, speed=SPEED)
    return finish(x)

def slow_from(x_finished):
    """Slow version (Level 2 blending): pitch-preserving Praat lengthening of the chosen clip."""
    core = trim(x_finished, thresh_db=-45, pad_ms=20)
    y = phonics.lengthen(core, len(core) / SR * 1000 * (SPEED / SLOW_SPEED))
    return np.concatenate([silence(50), loud(fade(y, 5)), silence(120)]).astype(np.float32)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--qa', action='store_true', help='Whisper check of every text clip (slow, dev only)')
    ap.add_argument('--force', action='store_true')
    ap.add_argument('--no-pick', action='store_true', help='skip the phoneme-recognizer pick for short texts (uses cached picks.json)')
    ap.add_argument('--listen-dir', default=None, help='also write letter-sounds-all.mp3 etc. here')
    a = ap.parse_args()
    t0 = time.time()

    texts_path = os.path.join(HERE, 'texts.json')
    subprocess.run(['node', os.path.join(HERE, 'collect-texts.mjs'), texts_path], check=True)
    T = json.load(open(texts_path))

    clips, slow, letters, fixed = {}, {}, {}, []
    used = set()
    made = reused = 0

    def build(key_dir, key, speak, speed, label):
        nonlocal made, reused
        rel = f'{VOICE}/{key_dir}/{slug(label)}-{sha(GEN_VERSION, VOICE, speed, speak)}.mp3'
        dest = os.path.join(ROOT, 'audio', rel)
        if a.force or not os.path.exists(dest):
            to_mp3(render_text(speak, speed), dest); made += 1
        else:
            reused += 1
        used.add(os.path.normpath(dest))
        return rel

    # ---- spoken-form overrides found by --qa (e.g. "Pull" -> "Pull!"), cached in overrides.json
    ov_path = os.path.join(HERE, 'overrides.json')
    overrides = json.load(open(ov_path)) if os.path.exists(ov_path) else {}
    for e in T['entries']:
        o = overrides.get(e['key'])
        if o and o.get('orig') == e['speak']: e['orig_speak'] = e['speak']; e['speak'] = o['speak']

    # ---- short texts: pick the cleanest rendering (see pick_short)
    picks_path = os.path.join(HERE, 'picks.json')
    picks = json.load(open(picks_path)) if os.path.exists(picks_path) else {}
    short = [e for e in T['entries'] if (len(e['key'].split()) <= 2 and not e['key'].startswith('$')) or e['kind'] == 'intro']
    if not a.no_pick: pick_short(short, picks)
    picks = {k: v for k, v in picks.items() if any(e['key'] == k for e in short)}
    json.dump(picks, open(picks_path, 'w'), indent=1, ensure_ascii=False, sort_keys=True)

    def build_pick(key_dir, e, slow_ver=False):
        nonlocal made, reused
        v = picks.get(e['key'], {}).get('variant', 'v092')
        if v == 'v092' and not slow_ver:
            return build(key_dir, e['key'], e['speak'], SPEED, e['key'])
        rel = f"{VOICE}/{key_dir}/{slug(e['key'])}-{sha(GEN_VERSION, VOICE, v, slow_ver, e['speak'])}.mp3"
        dest = os.path.join(ROOT, 'audio', rel)
        if a.force or not os.path.exists(dest):
            x = render_variant(e['speak'], v, e)
            to_mp3(slow_from(x) if slow_ver else x, dest); made += 1
        else:
            reused += 1
        used.add(os.path.normpath(dest))
        return rel

    # ---- text clips
    for e in T['entries']:
        clips[e['key']] = build_pick('t', e) if e['key'] in picks else build('t', e['key'], e['speak'], SPEED, e['key'])
    # ---- slow words (blending)
    for k in T['slowWords']:
        e = next((x for x in T['entries'] if x['key'] == k), None)
        if e: slow[k] = build_pick('slow', e, slow_ver=True)

    # ---- letter sounds
    phon_hash = sha(open(os.path.join(HERE, 'phonics.py')).read(), open(os.path.join(HERE, 'engines.py')).read(), VOICE)
    letter_info = []
    for L in T['letters']:
        l = L['l']
        rel = f'{VOICE}/letters/{slug(l)}-{sha(phon_hash, l)}.mp3'
        dest = os.path.join(ROOT, 'audio', rel)
        how = None
        if a.force or not os.path.exists(dest):
            x, how = phonics.make_letter(ENGINE_VOICE, l)
            to_mp3(phonics.finish_letter(x), dest); made += 1
        else:
            reused += 1
        used.add(os.path.normpath(dest))
        letters['letters/' + l] = rel
        # the sound-hint text ("sss", "tuh", ...) also plays the real sound, at natural length
        if L['soundKey'] not in fixed:
            clips[L['soundKey']] = rel
            fixed.append(L['soundKey'])
        letter_info.append({'letter': l, 'keyword': L['kw'], 'file': rel, 'recipe': how})

    # ---- optional QA with Whisper (dev only)
    qa = None
    if a.qa:
        qa = run_qa(T, clips, build)
        for f in qa['fixed']:
            e = next(x for x in T['entries'] if x['text'] == f['text'])
            overrides[e['key']] = {'orig': e.get('orig_speak', e['speak']), 'speak': f['now_spoken_as']}
        json.dump(overrides, open(ov_path, 'w'), indent=1, ensure_ascii=False, sort_keys=True)

    # ---- prune stale files
    pruned = 0
    for d, _, fs in os.walk(OUT):
        for f in fs:
            pth = os.path.normpath(os.path.join(d, f))
            if f.endswith('.mp3') and pth not in used:
                os.remove(pth); pruned += 1

    version = sha(*sorted(set(clips.values()) | set(slow.values()) | set(letters.values())))
    manifest = {
        'format': 2,
        'voice': 'Kokoro-82M v1.0, voice af_heart (Apache-2.0)',
        'version': version,
        'baseRate': BASE_RATE,
        'clips': clips, 'slow': slow, 'letters': letters, 'fixed': fixed,
        'files': sorted(set(clips.values()) | set(slow.values()) | set(letters.values()))
    }
    with open(os.path.join(ROOT, 'audio', 'clips.json'), 'w') as f:
        json.dump(manifest, f, ensure_ascii=False, separators=(',', ':'))

    # stamp the service worker so phones re-download changed audio
    swp = os.path.join(ROOT, 'sw.js')
    sw = open(swp).read()
    sw2 = re.sub(r"const AUDIO_VERSION = '[^']*';", f"const AUDIO_VERSION = '{version}';", sw)
    if sw2 != sw: open(swp, 'w').write(sw2)

    total = sum(os.path.getsize(os.path.join(ROOT, 'audio', r)) for r in manifest['files'])
    report = {
        'texts': len(T['entries']), 'text_clips': len(set(clips.values())) - len(set(letters.values())),
        'slow_clips': len(slow), 'letter_sounds': len(letters), 'files': len(manifest['files']),
        'total_bytes': total, 'made': made, 'reused': reused, 'pruned': pruned,
        'uncovered_expressions': T['uncovered'], 'version': version, 'seconds': round(time.time() - t0),
        'letters': letter_info, 'qa': qa
    }
    json.dump(report, open(os.path.join(HERE, 'build-report.json'), 'w'), indent=1, ensure_ascii=False)
    print(f"texts {report['texts']} | files {report['files']} ({total/1e6:.2f} MB) | made {made}, reused {reused}, pruned {pruned} | "
          f"uncovered {len(T['uncovered'])} | version {version} | {report['seconds']} s")
    for u in T['uncovered']: print('  UNCOVERED', u)
    if qa: print(f"QA: {qa['checked']} checked, {len(qa['fixed'])} fixed by retry, {len(qa['flagged'])} still flagged")

    if a.listen_dir: write_listen_files(a.listen_dir, T, letters)

def norm_words(s):
    return [w for w in re.sub(r"[^a-z0-9' ]+", ' ', s.lower().replace('’', "'")).split() if w]

HOMO = {'sun': ['son'], 'i': ['eye', 'aye', 'hi', 'ay'], 'a': ['eh', 'ay', 'uh', 'hey'], 'to': ['two', 'too'], 'see': ['sea', 'c'],
        'red': ['read'], 'you': ['u'], 'we': ['wee', 'oui'], 'he': ['hee'], 'pin': ['pen'], 'ten': ['tin'], 'q': ['queue', 'cue'],
        'the': ['thee', 'duh'], 'dad': ['dead'], 'tin': ['ten'], 'nap': ['knap'], 'my': ['mi'], 'restroom': ['rest'], 'was': ['what']}

def heard_ok(expected, heard):
    ew, hw = norm_words(expected), norm_words(heard)
    if not ew: return True
    if not hw: return False
    def ok(w, pool):
        return w in pool or any(h in pool for h in HOMO.get(w, [])) or (len(w) >= 5 and any(lev(w, p) <= 1 for p in pool))
    hits = sum(1 for w in ew if ok(w, hw))
    return hits / len(ew) >= (1.0 if len(ew) <= 2 else 0.8)

def lev(x, y):
    d = list(range(len(y) + 1))
    for i, cx in enumerate(x, 1):
        p, d[0] = d[0], i
        for j, cy in enumerate(y, 1):
            p, d[j] = d[j], min(d[j] + 1, d[j - 1] + 1, p + (cx != cy))
    return d[-1]

def whisper(files):
    py = os.environ.get('QA_PYTHON', '/workspace/venv_ts/bin/python')
    model = os.environ.get('WHISPER_MODEL', '/workspace/whisper_models/small.pt')
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False) as f:
        json.dump(files, f); lst = f.name
    out = lst + '.out'
    code = (
        "import json,sys,whisper\n"
        f"m=whisper.load_model({model!r},device='cpu')\n"
        f"fs=json.load(open({lst!r}));r={{}}\n"
        "for f in fs:\n"
        "  r[f]=m.transcribe(f,language='en',fp16=False,temperature=0,condition_on_previous_text=False)['text'].strip()\n"
        f"json.dump(r,open({out!r},'w'))\n")
    subprocess.run([py, '-c', code], check=True, stderr=subprocess.DEVNULL)
    return json.load(open(out))

def run_qa(T, clips, build):
    entries = [e for e in T['entries'] if len(e['key'].split()) > 2]
    files = {os.path.join(ROOT, 'audio', clips[e['key']]): e for e in entries}
    res = whisper(list(files))
    flagged = [(f, files[f], res.get(f, '')) for f in files if not heard_ok(files[f]['speak'], res.get(f, ''))]
    fixed, still = [], []
    retry = {}
    for f, e, heard in flagged:
        alts = [e['speak'] + '.', e['speak'].capitalize() + '!', e['speak'].capitalize() + '...']
        cands = []
        for k, alt in enumerate(alts):
            rel = f"{VOICE}/qa/{slug(e['key'])}-{sha(GEN_VERSION, VOICE, SPEED, alt)}.mp3"
            dest = os.path.join(ROOT, 'audio', rel)
            if not os.path.exists(dest): to_mp3(render_text(alt, SPEED), dest)
            cands.append((dest, rel, alt))
        retry[f] = (e, heard, cands)
    if retry:
        allc = [c[0] for v in retry.values() for c in v[2]]
        res2 = whisper(allc)
        for f, (e, heard, cands) in retry.items():
            win = next((c for c in cands if heard_ok(e['speak'], res2.get(c[0], ''))), None)
            if win:
                # adopt the better rendering under the normal name
                rel = build('t', e['key'], win[2], SPEED, e['key'])
                clips[e['key']] = rel
                fixed.append({'text': e['text'], 'was': heard, 'now_spoken_as': win[2], 'heard': res2.get(win[0])})
            else:
                still.append({'text': e['text'], 'heard': heard, 'retries': [res2.get(c[0]) for c in cands]})
        # remove candidate files
        for v in retry.values():
            for c in v[2]:
                if os.path.exists(c[0]): os.remove(c[0])
    return {'checked': len(files), 'fixed': fixed, 'flagged': still}

def write_listen_files(d, T, letters):
    os.makedirs(d, exist_ok=True)
    import wave
    def load(rel):
        with tempfile.NamedTemporaryFile(suffix='.wav', delete=False) as f: wav = f.name
        subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', os.path.join(ROOT, 'audio', rel), '-ac', '1', '-ar', str(SR), wav], check=True)
        with wave.open(wav) as w: x = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.0
        os.remove(wav)
        return x.astype(np.float32)
    seq, seq_kw = [], []
    keyclips = json.load(open(os.path.join(ROOT, 'audio', 'clips.json')))['clips']
    for L in T['letters']:
        snd = load(letters['letters/' + L['l']])
        seq += [snd, silence(800)]
        kw = load(keyclips[L['kw'].lower()]) if L['kw'].lower() in keyclips else silence(10)
        seq_kw += [kw, silence(350), snd, silence(350), snd, silence(350), kw, silence(1100)]
    # the app's letter intro: "This is the letter E." "It makes the sound" [eh] [eh] (same pauses)
    intro = []
    ims = load(keyclips['it makes the sound'])
    for L in T['letters']:
        snd = load(letters['letters/' + L['l']])
        nm = load(keyclips['this is the letter ' + L['l']])
        intro += [nm, silence(250), ims, silence(150), snd, silence(350), snd, silence(1300)]
    to_mp3(np.concatenate(intro), os.path.join(d, 'letter-intros-all.mp3'))
    to_mp3(np.concatenate(seq), os.path.join(d, 'letter-sounds-all.mp3'))
    to_mp3(np.concatenate(seq_kw), os.path.join(d, 'letter-sounds-with-keywords.mp3'))
    print('listen files ->', d)

if __name__ == '__main__':
    main()
