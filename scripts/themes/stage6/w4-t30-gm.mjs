/**
 * Stage 6 wave 4, task 30: grandmillennial's closing C items, measured and filmed (critique B5, B7, A1; task 22 and 26
 * minors). Every arrival is through the real switcher (w4-t30-lib arrive). Sections
 * (ONLY=sheets,plates,envelope,signifiers,beats):
 *
 *   sheets      Home, About and Contact whole page at 1440, 1101, 820 and 390, both schemes.
 *   plates      Home: at 1440 and 1101 (mouse brushes), 820 and 390 (touch taps), both schemes: every plate struck from each
 *               side with a rAF sampler running: the peak angle of the struck plate, and over every frame the least
 *               clearance (px, negative is overlap) between the swinging disc and the frame, plaque, bow and every other
 *               plate's disc. A strip over 700 ms of a brush and of a tap. Also: a right click swings nothing; a press
 *               hidden mid-swing leaves no animation; rapid brushes never freeze a neighbour mid-arc. Writes plates.json.
 *   envelope    Contact: opened at 820 and 390 in dark (and light): the hinge shows (the lid's top above the envelope, inside
 *               the gap), the form is clear, the open flap's colour apart from the wall. Strips and stills.
 *   signifiers  1440 mouse: the cursor and hover of the sampler's letters, the seal and the plates, a table.
 *   beats       390 touch: the sampler, the seal and the plates, once each: strips from the stillness timer, the start
 *               measured from the last scroll (at least 400 ms), none mid-scroll, none while a form field has focus.
 *
 *   node scripts/themes/snap.mjs --name s6-w4-t30 --reuse --port 4470 -- node scripts/themes/stage6/w4-t30-gm.mjs
 * Output: .out/stage6/w4/t30/gm/
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, arrive, startFilm, strip, pickAt, boxOf, OUT } from './w4-t30-lib.mjs';

const ONLY = (process.env.ONLY || 'sheets,plates,envelope,signifiers,beats').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const D = join(OUT, 'gm');
await mkdir(D, { recursive: true });
const { browser } = await launch();
const R = {};
const fails = [];
const check = (name, ok, detail) => {
  if (!ok) fails.push(`${name} ${JSON.stringify(detail)}`);
  console.log(ok ? 'ok  ' : 'FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
};
const HOME = '/t/grandmillennial/';
const ABOUT = '/t/grandmillennial/about/';
const CONTACT = '/t/grandmillennial/contact/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ sheets */
if (ONLY.includes('sheets')) {
  for (const scheme of SCHEMES) for (const width of [1440, 1101, 820, 390]) {
    for (const [name, path] of [['home', HOME], ['about', ABOUT], ['contact', CONTACT]]) {
      const { ctx, page } = await arrive(browser, { path, width, scheme });
      await page.screenshot({ path: join(D, `sheet-${name}-${scheme}-${width}.png`), fullPage: true });
      await ctx.close();
    }
  }
}

/* ------------------------------------------------------------------ plates */
/** In-page: sample every shown plate's disc and the protected boxes each frame until stopped. */
const installSampler = () => {
  const hero = document.querySelector('.hero.gm-trellis');
  const plates = [...hero.querySelectorAll('.gm-plate')].filter((p) => p.getClientRects().length);
  window.__s = { frames: [], on: true, plates: plates.map((p) => p.getAttribute('class').replace('gm-plate ', '')) };
  const prot = ['.gilt', '.plaque', '.bow'].map((s) => hero.querySelector(s)).filter(Boolean);
  const t0 = performance.now();
  const tick = () => {
    if (!window.__s.on) return;
    const discs = plates.map((p) => {
      const r = p.getBoundingClientRect();
      const m = new DOMMatrixReadOnly(getComputedStyle(p).transform);
      const w = parseFloat(getComputedStyle(p).width);
      return { x: (r.left + r.right) / 2, y: (r.top + r.bottom) / 2, r: (w / 2) * 0.966, a: p.getAnimations().length ? Math.atan2(m.b, m.a) * 180 / Math.PI : 0 };
    });
    window.__s.frames.push({ t: Math.round(performance.now() - t0), discs, boxes: prot.map((e) => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }), anims: plates.reduce((n, p) => n + p.getAnimations().length, 0) });
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};
const clearance = (frames) => {
  let worst = Infinity, worstWhat = '';
  for (const f of frames) {
    f.discs.forEach((d, i) => {
      for (const b of f.boxes) {
        const dx = Math.max(b[0] - d.x, 0, d.x - b[2]), dy = Math.max(b[1] - d.y, 0, d.y - b[3]);
        const c = Math.hypot(dx, dy) - d.r;
        if (c < worst) { worst = c; worstWhat = 'frame/plaque/bow'; }
      }
      f.discs.forEach((o, j) => { if (j > i) { const c = Math.hypot(d.x - o.x, d.y - o.y) - d.r - o.r; if (c < worst) { worst = c; worstWhat = 'plate/plate'; } } });
    });
  }
  return { worst: +worst.toFixed(1), what: worstWhat };
};
const peak = (frames, idx) => +Math.max(0, ...frames.map((f) => Math.abs(f.discs[idx].a))).toFixed(2);
/** Longest run of identical angles (>= 3 frames) while the plate is mid-arc (|a| > 2 degrees). */
const deadStops = (frames, idx) => {
  let run = 0, worst = 0;
  for (let i = 1; i < frames.length; i++) {
    const a = frames[i].discs[idx].a;
    if (Math.abs(a) > 2 && Math.abs(a - frames[i - 1].discs[idx].a) < 0.001) { run++; worst = Math.max(worst, run); } else run = 0;
  }
  return worst;
};

if (ONLY.includes('plates')) {
  R.plates = {};
  for (const scheme of SCHEMES) for (const width of [1440, 1101, 820, 390]) {
    const touch = width < 900;
    const { ctx, page, mobile } = await arrive(browser, { path: HOME, width, scheme, touch });
    await page.evaluate(() => document.querySelector('.hero.gm-trellis').scrollIntoView({ block: 'start' }));
    await sleep(900);
    const info = await page.evaluate(() => [...document.querySelectorAll('.hero .gm-plate')].filter((p) => p.getClientRects().length).map((p) => { const r = p.getBoundingClientRect(); return { cls: p.getAttribute('class').replace('gm-plate ', ''), cx: r.left + r.width / 2, cy: r.top + r.height / 2, w: r.width }; }));
    const key = `${scheme}-${width}`;
    const out = { plates: info.length, strikes: [] };
    // every plate struck from each side
    for (let i = 0; i < info.length; i++) for (const side of [-1, 1]) {
      const p = info[i];
      await page.evaluate(installSampler);
      if (!mobile) {
        await page.mouse.move(p.cx - side * p.w * 0.9, p.cy);
        await page.mouse.move(p.cx - side * p.w * 0.25, p.cy, { steps: 3 });
        await page.mouse.move(p.cx + side * p.w * 0.25, p.cy, { steps: 5 });
      } else {
        await page.touchscreen.tap(p.cx - side * p.w * 0.25, p.cy);
      }
      await sleep(760);
      const frames = await page.evaluate(() => { window.__s.on = false; return window.__s.frames; });
      const c = clearance(frames);
      out.strikes.push({ plate: p.cls, side, peak: peak(frames, i), clearance: c.worst, vs: c.what });
      await page.mouse.move(5, 5);
      await sleep(500);
    }
    const maxPeak = Math.max(...out.strikes.map((s) => s.peak));
    const worstClear = Math.min(...out.strikes.map((s) => s.clearance));
    out.maxPeak = maxPeak; out.worstClear = worstClear;
    check(`plates ${key}: ${info.length} plates, each struck from both sides; biggest swing ${maxPeak} deg; least clearance to the frame, plaque, bow and the other plates ${worstClear}px`, worstClear >= -1.5 && maxPeak > 5, { maxPeak, worstClear, rows: out.strikes.map((s) => `${s.plate}${s.side > 0 ? '>' : '<'} ${s.peak}deg ${s.clearance}px`).join(' ') });

    // a right click and a middle click swing nothing
    if (!mobile) {
      const p = info[0];
      await page.mouse.move(p.cx, p.cy + p.w * 1.4);
      await page.mouse.move(p.cx, p.cy, { steps: 6 });
      await sleep(900);
      await page.evaluate(installSampler);
      await page.mouse.down({ button: 'right' }); await page.mouse.up({ button: 'right' });
      // a middle click through the real mouse starts the browser's autoscroll, so it is sent as events
      await page.evaluate(([x, y]) => { const t = document.elementFromPoint(x, y); for (const type of ['pointerdown', 'pointerup']) t.dispatchEvent(new PointerEvent(type, { pointerType: 'mouse', button: 1, buttons: type === 'pointerdown' ? 4 : 0, clientX: x, clientY: y, bubbles: true, pointerId: 1 })); }, [p.cx, p.cy]);
      await sleep(600);
      const fr = await page.evaluate(() => { window.__s.on = false; return window.__s.frames; });
      check(`plates ${key}: a right and a middle click swing nothing`, Math.max(...fr.map((f) => f.anims)) === 0, { anims: Math.max(...fr.map((f) => f.anims)) });
      await page.mouse.move(5, 5);
      await sleep(500);
    }

    // hidden mid-swing: nothing keeps running
    {
      const p = info[0];
      await page.evaluate(installSampler);
      if (!mobile) { await page.mouse.move(p.cx - p.w * 0.9, p.cy); await page.mouse.move(p.cx + p.w * 0.3, p.cy, { steps: 5 }); } else await page.touchscreen.tap(p.cx + p.w * 0.25, p.cy);
      await sleep(120);
      const mid = await page.evaluate(() => [...document.querySelectorAll('.hero .gm-plate')].reduce((n, e) => n + e.getAnimations().length, 0));
      await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, get: () => true }); document.dispatchEvent(new Event('visibilitychange')); });
      await sleep(80);
      const after = await page.evaluate(() => [...document.querySelectorAll('.hero .gm-plate')].reduce((n, e) => n + e.getAnimations().length, 0));
      await page.evaluate(() => { delete document.hidden; window.__s.on = false; });
      check(`plates ${key}: hidden mid-swing (${mid} animations running) leaves ${after}`, mid > 0 && after === 0, { mid, after });
      await sleep(500);
    }

    // rapid brushes across the group: no neighbour stops dead mid-arc
    if (!mobile) {
      await page.evaluate(installSampler);
      const ys = info.map((p) => p.cy);
      for (let k = 0; k < 14; k++) {
        const p = info[k % info.length];
        const s = k % 2 ? 1 : -1;
        await page.mouse.move(p.cx - s * p.w * 0.6, p.cy);
        await page.mouse.move(p.cx + s * p.w * 0.4, p.cy, { steps: 2 });
        await sleep(55);
      }
      await sleep(800);
      const frames = await page.evaluate(() => { window.__s.on = false; return window.__s.frames; });
      const stops = info.map((_, i) => deadStops(frames, i));
      const c = clearance(frames);
      check(`plates ${key}: fourteen quick brushes: longest dead stop mid-arc ${Math.max(...stops)} frames, least clearance ${c.worst}px`, Math.max(...stops) <= 3 && c.worst >= -1.5, { stops, clearance: c });
      void ys;
      await page.mouse.move(5, 5);
      await sleep(600);
    }

    // a strip over 700 ms: the biggest plate, brushed (mouse) or tapped (touch)
    {
      const big = info.reduce((m, p, i) => (p.w > info[m].w ? i : m), 0);
      const p = info[big];
      const box = await boxOf(page, '.hero.gm-trellis', 0);
      const film = await startFilm(page);
      if (!mobile) { await page.mouse.move(p.cx - p.w * 0.9, p.cy); await page.mouse.move(p.cx - p.w * 0.3, p.cy, { steps: 4 }); await page.mouse.move(p.cx + p.w * 0.3, p.cy, { steps: 6 }); }
      else await page.touchscreen.tap(p.cx + p.w * 0.25, p.cy);
      await sleep(800);
      const frames = await film.stop();
      await strip(pickAt(frames, [0, 60, 120, 200, 300, 400, 520, 650]), join(D, `plates-${mobile ? 'tap' : 'brush'}-${scheme}-${width}.png`), `plates ${mobile ? 'tapped' : 'brushed'} ${scheme} ${width}: biggest plate, 700 ms`, { cols: 4, cellW: 420, box, vpWidth: width });
    }
    R.plates[key] = out;
    await ctx.close();
  }
  await writeFile(join(D, 'plates.json'), JSON.stringify(R.plates, null, 1));
}

/* ---------------------------------------------------------------- envelope */
if (ONLY.includes('envelope')) {
  R.envelope = {};
  for (const scheme of ['dark', 'light']) for (const width of [820, 390, 1440]) {
    const { ctx, page, mobile } = await arrive(browser, { path: CONTACT, width, scheme });
    await page.evaluate(() => document.querySelector('.envelope').scrollIntoView({ block: 'center' }));
    await sleep(900);
    const box = await page.evaluate(() => { const r = document.querySelector('.envelope').getBoundingClientRect(); const f = document.querySelector('.stationery').getBoundingClientRect(); const top = Math.min(r.top, f.bottom) - 40; return { x: 0, y: Math.max(0, top - 120), w: innerWidth, h: Math.min(innerHeight, r.bottom - top + 160) }; });
    const film = await startFilm(page);
    const seal = await page.evaluate(() => { const r = document.querySelector('.seal-btn').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    if (mobile) await page.touchscreen.tap(seal[0], seal[1]); else await page.mouse.click(seal[0], seal[1]);
    await sleep(1100);
    const frames = await film.stop();
    await strip(pickAt(frames, [0, 100, 200, 300, 450, 700, 1000]), join(D, `envelope-open-${scheme}-${width}.png`), `envelope open ${scheme} ${width}`, { cols: 4, cellW: 430, box, vpWidth: width });
    await page.screenshot({ path: join(D, `envelope-open-still-${scheme}-${width}.png`), clip: { x: 0, y: box.y, width: box.w, height: box.h } });
    const m = await page.evaluate(() => {
      const lid = document.querySelector('.lid').getBoundingClientRect();
      const env = document.querySelector('.envelope').getBoundingClientRect();
      const form = document.querySelector('.stationery').getBoundingClientRect();
      const name = document.querySelector('#cf-name').getBoundingClientRect();
      const cx = (name.left + name.right) / 2, cy = (name.top + name.bottom) / 2;
      const at = null;
      void cx; void cy;
      const eps = document.querySelectorAll('.lid').length;
      return { open: document.querySelector('.envelope').dataset.open, lidTop: Math.round(lid.top), envTop: Math.round(env.top), formBottom: Math.round(form.bottom), hingeAboveEnvelope: Math.round(env.top - lid.top), gapToForm: Math.round(lid.top - form.bottom), nameFieldHit: at?.id || at?.tagName, eps };
    });
    // the form is never covered: with the field scrolled into view, the point at its centre is the field
    m.nameFieldHit = await page.evaluate(() => { const n = document.querySelector('#cf-name'); n.scrollIntoView({ block: 'center' }); const r = n.getBoundingClientRect(); return document.elementFromPoint((r.left + r.right) / 2, (r.top + r.bottom) / 2)?.id; });
    R.envelope[`${scheme}-${width}`] = m;
    if (width <= 860) check(`envelope ${scheme} ${width}: open, the flap stands ${m.hingeAboveEnvelope}px above the envelope (about 36), clear of the form (gap ${m.gapToForm}px), the name field is still the field`, m.open === 'true' && m.hingeAboveEnvelope > 20 && m.hingeAboveEnvelope < 44 && m.gapToForm >= -4 && m.nameFieldHit === 'cf-name', m);
    else check(`envelope ${scheme} ${width}: open (one column does not apply), the name field is still the field`, m.open === 'true' && m.nameFieldHit === 'cf-name', m);
    await ctx.close();
  }
  await writeFile(join(D, 'envelope.json'), JSON.stringify(R.envelope, null, 1));
}

/* -------------------------------------------------------------- signifiers */
if (ONLY.includes('signifiers')) {
  const rows = [];
  const cursorAt = (page, x, y) => page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? getComputedStyle(e).cursor : 'none'; }, [x, y]);
  {
    const { ctx, page } = await arrive(browser, { path: ABOUT, width: 1440, scheme: 'light', touch: false });
    await page.evaluate(() => document.querySelector('.abc-in').scrollIntoView({ block: 'center' }));
    await sleep(900);
    const [x, y] = await page.evaluate(() => { const r = document.querySelector('button.ltr').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.move(5, 5); await sleep(400);
    const bg0 = await page.evaluate(() => getComputedStyle(document.querySelector('button.ltr')).backgroundColor);
    await page.mouse.move(x, y); await sleep(400);
    const bg1 = await page.evaluate(() => getComputedStyle(document.querySelector('button.ltr')).backgroundColor);
    rows.push({ toy: 'sampler letter (About)', cursor: await cursorAt(page, x, y), hover: `${bg0} -> ${bg1}`, changed: bg0 !== bg1 });
    const role = await page.evaluate(() => { const e = document.querySelector('.abc-in'); return { role: e.getAttribute('role'), label: e.getAttribute('aria-label') }; });
    check('sampler band is role=toolbar with an aria-label', role.role === 'toolbar' && !!role.label, role);
    await ctx.close();
  }
  {
    const { ctx, page } = await arrive(browser, { path: CONTACT, width: 1440, scheme: 'light', touch: false });
    await page.evaluate(() => document.querySelector('.envelope').scrollIntoView({ block: 'center' }));
    await sleep(900);
    const [x, y] = await page.evaluate(() => { const r = document.querySelector('.seal-btn').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.move(5, 5); await sleep(400);
    const s0 = await page.evaluate(() => getComputedStyle(document.querySelector('.seal-btn .seal')).scale);
    await page.mouse.move(x, y); await sleep(500);
    const s1 = await page.evaluate(() => getComputedStyle(document.querySelector('.seal-btn .seal')).scale);
    rows.push({ toy: 'wax seal (Contact)', cursor: await cursorAt(page, x, y), hover: `${s0} -> ${s1}`, changed: s0 !== s1 });
    await ctx.close();
  }
  {
    const { ctx, page } = await arrive(browser, { path: HOME, width: 1440, scheme: 'light', touch: false });
    await page.evaluate(() => document.querySelector('.hero.gm-trellis').scrollIntoView({ block: 'start' }));
    await sleep(900);
    const [x, y, cx, cy] = await page.evaluate(() => { const p = [...document.querySelectorAll('.hero .gm-plate')].filter((e) => e.getClientRects().length)[0]; const r = p.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.left + 3, r.top + 3]; });
    await page.mouse.move(5, 5); await sleep(1000);
    const f0 = await page.evaluate(() => getComputedStyle([...document.querySelectorAll('.hero .gm-plate')].filter((e) => e.getClientRects().length)[0]).filter);
    await page.mouse.move(x, y, { steps: 4 }); await sleep(1100);
    const f1 = await page.evaluate(() => getComputedStyle([...document.querySelectorAll('.hero .gm-plate')].filter((e) => e.getClientRects().length)[0]).filter);
    const onDisc = await cursorAt(page, x, y);
    const onCorner = await cursorAt(page, cx, cy);
    rows.push({ toy: 'plate (Home)', cursor: `${onDisc} on the disc, ${onCorner} on the empty corner of its box`, hover: `${f0} -> ${f1}`, changed: f0 !== f1 });
    await ctx.close();
  }
  for (const r of rows) console.log(`signifier ${r.toy}: cursor ${r.cursor}; hover ${r.hover}`);
  check('signifiers: every grandmillennial toy has its pointer and a hover that changes something', rows.every((r) => /pointer/.test(r.cursor) && r.changed), rows);
  await writeFile(join(D, 'signifiers.json'), JSON.stringify(rows, null, 1));
}

/* ------------------------------------------------------------------- beats */
if (ONLY.includes('beats')) {
  R.beats = {};
  const toys = [
    { name: 'sampler', path: ABOUT, sel: '.abc-in', obs: (el) => ({ attr: null }), detect: () => document.querySelectorAll('button.ltr.go').length > 0 },
    { name: 'seal', path: CONTACT, sel: '.seal-btn', detect: () => document.querySelector('.seal-btn .seal').getAnimations().length > 0 },
    { name: 'plates', height: 560, path: HOME, sel: '.hero .gm-plate.y, .hero .gm-plate.a', detect: () => [...document.querySelectorAll('.hero .gm-plate')].some((p) => p.getAnimations().some((a) => a.effect?.getKeyframes?.().length > 3)) },
  ];
  for (const t of toys) {
    // (the plates' row is on screen at load on a tall phone, where the beat plays on its own after 400 ms of stillness: a short
    // viewport puts it below the fold so the film can start at the end of a scroll like the others)
    const { ctx, page } = await arrive(browser, { path: t.path, width: 390, scheme: 'light', touch: true, settle: 1200, height: t.height });
    await page.evaluate(({ src }) => {
      const detect = new Function(`return (${src})`)();
      window.__b = { starts: [], lastScroll: performance.now() };
      addEventListener('scroll', () => { window.__b.lastScroll = performance.now(); }, { passive: true });
      let was = false;
      const tick = () => { const now = detect(); if (now && !was) window.__b.starts.push({ since: Math.round(performance.now() - window.__b.lastScroll), t: performance.now() }); was = now; requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }, { src: t.detect.toString() });
    const y = await page.evaluate((sel) => { const r = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length).getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; }, t.sel);
    for (let i = 1; i <= 8; i++) { await page.evaluate((v) => scrollTo(0, v), (y * i) / 8); await sleep(110); }
    const during = await page.evaluate(() => window.__b.starts.length);
    const box = await page.evaluate((sel) => { const r = [...document.querySelectorAll(sel)].find((e) => e.getClientRects().length).getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top - 150), w: innerWidth, h: Math.min(innerHeight, r.height + 300) }; }, t.sel);
    const film = await startFilm(page);
    await sleep(2800);
    const frames = await film.stop();
    const starts = await page.evaluate(() => window.__b.starts);
    await strip(pickAt(frames, [0, 300, 500, 700, 900, 1100, 1300, 1600, 2000, 2600]), join(D, `beat-${t.name}-390.png`), `${t.name} touch beat at 390, filmed from the end of the scroll`, { cols: 5, cellW: 300, box, vpWidth: 390 });
    check(`beat ${t.name}: none mid-scroll, one beat, started ${starts[0]?.since ?? 'never'} ms after the last scroll (at least 400)`, during === 0 && starts.length === 1 && starts[0].since >= 395, { during, starts: starts.length, since: starts[0]?.since });
    R.beats[t.name] = { since: starts[0]?.since };
    await ctx.close();
  }
  await writeFile(join(D, 'beats.json'), JSON.stringify(R.beats, null, 1));
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED:\n${fails.join('\n')}` : '\nall checks ok');
process.exit(fails.length ? 1 : 0);
