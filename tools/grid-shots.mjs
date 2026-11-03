// Run: node tools/grid-shots.mjs [suffix]  (needs local server on :8765)
// Screenshots the Signs / Menu / Forms list grids at 390x844 and reports each tile's label
// font size (v18: all tiles in one grid should share a size) and overflow.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const SUF = process.argv[2] || '';
const W = +(process.env.W || 390);
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0;
for (const cat of ['signs', 'menu', 'forms']) {
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings: {} })));
  const p = await ctx.newPage();
  await p.goto(BASE + '#/level/4/' + cat); await p.waitForSelector('.items .item'); await p.waitForTimeout(500);
  const tiles = await p.evaluate(() => [...document.querySelectorAll('.items .item:not(.wide)')].map((b) => {
    const s = [...b.children].find((c) => c.tagName === 'SPAN' && !c.classList.contains('check'));
    return { label: s.textContent, fs: getComputedStyle(s).fontSize, spill: s.scrollWidth > b.clientWidth || b.scrollWidth > b.clientWidth };
  }));
  const sizes = [...new Set(tiles.map((t) => t.fs))];
  const spill = tiles.filter((t) => t.spill).map((t) => t.label);
  console.log(cat, 'sizes', sizes.join(','), spill.length ? 'SPILL ' + spill : 'no spill', JSON.stringify(tiles.map((t) => t.label + '=' + t.fs)));
  if (spill.length) failed++;
  if (SUF) await p.screenshot({ path: `${SHOTS}31-grid-${cat}-${SUF}.png` });
  await ctx.close();
}
await b.close();
process.exit(failed ? 1 : 0);
