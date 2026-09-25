/** Opus re-critic (09-25-26, B1 vaporwave): Home kiosk prop and About
    centrepiece at 2x with every position:fixed element (portal chrome,
    toast) hidden, so the stand-in stills can be judged against their bases.
    Usage: node scripts/themes/vaporwave/b1-recritic-kiosk.mjs <base> */
import { chromium } from 'playwright';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-vw-recritic', 'views');
const BASE = process.argv[2] || 'http://127.0.0.1:4472';
const browser = await chromium.launch({ args: ['--hide-scrollbars'] });
for (const [vpn, vp] of [['desktop', { width: 1440, height: 900 }], ['tablet', { width: 1000, height: 900 }]]) {
  for (const scheme of ['dark', 'light']) {
    const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: 2, colorScheme: scheme });
    const p = await ctx.newPage();
    await p.goto(BASE + '/t/vaporwave/', { waitUntil: 'networkidle' });
    await p.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } });
    await p.evaluate(() => { for (const e of document.querySelectorAll('body *')) if (getComputedStyle(e).position === 'fixed') e.style.visibility = 'hidden'; });
    const prop = p.locator('.kiosk-prop').first();
    await prop.evaluate((e) => e.scrollIntoView({ block: 'center' }));
    await p.waitForTimeout(400);
    const b = await prop.boundingBox();
    await p.screenshot({ path: join(OUT, `kiosk__${vpn}__${scheme}.png`), clip: { x: Math.max(0, b.x - 360), y: b.y - 200, width: Math.min(vp.width - Math.max(0, b.x - 360), b.width + 380), height: b.height + 320 } });
    await ctx.close();
  }
}
await browser.close();
