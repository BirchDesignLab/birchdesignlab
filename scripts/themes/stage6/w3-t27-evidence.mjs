/**
 * Stage 6 wave 3, task 27: evidence (sheets, timestamped film strips and numbers) for cottagecore's needle and
 * thread on About's hoop. Output: scripts/themes/.out/stage6/w3/t27/. Every arrival on About goes through the
 * real switcher (w3-t27-lib.mjs arriveAbout). GPU Chromium, reduced transparency forced to no-preference.
 *
 *   node scripts/themes/snap.mjs --name s6-w3-t27 --reuse --port 4470 -- node scripts/themes/stage6/w3-t27-evidence.mjs
 *   ONLY=sheets,films,clip,words,swipe,idle,swap SIZES=1440,820,390 SCHEMES=light node ...
 *
 * sheets  About whole-page at 1440, 1280, 1024, 820, 390 in both schemes, at rest, and with stitches laid at 1440, 820, 390.
 * films   a drag stitch then a tapped stitch at 1440, 820 and 390, both schemes: a timestamped strip of the hoop through
 *         the drag, its knot, the taps, their knot and each thread's unpicking (the unpick times are logged).
 * clip    a drag round and over the rim: stitches stop at the linen's edge (2x stills and a numbers check).
 * words   strokes laid through the manifesto and the maker's line: a pixel diff inside the words' boxes against the
 *         bare hoop, light and dark, 1440 and 390.
 * swipe   on touch (390 and 820): a vertical swipe on the linen scrolls and sews nothing; a vertical swipe that starts on
 *         the needle scrolls; a short press on the needle then a drag sews and does not scroll; a mostly horizontal
 *         move picks it up.
 * idle    no thread: zero mutations in the hoop for 5 s; a thread waiting out its 15 s: zero; the unpick begins about 15 s
 *         after the knot and ends; nothing loops afterwards.
 * swap    an in-school swap mid-stitch (to Contact and back through the header): the layer is empty on return, one
 *         instance (one drag makes one thread), no errors.
 */
import { join } from 'node:path';
import { loadImage, createCanvas } from '@napi-rs/canvas';
import { launch, arriveAbout, reach, hoopGeo, startFilm, pickAt, strip, boxOf, stitchState, OUT } from './w3-t27-lib.mjs';

const ONLY = (process.env.ONLY || 'sheets,films,clip,words,swipe,idle,swap').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const SIZES = (process.env.SIZES || '1440,1280,1024,820,390').split(',').map(Number);
const FILM_SIZES = (process.env.FILM_SIZES || '1440,820,390').split(',').map(Number);
const { browser } = await launch();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** The pointer path of a stroke: waypoints, eased between with `per` moves each. */
function walk(points, per = 9) {
  const out = [];
  for (let i = 1; i < points.length; i++) for (let s = 1; s <= per; s++) out.push([points[i - 1][0] + (points[i][0] - points[i - 1][0]) * (s / per), points[i - 1][1] + (points[i][1] - points[i - 1][1]) * (s / per)]);
  return out;
}
/** An arc about the hoop's centre at radius f of the linen's, from angle a0 to a1 (degrees, y down). */
function arc(g, f, a0, a1, n = 8) {
  const pts = [];
  for (let i = 0; i <= n; i++) { const a = ((a0 + (a1 - a0) * (n ? i / n : 0)) * Math.PI) / 180; pts.push([g.cx + g.linenR * f * Math.cos(a), g.cy + g.linenR * f * Math.sin(a)]); }
  return pts;
}

/** Drag the needle along `pts` (grabbing it by the body): a mouse press, or on touch a 260 ms press and a CDP touch drag. */
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
async function release(env) {
  if (!env.mobile) await env.page.mouse.up();
  else await env.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}
async function tapAt(env, x, y) {
  if (env.mobile) await env.page.touchscreen.tap(x, y);
  else await env.page.mouse.click(x, y);
}
/** Log every knot, thread and unpick start in the layer, in epoch ms. */
async function watchLayer(page) {
  await page.evaluate(() => {
    window.__log = [];
    const seen = new WeakSet();
    new MutationObserver((recs) => {
      for (const r of recs) {
        if (r.type === 'childList') {
          r.addedNodes.forEach((n) => { const c = n.classList; if (c?.contains('nt-knot')) window.__log.push({ t: Date.now(), k: 'knot' }); if (c?.contains('nt-thread')) window.__log.push({ t: Date.now(), k: 'thread' }); });
          r.removedNodes.forEach((n) => { if (n.classList?.contains('nt-thread')) window.__log.push({ t: Date.now(), k: 'gone' }); });
        } else if (r.attributeName === 'stroke-dashoffset' && !seen.has(r.target.parentNode)) { seen.add(r.target.parentNode); window.__log.push({ t: Date.now(), k: 'unpick' }); }
      }
    }).observe(document.querySelector('.nt-threads'), { childList: true, subtree: true, attributes: true, attributeFilter: ['stroke-dashoffset'] });
  });
}

/* ---------------------------------------------------------------- sheets */
if (ONLY.includes('sheets')) {
  for (const scheme of SCHEMES) for (const width of SIZES) {
    const env = await arriveAbout(browser, { width, scheme });
    await env.page.screenshot({ path: join(OUT, `sheet-about-${scheme}-${width}.png`), fullPage: true });
    if ([1440, 820, 390].includes(width)) {
      await reach(env.page, '.hoop');
      const g = await hoopGeo(env.page);
      await drag(env, g, arc(g, 0.8, 150, 40, 8));
      await sleep(800);
      for (const a of [200, 235, 270, 305, 340]) { const [x, y] = arc(g, 0.8, a, a, 0)[0]; await tapAt(env, x, y); await sleep(520); }
      await sleep(2800);
      await env.page.screenshot({ path: join(OUT, `sheet-about-stitched-${scheme}-${width}.png`), fullPage: true });
    }
    console.log(`sheets ${scheme} ${width}: errors ${JSON.stringify(env.errors)}`);
    await env.ctx.close();
  }
}

/* ----------------------------------------------------------------- films */
if (ONLY.includes('films')) {
  for (const scheme of SCHEMES) for (const width of FILM_SIZES) {
    const env = await arriveAbout(browser, { width, scheme });
    const { page } = env;
    await reach(page, '.hoop');
    const g = await hoopGeo(page);
    const box = await boxOf(page, '.hoop', 34);
    await watchLayer(page);
    const film = await startFilm(page);
    const t0 = film.t0 * 1000;
    const ev = [];
    const mark = (name) => ev.push({ name, ms: Date.now() - t0 });
    mark('drag start');
    const dragPts = arc(g, 0.78, 160, 20, 10);
    await drag(env, g, dragPts.slice(0, 6), { release: false });
    mark('drag mid');
    // (the second half of the stroke continues on the same press)
    const rest = walk([dragPts[5], ...dragPts.slice(6)], 9);
    for (const [x, y] of rest) {
      if (!env.mobile) await page.mouse.move(x, y); else await env.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y }] });
      await sleep(16);
    }
    mark('release');
    await release(env);
    await sleep(900);
    const tapPts = [200, 235, 270, 305, 340].map((a) => arc(g, 0.78, a, a, 0)[0]);
    for (let i = 0; i < tapPts.length; i++) { await tapAt(env, tapPts[i][0], tapPts[i][1]); mark(`tap ${i + 1}`); await sleep(560); }
    // wait out the sequence's tie-off and both unpicks
    const deadline = Date.now() + 40000;
    let gone = 0;
    while (Date.now() < deadline) {
      gone = await page.evaluate(() => window.__log.filter((l) => l.k === 'gone').length);
      if (gone >= 2) break;
      await sleep(400);
    }
    await sleep(500);
    const frames = await film.stop();
    const log = await page.evaluate(() => window.__log);
    const rel = (k, n = 0) => { const l = log.filter((x) => x.k === k)[n]; return l ? l.t - t0 : null; };
    const knots = log.filter((l) => l.k === 'knot').map((l) => l.t - t0);
    const unpicks = log.filter((l) => l.k === 'unpick').map((l) => l.t - t0);
    const gones = log.filter((l) => l.k === 'gone').map((l) => l.t - t0);
    const e = (n) => ev.find((x) => x.name === n)?.ms ?? 0;
    const picks = [
      0, e('drag start') + 400, e('drag mid'), e('release'), knots[0] + 120, knots[0] + 700,
      e('tap 1') + 260, e('tap 2') + 260, e('tap 3') + 260, e('tap 5') + 260,
      knots[1] + 120, knots[1] + 600,
      unpicks[0] - 600, unpicks[0] + 350, unpicks[0] + 700, unpicks[0] + 1100, gones[0] - 60, gones[0] + 200,
      unpicks[1] + 350, unpicks[1] + 800, unpicks[1] + 1200, gones[1] + 200,
    ].filter((t) => Number.isFinite(t));
    await strip(pickAt(frames, picks), join(OUT, `film-${scheme}-${width}.png`), `needle ${scheme} ${width}: drag, knot, taps, knot, unpick`, { cols: 6, cellW: width < 700 ? 230 : 300, box, vpWidth: width });
    console.log(`films ${scheme} ${width}: knots at ${knots.join(', ')}; unpick starts ${unpicks.join(', ')} (knot to unpick ${unpicks.map((u, i) => Math.round(u - knots[i])).join(', ')}); gone ${gones.join(', ')}; errors ${JSON.stringify(env.errors)}`);
    await env.ctx.close();
  }
}

/* ------------------------------------------------------------------ clip */
if (ONLY.includes('clip')) {
  for (const scheme of SCHEMES) for (const width of [1440, 390]) {
    const env = await arriveAbout(browser, { width, scheme });
    const { page } = env;
    await reach(page, '.hoop');
    const g = await hoopGeo(page);
    // round the inside of the rim, out over the wood, and back in: the stitches stop at the linen's edge
    const path = [...arc(g, 0.9, 150, 215, 6), ...arc(g, 1.12, 215, 262, 5), ...arc(g, 0.92, 262, 330, 6)];
    await drag(env, g, path, { release: false, per: 7 });
    const held = await stitchState(page);
    await page.screenshot({ path: join(OUT, `clip-held-${scheme}-${width}.png`), clip: { x: g.cx - g.hoopR - 20, y: g.cy - g.hoopR - 20, width: g.hoopR * 2 + 40, height: g.hoopR * 2 + 40 } });
    await release(env);
    await sleep(1200);
    await page.screenshot({ path: join(OUT, `clip-after-${scheme}-${width}.png`), clip: { x: g.cx - g.hoopR - 20, y: g.cy - g.hoopR - 20, width: g.hoopR * 2 + 40, height: g.hoopR * 2 + 40 } });
    const num = await page.evaluate(() => {
      const layer = document.querySelector('.nt-layer');
      const cs = getComputedStyle(layer);
      const over = document.querySelector('.nt-over');
      const d = over?.getAttribute('d') || '';
      const nums = (d.match(/-?\d+\.?\d*/g) || []).map(Number);
      const S = layer.viewBox.baseVal.width;
      let outside = 0, n = 0;
      for (let i = 0; i < nums.length; i += 2) { n++; if (Math.hypot(nums[i] - S / 2, nums[i + 1] - S / 2) > S / 2) outside++; }
      const knot = document.querySelector('.nt-knot .nt-kb');
      const kr = knot ? Math.hypot(+knot.getAttribute('cx') - S / 2, +knot.getAttribute('cy') - S / 2) : null;
      return { clipPath: cs.clipPath, samples: n, samplesBeyondLinen: outside, knotRadiusFromCentre: kr, linenRadius: S / 2 };
    });
    console.log(`clip ${scheme} ${width}: held ${JSON.stringify(held)} ${JSON.stringify(num)}`);
    await env.ctx.close();
  }
}

/* ----------------------------------------------------------------- words */
if (ONLY.includes('words')) {
  for (const scheme of SCHEMES) for (const width of [1440, 390]) {
    const env = await arriveAbout(browser, { width, scheme });
    const { page } = env;
    await reach(page, '.hoop');
    const g = await hoopGeo(page);
    const clipBox = { x: g.cx - g.linenR, y: g.cy - g.linenR, width: g.linenR * 2, height: g.linenR * 2 };
    const bare = await page.screenshot({ clip: clipBox });
    const rects = await page.evaluate(() => {
      const out = [];
      const r = document.createRange();
      r.selectNodeContents(document.querySelector('.hoop .manifesto'));
      for (const b of r.getClientRects()) out.push({ n: 'manifesto', x: b.left, y: b.top, w: b.width, h: b.height });
      const s = document.querySelector('.hoop .sig').getBoundingClientRect();
      out.push({ n: 'maker line', x: s.left, y: s.top, w: s.width, h: s.height });
      return out;
    });
    // strokes straight through every line of the manifesto, across the sprig and the maker's line, in four passes
    const tx = (f) => g.cx + g.linenR * f;
    const ty = (f) => g.cy + g.linenR * f;
    const strokes = [
      [[tx(-0.62), ty(-0.5)], [tx(0.62), ty(-0.3)], [tx(-0.6), ty(-0.12)], [tx(0.6), ty(0.05)]],
      [[tx(-0.45), ty(0.3)], [tx(0.5), ty(0.45)], [tx(-0.5), ty(0.62)], [tx(0.45), ty(0.55)]],
    ];
    for (const s of strokes) { await drag(env, g, s, { per: 14 }); await sleep(1000); }
    // and a run of taps across the words
    for (const [fx, fy] of [[-0.5, -0.4], [0.5, -0.38], [0, -0.2], [-0.4, 0.55], [0.4, 0.58]]) { await tapAt(env, tx(fx), ty(fy)); await sleep(560); }
    await sleep(2800);
    const drawn = await page.screenshot({ clip: clipBox });
    await page.screenshot({ path: join(OUT, `words-${scheme}-${width}.png`), clip: clipBox });
    const state = await stitchState(page);
    // diff inside the words' boxes (the needle is home; fireflies and seeds are under the hoop)
    const A = await loadImage(bare), B = await loadImage(drawn);
    const k = A.width / clipBox.width;
    const ca = createCanvas(A.width, A.height).getContext('2d'); ca.drawImage(A, 0, 0);
    const cb = createCanvas(B.width, B.height).getContext('2d'); cb.drawImage(B, 0, 0);
    let worst = 0, total = 0, outsideDiff = 0, changed = 0, at = null;
    const pa = ca.getImageData(0, 0, A.width, A.height).data, pb = cb.getImageData(0, 0, B.width, B.height).data;
    const inWords = new Uint8Array(A.width * A.height);
    for (const r of rects) {
      const x0 = Math.max(0, Math.floor((r.x - clipBox.x) * k)), x1 = Math.min(A.width, Math.ceil((r.x + r.w - clipBox.x) * k));
      const y0 = Math.max(0, Math.floor((r.y - clipBox.y) * k)), y1 = Math.min(A.height, Math.ceil((r.y + r.h - clipBox.y) * k));
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) inWords[y * A.width + x] = 1;
    }
    for (let i = 0; i < A.width * A.height; i++) {
      const d = Math.max(Math.abs(pa[i * 4] - pb[i * 4]), Math.abs(pa[i * 4 + 1] - pb[i * 4 + 1]), Math.abs(pa[i * 4 + 2] - pb[i * 4 + 2]));
      if (inWords[i]) { total++; if (d > worst) worst = d; if (d > 0) { changed++; if (d >= worst) at = [i % A.width, Math.floor(i / A.width)]; } } else if (d > 24) outsideDiff++;
    }
    console.log(`words ${scheme} ${width}: ${state.threads} threads, ${state.knots} knots; pixels inside the words' boxes ${total}, largest channel difference from the bare hoop ${worst} (0 = untouched; ${changed} pixels differ at all, the strongest at ${JSON.stringify(at)} in a ${A.width}px crop); pixels changed elsewhere (the stitches) ${outsideDiff}`);
    await env.ctx.close();
  }
}

/* ----------------------------------------------------------------- swipe */
if (ONLY.includes('swipe')) {
  for (const width of [390, 820]) for (const scheme of ['light', 'dark']) {
    const env = await arriveAbout(browser, { width, scheme });
    const { page, cdp } = env;
    await reach(page, '.hoop');
    const g0 = await hoopGeo(page);
    const swipe = async (x, y, dy, frames = 14, hold = 0) => {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      if (hold) await sleep(hold);
      for (let i = 1; i <= frames; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y: y + (dy * i) / frames }] }); await sleep(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await sleep(900);
    };
    const row = async (label, fn) => {
      await reach(page, '.hoop');
      const before = await page.evaluate(() => scrollY);
      const film = await startFilm(page);
      await fn();
      const frames = await film.stop();
      const after = await page.evaluate(() => scrollY);
      const st = await stitchState(page);
      console.log(`swipe ${width} ${scheme} ${label}: scrollY ${Math.round(before)} -> ${Math.round(after)}; threads ${st.threads}, knots ${st.knots}, held ${st.held}`);
      await strip(pickAt(frames, [0, 160, 320, 520, 760, 1100, 1500]), join(OUT, `swipe-${label.replace(/\W+/g, '-')}-${scheme}-${width}.png`), `${label} at ${width} ${scheme}`, { cols: 7, cellW: 180 });
    };
    await row('vertical swipe on the linen', async () => { const g = await hoopGeo(page); await swipe(g.cx - g.linenR * 0.5, g.cy + g.linenR * 0.1, -160); });
    await row('vertical swipe from the needle', async () => { const g = await hoopGeo(page); await swipe(g.body.x, g.body.y, -160); });
    await row('press then drag the needle', async () => { const g = await hoopGeo(page); await drag(env, g, arc(g, 0.7, 150, 60, 6), { per: 8 }); await sleep(900); });
    await row('horizontal move from the needle', async () => {
      const g = await hoopGeo(page);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: g.body.x, y: g.body.y }] });
      for (let i = 1; i <= 30; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: g.body.x + i * 5, y: g.body.y - i * 1.2 }] }); await sleep(16); }
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      await sleep(900);
    });
    // a plain tap on the linen sews (touch)
    await row('tap on the linen', async () => { const g = await hoopGeo(page); await page.touchscreen.tap(g.cx - g.linenR * 0.55, g.cy - g.linenR * 0.7); await sleep(2600); });
    await env.ctx.close();
  }
}

/* ------------------------------------------------------------------ idle */
if (ONLY.includes('idle')) {
  for (const scheme of SCHEMES) {
    const env = await arriveAbout(browser, { width: 1440, scheme });
    const { page } = env;
    await reach(page, '.hoop');
    const g = await hoopGeo(page);
    await sleep(2200); // the one-shot nudge (data-nudge on, then off) is over before anything is counted
    await page.evaluate(() => {
      window.__mut = 0;
      window.__mo = new MutationObserver((r) => { window.__mut += r.length; });
      window.__mo.observe(document.querySelector('.hoop'), { subtree: true, attributes: true, childList: true, characterData: true });
    });
    await sleep(5000);
    const idleMut = await page.evaluate(() => { const n = window.__mut; window.__mut = 0; return n; });
    // one thread; then 12 s of waiting with nothing unpicking
    await drag(env, g, arc(g, 0.78, 160, 60, 6), { per: 8 });
    const tKnot = Date.now();
    await sleep(2200); // glide home and settle
    const after = await page.evaluate(() => { const n = window.__mut; window.__mut = 0; return n; });
    await sleep(12000);
    const waiting = await page.evaluate(() => { const n = window.__mut; window.__mut = 0; return n; });
    // the unpick: first mutation of the thread after the wait, and the end of it
    let first = 0, last = 0;
    const until = Date.now() + 9000;
    while (Date.now() < until) {
      const n = await page.evaluate(() => { const v = window.__mut; window.__mut = 0; return v; });
      if (n && !first) first = Date.now();
      if (n) last = Date.now();
      if ((await stitchState(page)).threads === 0) break;
      await sleep(80);
    }
    await sleep(600);
    const done = await page.evaluate(() => { const n = window.__mut; window.__mut = 0; return n; });
    await sleep(3000);
    const quiet = await page.evaluate(() => window.__mut);
    console.log(`idle ${scheme}: mutations in the hoop with no thread over 5 s ${idleMut}; while drawing and knotting ${after}; waiting 12 s ${waiting}; unpick began ${Math.round((first - tKnot) / 100) / 10} s after the drag ended (window ${first && last ? last - first : 0} ms); after the thread was gone ${done} then ${quiet} over 3 s; errors ${JSON.stringify(env.errors)}`);
    await env.ctx.close();
  }
}

/* ------------------------------------------------------------------ swap */
if (ONLY.includes('swap')) {
  for (const scheme of SCHEMES) for (const width of [1440, 390]) {
    const env = await arriveAbout(browser, { width, scheme });
    const { page } = env;
    await reach(page, '.hoop');
    const g = await hoopGeo(page);
    const film = await startFilm(page);
    const t0 = film.t0 * 1000;
    const marks = [];
    const mark = (n) => marks.push(Date.now() - t0);
    mark();
    // mid-stitch: a thread live (taps in flight, no knot yet) and one knotted, then straight through the header
    await drag(env, g, arc(g, 0.78, 160, 90, 5), { per: 8 });
    await sleep(500);
    await tapAt(env, g.cx + g.linenR * 0.5, g.cy - g.linenR * 0.72);
    await sleep(120);
    mark();
    const mid = await stitchState(page);
    const nav = page.locator('header nav a[href="/t/cottagecore/contact/"]').first();
    if (await nav.isVisible()) await nav.click(); else await page.evaluate(() => document.querySelector('header nav a[href="/t/cottagecore/contact/"]').click());
    await page.waitForURL('**/contact/**');
    await sleep(1600);
    mark();
    const onContact = await page.evaluate(() => ({ threads: document.querySelectorAll('.nt-thread').length, masks: document.querySelectorAll('#nt-keep').length }));
    const back = page.locator('header nav a[href="/t/cottagecore/about/"]').first();
    if (await back.isVisible()) await back.click(); else await page.evaluate(() => document.querySelector('header nav a[href="/t/cottagecore/about/"]').click());
    await page.waitForURL('**/about/**');
    await page.waitForTimeout(1800);
    await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
    await reach(page, '.hoop');
    mark();
    const ret = await stitchState(page);
    const g2 = await hoopGeo(page);
    await drag(env, g2, arc(g2, 0.78, 150, 40, 6), { per: 8 });
    await sleep(900);
    mark();
    const once = await stitchState(page);
    const frames = await film.stop();
    await strip(pickAt(frames, [0, marks[1], marks[2] - 1200, marks[2], marks[3], marks[4]]), join(OUT, `swap-${scheme}-${width}.png`), `in-school swap mid-stitch at ${width}, ${scheme}: stitches, Contact, back on About (empty), one drag`, { cols: 6, cellW: width < 700 ? 200 : 300 });
    console.log(`swap ${scheme} ${width}: before the swap ${JSON.stringify({ threads: mid.threads, knots: mid.knots })}; on Contact ${JSON.stringify(onContact)}; back on About threads ${ret.threads} knots ${ret.knots} needle style "${ret.needleStyle}"; one drag makes ${once.threads} thread (colour ${once.colours}); errors ${JSON.stringify(env.errors)}`);
    await env.ctx.close();
  }
}

await browser.close();
