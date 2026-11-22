// Run: node tools/match-test.js  — checks the answer-matching logic used for speech recognition.
global.window = {};
require('../js/content.js'); require('../js/speech.js');
const S = window.Speech, H = window.CONTENT.homophones;
const cases = [
  ['sun', ['son'], true], ['cat', ['cut'], false], ['cat', ['the cat'], true],
  ['The cat sat on a mat.', ['the cat sat on the mat'], true], ['The cat sat on a mat.', ['cat'], false],
  ['I', ['eye'], true], ['Date of Birth', ['date of birth'], true], ['Restroom', ['rest room'], true],
  ['Chicken', ['chickens'], true], ['The Lord is my shepherd; I shall not want.', ['the lord is my shepherd i shall not want'], true]
];
let fail = 0;
for (const [t, alts, want] of cases) { const got = S.matches(t, alts, H); if (got !== want) { fail++; console.log('FAIL', t, alts, got); } }
console.log(cases.length - fail + '/' + cases.length + ' core cases passed');

const C = window.CONTENT;
const spoken = (it) => it.say || it.text || it.label;
const answerText = (it) => it.text || it.label;
const sayKinds = new Set(['word', 'sight', 'sentence', 'verse', 'sign', 'menu', 'form', 'missing']);
const sayItems = C.items.filter((it) => it.say && sayKinds.has(it.kind));
let broken = [];
for (const it of sayItems) {
  const target = answerText(it);
  if (!target) { broken.push(it.id + ': no display text'); continue; }
  if (!S.matches(target, [target], H)) broken.push(it.id + ': display text not accepted as itself');
}
if (broken.length) { fail += broken.length; console.log('FAIL say-items mic match', broken); }
else console.log('PASS every item with say accepts its display text as the mic target (' + sayItems.length + ')');

const live = C.items.find((it) => it.id === 'SW-live');
const liveOk = live && live.say === 'liv' && live.text === 'live'
  && S.matches(answerText(live), ['live'], H)
  && !S.matches(spoken(live), ['live'], H);
if (!liveOk) { fail++; console.log('FAIL SW-live: saying "live" must pass when the target is the display text, and fail if the target is say:"liv"', live && { say: live.say, text: live.text, asText: S.matches(answerText(live), ['live'], H), asSay: S.matches(spoken(live), ['live'], H) }); }
else console.log('PASS SW-live: saying "live" is accepted (target is display text, not liv)');

console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);

