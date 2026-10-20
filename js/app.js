/* Read Aloud - phonics reading app. Plain vanilla JS, no dependencies. */
(function () {
  'use strict';
  const C = window.CONTENT;
  const S = window.Speech;
  const app = document.getElementById('app');

  // ---------------------------------------------------------------- storage
  const KEY = 'readAloud.v1';
  const DEFAULTS = { started: false, done: {}, settings: { rate: 0.85, voice: '', mic: true } };
  function load() {
    try {
      const s = JSON.parse(localStorage.getItem(KEY) || 'null') || {};
      return {
        started: !!s.started,
        done: s.done || {},
        settings: Object.assign({}, DEFAULTS.settings, s.settings || {})
      };
    } catch (e) {
      return JSON.parse(JSON.stringify(DEFAULTS));
    }
  }
  let state = load();
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch (e) { /* storage full / private mode */ } }
  // Migration: the Q lesson used to be 'qu' (id L1-qu). Progress is keyed by letter, so
  // the A-Z reorder needs nothing else.
  if (state.done['L1-qu']) {
    if (!state.done['L1-q']) state.done['L1-q'] = state.done['L1-qu'];
    delete state.done['L1-qu']; save();
  }
  // Voice setting: '' = natural voice (pre-generated clips, recommended),
  // '__phone' = phone's automatic voice, any other value = a specific phone voice.
  // One-time migration: everyone starts on the natural voice once clips exist.
  if (state.settings.voiceVersion !== 2) { state.settings.voice = ''; state.settings.voiceVersion = 2; save(); }
  function applyVoice() {
    const v = state.settings.voice || '';
    S.setUseClips(v === '');
    S.setVoice(v === '' || v === '__phone' ? '' : v);
  }
  S.setRate(state.settings.rate);
  applyVoice();

  // Optional recorded clips (see audio/README.md)
  S.loadClips('audio/clips.json');

  // ---------------------------------------------------------------- helpers
  const byId = {};
  C.items.forEach((it) => { byId[it.id] = it; });
  const shuffle = (a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const spoken = (it) => it.say || it.text || it.label;
  const cleanWord = (w) => w.replace(/[^A-Za-z']/g, '');

  function el(tag, props, ...kids) {
    const n = document.createElement(tag);
    if (props) {
      for (const k of Object.keys(props)) {
        const v = props[k];
        if (v == null || v === false) continue;
        if (k === 'class') n.className = v;
        else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
        else n.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const k of kids.flat()) if (k != null && k !== false) n.append(k.nodeType ? k : String(k));
    return n;
  }
  /** Big icon button. `say` is spoken on long-press so a non-reader can learn what it does. */
  function btn(icon, say, onclick, cls, text) {
    return el('button', { class: 'btn ' + (cls || ''), type: 'button', 'aria-label': say, 'data-say': say, onclick },
      el('span', { class: 'ico', 'aria-hidden': 'true' }, icon),
      text ? el('span', { class: 'txt' }, text) : null);
  }

  // Long-press any button to hear what it does (without triggering it).
  (function longPress() {
    let timer = null, target = null;
    document.addEventListener('pointerdown', (e) => {
      const b = e.target.closest('[data-say]');
      if (!b) return;
      target = b;
      timer = setTimeout(() => { b.dataset.lp = '1'; S.say(b.dataset.say); }, 600);
    });
    const clear = () => { clearTimeout(timer); timer = null; };
    document.addEventListener('pointerup', clear);
    document.addEventListener('pointercancel', clear);
    document.addEventListener('contextmenu', (e) => { if (e.target.closest('[data-say]')) e.preventDefault(); });
    document.addEventListener('click', (e) => {
      const b = e.target.closest('[data-say]');
      if (b && b.dataset.lp) { delete b.dataset.lp; e.preventDefault(); e.stopPropagation(); }
    }, true);
  })();

  // ---------------------------------------------------------------- feedback tones (WebAudio, generated)
  let actx = null;
  function tone(freqs, dur) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      let t = actx.currentTime;
      freqs.forEach((f) => {
        const o = actx.createOscillator(), g = actx.createGain();
        o.type = 'sine'; o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.25, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(actx.destination);
        o.start(t); o.stop(t + dur + 0.02);
        t += dur * 0.8;
      });
    } catch (e) { /* no audio */ }
  }
  const good = () => tone([660, 880], 0.18);
  const bad = () => tone([220], 0.25);
  const vibrate = (p) => { if (navigator.vibrate) try { navigator.vibrate(p); } catch (e) {} };

  // ---------------------------------------------------------------- layout
  let helpText = '';
  function setHelp(h) { helpText = h || ''; }
  function screen({ title, back, help, body, footer, dots }) {
    helpText = help || '';
    const top = el('header', { class: 'top' },
      back ? btn(back === '#/home' ? '🏠' : '◀', back === '#/home' ? 'Home' : 'Go back', () => go(back), 'icon-btn') : el('span', { class: 'spacer' }),
      el('div', { class: 'title' }, dots || title || ''),
      btn('🔊', 'Hear help', () => S.say(helpText), 'icon-btn help-btn'));
    const main = el('main', { class: 'main' }, body);
    const foot = el('footer', { class: 'foot' }, footer || null);
    app.replaceChildren(top, main, foot);
    main.scrollTop = 0;
    return { top, main, foot };
  }
  // Navigate synchronously (pushState + route) so speech starts inside the tap's user gesture.
  // iOS Safari only allows speechSynthesis after a gesture, and hashchange fires too late.
  function go(hash) {
    if (location.hash !== hash) history.pushState(null, '', hash);
    route();
  }

  // ---------------------------------------------------------------- progress
  const isDone = (it) => !!state.done[it.id];
  function levelItems(n, cat) { return C.items.filter((it) => it.level === n && (!cat || it.cat === cat)); }
  function pct(list) { return list.length ? Math.round((100 * list.filter(isDone).length) / list.length) : 0; }
  function firstUndone(list) { return list.find((it) => !isDone(it)) || null; }
  function bar(list) {
    const p = pct(list);
    const fill = el('div', { class: 'fill' });
    fill.style.width = p + '%'; // CSSOM (allowed by the CSP), not an inline style attribute
    return el('div', { class: 'bar', role: 'progressbar', 'aria-valuenow': p, 'aria-valuemin': 0, 'aria-valuemax': 100 }, fill);
  }
  function backFor(it) { return it.level === 4 ? '#/level/4/' + it.cat : '#/level/' + it.level; }

  // ---------------------------------------------------------------- views
  function viewWelcome() {
    screen({
      help: 'Welcome. Tap the big button to start.',
      body: el('div', { class: 'center welcome' },
        el('div', { class: 'logo', 'aria-hidden': 'true' }, 'Aa'),
        el('h1', null, 'Read Aloud'),
        btn('▶', 'Start', () => {
          state.started = true; save();
          introPending = true;
          go('#/home');
        }, 'primary huge'),
        el('p', { class: 'hint' }, '🔊 Turn your sound on')
      )
    });
  }
  let introPending = false;
  function sayIntro() {
    S.say([
            { text: 'Welcome. This app will help you learn to read, one sound at a time.', pause: 250 },
            { text: 'Any time you need help, tap the speaker at the top.', pause: 250 },
            { text: 'Hold your finger on any button to hear what it does.', pause: 250 },
            'Tap the big play button to begin.'
          ]);
  }

  function viewHome() {
    const next = firstUndone(C.items);
    const tiles = C.levels.map((lv) => {
      const list = levelItems(lv.n);
      const done = pct(list) === 100;
      return el('button', {
        class: 'tile' + (done ? ' done' : ''), type: 'button', 'data-say': lv.say, 'aria-label': lv.say,
        onclick: () => go('#/level/' + lv.n)
      },
        el('span', { class: 'tile-ico', 'aria-hidden': 'true' }, lv.icon),
        el('span', { class: 'tile-num' }, String(lv.n)),
        el('span', { class: 'tile-name' }, lv.name),
        bar(list),
        done ? el('span', { class: 'check' }, '✓') : null);
    });
    const footer = [
      btn('⚙️', 'Settings', () => go('#/settings'), 'icon-btn'),
      next ? btn('▶', 'Keep going', () => go('#/lesson/' + next.id), 'primary grow', next.level === 4 ? '' : next.label) : null,
      deferredInstall ? btn('📲', 'Add to home screen', installApp, 'icon-btn') : null
    ];
    screen({
      title: 'Read Aloud',
      help: next
        ? 'Tap the big play button at the bottom to keep going. Or pick a level. Level 1 is letter sounds. Level 2 is words. Level 3 is sentences. Level 4 is real life reading.'
        : 'You finished everything. Great work. Pick any level to practice again.',
      body: el('div', { class: 'grid2' }, tiles),
      footer
    });
    if (introPending) { introPending = false; sayIntro(); return; }
    S.say(next ? 'Tap play to keep going. Or pick a level.' : 'You finished everything. Great work.');
  }

  function itemTile(it) {
    const label = it.kind === 'verse' ? it.ref : it.label;
    const cls = 'item' + (isDone(it) ? ' done' : '') + (it.kind === 'sentence' || it.kind === 'verse' ? ' wide' : '') + (it.kind === 'letter' ? ' letter' : '');
    return el('button', { class: cls, type: 'button', 'data-say': spoken(it), 'aria-label': spoken(it), onclick: () => go('#/lesson/' + it.id) },
      el('span', null, label), isDone(it) ? el('span', { class: 'check' }, '✓') : null);
  }

  function viewLevel(n) {
    const lv = C.levels.find((l) => l.n === n);
    if (!lv) return go('#/home');
    if (n === 4) {
      const tiles = C.cats.map((c) => {
        const list = levelItems(4, c.id);
        return el('button', { class: 'tile' + (pct(list) === 100 ? ' done' : ''), type: 'button', 'data-say': c.say, 'aria-label': c.say, onclick: () => go('#/level/4/' + c.id) },
          el('span', { class: 'tile-ico', 'aria-hidden': 'true' }, c.icon),
          el('span', { class: 'tile-name' }, c.name),
          bar(list));
      });
      screen({ title: lv.icon + ' ' + lv.name, back: '#/home',
        help: 'Real life reading. Pick one: signs, menu, forms, or Bible verses.',
        body: el('div', { class: 'grid2' }, tiles) });
      S.say('Real life reading. Pick one: signs, menu, forms, or Bible verses.');
      return;
    }
    const list = levelItems(n);
    const next = firstUndone(list) || list[0];
    const help = {
      1: 'Letter sounds. Every letter makes a sound. Tap play to start, or tap a letter.',
      2: 'Words. Put the sounds together to read a word. Tap play to start.',
      3: 'Sentences. First some tricky words, then short sentences. Tap play to start.'
    }[n];
    screen({ title: lv.icon + ' ' + lv.name, back: '#/home', help,
      body: el('div', { class: 'items' }, list.map(itemTile)),
      footer: btn('▶', 'Start', () => go('#/lesson/' + next.id), 'primary grow') });
    S.say(help);
  }

  function viewCat(catId) {
    const cat = C.cats.find((c) => c.id === catId);
    if (!cat) return go('#/level/4');
    const list = levelItems(4, catId);
    const next = firstUndone(list) || list[0];
    const help = {
      signs: 'Signs you see every day. Tap play to start.',
      menu: 'Reading a menu. Tap play to start.',
      forms: 'Words on forms, like at a doctor or a job. Tap play to start.',
      bible: 'Short Bible verses, from the King James Version. Tap play to start.'
    }[catId];
    screen({ title: cat.icon + ' ' + cat.name, back: '#/level/4', help,
      body: el('div', { class: 'items' }, list.map(itemTile)),
      footer: btn('▶', 'Start', () => go('#/lesson/' + next.id), 'primary grow') });
    S.say(help);
  }

  // ---------------------------------------------------------------- rendering of real-life things
  function renderSign(it, small) {
    const kids = [];
    if (!small && it.style === 'rest') kids.push(el('span', { class: 'sign-ico', 'aria-hidden': 'true' }, '🚻'));
    if (!small && it.style === 'danger') kids.push(el('span', { class: 'sign-ico', 'aria-hidden': 'true' }, '⚠️'));
    kids.push(el('span', { class: 'sign-text' }, it.t));
    return el('div', { class: 'sign sign-' + it.style + (small ? ' small' : '') }, kids);
  }
  function renderMenu(it, small) {
    return el('div', { class: 'menu-card' + (small ? ' small' : '') },
      small ? null : el('div', { class: 'menu-head' }, '— MENU —'),
      el('div', { class: 'menu-line' },
        el('span', { class: 'menu-item' }, it.t),
        el('span', { class: 'menu-dots', 'aria-hidden': 'true' }),
        small ? null : el('span', { class: 'menu-price' }, it.price)));
  }
  function renderForm(it, small) {
    return el('div', { class: 'form-field' + (small ? ' small' : '') },
      el('span', { class: 'form-label' }, it.t + ':'),
      el('span', { class: 'form-line' }, it.t === 'Signature' && !small ? '✗' : ''));
  }
  function renderThing(it, small) {
    if (it.kind === 'sign') return renderSign(it, small);
    if (it.kind === 'menu') return renderMenu(it, small);
    if (it.kind === 'form') return renderForm(it, small);
    return el('div', { class: small ? 'word-opt' : 'big-word' }, it.text);
  }
  function sayThing(it) {
    if (it.kind === 'menu') return S.say([{ text: it.t, pause: 250 }, it.price]);
    return S.say(spoken(it));
  }

  /** Sentence as tappable word chips. Returns {node, chips, words} */
  function chipsFor(text, sayText) {
    const shown = text.split(/\s+/);
    const said = (sayText || text).split(/\s+/);
    const chips = shown.map((w, i) => el('button', {
      class: 'chip', type: 'button', 'data-say': cleanWord(said[i] || w),
      onclick: (e) => { flash(e.currentTarget); S.say(cleanWord(said[i] || w)); }
    }, w));
    return { node: el('div', { class: 'sentence' }, chips), chips, words: said.map(cleanWord) };
  }
  function flash(n) { n.classList.remove('hl'); void n.offsetWidth; n.classList.add('hl'); setTimeout(() => n.classList.remove('hl'), 700); }
  function highlight(list, i) { list.forEach((c, k) => c.classList.toggle('on', k === i)); }
  function readWordByWord(chips, words) {
    return S.say(words.map((w, i) => ({ text: w, pause: 180, onstart: () => highlight(chips, i) }))
      .concat([{ text: '', onstart: () => highlight(chips, -1) }]));
  }

  // ---------------------------------------------------------------- lessons
  let lesson = null;

  function stepsFor(it) {
    switch (it.kind) {
      case 'letter': return [stepLearnLetter, stepFindLetter];
      case 'word': return [stepLearnWord, stepSayIt, stepFind];
      case 'sight': return [stepLearnSight, stepSayIt, stepFind];
      case 'sentence': return [stepReadSentence, stepSayIt];
      case 'verse': return [stepReadSentence, stepSayIt];
      default: return [stepLearnReal, stepSayIt, stepFind]; // sign, menu, form
    }
  }

  function viewLesson(id) {
    const it = byId[id];
    if (!it) return go('#/home');
    lesson = { it, steps: stepsFor(it), i: 0 };
    renderStep();
  }
  function renderStep() {
    const { it, steps, i } = lesson;
    if (i >= steps.length) return renderDone();
    steps[i](it);
  }
  function nextStep() { sayToken++; try { S.cancelListen(); } catch (e) {} lesson.i++; renderStep(); }
  function dots() {
    const { steps, i } = lesson;
    return el('div', { class: 'dots', 'aria-label': 'Step ' + (i + 1) + ' of ' + steps.length },
      steps.map((_, k) => el('span', { class: 'dot' + (k < i ? ' past' : k === i ? ' now' : '') })));
  }
  function lessonScreen(opts) {
    return screen(Object.assign({ back: backFor(lesson.it), dots: dots() }, opts));
  }
  const nextBtn = (cls) => btn('▶', 'Next', nextStep, 'primary grow ' + (cls || ''));

  // ---- Level 1
  function letterParts(it) {
    return [
      { text: it.kw, pause: 350 },
      { text: it.sound, rateMul: 0.8, pause: 350 },
      { text: it.sound, rateMul: 0.8, pause: 350 },
      it.kw
    ];
  }
  async function playLetter(it) {
    const clip = 'letters/' + it.l;
    if (!S.hasClip(clip)) return S.say(letterParts(it));
    // recorded sound sandwiched between the keyword: "sun ... (sss) ... sun"
    if (!(await S.say({ text: it.kw, pause: 300 }))) return;
    await S.clipOrSay(clip, it.sound);
    S.say(it.kw, { queue: true });
  }

  function stepLearnLetter(it) {
    const kw = it.pos === 'end'
      ? [it.kw.slice(0, -it.l.length), el('b', null, it.kw.slice(-it.l.length))]
      : [el('b', null, it.kw.slice(0, it.l.length)), it.kw.slice(it.l.length)];
    const big = el('button', { class: 'big-letter', type: 'button', 'data-say': 'Hear the sound', onclick: () => playLetter(it) },
      el('span', null, it.l.charAt(0).toUpperCase() + it.l.slice(1)), el('span', { class: 'lower' }, it.l));
    const help = it.pos === 'end'
      ? 'This letter makes the sound at the end of ' + it.kw + '. Tap the letter to hear it again. Then tap play.'
      : 'This letter makes the first sound in ' + it.kw + '. Tap the letter to hear it again. Then tap play.';
    lessonScreen({
      help,
      body: el('div', { class: 'center' }, big,
        el('div', { class: 'keyword' }, el('span', { class: 'emoji', 'aria-hidden': 'true' }, it.emoji), el('span', null, kw))),
      footer: [btn('🔊', 'Hear the sound', () => playLetter(it), 'icon-btn'), nextBtn()]
    });
    // Name first, then the sound (the real letter-sound clip, twice), then the usual intro:
    // "This is the letter E. It makes the sound … eh … eh. This letter makes the first sound in egg …"
    S.say([
      { text: it.intro, tts: it.introTts, pause: 250 },
      { text: 'It makes the sound', pause: 150 },
      { clipName: 'letters/' + it.l, text: it.sound, rateMul: 0.8, pause: 350 },
      { clipName: 'letters/' + it.l, text: it.sound, rateMul: 0.8, pause: 700 },
      { text: it.pos === 'end' ? 'This letter makes the sound at the end of' : 'This letter makes the first sound in', pause: 150 }
    ]).then((ok) => { if (ok) playLetter(it); });
  }

  function stepFindLetter(it) {
    // Wrong choices: letters that come before this one (A-Z), or the first letters for A/B.
    // Never a letter that also makes this word's first sound (c/k, and c/k for Q's /kw/).
    const CONFUSE = { c: ['k', 'q'], k: ['c', 'q'], q: ['c', 'k'] };
    const sameSound = (x) => x.l === it.l || x.sound === it.sound || (CONFUSE[it.l] || []).includes(x.l);
    const idx = C.letters.findIndex((x) => x.l === it.l);
    const learned = C.letters.slice(0, Math.max(idx, 3)).filter((x) => !sameSound(x));
    const others = (learned.length >= 2 ? learned : C.letters.filter((x) => !sameSound(x)));
    const opts = shuffle([it].concat(shuffle(others).slice(0, 2)));
    const prompt = it.pos === 'end' ? 'Which letter is at the end of ' + it.kw + '?' : 'Which letter starts the word ' + it.kw + '?';
    const ask = () => S.say([{ text: prompt, pause: 200 }, { text: it.kw, rateMul: 0.8 }]);
    const choices = opts.map((x) => el('button', { class: 'choice letter-choice', type: 'button', 'aria-label': x.l, onclick: (e) => pick(e.currentTarget, x === it, ask) }, x.l));
    lessonScreen({
      help: prompt,
      body: el('div', { class: 'center' },
        btn(it.emoji, 'Hear it again', ask, 'prompt-btn'),
        el('div', { class: 'choices' }, choices)),
      footer: btn('🔊', 'Hear it again', ask, 'icon-btn')
    });
    ask();
  }

  /** Shared multiple-choice handler */
  let picking = false;
  async function pick(node, right, ask) {
    if (picking) return;
    if (right) {
      picking = true;
      node.classList.add('right'); good(); vibrate(30);
      await S.say('Yes!');
      await sleep(350);
      picking = false;
      nextStep();
    } else {
      node.classList.add('wrong'); bad(); vibrate([40, 40, 40]);
      setTimeout(() => node.classList.remove('wrong'), 600);
      await S.say({ text: 'Not that one. Try again.', pause: 200 });
      ask();
    }
  }

  // ---- Level 2
  function stepLearnWord(it) {
    const letters = it.w.split('');
    const tiles = letters.map((ch) => el('button', {
      class: 'tile-letter', type: 'button', 'data-say': 'Hear this sound',
      onclick: (e) => { flash(e.currentTarget); S.clipOrSay('letters/' + ch, { text: C.soundOf[ch] || ch, rateMul: 0.8 }); }
    }, ch));
    const blend = () => S.say(
      letters.map((ch, i) => ({ text: C.soundOf[ch] || ch, rateMul: 0.8, pause: 250, onstart: () => highlight(tiles, i) }))
        .concat([
          { text: it.w, rateMul: 0.55, pause: 300, onstart: () => tiles.forEach((t) => t.classList.add('on')) },
          { text: it.w, onstart: () => {} },
          { text: '', onstart: () => highlight(tiles, -1) }
        ]));
    lessonScreen({
      help: 'Tap each letter to hear its sound. Then tap the puzzle button to put the sounds together. Then tap play.',
      body: el('div', { class: 'center' }, el('div', { class: 'tiles' }, tiles),
        btn('🧩', 'Sound it out', blend, 'secondary', '')),
      footer: [btn('🧩', 'Sound it out', blend, 'icon-btn'), nextBtn()]
    });
    S.say('Tap each letter to hear its sound. Then tap the puzzle to put them together.');
  }

  function stepLearnSight(it) {
    const hear = () => S.say(spoken(it));
    lessonScreen({
      help: 'This is a tricky word. It does not sound out the normal way. Just remember it. It says: ' + spoken(it) + '. Then tap play.',
      body: el('div', { class: 'center' },
        el('div', { class: 'badge' }, '⭐'),
        el('button', { class: 'big-word', type: 'button', 'data-say': 'Hear the word', onclick: hear }, it.text)),
      footer: [btn('🔊', 'Hear the word', hear, 'icon-btn'), nextBtn()]
    });
    S.say([{ text: 'This is a tricky word. Just remember it. It says:', pause: 250 }, { text: spoken(it), pause: 300 }, spoken(it)]);
  }

  // ---- Level 3 / verses
  function stepReadSentence(it) {
    const c = chipsFor(it.text, it.say);
    const whole = () => S.say(it.kind === 'verse' ? [{ text: spoken(it), pause: 300 }, it.refSay] : spoken(it));
    const slow = () => readWordByWord(c.chips, c.words);
    const isVerse = it.kind === 'verse';
    lessonScreen({
      help: 'Tap any word to hear it. Tap the turtle to hear it slowly, one word at a time. Tap the speaker to hear it all. Then tap play.',
      body: el('div', { class: 'center' },
        isVerse ? el('div', { class: 'badge' }, '📖') : null,
        c.node,
        isVerse ? el('div', { class: 'ref' }, it.ref, el('small', null, ' KJV')) : null),
      footer: [btn('🐢', 'Slow, one word at a time', slow, 'icon-btn'), btn('🔊', 'Hear it all', whole, 'icon-btn'), nextBtn()]
    });
    S.say('Tap any word to hear it. Tap the turtle to hear it slowly.');
  }

  // ---- Level 4
  function stepLearnReal(it) {
    const meaning = it.kind === 'menu'
      ? [{ text: it.t, pause: 300 }, it.price]
      : it.kind === 'sign'
        ? [{ text: 'This sign says:', pause: 150 }, { text: it.say, pause: 400 }, it.mean]
        : [{ text: 'This says:', pause: 150 }, { text: it.t, pause: 400 }, it.mean];
    const hear = () => S.say(meaning);
    const thing = el('button', { class: 'thing', type: 'button', 'data-say': 'Hear it', onclick: hear }, renderThing(it));
    lessonScreen({
      help: 'Tap it to hear what it says. Then tap play.',
      body: el('div', { class: 'center' }, thing, it.kind === 'menu' ? el('div', { class: 'emoji big' }, it.emoji) : null),
      footer: [btn('🔊', 'Hear it', hear, 'icon-btn'), nextBtn()]
    });
    hear();
  }

  // ---- Say it (speech recognition or self-check)
  // The UI must never get stuck waiting on the recognizer: Speech.listen() always resolves
  // (start watchdog + max-listen cap) and the 🎤 turns into a ⏹ stop button while listening.
  // 🎤 and 👍 are always both on screen (mic -> read aloud -> thumbs up). On an iPhone
  // home-screen app (iOS standalone), where recognition is unreliable, the mic uses a
  // shorter watchdog and is dropped if the recognizer never starts; 👍 always works.
  let micBlocked = false;       // mic permanently unusable this session (denied / broken)
  let micAttempts = 0;          // listen attempts this session (first one may hit the permission prompt)
  let sayToken = 0;             // changes whenever a say-step is left, so stale results are ignored
  const HARD_FAIL = ['not-allowed', 'service-not-allowed', 'unsupported', 'audio-capture', 'language-not-supported'];
  function stepSayIt(it) {
    const my = ++sayToken;
    const alive = () => my === sayToken && lesson && lesson.it === it;
    const target = spoken(it);
    const iosPwa = !!S.isIOSStandalone;
    const micOn = state.settings.mic && S.canListen() && !micBlocked;
    // Owner's flow on every say-it step: 🎤 mic, read it out loud, then 👍 thumbs up.
    // Both buttons are always visible and the same size, in that order (also on iPhone).
    let fails = 0;
    let busy = false;

    let display;
    if (it.kind === 'sentence' || it.kind === 'verse') display = chipsFor(it.text, it.say).node;
    else if (it.kind === 'sign' || it.kind === 'menu' || it.kind === 'form') display = renderThing(it);
    else display = el('div', { class: 'big-word' }, it.text);

    const status = el('div', { class: 'status', 'aria-live': 'polite' });
    const reveal = el('div', { class: 'emoji big reveal' });
    const hear = () => { if (busy) cancel(); S.say(it.kind === 'menu' ? it.t : target); };
    const micBtn = btn('🎤', 'Tap the mic, then read it out loud', () => (busy ? cancel() : listen()), 'mic grow');
    const okBtn = btn('👍', 'Thumbs up: I read it', () => { if (busy) cancel(); success(null); }, 'ok-btn grow');
    const what = it.kind === 'sentence' ? 'sentence' : it.kind === 'verse' ? 'verse' : 'it';
    const SAY = {
      mic: { it: 'Tap the mic, then read it out loud. When you’re done, tap the thumbs up.',
        sentence: 'Tap the mic, then read the sentence out loud. When you’re done, tap the thumbs up.',
        verse: 'Tap the mic, then read the verse out loud. When you’re done, tap the thumbs up.' },
      noMic: { it: 'Read it out loud. When you’re done, tap the thumbs up.',
        sentence: 'Read the sentence out loud. When you’re done, tap the thumbs up.',
        verse: 'Read the verse out loud. When you’re done, tap the thumbs up.' }
    };
    const HELP_EXTRA = 'If you need help, tap the speaker.';
    const hearBtn = btn('🔊', 'Hear it', hear, 'icon-btn');

    const instr = (micOn ? SAY.mic : SAY.noMic)[what];
    const ui = lessonScreen({
      help: [instr, HELP_EXTRA],
      body: el('div', { class: 'center' }, el('div', { class: 'say-target' }, display), reveal, status),
      footer: micOn ? [hearBtn, micBtn, okBtn] : [hearBtn, okBtn]
    });
    S.say(instr);

    function showOk() {
      if (!ui.foot.contains(okBtn)) ui.foot.append(okBtn);
    }
    function setListening(on) {
      busy = on;
      micBtn.classList.toggle('listening', on);
      micBtn.setAttribute('aria-label', on ? 'Stop' : 'Tap the mic, then read it out loud');
      micBtn.dataset.say = on ? 'Stop' : 'Tap the mic, then read it out loud';
      const ico = micBtn.querySelector('.ico');
      if (ico) ico.textContent = on ? '⏹' : '🎤';
    }
    function cancel() {
      try { S.cancelListen(); } catch (e) {}
      setListening(false);
    }
    function dropMic(msg) {
      micBlocked = true;
      setHelp([SAY.noMic[what], HELP_EXTRA]);
      micBtn.remove(); okBtn.classList.add('grow'); showOk();
      status.textContent = '🎤 ✗';
      status.className = 'status no';
      if (msg) S.say(msg);
    }
    async function attempt(first) {
      const startTimeout = first ? 4000 : iosPwa ? 2500 : 3000; // first try may sit behind the permission prompt
      return S.listen({
        timeout: it.kind === 'verse' ? 12000 : it.kind === 'sentence' ? 9000 : 7000,
        startTimeout,
        onstart: () => { if (alive()) status.textContent = '👂'; }
      });
    }
    async function listen() {
      if (busy || !alive()) return;
      setListening(true);
      status.textContent = '…';
      status.className = 'status';
      let res;
      try {
        const first = micAttempts === 0;
        micAttempts++;
        const t0 = Date.now();
        res = await attempt(first);
        const quick = Date.now() - t0 < 1500; // died almost at once (typical right after the permission grant)
        // The very first attempt often dies because the permission prompt was on screen.
        // Now that permission is (probably) granted, retry once automatically.
        if (alive() && busy && first && !res.ok && (!res.started || quick) &&
            ['start-timeout', 'ended-early', 'start-failed', 'aborted', 'cancelled', 'no-speech', 'network', 'error'].includes(res.error)) {
          status.textContent = '…';
          res = await attempt(false);
        }
      } catch (e) {
        res = { ok: false, error: 'error', started: false };
      } finally {
        if (alive()) setListening(false);
      }
      if (!alive()) return;              // user left the screen meanwhile
      if (res.error === 'cancelled') return; // user tapped stop / 👍 / speaker
      try {
        if (res.ok && S.matches(target, res.alts, C.homophones)) { success(res.alts[0]); return; }
        if (!res.ok && HARD_FAIL.includes(res.error)) {
          dropMic('The mic is not working here. Read it out loud. When you’re done, tap the thumbs up.');
          return;
        }
        // Recognizer never started (watchdog) on an iPhone home-screen app: it won't get better.
        if (!res.ok && !res.started && iosPwa) {
          dropMic(SAY.noMic[what]);
          return;
        }
        fails++;
        bad();
        showOk(); // 👍 after any failure
        if (fails >= 3 && !res.started) { dropMic(); }
        if (res.ok) {
          status.textContent = '“' + res.alts[0] + '”';
          status.className = 'status no';
          if (!(await S.say({ text: 'Not quite. Listen.', pause: 200 })) || !alive()) return;
          if (!(await S.say({ text: target, rateMul: 0.8, pause: 300 }, { queue: true })) || !alive()) return;
          S.say('Try again. Or tap the thumbs up if you said it.', { queue: true });
        } else {
          status.textContent = '🔇';
          status.className = 'status no';
          S.say('I did not hear you. Try again, or tap the thumbs up if you said it.');
        }
      } catch (e) {
        setListening(false); showOk();
      }
    }
    async function success(heard) {
      if (!alive()) return;
      try { S.cancelListen(); } catch (e) {}
      busy = false;
      good(); vibrate(30);
      status.textContent = heard ? '✓ “' + heard + '”' : '✓';
      status.className = 'status yes';
      if (it.emoji && it.kind !== 'letter') reveal.textContent = it.emoji;
      ui.foot.replaceChildren(hearBtn, nextBtn('pulse'));
      await S.say({ text: heard ? 'Yes! You read it.' : 'Great.', pause: 250 });
      if (alive() && (it.kind === 'word' || it.kind === 'sight')) S.say(target, { queue: true });
    }
  }

  // ---- Find (multiple choice)
  function poolFor(it) {
    if (it.kind === 'word') return levelItems(2);
    if (it.kind === 'sight') return C.items.filter((x) => x.kind === 'sight');
    return levelItems(4, it.cat);
  }
  function stepFind(it) {
    const pool = poolFor(it).filter((x) => x.id !== it.id && x.text.toLowerCase() !== it.text.toLowerCase());
    const sameLen = pool.filter((x) => x.text.length === it.text.length);
    const others = shuffle(sameLen.length >= 2 ? sameLen : pool).slice(0, 2);
    const opts = shuffle([it].concat(others));
    const name = it.kind === 'menu' ? it.t : spoken(it);
    const prompt = it.kind === 'sign' ? 'Find the sign that says:' : it.kind === 'form' ? 'Find the line that says:' : 'Find the word:';
    const ask = () => S.say([{ text: prompt, pause: 200 }, { text: name, rateMul: 0.85 }]);
    const choices = opts.map((x) => el('button', { class: 'choice', type: 'button', 'aria-label': 'Choice', onclick: (e) => pick(e.currentTarget, x === it, ask) }, renderThing(x, true)));
    lessonScreen({
      help: prompt + ' ' + name,
      body: el('div', { class: 'center' }, btn('🔊', 'Hear it again', ask, 'prompt-btn'), el('div', { class: 'choices col' }, choices)),
      footer: btn('🔊', 'Hear it again', ask, 'icon-btn')
    });
    ask();
  }

  // ---- Done
  function nextItemAfter(it) {
    const i = C.items.indexOf(it);
    const sameGroup = C.items.slice(i + 1).find((x) => x.level === it.level && x.cat === it.cat);
    return sameGroup || firstUndone(C.items);
  }
  function renderDone() {
    const it = lesson.it;
    const wasDone = isDone(it);
    state.done[it.id] = Date.now();
    save();
    const group = levelItems(it.level, it.level === 4 ? it.cat : null);
    const groupDone = !wasDone && pct(group) === 100;
    const nxt = nextItemAfter(it);
    screen({
      back: backFor(it),
      help: 'Great job. Tap play for the next one. Tap the circle arrow to do this one again.',
      body: el('div', { class: 'center' },
        el('div', { class: 'done-mark' }, groupDone ? '🏆' : '✓'),
        el('div', { class: 'done-label' }, it.kind === 'verse' ? it.ref : it.label)),
      footer: [
        btn('🔁', 'Do it again', () => viewLesson(it.id), 'icon-btn'),
        nxt ? btn('▶', 'Next', () => go('#/lesson/' + nxt.id), 'primary grow') : btn('🏠', 'Home', () => go('#/home'), 'primary grow')
      ]
    });
    good();
    S.say(groupDone ? 'Amazing. You finished this whole part. Tap play for the next one.' : 'Great job. Tap play for the next one.');
  }

  // ---------------------------------------------------------------- settings
  function viewSettings() {
    const speeds = [[0.65, '🐢', 'Slow'], [0.85, '🚶', 'Normal'], [1.0, '🏃', 'Fast']];
    const speedRow = el('div', { class: 'seg' }, speeds.map(([r, ico, name]) => {
      const b = btn(ico, name + ' speech', () => {
        state.settings.rate = r; save(); S.setRate(r);
        speedRow.querySelectorAll('.btn').forEach((x) => x.classList.remove('sel')); b.classList.add('sel');
        S.say('This is how fast I talk.');
      }, r === state.settings.rate ? 'sel' : '', name);
      return b;
    }));

    const voiceSel = el('select', { class: 'select', 'aria-label': 'Voice', onchange: (e) => {
      state.settings.voice = e.target.value; save(); applyVoice(); S.say('Hello. This is my voice.');
    } });
    function fillVoices() {
      const cur = state.settings.voice || '';
      const vs = S.englishVoices();
      voiceSel.replaceChildren(
        el('option', { value: '', selected: cur === '' }, 'Natural voice (recommended)'),
        el('option', { value: '__phone', selected: cur === '__phone' }, 'Phone voice: automatic'),
        ...vs.map((v) => el('option', { value: v.name, selected: v.name === cur }, 'Phone voice: ' + v.name + ' (' + v.lang + ')')));
    }
    fillVoices();
    if (window.speechSynthesis && 'onvoiceschanged' in speechSynthesis) speechSynthesis.addEventListener('voiceschanged', fillVoices, { once: true });

    const micRow = S.canListen()
      ? (function () {
        const b = btn(state.settings.mic ? '🎤' : '🚫', 'Microphone on or off', () => {
          state.settings.mic = !state.settings.mic; save(); micBlocked = false;
          b.querySelector('.ico').textContent = state.settings.mic ? '🎤' : '🚫';
          b.querySelector('.txt').textContent = state.settings.mic ? 'On' : 'Off';
          S.say(state.settings.mic ? 'Microphone on.' : 'Microphone off. You will tap thumbs up instead.');
        }, '', state.settings.mic ? 'On' : 'Off');
        return b;
      })()
      : el('p', { class: 'note' }, 'Speech recognition is not available in this browser. The app uses a 👍 button instead.');

    let armed = false;
    const reset = btn('🗑️', 'Erase all progress', () => {
      if (!armed) { armed = true; reset.classList.add('danger'); reset.querySelector('.txt').textContent = 'Tap again to erase'; S.say('Tap again to erase all progress.'); return; }
      state.done = {}; save(); S.say('Progress erased.'); go('#/home');
    }, '', 'Erase progress');

    const done = Object.keys(state.done).length;
    screen({
      title: '⚙️', back: '#/home',
      help: 'Settings. Change how fast the voice talks, pick a voice, or turn the microphone on or off.',
      body: el('div', { class: 'settings' },
        el('h2', null, '🔊 Speed'), speedRow,
        el('h2', null, '🗣️ Voice'), voiceSel,
        el('h2', null, '🎤 Microphone'), micRow,
        el('h2', null, '📈 Progress'), el('p', { class: 'note' }, done + ' / ' + C.items.length + ' done. Saved only on this phone.'), reset,
        el('h2', null, '📲 Install'),
        el('p', { class: 'note' }, 'iPhone: Safari → Share → Add to Home Screen. Android: Chrome menu ⋮ → Install app / Add to Home screen.'),
        el('p', { class: 'note small' }, 'Bible verses: King James Version (public domain). No accounts, no tracking. Works offline after first visit.'))
    });
  }

  // ---------------------------------------------------------------- install prompt (Android/Chrome)
  let deferredInstall = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); deferredInstall = e;
    if (/^#?\/?(home)?$/.test(location.hash.replace('#/', '')) && state.started) viewHome();
  });
  async function installApp() {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch (e) {}
    deferredInstall = null;
    viewHome();
  }

  // ---------------------------------------------------------------- router
  function route() {
    sayToken++;
    try { S.stop(); S.cancelListen(); } catch (e) {}
    picking = false;
    const parts = location.hash.replace(/^#\/?/, '').split('/');
    if (!state.started && parts[0] !== 'settings') return viewWelcome();
    switch (parts[0]) {
      case 'level': return parts[2] ? viewCat(parts[2]) : viewLevel(parseInt(parts[1], 10));
      case 'lesson': return viewLesson(decodeURIComponent(parts[1] || ''));
      case 'settings': return viewSettings();
      default: return viewHome();
    }
  }
  window.addEventListener('popstate', route);   // phone back button / swipe
  window.addEventListener('hashchange', route); // manual URL edits
  // Leaving the app mid-listen (home button, call, app switch): stop the recognizer.
  document.addEventListener('visibilitychange', () => { if (document.hidden) { try { S.cancelListen(); } catch (e) {} } });
  route();

  // ---------------------------------------------------------------- service worker (offline)
  if ('serviceWorker' in navigator && window.isSecureContext) {
    window.addEventListener('load', () => { navigator.serviceWorker.register('sw.js').catch(() => {}); });
  }

  // test hook (harmless): lets automated checks inspect state
  window.__readAloud = { state: () => state, items: C.items.length, helpText: () => helpText };
})();
