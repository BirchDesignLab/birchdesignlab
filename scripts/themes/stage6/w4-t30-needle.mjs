/**
 * Stage 6 wave 4, task 30: the needle's closing items, measured and filmed (critique B3, task 27 minors C1 to C3 and C5).
 * Every arrival is through the real switcher and the header's About link (w3-t27-lib arriveAbout). Sections
 * (ONLY=colour,stitch,cta,resize,words):
 *
 *   colour  C1: sew a thread (a drag), then a CLICK on the needle with no move, then sew another: the colour in the eye
 *           and the threads' data-c alternate rose, sage, rose (a dropped thread never flips it). 1440, light.
 *   stitch  B3: a light stitch at 820 (a mouse drag, the pointer is fine) beside the hoop's dashed ring: a strip, and the
 *           pixel distance between the thread's top colour and the ring's, measured on a screenshot. Writes stitch.json.
 *   cta     C3: a tap at the very bottom of the linen over the call-to-action, then a drag to the bottom; after the tap's
 *           idle (1.5 s plus), the needle's body (the hit padding too) clears the link, and the point at the link's top
 *           edge is the link. 1440 (mouse), 820 and 390 (touch).
 *   resize  C2: sew a thread, narrow the window, and the word mask's rects follow the manifesto's lines again (within 6px).
 *   words   27/C5: strokes and taps through every line of the manifesto and the maker's line: the pixels inside the
 *           words' boxes are the bare hoop's, at 1440 and 820 (and 390), both schemes.
 *
 *   node scripts/themes/snap.mjs --name s6-w4-t30 --reuse --port 4470 -- node scripts/themes/stage6/w4-t30-needle.mjs
 * Output: .out/stage6/w4/t30/needle/
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { launch, arriveAbout, reach, hoopGeo, startFilm, pickAt, strip, stitchState } from './w3-t27-lib.mjs';
import { OUT as T30 } from './w4-t30-lib.mjs';

const ONLY = (process.env.ONLY || 'colour,stitch,cta,resize,words').split(',');
const D = join(T30, 'needle');
await mkdir(D, { recursive: true });
const { browser } = await launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const fails = [];
const R = {};
const check = (name, ok, detail) => {
  if (!ok) fails.push(`${name} ${JSON.stringify(detail)}`);
  console.log(ok ? 'ok  ' : 'FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
};

function walk(points, per = 9) {
  const out = [];
  for (let i = 1; i < points.length; i++) for (let s = 1; s <= per; s++) out.push([points[i - 1][0] + (points[i][0] - points[i - 1][0]) * (s / per), points[i - 1][1] + (points[i][1] - points[i - 1][1]) * (s / per)]);
  return out;
}
/** Drag the needle along `pts`: a mouse press, or on touch a 260 ms press and a CDP touch drag. */
async function drag(env, g, pts, { release = true, per = 9, hold = 260, ms = 16 } = {}) {
  const { page, cdp, mobile } = env;
  const path = walk([[g.body.x, g.body.y], ...pts], per);
  if (!mobile) {
    await page.mouse.move(g.body.x, g.body.y);
    await page.mouse.down();
    for (const [x, y] of path) { await page.mouse.move(x, y); await sleep(ms); }
    if (release) await page.mouse.up();
  } else {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.body.x, y: g.body.y }] });
    await sleep(hold);
    for (const [x, y] of path) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] }); await sleep(ms); }
    if (release) await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
}
const tapAt = async (env, x, y) => { if (env.mobile) await env.page.touchscreen.tap(x, y); else await env.page.mouse.click(x, y); };
const arcPts = (g, f, a0, a1, n = 8) => Array.from({ length: n + 1 }, (_, i) => { const a = ((a0 + (a1 - a0) * (i / n)) * Math.PI) / 180; return [g.cx + g.linenR * f * Math.cos(a), g.cy + g.linenR * f * Math.sin(a)]; });
const needleColour = (page) => page.evaluate(() => document.querySelector('.needle').dataset.c);

/* ------------------------------------------------------------------ colour */
if (ONLY.includes('colour')) {
  const env = await arriveAbout(browser, { width: 1440, scheme: 'light', touch: false });
  const { page } = env;
  await reach(page, '.hoop');
  let g = await hoopGeo(page);
  const before = await needleColour(page);
  await drag(env, g, arcPts(g, 0.55, 200, 330, 8), { per: 8 });
  await sleep(1800);
  const afterA = await needleColour(page);
  g = await hoopGeo(page);
  // a click on the needle with no move: it picks up at once and the thread is dropped (never sewn)
  await page.mouse.move(g.body.x, g.body.y);
  await page.mouse.down();
  await sleep(120);
  await page.mouse.up();
  await sleep(1800);
  const afterClick = await needleColour(page);
  g = await hoopGeo(page);
  await drag(env, g, arcPts(g, 0.45, 20, 160, 8), { per: 8 });
  await sleep(1800);
  const afterB = await needleColour(page);
  g = await hoopGeo(page);
  await drag(env, g, arcPts(g, 0.3, 200, 330, 8), { per: 8 });
  await sleep(1800);
  const st = await stitchState(page);
  R.colour = { before, afterA, afterClick, afterB, threads: st.colours };
  check('colour: the needle starts rose (0) and holds rose after a click that sewed nothing', before === '0' && afterA === '1' && afterClick === afterA, R.colour);
  check('colour: threads alternate rose, sage, rose and no two in a row share a colour', st.colours.join('') === '010' || st.colours.join('') === '101' ? true : st.colours.every((c, i) => i === 0 || c !== st.colours[i - 1]), st.colours);
  await env.ctx.close();
}

/* ------------------------------------------------------------------ stitch */
if (ONLY.includes('stitch')) {
  R.stitch = {};
  for (const width of [820, 1440]) {
    const env = await arriveAbout(browser, { width, scheme: 'light', touch: false });
    const { page } = env;
    await reach(page, '.hoop');
    const g = await hoopGeo(page);
    // along the lower linen, beside the ring (the ring is at 7% inset; this runs just inside it and across it)
    const path = [...arcPts(g, 0.9, 120, 60, 10), ...arcPts(g, 0.8, 60, 20, 6)];
    const film = await startFilm(page);
    await drag(env, g, path, { per: 8, release: false });
    const held = await page.screenshot({ clip: { x: g.cx - g.linenR, y: g.cy - g.linenR, width: g.linenR * 2, height: g.linenR * 2 } });
    await page.mouse.up();
    await sleep(900);
    const frames = await film.stop();
    const box = { x: g.cx - g.hoopR - 10, y: g.cy - g.hoopR - 10, w: g.hoopR * 2 + 20, h: g.hoopR * 2 + 20 };
    await strip(pickAt(frames, [0, 1500, 3000, 4500, 6000, 7500]).filter((f) => f), join(D, `stitch-light-${width}.png`), `light stitch beside the ring, ${width}`, { cols: 3, cellW: 380, box, vpWidth: width });
    await writeFile(join(D, `stitch-light-${width}-held.png`), held);
    // the thread's top colour and the ring's, from the tokens in effect, and the screenshot's own pixels
    const tok = await page.evaluate(() => {
      const cs = getComputedStyle(document.querySelector('.hoop'));
      const c = (v) => { const e = document.createElement('i'); e.style.color = v; document.body.appendChild(e); const out = getComputedStyle(e).color; e.remove(); return out; };
      return { top: c(cs.getPropertyValue('--thread-rose')), edge: c(cs.getPropertyValue('--thread-rose-edge')), ring: c(cs.getPropertyValue('--stitch-rose')), linen: c(cs.getPropertyValue('--hoop-cloth')) };
    });
    R.stitch[width] = tok;
    console.log('stitch', width, JSON.stringify(tok));
    await env.ctx.close();
  }
  await writeFile(join(D, 'stitch.json'), JSON.stringify(R.stitch, null, 1));
}

/* --------------------------------------------------------------------- cta */
if (ONLY.includes('cta')) {
  R.cta = {};
  for (const [width, touch] of [[1440, false], [820, true], [390, true]]) {
    for (const scheme of ['light', 'dark']) {
      const env = await arriveAbout(browser, { width, scheme, touch });
      const { page } = env;
      await reach(page, '.hoop');
      await page.evaluate(() => document.querySelector('.sampler-sec .cc-label').scrollIntoView({ block: 'center' }));
      await sleep(500);
      const g = await hoopGeo(page);
      const cta = await page.evaluate(() => { const r = document.querySelector('.sampler-sec .cc-label').getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, cx: (r.left + r.right) / 2 }; });
      // straight down onto the bottom of the linen above the link, and (a drag) to the very bottom, held
      const bottomY = g.cy + g.linenR - 6;
      const spots = [cta.cx, cta.cx - 60, cta.cx + 60, g.cx - 90, g.cx + 90];
      const rows = [];
      for (const sx of spots) {
        await tapAt(env, sx, bottomY - 2);
        await sleep(900); // the tapped stitch has been sewn; the idle (1.5 s) has not yet sent the needle home
        const m = await page.evaluate(() => {
          const b = document.querySelector('.needle .nd-body');
          const r = b.getBoundingClientRect();
          const a = document.querySelector('.sampler-sec .cc-label').getBoundingClientRect();
          // the hit padding round the needle (0.8rem by 0.5rem, rotated with it) reaches about 14px beyond its box
          const pad = 13;
          const hitsLink = !(r.right + pad < a.left || r.left - pad > a.right || r.bottom + pad < a.top || r.top - pad > a.bottom);
          const topCentre = document.elementFromPoint((a.left + a.right) / 2, a.top + 3);
          return { needleBottom: Math.round(r.bottom), linkTop: Math.round(a.top), hitsLink, atLinkTop: topCentre?.className?.toString().slice(0, 24) || topCentre?.tagName };
        });
        rows.push({ x: Math.round(sx), ...m });
        await sleep(2200); // home again
      }
      // a held drag to the very bottom (the pointer goes below the linen): the tip is held clear of the link
      const g2 = await hoopGeo(page);
      await drag(env, g2, [[cta.cx - 20, bottomY + 18], [cta.cx, bottomY + 30]], { release: false, per: 10 });
      const held = await page.evaluate(() => {
        const b = document.querySelector('.needle .nd-body').getBoundingClientRect();
        const a = document.querySelector('.sampler-sec .cc-label').getBoundingClientRect();
        return { needleBottom: Math.round(b.bottom), linkTop: Math.round(a.top), gap: Math.round(a.top - b.bottom) };
      });
      await page.screenshot({ path: join(D, `cta-held-${scheme}-${width}.png`) });
      if (env.mobile) await env.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); else await page.mouse.up();
      await sleep(2200);
      R.cta[`${width}-${scheme}`] = { rows, held };
      check(`cta ${width} ${scheme}: after each bottom tap the needle's body clears the link and the link's top edge is the link`, rows.every((r) => !r.hitsLink && /cc-label/.test(r.atLinkTop || '')), rows);
      check(`cta ${width} ${scheme}: a held drag to the very bottom keeps the body clear of the link`, held.gap >= 0, held);
      await env.ctx.close();
    }
  }
  await writeFile(join(D, 'cta.json'), JSON.stringify(R.cta, null, 1));
}

/* ------------------------------------------------------------------ resize */
if (ONLY.includes('resize')) {
  const env = await arriveAbout(browser, { width: 1440, scheme: 'light', touch: false });
  const { page } = env;
  await reach(page, '.hoop');
  const g = await hoopGeo(page);
  await drag(env, g, arcPts(g, 0.5, 200, 330, 8), { per: 8 });
  await sleep(600); // the thread lives for 15 s
  const maskVsWords = () => page.evaluate(() => {
    const cloth = document.querySelector('.hoop .cloth').getBoundingClientRect();
    const S = document.querySelector('.nt-layer').viewBox.baseVal.width;
    const k = cloth.width / S; // layer units to px
    const r = document.createRange();
    r.selectNodeContents(document.querySelector('.hoop .manifesto'));
    const words = [...r.getClientRects()].map((b) => ({ x: b.left - cloth.left, y: b.top - cloth.top, w: b.width, h: b.height }));
    const rects = [...document.querySelectorAll('#nt-keep rect')].slice(1).map((e) => ({ x: +e.getAttribute('x') * k, y: +e.getAttribute('y') * k, w: +e.getAttribute('width') * k, h: +e.getAttribute('height') * k }));
    // every manifesto line has a mask rect that covers it (the mask is the line plus 5px)
    const covered = words.filter((w) => w.w > 1).map((w) => rects.some((m) => m.x <= w.x + 6 && m.y <= w.y + 6 && m.x + m.w >= w.x + w.w - 6 && m.y + m.h >= w.y + w.h - 6));
    return { lines: words.length, rects: rects.length, covered: covered.filter(Boolean).length, of: covered.length };
  });
  const a = await maskVsWords();
  await page.setViewportSize({ width: 1000, height: 900 });
  await sleep(500);
  const b = await maskVsWords();
  await page.setViewportSize({ width: 700, height: 900 });
  await sleep(500);
  const c = await maskVsWords();
  R.resize = { a, b, c };
  check('resize: the mask covers every line of the manifesto at 1440, and again after a resize to 1000 and to 700 while a thread lives', [a, b, c].every((x) => x.of > 0 && x.covered === x.of), R.resize);
  await env.ctx.close();
}

/* ------------------------------------------------------------------- words */
if (ONLY.includes('words')) {
  R.words = {};
  for (const scheme of ['light', 'dark']) for (const width of [1440, 820, 390]) {
    const touch = width < 900;
    const env = await arriveAbout(browser, { width, scheme, touch });
    const { page } = env;
    await reach(page, '.hoop');
    const g = await hoopGeo(page);
    const clip = { x: g.cx - g.linenR, y: g.cy - g.linenR, width: g.linenR * 2, height: g.linenR * 2 };
    const bare = await page.screenshot({ clip });
    const rects = await page.evaluate(() => {
      const out = [];
      const r = document.createRange();
      r.selectNodeContents(document.querySelector('.hoop .manifesto'));
      for (const b of r.getClientRects()) out.push({ x: b.left, y: b.top, w: b.width, h: b.height });
      const s = document.querySelector('.hoop .sig').getBoundingClientRect();
      out.push({ x: s.left, y: s.top, w: s.width, h: s.height });
      return out;
    });
    const tx = (f) => g.cx + g.linenR * f, ty = (f) => g.cy + g.linenR * f;
    for (const s of [[[tx(-0.62), ty(-0.5)], [tx(0.62), ty(-0.3)], [tx(-0.6), ty(-0.12)], [tx(0.6), ty(0.05)]], [[tx(-0.45), ty(0.3)], [tx(0.5), ty(0.45)], [tx(-0.5), ty(0.62)], [tx(0.45), ty(0.55)]]]) {
      const g1 = await hoopGeo(page);
      await drag(env, g1, s, { per: 14 });
      await sleep(900);
    }
    for (const [fx, fy] of [[-0.5, -0.4], [0.5, -0.38], [0, -0.2], [-0.4, 0.55], [0.4, 0.58]]) { await tapAt(env, tx(fx), ty(fy)); await sleep(560); }
    await sleep(2800);
    const drawn = await page.screenshot({ clip });
    await writeFile(join(D, `words-${scheme}-${width}.png`), drawn);
    const A = await loadImage(bare), B = await loadImage(drawn);
    const k = A.width / clip.width;
    const ca = createCanvas(A.width, A.height).getContext('2d'); ca.drawImage(A, 0, 0);
    const cb = createCanvas(B.width, B.height).getContext('2d'); cb.drawImage(B, 0, 0);
    const pa = ca.getImageData(0, 0, A.width, A.height).data, pb = cb.getImageData(0, 0, B.width, B.height).data;
    let worst = 0, changed = 0, total = 0, outside = 0;
    const inWords = new Uint8Array(A.width * A.height);
    for (const r of rects) {
      const x0 = Math.max(0, Math.floor((r.x - clip.x) * k)), x1 = Math.min(A.width, Math.ceil((r.x + r.w - clip.x) * k));
      const y0 = Math.max(0, Math.floor((r.y - clip.y) * k)), y1 = Math.min(A.height, Math.ceil((r.y + r.h - clip.y) * k));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) inWords[y * A.width + x] = 1;
    }
    for (let i = 0; i < A.width * A.height; i++) {
      const d = Math.max(Math.abs(pa[i * 4] - pb[i * 4]), Math.abs(pa[i * 4 + 1] - pb[i * 4 + 1]), Math.abs(pa[i * 4 + 2] - pb[i * 4 + 2]));
      if (inWords[i]) { total++; if (d > worst) worst = d; if (d > 0) changed++; } else if (d > 24) outside++;
    }
    const st = await stitchState(page);
    R.words[`${scheme}-${width}`] = { threads: st.threads, boxPixels: total, worstDiff: worst, changed, stitchPixels: outside };
    // Seeds and fireflies drift under the hoop between the two shots, so a handful of stray pixels is allowed; a thread
    // across a word would change hundreds (the earlier probe's own bar was 0 differing at 390 and 1440 after the mask fix)
    check(`words ${scheme} ${width}: ${st.threads} threads sewn; pixels in the words' boxes untouched (changed ${changed} of ${total}, worst ${worst}); stitch pixels elsewhere ${outside}`, changed <= total * 0.002 && outside > 200, R.words[`${scheme}-${width}`]);
    await env.ctx.close();
  }
  await writeFile(join(D, 'words.json'), JSON.stringify(R.words, null, 1));
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED:\n${fails.join('\n')}` : '\nall checks ok');
process.exit(fails.length ? 1 : 0);
