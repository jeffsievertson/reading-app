// Run: node tools/mic-robust-test.mjs  (needs a local server: python3 -m http.server 8765)
// Fake recognizers that misbehave the way real phones do (iOS standalone especially),
// checking that the "say it" step never stays blocked and always offers 👍 / stop.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
let failed = 0;
const results = [];
function check(name, cond, info) { results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ' + JSON.stringify(info))); if (!cond) failed++; }

async function setup(plan, { ios = false, standalone = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, ...(ios ? { userAgent: IPHONE, isMobile: true, hasTouch: true } : {}) });
  await ctx.addInitScript(({ plan, standalone }) => {
    localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings: {} }));
    if (standalone) Object.defineProperty(navigator, 'standalone', { get: () => true });
    const R = window.__rec = { created: 0, starts: 0, aborts: 0, active: 0, maxActive: 0, speakingAtStart: [], cancels: 0 };
    let speaking = false;
    speechSynthesis.speak = (u) => { speaking = true; setTimeout(() => { speaking = false; u.onend && u.onend(); }, 30); };
    const oc = speechSynthesis.cancel.bind(speechSynthesis);
    speechSynthesis.cancel = () => { R.cancels++; speaking = false; oc(); };
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      constructor() { this.n = R.created++; this.live = false; }
      _fire(name, ev) { if (this.live && this['on' + name]) this['on' + name](ev || {}); }
      _endLive() { if (this.live) { this.live = false; R.active--; } }
      start() {
        const beh = plan[Math.min(this.n, plan.length - 1)];
        R.starts++; R.speakingAtStart.push(speaking);
        if (beh === 'throw') throw new Error('InvalidStateError');
        this.live = true; R.active++; R.maxActive = Math.max(R.maxActive, R.active);
        const [kind, arg] = beh.split(':');
        if (kind === 'silent') return;                                    // nothing ever fires
        setTimeout(() => {
          this._fire('start'); this._fire('audiostart');
          if (kind === 'startNoEnd') return;                              // starts, never ends
          setTimeout(() => {
            if (kind === 'result') this._fire('result', { results: [[{ transcript: arg }]] });
            if (kind === 'error') this._fire('error', { error: arg });
            this._fire('end'); this._endLive();
          }, 100);
        }, 50);
      }
      stop() { this._fire('end'); this._endLive(); }
      abort() { R.aborts++; this._endLive(); }   // like iOS: abort without events
    };
  }, { plan, standalone });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE + '#/lesson/L2-sat');
  await p.locator('.foot .primary').click();
  await p.waitForSelector('.say-target');
  return { ctx, p, errors };
}
const st = async (p) => p.evaluate(() => ({
  status: document.querySelector('.status')?.textContent,
  mic: !!document.querySelector('.foot .mic'),
  micIco: document.querySelector('.foot .mic .ico')?.textContent,
  listening: !!document.querySelector('.mic.listening'),
  ok: !!document.querySelector('.foot .ok-btn'),
  next: !!document.querySelector('.foot .primary'),
  rec: window.__rec
}));
const interactive = (s) => !s.listening && (s.ok || s.next);

// 1. Recognizer never fires anything (also covers the permission prompt eating the first start)
{
  const { ctx, p, errors } = await setup(['silent']);
  await p.locator('.mic').click(); await p.waitForTimeout(500);
  const during = await st(p);
  check('silent: stop control visible while listening', during.listening && during.micIco === '⏹', during);
  await p.waitForTimeout(8000); // 4s first watchdog + auto-retry 3s
  const s = await st(p);
  check('silent: back to interactive with 👍 after watchdog + one retry', interactive(s) && s.ok && s.rec.starts === 2 && s.rec.active === 0, s);
  await p.locator('.ok-btn').click(); await p.waitForTimeout(200);
  check('silent: 👍 completes the step', (await st(p)).next, await st(p));
  check('silent: no page errors', !errors.length, errors);
  await ctx.close();
}
// 2. Stop button cancels immediately
{
  const { ctx, p, errors } = await setup(['silent']);
  await p.locator('.mic').click(); await p.waitForTimeout(400);
  await p.locator('.mic').click(); await p.waitForTimeout(200);
  const s = await st(p);
  check('stop: tapping ⏹ returns at once, recognizer aborted', !s.listening && s.micIco === '🎤' && s.rec.active === 0 && s.rec.starts === 1, s);
  check('stop: no page errors', !errors.length, errors);
  await ctx.close();
}
// 3. onstart fires but never onend/onresult
{
  const { ctx, p, errors } = await setup(['startNoEnd']);
  await p.locator('.mic').click(); await p.waitForTimeout(7600);
  const s = await st(p);
  check('startNoEnd: max-listen cap ends it, 👍 shown', interactive(s) && s.ok && s.status === '🔇' && s.rec.active === 0, s);
  check('startNoEnd: no page errors', !errors.length, errors);
  await ctx.close();
}
// 4. start() throws
{
  const { ctx, p, errors } = await setup(['throw']);
  await p.locator('.mic').click(); await p.waitForTimeout(1000);
  const s = await st(p);
  check('throw: interactive with 👍', interactive(s) && s.ok, s);
  check('throw: no page errors', !errors.length, errors);
  await ctx.close();
}
// 5. First start dies (permission prompt), second works -> auto retry succeeds
{
  const { ctx, p, errors } = await setup(['silent', 'result:sat']);
  await p.locator('.mic').click(); await p.waitForTimeout(5000);
  const s = await st(p);
  check('first-fails-then-works: auto-retry succeeds without a second tap', s.next && /sat/.test(s.status) && s.rec.starts === 2, s);
  check('first-fails-then-works: never two recognizers at once', s.rec.maxActive === 1, s);
  check('first-fails-then-works: no page errors', !errors.length, errors);
  await ctx.close();
}
// 6. First start errors immediately ("aborted" by engine after permission grant), then works
{
  const { ctx, p } = await setup(['error:aborted', 'result:sat']);
  await p.locator('.mic').click(); await p.waitForTimeout(1500);
  const s = await st(p);
  check('first-aborted-then-works: auto-retry succeeds', s.next && /sat/.test(s.status), s);
  await ctx.close();
}
// 7. Every error code leaves the UI usable
for (const code of ['not-allowed', 'service-not-allowed', 'audio-capture', 'no-speech', 'network', 'aborted']) {
  const { ctx, p, errors } = await setup(['result:x', 'error:' + code]); // 1st session normal so no auto-retry
  await p.locator('.mic').click(); await p.waitForTimeout(800);   // heard "x": wrong
  await p.locator('.mic').click(); await p.waitForTimeout(800);
  const s = await st(p);
  const hard = ['not-allowed', 'service-not-allowed', 'audio-capture'].includes(code);
  check('error ' + code + ': interactive, 👍 shown' + (hard ? ', mic removed' : ', mic kept'), interactive(s) && s.ok && (hard ? !s.mic : s.mic), s);
  check('error ' + code + ': no page errors', !errors.length, errors);
  await ctx.close();
}
// 8. Speech is cancelled before recognition starts; double taps don't double start
{
  const { ctx, p } = await setup(['startNoEnd']);
  await p.evaluate(() => { document.querySelector('.foot .icon-btn').click(); }); // 🔊 hear it -> speaking
  await p.locator('.mic').dblclick(); await p.waitForTimeout(300);
  const s = await st(p);
  check('synth cancelled before start', s.rec.speakingAtStart.every((x) => !x) && s.rec.cancels > 0, s);
  check('double tap: at most one recognizer active', s.rec.maxActive <= 1, s);
  await ctx.close();
}
// 9. Leaving the screen mid-listen aborts cleanly
{
  const { ctx, p, errors } = await setup(['startNoEnd']);
  await p.locator('.mic').click(); await p.waitForTimeout(300);
  await p.locator('.top .icon-btn').first().click(); await p.waitForTimeout(8000);
  const s = await st(p);
  check('navigate away: recognizer aborted, no errors, no stray status', s.rec.active === 0 && !errors.length && s.status === undefined, { s, errors });
  await ctx.close();
}
// 10. iOS standalone (home-screen app): 👍 is the main path, optional mic fails fast
{
  const { ctx, p, errors } = await setup(['silent'], { ios: true, standalone: true });
  const s0 = await st(p);
  check('iOS standalone: 👍 shown from the start', s0.ok && s0.mic && !s0.listening, s0);
  await p.locator('.mic').click(); await p.waitForTimeout(400);
  check('iOS standalone: stop visible while trying mic', (await st(p)).micIco === '⏹', await st(p));
  await p.waitForTimeout(7500); // 250ms delay + 4s + 250ms + 2.5s
  const s = await st(p);
  check('iOS standalone: dead recognizer -> mic dropped, 👍 remains', interactive(s) && s.ok && !s.mic && s.rec.active === 0, s);
  check('iOS standalone: no page errors', !errors.length, errors);
  await ctx.close();
}
// 11. iOS standalone with a working recognizer still works
{
  const { ctx, p } = await setup(['result:sat'], { ios: true, standalone: true });
  await p.locator('.mic').click(); await p.waitForTimeout(1200);
  const s = await st(p);
  check('iOS standalone: working mic still succeeds', s.next && /sat/.test(s.status), s);
  await ctx.close();
}
// 12. iOS Safari (not standalone) keeps the big mic
{
  const { ctx, p } = await setup(['result:sat'], { ios: true });
  const s = await st(p);
  check('iOS Safari tab: big mic, no 👍 yet', s.mic && !s.ok, s);
  await ctx.close();
}
console.log(results.join('\n'));
console.log(failed ? failed + ' FAILED' : 'all passed');
await b.close();
process.exit(failed ? 1 : 0);
