/**
 * Proof that wordmark-judge.mjs tells a smear from a clean handoff, and a
 * blink from a wordmark holding still, on synthetic opacity series. Run it
 * after touching the thresholds:
 *   node scripts/themes/lib/wordmark-judge.selftest.mjs
 *
 * Written 09-23-26 for Tier 3 stage 2 (the P5 proof). Each case builds the
 * two images' opacity curves the way the browser would (keyframes, a
 * duration, a per-keyframe easing), samples them every 4 ms like the
 * sampler's replay, and checks the verdict:
 *   - Astro's simultaneous 180 ms crossfade on an arrival must fail overlap;
 *   - the README's fades (out over 0-35%, in over 40-100%) must pass it;
 *   - the same fades on an in-school swap must fail blink;
 *   - Astro's matched crossfade on identical images must pass blink;
 *   - nothing sampled, or one image missing, must fail (never a pass);
 *   - the pair's and group's opacity multiply in (a faint group hides both).
 */
import { judgeWordmark, effective, WORDMARK } from './wordmark-judge.mjs';

/** CSS cubic-bezier(x1, y1, x2, y2) as a function of progress. */
function cubicBezier(x1, y1, x2, y2) {
  const bez = (a, b, t) => 3 * a * t * (1 - t) ** 2 + 3 * b * t ** 2 * (1 - t) + t ** 3;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (bez(x1, x2, mid) < x) lo = mid;
      else hi = mid;
    }
    return bez(y1, y2, (lo + hi) / 2);
  };
}
const EASE = cubicBezier(0.25, 0.1, 0.25, 1);
const ASTRO = cubicBezier(0.76, 0, 0.24, 1);

/** Opacity at `ms` of keyframes `[offset, value][]` run over `dur` ms with
    fill both, each segment eased by `ease` (CSS puts the animation's timing
    function on every keyframe). */
function curve(frames, dur, ease, delay = 0) {
  return (ms) => {
    const p = Math.min(1, Math.max(0, (ms - delay) / dur));
    for (let i = 0; i < frames.length - 1; i++) {
      const [o0, v0] = frames[i];
      const [o1, v1] = frames[i + 1];
      if (p <= o1) return o1 === o0 ? v1 : v0 + (v1 - v0) * ease((p - o0) / (o1 - o0));
    }
    return frames[frames.length - 1][1];
  };
}

function series(oldFn, newFn, { until = 600, group = () => 1, pair = () => 1 } = {}) {
  const out = [];
  for (let ms = 0; ms <= until; ms += 4) {
    out.push({
      ms,
      old: { own: oldFn(ms), pair: pair(ms), group: group(ms), vt: 1 },
      new: { own: newFn(ms), pair: pair(ms), group: group(ms), vt: 1 },
    });
  }
  return out;
}

// Astro's layer: astroFadeOut / astroFadeIn, 180 ms, its curve, simultaneous.
const astroOut = curve([[0, 1], [1, 0]], 180, ASTRO);
const astroIn = curve([[0, 0], [1, 1]], 180, ASTRO);
// The README's fades over a 560 ms group, as it intends them (inheriting the
// group's duration), with the default `ease` on each keyframe.
const readmeOut = curve([[0, 1], [0.35, 0], [1, 0]], 560, EASE);
const readmeIn = curve([[0, 0], [0.4, 0], [1, 1]], 560, EASE);
// The same keyframes as they actually run under Astro's layer (180 ms, its curve).
const holeOut = curve([[0, 1], [0.35, 0], [1, 0]], 180, ASTRO);
const holeIn = curve([[0, 0], [0.4, 0], [1, 1]], 180, ASTRO);

const cases = [
  ['Astro crossfade, arrival', judgeWordmark(series(astroOut, astroIn), { kind: 'overlap' }), false],
  ['README fades, arrival', judgeWordmark(series(readmeOut, readmeIn), { kind: 'overlap' }), true],
  ['README keyframes at Astro 180 ms, arrival', judgeWordmark(series(holeOut, holeIn), { kind: 'overlap' }), true],
  ['README fades, in-school swap', judgeWordmark(series(readmeOut, readmeIn), { kind: 'blink' }), false],
  ['Astro crossfade, identical images', judgeWordmark(series(astroOut, astroIn), { kind: 'blink' }), true],
  ['no fades at all, in-school swap', judgeWordmark(series(() => 1, () => 1), { kind: 'blink' }), true],
  ['old image hidden throughout, in-school swap', judgeWordmark(series(() => 0, () => 1), { kind: 'blink' }), true],
  ['Astro crossfade under a group at 0.1', judgeWordmark(series(astroOut, astroIn, { group: () => 0.1 }), { kind: 'overlap' }), true],
  ['Astro crossfade under a pair dipping to 0.5, identical', judgeWordmark(series(astroOut, astroIn, { pair: (ms) => (ms > 60 && ms < 120 ? 0.5 : 1) }), { kind: 'blink' }), false],
  ['both at 0.11 once, arrival', judgeWordmark([{ ms: 0, old: { own: 0.11 }, new: { own: 0.11 } }], { kind: 'overlap' }), false],
  ['both at 0.09 once, arrival', judgeWordmark([{ ms: 0, old: { own: 0.09 }, new: { own: 0.09 } }], { kind: 'overlap' }), true],
  ['no samples, arrival', judgeWordmark([], { kind: 'overlap' }), false],
  ['no samples, in-school swap', judgeWordmark([], { kind: 'blink' }), false],
  ['no old wordmark, arrival', judgeWordmark(series(() => 0, astroIn), { kind: 'overlap', images: { old: false, new: true } }), false],
];

let bad = 0;
console.log(`thresholds: overlap ${WORDMARK.overlap}, blink ${WORDMARK.blink}`);
for (const [name, v, want] of cases) {
  const ok = v.pass === want;
  if (!ok) bad++;
  const worst = v.worst ? `worst ${v.worst.score} at +${v.worst.ms} ms (old ${v.worst.old}, new ${v.worst.new})` : v.reason;
  console.log(`${ok ? 'ok  ' : 'BAD '} ${name}: ${v.kind} ${v.pass ? 'pass' : 'FAIL'}${v.unsampled ? ' (unsampled)' : ''}, ${worst}`);
}
// The crossfade's worst moment should be its midpoint, both near one half.
const mid = judgeWordmark(series(astroOut, astroIn), { kind: 'overlap' }).worst;
if (!(mid.ms >= 84 && mid.ms <= 96 && mid.score > 0.45)) {
  bad++;
  console.log(`BAD  crossfade's worst moment is +${mid.ms} ms at ${mid.score}, expected about +90 ms near 0.5`);
}
if (effective({ own: 0.5, pair: 0.5, group: 0.5, vt: 0.5 }) !== 0.0625) {
  bad++;
  console.log('BAD  effective() does not multiply its factors');
}
console.log(bad ? `${bad} case(s) wrong` : 'all cases as expected');
process.exitCode = bad ? 1 : 0;
