/** B1 task 4 fix 1: canopy and wordmark heights on Home vs About at phone width (must match). */
import { chromium } from 'playwright';
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const b = await chromium.launch();
for (const w of [390, 560, 760]) {
  const p = await b.newPage({ viewport: { width: w, height: 844 } });
  for (const path of ['', 'about/', 'services/', 'contact/']) {
    await p.goto(`${base}/t/grandmillennial/${path}`, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    const r = await p.evaluate(() => {
      const c = document.querySelector('.canopy').getBoundingClientRect();
      const m = document.querySelector('.masthead').getBoundingClientRect();
      const wm = document.querySelector('.wordmark').getBoundingClientRect();
      return { canopy: c.height, masthead: m.height, wm: [wm.width, wm.height] };
    });
    console.log(w, path || 'home', JSON.stringify(r));
  }
}
await b.close();
