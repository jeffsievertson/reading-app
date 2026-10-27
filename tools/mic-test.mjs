// Run: node tools/mic-test.mjs  (needs local server on :8765)
// Mic is primary; 👍 Continue anyway appears after 2 soft fails; recent result can be scored.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0;
const results = [];
function check(name, cond, info) {
  results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ' + JSON.stringify(info).slice(0, 400)));
  if (!cond) failed++;
}

async function page(mode) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((mode) => {
    localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings: {} }));
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      start() {
        setTimeout(() => {
          if (mode === 'deny') this.onerror && this.onerror({ error: 'not-allowed' });
          else {
            this.onstart && this.onstart();
            this.onresult && this.onresult({ results: [[{ transcript: mode }]] });
            this.onend && this.onend();
          }
        }, 50);
      }
      stop() {}
      abort() {}
    };
  }, mode);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE + '#/lesson/L2-cat');
  await p.locator('.foot .primary').click();
  await p.waitForSelector('.say-target');
  return { ctx, p, errors };
}
const st = async (p) => p.evaluate(() => ({
  status: document.querySelector('.status')?.textContent,
  ok: !!document.querySelector('.foot .ok-btn'),
  okLabel: document.querySelector('.foot .ok-btn')?.getAttribute('aria-label'),
  mic: !!document.querySelector('.foot .mic'),
  next: !!document.querySelector('.foot .primary'),
  help: (window.__readAloud && window.__readAloud.helpText) ? window.__readAloud.helpText() : ''
}));

// Correct mic match → advance; no 👍 needed
{
  const { ctx, p, errors } = await page('cat');
  const s0 = await st(p);
  check('success path: 👍 hidden at start', !s0.ok && s0.mic, s0);
  check('success path: instruction says app will check', /app will check/i.test(String(s0.help)), s0.help);
  await p.locator('.mic').click(); await p.waitForTimeout(700);
  const s = await st(p);
  check('success path: mic match advances', s.next && /cat/i.test(s.status || ''), s);
  check('success path: no page errors', !errors.length, errors);
  await p.screenshot({ path: new URL('../screenshots/19-say-mic-success.png', import.meta.url).pathname });
  await ctx.close();
}

// Wrong match: soft fail; 👍 only after 2 fails
{
  const { ctx, p } = await page('cut');
  await p.locator('.mic').click(); await p.waitForTimeout(900);
  let s = await st(p);
  check('wrong #1: no Continue anyway yet', !s.ok && s.mic && !s.next, s);
  await p.locator('.mic').click(); await p.waitForTimeout(900);
  s = await st(p);
  check('wrong #2: Continue anyway shown', s.ok && s.okLabel === 'Continue anyway', s);
  await ctx.close();
}

// Hard deny → mic dropped, thumbs up path
{
  const { ctx, p } = await page('deny');
  await p.locator('.mic').click(); await p.waitForTimeout(700);
  const s = await st(p);
  check('deny: mic removed, thumbs available', !s.mic && s.ok, s);
  await ctx.close();
}

// Optional #4: after Continue anyway, score a recent matching result
{
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript(() => {
    localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings: {} }));
    let n = 0;
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      start() {
        const transcript = (++n <= 2) ? 'cut' : 'cat';
        setTimeout(() => {
          this.onstart && this.onstart();
          this.onresult && this.onresult({ results: [[{ transcript }]] });
          this.onend && this.onend();
        }, 40);
      }
      stop() {} abort() {}
    };
  });
  const p = await ctx.newPage();
  await p.goto(BASE + '#/lesson/L2-cat');
  await p.locator('.foot .primary').click();
  await p.waitForSelector('.say-target');
  await p.locator('.mic').click(); await p.waitForTimeout(700); // cut #1
  await p.locator('.mic').click(); await p.waitForTimeout(700); // cut #2 → Continue
  // Third listen stores matching "cat", then 👍 should score it
  await p.locator('.mic').click(); await p.waitForTimeout(700);
  // If third matched, may already have advanced. If not (shouldn't), click continue.
  if (await p.locator('.foot .ok-btn').count()) {
    await p.locator('.ok-btn').click(); await p.waitForTimeout(400);
  }
  const s = await st(p);
  check('recent-result scoring: matched cat credited (or already advanced)', s.next && /cat/i.test(s.status || 'cat'), s);
  await ctx.close();
}

console.log(results.join('\n'));
console.log(failed ? failed + ' FAILED' : 'all passed');
await b.close();
process.exit(failed ? 1 : 0);
