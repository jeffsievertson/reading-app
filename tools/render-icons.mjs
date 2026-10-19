import { chromium } from 'playwright-core';
import fs from 'fs';
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args:['--no-sandbox'] });
const p = await b.newPage();
async function render(svgPath, size, out){
  const svg = fs.readFileSync(svgPath,'utf8');
  await p.setViewportSize({width:size,height:size});
  await p.setContent(`<html><body style="margin:0;background:transparent"><img src="data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}" width="${size}" height="${size}" style="display:block"></body></html>`);
  await p.screenshot({path: out, omitBackground: true});
}
const d='/workspace/reading-app/icons/';
await render(d+'icon.svg',192,d+'icon-192.png');
await render(d+'icon.svg',512,d+'icon-512.png');
await render('/tmp/maskable.svg',512,d+'icon-maskable-512.png');
await render('/tmp/maskable.svg',180,d+'apple-touch-icon.png');
await b.close();
