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
    { l: 'a', sound: 'aah',  kw: 'apple',   emoji: '🍎' , img: 'apple' },
    { l: 't', sound: 'tuh',  kw: 'tent',    emoji: '⛺' },
    { l: 'p', sound: 'puh',  kw: 'pan',     emoji: '🍳' , img: 'pan' },
    { l: 'i', sound: 'ih',   kw: 'insect',  emoji: '🦗' },
    { l: 'n', sound: 'nnn',  kw: 'nut',     emoji: '🥜' },
    { l: 'm', sound: 'mmm',  kw: 'map',     emoji: '🗺️' , img: 'map' },
    { l: 'd', sound: 'duh',  kw: 'dog',     emoji: '🐕' , img: 'dog' },
    { l: 'g', sound: 'guh',  kw: 'gas',     emoji: '⛽' },
    { l: 'o', sound: 'ah',   kw: 'octopus', emoji: '🐙' },
    { l: 'c', sound: 'kuh',  kw: 'cup',     emoji: '☕' , img: 'cup' },
    { l: 'k', sound: 'kuh',  kw: 'key',     emoji: '🔑' , img: 'key' },
    { l: 'e', sound: 'eh',   kw: 'egg',     emoji: '🥚' , img: 'eggs' },
    { l: 'u', sound: 'uh',   kw: 'up',      emoji: '⬆️' },
    { l: 'r', sound: 'rrr',  kw: 'run',     emoji: '🏃' },
    { l: 'h', sound: 'hhh',  kw: 'hat',     emoji: '🧢' , img: 'hat' },
    { l: 'b', sound: 'buh',  kw: 'bus',     emoji: '🚌' , img: 'bus' },
    { l: 'f', sound: 'fff',  kw: 'fish',    emoji: '🐟' },
    { l: 'l', sound: 'lll',  kw: 'lamp',    emoji: '💡' , img: 'lamp' },
    { l: 'j', sound: 'juh',  kw: 'jet',     emoji: '✈️' , img: 'jet' },
    { l: 'w', sound: 'wuh',  kw: 'water',   emoji: '💧' },
    { l: 'v', sound: 'vvv',  kw: 'van',     emoji: '🚐' },
    { l: 'y', sound: 'yuh',  kw: 'yes',     emoji: '✅' },
    { l: 'z', sound: 'zzz',  kw: 'zero',    emoji: '0️⃣' },
    { l: 'x', sound: 'ks',   kw: 'box',     emoji: '📦', pos: 'end' , img: 'box' },
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
  ].map(([w, emoji]) => {
    const imgs = {"map": "map", "pan": "pan", "dog": "dog", "cat": "cat", "cup": "cup", "bed": "bed", "bus": "bus", "hat": "hat", "jet": "jet", "box": "box"};
    return imgs[w] ? { w, emoji, img: imgs[w] } : { w, emoji };
  });

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

  // ---------- Level 3: missing letter (v20) ----------
  // A Level 2 word with one letter hidden (c_t). He hears the word, sees its picture and taps
  // the missing letter. Wrong choices are hand-picked so none makes another real word
  // (c_t: a/e/i, never o or u -> cot, cut). Choices are shown A-Z. Then he says the word (mic).
  const missing = [
    ['map', 0, 'kmv'], ['pin', 2, 'bdn'], ['dog', 2, 'fgv'], ['cat', 1, 'aei'],
    ['cup', 2, 'flp'], ['red', 0, 'krv'], ['bus', 0, 'bfk'], ['sun', 1, 'aeu'],
    ['hat', 0, 'hjz'], ['jet', 2, 'bft'], ['van', 2, 'bfn'], ['box', 1, 'aeo']
  ].map(([w, at, opts]) => {
    const src = words.find((x) => x.w === w);
    return { w, at, miss: w[at], opts: opts.split(''), shown: w.slice(0, at) + '_' + w.slice(at + 1), emoji: src.emoji, img: src.img };
  });

  // ---------- Level 5: everyday words and sentences (v20) ----------
  // New everyday decodable words (short vowels, simple blends), then short everyday sentences
  // that use them plus a few other simple words.
  const everydayWords = [
    ['job', '💼'], ['gas', '⛽'], ['fix', '🔧'], ['pen', '🖊️'], ['bin', '🗑️'],
    ['mop', '🪣'], ['cab', '🚕'], ['rent', '🏠'], ['milk', '🥛'], ['help', '🤝']
  ].map(([w, emoji]) => ({ w, emoji }));
  const everydaySentences = [
    'I got the job.',
    'I can help you.',
    'The bus is at ten.',
    'Get gas in the van.',
    'Get a pen and a pad.',
    'Get milk and eggs.',
    'The pan is hot.',
    'I can mop it up.',
    'I sent the rent.',
    'Did you get a bus pass?'
  ];

  // ---------- Grapheme tiles (v21) ----------
  // Longest taught multi-letter unit first, so "shop" is sh-o-p, not s-h-o-p, and
  // "check" is ch-e-ck. Level 2 CVC words still split into single letters.
  // Pattern sound clips live in clips.json `patterns` (one key per sound) so a later
  // Whitney recording is a file swap, not a new code path. ck / FLOSS reuse Whitney.
  const GRAPHMES = [
    { g: 'ck', sound: 'kuh',  clip: 'letters/k' },
    { g: 'ff', sound: 'fff',  clip: 'letters/f' },
    { g: 'll', sound: 'lll',  clip: 'letters/l' },
    { g: 'ss', sound: 'sss',  clip: 'letters/s' },
    { g: 'zz', sound: 'zzz',  clip: 'letters/z' },
    { g: 'sh', sound: 'shh',  clip: 'patterns/sh' },
    { g: 'ch', sound: 'chuh', clip: 'patterns/ch' },
    { g: 'th', sound: 'thh',  clip: 'patterns/th' },
    { g: 'wh', sound: 'wuh',  clip: 'patterns/wh' },
    { g: 'ng', sound: 'nng',  clip: 'patterns/ng' },
    // v22 ending / starting blends (temporary Kokoro clips; swap later like digraphs)
    { g: 'str', sound: 'str', clip: 'patterns/str' },
    { g: 'st',  sound: 'st',  clip: 'patterns/st' },
    { g: 'nt',  sound: 'nt',  clip: 'patterns/nt' },
    { g: 'nd',  sound: 'nd',  clip: 'patterns/nd' },
    { g: 'mp',  sound: 'mp',  clip: 'patterns/mp' },
    { g: 'nk',  sound: 'nk',  clip: 'patterns/nk' },
    { g: 'lk',  sound: 'lk',  clip: 'patterns/lk' },
    { g: 'lp',  sound: 'lp',  clip: 'patterns/lp' },
    { g: 'pl',  sound: 'pl',  clip: 'patterns/pl' },
    { g: 'tr',  sound: 'tr',  clip: 'patterns/tr' },
    { g: 'dr',  sound: 'dr',  clip: 'patterns/dr' },
    { g: 'fl',  sound: 'fl',  clip: 'patterns/fl' },
    { g: 'sl',  sound: 'sl',  clip: 'patterns/sl' },
    { g: 'gr',  sound: 'gr',  clip: 'patterns/gr' }
  ].sort((a, b) => b.g.length - a.g.length);
  const VOICED_TH = new Set(['that', 'with', 'them', 'then', 'this', 'these']);
  const S_AS_Z = new Set(['bills', 'his']); // plural or final s says /z/ in these words
  // Suffix units only at the end, and only after a 3+ letter stem, so "red" stays r-e-d
  // and "ring" stays r-i-ng (not r-ing).
  const ED_AS = { wished: 't', missed: 't', grabbed: 'd', handed: 'id' };
  const SUFFIXES = [
    { g: 'ing', min: 3, sound: 'ing', clip: 'patterns/ing' },
    { g: 'es',  min: 3, sound: 'iz',  clip: 'patterns/es' },
    { g: 'ed',  min: 3 }
  ];
  function edParts(word, stem) {
    const how = ED_AS[word] || (/[td]$/.test(stem) ? 'id' : (/(?:[kpsfx]|ck|ss|sh|ch|th)$/.test(stem) ? 't' : 'd'));
    if (how === 'id') return { sound: 'id', clip: 'patterns/ed-id' };
    if (how === 't') return { sound: 't', clip: 'letters/t' };
    return { sound: 'd', clip: 'letters/d' };
  }
  function segments(word) {
    const w = String(word || '').toLowerCase();
    const out = [];
    let i = 0;
    while (i < w.length) {
      let hit = null, sound, clip, len;
      for (const sfx of SUFFIXES) {
        if (i >= sfx.min && i === w.length - sfx.g.length && w.endsWith(sfx.g)) {
          if (sfx.g === 'ed') {
            const p = edParts(w, w.slice(0, i));
            sound = p.sound; clip = p.clip;
          } else { sound = sfx.sound; clip = sfx.clip; }
          hit = sfx; len = sfx.g.length;
          break;
        }
      }
      if (!hit) {
        for (const p of GRAPHMES) { if (w.startsWith(p.g, i)) { hit = p; break; } }
        if (hit) {
          sound = hit.sound; clip = hit.clip; len = hit.g.length;
          if (hit.g === 'th' && VOICED_TH.has(w)) { sound = 'dhh'; clip = 'patterns/th-voiced'; }
        }
      }
      if (hit) {
        out.push({ g: hit.g, sound, clip });
        i += len;
      } else if (/[bcdfghjklmnpqrstvwxyz]/.test(w[i]) && w[i + 1] === w[i]) {
        const ch = w[i];
        out.push({ g: ch + ch, sound: soundOf[ch] || ch, clip: 'letters/' + ch });
        i += 2;
      } else {
        const ch = w[i];
        if (ch === 's' && S_AS_Z.has(w) && i === w.length - 1) {
          out.push({ g: 's', sound: 'zzz', clip: 'letters/z' });
        } else {
          out.push({ g: ch, sound: soundOf[ch] || ch, clip: 'letters/' + ch });
        }
        i += 1;
      }
    }
    markSilentE(w, out);
    return out;
  }
  // Silent e (VCe): name → n|a|m|e. The vowel tile plays the long sound; the final e
  // is silent. Do not apply to heart-word lookalikes (give, live, love, come, …)
  // or r-controlled endings (care, fire). "these" uses voiced th and s as /z/.
  const NOT_VCE = new Set(['give', 'live', 'love', 'does', 'done', 'come', 'some', 'one', 'have', 'gone', 'none', 'were']);
  const LONG = { a: { sound: 'long a', clip: 'patterns/a-e' }, i: { sound: 'long i', clip: 'patterns/i-e' },
    o: { sound: 'long o', clip: 'patterns/o-e' }, u: { sound: 'long u', clip: 'patterns/u-e' },
    e: { sound: 'long e', clip: 'patterns/e-e' } };
  const VCE_S_AS_Z = new Set(['these']);
  function isVceWord(w) {
    if (!w || NOT_VCE.has(w) || /[aeiou]re$/.test(w)) return false;
    return /[aeiou][^aeiouy]e$/.test(w);
  }
  function markSilentE(w, out) {
    if (!isVceWord(w) || out.length < 3 || out[out.length - 1].g !== 'e') return;
    const last = out.length - 1, cons = last - 1, vow = last - 2;
    const vg = out[vow].g;
    if (!LONG[vg]) return;
    out[vow] = Object.assign({}, out[vow], { sound: LONG[vg].sound, clip: LONG[vg].clip, vce: true });
    out[last] = Object.assign({}, out[last], { sound: 'silent', clip: null, silent: true });
    if (VCE_S_AS_Z.has(w) && out[cons].g === 's') {
      out[cons] = Object.assign({}, out[cons], { sound: 'zzz', clip: 'letters/z' });
    }
  }

  // ---------- Level 6: Spellings (ck, FLOSS, plural -s) + Book 3 heart words ----------
  const spellHearts = [
    { w: 'of' }, { w: 'said' }, { w: 'are' }, { w: 'they' }
  ];
  const spellPatterns = [
    { id: 'P-ck', label: 'ck', letters: 'ck', sound: 'kuh',  clipName: 'letters/k', kw: 'sock', pos: 'end',   emoji: '🧦', intro: 'These letters are C K.', opts: 'ck,k,s' },
    { id: 'P-ff', label: 'ff', letters: 'ff', sound: 'fff',  clipName: 'letters/f', kw: 'off',  pos: 'end',   emoji: '⛔', intro: 'These letters are F F.', opts: 'ff,f,ss' },
    { id: 'P-ll', label: 'll', letters: 'll', sound: 'lll',  clipName: 'letters/l', kw: 'fill', pos: 'end',   emoji: '🫗', intro: 'These letters are L L.', opts: 'll,l,ss' },
    { id: 'P-ss', label: 'ss', letters: 'ss', sound: 'sss',  clipName: 'letters/s', kw: 'mess', pos: 'end',   emoji: '🧹', intro: 'These letters are S S.', opts: 'ss,s,ff' },
    { id: 'P-zz', label: 'zz', letters: 'zz', sound: 'zzz',  clipName: 'letters/z', kw: 'buzz', pos: 'end',   emoji: '🐝', intro: 'These letters are Z Z.', opts: 'zz,z,ss' },
    { id: 'P-s',  label: '-s', letters: 's',  sound: 'zzz',  clipName: 'letters/z', kw: 'bills', pos: 'end',  emoji: '🧾',
      intro: 'S at the end of a word can say',
      introParts: [
        { text: 'S at the end of a word can say', pause: 150 },
        { clipName: 'letters/s', text: 'sss', rateMul: 0.8, pause: 350 },
        { text: 'or', pause: 150 },
        { clipName: 'letters/z', text: 'zzz', rateMul: 0.8, pause: 700 }
      ],
      frame: 'In bills, it says',
      opts: 's,z,f' }
  ];
  const spellWords = [
    ['sock', '🧦'], ['back', '🔙'], ['kick', '🦵'], ['duck', '🦆'],
    ['fill', '🫗'], ['hill', '⛰️'], ['well', '💧'], ['mess', '🧹'],
    ['pass', '🎫'], ['off', '⛔'], ['buzz', '🐝'], ['bills', '🧾']
  ].map(([w, emoji]) => ({ w, emoji }));
  const spellSentences = [
    'I can kick it.',
    'The duck is in the mud.',
    'Fill the cup.',
    'They said it is a mess.',
    'Pass the pan to Dad.',
    'The top of the hill is hot.',
    'The bills are in the box.',
    'The gas is off.'
  ];

  // ---------- Level 7: Sounds together (sh, ch, th, wh, ng) + Book 4 heart words ----------
  // Digraph sound clips are Kokoro for now (patterns/sh, …), easy to swap for Whitney later.
  const digraphHearts = [
    { w: 'do' }, { w: 'have' }, { w: 'what' }, { w: 'there' }, { w: 'where' }
  ];
  const digraphPatterns = [
    { id: 'P-sh',        label: 'sh', letters: 'sh', sound: 'shh',  clipName: 'patterns/sh',        kw: 'shop', pos: 'start', emoji: '🏪', intro: 'These letters are S H.', opts: 'sh,s,ch' },
    { id: 'P-ch',        label: 'ch', letters: 'ch', sound: 'chuh', clipName: 'patterns/ch',        kw: 'chip', pos: 'start', emoji: '🪵', intro: 'These letters are C H.', opts: 'ch,sh,t' },
    { id: 'P-th',        label: 'th', listLabel: 'th 🚶', letters: 'th', sound: 'thh',  clipName: 'patterns/th',        kw: 'path', pos: 'end',   emoji: '🚶', intro: 'These letters are T H.', opts: 'th,t,sh' },
    { id: 'P-th-voiced', label: 'th', listLabel: 'th 👉', letters: 'th', sound: 'dhh',  clipName: 'patterns/th-voiced', kw: 'that', pos: 'start', emoji: '👉', intro: 'These letters are T H. They also make this sound.', opts: 'th,t,sh' },
    { id: 'P-wh',        label: 'wh', letters: 'wh', sound: 'wuh',  clipName: 'patterns/wh',        kw: 'when', pos: 'start', emoji: '⏰', intro: 'These letters are W H.', opts: 'wh,w,th' },
    { id: 'P-ng',        label: 'ng', letters: 'ng', sound: 'nng',  clipName: 'patterns/ng',        kw: 'ring', pos: 'end',   emoji: '📞', intro: 'These letters are N G.', opts: 'ng,n,g' }
  ];
  const digraphWords = [
    ['shop', '🏪'], ['cash', '💵'], ['shut', '🚪'], ['wish', '✨'],
    ['dish', '🍽️'], ['rush', '🏃'], ['chip', '🪵'], ['chop', '🪓'],
    ['much', '📏'], ['check', '✅'], ['path', '🚶'], ['with', '🤝'],
    ['that', '👉'], ['when', '⏰'], ['ring', '📞'], ['long', '📏']
  ].map(([w, emoji]) => ({ w, emoji }));
  const digraphSentences = [
    'The shop is shut.',
    'I wish I had cash.',
    'Do you have cash?',
    'What do you wish?',
    'Chop it up.',
    'That path is long.',
    'Where is the shop?',
    'There is a long path.'
  ];

  // ---------- Level 8: Ending blends (Book 5) + heart words ----------
  const endHearts = [
    { w: 'from' }, { w: 'your' }, { w: 'one' }, { w: 'come' }, { w: 'some' }
  ];
  const endWords = [
    ['last', '📋'], ['went', '🚶'], ['best', '⭐'], ['must', '❗'], ['hand', '✋'], ['send', '📤'],
    ['jump', '⬆️'], ['camp', '⛺'], ['bank', '🏦'], ['think', '💭'], ['rest', '😴'], ['list', '📝']
  ].map(([w, emoji]) => {
    return { w, emoji };
  });
  const endSentences = [
    'I went to the shop.',
    'Send the list from the shop.',
    'I must rest.',
    'His hand is on your map.',
    'Come to the camp on the hill.',
    'This one is the best.',
    'I think the bank is shut.',
    'Get some milk and help with the rent.'
  ];

  // ---------- Level 9: Starting blends and endings (Book 6) + heart words ----------
  const startHearts = [
    { w: 'again' }, { w: 'could' }, { w: 'would' }, { w: 'should' }, { w: 'who' }
  ];
  const startPatterns = [
    { id: 'P-es',  label: '-es',  letters: 'es',  sound: 'iz',  clipName: 'patterns/es',    kw: 'boxes',  pos: 'end', emoji: '📦', intro: 'These letters are E S.', opts: 'es,s,ed' },
    { id: 'P-ed',  label: '-ed',  letters: 'ed',  sound: 'id',  clipName: 'patterns/ed-id', kw: 'handed', pos: 'end', emoji: '🤲',
      intro: 'E D at the end of a word can make three sounds.',
      introParts: [
        { text: 'E D at the end of a word can make three sounds.', pause: 150 },
        { clipName: 'letters/t', text: 't', rateMul: 0.8, pause: 350 },
        { text: 'or', pause: 150 },
        { clipName: 'letters/d', text: 'd', rateMul: 0.8, pause: 350 },
        { text: 'or', pause: 150 },
        { clipName: 'patterns/ed-id', text: 'id', rateMul: 0.8, pause: 700 }
      ],
      frame: 'In handed, it says',
      opts: 'ed,d,t' },
    { id: 'P-ing', label: '-ing', letters: 'ing', sound: 'ing', clipName: 'patterns/ing',   kw: 'fixing', pos: 'end', emoji: '🔧', intro: 'These letters are I N G.', opts: 'ing,ng,s' }
  ];
  const startBlendWords = [
    ['stop', '🛑'], ['plan', '📋'], ['trust', '🤝'], ['drop', '💧'], ['flag', '🚩'],
    ['slip', '🦶'], ['trip', '🧳'], ['grab', '✊'], ['truck', '🚚'], ['strap', '🎒']
  ].map(([w, emoji]) => {
    const imgs = { stop: 'stop' };
    return imgs[w] ? { w, emoji, img: imgs[w] } : { w, emoji };
  });
  const suffixWords = [
    ['shops', '🏪'], ['dishes', '🍽️'], ['boxes', '📦'], ['wished', '✨'],
    ['grabbed', '✊'], ['handed', '🤲'], ['missed', '🚌'], ['fixing', '🔧']
  ].map(([w, emoji]) => {
    const imgs = { boxes: 'box', missed: 'bus' };
    return imgs[w] ? { w, emoji, img: imgs[w] } : { w, emoji };
  });
  const startSentences = [
    'I should stop the truck.',
    'I could trust him.',
    'I would drop it in the box.',
    'The shops are shut.',
    'I wished I had cash.',
    'He handed us the list.',
    'Who missed the bus?',
    'He is fixing the van again.'
  ];

  // ---------- Level 10: real-life reading (was 6, then 8; old item ids kept) ----------
  const signs = [
    { t: 'STOP',     style: 'stop',    say: 'Stop',     mean: 'Stop. Do not go.' , img: 'stop' },
    { t: 'EXIT',     style: 'exit',    say: 'Exit',     mean: 'Exit. This is the way out.' , img: 'exit' },
    { t: 'OPEN',     style: 'open',    say: 'Open',     mean: 'Open. You can go in. The place is open.' , img: 'open' },
    { t: 'CLOSED',   style: 'closed',  say: 'Closed',   mean: 'Closed. The place is not open right now.' , img: 'closed' },
    { t: 'PUSH',     style: 'door',    say: 'Push',     mean: 'Push. Push the door away from you.' , img: 'push' },
    { t: 'PULL',     style: 'door',    say: 'Pull',     mean: 'Pull. Pull the door toward you.' , img: 'pull' },
    { t: 'RESTROOM', style: 'rest',    say: 'Restroom', mean: 'Restroom. This is the bathroom.' , img: 'restroom' },
    { t: 'DANGER',   style: 'danger',  say: 'Danger',   mean: 'Danger. Stay away. It is not safe.', img: 'danger' }
  ];
  const menu = [
    { t: 'Coffee',   price: '$2.00', emoji: '☕' , img: 'coffee' },
    { t: 'Eggs',     price: '$4.50', emoji: '🍳' , img: 'eggs' },
    { t: 'Burger',   price: '$7.99', emoji: '🍔' , img: 'burger' },
    { t: 'Fries',    price: '$3.00', emoji: '🍟' , img: 'fries' },
    { t: 'Chicken',  price: '$8.50', emoji: '🍗' , img: 'chicken' },
    { t: 'Soup',     price: '$4.00', emoji: '🍲' , img: 'soup' },
    { t: 'Salad',    price: '$6.00', emoji: '🥗' , img: 'salad' },
    { t: 'Water',    price: '$1.00', emoji: '💧' },
    { t: 'Pizza',    price: '$9.00', emoji: '🍕', img: 'pizza' }
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

  // ---------- Level 10: Silent e (Book 7) + heart words ----------
  const silentHearts = [
    { w: 'does' }, { w: 'done' }, { w: 'give' }, { w: 'live' }, { w: 'love' }
  ];
  const silentPatterns = [
    { id: 'P-a-e', label: 'a-e', letters: 'a-e', vowel: 'a', sound: 'long a', clipName: 'patterns/a-e', kw: 'cape', pair: 'cap', pos: 'vce', emoji: '🧥',
      intro: 'These letters are A and E, with a letter in the middle.',
      introParts: [
        { text: 'These letters are A and E, with a letter in the middle.', pause: 200 },
        { text: 'Together they make the sound', pause: 150 },
        { clipName: 'patterns/a-e', text: 'long a', rateMul: 0.8, pause: 350 },
        { clipName: 'patterns/a-e', text: 'long a', rateMul: 0.8, pause: 500 },
        { text: 'Listen to', pause: 150 },
        { text: 'cap', pause: 400 },
        { text: 'Now it is', pause: 150 },
        { text: 'cape', pause: 400 }
      ],
      frame: 'In cape, they say',
      opts: 'a-e,a,i-e' },
    { id: 'P-i-e', label: 'i-e', letters: 'i-e', vowel: 'i', sound: 'long i', clipName: 'patterns/i-e', kw: 'pine', pair: 'pin', pos: 'vce', emoji: '🌲',
      intro: 'These letters are I and E, with a letter in the middle.',
      introParts: [
        { text: 'These letters are I and E, with a letter in the middle.', pause: 200 },
        { text: 'Together they make the sound', pause: 150 },
        { clipName: 'patterns/i-e', text: 'long i', rateMul: 0.8, pause: 350 },
        { clipName: 'patterns/i-e', text: 'long i', rateMul: 0.8, pause: 500 },
        { text: 'Listen to', pause: 150 },
        { text: 'pin', pause: 400 },
        { text: 'Now it is', pause: 150 },
        { text: 'pine', pause: 400 }
      ],
      frame: 'In pine, they say',
      opts: 'i-e,i,a-e' },
    { id: 'P-o-e', label: 'o-e', letters: 'o-e', vowel: 'o', sound: 'long o', clipName: 'patterns/o-e', kw: 'hope', pair: 'hop', pos: 'vce', emoji: '🤞',
      intro: 'These letters are O and E, with a letter in the middle.',
      introParts: [
        { text: 'These letters are O and E, with a letter in the middle.', pause: 200 },
        { text: 'Together they make the sound', pause: 150 },
        { clipName: 'patterns/o-e', text: 'long o', rateMul: 0.8, pause: 350 },
        { clipName: 'patterns/o-e', text: 'long o', rateMul: 0.8, pause: 500 },
        { text: 'Listen to', pause: 150 },
        { text: 'hop', pause: 400 },
        { text: 'Now it is', pause: 150 },
        { text: 'hope', pause: 400 }
      ],
      frame: 'In hope, they say',
      opts: 'o-e,o,a-e' },
    { id: 'P-u-e', label: 'u-e', letters: 'u-e', vowel: 'u', sound: 'long u', clipName: 'patterns/u-e', kw: 'tube', pair: 'tub', pos: 'vce', emoji: '🧪',
      intro: 'These letters are U and E, with a letter in the middle.',
      introParts: [
        { text: 'These letters are U and E, with a letter in the middle.', pause: 200 },
        { text: 'Together they make the sound', pause: 150 },
        { clipName: 'patterns/u-e', text: 'long u', rateMul: 0.8, pause: 350 },
        { clipName: 'patterns/u-e', text: 'long u', rateMul: 0.8, pause: 500 },
        { text: 'Listen to', pause: 150 },
        { text: 'tub', pause: 400 },
        { text: 'Now it is', pause: 150 },
        { text: 'tube', pause: 400 }
      ],
      frame: 'In tube, they say',
      opts: 'u-e,u,o-e' },
    { id: 'P-e-e', label: 'e-e', letters: 'e-e', vowel: 'e', sound: 'long e', clipName: 'patterns/e-e', kw: 'these', pos: 'vce', emoji: '👉',
      intro: 'These letters are E and E, with a letter in the middle.',
      introParts: [
        { text: 'These letters are E and E, with a letter in the middle.', pause: 200 },
        { text: 'Together they make the sound', pause: 150 },
        { clipName: 'patterns/e-e', text: 'long e', rateMul: 0.8, pause: 350 },
        { clipName: 'patterns/e-e', text: 'long e', rateMul: 0.8, pause: 500 }
      ],
      frame: 'In these, they say',
      opts: 'e-e,e,i-e' }
  ];
  const silentWords = [
    ['name', '🏷️'], ['made', '🛠️'], ['late', '⏰'], ['take', '🫴'],
    ['time', '⏱️'], ['like', '👍'], ['ride', '🚴'], ['life', '🌱'],
    ['home', '🏡'], ['hope', '🤞'], ['note', '📝'], ['rule', '📏'],
    ['these', '👉']
  ].map(([w, emoji]) => ({ w, emoji }));
  const silentSentences = [
    'My name is Sam.',
    'He got home late.',
    'I like this job.',
    'Take time to rest.',
    'The note is at home.',
    'This is the rule.',
    'I hope you like it.',
    'Ride with us at this time.'
  ];

  const REAL_LIFE = 11;  // signs, menu, forms (was 6, then 8, then 10; shown number moved, item ids unchanged)
  const BIBLE = 12;      // was 7, then 9, then 11

  // ---------- Flatten into a single ordered list of items ----------
  const items = [];
  letters.forEach((x) => items.push({ id: 'L1-' + x.l, level: 1, kind: 'letter', label: x.l, ...x }));
  words.forEach((x) => items.push({ id: 'L2-' + x.w, level: 2, kind: 'word', label: x.w, text: x.w, ...x }));
  missing.forEach((x) => items.push({ id: 'L3m-' + x.w, level: 3, kind: 'missing', label: x.shown, text: x.w, ...x }));
  sight.forEach((x) => items.push({ id: 'L3-sw-' + slug(x.w), level: 4, kind: 'sight', label: x.w, text: x.w, ...x }));
  sentences.forEach((s, i) => items.push({ id: 'L3-s' + (i + 1), level: 4, kind: 'sentence', label: s, text: s }));
  everydayWords.forEach((x) => items.push({ id: 'L5-' + x.w, level: 5, kind: 'word', label: x.w, text: x.w, ...x }));
  everydaySentences.forEach((s, i) => items.push({ id: 'L5-s' + (i + 1), level: 5, kind: 'sentence', label: s, text: s }));
  // v21: Spellings then Sounds together, then Real Life / Bible. New ids are stable (no display number).
  spellHearts.forEach((x) => items.push({ id: 'SW-' + slug(x.w), level: 6, kind: 'sight', heart: true, label: x.w, text: x.w, ...x }));
  spellPatterns.forEach((x) => items.push({ level: 6, kind: 'pattern', ...x, opts: x.opts.split(',') }));
  spellWords.forEach((x) => items.push({ id: 'W-' + x.w, level: 6, kind: 'word', label: x.w, text: x.w, ...x }));
  spellSentences.forEach((s, i) => items.push({ id: 'S-sp-' + (i + 1), level: 6, kind: 'sentence', label: s, text: s }));
  digraphHearts.forEach((x) => items.push({ id: 'SW-' + slug(x.w), level: 7, kind: 'sight', heart: true, label: x.w, text: x.w, ...x }));
  digraphPatterns.forEach((x) => items.push({ level: 7, kind: 'pattern', ...x, opts: x.opts.split(',') }));
  digraphWords.forEach((x) => items.push({ id: 'W-' + x.w, level: 7, kind: 'word', label: x.w, text: x.w, ...x }));
  digraphSentences.forEach((s, i) => items.push({ id: 'S-dg-' + (i + 1), level: 7, kind: 'sentence', label: s, text: s }));
  // v22: Ending blends then Starting blends, then Real Life / Bible. New ids are stable (no display number).
  endHearts.forEach((x) => items.push({ id: 'SW-' + slug(x.w), level: 8, kind: 'sight', heart: true, label: x.w, text: x.w, ...x }));
  endWords.forEach((x) => items.push({ id: 'W-' + x.w, level: 8, kind: 'word', label: x.w, text: x.w, ...x }));
  endSentences.forEach((s, i) => items.push({ id: 'S-eb-' + (i + 1), level: 8, kind: 'sentence', label: s, text: s }));
  startHearts.forEach((x) => items.push({ id: 'SW-' + slug(x.w), level: 9, kind: 'sight', heart: true, label: x.w, text: x.w, ...x }));
  startPatterns.forEach((x) => items.push({ level: 9, kind: 'pattern', ...x, opts: x.opts.split(',') }));
  startBlendWords.forEach((x) => items.push({ id: 'W-' + x.w, level: 9, kind: 'word', label: x.w, text: x.w, ...x }));
  suffixWords.forEach((x) => items.push({ id: 'W-' + x.w, level: 9, kind: 'word', label: x.w, text: x.w, ...x }));
  startSentences.forEach((s, i) => items.push({ id: 'S-sb-' + (i + 1), level: 9, kind: 'sentence', label: s, text: s }));
  // v23: Silent e, then Real Life / Bible. New ids are stable (no display number).
  silentHearts.forEach((x) => items.push({ id: 'SW-' + slug(x.w), level: 10, kind: 'sight', heart: true, label: x.w, text: x.w, ...x }));
  silentPatterns.forEach((x) => items.push({ level: 10, kind: 'pattern', ...x, opts: x.opts.split(',') }));
  silentWords.forEach((x) => items.push({ id: 'W-' + x.w, level: 10, kind: 'word', label: x.w, text: x.w, ...x }));
  silentSentences.forEach((s, i) => items.push({ id: 'S-se-' + (i + 1), level: 10, kind: 'sentence', label: s, text: s }));
  signs.forEach((x) => items.push({ id: 'L4-sign-' + slug(x.t), level: REAL_LIFE, cat: 'signs', kind: 'sign', label: x.t, text: x.t, ...x }));
  menu.forEach((x) => items.push({ id: 'L4-menu-' + slug(x.t), level: REAL_LIFE, cat: 'menu', kind: 'menu', label: x.t, text: x.t, ...x }));
  forms.forEach((x) => items.push({ id: 'L4-form-' + slug(x.t), level: REAL_LIFE, cat: 'forms', kind: 'form', label: x.t, text: x.t, ...x }));
  // Bible verses: still last; old L4-kjv- ids kept so saved progress stays. Shown level is 12.
  verses.forEach((x) => items.push({ id: 'L4-kjv-' + slug(x.ref), level: BIBLE, kind: 'verse', label: x.ref, text: x.t, ...x }));

  // v23 order: 1-9 unchanged, 10 Silent e, 11 Real life, 12 Bible.
  // Old ids (L3-…, L4-…) are kept for saved progress; `level` is the shown level number.
  const levels = [
    { n: 1, icon: '🔤', name: 'Sounds',    say: 'Level 1. Letter sounds.', img: 'level-1' },
    { n: 2, icon: '🧩', name: 'Words',     say: 'Level 2. Words.', img: 'books' },
    { n: 3, icon: '🔡', name: 'Missing Letter',  say: 'Level 3. Missing letter.', img: 'key' },
    { n: 4, icon: '💬', name: 'Sentences', say: 'Level 4. Sentences.', img: 'writing' },
    { n: 5, icon: '🏠', name: 'Everyday',  say: 'Level 5. Everyday reading.', img: 'coffee' },
    { n: 6, icon: '✍️', name: 'Spellings', say: 'Level 6. Spellings.', img: 'box' },
    { n: 7, icon: '🔗', name: 'Sounds together', say: 'Level 7. Sounds together.', img: 'lamp' },
    { n: 8, icon: '📎', name: 'Ending blends', say: 'Level 8. Ending blends.', img: 'map' },
    { n: 9, icon: '🚚', name: 'Starting blends', say: 'Level 9. Starting blends.', img: 'stop' },
    { n: 10, icon: '🏡', name: 'Silent e', say: 'Level 10. Silent e.', img: 'house' },
    { n: 11, icon: '🏙️', name: 'Real Life', say: 'Level 11. Real life reading.', img: 'level-4' },
    { n: 12, icon: '📖', name: 'Bible',     say: 'Level 12. Bible verses. King James Version.', img: 'bible' }
  ];
  const cats = [
    { id: 'signs', icon: '🛑', name: 'Signs', say: 'Signs.', img: 'exit' },
    { id: 'menu',  icon: '🍔', name: 'Menu',  say: 'Menu.', img: 'menu' },
    { id: 'forms', icon: '📝', name: 'Forms', say: 'Forms.', img: 'forms' }
  ];

  // letter -> sound lookup used when tapping letters inside words
  const soundOf = {};
  letters.forEach((x) => { soundOf[x.l] = x.sound; });
  GRAPHMES.forEach((p) => { soundOf[p.g] = p.sound; });
  soundOf['th-voiced'] = 'dhh';

  // Homophones / common mis-hearings accepted by speech recognition
  const homophones = {
    sun: ['son'], no: ['know'], red: ['read'], i: ['eye', 'aye', 'hi'], to: ['two', 'too'],
    see: ['sea', 'c'], be: ['bee'], you: ['u', 'yu'], we: ['wee'], hen: ['hand'],
    pin: ['pen'], pen: ['pin'], ten: ['tin', '10'], cot: ['caught'],  // pin/pen and ten/tin sound alike in many US accents
    pan: ['pam'], nap: ['knap'], zip: ['zipp'], he: ['hee'],
    jet: ['jett'], sent: ['cent', 'scent'], dad: ['dat'], was: ['wuz'],
    the: ['da', 'duh'], my: ['mi', 'mai'], restroom: ['rest room'], 'date of birth': ['date a birth'],
    which: ['witch'], ring: ['wring'], there: ['their', "they're"], where: ['wear'],
    of: ['ov'], said: ['sed'], are: ['r'], they: ['thay'], do: ['dew', 'due'],
    have: ['hav'], what: ['wot'],
    from: ['frm'], your: ["you're", 'yore'], one: ['won', '1'], some: ['sum'],
    would: ['wood'], could: ['cud'], should: ['shud'], who: ['hoo'],
    does: ['duz'], done: ['dun'], give: ['giv'], live: ['liv'], love: ['luv'],
    made: ['maid'], these: ['theez']
  };

  return {
    letters, words, missing, everydayWords, everydaySentences,
    spellHearts, spellPatterns, spellWords, spellSentences,
    digraphHearts, digraphPatterns, digraphWords, digraphSentences,
    endHearts, endWords, endSentences,
    startHearts, startPatterns, startBlendWords, suffixWords, startSentences,
    silentHearts, silentPatterns, silentWords, silentSentences,
    REAL_LIFE, BIBLE, sight, sentences, signs, menu, forms, verses,
    items, levels, cats, soundOf, homophones, segments, GRAPHMES
  };
})();
