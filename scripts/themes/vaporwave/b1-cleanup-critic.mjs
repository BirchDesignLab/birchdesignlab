/** Opus critic probe, B1 vaporwave cleanup (fix round 3), 09-25-26.
    Checks the cleanup seat's four claims against the frozen snap:
      sent   - Sent's desktop pattern reaches the true page bottom (tail band
               painted, bottom-row pixels sampled), dark/light x desktop/phone
      kiosk  - sphere vs stand rects at 761/820/900/901/960/1024/1280/1440,
               both schemes, overlap + overflow + grounding, element shots
      icons  - glyph svg per icon, aria-hidden ancestor, nothing focusable,
               Tab order never lands inside .desktop-icons
      sheen  - lobby (Home closer) + footer sheen, 3x element crops
      hscroll- every page at 390/820/1440
      hero   - Home hero canvas at stripe phase 0 on BEFORE vs AFTER, pixel diff
    Forces prefers-reduced-transparency: no-preference over CDP (house rule),
    suppresses the portal prompt.
    Usage: BDL_GPU=1 node scripts/themes/vaporwave/b1-cleanup-critic.mjs <after> <before>
    Output: scripts/themes/.out/b1-vw-cleanup-critic/ */
import { chromium } from 'playwright';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-vw-cleanup-critic');
const AFTER = process.argv[2] || 'http://127.0.0.1:4475';
const BEFORE = process.argv[3] || 'http://127.0.0.1:4477';
const ONLY = process.argv[4]; // e.g. 'hero' to run only that section
const run = (k) => !ONLY || ONLY === k;
await mkdir(OUT, { recursive: true });
const browser = await chromium.launch({
  args: ['--hide-scrollbars', '--font-render-hinting=none', '--disable-lcd-text',
    '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'],
});
const report = {};
const PAGES = [['home', '/t/vaporwave/'], ['about', '/t/vaporwave/about/'], ['services', '/t/vaporwave/services/'], ['contact', '/t/vaporwave/contact/'], ['sent', '/t/vaporwave/contact/sent/']];

async function newCtx(width, height, scheme, dsf = 2, init) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dsf, colorScheme: scheme });
  await suppressPrompt(ctx);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  if (init) await ctx.addInitScript(init);
  const p = await ctx.newPage();
  const cdp = await ctx.newCDPSession(p);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }, { name: 'prefers-color-scheme', value: scheme }] });
  const errors = [];
  p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('pageerror', (e) => errors.push(String(e)));
  return { ctx, p, errors };
}
async function load(p, url) {
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 400) { scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    scrollTo(0, 0);
  });
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(300);
}

// renderer guard
{
  const { ctx, p } = await newCtx(800, 600, 'dark', 1);
  const r = await p.evaluate(() => { const gl = document.createElement('canvas').getContext('webgl'); const e = gl.getExtension('WEBGL_debug_renderer_info'); return gl.getParameter(e.UNMASKED_RENDERER_WEBGL); });
  report.renderer = r;
  await ctx.close();
  if (/swiftshader|llvmpipe/i.test(r)) throw new Error('software renderer: ' + r);
}

// ---- sent bottom
if (run('sent')) {
report.sent = [];
for (const scheme of ['dark', 'light']) {
  for (const [vp, w, h] of [['desktop', 1440, 900], ['phone', 390, 844]]) {
    const { ctx, p, errors } = await newCtx(w, h, scheme);
    await load(p, AFTER + '/t/vaporwave/contact/sent/');
    await p.evaluate(() => scrollTo(0, document.documentElement.scrollHeight));
    await p.waitForTimeout(300);
    const info = await p.evaluate(() => {
      const tail = document.querySelector('[data-portal-tail]');
      const foot = document.querySelector('main + .foot');
      const r = (e) => e && (({ top, bottom, height }) => ({ top: Math.round(top + scrollY), bottom: Math.round(bottom + scrollY), h: Math.round(height) }))(e.getBoundingClientRect());
      const afterTail = tail && [...document.body.querySelectorAll('*')].filter((e) => e.getBoundingClientRect().top + scrollY >= r(tail).bottom - 1 && e.getBoundingClientRect().height > 0 && getComputedStyle(e).position !== 'fixed').map((e) => e.tagName + '.' + e.className).slice(0, 5);
      return {
        docH: document.documentElement.scrollHeight, tail: r(tail), foot: r(foot),
        tailBg: tail && getComputedStyle(tail).backgroundImage.slice(0, 50), footBg: foot && getComputedStyle(foot).backgroundImage.slice(0, 50),
        afterTail, hscroll: document.documentElement.scrollWidth - innerWidth,
      };
    });
    const file = `sent-bottom__${scheme}__${vp}.png`;
    await p.screenshot({ path: join(OUT, file) });
    // bottom-row sample: compare mean colour/variance of last 4 rows vs rows 120 px up
    const img = await loadImage(join(OUT, file));
    const c = createCanvas(img.width, img.height); const g = c.getContext('2d'); g.drawImage(img, 0, 0);
    const stat = (y0) => { const d = g.getImageData(0, y0, img.width, 4).data; let s = 0, s2 = 0, n = 0; for (let i = 0; i < d.length; i += 4) { const l = (d[i] + d[i + 1] + d[i + 2]) / 3; s += l; s2 += l * l; n++; } const m = s / n; return { mean: +m.toFixed(1), sd: +Math.sqrt(s2 / n - m * m).toFixed(1) }; };
    info.rowBottom = stat(img.height - 4); info.rowTailTop = stat(img.height - 2 * 76 - 10); info.rowAbove = stat(img.height - 2 * 200);
    info.errors = errors;
    report.sent.push({ tag: `${scheme}__${vp}`, ...info });
    await ctx.close();
  }
}
}
// ---- kiosk widths
if (run('kiosk')) {
report.kiosk = [];
for (const scheme of ['dark', 'light']) {
  for (const w of [761, 820, 900, 901, 960, 1024, 1280, 1440]) {
    const { ctx, p } = await newCtx(w, 1000, scheme);
    await load(p, AFTER + '/t/vaporwave/');
    const info = await p.evaluate(() => {
      const r = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { top: Math.round(b.top + scrollY), bottom: Math.round(b.bottom + scrollY), left: Math.round(b.left), right: Math.round(b.right) }; };
      const prop = document.querySelector('.kiosk-prop');
      return { stand: r('.kiosk-stand'), foot: r('.stand-foot'), kiosk: r('.kiosk'), prop: r('.kiosk-prop'), propImg: r('.kiosk-prop img'), propDisplay: prop && getComputedStyle(prop).display, hscroll: document.documentElement.scrollWidth - innerWidth };
    });
    const vis = info.propDisplay !== 'none' && info.propImg && info.propImg.right > info.propImg.left;
    info.visible = vis;
    if (vis) {
      info.gap = info.propImg.left - info.stand.right;
      info.overlap = info.gap < 0;
      info.overflowKiosk = info.propImg.right - info.kiosk.right;
      info.overflowVp = info.propImg.right - w;
      info.bottomVsStand = info.propImg.bottom - info.stand.bottom;
    }
    report.kiosk.push({ scheme, w, ...info });
    const el = p.locator('.kiosk-stand');
    await el.scrollIntoViewIfNeeded(); await p.waitForTimeout(200);
    const b = await el.boundingBox();
    const y = Math.max(0, b.y + b.height - 220);
    await p.screenshot({ path: join(OUT, `kiosk__${scheme}__${w}.png`), clip: { x: 0, y, width: w, height: Math.min(1000 - y, 300) } });
    await ctx.close();
  }
}
}
// ---- icons
if (run('icons')) {
report.icons = [];
for (const scheme of ['dark', 'light']) {
  const { ctx, p } = await newCtx(1440, 900, scheme, 3);
  await load(p, AFTER + '/t/vaporwave/contact/sent/');
  const info = await p.evaluate(() => {
    const wrap = document.querySelector('.desktop-icons');
    const icons = [...document.querySelectorAll('.desktop-icon')];
    const focusSel = 'a[href],button,input,select,textarea,[tabindex],summary,[contenteditable]';
    return {
      wrapAriaHidden: wrap && wrap.getAttribute('aria-hidden'), wrapInert: wrap && wrap.inert,
      icons: icons.map((e) => ({ label: e.textContent.trim().slice(0, 20), svg: !!e.querySelector('svg'), rects: e.querySelectorAll('svg rect, svg path').length, svgBox: e.querySelector('svg') && Math.round(e.querySelector('svg').getBoundingClientRect().width), focusables: e.querySelectorAll(focusSel).length, tabIndex: e.tabIndex })),
    };
  });
  // Tab walk
  const hits = [];
  for (let i = 0; i < 40; i++) {
    await p.keyboard.press('Tab');
    const inIcons = await p.evaluate(() => { const a = document.activeElement; return a && a.closest('.desktop-icons') ? a.outerHTML.slice(0, 60) : null; });
    if (inIcons) hits.push(inIcons);
  }
  info.tabHits = hits;
  const b = await p.locator('.desktop-icons').boundingBox();
  await p.screenshot({ path: join(OUT, `icons__${scheme}.png`), clip: { x: Math.max(0, b.x - 10), y: Math.max(0, b.y - 10), width: b.width + 20, height: b.height + 20 } });
  // accessibility tree snapshot should not include icon labels
  const ax = await p.accessibility?.snapshot?.().catch(() => null);
  info.axHasIcons = ax ? JSON.stringify(ax).includes('readme.txt') : 'n/a';
  report.icons.push({ scheme, ...info });
  await ctx.close();
}
}
// ---- sheen
if (run('sheen')) {
for (const scheme of ['dark', 'light']) {
  const { ctx, p } = await newCtx(1440, 900, scheme, 2);
  for (const pg of ['/t/vaporwave/', '/t/vaporwave/about/']) {
  await load(p, AFTER + pg);
  const sheens = p.locator('.sheen');
  const n = await sheens.count();
  report[`sheen_${scheme}`] ||= [];
  for (let i = 0; i < n; i++) {
    const s = sheens.nth(i);
    if (!(await s.isVisible())) { report[`sheen_${scheme}`].push({ pg, i, hidden: true }); continue; }
    await s.scrollIntoViewIfNeeded(); await p.waitForTimeout(250);
    const b = await s.boundingBox();
    const cs = await s.evaluate((e) => { const c = getComputedStyle(e); return { filter: c.filter, blend: c.mixBlendMode, opacity: c.opacity, parent: e.parentElement.className, bg: c.backgroundImage.slice(0, 80) }; });
    report[`sheen_${scheme}`].push({ pg, i, box: b && { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }, ...cs });
    if (b) {
      const y = Math.max(0, b.y - 120), hh = Math.min(900 - y, b.height + 240);
      await p.screenshot({ path: join(OUT, `sheen__${pg.split("/")[3] || "home"}__${scheme}__${i}.png`), clip: { x: 0, y, width: 1440, height: hh } });
    }
  }
  }
  await ctx.close();
}
}
// ---- hscroll
if (run('hscroll')) {
report.hscroll = [];
for (const w of [390, 820, 1440]) {
  for (const scheme of ['dark', 'light']) {
    for (const [name, path] of PAGES) {
      const { ctx, p, errors } = await newCtx(w, 900, scheme, 1);
      await load(p, AFTER + path);
      const h = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      report.hscroll.push({ w, scheme, name, h, errors: errors.length });
      await ctx.close();
    }
  }
}
}
// ---- hero before/after at stripe phase 0
if (run('hero')) {
const initGL = () => {
  window.__log = [];
  for (const P of [WebGLRenderingContext.prototype, window.WebGL2RenderingContext && WebGL2RenderingContext.prototype].filter(Boolean)) {
    const gul = P.getUniformLocation, u1 = P.uniform1f, da = P.drawArrays;
    P.getUniformLocation = function (prog, name) { const l = gul.call(this, prog, name); if (l) l.__n = name; return l; };
    P.uniform1f = function (l, v) { if (l && (l.__n === 'uSeam' || l.__n === 'uStripe')) (window.__cur ||= {})[l.__n] = v; return u1.call(this, l, v); };
    P.drawArrays = function (...a) { if (this.canvas && this.canvas.hasAttribute && this.canvas.hasAttribute('data-vw-horizon')) window.__log.push({ ...(window.__cur || {}) }); return da.apply(this, a); };
  }
};
report.hero = [];
for (const scheme of ['dark', 'light']) {
  const bufs = {};
  for (const [lab, base] of [['before', BEFORE], ['after', AFTER]]) {
    const { ctx, p } = await newCtx(1440, 900, scheme, 1, initGL);
    await p.goto(base + '/t/vaporwave/', { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(1500);
    const t0 = Date.now(); let got = null;
    while (Date.now() - t0 < 12000) {
      const cp = await p.evaluate(() => { const l = window.__log.at(-1); return l && l.uStripe != null ? l.uStripe / 0.06 : -1; });
      if (cp >= 0.2 && cp < 0.3) { got = cp; break; }
      await p.waitForTimeout(5);
    }
    bufs[lab] = await p.locator('.hero').first().screenshot();
    await writeFile(join(OUT, `hero__${scheme}__${lab}.png`), bufs[lab]);
    report.hero.push({ scheme, lab, cp: got });
    await ctx.close();
  }
  const [a, b] = await Promise.all([loadImage(bufs.before), loadImage(bufs.after)]);
  const W = Math.min(a.width, b.width), H = Math.min(a.height, b.height);
  const get = (im) => { const c = createCanvas(W, H); const g = c.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, W, H).data; };
  const da = get(a), db = get(b);
  let big = 0, sum = 0; const n = W * H;
  // ignore the animated band rows? report whole-frame and per-quadrant
  for (let i = 0; i < da.length; i += 4) { const d = Math.abs(da[i] - db[i]) + Math.abs(da[i + 1] - db[i + 1]) + Math.abs(da[i + 2] - db[i + 2]); sum += d; if (d > 60) big++; }
  report.hero.push({ scheme, diff: { sizeBefore: [a.width, a.height], sizeAfter: [b.width, b.height], meanAbs: +(sum / n / 3).toFixed(2), pctBig: +(100 * big / n).toFixed(2) } });
}
}
await writeFile(join(OUT, ONLY ? `report-${ONLY}.json` : 'report.json'), JSON.stringify(report, null, 1));
console.log(JSON.stringify(report));
await browser.close();
