/** Probe: the swiss grid key. Hold (pointer and Space) shows 12/6/4 guides and releasing hides them; the key clears the portal switcher. Port 4460. */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OUT = join(REPO, 'scripts/themes/.out/stage4/task-4/key');
mkdirSync(OUT, { recursive: true });
const server = await serveDist(4460, join(REPO, 'dist'));
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
try {
  for (const [w, h, mob] of [[1440, 900, 0], [1024, 768, 0], [820, 1180, 0], [390, 844, 1], [360, 800, 1]]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: w, height: h }, isMobile: !!mob, hasTouch: !!mob, colorScheme: scheme, reducedMotion: 'no-preference' });
      await suppressPrompt(ctx);
      await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
      const p = await ctx.newPage();
      await p.emulateMedia({ colorScheme: scheme, reducedTransparency: 'no-preference' });
      await p.goto('http://127.0.0.1:4460/t/swiss/', { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      const key = p.locator('[data-sw-grid-key]');
      const kb = await key.boundingBox();
      const sw = await p.evaluate(() => { const s = document.querySelector('bdl-switcher'); const inner = s?.shadowRoot?.querySelector('.bar, nav, div'); const b = (inner || s)?.getBoundingClientRect(); return b && { l: Math.round(b.left), r: Math.round(b.right), t: Math.round(b.top), b: Math.round(b.bottom) }; });
      const vis = () => p.evaluate(() => { const g = document.querySelector('[data-sw-guides]'); return { hidden: g.hidden, bars: [...g.children].filter((c) => getComputedStyle(c).display !== 'none').length }; });
      const rest = await vis();
      await p.mouse.move(kb.x + 20, kb.y + 20); await p.mouse.down();
      const held = await vis();
      if (scheme === 'light' || w === 390) await p.screenshot({ path: join(OUT, `held-${scheme}-${w}.png`) });
      await p.mouse.up();
      const rel = await vis();
      await key.focus(); await p.keyboard.down('Space');
      const kheld = await vis(); await p.keyboard.up('Space');
      const krel = await vis();
      console.log(w, scheme, JSON.stringify({ key: kb && [kb.x, kb.y, kb.width, kb.height], switcher: sw, rest, held, rel, kheld, krel }));
      await ctx.close();
    }
  }
} finally { await browser.close(); server.close?.(); }
