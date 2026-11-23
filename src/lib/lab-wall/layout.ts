/**
 * The wall's mosaic: which piece sits in which cell, and the arithmetic that
 * turns cells into rectangles. Pure data and pure functions, no DOM.
 * Ported from layout() in the mockup's app.js.
 *
 * A cell is [column, row, columns wide, rows tall]. A piece in neither map
 * (a catalog entry added after the maps were drawn) is appended in a spill
 * row under the mosaic, so a new piece never breaks the wall. A piece in a map
 * but not in the list leaves its cell empty.
 */

export type Cell = [col: number, row: number, cols: number, rows: number];

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WallBox {
  /** Width of the wall element in CSS px. Under PHONE_BELOW it lays out as the phone map. */
  width: number;
  viewportHeight: number;
  /** Height of whatever sits above the wall (the site header and the controls). */
  topHeight: number;
}

export interface WallLayout {
  phone: boolean;
  /** Height of the whole wall, spill rows included. */
  height: number;
  rects: Record<string, Rect>;
}

/** Desktop: 24 columns by 12 rows. */
export const DESK_COLS = 24;
export const DESK_ROWS = 12;
export const DESK: Record<string, Cell> = {
  'bdl-011': [0, 0, 12, 6], 'bdl-007': [12, 0, 6, 8], 'bdl-005': [18, 0, 6, 3], 'bdl-013': [18, 3, 6, 3], 'bdl-010': [0, 6, 6, 6], 'bdl-012': [6, 6, 6, 6],
  'bdl-009': [12, 8, 3, 4], 'bdl-008': [15, 8, 3, 4], 'bdl-002': [18, 6, 6, 2], 'bdl-001': [18, 8, 3, 4], 'bdl-003': [21, 8, 3, 4],
};

/** Phone: 2 columns by 18 row units. */
export const PHONE_COLS = 2;
export const PHONE_ROWS = 18;
export const PHONE: Record<string, Cell> = {
  'bdl-011': [0, 0, 2, 3], 'bdl-007': [0, 3, 1, 4], 'bdl-005': [1, 3, 1, 2], 'bdl-010': [1, 5, 1, 2], 'bdl-013': [0, 7, 2, 2], 'bdl-012': [0, 9, 2, 3],
  'bdl-009': [0, 12, 1, 2], 'bdl-008': [1, 12, 1, 2], 'bdl-002': [0, 14, 1, 2], 'bdl-001': [1, 14, 1, 2], 'bdl-003': [0, 16, 2, 2],
};

/** Below this width the wall lays out as the phone map. */
export const PHONE_BELOW = 720;

/** The shortest the desktop mosaic is allowed to be. */
const DESK_MIN_HEIGHT = 540;

/** A spill cell: 6 columns by 4 rows on desktop (4 across), 1 column by 2 units on the phone (2 across). */
const DESK_SPILL = { cols: 6, rows: 4 };
const PHONE_SPILL = { cols: 1, rows: 2 };

const has = (map: Record<string, Cell>, id: string): boolean => Object.prototype.hasOwnProperty.call(map, id);

/** Lay out `ids` (in catalog order) inside `box`. */
export function layoutWall(ids: string[], box: WallBox): WallLayout {
  const phone = box.width < PHONE_BELOW;
  const map = phone ? PHONE : DESK;
  const uniq = [...new Set(ids)];
  const spill = uniq.filter((id) => !has(map, id));

  const gap = phone ? 6 : 7;
  const pad = gap;
  const mapCols = phone ? PHONE_COLS : DESK_COLS;
  const mapRows = phone ? PHONE_ROWS : DESK_ROWS;
  const sp = phone ? PHONE_SPILL : DESK_SPILL;
  const perRow = Math.floor(mapCols / sp.cols);
  const spillBands = Math.ceil(spill.length / perRow);

  // Column and row units. The desktop mosaic fills the viewport below the header; the phone unit follows the column width.
  const cellW = (box.width - 2 * pad - (mapCols - 1) * gap) / mapCols;
  let cellH: number;
  let base: number;
  if (phone) {
    cellH = Math.round(cellW * 0.45);
    base = 2 * pad + mapRows * cellH + (mapRows - 1) * gap;
  } else {
    base = Math.max(box.viewportHeight - box.topHeight, DESK_MIN_HEIGHT);
    cellH = (base - 2 * pad - (mapRows - 1) * gap) / mapRows;
  }

  const place = (cell: Cell): Rect => {
    const [c, r, nw, nh] = cell;
    return { x: pad + c * (cellW + gap), y: pad + r * (cellH + gap), w: nw * cellW + (nw - 1) * gap, h: nh * cellH + (nh - 1) * gap };
  };

  const rects: Record<string, Rect> = {};
  for (const id of uniq) if (has(map, id)) rects[id] = place(map[id]!);
  spill.forEach((id, i) => {
    rects[id] = place([(i % perRow) * sp.cols, mapRows + Math.floor(i / perRow) * sp.rows, sp.cols, sp.rows]);
  });

  const height = base + spillBands * sp.rows * (cellH + gap);
  return { phone, height, rects };
}
