// Run: node tools/rewards-test.mjs  (needs a local server: python3 -m http.server 8765)
// Rewards: word bank backfill + count, streak with a skip used, reset after too many missed
// days, skip refill, milestones fire once, "Tell Jeffrey" sms link. Part 1 is pure logic
// (js/rewards.js in node); part 2 runs the app in headless Chrome and writes
// screenshots/25-home-rewards.png, 26-word-bank.png.
import fs from 'fs';
import vm from 'vm';
import { chromium } from 'playwright-core';
const ROOT = new URL('../', import.meta.url).pathname;
const BASE = process.env.BASE || 'http://127.0.0.1:8765/';
let failed = 0;
const check = (n, c, i) => { console.log((c ? 'PASS ' : 'FAIL ') + n + (c ? '' : '  ' + JSON.stringify(i).slice(0, 400))); if (!c) failed++; };

// ---------------- part 1: logic
const ctx = { window: {}, navigator: { userAgent: 'node' } }; ctx.window.window = ctx.window; vm.createContext(ctx);
for (const f of ['js/content.js', 'js/rewards.js']) vm.runInContext(fs.readFileSync(ROOT + f, 'utf8'), ctx);
const C = ctx.window.CONTENT, R = ctx.window.Rewards;
const J = (x) => JSON.parse(JSON.stringify(x));
{
  const r = R.blank();
  const done = {};
  C.items.forEach((it) => { if (it.level === 1 || ['L2-cat', 'L2-dog', 'L3-sw-the', 'L3-sw-i', 'L3-s1', 'L4-sign-stop', 'L4-menu-coffee', 'L4-form-name', 'L4-kjv-john-11-35'].includes(it.id)) done[it.id] = 1000; });
  const added = R.backfill(r, done, C.items);
  check('backfill: 6 words from Level 2/3 tricky/4 signs+menu (letters, sentences, forms, verses excluded)', added === 6 && R.wordCount(r) === 6, Object.keys(r.words));
  check('backfill: letters alone never count', !Object.keys(r.words).some((k) => k.length === 1 && k !== 'i'), Object.keys(r.words));
  check('backfill is idempotent', R.backfill(r, done, C.items) === 0 && R.wordCount(r) === 6);
  check('sign word stored by its spoken form, display kept', r.words.stop && r.words.stop.w === 'STOP' && r.words.stop.say === 'Stop', r.words.stop);
  check('backfill records past milestones silently', R.checkMilestones(r, { silent: true }).length === 0);
}
{ // streak with a skip used
  const r = R.blank();
  R.practice(r, '2026-10-01'); R.practice(r, '2026-10-01'); R.practice(r, '2026-10-02');
  check('streak: consecutive days count, same day counts once', r.streak.count === 2, J(r.streak));
  const v = R.streakView(r, '2026-10-04');
  check('streak view: missed 1 day shows streak kept, 1 skip left', v.count === 2 && v.skipsLeft === 1 && v.state === 'on', v);
  const res = R.practice(r, '2026-10-04');
  check('streak: missing a day uses a skip, no reset', res.usedSkips === 1 && r.streak.count === 3 && r.streak.skips === 1 && !res.restarted, J(r.streak));
  check('streak text: "3 days in a row" + "1 skip day left"', R.streakText(R.streakView(r, '2026-10-04')).main === '3 days in a row' && R.streakText(R.streakView(r, '2026-10-04')).sub === '1 skip day left');
}
{ // reset after too many missed days
  const r = R.blank();
  R.practice(r, '2026-10-01'); R.practice(r, '2026-10-02'); R.practice(r, '2026-10-03');
  const v = R.streakView(r, '2026-10-07'); // missed 3 days, only 2 skips
  check('streak view after too many missed days: kind fresh start', v.state === 'fresh' && v.count === 0 && /New start/.test(R.streakText(v).main), v);
  const res = R.practice(r, '2026-10-07');
  check('streak: too many missed days restarts at day 1 with skips refilled', res.restarted && r.streak.count === 1 && r.streak.skips === 2 && r.streak.best === 3, J(r.streak));
  check('streak text has no scolding', !/lost|broke|fail|miss/i.test(JSON.stringify(R.streakText(v))), R.streakText(v));
}
{ // skip refill: 1 per 7 practiced days, max 2
  const r = R.blank();
  R.practice(r, '2026-10-01'); R.practice(r, '2026-10-04'); // uses both skips
  check('refill: both skips used', r.streak.skips === 0 && r.streak.count === 2, J(r.streak));
  for (let d = 5; d <= 10; d++) R.practice(r, '2026-10-' + String(d).padStart(2, '0'));
  check('refill: 7 practiced days after using skips -> +1 skip', r.streak.skips === 1, J(r.streak));
  for (let d = 11; d <= 17; d++) R.practice(r, '2026-10-' + d);
  check('refill: 7 more -> 2 skips', r.streak.skips === 2, J(r.streak));
  for (let d = 18; d <= 31; d++) R.practice(r, '2026-10-' + d);
  R.practice(r, '2026-11-01'); // month boundary
  check('refill: never more than 2', r.streak.skips === 2 && r.streak.count === 30, J(r.streak));
  const ms = R.checkMilestones(r).map((m) => m.id);
  check('streak milestones 7 and 30 fire', ms.join() === 'streak-7,streak-30', ms);
  check('...and only once', R.checkMilestones(r).length === 0);
  check('month boundary / local date math', R.dayNum('2026-11-01') - R.dayNum('2026-10-31') === 1 && R.dayNum('2027-03-15') - R.dayNum('2027-03-14') === 1);
}
{ // word milestones fire once, sms link
  const r = R.blank();
  const bank = C.items.filter(R.isBankItem);
  bank.slice(0, 24).forEach((it) => R.addWord(r, it));
  check('24 words: no milestone', R.checkMilestones(r).length === 0);
  R.addWord(r, bank[24]);
  const m = R.checkMilestones(r);
  check('25 words: milestone fires', m.length === 1 && m[0].id === 'words-25' && m[0].text === 'That’s 25 words. Real progress.', m);
  R.addWord(r, bank[25]);
  check('26 words: milestone does not fire again', R.checkMilestones(r).length === 0 && !!r.milestones['words-25']);
  const ios = R.smsHref(m[0], 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)');
  check('Tell Jeffrey sms link (iOS form)', ios === 'sms:+18127275260&body=' + encodeURIComponent("Hi Jeffrey, it's Adam. I just reached 25 words in Read Aloud!"), ios);
  check('Tell Jeffrey sms link (Android form)', R.smsHref(m[0], 'Mozilla/5.0 (Linux; Android 14)').startsWith('sms:+18127275260?body=Hi%20Jeffrey'));
  check('streak sms body', R.describe('streak-7').body === "Hi Jeffrey, it's Adam. I just practiced 7 days in a row in Read Aloud!");
}

// ---------------- part 2: in the app
const b = await chromium.launch({ executablePath: process.env.CHROME || '/usr/bin/google-chrome', args: ['--no-sandbox'] });
async function page(done, rewards, shots) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: shots ? 2 : 1, isMobile: true, hasTouch: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1' });
  await ctx.addInitScript(([done, rewards]) => {
    if (!sessionStorage.getItem('seeded')) {
      sessionStorage.setItem('seeded', '1');
      localStorage.setItem('readAloud.v1', JSON.stringify({ started: true, done, settings: { mic: false } }));
      if (rewards) localStorage.setItem('readAloud.rewards.v1', JSON.stringify(rewards));
    }
    window.__tts = []; speechSynthesis.speak = (u) => { window.__tts.push(u.text); setTimeout(() => u.onend && u.onend(), 5); };
  }, [done, rewards]);
  const p = await ctx.newPage(); const errors = [];
  p.on('pageerror', (e) => errors.push(e.message));
  return { ctx, p, errors };
}
const today = R.dayStr(), dayAgo = (n) => R.dayStr(new Date(Date.now() - n * 864e5));
const ids = (pred) => Object.fromEntries(C.items.filter(pred).map((it) => [it.id, 1700000000000]));
{ // backfill from existing progress, home + word bank screens
  const done = Object.assign(ids((it) => it.level === 1), ids((it) => it.level === 2), ids((it) => it.kind === 'sight'), ids((it) => it.cat === 'signs'));
  const streak = { count: 5, last: dayAgo(1), skips: 2, toRefill: 0, best: 5, days: 5 };
  const { ctx, p, errors } = await page(done, { words: {}, streak, milestones: {} }, true);
  await p.goto(BASE + '#/home'); await p.waitForSelector('.stat.words');
  const wordsTxt = await p.locator('.stat.words').textContent();
  check('home: backfilled word count shown (36 + 10 + 8 = 54)', /54/.test(wordsTxt), wordsTxt);
  const stTxt = await p.locator('.stat.streak').textContent();
  check('home: "5 days in a row" + "2 skip days left"', /5 days in a row/.test(stTxt) && /2 skip days left/.test(stTxt), stTxt);
  await p.locator('.stat.streak').tap(); await p.waitForTimeout(300);
  const said = await p.evaluate(() => window.Speech.debugLog().map((e) => e.text));
  check('home: tapping the streak reads it aloud', said.some((t) => /5 days in a row/.test(t)), said.slice(-3));
  const rw = await p.evaluate(() => window.__readAloud.rewards());
  check('backfill saved; past milestones (25, 50) recorded silently', !!rw.milestones['words-25'] && rw.milestones['words-25'].shown === false && !!rw.milestones['words-50'] && !rw.milestones['words-100'], rw.milestones);
  await p.waitForTimeout(400); await p.screenshot({ path: ROOT + 'screenshots/25-home-rewards.png' });
  await p.locator('.stat.words').tap(); await p.waitForSelector('.bank-count');
  const count = await p.locator('.bank-count').textContent();
  check('word bank: "You know 54 words."', /You know 54 words\./.test(count), count);
  const n = await p.locator('.bank-word').count();
  check('word bank lists 54 words, no single letters except "I"', n === 54 && !(await p.locator('.bank-word').allTextContents()).some((w) => w.length === 1 && w !== 'I'), n);
  await p.locator('.bank-word', { hasText: /^dog$/ }).tap(); await p.waitForTimeout(300);
  const said2 = await p.evaluate(() => window.Speech.debugLog().map((e) => e.text));
  check('word bank: tap a word to hear it', said2[said2.length - 1] === 'dog', said2.slice(-2));
  await p.waitForTimeout(300); await p.screenshot({ path: ROOT + 'screenshots/26-word-bank.png' });
  check('no page errors (home / word bank)', errors.length === 0, errors);
  await ctx.close();
}
{ // finishing a lesson: practice counted, word added, 25-word milestone fires once with Tell Jeffrey
  const bank = C.items.filter(R.isBankItem);
  const done = Object.fromEntries(bank.slice(0, 24).map((it) => [it.id, 1700000000000]));
  const target = bank[24];
  const { ctx, p, errors } = await page(done, { words: {}, streak: { count: 6, last: dayAgo(2), skips: 1, toRefill: 3, best: 6, days: 6 }, milestones: {} });
  await p.goto(BASE + '#/home'); await p.waitForSelector('.stat.words');
  const finish = async (id) => {
    const it = C.items.find((x) => x.id === id);
    const want = String(it.kind === 'letter' ? it.l : it.text).toLowerCase();
    await p.goto(BASE + '#/lesson/' + id); await p.waitForSelector('.foot .primary');
    for (let k = 0; k < 8 && !(await p.locator('.done-mark').count()); k++) {
      if (await p.locator('.choice').count()) {
        const texts = (await p.locator('.choice').allTextContents()).map((t) => t.trim().toLowerCase());
        await p.locator('.choice').nth(texts.indexOf(want)).tap();
        await p.waitForSelector('.done-mark', { timeout: 5000 });
      } else if (await p.locator('.ok-btn').count()) { await p.locator('.ok-btn').tap(); await p.waitForSelector('.foot .pulse'); await p.locator('.foot .pulse').tap(); }
      else await p.locator('.foot .primary').tap();
      await p.waitForTimeout(150);
    }
    await p.waitForSelector('.done-mark', { timeout: 5000 });
  };
  await finish(target.id);
  const rw = await p.evaluate(() => window.__readAloud.rewards());
  check('lesson done: word added (25 words)', Object.keys(rw.words).length === 25, Object.keys(rw.words).length);
  check('lesson done: practice counted, missed day used a skip (7 days, 0 skips)', rw.streak.count === 7 && rw.streak.skips === 0 && rw.streak.last === today, rw.streak);
  const msgs = await p.locator('.milestone-msg').allTextContents();
  check('milestones shown: 25 words and 7-day streak', msgs.length === 2 && msgs.some((t) => /That’s 25 words\. Real progress\./.test(t)) && msgs.some((t) => /7 days in a row/.test(t)), msgs);
  const hrefs = await p.locator('a.tell').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  check('Tell Jeffrey buttons: iOS sms: link with encoded body', hrefs.length === 2 && hrefs.every((h) => h.startsWith('sms:+18127275260&body=Hi%20Jeffrey%2C%20it\'s%20Adam.')) && hrefs.some((h) => decodeURIComponent(h).endsWith('reached 25 words in Read Aloud!')), hrefs);
  check('Tell Jeffrey is readable aloud (data-say)', (await p.locator('a.tell').first().getAttribute('data-say')).startsWith('Tell Jeffrey'));
  await p.waitForTimeout(300);
  const said = await p.evaluate(() => window.Speech.debugLog().map((e) => e.text));
  check('milestone message read aloud', said.some((t) => t === 'That’s 25 words. Real progress.'), said.slice(-5));
  await p.screenshot({ path: '/tmp/27-milestone.png' });
  await finish(bank[25].id);
  check('next lesson: milestone does not fire again', (await p.locator('.milestone').count()) === 0);
  const rw2 = await p.evaluate(() => window.__readAloud.rewards());
  check('same day practiced twice: streak still 7', rw2.streak.count === 7 && Object.keys(rw2.words).length === 26, rw2.streak);
  // letters never go in the word bank, but do count as practice
  await finish('L1-a');
  check('letter lesson: not added to the word bank', Object.keys((await p.evaluate(() => window.__readAloud.rewards())).words).length === 26);
  check('no page errors (lessons)', errors.length === 0, errors);
  await ctx.close();
}
{ // too many missed days: kind restart on home, then day 1
  const { ctx, p, errors } = await page({}, { words: {}, streak: { count: 12, last: dayAgo(5), skips: 2, toRefill: 0, best: 12, days: 12 }, milestones: {} });
  await p.goto(BASE + '#/home'); await p.waitForSelector('.stat.streak');
  const t = await p.locator('.stat.streak').textContent();
  check('home after a long break: "New start today", no scolding', /New start today/.test(t) && !/lost|broke|fail|missed/i.test(t), t);
  await p.goto(BASE + '#/lesson/L1-b'); await p.waitForSelector('.foot .primary');
  await p.locator('.foot .primary').tap(); await p.waitForSelector('.letter-choice');
  await p.locator('.letter-choice', { hasText: /^b$/ }).tap(); await p.waitForSelector('.done-mark', { timeout: 5000 });
  const rw = await p.evaluate(() => window.__readAloud.rewards());
  check('practice after a long break: day 1 of a new streak, best kept', rw.streak.count === 1 && rw.streak.best === 12 && rw.streak.skips === 2, rw.streak);
  check('no page errors (restart)', errors.length === 0, errors);
  await ctx.close();
}
await b.close();
console.log(failed ? failed + ' FAILED' : 'all passed'); process.exit(failed ? 1 : 0);
