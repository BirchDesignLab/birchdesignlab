// The careless-hand check for the Lab wall on /lab/. Run it after any change to the wall.
//
//   BASE=http://localhost:4400 node scripts/lab-wall/robust.mjs
//   SHOTS=<dir> ...   also writes screenshots there (never into the repository unless you point it there)
//
// BASE is a built (npm run build, then npm run preview or any static server on dist/) or dev site; default
// http://localhost:4400. It drives real GPU Chromium (--use-angle=d3d11 --enable-gpu) the way a careless hand
// would: opening and closing pieces by the button, Esc and Back, a second click while the first is still
// opening, spamming the arrows, resizing and switching the scheme with a piece open, Wall/List/Wall at speed,
// links to a piece, the lamp, a finger on a phone, a hidden tab, a slow connection, an engine that will not load.
// One line per check, "ok" or "FAIL"; the browser's console errors are printed at the end; exit code 1 on any FAIL.
// Takes a few minutes. Needs the repo's own playwright (npm install; npx playwright install chromium).
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const BASE = (process.env.BASE || 'http://localhost:4400').replace(/\/$/, '');
const URL = BASE + '/lab/';
const SHOTS = process.env.SHOTS || '';
const ARGS = ['--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--hide-scrollbars'];
if (SHOTS) mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch({ args: ARGS });
const errs = [];
let fails = 0;
const ok = (c, m) => {
  if (!c) { fails++; console.log('FAIL', m); } else console.log('ok  ', m);
};
const wait = (p, ms) => p.waitForTimeout(ms);
const shot = async (page, name) => { if (SHOTS) await page.screenshot({ path: `${SHOTS}/${name}.png` }); };
const watch = (page, tag, sink = errs) => {
  page.on('console', (m) => {
    if (m.type() === 'error') sink.push(`${tag} error: ${m.text()}`);
  });
  page.on('pageerror', (e) => sink.push(`${tag} pageerror: ${e.message}`));
};

/** A fresh browser context. `scheme` and `view` are stored before the page's own scripts run; `raf` counts animation frames. */
async function context({ w = 1440, h = 900, scheme = 'dark', touch = false, view = null, raf = false } = {}) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: touch ? 2 : 1, isMobile: touch, hasTouch: touch });
  await ctx.addInitScript(([s, v]) => {
    try { localStorage.setItem('scheme', s); if (v) localStorage.setItem('lab-view', v); } catch (e) { /* storage blocked */ }
  }, [scheme, view]);
  if (raf) {
    await ctx.addInitScript(() => {
      window.__raf = 0;
      const orig = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (cb) => orig((t) => { window.__raf++; cb(t); });
    });
  }
  return ctx;
}

// ---------- reading the page ----------
const data = (page) => page.evaluate(() => JSON.parse(document.querySelector('[data-lw=data]').textContent));
const labelOf = (e) => 'Open ' + e.title;
const rects = (page) => page.evaluate(() => Object.fromEntries([...document.querySelectorAll('.lw-tile')].map((t) => [t.getAttribute('aria-label'), [t.offsetLeft, t.offsetTop, t.offsetWidth, t.offsetHeight]])));
const dev = (a, b) => { let m = 0; for (const k of Object.keys(a)) if (b[k]) for (let i = 0; i < 4; i++) m = Math.max(m, Math.abs(a[k][i] - b[k][i])); return m; };

/** What is on screen now: the open piece, the overlay, the scroll lock, and which canvases (in view) are blank. */
const state = (page) => page.evaluate(() => {
  const root = document.documentElement;
  const open = document.querySelector('.lw-tile.lw-open');
  const blank = [];
  for (const t of document.querySelectorAll('.lw-tile')) {
    const c = t.querySelector('canvas');
    if (!c || c.width < 4) continue;
    const r = t.getBoundingClientRect();
    if (r.bottom < -100 || r.top > innerHeight + 100) continue;
    const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data;
    const seen = new Set();
    const stp = Math.max(4, ((d.length / 4 / 400) | 0) * 4);
    for (let i = 0; i < d.length; i += stp) seen.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
    if (seen.size < 2) blank.push(t.getAttribute('aria-label'));
  }
  return {
    cur: open ? open.getAttribute('aria-label') : null,
    scrim: document.querySelector('.lw-scrim').classList.contains('lw-on'),
    door: document.querySelector('.lw-door').classList.contains('lw-on'),
    locked: root.classList.contains('lw-locked'),
    inert: document.querySelectorAll('[inert]').length,
    hash: location.hash, sx: root.scrollWidth - root.clientWidth, blank, histLen: history.length, view: root.dataset.labView,
  };
});
const openRect = (page) => page.evaluate(() => {
  const t = document.querySelector('.lw-tile.lw-open');
  if (!t) return null;
  const r = t.getBoundingClientRect();
  const d = document.querySelector('.lw-door').getBoundingClientRect();
  return { x: r.left, y: r.top, w: r.width, h: r.height, vw: d.width, vh: d.height };
});
const center = (page, label) => page.evaluate((label) => {
  const t = [...document.querySelectorAll('.lw-tile')].find((x) => x.getAttribute('aria-label') === label);
  t.scrollIntoView({ block: 'nearest' });
  const r = t.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}, label);
/** The words of the open piece: the count pill, the meta line, and whether the pill is showing. */
const door = (page) => page.evaluate(() => {
  const count = document.querySelector('[data-lw=count]');
  const meta = document.querySelector('[data-lw=meta]');
  const pill = count.closest('.lw-count');
  return { count: count.textContent, meta: meta.textContent, pill: getComputedStyle(pill).display !== 'none', metaNum: !!meta.querySelector('.lw-num') };
});

let baseline = null;
let baseState = null;
/** A piece is closed and everything is back where it was: no overlay, no scroll lock, scroll kept, focus on the tile. */
async function closed(page, tag, expectScrollY, expectFocus) {
  await wait(page, 1300);
  const st = await state(page);
  const now = await rects(page);
  const d = baseline ? dev(baseline, now) : 0;
  ok(st.cur === null && !st.scrim && !st.door && !st.locked && st.inert === baseState.inert && d < 3.5,
    `${tag}: back at rest ${JSON.stringify({ cur: st.cur, scrim: st.scrim, door: st.door, locked: st.locked, inert: st.inert, dev: +d.toFixed(1) })}`);
  if (expectScrollY !== undefined) {
    const y = await page.evaluate(() => scrollY);
    ok(Math.abs(y - expectScrollY) < 2, `${tag}: scroll kept (${y})`);
  }
  if (expectFocus) {
    const f = await page.evaluate(() => document.activeElement && document.activeElement.getAttribute('aria-label'));
    ok(f === expectFocus, `${tag}: focus on the tile (${f})`);
  }
  return st;
}
const settle = async (page) => { await page.goto(URL); await wait(page, 2600); await page.mouse.move(1, 1); await wait(page, 500); };

// Held loads: some scripts (all of them, or only the engine) gated and then released, and the engine being live.
const ALL_JS = /\/_astro\/[^?]*\.js(\?|$)/;
const ENGINE_JS = /\/_astro\/wall\.[^?]*\.js(\?|$)/;
const liveNow = (page) => page.evaluate(() => !!document.querySelector('[data-lw-live]'));
const untilLive = (page) => page.waitForFunction(() => document.querySelector('[data-lw-live]'), null, { timeout: 30000 }).catch(() => {});

// ---------- every tile drawn, at both sizes, in both schemes ----------
async function drawn(w, h, scheme, touch) {
  const ctx = await context({ w, h, scheme, touch });
  const page = await ctx.newPage();
  watch(page, `drawn ${w} ${scheme}`);
  await page.goto(URL);
  await wait(page, 2600);
  const rows = await data(page);
  let bad = [];
  for (const e of rows) {
    const label = labelOf(e);
    await center(page, label);
    await wait(page, 700);
    const st = await page.evaluate((label) => {
      const t = [...document.querySelectorAll('.lw-tile')].find((x) => x.getAttribute('aria-label') === label);
      const c = t.querySelector('canvas');
      const img = t.querySelector('.lw-still');
      const cap = t.querySelector('.lw-t').textContent;
      if (img) return { cap, kind: 'still', up: img.classList.contains('lw-drawn') && parseFloat(getComputedStyle(img).opacity) > 0.99 };
      if (!c) return { cap, kind: 'plain', up: true };
      const g = c.getContext('2d');
      const d = g.getImageData(0, 0, c.width, c.height).data;
      const seen = new Set();
      const stp = Math.max(4, ((d.length / 4 / 400) | 0) * 4);
      for (let i = 0; i < d.length; i += stp) seen.add((d[i] >> 4) + ',' + (d[i + 1] >> 4) + ',' + (d[i + 2] >> 4));
      return { cap, kind: 'canvas', up: seen.size >= 2 && c.classList.contains('lw-drawn') && parseFloat(getComputedStyle(c).opacity) > 0.99 };
    }, label);
    if (!st.up || st.cap !== e.title) bad.push(e.id + ' ' + JSON.stringify(st));
  }
  ok(bad.length === 0, `every tile drawn at ${w} ${scheme}${bad.length ? ': ' + bad.join('; ') : ` (${rows.length} tiles, framed, captioned, picture faded in)`}`);
  const st = await state(page);
  ok(st.sx <= 0, `${w} ${scheme}: no sideways scroll (${st.sx})`);
  await shot(page, `wall-${w}-${scheme}`);
  await ctx.close();
}
await drawn(1440, 900, 'dark', false);
await drawn(1440, 900, 'light', false);
await drawn(390, 844, 'dark', true);
await drawn(390, 844, 'light', true);

// ---------- desktop ----------
{
  const ctx = await context({ raf: true });
  const page = await ctx.newPage();
  watch(page, 'desk');
  await settle(page);
  const rows = await data(page);
  const byId = (id) => rows.find((e) => e.id === id);
  const lbl = (id) => labelOf(byId(id));
  baseline = await rects(page);
  baseState = await state(page);
  ok(baseState.view === 'wall' && Object.keys(baseline).length === rows.length, `first view is the wall with a tile for every listed piece (${baseState.view})`);
  ok(baseState.sx <= 0, 'no horizontal scroll: ' + baseState.sx);
  const startHist = baseState.histLen;
  await page.evaluate(() => window.scrollTo(0, 40));
  await wait(page, 200);
  const y0 = await page.evaluate(() => scrollY);
  baseline = await rects(page);

  { // five pieces, opened and closed by the button, Esc and Back, mixed
    const pick = rows.slice(0, 5).map((e) => e.id);
    const how = ['button', 'esc', 'history', 'button', 'esc'];
    for (let i = 0; i < pick.length; i++) {
      const label = lbl(pick[i]);
      const c = await center(page, label);
      await page.mouse.move(c.x, c.y, { steps: 6 });
      await page.mouse.click(c.x, c.y);
      await wait(page, 1400);
      const r = await openRect(page);
      ok(r && Math.abs(r.w - r.vw) < 2 && Math.abs(r.h - r.vh) < 2 && Math.abs(r.x) < 2 && Math.abs(r.y) < 2, `open ${pick[i]} fills the window ${JSON.stringify(r)}`);
      const st = await state(page);
      ok(st.cur === label && st.hash === '#' + pick[i] && st.blank.length === 0 && st.locked && st.scrim, `open ${pick[i]} state ${st.cur} ${st.hash} blank=${st.blank}`);
      ok(st.histLen === startHist + 1, `one history entry pushed (${startHist} -> ${st.histLen})`);
      if (i === 0) await shot(page, 'open-desk');
      if (how[i] === 'button') await page.click('[data-lw=back]');
      else if (how[i] === 'esc') await page.keyboard.press('Escape');
      else await page.goBack();
      await closed(page, `close ${pick[i]} via ${how[i]}`, y0, label);
      const h = await page.evaluate(() => location.hash);
      ok(h === '', `hash cleared after ${how[i]} (${h})`);
      const hl = await page.evaluate(() => history.length);
      ok(hl === startHist + 1 || hl === startHist, `no stray entries left (${hl}, started ${startHist})`);
      await page.mouse.move(1, 1);
    }
  }
  { // a second tile clicked while the first is still opening
    const a = await center(page, lbl(rows[0].id));
    const b = await center(page, lbl(rows[3].id));
    await page.mouse.move(a.x, a.y, { steps: 4 });
    await page.mouse.click(a.x, a.y);
    await wait(page, 120);
    await page.mouse.click(b.x, b.y);
    await wait(page, 150);
    await page.mouse.click(a.x + 5, a.y + 5);
    await wait(page, 1300);
    const st = await state(page);
    ok(st.cur === lbl(rows[0].id), `second click while opening ignored, still ${st.cur}`);
    await page.keyboard.press('Escape');
    await closed(page, 'after double click', y0);
    await page.mouse.move(1, 1);
  }
  { // double-click then Esc spam
    const a = await center(page, lbl(rows[1].id));
    await page.mouse.move(a.x, a.y, { steps: 4 });
    await page.mouse.dblclick(a.x, a.y);
    await wait(page, 300);
    for (let i = 0; i < 3; i++) await page.keyboard.press('Escape');
    await closed(page, 'dblclick + Esc spam', y0);
    await page.mouse.move(1, 1);
  }
  { // close and open again at once
    const a = await center(page, lbl(rows[2].id));
    await page.mouse.click(a.x, a.y);
    await wait(page, 900);
    await page.keyboard.press('Escape');
    await page.mouse.click(a.x, a.y);
    await wait(page, 100);
    await page.mouse.click(a.x, a.y);
    await wait(page, 1500);
    const st = await state(page);
    ok(st.cur === null || st.hash !== '', `close then click at once: ${st.cur} ${st.hash} hist=${st.histLen}`);
    if (st.cur) { await page.keyboard.press('Escape'); await wait(page, 1200); }
    await closed(page, 'after close+click', y0);
    await page.mouse.move(1, 1);
    const hl = await page.evaluate(() => history.length);
    ok(hl <= startHist + 2, `history not piling up (${hl})`);
  }
  { // stepping: arrows, buttons, wrap, twelve quick steps
    const a = await center(page, lbl(rows[0].id));
    await page.mouse.click(a.x, a.y);
    await wait(page, 1400);
    await page.keyboard.press('ArrowRight');
    await wait(page, 200);
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await wait(page, 1400);
    let st = await state(page);
    ok(st.hash === '#' + rows[3].id, `3 right from ${rows[0].id} -> ${st.hash}`);
    const r = await openRect(page);
    ok(Math.abs(r.x) < 2 && Math.abs(r.w - r.vw) < 2, 'stepped tile settled full window');
    const cnt = await page.evaluate(() => document.querySelector('[data-lw=count]').textContent);
    ok(new RegExp(`^4 of ${rows.length}$`).test(cnt), 'counter reads ' + cnt);
    await page.keyboard.press('ArrowLeft');
    await wait(page, 100);
    await page.click('[data-lw=prev]');
    await wait(page, 100);
    await page.click('[data-lw=next]');
    await wait(page, 1400);
    st = await state(page);
    ok(st.hash === '#' + rows[2].id, `left, prev, next -> ${st.hash}`);
    for (let i = 0; i < 12; i++) { await page.keyboard.press('ArrowRight'); await wait(page, 40); }
    await wait(page, 1500);
    st = await state(page);
    ok(!!st.cur && st.blank.length === 0, `twelve quick rights lands on ${st.hash}, blank=${st.blank}`);
    const idNow = await page.evaluate(() => {
      const l = document.querySelector('.lw-tile.lw-open').getAttribute('aria-label');
      const d = JSON.parse(document.querySelector('[data-lw=data]').textContent);
      return d.find((e) => 'Open ' + e.title === l).id;
    });
    ok(st.hash.slice(1) === idNow, 'hash matches the piece after the spam');
    const expect12 = rows[(2 + 12) % rows.length].id;
    ok(idNow === expect12, `twelve steps from ${rows[2].id} land on ${expect12} (${idNow})`);
    const hl = await page.evaluate(() => history.length);
    ok(hl === startHist + 1, `stepping pushed nothing new (${hl})`);
    await page.click('[data-lw=back]');
    await closed(page, 'after stepping', y0);
    await page.mouse.move(1, 1);
  }
  { // the visit link and the "coming soon" mark
    const live = rows.find((e) => e.live && e.href);
    const soon = rows.find((e) => !e.live);
    if (live) {
      const a = await center(page, labelOf(live));
      await page.mouse.click(a.x, a.y);
      await wait(page, 1400);
      const v = await page.evaluate(() => {
        const x = document.querySelector('[data-lw=visit]');
        return { tag: x.tagName, href: x.getAttribute('href'), hidden: x.hidden, text: x.textContent.trim(), soon: document.querySelector('[data-lw=soon]').hidden, tryl: document.querySelector('[data-lw=try]').textContent, meta: document.querySelector('[data-lw=meta]').textContent };
      });
      ok(v.tag === 'A' && v.href === live.href && !v.hidden && v.soon && v.text === 'Visit ' + live.title, 'visit link ' + JSON.stringify(v));
      ok(v.meta.includes(live.designation + ' · ' + live.kindLabel + ' · ' + live.month), 'meta line has the number, kind and month: ' + v.meta);
      await page.keyboard.press('Escape');
      await closed(page, 'after visit check', y0);
      await page.mouse.move(1, 1);
    }
    if (soon) {
      const n = await center(page, labelOf(soon));
      await page.mouse.click(n.x, n.y);
      await wait(page, 1400);
      const s = await page.evaluate(() => ({ visit: document.querySelector('[data-lw=visit]').hidden, soon: document.querySelector('[data-lw=soon]').hidden, soonText: document.querySelector('[data-lw=soon]').textContent }));
      ok(s.visit && !s.soon && s.soonText === 'Coming soon', 'a piece that is not live has no link and says Coming soon ' + JSON.stringify(s));
      await page.keyboard.press('Escape');
      await closed(page, 'after coming soon', y0);
      await page.mouse.move(1, 1);
    }
  }
  { // the scheme switched with a piece open, and with the wall showing
    const label = lbl(rows[4].id);
    const a = await center(page, label);
    await page.mouse.click(a.x, a.y);
    await wait(page, 1300);
    const before = await page.evaluate(() => document.documentElement.dataset.scheme);
    await page.evaluate(() => document.getElementById('theme-toggle').click());
    await wait(page, 500);
    await shot(page, 'scheme-open');
    const after = await page.evaluate(() => document.documentElement.dataset.scheme);
    ok(after !== before, `scheme flipped while open: ${before} -> ${after}`);
    let st = await state(page);
    ok(st.blank.length === 0 && st.cur === label, 'the open piece survives the scheme flip');
    await page.keyboard.press('Escape');
    await closed(page, 'after scheme toggle', y0);
    await page.mouse.move(1, 1);
    await page.evaluate(() => document.getElementById('theme-toggle').click());
    await wait(page, 600);
    const back = await page.evaluate(() => document.documentElement.dataset.scheme);
    ok(back === before, 'scheme back on the wall: ' + back);
    st = await state(page);
    ok(st.blank.length === 0, 'the wall redrawn after the flip: blank=' + st.blank);
  }
  { // resize between desktop and phone with a piece open: the counter shows once, in the right place
    const a = await center(page, lbl(rows[5].id));
    await page.mouse.click(a.x, a.y);
    await wait(page, 1300);
    const N = rows.length;
    let d = await door(page);
    ok(d.pill && !d.metaNum && new RegExp(`^\\d+ of ${N}$`).test(d.count) && !/^\d+ of/.test(d.meta), 'desktop: the pill shows the counter, the meta line does not ' + JSON.stringify(d));
    await page.setViewportSize({ width: 390, height: 844 });
    await wait(page, 1100);
    d = await door(page);
    ok(!d.pill && d.metaNum && new RegExp(`^\\d+ of ${N} · `).test(d.meta) && (d.meta.match(/\d+ of \d+/g) || []).length === 1, 'resized to 390: the card shows "n of N" once and the pill is hidden ' + JSON.stringify(d));
    let r = await openRect(page);
    ok(r && Math.abs(r.w - 390) < 2 && Math.abs(r.h - 844) < 2, 'open tile resized to the phone window ' + JSON.stringify(r));
    await shot(page, 'resize-390-open');
    const stp = await state(page);
    ok(stp.sx <= 0 && stp.blank.length === 0, 'phone width, piece open: no sideways scroll, no blank ' + stp.sx);
    await page.keyboard.press('ArrowRight');
    await wait(page, 1200);
    d = await door(page);
    ok(!d.pill && d.metaNum && (d.meta.match(/\d+ of \d+/g) || []).length === 1, 'stepped at 390: still once ' + JSON.stringify(d));
    await page.setViewportSize({ width: 1440, height: 900 });
    await wait(page, 1100);
    d = await door(page);
    ok(d.pill && !d.metaNum && !/\d+ of \d+/.test(d.meta) && new RegExp(`^\\d+ of ${N}$`).test(d.count), 'back to 1440: the pill shows it once and the meta line does not ' + JSON.stringify(d));
    r = await openRect(page);
    ok(r && Math.abs(r.w - 1440) < 2 && Math.abs(r.h - 900) < 2, 'open tile back to the desktop window ' + JSON.stringify(r));
    await page.keyboard.press('Escape');
    await closed(page, 'after resize round trip', y0);
    await page.mouse.move(1, 1);
  }
  { // resize while closed
    await page.setViewportSize({ width: 1000, height: 700 });
    await wait(page, 800);
    await page.setViewportSize({ width: 1440, height: 900 });
    await wait(page, 1000);
    const now = await rects(page);
    ok(dev(baseline, now) < 3.5, 'the wall re-fits after a resize ' + dev(baseline, now).toFixed(1));
  }
  { // keyboard: Tab reaches every tile; the open piece keeps focus inside
    await page.goto(URL);
    await wait(page, 2000);
    await page.mouse.move(1, 1);
    const seen = [];
    for (let i = 0; i < rows.length + 30; i++) {
      await page.keyboard.press('Tab');
      seen.push(await page.evaluate(() => { const a = document.activeElement; return a.getAttribute('aria-label') || a.textContent.trim().slice(0, 14) || a.tagName; }));
    }
    const got = new Set(seen.filter((s) => s.startsWith('Open ')));
    ok(rows.every((e) => got.has(labelOf(e))), `Tab reaches every tile (${got.size} of ${rows.length})`);
    await page.evaluate(() => document.querySelector('.lw-tile').focus());
    await page.keyboard.press('Enter');
    await wait(page, 1400);
    const first = await page.evaluate(() => document.querySelector('.lw-tile').getAttribute('aria-label'));
    let st = await state(page);
    ok(st.cur === first, 'Enter opens the focused tile ' + st.cur);
    const f = await page.evaluate(() => document.activeElement.getAttribute('data-lw'));
    ok(f === 'back', 'focus moves into the open piece: ' + f);
    const inDoor = () => page.evaluate(() => { const a = document.activeElement; return a.closest('[data-lw=door]') ? 'door' : a.tagName + '.' + a.className; });
    for (let i = 0; i < 9; i++) await page.keyboard.press('Tab');
    ok((await inDoor()) === 'door', 'Tab stays inside the open piece: ' + (await inDoor()));
    for (let i = 0; i < 9; i++) await page.keyboard.press('Shift+Tab');
    ok((await inDoor()) === 'door', 'Shift+Tab stays inside the open piece: ' + (await inDoor()));
    await page.keyboard.press('Escape');
    await closed(page, 'keyboard open/close', undefined, first);
    await page.keyboard.press('Space');
    await wait(page, 1300);
    st = await state(page);
    ok(st.cur === first, 'Space opens the focused tile');
    await page.keyboard.press('Escape');
    await closed(page, 'space open/close');
  }
  { // Wall, List, Wall: a tile clicked 100ms after the switch back sits above the scrim
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(page, 200);
    await page.click('[data-lw-view=list]');
    await wait(page, 1000);
    let st = await state(page);
    ok(st.view === 'list', 'list view set');
    const vis = await page.evaluate(() => {
      const c = document.querySelector('.catalog');
      const w = document.querySelector('[data-lw=wall]');
      return { cat: getComputedStyle(c).display, wall: getComputedStyle(w).display, count: getComputedStyle(document.querySelector('.lab-page > .count')).display, cards: document.querySelectorAll('.catalog article').length };
    });
    ok(vis.cat !== 'none' && vis.wall === 'none' && vis.count !== 'none' && vis.cards === rows.length, 'list shows the catalog and its count and hides the wall ' + JSON.stringify(vis));
    await shot(page, 'list');
    for (const delay of [100, 30, 250]) {
      await page.click('[data-lw-view=wall]');
      await wait(page, delay);
      const spot = await page.evaluate(() => {
        const t = document.querySelectorAll('.lw-tile')[2];
        const r = t.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: Math.min(r.top + r.height / 2, innerHeight - 20), label: t.getAttribute('aria-label') };
      });
      await page.mouse.click(spot.x, spot.y);
      await wait(page, 1400);
      st = await state(page);
      const top = await page.evaluate(([x, y]) => {
        const e = document.elementFromPoint(x, y);
        const t = e && e.closest('.lw-tile');
        return { tile: t ? t.getAttribute('aria-label') : null, el: e ? e.className || e.tagName : null };
      }, [720, 400]);
      ok(st.cur === spot.label && top.tile === spot.label, `Wall, List, Wall, a tile clicked ${delay}ms later: it opens and sits above the scrim (${st.cur}; at the middle: ${top.tile || top.el})`);
      await page.keyboard.press('Escape');
      await wait(page, 1200);
      await page.mouse.move(1, 1);
      await page.click('[data-lw-view=list]');
      await wait(page, 700);
    }
    await page.reload();
    await wait(page, 1500);
    st = await state(page);
    ok(st.view === 'list', 'reload keeps List');
    ok((await page.evaluate(() => document.querySelectorAll('.lw-tile').length)) === 0, 'List at load: the engine is not mounted, no tiles');
    await page.click('[data-lw-view=wall]');
    await wait(page, 2400);
    st = await state(page);
    ok(st.view === 'wall' && st.blank.length === 0, 'Wall returns, nothing blank');
    ok((await page.evaluate(() => document.querySelectorAll('.lw-tile').length)) === rows.length, 'a tile for every piece after loading the engine from List');
    for (let i = 0; i < 2; i++) { await page.click('[data-lw-view=list]'); await page.click('[data-lw-view=wall]'); }
    await wait(page, 1600);
    st = await state(page);
    ok(st.view === 'wall' && st.blank.length === 0, 'toggle spam settled');
    await page.mouse.move(1, 1);
    await wait(page, 600);
    await page.evaluate(() => window.scrollTo(0, 40));
    await wait(page, 300);
    const now = await rects(page);
    ok(dev(baseline, now) < 4, 'tiles back where they hang after the toggle spam ' + dev(baseline, now).toFixed(1));
  }
  { // the filter, in both views
    const kinds = rows.map((e) => e.kind);
    const nS = kinds.filter((k) => k === 'study').length;
    const nE = kinds.length - nS;
    const fl = () => page.evaluate(() => ({
      out: document.querySelectorAll('.lw-tile.lw-out').length,
      inert: [...document.querySelectorAll('.lw-tile')].filter((t) => t.inert).length,
      cards: [...document.querySelectorAll('.catalog article')].filter((c) => getComputedStyle(c).display !== 'none').length,
      cur: document.querySelector('.lw-tile.lw-open')?.getAttribute('aria-label') ?? null,
    }));
    if (nS > 0 && nE > 0) {
      await page.click('nav.filter [data-set=study]');
      await wait(page, 900);
      let s = await fl();
      ok(s.out === nE && s.inert === nE, `wall: Studies leaves ${nE} out and inert ` + JSON.stringify(s));
      await shot(page, 'filter-studies');
      const now = await rects(page);
      ok(dev(baseline, now) < 4, 'filtered-out tiles stay where they hang, nothing re-laid ' + dev(baseline, now).toFixed(1));
      const out = await page.evaluate(() => {
        const t = document.querySelector('.lw-tile.lw-out');
        const r = t.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
      });
      await page.mouse.move(out.x, out.y, { steps: 4 });
      await page.mouse.click(out.x, out.y);
      await wait(page, 800);
      s = await fl();
      ok(s.cur === null, 'a click on a filtered-out tile opens nothing: ' + s.cur);
      const seen = [];
      await page.evaluate(() => document.activeElement.blur());
      for (let i = 0; i < nS + 24; i++) { await page.keyboard.press('Tab'); seen.push(await page.evaluate(() => document.activeElement.getAttribute('aria-label') || '')); }
      const tabbed = [...new Set(seen.filter((x) => x.startsWith('Open ')))];
      ok(tabbed.length === nS && tabbed.every((l) => rows.some((e) => e.kind === 'study' && labelOf(e) === l)), `Tab reaches only the ${nS} studies: ` + tabbed.join(', '));
      const a = await center(page, tabbed[0]);
      await page.mouse.click(a.x, a.y);
      await wait(page, 1400);
      const names = [];
      for (let i = 0; i < nS + 1; i++) {
        names.push(await page.evaluate(() => document.querySelector('.lw-tile.lw-open').getAttribute('aria-label')));
        await page.keyboard.press('ArrowRight');
        await wait(page, 900);
      }
      ok(names[0] === names[nS] && new Set(names).size === nS, 'the arrows stay inside the set: ' + names.join(' > '));
      const cnt = await page.evaluate(() => document.querySelector('[data-lw=count]').textContent);
      ok(new RegExp(` of ${nS}$`).test(cnt), 'the counter stays inside the filter: ' + cnt);
      await shot(page, 'filter-open');
      await page.keyboard.press('Escape');
      await wait(page, 1200);
      await page.mouse.move(1, 1);
      await page.click('[data-lw-view=list]');
      await wait(page, 900);
      s = await fl();
      ok(s.cards === nS, `list: Studies shows ${nS} cards ` + JSON.stringify(s));
      await page.click('nav.filter [data-set=experiment]');
      await wait(page, 600);
      s = await fl();
      ok(s.cards === nE, `list: Experiments shows ${nE} ` + s.cards);
      await page.click('[data-lw-view=wall]');
      await wait(page, 1500);
      s = await fl();
      ok(s.out === nS && s.inert === nS, 'the wall keeps the filter after List: ' + JSON.stringify(s));
      await page.click('nav.filter [data-set=all]');
      await wait(page, 1000);
      s = await fl();
      ok(s.out === 0 && s.inert === 0, 'All brings everything back ' + JSON.stringify(s));
      const st = await state(page);
      ok(st.sx <= 0, 'no sideways scroll after filtering: ' + st.sx);
    } else {
      ok(true, 'filter: the catalog has only one set, nothing to filter (skipped)');
    }
  }
  { // hover shows the number
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(page, 300);
    const e = rows[1];
    const c = await center(page, labelOf(e));
    await page.mouse.move(c.x, c.y, { steps: 8 });
    await wait(page, 900);
    const cap = await page.evaluate(() => {
      const t = document.querySelector('.lw-tile.lw-hot');
      if (!t) return null;
      return { d: getComputedStyle(t.querySelector('.lw-d')).display, n: t.querySelector('.lw-d').textContent, t: t.querySelector('.lw-t').textContent, o: getComputedStyle(t.querySelector('.lw-o')).display };
    });
    ok(cap && cap.d !== 'none' && cap.n === e.designation && cap.t === e.title && cap.o !== 'none', 'an awake tile shows its number, title and the Open mark: ' + JSON.stringify(cap));
    await page.mouse.move(1, 1);
  }
  { // the loop: it stops when the tab is hidden, when the list shows and when the wall is scrolled away, and it resumes
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(page, 500);
    const frames = async (ms) => { const a = await page.evaluate(() => window.__raf); await wait(page, ms); return (await page.evaluate(() => window.__raf)) - a; };
    const running = await frames(600);
    ok(running >= 10, `the loop runs on the wall (${running} frames in 600ms)`);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await wait(page, 250);
    const hidden = await frames(700);
    ok(hidden <= 2, `the loop stops when the page is hidden (${hidden} frames in 700ms)`);
    await page.evaluate(() => {
      delete document.hidden;
      delete document.visibilityState;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await wait(page, 250);
    const back = await frames(600);
    ok(back >= 10, `the loop resumes when the page is shown again (${back} frames in 600ms)`);
    // scrolled away: make the page tall enough that the wall can leave the window
    await page.evaluate(() => {
      const s = document.createElement('div');
      s.id = 'robust-spacer';
      s.style.cssText = 'height:4000px';
      document.querySelector('[data-lw=wall]').after(s);
    });
    await page.evaluate(() => window.scrollTo(0, document.querySelector('[data-lw=wall]').getBoundingClientRect().bottom + scrollY + 600));
    await wait(page, 700);
    const away = await frames(700);
    ok(away <= 2, `the loop stops when the wall is scrolled away (${away} frames in 700ms)`);
    await page.evaluate(() => window.scrollTo(0, 0));
    await wait(page, 500);
    const home = await frames(600);
    ok(home >= 10, `the loop resumes when the wall comes back (${home} frames in 600ms)`);
    await page.evaluate(() => document.getElementById('robust-spacer').remove());
    await page.click('[data-lw-view=list]');
    await wait(page, 800);
    const inList = await frames(600);
    ok(inList <= 2, `the loop sleeps in the List (${inList} frames in 600ms)`);
    await page.click('[data-lw-view=wall]');
    await wait(page, 900);
    const wallAgain = await frames(600);
    ok(wallAgain >= 10, `the loop runs again on the Wall (${wallAgain} frames in 600ms)`);
    // a hidden page with a piece open: the open piece sleeps too, and wakes
    const c = await center(page, lbl(rows[0].id));
    await page.mouse.click(c.x, c.y);
    await wait(page, 1300);
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await wait(page, 250);
    const openHidden = await frames(600);
    ok(openHidden <= 2, `the loop stops for a hidden page with a piece open (${openHidden})`);
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); });
    await wait(page, 300);
    ok((await frames(600)) >= 10, 'and resumes with it open');
    await page.keyboard.press('Escape');
    await wait(page, 1200);
  }
  { // the lamp: the bulb in the header, stored across a reload; none in the List
    const bulb = () => page.evaluate(() => {
      const b = document.querySelector('[data-lw=bulb]');
      const cs = getComputedStyle(b);
      return { shows: cs.display !== 'none', pressed: b.getAttribute('aria-pressed'), attr: document.documentElement.getAttribute('data-lab-lamp'), stored: localStorage.getItem('lab-lamp'), lamps: document.querySelectorAll('.lw-lamp').length, rims: document.querySelectorAll('.lw-rim').length };
    });
    await page.evaluate(() => { try { localStorage.removeItem('lab-lamp'); } catch (e) { /* none */ } });
    await page.goto(URL);
    await wait(page, 2200);
    let b = await bulb();
    ok(b.shows && b.attr === 'on' && b.pressed === 'true' && b.lamps === 1 && b.rims === rows.length, 'the lamp is on at first, the bulb shows ' + JSON.stringify(b));
    const place = await page.evaluate(() => {
      const bl = document.querySelector('[data-lw=bulb]').getBoundingClientRect();
      const sw = document.querySelector('#theme-toggle').getBoundingClientRect();
      return { gap: sw.left - bl.right, sameRow: Math.abs((bl.top + bl.height / 2) - (sw.top + sw.height / 2)) < 3 };
    });
    ok(place.sameRow && place.gap >= 0 && place.gap < 24, 'the bulb sits right beside the light/dark switch ' + JSON.stringify(place));
    await page.click('[data-lw=bulb]');
    await wait(page, 600);
    b = await bulb();
    ok(b.attr === 'off' && b.pressed === 'false' && b.stored === 'off' && b.lamps === 0 && b.rims === 0, 'bulb off: stored, no lamp layer, no rims ' + JSON.stringify(b));
    await page.reload();
    await wait(page, 2200);
    b = await bulb();
    ok(b.attr === 'off' && b.pressed === 'false' && b.lamps === 0 && b.shows, 'off stays off across a reload ' + JSON.stringify(b));
    await page.click('[data-lw=bulb]');
    await wait(page, 600);
    b = await bulb();
    ok(b.attr === 'on' && b.stored === 'on' && b.lamps === 1 && b.rims === rows.length, 'bulb on again ' + JSON.stringify(b));
    await page.reload();
    await wait(page, 2200);
    b = await bulb();
    ok(b.attr === 'on' && b.lamps === 1, 'on stays on across a reload');
    await page.click('[data-lw-view=list]');
    await wait(page, 700);
    b = await bulb();
    ok(!b.shows && b.lamps === 0, 'no bulb and no lamp in the List ' + JSON.stringify(b));
    await page.click('[data-lw-view=wall]');
    await wait(page, 1200);
    b = await bulb();
    ok(b.shows && b.lamps === 1, 'the bulb and the lamp are back on the Wall');
  }
  await ctx.close();
}

// ---------- the bulb on a light phone ----------
{
  const ctx = await context({ w: 390, h: 844, scheme: 'light', touch: true });
  const page = await ctx.newPage();
  watch(page, 'phone light');
  await page.goto(URL);
  await wait(page, 2200);
  const b = await page.evaluate(() => ({ shows: getComputedStyle(document.querySelector('[data-lw=bulb]')).display !== 'none', lamps: document.querySelectorAll('.lw-lamp').length }));
  ok(!b.shows && b.lamps === 0, 'no bulb and no lamp on a 390 light touch viewport ' + JSON.stringify(b));
  await ctx.close();
  const ctx2 = await context({ w: 390, h: 844, scheme: 'dark', touch: true });
  const p2 = await ctx2.newPage();
  watch(p2, 'phone dark');
  await p2.goto(URL);
  await wait(p2, 2200);
  const d = await p2.evaluate(() => ({ shows: getComputedStyle(document.querySelector('[data-lw=bulb]')).display !== 'none', lamps: document.querySelectorAll('.lw-lamp').length }));
  ok(d.shows && d.lamps === 1, 'the bulb and the lamp run on a 390 dark touch viewport ' + JSON.stringify(d));
  await ctx2.close();
}

// ---------- the bulb never takes a tap meant for the nav ----------
// On a phone the header's gaps close up and the bulb's touch area (a 44 tall square-ish pad around the 24px drawn one)
// must stop where the nav does: no pixel of a nav link answers with the bulb, nor any pixel of the light/dark switch,
// and the pad is still tall and wide enough to hit.
for (const w of [390, 360]) {
  const ctx = await context({ w, h: 844, scheme: 'dark', touch: true });
  const page = await ctx.newPage();
  watch(page, `bulb hit ${w}`);
  await page.goto(URL);
  await wait(page, 1800);
  const r = await page.evaluate(() => {
    const isBulb = (e) => !!(e && e.closest('[data-lw=bulb]'));
    const bulb = document.querySelector('[data-lw=bulb]');
    const out = { links: 0, samples: 0, bulb: 0, stray: 0, sw: 0, swSamples: 0 };
    // every point, half a pixel apart, across the whole box of each nav link and of the switch
    const sweep = (el, f) => {
      const b = el.getBoundingClientRect();
      for (let x = b.left + 0.01; x < b.right; x += 0.5) for (let y = b.top + 0.01; y < b.bottom; y += 0.5) f(document.elementFromPoint(x, y));
    };
    for (const a of document.querySelectorAll('header nav a')) {
      out.links++;
      sweep(a, (e) => { out.samples++; if (isBulb(e)) out.bulb++; else if (!a.contains(e)) out.stray++; });
    }
    sweep(document.querySelector('#theme-toggle'), (e) => { out.swSamples++; if (isBulb(e)) out.sw++; });
    const bl = bulb.getBoundingClientRect();
    const sw = document.querySelector('#theme-toggle').getBoundingClientRect();
    // the pad, found by walking a row and a column through the bulb's centre
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (let x = bl.left - 30; x < sw.right; x += 0.25) if (isBulb(document.elementFromPoint(x, bl.top + bl.height / 2))) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
    for (let y = bl.top - 30; y < bl.bottom + 30; y += 0.25) if (isBulb(document.elementFromPoint(bl.left + bl.width / 2, y))) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    return { ...out, pad: { x0, x1, y0, y1, w: x1 - x0 + 0.25, h: y1 - y0 + 0.25 }, drawn: [bl.width, bl.height], gap: sw.left - bl.right };
  });
  ok(r.links === 4 && r.samples > 400 && r.bulb === 0 && r.stray === 0, `bulb hit ${w}: no point of any nav link answers with the bulb (${r.samples} points over ${r.links} links; bulb ${r.bulb}, other ${r.stray})`);
  ok(r.sw === 0 && r.swSamples > 100, `bulb hit ${w}: no point of the light/dark switch answers with the bulb (${r.swSamples} points)`);
  // The pad is laid out 40 by 44 around the 24px square; hit-testing hands the last pixel before the switch to the switch, so it reads about 39 wide.
  ok(r.pad.h >= 43.5 && r.pad.w >= 38.5, `bulb hit ${w}: the touch pad is still at least 44 tall and about 40 wide (${r.pad.w} by ${r.pad.h}); the drawn box is ${r.drawn.join(' by ')}, 8px from the switch (${r.gap})`);
  // a tap on the bulb's centre, and just inside each corner of the pad, flips the lamp each time
  const flips = [];
  const at = async (x, y) => {
    const before = await page.evaluate(() => document.documentElement.getAttribute('data-lab-lamp'));
    await page.touchscreen.tap(x, y);
    await wait(page, 150);
    const after = await page.evaluate(() => document.documentElement.getAttribute('data-lab-lamp'));
    flips.push(before !== after);
  };
  const cy = (r.pad.y0 + r.pad.y1) / 2;
  await at((r.pad.x0 + r.pad.x1) / 2, cy);
  for (const [x, y] of [[r.pad.x0 + 1, r.pad.y0 + 1], [r.pad.x1 - 1, r.pad.y0 + 1], [r.pad.x0 + 1, r.pad.y1 - 1], [r.pad.x1 - 1, r.pad.y1 - 1]]) await at(x, y);
  ok(flips.length === 5 && flips.every(Boolean), `bulb hit ${w}: a tap on the bulb's centre and just inside each corner of its pad flips the lamp (${flips.join(', ')})`);
  // and a tap on the right edge of "Contact" goes to Contact
  const edge = await page.evaluate(() => { const a = [...document.querySelectorAll('header nav a')].find((x) => x.textContent.trim() === 'Contact'); const b = a.getBoundingClientRect(); return { x: b.right - 0.5, y: b.top + b.height / 2 }; });
  await Promise.all([page.waitForURL(/\/contact\/?$/, { timeout: 8000 }).catch(() => {}), page.touchscreen.tap(edge.x, edge.y)]);
  ok(/\/contact\/?$/.test(page.url()), `bulb hit ${w}: a tap on the right edge of "Contact" goes to Contact (${page.url()})`);
  await ctx.close();
}

// ---------- links to a piece ----------
{
  const ctx = await context();
  const page = await ctx.newPage();
  watch(page, 'links');
  await page.goto(URL);
  await wait(page, 2000);
  const rows = await data(page);
  const id = rows.find((e) => e.id === 'bdl-007') ? 'bdl-007' : rows[0].id;
  const e = rows.find((x) => x.id === id);
  const away = BASE + '/about/';
  const here = () => page.evaluate(() => ({ path: location.pathname, hash: location.hash, cur: document.querySelector('.lw-tile.lw-open')?.getAttribute('aria-label') ?? null, view: document.documentElement.dataset.labView, hist: history.length, locked: document.documentElement.classList.contains('lw-locked') }));

  await page.goto(away);
  await wait(page, 600);
  await page.goto(`${URL}#${id}`);
  await wait(page, 2600);
  let s = await here();
  ok(s.cur === labelOf(e) && s.path === '/lab/' && s.hash === '' && s.locked, `a link to ${id} opens that piece, the address is plain /lab/ ` + JSON.stringify(s));
  await shot(page, 'hash-open');
  const r = await openRect(page);
  ok(r && Math.abs(r.w - r.vw) < 2 && Math.abs(r.h - r.vh) < 2, 'the linked piece fills the window');
  await page.goBack();
  await wait(page, 900);
  ok(page.url() === away, `Back from a linked piece leaves /lab/ the way the visitor came (${page.url()})`);

  await page.goto(`${URL}#${id.toUpperCase()}`);
  await wait(page, 2600);
  s = await here();
  ok(s.cur === labelOf(e) && s.hash === '', 'the id in capitals opens it too');

  await page.goto(away);
  await wait(page, 600);
  await page.goto(`${URL}#${id}`);
  await wait(page, 2600);
  await page.keyboard.press('Escape');
  await wait(page, 1300);
  s = await here();
  ok(s.cur === null && !s.locked && s.hash === '' && s.path === '/lab/', `Esc closes a linked piece, still on plain /lab/ ` + JSON.stringify(s));
  await page.goBack();
  await wait(page, 900);
  ok(page.url() === away, 'Back after closing it leaves /lab/ too');

  await page.goto(`${URL}#nope`);
  await wait(page, 2600);
  s = await here();
  const st = await state(page);
  ok(s.cur === null && s.hash === '' && st.view === 'wall' && !st.locked, 'an unknown id: the wall, nothing open, the hash gone ' + JSON.stringify(s));
  await page.goto(away);
  await wait(page, 500);
  await page.goto(`${URL}#nope`);
  await wait(page, 2400);
  await page.goBack();
  await wait(page, 900);
  ok(page.url() === away, 'Back after an unknown id leaves /lab/ in one press');

  // with List remembered, a link still opens the piece, over the wall, for that visit only
  await page.goto(away);
  await page.evaluate(() => localStorage.setItem('lab-view', 'list'));
  const listed = rows.find((x) => x.id === 'bdl-012') ?? rows[1];
  await page.goto(`${URL}#${listed.id}`);
  await wait(page, 2600);
  s = await here();
  const stored = await page.evaluate(() => localStorage.getItem('lab-view'));
  ok(s.cur === labelOf(listed) && s.view === 'wall' && stored === 'list', `with List remembered, a link opens ${listed.id} over the wall and leaves the choice alone ` + JSON.stringify({ ...s, stored }));
  const pressed = await page.evaluate(() => [...document.querySelectorAll('[data-lw-view]')].map((b) => b.dataset.lwView + ':' + b.getAttribute('aria-pressed')).join(' '));
  ok(pressed === 'wall:true list:false', 'the toggle shows Wall for that visit: ' + pressed);
  await page.keyboard.press('Escape');
  await wait(page, 1300);
  await page.goto(URL);
  await wait(page, 1500);
  s = await here();
  ok(s.view === 'list', 'a plain /lab/ after it is the List again');
  await page.goto(away);
  await wait(page, 500);
  await page.goto(`${URL}#nope`);
  await wait(page, 1500);
  s = await here();
  ok(s.view === 'list' && s.hash === '', 'an unknown id with List remembered stays on the List, the hash gone');
  await page.evaluate(() => localStorage.removeItem('lab-view'));
  await ctx.close();

  // a link to a piece the filter would hide opens it, with the filter set to All
  const ctx2 = await context();
  await ctx2.addInitScript(() => {
    const mo = new MutationObserver((m, o) => {
      const c = document.querySelector('.catalog');
      if (c) { c.dataset.filter = 'study'; o.disconnect(); }
    });
    mo.observe(document, { childList: true, subtree: true });
  });
  const p2 = await ctx2.newPage();
  watch(p2, 'links filter');
  const exp = rows.find((x) => x.kind === 'experiment');
  const hasStudy = rows.some((x) => x.kind === 'study');
  if (exp && hasStudy) {
    await p2.goto(`${URL}#${exp.id}`);
    await wait(p2, 2600);
    const f = await p2.evaluate(() => ({ filter: document.querySelector('.catalog').dataset.filter, cur: document.querySelector('.lw-tile.lw-open')?.getAttribute('aria-label') ?? null, current: document.querySelector('.filter a[aria-current]')?.dataset.set, out: document.querySelectorAll('.lw-tile.lw-out').length }));
    ok(f.cur === labelOf(exp) && f.filter === 'all' && f.current === 'all' && f.out === 0, `a link to a piece outside the filter opens it with the filter set to All ` + JSON.stringify(f));
  }
  await ctx2.close();
}

// ---------- an engine that will not load ----------
{
  const own = [];
  const ctx = await context();
  await ctx.route('**/_astro/wall.*.js', (route) => route.abort());
  const page = await ctx.newPage();
  watch(page, 'no engine', own);
  await page.goto(URL);
  await wait(page, 2500);
  const s = await page.evaluate(() => ({ view: document.documentElement.dataset.labView, tiles: document.querySelectorAll('.lw-tile').length, cards: [...document.querySelectorAll('.catalog article')].filter((c) => getComputedStyle(c).display !== 'none').length, wall: getComputedStyle(document.querySelector('[data-lw=wall]')).display, pressed: document.querySelector('[data-lw-view=list]').getAttribute('aria-pressed') }));
  ok(s.view === 'list' && s.tiles === 0 && s.cards > 0 && s.wall === 'none' && s.pressed === 'true', 'the engine will not load: the page falls back to the list ' + JSON.stringify(s));
  const stored = await page.evaluate(() => localStorage.getItem('lab-view'));
  ok(stored !== 'list', 'and the failure is not remembered as a choice (' + stored + ')');
  await shot(page, 'no-engine');
  await ctx.close();
}

// ---------- a piece open across a reload: Back is never a dead press ----------
// Open a piece (an entry is pushed at /lab/#id), reload: the piece is open again on that same entry. Closing it, by the
// button, Esc or Back, shows the wall at /lab/, and from there one more Back leaves /lab/. Every start is from another
// page, so "leaves" can be seen.
{
  const ctx = await context();
  const page = await ctx.newPage();
  watch(page, 'reload open');
  const away = BASE + '/about/';
  await page.goto(URL);
  await wait(page, 2000);
  const rows = await data(page);
  const piece = rows[2];
  const next = rows[3];
  const here = () => page.evaluate(() => ({ path: location.pathname, hash: location.hash, cur: document.querySelector('.lw-tile.lw-open')?.getAttribute('aria-label') ?? null, locked: document.documentElement.classList.contains('lw-locked'), hist: history.length, view: document.documentElement.dataset.labView }));
  const openIt = async (e) => {
    await page.goto(away);
    await wait(page, 500);
    await page.goto(URL);
    await wait(page, 2200);
    await page.mouse.move(1, 1);
    const c = await center(page, labelOf(e));
    await page.mouse.click(c.x, c.y);
    await wait(page, 1300);
  };
  for (const how of ['button', 'esc', 'back']) {
    await openIt(piece);
    const h0 = (await here()).hist;
    await page.reload();
    await wait(page, 2600);
    let s = await here();
    ok(s.cur === labelOf(piece) && s.hash === '#' + piece.id && s.locked && s.hist === h0, `reload with a piece open (closed by ${how} after): it is open again on the same entry ` + JSON.stringify(s));
    if (how === 'button') await page.click('[data-lw=back]');
    else if (how === 'esc') await page.keyboard.press('Escape');
    else await page.goBack();
    await wait(page, 1400);
    s = await here();
    ok(s.cur === null && !s.locked && s.path === '/lab/' && s.hash === '' && s.view === 'wall', `reload, then ${how}: the wall at plain /lab/ ` + JSON.stringify(s));
    await page.goBack();
    await wait(page, 1000);
    ok(page.url() === away, `reload, then ${how}, then Back: one press leaves /lab/, not a dead press or a second /lab/ entry (${page.url()})`);
  }
  { // open, step, reload, step, reload, close: the entry follows the piece the whole way
    await openIt(piece);
    await page.keyboard.press('ArrowRight');
    await wait(page, 1200);
    await page.reload();
    await wait(page, 2600);
    let s = await here();
    ok(s.cur === labelOf(next) && s.hash === '#' + next.id, `open, step, reload: the stepped piece is open again ` + JSON.stringify(s));
    await page.keyboard.press('ArrowLeft');
    await wait(page, 1200);
    await page.reload();
    await wait(page, 2600);
    s = await here();
    ok(s.cur === labelOf(piece) && s.hash === '#' + piece.id, `then step back, reload: that piece is open again ` + JSON.stringify(s));
    await page.click('[data-lw=back]');
    await wait(page, 1400);
    s = await here();
    ok(s.cur === null && s.path === '/lab/' && s.hash === '', 'then close: the wall at plain /lab/ ' + JSON.stringify(s));
    await page.goBack();
    await wait(page, 1000);
    ok(page.url() === away, `then Back leaves /lab/ in one press (${page.url()})`);
  }
  { // Forward from the wall opens it again, and Back and the button still agree
    await openIt(piece);
    await page.reload();
    await wait(page, 2600);
    await page.goBack();
    await wait(page, 1200);
    let s = await here();
    ok(s.cur === null && s.path === '/lab/' && s.hash === '', 'reload, then Back from the open piece: it closes, the wall at /lab/ ' + JSON.stringify(s));
    await page.goForward();
    await wait(page, 1500);
    s = await here();
    ok(s.cur === labelOf(piece) && s.hash === '#' + piece.id, 'then Forward: the piece is open again ' + JSON.stringify(s));
    await page.click('[data-lw=back]');
    await wait(page, 1400);
    s = await here();
    ok(s.cur === null && s.hash === '', 'then the button closes it ' + JSON.stringify(s));
    await page.goBack();
    await wait(page, 1000);
    ok(page.url() === away, `and Back leaves /lab/ (${page.url()})`);
  }
  { // a link still behaves as before: one Back leaves, even after a reload
    await page.goto(away);
    await wait(page, 500);
    await page.goto(`${URL}#${piece.id}`);
    await wait(page, 2400);
    await page.reload();
    await wait(page, 2400);
    const s = await here();
    ok(s.cur === null && s.path === '/lab/' && s.hash === '', 'a linked piece, reloaded: the wall at plain /lab/ (the link had no entry of its own) ' + JSON.stringify(s));
    await page.goBack();
    await wait(page, 1000);
    ok(page.url() === away, `and one Back leaves /lab/ (${page.url()})`);
  }
  // The entry the page pushed for a piece, reloaded onto, with the engine not yet here and the visitor choosing the List
  // first: the page steps off that entry onto the wall's own, so no press of Back is dead (left in place it would only
  // drop the hash and change nothing on screen), and the Wall chosen afterwards opens nothing.
  {
    await openIt(piece);
    let release;
    const gate = new Promise((r) => (release = r));
    await page.route(ENGINE_JS, async (route) => { await gate; await route.continue(); });
    await page.reload({ waitUntil: 'commit' });
    await wait(page, 1500);
    await page.click('[data-lw-view=list]');
    await wait(page, 1500);
    let s = await here();
    ok(s.cur === null && s.path === '/lab/' && s.hash === '' && s.view === 'list' && !s.locked, 'reload onto a piece, the List before the engine: the List at plain /lab/, its entry left behind ' + JSON.stringify(s));
    await page.click('[data-lw-view=wall]');
    release();
    await wait(page, 2600);
    s = await here();
    ok(s.cur === null && s.path === '/lab/' && s.hash === '' && s.view === 'wall' && !s.locked, 'then the Wall: shown, nothing open, no hash left in the bar ' + JSON.stringify(s));
    await page.unroute(ENGINE_JS);
    await page.goBack();
    await wait(page, 1000);
    ok(page.url() === away, `and one Back leaves /lab/, not a dead press (${page.url()})`);
  }
  await ctx.close();
}

// ---------- the same reload, and the engine never comes ----------
{
  const own = [];
  const ctx = await context();
  const page = await ctx.newPage();
  watch(page, 'reload open, no engine', own);
  const away = BASE + '/about/';
  await page.goto(URL);
  await wait(page, 2000);
  const piece = (await data(page))[2];
  await page.goto(away);
  await wait(page, 500);
  await page.goto(URL);
  await wait(page, 2200);
  await page.mouse.move(1, 1);
  const c = await center(page, labelOf(piece));
  await page.mouse.click(c.x, c.y);
  await wait(page, 1300);
  await page.route(ENGINE_JS, (route) => route.abort());
  await page.reload();
  await wait(page, 2200);
  const s = await page.evaluate(() => ({ path: location.pathname, hash: location.hash, view: document.documentElement.dataset.labView, tiles: document.querySelectorAll('.lw-tile').length, locked: document.documentElement.classList.contains('lw-locked') }));
  ok(s.path === '/lab/' && s.hash === '' && s.view === 'list' && s.tiles === 0 && !s.locked, 'reload onto a piece, the engine fails outright: the List at plain /lab/, nothing open, its entry left behind ' + JSON.stringify(s));
  await page.unroute(ENGINE_JS);
  await page.goBack();
  await wait(page, 1000);
  ok(page.url() === away, `and one Back leaves /lab/, not a dead press (${page.url()})`);
  if (own.length) console.log('     (expected console noise from the failed engine:', own.length, 'lines)');
  await ctx.close();
}

// ---------- a click before the engine arrives is not lost ----------
// The first paint hangs framed, captioned tiles; a click, tap, Enter or Space on one before the engine is here is
// remembered (the last wins), and that piece opens through the normal path as soon as the engine mounts.
{
  const own = [];
  const held = async ({ w = 1440, h = 900, touch = false, scripts = ALL_JS, view = null, tag }) => {
    const ctx = await context({ w, h, scheme: 'dark', touch, view });
    const page = await ctx.newPage();
    watch(page, tag, own);
    let release;
    let fail = false;
    const gate = new Promise((r) => (release = r));
    await page.route(scripts, async (route) => { await gate; if (fail) await route.abort(); else await route.continue(); });
    await page.goto(URL, { waitUntil: 'commit' });
    await page.waitForSelector('.lw-tile[data-lw-id]', { state: 'attached' });
    await wait(page, 700);
    return { ctx, page, release, abort: () => { fail = true; release(); } };
  };
  /** The framed tiles whose middle is in the window, with the middle. */
  const framed = (page) => page.evaluate(() => [...document.querySelectorAll('.lw-tile[data-lw-id]')].map((t) => {
    const r = t.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const top = document.elementFromPoint(x, y);
    return { id: t.getAttribute('data-lw-id'), x, y, ok: y > 0 && y < innerHeight && x > 0 && x < innerWidth && !!top && t.contains(top) };
  }).filter((t) => t.ok));
  const open = (page) => page.evaluate(() => ({ cur: document.querySelector('.lw-tile.lw-open')?.getAttribute('aria-label') ?? null, hash: location.hash, hist: history.length, focus: document.activeElement?.getAttribute('data-lw') ?? null, view: document.documentElement.dataset.labView, early: document.querySelector('[data-lw=wall]')?.getAttribute('data-lw-early') ?? null, tiles: document.querySelectorAll('.lw-tile').length }));
  const titleOf = async (page, id) => 'Open ' + (await page.evaluate((id) => document.querySelector(`.lw-tile[data-lw-id="${id}"] .lw-t`).textContent, id));

  { // a mouse click, then a later click on another tile: the last wins; Back closes it
    const h = await held({ tag: 'early click' });
    const tiles = await framed(h.page);
    ok(tiles.length >= 4, `early click: framed tiles are there before any script (${tiles.length} in the window)`);
    const roles = await h.page.evaluate(() => [...document.querySelectorAll('.lw-tile[data-lw-id]')].every((t) => t.getAttribute('role') === 'button' && t.getAttribute('tabindex') === '0'));
    ok(roles, 'early click: every framed tile already has role=button and tabindex=0');
    const h0 = (await open(h.page)).hist;
    await h.page.mouse.click(tiles[0].x, tiles[0].y);
    await h.page.mouse.click(tiles[1].x, tiles[1].y);
    const mem = await open(h.page);
    ok(mem.early === tiles[1].id && mem.cur === null, `early click: the last click is remembered, nothing is open yet (${mem.early})`);
    h.release();
    await untilLive(h.page);
    await wait(h.page, 1800);
    const s = await open(h.page);
    ok(s.cur === (await titleOf(h.page, tiles[1].id)) && s.hash === '#' + tiles[1].id && s.hist === h0 + 1 && s.focus === 'back' && s.early === null, 'early click: when the engine arrives the last piece clicked opens, its entry pushed, focus on Back ' + JSON.stringify(s));
    await h.page.goBack();
    await wait(h.page, 1200);
    const b = await open(h.page);
    ok(b.cur === null && b.hash === '', 'early click: Back closes it ' + JSON.stringify(b));
    const again = await framed(h.page);
    await h.page.mouse.click(again[0].x, again[0].y);
    await wait(h.page, 1300);
    const c = await open(h.page);
    ok(c.cur === (await titleOf(h.page, again[0].id)) && c.hist === h0 + 1, 'early click: after mount a click opens a piece once, as ever ' + JSON.stringify(c));
    await h.ctx.close();
  }
  for (const key of ['Enter', 'Space']) { // Tab to a framed tile and press the key
    const h = await held({ tag: 'early key ' + key });
    let id = null;
    for (let i = 0; i < 40 && !id; i++) {
      await h.page.keyboard.press('Tab');
      id = await h.page.evaluate(() => document.activeElement?.getAttribute('data-lw-id') ?? null);
    }
    ok(!!id, `early ${key}: Tab reaches a framed tile before the engine`);
    const y0 = await h.page.evaluate(() => scrollY);
    await h.page.keyboard.press(key);
    await wait(h.page, 200);
    ok((await h.page.evaluate(() => scrollY)) === y0, `early ${key}: the page does not scroll`);
    const h0 = (await open(h.page)).hist;
    h.release();
    await untilLive(h.page);
    await wait(h.page, 1800);
    const s = await open(h.page);
    ok(id && s.cur === (await titleOf(h.page, id)) && s.hash === '#' + id && s.hist === h0 + 1 && s.focus === 'back', `early ${key}: that piece opens when the engine arrives ` + JSON.stringify(s));
    await h.page.keyboard.press('Escape');
    await wait(h.page, 1300);
    const f = await h.page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? null);
    ok(f === (await titleOf(h.page, id)) || f === s.cur, `early ${key}: closing it puts focus back on the tile (${f})`);
    await h.ctx.close();
  }
  { // a tap on a phone
    const h = await held({ w: 390, h: 844, touch: true, tag: 'early tap' });
    const tiles = await framed(h.page);
    ok(tiles.length >= 1, `early tap: a framed tile is in the window at 390 (${tiles.length})`);
    const t = tiles[0];
    const h0 = (await open(h.page)).hist;
    await h.page.touchscreen.tap(t.x, t.y);
    await wait(h.page, 200);
    h.release();
    await untilLive(h.page);
    await wait(h.page, 1800);
    const s = await open(h.page);
    ok(s.cur === (await titleOf(h.page, t.id)) && s.hash === '#' + t.id && s.hist === h0 + 1, 'early tap: the tapped piece opens when the engine arrives ' + JSON.stringify(s));
    await h.ctx.close();
  }
  { // the engine fails outright: the list shows and nothing opens
    const h = await held({ scripts: ENGINE_JS, tag: 'early click, no engine' });
    const tiles = await framed(h.page);
    const h0 = (await open(h.page)).hist;
    await h.page.mouse.click(tiles[0].x, tiles[0].y);
    h.abort();
    await wait(h.page, 2500);
    const s = await open(h.page);
    const list = await h.page.evaluate(() => [...document.querySelectorAll('.catalog article')].filter((c) => getComputedStyle(c).display !== 'none').length);
    ok(s.view === 'list' && s.cur === null && s.hash === '' && s.early === null && s.tiles === 0 && s.hist === h0 && list > 0, 'early click, engine failed: the list shows and nothing opens ' + JSON.stringify({ ...s, list }));
    await h.ctx.close();
  }
  { // a click, then the List, then the Wall again before the engine: the click is let go
    const h = await held({ scripts: ENGINE_JS, tag: 'early click then List' });
    await wait(h.page, 800);
    const tiles = await framed(h.page);
    await h.page.mouse.click(tiles[0].x, tiles[0].y);
    await h.page.click('[data-lw-view=list]');
    await wait(h.page, 400);
    await h.page.click('[data-lw-view=wall]');
    await wait(h.page, 400);
    const h0 = (await open(h.page)).hist;
    h.release();
    await untilLive(h.page);
    await wait(h.page, 1500);
    const s = await open(h.page);
    ok(s.cur === null && s.hash === '' && s.view === 'wall' && s.hist === h0 && s.early === null, 'early click, then List, then Wall: the click is not carried across ' + JSON.stringify(s));
    await h.ctx.close();
  }
  if (own.length) console.log('     (expected console noise from the failed engine:', own.length, 'lines)');
}

// ---------- slow load ----------
{
  const ctx = await context();
  await ctx.addInitScript(() => {
    window.__samples = [];
    const t0 = performance.now();
    const take = () => {
      const w = document.querySelector('[data-lw=wall]');
      const f = document.querySelector('footer');
      if (w && f && getComputedStyle(w).display !== 'none') {
        const r = w.getBoundingClientRect();
        const fr = f.getBoundingClientRect();
        const tiles = [...document.querySelectorAll('.lw-tile')];
        window.__samples.push({
          t: Math.round(performance.now() - t0), h: Math.round(r.height * 10) / 10, left: Math.round(r.left * 10) / 10, w: Math.round(r.width * 10) / 10,
          below: Math.round((fr.top - r.bottom) * 10) / 10, bottom: Math.round((r.bottom + scrollY) * 10) / 10, tiles: tiles.length,
          captioned: tiles.filter((x) => (x.querySelector('.lw-t') || {}).textContent).length,
          drawn: document.querySelectorAll('.lw-drawn').length,
        });
      }
    };
    const loop = () => { take(); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const page = await ctx.newPage();
  watch(page, 'slow');
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: Math.round((1.6 * 1024 * 1024) / 8), uploadThroughput: Math.round((750 * 1024) / 8) });
  await page.goto(URL, { waitUntil: 'commit' });
  await page.waitForFunction(() => window.__samples && window.__samples.some((s) => s.drawn > 0), null, { timeout: 60000 }).catch(() => {});
  await wait(page, 4000);
  const samples = await page.evaluate(() => window.__samples);
  const first = samples[0];
  const firstTiles = samples.find((s) => s.tiles > 0);
  const firstDrawn = samples.find((s) => s.drawn > 0);
  ok(!!first && !!firstTiles && !!firstDrawn, `slow load: samples taken, tiles appear, pictures appear (${samples.length} samples)`);
  if (first && firstTiles && firstDrawn) {
    // The box is sized from what sits above it, so a late web font that reflows the sentence above moves its top and
    // its height together: its lower edge, and the footer under it, stay where they are. What must never change is the
    // box when the engine takes over: from the moment the tiles are there to the last picture, one height.
    const hs = samples.map((s) => s.h);
    const mounted = samples.filter((s) => s.t >= firstTiles.t).map((s) => s.h);
    const spanM = Math.max(...mounted) - Math.min(...mounted);
    const bots = samples.map((s) => s.bottom);
    const spanB = Math.max(...bots) - Math.min(...bots);
    if (spanM > 1 || spanB > 1) { let last = ''; for (const x of samples) { const k = [x.h, x.bottom, x.below, x.tiles].join('|'); if (k !== last) { console.log('     sample', JSON.stringify(x)); last = k; } } }
    ok(spanM <= 1, `slow load: the wall box does not change height when the engine mounts, nor while the pictures fade in (${Math.min(...mounted)} to ${Math.max(...mounted)})`);
    ok(spanB <= 1, `slow load: the wall's lower edge never moves, from first paint to the last picture (${Math.min(...bots)} to ${Math.max(...bots)}; the height ${Math.min(...hs)} to ${Math.max(...hs)} follows the top as a web font arrives)`);
    const bs = samples.map((s) => s.below);
    ok(Math.max(...bs) - Math.min(...bs) <= 1, `slow load: what sits below the wall does not move relative to it (${Math.min(...bs)} to ${Math.max(...bs)})`);
    const ls = samples.map((s) => s.left + ':' + s.w);
    ok(new Set(ls).size === 1, `slow load: the wall box keeps its width and its full-bleed edge (${[...new Set(ls)].join(', ')})`);
    // Never an empty box: the very first frame the wall shows already has every tile framed and captioned, before any script has arrived.
    ok(first.tiles > 0 && first.captioned === first.tiles && first.drawn === 0, `slow load: the first frame the wall shows already holds framed, captioned tiles (${first.tiles} tiles, ${first.captioned} captioned, at ${first.t}ms)`);
    ok(firstTiles.t < firstDrawn.t && firstTiles.captioned === firstTiles.tiles && firstTiles.drawn === 0, `slow load: framed, captioned tiles come first (${firstTiles.t}ms), then the pictures fade in (${firstDrawn.t}ms; the box was there at ${first.t}ms)`);
  }
  await ctx.close();
}

// ---------- a web font that lands after the wall was measured ----------
// The slow load above hits this only now and then: the page measures the wall with the fallback face, in which the
// intro's sentence can take two lines where the web font takes one, and the font lands at some point after. Here it is
// made to happen every time: the web fonts and some scripts are held, and each case releases them in the order it
// wants. The wall's top must really have moved, or the case tested nothing, and the wall's lower edge must not, at any
// read: at the start of each frame (requestAnimationFrame, where anything in the frame first sees the layout) and after
// the frame is painted (a task of its own, which can fall between a face being put to use and any script hearing of it).
// The wall's box is the row the page leaves it (lab-wall.css), so the layout that moves the top moves the height with
// it and no read can meet the old height: a single stale read, in any run, is a FAIL, whichever order the fonts and the
// engine arrive in.
const LATE_RUNS = Math.max(1, Number(process.env.LATE_RUNS) || 16);

/** A load of /lab/ with the web fonts and the scripts matching `scripts` held. `run(page, { fonts, scripts })` releases them in the order the case wants; what the page saw of the wall comes back. */
async function lateLoad({ w, view = null, scripts: re = ALL_JS, tag, run }) {
  const ctx = await context({ w, h: 900, scheme: 'dark', view });
  await ctx.addInitScript(() => {
    window.__late = [];
    const read = (when) => {
      const el = document.querySelector('[data-lw=wall]');
      if (!el || getComputedStyle(el).display === 'none') return;
      const r = el.getBoundingClientRect();
      window.__late.push({ when, top: Math.round((r.top + scrollY) * 10) / 10, bottom: Math.round((r.bottom + scrollY) * 10) / 10, live: el.hasAttribute('data-lw-live') });
    };
    const loop = () => { read('frame'); setTimeout(() => read('painted'), 0); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  });
  const page = await ctx.newPage();
  watch(page, tag);
  let fonts, scripts;
  const fontGate = new Promise((r) => (fonts = r));
  const scriptGate = new Promise((r) => (scripts = r));
  await page.route(/\.woff2?(\?|$)/, async (route) => { await fontGate; await route.continue(); });
  await page.route(re, async (route) => { await scriptGate; await route.continue(); });
  await page.goto(URL, { waitUntil: 'commit' });
  await page.waitForSelector('[data-lw=wall]', { state: 'attached' });
  const seen = await run(page, { fonts, scripts });
  const s = await page.evaluate(() => window.__late);
  await ctx.close();
  const tops = s.map((x) => x.top);
  const first = s.length ? s[0].bottom : 0;
  const last = s.length ? s[s.length - 1].bottom : 0;
  const bottoms = s.map((x) => x.bottom);
  const span = s.length ? Math.max(...bottoms) - Math.min(...bottoms) : 0;
  const stale = s.filter((x) => Math.abs(x.bottom - last) > 1).length;
  return { seen, samples: s.length, live: s.some((x) => x.live), moved: s.length ? Math.max(...tops) - Math.min(...tops) : 0, first, last, span, stale };
}
/** What is asserted of every run of a late-font case: the top really moved, and the lower edge never did, at any read (max - min <= 1). */
const lateOk = (r) => r.samples > 0 && r.live && r.moved >= 10 && r.span <= 1;
const lateWhy = (r) => `${r.samples} reads, top moved ${r.moved}px, edge ${r.first} to ${r.last}, widest spread ${r.span}px, ${r.stale} stale read${r.stale === 1 ? '' : 's'}`;
/** Several runs of one case: each must hold. */
async function lateRuns(n, tag, load) {
  const runs = [];
  for (let i = 0; i < n; i++) runs.push(await load(`${tag} #${i}`));
  return { runs, held: runs.filter(lateOk).length, n };
}

for (const w of [1440, 1280]) {
  // the fonts land first, then the scripts
  const a = await lateLoad({ w, tag: 'late font ' + w, run: async (page, g) => {
    await wait(page, 400);
    g.fonts();
    await wait(page, 800);
    const heldLive = await liveNow(page);
    g.scripts();
    await untilLive(page);
    await wait(page, 600);
    return { heldLive };
  } });
  ok(!a.seen.heldLive && lateOk(a), `late font ${w}: fonts landed while the engine was held, then it mounted; the top moved and the lower edge held at every read (${lateWhy(a)})`);

  // the engine first, then the fonts: the box follows its top without anyone measuring again
  const b = await lateRuns(LATE_RUNS, `late font engine-first ${w}`, (tag) => lateLoad({ w, tag, run: async (page, g) => {
    await wait(page, 400);
    g.scripts();
    await untilLive(page);
    await wait(page, 300);
    const liveBefore = await liveNow(page);
    g.fonts();
    await wait(page, 1200);
    return { liveBefore };
  } }));
  const liveFirst = b.runs.filter((r) => r.seen.liveBefore).length;
  const moved = b.runs.filter((r) => r.moved >= 10).length;
  ok(liveFirst === b.n && moved === b.n, `late font ${w}, engine first: the engine was live before the fonts landed and the top moved, in ${liveFirst} and ${moved} of ${b.n} runs`);
  ok(b.held === b.n, `late font ${w}, engine first: the lower edge never moves at any read, in every run (${b.held} of ${b.n} runs; ${b.runs.filter((r) => !lateOk(r)).map(lateWhy).join('; ') || 'none out of line'})`);
}

// ---------- the held box on every path into the wall view ----------
// Nothing used to refit the box for a late font when the wall was reached from the List before the engine arrived, or
// came back after a trip to the List. The fonts and the engine are held (the first script runs), the fonts land, then
// the engine: the wall's lower edge, and so the footer under it, stays where it was from the moment the wall shows.
for (const path of ['List stored, then Wall', 'Wall, List, Wall']) {
  const r = await lateRuns(Math.max(2, Math.ceil(LATE_RUNS / 2)), 'held box ' + path, (tag) => lateLoad({ w: 1440, view: path === 'List stored, then Wall' ? 'list' : null, scripts: ENGINE_JS, tag, run: async (page, g) => {
    await wait(page, 1500);
    if (path !== 'Wall, List, Wall') await page.click('[data-lw-view=wall]');
    else { await page.click('[data-lw-view=list]'); await wait(page, 300); await page.click('[data-lw-view=wall]'); }
    await wait(page, 400);
    g.fonts();
    await wait(page, 900);
    const heldLive = await liveNow(page);
    g.scripts();
    await untilLive(page);
    await wait(page, 700);
    return { heldLive };
  } }));
  ok(r.runs.every((x) => !x.seen.heldLive) && r.held === r.n, `held box (${path}): the fonts landed while the engine was held, the top moved, and the lower edge held at every read to the engine mounting (${r.held} of ${r.n} runs; ${r.runs.filter((x) => !lateOk(x)).map(lateWhy).join('; ') || 'none out of line'})`);
}

// ---------- phone ----------
{
  const ctx = await context({ w: 390, h: 844, scheme: 'dark', touch: true });
  const page = await ctx.newPage();
  watch(page, 'phone');
  await page.goto(URL);
  await wait(page, 2600);
  const rows = await data(page);
  baseState = await state(page);
  const cdp = await ctx.newCDPSession(page);
  const touch = async (pts) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: pts[0][0], y: pts[0][1] }] });
    for (const p of pts.slice(1)) {
      await wait(page, p[2] || 16);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: p[0], y: p[1] }] });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  };
  ok(baseState.sx <= 0 && baseState.blank.length === 0, `phone first view: no sideways scroll (${baseState.sx}), blank=${baseState.blank}`);
  const y0 = await page.evaluate(() => scrollY);
  await touch([[200, 700], [200, 620, 16], [200, 540, 16], [200, 460, 16], [200, 400, 16]]);
  await wait(page, 900);
  const y1 = await page.evaluate(() => scrollY);
  ok(y1 > y0 + 100, `a finger drag scrolls the page (${y0} -> ${y1})`);
  await page.evaluate(() => window.scrollTo(0, 400));
  await wait(page, 600);
  baseline = await rects(page);
  const yS = await page.evaluate(() => scrollY);
  const t0 = await page.evaluate(() => { const t = document.querySelector('.lw-tile.lw-hot'); return t && t.getAttribute('aria-label'); });
  ok(!!t0, 'a tile is awake near the middle of the screen: ' + t0);
  const c = await page.evaluate(() => { const t = document.querySelector('.lw-tile.lw-hot'); const r = t.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  await page.touchscreen.tap(c.x, c.y);
  await wait(page, 1500);
  let st = await state(page);
  ok(st.cur === t0, 'a tap opens the tile: ' + st.cur);
  const r = await openRect(page);
  ok(Math.abs(r.w - 390) < 2 && Math.abs(r.h - 844) < 2, 'the phone piece fills the window ' + JSON.stringify(r));
  const faceH = await page.evaluate(() => document.querySelector('.lw-tile.lw-open .lw-face').getBoundingClientRect().height);
  ok(faceH < 844 - 100, 'the picture leaves room for the card ' + faceH);
  const d = await door(page);
  ok(!d.pill && d.metaNum && (d.meta.match(/\d+ of \d+/g) || []).length === 1, 'the card says "n of N" once ' + JSON.stringify(d));
  const first = st.cur;
  await touch([[300, 300], [250, 305, 16], [190, 305, 16], [120, 310, 16], [80, 310, 16]]);
  await wait(page, 1200);
  st = await state(page);
  ok(st.cur === first, 'a swipe on the piece does not step: ' + st.cur);
  const barY = () => page.evaluate(() => document.querySelector('[data-lw=bar]').getBoundingClientRect().top + 24);
  let by = await barY();
  await touch([[300, by], [250, by + 2, 16], [190, by + 2, 16], [120, by + 4, 16], [80, by + 4, 16]]);
  await wait(page, 1300);
  st = await state(page);
  ok(st.cur !== first && st.cur !== null, 'a swipe left on the card steps to the next: ' + st.cur);
  by = await barY();
  await touch([[80, by], [140, by + 2, 16], [220, by + 2, 16], [300, by + 4, 16]]);
  await wait(page, 1300);
  st = await state(page);
  ok(st.cur === first, 'a swipe right on the card steps back: ' + st.cur);
  await touch([[200, 200], [200, 260, 30], [200, 330, 30]]);
  await wait(page, 600);
  st = await state(page);
  ok(st.cur === first, 'a vertical drag does not step');
  await shot(page, 'open-390');
  await page.click('[data-lw=back]');
  await closed(page, 'phone close', yS, first);
  await touch([[200, 600], [200, 500, 16], [200, 400, 16], [200, 300, 16]]);
  await wait(page, 700);
  const y2 = await page.evaluate(() => scrollY);
  ok(y2 > yS + 50, 'the page scrolls again after closing: ' + y2);
  await page.click('[data-lw-view=list]');
  await wait(page, 900);
  st = await state(page);
  ok(st.view === 'list' && st.sx <= 0 && rows.length > 0, 'phone List view, no sideways scroll ' + st.sx);
  await shot(page, 'list-390');
  await ctx.close();
}

if (errs.length) {
  for (const e of errs) console.log('FAIL console', e);
  fails += errs.length;
} else console.log('ok   no console errors');
console.log(fails ? `${fails} FAILED` : 'ALL OK');
await browser.close();
process.exit(fails ? 1 : 0);
