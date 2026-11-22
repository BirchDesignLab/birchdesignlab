/**
 * Stage 6 wave 2, task 15: evidence for the grandmillennial ledger leftovers.
 *   sheets  whole-page Home at 1100, 1101, 1180, 1257 (and the review sizes), Contact and
 *           Services at every review size, both schemes.
 *   tug     the tassel tug at 1440 and 820 (mouse) and 390 (touch): a timestamped strip of crops
 *           and the tassel's displacement (the cord's y2 less its rest, in the svg's own units)
 *           at each step of press, move, hold, release and the spring.
 *   hover   a mouse over a nav link shows its diamond; a tap on a nav link in a touch context
 *           leaves no diamond and no underline stuck (hover: none).
 * Prints the GPU renderer first. Reduced transparency forced to no-preference.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w2-t15-evidence.mjs [sheets|tug|hover|all] [outDir]
 */
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const BASE = (process.env.BASE || 'http://127.0.0.1:4470').replace(/\/$/, '');
const WHAT = process.argv[2] || 'all';
const OUT = process.argv[3] || join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w2', 't15');
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({ args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist'] });

async function open(w, path, { scheme = 'light', touch = false, h = 900 } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, colorScheme: scheme, ...(touch ? { hasTouch: true, isMobile: true } : {}) });
  await suppressPrompt(ctx);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
  await page.goto(`${BASE}/t/grandmillennial/${path}`, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return { ctx, page, cdp };
}

{
  const { ctx, page } = await open(800, '');
  const gpu = await page.evaluate(() => { const c = document.createElement('canvas').getContext('webgl'); const e = c.getExtension('WEBGL_debug_renderer_info'); return e ? c.getParameter(e.UNMASKED_RENDERER_WEBGL) : 'unknown'; });
  console.log('renderer:', gpu);
  await ctx.close();
}

if (WHAT === 'sheets' || WHAT === 'all') {
  const jobs = [];
  for (const scheme of ['light', 'dark']) {
    for (const w of [1100, 1101, 1180, 1257, 1440, 1280, 1024, 820, 390]) jobs.push(['', 'home', w, scheme]);
    for (const w of [1440, 1280, 1024, 820, 390]) { jobs.push(['contact/', 'contact', w, scheme]); jobs.push(['services/', 'services', w, scheme]); }
  }
  for (const [path, name, w, scheme] of jobs) {
    const { ctx, page } = await open(w, path, { scheme });
    await page.screenshot({ path: join(OUT, `sheet-${name}-${scheme}-${w}.png`), fullPage: true });
    if (name === 'home') await page.locator('.hero').screenshot({ path: join(OUT, `hero-${scheme}-${w}.png`) });
    await ctx.close();
  }
  console.log('sheets done', jobs.length);
}

if (WHAT === 'tug' || WHAT === 'all') {
  for (const [w, touch] of [[1440, false], [820, false], [390, true]]) {
    const { ctx, page } = await open(w, 'about/', { touch });
    const hit = page.locator('.bp-hit').first();
    const box = await hit.boundingBox();
    const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
    const disp = () => page.evaluate(() => Math.round((Number(document.querySelector('.bp-cord').getAttribute('y2')) - 58) * 100) / 100);
    const clip = { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 70), width: 110, height: 150 };
    const log = [];
    const t0 = Date.now();
    const snap = async (label) => { log.push([label, Date.now() - t0, await disp()]); await page.screenshot({ path: join(OUT, `tug-${w}-${String(log.length).padStart(2, '0')}-${label}.png`), clip }); };
    await snap('rest');
    if (touch) {
      const cdp = await ctx.newCDPSession(page);
      const tp = (type, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x: cx, y, id: 1 }] });
      await tp('touchStart', cy);
      await page.waitForTimeout(40); await snap('press');
      await tp('touchMove', cy + 8); await tp('touchMove', cy + 22);
      await page.waitForTimeout(40); await snap('drag');
      await tp('touchEnd', cy);
    } else {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.waitForTimeout(40); await snap('press');
      await page.mouse.move(cx, cy + 8, { steps: 3 }); await page.mouse.move(cx, cy + 22, { steps: 4 });
      await page.waitForTimeout(40); await snap('drag');
      await page.mouse.up();
    }
    for (const ms of [40, 80, 120, 200, 400, 900]) { await page.waitForTimeout(ms); await snap(`spring${ms}`); }
    console.log(`tug ${w} ${touch ? 'touch' : 'mouse'}:`, log.map(([l, t, d]) => `${l}@${t}ms=${d}`).join('  '));
    /* a bare press (no move) then release: the press already pulls, the release springs from there */
    if (!touch) {
      await page.mouse.move(cx, cy); await page.mouse.down(); await page.waitForTimeout(30);
      const pressed = await disp();
      await page.mouse.up(); await page.waitForTimeout(60);
      const sprung = await disp();
      await page.waitForTimeout(1200);
      console.log(`  bare click ${w}: pressed=${pressed} 60ms after release=${sprung} settled=${await disp()}`);
    }
    await ctx.close();
  }
}

if (WHAT === 'hover' || WHAT === 'all') {
  {
    const { ctx, page } = await open(1440, 'about/');
    const link = page.locator('.site-header nav a:not([aria-current])').first();
    const diamond = () => link.evaluate((a) => getComputedStyle(a, '::after').opacity);
    const before = await diamond();
    await link.hover(); await page.waitForTimeout(300);
    const over = await diamond();
    console.log(`mouse 1440: matches hover:hover=${await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches)} diamond before=${before} over=${over}`);
    await page.locator('.site-header').screenshot({ path: join(OUT, 'hover-mouse-1440.png') });
    await ctx.close();
  }
  for (const w of [390, 820]) {
    const { ctx, page } = await open(w, 'about/', { touch: true });
    const link = page.locator('.site-header nav a:not([aria-current])').first();
    await page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('nav a')) e.preventDefault(); }, true));
    const state = () => link.evaluate((a) => ({ diamond: getComputedStyle(a, '::after').opacity, deco: getComputedStyle(a).textDecorationLine }));
    const mq = await page.evaluate(() => matchMedia('(hover: hover) and (pointer: fine)').matches);
    await link.tap(); await page.waitForTimeout(400);
    console.log(`touch ${w}: hover-media=${mq} after tap`, JSON.stringify(await state()));
    await page.locator('.site-header').screenshot({ path: join(OUT, `tap-touch-${w}.png`) });
    await ctx.close();
  }
  {
    const { ctx, page } = await open(1440, '', {});
    const a = page.locator('.designation').first();
    await a.scrollIntoViewIfNeeded();
    await a.hover(); await page.waitForTimeout(200);
    console.log('mouse home designation hover:', await a.evaluate((e) => getComputedStyle(e).textDecorationLine));
    await ctx.close();
    const t = await open(390, '', { touch: true });
    const b = t.page.locator('.designation').first();
    await b.scrollIntoViewIfNeeded();
    await t.page.evaluate(() => document.addEventListener('click', (e) => { if (e.target.closest('a')) e.preventDefault(); }, true));
    await b.tap(); await t.page.waitForTimeout(300);
    console.log('touch home designation after tap (focus-visible not set by tap):', await b.evaluate((e) => getComputedStyle(e).textDecorationLine));
    await t.ctx.close();
  }
}
await browser.close();
