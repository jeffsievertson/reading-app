import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const errors = [];
async function run(mode) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript((mode) => {
    localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings: {} }));
    window.SpeechRecognition = window.webkitSpeechRecognition = class { start() { setTimeout(() => {
      if (mode === 'deny') this.onerror && this.onerror({ error: 'not-allowed' });
      else this.onresult && this.onresult({ results: [[{ transcript: mode }]] });
    }, 50); } stop() {} abort() {} };
  }, mode);
  const p = await ctx.newPage();
  p.on('pageerror', (e) => errors.push(e.message));
  await p.goto((process.env.BASE || 'http://127.0.0.1:8765/') + '#/lesson/L2-cat');
  await p.locator('.foot .primary').click();
  await p.locator('.mic').click();
  await p.waitForTimeout(600);
  const r = { mode, status: await p.locator('.status').textContent(), ok: await p.locator('.ok-btn').count(), next: await p.locator('.foot .primary').count() };
  if (mode === 'cat') await p.screenshot({ path: new URL('../screenshots/19-say-mic-success.png', import.meta.url).pathname });
  await ctx.close();
  return r;
}
console.log(await run('cat'), await run('cut'), await run('deny'), errors);
await b.close();
