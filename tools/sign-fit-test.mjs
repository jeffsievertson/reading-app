// Run: node tools/sign-fit-test.mjs  (local server on :8765; BASE=<url> for the live site; SHOTS=0 to skip PNGs)
// v19: on single-item lesson screens (sign / form / menu, not the grid) the text must sit INSIDE the
// sign's inner frame (inside border AND padding edge) with >= 8 px spare each side, at 320 and 390 wide,
// and the frame itself must fit on screen. Measures the text's real glyph box (Range rect) against the
// frame's inner (padding-box) rect. Checks both the learn screen and the say-it screen.
// Writes screenshots/35-fit-<id>-<w>.png for the longest items.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const SHOOT = process.env.SHOTS !== '0';
const MIN = 8;
const SHOOT_IDS = ['L4-sign-restroom', 'L4-form-date-of-birth', 'L4-form-signature', 'L4-sign-closed', 'L4-menu-chicken', 'L4-sign-danger'];
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
let failed = 0; const rows = [];
const ids = await (async () => {
  const ctx = await b.newContext(); const p = await ctx.newPage(); await p.goto(BASE);
  const r = await p.evaluate(() => window.CONTENT.items.filter((i) => ['sign', 'form', 'menu'].includes(i.kind)).map((i) => i.id));
  await ctx.close(); return r;
})();
const measure = (p) => p.evaluate((MIN) => {
  const fr = document.querySelector('.main .sign, .main .menu-card, .main .form-field');
  if (!fr) return { err: 'no frame' };
  const cs = getComputedStyle(fr); const r = fr.getBoundingClientRect();
  const bl = parseFloat(cs.borderLeftWidth), br = parseFloat(cs.borderRightWidth);
  // inner frame = inside the border; for STOP (inset box-shadow ring 8px) use the ring; danger: the red band
  let inL = r.left + bl, inR = r.right - br;
  if (fr.classList.contains('sign-stop')) { inL = r.left + 8; inR = r.right - 8; }
  const texts = fr.classList.contains('sign') ? [fr.querySelector('.sign-text')]
    : fr.classList.contains('menu-card') ? [fr.querySelector('.menu-item'), fr.querySelector('.menu-price')] : [fr.querySelector('.form-label'), fr.querySelector('.form-line')];
  let tl = Infinity, tr = -Infinity, fs = 0;
  for (const t of texts) {
    if (!t) continue; let q; if (t.classList.contains('form-line')) q = t.getBoundingClientRect(); else { const rg = document.createRange(); rg.selectNodeContents(t); q = rg.getBoundingClientRect(); }
    tl = Math.min(tl, q.left); tr = Math.max(tr, q.right); fs = fs || +parseFloat(getComputedStyle(t).fontSize);
  }
  const vw = innerWidth;
  return { L: +(tl - inL).toFixed(1), R: +(inR - tr).toFixed(1), fs, frameW: +r.width.toFixed(1), onScreen: r.left >= 0 && r.right <= vw + 0.5,
    docW: document.documentElement.scrollWidth, vw, overflowText: texts.some((t) => t && t.scrollWidth > t.clientWidth + 1 && getComputedStyle(t).display !== 'inline') };
}, MIN);
for (const W of [320, 390]) {
  const ctx = await b.newContext({ viewport: { width: W, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await ctx.addInitScript(() => { localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings: { mic: false } })); });
  const p = await ctx.newPage(); const errors = []; p.on('pageerror', (e) => errors.push(e.message));
  for (const id of ids) {
    await p.goto(BASE + '#/lesson/' + id); await p.waitForSelector('.main .thing');
    await p.evaluate(() => document.fonts && document.fonts.ready); await p.waitForTimeout(250);
    const a = await measure(p);
    if (SHOOT && SHOOT_IDS.includes(id)) await p.screenshot({ path: `${SHOTS}35-fit-${id.replace('L4-', '')}-${W}.png` });
    await p.locator('.foot .primary').click(); await p.waitForSelector('.say-target'); await p.waitForTimeout(250);
    const s = await measure(p);
    for (const [where, m] of [['learn', a], ['say', s]]) {
      const ok = !m.err && m.L >= MIN && m.R >= MIN && m.onScreen && m.docW <= m.vw;
      if (!ok) failed++;
      rows.push(`${ok ? 'PASS' : 'FAIL'} ${W} ${where.padEnd(5)} ${id.padEnd(24)} margin L ${m.L} R ${m.R}  font ${m.fs}px  frame ${m.frameW}px${m.onScreen ? '' : ' OFF-SCREEN'}${m.docW > m.vw ? ' H-SCROLL' : ''}${m.err || ''}`);
    }
  }
  if (errors.length) { failed++; rows.push('FAIL page errors ' + W + ' ' + errors.join(' | ')); }
  await ctx.close();
}
await b.close();
console.log(rows.join('\n'));
console.log(failed ? `SIGN-FIT FAIL (${failed})` : 'SIGN-FIT ALL PASS');
process.exit(failed ? 1 : 0);
