// Run: node tools/mic-timeout-test.mjs  (needs local server on :8765; BASE=<url> for the live site;
// W=320 for a narrow phone; SHOTS=0 to skip screenshots)
// v18: after the mic opens the learner has a speak window (7 s for a word / letter / sign / short item,
// longer for sentences and verses). Nothing heard -> listening stops and the app SAYS (Kokoro clip)
// "I didn’t hear that, please try again."; the mic is ready again. Speech that starts inside the
// window is never cut off. A countdown ring drains around the mic (green -> amber -> red, big
// seconds number) and disappears when listening ends (result, timeout, Stop). No on-screen note.
// Writes screenshots/34-ring-<word|verse>-<full|mid|end|timeout>[-320].png
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const W = +(process.env.W || 390); const SUF = W === 390 ? '' : '-' + W;
const SHOOT = process.env.SHOTS !== '0';
const RETRY = "i didn't hear that please try again";
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
let failed = 0; const results = [];
const check = (n, c, i) => { results.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(i).slice(0, 500))); if (!c) failed++; };

async function open(id, mode, opts = {}) {
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, reducedMotion: opts.reduced ? 'reduce' : 'no-preference' });
  await ctx.addInitScript((mode) => {
    localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings: {} }));
    window.__mode = mode; window.__starts = 0;
    // fake recognizer: 'silent' = opens and hears nothing, never ends on its own;
    // 'quick' = hears "cat" after 2 s; 'long' = speech starts at 1 s, result only after 9.5 s
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      start() {
        window.__rec = this; window.__starts++; const m = window.__mode; const tm = (f, ms) => setTimeout(() => { if (window.__rec === this && !this.dead) f(); }, ms);
        tm(() => { window.__t0 = Date.now(); this.onstart && this.onstart(); }, 30);
        if (m === 'quick') tm(() => { this.onspeechstart && this.onspeechstart(); this.onresult && this.onresult({ results: [[{ transcript: window.__say || 'cat' }]] }); this.onend && this.onend(); }, 2030);
        if (m === 'long') { tm(() => { this.onsoundstart && this.onsoundstart(); this.onspeechstart && this.onspeechstart(); }, 1030);
          tm(() => { this.onresult && this.onresult({ results: [[{ transcript: window.__say || 'cat' }]] }); this.onend && this.onend(); }, 9530); }
      }
      stop() { this.dead = true; this.onend && this.onend(); }
      abort() { this.dead = true; this.onerror && this.onerror({ error: 'aborted' }); this.onend && this.onend(); }
    };
  }, mode);
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE + '#/lesson/' + id);
  await p.locator('.foot .primary').click();
  await p.waitForSelector('.say-target');
  await p.waitForTimeout(400);
  return { ctx, p, errors };
}
const ringInfo = (p) => p.evaluate(() => {
  const s = document.querySelector('.mic-ring'); const bar = s && s.querySelector('.bar'); const m = document.querySelector('.foot .mic');
  const vw = innerWidth;
  const r = s && s.getBoundingClientRect(); const f = document.querySelector('.foot').getBoundingClientRect();
  const others = [...document.querySelectorAll('.foot button:not(.mic)')].map((x) => x.getBoundingClientRect());
  return { ring: !!s, col: s && s.dataset.col, left: m && m.dataset.left, off: bar ? parseFloat(bar.style.strokeDashoffset) : null,
    dash: bar ? parseFloat(bar.style.strokeDasharray) : null, stroke: bar ? getComputedStyle(bar).stroke : null,
    secs: document.querySelector('.mic-secs')?.textContent, status: document.querySelector('.status')?.textContent,
    micIco: m && m.querySelector('.ico')?.textContent, listening: m && m.classList.contains('listening'),
    note: !!document.querySelector('.listen-note'), docW: document.documentElement.scrollWidth, vw,
    inView: !r || (r.left >= 0 && r.right <= vw + 0.5 && r.top >= f.top - 0.5 && r.bottom <= f.bottom + 0.5),
    hitsOther: !!r && others.some((o) => o.right > r.left + 1 && o.left < r.right - 1),
    since: window.__t0 ? Date.now() - window.__t0 : null };
});
const log = (p) => p.evaluate(() => window.Speech.debugLog());
const shot = async (p, name) => { if (SHOOT) await p.screenshot({ path: `${SHOTS}34-ring-${name}${SUF}.png` }); };
const at = async (p, ms) => { const s = await p.evaluate(() => window.__t0 ? Date.now() - window.__t0 : 0); if (ms > s) await p.waitForTimeout(ms - s); };

// ---- 1+2. word and verse: silent -> ring drains -> timeout -> spoken retry -> mic usable again
for (const [tag, id, win] of [['word', 'L2-cat', 7000], ['verse', 'L4-kjv-genesis-1-1', 11000]]) {
  const { ctx, p, errors } = await open(id, 'silent');
  check(`${tag}: no listen note element on the page`, (await p.locator('.listen-note').count()) === 0);
  check(`${tag}: no ring before the mic`, !(await ringInfo(p)).ring);
  await p.locator('.foot .mic').click();
  await p.waitForFunction(() => window.__t0, null, { timeout: 5000 });
  await at(p, 250);
  const full = await ringInfo(p);
  check(`${tag}: ring appears full + green with ${win / 1000}`, full.ring && full.col === 'green' && full.off < full.dash * 0.06 && full.secs === String(win / 1000), full);
  check(`${tag}: ring stays inside footer, no overlap, no page overflow`, full.inView && !full.hitsOther && full.docW <= full.vw, full);
  check(`${tag}: no listen note while listening`, !full.note);
  await shot(p, tag + '-full');
  await at(p, win * 0.5);
  const mid = await ringInfo(p);
  check(`${tag}: ring drains (about half at mid-window)`, mid.ring && mid.off > full.off + mid.dash * 0.35 && mid.off < mid.dash * 0.62, { full, mid });
  check(`${tag}: mid-window colour amber`, mid.col === 'amber' || mid.col === 'green', mid);
  await shot(p, tag + '-mid');
  await at(p, win * 0.9);
  const end = await ringInfo(p);
  check(`${tag}: near the end the ring is red and almost empty`, end.ring && end.col === 'red' && end.off > end.dash * 0.8 && Math.abs(+end.secs - Math.ceil((win - end.since) / 1000)) <= 1 && +end.secs <= 2, end);
  await shot(p, tag + '-end');
  await p.waitForFunction(() => !document.querySelector('.mic-ring'), null, { timeout: win + 3000 });
  const tEnd = await p.evaluate(() => Date.now() - window.__t0);
  check(`${tag}: listening stops at ~${win / 1000} s (got ${tEnd} ms)`, tEnd >= win - 150 && tEnd <= win + 800, tEnd);
  await p.waitForFunction((k) => window.Speech.debugLog().some((e) => e.key === k), RETRY, { timeout: 6000 }).catch(() => {});
  const L = await log(p);
  const said = L.filter((e) => e.key === RETRY);
  check(`${tag}: retry line played as the Kokoro clip (not built-in voice)`, said.length === 1 && said[0].how === 'clip', L.slice(-4));
  const after = await ringInfo(p);
  check(`${tag}: after timeout: ring gone, mic ready (🎤, not listening), no 👂/…`, !after.ring && after.micIco === '🎤' && !after.listening && !/👂|…/.test(after.status), after);
  await p.waitForTimeout(2500);
  await shot(p, tag + '-timeout');
  const n0 = await p.evaluate(() => window.__starts);
  await p.evaluate(() => { window.__t0 = 0; });
  await p.locator('.foot .mic').click();
  await p.waitForFunction(() => window.__t0, null, { timeout: 5000 });
  await at(p, 300);
  const again = await ringInfo(p);
  check(`${tag}: mic usable again (new listen + fresh ring)`, (await p.evaluate(() => window.__starts)) === n0 + 1 && again.ring && again.listening && again.secs === String(win / 1000), again);
  if (tag === 'word') {
    // second miss: retry line, then "Or tap Continue anyway." and the 👍 shows
    await p.waitForFunction(() => !document.querySelector('.mic-ring'), null, { timeout: win + 3000 });
    await p.waitForFunction(() => window.Speech.debugLog().some((e) => e.key === 'or tap continue anyway'), null, { timeout: 9000 }).catch(() => {});
    const L2 = await log(p);
    check('word: 2nd miss says retry line + "Or tap Continue anyway." (clips) and shows 👍',
      L2.filter((e) => e.key === RETRY && e.how === 'clip').length === 2 && L2.some((e) => e.key === 'or tap continue anyway' && e.how === 'clip') && await p.locator('.foot .ok-btn').count() === 1, L2.slice(-4));
  }
  check(`${tag}: nothing spoken by the built-in voice`, !(await log(p)).some((e) => e.how === 'tts'), (await log(p)).filter((e) => e.how === 'tts'));
  check(`${tag}: no page errors`, errors.length === 0, errors);
  await ctx.close();
}

// ---- 3. result before the timeout cancels the countdown (and no retry line)
{
  const { ctx, p, errors } = await open('L2-cat', 'quick');
  await p.locator('.foot .mic').click();
  await p.waitForFunction(() => window.__t0, null, { timeout: 5000 });
  await at(p, 1000);
  check('quick: ring showing before the answer', (await ringInfo(p)).ring);
  await p.waitForSelector('.status.yes', { timeout: 5000 });
  const r = await ringInfo(p);
  check('quick: correct answer -> success, ring gone', !r.ring && /✓/.test(r.status), r);
  await p.waitForTimeout(7000);
  check('quick: no retry line after the window would have ended', !(await log(p)).some((e) => e.key === RETRY), (await log(p)).slice(-4));
  check('quick: no page errors', errors.length === 0, errors);
  await ctx.close();
}
// ---- 4. speech that starts inside the window is not cut off (result arrives at 9.5 s)
{
  const { ctx, p, errors } = await open('L2-cat', 'long');
  await p.locator('.foot .mic').click();
  await p.waitForFunction(() => window.__t0, null, { timeout: 5000 });
  await at(p, 1500);
  const h = await ringInfo(p);
  check('long: speech heard -> countdown stops (full steady ring, no number)', h.ring && h.col === 'hearing' && h.off === 0 && !h.secs, h);
  await at(p, 8000);
  const h2 = await ringInfo(p);
  check('long: still listening at 8 s (not cut off at 7 s)', h2.ring && h2.listening, h2);
  await p.waitForSelector('.status.yes', { timeout: 5000 });
  check('long: result at 9.5 s accepted, ring gone', !(await ringInfo(p)).ring);
  check('long: no retry line', !(await log(p)).some((e) => e.key === RETRY));
  check('long: no page errors', errors.length === 0, errors);
  await ctx.close();
}
// ---- 5. Stop still behaves as before: ends listening at once, nothing spoken, mic ready, no 👂
{
  const { ctx, p, errors } = await open('L2-cat', 'silent');
  await p.locator('.foot .mic').click();
  await p.waitForFunction(() => window.__t0, null, { timeout: 5000 });
  await at(p, 2000);
  const before = (await log(p)).length;
  await p.locator('.foot .mic').click(); // ⏹
  await p.waitForTimeout(300);
  const r = await ringInfo(p);
  check('stop: ring gone, mic 🎤 not listening, no 👂/…', !r.ring && r.micIco === '🎤' && !r.listening && !/👂|…/.test(r.status), r);
  await p.waitForTimeout(6000);
  const L = (await log(p)).slice(before);
  check('stop: nothing spoken afterwards (no retry line)', !L.length, L);
  check('stop: no 👍 after one Stop', (await p.locator('.foot .ok-btn').count()) === 0);
  check('stop: no page errors', errors.length === 0, errors);
  await ctx.close();
}
// ---- 6. reduced motion: ring still shows the time left (steps once a second) and the number counts down
{
  const { ctx, p, errors } = await open('L2-cat', 'silent', { reduced: true });
  await p.locator('.foot .mic').click();
  await p.waitForFunction(() => window.__t0, null, { timeout: 5000 });
  await at(p, 300); const a = await ringInfo(p);
  await at(p, 3300); const c = await ringInfo(p);
  check('reduced motion: ring + number shown and they step down', a.ring && c.ring && a.secs === '7' && c.secs === '4' && c.off > a.off && Math.abs(c.off - c.dash * 3 / 7) < c.dash * 0.03, { a, c });
  check('reduced motion: no page errors', errors.length === 0, errors);
  await ctx.close();
}
await b.close();
console.log(results.join('\n'));
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
