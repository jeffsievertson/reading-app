import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const SHOTS = new URL('../screenshots/', import.meta.url).pathname;
const errors = [];
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=no-user-gesture-required'] });
async function newPage(opts = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36' });
  if (opts.noRec) await ctx.addInitScript(() => { delete window.SpeechRecognition; delete window.webkitSpeechRecognition; window.webkitSpeechRecognition = undefined; });
  // record what the app tries to say
  await ctx.addInitScript(() => {
    window.__said = [];
    if (window.speechSynthesis) { const orig = speechSynthesis.speak.bind(speechSynthesis); speechSynthesis.speak = (u) => { window.__said.push(u.text); setTimeout(() => u.onend && u.onend(), 5); }; }
  });
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  p.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  p.on('requestfailed', (r) => errors.push('requestfailed: ' + r.url()));
  p.on('response', (r) => { if (r.status() >= 400) errors.push('HTTP ' + r.status() + ' ' + r.url()); });
  return { ctx, p };
}
const tap = async (p, sel) => { await p.locator(sel).first().click(); await p.waitForTimeout(250); };
const { ctx, p } = await newPage();
await p.goto(BASE);
await p.waitForSelector('.welcome');
await p.screenshot({ path: SHOTS + '01-welcome.png' });
await tap(p, '.huge');
await p.waitForSelector('.tile');
await p.screenshot({ path: SHOTS + '02-home.png' });
// Level 1
await tap(p, '.tile >> nth=0');
await p.screenshot({ path: SHOTS + '03-level1.png' });
await tap(p, '.item >> nth=0');
await p.waitForSelector('.big-letter');
await p.waitForTimeout(400);
await p.screenshot({ path: SHOTS + '04-letter-learn.png' });
await tap(p, '.foot .primary');
await p.waitForSelector('.letter-choice');
await p.screenshot({ path: SHOTS + '05-letter-find.png' });
// pick wrong then right
const letters = await p.locator('.letter-choice').allTextContents();
const wrongIdx = letters.findIndex((l) => l !== 's');
await p.locator('.letter-choice').nth(wrongIdx).click(); await p.waitForTimeout(800);
await p.locator('.letter-choice').nth(letters.indexOf('s')).click();
await p.waitForSelector('.done-mark', { timeout: 5000 });
await p.screenshot({ path: SHOTS + '06-done.png' });
const st = await p.evaluate(() => window.__readAloud.state());
if (!st.done['L1-s']) errors.push('progress not saved');
// Level 2 word
await p.goto(BASE + '#/lesson/L2-cat'); await p.waitForSelector('.tile-letter');
await tap(p, '.secondary'); await p.waitForTimeout(500);
await p.screenshot({ path: SHOTS + '07-word-blend.png' });
await tap(p, '.foot .primary'); await p.waitForSelector('.say-target');
await p.screenshot({ path: SHOTS + '08-word-say-mic.png' });
// sentence
await p.goto(BASE + '#/lesson/L3-s3'); await p.waitForSelector('.chip');
await p.screenshot({ path: SHOTS + '09-sentence.png' });
// level 4 screens
for (const [id, name] of [['L4-sign-stop', '10-sign-stop'], ['L4-sign-pull', '11-sign-pull'], ['L4-menu-burger', '12-menu'], ['L4-form-date-of-birth', '13-form'], ['L4-kjv-psalm-23-1', '14-verse']]) {
  await p.goto(BASE + '#/lesson/' + id); await p.waitForSelector('.main .center'); await p.waitForTimeout(200);
  await p.screenshot({ path: SHOTS + name + '.png' });
}
// find step for a sign
await p.goto(BASE + '#/lesson/L4-sign-exit'); await p.waitForSelector('.thing');
await tap(p, '.foot .primary'); await p.waitForSelector('.say-target');
await p.goto(BASE + '#/level/4'); await p.waitForSelector('.tile');
await p.screenshot({ path: SHOTS + '15-level4.png' });
await p.goto(BASE + '#/settings'); await p.waitForSelector('.settings');
await p.screenshot({ path: SHOTS + '16-settings.png' });
// service worker + offline
const swOk = await p.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
await p.waitForTimeout(500);
await ctx.setOffline(true);
await p.goto(BASE + '#/home'); await p.waitForSelector('.tile');
const offlineOk = await p.locator('.tile').count();
await ctx.setOffline(false);
const said = await p.evaluate(() => window.__said.slice(0, 6));
// Fallback (no speech recognition) – full word lesson completes with thumbs up
const f = await newPage({ noRec: true });
await f.p.goto(BASE); await f.p.locator('.huge').click();
await f.p.goto(BASE + '#/lesson/L2-sun'); await f.p.waitForSelector('.tile-letter');
await tap(f.p, '.foot .primary');
await f.p.waitForSelector('.ok-btn');
await f.p.screenshot({ path: SHOTS + '17-say-fallback-thumbs.png' });
await tap(f.p, '.ok-btn'); await f.p.waitForSelector('.reveal:not(:empty)');
await f.p.screenshot({ path: SHOTS + '18-say-success.png' });
await tap(f.p, '.foot .primary'); await f.p.waitForSelector('.choice');
await f.p.locator('.choice', { hasText: /^sun$/ }).click();
await f.p.waitForSelector('.done-mark', { timeout: 5000 });
const st2 = await f.p.evaluate(() => window.__readAloud.state().done);
console.log(JSON.stringify({ swOk, offlineOk, fallbackDone: !!st2['L2-sun'], said, errors }, null, 1));
await b.close();
