// Run: node tools/v21-levels-test.mjs  (needs local server on :8765; BASE=<url>; SHOTS=0 to skip)
// v21: Spellings (6) and Sounds together (7) after Everyday; Real Life is 8, Bible is 9.
// Old item ids and v20 progress still work. Grapheme tiles. Heart words. Fits at 390 and 320.
// Writes screenshots/50-*-<390|320>.png
import { chromium } from 'playwright-core';
import fs from 'fs'; import vm from 'vm';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const ROOT = new URL('../', import.meta.url).pathname;
const SHOTS = ROOT + 'screenshots/'; const SHOOT = process.env.SHOTS !== '0';
let failed = 0;
const check = (n, c, i) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(i).slice(0, 700))); if (!c) failed++; };

const ctx0 = { window: {} }; vm.createContext(ctx0);
vm.runInContext(fs.readFileSync(ROOT + 'js/content.js', 'utf8'), ctx0);
const C = ctx0.window.CONTENT;

check('levels in v21 order', C.levels.map((l) => l.n + l.name).join(',') ===
  '1Sounds,2Words,3Missing Letter,4Sentences,5Everyday,6Spellings,7Sounds together,8Real Life,9Bible', C.levels.map((l) => l.name));
check('C.items is in level order (keep going follows the levels)', C.items.every((it, i) => !i || C.items[i - 1].level <= it.level));
check('REAL_LIFE is 8, BIBLE is 9', C.REAL_LIFE === 8 && C.BIBLE === 9);
check('saved v20 ids unchanged', ['L3-s1', 'L3-sw-the', 'L4-sign-stop', 'L4-kjv-john-11-35', 'L5-rent', 'L1-q', 'L3m-cat'].every((id) => C.items.some((x) => x.id === id)));
check('new ids do not use a display-number prefix', [...C.items.filter((x) => x.level === 6 || x.level === 7)].every((x) => !/^L[67]-/.test(x.id)), C.items.filter((x) => x.level === 6 || x.level === 7).map((x) => x.id).slice(0, 8));

const first6 = C.items.find((x) => x.level === 6);
check('Spellings starts with Book 3 hearts (of, said, are, they)', first6.id === 'SW-of' && C.items.filter((x) => x.level === 6 && x.kind === 'sight').map((x) => x.w).join(',') === 'of,said,are,they');
const first7 = C.items.find((x) => x.level === 7);
check('Sounds together starts with Book 4 hearts (do, have, what, there, where)', first7.id === 'SW-do' && C.items.filter((x) => x.level === 7 && x.kind === 'sight').map((x) => x.w).join(',') === 'do,have,what,there,where');

const seg = (w) => C.segments(w).map((p) => p.g).join('|');
for (const [w, want] of [['shop','sh|o|p'],['check','ch|e|ck'],['bills','b|i|ll|s'],['fill','f|i|ll'],['that','th|a|t'],['when','wh|e|n'],['long','l|o|ng'],['cat','c|a|t'],['sock','s|o|ck'],['off','o|ff'],['with','w|i|th'],['path','p|a|th']]) {
  check(`segments ${w} -> ${want}`, seg(w) === want, seg(w));
}
check('that uses voiced th clip', C.segments('that')[0].clip === 'patterns/th-voiced');
check('path uses voiceless th clip', C.segments('path')[2].clip === 'patterns/th');
check('bills final s says /z/', C.segments('bills').at(-1).sound === 'zzz' && C.segments('bills').at(-1).clip === 'letters/z');

// Decodability: new sentences only use taught graphemes + listed hearts + earlier words + "a"
const hearts = new Set(['the','i','is','to','my','we','he','see','was','you','a','of','said','are','they','do','have','what','there','where']);
const knownWords = new Set(C.words.map((x) => x.w).concat(C.everydayWords.map((x) => x.w), C.spellWords.map((x) => x.w), C.digraphWords.map((x) => x.w), [...hearts], 'had','up','it','in','and','at','got','can','dad','on','hot','big','cup','mud','pan','box','gas','bus','van','top','ten','job'));
const clean = (w) => w.replace(/[^A-Za-z']/g, '').toLowerCase();
const badSent = [];
for (const s of C.spellSentences.concat(C.digraphSentences)) {
  for (const w of s.split(/\s+/).map(clean).filter(Boolean)) {
    if (!knownWords.has(w)) badSent.push(s + ' -> ' + w);
  }
}
check('new sentences only use taught words and listed hearts', !badSent.length, badSent);

// every new spoken line / word has a recorded clip (after the audio build)
const clipsPath = ROOT + 'audio/clips.json';
const clips = JSON.parse(fs.readFileSync(clipsPath, 'utf8'));
const key = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const need = [...C.levels.map((l) => l.say), ...C.spellHearts.map((x) => x.w), ...C.digraphHearts.map((x) => x.w),
  ...C.spellWords.map((x) => x.w), ...C.digraphWords.map((x) => x.w), ...C.spellSentences, ...C.digraphSentences,
  'This is a heart word. You remember it. It says:', 'Level 6. Spellings.', 'Level 7. Sounds together.',
  'Level 8. Real life reading.', 'Level 9. Bible verses. King James Version.',
  'Together they make the sound'];
const noClip = need.filter((t) => !clips.clips[key(t)]);
check('new spoken lines / words have Kokoro clips', noClip.length === 0, noClip);
check('every new word has a slow blending clip', C.spellWords.concat(C.digraphWords).every((x) => clips.slow[key(x.w)]), C.spellWords.concat(C.digraphWords).filter((x) => !clips.slow[key(x.w)]).map((x) => x.w));
check('pattern sounds are one key each in clips.json', ['sh','ch','th','th-voiced','wh','ng'].every((id) => clips.patterns && clips.patterns['patterns/' + id]), clips.patterns);
check('pattern sounds did not replace Whitney letter wuh', clips.letters['letters/w'] && clips.letters['letters/w'].startsWith('human/'));

// migration: every pre-v21 item done -> keep going opens SW-of; Real Life / Bible still marked done
const v20ids = C.items.filter((x) => x.level <= 5 || x.level === C.REAL_LIFE || x.level === C.BIBLE).map((x) => x.id);
const t0 = Date.now();
const doneAll = Object.fromEntries(v20ids.map((id) => [id, t0]));
const undone = C.items.filter((x) => !doneAll[x.id]);
check('after v20 progress, first undone is SW-of (Spellings heart)', undone[0] && undone[0].id === 'SW-of', undone.slice(0, 3).map((x) => x.id));
check('v20-complete user still has Real Life and Bible at 100%', v20ids.filter((id) => C.items.find((x) => x.id === id).level === C.REAL_LIFE).length >= 8 && v20ids.filter((id) => C.items.find((x) => x.id === id).kind === 'verse').length === 8);

const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
async function open(W, hash, done = {}) {
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript((done) => {
    if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done, settings: {} })); }
    window.__say = 'cat';
    window.SpeechRecognition = window.webkitSpeechRecognition = class {
      start() { window.__rec = this; setTimeout(() => { if (this.dead) return; this.onstart && this.onstart();
        setTimeout(() => { if (this.dead) return; this.onspeechstart && this.onspeechstart(); this.onresult && this.onresult({ results: [[{ transcript: window.__say }]] }); this.onend && this.onend(); }, 600); }, 30); }
      stop() { this.dead = true; this.onend && this.onend(); }
      abort() { this.dead = true; this.onerror && this.onerror({ error: 'aborted' }); this.onend && this.onend(); }
    };
  }, done);
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto(BASE + hash);
  return { ctx, p, errors };
}
const layout = (p) => p.evaluate(() => {
  const vw = innerWidth, bad = [];
  for (const n of document.querySelectorAll('main button, main .chip, main .tile-letter, main .big-word, .foot button, .big-letter, .keyword')) {
    const r = n.getBoundingClientRect(); if (!r.width) continue;
    if (r.left < -0.5 || r.right > vw + 0.5) bad.push('off-screen: ' + (n.textContent || n.className).trim().slice(0, 30));
    if (n.scrollWidth > n.clientWidth + 1) bad.push('text spills: ' + n.textContent.trim().slice(0, 30));
  }
  for (const row of document.querySelectorAll('.tiles, .choices, .foot, .sentence, .grid2, .items')) {
    const k = [...row.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width);
    for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
      const a = k[i], c = k[j];
      if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) bad.push('overlap in .' + row.className.split(' ')[0]);
    }
  }
  const t = document.querySelector('.top .title');
  if (t && !t.querySelector('.dots') && t.textContent && (t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().height > 44)) bad.push('title wraps/spills: ' + t.textContent);
  for (const n of document.querySelectorAll('.tile-name')) if (n.scrollWidth > n.clientWidth + 1 || n.getBoundingClientRect().height > 32) bad.push('tile name wraps/spills: ' + n.textContent);
  const sizes = [...document.querySelectorAll('.items .item:not(.wide) > span:first-child')].map((s) => getComputedStyle(s).fontSize);
  return { docW: document.documentElement.scrollWidth, vw, bad: [...new Set(bad)], tileSizes: [...new Set(sizes)] };
});
const okLayout = (n, L) => check(n + ': fits, no overlap' + (L.tileSizes.length ? ', one tile size' : ''), L.docW <= L.vw && !L.bad.length && L.tileSizes.length <= 1, L);
const shot = async (p, name, W) => { if (SHOOT) await p.screenshot({ path: `${SHOTS}50-${name}-${W}.png` }); };
const said = (p) => p.evaluate(() => window.Speech.debugLog().filter((e) => e.how === 'clip' || e.how === 'tts').map((e) => e.how + ':' + (e.text || e.key)));

{ const { ctx, p } = await open(390, '#/home'); await p.waitForTimeout(2000); await ctx.close(); }

for (const W of [390, 320]) {
  for (const [hash, name, sel] of [
    ['#/home', 'home', '.tile'],
    ['#/level/6', 'level6-spellings', '.items .item'],
    ['#/level/7', 'level7-together', '.items .item'],
    ['#/level/8', 'level8-reallife', '.tile'],
    ['#/level/9', 'level9-bible', '.items .item']
  ]) {
    const { ctx, p, errors } = await open(W, hash);
    await p.waitForSelector(sel); await p.waitForTimeout(1200);
    okLayout(`${W} ${name}`, await layout(p)); await shot(p, name, W);
    const s = await said(p);
    check(`${W} ${name}: spoken from clips (${s.length})`, s.length > 0 && s.every((x) => x.startsWith('clip:')), s.slice(0, 8));
    if (name === 'home') check(`${W} home: 9 level tiles`, (await p.locator('.grid2 .tile').count()) === 9);
    check(`${W} ${name}: no page errors`, !errors.length, errors);
    await ctx.close();
  }
  // old category routes still work; back link uses the new number
  for (const hash of ['#/level/6/signs', '#/level/4/menu', '#/level/8/signs']) {
    const { ctx, p, errors } = await open(W, hash);
    await p.waitForSelector('.items .item', { timeout: 5000 }).catch(() => {});
    const n = await p.locator('.items .item').count();
    check(`${W} ${hash}: lists items (${n})`, n >= 8 && !errors.length, { n, errors });
    await ctx.close();
  }
  {
    const { ctx, p } = await open(W, '#/lesson/L4-sign-stop');
    await p.waitForSelector('.thing'); await p.locator('header .icon-btn').first().tap(); await p.waitForTimeout(300);
    check(`${W} sign back -> #/level/8/signs`, p.url().endsWith('#/level/8/signs'), p.url());
    await ctx.close();
  }
  {
    const { ctx, p } = await open(W, '#/lesson/L4-kjv-john-11-35');
    await p.waitForSelector('.foot .primary'); await p.locator('header .icon-btn').first().tap(); await p.waitForTimeout(300);
    check(`${W} Bible back -> #/level/9`, p.url().endsWith('#/level/9'), p.url());
    await ctx.close();
  }
  // heart word + pattern + grapheme word
  for (const [id, name, expect] of [
    ['SW-of', 'heart-of', null],
    ['P-ck', 'pattern-ck', null],
    ['P-sh', 'pattern-sh', null],
    ['W-sock', 'word-sock', 's,o,ck'],
    ['W-shop', 'word-shop', 'sh,o,p'],
    ['W-bills', 'word-bills', 'b,i,ll,s'],
    ['S-sp-4', 'spell-sentence', null],
    ['S-dg-3', 'digraph-sentence', null]
  ]) {
    const { ctx, p, errors } = await open(W, '#/lesson/' + id);
    await p.waitForSelector('.foot .primary, .big-word, .big-letter, .tiles, .sentence', { timeout: 8000 });
    await p.waitForTimeout(1400);
    if (expect) {
      const tiles = (await p.locator('.tiles .tile-letter').allTextContents()).map((x) => x.trim()).join(',');
      check(`${W} ${name}: grapheme tiles ${expect}`, tiles === expect, tiles);
    }
    okLayout(`${W} ${name} learn`, await layout(p)); await shot(p, name + '-learn', W);
    const s = await said(p);
    check(`${W} ${name}: spoken from clips`, s.length > 0 && s.every((x) => x.startsWith('clip:')), s.slice(0, 10));
    check(`${W} ${name}: no page errors`, !errors.length, errors);
    await ctx.close();
  }
  // migration in the browser: all v20 items done, Keep going opens of
  {
    const { ctx, p, errors } = await open(W, '#/home', doneAll);
    await p.waitForSelector('.tile'); await p.waitForTimeout(800);
    await shot(p, 'migration-home', W);
    const go = p.locator('.foot .primary');
    check(`${W} migration: Keep going is visible`, await go.count());
    await go.tap(); await p.waitForSelector('.big-word, .big-letter', { timeout: 8000 });
    const word = await p.locator('.big-word').textContent().catch(() => '');
    check(`${W} migration: Keep going opens of`, /of/i.test(word || ''), { url: p.url(), word });
    // Real Life tile should show as done
    await p.goto(BASE + '#/home'); await p.waitForSelector('.tile');
    const doneTiles = await p.locator('.grid2 .tile.done').count();
    check(`${W} migration: at least Real Life + Bible (+ 1-5) marked done`, doneTiles >= 7, doneTiles);
    check(`${W} migration: no page errors`, !errors.length, errors);
    await ctx.close();
  }
}
await b.close();
console.log(failed ? failed + ' FAILED' : 'all passed');
process.exit(failed ? 1 : 0);
