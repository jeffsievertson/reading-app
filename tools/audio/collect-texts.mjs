// Collect every text the app can speak, so the audio build can pre-generate a clip for it.
//   node tools/audio/collect-texts.mjs [out.json]
// Sources: (1) lesson content in js/content.js, (2) spoken string literals and button
// labels in js/app.js, (3) the few sentences app.js builds by joining strings (templates
// mirrored below). Any other string-joining in a speech call is reported as "uncovered".
// Keys use Speech.clipKey() from js/speech.js, i.e. exactly what the app looks up.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const ctx = { window: {}, navigator: { userAgent: 'node' }, console };
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of ['js/content.js', 'js/speech.js', 'js/rewards.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
const C = ctx.window.CONTENT;
const S = ctx.window.Speech;
const appSrc = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');

const out = new Map(); // key -> entry
function add(text, source, kind = 'text', speak) {
  if (!text || !String(text).trim()) return;
  const key = S.clipKey(text);
  if (!key) return;
  if (!out.has(key)) out.set(key, { key, text: String(text), speak: speak || speakable(String(text)), kind, sources: [source] });
  else if (!out.get(key).sources.includes(source)) out.get(key).sources.push(source);
}

// What to actually feed the TTS for a text (pronunciation fixes only; the key stays the same).
const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve',
  'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const num = (n) => n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? '-' + ONES[n % 10] : '');
function speakable(t) {
  const m = /^\$(\d+)\.(\d\d)$/.exec(t.trim());
  if (m) {
    const d = +m[1], c = +m[2];
    const dollars = num(d) + (d === 1 ? ' dollar' : ' dollars');
    return (c ? `${dollars} and ${num(c)} ${c === 1 ? 'cent' : 'cents'}` : dollars) + '.';
  }
  if (/^[a-z]$/.test(t)) return t.toUpperCase() + '.'; // a lone letter: say its name ("Q.")
  return t;
}

const spoken = (it) => it.say || it.text || it.label;
const cleanWord = (w) => w.replace(/[^A-Za-z']/g, '');
const wordsOf = (t) => t.split(/\s+/).map(cleanWord).filter(Boolean);

// ---- (1) content
for (const lv of [...C.levels, ...C.cats]) add(lv.say, 'level');
for (const it of C.items) {
  add(spoken(it), 'item:' + it.id);
  if (it.kind === 'letter') {
    add(it.kw, 'keyword');
    add(it.intro, 'intro:' + it.id, 'intro');
    out.get(S.clipKey(it.intro)).letter = it.l;   // build forces the name via phonemes
  }
  if (it.kind === 'sentence' || it.kind === 'verse') for (const w of wordsOf(it.say || it.text)) add(w, 'chip:' + it.id);
  if (it.mean) add(it.mean, 'meaning');
  if (it.kind === 'menu') { add(it.t, 'menu'); add(it.price, 'price'); }
  if (it.kind === 'form') add(it.t, 'form');
  if (it.refSay) add(it.refSay, 'ref');
}
// ---- (3) templates app.js builds at runtime (keep in sync with js/app.js)
const TEMPLATES = [];
function tpl(name, fn) { TEMPLATES.push(name); fn(); }
tpl("'This letter makes the sound at the end of ' + it.kw", () => C.items.filter((i) => i.kind === 'letter').forEach((it) => {
  add((it.pos === 'end' ? 'This letter makes the sound at the end of ' : 'This letter makes the first sound in ') + it.kw + '. Tap the letter to hear it again. Then tap play.', 'help:letter');
}));
tpl("'Which letter is at the end of ' + it.kw", () => C.items.filter((i) => i.kind === 'letter').forEach((it) => {
  add(it.pos === 'end' ? 'Which letter is at the end of ' + it.kw + '?' : 'Which letter starts the word ' + it.kw + '?', 'prompt:letter');
}));
tpl("'This is a tricky word. It does not sound out the normal way. Just remember it. It says: ' + spoken(it)", () => C.items.filter((i) => i.kind === 'sight').forEach((it) => {
  add('This is a tricky word. It does not sound out the normal way. Just remember it. It says: ' + spoken(it) + '. Then tap play.', 'help:sight');
}));
tpl("prompt + ' ' + name", () => C.items.filter((i) => ['word', 'sight', 'sign', 'menu', 'form'].includes(i.kind)).forEach((it) => {
  const prompt = it.kind === 'sign' ? 'Find the sign that says:' : it.kind === 'form' ? 'Find the line that says:' : 'Find the word:';
  add(prompt + ' ' + (it.kind === 'menu' ? it.t : spoken(it)), 'help:find');
}));
tpl("name + ' speech'", () => ['Slow', 'Normal', 'Fast'].forEach((n) => add(n + ' speech', 'label')));

// ---- (4) reward lines (js/rewards.js + the counts app.js builds). Dynamic lines are
// played sentence by sentence (Speech.sentences), so each sentence gets its own clip, one
// per value in a realistic range. Beyond it that one sentence uses the phone voice.
const RW = ctx.window.Rewards;
const bankable = C.items.filter(RW.isBankItem).length;
const WORDS_MAX = Math.max(150, bankable + 50), DAYS_MAX = 100;
const NUM_WORDS = (n) => n < 100 ? num(n) : n % 100 ? ONES[Math.floor(n / 100)] + ' hundred ' + num(n % 100) : ONES[Math.floor(n / 100)] + ' hundred';
const sayNums = (t) => { const x = t.replace(/\b(\d{1,3})\b/g, (_, d) => NUM_WORDS(+d)); return x[0].toUpperCase() + x.slice(1); }; // "5 days" -> "Five days" for the TTS
const addSentences = (t, src) => S.sentences(t).forEach((x) => add(x, src, 'reward', sayNums(x)));
tpl('Rewards.streakText (all states, 1-' + DAYS_MAX + ' days, 0-2 skips)', () => {
  addSentences(RW.streakText({ state: 'none', count: 0, skipsLeft: 2 }).say, 'streak');
  for (let k = 0; k <= RW.MAX_SKIPS; k++) {
    addSentences(RW.streakText({ state: 'fresh', count: 0, skipsLeft: k }).say, 'streak');
    for (let d = 1; d <= DAYS_MAX; d++) addSentences(RW.streakText({ state: 'on', count: d, skipsLeft: k }).say, 'streak');
  }
});
tpl("'You know ' + n + ' words.' (0-" + WORDS_MAX + ')', () => {
  for (let n = 0; n <= WORDS_MAX; n++) {
    addSentences('Word bank. You know ' + n + (n === 1 ? ' word.' : ' words.'), 'words');
    if (n) addSentences('You know ' + n + (n === 1 ? ' word.' : ' words.') + ' Tap any word to hear it.', 'words');
  }
  addSentences('No words yet.', 'words');
});
tpl('Rewards.describe (milestone messages)', () => {
  RW.WORD_MILESTONES.forEach((n) => add(RW.describe('words-' + n).text, 'milestone', 'reward', sayNums(RW.describe('words-' + n).text)));
  RW.STREAK_MILESTONES.forEach((n) => add(RW.describe('streak-' + n).text, 'milestone', 'reward', sayNums(RW.describe('streak-' + n).text)));
});

// ---- (2) literals in app.js
const SINGLE_WORD_LABELS = ['Home', 'Next', 'Start', 'Settings', 'Stop', 'Got it.'];
const DISPLAY_ONLY = [/^Word bank\. You know $/, /^You know $/, /^Step $/, /^Bible verses: King James/, /^iPhone: Safari/, /^Speech recognition is not available/, /^Tap again to erase$/, /^Automatic$/, /^Read Aloud$/];
const lit = /'((?:[^'\\\n]|\\.)*)'/g;
let m;
while ((m = lit.exec(appSrc))) {
  const s = m[1];
  if (!/^[A-Z]/.test(s) || !/[a-z]/.test(s)) continue;        // spoken text starts with a capital
  if (/[#\/=%<>{}]/.test(s)) continue;                         // routes, selectors, markup
  const oneWord = !/[ .!?:,]/.test(s);
  if (oneWord && !SINGLE_WORD_LABELS.includes(s)) continue;    // aria-only words like 'Choice'
  if (/[^\x00-\x7F’]/.test(s)) continue;                       // emoji / symbols = display only
  if (DISPLAY_ONLY.some((re) => re.test(s))) continue;
  if (/^(Arial|Georgia|Helvetica)/.test(s)) continue;
  add(s, 'app.js');
}

// ---- report string-joining in speech calls that no template covers
const uncovered = [];
appSrc.split('\n').forEach((line, i) => {
  if (!/(S\.say|help:|prompt =|const help|meaning =)/.test(line) || !/'\s*\+|\+\s*'/.test(line)) return;
  const known = ['it.kw', "' + spoken(it) + '", "prompt + ' ' + name", "name + ' speech'", "'#/", "'L1-'"];
  if (known.some((k) => line.includes(k))) return;
  uncovered.push({ line: i + 1, code: line.trim() });
});

const entries = [...out.values()];
const result = {
  generatedBy: 'tools/audio/collect-texts.mjs',
  count: entries.length,
  letters: C.letters.map((x) => ({ l: x.l, sound: x.sound, kw: x.kw, soundKey: S.clipKey(x.sound) })),
  slowWords: C.words.map((x) => S.clipKey(x.w)),   // Level 2 blending plays these slowly
  templates: TEMPLATES,
  uncovered,
  entries
};
const dest = process.argv[2] || path.join(ROOT, 'tools/audio/texts.json');
fs.writeFileSync(dest, JSON.stringify(result, null, 1));
console.log(`collected ${entries.length} texts (${C.letters.length} letter sounds separately); uncovered expressions: ${uncovered.length}`);
for (const u of uncovered) console.log(`  UNCOVERED app.js:${u.line}: ${u.code}`);
