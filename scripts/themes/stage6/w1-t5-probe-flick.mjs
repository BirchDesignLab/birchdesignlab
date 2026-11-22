/**
 * Probe: a fast mouse flick off a colour bar must not leave the bar stuck.
 * Round 1 fix for critic C1. Needs a built dist. node w1-t5-probe-flick.mjs
 * Cases: flick + up outside + hover; flick, hover, then Again; plain click after.
 */
import { chromium } from 'playwright';
import { serveDist } from '../lib/serve-dist.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';
const server = await serveDist(4470);
const browser = await chromium.launch({ args: ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'no-preference' });
await suppressPrompt(ctx);
const page = await ctx.newPage();
await page.goto('http://127.0.0.1:4470/t/bauhaus/about/', { waitUntil: 'networkidle' });
await page.locator('[data-quiz]').scrollIntoViewIfNeeded();
await page.waitForTimeout(1500);
const state = () => page.evaluate(() => {
  const b = document.querySelector('[data-pick=red]');
  return { held: b.hasAttribute('data-held'), tr: b.style.translate, pe: getComputedStyle(b).pointerEvents };
});
let ok = true;
const check = (label, s, want) => { const pass = !s.held && s.pe !== 'none' && (s.tr === '' || s.tr === '0px 0px'); console.log(pass === want ? 'ok ' : 'FAIL', label, JSON.stringify(s)); if (pass !== want) ok = false; };

const box = await page.locator('[data-pick=red]').boundingBox();
const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
// Case 1: down, one big move up, up, then hover with no button.
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx, cy - 200);
await page.mouse.up();
await page.mouse.move(cx + 4, cy - 195);
await page.mouse.move(cx + 40, cy - 190);
await page.waitForTimeout(500);
check('flick, up outside, hover', await state(), true);

// Case 2: down, big move, then buttons released outside the page with no pointerup seen: hover back over the bar.
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx, cy - 200);
await page.evaluate(() => { document.querySelector('[data-pick=red]').releasePointerCapture?.(1); });
await page.mouse.up();
await page.mouse.move(cx, cy);
await page.mouse.move(cx + 10, cy + 3);
await page.waitForTimeout(500);
check('flick then hover back over bar', await state(), true);

// Case 3: plain click on the bar still selects it.
await page.locator('[data-pick=red]').click();
console.log('pressed after click:', await page.locator('[data-pick=red]').getAttribute('aria-pressed'));
if ((await page.locator('[data-pick=red]').getAttribute('aria-pressed')) !== 'true') ok = false;

// Case 4: a real drag onto a shape still fills.
const sh = await page.locator('[data-shape=triangle]').boundingBox();
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move((cx + sh.x + sh.width / 2) / 2, (cy + sh.y + sh.height / 2) / 2, { steps: 6 });
await page.mouse.move(sh.x + sh.width / 2, sh.y + sh.height / 2, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(500);
const label = await page.locator('[data-shape=triangle]').getAttribute('aria-label');
console.log('triangle after drag:', label);
if (!/red/i.test(label || '')) ok = false;

// Case 5: held state then Again clears it.
await page.evaluate(() => { const b = document.querySelector('[data-pick=red]'); b.setAttribute('data-held', ''); b.style.translate = '30px 2px'; });
await page.locator('.btn', { hasText: 'again' }).first().evaluate((el) => el.click());
await page.waitForTimeout(300);
check('Again clears stuck bar', await state(), true);

console.log(ok ? 'ALL OK' : 'SOME FAILED');
await browser.close(); server.close(); process.exit(ok ? 0 : 1);
