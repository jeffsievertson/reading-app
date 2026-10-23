/* Read Aloud - rewards: word bank, gentle daily streak, milestones.
 * Pure logic, no DOM. Saved in localStorage under its own key, separate from lesson progress.
 * Milestones are data plus an on-screen message. The only "notice" is an sms: link that
 * Adam taps himself (his phone opens a pre-written text; nothing is sent automatically). */
window.Rewards = (function () {
  'use strict';
  const KEY = 'readAloud.rewards.v1';
  const MAX_SKIPS = 2;          // free skip days
  const REFILL_EVERY = 7;       // practiced days per skip refilled
  const WORD_MILESTONES = [25, 50, 100, 250, 500];
  const STREAK_MILESTONES = [7, 30];
  const SMS_NUMBER = '+18125658267'; // Jeffrey (Google Voice) - approved to be public
  // Lesson kinds whose item is a word for the word bank. Letters (Level 1), sentences,
  // form labels and verses are not.
  const BANK_KINDS = { word: 1, sight: 1, sign: 1, menu: 1 };

  // ---- dates (local calendar day, so the streak follows the phone's clock)
  function dayStr(d) {
    d = d || new Date();
    const p = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate());
  }
  function dayNum(s) { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 864e5); }

  // ---- storage
  function blank() {
    return { v: 1, words: {}, streak: { count: 0, last: null, skips: MAX_SKIPS, toRefill: 0, best: 0, days: 0 }, milestones: {} };
  }
  function load(storage) {
    const r = blank();
    try {
      const s = JSON.parse((storage || localStorage).getItem(KEY) || 'null');
      if (s && typeof s === 'object') {
        r.words = s.words || {};
        Object.assign(r.streak, s.streak || {});
        r.milestones = s.milestones || {};
      }
    } catch (e) { /* corrupt: start fresh */ }
    return r;
  }
  function save(r, storage) { try { (storage || localStorage).setItem(KEY, JSON.stringify(r)); } catch (e) { /* storage full / private mode */ } }

  // ---- word bank
  const isBankItem = (it) => !!(it && BANK_KINDS[it.kind]);
  const wordKey = (it) => String(it.kind === 'sign' ? it.say : it.text).toLowerCase();
  function addWord(r, it, t) {
    if (!isBankItem(it)) return false;
    const k = wordKey(it);
    if (r.words[k]) return false;
    r.words[k] = { w: it.text, say: it.say || it.text, id: it.id, t: t || Date.now() };
    return true;
  }
  /** Add every mastered (completed) word lesson that is not in the bank yet. */
  function backfill(r, done, items) {
    let n = 0;
    for (const it of items) if (done[it.id] && addWord(r, it, typeof done[it.id] === 'number' ? done[it.id] : Date.now())) n++;
    return n;
  }
  const wordCount = (r) => Object.keys(r.words).length;
  const wordList = (r) => Object.values(r.words).sort((a, b) => a.t - b.t);

  // ---- streak
  /** Record practice on `today` (YYYY-MM-DD). Idempotent within a day. */
  function practice(r, today) {
    const s = r.streak;
    today = today || dayStr();
    if (s.last && dayNum(today) <= dayNum(s.last)) return { counted: false, count: s.count, usedSkips: 0, restarted: false };
    const missed = s.last ? dayNum(today) - dayNum(s.last) - 1 : 0;
    let usedSkips = 0, restarted = false;
    if (!s.last || s.count === 0) { s.count = 1; }
    else if (missed <= s.skips) { usedSkips = missed; s.skips -= missed; s.count += 1; }
    else { restarted = true; s.count = 1; s.skips = MAX_SKIPS; s.toRefill = 0; }
    s.last = today;
    s.days = (s.days || 0) + 1;
    if (s.skips < MAX_SKIPS) {
      s.toRefill = (s.toRefill || 0) + 1;
      if (s.toRefill >= REFILL_EVERY) { s.skips += 1; s.toRefill = 0; }
    } else s.toRefill = 0;
    if (s.count > (s.best || 0)) s.best = s.count;
    return { counted: true, count: s.count, usedSkips, restarted };
  }
  /** What to show today, without changing anything. */
  function streakView(r, today) {
    const s = r.streak;
    today = today || dayStr();
    if (!s.last || !s.count) return { count: 0, skipsLeft: s.skips, state: 'none', today: false };
    const gap = dayNum(today) - dayNum(s.last);
    if (gap <= 0) return { count: s.count, skipsLeft: s.skips, state: 'on', today: true };
    const missed = gap - 1;
    if (missed > s.skips) return { count: 0, skipsLeft: MAX_SKIPS, state: 'fresh', today: false };
    return { count: s.count, skipsLeft: s.skips - missed, state: 'on', today: false };
  }
  function streakText(v) {
    const skips = v.skipsLeft === 0 ? 'No skip days left' : v.skipsLeft === 1 ? '1 skip day left' : v.skipsLeft + ' skip days left';
    if (v.state === 'none') return { main: 'Practice today', sub: 'to start a streak', say: 'Practice today to start a streak.' };
    if (v.state === 'fresh') return { main: 'New start today', sub: skips, say: 'Practice today to start a new streak. You have ' + v.skipsLeft + ' skip days.' };
    const main = v.count === 1 ? 'Day 1' : v.count + ' days in a row';
    return { main, sub: skips, say: main + '. ' + skips + '.' };
  }

  // ---- milestones
  const WORD_MSG = {
    25: 'That’s 25 words. Real progress.',
    50: 'That’s 50 words. Solid work.',
    100: '100 words. That’s a real reading vocabulary.',
    250: '250 words. You’ve come a long way.',
    500: '500 words. That’s a big achievement.'
  };
  const STREAK_MSG = {
    7: '7 days in a row. That’s a real habit.',
    30: '30 days in a row. That’s steady, serious work.'
  };
  function describe(id) {
    const [kind, n] = id.split('-');
    const num = Number(n);
    return kind === 'words'
      ? { id, kind, n: num, text: WORD_MSG[num], body: `Hi Jeffrey, it's Adam. I just reached ${num} words in Read Aloud!` }
      : { id, kind, n: num, text: STREAK_MSG[num], body: `Hi Jeffrey, it's Adam. I just practiced ${num} days in a row in Read Aloud!` };
  }
  /** Record milestones reached for the first time. Returns the new ones (each fires once).
   *  silent: record without showing (used for progress made before this feature existed). */
  function checkMilestones(r, opts) {
    opts = opts || {};
    const fresh = [];
    const words = wordCount(r);
    const ids = WORD_MILESTONES.filter((n) => words >= n).map((n) => 'words-' + n)
      .concat(STREAK_MILESTONES.filter((n) => r.streak.count >= n).map((n) => 'streak-' + n));
    for (const id of ids) {
      if (r.milestones[id]) continue;
      r.milestones[id] = { t: opts.now || Date.now(), shown: !opts.silent };
      if (!opts.silent) fresh.push(describe(id));
    }
    return fresh;
  }
  /** sms: link that opens a pre-written text. iOS wants "&body=", Android "?body=". */
  function smsHref(m, ua) {
    ua = ua == null ? (typeof navigator !== 'undefined' ? navigator.userAgent : '') : ua;
    const sep = /Android/i.test(ua) ? '?' : '&';
    return 'sms:' + SMS_NUMBER + sep + 'body=' + encodeURIComponent(m.body);
  }

  return {
    KEY, MAX_SKIPS, REFILL_EVERY, WORD_MILESTONES, STREAK_MILESTONES, SMS_NUMBER,
    dayStr, dayNum, blank, load, save, isBankItem, wordKey, addWord, backfill, wordCount, wordList,
    practice, streakView, streakText, checkMilestones, describe, smsHref
  };
})();
