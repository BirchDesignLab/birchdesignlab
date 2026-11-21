/**
 * Stage 6 wave 3, task 19 (cottagecore C2): the desktop firefly scatter, 1440 x 900 dark, a mouse, motion on.
 *
 * w2 task 16 limited its CC1 keep loop to phones in the brief but not in the code: keepFireflies re-seated a
 * hidden mote on desktop too, and each re-seat pulled the mote's rest in to 0.25 to 2 s, so the approved Stage
 * 5 scatter (4 to 8 s rests) ran busier on text-dense pages. This reads the canvas the way
 * w2-t16-fx-probe.mjs does (glow blobs; a blob under a sheet, or under an opaque or painted element, does not
 * "show") on four views for SECS seconds each, and prints per view:
 *   duty        the mean number of lit blobs per frame, anywhere on the canvas (a rest pulled in raises it)
 *   showing     the mean number showing (not under a sheet)
 *   litShare    the share of frames with any blob lit
 *   bursts      lit-blob rising edges (a count going up between frames), per minute: bursts begin on a rest ending
 * Run it before and after the change and compare; the noise between two runs of the same code is real (the
 * motes are random), so it also prints the mean over the views.
 *
 *   BASE=http://127.0.0.1:4470 node scripts/themes/stage6/w3-t19-cc-desktop.mjs [label] [secs=45]
 *
 * Writes scripts/themes/.out/stage6/w3/t19/cc-desktop-<label>.json. GPU Chromium (renderer checked),
 * prefers-reduced-transparency forced to no-preference, the portal prompt suppressed.
 */
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, OUT, BASE, renderer } from './w3-t19-lib.mjs';
import { suppressPrompt } from '../lib/portal-prompt.mjs';

const LABEL = process.argv[2] || 'run';
const SECS = Number(process.argv[3] || 45);
const VIEWS = [['home', '/t/cottagecore/'], ['about', '/t/cottagecore/about/'], ['services', '/t/cottagecore/services/'], ['contact', '/t/cottagecore/contact/']];

const INPAGE = () => {
  window.__blobs = (thr) => {
    const cv = document.querySelector('[data-cc-motes]');
    const g = cv.getContext('2d');
    const W = cv.width, H = cv.height, k = W / innerWidth;
    const d = g.getImageData(0, 0, W, H).data;
    const C = 6, cw = Math.ceil(W / C), ch = Math.ceil(H / C);
    const cell = new Uint16Array(cw * ch);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > thr) cell[((y / C) | 0) * cw + ((x / C) | 0)]++;
    const seen = new Uint8Array(cw * ch), out = [];
    for (let i = 0; i < cell.length; i++) {
      if (!cell[i] || seen[i]) continue;
      const st = [i]; seen[i] = 1; let n = 0, sx = 0, sy = 0, px = 0;
      while (st.length) {
        const j = st.pop(), x = j % cw, y = (j / cw) | 0; n++; sx += x; sy += y; px += cell[j];
        for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
          const xx = x + dx, yy = y + dy; if (xx < 0 || yy < 0 || xx >= cw || yy >= ch) continue;
          const q = yy * cw + xx; if (cell[q] && !seen[q]) { seen[q] = 1; st.push(q); }
        }
      }
      if (px < 3) continue;
      const bx = ((sx / n) * C + C / 2) / k, by = ((sy / n) * C + C / 2) / k;
      out.push({ x: Math.round(bx), y: Math.round(by), px, shows: !covered(bx, by) });
    }
    return out;
  };
  const covered = (x, y) => {
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return true;
    for (const el of document.elementsFromPoint(x, y)) {
      if (el.matches('header, html, body, .cc-header, [data-cc-motes]')) return false;
      if (el.closest('.cc-paper, .cc-torn, .cc-gingham')) return true;
      const cs = getComputedStyle(el);
      const m = cs.backgroundColor.match(/rgba?\(([^)]+)\)/);
      const a = m ? (m[1].split(',')[3] === undefined ? 1 : +m[1].split(',')[3]) : 0;
      if (a > 0.5 || cs.backgroundImage !== 'none') return true;
    }
    return false;
  };
};

const browser = await launch();
const R = { base: BASE, label: LABEL, secs: SECS, views: [] };
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, colorScheme: 'dark', reducedMotion: 'no-preference' });
await ctx.addInitScript(() => { try { localStorage.setItem('scheme', 'dark'); } catch {} });
await suppressPrompt(ctx);
await ctx.addInitScript(INPAGE);
await ctx.route('**/cdn-cgi/zaraz/**', (r) => r.abort());
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-transparency', value: 'no-preference' }] });
R.renderer = await renderer(page);
console.log('renderer:', R.renderer);
if (/swiftshader|llvmpipe/i.test(R.renderer)) throw new Error('software renderer: evidence invalid');

for (const [label, path] of VIEWS) {
  await page.goto(BASE + path, { waitUntil: 'load' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(2500);
  const frames = await page.evaluate(async ([secs]) => {
    const out = [];
    const t0 = performance.now();
    while (performance.now() - t0 < secs * 1000) {
      await new Promise((r) => setTimeout(r, 100));
      const b = window.__blobs(90);
      out.push([b.length, b.filter((x) => x.shows).length]);
    }
    return out;
  }, [SECS]);
  const n = frames.length;
  const mean = (i) => +(frames.reduce((p, f) => p + f[i], 0) / n).toFixed(3);
  let edges = 0;
  for (let i = 1; i < n; i++) if (frames[i][0] > frames[i - 1][0]) edges += frames[i][0] - frames[i - 1][0];
  const v = { view: label, frames: n, duty: mean(0), showing: mean(1), litShare: +(frames.filter((f) => f[0] > 0).length / n).toFixed(3), burstsPerMin: +((edges / (SECS / 60))).toFixed(1) };
  R.views.push(v);
  console.log(JSON.stringify(v));
}
const avg = (k) => +(R.views.reduce((p, v) => p + v[k], 0) / R.views.length).toFixed(3);
R.mean = { duty: avg('duty'), showing: avg('showing'), litShare: avg('litShare'), burstsPerMin: avg('burstsPerMin') };
console.log('MEAN', JSON.stringify(R.mean));
await writeFile(join(OUT, `cc-desktop-${LABEL}.json`), JSON.stringify(R, null, 2));
await browser.close();
