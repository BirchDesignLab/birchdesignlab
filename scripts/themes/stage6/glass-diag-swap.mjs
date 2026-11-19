/**
 * Stage 6 glass lens diagnosis, part 2: after an in-school swap (Home ->
 * About -> Home) two .lens-hit buttons exist. Where are they, which one is
 * live, and how many lens canvases are drawing? Logs every mount/teardown
 * via a MutationObserver on .lens-host children.
 * Usage: node scripts/themes/snap.mjs --name stage6-base --reuse --port 4462 -- node scripts/themes/stage6/glass-diag-swap.mjs
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6-glass-diag');
await mkdir(OUT, { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4462';
const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedMotion: 'no-preference' });
await context.addInitScript(() => { try { localStorage.setItem('scheme', 'light'); } catch {} });
await suppressPrompt(context);
await context.addInitScript(() => {
  window.__log = [];
  const t0 = performance.now();
  const log = (m) => window.__log.push(`${Math.round(performance.now() - t0)} ${m}`);
  window.__l = log;
  for (const ev of ['astro:before-preparation', 'astro:after-preparation', 'astro:before-swap', 'astro:after-swap', 'astro:page-load']) document.addEventListener(ev, () => log(`${ev} ${location.pathname} hits=${document.querySelectorAll('.lens-hit').length}`));
  new MutationObserver((recs) => {
    for (const r of recs) for (const n of [...r.addedNodes, ...r.removedNodes]) {
      if (n.nodeType === 1 && (n.classList.contains('lens-hit') || n.classList.contains('lens-canvas'))) log(`${r.addedNodes.length && [...r.addedNodes].includes(n) ? '+' : '-'}${n.className} in ${n.parentElement?.id || r.target.id || r.target.tagName} connected=${document.contains(r.target)}`);
    }
  }).observe(document, { childList: true, subtree: true });
});
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
const R = {};
await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1500);
const nav = async (re, sel) => { await page.click(sel); await page.waitForURL(re, { timeout: 8000 }).catch(() => {}); await page.waitForTimeout(2500); };
await nav(/about\/$/, '.site-header a[href$="/t/glassmorphism/about/"]');
await nav(/glassmorphism\/$/, '.site-header a[href$="/t/glassmorphism/"]');
R.afterOneRound = await page.evaluate(() => ({
  hits: [...document.querySelectorAll('.lens-hit')].map((h) => ({ parent: h.parentElement?.id, t: h.style.transform, inBody: document.body.contains(h) })),
  canvases: [...document.querySelectorAll('.lens-canvas')].map((c) => ({ vis: c.style.visibility, t: c.style.transform })),
  hosts: document.querySelectorAll('#glass-lens-host').length,
  posters: [...document.querySelectorAll('.lens-poster')].map((p) => p.style.display),
}));
await page.screenshot({ path: join(OUT, 'swap2__after-one-round.png') });
// drag the visible one, then see what stays behind
const c = await page.evaluate(() => { const q = [...document.querySelectorAll('.lens-hit')].at(-1).getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; });
await page.mouse.move(c[0], c[1]); await page.mouse.down();
for (let i = 1; i <= 10; i++) { await page.mouse.move(c[0] + 15 * i, c[1] + 25 * i); await page.waitForTimeout(16); }
await page.mouse.up(); await page.waitForTimeout(800);
R.afterDrag = await page.evaluate(() => [...document.querySelectorAll('.lens-hit')].map((h) => h.style.transform));
await page.screenshot({ path: join(OUT, 'swap2__after-drag.png') });
// a second round
await nav(/services\/$/, '.site-header a[href$="/t/glassmorphism/services/"]');
await nav(/glassmorphism\/$/, '.site-header a[href$="/t/glassmorphism/"]');
R.afterTwoRounds = await page.evaluate(() => ({ hits: document.querySelectorAll('.lens-hit').length, canvases: [...document.querySelectorAll('.lens-canvas')].map((c) => c.style.visibility) }));
R.log = await page.evaluate(() => window.__log);
await browser.close();
await writeFile(join(OUT, 'swap-results.json'), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 1));
