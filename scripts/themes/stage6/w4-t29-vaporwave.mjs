/**
 * Stage 6 wave 4, task 29: the vaporwave closing items, measured and filmed.
 * Sections (ONLY=elevator,props,swipes,remote,drives,phonewins,signifiers,beats):
 *
 *   elevator    B1 and 1F at 390 and 820 (the window is brought into view) and
 *               at 1440 (no scroll: the window is off screen there too, the desktop is
 *               unchanged), both schemes: the page scrolled so the plaque
 *               is in view and the target window is not, the key
 *               pressed with a real click or tap, scrollY and the window's rect
 *               measured before and after the smooth scroll, a strip. 2F
 *               scrolls nothing. Writes elevator.json.
 *   props       the kiosk props at 899, 900, 901, 902, 820 and 1440: image width,
 *               and the figure's size (ball across, Venus tall) from the image
 *               alpha. They never get smaller from 900 to 901. Writes props.json.
 *   swipes      390 touch: a swipe at every angle from 10 to 80 degrees on the
 *               Home hero (real CDP touch): does the page scroll or does the deck
 *               scan? Never neither. Writes swipes.json.
 *   remote      1440 mouse and keys: a vertical drag off the button cancels the
 *               click; Alt+Left, Ctrl+Right and Shift+Right are not the remote's
 *               (not prevented, no scan); a plain arrow scans. Writes remote.json.
 *   drives      Sent, My Computer open, light and dark at 1440 and 390: the drive
 *               glyphs' fills against the window face (contrast), a crop. Writes
 *               drives.json.
 *   phonewins   Sent at 390x844 (and 360x740): each window opened: its top against
 *               the icon row's bottom (no overlap), a sheet. Writes phonewins.json.
 *   signifiers  1440 mouse: the cursor and hover of the remote, the Sent icons, the
 *               elevator keys and the window title bars (and About's, which have
 *               none), as a table. Writes signifiers.json.
 *   beats       390 touch: the remote's, the Sent icons' and the elevator's beat,
 *               once each: timed strips from the stillness timer to the end, the
 *               start measured from the last scroll (at least 400 ms), counted.
 *
 *   node scripts/themes/snap.mjs --name s6-w4-t29 --reuse --port 4470 -- node scripts/themes/stage6/w4-t29-vaporwave.mjs
 * Output: .out/stage6/w4/t29/vaporwave/
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { launch, open, startFilm, strip, pickAt, boxOf, OUT, swipe, pixelReader } from './w4-t29-lib.mjs';

const ONLY = (process.env.ONLY || 'elevator,props,swipes,remote,drives,phonewins,signifiers,beats').split(',');
const SCHEMES = (process.env.SCHEMES || 'dark,light').split(',');
const D = join(OUT, 'vaporwave');
await mkdir(D, { recursive: true });
const { browser, renderer } = await launch();
const R = { renderer };
const fails = [];
const check = (name, ok, detail) => {
  if (!ok) fails.push(`${name} ${JSON.stringify(detail)}`);
  console.log(ok ? 'ok  ' : 'FAIL', name, detail === undefined ? '' : JSON.stringify(detail));
};
const save = (name) => writeFile(join(D, `${name}.json`), JSON.stringify(R[name], null, 1));
const press = async (page, mobile, sel) => {
  const b = await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  if (mobile) await page.touchscreen.tap(b[0], b[1]);
  else { await page.mouse.move(b[0], b[1]); await page.mouse.down(); await page.mouse.up(); }
};

/* ---------------------------------------------------------------- elevator */
if (ONLY.includes('elevator')) {
  R.elevator = {};
  for (const width of [390, 820, 1440]) {
    for (const scheme of SCHEMES) {
      for (const floor of [0, 1, 2]) {
        const key = `${['B1', '1F', '2F'][floor]}-${width}-${scheme}`;
        const { ctx, page, mobile } = await open(browser, { path: '/t/vaporwave/', width, scheme });
        // The plaque in view, the way a visitor reaches it.
        await page.evaluate(() => document.querySelector('.elevator').scrollIntoView({ block: 'center' }));
        await page.waitForTimeout(700);
        const before = await page.evaluate((floor) => {
          const d = document.querySelector(`.door-${floor}`);
          const r = d ? d.getBoundingClientRect() : null;
          return { scrollY: Math.round(scrollY), vh: innerHeight, door: r ? [Math.round(r.top), Math.round(r.bottom)] : null, off: r ? r.bottom <= 0 || r.top >= innerHeight : null };
        }, floor);
        const film = await startFilm(page);
        await press(page, mobile, `[data-floor="${floor}"]`);
        await page.waitForTimeout(2600);
        const frames = await film.stop();
        const after = await page.evaluate((floor) => {
          const d = document.querySelector(`.door-${floor}`);
          const r = d ? d.getBoundingClientRect() : null;
          const cap = d ? !d.querySelector(':scope > .vw-win-bar')?.classList.contains('inactive') : null;
          return { scrollY: Math.round(scrollY), door: r ? [Math.round(r.top), Math.round(r.bottom)] : null, inView: r ? r.bottom > 0 && r.top < innerHeight : null, centreOff: r ? Math.round((r.top + r.bottom) / 2 - innerHeight / 2) : null, active: cap, readout: document.querySelector('[data-floor-readout]').textContent };
        }, floor);
        R.elevator[key] = { before, after };
        await strip(pickAt(frames, [0, 400, 800, 1200, 1600, 2000, 2400]), join(D, `elevator-${key}.png`), `elevator ${key}: the key pressed at +0 (the plaque in view)`, { cols: 7, cellW: 200 });
        if (floor === 2) {
          check(`2F scrolls nothing (${key})`, after.scrollY === before.scrollY, { before: before.scrollY, after: after.scrollY });
        } else if (width > 900) {
          // The desktop is unchanged (fix round 1): the window is off screen here too, and the page stays put.
          check(`the desktop scrolls nothing (${key})`, after.scrollY === before.scrollY && after.active, { before, after });
        } else if (before.off) {
          check(`the off-screen window scrolls into view, centred (${key})`, after.inView && Math.abs(after.centreOff) <= 6 && after.active, { before, after });
        } else {
          check(`a window already in view is left where it is (${key})`, after.scrollY === before.scrollY && after.active, { before, after });
        }
        await ctx.close();
      }
    }
  }
  // A window already in view is left where it is, at every size: the visitor scrolled to the window, the key is
  // pressed without moving the page (a script click), and nothing scrolls.
  for (const width of [390, 820, 1440]) {
    for (const floor of [0, 1]) {
      const key = `inview-${['B1', '1F'][floor]}-${width}`;
      const { ctx, page } = await open(browser, { path: '/t/vaporwave/', width, scheme: 'dark' });
      await page.evaluate((floor) => document.querySelector(`.door-${floor}`).scrollIntoView({ block: 'center' }), floor);
      await page.waitForTimeout(700);
      const y0 = await page.evaluate(() => Math.round(scrollY));
      await page.evaluate((floor) => document.querySelector(`[data-floor="${floor}"]`).click(), floor);
      await page.waitForTimeout(1800);
      const y1 = await page.evaluate(() => Math.round(scrollY));
      const active = await page.evaluate((floor) => !document.querySelector(`.door-${floor} > .vw-win-bar`).classList.contains('inactive'), floor);
      R.elevator[key] = { y0, y1, active };
      check(`a window in view is left where it is (${key})`, y0 === y1 && active, R.elevator[key]);
      await ctx.close();
    }
  }
  await save('elevator');
}

/* ------------------------------------------------------------------- props */
if (ONLY.includes('props')) {
  R.props = {};
  for (const scheme of ['dark']) {
    for (const width of [820, 899, 900, 901, 902, 1100, 1440]) {
      const { ctx, page } = await open(browser, { path: '/t/vaporwave/', width, scheme, height: 1000 });
      await page.evaluate(() => document.querySelector('.kiosk-stand').scrollIntoView({ block: 'center' }));
      await page.waitForTimeout(500);
      const m = await page.evaluate(() => {
        const rd = (e) => { const r = e.getBoundingClientRect(); return [Math.round(r.left * 10) / 10, Math.round(r.top * 10) / 10, Math.round(r.width * 10) / 10, Math.round(r.height * 10) / 10]; };
        const ball = document.querySelector('.kiosk-prop:not(.kiosk-prop-venus)');
        const venus = document.querySelector('.kiosk-prop-venus');
        const stand = document.querySelector('.kiosk-stand');
        return { ball: rd(ball), venus: rd(venus), stand: rd(stand), sw: document.documentElement.scrollWidth, vw: innerWidth };
      });
      R.props[width] = m;
      console.log(`  ${width}: ball ${m.ball[2]}px, venus ${m.venus[2]}px, scrollWidth ${m.sw}/${m.vw}`);
      check(`no sideways scroll at ${width}`, m.sw <= m.vw, m);
      if (width === 900 || width === 901) await page.screenshot({ path: join(D, `props-${width}.png`) });
      await ctx.close();
    }
  }
  const a = R.props[900], b = R.props[901];
  check('the ball does not get smaller from 900 to 901', b.ball[2] >= a.ball[2] - 0.5, { a: a.ball[2], b: b.ball[2] });
  check('Venus does not get smaller from 900 to 901', b.venus[2] >= a.venus[2] - 0.5, { a: a.venus[2], b: b.venus[2] });
  check('the props never shrink from 900 on: 900, 901, 902, 1100, 1440', [900, 901, 902, 1100, 1440].every((w, i, arr) => i === 0 || (R.props[w].ball[2] >= R.props[arr[i - 1]].ball[2] - 0.5 && R.props[w].venus[2] >= R.props[arr[i - 1]].venus[2] - 0.5)));
  await save('props');
}

/* ------------------------------------------------------------------ swipes */
if (ONLY.includes('swipes')) {
  R.swipes = {};
  const { ctx, page, cdp } = await open(browser, { path: '/t/vaporwave/', width: 390, scheme: 'dark' });
  await page.evaluate(() => {
    window.__modes = new Set();
    const hero = document.querySelector('.hero');
    new MutationObserver(() => window.__modes.add(hero.dataset.deckMode)).observe(hero, { attributes: true, attributeFilter: ['data-deck-mode'] });
  });
  const rows = [];
  for (const deg of [10, 20, 30, 33, 34, 36, 40, 44, 45, 46, 50, 56, 60, 70, 80]) {
    await page.evaluate(() => { scrollTo(0, 0); window.__modes = new Set(); });
    await page.waitForTimeout(500);
    const y0 = await page.evaluate(() => scrollY);
    // Start low in the hero, away from the remote button, and go up and to the right.
    await swipe(page, cdp, 120, 560, deg, 110, 10);
    await page.waitForTimeout(700);
    const y1 = await page.evaluate(() => scrollY);
    const modes = await page.evaluate(() => [...window.__modes]);
    const scrolled = Math.abs(y1 - y0) > 8;
    const scanned = modes.includes('ff') || modes.includes('rew');
    rows.push({ deg, scrolled, scanned, scrollDelta: Math.round(y1 - y0), modes });
    check(`a swipe at ${deg} degrees scrolls or scans, never neither`, scrolled || scanned, rows.at(-1));
    // Back to the top and let the deck settle.
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(900);
  }
  R.swipes = rows;
  await ctx.close();
  await save('swipes');
}

/* ------------------------------------------------------------------ remote */
if (ONLY.includes('remote')) {
  R.remote = {};
  const { ctx, page } = await open(browser, { path: '/t/vaporwave/', width: 1440, scheme: 'dark' });
  const mode = () => page.evaluate(() => ({ mode: document.querySelector('.hero').dataset.deckMode, pressed: document.querySelector('[data-deck]').getAttribute('aria-pressed') }));
  const b = await page.evaluate(() => { const r = document.querySelector('[data-deck]').getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; });
  // A vertical drag off the button, released away from it: no click.
  await page.mouse.move(b[0], b[1]);
  await page.mouse.down();
  await page.mouse.move(b[0], b[1] + 30, { steps: 4 });
  await page.mouse.move(b[0], b[1] + 140, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(300);
  R.remote.verticalDragOff = await mode();
  check('a vertical drag off the button does not pause', R.remote.verticalDragOff.mode === 'play' && R.remote.verticalDragOff.pressed === 'false', R.remote.verticalDragOff);
  // A plain click still pauses, and again resumes.
  await page.mouse.click(b[0], b[1]);
  await page.waitForTimeout(200);
  R.remote.click = await mode();
  check('a click pauses', R.remote.click.mode === 'pause', R.remote.click);
  await page.mouse.click(b[0], b[1]);
  await page.waitForTimeout(200);
  check('a second click resumes', (await mode()).mode === 'play');
  // A horizontal drag still cancels the click (as built).
  await page.mouse.move(b[0], b[1]);
  await page.mouse.down();
  await page.mouse.move(b[0] + 90, b[1] + 2, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(900);
  R.remote.horizontalDrag = await mode();
  check('a horizontal drag scans and ends at play, not pause', R.remote.horizontalDrag.mode === 'play' && R.remote.horizontalDrag.pressed === 'false', R.remote.horizontalDrag);
  // Keys: with a modifier it is the browser's or the page's, not the remote's.
  await page.focus('[data-deck]');
  const keyed = async (combo) => {
    await page.evaluate(() => { window.__kd = null; document.querySelector('[data-deck]').addEventListener('keydown', (e) => { window.__kd = e.defaultPrevented; }, { once: true }); window.__modes = new Set(); const hero = document.querySelector('.hero'); new MutationObserver(() => window.__modes.add(hero.dataset.deckMode)).observe(hero, { attributes: true, attributeFilter: ['data-deck-mode'] }); });
    await page.keyboard.press(combo);
    await page.waitForTimeout(150);
    const r = await page.evaluate(() => ({ prevented: window.__kd, modes: [...window.__modes] }));
    await page.waitForTimeout(800);
    return r;
  };
  for (const combo of ['Alt+ArrowLeft', 'Control+ArrowRight', 'Shift+ArrowRight', 'Meta+ArrowLeft']) {
    const r = await keyed(combo);
    R.remote[combo] = r;
    check(`${combo} is not the remote's (not prevented, no scan)`, r.prevented === false && !r.modes.some((m) => m === 'ff' || m === 'rew'), r);
  }
  const plain = await keyed('ArrowRight');
  R.remote.ArrowRight = plain;
  check('a plain ArrowRight is the remote\'s (prevented, scans)', plain.prevented === true, plain);
  await ctx.close();
  await save('remote');
}

/* ------------------------------------------------------------------ drives */
if (ONLY.includes('drives')) {
  R.drives = {};
  const lum = (c) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const width of [1440, 390]) {
    for (const scheme of SCHEMES) {
      const key = `${width}-${scheme}`;
      const { ctx, page } = await open(browser, { path: '/t/vaporwave/contact/sent/', width, scheme });
      await page.focus('[data-desk-icon="computer"]');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
      const info = await page.evaluate(() => {
        const win = document.querySelector('[data-desk-win="computer"]');
        const face = getComputedStyle(win).backgroundColor;
        const toRgb = (s) => s.match(/\d+(\.\d+)?/g).slice(0, 3).map(Number);
        const drives = [...win.querySelectorAll('.drive')].map((svg) => [...svg.querySelectorAll('rect')].map((r) => { const probe = document.createElement('i'); probe.style.color = getComputedStyle(r).fill; document.body.append(probe); const c = getComputedStyle(probe).color; probe.remove(); const bb = r.getBoundingClientRect(); return { w: +r.getAttribute('width'), h: +r.getAttribute('height'), fill: toRgb(c), area: +r.getAttribute('width') * +r.getAttribute('height') }; }));
        const r = win.getBoundingClientRect();
        return { face: toRgb(face), drives, rect: [r.left, r.top, r.width, r.height] };
      });
      // The body of each glyph is its largest rects: the contrast of the biggest fill against the face.
      const rows = info.drives.map((rects, i) => {
        const big = [...rects].sort((a, b) => b.area - a.area)[0];
        return { drive: i, bodyFill: big.fill, ratioToFace: Math.round(ratio(big.fill, info.face) * 100) / 100 };
      });
      R.drives[key] = { face: info.face, rows };
      // The floppy's body is the bar ink; the hard disk, the disc and the network drive were the bevel highlight.
      for (const r of rows.slice(1)) check(`drive ${r.drive} reads against the window face (${key}): 3:1 or better`, r.ratioToFace >= 3, r);
      await page.screenshot({ path: join(D, `drives-${key}.png`), clip: { x: Math.max(0, info.rect[0] - 20), y: Math.max(0, info.rect[1] - 20), width: Math.min(info.rect[2] + 40, width), height: info.rect[3] + 40 } });
      await ctx.close();
    }
  }
  await save('drives');
}

/* --------------------------------------------------------------- phonewins */
if (ONLY.includes('phonewins')) {
  R.phonewins = {};
  for (const [width, height] of [[390, 844], [360, 740], [430, 932]]) {
    for (const scheme of SCHEMES) {
      const key = `${width}x${height}-${scheme}`;
      const { ctx, page } = await open(browser, { path: '/t/vaporwave/contact/sent/', width, height, scheme });
      const rows = [];
      for (const icon of ['computer', 'bin', 'readme']) {
        await page.focus(`[data-desk-icon="${icon}"]`);
        await page.keyboard.press('Enter');
        await page.waitForTimeout(350);
        const m = await page.evaluate((icon) => {
          const layer = document.querySelector('[data-desk-icons]').getBoundingClientRect();
          const icons = [...document.querySelectorAll('[data-desk-icon]')].map((e) => e.getBoundingClientRect());
          const win = document.querySelector(`[data-desk-win="${icon}"]`).getBoundingClientRect();
          const rowBottom = Math.max(...icons.map((r) => r.bottom));
          const labelBottom = Math.max(...[...document.querySelectorAll('.icon-label')].map((e) => e.getBoundingClientRect().bottom));
          return { winTop: Math.round(win.top * 10) / 10, rowBottom: Math.round(rowBottom * 10) / 10, labelBottom: Math.round(labelBottom * 10) / 10, layerBottom: Math.round(layer.bottom * 10) / 10 };
        }, icon);
        rows.push({ icon, ...m, gap: Math.round((m.winTop - m.labelBottom) * 10) / 10 });
        if (icon === 'readme') await page.screenshot({ path: join(D, `phonewins-${key}.png`) });
        await page.keyboard.press('Escape');
      }
      R.phonewins[key] = rows;
      for (const r of rows) check(`the ${r.icon} window opens below the icon row (${key})`, r.winTop >= r.labelBottom && r.winTop >= r.rowBottom - 0.5, r);
      await ctx.close();
    }
  }
  await save('phonewins');
}

/* -------------------------------------------------------------- signifiers */
if (ONLY.includes('signifiers')) {
  R.signifiers = {};
  const { ctx, page } = await open(browser, { path: '/t/vaporwave/', width: 1440, scheme: 'dark' });
  const at = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
  const read = (sel, props) => page.evaluate(([sel, props]) => { const e = document.querySelector(sel); const cs = getComputedStyle(e); return Object.fromEntries(props.map((p) => [p, cs[p]])); }, [sel, props]);
  const measure = async (id, sel, hoverProps, scroll) => {
    if (scroll) await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), scroll);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(120);
    const rest = await read(sel, ['cursor', ...hoverProps]);
    const c = await at(sel);
    await page.mouse.move(c[0], c[1]);
    await page.waitForTimeout(160);
    const hover = await read(sel, ['cursor', ...hoverProps]);
    const under = await page.evaluate(([x, y]) => getComputedStyle(document.elementFromPoint(x, y)).cursor, c);
    R.signifiers[id] = { rest, hover, cursorUnderPointer: under, changed: JSON.stringify(rest) !== JSON.stringify(hover) };
    return R.signifiers[id];
  };
  let r = await measure('remote', '[data-deck]', ['textShadow']);
  check('remote: pointer and a chromatic hover', r.cursorUnderPointer === 'pointer' && r.rest.textShadow !== r.hover.textShadow, r);
  r = await measure('elevator-key', '[data-floor="0"]', ['backgroundColor'], '.elevator');
  check('elevator key: pointer and a hover fill', r.cursorUnderPointer === 'pointer' && r.rest.backgroundColor !== r.hover.backgroundColor, r);
  r = await measure('door-title-bar', '.door-1 .vw-win-bar', ['boxShadow'], '.door-1');
  check('Home window title bar: grab and an ink rule on hover', r.cursorUnderPointer === 'grab' && r.hover.boxShadow !== 'none' && r.rest.boxShadow === 'none', r);
  await ctx.close();
  {
    const { ctx, page } = await open(browser, { path: '/t/vaporwave/contact/sent/', width: 1440, scheme: 'dark' });
    const at2 = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel);
    const c = await at2('[data-desk-icon="computer"]');
    await page.mouse.move(c[0], c[1]);
    await page.waitForTimeout(160);
    const hov = await page.evaluate(() => { const l = document.querySelector('[data-desk-icon="computer"] .icon-label'); const cs = getComputedStyle(l); return { cursor: getComputedStyle(document.querySelector('[data-desk-icon="computer"]')).cursor, outline: cs.outlineStyle + ' ' + cs.outlineWidth }; });
    await page.mouse.move(5, 5);
    await page.waitForTimeout(160);
    const rest = await page.evaluate(() => getComputedStyle(document.querySelector('[data-desk-icon="computer"] .icon-label')).outlineStyle);
    R.signifiers['sent-icon'] = { hover: hov, restOutline: rest };
    check('Sent icon: pointer and a dotted keyline on its label', hov.cursor === 'pointer' && /dotted/.test(hov.outline) && rest === 'none', R.signifiers['sent-icon']);
    await page.focus('[data-desk-icon="computer"]');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);
    const bar = await at2('[data-desk-win="computer"] .vw-win-bar .vw-win-title');
    await page.mouse.move(5, 5);
    await page.waitForTimeout(100);
    const barRest = await page.evaluate(() => getComputedStyle(document.querySelector('[data-desk-win="computer"] .vw-win-bar')).boxShadow);
    await page.mouse.move(bar[0], bar[1]);
    await page.waitForTimeout(160);
    const barHover2 = await page.evaluate(([x, y]) => { const e = document.querySelector('[data-desk-win="computer"] .vw-win-bar'); return { cursor: getComputedStyle(document.elementFromPoint(x, y)).cursor, shadow: getComputedStyle(e).boxShadow, drag: e.hasAttribute('data-drag'), inactive: e.classList.contains('inactive') }; }, bar);
    R.signifiers['sent-window-bar'] = { barRest, barHover: barHover2 };
    check('Sent window title bar: grab and an ink rule on hover', barHover2.cursor === 'grab' && barHover2.shadow !== 'none' && barRest === 'none', R.signifiers['sent-window-bar']);
    await page.screenshot({ path: join(D, 'signifier-sent-titlebar-hover.png'), clip: { x: Math.max(0, bar[0] - 220), y: Math.max(0, bar[1] - 40), width: 440, height: 120 } });
    await ctx.close();
  }
  {
    const { ctx, page } = await open(browser, { path: '/t/vaporwave/about/', width: 1440, scheme: 'dark' });
    const m = await page.evaluate(() => [...document.querySelectorAll('.vw-win-bar')].map((e) => ({ drag: e.hasAttribute('data-drag'), cursor: getComputedStyle(e).cursor })));
    R.signifiers['about-window-bars'] = m;
    check('About windows do not drag, so their bars promise nothing', m.length > 0 && m.every((b) => !b.drag && b.cursor !== 'grab'), m);
    await ctx.close();
  }
  await save('signifiers');
}

/* ------------------------------------------------------------------- beats */
if (ONLY.includes('beats')) {
  R.beats = {};
  const CASES = [
    { id: 'remote', path: '/t/vaporwave/', sel: '.hero', box: '.hero', scroll: null },
    { id: 'icons', path: '/t/vaporwave/contact/sent/', sel: '[data-desk-icons]', box: '[data-desk-icons]', scroll: null },
    { id: 'elevator', path: '/t/vaporwave/', sel: '.elevator', box: '.elevator', scroll: '.elevator' },
  ];
  for (const c of CASES) {
    for (const scheme of SCHEMES) {
      const key = `${c.id}-${scheme}`;
      const { ctx, page } = await open(browser, { path: c.path, width: 390, scheme });
      await page.addInitScript((id) => {
        window.__lastScroll = performance.now();
        addEventListener('scroll', () => { window.__lastScroll = performance.now(); }, { passive: true });
        window.__b = { start: null, end: null, ever: 0, log: [] };
        const state = () => {
          if (id === 'remote') return document.querySelector('.hero')?.dataset.deckMode === 'pause' ? 'on' : 'off';
          if (id === 'icons') return document.querySelector('[data-desk-icon][data-selected]') ? 'on' : 'off';
          const r = document.querySelector('[data-floor-readout]');
          return r && r.textContent !== '1F' ? 'on' : (document.querySelector('[data-floor-box]')?.hasAttribute('data-dir') ? 'on' : 'off');
        };
        const t0 = performance.now();
        const tick = () => {
          const on = state() === 'on';
          if (on && window.__b.start === null) { window.__b.start = performance.now(); window.__b.sinceScroll = performance.now() - window.__lastScroll; }
          if (on && !window.__b.open) { window.__b.open = true; window.__b.ever++; window.__b.log.push(['on', Math.round(performance.now() - t0)]); }
          if (!on && window.__b.open) { window.__b.open = false; window.__b.end = performance.now(); window.__b.log.push(['off', Math.round(performance.now() - t0)]); }
          requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }, c.id);
      const film = await startFilm(page);
      await page.reload({ waitUntil: 'load' });
      await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
      if (c.scroll) await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), c.scroll);
      await page.waitForTimeout(4200);
      const frames = await film.stop();
      const res = await page.evaluate(() => window.__b);
      const lastMs = frames.at(-1)?.ms ?? 4000;
      const times = [];
      for (let m = 0; m <= lastMs; m += Math.max(300, Math.round(lastMs / 11))) times.push(m);
      const box = await boxOf(page, c.box, 20);
      if (frames.length) await strip(pickAt(frames, times), join(D, `beat-${key}.png`), `vaporwave ${c.id} touch beat at 390 (${scheme})`, { cols: 6, cellW: 260, box, vpWidth: 390 });
      R.beats[key] = { beats: res.ever, sinceScrollMs: res.start ? Math.round(res.sinceScroll) : null, durationMs: res.start && res.end ? Math.round(res.end - res.start) : null, log: res.log };
      console.log(`  ${key}: frames ${frames.length}`, JSON.stringify(R.beats[key]));
      check(`${c.id} beat plays once on touch (${scheme})`, res.ever === 1, R.beats[key]);
      check(`${c.id} beat starts at least 400 ms after the last scroll (${scheme})`, res.start !== null && res.sinceScroll >= 395, R.beats[key]);
      if (c.id === 'elevator') {
        const lit = await page.evaluate(() => [...document.querySelectorAll('[data-floor]')].filter((b) => b.getAttribute('aria-pressed') === 'true').length);
        check('the elevator beat lights no key', lit === 0, lit);
      }
      // Away and back: no second beat.
      await page.evaluate(() => scrollTo(0, 0));
      await page.waitForTimeout(500);
      if (c.scroll) await page.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), c.scroll);
      await page.waitForTimeout(1800);
      check(`${c.id} beat does not repeat (${scheme})`, (await page.evaluate(() => window.__b.ever)) === 1);
      await ctx.close();
    }
  }
  await save('beats');
}

await browser.close();
console.log(fails.length ? `\n${fails.length} FAILED\n${fails.join('\n')}` : '\nall checks passed');
process.exit(fails.length ? 1 : 0);
