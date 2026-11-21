/**
 * Stage 6 wave 3, task 25: evidence for vaporwave's Sent desktop and the
 * Home elevator. GPU Chromium, reduced transparency forced to no-preference,
 * the portal prompt suppressed (w3-t25-lib.mjs). Against a built snapshot:
 *   node scripts/themes/snap.mjs --name t25 --reuse --port 4470 -- node scripts/themes/stage6/w3-t25-evidence.mjs
 *   ONLY=sent,elevator,swap SCHEMES=light,dark WIDTHS=1440,820,390 node ...
 *
 * sent      Sent at 1440 (mouse) and 820, 390 (touch), both schemes: rest,
 *           select, drag to the grid (and onto the message window, which a
 *           dropped icon must not hide behind), each icon opened by
 *           double-click / double tap / Enter, windows dragged, closed by the
 *           X and by Escape, birch.exe's hourglass and screensaver and each
 *           way out (key, click, tap). Strips of labelled frames, whole-page
 *           sheets, and a JSON of the measured state at every step.
 * elevator  Home at 1440, 820 and 390: every floor by press and by keyboard,
 *           the readout stepping floor by floor (timestamped film), the lit
 *           floor, the door captions, the CRT flip, no scroll, no navigation;
 *           Services (no kiosk) checked for none.
 * swap      1440 and 390: a window open on Sent, then an in-school swap away
 *           and back (the window closed on return) and an arrival through the
 *           switcher, a window opened, left and returned to.
 * Output: scripts/themes/.out/stage6/w3/t25/.
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { BASE, OUT, launch, open, startFilm } from './w3-t25-lib.mjs';

const ONLY = (process.env.ONLY || 'sent,elevator,swap').split(',');
const SCHEMES = (process.env.SCHEMES || 'light,dark').split(',');
const WIDTHS = (process.env.WIDTHS || '1440,820,390').split(',').map(Number);
const R = { renderer: null };
const sub = async (name) => { const d = join(OUT, name); await mkdir(d, { recursive: true }); return d; };

/** A strip of labelled frames ({ data base64 | buf, label }). */
async function labelledStrip(frames, file, title, { cols = 4, cellW = 360 } = {}) {
  const images = await Promise.all(frames.map((f) => loadImage(f.buf ?? Buffer.from(f.data, 'base64'))));
  const cellH = Math.round((images[0].height / images[0].width) * cellW);
  const PAD = 10, CAP = 24, HEAD = 30;
  const rows = Math.ceil(images.length / cols);
  const canvas = createCanvas(PAD + cols * (cellW + PAD), HEAD + PAD + rows * (cellH + CAP + PAD));
  const c = canvas.getContext('2d');
  c.fillStyle = '#1b1b1d'; c.fillRect(0, 0, canvas.width, canvas.height);
  c.font = '600 14px sans-serif'; c.textBaseline = 'middle'; c.fillStyle = '#e8e6e1';
  c.fillText(title, PAD, HEAD / 2 + 2);
  images.forEach((img, i) => {
    const x = PAD + (i % cols) * (cellW + PAD), y = HEAD + PAD + Math.floor(i / cols) * (cellH + CAP + PAD);
    c.drawImage(img, 0, 0, img.width, img.height, x, y, cellW, Math.round((img.height / img.width) * cellW));
    c.fillStyle = '#e8e6e1'; c.font = '600 12px sans-serif';
    c.fillText(frames[i].label, x, y + cellH + CAP / 2);
  });
  await writeFile(file, await canvas.encode('png'));
}

const { browser, renderer } = await launch();
R.renderer = renderer;

/** The measured state of Sent's desktop, for the JSON beside every step. */
const deskState = (page) => page.evaluate(() => {
  const wins = Array.from(document.querySelectorAll('.vw-win')).map((w) => ({
    name: w.querySelector('.vw-win-title')?.textContent,
    hidden: w.hidden,
    ariaHidden: w.getAttribute('aria-hidden'),
    active: !w.querySelector(':scope > .vw-win-bar')?.classList.contains('inactive'),
    z: getComputedStyle(w).zIndex,
  }));
  const layer = document.querySelector('[data-desk-icons]').getBoundingClientRect();
  const icons = Array.from(document.querySelectorAll('[data-desk-icon]')).map((i) => {
    const r = i.getBoundingClientRect();
    return { key: i.dataset.deskIcon, selected: i.hasAttribute('data-selected'), cellX: +((r.left - layer.left) / 88).toFixed(2), cellY: +((r.top - layer.top) / 96).toFixed(2) };
  });
  const ae = document.activeElement;
  return {
    wins, icons,
    activeCaptionsVisible: wins.filter((w) => !w.hidden && w.active).length,
    focus: ae?.dataset?.deskIcon ? `icon ${ae.dataset.deskIcon}` : ae?.dataset?.winClose !== undefined ? 'close button' : ae?.tagName,
    saver: !document.querySelector('[data-desk-scr]').hidden,
    hourglass: !document.querySelector('[data-desk-wait]').hidden,
    waitCursor: document.documentElement.classList.contains('vw-wait'),
    scrollY: Math.round(scrollY),
    docW: document.documentElement.scrollWidth,
  };
});

/* ------------------------------------------------------------ sent */
if (ONLY.includes('sent')) {
  const D = await sub('sent');
  R.sent = {};
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      const touch = width < 900;
      const tag = `${width}-${scheme}`;
      const { ctx, page, errors, cdp } = await open(browser, { path: '/t/vaporwave/contact/sent/', width, scheme, settle: 700 });
      const vp = page.viewportSize();
      const log = {};
      const frames = [];
      const t0 = Date.now();
      const snap = async (label, extra = {}) => {
        const buf = await page.screenshot({ type: 'png' });
        const state = await deskState(page);
        frames.push({ buf, label: `+${Date.now() - t0} ms ${label}` });
        log[label] = { ...state, ...extra };
        return state;
      };
      const centreOf = (sel) => page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, l: r.left, t: r.top, w: r.width, h: r.height }; }, sel);
      const touchAt = (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y }] });
      const icon = (k) => `[data-desk-icon="${k}"]`;
      const tap = async (sel) => { const c = await centreOf(sel); if (touch) await page.touchscreen.tap(c.x, c.y); else await page.mouse.click(c.x, c.y); };
      const dbl = async (sel) => {
        const c = await centreOf(sel);
        if (touch) { await page.touchscreen.tap(c.x, c.y); await page.waitForTimeout(120); await page.touchscreen.tap(c.x, c.y); }
        else await page.mouse.dblclick(c.x, c.y);
        await page.waitForTimeout(250);
      };
      const drag = async (sel, dx, dy) => {
        const c = await centreOf(sel);
        if (touch) {
          await touchAt('touchStart', c.x, c.y); await page.waitForTimeout(280);
          for (let i = 1; i <= 10; i++) { await touchAt('touchMove', c.x + (dx * i) / 10, c.y + (dy * i) / 10); await page.waitForTimeout(16); }
          await touchAt('touchEnd');
        } else {
          await page.mouse.move(c.x, c.y); await page.mouse.down();
          for (let i = 1; i <= 10; i++) { await page.mouse.move(c.x + (dx * i) / 10, c.y + (dy * i) / 10); await page.waitForTimeout(16); }
          await page.mouse.up();
        }
        await page.waitForTimeout(260);
      };

      await snap('rest');
      await tap(icon('computer'));
      await snap('My Computer selected (' + (touch ? 'tap' : 'click') + ')');
      await tap(icon('bin'));
      await snap('Recycle Bin selected, My Computer deselected');
      // Drag to the grid: not a whole number of cells at first (an odd offset), so the settle shows.
      const before = await deskState(page);
      if (width > 700) await drag(icon('bin'), 211, 137); else await drag(icon('bin'), 175, 9);
      const afterDrag = await snap('Recycle Bin dragged, settled on the grid');
      log.dragSnap = { before: before.icons.find((i) => i.key === 'bin'), after: afterDrag.icons.find((i) => i.key === 'bin') };
      // Drop one on another icon's cell: it takes the nearest free cell, never the same one.
      await drag(icon('readme'), width > 700 ? 211 : -88 * 2, 0);
      await snap('readme.txt dragged toward another icon');
      // Drop one under the message window: it cannot hide there.
      if (width > 700) {
        const dlg = await centreOf('.dialog');
        const ic = await centreOf(icon('computer'));
        await drag(icon('computer'), dlg.x - ic.x, dlg.y - ic.y);
        const st = await snap('My Computer dropped on the message window');
        const rect = await centreOf(icon('computer'));
        log.dropOnDialog = { dialog: dlg, iconAfter: rect, overlapsDialog: rect.l < dlg.l + dlg.w && rect.l + rect.w > dlg.l && rect.t < dlg.t + dlg.h && rect.t + rect.h > dlg.t };
      }
      // Open each: double-click / double tap / Enter.
      await dbl(icon('computer'));
      await snap('My Computer open (' + (touch ? 'double tap' : 'double-click') + ')');
      await dbl(icon('bin'));
      await snap('Recycle Bin open (' + (touch ? 'double tap' : 'double-click') + ')');
      await page.focus(icon('readme'));
      await page.keyboard.press('Enter');
      await page.waitForTimeout(250);
      await snap('readme.txt open (Enter)');
      // Pressing the message window brings it to the front; pressing a window brings that one back.
      const dlgC = await centreOf('.dialog .content h1');
      if (touch) await page.touchscreen.tap(dlgC.x, dlgC.y); else await page.mouse.click(dlgC.x, dlgC.y);
      await snap('pressed the message window: it is in front, one active caption');
      await page.focus('[data-desk-win="readme"] [data-win-close]');
      await snap('focus in readme.txt: it is in front again');
      // Drag a window by its bar (mouse; a finger after a short press, not at phone width).
      const bar = await centreOf('[data-desk-win="readme"] .vw-win-bar');
      const wb = await page.evaluate(() => { const r = document.querySelector('[data-desk-win="readme"]').getBoundingClientRect(); return { l: r.left, t: r.top }; });
      if (touch) {
        await touchAt('touchStart', bar.x - 60, bar.y); await page.waitForTimeout(280);
        for (let i = 1; i <= 8; i++) { await touchAt('touchMove', bar.x - 60 - (width > 700 ? 30 : 0) * i / 2, bar.y + 8 * i); await page.waitForTimeout(16); }
        await touchAt('touchEnd');
      } else {
        await page.mouse.move(bar.x - 60, bar.y); await page.mouse.down();
        for (let i = 1; i <= 8; i++) { await page.mouse.move(bar.x - 60 - 30 * i, bar.y + 12 * i); await page.waitForTimeout(16); }
        await page.mouse.up();
      }
      await page.waitForTimeout(150);
      const wa = await page.evaluate(() => { const r = document.querySelector('[data-desk-win="readme"]').getBoundingClientRect(); return { l: r.left, t: r.top }; });
      await snap('readme.txt dragged by its bar', { moved: { dx: Math.round(wa.l - wb.l), dy: Math.round(wa.t - wb.t) } });
      // A vertical swipe on a bar scrolls (touch only; the page is taller than the screen on a phone).
      if (touch) {
        const y0 = await page.evaluate(() => scrollY);
        const b2 = await centreOf('[data-desk-win="computer"] .vw-win-bar');
        await touchAt('touchStart', b2.x - 40, b2.y);
        for (let i = 1; i <= 10; i++) { await touchAt('touchMove', b2.x - 40, b2.y - 14 * i); await page.waitForTimeout(16); }
        await touchAt('touchEnd'); await page.waitForTimeout(300);
        log.verticalSwipeOnBar = { scrollBefore: y0, scrollAfter: await page.evaluate(() => scrollY) };
        await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(200);
      }
      // Close: the X of the front window, Escape for the next two.
      await page.click('[data-desk-win="readme"] [data-win-close]');
      await page.waitForTimeout(150);
      await snap('readme.txt closed by its X: focus back on its icon, next window forward');
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      await snap('Escape: the front desktop window closed');
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      await snap('Escape: the last desktop window closed, the message window active');
      await page.keyboard.press('Escape'); await page.waitForTimeout(150);
      await snap('Escape with nothing open: nothing happens');
      await labelledStrip(frames.map((f) => f), join(D, `desk-${tag}.png`), `vaporwave Sent desktop, ${width} ${touch ? 'touch' : 'mouse'}, ${scheme}: select, drag, open, activate, close`, { cols: width > 700 ? 3 : 5, cellW: width > 700 ? 480 : 200 });

      // Whole-page sheets: rest and all three open.
      await page.reload({ waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
      await page.evaluate(() => document.fonts.ready); await page.waitForTimeout(500);
      const sheetRest = await page.screenshot({ fullPage: true });
      for (const k of ['computer', 'bin', 'readme']) await dbl(icon(k));
      const sheetOpen = await page.screenshot({ fullPage: true });
      await labelledStrip([{ buf: sheetRest, label: 'rest' }, { buf: sheetOpen, label: 'My Computer, Recycle Bin, readme.txt open' }], join(D, `sheet-${tag}.png`), `vaporwave Sent whole page, ${width} ${scheme}`, { cols: 2, cellW: width > 700 ? 620 : 330 });
      await page.reload({ waitUntil: 'networkidle' });
      await page.addStyleTag({ content: 'bdl-switcher{display:none!important}' });
      await page.waitForTimeout(500);

      // birch.exe: hourglass, then the screensaver; out by a key, a click, a tap.
      const exeRuns = [];
      for (const how of touch ? ['tap', 'key'] : ['key', 'click']) {
        const film = await startFilm(page);
        const marks = [];
        const mark = async (label) => marks.push({ label, at: Date.now() / 1000, state: await deskState(page) });
        await mark('before');
        await dbl(icon('exe'));
        await mark('+250: hourglass');
        await page.waitForTimeout(500); await mark('+750: hourglass');
        await page.waitForTimeout(900); await mark('+1650: screensaver');
        await page.waitForTimeout(1600); await mark('+3250: screensaver');
        if (how === 'key') await page.keyboard.press('x');
        else if (how === 'click') await page.mouse.click(vp.width / 2, vp.height / 2);
        else await page.touchscreen.tap(vp.width / 2, vp.height / 2);
        await page.waitForTimeout(200);
        await mark(`exit by ${how}`);
        const fr = await film.stop();
        const picks = marks.map((m, i) => {
          const until = Math.min(m.at + 0.12, (marks[i + 1]?.at ?? Infinity) - 0.005);
          const f = fr.filter((x) => x.at <= until).pop() ?? fr[0];
          return { data: f.data, label: `+${Math.round((m.at - film.t0) * 1000)} ms ${m.label}` };
        });
        await labelledStrip(picks, join(D, `exe-${how}-${tag}.png`), `vaporwave birch.exe, ${width} ${scheme}, out by ${how}`, { cols: 5, cellW: width > 700 ? 300 : 170 });
        exeRuns.push({ how, marks: marks.map((m) => ({ label: m.label, hourglass: m.state.hourglass, saver: m.state.saver, waitCursor: m.state.waitCursor, focus: m.state.focus })) });
        await page.waitForTimeout(300);
      }
      log.exe = exeRuns;
      // Escape during the screensaver ends it only: a window open under it stays open.
      await dbl(icon('readme'));
      await dbl(icon('exe')); await page.waitForTimeout(1900);
      await page.keyboard.press('Escape'); await page.waitForTimeout(200);
      log.escapeDuringSaver = await deskState(page).then((s) => ({ saver: s.saver, readmeOpen: s.wins.find((w) => w.name === 'readme.txt')?.hidden === false }));
      R.sent[tag] = { errors, log };
      console.log('sent', tag, 'errors', errors.length, 'dragSnap', JSON.stringify(log.dragSnap), 'dropOnDialog', JSON.stringify(log.dropOnDialog?.overlapsDialog), 'escapeDuringSaver', JSON.stringify(log.escapeDuringSaver), 'vswipe', JSON.stringify(log.verticalSwipeOnBar ?? null));
      await ctx.close();
    }
  }
}

/* ------------------------------------------------------------ elevator */
if (ONLY.includes('elevator')) {
  const D = await sub('elevator');
  R.elevator = {};
  for (const scheme of SCHEMES) {
    for (const width of WIDTHS) {
      const touch = width < 900;
      const tag = `${width}-${scheme}`;
      const { ctx, page, errors } = await open(browser, { path: '/t/vaporwave/', width, scheme, settle: 900 });
      await page.locator('.kiosk-stand').scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const state = () => page.evaluate(() => ({
        readout: document.querySelector('[data-floor-readout]').textContent,
        dir: document.querySelector('[data-floor-box]').getAttribute('data-dir'),
        pressed: Array.from(document.querySelectorAll('[data-floor]')).map((b) => `${b.dataset.floor}:${b.getAttribute('aria-pressed')}`).join(' '),
        door0Active: !document.querySelector('.door-0 .vw-win-bar').classList.contains('inactive'),
        door1Active: !document.querySelector('.door-1 .vw-win-bar').classList.contains('inactive'),
        flip: document.querySelector('.kiosk .screen').classList.contains('flip'),
        scrollY: Math.round(scrollY), path: location.pathname,
      }));
      const press = async (floor, how) => {
        const sel = `[data-floor="${floor}"]`;
        if (how === 'press') { const c = await page.evaluate((sel) => { const r = document.querySelector(sel).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, sel); if (touch) await page.touchscreen.tap(c[0], c[1]); else await page.mouse.click(c[0], c[1]); }
        else { await page.focus(sel); await page.keyboard.press(how === 'Space' ? 'Space' : 'Enter'); }
      };
      const clip = await page.evaluate(() => { const r = document.querySelector('.kiosk-stand').getBoundingClientRect(); const c = document.querySelector('.crt').getBoundingClientRect(); const y = Math.max(0, c.top); return { x: 0, y, width: innerWidth, height: Math.min(innerHeight - y, r.bottom + 30 - y) }; });
      const shotClip = async () => ({ buf: await page.screenshot({ clip }) });
      const log = {};
      const frames = [];
      const film = await startFilm(page);
      const marks = [];
      const mark = async (label) => marks.push({ label, at: Date.now() / 1000, state: await state() });
      await mark('rest: car at 1F, nothing lit');
      const runs = [[0, 'press'], [2, 'press'], [1, 'Enter'], [2, 'Space'], [0, 'Enter']];
      for (const [floor, how] of runs) {
        await press(floor, how);
        await mark(`${['B1', '1F', '2F'][floor]} by ${how}: lit, car leaves`);
        await page.waitForTimeout(430); await mark('+430');
        await page.waitForTimeout(430); await mark('+860');
        await page.waitForTimeout(700); await mark('arrived');
        await page.waitForTimeout(200);
      }
      const fr = await film.stop();
      const picks = marks.map((m, i) => {
        const until = Math.min(m.at + 0.12, (marks[i + 1]?.at ?? Infinity) - 0.005);
        const f = fr.filter((x) => x.at <= until).pop() ?? fr[0];
        return { data: f.data, label: `+${Math.round((m.at - film.t0) * 1000)} ms ${m.label}` };
      });
      for (let i = 0; i < picks.length; i += 24) await labelledStrip(picks.slice(i, i + 24), join(D, `elevator-${tag}-${i / 24}.png`), `vaporwave elevator, ${width} ${touch ? 'touch' : 'mouse + keyboard'}, ${scheme} (full frames)`, { cols: width > 700 ? 4 : 6, cellW: width > 700 ? 340 : 200 });
      log.timeline = marks.map((m) => ({ label: m.label, ...m.state }));
      // Whole-page sheet of Home, for the layout.
      const sheetBuf = await page.screenshot({ fullPage: true });
      await labelledStrip([{ buf: sheetBuf, label: `Home whole page, ${width} ${scheme}` }], join(D, `sheet-${tag}.png`), `vaporwave Home after the elevator run, ${width} ${scheme}`, { cols: 1, cellW: width > 700 ? 900 : 380 });
      R.elevator[tag] = { errors, log };
      const end = log.timeline[log.timeline.length - 1];
      console.log('elevator', tag, 'errors', errors.length, 'end', end.pressed, end.readout, 'scrollMoved', log.timeline.some((t) => t.scrollY !== log.timeline[0].scrollY), 'pathSame', log.timeline.every((t) => t.path === '/t/vaporwave/'));
      await ctx.close();
    }
  }
  // Services has no kiosk and no plaque: nothing to press there.
  const { ctx, page } = await open(browser, { path: '/t/vaporwave/services/', width: 1440, scheme: 'dark', settle: 500 });
  R.elevator.servicesFloors = await page.evaluate(() => document.querySelectorAll('[data-floor]').length);
  console.log('services floors', R.elevator.servicesFloors);
  await ctx.close();
}

/* ------------------------------------------------------------ swap */
if (ONLY.includes('swap')) {
  const D = await sub('swap');
  R.swap = {};
  for (const width of [1440, 390]) {
    const touch = width < 900;
    const scheme = 'dark';
    const openWin = async (page, key) => { const c = await page.evaluate((k) => { const r = document.querySelector(`[data-desk-icon="${k}"]`).getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }, key); if (touch) { await page.touchscreen.tap(c[0], c[1]); await page.waitForTimeout(120); await page.touchscreen.tap(c[0], c[1]); } else await page.mouse.dblclick(c[0], c[1]); await page.waitForTimeout(250); };
    const openCount = (page) => page.evaluate(() => ({ open: Array.from(document.querySelectorAll('[data-desk-win]')).filter((w) => !w.hidden).length, saverEls: document.querySelectorAll('[data-desk-scr]').length, waitCursor: document.documentElement.classList.contains('vw-wait'), activeCaptions: Array.from(document.querySelectorAll('.vw-win')).filter((w) => !w.hidden && !w.querySelector(':scope > .vw-win-bar').classList.contains('inactive')).length }));
    // In-school swap: a window open, leave by the dialog's link to Home, come back.
    {
      const { ctx, page, errors } = await open(browser, { path: '/t/vaporwave/contact/sent/', width, scheme, settle: 700 });
      await openWin(page, 'computer'); await openWin(page, 'readme');
      const during = await openCount(page);
      const film = await startFilm(page);
      const marks = [];
      const mark = (label) => marks.push({ label, at: Date.now() / 1000 });
      mark('two windows open');
      await page.locator('a.vw-btn:visible').first().click();
      mark('Back to the front page clicked'); await page.waitForTimeout(400); mark('+400'); await page.waitForTimeout(1300); mark('on Home');
      const onHome = await page.evaluate(() => location.pathname);
      await page.goBack();
      mark('back pressed'); await page.waitForTimeout(400); mark('+400'); await page.waitForTimeout(1500); mark('on Sent again');
      const back = await openCount(page);
      const fr = await film.stop();
      const picks = marks.map((m) => { const f = fr.find((x) => x.at >= m.at + 0.08) ?? fr[fr.length - 1]; return { data: f.data, label: `+${Math.round((f.at - film.t0) * 1000)} ms ${m.label}` }; });
      await labelledStrip(picks, join(D, `swap-in-school-${width}.png`), `vaporwave Sent in-school swap with two windows open, ${width} ${scheme}`, { cols: 4, cellW: touch ? 200 : 360 });
      // The page works after the return.
      await openWin(page, 'bin');
      const worksAgain = await openCount(page);
      R.swap[`in-school-${width}`] = { during, onHome, back, worksAgain, errors };
      console.log('swap in-school', width, 'during', JSON.stringify(during), 'back', JSON.stringify(back), 'again', JSON.stringify(worksAgain), 'errors', errors.length);
      await ctx.close();
    }
    // Arrival through the switcher: quiet's Sent -> vaporwave, a window open, away to quiet, back to vaporwave.
    {
      const { ctx, page, errors } = await open(browser, { path: '/t/quiet/contact/sent/', width, scheme, settle: 900, hideSwitcher: false });
      const sw = async (school) => {
        await page.evaluate(() => document.querySelector('bdl-switcher').shadowRoot.querySelector('.open').click());
        await page.waitForTimeout(700);
        await page.evaluate((s) => document.querySelector('bdl-switcher').shadowRoot.querySelector(`a[data-school="${s}"]`).click(), school);
      };
      const film = await startFilm(page);
      const t0 = Date.now() / 1000;
      await sw('vaporwave'); await page.waitForTimeout(2600);
      const arrived = await openCount(page);
      await openWin(page, 'bin'); await openWin(page, 'computer');
      const during = await openCount(page);
      await sw('quiet'); await page.waitForTimeout(2400);
      const onQuiet = await page.evaluate(() => ({ path: location.pathname, desk: document.querySelectorAll('[data-desk]').length, wait: document.documentElement.classList.contains('vw-wait') }));
      await sw('vaporwave'); await page.waitForTimeout(2600);
      const back = await openCount(page);
      const fr = await film.stop();
      const times = [0, 900, 1800, 2900, 3600, 4500, 5800, 7400, 8200, 9500];
      const picks = times.map((ms) => { const f = fr.find((x) => x.at >= t0 + ms / 1000) ?? fr[fr.length - 1]; return { data: f.data, label: `+${Math.round((f.at - t0) * 1000)} ms` }; });
      await labelledStrip(picks, join(D, `arrival-${width}.png`), `vaporwave Sent arrival through the switcher, windows opened, left and returned, ${width} ${scheme}`, { cols: 5, cellW: touch ? 170 : 280 });
      R.swap[`arrival-${width}`] = { arrived, during, onQuiet, back, errors };
      console.log('swap arrival', width, 'arrived', JSON.stringify(arrived), 'during', JSON.stringify(during), 'onQuiet', JSON.stringify(onQuiet), 'back', JSON.stringify(back), 'errors', errors.length);
      await ctx.close();
    }
  }
}

await writeFile(join(OUT, `evidence-${ONLY.join('-')}.json`), JSON.stringify(R, null, 2));
await browser.close();
console.log('base', BASE, 'out', OUT);
