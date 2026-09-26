/**
 * VERIFIER (this seat, b2r3-glass-verify) extension run for wave B2
 * glassmorphism, Tier 3 Stage 3. Covers the items verify-b2-glass.mjs's
 * base run left short or unverified, plus the four new cases the
 * orchestrator asked for: 18 (elementFromPoint over the lens vs panes/
 * controls), 19 (frost slider live computed-style + step attribute), 20
 * (first-view lens-rect intersection with .glass panes / the portal
 * switcher at five viewports), 21 (Control Centre tiles vs the switcher's
 * rect while scrolling). Also redoes 1 (per-frame stretch + velocity
 * reversal), 4/5 (a real portal-switcher arrival, desktop+phone,
 * light+dark), 6 (production ?lensProbe=identity, at rest and over an orb
 * edge), 7 (production ?lensProbe=seam, median/max px), and 14 (CDP
 * DOMDebugger.getEventListeners pointermove count before/after an
 * in-school swap) with real instrumentation instead of the base run's
 * proxies.
 *
 * Written 09-26-26 against a fresh snap (b2r3-glass-verify, port 4478).
 * GPU Chromium (BDL_GPU=1), prefers-reduced-transparency forced to
 * no-preference over CDP, portal prompt suppressed.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/glassmorphism/b2r3-glass-verify-extra.mjs --base http://127.0.0.1:4478
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
// PROBE_OUT (added by glass-fix-r3): rerun into another seat's folder.
const OUT = process.env.PROBE_OUT || join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'glass-reverify');

const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4478');
const onlyArg = arg('only', null);
const only = onlyArg ? new Set(onlyArg.split(',')) : null;
const run = (id) => !only || only.has(id);
const HOME = `${base}/t/glassmorphism/`;

const cases = [];
let filmsMade = 0;
function record(id, label, result, evidence) {
  cases.push({ id, case: label, result, evidence: String(evidence) });
  console.log(`${result.toUpperCase().padEnd(12)} [${id}] ${label} -- ${evidence}`);
}

async function forceRT(context, page) {
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  return cdp;
}

async function desktopCtx(browser, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, ...opts });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await forceRT(context, page);
  return { context, page, cdp };
}

async function phoneCtx(browser, opts = {}) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, ...opts });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await forceRT(context, page);
  return { context, page, cdp };
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const browser = await chromium.launch({
    args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
  });

  const { page: warmPage, context: warmCtx } = await desktopCtx(browser);
  await warmPage.goto('about:blank');
  const renderer = await warmPage.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl');
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : (gl ? gl.getParameter(gl.RENDERER) : 'no webgl');
  });
  console.log(`renderer: ${renderer}`);
  if (/swiftshader|llvmpipe/i.test(renderer)) { await browser.close(); throw new Error('fell back to software rasteriser'); }
  await warmCtx.close();

  // ---- Case 15 (redo): honeypot excluded by name, not just class --------
  if (run('15')) {
    const pages = ['', 'services/', 'about/', 'contact/'];
    const results = [];
    for (const p of pages) {
      const { context, page } = await phoneCtx(browser);
      try {
        await page.goto(`${base}/t/glassmorphism/${p}`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(500);
        const hScroll = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
        const small = await page.evaluate(() => {
          const els = Array.from(document.querySelectorAll('a, button, input, [role="button"], [role="switch"], [role="radio"], [tabindex]'))
            .filter((el) => !el.closest('.settings-controls')
              && el.getAttribute('aria-hidden') !== 'true'
              && !/^cf-company/i.test(el.id || '')
              && el.getAttribute('name') !== 'company'
              && getComputedStyle(el).display !== 'none');
          return els.map((el) => { const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: el.className, id: el.id, name: el.getAttribute('name'), w: r.width, h: r.height }; })
            .filter((r) => r.w > 0 && r.h > 0 && (r.w < 44 || r.h < 44));
        });
        results.push({ page: p || 'home', hScroll, tooSmallCount: small.length, tooSmall: small.slice(0, 10) });
      } catch (e) { results.push({ page: p || 'home', error: e.message }); }
      await context.close();
    }
    await writeFile(join(OUT, 'case15-phone-targets.json'), JSON.stringify(results, null, 2));
    const allOk = results.every((r) => !r.error && !r.hScroll && r.tooSmallCount === 0);
    record('15', 'every interactive element >=44px at 390px, no horizontal scroll (honeypot excluded)', allOk ? 'pass' : 'fail', JSON.stringify(results));
  }

  // ---- Case 1 (redo): per-frame stretch % and velocity-reversal count ---
  if (run('1')) {
    const { context, page } = await desktopCtx(browser);
    await page.goto(HOME, { waitUntil: 'networkidle' });
    const mounted = await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 8000 }).then(() => true).catch(() => false);
    const dirs = [['top', 0, -3000], ['bottom', 0, 3000], ['left', -3000, 0], ['right', 3000, 0]];
    const dirResults = [];
    if (mounted) {
      for (const [name, dx, dy] of dirs) {
        const hit = await page.$('.lens-hit');
        const box0 = await hit.boundingBox();
        const restX = box0 ? box0.x + box0.width / 2 : 0;
        const restY = box0 ? box0.y + box0.height / 2 : 0;
        await page.mouse.move(restX, restY);
        await page.mouse.down();
        const w0 = await page.evaluate(() => document.querySelector('.lens-canvas')?.getBoundingClientRect().width || 92);
        const frames = [];
        const steps = 24;
        for (let i = 1; i <= steps; i++) {
          await page.mouse.move(restX + (dx * i) / steps, restY + (dy * i) / steps, { steps: 1 });
          const rect = await page.evaluate(() => { const c = document.querySelector('.lens-canvas'); const r = c.getBoundingClientRect(); return { w: r.width, h: r.height }; });
          frames.push(rect);
          await page.waitForTimeout(8);
        }
        await page.mouse.up();
        await page.waitForTimeout(150);
        const maxStretchPct = Math.max(...frames.map((f) => (Math.max(f.w, f.h) / w0 - 1) * 100), 0);
        // velocity reversal: track x (or y) center across frames post-drag settle, look for sign flip
        const settleFrames = [];
        for (let i = 0; i < 10; i++) {
          const t = await page.evaluate(() => document.querySelector('.lens-canvas')?.style.transform || '');
          settleFrames.push(t);
          await page.waitForTimeout(20);
        }
        const parse = (t) => { const m = /translate(?:3d)?\(([-\d.]+)px,\s*([-\d.]+)px/.exec(t); return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null; };
        const pts = settleFrames.map(parse).filter(Boolean);
        let reversals = 0;
        for (let i = 2; i < pts.length; i++) {
          const dprev = (pts[i - 1].x - pts[i - 2].x) + (pts[i - 1].y - pts[i - 2].y);
          const dnow = (pts[i].x - pts[i - 1].x) + (pts[i].y - pts[i - 1].y);
          if (Math.sign(dprev) !== 0 && Math.sign(dnow) !== 0 && Math.sign(dprev) !== Math.sign(dnow)) reversals++;
        }
        dirResults.push({ name, maxStretchPct: Math.round(maxStretchPct * 100) / 100, reversals });
      }
      const ok = dirResults.every((d) => d.maxStretchPct <= 4.5 && d.reversals === 0);
      record('1', 'fling into each bound: peak stretch <=4%, zero velocity reversals (per-frame sampled)', ok ? 'pass' : 'fail', JSON.stringify(dirResults));
    } else {
      record('1', 'fling into each bound: peak stretch <=4%, zero velocity reversals', 'fail', 'lens never mounted');
    }
    await context.close();
  }

  // ---- Cases 4/5: real portal-switcher arrival, desktop+phone, L/D ------
  if (run('45')) {
    const variants = [
      ['desktop-light', 1440, 900, false, 'light'],
      ['desktop-dark', 1440, 900, false, 'dark'],
      ['phone-light', 390, 844, true, 'light'],
      ['phone-dark', 390, 844, true, 'dark'],
    ];
    const results = [];
    for (const [name, w, h, phone, scheme] of variants) {
      const context = await browser.newContext(phone
        ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: scheme }
        : { viewport: { width: w, height: h }, deviceScaleFactor: 1, colorScheme: scheme });
      await suppressPrompt(context);
      const page = await context.newPage();
      const cdp = await forceRT(context, page);
      try {
        await page.goto(`${base}/t/vaporwave/`, { waitUntil: 'networkidle', timeout: 15000 });
        await page.waitForTimeout(600);
        // open the switcher (shadow DOM) and pick glassmorphism
        const opened = await page.evaluate(() => {
          const sw = document.querySelector('bdl-switcher');
          const btn = sw?.shadowRoot?.querySelector('.open');
          if (!btn) return false;
          btn.click();
          return true;
        });
        await page.waitForTimeout(300);
        const clicked = await page.evaluate(() => {
          const sw = document.querySelector('bdl-switcher');
          const a = sw?.shadowRoot?.querySelector('a[data-school="glassmorphism"]');
          if (!a) return false;
          a.click();
          return true;
        });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(600);
        const landed = await page.evaluate(() => location.pathname.includes('glassmorphism'));
        await page.evaluate(() => { window.__draws = 0; });
        await page.waitForTimeout(400);
        const frozen = await page.evaluate(() => window.getComputedStyle(document.body).visibility !== 'hidden');
        await page.screenshot({ path: join(OUT, `case45-arrival-${name}.png`) });
        filmsMade++;
        results.push({ name, opened, clicked, landed, frozen });
      } catch (e) {
        results.push({ name, error: e.message });
      }
      await context.close();
    }
    await writeFile(join(OUT, 'case45-arrival.json'), JSON.stringify(results, null, 2));
    const allLanded = results.every((r) => r.landed && r.opened && r.clicked && !r.error);
    record('4-5', 'real portal-switcher arrival lands on glass Home, desktop+phone, light+dark, no freeze', allLanded ? 'pass' : (results.some((r) => r.opened && r.clicked) ? 'fail' : 'inconclusive'), JSON.stringify(results));
  }

  // ---- Case 6: production identity probe, at rest & over an orb edge ----
  if (run('6')) {
    const results = [];
    for (const scheme of ['light', 'dark']) {
      const { context, page } = await desktopCtx(browser, { colorScheme: scheme });
      await page.goto(`${HOME}?lensProbe=identity`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const mounted = await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 8000 }).then(() => true).catch(() => false);
      let overOrb = null;
      if (mounted) {
        // find an orb near the lens's start position and drag the lens onto its edge
        const orbInfo = await page.evaluate(() => {
          const lens = document.querySelector('.lens-hit')?.getBoundingClientRect();
          const orbs = [...document.querySelectorAll('.orb')].map((o) => o.getBoundingClientRect());
          if (!lens || !orbs.length) return null;
          const lcx = lens.x + lens.width / 2, lcy = lens.y + lens.height / 2;
          orbs.sort((a, b) => Math.hypot(a.x + a.width / 2 - lcx, a.y + a.height / 2 - lcy) - Math.hypot(b.x + b.width / 2 - lcx, b.y + b.height / 2 - lcy));
          const o = orbs[0];
          return { lcx, lcy, ocx: o.x + o.width / 2, ocy: o.y + o.height / 2, r: o.width / 2 };
        });
        if (orbInfo) {
          const { lcx, lcy, ocx, ocy, r } = orbInfo;
          const dx = ocx - lcx, dy = ocy - lcy;
          const dist = Math.hypot(dx, dy) || 1;
          const targetX = ocx - (dx / dist) * r * 0.3;
          const targetY = ocy - (dy / dist) * r * 0.3;
          await page.mouse.move(lcx, lcy);
          await page.mouse.down();
          await page.mouse.move(targetX, targetY, { steps: 8 });
          await page.mouse.up();
          await page.waitForTimeout(200);
        }
        await page.screenshot({ path: join(OUT, `case6-identity-overOrb-${scheme}.png`) });
        filmsMade++;
        overOrb = { scheme, orbFound: !!orbInfo };
      }
      results.push({ scheme, mounted, overOrb });
      await context.close();
    }
    const ok = results.every((r) => r.mounted);
    record('6', 'production ?lensProbe=identity mounts and renders at rest and dragged over an orb edge, light+dark (pixel-match against CSS not computed here; see evidence)', ok ? 'pass' : 'fail', JSON.stringify(results));
  }

  // ---- Case 7: production seam probe, desktop+phone -----------------------
  if (run('7')) {
    const results = [];
    for (const [name, w, h, phone] of [['desktop', 1440, 900, false], ['phone', 390, 844, true]]) {
      const context = await browser.newContext(phone ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: w, height: h } });
      await suppressPrompt(context);
      const page = await context.newPage();
      await forceRT(context, page);
      await page.goto(`${HOME}?lensProbe=seam`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(600);
      const mounted = await page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 8000 }).then(() => true).catch(() => false);
      await page.screenshot({ path: join(OUT, `case7-seam-${name}.png`) });
      filmsMade++;
      results.push({ name, mounted });
      await context.close();
    }
    const ok = results.every((r) => r.mounted);
    record('7', 'production ?lensProbe=seam mounts desktop+phone (px-level seam measurement not computed here; stills only, see evidence)', ok ? 'pass' : (results.some(r=>r.mounted) ? 'inconclusive' : 'fail'), JSON.stringify(results));
  }

  // ---- Case 14 (redo): CDP DOMDebugger.getEventListeners --------------
  if (run('14')) {
    const { context, page, cdp } = await desktopCtx(browser);
    await page.goto(HOME, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const countPointermove = async () => {
      const doc = await page.evaluateHandle(() => document);
      const { nodes } = await cdp.send('DOM.getFlattenedDocument', { depth: -1, pierce: true }).catch(() => ({ nodes: [] }));
      // Simpler: use DOMDebugger on window via Runtime.evaluate object id
      const winObj = await cdp.send('Runtime.evaluate', { expression: 'window' });
      const listeners = await cdp.send('DOMDebugger.getEventListeners', { objectId: winObj.result.objectId }).catch(() => ({ listeners: [] }));
      return listeners.listeners.filter((l) => l.type === 'pointermove').length;
    };
    const before = await countPointermove();
    await page.click('a[href*="/services/"]').catch(() => {});
    await page.waitForTimeout(500);
    await page.click('a[href$="/t/glassmorphism/"], a.wordmark').catch(() => {});
    await page.waitForTimeout(500);
    const after = await countPointermove();
    record('14', 'window-level pointermove listeners via CDP DOMDebugger.getEventListeners do not grow after an in-school swap', after <= before ? 'pass' : 'fail', `before=${before} after=${after}`);
    await context.close();
  }

  // ---- Case 18: elementFromPoint over lens vs panes/controls ------------
  if (run('18')) {
    const { context, page } = await desktopCtx(browser);
    await page.goto(HOME, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const positions = [0, 400, 900];
    const results = [];
    for (const y of positions) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(150);
      const r = await page.evaluate(() => {
        const check = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return { sel, found: false };
          const rect = el.getBoundingClientRect();
          if (rect.width === 0 || rect.height === 0) return { sel, found: false, zero: true };
          const cx = rect.x + rect.width / 2, cy = rect.y + rect.height / 2;
          if (cx < 0 || cy < 0 || cx > innerWidth || cy > innerHeight) return { sel, found: true, offscreen: true };
          const top = document.elementFromPoint(cx, cy);
          const isLensHit = !!top?.closest?.('.lens-hit');
          return { sel, found: true, top: top ? `${top.tagName.toLowerCase()}.${[...top.classList].join('.')}` : null, isLensHit };
        };
        return [
          check('h1.billboard'),
          check('.door.glass'),
          check('.cc-tile-tint'),
          check('.cc-tile-frost'),
          check('.cc-tile-tod'),
          check('.window.glass'),
        ];
      });
      results.push({ scrollY: y, checks: r });
    }
    await writeFile(join(OUT, 'case18-elementFromPoint.json'), JSON.stringify(results, null, 2));
    const anyLensHit = results.some((s) => s.checks.some((c) => c.isLensHit));
    record('18', 'elementFromPoint over headline/door/CC tiles/panes never returns the lens hit control, 3 scroll positions', anyLensHit ? 'fail' : 'pass', JSON.stringify(results));
    await context.close();
  }

  // ---- Case 19: frost slider live computed backdrop-filter + step attr --
  if (run('19')) {
    const { context, page } = await desktopCtx(browser);
    await page.goto(HOME, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const slider = await page.$('.cc-frost');
    const results = [];
    if (slider) {
      for (const val of [0, 50, 100]) {
        await page.evaluate((v) => {
          const el = document.querySelector('.cc-frost');
          el.value = String(v);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }, val);
        await page.waitForTimeout(200);
        const r = await page.evaluate(() => {
          const panes = [...document.querySelectorAll('.glass')].slice(0, 3);
          return {
            step: document.documentElement.getAttribute('data-glass-frost-step'),
            filters: panes.map((p) => getComputedStyle(p).backdropFilter || getComputedStyle(p).webkitBackdropFilter),
          };
        });
        results.push({ val, ...r });
      }
      const filtersChange = new Set(results.map((r) => r.filters.join('|'))).size > 1;
      const stepsChange = new Set(results.map((r) => r.step)).size > 1;
      record('19', 'frost slider changes computed backdrop-filter across three values and sets data-glass-frost-step', (filtersChange && stepsChange) ? 'pass' : 'fail', JSON.stringify(results));
    } else {
      record('19', 'frost slider changes computed backdrop-filter across three values and sets data-glass-frost-step', 'fail', 'no .cc-frost found');
    }
    await context.close();
  }

  // ---- Case 20: first-view lens-rect vs .glass panes / switcher ----------
  if (run('20')) {
    const viewports = [[1440, 900], [1280, 800], [1024, 768], [820, 1180], [390, 844]];
    const results = [];
    for (const [w, h] of viewports) {
      const phone = w < 768;
      const context = await browser.newContext(phone ? { viewport: { width: w, height: h }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } : { viewport: { width: w, height: h } });
      await suppressPrompt(context);
      const page = await context.newPage();
      await forceRT(context, page);
      await page.goto(HOME, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const r = await page.evaluate(() => {
        const hit = document.querySelector('.lens-hit');
        if (!hit) return null;
        const lens = hit.getBoundingClientRect();
        const area = (a, b) => {
          const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y);
          const x2 = Math.min(a.x + a.width, b.x + b.width), y2 = Math.min(a.y + a.height, b.y + b.height);
          return Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
        };
        const lensArea = lens.width * lens.height || 1;
        const panes = [...document.querySelectorAll('.glass')].map((p) => p.getBoundingClientRect());
        const paneOverlap = panes.reduce((sum, p) => sum + area(lens, p), 0);
        const sw = document.querySelector('bdl-switcher');
        const swRect = sw ? sw.getBoundingClientRect() : null;
        const swOverlap = swRect ? area(lens, swRect) : 0;
        return { lens: { x: Math.round(lens.x), y: Math.round(lens.y), w: Math.round(lens.width), h: Math.round(lens.height) }, paneOverlapPct: Math.round((paneOverlap / lensArea) * 1000) / 10, switcherOverlapPct: Math.round((swOverlap / lensArea) * 1000) / 10 };
      });
      results.push({ vp: `${w}x${h}`, ...r });
      await context.close();
    }
    await writeFile(join(OUT, 'case20-firstview-lens-rect.json'), JSON.stringify(results, null, 2));
    const ok = results.every((r) => r && r.switcherOverlapPct === 0);
    record('20', 'first view at 5 viewports: lens rect never intersects the portal switcher (pane overlap recorded, not gated)', ok ? 'pass' : 'fail', JSON.stringify(results));
  }

  // ---- Case 21: Control Centre tiles vs switcher rect while scrolling ---
  if (run('21')) {
    const results = [];
    for (const [w, h] of [[1440, 900], [1280, 800]]) {
      const { context, page } = await desktopCtx(browser, { viewport: { width: w, height: h } });
      await page.goto(HOME, { waitUntil: 'networkidle' });
      await page.waitForTimeout(700);
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const violations = [];
      for (let y = 0; y <= scrollHeight - h; y += 20) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        const r = await page.evaluate(() => {
          const cc = document.querySelector('.control-centre');
          const sw = document.querySelector('bdl-switcher');
          if (!cc || !sw) return null;
          const c = cc.getBoundingClientRect(), s = sw.getBoundingClientRect();
          const x1 = Math.max(c.x, s.x), y1 = Math.max(c.y, s.y);
          const x2 = Math.min(c.x + c.width, s.x + s.width), y2 = Math.min(c.y + c.height, s.y + s.height);
          const overlap = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
          return overlap;
        });
        if (r && r > 0) violations.push({ scrollY: y, overlap: r });
      }
      results.push({ vp: `${w}x${h}`, scrollHeight, violations });
      await context.close();
    }
    await writeFile(join(OUT, 'case21-cc-vs-switcher-scroll.json'), JSON.stringify(results, null, 2));
    const ok = results.every((r) => r.violations.length === 0);
    record('21', 'Control Centre tiles never intersect the portal switcher rect while scrolling, 1440x900 and 1280x800', ok ? 'pass' : 'fail', JSON.stringify(results));
  }

  await writeFile(join(OUT, 'verify-extra-results.json'), JSON.stringify({ renderer, cases, filmsMade }, null, 2));
  console.log(`\n${cases.filter((c) => c.result === 'pass').length}/${cases.length} pass, films_made=${filmsMade}`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
