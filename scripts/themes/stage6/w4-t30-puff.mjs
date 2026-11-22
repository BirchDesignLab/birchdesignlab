/**
 * Stage 6 wave 4, task 30 (critique B1, B2, B4): the clock's release, measured. It is w3-t23-r1-puff with the arrival
 * through the real switcher and the growth and the stagger added. Fresh load per run, light, GPU Chromium, one first
 * tap on the head. Per run:
 *   asked    the seeds the clock asked fx.ts to release (the event's n)
 *   placed   the seeds fx.ts answered it placed (the report callback, wrapped before fx's own listener)
 *   bald     the seeds off the head 400 ms later (the running refill animations): must equal placed
 *   sprites  the sprite widths drawn within 140 px of the head, the first time each new seed is seen: the SIZE of a
 *            sprite 150 ms after its first draw against 1500 ms after (the growth: about 0.3 up to 1 over 1.4 s)
 *   stagger  the first-draw times of the new seeds, ms after the tap: i x 70 ms apart
 *
 *   node scripts/themes/snap.mjs --name s6-w4-t30 --reuse --port 4470 -- node scripts/themes/stage6/w4-t30-puff.mjs
 *   PAGES=sent WIDTHS=820,700,640 RUNS=6 node ...
 * Output: .out/stage6/w4/t30/puff.json and one line per page and width.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, arrive, OUT } from './w4-t30-lib.mjs';

const ALL = { home: '/t/cottagecore/', sent: '/t/cottagecore/contact/sent/' };
const pages = (process.env.PAGES || 'home,sent').split(',');
const widths = (process.env.WIDTHS || '1440,1024,1000,900,820,760,700,640,600,390').split(',').map(Number);
const runs = Number(process.env.RUNS || 5);
const { browser } = await launch();
const out = {};
let bad = 0;

const init = () => {
  const P = CanvasRenderingContext2D.prototype;
  const tr = P.translate, di = P.drawImage;
  window.__draws = [];
  P.translate = function (x, y) { if (this.canvas?.matches?.('[data-cc-motes]')) this.__at = [x, y]; return tr.call(this, x, y); };
  P.drawImage = function (...a) {
    if (this.canvas?.matches?.('[data-cc-motes]') && this.__at) window.__draws.push({ t: performance.now(), x: this.__at[0], y: this.__at[1], w: a[3] });
    return di.apply(this, a);
  };
  window.__blow = null;
  addEventListener('cc:blow', (e) => {
    const d = e.detail;
    window.__blow = { t: performance.now(), n: d.n, x: d.x, y: d.y, placed: null };
    const orig = d.report;
    if (typeof orig === 'function') d.report = (p) => { window.__blow.placed = p.length; orig(p); };
  });
};

for (const name of pages) for (const width of widths) {
  const res = [];
  for (let run = 0; run < runs; run++) {
    const { ctx, page, mobile } = await arrive(browser, { path: ALL[name], width, scheme: 'light', init, settle: 300 });
    await page.evaluate(() => document.querySelector('[data-cc-toy="dandelion"]').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2500);
    const [x, y] = await page.evaluate(() => { const r = document.querySelector('[data-cc-toy="dandelion"] svg').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.35]; });
    const t0 = await page.evaluate(() => performance.now());
    if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await page.waitForTimeout(400);
    const bald = await page.evaluate(() => [...document.querySelectorAll('[data-cc-toy="dandelion"] .sd')].filter((s) => s.getAnimations().length).length);
    await page.waitForTimeout(2100);
    const r = await page.evaluate((t0) => {
      const b = window.__blow;
      if (!b) return { sent: null };
      // The new seeds are the ones drawn within 140 px of the head, tracked by nearest-neighbour between frames.
      const near = window.__draws.filter((d) => d.t >= t0 && d.t < t0 + 2500 && Math.hypot(d.x - b.x, d.y - b.y) < 140);
      const byFrame = new Map();
      for (const d of near) { const k = Math.round(d.t / 8); if (!byFrame.has(k)) byFrame.set(k, []); byFrame.get(k).push(d); }
      // first-draw time of each distinct new seed: a draw whose position is not within 6 px of any earlier draw's path
      const tracks = [];
      for (const d of near) {
        const tk = tracks.find((k) => k.last.t < d.t && d.t - k.last.t < 120 && Math.hypot(d.x - k.last.x, d.y - k.last.y) < 40 && !k.taken.has(Math.round(d.t)));
        if (tk) { tk.pts.push(d); tk.last = d; tk.taken.add(Math.round(d.t)); }
        else tracks.push({ pts: [d], last: d, taken: new Set([Math.round(d.t)]) });
      }
      const seeds = tracks.filter((k) => k.pts.length > 8).map((k) => ({ first: Math.round(k.pts[0].t - t0), w0: +k.pts[0].w.toFixed(1), w150: +(k.pts.find((p) => p.t - k.pts[0].t >= 150)?.w ?? NaN).toFixed(1), w1500: +(k.pts.find((p) => p.t - k.pts[0].t >= 1500)?.w ?? NaN).toFixed(1) }));
      return { asked: b.n, placed: b.placed, seeds };
    }, t0);
    r.bald = bald;
    res.push(r);
    await ctx.close();
  }
  out[`${name}-${width}`] = res;
  const ok = res.every((r) => r.asked === r.placed && r.placed === r.bald);
  if (!ok) bad++;
  const grow = res.flatMap((r) => r.seeds ?? []).filter((s) => Number.isFinite(s.w150) && Number.isFinite(s.w1500));
  const ratio = grow.length ? (grow.reduce((a, s) => a + s.w1500 / s.w0, 0) / grow.length).toFixed(2) : 'n/a';
  const starts = res.map((r) => (r.seeds ?? []).map((s) => s.first).sort((a, b) => a - b).slice(0, 4).join('/')).join(' | ');
  console.log(ok ? 'ok  ' : 'FAIL', name, width, res.map((r) => `asked ${r.asked} placed ${r.placed} bald ${r.bald}`).join(' | '), `| tracked seeds ${grow.length}, mean w1500/w0 ${ratio} | first draws ${starts}`);
}
await writeFile(join(OUT, 'puff.json'), JSON.stringify(out, null, 1));
await browser.close();
console.log(bad ? `FAIL: ${bad} page/width cells where asked != placed != bald` : 'every cell: asked == placed == bald');
process.exit(bad ? 1 : 0);
