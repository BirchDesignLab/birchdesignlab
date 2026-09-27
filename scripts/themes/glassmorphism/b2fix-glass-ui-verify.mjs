/**
 * Wave B2 fix round, seat glass-fix-ui: verification against the five fix
 * items (frost slider live in both engines, the hero switch box, Services'
 * off switches and column baseline, the Control Centre as a compact tile
 * cluster, E12 halo contrast). Read-only against a snap already serving at
 * --base (this seat's own snap, port 4472).
 *
 * Usage: BDL_GPU=1 node scripts/themes/glassmorphism/b2fix-glass-ui-verify.mjs --base http://127.0.0.1:4472
 * Output: scripts/themes/.out/stage3-b2/glass-fix-ui/*.json, *.jpg, *.png
 */
import { chromium, webkit } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

async function readPng(buf) {
  const img = await loadImage(buf);
  const c = createCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  return { width: img.width, height: img.height, data: g.getImageData(0, 0, img.width, img.height).data, get: (x, y) => {
    const i = (Math.round(y) * img.width + Math.round(x)) * 4;
    return [g.getImageData(0, 0, img.width, img.height).data[i], g.getImageData(0, 0, img.width, img.height).data[i + 1], g.getImageData(0, 0, img.width, img.height).data[i + 2]];
  } };
}

function relLum([r, g, b]) {
  const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(rgbA, rgbB) {
  const L1 = relLum(rgbA), L2 = relLum(rgbB);
  const [hi, lo] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (hi + 0.05) / (lo + 0.05);
}

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'stage3-b2', 'glass-fix-ui');
const args = process.argv.slice(2);
const arg = (n, f) => { const i = args.indexOf(`--${n}`); return i === -1 ? f : args[i + 1]; };
const base = arg('base', 'http://127.0.0.1:4472');
const only = arg('only', '');
const want = (k) => !only || only.split(',').includes(k);
await mkdir(OUT, { recursive: true });
const R = {};

const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});

async function ctx({ phone = false, width, height, scheme = 'light' } = {}) {
  const viewport = width ? { width, height } : phone ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const context = await browser.newContext(phone
    ? { viewport, deviceScaleFactor: 2, hasTouch: true, isMobile: true, colorScheme: scheme }
    : { viewport, deviceScaleFactor: 1, colorScheme: scheme });
  await suppressPrompt(context);
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  return { context, page };
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
await gpuCheck();

async function waitIdle(page) {
  await page.waitForFunction(() => !('fromTheme' in document.documentElement.dataset)).catch(() => {});
  await page.waitForTimeout(1400);
}

/* ---------- item 1: frost slider live in Chromium ---------- */
if (want('frost')) {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`);
  await waitIdle(page);
  const readBlur = async () => page.evaluate(() => {
    const el = document.querySelector('.door');
    const cs = getComputedStyle(el);
    return { backdropFilter: cs.backdropFilter, frostVar: getComputedStyle(document.documentElement).getPropertyValue('--glass-frost').trim() };
  });
  const before = await readBlur();
  const shots = [];
  const frostInput = page.locator('.cc-frost');
  for (const v of [0, 100]) {
    await frostInput.evaluate((el, val) => {
      el.value = String(val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);
    await page.waitForTimeout(500);
    const after = await readBlur();
    shots.push({ value: v, ...after });
  }
  const buf = await page.screenshot({ fullPage: false });
  await writeFile(join(OUT, 'frost-slider-strip.jpg'), buf);
  await context.close();
  R.frost = { before, atExtremes: shots, changed: shots[0].backdropFilter !== shots[1].backdropFilter };
  console.log('frost:', JSON.stringify(R.frost));
}

/* ---------- item 1: data-glass-frost-step written (Safari's path, checked
   via the attribute itself since WebKit is not launched here) ---------- */
if (want('frost-step')) {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`);
  await waitIdle(page);
  const steps = [];
  const frostInput = page.locator('.cc-frost');
  for (const v of [0, 50, 100]) {
    await frostInput.evaluate((el, val) => {
      el.value = String(val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }, v);
    await page.waitForTimeout(200);
    const step = await page.evaluate(() => document.documentElement.dataset.glassFrostStep ?? null);
    steps.push({ value: v, step });
  }
  await context.close();
  R.frostStep = steps;
  console.log('frost-step:', JSON.stringify(steps));
}

/* ---------- item 2: hero switch box ---------- */
if (want('switch')) {
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ scheme });
    await page.goto(`${base}/t/glassmorphism/`);
    await waitIdle(page);
    const box = await page.evaluate(() => {
      const btn = document.querySelector('.hero .window-bar .switch');
      const cs = getComputedStyle(btn);
      return { background: cs.backgroundColor, backgroundImage: cs.backgroundImage, padding: cs.padding, border: cs.borderStyle };
    });
    const el = page.locator('.hero .window-bar .switch');
    const buf = await el.screenshot();
    await writeFile(join(OUT, `hero-switch-crop__${scheme}.jpg`), buf);
    R[`switchBox_${scheme}`] = box;
    console.log(scheme, 'switch box:', JSON.stringify(box));
    await context.close();
  }
}

/* ---------- item 4: Control Centre tiles at 3 sizes x 2 schemes ---------- */
if (want('cc')) {
  const sizes = [{ w: 1440, h: 900, name: '1440x900' }, { w: 1280, h: 800, name: '1280x800' }, { w: 390, h: 844, name: '390x844' }];
  const ccMeasurements = [];
  for (const size of sizes) {
    for (const scheme of ['light', 'dark']) {
      const { context, page } = await ctx({ width: size.w, height: size.h, phone: size.w < 600, scheme });
      await page.goto(`${base}/t/glassmorphism/`);
      await waitIdle(page);
      const cc = page.locator('.control-centre');
      const visible = await cc.isVisible();
      let rect = null, tileCount = 0, switcherOverlap = null, locationVisible = false, locationOverlap = null;
      const overlapArea = (a, b) => {
        if (!a || !b) return null;
        const ox = Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
        const oy = Math.max(0, Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y));
        return ox * oy;
      };
      if (visible) {
        rect = await cc.boundingBox();
        tileCount = await page.locator('.cc-tile').count();
        locationVisible = await page.locator('.cc-tile-locale').isVisible();
        const switcher = page.locator('bdl-switcher').first();
        if (await switcher.count()) {
          const sRect = await switcher.boundingBox().catch(() => null);
          switcherOverlap = overlapArea(rect, sRect);
          // The whole cluster's rect can overlap the switcher's rect while
          // no individual tile does (a gap between tiles falls in the
          // corner); the tile item 4 actually needs visible is the location
          // one, so it gets its own, tighter check.
          const locRect = await page.locator('.cc-tile-locale').boundingBox().catch(() => null);
          locationOverlap = overlapArea(locRect, sRect);
        }
        await cc.screenshot({ path: join(OUT, `cc-tiles__${size.name}__${scheme}.jpg`) });
      }
      ccMeasurements.push({ size: size.name, scheme, visible, rect, tileCount, locationVisible, switcherOverlap, locationOverlap });
      await context.close();
    }
  }
  R.controlCentre = ccMeasurements;
  console.log('control centre:', JSON.stringify(ccMeasurements, null, 1));
}

/* ---------- item 3: Services pane stills + off-switch fill + baseline ---------- */
if (want('services')) {
  for (const phone of [false, true]) {
    for (const scheme of ['light', 'dark']) {
      const { context, page } = await ctx({ phone, scheme, width: phone ? 390 : 1440, height: phone ? 844 : 900 });
      await page.goto(`${base}/t/glassmorphism/services/`);
      await waitIdle(page);
      const pane = page.locator('.settings-pane');
      await pane.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await pane.screenshot({ path: join(OUT, `services-pane__${phone ? 'phone' : 'desktop'}__${scheme}.jpg`) });
      if (!phone) {
        const align = await page.evaluate(() => {
          const rows = [...document.querySelectorAll('.settings-row')];
          return rows.map((r) => {
            const controls = r.querySelector('.settings-controls');
            const rowBox = r.getBoundingClientRect();
            const cBox = controls.getBoundingClientRect();
            return { bottomOfControlsFromRowTop: Math.round(cBox.bottom - rowBox.top) };
          });
        });
        const vals = align.map((a) => a.bottomOfControlsFromRowTop);
        R[`servicesBaseline_${scheme}`] = { vals, maxSpread: Math.max(...vals) - Math.min(...vals) };
      }
      const swatch = await page.evaluate(() => {
        const sw = document.querySelector('.mini-switch:not(.is-on)');
        const pane2 = document.querySelector('.settings-pane');
        const cs = getComputedStyle(sw);
        const csPane = getComputedStyle(pane2);
        return { switchBg: cs.backgroundColor, switchBorder: cs.borderColor, paneBg: csPane.backgroundColor };
      });
      R[`servicesOffSwitch_${phone ? 'phone' : 'desktop'}_${scheme}`] = swatch;
      await context.close();
    }
  }
  console.log('services baseline light:', JSON.stringify(R.servicesBaseline_light));
  console.log('services baseline dark:', JSON.stringify(R.servicesBaseline_dark));
}

/* ---------- item 5: E12 halo contrast on a nav label ---------- */
if (want('halo')) {
  for (const scheme of ['light', 'dark']) {
    const { context, page } = await ctx({ scheme });
    await page.goto(`${base}/t/glassmorphism/`);
    await waitIdle(page);
    const navLink = page.locator('.seg a').nth(1);
    const box = await navLink.boundingBox();
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 10 });
    await page.waitForTimeout(350);
    // Sample the label's ink colour and the pixel just outside the glyphs
    // (inside the link's own box, at its ring-brightest point, the cursor)
    // to read the effective backdrop under the halo at full [data-reveal-active].
    const sample = await page.evaluate(() => {
      const a = document.querySelectorAll('.seg a')[1];
      const cs = getComputedStyle(a);
      return { color: cs.color };
    });
    const clip = { x: Math.max(0, box.x - 40), y: Math.max(0, box.y - 40), width: box.width + 80, height: box.height + 80 };
    const buf = await page.screenshot({ clip });
    await writeFile(join(OUT, `halo-nav-crop__${scheme}.jpg`), buf);
    // The backdrop sample: 6px above the label's own box, inside the crop,
    // inside the halo's radius, clear of any glyph pixel -- the ring's
    // brightest point is at the cursor (the label's own centre), so this is
    // as close to it as a text-free pixel gets.
    const png = await readPng(buf);
    const sampleX = clip.width / 2;
    const sampleY = box.y - clip.y - 6;
    const backdrop = png.get(sampleX, Math.max(1, sampleY));
    const ink = sample.color.match(/[\d.]+/g).slice(0, 3).map(Number);
    R[`haloLabelColor_${scheme}`] = { ...sample, backdropSample: backdrop, contrastAgainstBackdrop: Number(contrast(ink, backdrop).toFixed(2)) };
    await context.close();
  }
  console.log('halo:', JSON.stringify({ light: R.haloLabelColor_light, dark: R.haloLabelColor_dark }));
}

/* ---------- diagnostic: why the Control Centre sits at/past the fold at
   1280x800 (not one of the five fix items; used only to size item 4's
   layout adjustment) ---------- */
if (want('layout')) {
  for (const size of [{ w: 1440, h: 900 }, { w: 1280, h: 800 }]) {
    const { context, page } = await ctx({ width: size.w, height: size.h });
    await page.goto(`${base}/t/glassmorphism/`);
    await waitIdle(page);
    const r = await page.evaluate(() => {
      const hero = document.querySelector('.hero');
      const win = document.querySelector('.window');
      const cc = document.querySelector('.control-centre');
      const cs = getComputedStyle(hero);
      return {
        heroPaddingTop: cs.paddingTop,
        windowRect: win.getBoundingClientRect().toJSON(),
        ccRect: cc.getBoundingClientRect().toJSON(),
        ccMarginTop: getComputedStyle(cc).marginTop,
      };
    });
    R[`layout_${size.w}x${size.h}`] = r;
    await context.close();
  }
  console.log('layout:', JSON.stringify({ l1440: R.layout_1440x900, l1280: R.layout_1280x800 }, null, 1));
}

/* ---------- required film: a tap on each tile control, touch phone ---------- */
if (want('tap')) {
  const { context, page } = await ctx({ phone: true });
  await page.goto(`${base}/t/glassmorphism/`);
  await waitIdle(page);
  await page.locator('.control-centre').scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);
  const frames = [];
  const shot = async (label) => {
    const buf = await page.locator('.control-centre').screenshot();
    const path = join(OUT, `film__phone-tap__${frames.length}-${label}.jpg`);
    await writeFile(path, buf);
    frames.push({ label, path, t: Date.now() });
  };
  await shot('0-before');
  await page.locator('.cc-tint-switch').tap();
  await page.waitForTimeout(250);
  await shot('1-after-tint-tap');
  await page.locator('[data-tod="dusk"]').tap();
  await page.waitForTimeout(400); // the tod handler awaits a wallpaper decode
  await shot('2-after-tod-tap');
  const states = await page.evaluate(() => ({
    tintChecked: document.querySelector('.cc-tint-switch').getAttribute('aria-checked'),
    heroSwitchChecked: document.querySelector('.hero .window-bar .switch').getAttribute('aria-checked'),
    tod: document.querySelector('[data-tod="dusk"]').getAttribute('aria-checked'),
  }));
  R.phoneTap = { frames: frames.map((f) => f.path), states };
  await context.close();
  console.log('phone tap:', JSON.stringify(states));
}

/* ---------- required strip: a cross-school arrival at glass Home through
   the real switcher, with a held non-default setting ---------- */
async function viaSwitcher(page, school) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.locator('.open[aria-haspopup="dialog"]').first().click();
  const link = page.locator(`a[data-school="${school}"]`).first();
  await link.waitFor({ state: 'visible', timeout: 5000 });
  await link.click();
}
if (want('arrival')) {
  const { context, page } = await ctx();
  await page.goto(`${base}/t/glassmorphism/`);
  await waitIdle(page);
  // Hold tinted + dusk for the whole session (settings.ts, sessionStorage).
  await page.click('.hero .window-bar .switch');
  await page.click('[data-tod="dusk"]');
  await page.waitForTimeout(800);
  await viaSwitcher(page, 'vaporwave');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'vaporwave', { timeout: 8000 });
  await page.waitForTimeout(1500);
  await viaSwitcher(page, 'glassmorphism');
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'glassmorphism', { timeout: 8000 });
  const frames = [];
  for (const ms of [0, 100, 300, 600, 1200]) {
    if (ms) await page.waitForTimeout(ms - (frames.at(-1)?.t ?? 0));
    const buf = await page.screenshot();
    const path = join(OUT, `film__cross-school-arrival__${ms}ms.jpg`);
    await writeFile(path, buf);
    frames.push({ t: ms, path });
  }
  const held = await page.evaluate(() => ({
    tint: document.documentElement.dataset.glassTint,
    tod: document.documentElement.dataset.glassTod,
    switchChecked: document.querySelector('.hero .window-bar .switch')?.getAttribute('aria-checked'),
  }));
  R.arrival = { frames: frames.map((f) => f.path), held };
  await context.close();
  console.log('arrival held settings:', JSON.stringify(held));
}

await writeFile(join(OUT, 'verify-results.json'), JSON.stringify(R, null, 2));
await browser.close();
console.log('done ->', join(OUT, 'verify-results.json'));
