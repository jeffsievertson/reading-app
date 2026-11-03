// Run: node tools/listen-note-test.mjs  (needs local server on :8765)
// v18: the v17 on-screen "Say …, then wait." note is gone (the learner can't read it); the countdown ring
// shows while listening instead. Writes screenshots/30-listen-*.png; no 👂 left after Stop (32-after-stop-*.png).
// (W=320 env runs it at a narrow phone width, screenshots get a -320 suffix).
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const W = +(process.env.W || 390); const SUF = W === 390 ? '' : '-' + W;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0; const results = [];
const check = (n, c, i) => { results.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(i).slice(0, 400))); if (!c) failed++; };
const CASES = [
  ['L2-cat', 'word'], ['L3-sw-the', 'sight'], ['L3-s3', 'sentence'],
  ['L4-sign-restroom', 'sign'], ['L4-menu-chicken', 'menu'],
  ['L4-form-date-of-birth', 'form'], ['L4-kjv-genesis-1-1', 'verse']
];
for (const [id, tag] of CASES) {
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => {
    localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings: {} }));
    // recognizer that starts and stays open until told to finish (mock listening state)
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      start() { window.__rec = this; setTimeout(() => this.onstart && this.onstart(), 30); }
      stop() { this.onend && this.onend(); } abort() { this.onerror && this.onerror({ error: 'aborted' }); this.onend && this.onend(); }
    };
    window.__finish = (t) => { const r = window.__rec; r.onresult && r.onresult({ results: [[{ transcript: t }]] }); r.onend && r.onend(); };
  });
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE + '#/lesson/' + id);
  await p.locator('.foot .primary').click();
  await p.waitForSelector('.say-target');
  const note = p.locator('.listen-note');
  check(`${tag}: no listen note before mic`, (await note.count()) === 0);
  await p.locator('.foot .mic').click();
  await p.waitForFunction(() => window.__rec, null, { timeout: 5000 });
  await p.waitForTimeout(300);
  check(`${tag}: no on-screen listen note while listening (v18: learners can't read it)`, (await note.count()) === 0);
  check(`${tag}: countdown ring shows instead`, (await p.locator('.foot .mic .mic-ring').count()) === 1);
  const m = await p.evaluate(() => {
    const over = [...document.querySelectorAll('.screen *')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible' && e.clientWidth > 0).map((e) => e.className);
    return { vw: innerWidth, docW: document.documentElement.scrollWidth, over };
  });
  check(`${tag}: no page overflow`, m.docW <= m.vw && !m.over.length, m);
  await p.screenshot({ path: `${SHOTS}30-listen-${tag}${SUF}.png` });
  // Stop while listening: note hides and no 👂 / … is left in the status area
  await p.locator('.foot .mic').click();
  await p.waitForTimeout(400);
  const st = (await p.locator('.status').textContent()) || '';
  check(`${tag}: after Stop, ring gone`, (await p.locator('.mic-ring').count()) === 0);
  check(`${tag}: after Stop, no 👂/… left`, !/👂|…/.test(st), st);
  if (tag === 'word' || tag === 'verse') await p.screenshot({ path: `${SHOTS}32-after-stop-${tag}${SUF}.png` });
  await p.evaluate(() => { window.__rec = null; });
  await p.locator('.foot .mic').click();
  await p.waitForFunction(() => window.__rec, null, { timeout: 5000 });
  await p.waitForTimeout(300);
  await p.evaluate(() => window.__finish('zzz nope'));
  await p.waitForTimeout(400);
  check(`${tag}: ring gone after listening ends`, (await p.locator('.mic-ring').count()) === 0);
  check(`${tag}: still no listen note`, (await note.count()) === 0);
  check(`${tag}: no page errors`, errors.length === 0, errors);
  await ctx.close();
}
await b.close();
console.log(results.join('\n'));
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
