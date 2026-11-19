/**
 * Stage 6 glass lens diagnosis, part 3: the lens is position: fixed, the
 * panes scroll. At each scroll position (no drag at all), what fraction of
 * the lens disc is grabbable (elementFromPoint is the hit button)?
 * Usage: node scripts/themes/snap.mjs --name stage6-base --reuse --port 4462 -- node scripts/themes/stage6/glass-diag-scroll.mjs
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
const R = {};
for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768]]) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: 'light', reducedMotion: 'no-preference' });
  await suppressPrompt(context);
  const page = await context.newPage();
  // This machine's Windows has Transparency effects off, which Chromium reports
  // as prefers-reduced-transparency: reduce (the lens is then display:none).
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 8000 }).catch(() => {});
  const max = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const rows = [];
  for (let y = 0; y <= max; y += 150) {
    await page.evaluate((y) => scrollTo(0, y), y);
    await page.waitForTimeout(150);
    rows.push(await page.evaluate(() => {
      const hit = document.querySelector('.lens-hit');
      const q = hit.getBoundingClientRect();
      const cx = q.left + q.width / 2, cy = q.top + q.height / 2, r = q.width / 2;
      let n = 0, on = 0;
      for (let y = -r; y <= r; y += 8) for (let x = -r; x <= r; x += 8) { if (x * x + y * y > r * r) continue; n++; if (document.elementFromPoint(cx + x, cy + y) === hit) on++; }
      return { scrollY: Math.round(scrollY), c: [Math.round(cx), Math.round(cy)], grabbable: +(on / n).toFixed(2) };
    }));
  }
  R[`${w}x${h}`] = { start: rows[0]?.c, fullyCovered: rows.filter((r) => r.grabbable === 0).map((r) => r.scrollY), rows };
  await context.close();
}
await browser.close();
await writeFile(join(OUT, 'scroll-results.json'), JSON.stringify(R, null, 2));
for (const [k, v] of Object.entries(R)) console.log(k, 'start', v.start, 'fully covered at scrollY', v.fullyCovered.join(','), '| grabbable:', v.rows.map((r) => r.grabbable).join(' '));
