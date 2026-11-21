// Each Portal panel next to the real home hero it is a crop of, for a by-eye check
// that a panel reads as its school at a glance. Needs the home renders in
// scripts/readme/.out/critic2/home-<id>-<scheme>.png (1440 wide) and the
// settled still from evidence.mjs.
//
//   node scripts/readme/charts/sidebyside.mjs [light|dark]   -> scripts/readme/.out/charts/portal-sidebyside.<scheme>.png
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { REPO } from './source.mjs';

const require = createRequire(resolve(REPO, 'package.json'));
const { chromium } = require('playwright');
const scheme = process.argv[2] ?? 'light';
const out = resolve(REPO, 'scripts/readme/.out');
// panel row tops in the 830 still, in svg px (read off the settled still)
const ROW_Y = [102, 370, 656];
const ids = ['quiet', 'swiss', 'bauhaus', 'glassmorphism', 'vaporwave', 'grandmillennial', 'cottagecore'];
// panel positions in the 830 desktop still (20px page padding): 3 columns of 243 + 14, rows from the layout
const still = readFileSync(resolve(out, `charts/stills/2-portal-schools.${scheme}.830.png`)).toString('base64');
const home = (id) => readFileSync(resolve(out, `critic2/home-${id}-${scheme}.png`)).toString('base64');
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 900 } });
  const cells = ids
    .map((id, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return `<figure style="margin:0"><div style="display:flex;gap:10px;align-items:flex-start"><img src="data:image/png;base64,${home(id)}" style="width:560px;display:block;border:1px solid #8884"><div style="width:260px;height:210px;overflow:hidden;position:relative;border:1px solid #8884"><img data-col="${col}" data-row="${row}" src="data:image/png;base64,${still}" style="position:absolute;left:${-(20 + 36 + col * 257) + 8}px;top:${-(20 + ROW_Y[row]) + 8}px;max-width:none"></div></div><figcaption style="font:12px monospace;color:#999">${id}</figcaption></figure>`;
    })
    .join('');
  await page.setContent(`<body style="margin:0;padding:16px;background:${scheme === 'dark' ? '#0d1117' : '#fff'};display:grid;grid-template-columns:1fr 1fr;gap:16px">${cells}</body>`);
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(out, `charts/portal-sidebyside.${scheme}.png`), fullPage: true });
} finally {
  await browser.close();
}
console.log('written');
