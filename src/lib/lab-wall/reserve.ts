/**
 * The wall's box, and its framed, captioned tiles, held before the engine has arrived. The engine (wall.ts) measures
 * the box on every layout; the inline script below does it once in the very first paint, and the first script
 * (boot.ts, through holdBox) keeps it in step on resize, on a font landing and on anything above it changing height, until the engine takes over. Either way the box the engine inherits is already
 * the size and place it will have, and the tiles it adopts are already where it will put them: nothing moves when the
 * engine mounts, and a visitor on a slow connection sees the captioned mosaic, never an empty wall. On desktop the box
 * itself is not given a height but the room the page leaves it (sizeWall, lab-wall.css), which is what keeps its lower
 * edge still when the words above it change height.
 *
 * measureWall and placeTile read the page (browser only); the rest is pure.
 */
import {
  DESK,
  DESK_COLS,
  DESK_GAP,
  DESK_MIN_HEIGHT,
  DESK_ROWS,
  PHONE,
  PHONE_BELOW,
  PHONE_COLS,
  PHONE_GAP,
  PHONE_ROWS,
  PHONE_ROW_RATIO,
  SPILL_DESK,
  SPILL_PHONE,
  layoutWall,
} from './layout';
import type { Rect, WallLayout } from './layout';

/** The caption bar under each picture on the wall. */
export const TILE_CAP = 28;
/** A tile narrower than this drops the kind from its caption (lw-xs under the first, lw-sm under the second). */
export const XS_BELOW = 150;
export const SM_BELOW = 260;
/** The caption's "Open" arrow. */
export const ARROW_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 17 17 7M8 7h9v9"/></svg>';
/** The attribute a framed tile carries before the engine adopts it. */
export const TILE_ATTR = 'data-lw-id';
/** The attribute the engine puts on the wall once it is live: from then on the engine keeps the box, not the inline script. */
export const LIVE_ATTR = 'data-lw-live';
/** The attribute the inline script keeps on the wall while the engine is not here: the id of the framed tile clicked last (boot.ts hands it to the engine). */
export const EARLY_ATTR = 'data-lw-early';

/** The custom property on the wall's page that holds the least height the page may have while the wall fills the window (lab-wall.css reads it). */
export const PAGE_MIN_VAR = '--lw-page-min';

/** Which caption classes a tile of this width carries. The engine, the inline script and placeTile all go by these two numbers. */
export function sizeClass(width: number): { xs: boolean; sm: boolean } {
  return { xs: width < XS_BELOW, sm: width < SM_BELOW };
}

/**
 * Everything laid out before the wall (the previous siblings of the wall and of each of its ancestors): a change in
 * any of their heights moves the wall's top, and on desktop the wall's height follows its top. The inline script walks
 * the same way.
 */
export function aboveWall(wallEl: HTMLElement): Element[] {
  const out: Element[] = [];
  for (let n: Element | null = wallEl; n && n !== document.body; n = n.parentElement) {
    for (let s = n.previousElementSibling; s; s = s.previousElementSibling) out.push(s);
  }
  return out;
}

const sig = (n: number): number => Math.round(n * 100) / 100;

/**
 * A script for LabWall.astro to run inline, right after the wall's data block: from the very first paint, before any
 * module has arrived, it holds the wall's box at the size and place the layout will give it and hangs a framed,
 * captioned tile in each cell (the picture of each fades in later, once the engine has it). It repeats what layoutWall
 * computes, from the same maps and constants; tests/lab-wall-layout.test.ts runs this text against layoutWall so the two
 * cannot drift apart. It does nothing in the list view or with no wall to measure.
 */
export const RESERVE_INLINE = `(function () {
  var doc = document, w = doc.querySelector('[data-lw="wall"]');
  if (!w || doc.documentElement.getAttribute('data-lab-view') !== 'wall') return;
  var own = Object.prototype.hasOwnProperty;
  var rows = [];
  try { var d = doc.querySelector('[data-lw="data"]'); rows = JSON.parse((d && d.textContent) || '[]') || []; } catch (e) { rows = []; }
  var ids = [], seen = {}, i;
  for (i = 0; i < rows.length; i++) {
    var rid = rows[i] && rows[i].id;
    if (typeof rid === 'string' && !own.call(seen, rid)) { seen[rid] = 1; ids.push(rid); }
  }
  var hung = [];
  var r2 = function (n) { return Math.round(n * 100) / 100; };
  var fit = function () {
    var p = w.parentElement;
    if (p) w.style.setProperty('--lw-bleed', Math.max(0, p.getBoundingClientRect().left + (parseFloat(getComputedStyle(p).paddingLeft) || 0)).toFixed(2) + 'px');
    var phone = window.innerWidth < ${PHONE_BELOW};
    var map = phone ? ${JSON.stringify(PHONE)} : ${JSON.stringify(DESK)};
    var gap = phone ? ${PHONE_GAP} : ${DESK_GAP};
    var mapCols = phone ? ${PHONE_COLS} : ${DESK_COLS}, mapRows = phone ? ${PHONE_ROWS} : ${DESK_ROWS};
    var spC = phone ? ${SPILL_PHONE.cols} : ${SPILL_DESK.cols}, spR = phone ? ${SPILL_PHONE.rows} : ${SPILL_DESK.rows};
    var perRow = Math.floor(mapCols / spC), spill = [], k;
    for (k = 0; k < ids.length; k++) if (!own.call(map, ids[k])) spill.push(ids[k]);
    var cw = (w.clientWidth - 2 * gap - (mapCols - 1) * gap) / mapCols, ch, base;
    if (phone) {
      ch = Math.round(cw * ${PHONE_ROW_RATIO});
      base = 2 * gap + mapRows * ch + (mapRows - 1) * gap;
    } else {
      base = Math.max(window.innerHeight - (w.getBoundingClientRect().top + window.scrollY), ${DESK_MIN_HEIGHT});
      ch = (base - 2 * gap - (mapRows - 1) * gap) / mapRows;
    }
    if (!phone && !spill.length && p && p.style) {
      // Desktop with nothing spilled: the page is told its least height and the wall fills what is left (see sizeWall).
      var pcs = getComputedStyle(p);
      p.style.setProperty('${PAGE_MIN_VAR}', r2(window.innerHeight - (p.getBoundingClientRect().top + window.scrollY) + (parseFloat(pcs.paddingBottom) || 0) + (parseFloat(pcs.borderBottomWidth) || 0)) + 'px');
      w.style.height = '';
      w.style.minHeight = '${DESK_MIN_HEIGHT}px';
    } else {
      if (p && p.style && p.style.removeProperty) p.style.removeProperty('${PAGE_MIN_VAR}');
      w.style.height = (base + Math.ceil(spill.length / perRow) * spR * (ch + gap)) + 'px';
      w.style.minHeight = '0';
    }
    var cells = {};
    for (k = 0; k < ids.length; k++) cells[ids[k]] = own.call(map, ids[k]) ? map[ids[k]] : null;
    for (k = 0; k < spill.length; k++) cells[spill[k]] = [(k % perRow) * spC, mapRows + Math.floor(k / perRow) * spR, spC, spR];
    for (k = 0; k < hung.length; k++) {
      var t = hung[k].el, c = cells[hung[k].id];
      if (!c) continue;
      var x = gap + c[0] * (cw + gap), y = gap + c[1] * (ch + gap), tw = c[2] * cw + (c[2] - 1) * gap, th = c[3] * ch + (c[3] - 1) * gap;
      t.className = 'lw-tile' + (tw < ${XS_BELOW} ? ' lw-xs' : '') + (tw < ${SM_BELOW} ? ' lw-sm' : '');
      t.style.left = r2(x) + 'px'; t.style.top = r2(y) + 'px'; t.style.width = r2(tw) + 'px'; t.style.height = r2(th) + 'px';
      hung[k].face.style.height = r2(Math.max(1, th - ${TILE_CAP})) + 'px';
    }
  };
  try {
    var mk = function (tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; };
    var placed = {};
    for (i = 0; i < rows.length; i++) {
      var row = rows[i];
      if (!row || typeof row.id !== 'string' || own.call(placed, row.id)) continue;
      placed[row.id] = 1;
      var t = mk('div', 'lw-tile');
      t.setAttribute('${TILE_ATTR}', row.id);
      t.setAttribute('role', 'button');
      t.setAttribute('tabindex', '0');
      t.style.setProperty('--i', String(i));
      var face = mk('div', 'lw-face');
      face.appendChild(mk('div', 'lw-veil'));
      var cap = mk('div', 'lw-cap');
      cap.appendChild(mk('span', 'lw-d', row.designation));
      cap.appendChild(mk('span', 'lw-t', row.title));
      cap.appendChild(mk('span', 'lw-k', row.kindLabel));
      var o = mk('span', 'lw-o'); o.innerHTML = 'Open ' + ${JSON.stringify(ARROW_SVG)};
      cap.appendChild(o);
      t.appendChild(face); t.appendChild(cap);
      hung.push({ id: row.id, el: t, face: face });
    }
  } catch (e) { hung = []; /* the engine builds the tiles when it arrives */ }
  fit();
  for (i = 0; i < hung.length; i++) w.appendChild(hung[i].el);
  // A click, tap, Enter or Space on a framed tile before the engine is here is remembered on the wall, the last one
  // winning; boot.ts hands it to the engine, which opens that piece as a click after mount would. The engine puts its
  // own handlers on every tile, so once it is live these two stand down and nothing is done twice.
  var remember = function (ev, key) {
    if (w.hasAttribute('${LIVE_ATTR}')) return;
    var el = ev.target && ev.target.closest ? ev.target.closest('[${TILE_ATTR}]') : null;
    if (!el || (key && ev.target !== el)) return;
    if (key) ev.preventDefault();
    w.setAttribute('${EARLY_ATTR}', el.getAttribute('${TILE_ATTR}'));
  };
  try {
    w.addEventListener('click', function (ev) { remember(ev, false); });
    w.addEventListener('keydown', function (ev) { if (ev.key === 'Enter' || ev.key === ' ') remember(ev, true); });
  } catch (e) { /* the tiles stay plain until the engine adopts them */ }
  // What sits above the wall can change height before the engine arrives, and on desktop the wall's top moves with it.
  // The usual cause: the measure above ran with the fallback face, and the intro's sentence takes two lines in it where
  // the web font takes one, so when the font lands the top rises 24px. The wall's box needs no measuring for that: the
  // page is told its least height and the wall is the row that fills what is left (lab-wall.css), so the layout that
  // moves the top moves the height with it and the lower edge never moves, at any read. What does need measuring again
  // is the tiles' own rectangles (they follow the height), and the page's height when the window changes. Two hands do it:
  // - each face still loading when the measure ran: its own promise settles in the task that lands it, and the tiles are
  //   placed again there and once more a task later (the browser can apply the face to the layout just after its promise settles);
  // - a ResizeObserver on everything laid out above the wall, for any other change: it runs after layout and before
  //   paint, so the tiles never show a stale size.
  // Once the engine is live (${LIVE_ATTR}), or the page is its list, it is the engine's job.
  var held = function () { return !w.hasAttribute('${LIVE_ATTR}') && doc.documentElement.getAttribute('data-lab-view') === 'wall'; };
  var refit = function () { if (held()) fit(); };
  try {
    if (doc.fonts && doc.fonts.forEach) doc.fonts.forEach(function (f) { if (f.status === 'loading') f.loaded.then(function () { refit(); setTimeout(refit, 0); }, function () {}); });
  } catch (e) { /* the observer below, boot.ts and the engine measure it again */ }
  if (typeof ResizeObserver === 'function') {
    try {
      var ro = new ResizeObserver(function () { if (held()) fit(); else ro.disconnect(); });
      for (var n = w; n && n !== doc.body; n = n.parentElement) for (var s = n.previousElementSibling; s; s = s.previousElementSibling) ro.observe(s);
    } catch (e) { /* boot.ts and the engine measure it again */ }
  }
})();`;

/**
 * Measure the wall for `ids` (in catalog order) and write the two things the page needs of it: the
 * full-bleed margin (the wall reaches past the page's column to both window edges) and the height.
 * Returns the layout, for a caller that places tiles from it.
 */
export function measureWall(wallEl: HTMLElement, ids: string[]): WallLayout {
  const root = document.documentElement;
  const page = wallEl.parentElement;
  if (page) {
    const pr = page.getBoundingClientRect();
    const pad = parseFloat(getComputedStyle(page).paddingLeft) || 0;
    wallEl.style.setProperty('--lw-bleed', Math.max(0, pr.left + pad).toFixed(2) + 'px');
  }
  const top = wallEl.getBoundingClientRect().top + window.scrollY;
  const L = layoutWall(ids, {
    width: wallEl.clientWidth || root.clientWidth,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    topHeight: top,
  });
  sizeWall(wallEl, L);
  return L;
}

/**
 * Give the wall its height. On desktop with nothing spilled (L.fill) it is not told one: the page (the wall's parent, a
 * grid whose last row is the wall) is told the least height it may have, so that its lower edge sits at the window's
 * lower edge, and the wall fills what is left under whatever sits above it. A web font that lands and reflows the words
 * above then moves the wall's top and its height together in the very layout that moves it, and its lower edge never
 * moves: nothing has to measure and write again before the next read or frame sees it right. Otherwise (a phone, whose
 * height follows the width; or a spill row, whose height follows the rest) the height is a number, and the caller
 * measures again when what it came from changes.
 */
function sizeWall(wallEl: HTMLElement, L: WallLayout): void {
  const page = wallEl.parentElement;
  if (L.fill && page) {
    const cs = getComputedStyle(page);
    const below = (parseFloat(cs.paddingBottom) || 0) + (parseFloat(cs.borderBottomWidth) || 0);
    const at = page.getBoundingClientRect().top + window.scrollY;
    page.style.setProperty(PAGE_MIN_VAR, sig(window.innerHeight - at + below) + 'px');
    wallEl.style.height = '';
    wallEl.style.minHeight = DESK_MIN_HEIGHT + 'px';
    return;
  }
  page?.style.removeProperty(PAGE_MIN_VAR);
  wallEl.style.height = L.height + 'px';
  // The exact height is set, so the stylesheet's approximation (its min-height) is done with.
  wallEl.style.minHeight = '0';
}

/** Put a framed tile (the inline script's, or the engine's own) in its rectangle: its box, its picture's frame, and the caption's size class. */
export function placeTile(el: HTMLElement, r: Rect): void {
  const st = el.style;
  st.left = sig(r.x) + 'px';
  st.top = sig(r.y) + 'px';
  st.width = sig(r.w) + 'px';
  st.height = sig(r.h) + 'px';
  const face = el.querySelector<HTMLElement>('.lw-face');
  if (face) face.style.height = sig(Math.max(1, r.h - TILE_CAP)) + 'px';
  const size = sizeClass(r.w);
  el.classList.toggle('lw-xs', size.xs);
  el.classList.toggle('lw-sm', size.sm);
}

/** Re-seat the tiles the inline script hung, from a fresh layout (the window was resized before the engine arrived). */
export function placeFramedTiles(wallEl: HTMLElement, L: WallLayout): void {
  for (const el of Array.from(wallEl.children)) {
    if (!(el instanceof HTMLElement)) continue;
    const id = el.getAttribute(TILE_ATTR);
    const r = id ? L.rects[id] : undefined;
    if (r) placeTile(el, r);
  }
}

/**
 * Keep the held box in step while the wall is the view and the engine has not mounted, on whatever path got the visitor
 * to the wall. `refit` measures and places again; it is called when the window resizes, when anything laid out above the
 * wall changes height, and in the task that lands each web font that was still loading (so the box has its new height
 * before anything in the next frame reads or paints it). The inline script does the same for the first view it paints;
 * this is for the paths it cannot see: the wall chosen from the List, or the wall again after a trip to the List.
 * Returns the function that stands it all down (the engine is live, or the List shows).
 */
export function holdBox(wallEl: HTMLElement, refit: () => void): () => void {
  const off: Array<() => void> = [];
  let stopped = false;
  const again = (): void => { if (!stopped) refit(); };
  window.addEventListener('resize', again);
  off.push(() => window.removeEventListener('resize', again));
  if (typeof ResizeObserver === 'function') {
    try {
      const ro = new ResizeObserver(again);
      for (const el of aboveWall(wallEl)) ro.observe(el);
      off.push(() => ro.disconnect());
    } catch {
      /* the fonts and the resize below still keep it */
    }
  }
  const fonts = document.fonts;
  if (fonts) {
    const watched = new WeakSet<FontFace>();
    const watch = (): void => {
      try {
        fonts.forEach((f) => {
          if (f.status !== 'loading' || watched.has(f)) return;
          watched.add(f);
          f.loaded.then(() => { again(); setTimeout(again, 0); }, () => {});
        });
      } catch {
        /* the observer above and the engine measure it again */
      }
    };
    watch();
    // A face can start loading later than now (text that uses it is laid out when a view appears).
    fonts.addEventListener('loading', watch);
    off.push(() => fonts.removeEventListener('loading', watch));
  }
  return () => {
    stopped = true;
    for (const f of off) f();
  };
}

/** The engine will not come: take down the frames the page hung for it, so no dead tile is left on a wall nobody sees, and drop the click remembered on one. */
export function clearFramedTiles(wallEl: HTMLElement): void {
  wallEl.removeAttribute(EARLY_ATTR);
  for (const el of Array.from(wallEl.children)) if (el instanceof HTMLElement && el.hasAttribute(TILE_ATTR)) el.remove();
}
