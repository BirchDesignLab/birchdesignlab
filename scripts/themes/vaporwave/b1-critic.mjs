/**
 * Opus critic probe for vaporwave, Tier 3 stage 3 wave B1.
 *
 * Written 09-25-26. Serves nothing itself: point it at a running snap of the
 * after build (and the frozen base for the hero comparison), e.g.
 *   node scripts/themes/snap.mjs --name b1-vw --reuse --port 4475 --hold
 *   node scripts/themes/snap.mjs --name stage3-base --reuse --port 4476 --hold
 *   BDL_GPU=1 node scripts/themes/vaporwave/b1-critic.mjs --after http://127.0.0.1:4475 --before http://127.0.0.1:4476
 *
 * What it records (scripts/themes/.out/b1-critic/):
 *  - crops of every B1 room element (kiosk, closers, screensaver, Sent
 *    dialog, About header, footer floor) per scheme at desktop and phone;
 *  - every animated `.vw-floor` frozen at 0/60/80/95% of both its cycles;
 *  - geometry: footer floor bottom vs document bottom, overlapping window
 *    pairs and how many of each pair carry the active (neon) bar, hero child
 *    rects before vs after;
 *  - the hero's seam: every uniform1f write to uSeam over ~4 cycles, so the
 *    restart tear's firing rate under the 30fps throttle is measured, not
 *    guessed.
 */
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, '..', '.out', 'b1-critic');
const arg = (n, f) => { const i = process.argv.indexOf(`--${n}`); return i > -1 ? process.argv[i + 1] : f; };
const AFTER = arg('after');
const BEFORE = arg('before');
const ONLY = arg('only', 'all');
await mkdir(OUT, { recursive: true });

const useGpu = process.env.BDL_GPU === '1';
const browser = await chromium.launch({
  args: ['--hide-scrollbars', ...(useGpu ? ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'] : [])],
});
{
  const p = await browser.newPage();
  const r = await p.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const e = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return gl ? (e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)) : 'no webgl';
  });
  console.log('renderer:', r);
  if (useGpu && /swiftshader|llvmpipe/i.test(r)) { await browser.close(); process.exit(4); }
  await p.close();
}

const PAGES = [
  { key: 'home', path: '/t/vaporwave/' },
  { key: 'services', path: '/t/vaporwave/services/' },
  { key: 'about', path: '/t/vaporwave/about/' },
  { key: 'contact', path: '/t/vaporwave/contact/' },
  { key: 'sent', path: '/t/vaporwave/contact/sent/' },
];
const VIEWS = { desktop: { width: 1440, height: 900 }, phone: { width: 390, height: 844 } };
const CROPS = ['.kiosk', '.closer-band', '.ask-band', '.side-scene', '.stage', '.dialog', '.temple', 'header.temple', '.centerpiece', '.plinth', 'footer .floor', '.doors', '.vw-lobby'];

async function open(base, path, scheme, view, init) {
  const ctx = await browser.newContext({ viewport: VIEWS[view], colorScheme: scheme, deviceScaleFactor: 1 });
  await ctx.addInitScript((s) => { try { localStorage.setItem('scheme', s); } catch {} }, scheme);
  if (init) await ctx.addInitScript(init);
  await suppressPrompt(ctx);
  await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(base + path, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  return { ctx, page, errors };
}

const report = { geometry: {}, seam: {}, hero: {}, errors: {} };

if (ONLY === 'all' || ONLY === 'rooms') {
  for (const pg of PAGES) for (const scheme of ['dark', 'light']) for (const view of ['desktop', 'phone']) {
    const { ctx, page, errors } = await open(AFTER, pg.path, scheme, view);
    const tag = `${pg.key}__${scheme}__${view}`;
    // Full page, then each room crop that exists.
    await page.screenshot({ path: join(OUT, `full__${tag}.png`), fullPage: true });
    for (const sel of CROPS) {
      const el = await page.$(sel);
      if (!el) continue;
      const box = await el.boundingBox();
      if (!box || box.width < 4 || box.height < 4) continue;
      await el.scrollIntoViewIfNeeded();
      await page.waitForTimeout(250);
      const safe = sel.replace(/[^a-z0-9]+/gi, '_').replace(/^_|_$/g, '');
      await el.screenshot({ path: join(OUT, `crop__${tag}__${safe}.png`) }).catch(() => {});
    }
    report.geometry[tag] = await page.evaluate(() => {
      const docH = document.documentElement.scrollHeight;
      const docW = document.documentElement.scrollWidth;
      const floor = document.querySelector('footer .floor');
      const fr = floor && floor.getBoundingClientRect();
      const floorBottom = fr ? fr.bottom + scrollY : null;
      const tail = document.querySelector('[data-portal-tail]');
      const wins = [...document.querySelectorAll('.vw-win')].map((w) => {
        const r = w.getBoundingClientRect();
        const bar = w.querySelector('.vw-win-bar');
        return { title: w.querySelector('.vw-win-title')?.textContent, x: r.x, y: r.y + scrollY, w: r.width, h: r.height, inactive: bar?.classList.contains('inactive'), barBg: bar ? getComputedStyle(bar).backgroundImage.slice(0, 120) : null };
      });
      const overlaps = [];
      for (let i = 0; i < wins.length; i++) for (let j = i + 1; j < wins.length; j++) {
        const a = wins[i], b = wins[j];
        const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ox > 0 && oy > 0) overlaps.push({ a: a.title, b: b.title, ox: Math.round(ox), oy: Math.round(oy), active: [a, b].filter((w) => !w.inactive).length });
      }
      // Anything painted white or near-white as a frame: borders of windows/props.
      const whiteFrames = [...document.querySelectorAll('main *')].filter((el) => {
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none') return false;
        const bw = parseFloat(cs.borderTopWidth) + parseFloat(cs.borderLeftWidth);
        if (bw < 2) return false;
        const m = cs.borderTopColor.match(/\d+(\.\d+)?/g);
        if (!m) return false;
        const [r, g, b, a = 1] = m.map(Number);
        return a > 0.5 && r > 235 && g > 235 && b > 235;
      }).map((el) => `${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`).slice(0, 20);
      const props = [...document.querySelectorAll('.vw-still, picture img')].map((el) => { const r = el.getBoundingClientRect(); return { cls: el.className, cur: el.currentSrc?.split('/').pop(), w: Math.round(r.width), h: Math.round(r.height), vis: getComputedStyle(el).display !== 'none' && r.width > 0 }; });
      return { docH, docW, innerW: innerWidth, floorBottom, tail: tail ? tail.getBoundingClientRect().height : null, gapBelowFloor: floorBottom == null ? null : Math.round(docH - floorBottom), wins, overlaps, whiteFrames, props, clock: document.querySelector('.tray-clock, [class*=clock]')?.textContent?.trim() };
    });
    report.errors[tag] = errors;
    await ctx.close();
  }
}

if (ONLY === 'all' || ONLY === 'floors') {
  // Every animated floor, frozen at 0/60/80/95% of the 6.4s seam cycle (the
  // 1.6s scroll runs four turns in the same span, so its currentTime is set
  // from the same wall clock).
  for (const pg of PAGES) for (const scheme of ['dark', 'light']) for (const view of ['desktop', 'phone']) {
    const { ctx, page } = await open(AFTER, pg.path, scheme, view);
    const n = await page.$$eval('.vw-floor', (els) => els.length);
    for (let fi = 0; fi < n; fi++) {
      for (const frac of [0, 0.6, 0.8, 0.95, 0.9955, 0.998]) {
        const info = await page.evaluate(({ fi, frac }) => {
          const floor = document.querySelectorAll('.vw-floor')[fi];
          floor.scrollIntoView({ block: 'center' });
          const anims = floor.getAnimations({ subtree: true });
          for (const a of anims) { a.pause(); a.currentTime = frac * 6400; }
          const box = (floor.closest('.screensaver-preview, .stage, .closer-band, .ask-band, section, div') || floor).getBoundingClientRect();
          return { anims: anims.map((a) => a.animationName), box: { x: box.x, y: box.y, w: box.width, h: box.height } };
        }, { fi, frac });
        await page.waitForTimeout(120);
        const b = info.box;
        const clip = { x: Math.max(0, b.x), y: Math.max(0, b.y), width: Math.min(b.w, VIEWS[view].width - Math.max(0, b.x)), height: Math.min(b.h, VIEWS[view].height - Math.max(0, b.y)) };
        if (clip.width > 4 && clip.height > 4) await page.screenshot({ path: join(OUT, `floor__${pg.key}__${scheme}__${view}__f${fi}__${String(frac).replace('.', 'p')}.png`), clip });
        report.geometry[`floor__${pg.key}__${scheme}__${view}__f${fi}`] = info;
      }
    }
    await ctx.close();
  }
}

if ((ONLY === 'all' || ONLY === 'hero') && BEFORE) {
  for (const scheme of ['dark', 'light']) for (const view of ['desktop', 'phone']) {
    const rects = {};
    for (const [label, base] of [['before', BEFORE], ['after', AFTER]]) {
      const { ctx, page } = await open(base, '/t/vaporwave/', scheme, view);
      rects[label] = await page.evaluate(() => {
        const hero = document.querySelector('.hero, [class*=hero]');
        if (!hero) return null;
        const out = { hero: hero.getBoundingClientRect().toJSON() };
        [...hero.querySelectorAll('*')].forEach((el, i) => {
          const r = el.getBoundingClientRect();
          if (r.width * r.height < 100) return;
          out[`${i}:${el.tagName.toLowerCase()}.${[...el.classList].join('.')}`] = [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)];
        });
        return out;
      });
      await page.screenshot({ path: join(OUT, `hero__${label}__${scheme}__${view}.png`) });
      await ctx.close();
    }
    const diffs = [];
    const a = rects.before || {}, b = rects.after || {};
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) diffs.push({ k, before: a[k], after: b[k] });
    report.hero[`${scheme}__${view}`] = diffs;
  }
}

if (ONLY === 'all' || ONLY === 'seam') {
  // Wrap uniform1f to log every uSeam write with its time, across ~4 cycles.
  const init = () => {
    const orig = WebGLRenderingContext.prototype.uniform1f;
    const names = new WeakMap();
    const origLoc = WebGLRenderingContext.prototype.getUniformLocation;
    WebGLRenderingContext.prototype.getUniformLocation = function (p, n) { const l = origLoc.call(this, p, n); if (l) names.set(l, n); return l; };
    window.__seamLog = [];
    window.__draws = 0;
    WebGLRenderingContext.prototype.uniform1f = function (loc, v) {
      const n = names.get(loc);
      if (n === 'uSeam') { window.__draws++; if (v !== 0) window.__seamLog.push([performance.now(), v]); }
      if (n === 'uScroll') { (window.__scroll ||= []).push([performance.now(), v]); }
      return orig.call(this, loc, v);
    };
  };
  for (const scheme of ['dark']) {
    const { ctx, page } = await open(AFTER, '/t/vaporwave/', scheme, 'desktop', init);
    await page.evaluate(() => { window.__seamLog = []; window.__draws = 0; window.__scroll = []; });
    await page.waitForTimeout(6400 * 5 + 500);
    const res = await page.evaluate(() => {
      const s = window.__scroll;
      let jumps = 0;
      for (let i = 1; i < s.length; i++) if (s[i][1] < s[i - 1][1] - 0.02 && s[i - 1][1] < 0.97) jumps++;
      const gaps = []; for (let i = 1; i < s.length; i++) gaps.push(s[i][0] - s[i - 1][0]);
      gaps.sort((x, y) => x - y);
      return { draws: window.__draws, seamFrames: window.__seamLog, restartJumps: jumps, medianGap: gaps[gaps.length >> 1], p90Gap: gaps[Math.floor(gaps.length * 0.9)] };
    });
    report.seam[scheme] = res;
    await ctx.close();
  }
}

await writeFile(join(OUT, `report__${ONLY}.json`), JSON.stringify(report, null, 1));
console.log(JSON.stringify({ seam: report.seam, hero: report.hero }, null, 1));
await browser.close();
