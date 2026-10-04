/** Probe: does every point on the hero's loose shapes hit the shape itself
    (not the billboard h1)? Port 4460, needs a fresh dist/. */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const server = await serveDist(4460, join(REPO, 'dist'));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [820, 1180], [390, 844]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'no-preference' });
    await suppressPrompt(ctx);
    const page = await ctx.newPage();
    await page.goto('http://localhost:4460/t/bauhaus/', { waitUntil: 'load' });
    await page.waitForTimeout(3500);
    const res = await page.evaluate(() => {
      const out = {};
      for (const el of document.querySelectorAll('svg.poster .loose')) {
        const r = el.getBoundingClientRect();
        let hit = 0, total = 0;
        for (let i = 1; i < 19; i++) for (let j = 1; j < 19; j++) {
          const x = r.left + (r.width * i) / 19, y = r.top + (r.height * j) / 19;
          if (!el.isPointInFill(new DOMPoint(x, y).matrixTransform(el.getScreenCTM().inverse()))) continue;
          total++;
          const t = document.elementFromPoint(x, y); if (t === el) hit++; else (out.__other ??= {})[t?.tagName + "." + (t?.getAttribute("class") || "")] = 1;
        }
        out[el.getAttribute('aria-label')] = `${hit}/${total}`;
      }
      return out;
    });
    console.log(w, JSON.stringify(res));
    await ctx.close();
  }
} finally {
  await browser.close();
  server.close?.();
}
