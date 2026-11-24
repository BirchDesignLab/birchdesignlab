import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DESK, DESK_MIN_HEIGHT, MAPS, PHONE, PHONE_BELOW, TABLET, TABLET_BELOW, WALL_MAX, layoutWall, wallBleed, wallKind } from '../src/lib/lab-wall/layout';
import type { WallKind } from '../src/lib/lab-wall/layout';
import type { Rect } from '../src/lib/lab-wall/layout';
import { MINI_IDS } from '../src/lib/lab-wall/minis';
import { EARLY_ATTR, PAGE_MIN_VAR, RESERVE_INLINE, SM_BELOW, TILE_ATTR, TILE_CAP, XS_BELOW, holdBox, sizeClass } from '../src/lib/lab-wall/reserve';

const IDS = [...MINI_IDS] as string[];
const WIDTHS = [1920, 1440, 1280, 1100, 1099, 1024, 820, 768, 720, 719, 430, 390, 360];
/** The wall's box. The window is as wide as the wall (no scrollbar) up to WALL_MAX; past it the wall stops there, centred. */
const box = (viewportWidth: number, width = Math.min(viewportWidth, WALL_MAX)) => ({ width, viewportWidth, viewportHeight: 900, topHeight: 120 });
const KINDS: WallKind[] = ['desk', 'tablet', 'phone'];
const kindAt = (vw: number): WallKind => (vw < PHONE_BELOW ? 'phone' : vw < TABLET_BELOW ? 'tablet' : 'desk');
const EPS = 1e-6;

/**
 * The height the stylesheet gives the wall once the inline script (or measureWall) has run: a number on a phone or with a
 * spill row, and on desktop the row the page leaves it, which is the page's least height less everything above the wall
 * in the page (lab-wall.css: the page is a grid whose last row is the wall; border-box, so its bottom padding is inside).
 */
function cssHeight(wall: { height?: string; minHeight?: string }, pageProps: Record<string, string>, wallTop: number, pageTop: number, padBottom = 0): number {
  if (wall.height) return parseFloat(wall.height);
  return Math.max(parseFloat(wall.minHeight!), parseFloat(pageProps[PAGE_MIN_VAR]!) - padBottom - (wallTop - pageTop));
}

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
  it('MINI_IDS and all three maps agree', () => {
    const sorted = (a: string[]) => [...a].sort();
    expect(sorted(Object.keys(DESK))).toEqual(sorted(IDS));
    expect(sorted(Object.keys(TABLET))).toEqual(sorted(IDS));
    expect(sorted(Object.keys(PHONE))).toEqual(sorted(IDS));
    expect(new Set(IDS).size).toBe(IDS.length);
    expect(MAPS.desk.cells).toBe(DESK);
    expect(MAPS.tablet.cells).toBe(TABLET);
    expect(MAPS.phone.cells).toBe(PHONE);
  });

  it('uses the phone map under 720, the tablet map from 720 to 1099 and the desktop map from 1100', () => {
    expect(PHONE_BELOW).toBe(720);
    expect(TABLET_BELOW).toBe(1100);
    for (const [vw, kind] of [[719, 'phone'], [720, 'tablet'], [1099, 'tablet'], [1100, 'desk'], [1920, 'desk'], [360, 'phone']] as const) {
      const L = layoutWall(IDS, box(vw));
      expect(L.kind, `${vw}`).toBe(kind);
      expect(L.phone, `${vw}`).toBe(kind === 'phone');
      expect(wallKind(vw)).toBe(kind);
    }
  });

  it('chooses the map from the window, not the wall, so it agrees with the stylesheet (max-width: 719px, min-width: 1100px)', () => {
    // An always-visible scrollbar (15px) leaves the wall narrower than the window it sits in.
    for (const edge of [PHONE_BELOW, TABLET_BELOW]) {
      for (let vw = edge - 30; vw <= edge + 40; vw++) {
        const L = layoutWall(IDS, box(vw, vw - 15));
        expect(L.kind, `window ${vw} (wall ${vw - 15})`).toBe(kindAt(vw));
      }
    }
    // the wall's own width has no say
    expect(layoutWall(IDS, box(720, 705)).kind).toBe('tablet');
    expect(layoutWall(IDS, box(719, 735)).kind).toBe('phone');
    expect(layoutWall(IDS, box(1099, 1114)).kind).toBe('tablet');
    expect(layoutWall(IDS, box(1100, 1085)).kind).toBe('desk');
    expect(layoutWall(IDS, box(1440, 100)).kind).toBe('desk');
  });

  it('keeps every rectangle sound across both breakpoints with a scrollbar taking 15px', () => {
    for (const vw of [700, 719, 720, 721, 728, 735, 736, 737, 750, 1085, 1099, 1100, 1101, 1115, 1130]) {
      const { rects, height } = layoutWall(IDS, box(vw, vw - 15));
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

  it('leaves no hole: the cells of every map tile the mosaic exactly', () => {
    for (const kind of KINDS) {
      const spec = MAPS[kind];
      const seen = new Map<string, string>();
      for (const [id, [c, r, w, h]] of Object.entries(spec.cells)) {
        expect(c + w, `${kind} ${id} right`).toBeLessThanOrEqual(spec.cols);
        expect(r + h, `${kind} ${id} bottom`).toBeLessThanOrEqual(spec.rows);
        for (let y = r; y < r + h; y++) {
          for (let x = c; x < c + w; x++) {
            const at = x + ',' + y;
            expect(seen.has(at), `${kind}: ${id} overlaps ${seen.get(at)} at ${at}`).toBe(false);
            seen.set(at, id);
          }
        }
      }
      expect(seen.size, `${kind} cells covered`).toBe(spec.cols * spec.rows);
    }
  });

  // The hang's tiers (the founder's ruling): the Portal leads; then the three next; then the middle four; then the three smallest.
  const LEAD = 'bdl-010';
  const SECOND = ['bdl-011', 'bdl-012', 'bdl-013'];
  const MID = ['bdl-005', 'bdl-007', 'bdl-002', 'bdl-001'];
  const SMALL = ['bdl-009', 'bdl-008', 'bdl-003'];
  const area = (r: Rect) => r.w * r.h;

  it('hangs the tiers in every map: the Portal leads, then the three, then the middle four, then the three smallest', () => {
    for (const kind of KINDS) {
      const cells = MAPS[kind].cells;
      const a = (id: string) => cells[id]![2] * cells[id]![3];
      const min = (ids: string[]) => Math.min(...ids.map(a));
      const max = (ids: string[]) => Math.max(...ids.map(a));
      expect(a(LEAD), `${kind}: lead vs second`).toBeGreaterThan(max(SECOND));
      expect(min(SECOND), `${kind}: second vs mid`).toBeGreaterThan(max(MID));
      expect(min(MID), `${kind}: mid vs small`).toBeGreaterThan(max(SMALL));
      // the lead is clearly the biggest, not a nose ahead
      expect(a(LEAD), `${kind}: lead clearly bigger`).toBeGreaterThanOrEqual(1.5 * max(SECOND));
    }
  });

  it('hangs the tiers in rendered pixels too, at every width: lead > second > mid > small, by rectangle area', () => {
    for (const width of WIDTHS) {
      const { rects } = layoutWall(IDS, box(width));
      const a = (id: string) => area(rects[id]!);
      expect(a(LEAD), `lead at ${width}`).toBeGreaterThan(Math.max(...SECOND.map(a)));
      expect(Math.min(...SECOND.map(a)), `second at ${width}`).toBeGreaterThan(Math.max(...MID.map(a)));
      expect(Math.min(...MID.map(a)), `mid at ${width}`).toBeGreaterThan(Math.max(...SMALL.map(a)));
    }
  });

  it('gives the Portal about 40% of the desktop wall, top left, and about 70% of a phone screen, first and full width', () => {
    for (const vw of [1920, 1440, 1280, 1100]) {
      const wall = Math.min(vw, WALL_MAX);
      const L = layoutWall(IDS, { width: wall, viewportWidth: vw, viewportHeight: Math.round((vw * 9) / 16), topHeight: 200 });
      const r = L.rects[LEAD]!;
      const share = area(r) / (wall * L.height);
      expect(share, `share at ${vw}`).toBeGreaterThan(0.36);
      expect(share, `share at ${vw}`).toBeLessThan(0.46);
      expect(r.x, `${vw}`).toBeLessThan(10);
      expect(r.y, `${vw}`).toBeLessThan(10);
    }
    for (const [vw, vh] of [[430, 932], [390, 844], [360, 800]] as const) {
      const L = layoutWall(IDS, { width: vw, viewportWidth: vw, viewportHeight: vh, topHeight: 200 });
      const r = L.rects[LEAD]!;
      expect(r.y, `${vw}`).toBeLessThan(10);
      expect(r.w, `${vw} full width`).toBeCloseTo(vw - 12, 1);
      expect(r.h / vh, `${vw} share of the screen`).toBeGreaterThan(0.6);
      expect(r.h / vh, `${vw} share of the screen`).toBeLessThan(0.8);
      // the three next are full width and shorter than the lead
      for (const id of SECOND) {
        expect(L.rects[id]!.w, `${id} at ${vw}`).toBeCloseTo(vw - 12, 1);
        expect(L.rects[id]!.h, `${id} at ${vw}`).toBeLessThan(r.h);
      }
      const order = Object.entries(L.rects).sort((p, q) => p[1].y - q[1].y || p[1].x - q[1].x).map(([id]) => id);
      expect(order[0]).toBe(LEAD);
      // the rest go two-up: every one of them is half a width
      for (const id of [...MID, ...SMALL]) expect(L.rects[id]!.w, `${id} at ${vw}`).toBeLessThan(vw / 2);
    }
  });

  it('keeps every tile wide enough: 180px on the tablet at 768, 820 and 1024 (and 720 and 1099, scrollbar or not), 170px on the phone', () => {
    for (const vw of [720, 768, 820, 1024, 1099]) {
      for (const wall of [vw, vw - 15]) {
        const { rects } = layoutWall(IDS, box(vw, wall));
        for (const [id, r] of Object.entries(rects)) expect(r.w, `${id} at ${vw} (wall ${wall})`).toBeGreaterThanOrEqual(180);
      }
    }
    for (const vw of [360, 375, 390, 430, 719]) {
      const { rects } = layoutWall(IDS, box(vw));
      for (const [id, r] of Object.entries(rects)) expect(r.w, `${id} at ${vw}`).toBeGreaterThanOrEqual(170);
    }
  });

  it('is taller than the window on a tablet and a phone, with a number for its height, and fills the window only on a desktop', () => {
    for (const vw of [720, 768, 820, 1024, 1099]) {
      const L = layoutWall(IDS, box(vw));
      expect(L.fill, `${vw}`).toBe(false);
      expect(L.height, `${vw}`).toBeGreaterThan(900);
    }
    expect(layoutWall(IDS, box(1100)).fill).toBe(true);
    expect(layoutWall(IDS, box(719)).fill).toBe(false);
  });

  it('caps the wall at 1520: the tiles stop growing, and the bleed keeps the wall centred on the header row, which takes the same width', () => {
    expect(WALL_MAX).toBe(1520);
    const at = (vw: number) => layoutWall(IDS, box(vw));
    expect(at(1920).rects[LEAD]!.w).toBeCloseTo(at(1520).rects[LEAD]!.w, 6);
    expect(at(1920).rects[LEAD]!.w).toBeGreaterThan(at(1440).rects[LEAD]!.w);
    // the page's column (68rem, 24px padding, centred) holds the wall; the wall reaches past it to the window's edge, or to the cap's edge
    const column = (vw: number) => (vw - 1088) / 2 + 24;
    for (const vw of [1100, 1280, 1440, 1520, 1600, 1920, 2560]) {
      const wallLeft = column(vw) - wallBleed(column(vw), vw);
      expect(vw - 2 * wallLeft, `wall width at ${vw}`).toBeCloseTo(Math.min(vw, WALL_MAX), 6);
      // past the cap the wall is centred; at or below it the wall reaches the window's edge (the header keeps the site's column)
      if (vw > WALL_MAX) expect(wallLeft, `wall centred at ${vw}`).toBeCloseTo((vw - WALL_MAX) / 2, 6);
      else expect(wallLeft, `wall edge at ${vw}`).toBeCloseTo(0, 6);
    }
    // narrow windows are unchanged: the bleed is the column's own distance from the edge
    expect(wallBleed(104, 1440)).toBeCloseTo(104, 6);
    expect(wallBleed(24, 390)).toBeCloseTo(24, 6);
  });

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
  function reserve(opts: { view: string | null; windowWidth: number; windowHeight: number; wallTop: number; wallWidth: number; scrollY?: number; padLeft?: number; pageLeft?: number; pageTop?: number; padBottom?: number; ids?: string[]; clientWidth?: number }) {
    const written: Record<string, string> = {};
    const props: Record<string, string> = {};
    const pageProps: Record<string, string> = {};
    const pageTop = opts.pageTop ?? 100;
    const page = {
      getBoundingClientRect: () => ({ left: opts.pageLeft ?? 0, top: pageTop - (opts.scrollY ?? 0) }),
      style: { setProperty: (k: string, v: string) => { pageProps[k] = v; }, removeProperty: (k: string) => { delete pageProps[k]; } },
    };
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
    const data = { textContent: JSON.stringify((opts.ids ?? IDS).map((id) => ({ id }))) };
    const doc = {
      querySelector: (s: string) => (s === '[data-lw="wall"]' ? wall : s === '[data-lw="data"]' ? data : null),
      documentElement: { clientWidth: opts.clientWidth, getAttribute: (n: string) => (n === 'data-lab-view' ? opts.view : null) },
    };
    const win = { innerWidth: opts.windowWidth, innerHeight: opts.windowHeight, scrollY: opts.scrollY ?? 0 };
    const gcs = () => ({ paddingLeft: (opts.padLeft ?? 0) + 'px', paddingBottom: (opts.padBottom ?? 0) + 'px', borderBottomWidth: '0px' });
    new Function('document', 'window', 'getComputedStyle', RESERVE_INLINE)(doc, win, gcs);
    return { written, props, pageProps, height: () => cssHeight(written, pageProps, opts.wallTop, pageTop, opts.padBottom ?? 0) };
  }

  it('gives the wall the height layoutWall gives it on desktop, for a window of any height, as the row the page leaves it', () => {
    for (const [ww, wh, top, pb] of [[1440, 900, 220, 0], [1920, 1080, 236, 0], [1100, 768, 260, 24], [1280, 400, 250, 0], [1100, 800, 300, 0]] as const) {
      const wall = Math.min(ww, WALL_MAX);
      const got = reserve({ view: 'wall', windowWidth: ww, windowHeight: wh, wallTop: top, wallWidth: wall, padBottom: pb });
      const want = layoutWall(IDS, { width: wall, viewportWidth: ww, viewportHeight: wh, topHeight: top }).height;
      // no number is written: the page is told its least height, and the wall's floor is the shortest mosaic
      expect(got.written.height, `${ww}x${wh}`).toBe('');
      expect(got.written.minHeight).toBe(DESK_MIN_HEIGHT + 'px');
      expect(got.height(), `${ww}x${wh}`).toBeCloseTo(want, 6);
    }
  });

  it('gives the wall a number of its own when a piece spills past the mosaic, and takes the page rule away', () => {
    const ids = [...IDS, 'bdl-901', 'bdl-902'];
    const got = reserve({ view: 'wall', windowWidth: 1440, windowHeight: 900, wallTop: 220, wallWidth: 1440, ids });
    const want = layoutWall(ids, { width: 1440, viewportWidth: 1440, viewportHeight: 900, topHeight: 220 });
    expect(want.fill).toBe(false);
    expect(parseFloat(got.written.height!)).toBeCloseTo(want.height, 6);
    expect(got.written.minHeight).toBe('0');
    expect(got.pageProps[PAGE_MIN_VAR]).toBeUndefined();
  });

  it('gives the wall a number for its height on a tablet, from the width alone, and takes the page rule away', () => {
    for (const ww of [720, 768, 820, 1024, 1099]) {
      for (const wh of [700, 1180]) {
        const got = reserve({ view: 'wall', windowWidth: ww, windowHeight: wh, wallTop: 220, wallWidth: ww - 15 });
        const L = layoutWall(IDS, { width: ww - 15, viewportWidth: ww, viewportHeight: wh, topHeight: 220 });
        expect(L.kind).toBe('tablet');
        expect(parseFloat(got.written.height!), `${ww}x${wh}`).toBeCloseTo(L.height, 6);
        expect(got.written.minHeight).toBe('0');
        expect(got.pageProps[PAGE_MIN_VAR]).toBeUndefined();
      }
    }
  });

  it('gives the wall the height layoutWall gives it on a phone, for any width', () => {
    for (const ww of [320, 360, 375, 390, 412, 600, 719]) {
      const got = reserve({ view: 'wall', windowWidth: ww, windowHeight: 800, wallTop: 200, wallWidth: ww });
      const want = layoutWall(IDS, { width: ww, viewportWidth: ww, viewportHeight: 800, topHeight: 200 }).height;
      expect(parseFloat(got.written.height!), `${ww}`).toBeCloseTo(want, 6);
      expect(got.written.minHeight).toBe('0');
      expect(got.pageProps[PAGE_MIN_VAR]).toBeUndefined();
    }
  });

  it('counts the page scroll in what sits above the wall, and holds the full-bleed margin and the page height', () => {
    const got = reserve({ view: 'wall', windowWidth: 1440, windowHeight: 900, wallTop: 220, wallWidth: 1440, scrollY: 100, pageLeft: 80, padLeft: 24 });
    expect(got.height()).toBeCloseTo(900 - 220, 6);
    expect(parseFloat(got.pageProps[PAGE_MIN_VAR]!)).toBeCloseTo(900 - 100, 6);
    expect(got.props['--lw-bleed']).toBe('104.00px');
  });

  it('caps the full-bleed margin where the window is wider than the wall may be, as the engine does, and not before', () => {
    // the page's column (68rem, 24px padding) centred in a 1920 window: its text starts at 440, the capped wall at 200
    const wide = reserve({ view: 'wall', windowWidth: 1920, clientWidth: 1920, windowHeight: 1080, wallTop: 220, wallWidth: 1520, pageLeft: 416, padLeft: 24 });
    expect(wide.props['--lw-bleed']).toBe(wallBleed(440, 1920).toFixed(2) + 'px');
    expect(wide.props['--lw-bleed']).toBe('240.00px');
    // an always-visible scrollbar: the window's width without it is what centres the page
    const bar = reserve({ view: 'wall', windowWidth: 1920, clientWidth: 1905, windowHeight: 1080, wallTop: 220, wallWidth: 1520, pageLeft: 408.5, padLeft: 24 });
    expect(bar.props['--lw-bleed']).toBe(wallBleed(432.5, 1905).toFixed(2) + 'px');
    // under the cap nothing changes
    const plain = reserve({ view: 'wall', windowWidth: 1440, clientWidth: 1440, windowHeight: 900, wallTop: 220, wallWidth: 1440, pageLeft: 176, padLeft: 24 });
    expect(plain.props['--lw-bleed']).toBe('200.00px');
  });

  it('follows the wall top when a web font lands or what sits above it changes height before the engine arrives, then stands down', async () => {
    const written: Record<string, string> = {};
    const attrs: Record<string, string> = {};
    let top = 244;
    const view = 'wall';
    const intro = { previousElementSibling: null };
    const hint = { previousElementSibling: intro };
    const body = {};
    const pageProps: Record<string, string> = {};
    const PAGE_TOP = 100;
    const page = {
      getBoundingClientRect: () => ({ left: 0, top: PAGE_TOP }),
      style: { setProperty: (k: string, v: string) => { pageProps[k] = v; }, removeProperty: (k: string) => { delete pageProps[k]; } },
      previousElementSibling: null,
      parentElement: body,
    };
    const wall = {
      parentElement: page,
      previousElementSibling: hint,
      clientWidth: 1440,
      style: {
        get height() { return written.height ?? ''; },
        set height(v: string) { written.height = v; },
        get minHeight() { return written.minHeight ?? ''; },
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
    // What the stylesheet makes of the box at the wall's top as it is now, with whatever the script last wrote.
    const made = () => cssHeight(written, pageProps, top, PAGE_TOP);
    expect(made()).toBeCloseTo(want(244), 6);
    const told = pageProps[PAGE_MIN_VAR];
    expect(observers).toHaveLength(1);
    const ro = observers[0]!;
    // Everything laid out before the wall, and nothing that contains it.
    expect(ro.observed).toEqual([hint, intro]);
    // A face that was still loading when the measure ran lands, and the words above the wall take 24px less: the box
    // follows its top in the task that landed it. A face already loaded is not watched.
    expect(watchedLoaded).toBe(false);
    top = 220;
    // The page is told its least height from where the page starts, so the box follows its top in the very layout that
    // moves the top: before anything has measured again, its lower edge is where it was.
    expect(made()).toBeCloseTo(want(220), 6);
    expect(top + made()).toBeCloseTo(244 + want(244), 6);
    land();
    await Promise.resolve();
    expect(pageProps[PAGE_MIN_VAR]).toBe(told);
    expect(made()).toBeCloseTo(want(220), 6);
    // Anything else above changes height: the box holds, and the observer's refit leaves the page's height as it was.
    top = 232;
    expect(top + made()).toBeCloseTo(244 + want(244), 6);
    ro.cb();
    expect(made()).toBeCloseTo(want(232), 6);
    top = 220;
    ro.cb();
    expect(made()).toBeCloseTo(want(220), 6);
    expect(want(220) - want(244)).toBeCloseTo(24, 6);
    // Once the engine is live the inline script stands down.
    attrs['data-lw-live'] = '';
    win.innerHeight = 700;
    top = 200;
    ro.cb();
    expect(pageProps[PAGE_MIN_VAR]).toBe(told);
    expect(ro.off).toBe(true);
  });

  it('does nothing in the list view or with no view chosen', () => {
    for (const view of ['list', null]) {
      const got = reserve({ view, windowWidth: 1440, windowHeight: 900, wallTop: 220, wallWidth: 1440 });
      expect(got.written).toEqual({});
      expect(got.pageProps).toEqual({});
    }
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
    parentElement: unknown; clientWidth: number; getBoundingClientRect(): { top: number };
    listeners: Record<string, Listener[]>; addEventListener(t: string, fn: Listener): void;
    hasAttribute(n: string): boolean; removeAttribute(n: string): void;
  };

  function hang(ids: string[], windowWidth: number, windowHeight: number, wallTop: number, wallWidth: number) {
    const wall = fake('div') as FakeWall;
    const pageProps: Record<string, string> = {};
    wall.parentElement = {
      getBoundingClientRect: () => ({ left: 0, top: 100 }),
      style: { setProperty: (k: string, v: string) => { pageProps[k] = v; }, removeProperty: (k: string) => { delete pageProps[k]; } },
    };
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
    new Function('document', 'window', 'getComputedStyle', RESERVE_INLINE)(doc, win, () => ({ paddingLeft: '0px', paddingBottom: '0px', borderBottomWidth: '0px' }));
    const wallHeight = () => cssHeight(wall.style as unknown as { height?: string; minHeight?: string }, pageProps, wallTop, 100);
    return { wall, tiles: wall.children, wallHeight, pageProps };
  }
  const px = (v: string | undefined) => parseFloat(v ?? 'NaN');

  it('hangs a framed, captioned tile in the cell layoutWall gives each piece, desktop, tablet and phone, a scrollbar or not', () => {
    for (const [ww, wh] of [[1920, 1080], [1440, 900], [1100, 800], [1099, 800], [1024, 768], [820, 1180], [768, 1024], [720, 900], [719, 900], [430, 932], [390, 844], [360, 640]] as const) {
      const wall = Math.min(ww, WALL_MAX);
      const { wallHeight, tiles } = hang(IDS, ww, wh, 220, wall);
      const L = layoutWall(IDS, { width: wall, viewportWidth: ww, viewportHeight: wh, topHeight: 220 });
      expect(tiles, `${ww}`).toHaveLength(IDS.length);
      expect(wallHeight(), `${ww} height`).toBeCloseTo(L.height, 6);
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
    for (const [ww, wh] of [[1440, 900], [820, 1180], [390, 844]] as const) {
      const { wallHeight, tiles } = hang(ids, ww, wh, 220, ww);
      const L = layoutWall(ids, { width: ww, viewportWidth: ww, viewportHeight: wh, topHeight: 220 });
      expect(wallHeight(), `${ww}`).toBeCloseTo(L.height, 6);
      expect(tiles).toHaveLength(ids.length);
      const spilled = tiles.find((t) => t.attrs[TILE_ATTR] === 'bdl-903')!;
      expect(px(spilled.style.top), `${ww}`).toBeCloseTo(L.rects['bdl-903']!.y, 1);
    }
  });

  it('hangs nothing for data it cannot read, and still sizes the box', () => {
    const { wallHeight, tiles } = hang([], 1440, 900, 220, 1440);
    expect(tiles).toHaveLength(0);
    expect(wallHeight()).toBeCloseTo(900 - 220, 6);
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
