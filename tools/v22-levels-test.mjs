// Run: node tools/v22-levels-test.mjs  (needs local server on :8765; BASE=<url>; SHOTS=0 to skip)
// v22: Ending blends (8) and Starting blends (9) after Sounds together; Real Life is 10, Bible is 11.
// Old item ids and earlier progress still work. Grapheme tiles for blends and -s/-es/-ed/-ing.
// Writes screenshots/60-*-<390|320>.png
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

check('v22 levels 1-9 stay in order', C.levels.slice(0, 9).map((l) => l.n + l.name).join(',') ===
  '1Sounds,2Words,3Missing Letter,4Sentences,5Everyday,6Spellings,7Sounds together,8Ending blends,9Starting blends', C.levels.map((l) => l.name));
check('Real Life and Bible are the last two levels', C.levels.at(-2).name === 'Real Life' && C.levels.at(-2).n === C.REAL_LIFE && C.levels.at(-1).name === 'Bible' && C.levels.at(-1).n === C.BIBLE, C.levels.map((l) => l.n + l.name));
check('C.items is in level order (keep going follows the levels)', C.items.every((it, i) => !i || C.items[i - 1].level <= it.level));
check('saved v20/v21 ids unchanged', ['L3-s1', 'L3-sw-the', 'L4-sign-stop', 'L4-kjv-john-11-35', 'L5-rent', 'L1-q', 'L3m-cat', 'SW-of', 'SW-do', 'P-ck', 'P-sh', 'W-shop', 'S-dg-1'].every((id) => C.items.some((x) => x.id === id)));
check('new ids do not use a display-number prefix', [...C.items.filter((x) => x.level === 8 || x.level === 9)].every((x) => !/^L(8|9)-/.test(x.id)), C.items.filter((x) => x.level === 8 || x.level === 9).map((x) => x.id).slice(0, 8));

const first8 = C.items.find((x) => x.level === 8);
check('Ending blends starts with Book 5 hearts (from, your, one, come, some)', first8.id === 'SW-from' && C.items.filter((x) => x.level === 8 && x.kind === 'sight').map((x) => x.w).join(',') === 'from,your,one,come,some');
const first9 = C.items.find((x) => x.level === 9);
check('Starting blends starts with Book 6 hearts (again, could, would, should, who)', first9.id === 'SW-again' && C.items.filter((x) => x.level === 9 && x.kind === 'sight').map((x) => x.w).join(',') === 'again,could,would,should,who');

const seg = (w) => C.segments(w).map((p) => p.g).join('|');
for (const [w, want] of [
  ['shop','sh|o|p'],['check','ch|e|ck'],['bills','b|i|ll|s'],['fill','f|i|ll'],['red','r|e|d'],['bed','b|e|d'],['ring','r|i|ng'],
  ['last','l|a|st'],['went','w|e|nt'],['hand','h|a|nd'],['think','th|i|nk'],['bank','b|a|nk'],
  ['stop','st|o|p'],['trust','tr|u|st'],['truck','tr|u|ck'],['strap','str|a|p'],
  ['shops','sh|o|p|s'],['dishes','d|i|sh|es'],['boxes','b|o|x|es'],['wished','w|i|sh|ed'],
  ['grabbed','gr|a|bb|ed'],['handed','h|a|nd|ed'],['missed','m|i|ss|ed'],['fixing','f|i|x|ing']
]) {
  check(`segments ${w} -> ${want}`, seg(w) === want, seg(w));
}
check('wished -ed says /t/', C.segments('wished').at(-1).clip === 'letters/t');
check('grabbed -ed says /d/', C.segments('grabbed').at(-1).clip === 'letters/d');
check('handed -ed says /id/', C.segments('handed').at(-1).clip === 'patterns/ed-id');

const hearts = new Set(['the','i','is','to','my','we','he','see','was','you','a','of','said','are','they','do','have','what','there','where','from','your','one','come','some','again','could','would','should','who']);
const knownWords = new Set(C.words.map((x) => x.w).concat(
  C.everydayWords.map((x) => x.w), C.spellWords.map((x) => x.w), C.digraphWords.map((x) => x.w),
  C.endWords.map((x) => x.w), C.startBlendWords.map((x) => x.w), C.suffixWords.map((x) => x.w),
  [...hearts], 'get','had','up','it','in','and','at','got','can','dad','on','hot','big','cup','mud','pan','box','gas','bus','van','top','ten','job','his','him','us','this','map','hill'
));
const clean = (w) => w.replace(/[^A-Za-z']/g, '').toLowerCase();
const badSent = [];
for (const s of C.endSentences.concat(C.startSentences)) {
  for (const w of s.split(/\s+/).map(clean).filter(Boolean)) {
    if (!knownWords.has(w)) badSent.push(s + ' -> ' + w);
  }
}
check('v22 sentences only use taught words and listed hearts', !badSent.length, badSent);

const clips = JSON.parse(fs.readFileSync(ROOT + 'audio/clips.json', 'utf8'));
const key = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const need = [...C.levels.map((l) => l.say), ...C.endHearts.map((x) => x.w), ...C.startHearts.map((x) => x.w),
  ...C.endWords.map((x) => x.w), ...C.startBlendWords.map((x) => x.w), ...C.suffixWords.map((x) => x.w),
  ...C.endSentences, ...C.startSentences,
  'This is a heart word. You remember it. It says:',
  'Level 8. Ending blends.', 'Level 9. Starting blends.',
  ...C.levels.filter((l) => l.n >= 10).map((l) => l.say)];
const noClip = need.filter((t) => !clips.clips[key(t)]);
check('new spoken lines / words have Kokoro clips', noClip.length === 0, noClip);
check('every new word has a slow blending clip', C.endWords.concat(C.startBlendWords, C.suffixWords).every((x) => clips.slow[key(x.w)]), C.endWords.concat(C.startBlendWords, C.suffixWords).filter((x) => !clips.slow[key(x.w)]).map((x) => x.w));
const pat = ['st','nt','nd','mp','nk','lk','lp','pl','tr','dr','fl','sl','gr','str','es','ed-id','ing'];
check('blend and suffix pattern sounds are in clips.json', pat.every((id) => clips.patterns && clips.patterns['patterns/' + id]), clips.patterns);
check('pattern sounds did not replace Whitney letter clips', clips.letters['letters/w'] && clips.letters['letters/w'].startsWith('human/') && clips.letters['letters/t'].startsWith('human/'));

const v21ids = C.items.filter((x) => x.level <= 7 || x.level === C.REAL_LIFE || x.level === C.BIBLE).map((x) => x.id);
const t0 = Date.now();
const doneAll = Object.fromEntries(v21ids.map((id) => [id, t0]));
const undone = C.items.filter((x) => !doneAll[x.id]);
check('after v21 progress, first undone is SW-from (Ending blends heart)', undone[0] && undone[0].id === 'SW-from', undone.slice(0, 3).map((x) => x.id));
check('v21-complete user still has Real Life and Bible at 100%', v21ids.filter((id) => C.items.find((x) => x.id === id).level === C.REAL_LIFE).length >= 8 && v21ids.filter((id) => C.items.find((x) => x.id === id).kind === 'verse').length === 8);

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
const shot = async (p, name, W) => { if (SHOOT) await p.screenshot({ path: `${SHOTS}60-${name}-${W}.png` }); };
const said = (p) => p.evaluate(() => window.Speech.debugLog().filter((e) => e.how === 'clip' || e.how === 'tts').map((e) => e.how + ':' + (e.text || e.key)));

{ const { ctx } = await open(390, '#/home'); await new Promise((r) => setTimeout(r, 2000)); await ctx.close(); }

for (const W of [390, 320]) {
  for (const [hash, name, sel] of [
    ['#/home', 'home', '.tile'],
    ['#/level/8', 'level8-ending', '.items .item'],
    ['#/level/9', 'level9-starting', '.items .item'],
    ['#/level/' + C.REAL_LIFE, 'reallife', '.tile'],
    ['#/level/' + C.BIBLE, 'bible', '.items .item']
  ]) {
    const { ctx, p, errors } = await open(W, hash);
    await p.waitForSelector(sel); await p.waitForTimeout(1200);
    okLayout(`${W} ${name}`, await layout(p)); await shot(p, name, W);
    if (name === 'home') {
      await p.evaluate(() => { const m = document.querySelector('main'); if (m) m.scrollTop = m.scrollHeight; });
      await p.waitForTimeout(200);
      await shot(p, 'home-scrolled', W);
      check(`${W} home: ${C.levels.length} level tiles`, (await p.locator('.grid2 .tile').count()) === C.levels.length);
    }
    const s = await said(p);
    check(`${W} ${name}: spoken from clips (${s.length})`, s.length > 0 && s.every((x) => x.startsWith('clip:')), s.slice(0, 8));
    check(`${W} ${name}: no page errors`, !errors.length, errors);
    await ctx.close();
  }
  for (const [id, name, expect] of [
    ['SW-from', 'heart-from', null],
    ['SW-again', 'heart-again', null],
    ['P-es', 'pattern-es', null],
    ['P-ed', 'pattern-ed', null],
    ['P-ing', 'pattern-ing', null],
    ['W-last', 'word-last', 'l,a,st'],
    ['W-think', 'word-think', 'th,i,nk'],
    ['W-stop', 'word-stop', 'st,o,p'],
    ['W-strap', 'word-strap', 'str,a,p'],
    ['W-wished', 'word-wished', 'w,i,sh,ed'],
    ['W-grabbed', 'word-grabbed', 'gr,a,bb,ed'],
    ['W-handed', 'word-handed', 'h,a,nd,ed'],
    ['W-fixing', 'word-fixing', 'f,i,x,ing'],
    ['S-eb-8', 'end-sentence', null],
    ['S-sb-1', 'start-sentence', null]
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
  {
    const { ctx, p, errors } = await open(W, '#/home', doneAll);
    await p.waitForSelector('.tile'); await p.waitForTimeout(800);
    await shot(p, 'migration-home', W);
    const go = p.locator('.foot .primary');
    check(`${W} migration: Keep going is visible`, await go.count());
    await go.tap(); await p.waitForSelector('.big-word, .big-letter', { timeout: 8000 });
    const word = await p.locator('.big-word').textContent().catch(() => '');
    check(`${W} migration: Keep going opens from`, /from/i.test(word || ''), { url: p.url(), word });
    await p.goto(BASE + '#/home'); await p.waitForSelector('.tile');
    const doneTiles = await p.locator('.grid2 .tile.done').count();
    check(`${W} migration: at least 1-7 + Real Life + Bible marked done`, doneTiles >= 9, doneTiles);
    check(`${W} migration: no page errors`, !errors.length, errors);
    await ctx.close();
  }
}
await b.close();
console.log(failed ? failed + ' FAILED' : 'all passed');
process.exit(failed ? 1 : 0);
