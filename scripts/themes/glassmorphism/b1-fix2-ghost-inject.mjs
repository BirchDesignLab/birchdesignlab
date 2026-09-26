/**
 * Wave B1 glass fix round 2 (09-25-26): does any pane still let what lies
 * under it read through its frost? The header ghost showed that with the
 * bevel url() in front of the list the blur lost alpha toward the rims and
 * the unfiltered backdrop showed through. Only the header has text under it
 * in practice, so this puts text under every pane on purpose: for each
 * .glass/.glass-strong pane in view on each page, it lays a block of dark
 * high-contrast text exactly under the pane (absolute, in main or the
 * footer, below the pane in z order), hides the pane's own content, and
 * measures the high-frequency energy (sharpness) of the pane's whole box,
 * rims included, as built and again with the url() stripped from the inline
 * backdrop-filter (the plain frosted list). ratio = built / stripped; about
 * 1 means the bevel costs no frost. The header is measured too (it carries
 * no url() now, so both shots are the frosted list).
 * prefers-reduced-transparency is forced to no-preference over CDP.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b1-fix2-ghost-inject.mjs
 *   [--base URL] [--scheme light|dark] [--vw 1440 --vh 900] [--tag name]
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? d : process.argv[i + 1]; };
const BASE = arg('base', process.env.SNAP_BASE || 'http://127.0.0.1:4471');
const scheme = arg('scheme', 'light');
const vw = Number(arg('vw', '1440'));
const vh = Number(arg('vh', '900'));
const tag = arg('tag', 'ghost');
const OUT = join(HERE, '..', '.out', 'b1-glass-fix2', `${tag}-${scheme}-${vw}`);
await mkdir(OUT, { recursive: true });
const gpu = process.env.BDL_GPU === '1';
if (!gpu) console.warn('BDL_GPU is not 1: SwiftShader is a failure for this probe');
const browser = await chromium.launch({ args: ['--hide-scrollbars', ...(gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])] });
const c = await browser.newContext({ viewport: { width: vw, height: vh }, colorScheme: scheme, deviceScaleFactor: 1 });
await c.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('bdl-switcher-prompt', 'dismissed'); } catch {} }, scheme);
await c.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await c.newPage();
const cdp = await c.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
const an = await browser.newPage();
const sharpness = (b64) => an.evaluate(async (x) => {
  const i = new Image(); i.src = 'data:image/png;base64,' + x; await i.decode();
  const cv = document.createElement('canvas'); cv.width = i.width; cv.height = i.height; const g = cv.getContext('2d'); g.drawImage(i, 0, 0);
  const D = g.getImageData(0, 0, i.width, i.height); const L = (k) => 0.3 * D.data[k] + 0.59 * D.data[k + 1] + 0.11 * D.data[k + 2];
  let h = 0, n = 0;
  for (let y = 1; y < D.height - 1; y++) for (let x = 1; x < D.width - 1; x++) { const k = (y * D.width + x) * 4; h += Math.abs(4 * L(k) - L(k - 4) - L(k + 4) - L(k - 4 * D.width) - L(k + 4 * D.width)); n++; }
  return +(h / n).toFixed(3);
}, b64);

const rows = [];
for (const path of ['/t/glassmorphism/', '/t/glassmorphism/about/', '/t/glassmorphism/services/', '/t/glassmorphism/contact/', '/t/glassmorphism/contact/sent/']) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2200); // the bevel lands at idle after load
  const docH = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  for (const frac of [0, 0.5, 1]) {
    await page.evaluate((y) => scrollTo(0, y), Math.round(docH * frac));
    await page.waitForTimeout(500);
    await page.evaluate(() => document.getAnimations().forEach((a) => a.pause()));
    const n = await page.evaluate(() => document.querySelectorAll('.glass, .glass-strong').length);
    for (let i = 0; i < n; i++) {
      const box = await page.evaluate((i) => {
        const el = document.querySelectorAll('.glass, .glass-strong')[i];
        const r = el.getBoundingClientRect();
        if (r.width < 60 || r.height < 30 || r.top < 0 || r.bottom > innerHeight || r.left < 0 || r.right > innerWidth) return null;
        return { x: r.x, y: r.y, w: r.width, h: r.height, cls: el.className, bf: el.style.backdropFilter };
      }, i);
      if (!box || rows.some((r) => r.path === path && r.cls === box.cls && r.i === i)) continue;
      await page.evaluate(([i]) => {
        const el = document.querySelectorAll('.glass, .glass-strong')[i];
        const r = el.getBoundingClientRect();
        const t = document.createElement('div');
        t.id = '__ghost';
        t.textContent = 'GHOST TEXT UNDER THE PANE '.repeat(60);
        t.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;overflow:hidden;font:700 22px/1.2 sans-serif;color:#000;background:#fff;z-index:0;pointer-events:none;word-break:break-all;`;
        // Under the pane: inside the pane's own stacking parent, before it.
        el.parentElement.insertBefore(t, el);
        for (const k of el.children) k.style.visibility = 'hidden';
      }, [i]);
      await page.waitForTimeout(200);
      const clip = { x: box.x, y: box.y, width: box.w, height: box.h };
      const built = (await page.screenshot({ clip })).toString('base64');
      const saved = await page.evaluate((i) => { const el = document.querySelectorAll('.glass, .glass-strong')[i]; const v = el.style.backdropFilter; el.style.backdropFilter = v.replace(/url\([^)]*\)\s*/g, ''); return v; }, i);
      await page.waitForTimeout(200);
      const plain = (await page.screenshot({ clip })).toString('base64');
      await page.evaluate(([i, v]) => { const el = document.querySelectorAll('.glass, .glass-strong')[i]; el.style.backdropFilter = v; for (const k of el.children) k.style.visibility = ''; document.getElementById('__ghost')?.remove(); }, [i, saved]);
      const sb = await sharpness(built);
      const sp = await sharpness(plain);
      const row = { path, frac, i, cls: box.cls, hasUrl: /url\(/.test(box.bf), sharpBuilt: sb, sharpPlain: sp, ratio: +(sb / Math.max(sp, 0.001)).toFixed(2) };
      rows.push(row);
      console.log(JSON.stringify(row));
      if (row.ratio > 1.3) await writeFile(join(OUT, `ghost-${path.replace(/\W+/g, '-')}-${i}.png`), Buffer.from(built, 'base64'));
    }
    await page.evaluate(() => document.getAnimations().forEach((a) => a.play()));
  }
}
const worst = rows.reduce((a, r) => (r.ratio > a ? r.ratio : a), 0);
console.log('panes', rows.length, 'worst ratio', worst);
await writeFile(join(OUT, 'report.json'), JSON.stringify({ rows, worst }, null, 1));
await browser.close();
