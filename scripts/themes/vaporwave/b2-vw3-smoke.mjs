/**
 * B2 vw-3 self-verify smoke test: caption press, window drag + cascade
 * activation, kiosk attract loop, and the screensaver's Settings/Preview
 * cycle, on a snap build (GPU Chromium; see src/themes/README.md and
 * scripts/themes/motion.mjs for the launch pattern this copies).
 *
 * Usage (serve a snap first):
 *   BDL_GPU=1 node scripts/themes/vaporwave/b2-vw3-smoke.mjs --base http://127.0.0.1:4473
 */
import { chromium } from 'playwright';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const argOf = (name, fallback) => {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? fallback : process.argv[i + 1];
};
const base = argOf('base', 'http://127.0.0.1:4473');
const gpu = process.env.BDL_GPU === '1';

const browser = await chromium.launch({
  args: gpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] : [],
});

let failed = false;
const check = (label, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${detail ? ' - ' + detail : ''}`);
  if (!ok) failed = true;
};

async function withPage(fn) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
  });
  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(String(e)));
  await fn(page, consoleErrors);
  await context.close();
}

// GPU renderer sanity: abort on SwiftShader.
await withPage(async (page) => {
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  const renderer = await page.evaluate(() => {
    const c = document.createElement('canvas');
    const gl = c.getContext('webgl');
    const dbg = gl?.getExtension('WEBGL_debug_renderer_info');
    return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : 'no-webgl';
  });
  console.log('GPU renderer:', renderer);
  check('GPU renderer is not SwiftShader', !/swiftshader/i.test(renderer), renderer);
});

// Home: kiosk attract loop, caption press, window drag + cascade.
await withPage(async (page, errors) => {
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const btn = page.locator('[data-kiosk-attract-btn]');
  check('kiosk button is a real, labelled button', await btn.evaluate((el) => el.tagName === 'BUTTON' && !!el.getAttribute('aria-label')));
  await btn.click();
  const onDuring = await page.locator('[data-kiosk-attract-screen]').evaluate((el) => el.classList.contains('on'));
  check('attract overlay turns on after tap', onDuring);
  const linkReachable = await page.evaluate(() => {
    const a = document.querySelector('.crt-more');
    a.focus();
    return document.activeElement === a;
  });
  check('CRT link still focusable during attract', linkReachable);
  await page.waitForTimeout(5600);
  const onAfter = await page.locator('[data-kiosk-attract-screen]').evaluate((el) => el.classList.contains('on'));
  check('attract overlay turns off on its own', !onAfter);

  // Caption press: bevel inverts on pointerdown.
  const doorBar = page.locator('.door-1 .vw-win-bar').first();
  await doorBar.scrollIntoViewIfNeeded();
  const before = await doorBar.locator('.vw-win-btns .close').evaluate((el) => getComputedStyle(el).borderTopColor);
  await page.mouse.move(0, 0);
  const box = await doorBar.locator('.vw-win-btns .close').boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  const during = await doorBar.locator('.vw-win-btns .close').evaluate((el) => getComputedStyle(el).borderTopColor);
  await page.mouse.up();
  check('caption button bevel inverts on pointerdown', before !== during, `${before} -> ${during}`);

  // Window drag + cascade activation: door-0 starts inactive, dragging its
  // bar should bring it to front and make door-1 inactive instead.
  const backInactiveBefore = await page.locator('.door-0 .vw-win-bar').evaluate((el) => el.classList.contains('inactive'));
  check('door-0 starts inactive (the authored back window)', backInactiveBefore);
  await page.locator('.door-0 .vw-win-bar').scrollIntoViewIfNeeded();
  const backBar = await page.locator('.door-0 .vw-win-bar').boundingBox();
  await page.mouse.move(backBar.x + backBar.width / 2, backBar.y + backBar.height / 2);
  await page.mouse.down();
  await page.mouse.move(backBar.x + backBar.width / 2 + 60, backBar.y + backBar.height / 2 + 40, { steps: 8 });
  await page.mouse.up();
  const transform = await page.locator('.door-0').evaluate((el) => el.style.transform);
  check('dragged window carries an inline transform', /translate\(/.test(transform), transform);
  const nowActive = await page.locator('.door-0 .vw-win-bar').evaluate((el) => !el.classList.contains('inactive'));
  const otherInactive = await page.locator('.door-1 .vw-win-bar').evaluate((el) => el.classList.contains('inactive'));
  check('pressing the inactive window activates it', nowActive);
  check('its sibling goes inactive in turn', otherInactive);

  check('no console errors on Home', errors.length === 0, errors.join(' | '));
});

// Contact: screensaver Settings/Preview, canvas count, touch = no drag.
await withPage(async (page, errors) => {
  await page.goto(`${base}/t/vaporwave/contact/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(300);

  const canvasCount = await page.evaluate(() => document.querySelectorAll('canvas').length);
  const webglCanvasCount = await page.evaluate(() =>
    Array.from(document.querySelectorAll('canvas')).filter((c) => {
      try { return !!(c.getContext('webgl') || c.getContext('webgl2')); } catch { return false; }
    }).length
  );
  console.log('Contact canvases:', canvasCount, 'WebGL among them:', webglCanvasCount);
  check('at most one WebGL canvas on Contact', webglCanvasCount <= 1);

  const settings = page.locator('[data-scr-settings]');
  const preview = page.locator('[data-scr-preview-btn]');
  check('Settings is a real, labelled button', await settings.evaluate((el) => el.tagName === 'BUTTON' && !!el.getAttribute('aria-label')));
  check('Preview is a real, labelled button', await preview.evaluate((el) => el.tagName === 'BUTTON' && !!el.getAttribute('aria-label')));

  const modeOf = () => page.locator('[data-scr-settings]').getAttribute('aria-label');
  console.log('mode 0 (default):', await modeOf());
  await settings.click();
  console.log('mode 1:', await modeOf());
  const canvasOnAfter1Click = await page.locator('[data-scr-canvas]').evaluate((el) => el.classList.contains('on'));
  check('canvas turns on after Settings leaves sunset', canvasOnAfter1Click);
  await settings.click();
  console.log('mode 2:', await modeOf());
  await settings.click();
  console.log('mode 3 (back to sunset):', await modeOf());
  const canvasOffBackAtSunset = await page.locator('[data-scr-canvas]').evaluate((el) => el.classList.contains('on'));
  check('canvas turns back off at sunset', !canvasOffBackAtSunset);

  await settings.click(); // -> marble, so Preview has something to show
  await preview.click();
  await page.waitForTimeout(200);
  const fsOpen = await page.locator('[data-scr-fullscreen]').evaluate((el) => !el.hidden);
  check('Preview opens the full-window layer', fsOpen);
  await page.waitForTimeout(600);
  const fsCanvasOn = await page.locator('[data-scr-fs-canvas]').evaluate((el) => el.classList.contains('on'));
  check('the full-window canvas is drawing', fsCanvasOn);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  const fsClosed = await page.locator('[data-scr-fullscreen]').evaluate((el) => el.hidden);
  const focusBackOnPreview = await page.evaluate(() => document.activeElement?.hasAttribute('data-scr-preview-btn'));
  check('Escape closes the full-window layer', fsClosed);
  check('focus returns to Preview on close', focusBackOnPreview);

  check('no console errors on Contact', errors.length === 0, errors.join(' | '));
});

// Touch context: real touch emulation (hasTouch + isMobile flips the
// (hover: hover) and (pointer: fine) media query in Chromium), no drag,
// normal scroll.
{
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
  });
  await suppressPrompt(context);
  const page = await context.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' });
  const mediaFlipped = await page.evaluate(() => !matchMedia('(hover: hover) and (pointer: fine)').matches);
  check('touch context genuinely flips the desktop drag media query', mediaFlipped);
  const cursor = await page.locator('.door-0 .vw-win-bar').evaluate((el) => getComputedStyle(el).cursor);
  check('bar shows no grab cursor on touch', cursor !== 'grab', cursor);

  await page.locator('.door-0 .vw-win-bar').scrollIntoViewIfNeeded();
  const bar = await page.locator('.door-0 .vw-win-bar').boundingBox();
  await page.touchscreen.tap(bar.x + bar.width / 2, bar.y + bar.height / 2);
  await page.waitForTimeout(100);
  const transformAfterTap = await page.locator('.door-0').evaluate((el) => el.style.transform);
  check('a tap on the bar never leaves a drag transform', !transformAfterTap, `"${transformAfterTap}"`);

  const scrollBefore = await page.evaluate(() => window.scrollY);
  await page.mouse.wheel(0, 400);
  await page.waitForTimeout(150);
  const scrollAfter = await page.evaluate(() => window.scrollY);
  check('page scrolls normally in a touch context', scrollAfter > scrollBefore, `${scrollBefore} -> ${scrollAfter}`);
  check('no console errors in touch context', errors.length === 0, errors.join(' | '));
  await context.close();
}

await browser.close();
console.log(failed ? '\nFAILED' : '\nPASSED');
process.exit(failed ? 1 : 0);
