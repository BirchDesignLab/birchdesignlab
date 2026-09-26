/**
 * Founder stills for wave B2 seat glass-3a: the production lens and Control
 * Centre across Clear/Tinted, light/dark, desktop/phone, and the E10 off
 * state. GPU Chromium, prefers-reduced-transparency forced to no-preference
 * (except the E10 still, which is the point of that one).
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2-glass-3a-stills.mjs --base http://127.0.0.1:4471
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'glass-3a');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const base = arg('base', 'http://127.0.0.1:4471');

async function withPage(browser, { viewport, colorScheme, reducedTransparency = 'no-preference', hasTouch = false }, fn) {
  const context = await browser.newContext({
    viewport,
    deviceScaleFactor: hasTouch ? 2 : 1,
    isMobile: hasTouch,
    hasTouch,
    colorScheme,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: reducedTransparency }],
  });
  await fn(page);
  await context.close();
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  });

  // Clear/Tinted x light/dark, desktop, lens settled in its start position.
  for (const scheme of ['light', 'dark']) {
    await withPage(browser, { viewport: { width: 1440, height: 900 }, colorScheme: scheme }, async (page) => {
      await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('.lens-poster').style.display === 'none', { timeout: 8000 }).catch(() => {});
      await page.waitForTimeout(300);
      await page.screenshot({ path: join(OUT, `still__${scheme}__clear.png`) });
      await page.click('.hero .window-bar .switch');
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(OUT, `still__${scheme}__tinted.png`) });
    });
  }

  // Dawn / dusk (light scheme).
  for (const tod of ['dawn', 'dusk']) {
    await withPage(browser, { viewport: { width: 1440, height: 900 }, colorScheme: 'light' }, async (page) => {
      await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => document.querySelector('.lens-poster').style.display === 'none', { timeout: 8000 }).catch(() => {});
      await page.click(`.cc-seg[data-tod="${tod}"]`);
      await page.waitForFunction((t) => document.documentElement.dataset.glassTod === t, tod, { timeout: 5000 }).catch(() => {});
      await page.waitForTimeout(400);
      await page.screenshot({ path: join(OUT, `still__light__${tod}.png`) });
    });
  }

  // Phone, touch, lens and Control Centre.
  await withPage(browser, { viewport: { width: 390, height: 844 }, colorScheme: 'light', hasTouch: true }, async (page) => {
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => document.querySelector('.lens-poster').style.display === 'none', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, 'still__phone__hero.png') });
    // A touch drag: does not scroll the page.
    const before = await page.evaluate(() => window.scrollY);
    const hit = await page.$('.lens-hit');
    const box = await hit.boundingBox();
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 - i * 15, { steps: 2 });
      await page.waitForTimeout(10);
    }
    await page.mouse.up();
    await page.waitForTimeout(150);
    const after = await page.evaluate(() => window.scrollY);
    console.log(`phone drag scroll check: before=${before} after=${after} (should be equal)`);
    await page.screenshot({ path: join(OUT, 'still__phone__after-drag.png') });
  });

  // The E10 off state: reduced transparency, the real default this browser
  // gives without emulation, so no override at all this time.
  await withPage(browser, { viewport: { width: 1440, height: 900 }, colorScheme: 'light', reducedTransparency: 'reduce' }, async (page) => {
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const state = await page.evaluate(() => ({
      posterDisplay: getComputedStyle(document.querySelector('.lens-poster')).display,
      hitDisplay: getComputedStyle(document.querySelector('.lens-hit')).display,
    }));
    console.log('E10 off state:', JSON.stringify(state));
    await page.screenshot({ path: join(OUT, 'still__e10-off-state.png') });
  });

  await browser.close();
  console.log(`Stills written to ${OUT}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
