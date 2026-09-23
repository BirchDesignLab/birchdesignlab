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
 * Added 09-23-26 (tooling hardening before the sweep):
 *   - the blank: a 50 ms gap passes, a 120 ms gap fails, and nothing sampled
 *     (or one image missing) is unsampled, never a pass;
 *   - the blend: Astro's crossfade blinks when the new image is blended
 *     normal, and holds under plus-lighter;
 *   - the drawn check: a clip or a transform that hides a visible image is
 *     named, a zero inset or a small nudge is not.
 */
import { judgeWordmark, judgeBlank, judgeDrawn, judgeStripWordmark, isWordmarkProblem, effective, WORDMARK } from './wordmark-judge.mjs';

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

// Added 09-23-26 (tooling hardening): the blank, the blend and the drawn check.
// Linear ramps: the old image fades out over 40 ms ending at `gone`, the new
// one fades in over 40 ms from `back`. Under 0.10 the header is blank from
// gone - 4 to back + 4 ms, the gap plus 8.
const ramp = (a, b, v0, v1) => (ms) => (ms <= a ? v0 : ms >= b ? v1 : v0 + ((v1 - v0) * (ms - a)) / (b - a));
const gap = (gone, back) => series(ramp(gone - 40, gone, 1, 0), ramp(back, back + 40, 0, 1));
const blank50 = judgeBlank(gap(100, 150));
const blank120 = judgeBlank(gap(100, 220));
// Astro's crossfade on identical images, blended normal (a school's own
// in-school keyframes dropping the browser's plus-lighter): at the midpoint
// the coverage is 0.5 + 0.5 * 0.5 = 0.75.
const withBlend = (s, blend) => s.map((x) => ({ ...x, old: { ...x.old, blend }, new: { ...x.new, blend } }));
const drawnOf = (patch) => judgeDrawn(series(() => 1, () => 1).map((s) => ({ ...s, new: { ...s.new, ...patch } })));

cases.push(
  ['blank, 50 ms gap', blank50, true],
  ['blank, 120 ms gap', blank120, false],
  ['blank, no samples', judgeBlank([]), false],
  ['blank, no old wordmark', judgeBlank(gap(100, 150), { images: { old: false, new: true } }), false],
  ['blank, README fades at 560 ms ease', judgeBlank(series(readmeOut, readmeIn)), false],
  ['blank, Astro crossfade (never blank)', judgeBlank(series(astroOut, astroIn)), true],
  ['Astro crossfade, identical images, normal blend', judgeWordmark(withBlend(series(astroOut, astroIn), 'normal'), { kind: 'blink' }), false],
  ['Astro crossfade, identical images, plus-lighter from the sample', judgeWordmark(withBlend(series(astroOut, astroIn), 'plus-lighter'), { kind: 'blink', blend: 'normal' }), true],
  ['no fades at all, in-school swap, normal blend', judgeWordmark(series(() => 1, () => 1), { kind: 'blink', blend: 'normal' }), true],
  ['new hidden by visibility, in-school swap, normal', judgeWordmark(withBlend(series(astroOut, () => 1), 'normal').map((s) => ({ ...s, new: { ...s.new, vis: 'hidden' } })), { kind: 'blink' }), false],
);
// The drawn check: a pass is `suspects` empty.
const drawnCases = [
  ['drawn, nothing recorded', judgeDrawn(series(() => 1, () => 1)), { checked: false, n: 0 }],
  ['drawn, clip none and transform none', drawnOf({ clip: 'none', transform: 'none', w: 200, h: 40 }), { checked: true, n: 0 }],
  ['drawn, zero inset', drawnOf({ clip: 'inset(0px)', transform: 'none', w: 200, h: 40 }), { checked: true, n: 0 }],
  ['drawn, half inset', drawnOf({ clip: 'inset(0px 50% 0px 0px)', transform: 'none', w: 200, h: 40 }), { checked: true, n: 1 }],
  ['drawn, scale 0', drawnOf({ clip: 'none', transform: 'matrix(0, 0, 0, 0, 0, 0)', w: 200, h: 40 }), { checked: true, n: 1 }],
  ['drawn, translated clear of its box', drawnOf({ clip: 'none', transform: 'matrix(1, 0, 0, 1, 0, -60)', w: 200, h: 40 }), { checked: true, n: 1 }],
  ['drawn, nudged 10 px', drawnOf({ clip: 'none', transform: 'matrix(1, 0, 0, 1, 10, 0)', w: 200, h: 40 }), { checked: true, n: 0 }],
  ['drawn, matrix3d scale 0', drawnOf({ clip: 'none', transform: 'matrix3d(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1)', w: 200, h: 40 }), { checked: true, n: 1 }],
  ['drawn, clipped but invisible anyway', drawnOf({ own: 0, clip: 'inset(0px 50% 0px 0px)', transform: 'none', w: 200, h: 40 }), { checked: true, n: 0 }],
];

let bad = 0;
console.log(`thresholds: overlap ${WORDMARK.overlap}, blink ${WORDMARK.blink}, blank ${WORDMARK.blankMs} ms under ${WORDMARK.blankBelow}`);
for (const [name, v, want] of drawnCases) {
  const ok = v.checked === want.checked && v.suspects.length === want.n;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : 'BAD '} ${name}: ${v.checked ? `${v.suspects.length} suspect(s)${v.suspects.length ? ` (${v.suspects.map((s) => s.cause).join(', ')})` : ''}` : 'not checked'}`);
}
for (const [name, v, want] of cases) {
  const ok = v.pass === want;
  if (!ok) bad++;
  const worst = v.worst
    ? `worst ${v.worst.score} at +${v.worst.ms} ms (old ${v.worst.old}, new ${v.worst.new}${v.worst.blend ? `, ${v.worst.blend}` : ''})`
    : v.ms != null ? `${v.ms} ms${v.ms ? ` (+${v.start} to +${v.end})` : ''}` : v.reason;
  console.log(`${ok ? 'ok  ' : 'BAD '} ${name}: ${v.kind ?? 'blank'} ${v.pass ? 'pass' : 'FAIL'}${v.unsampled ? ' (unsampled)' : ''}, ${worst}`);
}
// The blank is measured to the crossing, not to the grid: the gap plus 8 ms.
for (const [v, want] of [[blank50, 58], [blank120, 128]]) {
  if (Math.abs(v.ms - want) > 1) {
    bad++;
    console.log(`BAD  blank measured ${v.ms} ms, expected about ${want}`);
  }
}
// A strip whose sampler saw nothing: the blank is unsampled and a problem.
const none = judgeStripWordmark({ got: { ok: false, reason: 'no view transition started' }, boxes: { before: { count: 1 }, after: { count: 1 } }, scenario: 'arrive', where: 'x arrive' });
if (!(none.blank?.unsampled && none.problems.some((p) => p.startsWith('x arrive: wordmarkBlank could not be measured')))) {
  bad++;
  console.log('BAD  an arrival with no samples did not report an unmeasured blank');
}
if (!none.problems.every((p) => isWordmarkProblem(p, 'x arrive'))) {
  bad++;
  console.log('BAD  a wordmark problem is not recognised by isWordmarkProblem');
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
