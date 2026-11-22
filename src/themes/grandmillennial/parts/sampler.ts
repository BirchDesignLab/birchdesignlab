/**
 * The sampler's counted alphabet (About) and the order its stitches are worked in.
 * Stage 6 w3 task 22: each letter of the band is a button that re-stitches in the
 * next thread, its crosses drawing in along the letter's path.
 *
 * A glyph is 5 x 7 cells, one cross per filled cell. The font lived in About.astro
 * until the band became buttons; it moved here so the stitch order (a pure walk over
 * the cells) can be unit tested.
 */
export const FONT: Record<string, string> = {
  A: '.XXX.X...XX...XXXXXXX...XX...XX...X', B: 'XXXX.X...XX...XXXXX.X...XX...XXXXX.',
  C: '.XXXXX....X....X....X....X.....XXXX', D: 'XXXX.X...XX...XX...XX...XX...XXXXX.',
  E: 'XXXXXX....X....XXXX.X....X....XXXXX', F: 'XXXXXX....X....XXXX.X....X....X....',
  G: '.XXXXX....X....X..XXX...XX...X.XXXX', H: 'X...XX...XX...XXXXXXX...XX...XX...X',
  I: 'XXXXX..X....X....X....X....X..XXXXX', J: '..XXX...X....X....X....X.X..X..XX..',
  K: 'X...XX..X.X.X..XX...X.X..X..X.X...X', L: 'X....X....X....X....X....X....XXXXX',
  M: 'X...XXX.XXX.X.XX.X.XX...XX...XX...X', N: 'X...XXX..XX.X.XX..XXX...XX...XX...X',
  O: '.XXX.X...XX...XX...XX...XX...X.XXX.', P: 'XXXX.X...XX...XXXXX.X....X....X....',
  Q: '.XXX.X...XX...XX...XX.X.XX..X..XX.X', R: 'XXXX.X...XX...XXXXX.X.X..X..X.X...X',
  S: '.XXXXX....X.....XXX.....X....XXXXX.', T: 'XXXXX..X....X....X....X....X....X..',
  U: 'X...XX...XX...XX...XX...XX...X.XXX.', V: 'X...XX...XX...XX...XX...X.X.X...X..',
  W: 'X...XX...XX...XX.X.XX.X.XXX.XXX...X', X: 'X...XX...X.X.X...X...X.X.X...XX...X',
  Y: 'X...XX...X.X.X...X....X....X....X..', Z: 'XXXXX....X...X...X...X...X....XXXXX',
};

/** One cross is a 3 x 3 box in the letter's own viewBox; a glyph is 15 x 21. */
export const ABC_CELL = 3;
export const GLYPH_W = 5 * ABC_CELL;
export const GLYPH_H = 7 * ABC_CELL;

export const ALPHABET = Object.keys(FONT);

/** Letters per row on a wide sampler and on a phone (the band's two layouts). */
export const WIDE_PER_ROW = 13;
export const NARROW_PER_ROW = 7;

/** The threads of the set, in the order a tap walks them: oxblood (the first, as worked), hunter, gold. */
export const THREADS = ['oxblood', 'hunter', 'gold'] as const;
export const nextThread = (t: number) => (t + 1) % THREADS.length;

export type Cell = [x: number, y: number];

/** Filled cells of a letter, row by row. */
export function glyphCells(ch: string): Cell[] {
  const g = FONT[ch];
  const out: Cell[] = [];
  for (let y = 0; y < 7; y++) for (let x = 0; x < 5; x++) if (g[y * 5 + x] === 'X') out.push([x, y]);
  return out;
}

/**
 * The order a needle would work the letter: start at the top-left stitch, then keep
 * walking to a neighbouring unworked cell, going straight on when it can, then to a
 * side or a diagonal, and when the stroke ends jump to the nearest cell left (a
 * counted-thread worker lifts the needle). Every cell appears exactly once.
 */
export function stitchOrder(ch: string): Cell[] {
  const left = glyphCells(ch);
  if (!left.length) return [];
  const key = (c: Cell) => `${c[0]},${c[1]}`;
  const todo = new Map(left.map((c) => [key(c), c] as const));
  const order: Cell[] = [];
  let cur = left[0]; // glyphCells runs row by row: the top-left cell
  let dir: Cell = [1, 0];
  const take = (c: Cell) => { todo.delete(key(c)); order.push(c); cur = c; };
  take(cur);
  // preference: straight on, the two sides of it, then the rest; orthogonal before diagonal
  const turns: Cell[] = [[1, 0], [0, 1], [-1, 0], [0, -1], [1, 1], [-1, 1], [-1, -1], [1, -1]];
  while (todo.size) {
    const score = (d: Cell) => {
      if (d[0] === dir[0] && d[1] === dir[1]) return 0;
      const dot = d[0] * dir[0] + d[1] * dir[1];
      const diag = d[0] !== 0 && d[1] !== 0 ? 2 : 0;
      return 1 + diag + (dot < 0 ? 1 : 0);
    };
    const options = turns
      .filter((d) => todo.has(key([cur[0] + d[0], cur[1] + d[1]])))
      .sort((a, b) => score(a) - score(b) || turns.indexOf(a) - turns.indexOf(b));
    if (options.length) {
      dir = options[0];
      take([cur[0] + dir[0], cur[1] + dir[1]]);
      continue;
    }
    // the stroke has ended: lift the needle to the nearest cell not yet worked (top-most, then left-most)
    let best: Cell | null = null;
    let bestD = Infinity;
    for (const c of todo.values()) {
      const d = (c[0] - cur[0]) ** 2 + (c[1] - cur[1]) ** 2;
      if (d < bestD || (d === bestD && best && (c[1] < best[1] || (c[1] === best[1] && c[0] < best[0])))) { best = c; bestD = d; }
    }
    dir = [1, 0];
    take(best as Cell);
  }
  return order;
}

/** The path data of one cross at a cell, in the letter's viewBox (two strokes, both drawn in order). */
export const crossPath = ([x, y]: Cell) =>
  `M${x * ABC_CELL + 0.4} ${y * ABC_CELL + 0.4}l2.2 2.2M${x * ABC_CELL + 2.6} ${y * ABC_CELL + 0.4}l-2.2 2.2`;

/** Whole-sampler time budget for one re-stitch (about 500 ms): the stitches start spread over SPREAD, each takes SEW. */
export const SEW_MS = 150;
export const SPREAD_MS = 350;
export const stitchDelay = (k: number, n: number) => (n <= 1 ? 0 : Math.round((k / (n - 1)) * SPREAD_MS));
