// The Lab wall's poster pictures: each miniature's rest frame as a small webp, one per piece, scheme and map, shown in its
// tile from the first paint until the engine draws the real frame over it (src/lib/lab-wall/reserve.ts, posterSrc).
//
//   BASE=http://localhost:4400 node scripts/lab-wall/posters.mjs
//
// BASE is a built site (npm run build, then any static server on dist/). It opens /lab/ in GPU Chromium at one window per
// map (desk 1440x900, tablet 820x1180, phone 390x844) and scheme, parks the mouse off the wall, and once every tile has
// rested (no repaint for a while, not the awake one) reads its canvas, scaled so its longer side is at most MAX px, into
// public/lab-wall/posters/<id>-<scheme>-<map>.webp. Run it again whenever a miniature's rest frame changes, then rebuild.
// Prints each file and its size, and the total for one visit (one map and scheme).
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const BASE = (process.env.BASE || 'http://localhost:4400').replace(/\/$/, '');
const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'lab-wall', 'posters');
const MAX = 560;
const QUALITY = 0.6;
const MAPS = { desk: [1440, 900], tablet: [820, 1180], phone: [390, 844] };
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars', '--force-prefers-reduced-transparency=no-preference'] });
const totals = {};
for (const [map, [w, h]] of Object.entries(MAPS)) {
  for (const scheme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await ctx.addInitScript(([s]) => {
      try { localStorage.setItem('scheme', s); localStorage.setItem('lab-view', 'wall'); } catch (e) { /* storage blocked */ }
      window.__frame = 0;
      const orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => orig((t) => { window.__frame++; cb(t); });
      // a canvas on the page remembers the last frame anything was drawn on it
      const P = CanvasRenderingContext2D.prototype;
      for (const m of ['fillRect', 'drawImage', 'fillText', 'fill', 'stroke']) {
        const o = P[m];
        P[m] = function (...a) { const c = this.canvas; if (c && c.isConnected) c.__lf = window.__frame; return o.apply(this, a); };
      }
    }, [scheme]);
    const page = await ctx.newPage();
    // the posters being made are not the ones to show while making them
    await page.route('**/lab-wall/posters/**', (r) => r.abort());
    await page.goto(BASE + '/lab/');
    await page.waitForFunction(() => document.querySelector('[data-lw-live]'), null, { timeout: 30000 });
    if (scheme === 'dark' && map === 'desk') {
      const r = await page.evaluate(() => { const g = document.createElement('canvas').getContext('webgl'); const e = g && g.getExtension('WEBGL_debug_renderer_info'); return e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'none'; });
      console.log('renderer', r);
    }
    await page.mouse.move(1, 1);
    const ids = await page.evaluate(() => [...document.querySelectorAll('.lw-tile canvas')].map((c) => c.closest('.lw-tile').getAttribute('data-lw-id')));
    const got = {};
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    for (let y = 0, pass = 0; pass < 12 && Object.keys(got).length < ids.length; pass++, y = (y + h * 0.45) % Math.max(1, height - h + 1)) {
      await page.evaluate((y) => window.scrollTo(0, y), y);
      await page.mouse.move(1, 1);
      await page.waitForTimeout(1800);
      const shots = await page.evaluate(([MAX, Q]) => {
        const out = {};
        for (const t of document.querySelectorAll('.lw-tile')) {
          const c = t.querySelector('canvas');
          if (!c || !c.classList.contains('lw-drawn') || c.width < 8 || t.classList.contains('lw-hot')) continue;
          if (window.__frame - (c.__lf || 0) < 30) continue; // drawn within the last half second: not at rest
          const r = t.getBoundingClientRect();
          if (r.bottom < 0 || r.top > innerHeight) continue;
          const k = Math.min(1, MAX / Math.max(c.width, c.height));
          const o = document.createElement('canvas');
          o.width = Math.round(c.width * k); o.height = Math.round(c.height * k);
          const g = o.getContext('2d');
          g.imageSmoothingQuality = 'high';
          g.drawImage(c, 0, 0, o.width, o.height);
          out[t.getAttribute('data-lw-id')] = o.toDataURL('image/webp', Q);
        }
        return out;
      }, [MAX, QUALITY]);
      for (const [id, url] of Object.entries(shots)) if (!got[id]) got[id] = url;
    }
    let total = 0;
    for (const id of ids) {
      if (!got[id]) { console.log('MISSING', id, scheme, map); continue; }
      const buf = Buffer.from(got[id].split(',')[1], 'base64');
      const file = `${id}-${scheme}-${map}.webp`;
      writeFileSync(join(OUT, file), buf);
      total += buf.length;
      console.log(file, buf.length);
    }
    totals[`${map} ${scheme}`] = total;
    await ctx.close();
  }
}
console.log('bytes per visit (one map, one scheme):', JSON.stringify(totals));
await browser.close();
