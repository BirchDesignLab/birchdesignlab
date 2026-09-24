/**
 * Which ways of putting a drawn copy over the page leave the page's text
 * antialiasing alone while part of the page repaints (a link's hover color)?
 *
 * Written 09-23-26 for Tier 3 stage 2 (agent D, the freeze investigation).
 * draw-ahead-check.mjs found that a link hovered while runtime.ts's copy is
 * up repaints its glyphs without subpixel (LCD) antialiasing, up to about 11
 * levels, until the copy is removed. This tries copy styles on a build with
 * no drawing ahead (freeze-d0): for each, draw a script-less copy of another
 * school's page, rest the mouse on a nav link while it is up, screenshot,
 * remove the copy, screenshot, and count differing pixels. A variant is only
 * useful if it also still compiles the copy's GPU programs (measure it with
 * trace-arrival.mjs afterwards).
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-d0 --reuse --port 4492 -- \
 *     node scripts/themes/harness/draw-ahead-lcd-variants.mjs [--from quiet] [--to grandmillennial] [--hover-first]
 */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
}
const from = arg('from', 'quiet');
const to = arg('to', 'grandmillennial');
/* --hover-first: rest on the link before the copy goes up, as the portal
   does (the copy is drawn because of the rest), instead of after. */
const hoverFirst = process.argv.includes('--hover-first');
const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4492').replace(/\/$/, '');
const VARIANTS = {
  top: 'opacity:0.001;z-index:2147483647',
  'top-willchange': 'opacity:0.001;z-index:2147483647;will-change:opacity',
  'filter-opacity': 'filter:opacity(0.001);z-index:2147483647',
  'top-isolate': 'opacity:0.001;z-index:2147483647;isolation:isolate;contain:strict',
  'top-transform': 'opacity:0.001;z-index:2147483647;transform:translateZ(0)',
};
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] });
const px = async (buf) => { const img = await loadImage(buf); const c = createCanvas(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); return c.getContext('2d').getImageData(0, 0, img.width, img.height).data; };
for (const [name, css] of Object.entries(VARIANTS)) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce', colorScheme: 'dark' });
  await context.addInitScript(() => { try { sessionStorage.setItem('bdl-portal-prompt', 'dismissed'); localStorage.setItem('scheme', 'dark'); } catch {} });
  const page = await context.newPage();
  await page.goto(`${base}/t/${from}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const link = await page.evaluate(() => {
    const a = [...document.querySelectorAll('header a[href^="/t/"]')].find((x) => new URL(x.href).pathname !== location.pathname && x.getBoundingClientRect().width);
    const r = a.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });
  if (hoverFirst) { await page.mouse.move(link.x, link.y); await page.waitForTimeout(120); }
  await page.evaluate(async ({ to, css, hoverFirst }) => {
    const html = await (await fetch(to)).text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script, noscript, link:not([rel~="stylesheet"])').forEach((el) => el.remove());
    doc.documentElement.setAttribute('data-scheme', 'dark');
    doc.documentElement.classList.add('js');
    const f = document.createElement('iframe');
    f.id = 'variant-copy';
    f.setAttribute('sandbox', 'allow-same-origin');
    f.style.cssText = `position:fixed;left:0;top:0;width:100%;height:100%;border:0;pointer-events:none;${css}`;
    const loaded = new Promise((r) => f.addEventListener('load', r, { once: true }));
    f.srcdoc = `<!DOCTYPE html>${doc.documentElement.outerHTML}`;
    document.body.appendChild(f);
    await loaded;
    await new Promise((r) => setTimeout(r, hoverFirst ? 60 : 500));
  }, { to: `/t/${to}/`, css, hoverFirst });
  if (!hoverFirst) { await page.mouse.move(link.x, link.y); await page.waitForTimeout(300); }
  const a = await px(await page.screenshot());
  await page.evaluate(() => document.getElementById('variant-copy').remove());
  await page.waitForTimeout(600);
  const b = await px(await page.screenshot());
  let n = 0, max = 0;
  for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d) n++; if (d > max) max = d; }
  console.log(`${name}: ${n} px differ (max ${max})`);
  await context.close();
}
await browser.close();
