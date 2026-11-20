/**
 * Stage 6 wave 2, task 10 (S2, T4 C2): the dial's rest against the CSS rest,
 * 1024 to 1300 in steps. With JS: the value the dial rests at (aria-valuenow)
 * and its cap (aria-valuemax). Without JS: the CSS rest (--sw-rest) and how far
 * the word's last glyph is from the lede's left edge (negative = clear), and
 * with JS how far the word has moved between first paint and after mount.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t10-restsweep.mjs
 *   SNAP=<snap name> node scripts/themes/stage6/w2-t10-restsweep.mjs   (serves the snap on 4470)
 *   FROM=1024 TO=1300 STEP=8
 */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const OUTROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out');
const FROM = +(process.env.FROM || 1024), TO = +(process.env.TO || 1300), STEP = +(process.env.STEP || 8);
let server = null;
let BASE = process.env.BASE;
if (!BASE) { server = await serveDist(4470, join(OUTROOT, `snap-${process.env.SNAP}`)); BASE = 'http://127.0.0.1:4470'; }
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu'] });
const measure = (page) => page.evaluate(() => {
  const h1 = document.querySelector('.billboard');
  const word = h1.querySelectorAll('.ln')[1];
  const r = document.createRange(); r.selectNodeContents(word);
  const rr = r.getBoundingClientRect();
  const lede = document.querySelector('.lede').getBoundingClientRect();
  const dial = document.querySelector('[data-sw-dial]');
  return { cssRest: getComputedStyle(h1).getPropertyValue('--sw-rest'), sd: word.style.getPropertyValue('--sw-d'), wordL: +rr.left.toFixed(1), wordR: +rr.right.toFixed(1), ledeL: +lede.left.toFixed(1), clear: +(lede.left - rr.right).toFixed(1), now: dial && !dial.hidden ? Number(dial.getAttribute('aria-valuenow')) : null, max: dial && !dial.hidden ? Number(dial.getAttribute('aria-valuemax')) : null };
});
try {
  for (let w = FROM; w <= TO; w += STEP) {
    const row = { w };
    for (const js of [false, true]) {
      const ctx = await browser.newContext({ viewport: { width: w, height: 800 }, javaScriptEnabled: js, colorScheme: 'light' });
      if (js) { await suppressPrompt(ctx); await ctx.addInitScript(() => { try { sessionStorage.setItem('bdl-swiss-dial-hint', '1'); } catch {} }); }
      const page = await ctx.newPage();
      await page.goto(`${BASE}/t/swiss/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(js ? 800 : 200);
      row[js ? 'js' : 'nojs'] = await measure(page);
      if (js) row.jump = +(row.js.wordR - row.nojs.wordR).toFixed(1);
      await ctx.close();
    }
    console.log(`${w}: css ${row.nojs.cssRest.trim()} nojs clear ${row.nojs.clear} | js rest ${row.js.now} max ${row.js.max} clear ${row.js.clear} | wordR moved after mount ${row.jump}`);
  }
} finally {
  await browser.close();
  if (server) await new Promise((r) => server.close(r));
}
