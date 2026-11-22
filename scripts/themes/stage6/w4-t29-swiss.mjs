/**
 * Stage 6 wave 4, task 29: the swiss closing items, measured and filmed.
 * Sections (ONLY=fields,numeral,sweep,resize,signifiers,beats):
 *
 *   fields       each pressed field at 1440 (mouse) and 390 (a held finger), both
 *                schemes: a viewport sheet with the field pressed, the edge's
 *                pixels read against the page (top and bottom of the bleed, out
 *                in the bleed and in the frame), and the layout measured before
 *                and during the press (every box in the field, the document's
 *                size): nothing may move. Writes fields.json and fields-*.png.
 *   numeral      the Services numeral hold at 1440 (mouse) and 390 (finger): the
 *                weight sampled every frame from rest; and a re-press during the
 *                snap-back (no frame jumps by more than one frame's travel).
 *                Strips. Writes numeral.json.
 *   sweep        the About sweep at 1024 and 1280 (and 1440): five scroll
 *                offsets each, the inline cut read at every one, a viewport shot
 *                of each. Writes sweep.json.
 *   resize       1440 mid-sweep: the spine's cut sampled every frame through a
 *                run of viewport resizes (it must never read the rest cut while
 *                the sweep is on). Writes resize.json.
 *   signifiers   1440, mouse: each swiss toy's cursor over and off it and its
 *                hover response, as a table. Writes signifiers.json.
 *   beats        390, touch: the numeral's and the full stop's beat, once: the
 *                timed strip from the stillness timer to the end, the start
 *                measured from the last scroll (at least 400 ms), counted.
 *
 *   node scripts/themes/snap.mjs --name s6-w4-t29 --reuse --port 4470 -- node scripts/themes/stage6/w4-t29-swiss.mjs
 * Output: .out/stage6/w4/t29/swiss/
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, startFilm, strip, pickAt, boxOf, OUT, touchStart, touchEnd, pixelReader, hex, near } from './w4-t29-lib.mjs';

const ONLY = (process.env.ONLY || 'fields,numeral,sweep,resize,signifiers,beats').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const D = join(OUT, 'swiss');
await mkdir(D, { recursive: true });
const { browser, renderer } = await launch();
const R = { renderer };
const fails = [];
const check = (name, ok, detail) => {
  if (!ok) fails.push(`${name} ${JSON.stringify(detail)}`);
  console.log(ok ? 'ok  ' : 'FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
};
const save = (name) => writeFile(join(D, name), JSON.stringify(R[name.replace(/\.json$/, '')], null, 1));

/* ------------------------------------------------------------------ fields */
const FIELDS = [
  { id: 'home-closer', path: '/t/swiss/', sel: '.closer.sw-red' },
  { id: 'home-lab', path: '/t/swiss/', sel: '.lab.sw-sheet' },
  { id: 'services-close', path: '/t/swiss/services/', sel: '.close.sw-red' },
  { id: 'about-manifesto', path: '/t/swiss/about/', sel: '.manifesto.sw-red' },
  { id: 'contact-hero', path: '/t/swiss/contact/', sel: 'section.hero.sw-black' },
  { id: 'contact-direct', path: '/t/swiss/contact/', sel: 'aside.direct.sw-red' },
];

if (ONLY.includes('fields')) {
  R.fields = {};
  for (const width of [1440, 390]) {
    for (const scheme of SCHEMES) {
      for (const f of FIELDS) {
        const key = `${f.id}-${width}-${scheme}`;
        const { ctx, page, cdp, errors, mobile } = await open(browser, { path: f.path, width, scheme });
        await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), f.sel);
        await page.waitForTimeout(500);
        const dpr = await page.evaluate(() => devicePixelRatio);
        const geo = () => page.evaluate((sel) => {
          const field = document.querySelector(sel);
          const r = field.getBoundingClientRect();
          const boxes = [...field.querySelectorAll('*')].map((e) => { const b = e.getBoundingClientRect(); return [Math.round(b.left * 100) / 100, Math.round(b.top * 100) / 100, Math.round(b.width * 100) / 100, Math.round(b.height * 100) / 100]; });
          return { rect: [r.left, r.top, r.width, r.height], boxes, doc: [document.documentElement.scrollWidth, document.documentElement.scrollHeight, scrollX, scrollY] };
        }, f.sel);
        const before = await geo();
        const rect = before.rect;
                // A press on bare field: a few px inside its top-left, in its padding.
        const px = rect[0] + 3 + (f.id === 'about-manifesto' ? 20 : 0);
        const py = rect[1] + 4;
        if (mobile) {
          await touchStart(cdp, Math.max(2, px), py);
          await page.waitForTimeout(320);
        } else {
          await page.mouse.move(px, py);
          await page.mouse.down();
          await page.waitForTimeout(120);
        }
        const flipped = await page.evaluate((sel) => document.querySelector(sel).hasAttribute('data-sw-flip'), f.sel);
        const during = await geo();
        const shot = await page.screenshot();
        await writeFile(join(D, `fields-${key}.png`), shot);
        // The edge, row by row: bring each end of the field into view while it is held, scan the rows round it
        // at a column in the bleed (5 px in from the viewport's edge, or just past the right of a right-bleed field),
        // and report the first row that is the edge colour, with the page's colour just outside it.
        const edgeCol = await page.evaluate((sel) => getComputedStyle(document.querySelector(sel)).getPropertyValue('--flip-edge').trim(), f.sel);
        const edgeRgb = await page.evaluate((c) => { const d = document.createElement('i'); d.style.color = c; document.body.append(d); const v = getComputedStyle(d).color.match(/\d+/g).slice(0, 3).map(Number); d.remove(); return v; }, edgeCol);
        const edge = {};
        for (const end of ['top', 'bottom']) {
          await page.evaluate(([sel, end]) => { const r = document.querySelector(sel).getBoundingClientRect(); scrollBy(0, end === 'top' ? r.top - 250 : r.bottom - (innerHeight - 250)); }, [f.sel, end]);
          await page.waitForTimeout(250);
          const r = await page.evaluate((sel) => { const b = document.querySelector(sel).getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }, f.sel);
          const img = await pixelReader(await page.screenshot());
          const x = r[2] < 1400 && r[0] > 200 ? r[2] + 20 : 5;
          const y0 = Math.round((end === 'top' ? r[1] : r[3]) * dpr);
          const rows = [];
          for (let dy = -3 * dpr; dy <= 3 * dpr; dy++) rows.push([dy, hex(img.at(Math.round(x * dpr), y0 + dy))]);
          // The field's own clip-path edge falls on a fractional pixel at 1x, so the 1px line can be partly covered
          // (anti-aliased): a row counts as the edge when it is nearer the edge colour than the fill's, and not the page's.
          const rgbOf = (c) => c.match(/[0-9a-f]{2}/g).map((h) => parseInt(h, 16));
          const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
          const fill = rgbOf(rows[end === 'top' ? rows.length - 1 : 0][1]);
          const page_ = rgbOf(rows[end === 'top' ? 0 : rows.length - 1][1]);
          const hit = rows.find(([, c]) => { const v = rgbOf(c); return dist(v, edgeRgb) < dist(v, fill) && dist(v, page_) > 12; });
          edge[end] = { x, y0, rows: rows.map((q) => q[1]).join(' '), edgeRow: hit ? hit[0] : null };
        }
        await page.evaluate((y) => scrollTo(0, y), during.doc[3]);
        const cs = await page.evaluate((sel) => {
          const e = document.querySelector(sel);
          const a = getComputedStyle(e, '::after');
          return { bg: getComputedStyle(e).backgroundColor, edge: getComputedStyle(e).getPropertyValue('--flip-edge').trim(), outline: getComputedStyle(e).outline, after: { content: a.content, borderTop: a.borderTopWidth, borderBottom: a.borderBottomWidth, color: a.borderTopColor, inset: [a.left, a.right] } };
        }, f.sel);
        if (mobile) await touchEnd(cdp); else await page.mouse.up();
        await page.waitForTimeout(150);
        const after = await geo();
        const same = (a, b) => JSON.stringify(a.boxes) === JSON.stringify(b.boxes) && JSON.stringify(a.rect) === JSON.stringify(b.rect) && JSON.stringify(a.doc) === JSON.stringify(b.doc);
        const moved = !same(before, during);
        const diff = [];
        if (moved) {
          if (JSON.stringify(before.rect) !== JSON.stringify(during.rect)) diff.push({ rect: [before.rect, during.rect] });
          if (JSON.stringify(before.doc) !== JSON.stringify(during.doc)) diff.push({ doc: [before.doc, during.doc] });
          before.boxes.forEach((b, i) => { if (JSON.stringify(b) !== JSON.stringify(during.boxes[i])) diff.push({ box: i, before: b, during: during.boxes[i] }); });
        }
        const restored = same(before, after);
        R.fields[key] = { flipped, moved, diff: diff.slice(0, 6), restored, rect, edge, cs, errors };
        // Skipped on purpose: Contact's black sheet sits between two rules; its address on a desktop hangs from the section's
        // rule; the dark lab band's head is the white bark photograph (white at rest and pressed), so its top reads white on black.
        const want = f.id === 'contact-hero' ? [] : f.id === 'contact-direct' && width >= 1024 ? ['bottom'] : f.id === 'home-lab' && scheme === 'dark' ? ['bottom'] : ['top', 'bottom'];
        for (const end of want) check(`edge at the ${end} of ${key}`, edge[end].edgeRow !== null, edge[end]);
        check(`flips ${key}`, flipped);
        check(`nothing moves ${key}`, !moved && restored, diff.slice(0, 3));
        if (errors.length) check(`no page errors ${key}`, false, errors);
        await ctx.close();
      }
    }
  }
  await save('fields.json');
}

/* ----------------------------------------------------------------- numeral */
if (ONLY.includes('numeral')) {
  R.numeral = {};
  for (const width of [1440, 390]) {
    const scheme = 'light';
    const { ctx, page, cdp, mobile } = await open(browser, { path: '/t/swiss/services/', width, scheme });
    await page.evaluate(() => document.querySelector('.steps .num').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(500);
    const g = await page.evaluate(() => {
      const n = document.querySelector('.steps .num');
      const rg = document.createRange();
      rg.selectNodeContents(n);
      const r = rg.getBoundingClientRect();
      return [r.left + r.width / 2, r.top + r.height / 2];
    });
    const sample = async (fn) => {
      await page.evaluate(() => {
        const n = document.querySelector('.steps .num');
        window.__w = [];
        window.__on = true;
        window.__t0 = performance.now();
        const tick = () => { if (!window.__on) return; window.__w.push([Math.round(performance.now() - window.__t0), parseFloat(getComputedStyle(n).fontWeight)]); requestAnimationFrame(tick); };
        requestAnimationFrame(tick);
      });
      await fn();
      return page.evaluate(() => { window.__on = false; return window.__w; });
    };
    const down = async () => { if (mobile) { await touchStart(cdp, g[0], g[1]); } else { await page.mouse.move(g[0], g[1]); await page.mouse.down(); } };
    const up = async () => { if (mobile) await touchEnd(cdp); else await page.mouse.up(); };
    const now = () => page.evaluate(() => Math.round(performance.now() - window.__t0));
    // A press and release first: it spends a finger's touch beat, so the measured runs start from true rest.
    await down(); await page.waitForTimeout(250); await up(); await page.waitForTimeout(900);
    // A: from rest, press and hold, release, wait for the snap-back (no film: a screencast costs frames).
    let tp = 0;
    const a = await sample(async () => { await page.waitForTimeout(200); tp = await now(); await down(); await page.waitForTimeout(1500); await up(); await page.waitForTimeout(600); });
    // B: a re-press 260 ms after the release (inside the snap-back: hold 100 ms, then about 250 ms back).
    let tr = 0;
    const b = await sample(async () => { await down(); await page.waitForTimeout(700); await up(); await page.waitForTimeout(260); tr = await now(); await down(); await page.waitForTimeout(500); await up(); await page.waitForTimeout(700); });
    // The film: the same hold, timed, from rest.
    const film = await startFilm(page);
    await page.waitForTimeout(200); await down(); await page.waitForTimeout(1500); await up(); await page.waitForTimeout(700);
    const frames = await film.stop();
    const box = await boxOf(page, '.steps .num', 40);
    const picks = pickAt(frames, [0, 150, 300, 450, 600, 800, 1000, 1300, 1600, 1900, 2100, 2300].filter((t) => t < (frames.at(-1)?.ms ?? 3000)));
    await strip(picks, join(D, `numeral-hold-${width}.png`), `Services numeral hold from rest at ${width} (${mobile ? 'a held finger' : 'mouse'}), the press at +200 ms`, { cols: 6, cellW: 300, box, vpWidth: width });
    // The press settles at tp (a finger: 200 ms after it lands); the dip is from the first sample below rest to the first at the hairline.
    // The fastest the weight moves between two frames, in units a millisecond (the dip and the snap-back run at 3 and 3.2, the rise at 0.8; a
    // jump would read far above that whatever the frame time).
    const jumps = (s) => { let m = 0; for (let i = 1; i < s.length; i++) m = Math.max(m, Math.abs(s[i][1] - s[i - 1][1]) / Math.max(1, s[i][0] - s[i - 1][0])); return Math.round(m * 100) / 100; };
    const min = (s) => Math.min(...s.map((x) => x[1]));
    const max = (s) => Math.max(...s.map((x) => x[1]));
    const after = a.filter((x) => x[0] >= tp);
    const tStart = after.find((x) => x[1] < 699)?.[0];
    const tMin = after.find((x) => x[1] <= 125)?.[0];
    // The re-press: the weight at the moment the press settles (no jump: the first sample after it is within one frame's travel of the one before).
    R.numeral[width] = { fromRest: { min: min(a), max: max(a), maxFrameJump: jumps(a), msToHairline: tMin !== undefined && tStart !== undefined ? tMin - tStart : null, samples: a.length }, rePress: { min: min(b), max: max(b), maxFrameJump: jumps(b), samples: b.length } };
    check(`hold dips to the hairline then rises to the heavy end ${width}`, min(a) <= 125 && max(a) >= 880, R.numeral[width].fromRest);
    check(`dip takes about 200 ms ${width}`, R.numeral[width].fromRest.msToHairline > 120 && R.numeral[width].fromRest.msToHairline < 330, R.numeral[width].fromRest.msToHairline);
    check(`no jump above 3.8 units/ms, from rest ${width}`, jumps(a) <= 3.8, jumps(a));
    check(`no jump above 3.8 units/ms on a re-press during the snap-back ${width}`, jumps(b) <= 3.8, jumps(b));
    await ctx.close();
  }
  await save('numeral.json');
}

/* ------------------------------------------------------------------- sweep */
if (ONLY.includes('sweep')) {
  R.sweep = {};
  for (const width of [1024, 1280, 1440]) {
    const { ctx, page } = await open(browser, { path: '/t/swiss/about/', width, scheme: 'light', height: 900 });
    const mode = await page.evaluate(() => ({ desk: matchMedia('(min-width: 1280px)').matches, live: document.querySelector('.sw-birch')?.hasAttribute('data-live') }));
    const secs = await page.evaluate(() => { const s = document.querySelector('section.founder').getBoundingClientRect(); const t = document.querySelector('h1.title').getBoundingClientRect(); return { founderTop: s.top + scrollY, founderH: s.height, titleH: t.height, vh: innerHeight }; });
    // Five offsets: spine mode crosses the founder section; title mode scrolls the title away.
    const offsets = mode.desk
      ? [0.1, 0.3, 0.5, 0.7, 0.9].map((p) => secs.founderTop - secs.vh + p * (secs.vh + secs.founderH))
      : [0, 0.25, 0.5, 0.75, 1].map((p) => p * secs.titleH);
    const rows = [];
    for (const [i, y] of offsets.entries()) {
      await page.evaluate((y) => scrollTo(0, y), Math.max(0, Math.round(y)));
      await page.waitForTimeout(350);
      const cut = await page.evaluate(() => {
        const b = document.querySelector('.sw-birch');
        const lines = [...document.querySelectorAll('h1.title .ln')];
        return {
          spine: b ? b.style.getPropertyValue('--sw-bwdth') || `rest ${getComputedStyle(b).getPropertyValue('--sw-bwdth').trim()}` : null,
          title: lines.map((l) => l.style.getPropertyValue('--sw-d') || `rest ${getComputedStyle(l).getPropertyValue('--sw-d').trim()}`),
          scrollY: Math.round(scrollY),
        };
      });
      rows.push({ offset: Math.round(y), ...cut });
      await page.screenshot({ path: join(D, `sweep-${width}-${i + 1}.png`) });
    }
    R.sweep[width] = { mode, rows };
    const spineVals = rows.map((r) => parseFloat(String(r.spine).replace('rest ', '')));
    const titleVals = rows.map((r) => parseFloat(String(r.title[0]).replace('rest ', '')));
    if (mode.desk) check(`spine sweeps at ${width}`, Math.max(...spineVals) > Math.min(...spineVals) + 20, spineVals);
    else {
      check(`the spine stays at its rest cut at ${width} and the title narrows`, new Set(spineVals).size === 1 && Math.min(...titleVals) < Math.max(...titleVals) - 15, { spineVals, titleVals });
      check(`the spine is not live at ${width}`, mode.live === false, mode);
    }
    await ctx.close();
  }
  await save('sweep.json');
}

/* ------------------------------------------------------------------ resize */
if (ONLY.includes('resize')) {
  R.resize = {};
  for (const [label, path, w0] of [['spine-1440', '/t/swiss/about/', 1440], ['title-1024', '/t/swiss/about/', 1024]]) {
    const { ctx, page } = await open(browser, { path, width: w0, scheme: 'light', height: 900 });
    const secs = await page.evaluate(() => { const s = document.querySelector('section.founder').getBoundingClientRect(); const t = document.querySelector('h1.title').getBoundingClientRect(); return { founderTop: s.top + scrollY, founderH: s.height, titleH: t.height, vh: innerHeight }; });
    const y = w0 >= 1280 ? secs.founderTop - secs.vh + 0.5 * (secs.vh + secs.founderH) : secs.titleH * 0.6;
    await page.evaluate((y) => scrollTo(0, y), Math.round(y));
    await page.waitForTimeout(500);
    await page.evaluate(() => {
      const b = document.querySelector('.sw-birch');
      const l = document.querySelector('h1.title .ln');
      window.__s = [];
      window.__on = true;
      const t0 = performance.now();
      const read = () => (innerWidth >= 1280 ? b.style.getPropertyValue('--sw-bwdth') : l.style.getPropertyValue('--sw-d'));
      const tick = () => { if (!window.__on) return; window.__s.push([Math.round(performance.now() - t0), innerWidth, read()]); requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    });
    const start = await page.evaluate(() => (innerWidth >= 1280 ? document.querySelector('.sw-birch').style.getPropertyValue('--sw-bwdth') : document.querySelector('h1.title .ln').style.getPropertyValue('--sw-d')));
    // A window-resize drag: eight small steps in the same breakpoint band.
    for (let i = 0; i < 8; i++) { await page.setViewportSize({ width: w0 + (i % 2 ? 12 : -12) * (i + 1) / 2 | 0, height: 900 }); await page.waitForTimeout(40); }
    await page.waitForTimeout(250);
    const s = await page.evaluate(() => { window.__on = false; return window.__s; });
    const empty = s.filter((x) => x[2] === '' || x[2] === undefined);
    R.resize[label] = { start, frames: s.length, framesAtRestCut: empty.length, sample: s.slice(0, 40) };
    check(`the sweep never reads the rest cut during a resize (${label})`, start !== '' && empty.length === 0, { start, empty: empty.length });
    await ctx.close();
  }
  await save('resize.json');
}

/* -------------------------------------------------------------- signifiers */
if (ONLY.includes('signifiers')) {
  R.signifiers = {};
  const cur = (page, x, y) => page.evaluate(([x, y]) => getComputedStyle(document.elementFromPoint(x, y) ?? document.body).cursor, [x, y]);
  {
    // Services numeral: over the glyph, over the box's empty columns, off it.
    const { ctx, page } = await open(browser, { path: '/t/swiss/services/', width: 1440, scheme: 'light' });
    await page.evaluate(() => document.querySelector('.steps .num').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(400);
    const geo = await page.evaluate(() => {
      const n = document.querySelector('.steps .num');
      const rg = document.createRange(); rg.selectNodeContents(n);
      const g = rg.getBoundingClientRect(); const b = n.getBoundingClientRect();
      return { glyph: [g.left, g.top, g.right, g.bottom], box: [b.left, b.top, b.right, b.bottom] };
    });
    const gx = (geo.glyph[0] + geo.glyph[2]) / 2, gy = (geo.glyph[1] + geo.glyph[3]) / 2;
    const ex = geo.glyph[2] + 40, ey = gy; // inside the box, past the glyph and its 8px margin
    const read = async (x, y) => { await page.mouse.move(x, y); await page.waitForTimeout(80); return page.evaluate(() => { const n = document.querySelector('.steps .num'); const e = getComputedStyle(n); return { cursor: e.cursor, weight: e.fontWeight, underline: e.textDecorationLine, hot: n.hasAttribute('data-hot') }; }); };
    const film = await startFilm(page);
    const over = await read(gx, gy);
    const empty = await read(ex, ey);
    const off = await read(5, 5);
    const frames = await film.stop();
    R.signifiers.numeral = { geo, over, emptyColumns: empty, off, inBox: ex < geo.box[2] };
    check('numeral: pointer and an underline rule over the digit, the weight unchanged', over.cursor === 'pointer' && over.underline === 'underline' && over.weight === '700', over);
    check('numeral: default cursor and no rule over the box empty columns', empty.cursor !== 'pointer' && empty.underline === 'none' && empty.weight === '700' && R.signifiers.numeral.inBox, empty);
    check('numeral: nothing off it', off.cursor !== 'pointer' && off.underline === 'none' && off.weight === '700', off);
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, { path: '/t/swiss/contact/sent/', width: 1440, scheme: 'light' });
    const g = await page.evaluate(() => { const r = document.querySelector('.sent .stop').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height * 0.8]; });
    await page.mouse.move(g[0], g[1]);
    await page.waitForTimeout(100);
    const over = await page.evaluate(() => { const s = document.querySelector('.sent .stop'); return { cursor: getComputedStyle(s).cursor, outline: getComputedStyle(s, '::after').outlineStyle + ' ' + getComputedStyle(s, '::after').outlineWidth + ' ' + getComputedStyle(s, '::after').outlineColor }; });
    await page.mouse.move(5, 5);
    await page.waitForTimeout(100);
    const off = await page.evaluate(() => getComputedStyle(document.querySelector('.sent .stop'), '::after').outlineStyle);
    await page.mouse.move(g[0], g[1]);
    await page.waitForTimeout(100);
    await page.screenshot({ path: join(D, 'signifier-stop-hover.png') });
    R.signifiers.stop = { over, off };
    check('stop: grab cursor and a 1px ink keyline over it', over.cursor === 'grab' && /solid 1px/.test(over.outline) && off === 'none', { over, off });
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, { path: '/t/swiss/about/', width: 1440, scheme: 'light', height: 900 });
    const secs = await page.evaluate(() => { const s = document.querySelector('section.founder').getBoundingClientRect(); return { top: s.top + scrollY, h: s.height }; });
    await page.evaluate((y) => scrollTo(0, y), Math.round(secs.top - 200));
    await page.waitForTimeout(500);
    const b = await page.evaluate(() => { const r = document.querySelector('.sw-birch').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2, r.width]; });
    const before = await page.evaluate(() => { const e = document.querySelector('.sw-birch'); const r = e.getBoundingClientRect(); return { rect: [r.left, r.top, r.width, r.height], bg: getComputedStyle(e).backgroundColor, cursor: getComputedStyle(e).cursor }; });
    await page.mouse.move(b[0], b[1]);
    await page.waitForTimeout(120);
    const over = await page.evaluate(() => { const e = document.querySelector('.sw-birch'); const r = e.getBoundingClientRect(); return { rect: [r.left, r.top, r.width, r.height], bg: getComputedStyle(e).backgroundColor, color: getComputedStyle(e).color, cursor: getComputedStyle(e).cursor }; });
    await page.screenshot({ path: join(D, 'signifier-birch-hover.png') });
    await page.mouse.move(700, 300);
    await page.waitForTimeout(120);
    const off = await page.evaluate(() => { const e = document.querySelector('.sw-birch'); return { bg: getComputedStyle(e).backgroundColor, cursor: getComputedStyle(e).cursor }; });
    R.signifiers.birch = { before, over, off };
    check('birch: ns-resize and an ink block with paper type over it, box unmoved', over.cursor === 'ns-resize' && over.bg !== before.bg && JSON.stringify(over.rect) === JSON.stringify(before.rect) && off.bg === before.bg, { before, over, off });
    await ctx.close();
  }
  {
    // Fields: no cursor and no hover (the brief names the numeral, the stop and the Birch only).
    const { ctx, page } = await open(browser, { path: '/t/swiss/', width: 1440, scheme: 'light' });
    await page.evaluate(() => document.querySelector('.closer').scrollIntoView({ block: 'center' }));
    await page.waitForTimeout(300);
    const r = await page.evaluate(() => { const b = document.querySelector('.closer').getBoundingClientRect(); return [b.left + 6, b.top + 6]; });
    await page.mouse.move(r[0], r[1]);
    R.signifiers.field = { cursor: await cur(page, r[0], r[1]) };
    await ctx.close();
  }
  await save('signifiers.json');
}

/* ------------------------------------------------------------------- beats */
if (ONLY.includes('beats')) {
  R.beats = {};
  const CASES = [
    { id: 'numerals', path: '/t/swiss/services/', sel: '.steps .num', run: 'numerals' },
    { id: 'stop', path: '/t/swiss/contact/sent/', sel: '.sent .stop', run: 'stop' },
  ];
  for (const c of CASES) {
    for (const scheme of SCHEMES) {
      const { ctx, page } = await open(browser, { path: c.path, width: 390, scheme });
      // A fresh visit, filmed from its first frame: the stop's beat comes 400 ms after the page loads (it is in view at once), so the
      // sampler goes in before the page's scripts do, the film starts before the reload, and module memory is new.
      await page.addInitScript((id) => {
        window.__lastScroll = performance.now();
        addEventListener('scroll', () => { window.__lastScroll = performance.now(); }, { passive: true });
        window.__b = { start: null, end: null, ever: 0, vals: [] };
        const rd = () => {
          if (id === 'numerals') { const n = document.querySelector('.steps .num'); return n ? parseFloat(getComputedStyle(n).fontWeight) : null; }
          const s = document.querySelector('.sent .stop');
          if (!s) return null;
          const tr = getComputedStyle(s).translate;
          return tr === 'none' ? 0 : parseFloat(tr);
        };
        let rest = null;
        const t0 = performance.now();
        const tick = () => {
          const v = rd();
          if (v !== null && rest === null) rest = v;
          const on = v !== null && Math.abs(v - rest) > 0.5;
          if (on && window.__b.start === null) { window.__b.start = performance.now(); window.__b.sinceScroll = performance.now() - window.__lastScroll; window.__b.ever++; }
          if (on) { window.__b.end = performance.now(); window.__b.vals.push([Math.round(performance.now() - t0), Math.round(v * 10) / 10]); }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, c.id);
      const film = await startFilm(page);
      await page.reload({ waitUntil: 'load' });
      await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
      if (c.id === 'numerals') await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), c.sel);
      await page.waitForTimeout(3600);
      const frames = await film.stop();
      console.log(`  film ${c.id} ${scheme}: ${frames.length} frames, last at +${frames.at(-1)?.ms} ms`);
      const res = await page.evaluate(() => window.__b);
      console.log('  beat state', JSON.stringify({ ever: res.ever, n: res.vals.length, first: res.vals[0], last: res.vals.at(-1) }));
      const box = await boxOf(page, c.sel, 60);
      const times = [];
      const lastMs = frames.at(-1)?.ms ?? 3600;
      for (let m = 0; m <= lastMs; m += Math.max(250, Math.round(lastMs / 11))) times.push(m);
      if (frames.length) await strip(pickAt(frames, times), join(D, `beat-${c.id}-${scheme}.png`), `swiss ${c.id} touch beat at 390 (${scheme}): film from the scroll to rest`, { cols: 6, cellW: 260, box, vpWidth: 390 });
      const range = res.vals.length ? [Math.min(...res.vals.map((v) => v[1])), Math.max(...res.vals.map((v) => v[1]))] : null;
      R.beats[`${c.id}-${scheme}`] = { beats: res.ever, sinceScrollMs: res.start ? Math.round(res.sinceScroll) : null, durationMs: res.start ? Math.round(res.end - res.start) : null, range };
      check(`${c.id} beat plays once on touch (${scheme})`, res.ever === 1, R.beats[`${c.id}-${scheme}`]);
      check(`${c.id} beat starts at least 400 ms after the last scroll (${scheme})`, res.start && res.sinceScroll >= 395, R.beats[`${c.id}-${scheme}`]);
      // Then scroll away and back: no second beat.
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(500);
      await page.evaluate((sel) => document.querySelector(sel).scrollIntoView({ block: 'center' }), c.sel);
      await page.waitForTimeout(1800);
      const again = await page.evaluate(() => window.__b.ever);
      check(`${c.id} beat does not repeat (${scheme})`, again === 1, again);
      await ctx.close();
    }
  }
  // A pressed field never beats: park on the closer for 3 s and watch the attribute.
  {
    const { ctx, page } = await open(browser, { path: '/t/swiss/', width: 390, scheme: 'light' });
    await page.evaluate(() => { window.__f = 0; new MutationObserver(() => { window.__f++; }).observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-sw-flip'] }); document.querySelector('.closer').scrollIntoView({ block: 'center' }); });
    await page.waitForTimeout(3000);
    const n = await page.evaluate(() => window.__f);
    check('no beat on a swiss field (no flip without a press)', n === 0, n);
    await ctx.close();
  }
  await save('beats.json');
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED\n${fails.join('\n')}` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
