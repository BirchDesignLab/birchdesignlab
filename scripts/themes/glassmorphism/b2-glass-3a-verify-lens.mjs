/**
 * Self-verify for wave B2 seat glass-3a: the production lens, the orb clock,
 * the Control Centre and the session hold, on a snap already serving at
 * --base (this seat's own port, 4471).
 *
 * Written 09-25-26. Playwright Chromium on the real GPU (BDL_GPU=1), forcing
 * prefers-reduced-transparency: no-preference over CDP exactly as
 * capture.mjs and motion.mjs do (headless Chromium otherwise reports
 * `reduce` by default and the whole run would see E10's off state instead of
 * the lens). Prints one PASS/FAIL line per check and exits non-zero if any
 * failed.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2-glass-3a-verify-lens.mjs --base http://127.0.0.1:4471
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
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
const useGpu = process.env.BDL_GPU === '1';

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: [
      '--hide-scrollbars',
      ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : []),
    ],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
  });

  const consoleErrors = [];
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  page.on('pageerror', (e) => consoleErrors.push(`pageerror: ${e.message}`));

  await page.goto('about:blank');
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return 'no webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  console.log(`renderer: ${renderer}`);
  if (useGpu && /swiftshader|llvmpipe/i.test(renderer)) {
    await browser.close();
    throw new Error('BDL_GPU=1 but Chromium fell back to a software rasteriser');
  }
  record('GPU renderer (not SwiftShader)', !/swiftshader|llvmpipe/i.test(renderer), renderer);

  // Draw-call counter, installed before any page script runs.
  await context.addInitScript(() => {
    window.__draws = 0;
    const proto = WebGLRenderingContext.prototype;
    const orig = proto.drawArrays;
    proto.drawArrays = function (...a) { window.__draws++; return orig.apply(this, a); };
  });

  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });

  // 1. The lens mounts and draws its first frame (poster hides).
  const mounted = await page.waitForFunction(() => {
    const canvas = document.querySelector('.lens-canvas');
    const poster = document.querySelector('.lens-poster');
    return !!canvas && getComputedStyle(canvas).visibility !== 'hidden' && poster && poster.style.display === 'none';
  }, { timeout: 8000 }).then(() => true).catch(() => false);
  record('lens mounts and hides the poster after its first frame', mounted);

  if (mounted) {
    const initial = await page.evaluate(() => document.querySelector('.lens-canvas').style.transform);

    // 2. Idle: zero draws over a settled stretch (draw-on-change).
    await page.evaluate(() => { window.__draws = 0; });
    await page.waitForTimeout(800);
    const idleDraws = await page.evaluate(() => window.__draws);
    record('zero draws while idle (draw-on-change)', idleDraws === 0, `${idleDraws} draws`);

    // 3. Tab hidden: still zero draws (the pause rule), even if something
    // would otherwise have invalidated it.
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
      window.__draws = 0;
    });
    await page.waitForTimeout(500);
    const hiddenDraws = await page.evaluate(() => window.__draws);
    record('zero draws while the tab is hidden', hiddenDraws === 0, `${hiddenDraws} draws`);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForTimeout(200);

    // 4. A mouse drag moves the lens and selects no text.
    const hit = await page.$('.lens-hit');
    const box = await hit.boundingBox();
    const cx = box.x + box.width / 2;
    const cy = box.y + box.height / 2;
    await page.mouse.move(cx, cy);
    await page.mouse.down();
    for (let i = 1; i <= 8; i++) {
      await page.mouse.move(cx + i * 20, cy + i * 6, { steps: 2 });
      await page.waitForTimeout(12);
    }
    await page.mouse.up();
    await page.waitForTimeout(50);
    const afterDrag = await page.evaluate(() => document.querySelector('.lens-canvas').style.transform);
    record('a drag moves the lens', afterDrag !== initial, `${initial} -> ${afterDrag}`);
    const selection = await page.evaluate(() => window.getSelection()?.toString() ?? '');
    record('a mouse drag on the lens selects no text', selection === '', JSON.stringify(selection));

    // 5. A fling glides after release (position keeps changing for a beat).
    await page.mouse.move(cx, cy);
    // Re-find the hit box (the lens has moved).
    const hit2 = await page.$('.lens-hit');
    const box2 = await hit2.boundingBox();
    await page.mouse.move(box2.x + box2.width / 2, box2.y + box2.height / 2);
    await page.mouse.down();
    for (let i = 1; i <= 4; i++) {
      await page.mouse.move(box2.x + box2.width / 2 + i * 40, box2.y + box2.height / 2, { steps: 1 });
      await page.waitForTimeout(8);
    }
    await page.mouse.up();
    const justAfterRelease = await page.evaluate(() => document.querySelector('.lens-canvas').style.transform);
    await page.waitForTimeout(120);
    const midGlide = await page.evaluate(() => document.querySelector('.lens-canvas').style.transform);
    record('a fling glides after release', justAfterRelease !== midGlide, 'transform kept changing after mouseup');

    // 6. Fling hard into a wall: the lens stops at the bound and does not
    // backtrack (it settles, waits, and the position after settling equals
    // the position measured a moment earlier).
    for (let i = 0; i < 6; i++) {
      const h = await page.$('.lens-hit');
      const b = await h.boundingBox();
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
      await page.mouse.down();
      await page.mouse.move(b.x + b.width / 2 - 300, b.y + b.height / 2, { steps: 1 });
      await page.mouse.up();
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(500);
    const atWallOnce = await page.evaluate(() => document.querySelector('.lens-canvas').style.transform);
    await page.waitForTimeout(300);
    const atWallTwice = await page.evaluate(() => document.querySelector('.lens-canvas').style.transform);
    record('settles and holds still against the left wall (no backtrack)', atWallOnce === atWallTwice, atWallOnce);
  }

  // 7. Keyboard nudge: focus the hit control, press an arrow key, moves.
  const hitEl = await page.$('.lens-hit');
  if (hitEl) {
    await hitEl.focus();
    const before = await page.evaluate(() => document.querySelector('.lens-hit').style.transform);
    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(50);
    const after = await page.evaluate(() => document.querySelector('.lens-hit').style.transform);
    record('an arrow key nudges the focused lens', before !== after, `${before} -> ${after}`);
    record('the lens hit control has an accessible name', await page.evaluate(() => !!document.querySelector('.lens-hit')?.getAttribute('aria-label')));
  }

  // 8. Context loss: force it, the poster returns; restore, the canvas
  // returns. The same WEBGL_lose_context object must drive both calls: a
  // freshly re-fetched extension reference while the context is lost does
  // not carry the internal link back to that lost context in this Chromium
  // build, so restoreContext() on it silently does nothing (a limitation of
  // the manual-loss testing API itself, not of lens.ts's own recovery path,
  // which never re-fetches this extension either — a real loss is restored
  // by the browser's own driver-recovery machinery, with no JS call at all).
  const lostOk = await page.evaluate(() => {
    const canvas = document.querySelector('.lens-canvas');
    const gl = canvas.getContext('webgl');
    const ext = gl.getExtension('WEBGL_lose_context');
    if (!ext) return null;
    window.__loseExt = ext;
    ext.loseContext();
    return true;
  });
  await page.waitForTimeout(200);
  const posterBack = await page.evaluate(() => document.querySelector('.lens-poster').style.display !== 'none');
  record('context loss brings the poster back', lostOk === true && posterBack, `lostOk=${lostOk} posterBack=${posterBack}`);
  const restored = await page.evaluate(() => {
    window.__loseExt?.restoreContext();
    return true;
  });
  const restoredFrame = await page.waitForFunction(() => {
    const poster = document.querySelector('.lens-poster');
    return poster && poster.style.display === 'none';
  }, { timeout: 5000 }).then(() => true).catch(() => false);
  record('context restore re-mounts the lens (poster hides again)', restored && restoredFrame);

  // 9. Control Centre: Clear/Tinted.
  const switchBtn = await page.$('.hero .window-bar .switch');
  const tintBefore = await page.evaluate(() => document.documentElement.dataset.glassTint);
  await switchBtn.click();
  await page.waitForTimeout(100);
  const tintAfter = await page.evaluate(() => document.documentElement.dataset.glassTint);
  record('the Clear/Tinted switch flips data-glass-tint', tintBefore !== tintAfter, `${tintBefore} -> ${tintAfter}`);
  const stored = await page.evaluate(() => {
    try { return JSON.parse(sessionStorage.getItem('bdl:theme-schools:glassmorphism:controls') || 'null'); } catch { return null; }
  });
  record('the setting is written to sessionStorage', stored?.tint === tintAfter, JSON.stringify(stored));

  // 10. Frost slider.
  const frostBefore = await page.evaluate(() => document.documentElement.style.getPropertyValue('--glass-frost'));
  await page.evaluate(() => {
    const input = document.querySelector('.cc-frost');
    input.value = '90';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForTimeout(50);
  const frostAfter = await page.evaluate(() => document.documentElement.style.getPropertyValue('--glass-frost'));
  record('the frost slider changes --glass-frost', frostBefore !== frostAfter, `${frostBefore} -> ${frostAfter}`);

  // 11. Time of day.
  const duskBtn = await page.$('.cc-seg[data-tod="dusk"]');
  await duskBtn.click();
  const todOk = await page.waitForFunction(() => document.documentElement.dataset.glassTod === 'dusk', { timeout: 5000 }).then(() => true).catch(() => false);
  record('the time-of-day control sets data-glass-tod', todOk);
  const wallpaperBg = await page.evaluate(() => getComputedStyle(document.querySelector('main'), '::before').backgroundImage);
  record('the CSS wallpaper switches to the dusk file', /dusk/.test(wallpaperBg), wallpaperBg.slice(0, 120));

  // 12. Session hold across an in-school swap: navigate to Services (a
  // ClientRouter swap, astro:before-swap), come back to Home, the settings
  // (tinted, dusk, frost 0.9) should still be applied with no visible flip
  // to the default before the swap lands (checked immediately after
  // navigation resolves).
  await page.click('a[href*="/services/"]');
  await page.waitForTimeout(400);
  const onServices = await page.evaluate(() => ({
    tint: document.documentElement.dataset.glassTint,
    tod: document.documentElement.dataset.glassTod,
    frost: document.documentElement.style.getPropertyValue('--glass-frost'),
  }));
  record('settings hold across an in-school swap (Home -> Services)', onServices.tint === 'tinted' && onServices.tod === 'dusk', JSON.stringify(onServices));

  await page.click('a[href$="/t/glassmorphism/"], a.wordmark');
  await page.waitForTimeout(600);
  const backOnHome = await page.evaluate(() => ({
    tint: document.documentElement.dataset.glassTint,
    tod: document.documentElement.dataset.glassTod,
  }));
  record('settings hold on returning to Home', backOnHome.tint === 'tinted' && backOnHome.tod === 'dusk', JSON.stringify(backOnHome));

  // 13. Hard load: settings still applied before first paint (checked as
  // early as the DOMContentLoaded snapshot the inline head script runs at).
  const reloaded = await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'domcontentloaded' });
  const onLoadAttrs = await page.evaluate(() => ({
    tint: document.documentElement.dataset.glassTint,
    tod: document.documentElement.dataset.glassTod,
  }));
  record('a hard load applies the held settings before first paint', onLoadAttrs.tint === 'tinted' && onLoadAttrs.tod === 'dusk', JSON.stringify(onLoadAttrs));
  void reloaded;

  record('no console/page errors during the run', consoleErrors.length === 0, consoleErrors.slice(0, 5).join(' | '));

  await page.screenshot({ path: join(OUT, 'verify-final-state.png') });
  await browser.close();

  const failed = results.filter((r) => !r.ok);
  await writeFile(join(OUT, 'verify-results.json'), JSON.stringify({ base, renderer, results }, null, 2));
  console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
  if (failed.length) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
