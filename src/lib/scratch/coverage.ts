/** Pure scratch math: renderer-agnostic by spec (mirrors bark's pattern core). */

export interface CoverageGrid {
  cols: number;
  rows: number;
  cells: Uint8Array; // 0 untouched, 1 painted
  painted: number;
}

export function createGrid(cols: number, rows: number): CoverageGrid {
  return { cols, rows, cells: new Uint8Array(cols * rows), painted: 0 };
}

/** Paint a circle (normalized coords/radius). Returns newly painted cell count. */
export function paintCircle(g: CoverageGrid, cx: number, cy: number, r: number): number {
  const px = cx * g.cols, py = cy * g.rows;
  const rx = r * g.cols, ry = r * g.rows;
  const x0 = Math.max(0, Math.floor(px - rx)), x1 = Math.min(g.cols - 1, Math.ceil(px + rx));
  const y0 = Math.max(0, Math.floor(py - ry)), y1 = Math.min(g.rows - 1, Math.ceil(py + ry));
  let added = 0;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5 - px) / rx, dy = (y + 0.5 - py) / ry;
      if (dx * dx + dy * dy > 1) continue;
      const i = y * g.cols + x;
      if (!g.cells[i]) { g.cells[i] = 1; added++; }
    }
  }
  g.painted += added;
  return added;
}

/** Painted fraction of the whole grid, or of the cells set in `over`. */
export function fractionPainted(g: CoverageGrid, over?: Uint8Array): number {
  if (!over) return g.painted / (g.cols * g.rows);
  let total = 0, hit = 0;
  for (let i = 0; i < over.length; i++) {
    if (!over[i]) continue;
    total++;
    if (g.cells[i]) hit++;
  }
  return total === 0 ? 0 : hit / total;
}

export type DigPhase = 'dig' | 'complete' | 'bloom';

/** Dig completes at 85% of stroke cells. BLOOM_RUB is the extra rubbing needed
 *  after completion before the translation blooms, measured as a fraction of the
 *  whole grid painted since completion (see DigCanvas). It is the feel-critical
 *  knob: too low and the bloom fires the instant the strokes finish, collapsing
 *  the two-stage reveal. The component overrides it via the `bloomRub` arg. */
export const STROKE_DONE = 0.85;
export const BLOOM_RUB = 0.12;

export function advancePhase(
  phase: DigPhase,
  strokeProgress: number,
  rubSinceComplete: number,
  bloomRub: number = BLOOM_RUB,
): DigPhase {
  if (phase === 'dig') return strokeProgress >= STROKE_DONE ? 'complete' : 'dig';
  if (phase === 'complete') return rubSinceComplete >= bloomRub ? 'bloom' : 'complete';
  return 'bloom';
}
