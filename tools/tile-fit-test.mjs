// Run: node tools/tile-fit-test.mjs  (server on :8765)
// Long item-grid labels must fit inside their tiles (no horizontal overflow).
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0;
const results = [];
function check(name, cond, info) {
  results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ' + JSON.stringify(info).slice(0, 500)));
  if (!cond) failed++;
}

const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings: {} })));
const p = await ctx.newPage();
const errors = [];
p.on('pageerror', (e) => errors.push(e.message));

async function overflowOn(hash, wantLabels) {
  await p.goto(BASE + hash);
  await p.waitForSelector('.items .item');
  await p.waitForTimeout(200); // rAF fit
  return p.evaluate((want) => {
    const out = [];
    for (const btn of document.querySelectorAll('.items .item:not(.wide)')) {
      const span = [...btn.children].find((c) => c.tagName === 'SPAN' && !c.classList.contains('check'));
      if (!span) continue;
      const label = (span.textContent || '').trim();
      if (want && want.length && !want.includes(label)) continue;
      const spill = span.scrollWidth > btn.clientWidth + 1 || span.getBoundingClientRect().right > btn.getBoundingClientRect().right + 1;
      out.push({
        label,
        spill,
        scrollWidth: span.scrollWidth,
        clientWidth: btn.clientWidth,
        fontSize: getComputedStyle(span).fontSize
      });
    }
    return out;
  }, wantLabels || null);
}

const long = ['CLOSED', 'RESTROOM', 'DANGER', 'Signature', 'Date of Birth', 'Chicken', 'Address'];
const signs = await overflowOn('#/level/4/signs', ['STOP', 'EXIT', 'OPEN', 'CLOSED', 'PUSH', 'PULL', 'RESTROOM', 'DANGER']);
check('Signs: all 8 tiles present', signs.length === 8, signs);
check('Signs: CLOSED/RESTROOM/DANGER fit', signs.filter((x) => ['CLOSED', 'RESTROOM', 'DANGER'].includes(x.label)).every((x) => !x.spill), signs);
check('Signs: no tile overflows', signs.every((x) => !x.spill), signs.filter((x) => x.spill));

const menu = await overflowOn('#/level/4/menu', null);
check('Menu: no tile overflows', menu.every((x) => !x.spill), menu.filter((x) => x.spill));

const forms = await overflowOn('#/level/4/forms', null);
check('Forms: no tile overflows', forms.every((x) => !x.spill), forms.filter((x) => x.spill));

const words = await overflowOn('#/level/2', null);
check('Level 2 words: no tile overflows', words.every((x) => !x.spill), words.filter((x) => x.spill).slice(0, 8));

// Word bank may be empty — seed one long word via rewards if needed; still open the page
await p.goto(BASE + '#/words');
await p.waitForTimeout(300);
const bank = await p.evaluate(() => {
  const items = [...document.querySelectorAll('.items .item:not(.wide)')];
  return items.map((btn) => {
    const span = [...btn.children].find((c) => c.tagName === 'SPAN' && !c.classList.contains('check'));
    if (!span) return null;
    return { label: span.textContent.trim(), spill: span.scrollWidth > btn.clientWidth + 1 };
  }).filter(Boolean);
});
check('Word bank: no overflowing tiles (or empty)', bank.every((x) => !x.spill), bank.filter((x) => x.spill));

await p.goto(BASE + '#/level/4/signs');
await p.waitForSelector('.items .item');
await p.waitForTimeout(250);
await p.screenshot({ path: new URL('../screenshots/29-signs-tiles-fit.png', import.meta.url).pathname });

check('no page errors', !errors.length, errors);
console.log(results.join('\n'));
console.log(failed ? failed + ' FAILED' : 'all passed');
// Print measured font sizes for long signs
console.log('sizes', JSON.stringify(signs.filter((x) => long.includes(x.label))));
await b.close();
process.exit(failed ? 1 : 0);
