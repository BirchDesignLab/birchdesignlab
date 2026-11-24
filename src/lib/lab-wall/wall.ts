/**
 * The wall engine: every listed piece as a live tile in one mosaic, and the
 * open piece (the "door") that fills the window. A typed port of the
 * mockup's app.js, with the flying thumbnails and the mockup's own list left
 * out (the catalog's own list is the List view). The lamp (a light that
 * follows the pointer, and a glowing rim on the tiles near it) is in here too:
 * see the lamp section of mountWall, and lamp.ts for its rules.
 *
 * One requestAnimationFrame loop owns all of it. What keeps it steady:
 *  - geometry is eased toward a target every frame, never jumped;
 *  - a style is written only when its rounded value changes;
 *  - a canvas is resized only when its box (or the pixel ratio) changes;
 *  - the loop sleeps when the tab is hidden, the List shows, or the wall is
 *    scrolled out of view.
 *
 * Entry point: mountWall(). It reads the markup LabWall.astro rendered.
 */
import { clamp, readTheme, T } from './draw';
import { currentScheme } from '../scheme';
import { DESKTOP_QUERY, FINE_POINTER_QUERY, LAMP_ATTR, driftTarget, lampRuns, lampStart, rimLit } from './lamp';
import type { Rect } from './layout';
import { ARROW_SVG, LIVE_ATTR, TILE_ATTR, TILE_CAP, aboveWall, measureWall, sizeClass } from './reserve';
import { hasMini, loadMini } from './minis';
import type { LoadedMini } from './minis';
import { counterLabel, hashFor, inFilter, readFilter, stepTarget, tryLine } from './model';
import type { Filter, View } from './model';
import type { Mini, MiniEnv, Pointer, WallEntry } from './types';

export type { View } from './model';

/** How an open piece sits in the history: pushes an entry (a click), rides one already there (Forward, or a reload onto it), or has none (a link to it). */
export type Entry = 'push' | 'existing' | 'none';

export interface MountOptions {
  /** A piece to open as soon as the wall is up (a link to /lab/#bdl-007, or a click made before the engine arrived), already checked against the list. */
  open?: string | null;
  /** How that piece sits in the history. A link has no entry of its own ('none', the default); a click made before the engine arrived pushes one ('push'), as a click after mount does; a reload onto an entry this page pushed rides it ('existing'). */
  entry?: Entry;
}

export interface WallHandle {
  /** Show the wall or the list: the loop runs for one and sleeps for the other. */
  setView(view: View): void;
  /** Take the wall down and give the page back. */
  destroy(): void;
}

/** Resting pieces tick at about 15 fps. */
const IDLE_MS = 66;
/** The widest pixel ratio a canvas is drawn at. */
const MAX_DPR = 2;

interface Written {
  x: number; y: number; w: number; h: number; fh: number; cf: number; r: number; dim: number; lit: number; tf: string;
}

interface Tile {
  e: WallEntry;
  idx: number;
  el: HTMLElement;
  face: HTMLElement;
  cap: HTMLElement;
  veil: HTMLElement;
  /** The lamp's glow around the tile; there only while the lamp runs. */
  rim: HTMLElement | null;
  canvas: HTMLCanvasElement | null;
  /** The miniature has drawn its first frame (its canvas fades in then). */
  drawn: boolean;
  ctx: CanvasRenderingContext2D | null;
  mod: LoadedMini | null;
  mini: Mini | null;
  loading: boolean;
  broken: boolean;
  err: boolean;
  wall: Rect;
  cur: Rect | null;
  open: boolean;
  /** -1 or 1 while it flies out sideways after a step; 0 otherwise. */
  exit: number;
  flying: boolean;
  hot: boolean;
  focus: boolean;
  vis: boolean;
  intent: boolean;
  need: boolean;
  /** Caption factor (1 on the wall, 0 while open) and open factor. */
  cf: number;
  oa: number;
  W: number;
  H: number;
  dpr: number;
  depth: number;
  /** How strongly the lamp lights the tile's rim, eased (0..1). */
  lit: number;
  p: Pointer;
  last: number;
  born: number;
  t0: number;
  v: { sc: number; rx: number; ry: number; tx: number; ty: number; dim: number };
  w: Written;
}

interface Door {
  el: HTMLElement;
  scrim: HTMLElement;
  back: HTMLButtonElement;
  prev: HTMLButtonElement;
  next: HTMLButtonElement;
  count: HTMLElement;
  bar: HTMLElement;
  meta: HTMLElement;
  title: HTMLElement;
  sum: HTMLElement;
  visit: HTMLAnchorElement;
  visitLabel: HTMLElement;
  soon: HTMLElement;
  tryEl: HTMLElement;
}

/** The element a selector names under `root`, or an error naming it: a missing piece of markup should be loud. (Typed by the one method it uses, not ParentNode, whose append the Workers types redeclare.) */
function need<E extends Element>(root: { querySelector: ParentNode['querySelector'] }, selector: string): E {
  const found = root.querySelector<E>(selector);
  if (!found) throw new Error('Lab wall: missing ' + selector);
  return found;
}

const sig = (n: number): number => Math.round(n * 100) / 100;

export function mountWall(opts: MountOptions = {}): WallHandle {
  const root = document.documentElement;
  // The tokens and the scheme first: nothing draws until this has run (and T starts as the site's default, dark).
  readTheme();
  const wallEl = need<HTMLElement>(document, '[data-lw="wall"]');
  const dataEl = need<HTMLElement>(document, '[data-lw="data"]');
  const hintEl = document.querySelector<HTMLElement>('[data-lw="hint"]');
  const catalogEl = document.querySelector<HTMLElement>('.catalog');
  const entries = JSON.parse(dataEl.textContent || '[]') as WallEntry[];
  const byId = new Map(entries.map((e) => [e.id, e] as const));

  const D: Door = (() => {
    const el = need<HTMLElement>(document, '[data-lw="door"]');
    const scrim = need<HTMLElement>(document, '[data-lw="scrim"]');
    // The door and its scrim sit at the end of <body>: nothing the page lays out can clip or reposition them.
    document.body.appendChild(scrim);
    document.body.appendChild(el);
    return {
      el, scrim,
      back: need<HTMLButtonElement>(el, '[data-lw="back"]'),
      prev: need<HTMLButtonElement>(el, '[data-lw="prev"]'),
      next: need<HTMLButtonElement>(el, '[data-lw="next"]'),
      count: need<HTMLElement>(el, '[data-lw="count"]'),
      bar: need<HTMLElement>(el, '[data-lw="bar"]'),
      meta: need<HTMLElement>(el, '[data-lw="meta"]'),
      title: need<HTMLElement>(el, '[data-lw="title"]'),
      sum: need<HTMLElement>(el, '[data-lw="sum"]'),
      visit: need<HTMLAnchorElement>(el, '[data-lw="visit"]'),
      visitLabel: need<HTMLElement>(el, '[data-lw="visit-label"]'),
      soon: need<HTMLElement>(el, '[data-lw="soon"]'),
      tryEl: need<HTMLElement>(el, '[data-lw="try"]'),
    };
  })();

  const coarse = matchMedia('(hover: none)').matches;
  let view: View = root.dataset.labView === 'wall' ? 'wall' : 'list';
  let filt: Filter = readFilter(catalogEl?.dataset.filter);
  let dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
  let isPhone = false;
  let cardReserve = 0;
  let current: Tile | null = null;
  let pushed = false;
  let backPending = false;
  let backTimer = 0;
  let swapTimer = 0;
  let touchHold: Tile | null = null;
  let raf = 0;
  let lastNow = performance.now();
  let wallInView = true;
  let midCur: Tile | null = null;
  const par = { x: 0, y: 0 };
  const disposers: Array<() => void> = [];
  const on = <K extends keyof WindowEventMap>(t: Window, type: K, fn: (ev: WindowEventMap[K]) => void, opts?: AddEventListenerOptions) => {
    t.addEventListener(type, fn, opts);
    disposers.push(() => t.removeEventListener(type, fn, opts));
  };

  // ---- pictures for the pieces that draw a page ----
  const images = new Map<string, HTMLImageElement>();
  const env: MiniEnv = {
    img(id) {
      let im = images.get(id);
      if (!im) {
        const src = byId.get(id)?.thumb;
        if (!src) return null;
        im = new Image();
        im.decoding = 'async';
        im.src = src;
        images.set(id, im);
      }
      return im.complete && im.naturalWidth ? im : null;
    },
  };

  // ---- tiles ----
  const tiles: Tile[] = [];
  const matches = (s: Tile): boolean => inFilter(s.e.kind, filt);
  const pool = (): Tile[] => tiles.filter(matches);

  // Tiles the page already framed and captioned before this engine arrived (reserve.ts): each is adopted as it stands.
  const framed = new Map<string, HTMLElement>();
  for (const el of Array.from(wallEl.children)) {
    const id = el instanceof HTMLElement ? el.getAttribute(TILE_ATTR) : null;
    if (id && el instanceof HTMLElement) framed.set(id, el);
  }

  function makeTile(e: WallEntry, idx: number): Tile {
    const animated = hasMini(e.id);
    const adopted = framed.get(e.id);
    const el = adopted ?? document.createElement('div');
    el.tabIndex = 0;
    el.setAttribute('role', 'button');
    el.setAttribute('aria-label', 'Open ' + e.title);
    el.style.setProperty('--i', String(idx));
    if (adopted) {
      // Its frame and caption are already on the wall; the picture's canvas goes in under the veil and fades in once drawn.
      const veil0 = need<HTMLElement>(el, '.lw-veil');
      if (animated) veil0.parentElement?.insertBefore(document.createElement('canvas'), veil0);
    } else {
      el.className = 'lw-tile';
      el.innerHTML =
        '<div class="lw-face">' + (animated ? '<canvas></canvas>' : '') + '<div class="lw-veil"></div></div>' +
        '<div class="lw-cap"><span class="lw-d"></span><span class="lw-t"></span><span class="lw-k"></span><span class="lw-o">Open ' + ARROW_SVG + '</span></div>';
      need(el, '.lw-d').textContent = e.designation;
      need(el, '.lw-t').textContent = e.title;
      need(el, '.lw-k').textContent = e.kindLabel;
    }
    const face = need<HTMLElement>(el, '.lw-face');
    const veil = need<HTMLElement>(el, '.lw-veil');
    if (!animated) stillFor(face, veil, e);
    const canvas = el.querySelector<HTMLCanvasElement>('canvas');
    const s: Tile = {
      e, idx, el, face, veil, rim: null, cap: need<HTMLElement>(el, '.lw-cap'),
      canvas, drawn: false, ctx: canvas ? canvas.getContext('2d') : null,
      mod: null, mini: null, loading: false, broken: false, err: false,
      wall: { x: 0, y: 0, w: 10, h: 10 }, cur: null,
      open: false, exit: 0, flying: false, hot: false, focus: false, vis: false, intent: false, need: true,
      cf: 1, oa: 0, W: 0, H: 0, dpr: 0, depth: 0.7, lit: 0,
      p: { x: 0.5, y: 0.5, tx: 0.5, ty: 0.5, a: 0 },
      last: 0, born: performance.now(), t0: 0,
      v: { sc: 1, rx: 0, ry: 0, tx: 0, ty: 0, dim: 0 },
      w: { x: NaN, y: NaN, w: NaN, h: NaN, fh: NaN, cf: -1, r: -1, dim: -1, lit: -1, tf: '' },
    };
    el.addEventListener('click', () => { if (!current) openTile(s); });
    el.addEventListener('keydown', (ev) => {
      if (!current && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); openTile(s); }
    });
    el.addEventListener('focus', () => { s.focus = true; });
    el.addEventListener('blur', () => { s.focus = false; });
    el.addEventListener('pointerdown', (ev) => { if (ev.pointerType === 'touch' && !current) touchHold = s; });
    return s;
  }

  /** A tile with no miniature: its picture, or failing that its title. */
  function stillFor(face: HTMLElement, veil: HTMLElement, e: WallEntry): void {
    if (e.thumb) {
      const img = document.createElement('img');
      img.className = 'lw-still';
      img.alt = '';
      img.draggable = false;
      img.decoding = 'async';
      // The picture fades in as it arrives; the frame and the caption are already there.
      img.addEventListener('load', () => img.classList.add('lw-drawn'));
      img.src = e.thumb;
      if (img.complete && img.naturalWidth) img.classList.add('lw-drawn');
      face.insertBefore(img, veil);
    } else {
      const plain = document.createElement('div');
      plain.className = 'lw-plain';
      const t = document.createElement('span');
      t.textContent = e.title;
      plain.appendChild(t);
      face.insertBefore(plain, veil);
    }
  }

  entries.forEach((e, idx) => {
    const s = makeTile(e, idx);
    tiles.push(s);
    // A tile the page already hung stays where it is: moving it would start its fade over.
    if (s.el.parentNode !== wallEl) wallEl.appendChild(s.el);
  });
  const tileFor = (id: string): Tile | undefined => tiles.find((t) => t.e.id === id);

  // ---- layout ----
  function layout(): void {
    if (view !== 'wall') return;
    dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    // Full-bleed margin, height and layout: measured the same way the first script measured the box before this engine arrived.
    const L = measureWall(wallEl, entries.map((e) => e.id));
    const wasPhone = isPhone;
    isPhone = L.phone;
    // The open piece's words carry the counter on the phone layout only: write them again if the layout changed under it.
    if (isPhone !== wasPhone && metaOf) writeMeta(metaOf);
    for (const s of tiles) {
      s.wall = L.rects[s.e.id] ?? s.wall;
      s.depth = clamp(1.3 - Math.sqrt(s.wall.w * s.wall.h) / 520, 0.3, 1.1);
      const size = sizeClass(s.wall.w);
      s.el.classList.toggle('lw-xs', size.xs);
      s.el.classList.toggle('lw-sm', size.sm);
      if (!s.cur) s.cur = { ...s.wall };
      s.need = true;
    }
    if (current) measureBar();
  }

  // ---- pointer ----
  const ptr = { x: -1, y: -1, in: false, type: 'mouse', down: false, last: 0 };
  const track = (ev: PointerEvent): void => {
    ptr.x = ev.clientX; ptr.y = ev.clientY; ptr.type = ev.pointerType || 'mouse'; ptr.in = true; ptr.last = performance.now();
  };
  on(window, 'pointermove', track, { passive: true });
  on(window, 'pointerdown', (ev) => { track(ev); ptr.down = true; }, { passive: true });
  const release = (ev: PointerEvent): void => {
    ptr.down = false;
    if (ev.pointerType === 'touch') ptr.in = false;
    touchHold = null;
  };
  on(window, 'pointerup', release, { passive: true });
  on(window, 'pointercancel', release, { passive: true });
  const onLeave = (): void => { ptr.in = false; };
  root.addEventListener('pointerleave', onLeave);
  disposers.push(() => root.removeEventListener('pointerleave', onLeave));
  on(window, 'blur', onLeave);

  // ---- the door: one piece, filling the window ----
  const fullRect = (): Rect => {
    const d = D.el.getBoundingClientRect();
    const w = wallEl.getBoundingClientRect();
    return { x: d.left - w.left, y: d.top - w.top, w: d.width, h: d.height };
  };
  function measureBar(): void {
    cardReserve = D.bar.offsetHeight + (isPhone ? 20 : 0);
  }
  const hintOf = (s: Tile): string | null => s.mod?.hint ?? null;

  function fillTry(s: Tile): void {
    const line = tryLine(hintOf(s), coarse);
    D.tryEl.textContent = line ?? '';
    D.tryEl.hidden = !line;
  }
  const placeOf = (s: Tile): string => {
    const P = pool();
    return counterLabel(P.indexOf(s) + 1, P.length);
  };
  /** The tile whose words the door's meta line shows now. */
  let metaOf: Tile | null = null;
  /** The meta line: "n of N" first on the phone layout (where the count pill is hidden), then the number, kind and month. */
  function writeMeta(s: Tile): void {
    metaOf = s;
    D.meta.textContent = '';
    if (isPhone) {
      const n = document.createElement('span');
      n.className = 'lw-num';
      n.textContent = placeOf(s);
      D.meta.appendChild(n);
      D.meta.appendChild(document.createTextNode(' · '));
    }
    D.meta.appendChild(document.createTextNode(s.e.designation + ' · ' + s.e.kindLabel + ' · ' + s.e.month));
  }
  function fillDoor(s: Tile): void {
    const e = s.e;
    const place = placeOf(s);
    writeMeta(s);
    D.title.textContent = e.title;
    D.sum.textContent = e.summary;
    const link = e.live && e.href ? e.href : null;
    D.visit.hidden = !link;
    D.soon.hidden = !!link;
    if (link) { D.visit.href = link; D.visitLabel.textContent = 'Visit ' + e.title; } else D.visit.removeAttribute('href');
    D.count.textContent = place;
    fillTry(s);
    requestMod(s);
    measureBar();
  }
  D.back.addEventListener('click', () => closeTile());
  D.prev.addEventListener('click', () => step(-1));
  D.next.addEventListener('click', () => step(1));

  /** Everything outside the wall, and every tile but `open`, stops answering to the keyboard, the pointer and screen readers. */
  const inerted: HTMLElement[] = [];
  function markInert(el: HTMLElement): void {
    if (!el.inert) { el.inert = true; inerted.push(el); }
  }
  function inertForOpen(s: Tile): void {
    let n: HTMLElement = wallEl;
    while (n.parentElement && n !== document.body) {
      for (const sib of Array.from(n.parentElement.children)) {
        if (sib === n || sib === D.el || sib === D.scrim || !(sib instanceof HTMLElement)) continue;
        if (sib.tagName === 'SCRIPT' || sib.tagName === 'STYLE') continue;
        markInert(sib);
      }
      n = n.parentElement;
    }
    for (const t of tiles) t.el.inert = t !== s;
  }
  function clearInert(): void {
    for (const el of inerted) el.inert = false;
    inerted.length = 0;
    for (const t of tiles) t.el.inert = !matches(t);
  }

  function openTile(s: Tile, entry: Entry = 'push'): void {
    if (current || backPending || view !== 'wall' || !matches(s)) return;
    current = s;
    s.open = true;
    s.exit = 0;
    hintEl?.classList.add('lw-gone');
    root.classList.add('lw-locked');
    layout();
    D.scrim.classList.add('lw-on');
    inertForOpen(s);
    s.el.classList.add('lw-open');
    s.el.removeAttribute('tabindex');
    s.el.removeAttribute('role');
    fillDoor(s);
    D.el.inert = false;
    D.el.classList.add('lw-on');
    if (entry === 'push') history.pushState({ lwOpen: s.e.id }, '', hashFor(s.e.id));
    // Riding an entry that holds another piece (a click before the engine arrived, on a page reloaded onto a piece): the entry now holds this one.
    else if (entry === 'existing' && (history.state as { lwOpen?: string } | null)?.lwOpen !== s.e.id) history.replaceState({ lwOpen: s.e.id }, '', hashFor(s.e.id));
    pushed = entry !== 'none';
    D.back.focus({ preventScroll: true });
    start();
  }
  function closeTile(fromPop = false): void {
    const s = current;
    if (!s) return;
    current = null;
    s.open = false;
    s.el.classList.remove('lw-open');
    s.el.tabIndex = 0;
    s.el.setAttribute('role', 'button');
    D.scrim.classList.remove('lw-on');
    D.el.classList.remove('lw-on');
    D.el.inert = true;
    metaOf = null;
    clearTimeout(swapTimer);
    D.bar.classList.remove('lw-swap');
    root.classList.remove('lw-locked');
    clearInert();
    layout();
    if (pushed) {
      pushed = false;
      if (!fromPop) {
        // history.back() answers with a popstate; that one is ours, not the visitor's.
        backPending = true;
        clearTimeout(backTimer);
        backTimer = window.setTimeout(() => { backPending = false; }, 1000);
        history.back();
      }
    }
    try { s.el.focus({ preventScroll: true }); } catch { /* element gone */ }
  }
  function step(dir: 1 | -1): void {
    const old = current;
    if (!old) return;
    const n = stepTarget(pool(), old, dir);
    if (!n || n === old) return;
    const f = fullRect();
    old.open = false;
    old.exit = -dir;
    old.el.classList.remove('lw-open');
    old.el.tabIndex = 0;
    old.el.setAttribute('role', 'button');
    n.open = true;
    n.exit = 0;
    n.cur = { x: f.x + dir * f.w, y: f.y, w: f.w, h: f.h };
    n.cf = 0;
    n.oa = 1;
    n.v = { sc: 1, rx: 0, ry: 0, tx: 0, ty: 0, dim: 0 };
    n.el.classList.add('lw-open');
    n.el.removeAttribute('tabindex');
    n.el.removeAttribute('role');
    current = n;
    for (const t of tiles) t.el.inert = t !== n;
    // The words change under a short fade; the last step wins.
    clearTimeout(swapTimer);
    D.bar.classList.add('lw-swap');
    swapTimer = window.setTimeout(() => {
      if (current) fillDoor(current);
      D.bar.classList.remove('lw-swap');
    }, 180);
    D.count.textContent = counterLabel(pool().indexOf(n) + 1, pool().length);
    if (pushed) history.replaceState({ lwOpen: n.e.id }, '', hashFor(n.e.id));
    D.back.focus({ preventScroll: true });
    requestMod(n);
  }

  on(window, 'keydown', (ev) => {
    if (!current) return;
    if (ev.key === 'Escape') { ev.preventDefault(); closeTile(); }
    else if (ev.key === 'ArrowRight') { ev.preventDefault(); step(1); }
    else if (ev.key === 'ArrowLeft') { ev.preventDefault(); step(-1); }
    else if (ev.key === 'Tab') {
      // Focus stays inside the door: wrap from the last control to the first and back.
      const stops = Array.from(D.el.querySelectorAll<HTMLElement>('button, a[href]')).filter((x) => !x.hidden && !x.closest('[hidden]'));
      const first = stops[0], last = stops[stops.length - 1];
      if (!first || !last) return;
      const at = document.activeElement;
      if (ev.shiftKey && (at === first || !D.el.contains(at))) { ev.preventDefault(); last.focus(); }
      else if (!ev.shiftKey && (at === last || !D.el.contains(at))) { ev.preventDefault(); first.focus(); }
    }
  });
  on(window, 'popstate', (ev) => {
    if (backPending) { backPending = false; clearTimeout(backTimer); return; }
    if (current) { closeTile(true); return; }
    // Forward onto an entry this page pushed: open that piece again, without pushing another.
    const id = (ev.state as { lwOpen?: string } | null)?.lwOpen;
    const s = id ? tileFor(id) : undefined;
    if (s && view === 'wall') openTile(s, 'existing');
  });

  // Swipe between open pieces (touch or pen): a quick, mostly horizontal flick that starts on the bar. A drag on the piece plays the piece.
  let sw: { x: number; y: number; t: number; id: number } | null = null;
  on(window, 'pointerdown', (ev) => {
    const target = ev.target as Element | null;
    if (current && ev.pointerType !== 'mouse' && target && !target.closest('button, a') && target.closest('[data-lw="bar"]')) {
      sw = { x: ev.clientX, y: ev.clientY, t: performance.now(), id: ev.pointerId };
    }
  }, { passive: true });
  on(window, 'pointerup', (ev) => {
    if (!sw || ev.pointerId !== sw.id) return;
    const dx = ev.clientX - sw.x, dy = ev.clientY - sw.y, dt = performance.now() - sw.t;
    sw = null;
    if (current && Math.abs(dx) > 64 && Math.abs(dy) < Math.abs(dx) * 0.6 && dt < 700) step(dx < 0 ? 1 : -1);
  }, { passive: true });
  on(window, 'pointercancel', () => { sw = null; }, { passive: true });

  // ---- the filter: the catalog's own, written onto .catalog[data-filter] by the list's script ----
  function applyFilter(): void {
    for (const s of tiles) {
      const m = matches(s);
      s.el.inert = !m;
      s.el.classList.toggle('lw-out', !m);
      s.need = true;
    }
    if (midCur && !matches(midCur)) midCur = null;
  }
  if (catalogEl) {
    const mo = new MutationObserver(() => {
      const f = readFilter(catalogEl.dataset.filter);
      if (f !== filt) { filt = f; applyFilter(); }
    });
    mo.observe(catalogEl, { attributes: true, attributeFilter: ['data-filter'] });
    disposers.push(() => mo.disconnect());
  }
  applyFilter();

  // ---- the scheme: the header's switch writes data-scheme on <html>; read the tokens again and redraw ----
  const schemeObs = new MutationObserver(() => {
    readTheme();
    for (const s of tiles) s.need = true;
  });
  schemeObs.observe(root, { attributes: true, attributeFilter: ['data-scheme'] });
  disposers.push(() => schemeObs.disconnect());

  // ---- the lamp ----
  // The visitor's choice (the bulb in the header) and where it runs decide
  // whether there is a lamp at all. With no lamp there is no layer, no rims
  // and no per-frame work: everything below is built when the lamp starts and
  // taken down when it stops.
  const fineQuery = matchMedia(FINE_POINTER_QUERY);
  const deskQuery = matchMedia(DESKTOP_QUERY);
  const lamp = { x: 0, y: 0, init: false, wx: '', wy: '' };
  let lampEl: HTMLElement | null = null;
  const lampWanted = (): boolean =>
    view === 'wall' &&
    lampRuns({
      on: root.getAttribute(LAMP_ATTR) !== 'off',
      light: currentScheme() === 'light',
      finePointer: fineQuery.matches,
      desktop: deskQuery.matches,
    });
  function applyLamp(): void {
    const want = lampWanted();
    if (want === (lampEl !== null)) return;
    if (want) {
      const el = document.createElement('div');
      el.className = 'lw-lamp';
      el.setAttribute('aria-hidden', 'true');
      el.innerHTML = '<div class="lw-dusk"></div><div class="lw-pool"></div>';
      wallEl.appendChild(el);
      lampEl = el;
      lamp.init = false;
      lamp.wx = lamp.wy = '';
      for (const s of tiles) {
        const rim = document.createElement('div');
        rim.className = 'lw-rim';
        s.el.appendChild(rim);
        s.rim = rim;
        s.lit = 0;
        s.w.lit = -1;
      }
    } else {
      lampEl?.remove();
      lampEl = null;
      for (const s of tiles) { s.rim?.remove(); s.rim = null; }
    }
  }
  const lampObs = new MutationObserver(applyLamp);
  lampObs.observe(root, { attributes: true, attributeFilter: [LAMP_ATTR, 'data-scheme'] });
  disposers.push(() => lampObs.disconnect());
  for (const q of [fineQuery, deskQuery]) {
    q.addEventListener('change', applyLamp);
    disposers.push(() => q.removeEventListener('change', applyLamp));
  }
  disposers.push(() => { lampEl?.remove(); lampEl = null; for (const s of tiles) { s.rim?.remove(); s.rim = null; } });
  applyLamp();

  // ---- miniatures ----
  function requestMod(s: Tile): void {
    if (s.mod || s.loading || s.broken || !hasMini(s.e.id)) return;
    s.loading = true;
    loadMini(s.e.id).then(
      (m) => {
        s.loading = false;
        if (m) { s.mod = m; s.need = true; if (current === s) fillTry(s); } else breakTile(s);
      },
      (err: unknown) => { s.loading = false; console.error(s.e.id, err); breakTile(s); },
    );
  }
  /** A miniature that will not run leaves its still picture (or its title) in its place. */
  function breakTile(s: Tile): void {
    if (s.broken) return;
    s.broken = true;
    s.mini = null;
    s.canvas?.remove();
    s.canvas = null;
    s.ctx = null;
    stillFor(s.face, s.veil, s.e);
  }
  function build(s: Tile): void {
    if (!s.mod) return;
    try {
      s.mini = s.mod.factory(env);
      s.mini.resize(s.W, s.H, s.dpr);
      s.t0 = s.mini.t0 || 0;
    } catch (err) {
      console.error(s.e.id, err);
      breakTile(s);
    }
  }
  function render(s: Tile, now: number, dt: number): void {
    if (!s.mini || !s.ctx) return;
    const t = (now - s.born) / 1000 + s.t0;
    const c = s.ctx;
    c.save();
    c.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
    try { s.mini.draw(c, t, dt, s.p); } catch (err) { if (!s.err) { console.error(s.e.id, err); s.err = true; } }
    c.restore();
    if (!s.drawn) {
      // The first frame is down: the picture fades in over the frame and the caption that were already there.
      s.drawn = true;
      s.canvas?.classList.add('lw-drawn');
    }
  }

  // ---- who is awake ----
  function hitTile(x: number, y: number): Tile | null {
    let best: Tile | null = null, bd = 1e9;
    for (const s of tiles) {
      if (!matches(s)) continue;
      const r = s.wall;
      if (x >= r.x - 4 && x <= r.x + r.w + 4 && y >= r.y - 4 && y <= r.y + r.h + 4) {
        const d = Math.hypot(x - (r.x + r.w / 2), y - (r.y + r.h / 2));
        if (d < bd) { bd = d; best = s; }
      }
    }
    return best;
  }
  function midTile(top: number, cw: number, vh: number): Tile | null {
    const cy = vh * 0.5 - top, cx = cw / 2;
    let best: Tile | null = null, bd = 1e9;
    const dist = (s: Tile): number => Math.hypot(s.wall.x + s.wall.w / 2 - cx, s.wall.y + s.wall.h / 2 - cy);
    for (const s of tiles) {
      if (!matches(s)) continue;
      const d = dist(s);
      if (d < bd) { bd = d; best = s; }
    }
    if (midCur && matches(midCur) && dist(midCur) < bd * 1.25 + 8) return midCur;
    midCur = best;
    return best;
  }

  // ---- the loop ----
  function tick(now: number): void {
    raf = 0;
    if (!shouldRun()) return;
    raf = requestAnimationFrame(tick);
    const dt = Math.min((now - lastNow) / 1000 || 0.016, 0.05);
    lastNow = now;
    const Ts = now / 1000;
    const vw = root.clientWidth, vh = window.innerHeight;
    const cr = wallEl.getBoundingClientRect(), cw = cr.width, ch = cr.height;
    const qx = ptr.x - cr.left, qy = ptr.y - cr.top;
    const mouse = ptr.in && ptr.type !== 'touch';
    const inWall = mouse && qx >= 0 && qx <= cw && qy >= 0 && qy <= ch;

    // who is awake
    let hov: Tile | null = null;
    if (!current) {
      if (touchHold) hov = touchHold;
      else if (mouse) hov = inWall ? hitTile(qx, qy) : null;
      else if (coarse || isPhone) hov = midTile(cr.top, cw, vh);
      if (!hov && !mouse) { const f = tiles.find((s) => s.focus && matches(s)); if (f) hov = f; }
      if (!hov && mouse) { const f = tiles.find((s) => s.focus && matches(s)); if (f && !inWall && !ptr.down) hov = f; }
    }
    const fx = !current;

    // wall depth: the whole wall leans toward the pointer
    const pt = fx && inWall ? { x: clamp((qx / cw - 0.5) * 2, -1, 1), y: clamp((qy / ch - 0.5) * 2, -1, 1) } : { x: 0, y: 0 };
    const kp = 1 - Math.exp(-dt * 4);
    par.x += (pt.x - par.x) * kp;
    par.y += (pt.y - par.y) * kp;

    // the lamp follows the pointer on the wall (or a finger that is down), and otherwise drifts by itself
    const lampOn = lampEl !== null;
    if (lampEl && fx) {
      const box = { cw, ch, top: cr.top, vh };
      const phoneLike = coarse || isPhone;
      if (!lamp.init) { const at = lampStart(box, isPhone); lamp.x = at.x; lamp.y = at.y; lamp.init = true; }
      const aim = inWall || (ptr.type === 'touch' && ptr.down) ? { x: qx, y: qy } : driftTarget(Ts, box, phoneLike);
      const kl = 1 - Math.exp(-dt * (inWall ? 7 : 2.4));
      lamp.x += (aim.x - lamp.x) * kl;
      lamp.y += (aim.y - lamp.y) * kl;
      const lx = lamp.x.toFixed(1), ly = lamp.y.toFixed(1);
      if (lx !== lamp.wx) { lampEl.style.setProperty('--lx', lx + 'px'); lamp.wx = lx; }
      if (ly !== lamp.wy) { lampEl.style.setProperty('--ly', ly + 'px'); lamp.wy = ly; }
    }

    const moving = current !== null || tiles.some((s) => s.exit !== 0);
    const full = moving ? fullRect() : null;
    const dark = T.dark;
    const kg = 1 - Math.exp(-dt * 9), kv = 1 - Math.exp(-dt * 8), ko = 1 - Math.exp(-dt * 7);
    const R = Math.max(260, Math.min(cw * 0.28, 520));
    for (const s of tiles) {
      const c = s.cur ?? (s.cur = { ...s.wall });
      // ---- geometry ----
      let tg: Rect = s.wall;
      if (s.open) tg = full ?? fullRect();
      else if (s.exit) { const f = full ?? fullRect(); tg = { x: f.x + s.exit * f.w, y: f.y, w: f.w, h: f.h }; }
      c.x += (tg.x - c.x) * kg; c.y += (tg.y - c.y) * kg; c.w += (tg.w - c.w) * kg; c.h += (tg.h - c.h) * kg;
      const gap = Math.abs(tg.x - c.x) + Math.abs(tg.y - c.y) + Math.abs(tg.w - c.w) + Math.abs(tg.h - c.h);
      if (gap < 0.8) {
        c.x = tg.x; c.y = tg.y; c.w = tg.w; c.h = tg.h;
        if (s.exit) { s.exit = 0; Object.assign(c, s.wall); }
      }
      const fly = !s.open && (s.exit !== 0 || gap > 1.5);
      if (fly !== s.flying) { s.flying = fly; s.el.classList.toggle('lw-flying', fly); }
      const capGoal = s.open ? 0 : 1;
      s.cf += (capGoal - s.cf) * ko;
      if (Math.abs(s.cf - capGoal) < 0.004) s.cf = capGoal;
      const openGoal = s.open ? 1 : 0;
      s.oa += (openGoal - s.oa) * ko;
      if (Math.abs(s.oa - openGoal) < 0.004) s.oa = openGoal;
      const faceH = Math.max(1, c.h - TILE_CAP * s.cf - cardReserve * s.oa);
      const rad = 10 * (1 - s.oa);
      const st = s.el.style;
      const w = s.w;
      if (sig(c.x) !== w.x) { st.left = sig(c.x) + 'px'; w.x = sig(c.x); }
      if (sig(c.y) !== w.y) { st.top = sig(c.y) + 'px'; w.y = sig(c.y); }
      if (sig(c.w) !== w.w) { st.width = sig(c.w) + 'px'; w.w = sig(c.w); }
      if (sig(c.h) !== w.h) { st.height = sig(c.h) + 'px'; w.h = sig(c.h); }
      if (sig(faceH) !== w.fh) { s.face.style.height = sig(faceH) + 'px'; w.fh = sig(faceH); }
      if (sig(s.cf) !== w.cf) { s.cap.style.opacity = String(sig(s.cf)); s.cap.style.transform = 'translateY(' + sig((1 - s.cf) * 10) + 'px)'; w.cf = sig(s.cf); }
      if (sig(rad) !== w.r) { st.setProperty('--r', sig(rad) + 'px'); w.r = sig(rad); }

      // ---- yield: the hovered tile comes forward, neighbours give way ----
      const bc = { x: s.wall.x + s.wall.w / 2, y: s.wall.y + s.wall.h / 2 };
      let sc = 1, rx = 0, ry = 0, tx = 0, ty = 0, dim = 0;
      if (fx) {
        const breathe = hov ? 0 : 1;
        sc += 0.004 * Math.sin(Ts * 0.6 + s.idx * 1.3) * breathe;
        ty += 1.4 * Math.sin(Ts * 0.45 + s.idx * 0.9) * breathe;
        if (mouse) { tx -= par.x * s.depth * 6; ty -= par.y * s.depth * 5; ry -= par.x * 1.3; rx += par.y * 1.0; }
        if (hov === s) {
          const hs = mouse ? clamp(22 / Math.min(s.wall.w, s.wall.h), 0.04, 0.2) : 0.03;
          sc = 1 + hs; rx = 0; ry = 0;
        } else if (hov) {
          if (mouse) {
            const dx = bc.x - qx, dy = bc.y - qy, d = Math.max(1, Math.hypot(dx, dy)), wt = Math.exp(-((d / R) ** 2));
            sc = 1 - (0.012 + 0.05 * wt);
            dim = dark ? 0.12 + 0.14 * wt : lampOn ? 0.08 + 0.1 * wt : 0.34 + 0.24 * wt;
            rx += (dy / d) * 9 * wt; ry -= (dx / d) * 9 * wt;
          } else { sc = 0.985; dim = dark ? 0.15 : 0.26; }
        }
      }
      // A piece the filter has let go sinks into the wall where it hangs.
      if (fx && !matches(s)) { sc = 0.97; dim = dark ? 0.8 : 0.84; }
      if (s.open) { sc = 1; rx = ry = tx = ty = dim = 0; }
      const v = s.v;
      v.sc += (sc - v.sc) * kv; v.rx += (rx - v.rx) * kv; v.ry += (ry - v.ry) * kv; v.tx += (tx - v.tx) * kv; v.ty += (ty - v.ty) * kv; v.dim += (dim - v.dim) * kv;
      if (s.open) { v.sc = 1; v.rx = v.ry = v.tx = v.ty = 0; }
      const tf = 'translate(' + v.tx.toFixed(2) + 'px,' + v.ty.toFixed(2) + 'px) perspective(900px) rotateX(' + v.rx.toFixed(2) + 'deg) rotateY(' + v.ry.toFixed(2) + 'deg) scale(' + v.sc.toFixed(4) + ')';
      if (tf !== w.tf) { st.transform = tf; w.tf = tf; }
      if (sig(v.dim) !== w.dim) { s.veil.style.opacity = String(sig(v.dim)); w.dim = sig(v.dim); }
      const isHot = hov === s && !current;
      if (isHot !== s.hot) { s.hot = isHot; s.el.classList.toggle('lw-hot', isHot); }

      // ---- the lamp's glow on the tile's rim (dark only; the rim is not drawn in light) ----
      if (s.rim) {
        const goal = dark && fx && matches(s) ? rimLit(s.wall, lamp.x, lamp.y) : 0;
        s.lit += (goal - s.lit) * kv;
        if (Math.abs(goal - s.lit) < 0.004) s.lit = goal;
        if (sig(s.lit) !== w.lit) { s.rim.style.opacity = String(sig(s.lit)); w.lit = sig(s.lit); }
      }

      // ---- the miniature ----
      const top = cr.top + c.y;
      const onScreen = top < vh + 140 && top + c.h > -140 && c.x < vw + 40 && c.x + c.w > -40;
      s.vis = onScreen && (!current || s.open || s.flying);
      const W = Math.round(c.w), H = Math.round(faceH);
      if (W !== s.W || H !== s.H || (s.canvas && s.mini && s.dpr !== dpr)) {
        s.W = W; s.H = H;
        if (s.canvas && (s.vis || s.mini)) {
          s.dpr = dpr;
          s.canvas.width = Math.round(W * dpr);
          s.canvas.height = Math.round(H * dpr);
          if (s.mini) { s.mini.resize(W, H, dpr); render(s, now, 0.016); }
          s.need = true;
        }
      }
      if (!s.vis || !s.canvas) continue;
      if (!s.mini && !s.broken) {
        if (!s.mod) { requestMod(s); continue; }
        if (!s.W) continue;
        s.dpr = dpr;
        s.canvas.width = Math.round(s.W * dpr);
        s.canvas.height = Math.round(s.H * dpr);
        build(s);
        s.last = now - Math.random() * IDLE_MS;
        s.need = true;
      }
      if (!s.mini) continue;
      const p = s.p;
      const driven = (hov === s && (mouse || touchHold === s)) || (s.open && ptr.in && now - ptr.last < 2600);
      const wake = driven || hov === s || s.open || (s.focus && !current);
      if (wake && !s.intent) {
        if (driven) {
          p.tx = clamp((ptr.x - (cr.left + c.x)) / Math.max(1, c.w));
          p.ty = clamp((ptr.y - (cr.top + c.y)) / Math.max(1, faceH));
          p.x = p.tx; p.y = p.ty;
        } else { p.tx = p.x; p.ty = p.y; }
        s.mini.enter?.(p, (now - s.born) / 1000 + s.t0);
      }
      s.intent = wake;
      const live = wake || p.a > 0.02;
      if (!(live || s.need || now - s.last >= IDLE_MS)) continue;
      const sdt = s.last ? Math.min((now - s.last) / 1000, 0.25) : 0.016;
      s.last = now;
      s.need = false;
      if (live) {
        if (driven) {
          p.tx = clamp((ptr.x - (cr.left + c.x)) / Math.max(1, c.w));
          p.ty = clamp((ptr.y - (cr.top + c.y)) / Math.max(1, faceH));
        } else if (wake) {
          p.tx = 0.5 + 0.32 * Math.sin(now / 1700 + s.idx);
          p.ty = 0.5 + 0.28 * Math.sin(now / 2300 + s.idx * 2);
        }
        const k = 1 - Math.exp(-sdt * 9), ta = driven ? 1 : wake ? 0.85 : 0;
        p.x += (p.tx - p.x) * k; p.y += (p.ty - p.y) * k; p.a += (ta - p.a) * (1 - Math.exp(-sdt * 5));
        if (p.a < 0.003 && !ta) p.a = 0;
      }
      render(s, now, sdt);
    }
  }

  /** The loop runs only when something can be seen: the wall showing, the tab up, the wall on screen or a piece open. */
  function shouldRun(): boolean {
    return view === 'wall' && !document.hidden && (wallInView || current !== null);
  }
  function start(): void {
    if (raf || !shouldRun()) return;
    lastNow = performance.now();
    for (const s of tiles) s.need = true;
    raf = requestAnimationFrame(tick);
  }
  function stop(): void {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  const io = new IntersectionObserver((rows) => {
    const row = rows[rows.length - 1];
    if (!row) return;
    wallInView = row.isIntersecting;
    if (wallInView) start();
  }, { rootMargin: '140px 0px' });
  io.observe(wallEl);
  disposers.push(() => io.disconnect());
  const onVisibility = (): void => { if (document.hidden) stop(); else start(); };
  document.addEventListener('visibilitychange', onVisibility);
  disposers.push(() => document.removeEventListener('visibilitychange', onVisibility));

  // ---- size ----
  on(window, 'resize', () => { layout(); });
  let lastWidth = 0;
  // The wall's own width, and the height of everything above it: a web font landing after mount reflows the words over
  // the wall and moves its top. The box follows by itself (it is the row the page leaves it, lab-wall.css); this places the
  // tiles again, before the frame is painted.
  const ro = new ResizeObserver((records) => {
    const w = wallEl.clientWidth;
    const above = records.some((r) => r.target !== wallEl);
    if (w !== lastWidth || above) { lastWidth = w; layout(); }
  });
  ro.observe(wallEl);
  for (const el of aboveWall(wallEl)) ro.observe(el);
  // The engine keeps the box from here: the page's inline script stands down (reserve.ts).
  wallEl.setAttribute(LIVE_ATTR, '');
  disposers.push(() => wallEl.removeAttribute(LIVE_ATTR));
  disposers.push(() => ro.disconnect());
  const refit = (): void => {
    layout();
    for (const s of tiles) {
      s.need = true;
      if (s.mini && s.W) s.mini.resize(s.W, s.H, s.dpr);
    }
  };
  if (document.fonts) {
    Promise.all(['20px Marcellus', '20px Spectral', '600 20px Spectral'].map((f) => document.fonts.load(f))).then(refit, () => {});
    document.fonts.ready.then(refit, () => {});
    // A face still loading now lands in a task of its own: refit in that task, and once more a task later (the browser can
    // apply the face to the layout just after its promise settles), so the tiles are placed again soon after the face lands.
    try {
      document.fonts.forEach((f) => { if (f.status === 'loading') f.loaded.then(() => { refit(); setTimeout(refit, 0); }, () => {}); });
    } catch {
      /* the observer and the promises above still refit */
    }
  }

  layout();
  start();

  /** A link to a piece: open it over the wall, with the filter set to All if the filter would have hidden it. */
  function openFromLink(id: string, entry: Entry): void {
    const s = tileFor(id);
    if (!s || view !== 'wall') return;
    if (!matches(s)) {
      // A click on a piece the filter has let go opens nothing, before the engine as after it.
      if (entry === 'push') return;
      const all = document.querySelector<HTMLElement>('.filter a[data-set="all"]');
      if (all) all.click();
      else if (catalogEl) catalogEl.dataset.filter = 'all';
      filt = readFilter(catalogEl?.dataset.filter);
      applyFilter();
    }
    openTile(s, entry);
  }
  if (opts.open) openFromLink(opts.open, opts.entry ?? 'none');

  return {
    setView(next: View): void {
      if (next === view) return;
      view = next;
      applyLamp();
      if (view === 'wall') { layout(); start(); } else { if (current) closeTile(); stop(); }
    },
    destroy(): void {
      stop();
      if (current) closeTile();
      for (const d of disposers) d();
      for (const s of tiles) s.el.remove();
    },
  };
}
