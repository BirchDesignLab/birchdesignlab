/**
 * Predict the wordmark blank and overlap for a pair of fade keyframes run on
 * a group's clock, before building and filming them.
 *
 * Written 09-23-26 for Tier 3 stage 2, wave B (grandmillennial item 4b). The
 * README's wordmark default inherits the group's duration and curve into the
 * two images, and a keyframe animation applies its timing function to each
 * keyframe interval, not to the whole run. So the old image's fade runs the
 * whole curve inside 0..outEnd and the new one's inside inStart..100%. This
 * solves each cubic-bezier for the time the image crosses 0.10 opacity and
 * prints the blank (both under 0.10) or the overlap (both above), the same
 * measures as lib/wordmark-judge.mjs, so offsets can be tuned to the
 * founder's 80 ms limit before a film confirms them.
 *
 * Usage:
 *   node scripts/themes/harness/gm-wordmark-offsets.mjs --ms 560 \
 *     --curve 0.62,0,0.22,1 --out 35 --in 40 [--threshold 0.1]
 *   (--out: % where the old image reaches 0; --in: % where the new starts)
 */
const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith('--')) acc.push([a.slice(2), all[i + 1]]);
    return acc;
  }, []),
);
const ms = Number(args.ms ?? 560);
const [x1, y1, x2, y2] = (args.curve ?? '0.62,0,0.22,1').split(',').map(Number);
const outEnd = Number(args.out ?? 35) / 100;
const inStart = Number(args.in ?? 40) / 100;
const th = Number(args.threshold ?? 0.1);

const bez = (a, b, t) => 3 * a * (1 - t) ** 2 * t + 3 * b * (1 - t) * t ** 2 + t ** 3;
/** Input progress x at which the curve's output reaches y. */
function xForY(y) {
  let lo = 0, hi = 1;
  for (let i = 0; i < 60; i++) {
    const t = (lo + hi) / 2;
    if (bez(y1, y2, t) < y) lo = t; else hi = t;
  }
  return bez(x1, x2, (lo + hi) / 2);
}

// Old: opacity 1 -> 0 over [0, outEnd]; under th once the curve passes 1 - th.
const oldUnder = xForY(1 - th) * outEnd * ms;
// New: opacity 0 -> 1 over [inStart, 1]; above th once the curve passes th.
const newOver = (inStart + xForY(th) * (1 - inStart)) * ms;
const gap = newOver - oldUnder;
console.log(
  `old under ${th} at ${oldUnder.toFixed(1)} ms, new over ${th} at ${newOver.toFixed(1)} ms: ` +
    (gap >= 0 ? `blank ${gap.toFixed(1)} ms` : `OVERLAP ${(-gap).toFixed(1)} ms`),
);
