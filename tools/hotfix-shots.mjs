// 320 and 390 screenshots of screens affected by the v21.1 image and -s intro hotfix.
// Writes screenshots/70-*-<390|320>.png
import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..') + '/';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SHOTS = ROOT + 'screenshots/';
const CHROME = process.env.CHROME || '/usr/bin/google-chrome';
fs.mkdirSync(SHOTS, { recursive: true });

const TARGETS = [
  ['#/home', 'home'],
  ['#/lesson/L1-s', 'letter-s'],
  ['#/lesson/L1-t', 'letter-t'],
  ['#/lesson/L1-f', 'letter-f'],
  ['#/lesson/L1-w', 'letter-w'],
  ['#/lesson/L1-v', 'letter-v'],
  ['#/lesson/L2-sun', 'word-sun'],
  ['#/lesson/L2-van', 'word-van'],
  ['#/lesson/L2-wet', 'word-wet'],
  ['#/lesson/L3m-sun', 'missing-sun'],
  ['#/lesson/L3m-van', 'missing-van'],
  ['#/lesson/L4-menu-water', 'menu-water'],
  ['#/lesson/P-s', 'pattern-s']
];

let fail = 0;
const check = (name, ok, info) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + JSON.stringify(info)));
  if (!ok) fail++;
};

const b = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
for (const W of [390, 320]) {
  for (const [hash, name] of TARGETS) {
    const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await ctx.addInitScript(() => {
      if (!sessionStorage.getItem('seeded')) {
        sessionStorage.setItem('seeded', '1');
        localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings: {} }));
      }
    });
    const p = await ctx.newPage();
    const errors = [];
    p.on('pageerror', (e) => errors.push(e.message));
    const broken = [];
    p.on('response', (r) => { if (r.status() >= 400) broken.push(r.status() + ' ' + r.url()); });
    await p.goto(BASE + hash);
    await p.waitForSelector('main, .big-letter, .big-word, .tiles, .sentence, .thing, .grid2', { timeout: 8000 });
    await p.waitForTimeout(900);
    const imgs = await p.evaluate(() => [...document.querySelectorAll('img')].map((i) => i.getAttribute('src') || ''));
    const bad = imgs.filter((s) => /(?:tent|sun|van|water|fish)\.webp/.test(s));
    check(`${W} ${name}: no removed photos`, bad.length === 0, { imgs, bad });
    check(`${W} ${name}: no page errors`, errors.length === 0, errors);
    check(`${W} ${name}: no 404 assets`, !broken.length, broken);
    await p.screenshot({ path: `${SHOTS}70-${name}-${W}.png` });
    await ctx.close();
  }
}
await b.close();
console.log(fail ? fail + ' FAILED' : 'all passed');
process.exit(fail ? 1 : 0);
