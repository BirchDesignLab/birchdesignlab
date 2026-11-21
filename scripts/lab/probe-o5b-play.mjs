// BDL-013 o5b: check the Play pass runs at reading pace (about 12 s a chapter)
// and performs the ch2 / ch5 interactions itself. node scripts/lab/probe-o5b-play.mjs
import { createRequire } from 'node:module';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const { chromium } = createRequire(join(root, 'package.json'))('playwright');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
p.on('pageerror', (e) => console.log('PE', String(e)));
await p.goto(pathToFileURL(join(root, 'docs/bdl-013/mockups/o5b-framework.html')).href);
await p.waitForTimeout(800);
await p.click('#play');
const t0 = Date.now();
const snap = () => p.evaluate(() => ({ ch: +document.querySelector('.ch.on').dataset.ch, off: document.querySelector('.ch2').classList.contains('off'), lit: document.querySelectorAll('.gate.lit').length, dep: !!document.querySelector('.dep.lit'), s3: document.querySelector('.ch5').classList.contains('s3'), play: document.getElementById('play').classList.contains('on') }));
for (const s of [6, 13, 15, 18, 25, 38, 44, 49, 52, 54, 58, 62, 69]) {
  await p.waitForTimeout(Math.max(0, s * 1000 - (Date.now() - t0)));
  console.log(s + 's', JSON.stringify(await snap()));
}
await b.close();
