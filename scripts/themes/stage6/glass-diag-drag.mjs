/**
 * Stage 6 glass lens diagnosis (11-19-26): why does the draggable lens "not
 * work" on desktop? Real mouse drags (GPU Chromium) at 1440/1280/1024, both
 * schemes, direct load and portal arrival from /t/quiet/, plus after scroll,
 * resize, in-school swap and keyboard. Records what elementFromPoint finds
 * across the visible lens disc, which element pointerdown actually reaches,
 * and whether the lens moved.
 * Usage: node scripts/themes/snap.mjs --name stage6-base --reuse --port 4462 -- node scripts/themes/stage6/glass-diag-drag.mjs
 * Output: scripts/themes/.out/stage6-glass-diag/
 */
import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage6-glass-diag');
await mkdir(OUT, { recursive: true });
const base = process.env.SNAP_BASE || 'http://127.0.0.1:4462';
const only = process.env.ONLY || '';

const browser = await chromium.launch({ headless: true, args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--enable-gpu-rasterization', '--ignore-gpu-blocklist'] });
const R = { base };
{
  const p = await browser.newPage();
  R.renderer = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); return gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL); });
  await p.close();
  console.log('renderer:', R.renderer);
  if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer: evidence invalid');
}

async function newPage(w, h, scheme) {
  const context = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, reducedMotion: 'no-preference' });
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await suppressPrompt(context);
  // Record which element every pointerdown reaches, and lens-hit's own events.
  await context.addInitScript(() => {
    window.__pd = [];
    const desc = (e) => e && e.tagName ? `${e.tagName.toLowerCase()}${e.id ? '#' + e.id : ''}${e.classList?.length ? '.' + [...e.classList].join('.') : ''}` : String(e);
    window.__desc = desc;
    document.addEventListener('pointerdown', (ev) => { window.__pd.push({ type: 'pointerdown', target: desc(ev.target), x: ev.clientX, y: ev.clientY, defaultPrevented: ev.defaultPrevented }); }, true);
    document.addEventListener('pointerup', (ev) => { window.__pd.push({ type: 'pointerup', target: desc(ev.target) }); }, true);
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`); });
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
  return { context, page, errors };
}

async function waitLens(page) {
  const t0 = Date.now();
  const ok = await page.waitForFunction(() => document.querySelector('.lens-canvas')?.style.visibility === 'visible', null, { timeout: 8000 }).then(() => true).catch(() => false);
  return { mounted: ok, ms: Date.now() - t0 };
}

async function lensState(page) {
  return page.evaluate(() => {
    const hit = document.querySelector('.lens-hit');
    const cv = document.querySelector('.lens-canvas');
    const poster = document.querySelector('.lens-poster');
    if (!hit) return { hit: false, poster: poster ? poster.getBoundingClientRect().toJSON() : null, posterDisplay: poster && getComputedStyle(poster).display };
    const q = hit.getBoundingClientRect();
    const cr = cv.getBoundingClientRect();
    const cx = q.left + q.width / 2, cy = q.top + q.height / 2, r = q.width / 2;
    const counts = {};
    let open = null;
    for (let y = -r; y <= r; y += 6) for (let x = -r; x <= r; x += 6) {
      if (x * x + y * y > r * r) continue;
      const e = document.elementFromPoint(cx + x, cy + y);
      const k = window.__desc(e);
      counts[k] = (counts[k] || 0) + 1;
      if (!open && e === hit) open = [cx + x, cy + y];
    }
    // chain at centre
    const chain = document.elementsFromPoint(cx, cy).slice(0, 8).map(window.__desc);
    const cs = getComputedStyle(hit);
    return {
      hit: true, c: [Math.round(cx), Math.round(cy)], r: Math.round(r),
      canvasC: [Math.round(cr.left + cr.width / 2), Math.round(cr.top + cr.height / 2)],
      canvasVis: cv.style.visibility, pointerEvents: cs.pointerEvents, zIndex: cs.zIndex,
      topAtCentre: window.__desc(document.elementFromPoint(cx, cy)), chainAtCentre: chain,
      openPoint: open && open.map(Math.round), discTopCounts: counts, scrollY,
    };
  });
}

async function drag(page, x0, y0, dx, dy, shotBase) {
  await page.evaluate(() => { window.__pd = []; });
  await page.mouse.move(x0, y0);
  await page.mouse.down();
  for (let i = 1; i <= 16; i++) {
    await page.mouse.move(x0 + dx * i / 16, y0 + dy * i / 16, { steps: 2 });
    await page.waitForTimeout(16);
    if (i === 10 && shotBase) await page.screenshot({ path: join(OUT, `${shotBase}__mid.png`) });
  }
  await page.mouse.up();
  await page.waitForTimeout(900);
  const after = await page.evaluate(() => { const q = document.querySelector('.lens-hit')?.getBoundingClientRect(); return { c: q ? [Math.round(q.left + q.width / 2), Math.round(q.top + q.height / 2)] : null, scrollY, sel: String(getSelection()).slice(0, 60), pd: window.__pd, held: document.documentElement.classList.contains('lens-held') }; });
  if (shotBase) await page.screenshot({ path: join(OUT, `${shotBase}__after.png`) });
  return after;
}

async function tryDrag(page, label, w) {
  const st = await lensState(page);
  if (!st.hit) return { label, st, note: 'no lens-hit mounted' };
  const res = {};
  await page.screenshot({ path: join(OUT, `${label}__before.png`) });
  const dx = w >= 1280 ? 260 : 160, dy = 110;
  // 1) from the drawn centre
  const a = await drag(page, st.c[0], st.c[1], dx, dy, `${label}__centre`);
  res.centre = { from: st.c, to: a.c, moved: a.c ? Math.round(Math.hypot(a.c[0] - st.c[0], a.c[1] - st.c[1])) : null, pointerdownTargets: a.pd.filter((p) => p.type === 'pointerdown').map((p) => p.target), sel: a.sel, scrollAfter: a.scrollY, stuckHeld: a.held };
  // 2) from the most open point (where elementFromPoint IS the hit), if any
  const st2 = await lensState(page);
  if (st2.openPoint) {
    const b = await drag(page, st2.openPoint[0], st2.openPoint[1], -dx, -dy, null);
    res.openPoint = { from: st2.openPoint, lensFrom: st2.c, to: b.c, moved: b.c ? Math.round(Math.hypot(b.c[0] - st2.c[0], b.c[1] - st2.c[1])) : null, pointerdownTargets: b.pd.filter((p) => p.type === 'pointerdown').map((p) => p.target) };
  } else res.openPoint = 'no point of the disc where the hit button is on top';
  return { label, st, st2: { c: st2.c, discTopCounts: st2.discTopCounts, openPoint: st2.openPoint }, ...res };
}

const sizes = [[1440, 900], [1280, 800], [1024, 768]];
for (const scheme of ['light', 'dark']) {
  for (const [w, h] of sizes) {
    const tag = `${scheme}__${w}`;
    if (only && !tag.includes(only)) continue;
    // A) direct arrival
    {
      const { context, page, errors } = await newPage(w, h, scheme);
      await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
      const m = await waitLens(page);
      await page.waitForTimeout(400);
      const out = { mount: m, initial: await lensState(page) };
      out.drag = await tryDrag(page, `direct__${tag}`, w);
      // keyboard
      const kb = await page.evaluate(() => { const h = document.querySelector('.lens-hit'); if (!h) return null; h.focus(); const q = h.getBoundingClientRect(); return { focused: document.activeElement === h, c: [q.left + q.width / 2, q.top + q.height / 2] }; });
      if (kb) {
        for (let i = 0; i < 6; i++) await page.keyboard.press('ArrowLeft');
        await page.waitForTimeout(200);
        const k2 = await page.evaluate(() => { const q = document.querySelector('.lens-hit').getBoundingClientRect(); return [q.left + q.width / 2, q.top + q.height / 2]; });
        out.keyboard = { ...kb, after: k2, movedX: Math.round(k2[0] - kb.c[0]) };
      }
      // after scroll
      await page.mouse.wheel(0, 400);
      await page.waitForTimeout(700);
      out.afterScroll = await tryDrag(page, `scrolled__${tag}`, w);
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(400);
      // after idle (6 s)
      await page.waitForTimeout(6000);
      out.afterIdle = await tryDrag(page, `idle__${tag}`, w);
      // after resize
      await page.setViewportSize({ width: Math.round(w * 0.85), height: h });
      await page.waitForTimeout(700);
      out.afterResize = await tryDrag(page, `resized__${tag}`, Math.round(w * 0.85));
      await page.setViewportSize({ width: w, height: h });
      // in-school swap: Home -> About -> Home via header links
      const aboutLink = await page.$('.site-header a[href$="/t/glassmorphism/about/"]');
      if (aboutLink) {
        await aboutLink.click();
        await page.waitForURL(/about\/$/, { timeout: 8000 }).catch(() => {});
        await page.waitForTimeout(1200);
        out.aboutHasLens = await page.evaluate(() => ({ hit: !!document.querySelector('.lens-hit'), poster: !!document.querySelector('.lens-poster'), host: !!document.getElementById('glass-lens-host') }));
        await page.screenshot({ path: join(OUT, `about__${tag}.png`) });
        const home = await page.$('.site-header a[href$="/t/glassmorphism/"]');
        if (home) {
          await home.click();
          await page.waitForURL(/glassmorphism\/$/, { timeout: 8000 }).catch(() => {});
          out.swapMount = await waitLens(page);
          await page.waitForTimeout(400);
          out.afterSwap = await tryDrag(page, `swap__${tag}`, w);
          out.afterSwapHitCount = await page.evaluate(() => document.querySelectorAll('.lens-hit').length);
        } else out.afterSwap = 'no home link in header';
      } else out.aboutHasLens = 'no about link in header';
      out.errors = errors;
      R[`direct__${tag}`] = out;
      await context.close();
    }
    // B) portal arrival from /t/quiet/ via the switcher
    {
      const { context, page, errors } = await newPage(w, h, scheme);
      await page.goto(`${base}/t/quiet/`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(500);
      const nav = await page.evaluate(() => {
        const sw = document.querySelector('bdl-switcher');
        const root = sw?.shadowRoot || sw;
        const a = root?.querySelector('a[href*="glassmorphism"], [data-school="glassmorphism"], button[data-theme="glassmorphism"]');
        if (!a) return { found: false, html: (root?.innerHTML || '').slice(0, 400) };
        a.scrollIntoView?.();
        const r = a.getBoundingClientRect();
        return { found: true, tag: window.__desc(a), x: r.left + r.width / 2, y: r.top + r.height / 2, visible: r.width > 0 };
      });
      let out = { nav };
      if (nav.found && nav.visible) {
        await page.mouse.click(nav.x, nav.y);
      } else if (nav.found) {
        await page.evaluate(() => { const sw = document.querySelector('bdl-switcher'); (sw?.shadowRoot || sw).querySelector('a[href*="glassmorphism"], [data-school="glassmorphism"], button[data-theme="glassmorphism"]').click(); });
      }
      await page.waitForURL(/glassmorphism/, { timeout: 8000 }).catch(() => {});
      out.url = page.url();
      out.mount = await waitLens(page);
      await page.waitForTimeout(500);
      out.drag = await tryDrag(page, `portal__${tag}`, w);
      out.errors = errors;
      R[`portal__${tag}`] = out;
      await context.close();
    }
    console.log('done', tag);
  }
}
await browser.close();
await writeFile(join(OUT, 'drag-results.json'), JSON.stringify(R, null, 2));
// compact summary
const sum = {};
for (const [k, v] of Object.entries(R)) {
  if (typeof v !== 'object' || !v) continue;
  const pick = (d) => d && d.centre ? { c: d.st?.c, top: d.st?.topAtCentre, centreMoved: d.centre.moved, centreTargets: d.centre.pointerdownTargets, openMoved: d.openPoint?.moved ?? d.openPoint, sel: d.centre.sel } : d?.note ?? d;
  sum[k] = { mount: v.mount, drag: pick(v.drag), keyboard: v.keyboard?.movedX, scroll: pick(v.afterScroll), idle: pick(v.afterIdle), resize: pick(v.afterResize), swap: pick(v.afterSwap), hits: v.afterSwapHitCount, about: v.aboutHasLens, nav: v.nav?.found, errors: v.errors?.length };
}
console.log(JSON.stringify(sum, null, 1));
