// Run: node tools/listen-note-test.mjs  (needs local server on :8765)
// v17: while the mic is listening, a big "Say …, then wait. I'll check it for you." note shows
// on every say-it step; it hides when listening ends. Writes screenshots/30-listen-*.png.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const WORD = 'Say the word, then wait. I’ll check it for you.';
const PHRASE = 'Say it, then wait. I’ll check it for you.';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0; const results = [];
const check = (n, c, i) => { results.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(i).slice(0, 400))); if (!c) failed++; };
const CASES = [
  ['L2-cat', WORD, 'word'], ['L3-sw-the', WORD, 'sight'], ['L3-s3', PHRASE, 'sentence'],
  ['L4-sign-restroom', WORD, 'sign'], ['L4-menu-chicken', WORD, 'menu'],
  ['L4-form-date-of-birth', PHRASE, 'form'], ['L4-kjv-genesis-1-1', PHRASE, 'verse']
];
for (const [id, want, tag] of CASES) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
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
  check(`${tag}: note hidden before mic`, !(await note.isVisible()));
  await p.locator('.foot .mic').click();
  await p.waitForFunction(() => window.__rec, null, { timeout: 5000 });
  await p.waitForTimeout(300);
  const txt = (await note.textContent()) || '';
  check(`${tag}: note visible while listening`, await note.isVisible());
  check(`${tag}: text = "${want}"`, txt === want, txt);
  const m = await p.evaluate(() => {
    const n = document.querySelector('.listen-note').getBoundingClientRect();
    const f = document.querySelector('.foot').getBoundingClientRect();
    const fs = parseFloat(getComputedStyle(document.querySelector('.listen-note')).fontSize);
    const over = [...document.querySelectorAll('.screen *')].filter((e) => e.scrollWidth > e.clientWidth + 1 && getComputedStyle(e).overflowX !== 'visible' && e.clientWidth > 0).map((e) => e.className);
    const btnTop = Math.min(...[...document.querySelectorAll('.foot button')].map((x) => x.getBoundingClientRect().top));
    return { noteInFoot: !!document.querySelector('.foot > .listen-note'), btnTop, footBottom: f.bottom, vh: innerHeight, left: n.left, right: n.right, bottom: n.bottom, footTop: f.top, fs, vw: innerWidth, docW: document.documentElement.scrollWidth, over };
  });
  check(`${tag}: inside screen, no page overflow`, m.left >= 0 && m.right <= m.vw && m.docW <= m.vw, m);
  check(`${tag}: in footer above buttons, no overlap`, m.noteInFoot && m.bottom <= m.btnTop + 1 && m.footBottom <= m.vh + 1, m);
  check(`${tag}: big text (>=24px)`, m.fs >= 24, m.fs);
  await p.screenshot({ path: `${SHOTS}30-listen-${tag}.png` });
  await p.evaluate(() => window.__finish('zzz nope'));
  await p.waitForTimeout(400);
  check(`${tag}: note hidden after listening ends`, !(await note.isVisible()));
  check(`${tag}: no page errors`, errors.length === 0, errors);
  await ctx.close();
}
await b.close();
console.log(results.join('\n'));
console.log(failed ? `${failed} FAILED` : 'ALL PASS');
process.exit(failed ? 1 : 0);
