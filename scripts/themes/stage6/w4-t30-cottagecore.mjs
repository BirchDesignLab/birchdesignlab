/**
 * Stage 6 wave 4, task 30: cottagecore's closing C items, measured and filmed (critique B1, B2, B4, A1). Every arrival
 * is through the real switcher (w4-t30-lib arrive). Sections (ONLY=sheets,geo,clock,signifiers,beats):
 *
 *   sheets      Sent at 820, 700, 640, 600 and 390, Home at 1000, 820 and 390, whole page, both schemes.
 *   geo         Sent 600 to 820: the clock's right edge is left of the envelope, the stamp's left edge right of it, the
 *               head about 45% down the envelope, the stamp's base about 80% down, nothing overflows sideways, the band
 *               between the envelope and the h1; below 600 (390) the toys are a row under the envelope. Writes geo.json.
 *   clock       the clock tapped in light at 1440, 820 and 390 (Home), and Sent at 820: a timestamped strip of the puffs
 *               (small to full, staggered). Writes the strips.
 *   signifiers  1440 mouse, a table: the cursor under the pointer and the hover response of the clock, the stamp, the
 *               needle, the sampler is grandmillennial's (w4-t30-gm.mjs). Writes signifiers.json.
 *   beats       390 touch: the clock (Home), the stamp (Contact) and the needle (About), once each: a strip from the
 *               stillness timer to the end of the beat, the start measured from the last scroll (at least 400 ms), no
 *               beat while a form field has focus, none mid-scroll, never twice. Writes beats.json.
 *
 *   node scripts/themes/snap.mjs --name s6-w4-t30 --reuse --port 4470 -- node scripts/themes/stage6/w4-t30-cottagecore.mjs
 * Output: .out/stage6/w4/t30/cc/
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, arrive, startFilm, strip, pickAt, boxOf, OUT } from './w4-t30-lib.mjs';
import { arriveAbout } from './w3-t27-lib.mjs';

const ONLY = (process.env.ONLY || 'sheets,geo,clock,signifiers,beats').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const D = join(OUT, 'cc');
await mkdir(D, { recursive: true });
const { browser, renderer } = await launch();
const R = { renderer };
const fails = [];
const check = (name, ok, detail) => {
  if (!ok) fails.push(`${name} ${JSON.stringify(detail)}`);
  console.log(ok ? 'ok  ' : 'FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
};
const HOME = '/t/cottagecore/';
const CONTACT = '/t/cottagecore/contact/';
const SENT = '/t/cottagecore/contact/sent/';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* ------------------------------------------------------------------ sheets */
if (ONLY.includes('sheets')) {
  for (const scheme of SCHEMES) {
    for (const width of [820, 700, 640, 600, 390]) {
      const { ctx, page } = await arrive(browser, { path: SENT, width, scheme });
      await page.screenshot({ path: join(D, `sheet-sent-${scheme}-${width}.png`), fullPage: true });
      await ctx.close();
    }
    for (const width of [1000, 820, 390]) {
      const { ctx, page } = await arrive(browser, { path: HOME, width, scheme });
      await page.evaluate(() => document.querySelector('.closer').scrollIntoView({ block: 'end' }));
      await sleep(900);
      await page.screenshot({ path: join(D, `sheet-home-${scheme}-${width}.png`), fullPage: true });
      await ctx.close();
    }
  }
}

/* --------------------------------------------------------------------- geo */
if (ONLY.includes('geo')) {
  R.geo = {};
  for (const scheme of SCHEMES) {
    for (const width of [820, 760, 700, 640, 600, 599, 390]) {
      const { ctx, page } = await arrive(browser, { path: SENT, width, scheme });
      const g = await page.evaluate(() => {
        const rc = (s) => { const r = document.querySelector(s).getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top + scrollY, b: r.bottom + scrollY, w: r.width, h: r.height }; };
        const env = rc('.envelope'), clock = rc('.sent-clock'), stamp = rc('.sent-stamp'), h1 = rc('.words h1');
        // the unrotated envelope box: width and height from the layout, the rotation only turns it about its centre
        const e = document.querySelector('.envelope');
        const ew = e.offsetWidth, eh = e.offsetHeight, ecx = (env.l + env.r) / 2, ecy = (env.t + env.b) / 2;
        const top = ecy - eh / 2, bottom = ecy + eh / 2, left = ecx - ew / 2, right = ecx + ew / 2;
        return {
          env: { left, right, top, bottom }, clock, stamp, h1,
          headFrac: (clock.t + (46 / 130) * clock.h - top) / eh,
          baseFrac: (stamp.b - top) / eh,
          clockGap: left - clock.r, stampGap: stamp.l - right,
          bandToH1: h1.t - bottom,
          overflowX: document.documentElement.scrollWidth - innerWidth,
          row: clock.t >= bottom - 2 && stamp.t >= bottom - 2,
        };
      });
      R.geo[`${scheme}-${width}`] = g;
      if (width >= 600) {
        check(`geo ${scheme} ${width}: the clock stands in the left gutter (gap to the envelope ${g.clockGap.toFixed(0)}px) and the stamp in the right (${g.stampGap.toFixed(0)}px), nothing overflows`,
          g.clockGap >= 12 && g.clockGap <= 40 && g.stampGap >= 12 && g.stampGap <= 40 && g.clock.l >= 0 && g.stamp.r <= width && g.overflowX <= 0, { clockGap: g.clockGap, stampGap: g.stampGap, overflowX: g.overflowX });
        check(`geo ${scheme} ${width}: the head is ${(g.headFrac * 100).toFixed(0)}% down the envelope (about 45) and the stamp's base ${(g.baseFrac * 100).toFixed(0)}% (about 80)`,
          Math.abs(g.headFrac - 0.45) < 0.1 && Math.abs(g.baseFrac - 0.8) < 0.1, { head: g.headFrac, base: g.baseFrac });
      } else {
        check(`geo ${scheme} ${width}: below 600 the toys keep their row under the envelope`, g.row && g.overflowX <= 0, { row: g.row, overflowX: g.overflowX });
      }
    }
  }
  await writeFile(join(D, 'geo.json'), JSON.stringify(R.geo, null, 1));
}

/* ------------------------------------------------------------------- clock */
if (ONLY.includes('clock')) {
  const tap = async (page, mobile, x, y) => { if (mobile) await page.touchscreen.tap(x, y); else await page.mouse.click(x, y); };
  for (const [name, path, width] of [['home', HOME, 1440], ['home', HOME, 820], ['home', HOME, 390], ['sent', SENT, 820]]) {
    const { ctx, page, mobile } = await arrive(browser, { path, width, scheme: 'light', settle: 1500 });
    await page.evaluate(() => document.querySelector('[data-cc-toy="dandelion"]').scrollIntoView({ block: 'center' }));
    await sleep(2200);
    const [x, y] = await page.evaluate(() => { const r = document.querySelector('[data-cc-toy="dandelion"] .dc-head').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    const box = await boxOf(page, '[data-cc-toy="dandelion"]', 170);
    const film = await startFilm(page);
    await tap(page, mobile, x, y);
    await sleep(4300);
    const frames = await film.stop();
    await strip(pickAt(frames, [0, 150, 300, 500, 800, 1200, 1800, 2600, 3400, 4200]), join(D, `clock-${name}-light-${width}.png`), `clock ${name} light ${width}: tapped at 0, seeds small to full`, { cols: 5, cellW: 330, box, vpWidth: width });
    await ctx.close();
  }
}

/* -------------------------------------------------------------- signifiers */
if (ONLY.includes('signifiers')) {
  R.signifiers = {};
  const cursorAt = (page, x, y) => page.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e ? getComputedStyle(e).cursor : 'none'; }, [x, y]);
  const rows = [];
  // the clock (Home) and the stamp (Contact): the cursor under the head, the hover's own measured change
  for (const [name, path, sel, probe] of [
    ['clock (Home)', HOME, '[data-cc-toy="dandelion"] .dc-head', (el) => getComputedStyle(el).rotate],
    ['stamp (Contact)', CONTACT, '[data-cc-toy="stamp"] .ds-body', (el) => getComputedStyle(el).translate],
  ]) {
    const { ctx, page } = await arrive(browser, { path, width: 1440, scheme: 'light', touch: false });
    await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel);
    await sleep(900);
    const [x, y] = await page.evaluate((s) => { const r = document.querySelector(s).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
    await page.mouse.move(5, 5);
    await sleep(700);
    const before = await page.evaluate(`(${probe.toString()})(document.querySelector(${JSON.stringify(sel)}))`);
    const cursorOff = await cursorAt(page, 5, 5);
    await page.mouse.move(x, y);
    await sleep(900);
    const after = await page.evaluate(`(${probe.toString()})(document.querySelector(${JSON.stringify(sel)}))`);
    const cur = await cursorAt(page, x, y);
    rows.push({ toy: name, cursor: cur, hover: `${before} -> ${after}`, changed: before !== after, bare: cursorOff });
    await ctx.close();
  }
  {
    const env = await arriveAbout(browser, { width: 1440, scheme: 'light', touch: false });
    const { page } = env;
    await page.evaluate(() => document.querySelector('.hoop').scrollIntoView({ block: 'center' }));
    await sleep(900);
    const [x, y] = await page.evaluate(() => { const r = document.querySelector('.needle .nd-body').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
    await page.mouse.move(5, 5);
    await sleep(500);
    const fill = () => page.evaluate(() => getComputedStyle(document.querySelector('.needle .nd-steel')).fill);
    const before = await fill();
    await page.mouse.move(x, y);
    await sleep(500);
    const after = await fill();
    const cur = await cursorAt(page, x, y);
    await page.mouse.down();
    const held = await cursorAt(page, x, y);
    await page.mouse.up();
    rows.push({ toy: 'needle (About)', cursor: `${cur}, grabbing while held: ${held}`, hover: `${before} -> ${after}`, changed: before !== after });
    await env.ctx.close();
  }
  R.signifiers = rows;
  for (const r of rows) console.log(`signifier ${r.toy}: cursor ${r.cursor}; hover ${r.hover}`);
  check('signifiers: every cottagecore toy has its cursor and a hover that changes something', rows.every((r) => /pointer|grab/.test(r.cursor) && r.changed), rows);
  await writeFile(join(D, 'signifiers.json'), JSON.stringify(R.signifiers, null, 1));
}

/* ------------------------------------------------------------------- beats */
if (ONLY.includes('beats')) {
  R.beats = {};
  /** Watch data-nudge on `sel` and scrolls: when the beat starts (ms) and when the page last moved before it. */
  const watch = (page, sel) => page.evaluate((sel) => {
    const el = document.querySelector(sel);
    window.__w = { sets: [], lastScroll: performance.now(), scrolls: 0 };
    addEventListener('scroll', () => { window.__w.lastScroll = performance.now(); window.__w.scrolls++; }, { passive: true });
    new MutationObserver(() => { if (el.hasAttribute('data-nudge')) window.__w.sets.push({ t: performance.now(), sinceScroll: Math.round(performance.now() - window.__w.lastScroll) }); }).observe(el, { attributes: true, attributeFilter: ['data-nudge'] });
  }, sel);
  const read = (page) => page.evaluate(() => ({ sets: window.__w.sets, scrolls: window.__w.scrolls, now: performance.now() }));

  const toys = [
    { name: 'clock', path: HOME, sel: '[data-cc-toy="dandelion"]', arrive: (o) => arrive(browser, o) },
    { name: 'stamp', path: CONTACT, sel: '[data-cc-toy="stamp"]', arrive: (o) => arrive(browser, o) },
    { name: 'needle', path: '/t/cottagecore/about/', sel: '[data-cc-toy="needle"]', arrive: (o) => arriveAbout(browser, { width: o.width, scheme: o.scheme, touch: true }) },
  ];
  for (const t of toys) {
    const env = await t.arrive({ path: t.path, width: 390, scheme: 'light', touch: true, settle: 1200 });
    const { page } = env;
    await watch(page, t.sel);
    // scroll past it in steps (never still for 400 ms until the end): it must not fire mid-scroll
    const y = await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return r.top + scrollY + r.height / 2 - innerHeight / 2; }, t.sel);
    for (let i = 1; i <= 8; i++) { await page.evaluate((v) => scrollTo(0, v), (y * i) / 8); await sleep(110); }
    const during = await read(page);
    const box = await boxOf(page, t.sel, 120);
    const film = await startFilm(page);
    await sleep(2900);
    const frames = await film.stop();
    const after = await read(page);
    const first = after.sets[0];
    await strip(pickAt(frames, [0, 300, 600, 900, 1200, 1500, 1800, 2100, 2400, 2800]), join(D, `beat-${t.name}-390.png`), `${t.name} touch beat at 390: filmed from the end of the scroll; the beat starts at least 400 ms after the last scroll`, { cols: 5, cellW: 300, box, vpWidth: 390 });
    const ok = during.sets.length === 0 && after.sets.length === 1 && first && first.sinceScroll >= 395;
    check(`beat ${t.name}: none mid-scroll, one beat once the page was still 400 ms (it started ${first ? first.sinceScroll : 'never'} ms after the last scroll), never twice`, !!ok, { duringScroll: during.sets.length, total: after.sets.length, sinceScroll: first?.sinceScroll });
    // scroll away and back: it does not repeat
    await page.evaluate(() => scrollTo(0, 0));
    await sleep(900);
    await page.evaluate((v) => scrollTo(0, v), y);
    await sleep(2200);
    const again = await read(page);
    check(`beat ${t.name}: scrolling away and back does not repeat it`, again.sets.length === 1, { total: again.sets.length });
    R.beats[t.name] = { sinceScroll: first?.sinceScroll, total: again.sets.length };
    await env.ctx.close();
  }
  // a form field with focus holds the stamp's beat back on Contact
  {
    const { ctx, page } = await arrive(browser, { path: CONTACT, width: 390, scheme: 'light', touch: true, settle: 1200 });
    await watch(page, '[data-cc-toy="stamp"]');
    await page.evaluate(() => document.querySelector('#cf-name, input[name="name"], input').focus());
    await page.evaluate(() => document.querySelector('[data-cc-toy="stamp"]').scrollIntoView({ block: 'center' }));
    await sleep(2200);
    const held = await read(page);
    await page.evaluate(() => document.activeElement.blur());
    await sleep(1500);
    const free = await read(page);
    check('beat stamp: no beat while a form field has focus; it plays once the field lets go', held.sets.length === 0 && free.sets.length === 1, { whileFocused: held.sets.length, afterBlur: free.sets.length });
    await ctx.close();
  }
  await writeFile(join(D, 'beats.json'), JSON.stringify(R.beats, null, 1));
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED:\n${fails.join('\n')}` : '\nall checks ok');
process.exit(fails.length ? 1 : 0);
