/**
 * Peak of a CSS cubic-bezier easing curve, sampled finely. Used to pick the
 * 3% overshoot for feel (c) and to state the overshoot of (a) and (b).
 * Usage: node scripts/themes/proofs/stage4-bauhaus-assembly/bezier.mjs [x1 y1 x2 y2 ...]
 */
export function curve(x1, y1, x2, y2) {
  const bez = (a, b, t) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t * t + t ** 3;
  return (x) => {
    let lo = 0, hi = 1;
    for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (bez(x1, x2, m) < x) lo = m; else hi = m; }
    return bez(y1, y2, (lo + hi) / 2);
  };
}
export function peak(x1, y1, x2, y2) {
  const f = curve(x1, y1, x2, y2);
  let max = 0, at = 0;
  for (let i = 0; i <= 2000; i++) { const x = i / 2000, y = f(x); if (y > max) { max = y; at = x; } }
  return { overshoot: +((max - 1) * 100).toFixed(2), atProgress: +at.toFixed(3) };
}
if (process.argv[1] && process.argv[1].endsWith('bezier.mjs')) {
  const a = process.argv.slice(2).map(Number);
  const sets = a.length ? [a] : [[0.2, 0.9, 0.25, 1.12], [0.3, 0, 0.15, 1], [0.3, 0, 0.15, 1.06], [0.3, 0, 0.15, 1.07], [0.3, 0, 0.15, 1.08], [0.3, 0, 0.15, 1.1]];
  for (const s of sets) console.log(`cubic-bezier(${s.join(', ')})`, peak(...s));
}
