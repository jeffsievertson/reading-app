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
  // Recognition is fragile on phones (especially iOS, and above all an iOS home-screen
  // "standalone" web app, where webkitSpeechRecognition exists but often never fires
  // onstart/onend, or stalls right after the first microphone permission prompt).
  // listen() therefore ALWAYS resolves: a start watchdog aborts if onstart/onaudiostart
  // doesn't arrive in time, and a hard cap aborts a session that never ends.
  const nav = typeof navigator !== 'undefined' ? navigator : {};
  const ua = nav.userAgent || '';
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && (nav.maxTouchPoints || 0) > 1);
  function isStandalone() {
    try {
      if (nav.standalone === true) return true;
      return !!(window.matchMedia && (window.matchMedia('(display-mode: standalone)').matches ||
        window.matchMedia('(display-mode: fullscreen)').matches));
    } catch (e) { return false; }
  }
  const isIOSStandalone = isIOS && isStandalone();

  let current = null;   // { r, end } of the active session
  function canListen() { return !!Rec; }

  function detach(r) {
    if (!r) return;
    try { r.onresult = r.onerror = r.onend = r.onstart = r.onaudiostart = r.onnomatch = null; } catch (e) {}
    try { r.abort(); } catch (e) {}
  }

  /**
   * Listen once. Always resolves with { ok:true, alts:[strings], started:true }
   * or { ok:false, error, started }. error 'cancelled' = stopped by the app (cancelListen / a newer listen). `started` = onstart/onaudiostart was seen.
   * opts.timeout       max listening time once started (ms, default 7000)
   * opts.startTimeout  max wait for onstart/onaudiostart (ms, default 3000)
   * opts.delay         wait after cancelling speech before starting (ms; iOS needs the
   *                    audio session to switch from playback to recording)
   * opts.onstart       called when the recognizer has actually started
   */
  function listen(opts = {}) {
    return new Promise((resolve) => {
      if (!Rec) { resolve({ ok: false, error: 'unsupported', started: false }); return; }
      // Guard against double starts: finish any session still running.
      if (current) { try { current.end({ ok: false, error: 'cancelled' }); } catch (e) {} }
      try { stop(); } catch (e) {} // don't let the app hear itself / iOS audio-session conflict

      let r = null, settled = false, started = false, tStart = null, tMax = null, tDelay = null;
      const session = {};
      const end = (val) => {
        if (settled) return;
        settled = true;
        clearTimeout(tStart); clearTimeout(tMax); clearTimeout(tDelay);
        if (current === session) current = null;
        detach(r);
        val.started = started;
        resolve(val);
      };
      session.end = end;
      current = session;

      const listenMs = Math.max(1000, opts.timeout || 7000);
      const startMs = Math.max(500, opts.startTimeout || 3000);
      const markStarted = () => {
        if (started || settled) return;
        started = true;
        clearTimeout(tStart);
        // hard cap on listening time, counted from the real start
        tMax = setTimeout(() => end({ ok: false, error: 'timeout' }), listenMs);
        try { if (opts.onstart) opts.onstart(); } catch (e) {}
      };

      const begin = () => {
        if (settled) return;
        try {
          r = new Rec();
          r.lang = 'en-US';
          r.interimResults = false;
          r.continuous = false;
          r.maxAlternatives = 5;
          r.onstart = markStarted;
          r.onaudiostart = markStarted;
          r.onresult = (ev) => {
            try {
              const alts = [];
              const res = (ev && ev.results) || [];
              for (let i = 0; i < res.length; i++) {
                for (let j = 0; j < res[i].length; j++) {
                  const t = res[i][j] && res[i][j].transcript;
                  if (t) alts.push(t);
                }
              }
              end(alts.length ? { ok: true, alts } : { ok: false, error: 'no-match' });
            } catch (e) { end({ ok: false, error: 'error' }); }
          };
          r.onnomatch = () => end({ ok: false, error: 'no-match' });
          r.onerror = (ev) => end({ ok: false, error: (ev && ev.error) || 'error' });
          r.onend = () => end({ ok: false, error: started ? 'no-speech' : 'ended-early' });
        } catch (e) { end({ ok: false, error: 'start-failed' }); return; }
        // The start watchdog also covers the time a permission prompt is on screen.
        // (If the user is slow to answer it, we give up and the 👍 button takes over.)
        tStart = setTimeout(() => end({ ok: false, error: 'start-timeout' }), startMs);
        try { r.start(); } catch (e) { end({ ok: false, error: 'start-failed' }); }
      };
      const delay = opts.delay != null ? opts.delay : (isIOS ? 250 : 0);
      if (delay > 0) tDelay = setTimeout(begin, delay); else begin();
    });
  }
  function cancelListen() {
    if (current) { try { current.end({ ok: false, error: 'cancelled' }); } catch (e) {} }
    current = null;
  }
  function isListening() { return !!current; }

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
    isListening,
    isIOS,
    isIOSStandalone,
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
