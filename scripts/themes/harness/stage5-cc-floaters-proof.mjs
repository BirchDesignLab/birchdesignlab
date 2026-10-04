/**
 * Stage 5 Tier A proof a6: cottagecore dandelion floaters (light) and the
 * firefly burst flash (dark), both answering the pointer.
 *
 * Bundles scripts/themes/proofs/stage5-cc-floaters/fx.ts with esbuild (the real
 * src/lib/lifecycle.ts resolves through the relative import), injects it into
 * the frozen build (nothing under src/ changes), and:
 *   - films timestamped strips: dark Home, light Home and About, at 1440 and 390;
 *   - films pointer strips: a cursor (1440) or a tap (390) on a firefly and on a
 *     seed, as tight clips taken back to back;
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
async function film(page, { n, every, prefix }) {
  const off = await pageNowOffset(page);
  const t0 = performance.now();
  const rows = [];
  for (let i = 0; i < n; i++) {
    const want = t0 + i * every;
    const wait = want - performance.now();
    if (wait > 0) await page.waitForTimeout(wait);
    const a = performance.now();
    const file = `${prefix}__${i}.png`;
    await page.screenshot({ path: join(frames, file) });
    const b = performance.now();
    const mid = (a + b) / 2;
    rows.push({ file, t: +((mid - t0) / 1000).toFixed(2), pageT: mid + off });
  }
  const fr = await page.evaluate(() => window.__ccP.frames.map((f) => ({ t: f.t, d: f.d.map((x) => ({ a: x.a, args: x.args })) })));
  for (const r of rows) {
    let best = null;
    for (const f of fr) if (!best || Math.abs(f.t - r.pageT) < Math.abs(best.t - r.pageT)) best = f;
    r.lit = best && Math.abs(best.t - r.pageT) < 150 ? lit(best) : null;
    r.drawn = best ? best.d.filter((x) => x.a > 0.03).length : null;
    delete r.pageT;
  }
  return rows;
}

async function runFilms(browser) {
  measures.films = measures.films || {};
  const plan = [];
  for (const sz of SIZES) {
    plan.push({ id: `dark-home-${sz.id}`, scheme: 'dark', page: 'home', path: '', sz, n: 36, every: 330 });
    for (const [name, path] of PAGES) plan.push({ id: `light-${name}-${sz.id}`, scheme: 'light', page: name, path, sz, n: 36, every: 700 });
  }
  for (const p of plan) {
    const { context, page } = await open(browser, { scheme: p.scheme, sz: p.sz, path: p.path, mode: 'proof', hooks: true });
    await page.waitForTimeout(p.scheme === 'light' ? 2500 : 4000);
    await page.evaluate(() => { window.__ccP.frames.length = 0; });
    const rows = await film(page, { n: p.n, every: p.every, prefix: p.id });
    measures.films[p.id] = rows;
    /* a whole-page still for the sheet (the fixed canvas paints in the first viewport) */
    await page.screenshot({ path: join(shots, `${p.id}__fullpage.png`), fullPage: true });
    await context.close();
    console.log(`film ${p.id}: ${rows.length} frames`);
  }
  await saveMeasures();
}

/* ---------- pointer strips ---------- */
async function runPointer(browser) {
  measures.pointer = measures.pointer || {};
  /* clips are 2x at every size so the seed and the flash can be read */
  for (const sz0 of SIZES) {
    const sz = { ...sz0, dpr: 2 };
    const touch = !!sz.mobile;
    /* --- dark: a cursor on a firefly, or a tap --- */
    dark: {
      const { context, page } = await open(browser, { scheme: 'dark', sz, path: '', mode: 'proof', hooks: true });
      await page.mouse.move(2, 2);
      const pick = async () => {
        for (let i = 0; i < 400; i++) {
          const s = await page.evaluate(({ w, h, bare: bs }) => {
            const bare = (0, eval)('(' + bs + ')');
            const st = window.__ccFloatersProbe.get();
            const c = st.fireflies.map((m, i) => ({ i, x: m.x, y: m.y, cover: m.cover, n: m.flashes.length })).filter((m) => m.cover > 0.97 && m.n === 0 && m.x > 80 && m.x < w - 80 && m.y > 80 && m.y < h - 80 && bare(m.x, m.y));
            return c[0] || null;
          }, { w: sz.w, h: sz.h, bare: BARE.toString() });
          if (s) return s;
          await page.waitForTimeout(250);
        }
        return null;
      };
      const m = await pick();
      if (!m) { console.warn(`no clear firefly at ${sz.id}`); delete measures.pointer[`dark-${sz.id}`]; await context.close(); break dark; }
      const R = 90;
      const posNow = () => page.evaluate((i) => { const f = window.__ccFloatersProbe.get().fireflies[i]; return { x: f.x, y: f.y, n: f.flashes.length }; }, m.i);
      const off = await pageNowOffset(page);
      const t0 = performance.now();
      const rows = [];
      const grab = async (label) => {
        const p = await posNow();
        const a = performance.now();
        const x = Math.max(0, Math.round(p.x - R)), y = Math.max(0, Math.round(p.y - R));
        const file = `pointer-dark-${sz.id}__${rows.length}.png`;
        await page.screenshot({ path: join(clips, file), clip: { x, y, width: 2 * R, height: 2 * R } });
        const b = performance.now();
        rows.push({ file, t: +(((a + b) / 2 - t0) / 1000).toFixed(2), label, flashes: p.n });
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
      const hitAt = ((performance.now() - t0) / 1000).toFixed(2);
      for (let i = 0; i < 12; i++) await grab(i === 0 ? (touch ? 'tap lands' : 'cursor on the mote') : '');
      measures.pointer[`dark-${sz.id}`] = { how: touch ? 'tap' : 'cursor', hitAt: +hitAt, rows };
      await context.close();
      console.log(`pointer dark ${sz.id}: ${rows.length} clips`);
      void off;
    }
    /* --- light: a cursor sweeps through a seed, or a tap beside it --- */
    light: {
      const { context, page } = await open(browser, { scheme: 'light', sz, path: '', mode: 'proof', hooks: true });
      await page.mouse.move(2, 2);
      let m = null;
      /* On a phone the text columns leave little open cloth in the first
         screen, so scroll to the viewport position with the most clear cloth
         (bare, and 40 px from any text) before looking for a seed. */
      if (touch) {
        const best = await page.evaluate(async ({ w, h, bare: bs }) => {
          const bare = (0, eval)('(' + bs + ')');
          const st = window.__ccFloatersProbe.get();
          const docH = document.documentElement.scrollHeight;
          let top = { y: 0, n: -1 };
          for (let y = 0; y <= docH - h; y += 80) {
            window.scrollTo(0, y);
            let n = 0;
            for (let gx = 20; gx < w; gx += 30) for (let gy = 40; gy < h - 40; gy += 30) {
              if (!bare(gx, gy)) continue;
              if (st.textRects.every((r) => gx + 40 < r.l || gx - 40 > r.r || gy + y + 40 < r.t || gy + y - 40 > r.b)) n++;
            }
            if (n > top.n) top = { y, n };
          }
          window.scrollTo(0, top.y);
          return top;
        }, { w: sz.w, h: sz.h, bare: BARE.toString() });
        console.log(`light ${sz.id}: scrolled to ${best.y}, ${best.n} clear grid points`);
        await page.waitForTimeout(400);
      }
      /* A seed whose whole sprite box (nine samples across +/-60 px) is bare
         cloth, with no text rect within `air` px of it. `side` is the way a tap
         should land to push it toward the roomier side (-1 left, +1 right).
         The air shrinks if nothing qualifies after a while (phone widths). */
      for (let i = 0; i < 960 && !m; i++) {
        const air = i < 240 ? 130 : i < 360 ? 90 : i < 480 ? 60 : i < 720 ? 30 : 15;
        const half = i < 480 ? 60 : i < 720 ? 36 : 24;
        m = await page.evaluate(({ w, h, bare: bs, air, half }) => {
          const bare = (0, eval)('(' + bs + ')');
          const st = window.__ccFloatersProbe.get();
          const sy = window.scrollY;
          const boxBare = (x, y) => { for (const dx of [-half, 0, half]) for (const dy of [-half, 0, half]) if (!bare(x + dx, y + dy)) return false; return true; };
          const room = (x, y, dir) => {
            let best = 1e4;
            for (const r of st.textRects) {
              if (y + 60 < r.t - sy || y - 60 > r.b - sy) continue;
              const d = dir > 0 ? r.l - x : x - r.r;
              if (d > -60 && d < best) best = d;
            }
            return best;
          };
          const clear = (x, y) => st.textRects.every((r) => x + air < r.l || x - air > r.r || y + sy + air < r.t || y + sy - air > r.b);
          const mx = air >= 60 ? Math.min(200, w / 5) : 50;
          const my = air >= 60 ? 130 : 70;
          const c = st.seeds.map((s, i) => ({ i, x: s.x, y: s.y, cover: s.cover })).filter((s) => s.cover > 0.9 && s.x > mx && s.x < w - mx && s.y > my && s.y < h - my && clear(s.x, s.y) && boxBare(s.x, s.y));
          if (!c.length && air <= 30) {
            /* Nothing drifted into open cloth: set the seed with the most
               cover down on the clearest grid point and let the breeze have it. */
            let top = null;
            for (let gx = 110; gx < w - 110; gx += 10) for (let gy = 120; gy < h - 120; gy += 10) {
              if (!boxBare(gx, gy)) continue;
              let dmin = 1e4;
              for (const r of st.textRects) {
                const dx = Math.max(r.l - gx, 0, gx - r.r), dy = Math.max(r.t - (gy + sy), 0, gy + sy - r.b);
                dmin = Math.min(dmin, Math.hypot(dx, dy));
              }
              if (!top || dmin > top.d) top = { x: gx, y: gy, d: dmin };
            }
            if (top) { const q = st.seeds[0]; q.x = top.x; q.y = top.y; q.vx = 21; q.vy = -11; q.cover = 1; const l = Math.min(room(q.x, q.y, -1), q.x), rr = Math.min(room(q.x, q.y, 1), w - q.x); return { i: 0, x: q.x, y: q.y, cover: 1, side: l >= rr ? -1 : 1, staged: true, air, roomL: Math.round(l), roomR: Math.round(rr) }; }
          }
          if (!c.length) return null;
          const k = c[0];
          const left = Math.min(room(k.x, k.y, -1), k.x), right = Math.min(room(k.x, k.y, 1), w - k.x);
          return { ...k, side: left >= right ? -1 : 1, air, roomL: Math.round(left), roomR: Math.round(right) };
        }, { w: sz.w, h: sz.h, bare: BARE.toString(), air, half });
        if (!m) await page.waitForTimeout(250);
      }
      if (!m) { console.warn(`no clear seed at ${sz.id}`, JSON.stringify(await page.evaluate(() => { const st = window.__ccFloatersProbe.get(); return { rects: st.textRects.length, seeds: st.seeds.map((q) => [Math.round(q.x), Math.round(q.y), +q.cover.toFixed(2)]) }; }))); delete measures.pointer[`light-${sz.id}`]; await context.close(); break light; }
      const R = 130;
      const t0 = performance.now();
      const rows = [];
      const seedNow = () => page.evaluate((i) => { const s = window.__ccFloatersProbe.get().seeds[i]; return { x: s.x, y: s.y, vx: s.vx, vy: s.vy }; }, m.i);
      const start = await seedNow();
      const tStart = performance.now();
      const grab = async (label) => {
        const p = await seedNow();
        const a = performance.now();
        const x = Math.max(0, Math.round(start.x - R - 70)), y = Math.max(0, Math.round(start.y - R * 1.3));
        const file = `pointer-light-${sz.id}__${rows.length}.png`;
        await page.screenshot({ path: join(clips, file), clip: { x, y, width: 2 * R + 160, height: Math.round(2.6 * R) } });
        const b = performance.now();
        const tt = ((a + b) / 2 - tStart) / 1000;
        rows.push({ file, t: +(((a + b) / 2 - t0) / 1000).toFixed(2), label, seed: { x: +p.x.toFixed(1), y: +p.y.toFixed(1) }, offTrack: +Math.hypot(p.x - (start.x + start.vx * tt), p.y - (start.y + start.vy * tt)).toFixed(1) });
        return p;
      };
      await grab('before: no pointer');
      let p = await seedNow();
      if (touch) await page.touchscreen.tap(p.x + m.side * -36, p.y + 8);
      else {
        await page.mouse.move(p.x - m.side * 150 + 0, p.y + 10, { steps: 3 });
        for (let k = 0; k < 14; k++) {
          p = await seedNow();
          await page.mouse.move(p.x - m.side * (90 - k * 9), p.y + 6, { steps: 2 });
          if (k % 3 === 0) await grab(k === 0 ? 'cursor sweeping toward the seed' : '');
        }
      }
      for (let i = 0; i < 6; i++) { await grab(i === 0 ? (touch ? 'tap beside the seed' : 'cursor has passed') : ''); await page.waitForTimeout(160); }
      measures.pointer[`light-${sz.id}`] = { how: touch ? 'tap' : 'cursor', pick: { staged: !!m.staged, air: m.air, roomL: m.roomL, roomR: m.roomR, side: m.side }, rows, peakOffTrack: Math.max(...rows.map((r) => r.offTrack)) };
      await context.close();
      console.log(`pointer light ${sz.id}: ${rows.length} clips, peak off-track ${measures.pointer[`light-${sz.id}`].peakOffTrack}px`);
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

async function runSheets() {
  const lines = [];
  for (const sz of SIZES) {
    const dark = measures.films?.[`dark-home-${sz.id}`];
    if (dark) {
      const pick = pickFrames(dark, 6, true);
      await strip(join(out, `sheet-fireflies-${sz.id}.jpg`), `Fireflies, dark Home at ${sz.id}: burst flash`,
        'Six of 36 frames, in time order, the busiest and a fully dark one among them; t is seconds into the film, "lit" the motes drawn at that instant (of the whole page count).',
        pick.map((i) => ({ file: join(frames, dark[i].file), top: `t = ${dark[i].t.toFixed(2)} s`, bottom: `lit motes: ${dark[i].lit ?? 'n/a'}` })),
        sz.mobile ? { cols: 3, cellW: 560 } : { cols: 2, cellW: 960 });
      lines.push(`- sheet-fireflies-${sz.id}.jpg: dark Home at ${sz.id}, six timestamped frames (burst flashes; most motes dark)`);
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
      const pick = rows.length <= 8 ? rows.map((_, i) => i) : [0, 2, 3, 4, 5, 6, 8, 10, 12].filter((i) => i < rows.length).slice(0, 8);
      await strip(join(out, `sheet-pointer-${sc}-${sz.id}.jpg`), `Pointer, ${sc} at ${sz.id}: ${pr.how} ${sc === 'dark' ? 'on a firefly' : 'beside a seed'}`,
        sc === 'dark' ? 'Tight clips taken back to back; the first two are before the pointer, then the mote is hovered or tapped.' : 'Tight clips taken back to back around the seed; the off-track figure is how far it is from where the breeze alone would have put it.',
        pick.map((i) => ({ file: join(clips, rows[i].file), top: `t = ${rows[i].t.toFixed(2)} s`, bottom: sc === 'dark' ? `${rows[i].label || ''} flashes queued: ${rows[i].flashes}` : `${rows[i].label || ''} off track ${rows[i].offTrack}px` })),
        { cols: Math.min(4, pick.length), cellW: sc === 'dark' ? 300 : 340 });
      lines.push(`- sheet-pointer-${sc}-${sz.id}.jpg: ${sc} ${pr.how} strip at ${sz.id}`);
    }
  }
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
