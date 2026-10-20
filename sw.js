/* Offline support: precache the whole app (including the natural-voice audio clips),
   serve cache-first, update app files in the background. */
const AUDIO_VERSION = '5ca7f795'; // stamped by tools/audio/build_audio.py
const CACHE = 'read-aloud-v6-' + AUDIO_VERSION;
const ASSETS = [
  './', './index.html', './manifest.json',
  './css/styles.css', './js/content.js', './js/speech.js', './js/app.js',
  './audio/clips.json',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png',
  './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];

// Audio clip files have content-hash names, so a cached copy never goes stale.
const isClip = (url) => /\/audio\/.+\.mp3$/.test(url.pathname);

async function precacheAudio(c) {
  try {
    const res = await c.match('./audio/clips.json');
    const m = res && (await res.json());
    const files = (m && m.files) || [];
    const todo = [];
    for (const f of files) {
      const u = './audio/' + f;
      if (!(await c.match(u))) todo.push(u);
    }
    for (let i = 0; i < todo.length; i += 20) { // small batches: gentle on phones
      await Promise.all(todo.slice(i, i + 20).map((u) => c.add(u).catch(() => {})));
    }
  } catch (e) { /* best effort: missing clips fall back to the phone voice */ }
}

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))
        .then(async () => {
          // carry over clips already downloaded by an older version (same file name = same audio)
          for (const k of await caches.keys()) {
            if (k === CACHE || !k.startsWith('read-aloud-')) continue;
            const old = await caches.open(k);
            for (const r of await old.keys()) {
              if (isClip(new URL(r.url))) { const hit = await old.match(r); if (hit) await c.put(r, hit); }
            }
          }
          await precacheAudio(c);
        }))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      if (hit && isClip(url)) return hit;
      const net = fetch(req).then((res) => {
        if (res && res.ok && res.status === 200) { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); }
        return res;
      }).catch(() => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return hit || net;
    })
  );
});
