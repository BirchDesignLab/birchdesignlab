/**
 * The wall's mosaic: which piece sits in which cell, and the arithmetic that
 * turns cells into rectangles. Pure data and pure functions, no DOM.
 * Ported from layout() in the mockup's app.js.
 *
 * Three maps, chosen by the width of the window (scrollbar included, which is what a CSS media query sees):
 * the desktop map from 1100, the tablet map from 720 to 1099, the phone map under 720. All three hang the same
 * tiers: the Portal leads; the Field Guide, the Data Map and the Drawing Set come next; the Bark Engine, the
 * Styleguide, Cheer and Chatter and the Shining Tree (a tall slot) are the middle; Bayou Kitchen, Magnolia & Mane and
 * Novgorod Letters are the smallest. Area follows importance in every map (tests/lab-wall-layout.test.ts holds it).
 *
 * A cell is [column, row, columns wide, rows tall]. A piece in no map (a catalog entry added after the maps were
 * drawn) is appended in a spill row under the mosaic, so a new piece never breaks the wall. A piece in a map but not
 * in the list leaves its cell empty.
 */

export type Cell = [col: number, row: number, cols: number, rows: number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type WallKind = 'desk' | 'tablet' | 'phone';

export interface WallBox {
  /** Width of the wall element in CSS px: what the cells divide up. */
  width: number;
  /**
   * Width of the window in CSS px, scrollbar included: what a CSS media query sees.
   * It picks the map (see wallKind). It is the window and not the wall that decides, so the layout and the stylesheet's own
   * media rules always agree, even with an always-visible scrollbar taking 15px or so off the wall's width.
   */
  viewportWidth: number;
  viewportHeight: number;
  /** Height of whatever sits above the wall (the site header and the controls). */
  topHeight: number;
}

export interface WallLayout {
  /** Which map laid the wall out. */
  kind: WallKind;
  /** True under PHONE_BELOW: the phone map. */
  phone: boolean;
  /** Height of the whole wall, spill rows included. */
  height: number;
  /**
   * True when the whole height is the part that follows the window (desktop, and no piece spills past the mosaic): the
   * page can then let the wall fill what is left under whatever sits above it (reserve.ts, lab-wall.css), instead of
   * being told a number that goes stale the moment the words above it change height.
   */
  fill: boolean;
  rects: Record<string, Rect>;
}

export interface MapSpec {
  cells: Record<string, Cell>;
  cols: number;
  rows: number;
  /** The gap between cells, which is also the wall's inner padding. */
  gap: number;
  /** A row unit as a fraction of a column's width; null on desktop, where the rows share the window's height instead. */
  ratio: number | null;
  /** A spill cell: how many columns and row units it takes. */
  spill: { cols: number; rows: number };
}

/**
 * Desktop: 24 columns by 12 rows, filling the window below the header. The Portal takes the top left (40% of the
 * wall); the right half holds the three next pieces (6 by 5 each), the Styleguide, and the Shining Tree running tall
 * down the right edge; a strip along the foot holds the two smallest under the Portal, then Cheer and Chatter and the
 * Bark Engine.
 */
export const DESK_COLS = 24;
export const DESK_ROWS = 12;
export const DESK: Record<string, Cell> = {
  'bdl-010': [0, 0, 12, 10],
  'bdl-011': [12, 0, 6, 5], 'bdl-012': [18, 0, 6, 5],
  'bdl-013': [12, 5, 6, 5], 'bdl-002': [18, 5, 3, 5], 'bdl-007': [21, 5, 3, 7],
  'bdl-009': [0, 10, 4, 2], 'bdl-008': [4, 10, 4, 2], 'bdl-005': [8, 10, 7, 2], 'bdl-001': [15, 10, 6, 2],
};

/**
 * Tablet (720 to 1099): 6 columns by 26 row units. No tile is under 2 columns, which is 225px at 720 even with a
 * scrollbar. The wall is taller than the window and scrolls with the page, as the phone's does.
 */
export const TABLET_COLS = 6;
export const TABLET_ROWS = 26;
export const TABLET: Record<string, Cell> = {
  'bdl-010': [0, 0, 6, 8],
  'bdl-011': [0, 8, 3, 6], 'bdl-012': [3, 8, 3, 6],
  'bdl-013': [0, 14, 6, 4],
  'bdl-007': [0, 18, 2, 6], 'bdl-005': [2, 18, 4, 3], 'bdl-002': [2, 21, 2, 3], 'bdl-001': [4, 21, 2, 5],
  'bdl-009': [0, 24, 2, 2], 'bdl-008': [2, 24, 2, 2],
};

/**
 * Phone: 2 columns by 29 row units. Reading order is the ranking here, since every tile is one of two widths. The Portal
 * is full width and seven units tall (about 70% of the screen); the three secondaries are full width and four tall, with
 * the Data Map first so the Field Guide (which reads like the Portal at full width) never follows the Portal directly;
 * the mids go two-up between them, then the two smalls side by side at the foot.
 */
export const PHONE_COLS = 2;
export const PHONE_ROWS = 29;
export const PHONE: Record<string, Cell> = {
  'bdl-010': [0, 0, 2, 7],
  'bdl-012': [0, 7, 2, 4],
  'bdl-005': [0, 11, 1, 3], 'bdl-002': [1, 11, 1, 3],
  'bdl-011': [0, 14, 2, 4],
  'bdl-007': [0, 18, 1, 5], 'bdl-001': [1, 18, 1, 5],
  'bdl-013': [0, 23, 2, 4],
  'bdl-009': [0, 27, 1, 2], 'bdl-008': [1, 27, 1, 2],
};

/** Below this window width (and the CSS rules that repeat it) the wall lays out as the phone map. */
export const PHONE_BELOW = 720;
/** From this window width (and the CSS rules that repeat it) the wall lays out as the desktop map; between the two it is the tablet map. */
export const TABLET_BELOW = 1100;

/** The shortest the desktop mosaic is allowed to be. */
export const DESK_MIN_HEIGHT = 540;

/** The gap between cells, which is also the wall's inner padding. */
export const DESK_GAP = 7;
export const TABLET_GAP = 7;
export const PHONE_GAP = 6;

/** A tablet or phone row unit is this fraction of a column's width. */
export const TABLET_ROW_RATIO = 0.45;
export const PHONE_ROW_RATIO = 0.45;

/** A spill cell: 6 columns by 4 rows on desktop (4 across), 2 by 2 on the tablet (3 across), 1 column by 2 units on the phone (2 across). */
export const SPILL_DESK = { cols: 6, rows: 4 };
export const SPILL_TABLET = { cols: 2, rows: 2 };
export const SPILL_PHONE = { cols: 1, rows: 2 };

/** Every map with the numbers that turn it into rectangles: layoutWall and the inline script (reserve.ts) both read this one table. */
export const MAPS: Record<WallKind, MapSpec> = {
  desk: { cells: DESK, cols: DESK_COLS, rows: DESK_ROWS, gap: DESK_GAP, ratio: null, spill: SPILL_DESK },
  tablet: { cells: TABLET, cols: TABLET_COLS, rows: TABLET_ROWS, gap: TABLET_GAP, ratio: TABLET_ROW_RATIO, spill: SPILL_TABLET },
  phone: { cells: PHONE, cols: PHONE_COLS, rows: PHONE_ROWS, gap: PHONE_GAP, ratio: PHONE_ROW_RATIO, spill: SPILL_PHONE },
};

/**
 * The widest the wall grows. Past it the wall stays this wide and centred, so tiles do not grow without limit. The header
 * and the page's text keep the site's own column at every width; the wall is the one object that bleeds past it.
 */
export const WALL_MAX = 1520;

/** Which map a window of this width (scrollbar included) gets. */
export function wallKind(viewportWidth: number): WallKind {
  return viewportWidth < PHONE_BELOW ? 'phone' : viewportWidth < TABLET_BELOW ? 'tablet' : 'desk';
}

/**
 * The wall's full-bleed margin: how far the page's column (its left edge, padding already taken off) sits inside the wall.
 * The wall reaches past the column to the window's edges, or, in a window wider than WALL_MAX, to the edges of its
 * centred, capped width. `windowWidth` is the page's width without a scrollbar (what centres the page's own column).
 */
export function wallBleed(columnLeft: number, windowWidth: number): number {
  return Math.max(0, columnLeft - Math.max(0, (windowWidth - WALL_MAX) / 2));
}

const has = (map: Record<string, Cell>, id: string): boolean => Object.prototype.hasOwnProperty.call(map, id);

/** Lay out `ids` (in catalog order) inside `box`. */
export function layoutWall(ids: string[], box: WallBox): WallLayout {
  const kind = wallKind(box.viewportWidth);
  const phone = kind === 'phone';
  const spec = MAPS[kind];
  const map = spec.cells;
  const uniq = [...new Set(ids)];
  const spill = uniq.filter((id) => !has(map, id));

  const gap = spec.gap;
  const pad = gap;
  const sp = spec.spill;
  const perRow = Math.floor(spec.cols / sp.cols);
  const spillBands = Math.ceil(spill.length / perRow);

  // Column and row units. The desktop mosaic fills the viewport below the header; the tablet's and the phone's row unit follows the column width.
  const cellW = (box.width - 2 * pad - (spec.cols - 1) * gap) / spec.cols;
  let cellH: number;
  let base: number;
  if (spec.ratio !== null) {
    cellH = Math.round(cellW * spec.ratio);
    base = 2 * pad + spec.rows * cellH + (spec.rows - 1) * gap;
  } else {
    base = Math.max(box.viewportHeight - box.topHeight, DESK_MIN_HEIGHT);
    cellH = (base - 2 * pad - (spec.rows - 1) * gap) / spec.rows;
  }

  const place = (cell: Cell): Rect => {
    const [c, r, nw, nh] = cell;
    return { x: pad + c * (cellW + gap), y: pad + r * (cellH + gap), w: nw * cellW + (nw - 1) * gap, h: nh * cellH + (nh - 1) * gap };
  };

  const rects: Record<string, Rect> = {};
  for (const id of uniq) if (has(map, id)) rects[id] = place(map[id]!);
  spill.forEach((id, i) => {
    rects[id] = place([(i % perRow) * sp.cols, spec.rows + Math.floor(i / perRow) * sp.rows, sp.cols, sp.rows]);
  });

  const height = base + spillBands * sp.rows * (cellH + gap);
  return { kind, phone, height, fill: kind === 'desk' && spill.length === 0, rects };
}
