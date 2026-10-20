// Run: node tools/level1-test.mjs  (needs a local server: python3 -m http.server 8765)
// Level 1 in the browser: A-Z list, the Q lesson (shown/said as Q, sound /kw/ from "queen"),
// answer choices, progress migration from the old 'qu' id, "keep going" / "next" order.
// Also writes screenshots/20-level1-az.png, 21-letter-q.png, 22-letter-q-find.png.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0; const results = [];
const check = (n, c, i) => { results.push((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(i).slice(0, 500))); if (!c) failed++; };
async function page(done = {}, shots = false) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: shots ? 2 : 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript((done) => {
    if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done, settings: {} })); }
    window.__tts = []; speechSynthesis.speak = (u) => { window.__tts.push(u.text); setTimeout(() => u.onend && u.onend(), 20); };
  }, done);
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  return { ctx, p, errors };
}
const spokenKeys = (p) => p.evaluate(() => window.Speech.debugLog().map((e) => e.key));

// 1. Level 1 list is A-Z with Q
{
  const { ctx, p, errors } = await page({}, true);
  await p.goto(BASE + '#/level/1'); await p.waitForSelector('.item.letter');
  const labels = await p.locator('.item.letter').allTextContents();
  check('Level 1 list shows a … z in order', labels.join('') === 'abcdefghijklmnopqrstuvwxyz', labels);
  check("Level 1 list has 'q', no 'qu'", labels.includes('q') && !labels.includes('qu'), labels);
  await p.waitForTimeout(400); await p.screenshot({ path: SHOTS + '20-level1-az.png' });
  // 2. Q lesson
  await p.waitForFunction(() => window.Speech.clipCount() > 400);
  await p.locator('.item.letter', { hasText: /^q$/ }).tap(); await p.waitForSelector('.big-letter');
  await p.waitForTimeout(6000);
  const big = await p.locator('.big-letter span').allTextContents();
  check('Q lesson shows "Q" and "q"', big[0] === 'Q' && big[1] === 'q', big);
  const kw = await p.locator('.keyword').textContent();
  check('Q lesson keyword is queen', /queen/.test(kw), kw);
  const k1 = await spokenKeys(p);
  check('Q lesson plays queen + the Q sound clip + queen', k1.includes('queen') && k1.includes('letters/q'), k1);
  check("nothing spoken says 'qu'", !k1.some((k) => /(^| )qu( |$)/.test(k)), k1);
  await p.screenshot({ path: SHOTS + '21-letter-q.png' });
  await p.locator('.foot .primary').tap(); await p.waitForSelector('.letter-choice'); await p.waitForTimeout(3500);
  const ch = await p.locator('.letter-choice').allTextContents();
  check('Q quiz: 3 choices incl. q, no c/k/qu', ch.length === 3 && ch.includes('q') && !ch.some((c) => ['c', 'k', 'qu'].includes(c)), ch);
  const k2 = await spokenKeys(p);
  check('Q quiz asks "which letter starts the word queen"', k2.includes('which letter starts the word queen'), k2.slice(-4));
  await p.screenshot({ path: SHOTS + '22-letter-q-find.png' });
  await p.locator('.letter-choice', { hasText: /^q$/ }).tap(); await p.waitForSelector('.done-mark', { timeout: 6000 });
  check('Q lesson completes, saved as L1-q', !!(await p.evaluate(() => window.__readAloud.state().done['L1-q'])));
  const tts = await p.evaluate(() => window.__tts);
  check('no built-in voice used in the Q lesson', tts.length === 0, tts);
  check('no page errors', !errors.length, errors);
  await ctx.close();
}
// 3. Answer choices for every letter: right letter present, 3 distinct, no sound-alikes
{
  const { ctx, p } = await page();
  const bad = [];
  for (const l of 'abcdefghijklmnopqrstuvwxyz') {
    for (let r = 0; r < 2; r++) {
      await p.goto(BASE + '#/lesson/L1-' + l); await p.waitForSelector('.big-letter');
      await p.locator('.foot .primary').click(); await p.waitForSelector('.letter-choice');
      const ch = await p.locator('.letter-choice').allTextContents();
      const conf = { c: ['k', 'q'], k: ['c', 'q'], q: ['c', 'k'] }[l] || [];
      if (ch.length !== 3 || new Set(ch).size !== 3 || !ch.includes(l) || ch.some((c) => conf.includes(c))) bad.push([l, ch]);
    }
  }
  check('every letter quiz: 3 different choices, includes the answer, no c/k/q mix-ups', !bad.length, bad);
  await ctx.close();
}
// 4. Old saved progress (phonics order, with 'qu') still counts; keep going = first undone A-Z
{
  const t = Date.now();
  const { ctx, p } = await page({ 'L1-s': t, 'L1-a': t, 'L1-t': t, 'L1-qu': t, 'L2-sat': t });
  await p.goto(BASE + '#/home'); await p.waitForSelector('.tile');
  const done = await p.evaluate(() => window.__readAloud.state().done);
  check("old 'L1-qu' progress migrated to 'L1-q'", done['L1-q'] && !done['L1-qu'] && done['L1-s'] && done['L1-a'] && done['L2-sat'], done);
  const stored = await p.evaluate(() => JSON.parse(localStorage.getItem('readAloud.v1')).done);
  check('migration saved', stored['L1-q'] && !stored['L1-qu'], stored);
  const keep = await p.locator('.foot .primary').textContent();
  check('home "keep going" points to b (first unfinished letter A-Z)', /\bb\b/.test(keep), keep);
  await p.locator('.foot .primary').tap(); await p.waitForSelector('.big-letter');
  check('keep going opens L1-b', p.url().endsWith('#/lesson/L1-b'), p.url());
  await p.goto(BASE + '#/level/1'); await p.waitForSelector('.item.letter');
  const ticked = await p.locator('.item.letter.done').allTextContents();
  check('Level 1 list ticks a, q, s, t', JSON.stringify(ticked.map((x) => x.replace('✓', ''))) === JSON.stringify(['a', 'q', 's', 't']), ticked);
  // finishing a letter: "next" goes to the next letter alphabetically
  await p.goto(BASE + '#/lesson/L1-b'); await p.waitForSelector('.big-letter');
  await p.locator('.foot .primary').click(); await p.waitForSelector('.letter-choice');
  await p.locator('.letter-choice', { hasText: /^b$/ }).click(); await p.waitForSelector('.done-mark', { timeout: 6000 });
  await p.locator('.foot .primary').click(); await p.waitForSelector('.big-letter');
  check('after b, "next" opens c', p.url().endsWith('#/lesson/L1-c'), p.url());
  await ctx.close();
}
console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'all passed');
await b.close(); process.exit(failed ? 1 : 0);
