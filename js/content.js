/* Lesson content for the Read Aloud phonics app.
 * All text written for this project, except the Bible verses, which are
 * quoted from the King James Version (public domain in the United States).
 *
 * Fields:
 *   sound  - best-effort text the speech engine reads to imitate a letter sound
 *   say    - optional text to SPEAK instead of the displayed text (pronunciation fixes)
 */
window.CONTENT = (function () {
  // ---------- Level 1: letter sounds, A to Z ----------
  // Listed here grouped by a common phonics sequence (s a t p i n …) for reference;
  // the lessons are shown and taught in alphabetical order (sorted below).
  // Progress is saved by letter id ('L1-a'), so the order can change freely.
  const letters = [
    { l: 's', sound: 'sss',  kw: 'sun',     emoji: '☀️' },
    { l: 'a', sound: 'aah',  kw: 'apple',   emoji: '🍎' },
    { l: 't', sound: 'tuh',  kw: 'tent',    emoji: '⛺' },
    { l: 'p', sound: 'puh',  kw: 'pan',     emoji: '🍳' },
    { l: 'i', sound: 'ih',   kw: 'insect',  emoji: '🦗' },
    { l: 'n', sound: 'nnn',  kw: 'nut',     emoji: '🥜' },
    { l: 'm', sound: 'mmm',  kw: 'map',     emoji: '🗺️' },
    { l: 'd', sound: 'duh',  kw: 'dog',     emoji: '🐕' },
    { l: 'g', sound: 'guh',  kw: 'gas',     emoji: '⛽' },
    { l: 'o', sound: 'ah',   kw: 'octopus', emoji: '🐙' },
    { l: 'c', sound: 'kuh',  kw: 'cup',     emoji: '☕' },
    { l: 'k', sound: 'kuh',  kw: 'key',     emoji: '🔑' },
    { l: 'e', sound: 'eh',   kw: 'egg',     emoji: '🥚' },
    { l: 'u', sound: 'uh',   kw: 'up',      emoji: '⬆️' },
    { l: 'r', sound: 'rrr',  kw: 'run',     emoji: '🏃' },
    { l: 'h', sound: 'hhh',  kw: 'hat',     emoji: '🧢' },
    { l: 'b', sound: 'buh',  kw: 'bus',     emoji: '🚌' },
    { l: 'f', sound: 'fff',  kw: 'fish',    emoji: '🐟' },
    { l: 'l', sound: 'lll',  kw: 'lamp',    emoji: '💡' },
    { l: 'j', sound: 'juh',  kw: 'jet',     emoji: '✈️' },
    { l: 'w', sound: 'wuh',  kw: 'water',   emoji: '💧' },
    { l: 'v', sound: 'vvv',  kw: 'van',     emoji: '🚐' },
    { l: 'y', sound: 'yuh',  kw: 'yes',     emoji: '✅' },
    { l: 'z', sound: 'zzz',  kw: 'zero',    emoji: '0️⃣' },
    { l: 'x', sound: 'ks',   kw: 'box',     emoji: '📦', pos: 'end' },
    { l: 'q', sound: 'kwuh', kw: 'queen',  emoji: '👑' }   // the letter Q; its usual sound /kw/ as in queen
  ];
  letters.sort((a, b) => a.l.localeCompare(b.l));
  // Letter names, said first in each letter lesson ("This is the letter E. It makes the
  // sound eh, eh."). `tts` respells names the phone's built-in voice could misread
  // (A as the article "uh", I, U …); the natural-voice clips are generated from phonemes.
  const NAME_TTS = { a: 'ay', e: 'ee', i: 'eye', o: 'oh', u: 'you', y: 'why', w: 'double you', q: 'cue', r: 'are', h: 'aitch' };
  letters.forEach((x) => {
    x.name = x.l.toUpperCase();
    x.intro = 'This is the letter ' + x.name + '.';
    x.introTts = 'This is the letter ' + (NAME_TTS[x.l] || x.name) + '.';
  });

  // ---------- Level 2: CVC words (roughly in letter-teaching order) ----------
  // The picture is shown only AFTER he reads the word, so he decodes rather than guesses.
  const words = [
    ['sat', '🪑'], ['sit', '🪑'], ['pin', '📌'], ['tin', '🥫'], ['tap', '🚰'],
    ['map', '🗺️'], ['man', '👨'], ['pan', '🍳'], ['nap', '😴'], ['mad', '😠'],
    ['dad', '👨‍👦'], ['dig', '⛏️'], ['pig', '🐖'], ['dog', '🐕'], ['top', '🔝'],
    ['cat', '🐈'], ['cup', '☕'], ['kid', '🧒'], ['red', '🟥'], ['ten', '🔟'],
    ['hen', '🐔'], ['bed', '🛏️'], ['bus', '🚌'], ['sun', '☀️'], ['run', '🏃'],
    ['hat', '🧢'], ['hot', '🔥'], ['bug', '🐛'], ['leg', '🦵'], ['jet', '✈️'],
    ['wet', '💧'], ['van', '🚐'], ['yes', '✅'], ['zip', '🤐'], ['box', '📦'],
    ['fox', '🦊']
  ].map(([w, emoji]) => ({ w, emoji }));

  // ---------- Level 3: tricky (sight) words, then short sentences ----------
  const sight = [
    { w: 'the', tip: 'This is a tricky word. It does not sound out. Just remember it.' },
    { w: 'I' },
    { w: 'is', say: 'is' },
    { w: 'to' },
    { w: 'my' },
    { w: 'we' },
    { w: 'he' },
    { w: 'see' },
    { w: 'was' },
    { w: 'you' }
  ];
  const sentences = [
    'I sat.',
    'A cat sat.',
    'The cat sat on a mat.',
    'Dad can run.',
    'I see a big dog.',
    'The sun is hot.',
    'My cup is wet.',
    'We get in the van.',
    'The pig is in the mud.',
    'Is the bus red?',
    'He had a nap.',
    'I can fix it.',
    'Get the box to Dad.',
    'Was it fun? Yes!'
  ];

  // ---------- Level 4: real-life reading ----------
  const signs = [
    { t: 'STOP',     style: 'stop',    say: 'Stop',     mean: 'Stop. Do not go.' },
    { t: 'EXIT',     style: 'exit',    say: 'Exit',     mean: 'Exit. This is the way out.' },
    { t: 'OPEN',     style: 'open',    say: 'Open',     mean: 'Open. You can go in. The place is open.' },
    { t: 'CLOSED',   style: 'closed',  say: 'Closed',   mean: 'Closed. The place is not open right now.' },
    { t: 'PUSH',     style: 'door',    say: 'Push',     mean: 'Push. Push the door away from you.' },
    { t: 'PULL',     style: 'door',    say: 'Pull',     mean: 'Pull. Pull the door toward you.' },
    { t: 'RESTROOM', style: 'rest',    say: 'Restroom', mean: 'Restroom. This is the bathroom.' },
    { t: 'DANGER',   style: 'danger',  say: 'Danger',   mean: 'Danger. Stay away. It is not safe.' }
  ];
  const menu = [
    { t: 'Coffee',   price: '$2.00', emoji: '☕' },
    { t: 'Eggs',     price: '$4.50', emoji: '🍳' },
    { t: 'Burger',   price: '$7.99', emoji: '🍔' },
    { t: 'Fries',    price: '$3.00', emoji: '🍟' },
    { t: 'Chicken',  price: '$8.50', emoji: '🍗' },
    { t: 'Soup',     price: '$4.00', emoji: '🍲' },
    { t: 'Salad',    price: '$6.00', emoji: '🥗' },
    { t: 'Water',    price: '$1.00', emoji: '💧' },
    { t: 'Pizza',    price: '$9.00', emoji: '🍕' }
  ];
  const forms = [
    { t: 'Name',          mean: 'Name. Write your name here. First name, then last name.' },
    { t: 'Address',       mean: 'Address. Write where you live. House number and street.' },
    { t: 'Phone',         mean: 'Phone. Write your phone number here.' },
    { t: 'Date of Birth', mean: 'Date of birth. Write the day you were born. Month, day, and year.' },
    { t: 'Signature',     mean: 'Signature. Sign your name here, the way you always sign it.' }
  ];
  // King James Version (1611 / standard 1769 text) - public domain in the US.
  const verses = [
    { t: 'Jesus wept.', ref: 'John 11:35', refSay: 'John chapter 11, verse 35' },
    { t: 'Rejoice evermore.', ref: '1 Thessalonians 5:16', refSay: 'First Thessalonians chapter 5, verse 16' },
    { t: 'Pray without ceasing.', ref: '1 Thessalonians 5:17', refSay: 'First Thessalonians chapter 5, verse 17' },
    { t: 'And God said, Let there be light: and there was light.', ref: 'Genesis 1:3', refSay: 'Genesis chapter 1, verse 3' },
    { t: 'The LORD is my shepherd; I shall not want.', say: 'The Lord is my shepherd; I shall not want.', ref: 'Psalm 23:1', refSay: 'Psalm 23, verse 1' },
    { t: 'In the beginning God created the heaven and the earth.', ref: 'Genesis 1:1', refSay: 'Genesis chapter 1, verse 1' },
    { t: 'I can do all things through Christ which strengtheneth me.', ref: 'Philippians 4:13', refSay: 'Philippians chapter 4, verse 13' },
    { t: 'This is the day which the LORD hath made; we will rejoice and be glad in it.', say: 'This is the day which the Lord hath made; we will rejoice and be glad in it.', ref: 'Psalm 118:24', refSay: 'Psalm 118, verse 24' }
  ];

  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  // ---------- Flatten into a single ordered list of items ----------
  const items = [];
  letters.forEach((x) => items.push({ id: 'L1-' + x.l, level: 1, kind: 'letter', label: x.l, ...x }));
  words.forEach((x) => items.push({ id: 'L2-' + x.w, level: 2, kind: 'word', label: x.w, text: x.w, ...x }));
  sight.forEach((x) => items.push({ id: 'L3-sw-' + slug(x.w), level: 3, kind: 'sight', label: x.w, text: x.w, ...x }));
  sentences.forEach((s, i) => items.push({ id: 'L3-s' + (i + 1), level: 3, kind: 'sentence', label: s, text: s }));
  signs.forEach((x) => items.push({ id: 'L4-sign-' + slug(x.t), level: 4, cat: 'signs', kind: 'sign', label: x.t, text: x.t, ...x }));
  menu.forEach((x) => items.push({ id: 'L4-menu-' + slug(x.t), level: 4, cat: 'menu', kind: 'menu', label: x.t, text: x.t, ...x }));
  forms.forEach((x) => items.push({ id: 'L4-form-' + slug(x.t), level: 4, cat: 'forms', kind: 'form', label: x.t, text: x.t, ...x }));
  verses.forEach((x) => items.push({ id: 'L4-kjv-' + slug(x.ref), level: 4, cat: 'bible', kind: 'verse', label: x.ref, text: x.t, ...x }));

  const levels = [
    { n: 1, icon: '🔤', name: 'Sounds',    say: 'Level 1. Letter sounds.' },
    { n: 2, icon: '🧩', name: 'Words',     say: 'Level 2. Words.' },
    { n: 3, icon: '💬', name: 'Sentences', say: 'Level 3. Sentences.' },
    { n: 4, icon: '🏙️', name: 'Real Life', say: 'Level 4. Real life reading.' }
  ];
  const cats = [
    { id: 'signs', icon: '🛑', name: 'Signs', say: 'Signs.' },
    { id: 'menu',  icon: '🍔', name: 'Menu',  say: 'Menu.' },
    { id: 'forms', icon: '📝', name: 'Forms', say: 'Forms.' },
    { id: 'bible', icon: '📖', name: 'Bible', say: 'Bible verses. King James Version.' }
  ];

  // letter -> sound lookup used when tapping letters inside words
  const soundOf = {};
  letters.forEach((x) => { soundOf[x.l] = x.sound; });

  // Homophones / common mis-hearings accepted by speech recognition
  const homophones = {
    sun: ['son'], no: ['know'], red: ['read'], i: ['eye', 'aye', 'hi'], to: ['two', 'too'],
    see: ['sea', 'c'], be: ['bee'], you: ['u', 'yu'], we: ['wee'], hen: ['hand'],
    pin: ['pen'], ten: ['tin'], cot: ['caught'],  // pin/pen and ten/tin sound alike in many US accents
    pan: ['pam'], nap: ['knap'], zip: ['zipp'], he: ['hee'],
    jet: ['jett'], dad: ['dat'], was: ['wuz'],
    the: ['da', 'duh'], my: ['mi', 'mai'], restroom: ['rest room'], 'date of birth': ['date a birth']
  };

  return { letters, words, sight, sentences, signs, menu, forms, verses, items, levels, cats, soundOf, homophones };
})();
