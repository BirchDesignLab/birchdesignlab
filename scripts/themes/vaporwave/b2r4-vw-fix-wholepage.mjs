/**
 * Vaporwave B2 fix round 4, seat vw-fix-r4: a whole-page sanity sheet for
 * Home (desktop and phone, both schemes) after the kiosk attract-loop
 * layout change (.attract-content in Home.astro/theme.css) -- a layout
 * change inside the kiosk needs a before/after look at the WHOLE page, not
 * only the touched element, per this wave's own lesson (round 3's lens fix
 * hid every orb on Home; only a whole-page sheet caught it).
 *
 * Usage (serve a snap first):
 *   BDL_GPU=1 node scripts/themes/vaporwave/b2r4-vw-fix-wholepage.mjs --base http://127.0.0.1:4475
 * Outputs: scripts/themes/.out/stage3-b2/vw-fix-r4/
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'vw-fix-r4');
await mkdir(OUT, { recursive: true });
const argOf = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i === -1 ? f : process.argv[i + 1]; };
const base = argOf('base', 'http://127.0.0.1:4475');

const gpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({ args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [] });

for (const [name, w, h, mobile] of [['desktop', 1440, 900, false], ['phone', 390, 844, true]]) {
  for (const scheme of ['dark', 'light']) {
    const context = await browser.newContext({
      viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1,
      isMobile: mobile, hasTouch: mobile, colorScheme: scheme,
    });
    await suppressPrompt(context);
    await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const buf = await page.screenshot({ fullPage: true });
    await writeFile(join(OUT, `r4-wholepage-after__${scheme}__${name}.png`), buf);
    console.log(`wrote r4-wholepage-after__${scheme}__${name}.png`);
    await context.close();
  }
}
await browser.close();
