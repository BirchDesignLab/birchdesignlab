/**
 * trace-to-strokes: turn an Inkscape (or any) SVG trace into a BDL-003 letter's
 * `viewBox` + `strokes[]`, ready to paste into src/experiments/bdl-003/letters/*.ts
 *
 * The DigCanvas strokes each path as a centerline, so we only need path geometry.
 * This tool:
 *   - reads every <path d> in the file,
 *   - flattens transforms (own + ancestor <g>) into absolute coordinates,
 *   - converts paths to absolute commands (H/V become L so transforms stay valid),
 *   - frames everything in an integer `0 0 W H` viewBox (schema requirement).
 *
 * Trace centerlines by hand; do NOT autotrace/Trace-Bitmap (that outlines the ink
 * and the component would stroke around doubled blobs). Ungroup + flatten in
 * Inkscape before saving is still best, but this handles simple transforms too.
 *
 * CLI:  node scripts/trace-to-strokes.mjs path/to/trace.svg
 * API:  import { extractStrokes } from './scripts/trace-to-strokes.mjs'
 */

// ---- affine matrices: [a, b, c, d, e, f] == | a c e ; b d f ; 0 0 1 | ----------

const IDENT = [1, 0, 0, 1, 0, 0];

function matMul(m, n) {
  // returns m * n
  return [
    m[0] * n[0] + m[2] * n[1],
    m[1] * n[0] + m[3] * n[1],
    m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3],
    m[0] * n[4] + m[2] * n[5] + m[4],
    m[1] * n[4] + m[3] * n[5] + m[5],
  ];
}

function apply(m, x, y) {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

/** Is the matrix a pure translation (no scale/rotate/skew)? */
function isTranslateOnly(m) {
  return m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 1;
}

// ---- transform attribute parsing ---------------------------------------------

function parseTransform(str) {
  if (!str) return IDENT;
  let m = IDENT;
  const re = /(matrix|translate|scale|rotate|skewX|skewY)\s*\(([^)]*)\)/g;
  let match;
  while ((match = re.exec(str))) {
    const fn = match[1];
    const a = match[2].split(/[\s,]+/).map(Number).filter((n) => !Number.isNaN(n));
    let t = IDENT;
    if (fn === 'matrix' && a.length === 6) t = a;
    else if (fn === 'translate') t = [1, 0, 0, 1, a[0] || 0, a[1] || 0];
    else if (fn === 'scale') t = [a[0] ?? 1, 0, 0, a[1] ?? a[0] ?? 1, 0, 0];
    else if (fn === 'rotate') {
      const r = ((a[0] || 0) * Math.PI) / 180;
      const cos = Math.cos(r), sin = Math.sin(r);
      const rot = [cos, sin, -sin, cos, 0, 0];
      if (a.length >= 3) {
        const cx = a[1], cy = a[2];
        t = matMul(matMul([1, 0, 0, 1, cx, cy], rot), [1, 0, 0, 1, -cx, -cy]);
      } else t = rot;
    } else if (fn === 'skewX') t = [1, 0, Math.tan(((a[0] || 0) * Math.PI) / 180), 1, 0, 0];
    else if (fn === 'skewY') t = [1, Math.tan(((a[0] || 0) * Math.PI) / 180), 0, 1, 0, 0];
    m = matMul(m, t); // list applies left-to-right, matching SVG
  }
  return m;
}

// ---- minimal element walk (no XML dep; traces are shallow) -------------------

/**
 * Walk the SVG text, tracking the composed transform of each open <g>, and yield
 * { d, matrix } for every <path>. Robust enough for hand-traced files: it reads
 * transform attrs on <g> and <path>, and closes group scopes on </g>.
 */
function* pathsWithMatrix(svg) {
  const tagRe = /<(\/?)(g|path|svg)\b([^>]*?)(\/?)>/g;
  const stack = [IDENT];
  let match;
  while ((match = tagRe.exec(svg))) {
    const [, closing, tag, attrs, selfClose] = match;
    if (closing) {
      if (tag === 'g') stack.pop();
      continue;
    }
    const top = stack[stack.length - 1];
    const tm = parseTransform(attrValue(attrs, 'transform'));
    const here = matMul(top, tm);
    if (tag === 'g') {
      if (!selfClose) stack.push(here);
    } else if (tag === 'path') {
      const d = attrValue(attrs, 'd');
      if (d) yield { d, matrix: here };
    }
    // <svg> transform (rare) is folded in via `here` for descendants only if a
    // group; svg itself does not push scope here, its viewBox is read separately.
  }
}

function attrValue(attrs, name) {
  const m = attrs.match(new RegExp(`\\b${name}\\s*=\\s*"([^"]*)"`))
    || attrs.match(new RegExp(`\\b${name}\\s*=\\s*'([^']*)'`));
  return m ? m[1] : '';
}

// ---- path data: tokenize, convert to absolute, transform ---------------------

function tokenizePath(d) {
  const tokens = [];
  const re = /([MmLlHhVvCcSsQqTtAaZz])|(-?\d*\.?\d+(?:e[-+]?\d+)?)/gi;
  let m;
  while ((m = re.exec(d))) tokens.push(m[1] ?? Number(m[2]));
  return tokens;
}

/**
 * Convert a path `d` to absolute coords and apply the affine `matrix`.
 * H/V become L (a non-axis-aligned transform tilts them). Arc endpoints are
 * transformed; a warning is pushed if radii would be distorted (non-translate).
 */
function absolutizeAndTransform(d, matrix, warnings) {
  const t = tokenizePath(d);
  const out = [];
  let i = 0;
  let cx = 0, cy = 0;       // current point (pre-transform, user space)
  let sx = 0, sy = 0;       // subpath start
  const num = () => t[i++];
  const emit = (cmd, ...pts) => {
    // pts are [x,y, x,y, ...] absolute user-space; transform each
    const tp = [];
    for (let k = 0; k < pts.length; k += 2) tp.push(...apply(matrix, pts[k], pts[k + 1]));
    out.push(cmd + tp.map(fmt).join(' '));
  };

  while (i < t.length) {
    const cmd = t[i++];
    const rel = cmd === cmd.toLowerCase();
    const C = cmd.toUpperCase();
    switch (C) {
      case 'M': {
        let x = num(), y = num();
        if (rel) { x += cx; y += cy; }
        cx = x; cy = y; sx = x; sy = y;
        emit('M', x, y);
        // subsequent implicit pairs are L
        while (typeof t[i] === 'number') {
          let lx = num(), ly = num();
          if (rel) { lx += cx; ly += cy; }
          cx = lx; cy = ly;
          emit('L', lx, ly);
        }
        break;
      }
      case 'L': {
        while (typeof t[i] === 'number') {
          let x = num(), y = num();
          if (rel) { x += cx; y += cy; }
          cx = x; cy = y;
          emit('L', x, y);
        }
        break;
      }
      case 'H': {
        while (typeof t[i] === 'number') {
          let x = num();
          if (rel) x += cx;
          cx = x;
          emit('L', x, cy);
        }
        break;
      }
      case 'V': {
        while (typeof t[i] === 'number') {
          let y = num();
          if (rel) y += cy;
          cy = y;
          emit('L', cx, y);
        }
        break;
      }
      case 'C': {
        while (typeof t[i] === 'number') {
          let x1 = num(), y1 = num(), x2 = num(), y2 = num(), x = num(), y = num();
          if (rel) { x1 += cx; y1 += cy; x2 += cx; y2 += cy; x += cx; y += cy; }
          cx = x; cy = y;
          emit('C', x1, y1, x2, y2, x, y);
        }
        break;
      }
      case 'S': {
        while (typeof t[i] === 'number') {
          let x2 = num(), y2 = num(), x = num(), y = num();
          if (rel) { x2 += cx; y2 += cy; x += cx; y += cy; }
          cx = x; cy = y;
          emit('S', x2, y2, x, y);
        }
        break;
      }
      case 'Q': {
        while (typeof t[i] === 'number') {
          let x1 = num(), y1 = num(), x = num(), y = num();
          if (rel) { x1 += cx; y1 += cy; x += cx; y += cy; }
          cx = x; cy = y;
          emit('Q', x1, y1, x, y);
        }
        break;
      }
      case 'T': {
        while (typeof t[i] === 'number') {
          let x = num(), y = num();
          if (rel) { x += cx; y += cy; }
          cx = x; cy = y;
          emit('T', x, y);
        }
        break;
      }
      case 'A': {
        while (typeof t[i] === 'number') {
          const rx = num(), ry = num(), rot = num(), large = num(), sweep = num();
          let x = num(), y = num();
          if (rel) { x += cx; y += cy; }
          cx = x; cy = y;
          if (!isTranslateOnly(matrix)) {
            warnings.push('arc (A) under a scale/rotate transform: radii not transformed, flatten in Inkscape first');
          }
          const [tx, ty] = apply(matrix, x, y);
          out.push(`A${fmt(rx)} ${fmt(ry)} ${fmt(rot)} ${large} ${sweep} ${fmt(tx)} ${fmt(ty)}`);
        }
        break;
      }
      case 'Z': {
        cx = sx; cy = sy;
        out.push('Z');
        break;
      }
      default:
        warnings.push(`unhandled path command: ${cmd}`);
    }
  }
  return out.join(' ').replace(/\s+/g, ' ').trim();
}

function fmt(n) {
  const r = Math.round(n * 10) / 10;
  const s = (Object.is(r, -0) ? 0 : r).toString();
  return s;
}

// ---- viewBox --------------------------------------------------------------------

function readDocBox(svg) {
  const svgTag = svg.match(/<svg\b[^>]*>/i);
  const attrs = svgTag ? svgTag[0] : '';
  const vb = attrValue(attrs, 'viewBox');
  if (vb) {
    const [minx, miny, w, h] = vb.split(/[\s,]+/).map(Number);
    return { minx: minx || 0, miny: miny || 0, w, h };
  }
  const w = parseFloat(attrValue(attrs, 'width')) || 0;
  const h = parseFloat(attrValue(attrs, 'height')) || 0;
  return { minx: 0, miny: 0, w, h };
}

// ---- public API ----------------------------------------------------------------

/**
 * @param {string} svg  raw SVG text
 * @returns {{ viewBox: string, strokes: string[], warnings: string[] }}
 */
export function extractStrokes(svg) {
  const warnings = [];
  const box = readDocBox(svg);
  // shift so the viewBox origin is 0,0 (schema wants `0 0 W H`, integers)
  const shift = [1, 0, 0, 1, -box.minx, -box.miny];
  const strokes = [];
  for (const { d, matrix } of pathsWithMatrix(svg)) {
    const eff = matMul(shift, matrix);
    const s = absolutizeAndTransform(d, eff, warnings);
    if (s) strokes.push(s);
  }
  if (!strokes.length) warnings.push('no <path> elements found');
  const W = Math.max(1, Math.ceil(box.w));
  const H = Math.max(1, Math.ceil(box.h));
  if (!box.w || !box.h) warnings.push('SVG has no viewBox/width/height; set the document size in Inkscape');
  return { viewBox: `0 0 ${W} ${H}`, strokes, warnings };
}

/** Format the result as a pasteable TS block for a letter file. */
export function formatLetterBlock({ viewBox, strokes }) {
  const lines = strokes.map((s) => `    '${s}',`).join('\n');
  return `  viewBox: '${viewBox}',\n  strokes: [\n${lines}\n  ],`;
}

// ---- CLI -----------------------------------------------------------------------

const isMain = import.meta.url === `file://${process.argv[1]}`
  || import.meta.url.endsWith((process.argv[1] || '').replace(/\\/g, '/'));

if (isMain) {
  const file = process.argv[2];
  if (!file) {
    console.error('usage: node scripts/trace-to-strokes.mjs <trace.svg>');
    process.exit(1);
  }
  const { readFileSync } = await import('node:fs');
  const svg = readFileSync(file, 'utf8');
  const result = extractStrokes(svg);
  for (const w of result.warnings) console.error(`warning: ${w}`);
  console.log(`\n// ${result.strokes.length} stroke path(s) from ${file}\n`);
  console.log(formatLetterBlock(result));
}
