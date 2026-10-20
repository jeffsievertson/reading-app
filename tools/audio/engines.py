"""Local neural TTS helpers for the audio build (Kokoro-82M via kokoro-onnx; Piper optional).
Phoneme strings use espeak-style IPA. Run with /workspace/tts-venv/bin/python."""
import io, wave, numpy as np

import os
MODELS = os.environ.get('TTS_MODELS', '/workspace/tts-models/').rstrip('/') + '/'
SR = 24000  # everything is resampled to 24 kHz mono

_k = None
def kokoro():
    global _k
    if _k is None:
        from kokoro_onnx import Kokoro
        _k = Kokoro(MODELS + 'kokoro-v1.0.onnx', MODELS + 'voices-v1.0.bin')
    return _k

_p = None
def piper():
    global _p
    if _p is None:
        from piper import PiperVoice
        _p = PiperVoice.load(MODELS + 'en_US-ljspeech-high.onnx')
    return _p

def _resample(x, sr_in, sr_out=SR):
    if sr_in == sr_out: return x.astype(np.float32)
    n = int(round(len(x) * sr_out / sr_in))
    return np.interp(np.linspace(0, len(x) - 1, n), np.arange(len(x)), x).astype(np.float32)

def synth(voice, text=None, ph=None, speed=1.0):
    """voice: 'kokoro:af_heart' | 'kokoro:am_michael' | 'piper:ljspeech'"""
    eng, name = voice.split(':')
    if eng == 'kokoro':
        if ph is not None:
            a, sr = kokoro().create(ph, voice=name, speed=speed, lang='en-us', is_phonemes=True)
        else:
            a, sr = kokoro().create(text, voice=name, speed=speed, lang='en-us')
        return _resample(np.asarray(a), sr)
    else:
        from piper.config import SynthesisConfig
        cfg = SynthesisConfig(length_scale=1.0 / speed)
        s = ('[[ ' + ph + ' ]]') if ph is not None else text
        buf = io.BytesIO()
        with wave.open(buf, 'wb') as w:
            piper().synthesize_wav(s, w, syn_config=cfg)
        buf.seek(0)
        with wave.open(buf) as w:
            sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), np.int16) / 32768.0
        return _resample(x, sr)

def silence(ms): return np.zeros(int(SR * ms / 1000), np.float32)

def trim(x, thresh_db=-45, pad_ms=30):
    if len(x) == 0: return x
    fr = int(SR * 0.01)
    env = np.array([np.sqrt(np.mean(x[i:i + fr] ** 2) + 1e-12) for i in range(0, len(x), fr)])
    db = 20 * np.log10(env / (np.max(env) + 1e-12))
    idx = np.where(db > thresh_db)[0]
    if not len(idx): return x
    pad = int(SR * pad_ms / 1000)
    return x[max(0, idx[0] * fr - pad): min(len(x), (idx[-1] + 1) * fr + pad)]

def fade(x, ms=8):
    n = min(int(SR * ms / 1000), len(x) // 2)
    if n > 0:
        x = x.copy(); r = np.linspace(0, 1, n); x[:n] *= r; x[-n:] *= r[::-1]
    return x

def normalize(x, peak=0.89):
    m = np.max(np.abs(x)) if len(x) else 0
    return (x * (peak / m)).astype(np.float32) if m > 0 else x

def write_wav(path, x):
    x = np.clip(x, -1, 1)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
