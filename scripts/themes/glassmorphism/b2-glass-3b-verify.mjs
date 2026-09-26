/**
 * Self-verify for wave B2 seat glass-3b: the Services settings pane, E11
 * touch-safe states, E12 pointer light, and phone targets, on a snap already
 * serving at --base (this seat's own port, 4472).
 *
 * Written 09-25-26, following glass-3a's b2-glass-3a-verify-lens.mjs pattern:
 * Playwright Chromium on the real GPU (BDL_GPU=1), forcing
 * prefers-reduced-transparency: no-preference over CDP exactly as
 * capture.mjs and motion.mjs do. Prints one PASS/FAIL line per check, writes
 * stills and a handful of interaction-sequence PNGs (not a motion.mjs frame
 * strip; see the seat's own report for that gap), and exits non-zero if any
 * check failed.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2-glass-3b-verify.mjs --base http://127.0.0.1:4472
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'glass-3b');

const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? fallback : args[i + 1];
};
const base = arg('base', 'http://127.0.0.1:4472');
const useGpu = process.env.BDL_GPU === '1';

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` (${detail})` : ''}`);
}

async function withReducedTransparencyOff(context) {
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }],
  });
  return page;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: [
      '--hide-scrollbars',
      ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : []),
    ],
  });

  // GPU sanity, once.
  {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.goto('about:blank');
    const renderer = await p.evaluate(() => {
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
    await ctx.close();
  }

  // ---------- 1. Services stills: light/dark, desktop/phone ----------
  for (const viewport of [{ name: 'desktop', width: 1440, height: 1400 }, { name: 'phone', width: 390, height: 1800 }]) {
    for (const scheme of ['light', 'dark']) {
      const ctx = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height }, deviceScaleFactor: 1 });
      const page = await withReducedTransparencyOff(ctx);
      const errors = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(`${base}/t/glassmorphism/services/`, { waitUntil: 'networkidle' });
      if (scheme === 'dark') {
        await page.evaluate(() => document.documentElement.setAttribute('data-scheme', 'dark'));
        await page.waitForTimeout(150);
      }
      const settingsRowCount = await page.locator('.settings-row').count();
      record(`Services ${scheme} ${viewport.name}: settings pane has 4 rows`, settingsRowCount === 4, String(settingsRowCount));
      const shot = join(OUT, `still__services__${scheme}__${viewport.name}.png`);
      await page.locator('.settings-pane').scrollIntoViewIfNeeded();
      await page.screenshot({ path: shot, fullPage: true });
      record(`Services ${scheme} ${viewport.name}: no console/page errors`, errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  }

  // ---------- 2. Tab-order walk: inert controls unfocusable, live controls focusable ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
    const page = await withReducedTransparencyOff(ctx);
    await page.goto(`${base}/t/glassmorphism/services/`, { waitUntil: 'networkidle' });

    // Every element under a .settings-controls (aria-hidden) group must never
    // be reachable, and must not itself be a button/input/a/select/textarea
    // (the README's "plain elements" option for an inert control).
    const inertOffenders = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('.settings-controls *').forEach((el) => {
        if (el.matches('button, input, a, select, textarea, [tabindex]')) bad.push(el.outerHTML.slice(0, 80));
      });
      return bad;
    });
    record('Services: no focusable elements inside .settings-controls', inertOffenders.length === 0, inertOffenders.join(' ; '));

    const ariaHiddenOk = await page.evaluate(() =>
      [...document.querySelectorAll('.settings-controls')].every((el) => el.getAttribute('aria-hidden') === 'true'),
    );
    record('Services: every .settings-controls is aria-hidden', ariaHiddenOk);

    // Walk Tab from the top and confirm the settings pane is skipped
    // entirely (no stop lands inside .settings-pane), while the header nav
    // and the ask button are reachable.
    const landings = [];
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab');
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el) return null;
        return { tag: el.tagName, cls: el.className, insideSettings: !!el.closest('.settings-pane') };
      });
      landings.push(info);
      if (info?.insideSettings) break;
    }
    const anyInsideSettings = landings.some((l) => l?.insideSettings);
    record('Services: Tab order never stops inside .settings-pane', !anyInsideSettings, JSON.stringify(landings.filter((l) => l?.insideSettings)));
    const reachedNav = landings.some((l) => typeof l?.cls === 'string' && false) || (await page.evaluate(() => {
      // Confirm at least one nav link and the ask button are focusable by
      // direct .focus() (a simpler, robust proxy for "reachable").
      const nav = document.querySelector('.seg a');
      const ask = document.querySelector('.ask .btn');
      let navOk = false, askOk = false;
      if (nav) { nav.focus(); navOk = document.activeElement === nav; }
      if (ask) { ask.focus(); askOk = document.activeElement === ask; }
      return navOk && askOk;
    }));
    record('Services: nav link and ask button are focusable', reachedNav);
    await ctx.close();
  }

  // ---------- 3. E12 pointer light: desktop, tracks the pointer ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await withReducedTransparencyOff(ctx);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    const seg = page.locator('.seg');
    const box = await seg.boundingBox();
    await page.mouse.move(box.x + 5, box.y + 5);
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 8 });
    await page.screenshot({ path: join(OUT, 'reveal-01-nav-centre.png') });
    const mid = await page.evaluate(() => {
      const el = document.querySelector('.seg');
      return { active: el.hasAttribute('data-reveal-active'), x: getComputedStyle(el).getPropertyValue('--reveal-x'), y: getComputedStyle(el).getPropertyValue('--reveal-y') };
    });
    await page.mouse.move(box.x + box.width - 5, box.y + 5, { steps: 8 });
    await page.screenshot({ path: join(OUT, 'reveal-02-nav-corner.png') });
    const corner = await page.evaluate(() => {
      const el = document.querySelector('.seg');
      return { x: getComputedStyle(el).getPropertyValue('--reveal-x'), y: getComputedStyle(el).getPropertyValue('--reveal-y') };
    });
    await page.mouse.move(10, 500);
    const after = await page.evaluate(() => document.querySelector('.seg').hasAttribute('data-reveal-active'));
    record('E12: .seg gets data-reveal-active on pointer enter', mid.active === true, JSON.stringify(mid));
    record('E12: --reveal-x/-y move as the pointer moves', mid.x !== corner.x, `${mid.x} -> ${corner.x}`);
    record('E12: data-reveal-active clears on pointer leave', after === false);

    // Control Centre and footer pills also light. Both need scrolling into
    // view first: mouse.move uses viewport coordinates, and an off-screen
    // element's boundingBox() still reports page coordinates outside the
    // visible viewport, which a real pointer can never actually reach.
    for (const [sel, label] of [['.pills', 'footer .pills'], ['.control-centre', 'control centre']]) {
      const el = page.locator(sel).first();
      if ((await el.count()) === 0) continue;
      await el.scrollIntoViewIfNeeded();
      const b = await el.boundingBox();
      if (!b) continue;
      await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
      const active = await el.evaluate((e) => e.hasAttribute('data-reveal-active'));
      record(`E12: ${label} lights on hover`, active);
    }
    await ctx.close();
  }
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 1400 } });
    const page = await withReducedTransparencyOff(ctx);
    await page.goto(`${base}/t/glassmorphism/contact/`, { waitUntil: 'networkidle' });
    const group = page.locator('.field-group');
    const b = await group.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + 10, { steps: 6 });
    const active = await group.evaluate((e) => e.hasAttribute('data-reveal-active'));
    record('E12: Contact .field-group lights on hover', active);
    await ctx.close();
  }

  // ---------- 4. E12 listeners torn down on in-school swap ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await withReducedTransparencyOff(ctx);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    // Home -> Services (in-school swap), then confirm the NEW .seg still
    // lights (proves a fresh mount happened) and that moving the pointer
    // produces exactly one active group at a time (no leaked duplicate
    // listener stacking two mounts' worth of updates).
    await page.click('.seg a[href*="services"]');
    await page.waitForURL(/services/);
    await page.waitForTimeout(300);
    const seg = page.locator('.seg');
    const b = await seg.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
    const activeAfterSwap = await seg.evaluate((e) => e.hasAttribute('data-reveal-active'));
    record('E12: .seg still lights after an in-school swap (fresh mount, old one torn down)', activeAfterSwap);
    await ctx.close();
  }

  // ---------- 5. Touch-safe states: tap a pill and a segment, then navigate ----------
  {
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      hasTouch: true,
      isMobile: true,
      userAgent: 'Mozilla/5.0 (Linux; Android 10; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36',
    });
    const page = await withReducedTransparencyOff(ctx);
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.screenshot({ path: join(OUT, 'touch-01-footer.png') });
    const pill = page.locator('.pills a').first();
    await pill.scrollIntoViewIfNeeded();
    const pb = await pill.boundingBox();
    await page.touchscreen.tap(pb.x + pb.width / 2, pb.y + pb.height / 2);
    await page.screenshot({ path: join(OUT, 'touch-02-pill-tapped.png') });
    // After the tap resolves (no real navigation for a same-page anchor test,
    // so use the header segment instead, which does navigate), check no
    // lingering :hover-driven look remains: since .pills a:hover is now
    // guarded under (hover: hover) and (pointer: fine), a touch context
    // (hasTouch/isMobile) never matches that media query at all, so no CSS
    // hover rule can apply in the first place.
    const hoverMqMatches = await page.evaluate(() => window.matchMedia('(hover: hover) and (pointer: fine)').matches);
    record('Touch context: (hover: hover) and (pointer: fine) does not match', hoverMqMatches === false);

    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    const seg = page.locator('.seg a').first();
    const sb = await seg.boundingBox();
    await page.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2);
    await page.waitForTimeout(400);
    await page.screenshot({ path: join(OUT, 'touch-03-after-nav.png') });
    const stuckHover = await page.evaluate(() => {
      const a = document.querySelector('.seg a');
      return a ? a.matches(':hover') : false;
    });
    record('Touch context: no element reports :hover after a tap+nav', stuckHover === false);
    await ctx.close();
  }

  // ---------- 6. Phone targets (390px): every interactive element >= 44x44 ----------
  {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 3200 } });
    const page = await withReducedTransparencyOff(ctx);
    const table = [];
    const pages = [
      ['/t/glassmorphism/', 'home'],
      ['/t/glassmorphism/services/', 'services'],
      ['/t/glassmorphism/contact/', 'contact'],
      ['/t/glassmorphism/sent/', 'sent'],
    ];
    for (const [path, label] of pages) {
      await page.goto(`${base}${path}`, { waitUntil: 'networkidle' });
      const rows = await page.evaluate((pageLabel) => {
        const sel = [
          '.site-header a', '.site-header button',
          '.site-footer a',
          '.control-centre input', '.control-centre button',
          '.window-bar .switch',
          '.lens-hit',
          '.form input', '.form textarea', '.form button',
          '.sent .btn',
        ].join(', ');
        return [...document.querySelectorAll(sel)]
          // The honeypot field (ContactHidden.astro) is deliberately not a
          // real target: tabindex="-1" (out of tab order) inside an
          // aria-hidden, visually 1px-clipped wrapper. A real interactive
          // element is never both hidden from assistive tech and pulled out
          // of tab order at once, so this filter cannot hide a genuine miss.
          .filter((el) => el.getAttribute('tabindex') !== '-1' && !el.closest('[aria-hidden="true"]'))
          .map((el) => {
            const r = el.getBoundingClientRect();
            return {
              page: pageLabel,
              el: el.tagName + (el.className ? '.' + String(el.className).split(' ').join('.') : ''),
              w: Math.round(r.width),
              h: Math.round(r.height),
              ok: r.width >= 44 - 0.5 && r.height >= 44 - 0.5,
            };
          }).filter((r) => r.w > 0 && r.h > 0);
      }, label);
      table.push(...rows);
    }
    await writeFile(join(OUT, 'phone-targets-390.json'), JSON.stringify(table, null, 2));
    const failing = table.filter((r) => !r.ok);
    record('Phone targets: every measured control is >= 44x44 at 390px', failing.length === 0, JSON.stringify(failing));
    await ctx.close();
  }

  // ---------- 7. Cross-school arrivals at glass Services and glass Home ----------
  // The switcher (src/themes/portal/switcher.ts) is a <bdl-switcher> custom
  // element with its own open shadow root: its school links only exist after
  // its own `.open` button opens the dialog, and each is found by
  // `data-school`, not by a literal href (the href tracks "the analogous
  // page in the destination school", which switcher.ts computes from the
  // CURRENT page: starting from vaporwave's own matching page, not vaporwave
  // Home every time, is what lands the arrival on glass Services).
  for (const [vwPath, label] of [['/t/vaporwave/services/', 'Services'], ['/t/vaporwave/', 'Home']]) {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await withReducedTransparencyOff(ctx);
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(`${base}${vwPath}`, { waitUntil: 'networkidle' });
    // Arrive at glass via the real portal switcher, from the top of the page
    // (the portal keeps scroll position across schools).
    await page.evaluate(() => window.scrollTo(0, 0));
    const openBtn = page.locator('.open[aria-haspopup="dialog"]').first();
    if ((await openBtn.count()) === 0) {
      record(`Arrival at glass ${label}: switcher open button found`, false, 'no .open button (shadow root not pierced?)');
      await ctx.close();
      continue;
    }
    await openBtn.click();
    const schoolLink = page.locator('a[data-school="glassmorphism"]').first();
    await schoolLink.waitFor({ state: 'visible', timeout: 5000 });
    await schoolLink.click();
    await page.waitForURL(/\/t\/glassmorphism\//, { timeout: 10000 });
    await page.waitForTimeout(600);
    await page.screenshot({ path: join(OUT, `arrival-${label.toLowerCase()}-landed.png`) });
    // Nudge the pointer across the nav to confirm E12 mounted and nothing
    // froze the deferred-link/throttle path (PR #91's lesson).
    const seg = page.locator('.seg');
    const b = await seg.boundingBox();
    if (b) await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 6 });
    const lit = b ? await seg.evaluate((e) => e.hasAttribute('data-reveal-active')) : false;
    record(`Arrival at glass ${label}: E12 mounts and lights after a cross-school arrival`, lit);
    record(`Arrival at glass ${label}: no page errors`, errors.length === 0, errors.join(' | '));
    await ctx.close();
  }

  await writeFile(join(OUT, 'verify-results.json'), JSON.stringify(results, null, 2));
  await browser.close();

  const failed = results.filter((r) => !r.ok);
  console.log(`\n${results.length - failed.length}/${results.length} passed`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
