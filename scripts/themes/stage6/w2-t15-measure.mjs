/**
 * Stage 6 wave 2, task 15: measurements for the grandmillennial ledger leftovers.
 * Prints, per width, in light:
 *   Home: portrait (frame) width, plates box, hero height, plate svg count, the canopy height;
 *   Header: phone nav row fits (scrollWidth vs clientWidth, link rects), tug hit width;
 *   Contact: desk column tops and heights (envelope vs form);
 *   Services: gap from the lede to the first offering;
 *   Chintz: a framed card's outer width on phones.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t15-measure.mjs [home|header|contact|services|chintz|all]
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const WHAT = process.argv[2] || 'all';
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function open(w, path, scheme = 'light') {
  const ctx = await browser.newContext({ viewport: { width: w, height: 900 }, colorScheme: scheme });
  await suppressPrompt(ctx);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}/t/grandmillennial/${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page };
}
const r = (n) => Math.round(n * 10) / 10;

if (WHAT === 'home' || WHAT === 'all') {
  console.log('HOME: width portrait plates.left plates.right hero.h plates/svg canopy');
  for (const w of [761, 820, 1000, 1099, 1100, 1101, 1180, 1257, 1300, 1440]) {
    const { ctx, page } = await open(w, '');
    const o = await page.evaluate(() => {
      const b = (s) => { const e = document.querySelector(s); if (!e) return null; const x = e.getBoundingClientRect(); return [x.width, x.height]; };
      return { portrait: b('.portrait'), gilt: b('.gilt'), left: b('.plates.left'), right: b('.plates.right'), hero: b('.hero'), canopy: b('.canopy'), svgs: document.querySelectorAll('.hero svg.gm-plate').length };
    });
    console.log(String(w).padStart(5), 'portrait', o.portrait.map(r).join('x'), 'left', o.left.map(r).join('x'), 'right', o.right.map(r).join('x'), 'hero.h', r(o.hero[1]), 'plates', o.svgs, 'canopy.h', r(o.canopy[1]));
    await ctx.close();
  }
}
if (WHAT === 'header' || WHAT === 'all') {
  console.log('HEADER: nav fit and tug hit width');
  for (const w of [360, 390, 480, 761, 820, 1000, 1100, 1101, 1440]) {
    const { ctx, page } = await open(w, 'about/');
    const o = await page.evaluate(() => {
      const nav = document.querySelector('.site-header nav');
      const n = nav.getBoundingClientRect();
      const links = [...nav.querySelectorAll('a')].map((a) => { const x = a.getBoundingClientRect(); return [Math.round(x.left), Math.round(x.right), Math.round(x.top)]; });
      const hit = document.querySelector('.bp-hit').getBoundingClientRect();
      const pull = document.querySelector('.bell-pull').getBoundingClientRect();
      const ls = getComputedStyle(nav).letterSpacing;
      return { nav: [n.left, n.right, n.height], links, hit: [hit.width, hit.height, hit.left, hit.right], pull: [pull.left, pull.right], ls, sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth };
    });
    const rowTops = [...new Set(o.links.map((l) => l[2]))].length;
    console.log(String(w).padStart(5), 'ls', o.ls, 'nav', o.nav.map(r).join(','), 'links', JSON.stringify(o.links), 'rows', rowTops, 'hit', o.hit.map(r).join(','), 'overflowX', o.sw > o.cw);
    await ctx.close();
  }
}
if (WHAT === 'contact' || WHAT === 'all') {
  console.log('CONTACT: desk children top/height');
  for (const w of [390, 820, 1024, 1280, 1440]) {
    const { ctx, page } = await open(w, 'contact/');
    const o = await page.evaluate(() => {
      const desk = document.querySelector('.desk');
      return [...desk.children].map((c) => { const x = c.getBoundingClientRect(); return { cls: c.className, top: x.top + scrollY, h: x.height, w: x.width }; });
    });
    console.log(String(w).padStart(5), o.map((c) => `${c.cls.split(' ')[0] || c.tagName} top ${r(c.top)} h ${r(c.h)} w ${r(c.w)}`).join(' | '));
    await ctx.close();
  }
}
if (WHAT === 'services' || WHAT === 'all') {
  console.log('SERVICES: lede bottom to first offering top');
  for (const w of [390, 820, 1024, 1280, 1440]) {
    const { ctx, page } = await open(w, 'services/');
    const o = await page.evaluate(() => {
      const intro = document.querySelector('.intro');
      const lede = document.querySelector('.sublines');
      const room = document.querySelector('.intro ~ *');
      const ib = intro.getBoundingClientRect();
      const lb = lede.getBoundingClientRect();
      const next = intro.nextElementSibling;
      const nb = next.getBoundingClientRect();
      const first = next.querySelector('h2, h3, .offering, article, li');
      const fb = first && first.getBoundingClientRect();
      return { nextCls: next.className, introBottom: ib.bottom, ledeBottom: lb.bottom, nextTop: nb.top, firstTop: fb && fb.top, firstTag: first && first.tagName + '.' + first.className, padTop: getComputedStyle(next).paddingTop };
    });
    console.log(String(w).padStart(5), 'lede->next', r(o.nextTop - o.ledeBottom), 'lede->first', o.firstTop == null ? '-' : r(o.firstTop - o.ledeBottom), o.nextCls, o.firstTag, 'padTop', o.padTop);
    await ctx.close();
  }
}
if (WHAT === 'chintz' || WHAT === 'all') {
  console.log('CHINTZ: is-chintz outer width vs a plain framed');
  for (const w of [360, 390, 480, 820, 1280]) {
    for (const path of ['contact/', 'services/', '']) {
      const { ctx, page } = await open(w, path);
      const o = await page.evaluate(() => [...document.querySelectorAll('.gm-framed')].map((f) => { const x = f.getBoundingClientRect(); const bd = f.querySelector('.border'); const bb = bd && bd.getBoundingClientRect(); return { cls: f.className.replace(/astro-\S+/g, '').trim(), x: x.left, w: x.width, outer: bb ? [bb.left, bb.width] : null }; }));
      console.log(String(w).padStart(5), path || 'home', JSON.stringify(o.map((f) => [f.cls, r(f.x), r(f.w), f.outer && f.outer.map(r)])));
      await ctx.close();
    }
  }
}
await browser.close();
