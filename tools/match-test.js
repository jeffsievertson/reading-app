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
console.log(cases.length - fail + '/' + cases.length + ' passed'); process.exit(fail ? 1 : 0);
