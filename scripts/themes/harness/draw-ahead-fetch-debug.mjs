/**
 * Which code asks for a hovered link's page, and how often, when the portal
 * draws it ahead (runtime.ts). A debugging probe for draw-ahead-check.mjs's
 * "reached the server twice" finding on in-page links.
 *
 * Written 09-23-26 for Tier 3 stage 2 (agent D, the freeze investigation).
 * Wraps window.fetch in the top page and logs every call for a /t/ URL with
 * its stack, then rests the mouse on the page's first portal link.
 * --refetch then fetches that page from script, as warmPages() does, to
 * see whether the router's own hover prefetch answers it from cache.
 * --shots compares the page while the copy is up (or --shot-at ms into the
 * rest, default 250, without one) with 900 ms later (the
 * control for draw-ahead-check.mjs's link rule; run it on both builds).
 *
 * Usage (serve a snapshot first):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name freeze-d2 --reuse --port 4492 -- \
 *     node scripts/themes/harness/draw-ahead-fetch-debug.mjs [--from quiet]
 */
import { chromium } from 'playwright';

const i = process.argv.indexOf('--from');
const from = i === -1 ? 'quiet' : process.argv[i + 1];
const base = (process.env.SNAP_BASE || 'http://127.0.0.1:4492').replace(/\/$/, '');
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
await context.addInitScript(() => {
  if (window.top !== window) return;
  const real = window.fetch;
  window.__fetches = [];
  window.fetch = function (input, init) {
    const url = String(input && input.url ? input.url : input);
    if (url.includes('/t/')) window.__fetches.push({ url, at: Math.round(performance.now()), stack: new Error().stack.split('\n').slice(2, 6).join(' <- ') });
    return real.call(this, input, init);
  };
  try { sessionStorage.setItem('bdl-portal-prompt', 'dismissed'); } catch {}
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.enable');
const ids = new Map();
cdp.on('Network.requestWillBeSent', (e) => { if (e.request.url.includes('/t/')) ids.set(e.requestId, e.request.url); });
cdp.on('Network.requestServedFromCache', (e) => { if (ids.has(e.requestId)) console.log(`  served from memory cache: ${ids.get(e.requestId)}`); });
cdp.on('Network.responseReceived', (e) => {
  if (!ids.has(e.requestId)) return;
  const r = e.response;
  console.log(`  response ${r.status} ${ids.get(e.requestId)} disk ${r.fromDiskCache} prefetch ${r.fromPrefetchCache} cache-control ${r.headers['cache-control'] ?? r.headers['Cache-Control'] ?? '-'}`);
});
page.on('request', (r) => { if (r.url().includes('/t/')) console.log(`request ${r.url()} from ${r.frame() === page.mainFrame() ? 'page' : 'child frame'} ${r.resourceType()}`); });
await page.goto(`${base}/t/${from}/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(500);
const link = await page.evaluate(() => {
  const a = [...document.querySelectorAll('a[href^="/t/"]')].find((x) => new URL(x.href).pathname !== location.pathname && x.getBoundingClientRect().width && x.getBoundingClientRect().top >= 0);
  const r = a.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2, href: a.getAttribute('href') };
});
console.log('hovering', link.href);
await page.mouse.move(link.x, link.y);
await page.waitForTimeout(2000);
console.log(JSON.stringify(await page.evaluate(() => window.__fetches), null, 1));
// --shots: after resting on the link 180 ms and again 900 ms later, under
// reduced motion, count the pixels that differ: on a build without drawing
// ahead this is the control for draw-ahead-check.mjs's link rule.
const shotAt = Number(process.argv[process.argv.indexOf('--shot-at') + 1] || 250);
if (process.argv.includes('--shots')) {
  const { createCanvas, loadImage } = await import('@napi-rs/canvas');
  const px = async (buf) => { const img = await loadImage(buf); const c = createCanvas(img.width, img.height); c.getContext('2d').drawImage(img, 0, 0); return c.getContext('2d').getImageData(0, 0, img.width, img.height).data; };
  for (let run = 0; run < 3; run++) {
    await page.mouse.move(5, 450);
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await page.mouse.move(link.x, link.y);
    // The first shot when a copy is up and loaded, or 250 ms in without one.
    const t0 = Date.now();
    await page.waitForFunction(() => document.querySelector('iframe[aria-hidden="true"][sandbox]')?.contentDocument?.readyState === 'complete', null, { timeout: shotAt, polling: 'raf' }).catch(() => {});
    const waited = Date.now() - t0;
    const a = await px(await page.screenshot());
    const copyUp = await page.evaluate(() => !!document.querySelector('iframe[aria-hidden="true"][sandbox]'));
    await page.waitForTimeout(900);
    const b = await px(await page.screenshot());
    let n = 0, max = 0;
    for (let i = 0; i < a.length; i += 4) { const d = Math.max(Math.abs(a[i] - b[i]), Math.abs(a[i + 1] - b[i + 1]), Math.abs(a[i + 2] - b[i + 2])); if (d) n++; if (d > max) max = d; }
    console.log(`shots run ${run + 1}: first shot ${waited} ms into the rest, copy up ${copyUp}; ${n} px differ (max ${max})`);
  }
}
// --refetch: after the hover, fetch the page from script, as the runtime's
// warm-up does, to see whether the router's hover prefetch answers it.
if (process.argv.includes('--refetch')) {
  console.log('fetching from script');
  await page.evaluate((h) => fetch(h).then((r) => r.text()), link.href);
  await page.waitForTimeout(300);
}
await browser.close();
