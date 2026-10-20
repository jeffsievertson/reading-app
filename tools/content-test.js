// Run: node tools/content-test.js — content checks: Level 1 is the letters A-Z with Q (never
// "qu"), and every letter has a letter-sound clip in audio/clips.json.
global.window = {};
require('../js/content.js'); require('../js/speech.js');
const C = window.CONTENT, S = window.Speech;
const fs = require('fs'), path = require('path');
let fail = 0;
const check = (name, ok, info) => { console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + JSON.stringify(info))); if (!ok) fail++; };
const l1 = C.items.filter((i) => i.level === 1);
const az = 'abcdefghijklmnopqrstuvwxyz'.split('');
check('Level 1 is the 26 letters in A-Z order', JSON.stringify(l1.map((i) => i.l)) === JSON.stringify(az), l1.map((i) => i.l));
check('Level 1 ids are keyed by letter (L1-a … L1-z)', l1.every((i, k) => i.id === 'L1-' + az[k]), l1.map((i) => i.id));
check("Level 1 has 'q' and no 'qu'", l1.some((i) => i.l === 'q' && i.label === 'q' && i.kw === 'queen') && !l1.some((i) => /qu/i.test(i.l + i.label + i.id)));
check("soundOf has 'q', not 'qu'", C.soundOf.q && !('qu' in C.soundOf));
const m = JSON.parse(fs.readFileSync(path.join(__dirname, '../audio/clips.json'), 'utf8'));
check('every letter has a letter-sound clip', az.every((l) => m.letters['letters/' + l]), az.filter((l) => !m.letters['letters/' + l]));
check("no clip key or letter named 'qu'", !('letters/qu' in m.letters) && !Object.keys(m.clips).some((k) => /(^| )qu( |$)/.test(k)));
check('every clip file exists', m.files.every((f) => fs.existsSync(path.join(__dirname, '../audio', f))), m.files.filter((f) => !fs.existsSync(path.join(__dirname, '../audio', f))));
const T = JSON.parse(fs.readFileSync(path.join(__dirname, 'audio/texts.json'), 'utf8'));
check("no spoken text says 'qu'", !T.entries.some((e) => /(^| )qu( |$)/i.test(S.clipKey(e.speak))), T.entries.filter((e) => /(^| )qu( |$)/i.test(S.clipKey(e.speak))));
check("the Q letter name is spoken as 'Q.'", (T.entries.find((e) => e.key === 'q') || {}).speak === 'Q.');
check('every letter has its name intro "This is the letter X." with a clip', l1.every((i) => i.intro === 'This is the letter ' + i.l.toUpperCase() + '.' && m.clips[S.clipKey(i.intro)]), l1.filter((i) => !m.clips[S.clipKey(i.intro || '')]).map((i) => i.l));
check('"It makes the sound" has a clip', !!m.clips['it makes the sound']);
check('built-in voice respells easily misread names (A=ay, I=eye, U=you)', l1.find((i) => i.l === 'a').introTts === 'This is the letter ay.' && l1.find((i) => i.l === 'i').introTts === 'This is the letter eye.' && l1.find((i) => i.l === 'u').introTts === 'This is the letter you.');
console.log(fail ? fail + ' FAILED' : 'all passed'); process.exit(fail ? 1 : 0);
