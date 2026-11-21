/**
 * Stage 6 wave 3, task 23, fix round 1 (C1): does a clock tap release what it takes off the head?
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t23-r1 --port 4470 -- node scripts/themes/stage6/w3-t23-r1-puff.mjs
 *   PAGES=sent WIDTHS=820,390 RUNS=6 node ...
 *
 * Fresh load per run, light, GPU Chromium, one first tap on the head. Per run: the seeds the clock asked fx.ts to
 * release (the event's n), the seeds fx.ts answered it placed (the report callback, wrapped in an init script that
 * runs before fx's own listener), the seeds off the head 400 ms later (running refill animations), and the seed
 * sprites drawn within 140 px of the head in the 1.5 s after the tap (max per frame) against the 600 ms before.
 */
import { launch } from './w3-t23-lib.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = process.env.SNAP_BASE || 'http://127.0.0.1:4470';
const ALL = { home: '/t/cottagecore/', sent: '/t/cottagecore/contact/sent/' };
const pages = (process.env.PAGES || 'sent,home').split(',');
const widths = (process.env.WIDTHS || '1440,1024,900,820,760,700,640,390').split(',').map(Number);
const runs = Number(process.env.RUNS || 5);
const { browser } = await launch();
const out = {};

for (const name of pages) for (const width of widths) {
  const res = [];
  for (let run = 0; run < runs; run++) {
    const mobile = width < 900;
    const height = width < 700 ? 844 : width < 1100 ? 1180 : 900;
    const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile, colorScheme: 'light', reducedMotion: 'no-preference' });
    await suppressPrompt(ctx);
    await ctx.addInitScript(() => {
      try { localStorage.setItem('scheme', 'light'); } catch {}
      const P = CanvasRenderingContext2D.prototype;
      const tr = P.translate, di = P.drawImage;
      window.__draws = [];
      P.translate = function (x, y) { if (this.canvas?.matches?.('[data-cc-motes]')) this.__at = [x, y]; return tr.call(this, x, y); };
      P.drawImage = function (...a) { if (this.canvas?.matches?.('[data-cc-motes]') && this.__at) window.__draws.push({ t: performance.now(), x: this.__at[0], y: this.__at[1] }); return di.apply(this, a); };
      window.__blow = null;
      // Registered before fx's listener (init script), so this wraps report before fx.ts reads the detail.
      addEventListener('cc:blow', (e) => {
        const d = e.detail;
        window.__blow = { t: performance.now(), n: d.n, x: d.x, y: d.y, placed: null };
        const orig = d.report;
        if (typeof orig === 'function') d.report = (p) => { window.__blow.placed = p.length; orig(p); };
      });
    });
    await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
    const page = await ctx.newPage();
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.goto(`${BASE}${ALL[name]}`, { waitUntil: 'networkidle' });
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => document.querySelector('[data-cc-toy="dandelion"]').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(2500);
    const [x, y] = await page.evaluate(() => { const r = document.querySelector('[data-cc-toy="dandelion"] svg').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.35]; });
    const t0 = await page.evaluate(() => performance.now());
    if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y);
    await page.waitForTimeout(400);
    const bald = await page.evaluate(() => [...document.querySelectorAll('[data-cc-toy="dandelion"] .sd')].filter((s) => s.getAnimations().length).length);
    await page.waitForTimeout(1100);
    const r = await page.evaluate((t0) => {
      const b = window.__blow;
      if (!b) return { sent: null };
      const frames = new Map();
      for (const d of window.__draws) { const k = Math.round(d.t); if (!frames.has(k)) frames.set(k, []); frames.get(k).push(d); }
      let before = 0, after = 0;
      for (const [t, ds] of frames) {
        const near = ds.filter((d) => Math.hypot(d.x - b.x, d.y - b.y) < 140).length;
        if (t < t0 && t > t0 - 600) before = Math.max(before, near);
        if (t >= t0 && t < t0 + 1500) after = Math.max(after, near);
      }
      return { asked: b.n, placed: b.placed, bald: 0, nearNew: after - before };
    }, t0);
    r.bald = bald;
    res.push(r);
    await ctx.close();
  }
  out[`${name}-${width}`] = res;
  console.log(name, width, res.map((r) => `asked ${r.asked} placed ${r.placed} bald ${r.bald} new ${r.nearNew}`).join(' | '));
}
await browser.close();
