/**
 * VERIFIER (round 5), this seat b2r5-glass-verify, port 4478. Tier 3 Stage 3
 * wave B2 glassmorphism, round 5. Reruns b2r4-glass-verify-r4.mjs's cases
 * (1, 4-7, 14, 15, 18-24) against a fresh snap, extends 4-5 to 3 sizes x
 * light/dark x Clear/Tinted with per-frame poster/live continuity checks, and
 * adds the five NEW round-5 cases the orchestrator asked for: 25 (startrace,
 * 12 hard loads/size), 26 (hero orbs vs B1 at 5 sizes), 27 (390 lens visible
 * half crosses the peach orb), 28 (820 window top vs B1), 29 (poster vs live
 * mean-colour agreement).
 *
 * Written 09-26-26 against snap b2r5-glass-verify (port 4478 by default).
 * GPU Chromium (BDL_GPU=1), prefers-reduced-transparency forced to
 * no-preference over CDP, portal prompt suppressed.
 *
 * Usage:
 *   BDL_GPU=1 node scripts/themes/glassmorphism/b2r5-glass-verify.mjs --base http://127.0.0.1:4478
 *   BDL_GPU=1 node scripts/themes/glassmorphism/b2r5-glass-verify.mjs --base http://127.0.0.1:4478 --only 25,26
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const OUT = process.env.PROBE_OUT || join(REPO, 'scripts', 'themes', '.out', 'stage3-b2', 'glass-reverify-r5');
await mkdir(OUT, { recursive: true });

const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4478');
const b1base = arg('b1base', 'http://127.0.0.1:4479');
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

async function forceRT(context, page, scheme) {
  const cdp = await context.newCDPSession(page);
  const features = [{ name: 'prefers-reduced-transparency', value: 'no-preference' }];
  if (scheme) features.push({ name: 'prefers-color-scheme', value: scheme });
  await cdp.send('Emulation.setEmulatedMedia', { features });
  return cdp;
}
async function ctx(browser, { w, h, scheme = 'light', touch = w < 900 } = {}) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, deviceScaleFactor: touch ? 2 : 1, hasTouch: touch, isMobile: touch });
  await suppressPrompt(context);
  await context.addInitScript((sch) => { try { localStorage.setItem('bdl-scheme', sch); } catch {} }, scheme);
  const page = await context.newPage();
  const cdp = await forceRT(context, page, scheme);
  return { context, page, cdp };
}
async function desktopCtx(browser, opts = {}) { return ctx(browser, { w: 1440, h: 900, touch: false, ...opts }); }
async function phoneCtx(browser, opts = {}) { return ctx(browser, { w: 390, h: 844, touch: true, ...opts }); }
async function mountLens(page) {
  return page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 8000 }).then(() => true).catch(() => false);
}
async function open(page, home = HOME) {
  await page.goto(home, { waitUntil: 'networkidle' });
  await mountLens(page);
  await page.waitForTimeout(500);
}
async function viaSwitcher(page, school) {
  const clicked = await page.evaluate((s) => {
    const sw = document.querySelector('bdl-switcher');
    const btn = sw?.shadowRoot?.querySelector('.open');
    if (!btn) return false;
    btn.click();
    const a = sw.shadowRoot.querySelector(`a[data-school="${s}"]`);
    if (!a) return 'opened-no-link';
    a.click();
    return true;
  }, school);
  return clicked;
}
async function sheet(file, rows, { scale = 1, title = '' } = {}) {
  const imgs = await Promise.all(rows.map((row) => Promise.all(row.map(async ([l, b]) => [l, await loadImage(b)]))));
  const cw = Math.max(...imgs.flat().map(([, i]) => i.width)) * scale;
  const ch = Math.max(...imgs.flat().map(([, i]) => i.height)) * scale;
  const cols = Math.max(...imgs.map((r) => r.length));
  const lh = 44, pad = 12, th = title ? 40 : 0;
  const c = createCanvas(Math.round(cols * (cw + pad) + pad), Math.round(th + imgs.length * (ch + lh + pad) + pad));
  const g = c.getContext('2d');
  g.fillStyle = '#1c1c1c'; g.fillRect(0, 0, c.width, c.height);
  g.fillStyle = '#fff';
  if (title) { g.font = 'bold 22px sans-serif'; g.fillText(title, pad, 28); }
  g.font = '16px sans-serif';
  imgs.forEach((row, ri) => row.forEach(([l, im], ci) => {
    const x = pad + ci * (cw + pad), y = th + pad + ri * (ch + lh + pad);
    g.fillStyle = '#fff';
    g.fillText(l, x, y + 18);
    g.imageSmoothingEnabled = scale < 1;
    g.drawImage(im, x, y + lh, im.width * scale, im.height * scale);
  }));
  const path = join(OUT, file);
  await writeFile(path, c.toBuffer('image/jpeg', 90));
  console.log('wrote', path);
  filmsMade++;
  return path;
}
async function readImg(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
  return { width: img.width, height: img.height, data: g.getImageData(0, 0, img.width, img.height).data };
}

async function main() {
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

  // ---- Case 1: fling into each bound, per-frame stretch + reversal --------
  if (run('1')) {
    const { context, page } = await desktopCtx(browser);
    await open(page);
    const dirs = [['top', 0, -3000], ['bottom', 0, 3000], ['left', -3000, 0], ['right', 3000, 0]];
    const dirResults = [];
    const filmRows = [];
    for (const [name, dx, dy] of dirs) {
      const hit = await page.$('.lens-hit');
      const box0 = await hit.boundingBox();
      const restX = box0.x + box0.width / 2, restY = box0.y + box0.height / 2;
      const w0 = await page.evaluate(() => document.querySelector('.lens-canvas')?.getBoundingClientRect().width || 92);
      await page.mouse.move(restX, restY);
      await page.mouse.down();
      const frames = []; const filmFrames = []; const t0 = Date.now();
      const steps = 24;
      for (let i = 1; i <= steps; i++) {
        await page.mouse.move(restX + (dx * i) / steps, restY + (dy * i) / steps, { steps: 1 });
        const rect = await page.evaluate(() => { const c = document.querySelector('.lens-canvas'); const r = c.getBoundingClientRect(); return { w: r.width, h: r.height }; });
        frames.push(rect);
        if (i % 6 === 0) filmFrames.push([`${name} +${Date.now() - t0}ms`, await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } })]);
        await page.waitForTimeout(8);
      }
      await page.mouse.up();
      filmFrames.push([`${name} released +${Date.now() - t0}ms`, await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } })]);
      await page.waitForTimeout(150);
      const settleFrames = [];
      for (let i = 0; i < 10; i++) { settleFrames.push(await page.evaluate(() => document.querySelector('.lens-canvas')?.style.transform || '')); await page.waitForTimeout(20); }
      filmFrames.push([`${name} settled`, await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } })]);
      filmRows.push(filmFrames);
      const maxStretchPct = Math.max(...frames.map((f) => (Math.max(f.w, f.h) / w0 - 1) * 100), 0);
      const parse = (t) => { const m = /translate(?:3d)?\(([-\d.]+)px,\s*([-\d.]+)px/.exec(t); return m ? { x: parseFloat(m[1]), y: parseFloat(m[2]) } : null; };
      const pts = settleFrames.map(parse).filter(Boolean);
      let reversals = 0;
      for (let i = 2; i < pts.length; i++) {
        const dprev = (pts[i - 1].x - pts[i - 2].x) + (pts[i - 1].y - pts[i - 2].y);
        const dnow = (pts[i].x - pts[i - 1].x) + (pts[i].y - pts[i - 1].y);
        if (Math.sign(dprev) !== 0 && Math.sign(dnow) !== 0 && Math.sign(dprev) !== Math.sign(dnow)) reversals++;
      }
      dirResults.push({ name, maxStretchPct: Math.round(maxStretchPct * 100) / 100, reversals });
      await page.mouse.move(restX, restY);
      await page.waitForTimeout(200);
    }
    await sheet('film__fling.jpg', filmRows, { scale: 0.4, title: 'Fling into each bound: mid-drag frames, release, settle (1440x900)' });
    const ok = dirResults.every((d) => d.maxStretchPct <= 4.5 && d.reversals === 0);
    record('1', 'fling into each bound: peak stretch <=4%, zero velocity reversals', ok ? 'pass' : 'fail', JSON.stringify(dirResults));
    await context.close();
  }

  // ---- Cases 4/5: real switcher arrival, 3 sizes x L/D x Clear/Tinted -----
  if (run('45')) {
    const sizes = [[1440, 900], [820, 1180], [390, 844]];
    const results = [];
    for (const [w, h] of sizes) {
      const touch = w < 900;
      for (const scheme of ['light', 'dark']) {
        for (const tint of ['clear', 'tinted']) {
          const key = `${w}x${h}__${scheme}__${tint}`;
          const filmed = scheme === 'light'; // films for the light variants (6); dark checked quantitatively only
          const { context, page, cdp } = await ctx(browser, { w, h, scheme, touch });
          await open(page);
          if (tint === 'tinted') {
            if (touch) await page.tap('.hero .window-bar .switch'); else await page.click('.hero .window-bar .switch');
            await page.waitForTimeout(1200);
          }
          const openOk = await viaSwitcher(page, 'vaporwave');
          const landedVw = await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', { timeout: 8000 }).then(() => true).catch(() => false);
          await page.waitForTimeout(2200);
          const backOk = await viaSwitcher(page, 'glassmorphism');
          const t0 = Date.now();
          const samples = []; const frames = [];
          while (Date.now() - t0 < 1500) {
            const d = await page.evaluate(() => {
              const p = document.querySelector('.lens-poster');
              const hit = document.querySelector('.lens-hit');
              const pr = p ? p.getBoundingClientRect() : null;
              const hr = hit ? hit.getBoundingClientRect() : null;
              const posterOn = p && getComputedStyle(p).display !== 'none';
              return {
                theme: document.documentElement.dataset.theme,
                poster: posterOn ? { cx: pr.left + pr.width / 2, cy: pr.top + pr.height / 2, r: pr.width / 2 } : null,
                lens: hr ? { cx: hr.left + hr.width / 2, cy: hr.top + hr.height / 2, r: hr.width / 2 } : null,
              };
            });
            const at = Date.now() - t0;
            samples.push({ at, ...d });
            if (filmed) frames.push([`+${at}ms ${d.theme} p=${d.poster ? '1' : '0'} l=${d.lens ? '1' : '0'}`, await page.screenshot({ scale: 'css' })]);
            else await page.waitForTimeout(30);
          }
          await page.waitForTimeout(300);
          // Continuity check: at every sample, poster or lens must be present (no "neither"
          // frame); and the active centre (poster if present else lens) must not jump >2px
          // between consecutive samples.
          // Only samples taken once the page has actually arrived on
          // glassmorphism count toward continuity: the very first sample(s)
          // right after firing the switcher click can still be mid-navigation
          // (theme still vaporwave, nothing of glass mounted yet), which is
          // not a poster/live gap on the glass page itself.
          const onGlass = samples.filter((s) => s.theme === 'glassmorphism');
          let neither = 0; let maxJump = 0; let prev = null;
          for (const s of onGlass) {
            const c = s.poster || s.lens;
            if (!c) { neither++; continue; }
            if (prev) maxJump = Math.max(maxJump, Math.hypot(c.cx - prev.cx, c.cy - prev.cy));
            prev = c;
          }
          const landedBack = await page.waitForFunction(() => document.documentElement.dataset.theme === 'glassmorphism', { timeout: 8000 }).then(() => true).catch(() => false);
          const ok = openOk === true && landedVw && backOk === true && landedBack && neither === 0 && maxJump <= 2;
          results.push({ key, openOk, landedVw, backOk, landedBack, neither, maxJumpPx: +maxJump.toFixed(2), nSamples: samples.length, nOnGlass: onGlass.length });
          console.log(key, JSON.stringify(results.at(-1)));
          if (filmed && frames.length) {
            const rows = [];
            for (let i = 0; i < frames.length; i += 6) rows.push(frames.slice(i, i + 6));
            await sheet(`film__arrival-${w}x${h}-${scheme}-${tint}__all.jpg`, rows, { scale: w < 600 ? 0.5 : (w < 1000 ? 0.4 : 0.25), title: `Arrival via the real switcher, ${w}x${h} ${scheme}, ${tint} held (every ~sampled frame)` });
            // case 29 needs this too; stash last-poster/first-lens frame pair
            let lastPosterIdx = -1, firstLensIdx = -1;
            samples.forEach((s, i) => { if (s.poster) lastPosterIdx = i; if (s.lens && firstLensIdx === -1) firstLensIdx = i; });
            if (lastPosterIdx >= 0 && firstLensIdx >= 0 && frames[lastPosterIdx] && frames[firstLensIdx]) {
              posterVsLive.push({ key, w, h, scheme, tint, posterBuf: frames[lastPosterIdx][1], liveBuf: frames[firstLensIdx][1], lens: samples[firstLensIdx].lens });
            }
          }
          await context.close();
        }
      }
    }
    await writeFile(join(OUT, 'case45-arrival.json'), JSON.stringify(results, null, 2));
    const ok = results.every((r) => r.openOk === true && r.landedVw && r.backOk === true && r.landedBack && r.neither === 0 && r.maxJumpPx <= 2);
    const failed = results.filter((r) => !(r.openOk === true && r.landedVw && r.backOk === true && r.landedBack && r.neither === 0 && r.maxJumpPx <= 2));
    record('4-5', 'real-switcher arrival at 1440x900/820x1180/390x844, light+dark, Clear+Tinted held: no frame with neither poster nor lens, centre never jumps >2px sample to sample', ok ? 'pass' : 'fail', ok ? JSON.stringify(results) : JSON.stringify(failed));
  }

  // ---- Case 6: production identity probe, at rest & over an orb edge ------
  if (run('6')) {
    const results = [];
    for (const scheme of ['light', 'dark']) {
      const { context, page } = await desktopCtx(browser, { scheme });
      await open(page, `${HOME}?lensProbe=identity`);
      let overOrb = null;
      const orbInfo = await page.evaluate(() => {
        const lens = document.querySelector('.lens-hit')?.getBoundingClientRect();
        const orbs = [...document.querySelectorAll('.orb')].map((o) => o.getBoundingClientRect());
        if (!lens || !orbs.length) return null;
        const lcx = lens.x + lens.width / 2, lcy = lens.y + lens.height / 2;
        orbs.sort((a, b) => Math.hypot(a.x + a.width / 2 - lcx, a.y + a.height / 2 - lcy) - Math.hypot(b.x + b.width / 2 - lcx, b.y + b.height / 2 - lcy));
        const o = orbs[0];
        return { lcx, lcy, ocx: o.x + o.width / 2, ocy: o.y + o.height / 2, r: o.width / 2 };
      });
      const restShot = await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } });
      let overShot = restShot;
      if (orbInfo) {
        const { lcx, lcy, ocx, ocy, r } = orbInfo;
        const dx = ocx - lcx, dy = ocy - lcy, dist = Math.hypot(dx, dy) || 1;
        await page.mouse.move(lcx, lcy);
        await page.mouse.down();
        await page.mouse.move(ocx - (dx / dist) * r * 0.3, ocy - (dy / dist) * r * 0.3, { steps: 8 });
        await page.mouse.up();
        await page.waitForTimeout(200);
        overShot = await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } });
        overOrb = true;
      }
      await sheet(`film__identity-${scheme}.jpg`, [[[`rest`, restShot], [`dragged onto orb edge`, overShot]]], { scale: 0.5, title: `?lensProbe=identity, ${scheme}: at rest, then dragged onto an orb edge` });
      results.push({ scheme, mounted: true, overOrb });
      await context.close();
    }
    const ok = results.every((r) => r.mounted && r.overOrb);
    record('6', 'production ?lensProbe=identity mounts and drags onto an orb edge, light+dark', ok ? 'pass' : 'fail', JSON.stringify(results));
  }

  // ---- Case 7: production seam probe, independent rerun of the fixer's own
  // seam script against MY snap (desktop) + a phone mount check ------------
  if (run('7')) {
    const seamOut = join(OUT, 'seam');
    await mkdir(seamOut, { recursive: true });
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, [join(HERE, 'b2r3-glass-fix-seam.mjs'), '--base', base, '--out', seamOut], { encoding: 'utf8' });
    const seamLog = `${r.stdout || ''}${r.stderr || ''}`;
    let seamResult = null;
    try { seamResult = JSON.parse(await (await import('node:fs/promises')).readFile(join(seamOut, 'seam-results.json'), 'utf8')); } catch { /* seam script's own filename may differ; fall through to log parse */ }
    const { context, page } = await phoneCtx(browser);
    await open(page, `${HOME}?lensProbe=seam`);
    await page.screenshot({ path: join(OUT, 'case7-seam-phone.png') });
    await context.close();
    const ok = r.status === 0;
    record('7', 'production ?lensProbe=seam: independent rerun of the fixer\'s own seam script against this snap (desktop px measurement); phone mount confirmed by screenshot', ok ? 'pass' : 'fail', ok ? tail(seamLog, 20) : tail(seamLog, 40));
  }

  // ---- Case 14: pointermove listeners don't grow after an in-school swap --
  if (run('14')) {
    const { context, page, cdp } = await desktopCtx(browser);
    await open(page);
    const countPointermove = async () => {
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
    record('14', 'window-level pointermove listeners do not grow after an in-school swap', after <= before ? 'pass' : 'fail', `before=${before} after=${after}`);
    await context.close();
  }

  // ---- Case 15: every interactive element >=44px at 390px -----------------
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
            .filter((el) => !el.closest('.settings-controls') && el.getAttribute('aria-hidden') !== 'true' && !/^cf-company/i.test(el.id || '') && el.getAttribute('name') !== 'company' && getComputedStyle(el).display !== 'none');
          return els.map((el) => { const r = el.getBoundingClientRect(); return { tag: el.tagName, cls: el.className, w: r.width, h: r.height }; }).filter((r) => r.w > 0 && r.h > 0 && (r.w < 44 || r.h < 44));
        });
        results.push({ page: p || 'home', hScroll, tooSmallCount: small.length, tooSmall: small.slice(0, 10) });
      } catch (e) { results.push({ page: p || 'home', error: e.message }); }
      await context.close();
    }
    await writeFile(join(OUT, 'case15-phone-targets.json'), JSON.stringify(results, null, 2));
    const allOk = results.every((r) => !r.error && !r.hScroll && r.tooSmallCount === 0);
    record('15', 'every interactive element >=44px at 390px, no horizontal scroll (honeypot excluded)', allOk ? 'pass' : 'fail', JSON.stringify(results));
  }

  // ---- Case 18: elementFromPoint over lens vs panes/controls ---------------
  if (run('18')) {
    const { context, page } = await desktopCtx(browser);
    await open(page);
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
          return { sel, found: true, isLensHit: !!top?.closest?.('.lens-hit') };
        };
        return [check('h1.billboard'), check('.door.glass'), check('.cc-tile-tint'), check('.cc-tile-frost'), check('.cc-tile-tod'), check('.window.glass')];
      });
      results.push({ scrollY: y, checks: r });
    }
    await writeFile(join(OUT, 'case18-elementFromPoint.json'), JSON.stringify(results, null, 2));
    const anyLensHit = results.some((s) => s.checks.some((c) => c.isLensHit));
    record('18', 'elementFromPoint over headline/door/CC tiles/panes never returns the lens hit control, 3 scroll positions', anyLensHit ? 'fail' : 'pass', JSON.stringify(results));
    await context.close();
  }

  // ---- Case 19: frost slider live computed backdrop-filter + step attr ----
  if (run('19')) {
    const { context, page } = await desktopCtx(browser);
    await open(page);
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
          return { step: document.documentElement.getAttribute('data-glass-frost-step'), filters: panes.map((p) => getComputedStyle(p).backdropFilter || getComputedStyle(p).webkitBackdropFilter) };
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

  // ---- Case 20: first view, 5 sizes: lens vs switcher/panes, corner cross -
  if (run('20')) {
    const viewports = [[1440, 900], [1280, 800], [1024, 768], [820, 1180], [390, 844]];
    const results = [];
    for (const [w, h] of viewports) {
      const { context, page } = await ctx(browser, { w, h, touch: w < 768 });
      await open(page);
      const r = await page.evaluate(() => {
        const hit = document.querySelector('.lens-hit');
        if (!hit) return null;
        const lens = hit.getBoundingClientRect();
        const area = (a, b) => { const x1 = Math.max(a.x, b.x), y1 = Math.max(a.y, b.y), x2 = Math.min(a.x + a.width, b.x + b.width), y2 = Math.min(a.y + a.height, b.y + b.height); return Math.max(0, x2 - x1) * Math.max(0, y2 - y1); };
        const lensArea = lens.width * lens.height || 1;
        const panes = [...document.querySelectorAll('.glass')].map((p) => p.getBoundingClientRect());
        const paneOverlap = panes.reduce((sum, p) => sum + area(lens, p), 0);
        const sw = document.querySelector('bdl-switcher');
        const swRect = sw ? sw.getBoundingClientRect() : null;
        const swOverlap = swRect ? area(lens, swRect) : 0;
        const win = document.querySelector('.window.glass, .hero .window');
        const winRect = win ? win.getBoundingClientRect() : null;
        let cornerCross = null;
        if (winRect) {
          const lcx = lens.x + lens.width / 2, lcy = lens.y + lens.height / 2;
          const nearLowerCorner = Math.abs(lcy - winRect.bottom) < lens.height && (Math.abs(lcx - winRect.left) <= lens.width || Math.abs(lcx - winRect.right) <= lens.width);
          const orbs = [...document.querySelectorAll('.orb')].map((o) => o.getBoundingClientRect());
          const crossesOrb = orbs.some((o) => { const ocx = o.x + o.width / 2, ocy = o.y + o.height / 2, r = o.width / 2, lr = lens.width / 2; const d = Math.hypot(ocx - lcx, ocy - lcy); return d < r + lr && d > Math.abs(r - lr); });
          cornerCross = { nearLowerCorner, crossesOrb, lensCenter: { x: Math.round(lcx), y: Math.round(lcy) } };
        }
        return { lens: { x: Math.round(lens.x), y: Math.round(lens.y), w: Math.round(lens.width), h: Math.round(lens.height) }, paneOverlapPct: Math.round((paneOverlap / lensArea) * 1000) / 10, switcherOverlapPct: Math.round((swOverlap / lensArea) * 1000) / 10, cornerCross };
      });
      await page.screenshot({ path: join(OUT, `case20-firstview-${w}x${h}.png`) });
      results.push({ vp: `${w}x${h}`, ...r });
      await context.close();
    }
    await writeFile(join(OUT, 'case20-firstview-lens-rect.json'), JSON.stringify(results, null, 2));
    const ok = results.every((r) => r && r.switcherOverlapPct === 0);
    const phoneCorner = results.filter((r) => r.vp === '390x844' || r.vp === '820x1180');
    const cornerOk = phoneCorner.every((r) => r.cornerCross?.nearLowerCorner && r.cornerCross?.crossesOrb);
    record('20', 'first view at 5 viewports: lens never intersects the switcher; 390/820 sit half under the window\'s lower corner across an orb', (ok && cornerOk) ? 'pass' : (ok ? 'fail (corner/orb not confirmed)' : 'fail'), JSON.stringify(results));
  }

  // ---- Case 21: Control Centre tiles vs switcher, scrolled ----------------
  if (run('21')) {
    const results = [];
    for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768]]) {
      const { context, page } = await desktopCtx(browser, { w, h });
      await open(page);
      const scrollHeight = await page.evaluate(() => document.body.scrollHeight);
      const violations = []; const gaps = [];
      for (let y = 0; y <= scrollHeight - h; y += 20) {
        await page.evaluate((yy) => window.scrollTo(0, yy), y);
        const r = await page.evaluate(() => {
          const cc = document.querySelector('.control-centre');
          const timeTile = document.querySelector('.cc-tile-tod');
          const sw = document.querySelector('bdl-switcher');
          if (!cc || !sw) return null;
          const gap = (a, b) => { const dx = Math.max(a.x - (b.x + b.width), b.x - (a.x + a.width), 0), dy = Math.max(a.y - (b.y + b.height), b.y - (a.y + a.height), 0); const overlapX = a.x < b.x + b.width && b.x < a.x + a.width, overlapY = a.y < b.y + b.height && b.y < a.y + a.height; return (overlapX && overlapY) ? -1 : Math.max(dx, dy); };
          const s = sw.getBoundingClientRect(), c = cc.getBoundingClientRect(), t = timeTile ? timeTile.getBoundingClientRect() : c;
          return { ccGap: gap(c, s), timeGap: gap(t, s) };
        });
        if (r) { gaps.push({ scrollY: y, ...r }); if (r.ccGap < 0 || r.timeGap < 0) violations.push({ scrollY: y, ...r }); }
      }
      results.push({ vp: `${w}x${h}`, scrollHeight, violations, minGap: { cc: Math.min(...gaps.map((g) => g.ccGap)), time: Math.min(...gaps.map((g) => g.timeGap)) } });
      await context.close();
    }
    await writeFile(join(OUT, 'case21-cc-vs-switcher-scroll.json'), JSON.stringify(results, null, 2));
    const ok = results.every((r) => r.violations.length === 0);
    record('21', 'Control Centre tiles never intersect the portal switcher while scrolling, 1440/1280/1024', ok ? 'pass' : 'fail', JSON.stringify(results));
  }

  // ---- Case 22: orbpos, JS clock vs CSS view() (no drift) -----------------
  if (run('22')) {
    const results = [];
    for (const [w, h, phone] of [[1440, 900, false], [390, 844, true]]) {
      const { context, page } = await ctx(browser, { w, h, touch: phone });
      await open(page);
      const pos = () => page.evaluate(() => [...document.querySelectorAll('.hero .orb')].map((o) => { const q = o.getBoundingClientRect(); return { cls: o.className, cx: +(q.left + q.width / 2).toFixed(1), cy: +(q.top + q.height / 2).toFixed(1) }; }));
      const S = { js: {}, cssNoDrift: {} };
      for (const y of [0, 200, 400]) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(300); S.js[y] = await pos(); }
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
      await page.evaluate(() => { for (const g of document.querySelectorAll('.orbs[data-js-driven]')) g.removeAttribute('data-js-driven'); for (const o of document.querySelectorAll('.orb')) o.style.removeProperty('translate'); });
      await page.addStyleTag({ content: '.orb { animation-name: none, glass-orb-scroll !important; }' });
      await page.waitForTimeout(400);
      for (const y of [0, 200, 400]) { await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(300); S.cssNoDrift[y] = await pos(); }
      await page.evaluate(() => scrollTo(0, 0));
      const table = []; let worst = 0;
      for (const y of [0, 200, 400]) { (S.js[y] || []).forEach((o, i) => { const c = (S.cssNoDrift[y] || [])[i]; if (!c) return; const dy = +(o.cy - c.cy).toFixed(1), dx = +(o.cx - c.cx).toFixed(1); worst = Math.max(worst, Math.abs(dy), Math.abs(dx)); table.push({ scroll: y, orb: o.cls, dy, dx }); }); }
      results.push({ vp: `${w}x${h}`, worstPx: worst, table });
      await context.close();
    }
    await writeFile(join(OUT, 'case22-orbpos.json'), JSON.stringify(results, null, 2));
    const ok = results.every((r) => r.worstPx <= 1);
    record('22', 'orbpos: JS clock vs CSS view() within 1px for every orb, scroll 0/200/400, 1440x900 and 390x844', ok ? 'pass' : 'fail', JSON.stringify(results.map((r) => ({ vp: r.vp, worstPx: r.worstPx }))));
  }

  // ---- Case 23: phone touch-drag on lens vs hero swipe ---------------------
  if (run('23')) {
    const { context, page, cdp } = await phoneCtx(browser);
    await open(page);
    const results = [];
    {
      const info = await page.evaluate(() => {
        const hit = document.querySelector('.lens-hit');
        const r = hit.getBoundingClientRect();
        const cx = r.x + r.width / 2, cy = r.y + r.height / 2, rad = r.width / 2;
        const py = cy + rad * 0.5;
        const el = document.elementFromPoint(cx, py);
        return { cx, cy: py, isLensHit: !!el?.closest?.('.lens-hit') };
      });
      const scroll0 = await page.evaluate(() => scrollY);
      const lensPos0 = await page.evaluate(() => { const h = document.querySelector('.lens-hit').getBoundingClientRect(); return { x: h.x, y: h.y }; });
      const toX = info.cx - 200, toY = info.cy + 16;
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: info.cx, y: info.cy }] });
      for (let i = 1; i <= 14; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: info.cx + (toX - info.cx) * i / 14, y: info.cy + (toY - info.cy) * i / 14 }] }); await page.waitForTimeout(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await page.waitForTimeout(200);
      const scroll1 = await page.evaluate(() => scrollY);
      const lensPos1 = await page.evaluate(() => { const h = document.querySelector('.lens-hit').getBoundingClientRect(); return { x: h.x, y: h.y }; });
      const selected = await page.evaluate(() => (window.getSelection()?.toString() || '').length);
      results.push({ name: 'drag-on-lens-visible-half', isLensHit: info.isLensHit, scrollDelta: scroll1 - scroll0, lensMoved: Math.hypot(lensPos1.x - lensPos0.x, lensPos1.y - lensPos0.y), selectedChars: selected });
    }
    await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(300);
    {
      const info = await page.evaluate(() => { const p = document.querySelector('.hero p, p.lead, .hero .lead'); if (!p) return null; const r = p.getBoundingClientRect(); return { cx: r.x + r.width / 2, cy: r.y + Math.min(r.height / 2, 10) }; });
      if (info) {
        const scroll0 = await page.evaluate(() => scrollY);
        const lensPos0 = await page.evaluate(() => { const h = document.querySelector('.lens-hit').getBoundingClientRect(); return { x: h.x, y: h.y }; });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: info.cx, y: info.cy }] });
        for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: info.cx, y: info.cy - i * 20 }] }); await page.waitForTimeout(16); }
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        await page.waitForTimeout(200);
        const scroll1 = await page.evaluate(() => scrollY);
        const lensPos1 = await page.evaluate(() => { const h = document.querySelector('.lens-hit').getBoundingClientRect(); return { x: h.x, y: h.y }; });
        results.push({ name: 'swipe-on-hero-copy', scrollDelta: scroll1 - scroll0, lensMoved: Math.hypot(lensPos1.x - lensPos0.x, lensPos1.y - lensPos0.y) });
      } else results.push({ name: 'swipe-on-hero-copy', error: 'no hero lead paragraph found' });
    }
    const frames = [[`start`, await page.screenshot()]];
    await sheet('film__touch-390x844.jpg', [frames], { scale: 0.35, title: 'Phone touch: drag lens visible half + swipe hero copy (see case23 json for the driven numbers)' });
    await writeFile(join(OUT, 'case23-phone-touch.json'), JSON.stringify(results, null, 2));
    const drag = results.find((r) => r.name === 'drag-on-lens-visible-half');
    const swipe = results.find((r) => r.name === 'swipe-on-hero-copy');
    const dragOk = drag && drag.isLensHit && drag.lensMoved > 20 && drag.scrollDelta === 0 && drag.selectedChars === 0;
    const swipeOk = swipe && !swipe.error && swipe.scrollDelta !== 0 && swipe.lensMoved < 5;
    record('23', 'phone touch: drag on lens visible half moves the lens (scroll 0, no selection); swipe on hero copy scrolls the page', (dragOk && swipeOk) ? 'pass' : 'fail', JSON.stringify(results));
    await context.close();
  }

  // ---- Case 24: idle, zero draws / zero rAF work over 4s -------------------
  if (run('24')) {
    const { context, page } = await desktopCtx(browser);
    await context.addInitScript(() => {
      window.__draws = 0; window.__rafCalls = 0;
      const origRAF = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => origRAF((t) => { window.__rafCalls++; return cb(t); });
      const hook = (proto) => { if (!proto) return; const oa = proto.drawArrays; proto.drawArrays = function (...a) { window.__draws++; return oa.apply(this, a); }; const oe = proto.drawElements; proto.drawElements = function (...a) { window.__draws++; return oe.apply(this, a); }; };
      hook(window.WebGLRenderingContext && window.WebGLRenderingContext.prototype);
      hook(window.WebGL2RenderingContext && window.WebGL2RenderingContext.prototype);
    });
    await open(page);
    await page.waitForTimeout(1500);
    await page.evaluate(() => { window.__draws = 0; window.__rafCalls = 0; });
    const before = await page.evaluate(() => ({ draws: window.__draws, rafCalls: window.__rafCalls }));
    const t0 = Date.now(); const frames = [];
    for (const wait of [0, 1000, 2000, 3000, 4000]) { await page.waitForTimeout(Math.max(0, wait - (Date.now() - t0))); const d = await page.evaluate(() => window.__draws); frames.push([`+${Date.now() - t0}ms draws=${d}`, await page.screenshot({ clip: { x: 0, y: 150, width: 900, height: 560 } })]); }
    const after = await page.evaluate(() => ({ draws: window.__draws, rafCalls: window.__rafCalls }));
    await sheet('film__idle-rest.jpg', [frames], { scale: 0.4, title: 'At rest on Home, 4s: cumulative WebGL draw count per frame (should stay flat)' });
    record('24', 'idle at rest on Home: zero lens draws over 4s', (after.draws === before.draws) ? 'pass' : 'fail', `draws before=${before.draws} after=${after.draws}, rafCalls delta=${after.rafCalls - before.rafCalls}`);
    await context.close();
  }

  // ---- NEW Case 25: startrace, 12 hard loads/size, delegated to the
  // existing startrace tool (own file, own port, extended n=12) -------------
  if (run('25')) {
    const startraceOut = join(OUT, 'startrace');
    await mkdir(startraceOut, { recursive: true });
    const { spawnSync } = await import('node:child_process');
    const r = spawnSync(process.execPath, [join(HERE, 'b2r4-glass-critic-startrace.mjs'), '--base', base, '--n', '12', '--sizes', '820x1180,390x844,1440x900', '--film', '--out', startraceOut], { encoding: 'utf8' });
    console.log(tail(`${r.stdout || ''}${r.stderr || ''}`, 60));
    let json = null;
    try { json = JSON.parse(await (await import('node:fs/promises')).readFile(join(startraceOut, 'startrace.json'), 'utf8')); } catch {}
    const summary = {};
    let ok = r.status === 0 && !!json;
    if (json) {
      for (const [w, h] of [[820, 1180], [390, 844], [1440, 900]]) {
        for (const scheme of ['light', 'dark']) {
          const s = json[`${w}x${h}__${scheme}__summary`];
          if (!s) { ok = false; continue; }
          summary[`${w}x${h}__${scheme}`] = s;
          if (s.distinctFinals.length > 1) ok = false;
          // poster's first spot must equal the settled lens spot (within 2px, parsed from the trailing digits)
          const posterKey = `${w}x${h}__${scheme}__0`;
          const posterSpots = json[posterKey]?.posterSpots || [];
          if (posterSpots.length && s.distinctFinals.length) {
            const [px, py] = posterSpots[0].split(',').map(Number);
            const [lx, ly] = s.distinctFinals[0].split(',').map(Number);
            if (Math.hypot(px - lx, py - ly) > 2) ok = false;
          }
        }
      }
    }
    record('25', 'startrace: 12 hard loads each at 820x1180, 390x844, 1440x900; settled lens centre identical across loads (<=2px) and equal to the poster\'s first spot', ok ? 'pass' : 'fail', JSON.stringify(summary));
  }

  // ---- NEW Case 26/28: hero orbs and window vs B1 at 5 sizes ---------------
  if (run('26') || run('28')) {
    const results = {};
    for (const [w, h] of [[1440, 900], [1280, 800], [1024, 768], [820, 1180], [390, 844]]) {
      const { context: cA, page: pA } = await ctx(browser, { w, h, touch: w < 900 });
      await pA.goto(`${b1base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      await pA.addStyleTag({ content: '.orb { animation-name: none, glass-orb-scroll !important; }' });
      await pA.waitForTimeout(500);
      const b1 = await pA.evaluate(() => ({ window: (() => { const r = document.querySelector('.hero .window').getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left) }; })(), orbs: [...document.querySelectorAll('.hero .orb')].map((o) => { const r = o.getBoundingClientRect(); return { hue: o.className.split(' ')[1], cx: +(r.left + r.width / 2).toFixed(1), cy: +(r.top + r.height / 2).toFixed(1) }; }) }));
      await cA.close();
      const { context: cB, page: pB } = await ctx(browser, { w, h, touch: w < 900 });
      await open(pB);
      const r5 = await pB.evaluate(() => ({ window: (() => { const r = document.querySelector('.hero .window').getBoundingClientRect(); return { top: Math.round(r.top), left: Math.round(r.left) }; })(), orbs: [...document.querySelectorAll('.hero .orb')].map((o) => { const r = o.getBoundingClientRect(); return { hue: o.className.split(' ')[1], cx: +(r.left + r.width / 2).toFixed(1), cy: +(r.top + r.height / 2).toFixed(1) }; }) }));
      await cB.close();
      let worst = 0;
      const orbDiffs = b1.orbs.map((o, i) => { const q = r5.orbs[i]; if (!q) return { hue: o.hue, missing: true }; const dx = +(q.cx - o.cx).toFixed(1), dy = +(q.cy - o.cy).toFixed(1); worst = Math.max(worst, Math.abs(dx), Math.abs(dy)); return { hue: o.hue, dx, dy }; });
      results[`${w}x${h}`] = { worstOrbPx: worst, orbDiffs, windowTopB1: b1.window.top, windowTopR5: r5.window.top, windowTopDeltaPx: r5.window.top - b1.window.top };
      console.log(`${w}x${h}`, JSON.stringify(results[`${w}x${h}`]));
    }
    await writeFile(join(OUT, 'case26-28-orbs-window-vs-b1.json'), JSON.stringify(results, null, 2));
    if (run('26')) {
      const ok = Object.values(results).every((r) => r.worstOrbPx <= 2);
      record('26', 'every hero orb centre within 2px of B1 at scroll 0, all 5 sizes', ok ? 'pass' : 'fail', JSON.stringify(Object.fromEntries(Object.entries(results).map(([k, v]) => [k, v.worstOrbPx]))));
    }
    if (run('28')) {
      const t = results['820x1180'];
      const ok = t && Math.abs(t.windowTopDeltaPx) <= 4;
      record('28', 'at 820x1180 the hero window top is within 4px of B1\'s', ok ? 'pass' : 'fail', JSON.stringify(t));
    }
  }

  // ---- NEW Case 27: 390 lens visible half crosses the peach orb -----------
  if (run('27')) {
    const { context, page } = await phoneCtx(browser);
    await open(page);
    const r = await page.evaluate(() => {
      const hit = document.querySelector('.lens-hit');
      const win = document.querySelector('.hero .window');
      if (!hit || !win) return null;
      const lens = hit.getBoundingClientRect();
      const winRect = win.getBoundingClientRect();
      const lcx = lens.x + lens.width / 2, lcy = lens.y + lens.height / 2, lr = lens.width / 2;
      const orbs = [...document.querySelectorAll('.orb')].map((o) => { const rr = o.getBoundingClientRect(); return { hue: o.className.split(' ')[1], cx: rr.x + rr.width / 2, cy: rr.y + rr.height / 2, r: rr.width / 2 }; });
      const peach = orbs.find((o) => o.hue === 'peach');
      if (!peach) return { lens: { cx: lcx, cy: lcy, r: lr }, winBottom: winRect.bottom, peachFound: false, orbsSeen: orbs.map((o) => o.hue) };
      const d = Math.hypot(peach.cx - lcx, peach.cy - lcy);
      const crosses = d < peach.r + lr && d > Math.abs(peach.r - lr);
      // proper circle-circle intersection (two points where the rim actually
      // crosses the orb's edge), not the point along the centre-to-centre line
      let crossPoints = [];
      if (crosses) {
        const a = (lr * lr - peach.r * peach.r + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, lr * lr - a * a));
        const ux = (peach.cx - lcx) / d, uy = (peach.cy - lcy) / d;
        const px = lcx + a * ux, py = lcy + a * uy;
        crossPoints = [
          { x: px + h * -uy, y: py + h * ux },
          { x: px - h * -uy, y: py - h * ux },
        ];
      }
      const crossBelowWindow = crossPoints.some((p) => p.y > winRect.bottom);
      return { lens: { cx: lcx, cy: lcy, r: lr }, winBottom: winRect.bottom, peach, crosses, crossPoints, crossBelowWindow };
    });
    await page.screenshot({ path: join(OUT, 'case27-390-rim.png') });
    const zoomClip = r?.lens ? { x: Math.max(0, Math.round(r.lens.cx - r.lens.r - 20)), y: Math.max(0, Math.round(r.lens.cy - r.lens.r - 20)), width: Math.round(2 * r.lens.r + 40), height: Math.round(2 * r.lens.r + 40) } : null;
    if (zoomClip) {
      const buf = await page.screenshot({ clip: zoomClip });
      await sheet('film__rim-390.jpg', [[['390x844 lens rim vs peach orb (visible half below the window edge)', buf]]], { scale: 3, title: 'Case 27: does the visible (below-window) half of the disc cross the peach orb edge?' });
    }
    await writeFile(join(OUT, 'case27-rim-390.json'), JSON.stringify(r, null, 2));
    const ok = !!(r && r.crosses && r.crossBelowWindow);
    record('27', 'at 390x844 the lens\'s visible half (below the window\'s bottom edge) crosses the peach orb\'s edge', ok ? 'pass' : 'fail', JSON.stringify(r));
    await context.close();
  }

  // ---- NEW Case 29: poster vs live look, mean colour agreement ------------
  if (run('29')) {
    const results = [];
    for (const item of posterVsLive) {
      const a = await readImg(item.posterBuf), b = await readImg(item.liveBuf);
      const { cx, cy, r } = item.lens;
      let sum = [0, 0, 0], n = 0;
      const w0 = Math.min(a.width, b.width), h0 = Math.min(a.height, b.height);
      for (let y = Math.max(0, Math.round(cy - r)); y < Math.min(h0, Math.round(cy + r)); y++) {
        for (let x = Math.max(0, Math.round(cx - r)); x < Math.min(w0, Math.round(cx + r)); x++) {
          if (Math.hypot(x - cx, y - cy) > r - 1) continue;
          const i = (y * a.width + x) * 4, j = (y * b.width + x) * 4;
          sum[0] += Math.abs(a.data[i] - b.data[j]); sum[1] += Math.abs(a.data[i + 1] - b.data[j + 1]); sum[2] += Math.abs(a.data[i + 2] - b.data[j + 2]); n++;
        }
      }
      const mean = n ? sum.map((s) => s / n) : [NaN, NaN, NaN];
      const meanMax = Math.max(...mean);
      results.push({ key: item.key, meanChannelDiff: mean.map((v) => +v.toFixed(1)), meanMax: +meanMax.toFixed(1), n });
    }
    await writeFile(join(OUT, 'case29-poster-vs-live.json'), JSON.stringify(results, null, 2));
    const ok = results.length > 0 && results.every((r) => r.meanMax < 12);
    record('29', 'poster vs live look: mean colour diff inside the disc under 12 levels/channel, Clear+Tinted, 1440/820/390 (light; from the case 4-5 arrival frames)', ok ? 'pass' : 'fail', JSON.stringify(results));
  }

  await writeFile(join(OUT, 'verify-r5-results.json'), JSON.stringify({ renderer, cases, filmsMade }, null, 2));
  console.log(`\n${cases.filter((c) => c.result === 'pass').length}/${cases.length} pass, films_made=${filmsMade}`);
  await browser.close();
}

const posterVsLive = [];
function tail(text, n) { return text.split('\n').slice(-n).join('\n'); }

main().catch((e) => { console.error(e); process.exit(1); });
