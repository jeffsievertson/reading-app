// Run: node tools/level1-test.mjs  (needs a local server: python3 -m http.server 8765)
// Level 1 in the browser: A-Z list, the Q lesson (shown/said as Q, sound /kw/ from "queen"),
// answer choices, progress migration from the old 'qu' id, "keep going" / "next" order.
// Also writes screenshots/20-level1-az.png, 21-letter-q.png, 22-letter-q-find.png,
// 23-letter-intro-a.png, 24-letter-intro-e.png.
import { chromium } from 'playwright-core';
import { readFileSync } from 'node:fs';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const CLIPS = await (await fetch(BASE + 'audio/clips.json?nc=' + Date.now())).json();
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
  await p.waitForFunction(() => window.Speech.debugLog().filter((e) => e.key === 'queen').length >= 2, null, { timeout: 20000 }).catch(() => {});
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
// 5. Every letter lesson: NAME first, then the SOUND twice (real letter-sound clip), then the
//    usual intro (keyword … sound … keyword) — all natural-voice clips, nothing missing
//    (screenshots 23/24: the A and E intro screens)
{
  const { ctx, p } = await page({}, true);
  await p.goto(BASE + '#/level/1'); await p.waitForSelector('.item.letter');
  await p.waitForFunction(() => window.Speech.clipCount() > 400);
  const bad = [], badHuman = [];
  for (const l of 'abcdefghijklmnopqrstuvwxyz') {
    const it = await p.evaluate((l) => window.CONTENT.letters.find((x) => x.l === l), l);
    await p.evaluate(() => window.Speech.stop());
    const n0 = (await p.evaluate(() => window.Speech.debugLog().length));
    await p.locator('.item.letter', { hasText: new RegExp('^' + l + '$') }).tap();
    await p.waitForSelector('.big-letter');
    await p.waitForFunction((n0) => { const L = window.Speech.debugLog(); return L.length - n0 >= 8 || L.length >= 300; }, n0, { timeout: 15000 }).catch(() => {});
    const L = (await p.evaluate(() => window.Speech.debugLog())).slice(n0);
    if (l === 'a' || l === 'e') await p.screenshot({ path: SHOTS + (l === 'a' ? '23-letter-intro-a.png' : '24-letter-intro-e.png') });
    const keys = L.map((e) => e.key);
    const intro = it.pos === 'end' ? 'this letter makes the sound at the end of' : 'this letter makes the first sound in';
    const want = ['this is the letter ' + l, 'it makes the sound', 'letters/' + l, 'letters/' + l, intro, it.kw, 'letters/' + l, it.kw];
    if (JSON.stringify(keys.slice(0, 8)) !== JSON.stringify(want) || L.slice(0, 8).some((e) => e.how !== 'clip')) bad.push({ l, keys: keys.slice(0, 8), how: L.slice(0, 8).map((e) => e.how) });
    const humanUrl = CLIPS.letters['letters/' + l];
    const soundUrls = L.slice(0, 8).filter((e) => e.key === 'letters/' + l).map((e) => e.url);
    if (soundUrls.length !== 3 || soundUrls.some((u) => !u || !u.endsWith(humanUrl))) badHuman.push({ l, want: humanUrl, got: soundUrls });
    await p.goto(BASE + '#/level/1'); await p.waitForSelector('.item.letter');
  }
  check('all 26 letters: "This is the letter X." → "It makes the sound" → sound, sound → usual intro, all clips', !bad.length, bad);
  check('all 26 letters: intro sound (x3) plays the human recording human/letters/<l>-*.mp3', !badHuman.length, badHuman);
  await ctx.close();
}
// 5b. Human letter sounds: every letter (and every letter-sound key used by blending, e.g. 'sss')
//     resolves to its human clip; the clip is precached and served; the lesson 🔊, the big letter
//     and the Level 2 tiles play the same file. (Find-the-letter only says the prompt + keyword.)
{
  const bad = [];
  const HUMAN = /^human\/letters\/[a-z]-[0-9a-f]{8}\.mp3$/;
  const report = JSON.parse(readFileSync(new URL('./audio/build-report.json', import.meta.url)));
  const info = Object.fromEntries((report.letters || []).map((x) => [x.letter, x]));
  for (const l of 'abcdefghijklmnopqrstuvwxyz') {
    const rel = CLIPS.letters['letters/' + l];
    if (!HUMAN.test(rel || '') || !rel.startsWith('human/letters/' + l + '-')) bad.push({ l, rel, why: 'not a human clip' });
    if (!CLIPS.files.includes(rel)) bad.push({ l, rel, why: 'not precached' });
    if (!info[l] || info[l].source !== 'human recording' || info[l].file !== rel) bad.push({ l, why: 'build-report', info: info[l] });
    const r = await fetch(BASE + 'audio/' + rel); if (!r.ok) bad.push({ l, rel, why: 'HTTP ' + r.status });
  }
  const sk = Object.entries(CLIPS.clips).filter(([, v]) => v.includes('/letters/'));
  if (sk.length < 25 ||  // c and k share 'kuh'
      sk.some(([, v]) => !HUMAN.test(v) || !Object.values(CLIPS.letters).includes(v))) bad.push({ why: 'sound keys', sk });
  check('every letter A–Z resolves to its human recording (clips.json, precache list, build report, served)', !bad.length, bad);
  const { ctx, p } = await page();
  const clipsAfter = async (n0) => (await p.evaluate(() => window.Speech.debugLog())).slice(n0).filter((e) => e.how === 'clip' && /^letters\//.test(e.key));
  const human = (L, l) => L.length > 0 && L.every((e) => e.key === 'letters/' + l && e.url && e.url.endsWith(CLIPS.letters[e.key]) && HUMAN.test(CLIPS.letters[e.key]));
  await p.goto(BASE + '#/lesson/L1-m'); await p.waitForSelector('.big-letter');
  await p.waitForFunction(() => window.Speech.clipCount() > 400); await p.waitForTimeout(500);
  await p.evaluate(() => window.Speech.stop());
  let n0 = (await p.evaluate(() => window.Speech.debugLog().length));
  await p.locator('.foot .icon-btn').first().tap(); await p.waitForTimeout(2500);
  let L = await clipsAfter(n0);
  check('letter lesson 🔊 button plays the human M clip', human(L, 'm'), L);
  await p.evaluate(() => window.Speech.stop());
  n0 = (await p.evaluate(() => window.Speech.debugLog().length));
  await p.locator('.big-letter').tap(); await p.waitForTimeout(2500);
  L = await clipsAfter(n0);
  check('tapping the big letter plays the human M clip', human(L, 'm'), L);
  await p.goto(BASE + '#/lesson/L2-sat'); await p.waitForSelector('.tile-letter'); await p.waitForTimeout(500);
  await p.evaluate(() => window.Speech.stop());
  n0 = (await p.evaluate(() => window.Speech.debugLog().length));
  await p.locator('.tile-letter').nth(2).tap(); await p.waitForTimeout(1200);
  L = await clipsAfter(n0);
  check('Level 2 letter tile 🔊 plays the human T clip', human(L, 't'), L);
  await ctx.close();
}
// 6. Built-in voice fallback (phone voice chosen): letter names are respelled so they are said right
{
  const { ctx, p } = await page();
  await p.goto(BASE + '#/settings'); await p.waitForSelector('.settings');
  await p.evaluate(() => { const s = document.querySelector('select'); s.value = '__phone'; s.dispatchEvent(new Event('change')); });
  const said = {};
  for (const l of ['a', 'e', 'i', 'u', 'b']) {
    await p.goto(BASE + '#/lesson/L1-' + l); await p.waitForSelector('.big-letter'); await p.waitForTimeout(600);
    said[l] = (await p.evaluate(() => window.__tts)).filter((t) => /^This is the letter/.test(t)).pop();
  }
  check('phone voice says "letter ay / ee / eye / you / B"', said.a === 'This is the letter ay.' && said.e === 'This is the letter ee.' && said.i === 'This is the letter eye.' && said.u === 'This is the letter you.' && said.b === 'This is the letter B.', said);
  await ctx.close();
}
console.log(results.join('\n')); console.log(failed ? failed + ' FAILED' : 'all passed');
await b.close(); process.exit(failed ? 1 : 0);
