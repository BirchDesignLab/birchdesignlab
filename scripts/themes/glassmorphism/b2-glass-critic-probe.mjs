/**
 * Wave B2 glass CRITIC probe (09-25-26). Read-only checks and stills against
 * a snap already serving at --base (the critic's own port, 4477):
 *   - where the lens starts (inside the hero window or in open wallpaper),
 *     what sits on top of the lens hit area, and whether the transparent
 *     hit button eats clicks on panes/links after a scroll;
 *   - lens over an orb edge, Clear and Tinted, light and dark, desktop/phone;
 *   - orb drift / scroll while the lens is idle (draws vs orb movement);
 *   - a hard fling into the wall: is the stretch left frozen afterwards;
 *   - a drag-and-fling strip;
 *   - a cross-school arrival strip at glass Home and a session-hold strip
 *     (set tinted+dusk, leave to vaporwave, come back via the switcher);
 *   - Services' settings pane stills; frost slider computed values;
 *   - rAF callback rate before/after in-school swaps (listener/loop leaks).
 * GPU Chromium, prefers-reduced-transparency forced to no-preference.
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2-glass-critic-probe.mjs --base http://127.0.0.1:4477
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
// --out <seat folder under .out/stage3-b2> (added 09-26-26 for the B2 re-critic,
// so a rerun does not overwrite the W1 critic's own evidence).
const OUT = join(HERE, '..', '.out', 'stage3-b2', arg('out', 'glass-critic'));
const base = arg('base', 'http://127.0.0.1:4477');
const only = arg('only', '');
const want = (k) => !only || only.split(',').includes(k);
const R = {};

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

async function ctx({ phone = false, scheme = 'light', rt = 'no-preference' } = {}) {
  const context = await browser.newContext(phone
    ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: scheme }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: scheme });
  await suppressPrompt(context);
  await context.addInitScript((sch) => {
    try { localStorage.setItem('bdl-scheme', sch); } catch {}
    window.__draws = 0;
    const p = WebGLRenderingContext.prototype;
    const o = p.drawArrays;
    p.drawArrays = function (...a) { window.__draws++; return o.apply(this, a); };
    window.__rafCalls = 0;
    const r = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (cb) => { window.__rafCalls++; return r(cb); };
  }, scheme);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: rt }, { name: 'prefers-color-scheme', value: scheme }] });
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  return { context, page, errors };
}

async function gpuCheck() {
  const { context, page } = await ctx();
  await page.goto('about:blank');
  const r = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const e = gl.getExtension('WEBGL_debug_renderer_info');
    return gl.getParameter(e.UNMASKED_RENDERER_WEBGL);
  });
  console.log('renderer:', r);
  R.renderer = r;
  await context.close();
  if (/swiftshader|llvmpipe/i.test(r)) throw new Error('software renderer; abort');
}

async function mountWait(page) {
  return page.waitForFunction(() => document.querySelector('.lens-poster')?.style.display === 'none', { timeout: 10000 }).then(() => true).catch(() => false);
}

async function setScheme(page, scheme) {
  const cur = await page.evaluate(() => document.documentElement.dataset.scheme);
  if (cur !== scheme) {
    await page.evaluate((s) => { document.documentElement.dataset.scheme = s; }, scheme);
    await page.waitForTimeout(600);
  }
}

const lensInfo = (page) => page.evaluate(() => {
  const hit = document.querySelector('.lens-hit');
  if (!hit) return null;
  const h = hit.getBoundingClientRect();
  const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
  const win = document.querySelector('.hero .window')?.getBoundingClientRect();
  const insideWindow = win ? (cx > win.left && cx < win.right && cy > win.top && cy < win.bottom) : null;
  const stack = document.elementsFromPoint(cx, cy).slice(0, 6).map((e) => `${e.tagName.toLowerCase()}.${[...e.classList].join('.')}`);
  const orbs = [...document.querySelectorAll('.orb')].map((o) => {
    const r = o.getBoundingClientRect();
    const d = Math.hypot(r.left + r.width / 2 - cx, r.top + r.height / 2 - cy);
    return { cls: o.className, edgeGap: Math.round(d - r.width / 2) };
  }).sort((a, b) => Math.abs(a.edgeGap) - Math.abs(b.edgeGap)).slice(0, 2);
  return { cx: Math.round(cx), cy: Math.round(cy), r: h.width / 2, insideWindow, win: win && [win.left, win.top, win.right, win.bottom].map(Math.round), stack, nearestOrbs: orbs, zCanvas: getComputedStyle(document.querySelector('.lens-canvas')).zIndex, zHit: getComputedStyle(hit).zIndex, zOrbs: getComputedStyle(document.querySelector('.orbs')).zIndex };
});

async function stills() {
  R.stills = {};
  for (const phone of [false, true]) for (const scheme of ['light', 'dark']) {
    const { context, page, errors } = await ctx({ phone, scheme });
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await setScheme(page, scheme);
    const ok = await mountWait(page);
    await page.waitForTimeout(400);
    const tag = `${phone ? 'phone' : 'desktop'}__${scheme}`;
    const info = await lensInfo(page);
    await page.screenshot({ path: join(OUT, `lens-start__${tag}__clear.png`) });
    await page.click('.hero .switch');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `lens-start__${tag}__tinted.png`) });
    // Drag the lens into open wallpaper: desktop the right margin, phone the gap
    // between the hero window and the Control Centre, and film over the nearest orb edge.
    const hit = await page.$('.lens-hit');
    const b = await hit.boundingBox();
    const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
    const vw = phone ? 390 : 1440;
    const tx = phone ? 70 : vw - 120, ty = phone ? 250 : 700;
    if (phone) {
      await page.touchscreen.tap(sx, sy); // no drag via touch API here; use mouse events on the button instead
    }
    await page.mouse.move(sx, sy);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) { await page.mouse.move(sx + (tx - sx) * i / 20, sy + (ty - sy) * i / 20); await page.waitForTimeout(16); }
    await page.waitForTimeout(120);
    await page.mouse.up();
    await page.waitForTimeout(700);
    const moved = await lensInfo(page);
    await page.screenshot({ path: join(OUT, `lens-moved__${tag}__tinted.png`) });
    await page.click('.hero .switch');
    await page.waitForTimeout(500);
    await page.screenshot({ path: join(OUT, `lens-moved__${tag}__clear.png`) });
    R.stills[tag] = { mounted: ok, start: info, moved, errors };
    await context.close();
  }
}

async function hitOverPanes() {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(page);
  await page.waitForTimeout(300);
  const out = [];
  for (const y of [0, 500, 900, 1300, 1800, 2300]) {
    await page.evaluate((yy) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(250);
    out.push({ scrollY: y, ...(await page.evaluate(() => {
      const h = document.querySelector('.lens-hit').getBoundingClientRect();
      const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
      const pts = [[cx, cy], [cx - 50, cy], [cx + 50, cy], [cx, cy - 50], [cx, cy + 50]];
      const blocked = [];
      for (const [x, y] of pts) {
        const st = document.elementsFromPoint(x, y);
        if (st[0]?.classList.contains('lens-hit')) {
          const under = st.slice(1).find((e) => e.matches('a, button, input, .glass, p, h1, h2, h3, li'));
          if (under) blocked.push(`${under.tagName.toLowerCase()}.${[...under.classList].join('.')}${under.textContent ? ` "${under.textContent.trim().slice(0, 30)}"` : ''}`);
        }
      }
      return { lens: [Math.round(cx), Math.round(cy)], hitIsTop: blocked.length, blocked };
    })) });
  }
  // Does a real click on a link under the lens reach it?
  R.hitOverPanes = out;
  // Text selection inside the hero heading where the invisible hit sits.
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  const heading = await page.evaluate(() => {
    const h = document.querySelector('.lens-hit').getBoundingClientRect();
    const cx = h.left + h.width / 2, cy = h.top + h.height / 2;
    return { top: document.elementFromPoint(cx, cy)?.className, cursor: getComputedStyle(document.elementFromPoint(cx, cy)).cursor };
  });
  R.hitAtTop = heading;
  await context.close();
}

async function staleOrbs() {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(page);
  await page.waitForTimeout(500);
  // Drag the lens into the right margin over open wallpaper near an orb.
  const hit = await page.$('.lens-hit');
  const b = await hit.boundingBox();
  const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
  await page.mouse.move(sx, sy); await page.mouse.down();
  for (let i = 1; i <= 15; i++) { await page.mouse.move(sx + (1320 - sx) * i / 15, sy + (620 - sy) * i / 15); await page.waitForTimeout(16); }
  await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(800);
  const orbPos = () => page.evaluate(() => [...document.querySelectorAll('.hero .orb')].map((o) => { const r = o.getBoundingClientRect(); return [Math.round(r.left + r.width / 2), Math.round(r.top + r.height / 2)]; }));
  await page.evaluate(() => { window.__draws = 0; });
  const a = await orbPos();
  await page.waitForTimeout(4000);
  const bb = await orbPos();
  const idleDraws = await page.evaluate(() => window.__draws);
  const drift = a.map((p, i) => Math.round(Math.hypot(bb[i][0] - p[0], bb[i][1] - p[1])));
  // Scroll 200 px with the lens in place; count draws.
  await page.evaluate(() => { window.__draws = 0; });
  for (let i = 0; i < 10; i++) { await page.mouse.wheel(0, 20); await page.waitForTimeout(30); }
  await page.waitForTimeout(400);
  const scrollDraws = await page.evaluate(() => window.__draws);
  const c = await orbPos();
  await page.screenshot({ path: join(OUT, 'stale__after-scroll-200.png') });
  R.staleOrbs = { idleDrawsOver4s: idleDraws, heroOrbDriftPxOver4s: drift, scrollDrawsOver200px: scrollDraws, orbsMovedOnScroll: c.map((p, i) => bb[i][1] - p[1]) };
  await context.close();
}

async function flingStrip() {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(page);
  await page.waitForTimeout(400);
  const hit = await page.$('.lens-hit');
  const b = await hit.boundingBox();
  const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
  const matrix = () => page.evaluate(() => {
    const t = document.querySelector('.lens-shadow-rest').style.transform;
    const m = t.match(/matrix\(([^)]*)\)/);
    const hit = document.querySelector('.lens-hit').getBoundingClientRect();
    return { m: m ? m[1].split(',').map((v) => +(+v).toFixed(4)) : null, x: Math.round(hit.left + hit.width / 2), y: Math.round(hit.top + hit.height / 2) };
  });
  const frames = [];
  await page.mouse.move(sx, sy); await page.mouse.down();
  // slow drag left (1:1 while held)
  for (let i = 1; i <= 10; i++) { await page.mouse.move(sx - i * 20, sy); await page.waitForTimeout(16); }
  frames.push({ t: 'held', ...(await matrix()) });
  await page.screenshot({ path: join(OUT, 'fling-01-held.png') });
  // fast fling right into the wall
  for (let i = 1; i <= 6; i++) { await page.mouse.move(sx - 200 + i * 60, sy); await page.waitForTimeout(8); }
  await page.mouse.up();
  for (const [k, ms] of [['02', 40], ['03', 80], ['04', 160], ['05', 320], ['06', 1500]]) {
    await page.waitForTimeout(ms === 1500 ? 1200 : ms / 2);
    frames.push({ t: `+${ms}ms`, ...(await matrix()) });
    await page.screenshot({ path: join(OUT, `fling-${k}.png`) });
  }
  R.fling = frames;
  await context.close();
}

async function viaSwitcher(page, school) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.open[aria-haspopup="dialog"]').first().click();
  const link = page.locator(`a[data-school="${school}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click();
}

async function arrivalAndHold() {
  const { context, page, errors } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(page);
  await page.click('.hero .switch');
  await page.click('.cc-seg[data-tod="dusk"]');
  await page.waitForTimeout(800);
  await page.screenshot({ path: join(OUT, 'hold-00-set-tinted-dusk.png') });
  await viaSwitcher(page, 'vaporwave');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', { timeout: 8000 });
  await page.waitForTimeout(2500);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(300);
  await page.screenshot({ path: join(OUT, 'hold-01-on-vaporwave.png') });
  // install a flip recorder that survives the swap: poll attributes every rAF
  await page.evaluate(() => {
    window.__attrLog = [];
    const tick = () => {
      const h = document.documentElement;
      if (h.dataset.theme === 'glassmorphism') window.__attrLog.push([Math.round(performance.now()), h.dataset.glassTint, h.dataset.glassTod, getComputedStyle(document.querySelector('main') || h, '::before').backgroundImage.slice(-40)]);
      if (window.__attrLog.length < 400) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await viaSwitcher(page, 'glassmorphism');
  const t0 = Date.now();
  const shots = [];
  for (const ms of [60, 150, 300, 500, 800, 1200, 2000, 3000]) {
    const wait = ms - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const f = join(OUT, `arrive-${String(ms).padStart(4, '0')}ms.png`);
    await page.screenshot({ path: f });
    shots.push([ms, await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, tint: document.documentElement.dataset.glassTint, tod: document.documentElement.dataset.glassTod, poster: document.querySelector('.lens-poster')?.style.display ?? null, canvas: !!document.querySelector('.lens-canvas') }))]);
  }
  const log = await page.evaluate(() => window.__attrLog.slice(0, 5).concat([['...']], window.__attrLog.slice(-2)));
  // keeps drawing after arrival: nudge
  await page.evaluate(() => { window.__draws = 0; });
  await page.focus('.lens-hit').catch(() => {});
  await page.keyboard.press('ArrowLeft');
  await page.waitForTimeout(200);
  const nudgeDraws = await page.evaluate(() => window.__draws);
  // orbs still drift after arrival (not frozen)
  const o1 = await page.evaluate(() => document.querySelector('.hero .orb').getBoundingClientRect().left);
  await page.waitForTimeout(1500);
  const o2 = await page.evaluate(() => document.querySelector('.hero .orb').getBoundingClientRect().left);
  R.arrival = { shots, attrLogFirstFrames: log, nudgeDraws, orbMovedPxAfterArrival: +(o2 - o1).toFixed(2), errors };
  await context.close();
}

async function swapLeak() {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(page);
  await page.waitForTimeout(1000);
  const rate = async () => { await page.evaluate(() => { window.__rafCalls = 0; }); await page.waitForTimeout(1000); return page.evaluate(() => window.__rafCalls); };
  const r0 = await rate();
  for (let i = 0; i < 3; i++) {
    await page.click('.site-header a[href*="/services"]').catch(async () => page.click('a[href$="/t/glassmorphism/services/"]'));
    await page.waitForFunction(() => location.pathname.includes('services'), { timeout: 6000 });
    await page.waitForTimeout(900);
    await page.click('.site-header a[href$="/t/glassmorphism/"]').catch(async () => page.evaluate(() => document.querySelector('a[href$="/t/glassmorphism/"]').click()));
    await page.waitForFunction(() => !location.pathname.includes('services'), { timeout: 6000 });
    await mountWait(page);
    await page.waitForTimeout(900);
  }
  const r1 = await rate();
  const canv = await page.evaluate(() => document.querySelectorAll('canvas').length);
  R.swapLeak = { rafPerSecondBefore: r0, rafPerSecondAfter3RoundTrips: r1, canvases: canv };
  await context.close();
}

async function services() {
  for (const phone of [false, true]) {
    const { context, page } = await ctx({ phone });
    await page.goto(`${base}/t/glassmorphism/services/`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(600);
    const el = await page.$('.settings-pane');
    await el.scrollIntoViewIfNeeded();
    await page.waitForTimeout(400);
    await el.screenshot({ path: join(OUT, `services-pane__${phone ? 'phone' : 'desktop'}.png`) });
    R[`services_${phone ? 'phone' : 'desktop'}`] = await page.evaluate(() => ({
      focusables: document.querySelectorAll('.settings-controls a, .settings-controls button, .settings-controls input, .settings-controls [tabindex]').length,
      hiddenAll: [...document.querySelectorAll('.settings-controls')].every((e) => e.getAttribute('aria-hidden') === 'true'),
      hscroll: document.documentElement.scrollWidth > innerWidth,
    }));
    await context.close();
  }
}

async function frost() {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await mountWait(page);
  const read = () => page.evaluate(() => ({ bf: getComputedStyle(document.querySelector('.hero .window')).backdropFilter, step: document.documentElement.dataset.glassFrostStep ?? null, frost: document.documentElement.style.getPropertyValue('--glass-frost') }));
  const out = {};
  for (const v of [0, 50, 100]) {
    await page.$eval('.cc-frost', (el, val) => { el.value = String(val); el.dispatchEvent(new Event('input', { bubbles: true })); }, v);
    await page.waitForTimeout(200);
    out[v] = await read();
  }
  R.frost = out;
  await context.close();
}

async function e10() {
  const { context, page } = await ctx({ rt: 'reduce' });
  await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
  await page.click('.hero .switch');
  await page.waitForTimeout(1500);
  R.e10 = await page.evaluate(() => ({
    canvas: document.querySelector('.lens-canvas') ? getComputedStyle(document.querySelector('.lens-canvas')).display : 'absent',
    hit: document.querySelector('.lens-hit') ? getComputedStyle(document.querySelector('.lens-hit')).display : 'absent',
    poster: getComputedStyle(document.querySelector('.lens-poster')).display,
    windowBg: getComputedStyle(document.querySelector('.hero .window')).backgroundColor,
    windowBf: getComputedStyle(document.querySelector('.hero .window')).backdropFilter,
  }));
  await page.screenshot({ path: join(OUT, 'e10-tinted.png') });
  await context.close();
}

/** Lens dragged across the hero's pink orb edge (outside the window), then
    idle 4 s, then a 120 px scroll: does the orb inside the lens follow the
    real orb? Stills at each step, light and dark, Clear and Tinted. */
async function orbEdge() {
  R.orbEdge = {};
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ scheme });
    await page.goto(`${base}/t/glassmorphism/`, { waitUntil: 'networkidle' });
    await setScheme(page, scheme);
    await mountWait(page);
    await page.waitForTimeout(400);
    const orb = await page.evaluate(() => {
      const o = [...document.querySelectorAll('.hero .orb.pink')][0].getBoundingClientRect();
      return { cx: o.left + o.width / 2, cy: o.top + o.height / 2, r: o.width / 2 };
    });
    const hit = await page.$('.lens-hit');
    const b = await hit.boundingBox();
    const sx = b.x + b.width / 2, sy = b.y + b.height / 2;
    const tx = Math.max(110, orb.cx - orb.r * 0.9), ty = Math.min(orb.cy - orb.r * 0.9, 700);
    await page.mouse.move(sx, sy); await page.mouse.down();
    for (let i = 1; i <= 20; i++) { await page.mouse.move(sx + (tx - sx) * i / 20, sy + (ty - sy) * i / 20); await page.waitForTimeout(16); }
    await page.waitForTimeout(150); await page.mouse.up(); await page.waitForTimeout(600);
    await page.mouse.move(720, 20);
    const crop = { x: Math.max(0, Math.round(tx - 200)), y: Math.max(0, Math.round(ty - 200)), width: 400, height: 400 };
    const shots = [];
    for (const tint of ['clear', 'tinted']) {
      if (tint === 'tinted') { await page.click('.hero .switch'); await page.mouse.move(720, 20); await page.waitForTimeout(500); }
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.waitForTimeout(300);
      await page.focus('.lens-hit'); await page.keyboard.press('ArrowLeft'); await page.keyboard.press('ArrowRight'); // force a fresh draw
      await page.evaluate(() => document.activeElement.blur());
      await page.waitForTimeout(200);
      const f0 = join(OUT, `orbedge__${scheme}__${tint}__0-fresh.png`);
      await page.screenshot({ path: f0, clip: crop });
      await page.waitForTimeout(4000);
      const f1 = join(OUT, `orbedge__${scheme}__${tint}__1-idle4s.png`);
      await page.screenshot({ path: f1, clip: crop });
      await page.evaluate(() => window.scrollTo(0, 120));
      await page.waitForTimeout(400);
      const f2 = join(OUT, `orbedge__${scheme}__${tint}__2-scrolled120.png`);
      await page.screenshot({ path: f2, clip: crop });
      shots.push(f0, f1, f2);
    }
    R.orbEdge[scheme] = { orb, lensAt: [tx, ty], shots };
    await context.close();
  }
}

await mkdir(OUT, { recursive: true });
await gpuCheck();
for (const [k, fn] of [['stills', stills], ['hit', hitOverPanes], ['stale', staleOrbs], ['fling', flingStrip], ['arrival', arrivalAndHold], ['leak', swapLeak], ['services', services], ['frost', frost], ['e10', e10], ['orbedge', orbEdge]]) {
  if (!want(k)) continue;
  try { await fn(); console.log('done', k); } catch (e) { R[`${k}_error`] = String(e); console.log('ERR', k, e.message); }
}
await browser.close();
await writeFile(join(OUT, `probe-results${only ? '-' + only.replace(/,/g, '_') : ''}.json`), JSON.stringify(R, null, 2));
console.log(JSON.stringify(R, null, 2));
