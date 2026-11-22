// Run: node tools/photo-credits-test.mjs
// Every images/*.webp must have a credit entry. Public-domain and CC0 photos may be
// listed and must be marked as such. CC BY / BY-SA (and other attribution licences)
// need author, licence (with a link), source, and a "modified" note if cropped or resized.
import fs from 'fs';
import path from 'path';
import vm from 'vm';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let fail = 0;
const check = (name, ok, info) => {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  ' + JSON.stringify(info)));
  if (!ok) fail++;
};

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'js/credits.js'), 'utf8'), ctx);
const credits = ctx.window.PHOTO_CREDITS;
check('PHOTO_CREDITS is a non-empty array', Array.isArray(credits) && credits.length > 0, credits && credits.length);

const images = fs.readdirSync(path.join(ROOT, 'images')).filter((f) => f.endsWith('.webp')).sort();
const byFile = Object.fromEntries((credits || []).map((c) => [c.file, c]));
const missing = images.filter((f) => !byFile[f]);
check('every images/*.webp has a credit entry', missing.length === 0, missing);

const sources = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/imagery-sources.json'), 'utf8'));
const extra = (credits || []).filter((c) => !images.includes(c.file)).map((c) => c.file);
check('credits do not list removed or missing files', extra.length === 0, extra);

for (const c of credits || []) {
  if (!images.includes(c.file)) continue;
  const rec = Object.values(sources).find((r) => r && r.file === 'images/' + c.file);
  const lic = (c.license || '');
  const isPD = /public domain/i.test(lic) || c.publicDomain;
  const isCC0 = /^cc0\b/i.test(lic) || c.cc0;
  const isBy = /CC BY/i.test(lic);
  const needsAttr = isBy || /unsplash/i.test(lic);
  check(c.file + ': has subject, author, licence, source',
    !!(c.subject && c.author && c.license && c.licenseUrl && c.sourceUrl),
    { subject: c.subject, author: c.author, license: c.license, licenseUrl: c.licenseUrl, sourceUrl: c.sourceUrl });
  if (isPD) check(c.file + ': marked public domain', c.publicDomain === true, c);
  if (isCC0) check(c.file + ': marked CC0', c.cc0 === true, c);
  if (needsAttr) {
    check(c.file + ': attribution licence has a licence link', /^https?:\/\//.test(c.licenseUrl || ''), c.licenseUrl);
    check(c.file + ': has a source link', /^https?:\/\//.test(c.sourceUrl || ''), c.sourceUrl);
    // Every shipped photo is resized and converted to WebP, which is a modification.
    check(c.file + ': records that the photo was modified', !!(c.modified && /resiz|crop|convert|modif/i.test(c.modified)), c.modified);
  }
  if (rec && rec.page) check(c.file + ': source matches imagery-sources', c.sourceUrl === rec.page, { credit: c.sourceUrl, sources: rec.page });
  if (rec && rec.license) check(c.file + ': licence matches imagery-sources', c.license === rec.license, { credit: c.license, sources: rec.license });
  if (rec && rec.author) check(c.file + ': author matches imagery-sources', c.author === rec.author, { credit: c.author, sources: rec.author });
}

const app = fs.readFileSync(path.join(ROOT, 'js/app.js'), 'utf8');
const sw = fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8');
const idx = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
check('settings links to the Photo credits screen', /go\('#\/credits'\)/.test(app) && /function viewCredits/.test(app));
check('index.html and sw.js include js/credits.js', idx.includes('js/credits.js') && sw.includes('js/credits.js'));

console.log(fail ? fail + ' FAILED' : 'all passed');
process.exit(fail ? 1 : 0);
