/* Thin wrapper around the browser's built-in Web Speech API.
 * - Text-to-speech: window.speechSynthesis (works offline on most phones; uses on-device voices)
 * - Speech recognition: SpeechRecognition / webkitSpeechRecognition (availability varies a lot;
 *   on Android Chrome the audio is usually processed by Google's servers, on iPhone by Apple).
 * No third-party code or services are used here.
 */
window.Speech = (function () {
  const synth = window.speechSynthesis || null;
  const Rec = window.SpeechRecognition || window.webkitSpeechRecognition || null;
  let voice = null;
  let rate = 0.85;
  let preferredVoiceName = null;
  let token = 0; // increments to cancel in-flight sequences

  function englishVoices() {
    if (!synth) return [];
    return synth.getVoices().filter((v) => /^en([-_]|$)/i.test(v.lang));
  }

  function pickVoice() {
    const vs = englishVoices();
    if (!vs.length) { voice = null; return; }
    if (preferredVoiceName) {
      const found = vs.find((v) => v.name === preferredVoiceName);
      if (found) { voice = found; return; }
    }
    // Prefer natural-sounding US voices when present.
    const prefs = [/samantha/i, /google us english/i, /natural/i, /enhanced/i, /premium/i, /aaron/i, /alex/i];
    for (const re of prefs) {
      const v = vs.find((x) => re.test(x.name) && /en[-_]US/i.test(x.lang));
      if (v) { voice = v; return; }
    }
    voice = vs.find((v) => /en[-_]US/i.test(v.lang) && v.localService) ||
            vs.find((v) => /en[-_]US/i.test(v.lang)) || vs[0];
  }
  if (synth) {
    pickVoice();
    if ('onvoiceschanged' in synth) synth.addEventListener('voiceschanged', pickVoice);
  }

  function stop() {
    token++;
    if (synth) synth.cancel();
  }

  /** Speak one string. Resolves when finished (or on error / cancel). */
  function speakOne(text, opts = {}) {
    return new Promise((resolve) => {
      if (!synth || !text) { resolve(); return; }
      const u = new SpeechSynthesisUtterance(text);
      if (voice) { u.voice = voice; u.lang = voice.lang; } else { u.lang = 'en-US'; }
      u.rate = Math.max(0.3, Math.min(1.5, rate * (opts.rateMul || 1)));
      u.pitch = 1;
      let done = false;
      const finish = () => { if (!done) { done = true; clearTimeout(guard); resolve(); } };
      // Safety net: some engines never fire onend.
      const guard = setTimeout(finish, 1500 + text.length * 180 / u.rate);
      u.onend = finish;
      u.onerror = finish;
      if (opts.onboundary) u.onboundary = opts.onboundary;
      synth.speak(u);
      // Chrome sometimes leaves the queue paused after cancel().
      if (synth.paused) synth.resume();
    });
  }

  /** Speak a list of strings (or {text, rateMul, pause, onstart}) one after another. */
  async function say(parts, opts = {}) {
    if (!synth) return false;
    if (!opts.queue) stop();
    const my = token;
    const list = Array.isArray(parts) ? parts : [parts];
    for (const p of list) {
      if (my !== token) return;
      const part = typeof p === 'string' ? { text: p } : p;
      if (part.onstart) part.onstart();
      await speakOne(part.text, part);
      if (my !== token) return;
      if (part.pause) await new Promise((r) => setTimeout(r, part.pause));
    }
    return my === token; // true if it finished without being cancelled
  }

  /** Try a recorded clip first (audio/<name>.mp3), fall back to TTS. */
  let clips = new Set(); // names listed in audio/clips.json
  function setClips(list) { clips = new Set(list || []); }
  function clipOrSay(clipName, fallbackParts) {
    return new Promise((resolve) => {
      if (!clipName || !clips.has(clipName)) { say(fallbackParts).then(resolve); return; }
      stop();
      const a = new Audio('audio/' + clipName + '.mp3');
      let settled = false;
      const fb = () => { if (!settled) { settled = true; say(fallbackParts).then(resolve); } };
      a.onerror = fb;
      a.onended = () => { settled = true; resolve(); };
      a.play().catch(fb);
    });
  }

  // ---------------- Speech recognition ----------------
  let current = null;
  function canListen() { return !!Rec; }

  /**
   * Listen once. Resolves with { ok:true, alts:[strings] } or { ok:false, error }.
   */
  function listen(opts = {}) {
    return new Promise((resolve) => {
      if (!Rec) { resolve({ ok: false, error: 'unsupported' }); return; }
      stop(); // don't let the app hear itself
      try { if (current) current.abort(); } catch (e) { /* ignore */ }
      const r = new Rec();
      current = r;
      r.lang = 'en-US';
      r.interimResults = false;
      r.continuous = false;
      r.maxAlternatives = 5;
      let settled = false;
      const end = (val) => { if (!settled) { settled = true; clearTimeout(t); current = null; resolve(val); } };
      const t = setTimeout(() => { try { r.stop(); } catch (e) {} end({ ok: false, error: 'timeout' }); }, opts.timeout || 8000);
      r.onresult = (ev) => {
        const alts = [];
        for (let i = 0; i < ev.results.length; i++) {
          for (let j = 0; j < ev.results[i].length; j++) alts.push(ev.results[i][j].transcript);
        }
        end({ ok: true, alts });
      };
      r.onerror = (ev) => end({ ok: false, error: ev.error || 'error' });
      r.onend = () => end({ ok: false, error: 'no-speech' });
      if (opts.onstart) r.onstart = opts.onstart;
      try { r.start(); } catch (e) { end({ ok: false, error: 'start-failed' }); }
    });
  }
  function cancelListen() { try { if (current) current.abort(); } catch (e) {} current = null; }

  // ---------------- Matching ----------------
  const norm = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

  function lev(a, b) {
    const m = a.length, n = b.length;
    const d = Array.from({ length: m + 1 }, (_, i) => [i]);
    for (let j = 1; j <= n; j++) d[0][j] = j;
    for (let i = 1; i <= m; i++) for (let j = 1; j <= n; j++) {
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    return d[m][n];
  }

  function wordOk(target, heard, homophones) {
    if (heard === target) return true;
    const h = (homophones && homophones[target]) || [];
    if (h.includes(heard)) return true;
    return target.length >= 5 && lev(target, heard) <= 1;
  }

  /** Is any recognised alternative a good-enough match for the target text? */
  function matches(target, alts, homophones) {
    const t = norm(target);
    const tw = t.split(' ');
    for (const raw of alts) {
      const a = norm(raw);
      if (!a) continue;
      if (a === t) return true;
      const aw = a.split(' ');
      if (tw.length === 1 || (homophones && homophones[t])) {
        // single word / short phrase: accept if said on its own or inside a short phrase
        if (wordOk(t, a, homophones)) return true;
        if (tw.length === 1 && aw.length <= 3 && aw.some((w) => wordOk(t, w, homophones))) return true;
        if (tw.length > 1 && a.includes(t)) return true;
        continue;
      }
      // sentence: at least 75% of the words heard
      let hit = 0;
      const pool = aw.slice();
      for (const w of tw) {
        const k = pool.findIndex((x) => wordOk(w, x, homophones));
        if (k >= 0) { hit++; pool.splice(k, 1); }
      }
      if (hit / tw.length >= 0.75) return true;
    }
    return false;
  }

  return {
    hasTTS: !!synth,
    canListen,
    listen,
    cancelListen,
    say,
    stop,
    clipOrSay,
    setClips,
    hasClip: (n) => clips.has(n),
    matches,
    englishVoices,
    setRate(r) { rate = r; },
    getRate() { return rate; },
    setVoice(name) { preferredVoiceName = name || null; pickVoice(); },
    getVoiceName() { return voice ? voice.name : ''; }
  };
})();
