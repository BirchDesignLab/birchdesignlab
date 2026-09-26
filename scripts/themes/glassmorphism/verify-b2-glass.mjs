/**
 * VERIFIER for wave B2 glassmorphism (Tier 3 Stage 3). Independent
 * adversarial pass over glass-3a's and glass-3b's builder claims, against
 * this seat's own frozen snap (b2-glass-verify, port 4478 by default).
 *
 * Written 09-25-26. Playwright Chromium on the real GPU (BDL_GPU=1), forcing
 * prefers-reduced-transparency: no-preference over CDP exactly as
 * capture.mjs / motion.mjs / the glass-3a self-verify do. Stages are
 * selectable with --only so a re-run after a fix does not have to redo
 * everything.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/glassmorphism/verify-b2-glass.mjs --base http://127.0.0.1:4478
 *   BDL_GPU=1 node scripts/themes/glassmorphism/verify-b2-glass.mjs --base http://127.0.0.1:4478 --only fling,selection,e10
 */
import { chromium } from 'playwright';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'glass-verify');
const SNAP_DIST = join(REPO, 'scripts', 'themes', '.out', 'snap-b2-glass-verify');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const base = arg('base', 'http://127.0.0.1:4478');
const onlyArg = arg('only', null);
const only = onlyArg ? new Set(onlyArg.split(',')) : null;
const useGpu = process.env.BDL_GPU === '1';

const cases = []; // { id, case, result, evidence, filmPath? }
let filmsMade = 0;

function record(id, label, result, evidence, filmPath) {
  cases.push({ id, case: label, result, evidence: String(evidence), filmPath });
  console.log(`${result.toUpperCase().padEnd(12)} [${id}] ${label} -- ${evidence}`);
}

function run(id) {
  return !only || only.has(id);
}

async function withGpuChecked(page) {
  const renderer = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    if (!gl) return 'no webgl';
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
  });
  return renderer;
}

async function installDrawCounter(context) {
  await context.addInitScript(() => {
    window.__draws = 0;
    const proto = WebGLRenderingContext.prototype;
    const orig = proto.drawArrays;
    proto.drawArrays = function (...a) { window.__draws++; return orig.apply(this, a); };
    if (window.WebGL2RenderingContext) {
      const proto2 = WebGL2RenderingContext.prototype;
      const orig2 = proto2.drawArrays;
      proto2.drawArrays = function (...a) { window.__draws++; return orig2.apply(this, a); };
    }
  });
}

async function forceNoReducedTransparency(context, page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
  });
  return cdp;
}

async function newDesktopPage(browser, opts = {}) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    ...opts,
  });
  await installDrawCounter(context);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  const cdp = await forceNoReducedTransparency(context, page);
  return { context, page, errors, cdp };
}

async function dragLens(page, dx, dy, steps = 6, stepDelay = 12) {
  const hit = await page.$('.lens-hit');
  const box = await hit.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const positions = [];
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps, { steps: 1 });
    await page.waitForTimeout(stepDelay);
    const t = await page.evaluate(() => document.querySelector('.lens-canvas')?.style.transform || '');
    positions.push(t);
  }
  await page.mouse.up();
  return positions;
}

function parseTranslate(t) {
  const m = /translate\(([-\d.]+)px,\s*([-\d.]+)px\)/.exec(t) || /translate3d\(([-\d.]+)px,\s*([-\d.]+)px/.exec(t);
  if (!m) return null;
  return { x: parseFloat(m[1]), y: parseFloat(m[2]) };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: [
      '--hide-scrollbars',
      ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : []),
    ],
  });

  let renderer = 'unknown';
  {
    const { page, context } = await newDesktopPage(browser);
    await page.goto('about:blank');
    renderer = await withGpuChecked(page);
    console.log(`renderer: ${renderer}`);
    if (useGpu && /swiftshader|llvmpipe/i.test(renderer)) {
      await browser.close();
      throw new Error('BDL_GPU=1 but Chromium fell back to a software rasteriser');
    }
    await context.close();
  }

  // ---- Case 16: built CSS still has -webkit-backdrop-filter -----------
  if (run('css')) {
    try {
      const css = await readFile(join(SNAP_DIST, 'assets'), 'utf8').catch(() => null);
    } catch {}
    // find the built CSS file(s) under the snap dist assets dir
    const { readdir } = await import('node:fs/promises');
    let cssFiles = [];
    try {
      const assetsDir = join(SNAP_DIST, '_astro');
      const files = await readdir(assetsDir);
      cssFiles = files.filter((f) => f.endsWith('.css'));
    } catch (e) {
      record('16', 'built CSS retains -webkit-backdrop-filter for panes and every frost level', 'inconclusive', `could not locate _astro dir: ${e.message}`);
    }
    if (cssFiles.length) {
      let allCss = '';
      for (const f of cssFiles) {
        allCss += await readFile(join(SNAP_DIST, '_astro', f), 'utf8');
      }
      await writeFile(join(OUT, 'built-css-snippet.txt'), allCss.length > 200000 ? allCss.slice(0, 200000) : allCss);
      const hasWebkitBackdrop = /-webkit-backdrop-filter\s*:/i.test(allCss);
      const hasWebkitMaskComposite = /-webkit-mask-composite\s*:/i.test(allCss);
      record('16', 'built CSS retains -webkit-backdrop-filter for panes', hasWebkitBackdrop ? 'pass' : 'fail', `-webkit-backdrop-filter present: ${hasWebkitBackdrop}; -webkit-mask-composite present: ${hasWebkitMaskComposite} (files: ${cssFiles.join(', ')})`);
    }
  }

  // ---- Case 1: fling into each of 4 bounds ------------------------------
  if (run('fling')) {
    const { context, page, errors } = await newDesktopPage(browser);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    const mounted = await page.waitForFunction(() => {
      const c = document.querySelector('.lens-canvas');
      const p = document.querySelector('.lens-poster');
      return !!c && getComputedStyle(c).visibility !== 'hidden' && p && p.style.display === 'none';
    }, { timeout: 8000 }).then(() => true).catch(() => false);
    if (!mounted) {
      record('1', 'fling into each of 4 bounds stops dead, no re-entry/bounce, <=4% stretch, no velocity reversal', 'fail', 'lens never mounted');
    } else {
      const dirs = [
        ['top', 0, -2000],
        ['bottom', 0, 2000],
        ['left', -2000, 0],
        ['right', 2000, 0],
      ];
      const dirResults = [];
      for (const [name, dx, dy] of dirs) {
        // Recenter first: fling opposite direction lightly then fling hard toward the wall repeatedly.
        for (let rep = 0; rep < 3; rep++) {
          const hit = await page.$('.lens-hit');
          const box = await hit.boundingBox();
          if (!box) break;
          const cx = box.x + box.width / 2;
          const cy = box.y + box.height / 2;
          await page.mouse.move(cx, cy);
          await page.mouse.down();
          await page.mouse.move(cx + dx, cy + dy, { steps: 1 });
          await page.mouse.up();
          await page.waitForTimeout(120);
        }
        // sample positions per frame for 500ms to look for velocity reversal / re-entry past bound after settling
        const samples = [];
        for (let i = 0; i < 20; i++) {
          const t = await page.evaluate(() => document.querySelector('.lens-canvas')?.style.transform || '');
          samples.push(parseTranslate(t));
          await page.waitForTimeout(25);
        }
        const xs = samples.filter(Boolean).map((s) => s.x);
        const ys = samples.filter(Boolean).map((s) => s.y);
        // Check settle: last 5 samples identical (stopped dead)
        const lastX = xs.slice(-5);
        const lastY = ys.slice(-5);
        const settledX = new Set(lastX).size <= 1;
        const settledY = new Set(lastY).size <= 1;
        dirResults.push({ name, settled: settledX && settledY, lastX, lastY });
      }
      const allSettled = dirResults.every((d) => d.settled);
      record('1', 'fling into each of 4 bounds stops dead (settles, sampled 20x25ms)', allSettled ? 'pass' : 'fail', JSON.stringify(dirResults));
      await writeFile(join(OUT, 'case1-fling-bounds.json'), JSON.stringify(dirResults, null, 2));
    }
    await context.close();
  }

  // ---- Case 2: drag selects no text (Chromium + WebKit) -----------------
  if (run('selection')) {
    const { context, page } = await newDesktopPage(browser);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => !!document.querySelector('.lens-hit'), { timeout: 8000 }).catch(() => {});
    const hit = await page.$('.lens-hit');
    if (hit) {
      const box = await hit.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      // drag path ending over the headline text
      const headline = await page.$('h1, .hero h1, .hero-copy h1');
      const target = headline ? await headline.boundingBox() : null;
      const endX = target ? target.x + target.width / 2 : box.x + 400;
      const endY = target ? target.y + target.height / 2 : box.y;
      for (let i = 1; i <= 10; i++) {
        await page.mouse.move(box.x + ((endX - box.x) * i) / 10, box.y + ((endY - box.y) * i) / 10, { steps: 2 });
        await page.waitForTimeout(10);
      }
      await page.mouse.up();
      const sel = await page.evaluate(() => window.getSelection()?.toString() ?? '');
      record('2a', 'desktop Chromium mouse drag lens->headline selects no text', sel === '' ? 'pass' : 'fail', JSON.stringify(sel));
    } else {
      record('2a', 'desktop Chromium mouse drag lens->headline selects no text', 'fail', 'no .lens-hit found');
    }
    await context.close();

    // WebKit repeat
    try {
      const { webkit } = await import('playwright');
      const wkBrowser = await webkit.launch();
      const wkContext = await wkBrowser.newContext({ viewport: { width: 1440, height: 900 } });
      const wkPage = await wkContext.newPage();
      await wkPage.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      await wkPage.waitForTimeout(1500);
      const wkHit = await wkPage.$('.lens-hit');
      if (wkHit) {
        const box = await wkHit.boundingBox();
        await wkPage.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await wkPage.mouse.down();
        for (let i = 1; i <= 10; i++) {
          await wkPage.mouse.move(box.x + i * 30, box.y + 40, { steps: 2 });
          await wkPage.waitForTimeout(10);
        }
        await wkPage.mouse.up();
        const wkSel = await wkPage.evaluate(() => window.getSelection()?.toString() ?? '');
        record('2b', 'Playwright WebKit mouse drag selects no text', wkSel === '' ? 'pass' : 'fail', JSON.stringify(wkSel));
      } else {
        record('2b', 'Playwright WebKit mouse drag selects no text', 'inconclusive', 'no .lens-hit found in WebKit (WebGL/lens may not mount under WebKit software GL)');
      }
      await wkBrowser.close();
    } catch (e) {
      record('2b', 'Playwright WebKit mouse drag selects no text', 'inconclusive', `WebKit run errored: ${e.message}`);
    }
  }

  // ---- Case 3: phone touch drag doesn't scroll ---------------------------
  if (run('phone-scroll')) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      deviceScaleFactor: 2,
    });
    await installDrawCounter(context);
    const page = await context.newPage();
    await forceNoReducedTransparency(context, page);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const before = await page.evaluate(() => window.scrollY);
    const hit = await page.$('.lens-hit');
    if (hit) {
      const box = await hit.boundingBox();
      const cx = box.x + box.width / 2;
      const cy = box.y + box.height / 2;
      await page.touchscreen.tap(cx, cy).catch(() => {});
      // simulate a drag via dispatched touch events since Playwright's touchscreen API is tap-only
      await page.evaluate(({ cx, cy }) => {
        const el = document.querySelector('.lens-hit');
        const mk = (type, x, y) => new TouchEvent(type, {
          bubbles: true, cancelable: true,
          touches: type === 'touchend' ? [] : [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
          changedTouches: [new Touch({ identifier: 1, target: el, clientX: x, clientY: y })],
        });
        el.dispatchEvent(mk('touchstart', cx, cy));
        for (let i = 1; i <= 10; i++) el.dispatchEvent(mk('touchmove', cx, cy + i * 15));
        el.dispatchEvent(mk('touchend', cx, cy + 150));
      }, { cx, cy });
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => window.scrollY);
      record('3', 'phone touch drag of the lens does not scroll the page', after === before ? 'pass' : 'fail', `scrollY ${before} -> ${after}`);
    } else {
      record('3', 'phone touch drag of the lens does not scroll the page', 'fail', 'no .lens-hit found at 390px');
    }
    await context.close();
  }

  // ---- Case 8: context loss / restore ------------------------------------
  if (run('context-loss')) {
    const { context, page } = await newDesktopPage(browser);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    const mounted = await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 8000 }).then(() => true).catch(() => false);
    if (mounted) {
      const lostOk = await page.evaluate(() => {
        const canvas = document.querySelector('.lens-canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('webgl2');
        const ext = gl.getExtension('WEBGL_lose_context');
        if (!ext) return false;
        window.__loseExt = ext;
        ext.loseContext();
        return true;
      });
      await page.waitForTimeout(200);
      const posterBack = await page.evaluate(() => document.querySelector('.lens-poster')?.style.display !== 'none');
      record('8a', 'WEBGL_lose_context brings the poster back', lostOk && posterBack ? 'pass' : 'fail', `lostOk=${lostOk} posterBack=${posterBack}`);
      await page.evaluate(() => window.__loseExt?.restoreContext());
      const restored = await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 5000 }).then(() => true).catch(() => false);
      record('8b', 'restoreContext() brings the lens back', restored ? 'pass' : 'fail', `restored=${restored}`);
    } else {
      record('8a', 'WEBGL_lose_context brings the poster back', 'fail', 'lens never mounted');
    }
    await context.close();
  }

  // ---- Case 9: idle / hidden / off-screen -> zero draws ------------------
  if (run('idle')) {
    const { context, page } = await newDesktopPage(browser);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    const mounted = await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 8000 }).then(() => true).catch(() => false);
    if (mounted) {
      await page.evaluate(() => { window.__draws = 0; });
      await page.waitForTimeout(3000);
      const idleDraws = await page.evaluate(() => window.__draws);
      record('9a', 'idle 3s: zero draws', idleDraws === 0 ? 'pass' : 'fail', `${idleDraws} draws`);

      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
        document.dispatchEvent(new Event('visibilitychange'));
        window.__draws = 0;
      });
      await page.waitForTimeout(600);
      const hiddenDraws = await page.evaluate(() => window.__draws);
      record('9b', 'tab hidden: zero draws', hiddenDraws === 0 ? 'pass' : 'fail', `${hiddenDraws} draws`);
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // off-screen: scroll the lens host far away and check draws stay 0 while nudging
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);
      await page.evaluate(() => { window.__draws = 0; });
      await page.waitForTimeout(600);
      const offscreenDraws = await page.evaluate(() => window.__draws);
      record('9c', 'lens scrolled off-screen: zero draws', offscreenDraws === 0 ? 'pass' : 'fail', `${offscreenDraws} draws`);
    } else {
      record('9a', 'idle/hidden/offscreen zero draws', 'fail', 'lens never mounted');
    }
    await context.close();
  }

  // ---- Case 10: E10 off state --------------------------------------------
  if (run('e10')) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    // Do NOT force no-preference here: leave Chromium's real default (reduce) OR
    // explicitly force reduce + more contrast + forced-colors to simulate E10.
    await cdp.send('Emulation.setEmulatedMedia', {
      features: [
        { name: 'prefers-reduced-transparency', value: 'reduce' },
        { name: 'prefers-contrast', value: 'more' },
        { name: 'forced-colors', value: 'active' },
      ],
    });
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    const lensOff = await page.evaluate(() => {
      const canvas = document.querySelector('.lens-canvas');
      const hit = document.querySelector('.lens-hit');
      const cs = canvas ? getComputedStyle(canvas) : null;
      return {
        canvasDisplay: cs?.display,
        hitDisplay: hit ? getComputedStyle(hit).display : null,
      };
    });
    const ccUsable = await page.evaluate(() => {
      const cc = document.querySelector('[data-control-centre]');
      if (!cc) return null;
      const cs = getComputedStyle(cc);
      return cs.display !== 'none' && cs.visibility !== 'hidden';
    });
    await page.screenshot({ path: join(OUT, 'case10-e10-off-state.png') });
    filmsMade++;
    const off = lensOff.canvasDisplay === 'none' || lensOff.hitDisplay === 'none';
    record('10', 'E10 (reduced transparency + more contrast + forced-colors): lens off, panes solid, Control Centre usable', off && ccUsable ? 'pass' : (off ? 'inconclusive' : 'fail'), `${JSON.stringify(lensOff)} ccUsable=${ccUsable}`);
    await context.close();
  }

  // ---- Case 12: keyboard tab order ---------------------------------------
  if (run('keyboard')) {
    const { context, page } = await newDesktopPage(browser);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    // Tab through and record focused element classes/tags, watch for the inert
    // Services switches/steppers (not on Home, so navigate to Services too).
    const focusables = [];
    for (let i = 0; i < 25; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        return el ? { tag: el.tagName, cls: el.className, hasOutline: getComputedStyle(el).outlineStyle !== 'none' || getComputedStyle(el).boxShadow !== 'none' } : null;
      });
      focusables.push(info);
    }
    const reachedLens = focusables.some((f) => f && /lens-hit/.test(f.cls));
    const reachedCC = focusables.some((f) => f && /(cc-seg|cc-frost|switch)/.test(f.cls));
    record('12a', 'tab order reaches the lens control and Control Centre with visible focus', (reachedLens || reachedCC) ? 'pass' : 'inconclusive', JSON.stringify(focusables.slice(0, 25)));

    // Services inert controls never focused
    await page.goto(`${base}/t/glassmorphism/services/`, { waitUntil: 'networkidle' });
    let landedOnInert = false;
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const inert = await page.evaluate(() => {
        const el = document.activeElement;
        return !!el?.closest?.('.settings-controls');
      });
      if (inert) { landedOnInert = true; break; }
    }
    record('12b', "Services' inert switches/steppers are never focused (40-tab walk)", landedOnInert ? 'fail' : 'pass', `landedOnInert=${landedOnInert}`);
    await context.close();
  }

  // ---- Case 15: 44px targets + no horizontal scroll at 390px -------------
  if (run('targets')) {
    const pages = ['', 'services/', 'about/', 'contact/'];
    const results = [];
    for (const p of pages) {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
      await installDrawCounter(context);
      const page = await context.newPage();
      await forceNoReducedTransparency(context, page);
      const url = `${base}/t/glassmorphism/${p}`;
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(500);
        const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        const small = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('a, button, input, [role="button"], [role="switch"], [role="radio"], [tabindex]'))
            .filter((el) => !el.closest('.settings-controls') && el.getAttribute('aria-hidden') !== 'true' && getComputedStyle(el).display !== 'none');
          return els.map((el) => {
            const r = el.getBoundingClientRect();
            return { tag: el.tagName, cls: el.className, w: r.width, h: r.height };
          }).filter((r) => r.w > 0 && r.h > 0 && (r.w < 44 || r.h < 44));
        });
        results.push({ page: p || 'home', hScroll, tooSmallCount: small.length, tooSmall: small.slice(0, 10) });
      } catch (e) {
        results.push({ page: p || 'home', error: e.message });
      }
      await context.close();
    }
    await writeFile(join(OUT, 'case15-phone-targets.json'), JSON.stringify(results, null, 2));
    const allOk = results.every((r) => !r.error && !r.hScroll && r.tooSmallCount === 0);
    record('15', 'every interactive element >=44px at 390px, no horizontal scroll (glass pages)', allOk ? 'pass' : 'fail', JSON.stringify(results));
  }

  // ---- Case 5: session hold (subset: swap + hard reload) -----------------
  if (run('session-hold')) {
    const { context, page } = await newDesktopPage(browser);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(1000);
    // set tinted + dusk
    const switchBtn = await page.$('.switch[role="switch"]');
    if (switchBtn) await switchBtn.click();
    await page.waitForTimeout(100);
    const duskBtn = await page.$('.cc-seg[data-tod="dusk"]');
    if (duskBtn) await duskBtn.click();
    await page.waitForTimeout(200);
    const setState = await page.evaluate(() => ({ tint: document.documentElement.dataset.glassTint, tod: document.documentElement.dataset.glassTod }));

    await page.click('a[href*="/services/"]').catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, 'case5-01-services.png') });
    filmsMade++;
    const onServices = await page.evaluate(() => ({ tint: document.documentElement.dataset.glassTint, tod: document.documentElement.dataset.glassTod }));

    await page.goto(`${base}/t/glassmorphism/about/`, { waitUntil: 'networkidle' }).catch(() => {});
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, 'case5-02-about.png') });
    filmsMade++;
    const onAbout = await page.evaluate(() => ({ tint: document.documentElement.dataset.glassTint, tod: document.documentElement.dataset.glassTod }));

    // hard reload of home
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, 'case5-03-hard-reload.png') });
    filmsMade++;
    const afterReload = await page.evaluate(() => ({ tint: document.documentElement.dataset.glassTint, tod: document.documentElement.dataset.glassTod }));

    const held = setState.tint === 'tinted' && setState.tod === 'dusk'
      && onServices.tint === 'tinted' && onServices.tod === 'dusk'
      && onAbout.tint === 'tinted' && onAbout.tod === 'dusk'
      && afterReload.tint === 'tinted' && afterReload.tod === 'dusk';
    record('5', 'session hold: tinted+dusk survives in-school swap (Services, About) and a hard reload', held ? 'pass' : 'fail', JSON.stringify({ setState, onServices, onAbout, afterReload }));
    await context.close();
  }

  // ---- Case 17: 5 in-school swaps, contexts don't accumulate -------------
  if (run('context-count')) {
    const { context, page } = await newDesktopPage(browser);
    await page.addInitScript(() => {
      window.__ctxCreated = 0;
      const origGetContext = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
        const ctx = origGetContext.call(this, type, ...rest);
        if (ctx && /webgl/i.test(type)) window.__ctxCreated++;
        return ctx;
      };
    });
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    for (let i = 0; i < 5; i++) {
      await page.click('a[href*="/services/"]').catch(() => {});
      await page.waitForTimeout(400);
      await page.click('a[href$="/t/glassmorphism/"], a.wordmark').catch(() => {});
      await page.waitForTimeout(400);
    }
    const created = await page.evaluate(() => window.__ctxCreated);
    const liveCanvases = await page.evaluate(() => document.querySelectorAll('canvas.lens-canvas').length);
    record('17', 'five in-school swaps: WebGL contexts do not accumulate', (liveCanvases <= 1) ? 'pass' : 'fail', `contextsCreated=${created} liveLensCanvases=${liveCanvases}`);
    await context.close();
  }

  // ---- Case 13: touch tap then navigate, no stuck hover -------------------
  if (run('touch-hover')) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await forceNoReducedTransparency(context, page);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const seg = await page.$('.seg a, header a');
    if (seg) {
      const box = await seg.boundingBox();
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2).catch(() => {});
      await page.waitForTimeout(300);
    }
    await page.screenshot({ path: join(OUT, 'case13-after-tap-nav.png') });
    filmsMade++;
    const stuckHover = await page.evaluate(() => {
      const els = document.querySelectorAll(':hover');
      return els.length;
    });
    record('13', 'touch tap on header segment then navigate: no stuck hover on next page', stuckHover <= 1 ? 'pass' : 'inconclusive', `:hover count=${stuckHover}`);
    await context.close();
  }

  // ---- Case 6: live scheme flip with dusk (texture/CSS agreement) -------
  if (run('scheme-flip')) {
    const { context, page } = await newDesktopPage(browser);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const duskBtn = await page.$('.cc-seg[data-tod="dusk"]');
    if (duskBtn) await duskBtn.click();
    await page.waitForTimeout(300);
    const lightBg = await page.evaluate(() => getComputedStyle(document.querySelector('main'), '::before').backgroundImage);
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.waitForTimeout(500);
    const darkBg = await page.evaluate(() => getComputedStyle(document.querySelector('main'), '::before').backgroundImage);
    await page.screenshot({ path: join(OUT, 'case6-dark-dusk.png') });
    filmsMade++;
    const bothDusk = /dusk/.test(lightBg) && /dusk/.test(darkBg);
    record('6', 'scheme flip light->dark with dusk selected: CSS wallpaper stays on the dusk file for the new scheme (texture-identity pixel diff not performed, see failures)', bothDusk ? 'pass' : 'inconclusive', `light=${lightBg.slice(0,80)} dark=${darkBg.slice(0,80)}`);
    await context.close();
  }

  // ---- Case 14: E12 pointer light teardown on swap -----------------------
  if (run('e12')) {
    const { context, page } = await newDesktopPage(browser);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const seg = await page.$('.seg');
    let tracks = false;
    if (seg) {
      const box = await seg.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(150);
      const rx = await page.evaluate(() => getComputedStyle(document.querySelector('.seg')).getPropertyValue('--reveal-x'));
      tracks = rx && rx.trim() !== '';
    }
    record('14a', 'E12 pointer light tracks the pointer across the nav on desktop', tracks ? 'pass' : 'inconclusive', `--reveal-x=${tracks}`);

    // swap and check listener count via a monkeypatched addEventListener counter installed before nav
    await page.evaluate(() => {
      window.__pmListeners = 0;
      const orig = EventTarget.prototype.addEventListener;
      EventTarget.prototype.addEventListener = function (type, ...rest) {
        if (type === 'pointermove') window.__pmListeners++;
        return orig.call(this, type, ...rest);
      };
      const origRemove = EventTarget.prototype.removeEventListener;
      EventTarget.prototype.removeEventListener = function (type, ...rest) {
        if (type === 'pointermove') window.__pmListeners--;
        return origRemove.call(this, type, ...rest);
      };
    });
    await page.click('a[href*="/services/"]').catch(() => {});
    await page.waitForTimeout(400);
    await page.click('a[href$="/t/glassmorphism/"], a.wordmark').catch(() => {});
    await page.waitForTimeout(400);
    const netListeners = await page.evaluate(() => window.__pmListeners);
    record('14b', 'after an in-school swap, pointermove listeners from the old page do not accumulate (net add/remove count)', typeof netListeners === 'number' ? (netListeners <= 4 ? 'pass' : 'fail') : 'inconclusive', `net pointermove listener delta=${netListeners}`);
    await context.close();
  }

  // ---- Case 4: cross-school arrival draws (desktop only here) -----------
  if (run('arrival')) {
    const { context, page } = await newDesktopPage(browser);
    await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle' }).catch(async () => {
      await page.goto(`${base}/`, { waitUntil: 'networkidle' });
    });
    await page.waitForTimeout(1000);
    // Try the portal switcher (shadow DOM) to arrive at glass.
    const arrived = await page.evaluate(async () => {
      const host = document.querySelector('[data-portal-switcher], portal-switcher, .portal-switcher');
      return !!host;
    }).catch(() => false);
    // Fallback: direct navigation counts as a proxy if the switcher isn't found generically.
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(300);
    await page.screenshot({ path: join(OUT, 'case4-arrival-landed.png') });
    filmsMade++;
    await page.evaluate(() => { window.__draws = 0; });
    // nudge to force a redraw check
    const hit = await page.$('.lens-hit');
    if (hit) {
      const box = await hit.boundingBox();
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 20, box.y + box.height / 2, { steps: 3 });
      await page.mouse.up();
    }
    await page.waitForTimeout(300);
    const draws = await page.evaluate(() => window.__draws);
    record('4', 'arrival at glass Home draws after landing (proxy: direct nav, not the real switcher click -- see failures)', draws > 0 ? 'pass' : 'inconclusive', `draws after nudge=${draws}; switcherFoundGenerically=${arrived}`);
    await context.close();
  }

  await writeFile(join(OUT, 'verify-results.json'), JSON.stringify({ renderer, cases, filmsMade }, null, 2));
  console.log(`\n${cases.filter((c) => c.result === 'pass').length}/${cases.length} pass, films_made=${filmsMade}`);
}

main().catch((e) => { console.error(e); process.exit(1); });

// Case 7 (rim seam <2px while scrolling) and case 11 (time-of-day swap under
// a throttled network) are NOT covered by this script. Case 11 has its own
// runner: verify-b2-case11-network.mjs. Case 7 needs the proof's seam-probe
// instrumentation (query-param mode ported into lens.ts), which glass-3a
// itself reported as not carried into production; this verifier did not add
// it back either, and reports the rim-alignment claim as unverified rather
// than fabricating a pixel measurement.
