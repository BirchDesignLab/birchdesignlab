/**
 * Stage 5 Tier A proof a6: cottagecore dandelion floaters (light) and the
 * firefly burst flash (dark), both answering the pointer.
 *
 * Bundles scripts/themes/proofs/stage5-cc-floaters/fx.ts with esbuild (the real
 * src/lib/lifecycle.ts resolves through the relative import), injects it into
 * the frozen build (nothing under src/ changes), and:
 *   - films timestamped strips: dark Home, light Home and About, at 1440 and 390
 *     (the dark films wait for a flash before each frame, and the sheets pick the
 *     frames with the brightest flash as measured in the pixels);
 *   - films pointer strips: a cursor (1440) or a tap (390) on a firefly and on a
 *     seed, as tight clips taken back to back. What can be seen is read from the
 *     browser (the canvas painted magenta, a cell counts where it still shows), the
 *     mote or seed is set down in the roomiest open cloth, and each take is checked
 *     (glow in the pixels; a seed whole and moving off track) or retried;
 *   - measures, in-page, from hooks on the 2D context: the burst numbers (flashes
 *     per burst, gap, rise, dark rest), how many motes are lit at once, and, for
 *     every visible draw of a floater, whether it overlaps text (rects taken
 *     independently of fx.ts), across scroll positions;
 *   - costs the loop against today's fireflies (CDP Performance deltas, rAF
 *     callback time, getBoundingClientRect calls during a scroll).
 * "base" pages run the frozen build's own fx.ts; "proof" pages block its
 * getContext call, then mount the proof.
 *
 * Output: scripts/themes/.out/stage5-proofs/cc-floaters/
 *   frames/*.png, clips/*.png, shots/*.png, measures.json, renderer.txt,
 *   index.md, sheet-*.jpg
 *
 * Usage (BDL_GPU=1 required; exits 2 on a software renderer):
 *   BDL_GPU=1 node scripts/themes/snap.mjs --name stage5-base --reuse --port 4460 -- \
 *     node scripts/themes/harness/stage5-cc-floaters-proof.mjs [--films] [--pointer] [--stats] [--cost] [--sheets]
 *   no flag: every stage in turn. Stages merge into measures.json.
 */
import { chromium } from 'playwright';
import { build } from 'esbuild';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..', '..');
const PROOF = join(REPO, 'scripts', 'themes', 'proofs', 'stage5-cc-floaters');
const out = join(REPO, 'scripts', 'themes', '.out', 'stage5-proofs', 'cc-floaters');
const frames = join(out, 'frames');
const clips = join(out, 'clips');
const shots = join(out, 'shots');
for (const d of [frames, clips, shots]) await mkdir(d, { recursive: true });
const base = (process.env.SNAP_BASE || '').replace(/\/$/, '');
const measuresPath = join(out, 'measures.json');
const measures = existsSync(measuresPath) ? JSON.parse(await readFile(measuresPath, 'utf8')) : {};
const saveMeasures = () => writeFile(measuresPath, JSON.stringify(measures, null, 2));

const SIZES = [
  { id: '1440', w: 1440, h: 900, dpr: 1 },
  { id: '390', w: 390, h: 844, dpr: 2, mobile: true },
];
const PAGES = [['home', ''], ['about', 'about/']];
const BROWSER_ARGS = ['--hide-scrollbars', '--font-render-hinting=none', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--enable-gpu-rasterization'];
const HIDE = 'bdl-switcher{display:none!important} *{scroll-behavior:auto!important}';
/* Tier B: theme.css collapses its two .cc-motes rules to display:block. */
const SHOW = "[data-theme='cottagecore'] .cc-motes{display:block!important}";
const TEXT_SEL = ':is(h1,h2,h3,h4,p,li,a,label,blockquote,figcaption,button,input,textarea)';

const args = process.argv.slice(2);
const only = ['films', 'pointer', 'stats', 'cost', 'sheets'].filter((s) => args.includes(`--${s}`));
const want = (s) => only.length === 0 || only.includes(s);

/* ---------- the proof bundle ---------- */
const bundled = await build({
  entryPoints: [join(PROOF, 'fx.ts')],
  bundle: true, write: false, format: 'iife', globalName: '__ccFx', target: 'es2022',
  minify: false, legalComments: 'none',
  /* fx.ts will live at src/themes/cottagecore/fx.ts; its import path is written for there. */
  plugins: [{
    name: 'lifecycle',
    setup(b) {
      b.onResolve({ filter: /lib\/lifecycle$/ }, () => ({ path: join(REPO, 'src', 'lib', 'lifecycle.ts') }));
    },
  }],
});
const BUNDLE = bundled.outputFiles[0].text;
await writeFile(join(out, 'fx.bundle.js'), BUNDLE);

/* ---------- init script: hooks, all optional ---------- */
const INIT = ({ hooks, block }) => {
  const P = (window.__ccP = { frames: [], rafDur: [], rects: 0, hooks });
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = (cb) => raf((t) => {
    const s = performance.now();
    cb(t);
    P.rafDur.push(performance.now() - s);
  });
  const gb = Element.prototype.getBoundingClientRect;
  Element.prototype.getBoundingClientRect = function () { P.rects++; return gb.call(this); };
  if (block) {
    const gc = HTMLCanvasElement.prototype.getContext;
    window.__ccBlock = true;
    HTMLCanvasElement.prototype.getContext = function (...a) {
      if (window.__ccBlock && this.hasAttribute('data-cc-motes')) return null;
      return gc.apply(this, a);
    };
  }
  if (hooks) {
    const proto = CanvasRenderingContext2D.prototype;
    const oc = proto.clearRect;
    const od = proto.drawImage;
    proto.clearRect = function (...a) {
      if (this.canvas.hasAttribute('data-cc-motes')) {
        P.frames.push({ t: performance.now(), sy: window.scrollY, dpr: this.canvas.width / window.innerWidth, d: [] });
      }
      return oc.apply(this, a);
    };
    proto.drawImage = function (img, ...a) {
      if (this.canvas.hasAttribute('data-cc-motes') && P.frames.length) {
        const m = this.getTransform();
        P.frames[P.frames.length - 1].d.push({ a: this.globalAlpha, args: a, m: [m.a, m.b, m.c, m.d, m.e, m.f] });
      }
      return od.call(this, img, ...a);
    };
  }
};

async function newPage(browser, scheme, sz, opts) {
  const context = await browser.newContext({
    viewport: { width: sz.w, height: sz.h }, deviceScaleFactor: sz.dpr,
    isMobile: !!sz.mobile, hasTouch: !!sz.mobile, colorScheme: scheme, reducedMotion: 'no-preference',
  });
  await suppressPrompt(context);
  await context.addInitScript((s) => { try { localStorage.setItem('scheme', s); localStorage.setItem('theme', s); } catch {} }, scheme);
  await context.addInitScript(INIT, { hooks: !!opts.hooks, block: opts.mode === 'proof' });
  await context.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [
      { name: 'prefers-color-scheme', value: scheme },
      { name: 'prefers-reduced-motion', value: 'no-preference' },
      { name: 'prefers-reduced-transparency', value: 'no-preference' },
    ],
  });
  return { context, page, cdp };
}

/* mode 'base': the frozen build's fx.ts runs as shipped.
   mode 'proof': its getContext is blocked, then the bundle mounts. */
async function open(browser, { scheme, sz, path, mode, hooks }) {
  const { context, page, cdp } = await newPage(browser, scheme, sz, { mode, hooks });
  await page.goto(`${base}/t/cottagecore/${path}`, { waitUntil: 'networkidle' });
  await page.addStyleTag({ content: HIDE });
  if (mode === 'proof') {
    await page.addStyleTag({ content: SHOW });
    await page.evaluate(async () => { await document.fonts.ready; });
    await page.evaluate(() => { window.__ccFloatersProbe = {}; });
    await page.addScriptTag({ content: BUNDLE });
    await page.evaluate(() => { window.__ccBlock = false; window.__ccFx.mountFireflies(); });
  }
  await page.evaluate(async () => { await document.fonts.ready; });
  await page.waitForTimeout(600);
  const got = await page.evaluate(() => ({ theme: document.documentElement.dataset.theme, scheme: document.documentElement.dataset.scheme }));
  if (got.theme !== 'cottagecore' || got.scheme !== scheme) console.warn(`WARN theme=${got.theme} scheme=${got.scheme} (wanted ${scheme})`);
  return { context, page, cdp };
}

/* Is the topmost thing at (x, y) bare cloth: no paint of its own, not a drawing? */
const BARE = (x, y) => {
  const e = document.elementFromPoint(x, y);
  if (!e || e.closest('svg,img,picture,canvas,video')) return false;
  if (e.closest('a,button,input,textarea,select,label,summary')) return false;
  if (e === document.body || e === document.documentElement) return true;
  const cs = getComputedStyle(e);
  const bg = cs.backgroundColor;
  const clear = bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)';
  return clear && cs.backgroundImage === 'none';
};
const lit = (fr) => fr.d.filter((x) => x.a > 0.05 && x.args.length === 4 && x.args[2] > 20).length;

/* ---------- strips ---------- */
async function pageNowOffset(page) {
  const a = performance.now();
  const p = await page.evaluate(() => performance.now());
  const b = performance.now();
  return p - (a + b) / 2;
}

/* Take n viewport frames, every `every` ms (best effort), stamped on the page's clock. */
/* Wait (up to ms) until some firefly that is on show is at or near the peak of a
   flash, so the next screenshot lands on a flash. The 30 fps loop and a
   screenshot's latency make an unaimed strip catch mostly dark frames. */
async function waitForFlash(page, ms) {
  const t = performance.now();
  while (performance.now() - t < ms) {
    const ok = await page.evaluate(() => {
      const st = window.__ccFloatersProbe.get();
      const now = performance.now();
      for (const m of st.fireflies) {
        if (m.cover < 0.6) continue;
        let env = 0;
        for (const f of m.flashes) {
          const u = now - f.start;
          if (u <= 0) continue;
          if (u < f.rise) { const k = u / f.rise; env = Math.max(env, k * k * (3 - 2 * k)); continue; }
          const d = (u - f.rise) / 250;
          if (d < 1) env = Math.max(env, (1 - d) * (1 - d));
        }
        if (env > 0.45) return true;
      }
      return false;
    });
    if (ok) return true;
    await page.waitForTimeout(10);
  }
  return false;
}

async function film(page, { n, every, prefix, aimed }) {
  const off = await pageNowOffset(page);
  const t0 = performance.now();
  const rows = [];
  for (let i = 0; i < n; i++) {
    if (aimed) {
      /* at least `every` ms after the last, then the next flash that comes */
      const gap = (i ? rows[i - 1].tEnd : t0) + every - performance.now();
      if (gap > 0) await page.waitForTimeout(gap);
      await waitForFlash(page, 1800);
    } else {
      const want = t0 + i * every;
      const wait = want - performance.now();
      if (wait > 0) await page.waitForTimeout(wait);
    }
    const a = performance.now();
    const file = `${prefix}__${i}.png`;
    await page.screenshot({ path: join(frames, file) });
    const b = performance.now();
    const mid = (a + b) / 2;
    rows.push({ file, t: +((mid - t0) / 1000).toFixed(2), pageT: mid + off, tEnd: b });
  }
  const fr = await page.evaluate(() => window.__ccP.frames.map((f) => ({ t: f.t, d: f.d.map((x) => ({ a: x.a, args: x.args })) })));
  for (const r of rows) {
    let best = null;
    for (const f of fr) if (!best || Math.abs(f.t - r.pageT) < Math.abs(best.t - r.pageT)) best = f;
    r.lit = best && Math.abs(best.t - r.pageT) < 150 ? lit(best) : null;
    r.drawn = best ? best.d.filter((x) => x.a > 0.03).length : null;
    delete r.pageT;
    delete r.tEnd;
  }
  return rows;
}

async function runFilms(browser) {
  measures.films = measures.films || {};
  const plan = [];
  for (const sz of SIZES) {
    plan.push({ id: `dark-home-${sz.id}`, scheme: 'dark', page: 'home', path: '', sz, n: 36, every: 330, aimed: true });
    for (const [name, path] of PAGES) plan.push({ id: `light-${name}-${sz.id}`, scheme: 'light', page: name, path, sz, n: 36, every: 700 });
  }
  for (const p of plan) {
    const { context, page } = await open(browser, { scheme: p.scheme, sz: p.sz, path: p.path, mode: 'proof', hooks: true });
    await page.waitForTimeout(p.scheme === 'light' ? 2500 : 4000);
    await page.evaluate(() => { window.__ccP.frames.length = 0; });
    const rows = await film(page, { n: p.n, every: p.every, prefix: p.id, aimed: !!p.aimed });
    measures.films[p.id] = rows;
    /* a whole-page still for the sheet (the fixed canvas paints in the first viewport) */
    await page.screenshot({ path: join(shots, `${p.id}__fullpage.png`), fullPage: true });
    await context.close();
    console.log(`film ${p.id}: ${rows.length} frames`);
  }
  await saveMeasures();
}

/* ---------- pointer strips ---------- */

/* What can be seen. The canvas sits under the sheets, cards, tapes and text, so
   a floater only shows where nothing paints over the cloth, and elementFromPoint
   cannot tell (a transparent host with a painted ::before still answers "bare").
   So ask the browser: paint the canvas solid magenta, screenshot, and call a
   lattice cell visible where at least 92% of its pixels are still magenta. */
const LAT = 10;
async function visibleMask(page, sz) {
  const set = (on) => page.evaluate((on) => {
    const c = document.querySelector('[data-cc-motes]');
    c.style.background = on ? 'rgb(255, 0, 255)' : '';
  }, on);
  await set(true);
  const buf = await page.screenshot();
  await set(false);
  const im = await loadImage(buf);
  const cv = createCanvas(im.width, im.height);
  const g = cv.getContext('2d');
  g.drawImage(im, 0, 0);
  const d = g.getImageData(0, 0, im.width, im.height).data;
  const sc = im.width / sz.w;
  const cols = Math.floor(sz.w / LAT), rows = Math.floor(sz.h / LAT);
  const vis = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    let n = 0, mag = 0;
    for (let py = Math.round(j * LAT * sc); py < Math.round((j + 1) * LAT * sc); py += 2) {
      for (let px = Math.round(i * LAT * sc); px < Math.round((i + 1) * LAT * sc); px += 2) {
        const o = (py * im.width + px) * 4;
        n++;
        if (d[o] > 235 && d[o + 1] < 25 && d[o + 2] > 235) mag++;
      }
    }
    vis[j * cols + i] = mag / n >= 0.92 ? 1 : 0;
  }
  /* and where a tap would do something: a link, a control, or a pointer cursor */
  const tapOk = await page.evaluate(({ cols, rows, lat }) => {
    const memo = new Map();
    const safe = (e) => {
      if (!e) return true;
      if (memo.has(e)) return memo.get(e);
      const v = !e.closest('a,button,input,textarea,select,label,summary,[role=button],[onclick],bdl-switcher') && getComputedStyle(e).cursor !== 'pointer';
      memo.set(e, v);
      return v;
    };
    const out = new Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) out[j * cols + i] = safe(document.elementFromPoint(i * lat + lat / 2, j * lat + lat / 2)) ? 1 : 0;
    return out;
  }, { cols, rows, lat: LAT });
  return { vis, tapOk, cols, rows };
}
/* a tap at (x, y) and the cells around it do nothing */
function tapSafe(m, x, y) {
  const i = Math.floor(x / LAT), j = Math.floor(y / LAT);
  for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
    const ii = i + di, jj = j + dj;
    if (ii < 0 || jj < 0 || ii >= m.cols || jj >= m.rows || !m.tapOk[jj * m.cols + ii]) return false;
  }
  return true;
}
/* every lattice cell under the box [x0,x1] x [y0,y1] (viewport px) is visible */
function boxVisible(m, x0, y0, x1, y1) {
  const i0 = Math.floor(x0 / LAT), i1 = Math.floor(x1 / LAT), j0 = Math.floor(y0 / LAT), j1 = Math.floor(y1 / LAT);
  if (i0 < 0 || j0 < 0 || i1 >= m.cols || j1 >= m.rows) return false;
  for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) if (!m.vis[j * m.cols + i]) return false;
  return true;
}
/* Walk the page in 60 px steps; at each, hand fn the visibility mask and the
   text rects (document space). fn returns something to stop on. */
async function eachScroll(page, sz, fn) {
  const info = await page.evaluate(() => ({ docH: document.documentElement.scrollHeight, rects: window.__ccFloatersProbe.get().textRects }));
  const top = Math.max(0, info.docH - sz.h);
  for (let y0 = 0; y0 <= top; y0 += 60) {
    await page.evaluate((y) => window.scrollTo(0, y), y0);
    await page.waitForTimeout(120);
    const sy = await page.evaluate(() => window.scrollY);
    const mask = await visibleMask(page, sz);
    const got = fn({ sy, mask, rects: info.rects });
    if (got) return { ...got, scroll: sy };
  }
  return null;
}
const dist2Text = (rects, x, y, sy) => {
  let dmin = 1e4;
  for (const r of rects) {
    const dx = Math.max(r.l - x, 0, x - r.r), dy = Math.max(r.t - (y + sy), 0, y + sy - r.b);
    dmin = Math.min(dmin, Math.hypot(dx, dy));
  }
  return dmin;
};

/* The roomiest spot for a firefly. The ideal is a visible 3 x 3 box of +/-40 px
   (the peak halo reaches ~34) with 50 px of clear air to any text; on a phone
   there is less cloth, so the ideal steps down (box, air) until one exists.
   Returns the strictest level found, with the spot furthest from text. */
const FF_LEVELS = [[40, 50], [34, 36], [30, 24], [26, 18]];
async function findFireflySpot(page, sz) {
  const best = FF_LEVELS.map(() => null);
  await eachScroll(page, sz, ({ sy, mask, rects }) => {
    FF_LEVELS.forEach(([half, air], lv) => {
      for (let gx = 70; gx < sz.w - 70; gx += LAT) for (let gy = 70; gy < sz.h - 70; gy += LAT) {
        if (!boxVisible(mask, gx - half, gy - half, gx + half, gy + half)) continue;
        const d = dist2Text(rects, gx, gy, sy);
        if (d >= air && (!best[lv] || d > best[lv].d) && tapSafe(mask, gx, gy)) best[lv] = { x: gx, y: gy, d, scroll: sy, half, air };
      }
    });
    return null;
  });
  return best.find(Boolean) || null;
}

/* The longest straight run of visible cloth a seed can be sent along. A spot is
   ok when the seed's whole drawn box (fan 40k to each side, 42k up, 70k down at
   scale k) is visible and `pad` px clear of text in every direction (the loop
   adds 12 px and looks 0.7 s ahead, so a seed with less is faded out before it
   moves); from each ok spot try 16 directions and count ok cells. The tap point,
   behind the seed along the kick, must be visible too. The ideal is a 340 px
   run with 34 px of air; a phone steps down until one exists. */
const SEED_LEVELS = [[340, 34], [260, 30], [200, 24], [160, 18], [130, 14], [100, 12]];
async function findCorridor(page, sz, k) {
  const hx = Math.ceil(40 * k), up = Math.ceil(42 * k), dn = Math.ceil(70 * k);
  const best = SEED_LEVELS.map(() => null);
  await eachScroll(page, sz, ({ sy, mask, rects }) => {
    const { cols, rows } = mask;
    /* distance from each cell's centre to the nearest text, so a run down a
       narrow gutter scores below one through open cloth */
    const dmap = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) dmap[j * cols + i] = dist2Text(rects, i * LAT + LAT / 2, j * LAT + LAT / 2, sy);
    SEED_LEVELS.forEach(([run, pad], lv) => {
      const steps = Math.round(run / LAT);
      const ok = new Uint8Array(cols * rows);
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        const x = i * LAT + LAT / 2, y = j * LAT + LAT / 2;
        if (x < 50 || x > sz.w - 50 || y < 60 || y > sz.h - 60) continue;
        if (!boxVisible(mask, x - hx, y - up, x + hx, y + dn)) continue;
        const l = x - hx - pad, r = x + hx + pad, t = y + sy - up - pad, b = y + sy + dn + pad;
        let hit = false;
        for (const q of rects) if (l < q.r && r > q.l && t < q.b && b > q.t) { hit = true; break; }
        if (!hit) ok[j * cols + i] = 1;
      }
      for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
        if (!ok[j * cols + i]) continue;
        const x = i * LAT + LAT / 2, y = j * LAT + LAT / 2;
        for (let dd = 0; dd < 16; dd++) {
          const th = (dd / 16) * Math.PI * 2;
          const cx = Math.cos(th), cy = Math.sin(th);
          let n = 0, score = dmap[j * cols + i];
          for (; n < steps; n++) {
            const ii = Math.floor((x + cx * (n + 1) * LAT) / LAT), jj = Math.floor((y + cy * (n + 1) * LAT) / LAT);
            if (ii < 0 || jj < 0 || ii >= cols || jj >= rows || !ok[jj * cols + ii]) break;
            score = Math.min(score, dmap[jj * cols + ii]);
          }
          const len = n * LAT;
          if (len < steps * LAT || (best[lv] && score <= best[lv].score)) continue;
          /* The kick is (1 - d/170) * 230 px/s at distance d from the tap and the
             seed then coasts about 1.1 s, so tap far enough back that the drift
             is about the run. It adds 0.15 of itself upward, so the
             tap-to-seed unit is bent down to make the kick land along (cx, cy). */
          const v = (1.0 * len) / 1.1;
          const dTap = Math.max(20, Math.min(150, 170 * (1 - v / 230)));
          const m = (-0.3 * cy + Math.sqrt(0.09 * cy * cy + 3.91)) / 2;
          const nx = m * cx, ny = m * cy + 0.15;
          const tx = x - nx * dTap, ty = y - ny * dTap;
          if (tx < 12 || ty < 12 || tx > sz.w - 12 || ty > sz.h - 12 || !boxVisible(mask, tx - 4, ty - 4, tx + 4, ty + 4) || !tapSafe(mask, tx, ty)) continue;
          best[lv] = { len, score, run, pad, x, y, cx, cy, tx, ty, dTap: Math.round(dTap), scroll: sy };
        }
      }
    });
    return null;
  });
  return best.find(Boolean) || null;
}

/* Brightest increase over a reference clip, 0-255 (luminance), so "the flash
   registers" is read off the image rather than off the model. */
async function glowAgainst(refFile, file) {
  const [a, b] = await Promise.all([loadImage(refFile), loadImage(file)]);
  const w = Math.min(a.width, b.width), h = Math.min(a.height, b.height);
  const read = (im) => { const cv = createCanvas(w, h); const g = cv.getContext('2d'); g.drawImage(im, 0, 0); return g.getImageData(0, 0, w, h).data; };
  const A = read(a), B = read(b);
  let max = 0;
  for (let i = 0; i < A.length; i += 4) {
    const la = 0.2126 * A[i] + 0.7152 * A[i + 1] + 0.0722 * A[i + 2];
    const lb = 0.2126 * B[i] + 0.7152 * B[i + 1] + 0.0722 * B[i + 2];
    if (lb - la > max) max = lb - la;
  }
  return Math.round(max);
}
const envAt = (flashes, t) => {
  let env = 0;
  for (const f of flashes) {
    const u = t - f.start;
    if (u <= 0) continue;
    if (u < f.rise) { const k = u / f.rise; env = Math.max(env, k * k * (3 - 2 * k)); continue; }
    const d = (u - f.rise) / 250;
    if (d < 1) env = Math.max(env, (1 - d) * (1 - d));
  }
  return env;
};

async function pointerDark(browser, sz, touch) {
  const { context, page } = await open(browser, { scheme: 'dark', sz, path: '', mode: 'proof', hooks: true });
  try {
    await page.mouse.move(2, 2);
    /* Set mote 0 down in the roomiest open cloth (visible, clear of text),
       scrolled into view; the flash code that runs is the real one. */
    const spot = await findFireflySpot(page, sz);
    if (!spot) { console.warn(`no clear spot for a firefly at ${sz.id}`); return null; }
    await page.evaluate((y) => window.scrollTo(0, y), spot.scroll);
    await page.waitForTimeout(300);
    await page.evaluate(({ spot }) => {
      const q = window.__ccFloatersProbe.get().fireflies[0];
      q.x = spot.x; q.y = spot.y; q.vx = 0; q.vy = 0; q.cover = 1; q.flashes = []; q.rest = performance.now() + 120000; q.touched = -1e9;
    }, { spot });
    const R = 90;
    const clip = { x: Math.max(0, Math.round(spot.x - R)), y: Math.max(0, Math.round(spot.y - R)), width: 2 * R, height: 2 * R };
    const posNow = () => page.evaluate(() => { const f = window.__ccFloatersProbe.get().fireflies[0]; return { x: f.x, y: f.y }; });
    const off = await pageNowOffset(page);
    const t0 = performance.now();
    const rows = [];
    const grab = async (label) => {
      const file = `pointer-dark-${sz.id}__${rows.length}.png`;
      const a = performance.now();
      await page.screenshot({ path: join(clips, file), clip });
      const b = performance.now();
      rows.push({ file, t: +(((a + b) / 2 - t0) / 1000).toFixed(2), pageT: (a + b) / 2 + off, label });
    };
    await grab('before: no pointer, mote dark');
    await grab('before: no pointer, mote dark');
    let p = await posNow();
    if (touch) await page.touchscreen.tap(p.x, p.y);
    else {
      await page.mouse.move(p.x - 160, p.y, { steps: 4 });
      p = await posNow();
      await page.mouse.move(p.x, p.y, { steps: 8 });
    }
    const hitAt = +((performance.now() - t0) / 1000).toFixed(2);
    await page.waitForTimeout(40);
    const flashes = await page.evaluate(() => window.__ccFloatersProbe.get().fireflies[0].flashes.map((f) => ({ start: f.start, rise: f.rise })));
    for (let i = 0; i < 14; i++) await grab(i === 0 ? (touch ? 'tap lands' : 'cursor on the mote') : '');
    let peakGlow = 0;
    for (const r of rows) {
      r.env = +envAt(flashes, r.pageT).toFixed(2);
      r.glow = await glowAgainst(join(clips, rows[0].file), join(clips, r.file));
      peakGlow = Math.max(peakGlow, r.glow);
      delete r.pageT;
    }
    const res = { how: touch ? 'tap' : 'cursor', spot: { x: spot.x, y: spot.y, scroll: spot.scroll, clearOfTextPx: Math.round(spot.d), visibleBoxHalfPx: spot.half, wantedAirPx: spot.air }, hitAt, peakGlow, clip, rows };
    console.log(`pointer dark ${sz.id}: ${rows.length} clips, peak glow +${peakGlow}`);
    return res;
  } finally {
    await context.close();
  }
}

async function pointerLight(browser, sz, touch) {
  const { context, page } = await open(browser, { scheme: 'light', sz, path: '', mode: 'proof', hooks: true });
  try {
    await page.mouse.move(2, 2);
    /* A seed needs a run of visible cloth to be seen drifting along. On a phone
       the text and sheets leave little, so look through the whole page for the
       longest run, scroll there and set one seed down at its start. */
    const k = touch ? 0.5 : 0.62;
    const cor = await findCorridor(page, sz, k);
    if (!cor) { console.warn(`no corridor of bare cloth at ${sz.id}`); return null; }
    await page.evaluate((y) => window.scrollTo(0, y), cor.scroll);
    await page.waitForTimeout(300);
    const tapOk = await page.evaluate(({ x, y }) => { const e = document.elementFromPoint(x, y); return !e || !e.closest('a,button,input,textarea,select,label,summary'); }, { x: cor.tx, y: cor.ty });
    if (touch && !tapOk) console.warn(`tap point at ${sz.id} is on a link or control`);
    await page.evaluate(({ cor, size }) => {
      const q = window.__ccFloatersProbe.get().seeds[0];
      q.x = cor.x; q.y = cor.y; q.vx = 21; q.vy = -11; q.cover = 1; q.size = size; q.alpha = 0.78; q.sprite = 0;
    }, { cor, size: k / 0.62 });
    const endX = cor.x + cor.cx * Math.min(cor.len + 60, 340), endY = cor.y + cor.cy * Math.min(cor.len + 60, 340);
    const x0 = Math.max(0, Math.round(Math.min(cor.x, endX) - 80)), y0 = Math.max(0, Math.round(Math.min(cor.y, endY) - 90));
    const x1 = Math.min(sz.w, Math.round(Math.max(cor.x, endX) + 80)), y1 = Math.min(sz.h, Math.round(Math.max(cor.y, endY) + 110));
    const clip = { x: x0, y: y0, width: x1 - x0, height: y1 - y0 };
    const seedNow = () => page.evaluate(() => {
      const s = window.__ccFloatersProbe.get().seeds[0];
      const w = window.innerWidth, h = window.innerHeight;
      const edge = Math.min(1, Math.max(0, Math.min(s.x + 30, w + 30 - s.x, s.y + 30, h + 30 - s.y) / 70));
      return { x: s.x, y: s.y, vx: s.vx, vy: s.vy, a: s.alpha * s.cover * edge };
    });
    const rows = [];
    await page.waitForTimeout(120);
    const start = await seedNow();
    const tStart = performance.now();
    const grab = async (label) => {
      const p = await seedNow();
      const a = performance.now();
      const file = `pointer-light-${sz.id}__${rows.length}.png`;
      await page.screenshot({ path: join(clips, file), clip });
      const b = performance.now();
      const tt = ((a + b) / 2 - tStart) / 1000;
      const inClip = p.x > clip.x + 20 && p.x < clip.x + clip.width - 20 && p.y > clip.y + 20 && p.y < clip.y + clip.height - 20;
      rows.push({
        file, t: +(tt).toFixed(2), label, seed: { x: +p.x.toFixed(1), y: +p.y.toFixed(1) }, alpha: +p.a.toFixed(2), shown: p.a > 0.3 && inClip,
        offTrack: +Math.hypot(p.x - (start.x + start.vx * tt), p.y - (start.y + start.vy * tt)).toFixed(1),
      });
    };
    await grab('before: no pointer');
    await grab('before: no pointer');
    if (touch) await page.touchscreen.tap(cor.tx, cor.ty);
    else {
      await page.mouse.move(start.x - cor.cx * 150, start.y - cor.cy * 150, { steps: 3 });
      /* a hand takes about a second to carry the cursor through */
      for (let i = 0; i < 14; i++) {
        const p = await seedNow();
        await page.mouse.move(p.x - cor.cx * (90 - i * 9), p.y - cor.cy * (90 - i * 9), { steps: 2 });
        await grab(i === 0 ? 'cursor sweeping toward the seed' : '');
        await page.waitForTimeout(50);
      }
    }
    for (let i = 0; i < (touch ? 12 : 8); i++) { await grab(i === 0 ? (touch ? 'tap behind the seed' : 'cursor has passed') : ''); await page.waitForTimeout(touch ? 130 : 60); }
    /* 40 px off the breeze track at 1440; a phone's run of cloth is a third of that, so 30 */
    const minPx = touch ? 30 : 40;
    const shownRows = rows.filter((r) => r.shown);
    const res = {
      how: touch ? 'tap' : 'cursor', corridorPx: cor.len, airPx: cor.pad, tapDistancePx: cor.dTap, seedScale: k, scrolledTo: cor.scroll, clip,
      shownClips: shownRows.length, shownClipsOverMinPx: shownRows.filter((r) => r.offTrack >= minPx).length, minPx,
      peakOffTrackWhileShown: Math.max(0, ...shownRows.map((r) => r.offTrack)), peakOffTrackAnywhere: Math.max(...rows.map((r) => r.offTrack)), rows,
    };
    console.log(`pointer light ${sz.id}: corridor ${cor.len}px at scroll ${cor.scroll}; ${shownRows.length}/${rows.length} clips show the seed whole, ${res.shownClipsOverMinPx} of them ${minPx}+ px off track, peak while shown ${res.peakOffTrackWhileShown}px`);
    return res;
  } finally {
    await context.close();
  }
}

async function runPointer(browser) {
  measures.pointer = measures.pointer || {};
  /* clips are 2x at every size so the seed and the flash can be read */
  for (const sz0 of SIZES) {
    const sz = { ...sz0, dpr: 2 };
    const touch = !!sz.mobile;
    for (const scheme of ['dark', 'light']) {
      const key = `${scheme}-${sz.id}`;
      let res = null;
      /* up to three takes: the check is that the clips show it, so a take
         that does not is not kept as evidence */
      for (let attempt = 1; attempt <= 3 && !res; attempt++) {
        const r = scheme === 'dark' ? await pointerDark(browser, sz, touch) : await pointerLight(browser, sz, touch);
        if (!r) break;
        const pass = scheme === 'dark' ? r.peakGlow >= 90 : r.shownClipsOverMinPx >= 3;
        r.attempt = attempt;
        r.pass = pass;
        if (pass || attempt === 3) res = r;
        else console.warn(`pointer ${key}: take ${attempt} did not show it, retrying`);
      }
      if (res) measures.pointer[key] = res; else delete measures.pointer[key];
      if (res && !res.pass) console.warn(`pointer ${key}: FAILED its own check after 3 takes`);
    }
  }
  await saveMeasures();
}

/* ---------- stats: bursts, simultaneity, text overlap ---------- */
const COLLECT_BURSTS = (dur) => new Promise((res) => {
  const seen = [];
  const bursts = [];
  const t0 = performance.now();
  const step = () => {
    const st = window.__ccFloatersProbe.get();
    st.fireflies.forEach((m, i) => {
      if (m.flashes.length && seen[i] !== m.flashes[0]) {
        seen[i] = m.flashes[0];
        bursts.push({ i, starts: m.flashes.map((f) => f.start), rises: m.flashes.map((f) => f.rise), nextRest: m.rest });
      }
    });
    if (performance.now() - t0 < dur) requestAnimationFrame(step); else res({ bursts, motes: st.fireflies.length });
  };
  step();
});

/* Overlap of every visible draw with independent text rects, scrolling as it goes. */
const RUN_OVERLAP = ({ dur, sel, kind }) => new Promise((res) => {
  const P = window.__ccP;
  const rects = [];
  window.scrollTo(0, 0);
  document.querySelectorAll(sel).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.width >= 1 && r.height >= 1) rects.push({ l: r.left, t: r.top + scrollY, r: r.right, b: r.bottom + scrollY });
  });
  P.frames.length = 0;
  const maxY = document.documentElement.scrollHeight - innerHeight;
  /* three slow sweeps down and up the page (a reader's pace), not jumps */
  const stops = [0, 1, 0, 1, 0, 1];
  const t0 = performance.now();
  let si = -1;
  const step = () => {
    const el = performance.now() - t0;
    const seg = el / (dur / (stops.length - 1));
    const k = Math.min(stops.length - 2, Math.floor(seg));
    const f = Math.min(1, seg - k);
    window.scrollTo(0, maxY * (stops[k] + (stops[k + 1] - stops[k]) * f));
    si = k;
    if (el < dur) return requestAnimationFrame(step);
    const sum = { frames: P.frames.length, rects: rects.length, scrollStops: stops.length, draws: 0, visible: 0, centerOnText: 0, extentOnText: 0, centerClear: 0, extentClear: 0, worstExtentAlpha: 0, nearest: 1e9, litPerFrame: [] };
    for (const f of P.frames) {
      let l = 0;
      for (const d of f.d) {
        if (d.args.length !== 4) continue;
        const [dx, dy, dw, dh] = d.args;
        sum.draws++;
        if (kind === 'fire') {
          if (d.a > 0.05 && dw > 20) l++;
          if (d.a < 0.05) continue;
          const [a, b, c, dd, e, ff] = d.m;
          const cx = (a * (dx + dw / 2) + c * (dy + dh / 2) + e) / f.dpr;
          const cy = (b * (dx + dw / 2) + dd * (dy + dh / 2) + ff) / f.dpr + f.sy;
          sum.visible++;
          let near = 1e9;
          for (const r of rects) {
            const ox = Math.max(r.l - cx, 0, cx - r.r), oy = Math.max(r.t - cy, 0, cy - r.b);
            near = Math.min(near, Math.hypot(ox, oy));
          }
          sum.nearest = Math.min(sum.nearest, near);
          if (near === 0) { sum.centerOnText++; sum.extentOnText++; if (d.a >= 0.15) { sum.centerClear++; sum.extentClear++; } sum.worstExtentAlpha = Math.max(sum.worstExtentAlpha, d.a); }
        } else {
          if (d.a < 0.08) continue;
          sum.visible++;
          const [a, b, c, dd, e, ff] = d.m;
          const P2 = (ux, uy) => {
            const lx = dx + (ux / 128) * dw, ly = dy + (uy / 128) * dh;
            return [(a * lx + c * ly + e) / f.dpr, (b * lx + dd * ly + ff) / f.dpr + f.sy];
          };
          const pts = [P2(24, 6), P2(104, 6), P2(24, 118), P2(104, 118)];
          const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
          const bb = { l: Math.min(...xs), r: Math.max(...xs), t: Math.min(...ys), b: Math.max(...ys) };
          const [cx, cy] = P2(64, 48);
          let hitC = false, hitE = false, near = 1e9;
          for (const r of rects) {
            if (cx >= r.l && cx <= r.r && cy >= r.t && cy <= r.b) hitC = true;
            if (bb.l < r.r && bb.r > r.l && bb.t < r.b && bb.b > r.t) hitE = true;
            const ox = Math.max(r.l - cx, 0, cx - r.r), oy = Math.max(r.t - cy, 0, cy - r.b);
            near = Math.min(near, Math.hypot(ox, oy));
          }
          sum.nearest = Math.min(sum.nearest, near);
          if (hitC) { sum.centerOnText++; if (d.a >= 0.15) sum.centerClear++; }
          if (hitE) { sum.extentOnText++; if (d.a >= 0.15) sum.extentClear++; sum.worstExtentAlpha = Math.max(sum.worstExtentAlpha, d.a); }
        }
      }
      sum.litPerFrame.push(l);
    }
    res(sum);
  };
  step();
});

const pct = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : null; };
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null);
const r1 = (v) => (v == null ? null : +v.toFixed(1));

async function runStats(browser) {
  measures.stats = measures.stats || {};
  /* bursts and simultaneity, dark */
  for (const sz of SIZES) {
    const { context, page } = await open(browser, { scheme: 'dark', sz, path: '', mode: 'proof', hooks: true });
    const dur = 70000;
    const col = page.evaluate(COLLECT_BURSTS, dur);
    const ov = await page.evaluate(RUN_OVERLAP, { dur, sel: `header ${TEXT_SEL}, main ${TEXT_SEL}, footer ${TEXT_SEL}`, kind: 'fire' });
    const { bursts, motes } = await col;
    const per = {};
    for (const b of bursts) (per[b.i] = per[b.i] || []).push(b);
    const sizes = bursts.map((b) => b.starts.length);
    const gaps = bursts.flatMap((b) => b.starts.slice(1).map((s, k) => s - b.starts[k]));
    const rises = bursts.flatMap((b) => b.rises);
    const darks = [];
    for (const list of Object.values(per)) {
      for (let k = 1; k < list.length; k++) {
        const prev = list[k - 1];
        const end = prev.starts[prev.starts.length - 1] + prev.rises[prev.rises.length - 1] + 250;
        darks.push(list[k].starts[0] - end);
      }
    }
    const lp = ov.litPerFrame;
    measures.stats[`fireflies-${sz.id}`] = {
      motes, seconds: dur / 1000, bursts: bursts.length,
      flashesPerBurst: { min: Math.min(...sizes), max: Math.max(...sizes), counts: [2, 3, 4].map((n) => sizes.filter((s) => s === n).length) },
      gapMs: { min: Math.round(Math.min(...gaps)), mean: Math.round(mean(gaps)), max: Math.round(Math.max(...gaps)) },
      riseMs: { min: Math.round(Math.min(...rises)), max: Math.round(Math.max(...rises)) },
      darkRestMs: darks.length ? { n: darks.length, min: Math.round(Math.min(...darks)), mean: Math.round(mean(darks)), max: Math.round(Math.max(...darks)) } : null,
      litAtOnce: { max: Math.max(...lp), mean: r1(mean(lp)), framesWithAnyLit: +(lp.filter((v) => v > 0).length / lp.length).toFixed(3), framesWithZeroLit: +(lp.filter((v) => v === 0).length / lp.length).toFixed(3), framesAllLit: lp.filter((v) => v >= motes).length, frames: lp.length },
      text: { rects: ov.rects, visibleDraws: ov.visible, haloCentreOnText: ov.centerOnText, haloCentreOnTextAtOrAbove015: ov.centerClear, nearestToTextPx: r1(ov.nearest), scrollStops: ov.scrollStops },
    };
    console.log(`stats fireflies ${sz.id}:`, JSON.stringify(measures.stats[`fireflies-${sz.id}`]));
    await context.close();
  }
  /* the same scroll and the same rects against today's fireflies */
  for (const sz of SIZES) {
    const { context, page } = await open(browser, { scheme: 'dark', sz, path: '', mode: 'base', hooks: true });
    const ov = await page.evaluate(RUN_OVERLAP, { dur: 70000, sel: `header ${TEXT_SEL}, main ${TEXT_SEL}, footer ${TEXT_SEL}`, kind: 'fire' });
    measures.stats[`fireflies-today-${sz.id}`] = { seconds: 70, visibleDraws: ov.visible, haloCentreOnText: ov.centerOnText, haloCentreOnTextAtOrAbove015: ov.centerClear };
    console.log(`stats fireflies today ${sz.id}:`, JSON.stringify(measures.stats[`fireflies-today-${sz.id}`]));
    await context.close();
  }
  /* seeds vs text, light */
  for (const sz of SIZES) {
    for (const [name, path] of PAGES) {
      const { context, page } = await open(browser, { scheme: 'light', sz, path, mode: 'proof', hooks: true });
      const ov = await page.evaluate(RUN_OVERLAP, { dur: 60000, sel: `header ${TEXT_SEL}, main ${TEXT_SEL}, footer ${TEXT_SEL}`, kind: 'seed' });
      const chrome = await page.evaluate(() => ({ seeds: window.__ccFloatersProbe.get().seeds.length }));
      measures.stats[`seeds-${name}-${sz.id}`] = {
        seeds: chrome.seeds, seconds: 60, rects: ov.rects, scrollStops: ov.scrollStops, frames: ov.frames, visibleDraws: ov.visible,
        centreOnText: ov.centerOnText, centreOnTextAtOrAbove015: ov.centerClear, extentTouchesText: ov.extentOnText, extentTouchesTextAtOrAbove015: ov.extentClear, worstExtentAlpha: +ov.worstExtentAlpha.toFixed(2), nearestCentreToTextPx: r1(ov.nearest),
      };
      console.log(`stats seeds ${name} ${sz.id}:`, JSON.stringify(measures.stats[`seeds-${name}-${sz.id}`]));
      await context.close();
    }
  }
  /* resume: sit in light (or hide the tab), flip to dark, and count how many
     motes are lit at once and how many first flashes share a start time. */
  for (const sz of SIZES) {
    const { context, page } = await open(browser, { scheme: 'light', sz, path: '', mode: 'proof', hooks: true });
    await page.waitForTimeout(10000);
    const res = await page.evaluate(() => new Promise((done) => {
      const t0 = performance.now();
      document.documentElement.dataset.scheme = 'dark';
      const starts = []; let maxLit = 0; const seen = [];
      const step = () => {
        const st = window.__ccFloatersProbe.get();
        let lit = 0;
        st.fireflies.forEach((m, i) => { if (m.flashes.length) { lit++; if (seen[i] !== m.flashes[0]) { seen[i] = m.flashes[0]; starts.push(Math.round(m.flashes[0].start)); } } });
        maxLit = Math.max(maxLit, lit);
        if (performance.now() - t0 < 9000) requestAnimationFrame(step); else {
          const same = {}; for (const v of starts) same[v] = (same[v] || 0) + 1;
          done({ motes: st.fireflies.length, maxLitAtOnce: maxLit, firstBursts: starts.length, biggestSharedStart: Math.max(0, ...Object.values(same)) });
        }
      };
      requestAnimationFrame(step);
    }));
    measures.stats[`resume-light-to-dark-${sz.id}`] = res;
    console.log(`resume ${sz.id}:`, JSON.stringify(res));
    await context.close();
  }
  await saveMeasures();
}

/* ---------- cost ---------- */
async function metrics(cdp) {
  const { metrics: m } = await cdp.send('Performance.getMetrics');
  const o = {};
  for (const x of m) o[x.name] = x.value;
  return o;
}
const delta = (a, b, k) => (b[k] - a[k]) * 1000;

async function runCost(browser) {
  measures.cost = measures.cost || {};
  for (const sz of SIZES) {
    for (const scheme of ['dark', 'light']) {
      for (const mode of ['base', 'proof']) {
        const { context, page, cdp } = await open(browser, { scheme, sz, path: '', mode, hooks: false });
        await cdp.send('Performance.enable');
        await page.waitForTimeout(1500);
        await page.evaluate(() => { window.__ccP.rafDur.length = 0; window.__ccP.rects = 0; });
        const m0 = await metrics(cdp);
        const idle = 12;
        await page.waitForTimeout(idle * 1000);
        const m1 = await metrics(cdp);
        const raf = await page.evaluate(() => window.__ccP.rafDur.slice());
        /* then a scroll: 100 steps over 5 s, counting rect reads */
        await page.evaluate(() => { window.__ccP.rects = 0; window.__ccP.rafDur.length = 0; });
        const s0 = await metrics(cdp);
        await page.evaluate(() => new Promise((res) => {
          const max = document.documentElement.scrollHeight - innerHeight;
          let i = 0;
          const t = setInterval(() => { scrollTo(0, (max * (i % 50)) / 50 * (i < 50 ? 1 : 1)); if (++i >= 100) { clearInterval(t); res(); } }, 50);
        }));
        const s1 = await metrics(cdp);
        const sc = await page.evaluate(() => ({ rects: window.__ccP.rects, raf: window.__ccP.rafDur.slice() }));
        measures.cost[`${scheme}-${sz.id}-${mode}`] = {
          idleSeconds: idle,
          cpuMsPerSec: {
            task: r1(delta(m0, m1, 'TaskDuration') / idle), script: r1(delta(m0, m1, 'ScriptDuration') / idle),
            layout: r1(delta(m0, m1, 'LayoutDuration') / idle), style: r1(delta(m0, m1, 'RecalcStyleDuration') / idle),
          },
          rafCallbacksPerSec: r1(raf.length / idle),
          rafMs: { mean: +(mean(raf) ?? 0).toFixed(3), p95: +(pct(raf, 0.95) ?? 0).toFixed(3), max: +(Math.max(0, ...raf)).toFixed(2), totalPerSec: r1(raf.reduce((a, b) => a + b, 0) / idle) },
          scroll5s: { rectReads: sc.rects, taskMs: r1(delta(s0, s1, 'TaskDuration')), scriptMs: r1(delta(s0, s1, 'ScriptDuration')), layoutMs: r1(delta(s0, s1, 'LayoutDuration')), rafMsTotal: r1(sc.raf.reduce((a, b) => a + b, 0)) },
        };
        console.log(`cost ${scheme} ${sz.id} ${mode}:`, JSON.stringify(measures.cost[`${scheme}-${sz.id}-${mode}`]));
        await context.close();
      }
    }
  }
  await saveMeasures();
}

/* ---------- sheets ---------- */
const BG = '#e9e3d4', INK = '#2a2118', CAP = '#6b5a47';
async function img(p) { return existsSync(p) ? loadImage(p) : null; }

async function strip(path, title, note, items, { cols, cellW }) {
  const loaded = [];
  for (const it of items) loaded.push({ ...it, im: await img(it.file) });
  const rows = Math.ceil(loaded.length / cols);
  const hs = loaded.map((l) => (l.im ? Math.round(l.im.height * (cellW / l.im.width)) : 100));
  const cellH = Math.max(...hs);
  const GAP = 12, LAB = 40, TOP = 64;
  const W = GAP + cols * (cellW + GAP);
  const H = TOP + rows * (cellH + LAB + GAP) + GAP;
  const cv = createCanvas(W, H);
  const g = cv.getContext('2d');
  g.fillStyle = BG; g.fillRect(0, 0, W, H);
  g.fillStyle = INK; g.font = '600 22px sans-serif'; g.fillText(title, GAP, 30);
  g.fillStyle = CAP; g.font = 'italic 14px sans-serif'; g.fillText(note, GAP, 52);
  loaded.forEach((l, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const x = GAP + c * (cellW + GAP), y = TOP + r * (cellH + LAB + GAP);
    if (l.im) g.drawImage(l.im, x, y, cellW, Math.round(l.im.height * (cellW / l.im.width)));
    g.strokeStyle = '#8a7a62'; g.lineWidth = 1; g.strokeRect(x - 0.5, y - 0.5, cellW + 1, cellH + 1);
    g.fillStyle = INK; g.font = '600 15px sans-serif'; g.fillText(l.top, x, y + cellH + 18);
    g.fillStyle = CAP; g.font = '13px sans-serif'; g.fillText(l.bottom || '', x, y + cellH + 35);
  });
  await writeFile(path, cv.toBuffer('image/jpeg', 86));
}

/* six frames: the busiest one, then even steps in time */
function pickFrames(rows, k, byLit) {
  const idx = rows.map((_, i) => i);
  const chosen = new Set();
  if (byLit) {
    const best = [...idx].sort((a, b) => (rows[b].lit ?? 0) - (rows[a].lit ?? 0))[0];
    chosen.add(best);
    const zero = idx.find((i) => rows[i].lit === 0);
    if (zero != null) chosen.add(zero);
  }
  for (let j = 0; chosen.size < k && j < 100; j++) {
    const i = Math.min(rows.length - 1, Math.round((j * (rows.length - 1)) / (k - 1)));
    chosen.add(i);
    if (j > k * 4) break;
  }
  return [...chosen].sort((a, b) => a - b).slice(0, k);
}

/* How much light a firefly flash adds, read off the frames themselves. Flashes
   only add light, so the darkest value each pixel takes across a film is the
   page without any firefly; a frame's flash is its largest rise over that. */
async function flashScores(files, scale) {
  const lum = async (f) => {
    const im = await loadImage(f);
    const cv = createCanvas(im.width, im.height);
    const g = cv.getContext('2d');
    g.drawImage(im, 0, 0);
    const d = g.getImageData(0, 0, im.width, im.height).data;
    const L = new Uint8Array(im.width * im.height);
    for (let i = 0, p = 0; i < d.length; i += 4, p++) L[p] = 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
    return { L, w: im.width, h: im.height };
  };
  let min = null, w = 0, hgt = 0;
  for (const f of files) {
    const { L, w: ww, h: hh } = await lum(f);
    if (!min) { min = Uint8Array.from(L); w = ww; hgt = hh; } else for (let i = 0; i < min.length; i++) if (L[i] < min[i]) min[i] = L[i];
  }
  const out = [];
  for (const f of files) {
    const { L } = await lum(f);
    let peak = 0, at = 0, glow = 0;
    for (let i = 0; i < L.length; i++) {
      const dv = L[i] - min[i];
      if (dv >= 20) glow++;
      if (dv > peak) { peak = dv; at = i; }
    }
    out.push({ peak, glowPx: Math.round(glow / (scale * scale)), x: Math.round((at % w) / scale), y: Math.round(Math.floor(at / w) / scale) });
  }
  return { out, w, h: hgt };
}

async function runSheets() {
  const lines = [];
  for (const sz of SIZES) {
    const dark = measures.films?.[`dark-home-${sz.id}`];
    if (dark) {
      /* frames chosen by the flash measured in the pixels: the five brightest,
         and the quietest, in time order */
      const dpr = sz.dpr;
      const sc = await flashScores(dark.map((r) => join(frames, r.file)), dpr);
      dark.forEach((r, i) => Object.assign(r, { flashPeak: sc.out[i].peak, flashGlowPx: sc.out[i].glowPx, flashAt: { x: sc.out[i].x, y: sc.out[i].y } }));
      const order = dark.map((_, i) => i).sort((p, q) => dark[q].flashPeak - dark[p].flashPeak);
      const chosen = new Set();
      for (const i of order) { if ([...chosen].every((c) => Math.abs(dark[c].t - dark[i].t) >= 1.0)) chosen.add(i); if (chosen.size === 5) break; }
      chosen.add(order[order.length - 1]);
      const pick = [...chosen].sort((p, q) => p - q);
      await strip(join(out, `sheet-fireflies-${sz.id}.jpg`), `Fireflies, dark Home at ${sz.id}: burst flash`,
        'Whole-page frames from the 36-frame film: the five with the brightest flash (measured in the pixels) and the quietest. t is seconds into the film; "peak" is the greatest rise in brightness over the page without fireflies (0-255).',
        pick.map((i) => ({ file: join(frames, dark[i].file), top: `t = ${dark[i].t.toFixed(2)} s`, bottom: `flash peak +${dark[i].flashPeak}, ${dark[i].flashGlowPx} px glowing` })),
        sz.mobile ? { cols: 3, cellW: 560 } : { cols: 2, cellW: 960 });
      lines.push(`- sheet-fireflies-${sz.id}.jpg: dark Home at ${sz.id}, the five brightest flash frames and the quietest`);
      /* and a 2x crop of the brightest spot in each of the chosen frames */
      const items = [];
      let n = 0;
      for (const i of pick) {
        const im = await loadImage(join(frames, dark[i].file));
        const R = 110;
        const cx = Math.min(Math.max(dark[i].flashAt.x, R), sz.w - R), cy = Math.min(Math.max(dark[i].flashAt.y, R), sz.h - R);
        const cv = createCanvas(4 * R, 4 * R);
        const g = cv.getContext('2d');
        g.drawImage(im, (cx - R) * dpr, (cy - R) * dpr, 2 * R * dpr, 2 * R * dpr, 0, 0, 4 * R, 4 * R);
        const file = join(frames, `crop-fireflies-${sz.id}__${n++}.png`);
        await writeFile(file, cv.toBuffer('image/png'));
        items.push({ file, top: `t = ${dark[i].t.toFixed(2)} s`, bottom: `peak +${dark[i].flashPeak}, spot (${dark[i].flashAt.x}, ${dark[i].flashAt.y})` });
      }
      await strip(join(out, `sheet-fireflies-crops-${sz.id}.jpg`), `Fireflies, dark Home at ${sz.id}: the same frames, brightest spot at 2x`,
        'A 220 px square around the brightest spot of each frame on the sheet before, shown at 2x.',
        items, { cols: 3, cellW: 440 });
      lines.push(`- sheet-fireflies-crops-${sz.id}.jpg: the brightest spot of each of those frames, 2x`);
    }
    for (const [name] of PAGES) {
      const light = measures.films?.[`light-${name}-${sz.id}`];
      if (!light) continue;
      const pick = pickFrames(light, 6, false);
      await strip(join(out, `sheet-seeds-${name}-${sz.id}.jpg`), `Dandelion seeds, light ${name} at ${sz.id}`,
        'Six of 36 frames in time order, about 4 s apart; the seeds ride the breeze up and across over the cloth, under the sheets.',
        pick.map((i) => ({ file: join(frames, light[i].file), top: `t = ${light[i].t.toFixed(1)} s`, bottom: `seeds drawn: ${light[i].drawn ?? 'n/a'}` })),
        sz.mobile ? { cols: 3, cellW: 560 } : { cols: 2, cellW: 960 });
      lines.push(`- sheet-seeds-${name}-${sz.id}.jpg: light ${name} at ${sz.id}, six timestamped frames`);
    }
    for (const sc of ['dark', 'light']) {
      const pr = measures.pointer?.[`${sc}-${sz.id}`];
      if (!pr) continue;
      const rows = pr.rows;
      let pick;
      if (sc === 'dark') {
        /* the clip before the pointer, then the clips that glow, up to six, and the last */
        const glowing = rows.map((r, i) => i).filter((i) => rows[i].glow >= 25);
        const step = Math.max(1, Math.ceil(glowing.length / 6));
        pick = [0, ...glowing.filter((_, k) => k % step === 0).slice(0, 6), rows.length - 1].filter((v, k, arr) => arr.indexOf(v) === k);
      } else {
        /* the clip before the pointer, then evenly through the stretch in which the seed is on show, and the first after it leaves */
        const lastShown = rows.map((r) => r.shown).lastIndexOf(true);
        const upto = Math.min(rows.length - 1, lastShown + 1);
        const idx = Array.from({ length: upto }, (_, i) => i + 1);
        const step = Math.max(1, Math.ceil(idx.length / 7));
        pick = [0, ...idx.filter((_, k) => k % step === 0)].slice(0, 8);
      }
      await strip(join(out, `sheet-pointer-${sc}-${sz.id}.jpg`), `Pointer, ${sc} at ${sz.id}: ${pr.how} ${sc === 'dark' ? 'on a firefly' : 'behind a seed'}`,
        sc === 'dark' ? 'Tight clips (2x) taken back to back; the first is before the pointer, then the mote is hovered or tapped. "glow" is the greatest rise in brightness over the first clip, measured in the pixels (0-255).' : 'Clips (2x) taken back to back over the seed run of open cloth; "off track" is how far the seed is from where the breeze alone would have put it.',
        pick.map((i) => ({ file: join(clips, rows[i].file), top: `t = ${rows[i].t.toFixed(2)} s`, bottom: sc === 'dark' ? `${rows[i].label || ''} glow +${rows[i].glow}` : `${rows[i].label || ''} off track ${rows[i].offTrack}px ${rows[i].shown ? '' : '(not on show)'}` })),
        { cols: Math.min(4, pick.length), cellW: sc === 'dark' ? 300 : (sz.mobile ? 300 : 260) });
      lines.push(`- sheet-pointer-${sc}-${sz.id}.jpg: ${sc} ${pr.how} strip at ${sz.id}`);
    }
  }
  await saveMeasures();
  await writeFile(join(out, 'index.md'), ['# cc-floaters proof images', '', `Renderer: ${existsSync(join(out, 'renderer.txt')) ? (await readFile(join(out, 'renderer.txt'), 'utf8')).trim() : 'unknown'}`, '', ...lines, '', '- frames/*.png: every viewport frame of every film (36 per film)', '- clips/*.png: pointer clips', '- shots/*__fullpage.png: whole-page stills taken after each film (the fixed canvas paints in the first viewport)', '- measures.json: all numbers', '- fx.bundle.js: the bundle that was injected', ''].join('\n'));
}

/* ---------- main ---------- */
if (!base) { console.error('no SNAP_BASE; run through snap.mjs'); process.exit(1); }
if (process.env.BDL_GPU !== '1') { console.error('BDL_GPU=1 is required'); process.exit(2); }
const browser = await chromium.launch({ args: BROWSER_ARGS });
{
  const p = await browser.newPage();
  const r = await p.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'no webgl';
  });
  await p.close();
  console.log(`renderer: ${r}`);
  await writeFile(join(out, 'renderer.txt'), r + '\n');
  if (/swiftshader|llvmpipe|software|no webgl/i.test(r)) { console.error('software renderer: aborting'); await browser.close(); process.exit(2); }
}
try {
  if (want('films')) await runFilms(browser);
  if (want('pointer')) await runPointer(browser);
  if (want('stats')) await runStats(browser);
  if (want('cost')) await runCost(browser);
  if (want('sheets')) await runSheets();
} finally {
  await browser.close();
}
