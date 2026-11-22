// Run: node tools/v23-levels-test.mjs  (needs local server on :8765; BASE=<url>; SHOTS=0 to skip)
// v23: Silent e (Book 7) after Starting blends; Real Life is 11, Bible is 12.
// Old item ids and earlier progress still work. VCe grapheme tiles; cap/cape-style pairs.
// Writes screenshots/80-*-<390|320>.png
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

check('levels in v23 order', C.levels.map((l) => l.n + l.name).join(',') ===
  '1Sounds,2Words,3Missing Letter,4Sentences,5Everyday,6Spellings,7Sounds together,8Ending blends,9Starting blends,10Silent e,11Real Life,12Bible', C.levels.map((l) => l.name));
check('C.items is in level order (keep going follows the levels)', C.items.every((it, i) => !i || C.items[i - 1].level <= it.level));
check('REAL_LIFE is 11, BIBLE is 12', C.REAL_LIFE === 11 && C.BIBLE === 12);
check('saved earlier ids unchanged', ['L3-s1', 'L3-sw-the', 'L4-sign-stop', 'L4-kjv-john-11-35', 'L5-rent', 'L1-q', 'L3m-cat', 'SW-of', 'SW-do', 'SW-from', 'SW-again', 'P-ck', 'P-sh', 'P-ed', 'W-shop', 'W-last', 'W-stop', 'S-dg-1', 'S-eb-1', 'S-sb-1'].every((id) => C.items.some((x) => x.id === id)));
check('new silent-e ids do not use a display-number prefix', C.items.filter((x) => x.level === 10).every((x) => !/^L10-/.test(x.id)), C.items.filter((x) => x.level === 10).map((x) => x.id).slice(0, 8));

const first10 = C.items.find((x) => x.level === 10);
check('Silent e starts with Book 7 hearts (does, done, give, live, love)', first10.id === 'SW-does' && C.items.filter((x) => x.level === 10 && x.kind === 'sight').map((x) => x.w).join(',') === 'does,done,give,live,love');
check('Silent e patterns are a-e, i-e, o-e, u-e, e-e with vce pos and pairs', C.items.filter((x) => x.level === 10 && x.kind === 'pattern').map((x) => x.letters + ':' + x.pos + ':' + (x.pair || '-') + ':' + x.kw).join(',') === 'a-e:vce:cap:cape,i-e:vce:pin:pine,o-e:vce:hop:hope,u-e:vce:tub:tube,e-e:vce:-:these');

const seg = (w) => C.segments(w).map((p) => p.g).join('|');
const flags = (w) => C.segments(w).map((p) => p.g + (p.vce ? ':vce' : '') + (p.silent ? ':silent' : '') + (p.clip ? '@' + p.clip : '')).join(',');
for (const [w, want] of [
  ['name', 'n|a|m|e'], ['made', 'm|a|d|e'], ['cape', 'c|a|p|e'], ['time', 't|i|m|e'],
  ['like', 'l|i|k|e'], ['hope', 'h|o|p|e'], ['home', 'h|o|m|e'], ['rule', 'r|u|l|e'],
  ['these', 'th|e|s|e'], ['tube', 't|u|b|e'], ['note', 'n|o|t|e'], ['ride', 'r|i|d|e']
]) {
  check(`segments ${w} -> ${want}`, seg(w) === want, seg(w));
}
check('name vowel is long a + final e is silent', flags('name') === 'n@letters/n,a:vce@patterns/a-e,m@letters/m,e:silent', flags('name'));
check('these is th-voiced, long e, s as /z/, silent e', flags('these') === 'th@patterns/th-voiced,e:vce@patterns/e-e,s@letters/z,e:silent', flags('these'));
for (const w of ['give', 'live', 'love', 'does', 'done', 'come', 'some', 'have', 'one']) {
  const s = C.segments(w);
  check(`${w} is not treated as VCe`, !s.some((p) => p.vce || p.silent), flags(w));
}
check('r-controlled care / fire are not VCe', !C.segments('care').some((p) => p.vce || p.silent) && !C.segments('fire').some((p) => p.vce || p.silent), [flags('care'), flags('fire')]);

const hearts = new Set(['the','i','is','to','my','we','he','see','was','you','a','of','said','are','they','do','have','what','there','where','from','your','one','come','some','again','could','would','should','who','does','done','give','live','love']);
const knownWords = new Set(C.words.map((x) => x.w).concat(
  C.everydayWords.map((x) => x.w), C.spellWords.map((x) => x.w), C.digraphWords.map((x) => x.w),
  C.endWords.map((x) => x.w), C.startBlendWords.map((x) => x.w), C.suffixWords.map((x) => x.w),
  C.silentWords.map((x) => x.w),
  [...hearts], 'get','had','up','it','in','and','at','got','can','dad','on','hot','big','cup','mud','pan','box','gas','bus','van','top','ten','job','his','him','us','this','map','hill','sam','rest','with'
));
const clean = (w) => w.replace(/[^A-Za-z']/g, '').toLowerCase();
const badSent = [];
for (const s of C.silentSentences) {
  for (const w of s.split(/\s+/).map(clean).filter(Boolean)) {
    if (!knownWords.has(w)) badSent.push(s + ' -> ' + w);
  }
}
check('silent-e sentences only use taught words and listed hearts', !badSent.length, badSent);

const clips = JSON.parse(fs.readFileSync(ROOT + 'audio/clips.json', 'utf8'));
const key = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const need = [...C.levels.map((l) => l.say), ...C.silentHearts.map((x) => x.say || x.w), ...C.silentWords.map((x) => x.w),
  ...C.silentSentences, ...C.silentPatterns.map((x) => x.intro), ...C.silentPatterns.map((x) => x.frame).filter(Boolean),
  'This is a heart word. You remember it. It says:',
  'This e is silent.', 'Listen to', 'Now it is', 'Together they make the sound',
  'cap', 'cape', 'pin', 'pine', 'hop', 'tub', 'tube'];
const noClip = need.filter((t) => !clips.clips[key(t)]);
check('new spoken lines / words have Kokoro clips', noClip.length === 0, noClip);
check('every silent-e word has a slow blending clip', C.silentWords.every((x) => clips.slow[key(x.w)]), C.silentWords.filter((x) => !clips.slow[key(x.w)]).map((x) => x.w));
const pat = ['a-e','i-e','o-e','u-e','e-e'];
check('silent-e pattern sounds are in clips.json', pat.every((id) => clips.patterns && clips.patterns['patterns/' + id]), clips.patterns);
check('pattern sounds did not replace Whitney letter clips', clips.letters['letters/w'] && clips.letters['letters/w'].startsWith('human/') && clips.letters['letters/a'].startsWith('human/'));

const v22ids = C.items.filter((x) => x.level <= 9 || x.level === C.REAL_LIFE || x.level === C.BIBLE).map((x) => x.id);
const t0 = Date.now();
const doneAll = Object.fromEntries(v22ids.map((id) => [id, t0]));
const undone = C.items.filter((x) => !doneAll[x.id]);
check('after v22 progress, first undone is SW-does (Silent e heart)', undone[0] && undone[0].id === 'SW-does', undone.slice(0, 3).map((x) => x.id));
check('v22-complete user still has Real Life and Bible at 100%', v22ids.filter((id) => C.items.find((x) => x.id === id).level === C.REAL_LIFE).length >= 8 && v22ids.filter((id) => C.items.find((x) => x.id === id).kind === 'verse').length === 8);

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
  for (const n of document.querySelectorAll('main button, main .chip, main .tile-letter, main .big-word, .foot button, .big-letter, .keyword, .vce-pair')) {
    const r = n.getBoundingClientRect(); if (!r.width) continue;
    if (r.left < -0.5 || r.right > vw + 0.5) bad.push('off-screen: ' + (n.textContent || n.className).trim().slice(0, 30));
    if (n.scrollWidth > n.clientWidth + 1) bad.push('text spills: ' + n.textContent.trim().slice(0, 30));
  }
  for (const n of document.querySelectorAll('.letter-choice')) {
    const range = document.createRange();
    range.selectNodeContents(n);
    const lines = [...range.getClientRects()].filter((r) => r.width);
    if (lines.length > 1 || n.scrollHeight > n.clientHeight + 1) bad.push('choice wraps: ' + n.textContent.trim());
    if (n.scrollWidth > n.clientWidth + 1) bad.push('choice spills: ' + n.textContent.trim());
  }
  for (const row of document.querySelectorAll('.tiles, .choices, .foot, .sentence, .grid2, .items, .vce-pair, .keyword')) {
    const k = [...row.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width);
    for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
      const a = k[i], c = k[j];
      if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) bad.push('overlap in .' + row.className.split(' ')[0]);
    }
  }
  for (const n of document.querySelectorAll('.credit-body, .credit-body *')) {
    if (n.scrollWidth > n.clientWidth + 1) bad.push('credit text spills: ' + (n.textContent || '').trim().slice(0, 40));
    if (!n.firstChild) continue;
    const range = document.createRange();
    range.selectNodeContents(n);
    for (const r of [...range.getClientRects()].filter((r) => r.width)) {
      if (r.right > vw + 0.5) bad.push('credit text extent: ' + (n.textContent || '').trim().slice(0, 40));
    }
  }
  const t = document.querySelector('.top .title');
  if (t && !t.querySelector('.dots') && t.textContent && (t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().height > 44)) bad.push('title wraps/spills: ' + t.textContent);
  for (const n of document.querySelectorAll('.tile-name')) if (n.scrollWidth > n.clientWidth + 1 || n.getBoundingClientRect().height > 32) bad.push('tile name wraps/spills: ' + n.textContent);
  const sizes = [...document.querySelectorAll('.items .item:not(.wide) > span:first-child')].map((s) => getComputedStyle(s).fontSize);
  return { docW: document.documentElement.scrollWidth, vw, bad: [...new Set(bad)], tileSizes: [...new Set(sizes)] };
});
const okLayout = (n, L) => check(n + ': fits, no overlap' + (L.tileSizes.length ? ', one tile size' : ''), L.docW <= L.vw && !L.bad.length && L.tileSizes.length <= 1, L);
const shot = async (p, name, W) => { if (SHOOT) await p.screenshot({ path: `${SHOTS}80-${name}-${W}.png` }); };
const said = (p) => p.evaluate(() => window.Speech.debugLog().filter((e) => e.how === 'clip' || e.how === 'tts').map((e) => e.how + ':' + (e.text || e.key)));

{ const { ctx } = await open(390, '#/home'); await new Promise((r) => setTimeout(r, 2000)); await ctx.close(); }

for (const W of [390, 320]) {
  for (const [hash, name, sel] of [
    ['#/home', 'home', '.tile'],
    ['#/level/10', 'level10-silent-e', '.items .item'],
    ['#/level/' + C.REAL_LIFE, 'level11-reallife', '.tile'],
    ['#/level/' + C.BIBLE, 'level12-bible', '.items .item'],
    ['#/level/' + C.REAL_LIFE + '/signs', 'signs', '.items .item']
  ]) {
    const { ctx, p, errors } = await open(W, hash);
    await p.waitForSelector(sel); await p.waitForTimeout(1200);
    okLayout(`${W} ${name}`, await layout(p)); await shot(p, name, W);
    if (name === 'home') {
      await p.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = m.scrollHeight; });
      await p.waitForTimeout(200);
      await shot(p, 'home-scrolled', W);
      check(`${W} home: 12 level tiles`, (await p.locator('.grid2 .tile').count()) === 12);
      check(`${W} home: Words / Sentences / Silent e tiles have photos`, (await p.locator('.grid2 .tile.has-photo').count()) >= 12);
    }
    if (name === 'signs') {
      const src = await p.locator('.tile-photo, .sign-photo, img.photo').first().getAttribute('src').catch(() => '');
      // category screen uses the category photo in the title area? signs tiles may be signs themselves.
      // The category header isn't a tile-photo; the home-like category page for signs is item tiles.
      // On the Real Life home, Signs tile should use exit.webp. Check that on reallife instead.
    }
    if (name === 'level11-reallife') {
      const srcs = await p.locator('.tile-photo').evaluateAll((ns) => ns.map((n) => n.getAttribute('src')));
      check(`${W} Signs category uses exit photo, not the Real Life fingerpost`, srcs.some((x) => /exit\.webp/.test(x || '')) && srcs.filter((x) => /level-4\.webp/.test(x || '')).length <= 1, srcs);
    }
    const s = await said(p);
    check(`${W} ${name}: spoken from clips (${s.length})`, s.length > 0 && s.every((x) => x.startsWith('clip:')), s.slice(0, 8));
    check(`${W} ${name}: no page errors`, !errors.length, errors);
    await ctx.close();
  }
  for (const [id, name, expect] of [
    ['SW-does', 'heart-does', null],
    ['P-a-e', 'pattern-ae', null],
    ['P-e-e', 'pattern-ee', null],
    ['W-name', 'word-name', 'n,a,m,e'],
    ['W-these', 'word-these', 'th,e,s,e'],
    ['S-se-1', 'sentence-name', null]
  ]) {
    const { ctx, p, errors } = await open(W, '#/lesson/' + id);
    await p.waitForSelector('.foot .primary, .big-word, .big-letter, .tiles, .sentence', { timeout: 8000 });
    await p.waitForTimeout(1400);
    if (expect) {
      const tiles = (await p.locator('.tiles .tile-letter').allTextContents()).map((x) => x.trim()).join(',');
      check(`${W} ${name}: grapheme tiles ${expect}`, tiles === expect, tiles);
    }
    if (name === 'pattern-ae') {
      const pair = (await p.locator('.vce-pair').textContent().catch(() => '')) || '';
      check(`${W} ${name}: shows cap → cape`, /cap\s*→\s*cape/i.test(pair.replace(/\s+/g, ' ')), pair);
    }
    if (name === 'word-name') {
      check(`${W} ${name}: final e tile is marked silent`, await p.locator('.tiles .tile-letter.silent').count() === 1);
    }
    okLayout(`${W} ${name} learn`, await layout(p)); await shot(p, name + '-learn', W);
    const s = await said(p);
    check(`${W} ${name}: spoken from clips`, s.length > 0 && s.every((x) => x.startsWith('clip:')), s.slice(0, 10));
    check(`${W} ${name}: no page errors`, !errors.length, errors);
    await ctx.close();
  }
  for (const [id, name] of [
    ['P-a-e', 'pattern-ae-find'],
    ['P-i-e', 'pattern-ie-find'],
    ['P-o-e', 'pattern-oe-find'],
    ['P-u-e', 'pattern-ue-find'],
    ['P-e-e', 'pattern-ee-find']
  ]) {
    const { ctx, p, errors } = await open(W, '#/lesson/' + id);
    await p.waitForSelector('.foot .primary', { timeout: 8000 });
    await p.locator('.foot .primary').tap();
    await p.waitForSelector('.letter-choice', { timeout: 8000 });
    await p.waitForTimeout(400);
    const labels = (await p.locator('.letter-choice').allTextContents()).map((x) => x.replace(/\s+/g, ''));
    check(`${W} ${name}: three answers, no wrapped hyphen`, labels.length === 3 && labels.every((t) => !t.includes('a-\n') && t.length >= 1), labels);
    okLayout(`${W} ${name}`, await layout(p)); await shot(p, name, W);
    check(`${W} ${name}: no page errors`, !errors.length, errors);
    await ctx.close();
  }
  {
    const { ctx, p, errors } = await open(W, '#/credits');
    await p.waitForSelector('.credits .credit'); await p.waitForTimeout(400);
    check(`${W} credits: lists every shipped photo`, (await p.locator('.credits .credit').count()) === 37);
    okLayout(`${W} credits`, await layout(p)); await shot(p, 'credits', W);
    const longAuthor = p.locator('.credit', { hasText: 'HarryGeorgiouOrthodoxChristian' });
    if (await longAuthor.count()) {
      await longAuthor.first().scrollIntoViewIfNeeded();
      await p.waitForTimeout(200);
      await shot(p, 'credits-menu', W);
    }
    const creditTextOverflow = () => p.evaluate((vw) => {
      const bad = [];
      for (const n of document.querySelectorAll('.credit-body, .credit-body *')) {
        if (n.scrollWidth > n.clientWidth + 1) bad.push({ how: 'scrollWidth', text: (n.textContent || '').trim().slice(0, 50), scroll: n.scrollWidth, client: n.clientWidth });
        if (!n.firstChild) continue;
        const range = document.createRange();
        range.selectNodeContents(n);
        for (const r of [...range.getClientRects()].filter((r) => r.width)) {
          if (r.right > vw + 0.5) bad.push({ how: 'range', text: (n.textContent || '').trim().slice(0, 50), right: r.right, vw });
        }
      }
      return bad;
    }, W);
    const wrapped = await creditTextOverflow();
    check(`${W} credits: author text stays inside the screen (Range / scrollWidth)`, wrapped.length === 0, wrapped);
    if (W === 320) {
      await p.evaluate(() => {
        document.querySelectorAll('.credit-body').forEach((n) => { n.style.overflowWrap = 'normal'; n.style.wordBreak = 'normal'; });
      });
      const unwrapped = await creditTextOverflow();
      check('320 credits: text-extent check would have caught the unwrapped author', unwrapped.length > 0, unwrapped);
      await p.evaluate(() => {
        document.querySelectorAll('.credit-body').forEach((n) => { n.style.overflowWrap = ''; n.style.wordBreak = ''; });
      });
    }
    await p.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = m.scrollHeight; });
    await p.waitForTimeout(200);
    await shot(p, 'credits-scrolled', W);
    check(`${W} credits: no page errors`, !errors.length, errors);
    await ctx.close();
  }
  {
    const { ctx, p, errors } = await open(W, '#/home', doneAll);
    await p.waitForSelector('.tile'); await p.waitForTimeout(800);
    await shot(p, 'migration-home', W);
    const go = p.locator('.foot .primary');
    check(`${W} migration: Keep going is visible`, await go.count());
    await go.tap(); await p.waitForSelector('.big-word, .big-letter', { timeout: 8000 });
    const word = await p.locator('.big-word').textContent().catch(() => '');
    check(`${W} migration: Keep going opens does`, /does/i.test(word || ''), { url: p.url(), word });
    await p.goto(BASE + '#/home'); await p.waitForSelector('.tile');
    const doneTiles = await p.locator('.grid2 .tile.done').count();
    check(`${W} migration: at least 1-9 + Real Life + Bible marked done`, doneTiles >= 11, doneTiles);
    check(`${W} migration: no page errors`, !errors.length, errors);
    await ctx.close();
  }
}
await b.close();
console.log(failed ? failed + ' FAILED' : 'all passed');
process.exit(failed ? 1 : 0);
