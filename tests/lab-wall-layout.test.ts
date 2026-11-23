import { describe, expect, it } from 'vitest';
import { DESK, PHONE, PHONE_BELOW, layoutWall } from '../src/lib/lab-wall/layout';
import type { Rect } from '../src/lib/lab-wall/layout';
import { MINI_IDS } from '../src/lib/lab-wall/minis';
import { RESERVE_INLINE, SM_BELOW, TILE_ATTR, TILE_CAP, XS_BELOW } from '../src/lib/lab-wall/reserve';

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

  it('does nothing in the list view or with no view chosen', () => {
    expect(reserve({ view: 'list', windowWidth: 1440, windowHeight: 900, wallTop: 220, wallWidth: 1440 }).written).toEqual({});
    expect(reserve({ view: null, windowWidth: 1440, windowHeight: 900, wallTop: 220, wallWidth: 1440 }).written).toEqual({});
  });
});

describe('the framed tiles held before the engine arrives', () => {
  interface Fake {
    tag: string; className: string; textContent: string; innerHTML: string; attrs: Record<string, string>;
    style: Record<string, string> & { setProperty(k: string, v: string): void }; children: Fake[];
    appendChild(c: Fake): Fake; setAttribute(k: string, v: string): void;
  }
  const fake = (tag: string): Fake => {
    const f: Fake = {
      tag, className: '', textContent: '', innerHTML: '', attrs: {}, children: [],
      style: { setProperty(k: string, v: string) { (this as Record<string, string>)[k] = v; } } as Fake['style'],
      appendChild(c) { f.children.push(c); return c; },
      setAttribute(k, v) { f.attrs[k] = v; },
    };
    return f;
  };
  const KINDS: Record<string, string> = { experiment: 'Experiment', study: 'Study' };
  const rowsFor = (ids: string[]) => ids.map((id, i) => ({ id, designation: 'BDL-' + String(i + 1).padStart(3, '0'), title: 'Piece ' + id, kindLabel: KINDS[i % 2 ? 'study' : 'experiment'] }));

  function hang(ids: string[], windowWidth: number, windowHeight: number, wallTop: number, wallWidth: number) {
    const wall = fake('div') as Fake & { parentElement: null; clientWidth: number; getBoundingClientRect(): { top: number } };
    wall.parentElement = null;
    wall.clientWidth = wallWidth;
    wall.getBoundingClientRect = () => ({ top: wallTop });
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
});
