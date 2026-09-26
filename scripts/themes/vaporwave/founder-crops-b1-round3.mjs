/** Founder crops, B1 fix round 3 cleanup seat (09-25-26): re-make the
 * after-only detail crops that this round's fixes touch, into the existing
 * scripts/themes/.out/stage3-b1/vaporwave-final/ sheet folder (index.md
 * documents the whole set; this script only remakes crop-kiosk__*,
 * crop-sent-desktop__* and crop-closer-to-footer__*, plus two new tablet
 * kiosk crops).
 *
 * Forces prefers-reduced-transparency: no-preference over CDP (house rule),
 * GPU ANGLE args (BDL_GPU=1).
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/vaporwave/founder-crops-b1-round3.mjs [base]
 * Output: scripts/themes/.out/stage3-b1/vaporwave-final/
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b1', 'vaporwave-final');
const BASE = process.argv[2] || process.env.SNAP_BASE || 'http://127.0.0.1:4472';
await mkdir(OUT, { recursive: true });

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

async function newCtx(vp, scheme, dsf = 2) {
  const ctx = await browser.newContext({ viewport: vp, deviceScaleFactor: dsf, colorScheme: scheme });
  // The switcher's first-load prompt would otherwise sit over the last
  // ~150px of every page (portal-prompt.mjs), covering exactly the tail
  // these crops need to show clean.
  await suppressPrompt(ctx);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  return { ctx, p };
}
async function load(p, path) {
  await p.goto(BASE + path, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  // The fixed switcher bar draws over whatever screen position it occupies
  // regardless of any screenshot clip; hide it so it never sits on top of
  // the kiosk sphere or the footer's tail in these founder crops.
  await p.addStyleTag({ content: 'bdl-switcher { display: none !important; }' });
  await p.waitForTimeout(250);
}
/* .kiosk-prop overflows .kiosk's own flow box (translateY(25.8%) on an
   absolutely positioned child, same as the stand foot's own cast shadow),
   so `locator.screenshot()` - which clips to the element's own bounding
   box - cuts the sphere and its shadow off at the bottom. A manual
   viewport clip, padded past both the element and its own box, keeps the
   overflow the real browser shows. */
async function shotPadded(p, sel, path, vpw, pad = 40, padBottom = pad) {
  const el = p.locator(sel).first();
  await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(150);
  const b = await el.boundingBox();
  const x = Math.max(0, b.x - pad), y = Math.max(0, b.y - pad);
  await p.screenshot({ path, type: 'jpeg', quality: 92, clip: { x, y, width: Math.min(vpw - x, b.width + 2 * pad), height: b.height + pad + padBottom } });
}

const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 820, height: 1180 };

for (const scheme of ['dark', 'light']) {
  // ---- crop-kiosk (desktop, existing name)
  {
    const { ctx, p } = await newCtx(DESKTOP, scheme);
    await load(p, '/t/vaporwave/');
    await shotPadded(p, '.kiosk', join(OUT, `crop-kiosk__${scheme}.jpg`), DESKTOP.width, 40, 70);
    await ctx.close();
  }
  // ---- crop-kiosk-tablet (new)
  {
    const { ctx, p } = await newCtx(TABLET, scheme);
    await load(p, '/t/vaporwave/');
    await shotPadded(p, '.kiosk', join(OUT, `crop-kiosk-tablet__${scheme}.jpg`), TABLET.width, 40, 70);
    await ctx.close();
  }
  // ---- crop-sent-desktop (existing name): whole Sent page, full height
  {
    const { ctx, p } = await newCtx(DESKTOP, scheme);
    await load(p, '/t/vaporwave/contact/sent/');
    await p.screenshot({ path: join(OUT, `crop-sent-desktop__${scheme}.jpg`), type: 'jpeg', quality: 92, fullPage: true });
    await ctx.close();
  }
  // ---- crop-closer-to-footer (existing name): Home's closer lobby floor
  // running into the footer, no flat band, no second stacked floor.
  {
    const { ctx, p } = await newCtx(DESKTOP, scheme);
    await load(p, '/t/vaporwave/');
    const box = await p.evaluate(() => {
      const closer = document.querySelector('.closer');
      const tail = document.querySelector('[data-portal-tail]');
      const top = closer.getBoundingClientRect().top + window.scrollY;
      const bottom = tail.getBoundingClientRect().bottom + window.scrollY;
      return { top, bottom };
    });
    await p.evaluate((y) => window.scrollTo(0, y), Math.max(0, box.top - 40));
    await p.waitForTimeout(200);
    const clipTop = await p.evaluate(() => window.scrollY);
    await p.screenshot({
      path: join(OUT, `crop-closer-to-footer__${scheme}.jpg`), type: 'jpeg', quality: 92,
      clip: { x: 0, y: 0, width: DESKTOP.width, height: Math.min(DESKTOP.height, box.bottom - clipTop + 20) },
    });
    await ctx.close();
  }
  console.log(`done: ${scheme}`);
}

await browser.close();
