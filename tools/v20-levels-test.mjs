// Run: node tools/v20-levels-test.mjs  (needs local server on :8765; BASE=<url>; SHOTS=0 to skip screenshots)
// v20: new level order (1 Sounds, 2 Words, 3 Missing letter, 4 Sentences, 5 Everyday, 6 Real life,
// 7 Bible), the missing-letter lesson, everyday words/sentences, Bible moved to its own last level.
// Checks at 390 and 320 px: nothing spills or overlaps, one tile size per grid, every line the new
// screens say comes from a recorded clip, the mic check rejects a wrong word, saved ids still work.
// Writes screenshots/40-*-<390|320>.png
import { chromium } from 'playwright-core';
import fs from 'fs'; import vm from 'vm';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const ROOT = new URL('../', import.meta.url).pathname;
const SHOTS = ROOT + 'screenshots/'; const SHOOT = process.env.SHOTS !== '0';
let failed = 0;
const check = (n, c, i) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(i).slice(0, 600))); if (!c) failed++; };

// ---- content checks (no browser)
const ctx0 = { window: {} }; vm.createContext(ctx0);
vm.runInContext(fs.readFileSync(ROOT + 'js/content.js', 'utf8'), ctx0);
const C = ctx0.window.CONTENT;
check('levels in order 1-7 with the new names', C.levels.map((l) => l.n + l.name).join(',') === '1Sounds,2Words,3Missing Letter,4Sentences,5Everyday,6Real Life,7Bible', C.levels.map((l) => l.name));
check('C.items is in level order (keep going follows the levels)', C.items.every((it, i) => !i || C.items[i - 1].level <= it.level));
check('Bible verses are all in level 7, none in Real Life', C.items.filter((x) => x.kind === 'verse').every((x) => x.level === 7) && !C.cats.some((c) => c.id === 'bible'));
check('saved ids unchanged (L3-s1, L4-sign-stop, L4-kjv-john-11-35 still exist)', ['L3-s1', 'L3-sw-the', 'L4-sign-stop', 'L4-kjv-john-11-35'].every((id) => C.items.some((x) => x.id === id)));
// Missing letter: answer present, choices A-Z, no distractor makes another real word
const REAL = new Set((C.words.map((x) => x.w).concat(C.everydayWords.map((x) => x.w), 'cot cut pan pen pun pit dot dub dun fan van ban can cab cap cop cup cub mop map mat bat bet bit but hut hit hot jot jut rod rid rad bad bed bid bud box fox pox sun son sin bun fun gun nun run tan ten tin ton web wet wit vat fat sat rat pat hat lap tap zap nap sap gap jet get let met net pet set vet yet bet zed keg veg lid kid bid mid red led fed wed bus pus jab tab dab lab pod nod cod god sod hog log fog bog jog pig big dig fig wig rig jig gig'.split(' '))));
for (const m of C.missing) {
  const fake = m.opts.filter((l) => l !== m.miss).map((l) => m.w.slice(0, m.at) + l + m.w.slice(m.at + 1));
  check(`missing ${m.shown}: answer in choices, A-Z, no other real word (${fake.join('/')})`,
    m.opts.includes(m.miss) && m.opts.join('') === [...m.opts].sort().join('') && m.opts.length === 3 && !fake.some((w) => REAL.has(w)) && C.words.some((x) => x.w === m.w), m);
}
// every spoken text of the new levels has a recorded clip
const clips = JSON.parse(fs.readFileSync(ROOT + 'audio/clips.json', 'utf8'));
const key = (s) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();
const need = ['Which letter is missing?', 'Tap the letter that goes in the gap.', ...C.levels.map((l) => l.say)]
  .concat(C.everydayWords.map((x) => x.w), C.everydaySentences, C.everydaySentences.flatMap((s) => s.split(/\s+/).map((w) => w.replace(/[^A-Za-z']/g, ''))));
const noClip = need.filter((t) => !clips.clips[key(t)]);
check('every new spoken line / word has a Kokoro clip', noClip.length === 0, noClip);
check('every everyday word has a slow (blending) clip', C.everydayWords.every((x) => clips.slow[key(x.w)]), C.everydayWords.filter((x) => !clips.slow[key(x.w)]));

// ---- browser
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
// layout: no sideways scroll; every visible text-bearing box inside the viewport and inside its button
const layout = (p) => p.evaluate(() => {
  const vw = innerWidth, bad = [];
  for (const n of document.querySelectorAll('main button, main .chip, main .tile-letter, main .big-word, .foot button')) {
    const r = n.getBoundingClientRect(); if (!r.width) continue;
    if (r.left < -0.5 || r.right > vw + 0.5) bad.push('off-screen: ' + (n.textContent || n.className).trim().slice(0, 30));
    if (n.scrollWidth > n.clientWidth + 1) bad.push('text spills: ' + n.textContent.trim().slice(0, 30));
  }
  // siblings in a row must not overlap
  for (const row of document.querySelectorAll('.tiles, .choices, .foot, .sentence, .grid2, .items')) {
    const k = [...row.children].map((c) => c.getBoundingClientRect()).filter((r) => r.width);
    for (let i = 0; i < k.length; i++) for (let j = i + 1; j < k.length; j++) {
      const a = k[i], c = k[j];
      if (a.left < c.right - 1 && c.left < a.right - 1 && a.top < c.bottom - 1 && c.top < a.bottom - 1) bad.push('overlap in .' + row.className.split(' ')[0]);
    }
  }
  const t = document.querySelector('.top .title');
  if (t && !t.querySelector('.dots') && t.textContent && (t.scrollWidth > t.clientWidth + 1 || t.getBoundingClientRect().height > 40)) bad.push('title wraps/spills: ' + t.textContent);
  for (const n of document.querySelectorAll('.tile-name')) if (n.scrollWidth > n.clientWidth + 1 || n.getBoundingClientRect().height > 30) bad.push('tile name wraps/spills: ' + n.textContent);
  const sizes = [...document.querySelectorAll('.items .item:not(.wide) > span:first-child')].map((s) => getComputedStyle(s).fontSize);
  return { docW: document.documentElement.scrollWidth, vw, bad: [...new Set(bad)], tileSizes: [...new Set(sizes)] };
});
const okLayout = (n, L) => check(n + ': fits, no overlap' + (L.tileSizes.length ? ', one tile size' : ''), L.docW <= L.vw && !L.bad.length && L.tileSizes.length <= 1, L);
const shot = async (p, name, W) => { if (SHOOT) await p.screenshot({ path: `${SHOTS}40-${name}-${W}.png` }); };
const said = (p) => p.evaluate(() => window.Speech.debugLog().filter((e) => e.how === 'clip' || e.how === 'tts').map((e) => e.how + ':' + e.text));

// warm-up: the very first headless page can report 'audio-stalled' before the audio device starts
{ const { ctx, p } = await open(390, '#/home'); await p.waitForTimeout(2500); await ctx.close(); }
for (const W of [390, 320]) {
  // home + level grids
  for (const [hash, name, sel] of [['#/home', 'home', '.tile'], ['#/level/3', 'level3-missing', '.items .item'], ['#/level/5', 'level5-everyday', '.items .item'],
    ['#/level/6', 'level6-reallife', '.tile'], ['#/level/7', 'level7-bible', '.items .item'], ['#/level/4', 'level4-sentences', '.items .item']]) {
    const { ctx, p, errors } = await open(W, hash);
    await p.waitForSelector(sel); await p.waitForTimeout(1500);
    okLayout(`${W} ${name}`, await layout(p)); await shot(p, name, W);
    const s = await said(p);
    check(`${W} ${name}: spoken from clips (${s.length})`, s.length > 0 && s.every((x) => x.startsWith('clip:')), s);
    if (name === 'home') check(`${W} home: 7 level tiles`, (await p.locator('.grid2 .tile').count()) === 7);
    if (name === 'level6-reallife') check(`${W} real life: signs, menu, forms only`, (await p.locator('.grid2 .tile').count()) === 3);
    check(`${W} ${name}: no page errors`, !errors.length, errors);
    await ctx.close();
  }
  // Real Life categories still list their items (route kept: #/level/4/<cat> and #/level/6/<cat>)
  for (const hash of ['#/level/6/signs', '#/level/4/menu']) {
    const { ctx, p, errors } = await open(W, hash);
    await p.waitForSelector('.items .item', { timeout: 5000 }).catch(() => {});
    const n = await p.locator('.items .item').count();
    const back = await p.locator('header .icon-btn').first().getAttribute('aria-label');
    check(`${W} ${hash}: lists items (${n})`, n >= 8 && !errors.length, { n, errors, back });
    await ctx.close();
  }
  {
    const { ctx, p } = await open(W, '#/lesson/L4-sign-stop');
    await p.waitForSelector('.thing'); await p.locator('header .icon-btn').first().tap(); await p.waitForTimeout(300);
    check(`${W} sign lesson back -> #/level/6/signs`, p.url().endsWith('#/level/6/signs'), p.url());
    await ctx.close();
  }
  // missing-letter lesson
  {
    const { ctx, p, errors } = await open(W, '#/lesson/L3m-cat');
    await p.waitForSelector('.letter-choice'); await p.waitForTimeout(1800);
    const slots = await p.locator('.tiles .tile-letter').allTextContents();
    const ch = await p.locator('.letter-choice').allTextContents();
    check(`${W} missing c_t: shows c ? t, choices a e i in A-Z order`, slots.join('') === 'c?t' && ch.join('') === 'aei', { slots, ch });
    okLayout(`${W} missing step`, await layout(p)); await shot(p, 'missing-ask', W);
    let s = await said(p);
    check(`${W} missing: says "Which letter is missing?" + the word, from clips`, s.includes('clip:Which letter is missing?') && s.includes('clip:cat') && s.every((x) => x.startsWith('clip:')), s);
    await p.locator('.letter-choice', { hasText: /^e$/ }).tap(); await p.waitForTimeout(2600);
    s = await said(p);
    check(`${W} missing: wrong letter -> "Not that one. Try again." and stays`, s.includes('clip:Not that one. Try again.') && (await p.locator('.letter-choice').count()) === 3, s);
    await p.locator('.letter-choice', { hasText: /^a$/ }).tap(); await p.waitForTimeout(250);
    check(`${W} missing: right letter fills the gap`, (await p.locator('.tiles .tile-letter').allTextContents()).join('') === 'cat');
    await shot(p, 'missing-right', W);
    await p.waitForSelector('.say-target', { timeout: 6000 }); await p.waitForTimeout(800);
    okLayout(`${W} missing say-it`, await layout(p)); await shot(p, 'missing-say', W);
    // mic: a wrong word must not pass, the right one passes
    await p.evaluate(() => { window.__say = 'cut'; });
    await p.locator('.foot .mic').tap(); await p.waitForTimeout(1500);
    check(`${W} missing say-it: "cut" for cat does NOT pass`, !(await p.locator('.status.yes').count()), await p.locator('.status').textContent());
    await p.waitForTimeout(3500);
    await p.evaluate(() => { window.__say = 'cat'; });
    await p.locator('.foot .mic').tap(); await p.waitForSelector('.status.yes', { timeout: 5000 }).catch(() => {});
    check(`${W} missing say-it: "cat" passes`, (await p.locator('.status.yes').count()) === 1);
    check(`${W} missing: no page errors`, !errors.length, errors);
    await ctx.close();
  }
  // everyday word (4 letters) learn step + everyday sentence
  for (const [id, name] of [['L5-rent', 'everyday-word'], ['L5-s10', 'everyday-sentence'], ['L4-kjv-john-11-35', 'bible-verse']]) {
    const { ctx, p, errors } = await open(W, '#/lesson/' + id);
    await p.waitForSelector('.foot .primary'); await p.waitForTimeout(1500);
    okLayout(`${W} ${name} learn`, await layout(p)); await shot(p, name + '-learn', W);
    await p.locator('.foot .primary').tap(); await p.waitForSelector('.say-target'); await p.waitForTimeout(800);
    okLayout(`${W} ${name} say-it`, await layout(p)); await shot(p, name + '-say', W);
    const back = await p.locator('header .icon-btn').first().getAttribute('aria-label');
    if (id === 'L4-kjv-john-11-35') {
      await p.locator('header .icon-btn').first().tap(); await p.waitForTimeout(300);
      check(`${W} Bible verse back -> Level 7`, p.url().endsWith('#/level/7'), p.url());
    }
    if (id === 'L5-rent') {
      await p.evaluate(() => { window.__say = 'rant'; }); await p.locator('.foot .mic').tap(); await p.waitForTimeout(1500);
      check(`${W} rent: "rant" does NOT pass`, !(await p.locator('.status.yes').count()));
    }
    check(`${W} ${name}: no page errors`, !errors.length, { errors, back });
    await ctx.close();
  }
}
// mic matching of the new words (no browser): wrong word fails, homophone passes
global.window = {}; vm.runInContext(fs.readFileSync(ROOT + 'js/speech.js', 'utf8'), Object.assign(ctx0, { navigator: { userAgent: 'node' } }));
const S = ctx0.window.Speech;
for (const [t, h, want] of [['mop', 'map', false], ['pen', 'pan', false], ['job', 'job', true], ['rent', 'rant', false], ['sent', 'cent', true],
  ['The bus is at ten.', 'the bus is at 10', true], ['Did you get a bus pass?', 'did you get a bus pass', true], ['I got the job.', 'i like dogs', false]]) {
  check(`match "${t}" heard "${h}" -> ${want}`, S.matches(t, [h], C.homophones) === want);
}
await b.close();
console.log(failed ? failed + ' FAILED' : 'all passed');
process.exit(failed ? 1 : 0);
