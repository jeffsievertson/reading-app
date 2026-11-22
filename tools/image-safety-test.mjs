// Run: node tools/image-safety-test.mjs
// Fails if a removed (unsafe or mismatched) lesson photo still exists or is referenced
// in app code, the service-worker precache, or other repo sources.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const FORBIDDEN = ['tent.webp', 'sun.webp', 'van.webp', 'water.webp', 'fish.webp'];
const SLUGS = FORBIDDEN.map((f) => f.replace(/\.webp$/, ''));
const SKIP_DIR = new Set(['.git', 'node_modules', 'screenshots', 'raw']);
// This test file must name the forbidden files; HANDOFF may describe the hotfix.
const SKIP_FILE = new Set([
  path.join(ROOT, 'tools/image-safety-test.mjs'),
  path.join(ROOT, 'HANDOFF.md')
]);

let fail = 0;
const check = (name, ok, info) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + JSON.stringify(info)));
  if (!ok) fail++;
};

for (const f of FORBIDDEN) {
  const p = path.join(ROOT, 'images', f);
  check(f + ' is not in images/', !fs.existsSync(p));
}

const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
for (const f of FORBIDDEN) {
  check('sw.js precache does not list ' + f, !sw.includes(f) && !sw.includes('./images/' + f.replace(/\.webp$/, '')));
}

const cacheOk = /const CACHE = 'read-aloud-v21-1-' \+ AUDIO_VERSION;/.test(sw)
  || /const CACHE = 'read-aloud-v22-' \+ AUDIO_VERSION;/.test(sw);
check('cache name is a post-removal prefix (v21-1 or v22)', cacheOk, sw.match(/const CACHE = [^;]+/)?.[0]);

function walk(dir, out = []) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIR.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const TEXT_EXT = new Set(['.js', '.mjs', '.css', '.html', '.json', '.md', '.txt', '.svg']);
const hits = [];
const imgSlugRe = new RegExp(
  String.raw`\bimg\s*:\s*['"](?:${SLUGS.join('|')})['"]`,
  'g'
);
for (const p of walk(ROOT)) {
  if (SKIP_FILE.has(p)) continue;
  const ext = path.extname(p);
  if (!TEXT_EXT.has(ext) && path.basename(p) !== 'sw.js') continue;
  const text = fs.readFileSync(p, 'utf8');
  const found = [];
  for (const f of FORBIDDEN) {
    if (text.includes(f)) found.push(f);
  }
  const slugHits = text.match(imgSlugRe);
  if (slugHits) found.push(...slugHits);
  if (found.length) hits.push({ file: path.relative(ROOT, p), found: [...new Set(found)] });
}
check('no source file references a removed image', hits.length === 0, hits);

const imagesDir = path.join(ROOT, 'images');
const onDisk = fs.readdirSync(imagesDir).filter((f) => f.endsWith('.webp')).sort();
const assets = [...sw.matchAll(/'\.\/images\/([^']+\.webp)'/g)].map((m) => m[1]).sort();
check('every remaining images/*.webp is in the sw.js precache', JSON.stringify(onDisk) === JSON.stringify(assets), { onDisk, assets });
check('precache lists no removed files', assets.every((f) => !FORBIDDEN.includes(f)), assets.filter((f) => FORBIDDEN.includes(f)));

console.log(fail ? fail + ' FAILED' : 'all passed');
process.exit(fail ? 1 : 0);
