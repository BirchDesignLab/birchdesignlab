/** Fix round 1 probe: the Home doors' computed top rule and padding at each width. */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const server = await serveDist(4460, join(REPO, 'dist'));
const browser = await chromium.launch();
try {
  for (const w of [1440, 1024, 820, 640, 390]) {
    const p = await browser.newPage({ viewport: { width: w, height: 900 } });
    await p.goto('http://127.0.0.1:4460/t/swiss/', { waitUntil: 'networkidle' });
    console.log(w, JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('.door')].map((d) => { const c = getComputedStyle(d); return [c.borderTopWidth, c.paddingTop]; }))));
    await p.close();
  }
} finally { await browser.close(); server.close?.(); }
