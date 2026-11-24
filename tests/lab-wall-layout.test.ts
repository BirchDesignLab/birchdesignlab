import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESK, PHONE, PHONE_BELOW, layoutWall } from '../src/lib/lab-wall/layout';
import type { Rect } from '../src/lib/lab-wall/layout';
import { MINI_IDS } from '../src/lib/lab-wall/minis';
import { EARLY_ATTR, RESERVE_INLINE, SM_BELOW, TILE_ATTR, TILE_CAP, XS_BELOW, holdBox, sizeClass } from '../src/lib/lab-wall/reserve';

const IDS = [...MINI_IDS] as string[];
const WIDTHS = [1440, 1024, 720, 719, 390];
/** The wall's box; the window is as wide as the wall unless a test says otherwise (no scrollbar). */
const box = (width: number, viewportWidth = width) => ({ width, viewportWidth, viewportHeight: 900, topHeight: 120 });
const EPS = 1e-6;

function overlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w - EPS && b.x < a.x + a.w - EPS && a.y < b.y + b.h - EPS && b.y < a.y + a.h - EPS;
}

function expectSound(ids: string[], width: number) {
  const { rects, height } = layoutWall(ids, box(width));
  const keys = Object.keys(rects);
  for (const id of ids) expect(rects[id], `${id} at ${width}`).toBeDefined();
  for (const id of keys) {
    const r = rects[id]!;
    expect(r.w, `${id} width`).toBeGreaterThan(0);
    expect(r.h, `${id} height`).toBeGreaterThan(0);
    expect(r.x, `${id} x`).toBeGreaterThanOrEqual(-EPS);
    expect(r.y, `${id} y`).toBeGreaterThanOrEqual(-EPS);
    expect(r.x + r.w, `${id} right edge at ${width}`).toBeLessThanOrEqual(width + EPS);
    expect(r.y + r.h, `${id} bottom edge at ${width}`).toBeLessThanOrEqual(height + EPS);
  }
  for (let i = 0; i < keys.length; i++) {
    for (let j = i + 1; j < keys.length; j++) {
      expect(overlap(rects[keys[i]!]!, rects[keys[j]!]!), `${keys[i]} vs ${keys[j]} at ${width}`).toBe(false);
    }
  }
  return { rects, height };
}

describe('lab wall layout', () => {
  it('MINI_IDS and both maps agree', () => {
    const sorted = (a: string[]) => [...a].sort();
    expect(sorted(Object.keys(DESK))).toEqual(sorted(IDS));
    expect(sorted(Object.keys(PHONE))).toEqual(sorted(IDS));
    expect(new Set(IDS).size).toBe(IDS.length);
  });

  it('uses the phone map under 720 and the desktop map from 720', () => {
    expect(layoutWall(IDS, box(720)).phone).toBe(false);
    expect(layoutWall(IDS, box(719)).phone).toBe(true);
  });

  it('chooses the map from the window, not the wall, so it agrees with the stylesheet (max-width: 719px)', () => {
    // An always-visible scrollbar (15px) leaves the wall narrower than the window it sits in.
    for (let vw = 690; vw <= 760; vw++) {
      const L = layoutWall(IDS, box(vw - 15, vw));
      expect(L.phone, `window ${vw}`).toBe(vw < PHONE_BELOW);
    }
    // the wall's own width has no say
    expect(layoutWall(IDS, box(705, 720)).phone).toBe(false);
    expect(layoutWall(IDS, box(735, 719)).phone).toBe(true);
    expect(layoutWall(IDS, box(100, 1440)).phone).toBe(false);
  });

  it('keeps every rectangle sound across the breakpoint with a scrollbar taking 15px', () => {
    for (const vw of [700, 719, 720, 721, 728, 735, 736, 737, 750]) {
      const { rects, height } = layoutWall(IDS, box(vw - 15, vw));
      const keys = Object.keys(rects);
      for (const id of keys) {
        const r = rects[id]!;
        expect(r.x, `${id} x at window ${vw}`).toBeGreaterThanOrEqual(-EPS);
        expect(r.x + r.w, `${id} right edge at window ${vw}`).toBeLessThanOrEqual(vw - 15 + EPS);
        expect(r.y + r.h, `${id} bottom edge at window ${vw}`).toBeLessThanOrEqual(height + EPS);
      }
      for (let i = 0; i < keys.length; i++) {
        for (let j = i + 1; j < keys.length; j++) expect(overlap(rects[keys[i]!]!, rects[keys[j]!]!), `${keys[i]} vs ${keys[j]} at window ${vw}`).toBe(false);
      }
    }
  });

  for (const width of WIDTHS) {
    it(`gives every piece a rectangle that fits, overlapping nothing, at ${width}`, () => {
      expectSound(IDS, width);
    });
  }

  it('fills the viewport below the header on desktop, with a floor', () => {
    expect(layoutWall(IDS, box(1440)).height).toBeCloseTo(900 - 120, 6);
    expect(layoutWall(IDS, { width: 1440, viewportWidth: 1440, viewportHeight: 400, topHeight: 120 }).height).toBeCloseTo(540, 6);
  });

  for (const width of WIDTHS) {
    it(`gives unknown ids spill rectangles that overlap nothing at ${width}`, () => {
      const plain = layoutWall(IDS, box(width));
      const two = [...IDS, 'bdl-900', 'bdl-901'];
      const grown = expectSound(two, width);
      expect(grown.height).toBeGreaterThan(plain.height);
      // the mapped pieces stay exactly where they were
      for (const id of IDS) expect(grown.rects[id]).toEqual(plain.rects[id]);
      // the spill sits under the mosaic
      const lowest = Math.max(...IDS.map((id) => plain.rects[id]!.y + plain.rects[id]!.h));
      expect(grown.rects['bdl-900']!.y).toBeGreaterThanOrEqual(lowest);
      expect(grown.rects['bdl-901']!.y).toBeGreaterThanOrEqual(lowest);
    });
  }

  it('wraps a long spill into more rows and keeps everything inside', () => {
    const many = [...IDS, ...Array.from({ length: 9 }, (_, i) => `bdl-9${i}0`)];
    for (const width of WIDTHS) expectSound(many, width);
    const a = layoutWall([...IDS, 'bdl-950'], box(1440)).height;
    const b = layoutWall(many, box(1440)).height;
    expect(b).toBeGreaterThan(a);
  });

  it('leaves the cell empty for a mapped id that is not in the list', () => {
    const fewer = IDS.filter((id) => id !== 'bdl-007');
    for (const width of WIDTHS) {
      const { rects } = expectSound(fewer, width);
      expect(rects['bdl-007']).toBeUndefined();
      expect(Object.keys(rects)).toHaveLength(fewer.length);
    }
  });

  it('ignores a repeated id and an id that only exists on the prototype', () => {
    const { rects } = layoutWall([...IDS, 'bdl-900', 'bdl-900', 'constructor'], box(1440));
    expect(Object.keys(rects)).toHaveLength(IDS.length + 2);
  });
});

describe('the box held before the engine arrives', () => {
  /** Run the inline script against a stand-in page and return what it wrote on the wall. */
  function reserve(opts: { view: string | null; windowWidth: number; windowHeight: number; wallTop: number; wallWidth: number; scrollY?: number; padLeft?: number; pageLeft?: number }) {
    const written: Record<string, string> = {};
    const props: Record<string, string> = {};
    const page = { getBoundingClientRect: () => ({ left: opts.pageLeft ?? 0 }) };
    const wall = {
      parentElement: page,
      clientWidth: opts.wallWidth,
      style: {
        get height() { return written.height ?? ''; },
        set height(v: string) { written.height = v; },
        get minHeight() { return written.minHeight ?? ''; },
        set minHeight(v: string) { written.minHeight = v; },
        setProperty: (k: string, v: string) => { props[k] = v; },
      },
      getBoundingClientRect: () => ({ top: opts.wallTop - (opts.scrollY ?? 0) }),
    };
    const doc = {
      querySelector: (s: string) => (s === '[data-lw="wall"]' ? wall : null),
      documentElement: { getAttribute: (n: string) => (n === 'data-lab-view' ? opts.view : null) },
    };
    const win = { innerWidth: opts.windowWidth, innerHeight: opts.windowHeight, scrollY: opts.scrollY ?? 0 };
    const gcs = () => ({ paddingLeft: (opts.padLeft ?? 0) + 'px' });
    new Function('document', 'window', 'getComputedStyle', RESERVE_INLINE)(doc, win, gcs);
    return { written, props };
  }

  it('gives the wall the height layoutWall gives it on desktop, for a window of any height', () => {
    for (const [ww, wh, top] of [[1440, 900, 220], [1920, 1080, 236], [1024, 768, 260], [1280, 400, 250], [720, 800, 300]] as const) {
      const got = reserve({ view: 'wall', windowWidth: ww, windowHeight: wh, wallTop: top, wallWidth: ww });
      const want = layoutWall(IDS, { width: ww, viewportWidth: ww, viewportHeight: wh, topHeight: top }).height;
      expect(parseFloat(got.written.height!), `${ww}x${wh}`).toBeCloseTo(want, 6);
    }
  });

  it('gives the wall the height layoutWall gives it on a phone, for any width', () => {
    for (const ww of [320, 360, 375, 390, 412, 600, 719]) {
      const got = reserve({ view: 'wall', windowWidth: ww, windowHeight: 800, wallTop: 200, wallWidth: ww });
      const want = layoutWall(IDS, { width: ww, viewportWidth: ww, viewportHeight: 800, topHeight: 200 }).height;
      expect(parseFloat(got.written.height!), `${ww}`).toBeCloseTo(want, 6);
    }
  });

  it('counts the page scroll in what sits above the wall, and holds the full-bleed margin and the exact height', () => {
    const got = reserve({ view: 'wall', windowWidth: 1440, windowHeight: 900, wallTop: 220, wallWidth: 1440, scrollY: 100, pageLeft: 80, padLeft: 24 });
    expect(parseFloat(got.written.height!)).toBeCloseTo(900 - 220, 6);
    expect(got.written.minHeight).toBe('0');
    expect(got.props['--lw-bleed']).toBe('104.00px');
  });

  it('follows the wall top when a web font lands or what sits above it changes height before the engine arrives, then stands down', async () => {
    const written: Record<string, string> = {};
    const attrs: Record<string, string> = {};
    let top = 244;
    const view = 'wall';
    const intro = { previousElementSibling: null };
    const hint = { previousElementSibling: intro };
    const body = {};
    const page = { getBoundingClientRect: () => ({ left: 0 }), previousElementSibling: null, parentElement: body };
    const wall = {
      parentElement: page,
      previousElementSibling: hint,
      clientWidth: 1440,
      style: {
        set height(v: string) { written.height = v; },
        set minHeight(v: string) { written.minHeight = v; },
        setProperty: () => {},
      },
      getBoundingClientRect: () => ({ top }),
      hasAttribute: (n: string) => n in attrs,
    };
    let land: () => void = () => {};
    let watchedLoaded = false;
    const loading = { status: 'loading', loaded: new Promise<void>((r) => { land = r; }) };
    const loaded = { status: 'loaded', get loaded() { watchedLoaded = true; return Promise.resolve(); } };
    const doc = {
      body,
      fonts: { forEach: (cb: (f: unknown) => void) => { cb(loading); cb(loaded); } },
      querySelector: (s: string) => (s === '[data-lw="wall"]' ? wall : null),
      documentElement: { getAttribute: (n: string) => (n === 'data-lab-view' ? view : null) },
    };
    const win = { innerWidth: 1440, innerHeight: 900, scrollY: 0 };
    const observers: Array<{ cb: () => void; observed: unknown[]; off: boolean }> = [];
    class FakeRO {
      rec: { cb: () => void; observed: unknown[]; off: boolean };
      constructor(cb: () => void) { this.rec = { cb, observed: [], off: false }; observers.push(this.rec); }
      observe(el: unknown) { this.rec.observed.push(el); }
      disconnect() { this.rec.off = true; }
    }
    new Function('document', 'window', 'getComputedStyle', 'ResizeObserver', RESERVE_INLINE)(doc, win, () => ({ paddingLeft: '0px' }), FakeRO);
    const want = (t: number) => layoutWall(IDS, { width: 1440, viewportWidth: 1440, viewportHeight: 900, topHeight: t }).height;
    expect(parseFloat(written.height!)).toBeCloseTo(want(244), 6);
    expect(observers).toHaveLength(1);
    const ro = observers[0]!;
    // Everything laid out before the wall, and nothing that contains it.
    expect(ro.observed).toEqual([hint, intro]);
    // A face that was still loading when the measure ran lands, and the words above the wall take 24px less: the box
    // follows its top in the task that landed it. A face already loaded is not watched.
    expect(watchedLoaded).toBe(false);
    top = 220;
    land();
    await Promise.resolve();
    expect(parseFloat(written.height!)).toBeCloseTo(want(220), 6);
    // Anything else above changes height: the observer refits.
    top = 232;
    ro.cb();
    expect(parseFloat(written.height!)).toBeCloseTo(want(232), 6);
    top = 220;
    ro.cb();
    expect(parseFloat(written.height!)).toBeCloseTo(want(220), 6);
    expect(want(220) - want(244)).toBeCloseTo(24, 6);
    // Once the engine is live the inline script stands down.
    attrs['data-lw-live'] = '';
    top = 200;
    ro.cb();
    expect(parseFloat(written.height!)).toBeCloseTo(want(220), 6);
    expect(ro.off).toBe(true);
  });

  it('does nothing in the list view or with no view chosen', () => {
    expect(reserve({ view: 'list', windowWidth: 1440, windowHeight: 900, wallTop: 220, wallWidth: 1440 }).written).toEqual({});
    expect(reserve({ view: null, windowWidth: 1440, windowHeight: 900, wallTop: 220, wallWidth: 1440 }).written).toEqual({});
  });
});

describe('the framed tiles held before the engine arrives', () => {
  interface Fake {
    tag: string; className: string; textContent: string; innerHTML: string; attrs: Record<string, string>;
    style: Record<string, string> & { setProperty(k: string, v: string): void }; children: Fake[];
    appendChild(c: Fake): Fake; setAttribute(k: string, v: string): void; getAttribute(k: string): string | null;
  }
  const fake = (tag: string): Fake => {
    const f: Fake = {
      tag, className: '', textContent: '', innerHTML: '', attrs: {}, children: [],
      style: { setProperty(k: string, v: string) { (this as Record<string, string>)[k] = v; } } as Fake['style'],
      appendChild(c) { f.children.push(c); return c; },
      setAttribute(k, v) { f.attrs[k] = v; },
      getAttribute(k) { return k in f.attrs ? f.attrs[k]! : null; },
    };
    return f;
  };
  const KINDS: Record<string, string> = { experiment: 'Experiment', study: 'Study' };
  const rowsFor = (ids: string[]) => ids.map((id, i) => ({ id, designation: 'BDL-' + String(i + 1).padStart(3, '0'), title: 'Piece ' + id, kindLabel: KINDS[i % 2 ? 'study' : 'experiment'] }));

  type Listener = (ev: unknown) => void;
  type FakeWall = Fake & {
    parentElement: null; clientWidth: number; getBoundingClientRect(): { top: number };
    listeners: Record<string, Listener[]>; addEventListener(t: string, fn: Listener): void;
    hasAttribute(n: string): boolean; removeAttribute(n: string): void;
  };

  function hang(ids: string[], windowWidth: number, windowHeight: number, wallTop: number, wallWidth: number) {
    const wall = fake('div') as FakeWall;
    wall.parentElement = null;
    wall.clientWidth = wallWidth;
    wall.getBoundingClientRect = () => ({ top: wallTop });
    wall.listeners = {};
    wall.addEventListener = (t, fn) => { (wall.listeners[t] ??= []).push(fn); };
    wall.hasAttribute = (n) => n in wall.attrs;
    wall.removeAttribute = (n) => { delete wall.attrs[n]; };
    const data = { textContent: JSON.stringify(rowsFor(ids)) };
    const doc = {
      querySelector: (q: string) => (q === '[data-lw="wall"]' ? wall : q === '[data-lw="data"]' ? data : null),
      createElement: (t: string) => fake(t),
      documentElement: { getAttribute: () => 'wall' },
    };
    const win = { innerWidth: windowWidth, innerHeight: windowHeight, scrollY: 0 };
    new Function('document', 'window', 'getComputedStyle', RESERVE_INLINE)(doc, win, () => ({ paddingLeft: '0px' }));
    return { wall, tiles: wall.children };
  }
  const px = (v: string | undefined) => parseFloat(v ?? 'NaN');

  it('hangs a framed, captioned tile in the cell layoutWall gives each piece, desktop and phone', () => {
    for (const [ww, wh] of [[1440, 900], [1024, 768], [390, 844], [360, 640]] as const) {
      const { wall, tiles } = hang(IDS, ww, wh, 220, ww);
      const L = layoutWall(IDS, { width: ww, viewportWidth: ww, viewportHeight: wh, topHeight: 220 });
      expect(tiles, `${ww}`).toHaveLength(IDS.length);
      expect(px(wall.style.height), `${ww} height`).toBeCloseTo(L.height, 6);
      for (const t of tiles) {
        const id = t.attrs[TILE_ATTR]!;
        const r = L.rects[id]!;
        expect(px(t.style.left), `${id} x at ${ww}`).toBeCloseTo(r.x, 1);
        expect(px(t.style.top), `${id} y at ${ww}`).toBeCloseTo(r.y, 1);
        expect(px(t.style.width), `${id} w at ${ww}`).toBeCloseTo(r.w, 1);
        expect(px(t.style.height), `${id} h at ${ww}`).toBeCloseTo(r.h, 1);
        const [face, cap] = t.children;
        expect(px(face!.style.height)).toBeCloseTo(Math.max(1, r.h - TILE_CAP), 1);
        expect(t.className.includes('lw-xs'), `xs ${id} ${ww}`).toBe(r.w < XS_BELOW);
        expect(t.className.includes('lw-sm'), `sm ${id} ${ww}`).toBe(r.w < SM_BELOW);
        // keyboard-reachable and named as the engine will name it, before the engine is there
        expect(t.attrs.role, `role ${id}`).toBe('button');
        expect(t.attrs.tabindex, `tabindex ${id}`).toBe('0');
        const [d, title, kind] = cap!.children;
        expect(d!.textContent).toMatch(/^BDL-[0-9]{3}$/);
        expect(title!.textContent).toBe('Piece ' + id);
        expect(['Experiment', 'Study']).toContain(kind!.textContent);
      }
    }
  });

  it('gives a piece the maps do not know a spill cell and makes the box tall enough for it', () => {
    const ids = [...IDS, 'bdl-901', 'bdl-902', 'bdl-903'];
    for (const [ww, wh] of [[1440, 900], [390, 844]] as const) {
      const { wall, tiles } = hang(ids, ww, wh, 220, ww);
      const L = layoutWall(ids, { width: ww, viewportWidth: ww, viewportHeight: wh, topHeight: 220 });
      expect(px(wall.style.height), `${ww}`).toBeCloseTo(L.height, 6);
      expect(tiles).toHaveLength(ids.length);
      const spilled = tiles.find((t) => t.attrs[TILE_ATTR] === 'bdl-903')!;
      expect(px(spilled.style.top), `${ww}`).toBeCloseTo(L.rects['bdl-903']!.y, 1);
    }
  });

  it('hangs nothing for data it cannot read, and still sizes the box', () => {
    const { wall, tiles } = hang([], 1440, 900, 220, 1440);
    expect(tiles).toHaveLength(0);
    expect(px(wall.style.height)).toBeCloseTo(900 - 220, 6);
  });

  it('remembers the last click, Enter or Space on a framed tile until the engine is live, then stands down', () => {
    const { wall, tiles } = hang(IDS, 1440, 900, 220, 1440);
    const [a, b] = [tiles[0]!, tiles[1]!];
    for (const t of tiles) (t as Fake & { closest(s: string): Fake | null }).closest = (s) => (s === `[${TILE_ATTR}]` ? t : null);
    const ev = (target: Fake, key?: string) => {
      const e = { target, key, prevented: false, preventDefault() { e.prevented = true; } };
      return e;
    };
    const fire = (type: string, e: ReturnType<typeof ev>) => (wall.listeners[type] ?? []).forEach((fn) => fn(e));
    expect(wall.attrs[EARLY_ATTR]).toBeUndefined();
    fire('click', ev(a));
    expect(wall.attrs[EARLY_ATTR]).toBe(a.attrs[TILE_ATTR]);
    // the last one wins
    const enter = ev(b, 'Enter');
    fire('keydown', enter);
    expect(wall.attrs[EARLY_ATTR]).toBe(b.attrs[TILE_ATTR]);
    expect(enter.prevented).toBe(true);
    const space = ev(a, ' ');
    fire('keydown', space);
    expect(wall.attrs[EARLY_ATTR]).toBe(a.attrs[TILE_ATTR]);
    expect(space.prevented).toBe(true);
    // other keys and clicks off a tile are not clicks
    const tab = ev(b, 'Tab');
    fire('keydown', tab);
    expect(wall.attrs[EARLY_ATTR]).toBe(a.attrs[TILE_ATTR]);
    expect(tab.prevented).toBe(false);
    fire('click', ev(wall));
    expect(wall.attrs[EARLY_ATTR]).toBe(a.attrs[TILE_ATTR]);
    // once the engine is live it has its own handlers: nothing is remembered, nothing doubled
    delete wall.attrs[EARLY_ATTR];
    wall.attrs['data-lw-live'] = '';
    fire('click', ev(b));
    const live = ev(b, 'Enter');
    fire('keydown', live);
    expect(wall.attrs[EARLY_ATTR]).toBeUndefined();
    expect(live.prevented).toBe(false);
  });

  it('gives each tile the same caption size classes the engine gives it, at every width, and the engine reads them from the same place', () => {
    expect(sizeClass(XS_BELOW - 0.01)).toEqual({ xs: true, sm: true });
    expect(sizeClass(XS_BELOW)).toEqual({ xs: false, sm: true });
    expect(sizeClass(SM_BELOW - 0.01)).toEqual({ xs: false, sm: true });
    expect(sizeClass(SM_BELOW)).toEqual({ xs: false, sm: false });
    const seen = new Set<string>();
    for (let ww = 320; ww <= 1920; ww += 13) {
      const { tiles } = hang(IDS, ww, 900, 220, ww);
      const L = layoutWall(IDS, { width: ww, viewportWidth: ww, viewportHeight: 900, topHeight: 220 });
      for (const t of tiles) {
        const want = sizeClass(L.rects[t.attrs[TILE_ATTR]!]!.w);
        expect(t.className.includes('lw-xs'), `xs ${t.attrs[TILE_ATTR]} at ${ww}`).toBe(want.xs);
        expect(t.className.includes('lw-sm'), `sm ${t.attrs[TILE_ATTR]} at ${ww}`).toBe(want.sm);
        seen.add(`${want.xs}/${want.sm}`);
      }
    }
    // the sweep crosses both thresholds, so it tests something
    expect([...seen].sort()).toEqual(['false/false', 'false/true', 'true/true']);
    // wall.ts keeps no thresholds of its own
    const engine = readFileSync(fileURLToPath(new URL('../src/lib/lab-wall/wall.ts', import.meta.url)), 'utf8');
    expect(engine).toMatch(/sizeClass\(/);
    expect(engine).not.toMatch(/\.w\s*<\s*(150|260)\b/);
  });
});

describe('the box held on every path into the wall view', () => {
  afterEach(() => vi.unstubAllGlobals());

  function stage() {
    const listeners: Record<string, Array<() => void>> = {};
    const body = {};
    const intro = { previousElementSibling: null };
    const page = { previousElementSibling: null, parentElement: body };
    const wall = { parentElement: page, previousElementSibling: intro };
    const win = {
      addEventListener: (t: string, fn: () => void) => { (listeners[t] ??= []).push(fn); },
      removeEventListener: (t: string, fn: () => void) => { listeners[t] = (listeners[t] ?? []).filter((x) => x !== fn); },
    };
    type Face = { status: string; loaded: Promise<unknown>; land(): void };
    const face = (status: string): Face => {
      let land = () => {};
      const f: Face = { status, loaded: new Promise<void>((r) => { land = r; }), land: () => { f.status = 'loaded'; land(); } };
      return f;
    };
    const faces: Face[] = [];
    const fontEvents: Record<string, Array<() => void>> = {};
    const fonts = {
      forEach: (cb: (f: Face) => void) => faces.forEach(cb),
      addEventListener: (t: string, fn: () => void) => { (fontEvents[t] ??= []).push(fn); },
      removeEventListener: (t: string, fn: () => void) => { fontEvents[t] = (fontEvents[t] ?? []).filter((x) => x !== fn); },
    };
    const ros: Array<{ cb: () => void; observed: unknown[]; off: boolean }> = [];
    class FakeRO {
      rec: { cb: () => void; observed: unknown[]; off: boolean };
      constructor(cb: () => void) { this.rec = { cb, observed: [], off: false }; ros.push(this.rec); }
      observe(el: unknown) { this.rec.observed.push(el); }
      disconnect() { this.rec.off = true; }
    }
    vi.stubGlobal('window', win);
    vi.stubGlobal('document', { body, fonts });
    vi.stubGlobal('ResizeObserver', FakeRO);
    return { wall, intro, listeners, faces, face, fontEvents, ros };
  }
  const settle = () => Promise.resolve().then(() => Promise.resolve());

  it('refits on a resize, on anything above the wall changing height, and in the task each loading font lands, including one that starts later', async () => {
    const s = stage();
    const loading = s.face('loading');
    const loaded = s.face('loaded');
    s.faces.push(loading, loaded);
    let n = 0;
    const stop = holdBox(s.wall as unknown as HTMLElement, () => { n++; });
    expect(s.ros).toHaveLength(1);
    expect(s.ros[0]!.observed).toEqual([s.intro]);
    s.listeners.resize![0]!();
    expect(n).toBe(1);
    s.ros[0]!.cb();
    expect(n).toBe(2);
    loading.land();
    await settle();
    expect(n).toBe(3);
    // a face that starts loading after the hold began is watched when the set says loading starts
    const later = s.face('loading');
    s.faces.push(later);
    s.fontEvents.loading!.forEach((fn) => fn());
    s.fontEvents.loading!.forEach((fn) => fn());
    later.land();
    await settle();
    expect(n).toBe(4);
    stop();
  });

  it('stands down entirely when told: no listener, no observer, and a font that lands later refits nothing', async () => {
    const s = stage();
    const loading = s.face('loading');
    s.faces.push(loading);
    let n = 0;
    const stop = holdBox(s.wall as unknown as HTMLElement, () => { n++; });
    stop();
    expect(s.listeners.resize).toEqual([]);
    expect(s.fontEvents.loading).toEqual([]);
    expect(s.ros[0]!.off).toBe(true);
    loading.land();
    await settle();
    expect(n).toBe(0);
  });
});
