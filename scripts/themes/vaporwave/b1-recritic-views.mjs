/** Opus re-critic viewport shots (09-25-26, B1 vaporwave): Services intro
    kana column, Home opener, About temple, Home kiosk with the portal chrome
    hidden, at desktop, for one base URL. Compare two runs (base vs fixed).
    Usage: BDL_GPU=1 node scripts/themes/vaporwave/b1-recritic-views.mjs <base> <label> */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = process.argv[2]; const LABEL = process.argv[3] || 'x';
const OUT = join(HERE, '..', '.out', 'b1-vw-recritic', 'views');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
for (const vp of [{ n: 'desktop', width: 1440, height: 900 }, { n: 'phone', width: 390, height: 844 }]) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 1, colorScheme: 'dark' });
  const p = await ctx.newPage();
  for (const [name, path, sel] of [['services', '/t/vaporwave/services/', '.intro-kana'], ['home-opener', '/t/vaporwave/', '.opener-kana'], ['home-kiosk', '/t/vaporwave/', '.kiosk'], ['about', '/t/vaporwave/about/', '.centerpiece']]) {
    await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.addStyleTag({ content: '[class*=portal], [data-portal], .portal-switcher, [class*=wall-label], [class*=toast]{visibility:hidden!important}' }).catch(() => {});
    const el = p.locator(sel).first();
    if (!(await el.count())) { console.log('missing', name, vp.n); continue; }
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } });
    await el.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(500);
    const r = await el.evaluate((e) => { const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, sw: e.scrollWidth, sh: e.scrollHeight }; });
    console.log(LABEL, vp.n, name, JSON.stringify(r));
    await p.screenshot({ path: join(OUT, `${LABEL}__${vp.n}__${name}.png`) });
  }
  await ctx.close();
}
await browser.close();
