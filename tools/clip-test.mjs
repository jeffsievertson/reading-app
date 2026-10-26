// Run: node tools/clip-test.mjs  (needs a local server: python3 -m http.server 8765)
// Natural-voice clip playback: clips play first (after the first tap unlocks audio, like
// iPhone Safari), the built-in voice takes over when a clip is missing / 404 / slow / broken /
// audio is locked, the speed setting changes clip speed, blends are gapless, the voice
// setting switches between natural voice and phone voice, and every spoken text has a clip.
import { chromium } from 'playwright-core';
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'] }); // like iPhone: audio needs a tap
let failed = 0;
const results = [];
function check(name, cond, info) { results.push((cond ? 'PASS ' : 'FAIL ') + name + (cond ? '' : '  ' + JSON.stringify(info).slice(0, 600))); if (!cond) failed++; }

async function page({ settings = {}, route, standalone = false, rec = true, locked = false } = {}) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, userAgent: IPHONE, isMobile: true, hasTouch: true });
  if (locked) {
    // Desktop Chrome headless doesn't enforce the iPhone rule "no audio before a tap", so
    // simulate it: the AudioContext stays suspended and resume() never succeeds.
    await ctx.addInitScript(() => {
      const AC = window.AudioContext;
      window.AudioContext = window.webkitAudioContext = class extends AC {
        constructor(...a) { super(...a); super.suspend(); }
        resume() { return Promise.resolve(); }
      };
    });
  }
  await ctx.addInitScript(({ settings, standalone, rec }) => {
    localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done: {}, settings }));
    if (standalone) Object.defineProperty(navigator, 'standalone', { get: () => true });
    window.__tts = [];
    speechSynthesis.speak = (u) => { window.__tts.push({ text: u.text, at: Date.now() }); setTimeout(() => u.onend && u.onend(), 30); };
    if (rec) {
      window.SpeechRecognition = window.webkitSpeechRecognition = class {
        start() { setTimeout(() => { this.onstart && this.onstart(); setTimeout(() => { this.onresult && this.onresult({ results: [[{ transcript: 'sat' }]] }); this.onend && this.onend(); }, 100); }, 50); }
        stop() {} abort() {}
      };
    }
  }, { settings, standalone, rec });
  if (route) await ctx.route('**/audio/af_heart/**', route);
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  return { ctx, p, errors };
}
const log = (p) => p.evaluate(() => window.Speech.debugLog());
const tts = (p) => p.evaluate(() => window.__tts);
const ctxState = (p) => p.evaluate(() => 'n/a');
async function sayAfterTap(p, text, extra = '') {
  await p.goto(BASE + '#/home'); await p.waitForSelector('.tile');
  await p.locator('.top .icon-btn').last().tap().catch(() => {}); // a real tap: unlocks audio
  await p.waitForTimeout(300);
  return p.evaluate(async ([t]) => { window.Speech.stop(); const t0 = Date.now(); await window.Speech.say(t); return Date.now() - t0; }, [text]);
}

// 1. A clip plays for a known text after the first tap (iPhone Safari model)
{
  const { ctx, p, errors } = await page();
  await p.goto(BASE + '#/home'); await p.waitForSelector('.tile');
  await p.waitForFunction(() => window.Speech.clipCount() > 400);
  const n = await p.evaluate(() => window.Speech.clipCount());
  check('clips.json loaded (' + n + ' keys)', n > 400, n);
  await p.locator('.tile').first().tap(); await p.waitForTimeout(2500);
  const L = await log(p);
  const c = L.find((e) => e.how === 'clip');
  check('level intro played as a clip after a tap', !!c && !L.some((e) => e.how === 'tts'), L);
  check('no built-in voice used', (await tts(p)).length === 0, await tts(p));
  check('clip test: no page errors', !errors.length, errors);
  await ctx.close();
}
// 2. Audio locked (iPhone before the first tap) -> built-in voice right away (no silence)
{
  const { ctx, p } = await page({ locked: true });
  await p.goto(BASE + '#/home'); await p.waitForSelector('.tile');
  await p.waitForFunction(() => window.Speech.clipCount() > 400);
  const ms = await p.evaluate(async () => { const t0 = Date.now(); await window.Speech.say('Settings'); return Date.now() - t0; });
  const L = await log(p);
  check('locked audio -> built-in voice (reason audio-locked), < 1.5 s', L.some((e) => e.how === 'tts' && e.reason === 'audio-locked') && ms < 1500, { L, ms });
  await ctx.close();
}
// 3. Text without a clip -> built-in voice
{
  const { ctx, p } = await page();
  await sayAfterTap(p, 'Zebra crossing over the moon');
  const L = await log(p);
  check('missing clip -> built-in voice (no-clip)', L.some((e) => e.how === 'tts' && e.reason === 'no-clip' && /zebra/.test(e.key)), L);
  await ctx.close();
}
// 4. Clip 404 / 5. broken file / 6. slow network (> 1.5 s)
for (const [name, route, reason] of [
  ['404', (r) => r.fulfill({ status: 404, body: 'no' }), 'clip-error'],
  ['corrupt file', (r) => r.fulfill({ status: 200, contentType: 'audio/mpeg', body: 'not really an mp3' }), 'clip-error'],
  ['slow (3 s)', async (r) => { await new Promise((x) => setTimeout(x, 3000)); r.continue().catch(() => {}); }, 'clip-timeout']
]) {
  const { ctx, p } = await page({ route });
  const ms = await sayAfterTap(p, 'Settings');
  const L = await log(p);
  const t = L.find((e) => e.how === 'tts' && e.key === 'settings');
  check('clip ' + name + ' -> built-in voice (' + reason + ')' + (reason === 'clip-timeout' ? ' within ~1.5 s' : ''),
    t && t.reason === reason && (reason !== 'clip-timeout' || ms < 2200), { L, ms });
  await ctx.close();
}
// 7. Speed setting -> clip playback speed (pitch-preserving stretch)
for (const [rate, want] of [[0.65, 0.65 / 0.85], [0.85, 1], [1.0, 1 / 0.85]]) {
  const { ctx, p } = await page({ settings: { rate } });
  await sayAfterTap(p, 'Settings');
  const c = (await log(p)).find((e) => e.how === 'clip' && e.key === 'settings');
  check('speed ' + rate + ' -> clip speed ' + want.toFixed(2), c && Math.abs(c.speed - want) < 0.01, c);
  await ctx.close();
}
// 8. Blending in Level 2: letter sounds then the slow word, gapless on the audio clock
{
  const { ctx, p } = await page();
  await p.goto(BASE + '#/lesson/L2-sat'); await p.waitForSelector('.tile-letter');
  await p.waitForFunction(() => window.Speech.clipCount() > 400);
  await p.locator('.secondary').tap(); await p.waitForTimeout(6000);
  const L = (await log(p)).filter((e) => e.how === 'clip');
  const run = L.slice(-5);
  const keys = run.map((e) => e.key);
  let gapless = run.length === 5;
  for (let i = 1; i < run.length; i++) {
    const prevEnd = run[i - 1].start + run[i - 1].dur;
    if (run[i].start < prevEnd - 0.002 || run[i].start > prevEnd + 0.36) gapless = false; // only the designed pause
  }
  check('blend s-a-t, slow "sat", "sat": 5 clips, real letter sounds', JSON.stringify(keys) === JSON.stringify(['sss', 'aah', 'tuh', 'sat', 'sat']), keys);
  check('blend scheduled back-to-back (gapless, only the set pauses)', gapless, run);
  check('blend used no built-in voice', (await tts(p)).length === 0, await tts(p));
  await p.locator('.tile-letter').first().tap(); await p.waitForTimeout(800);
  const last = (await log(p)).filter((e) => e.how === 'clip').pop();
  check('tapping a letter tile plays its letter clip', last && last.key === 'letters/s', last);
  await ctx.close();
}
// 9. Voice setting: phone voice -> built-in voice; natural voice (default) -> clips
{
  const { ctx, p } = await page({ settings: { voice: '__phone', voiceVersion: 2 } });
  await sayAfterTap(p, 'Settings');
  check('voice = phone voice -> built-in voice, no clips', (await tts(p)).some((x) => x.text === 'Settings') && !(await log(p)).some((e) => e.how === 'clip'), await log(p));
  await p.goto(BASE + '#/settings'); await p.waitForSelector('.settings');
  const opts = await p.locator('select option').allTextContents();
  check('settings offers "Natural voice (recommended)" first', opts[0] === 'Natural voice (recommended)' && opts.some((o) => /^Phone voice/.test(o)), opts);
  await p.locator('select').selectOption(''); await p.waitForTimeout(2500);
  const c = (await log(p)).filter((e) => e.how === 'clip').pop();
  check('switching to natural voice plays the sample as a clip', c && c.key === 'hello this is my voice', c);
  await ctx.close();
}
{
  // old saved setting (a phone voice picked before clips existed) is migrated to natural voice once
  const { ctx, p } = await page({ settings: { voice: 'Samantha' } });
  await sayAfterTap(p, 'Settings');
  check('old saved phone voice migrated to natural voice', (await log(p)).some((e) => e.how === 'clip' && e.key === 'settings'), await log(p));
  await ctx.close();
}
// 10. Say-it step (iPhone home-screen app): instruction is a clip, 🎤 then 👍 both visible, mic still works after clips
for (const standalone of [false, true]) {
  const tag = standalone ? 'iOS home-screen' : 'iOS Safari';
  const { ctx, p, errors } = await page({ standalone });
  await p.goto(BASE + '#/lesson/L2-sat'); await p.waitForSelector('.tile-letter');
  await p.waitForFunction(() => window.Speech.clipCount() > 400);
  await p.locator('.foot .primary').tap(); await p.waitForSelector('.say-target'); await p.waitForTimeout(1500);
  const L = await log(p);
  const instr = L.filter((e) => /tap the mic then read it out loud when you're done tap the thumbs up/.test(e.key));
  check(tag + ': say-it instruction played as a clip', instr.length && instr.every((e) => e.how === 'clip'), L.slice(-3));
  const foot = await p.evaluate(() => [...document.querySelectorAll('.foot .btn')].map((x) => ({ ico: x.querySelector('.ico')?.textContent, w: Math.round(x.getBoundingClientRect().width), h: Math.round(x.getBoundingClientRect().height) })));
  const mic = foot.find((f) => f.ico === '🎤'), ok = foot.find((f) => f.ico === '👍');
  check(tag + ': footer order 🔊 🎤 👍, mic and 👍 both big', foot.map((f) => f.ico).join('') === '🔊🎤👍' && mic.h >= 56 && ok.h >= 56 && Math.abs(mic.w - ok.w) < 4, foot);
  await p.locator('.foot .mic').tap(); await p.waitForTimeout(standalone ? 1500 : 1200);
  const s = await p.evaluate(() => document.querySelector('.status')?.textContent || '');
  check(tag + ': mic still works after clip playback', /sat/.test(s), s);
  await p.locator('.foot .primary').tap(); await p.waitForTimeout(1500);
  const after = (await log(p)).slice(-2);
  check(tag + ': clips play again after the mic (audio re-unlocked)', after.some((e) => e.how === 'clip'), after);
  check(tag + ': no page errors', !errors.length, errors);
  await ctx.close();
}
// 11. Sentences and verses get their own instruction wording
for (const [id, word] of [['L3-s1', 'sentence'], ['L4-kjv-psalm-23-1', 'verse']]) {
  const { ctx, p } = await page();
  await p.goto(BASE + '#/lesson/' + id); await p.waitForSelector('.main .center');
  for (let i = 0; i < 4 && !(await p.locator('.say-target').count()); i++) { await p.locator('.foot .primary').tap(); await p.waitForTimeout(300); }
  await p.waitForTimeout(1200);
  const k = (await log(p)).map((e) => e.key).filter((x) => /thumbs up/.test(x)).pop();
  check(word + ' say-it: "tap the mic, then read the ' + word + ' out loud. when you’re done, tap the thumbs up"', k === 'tap the mic then read the ' + word + " out loud when you're done tap the thumbs up", k);
  await ctx.close();
}
// 12. Coverage crawl: every lesson's first screens speak only texts that have clips
{
  const { ctx, p } = await page({ rec: false });
  await p.goto(BASE + '#/home'); await p.waitForSelector('.tile');
  await p.waitForFunction(() => window.Speech.clipCount() > 400);
  const ids = await p.evaluate(() => window.CONTENT.items.map((i) => i.id));
  const missing = new Set();
  for (const id of ids) {
    await p.goto(BASE + '#/lesson/' + id); await p.waitForTimeout(120);
    for (let k = 0; k < 3; k++) {
      const help = await p.evaluate(() => { const h = window.__readAloud && window.__readAloud.helpText ? window.__readAloud.helpText() : null; return h; });
      if (help) for (const t of [].concat(help)) if (!(await p.evaluate((x) => window.Speech.hasClipFor(x), t))) missing.add(t);
      if (!(await p.locator('.foot .primary').count())) break;
      await p.locator('.foot .primary').first().tap({ timeout: 2000 }).catch(() => {}); await p.waitForTimeout(120);
    }
  }
  const L = await log(p);
  L.filter((e) => e.how === 'tts' && e.reason === 'no-clip').forEach((e) => missing.add(e.text));
  check('coverage: ' + ids.length + ' lessons crawled, every spoken text has a clip', missing.size === 0, [...missing]);
  await ctx.close();
}

// 13. Whitney tone rewrites: changed spoken lines must have Kokoro clips (not phone fallback)
{
  const { ctx, p } = await page();
  await p.goto(BASE + '#/home'); await p.waitForSelector('.tile');
  await p.waitForFunction(() => window.Speech.clipCount() > 400);
  const lines = [
    'Welcome. This app teaches reading, one sound at a time.',
    'Got it.',
    'Done. Tap play for the next one.',
    'You finished this section. Tap play for the next one.',
    'Yes. You read it.',
    'You finished everything. Pick any level to go over again.',
    'Tap each letter to hear its sound. Then tap Sound it out to put them together.'
  ];
  const miss = [];
  for (const t of lines) {
    if (!(await p.evaluate((x) => window.Speech.hasClipFor(x), t))) miss.push(t);
  }
  check('tone rewrites have Kokoro clips', miss.length === 0, miss);
  // Imagery: home tiles and a word/sign lesson show photos
  const homePhotos = await p.locator('.tile-photo').count();
  check('home level tiles show photos', homePhotos >= 4, homePhotos);
  await p.goto(BASE + '#/lesson/L2-cat'); await p.waitForSelector('.tile-letter');
  check('word lesson shows photo', await p.locator('.lesson-photo').count() >= 1, await p.locator('img.photo').count());
  await p.goto(BASE + '#/lesson/L4-sign-stop'); await p.waitForSelector('.thing');
  check('STOP sign lesson shows photo', await p.locator('.sign-photo').count() >= 1, await p.locator('img.photo').count());
  await p.goto(BASE + '#/level/4'); await p.waitForSelector('.tile');
  check('level 4 category tiles show photos', await p.locator('.tile-photo').count() >= 4, await p.locator('.tile-photo').count());
  await ctx.close();
}
console.log(results.join('\n'));
console.log(failed ? failed + ' FAILED' : 'all passed');
await b.close();
process.exit(failed ? 1 : 0);
