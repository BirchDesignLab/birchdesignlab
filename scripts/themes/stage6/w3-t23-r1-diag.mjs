/**
 * Stage 6 wave 3, task 23, fix round 1 (C1): what sits on a seed's path from the Sent clock?
 * Prints the text lines and cover boxes (measured the way fx.ts does) within reach of the clock head, with the
 * head's own box, so the blocked seats can be read against the geometry.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t23-r1 --reuse --port 4470 -- node scripts/themes/stage6/w3-t23-r1-diag.mjs
 *   WIDTHS=820,390 node ...
 */
import { launch, open } from './w3-t23-lib.mjs';

const widths = (process.env.WIDTHS || '820,390').split(',').map(Number);
const path = process.env.DIAG_PATH || '/t/cottagecore/contact/sent/';
const { browser } = await launch();
for (const width of widths) {
  const { page, ctx } = await open(browser, { path, width, settle: 1500 });
  await page.evaluate(() => document.querySelector('[data-cc-toy="dandelion"]').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const head = document.querySelector('[data-cc-toy="dandelion"] svg').getBoundingClientRect();
    const hx = head.left + head.width / 2;
    const hy = head.top + head.height * 0.46;
    const round = (n) => Math.round(n);
    const near = (b) => b.right > hx - 60 && b.left < hx + 320 && b.bottom > hy - 260 && b.top < hy + 80;
    const text = [];
    const range = document.createRange();
    document.querySelectorAll('header, main, footer').forEach((region) => {
      const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT, {
        acceptNode: (n) => (n.nodeValue && n.nodeValue.trim() && !n.parentElement?.closest('.cancel-pad') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
      });
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        range.selectNodeContents(n);
        for (const b of range.getClientRects()) if (b.width >= 1 && b.height >= 1 && near(b)) text.push({ tag: n.parentElement.tagName + '.' + (n.parentElement.getAttribute('class') || n.parentElement.closest('[class]')?.getAttribute('class') || ''), x: round(b.left - hx), y: round(b.top - hy), w: round(b.width), h: round(b.height), txt: n.nodeValue.trim().slice(0, 18) });
      }
    });
    const cover = [];
    document.querySelectorAll('.cc-paper, .cc-torn, .cc-gingham, .hoop').forEach((el) => { const b = el.getBoundingClientRect(); if (near(b)) cover.push({ cls: el.className.toString().slice(0, 30), x: round(b.left - hx), y: round(b.top - hy), w: round(b.width), h: round(b.height) }); });
    const env = document.querySelector('.envelope').getBoundingClientRect();
    return { vw: innerWidth, head: { x: round(hx), y: round(hy), w: round(head.width) }, env: { x: round(env.left - hx), y: round(env.top - hy), w: round(env.width), h: round(env.height) }, text, cover };
  });
  // One union box per source (the arc text is one glyph box each, which is too long to read).
  const groups = new Map();
  for (const t of r.text) {
    const g = groups.get(t.tag) || { l: 1e9, t: 1e9, r: -1e9, b: -1e9, n: 0 };
    g.l = Math.min(g.l, t.x); g.t = Math.min(g.t, t.y); g.r = Math.max(g.r, t.x + t.w); g.b = Math.max(g.b, t.y + t.h); g.n++;
    groups.set(t.tag, g);
  }
  console.log(width, JSON.stringify({ vw: r.vw, head: r.head, env: r.env, cover: r.cover }), '\n  text (relative to the head centre):');
  for (const [k, g] of groups) console.log(`   ${k}: x ${g.l}..${g.r}, y ${g.t}..${g.b} (${g.n} boxes)`);
  await ctx.close();
}
await browser.close();
