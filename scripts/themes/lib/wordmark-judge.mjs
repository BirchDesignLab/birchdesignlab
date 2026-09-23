/**
 * Were both wordmarks legible at once, did the header sit empty too long, or
 * did a still wordmark blink? Pure verdicts over opacity samples, behind
 * motion.mjs's `--crop wordmark` strips and rejudge-wordmark.mjs.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the P5 proof). Every school's header
 * carries view-transition-name `wordmark`, so every swap draws two images of
 * it, ::view-transition-old(wordmark) and ::view-transition-new(wordmark),
 * inside ::view-transition-image-pair(wordmark) inside
 * ::view-transition-group(wordmark). What the eye gets from each image is its
 * own opacity times the pair's times the group's (times ::view-transition's,
 * which nobody animates today but costs nothing to include), times any
 * `opacity()` in the image's own filter, and 0 while its visibility is
 * hidden. The samples come from lib/wordmark-sampler.mjs; this file only
 * judges them.
 *
 * Three verdicts:
 *   overlap  for an arrival from another school (two different wordmarks):
 *            fails if at any sample min(effOld, effNew) > 0.10, i.e. both are
 *            legible together, one smeared across the other.
 *   blank    for the same arrivals (added 09-23-26, founder decision b at the
 *            P5 checkpoint): the longest continuous span on the transition's
 *            timeline where both images are under 0.10, i.e. the header
 *            shows no wordmark at all. Measured on the replayed series only
 *            (a 4 ms grid; the live frames can stall for 150 ms and would
 *            hide or invent a gap), with each edge placed where the brighter
 *            image crosses 0.10 between two grid points. Fails above 80 ms.
 *   blink    for an in-school swap (the same wordmark on both sides): fails
 *            if the wordmark's coverage drops below 0.90 at any sample, i.e.
 *            a wordmark that should hold still dimmed. The new image is
 *            drawn over the old inside the pair, so the new image's resolved
 *            mix-blend-mode decides the coverage: plus-lighter (the
 *            browser's own, riding on its default animations) sums them,
 *            min(1, o + n); normal composites, n + o * (1 - n). A school
 *            whose in-school keyframes replace the browser's also drops its
 *            plus-lighter, and is judged as normal. Any other blend mode is
 *            judged as normal and named in the verdict.
 * A strip with no samples, or with one of the two images missing, is
 * unsampled and fails: the judge saw nothing, which is never a pass. An
 * arrival with no replayed samples has no blank, and is unsampled too.
 *
 * Opacity is not the only way to hide an image. `judgeDrawn` looks at each
 * image's resolved clip-path and transform (and the pair's and group's
 * clip-path) on every sample, and names any moment an image the judges count
 * as visible (above 0.10) is clipped (anything but none or a zero inset) or
 * transformed so it could not be seen (scaled to nothing, or translated clear
 * of its own box). Those strips are a problem, not a pass. Samples filmed
 * before the sampler recorded these (before 09-23-26, tooling hardening) say
 * so: drawn is `checked: false`.
 *
 * What the judges still cannot see: a blur, brightness or other filter short
 * of opacity(); a clip-path or mask on anything above the group (the root,
 * ::view-transition); `mask` anywhere; 3D transforms that turn an image's
 * back to the viewer; an image drawn at its own size overhanging a shrinking
 * box (object-fit none) and being clipped by the page edge; and what the
 * wordmark's pixels look like (a transparent or empty snapshot counts as
 * visible). The strips remain the eye's check on all of that.
 *
 * A sample is `{ ms, src, old: { own, pair, group, vt, vis, filter, blend,
 * clip, transform, w, h }, new: { ... }, anc: { pairClip, groupClip } }`,
 * `ms` being the time since the trigger and `src` 'replay' or 'live'; a
 * missing opacity factor counts as 1, and the other fields may be absent.
 * The self-test (`node scripts/themes/lib/wordmark-judge.selftest.mjs`)
 * proves the verdicts on synthetic series.
 */

export const WORDMARK = {
  /** Both images above this effective opacity at once counts as overlap. */
  overlap: 0.1,
  /** Both images under this effective opacity counts as blank. */
  blankBelow: 0.1,
  /** The longest blank an arrival may show, in ms (founder decision b). */
  blankMs: 80,
  /** The wordmark's coverage below this counts as a blink. */
  blink: 0.9,
};

const r3 = (n) => Math.round(n * 1000) / 1000;
const r1 = (n) => Math.round(n * 10) / 10;

/** The product of every opacity() in a filter list (1 for none). */
function filterOpacity(filter) {
  if (!filter || filter === 'none') return 1;
  let k = 1;
  for (const m of String(filter).matchAll(/opacity\(\s*([0-9.]+)(%?)\s*\)/g)) k *= m[2] ? Number(m[1]) / 100 : Number(m[1]);
  return k;
}

/** One image's effective opacity: its own times its ancestors', times its
    filter's opacity(), and 0 while hidden. */
export function effective(img) {
  if (!img) return 0;
  if (img.vis === 'hidden' || img.vis === 'collapse') return 0;
  return (img.own ?? 1) * (img.pair ?? 1) * (img.group ?? 1) * (img.vt ?? 1) * filterOpacity(img.filter);
}

/** How much of the wordmark shows when `o` and `n` are drawn in one pair,
    by the new image's blend mode (see the header). */
export function coverage(o, n, blend = 'plus-lighter') {
  return blend === 'plus-lighter' ? Math.min(1, o + n) : n + o * (1 - n);
}

function unsampled(kind, reason, n = 0) {
  return { kind, pass: false, unsampled: true, reason, samples: n, worst: null };
}

/**
 * Judge a series. `kind` is 'overlap' or 'blink'; `images` says whether an
 * old and a new wordmark existed at all (measured on the pages, not
 * inferred from the samples, since a missing image samples as opacity 0 and
 * would pass overlap for the wrong reason). `blend` is the new image's
 * resolved mix-blend-mode, used where a sample does not carry its own.
 */
export function judgeWordmark(samples, { kind, images = { old: true, new: true }, blend = 'plus-lighter', ...opts } = {}) {
  const { overlap, blink } = { ...WORDMARK, ...opts };
  if (kind !== 'overlap' && kind !== 'blink') throw new Error(`unknown wordmark verdict ${kind}`);
  if (!images.old || !images.new) {
    return unsampled(kind, `no ${!images.old ? 'old' : 'new'} wordmark to judge`);
  }
  if (!samples?.length) return unsampled(kind, 'no samples (no view transition ran, or it never became ready)');
  let worst = null;
  const blends = new Set();
  for (const s of samples) {
    const o = effective(s.old);
    const n = effective(s.new);
    const b = s.new?.blend ?? blend;
    if (kind === 'blink') blends.add(b);
    const score = kind === 'overlap' ? Math.min(o, n) : coverage(o, n, b);
    const worse = !worst || (kind === 'overlap' ? score > worst.score : score < worst.score);
    if (worse) worst = { ms: s.ms, old: r3(o), new: r3(n), score: r3(score), ...(kind === 'blink' ? { blend: b } : {}) };
  }
  const pass = kind === 'overlap' ? worst.score <= overlap : worst.score >= blink;
  return {
    kind, pass, unsampled: false, samples: samples.length, worst, threshold: kind === 'overlap' ? overlap : blink,
    ...(kind === 'blink' ? { blends: [...blends] } : {}),
  };
}

/**
 * The longest blank on an arrival: the longest continuous span of the
 * replayed series where both images are under `blankBelow`. Returns
 * `{ pass, unsampled, ms, start, end, threshold, below, samples }` (start
 * and end in ms since the trigger; ms 0 and nulls when there is no blank).
 */
export function judgeBlank(samples, { images = { old: true, new: true }, ...opts } = {}) {
  const { blankBelow, blankMs } = { ...WORDMARK, ...opts };
  const base = { threshold: blankMs, below: blankBelow };
  const none = (reason) => ({ ...base, pass: false, unsampled: true, reason, ms: null, start: null, end: null, samples: 0 });
  if (!images.old || !images.new) return none(`no ${!images.old ? 'old' : 'new'} wordmark to judge`);
  // Replayed samples only; a series from before the sampler marked them
  // (none today) would have no src at all and is taken whole.
  const grid = (samples ?? []).filter((s) => s.src === 'replay' || s.src == null).sort((a, b) => a.ms - b.ms);
  if (grid.length < 2) return none('no replayed samples to measure the blank on');
  const lit = grid.map((s) => Math.max(effective(s.old), effective(s.new)));
  // Where the brighter image crosses `blankBelow` between grid points i and
  // i + 1 (linear between them).
  const cross = (i) => {
    const [a, b] = [lit[i], lit[i + 1]];
    const f = a === b ? 0.5 : (blankBelow - a) / (b - a);
    return grid[i].ms + Math.min(1, Math.max(0, f)) * (grid[i + 1].ms - grid[i].ms);
  };
  let best = null;
  let i = 0;
  while (i < grid.length) {
    if (lit[i] >= blankBelow) { i++; continue; }
    let j = i;
    while (j + 1 < grid.length && lit[j + 1] < blankBelow) j++;
    const start = i === 0 ? grid[0].ms : cross(i - 1);
    const end = j === grid.length - 1 ? grid[j].ms : cross(j);
    if (!best || end - start > best.end - best.start) best = { start, end };
    i = j + 1;
  }
  const ms = best ? r1(best.end - best.start) : 0;
  return {
    ...base, pass: ms <= blankMs, unsampled: false, ms,
    start: best ? r1(best.start) : null, end: best ? r1(best.end) : null, samples: grid.length,
  };
}

/** Does this clip-path hide anything? none and a zero inset do not. */
function clips(v) {
  if (!v || v === 'none') return false;
  const m = /^inset\(([^)]*)\)$/.exec(String(v).trim());
  return !(m && m[1].split(/\s+/).filter((x) => !/^round$/.test(x)).every((x) => /^0(px|%)?$/.test(x)));
}

/** Could this transform hide an image of `w` x `h` (transform-origin at its
    centre, the browser's default)? Scaled to nothing, or moved clear of its
    own box. */
function hides(transform, w, h) {
  if (!transform || transform === 'none') return null;
  // The numbers inside the parentheses (not the 3 of matrix3d).
  const nums = String(transform).replace(/^[a-z0-9]+\(/i, '').match(/-?[0-9.]+(e-?[0-9]+)?/g)?.map(Number) ?? [];
  let a; let b; let c; let d; let e; let f;
  if (transform.startsWith('matrix3d(') && nums.length >= 16) {
    // Column-major: the 2D part sits at 0, 1, 4, 5 and the translation at 12, 13.
    [a, b, c, d, e, f] = [nums[0], nums[1], nums[4], nums[5], nums[12], nums[13]];
  } else if (transform.startsWith('matrix(') && nums.length >= 6) {
    [a, b, c, d, e, f] = nums;
  } else return null;
  if (Math.abs(a * d - b * c) < 0.01) return 'scaled to nothing';
  if (!(w > 0 && h > 0)) return null;
  // The transformed box's extents about its centre.
  const ww = Math.abs(a) * w + Math.abs(c) * h;
  const hh = Math.abs(b) * w + Math.abs(d) * h;
  if (Math.abs(e) >= (w + ww) / 2 || Math.abs(f) >= (h + hh) / 2) return 'moved clear of its box';
  return null;
}

/**
 * Was every image the judges counted as visible actually drawn? Returns
 * `{ checked, suspects }`, one suspect per image and cause with its first
 * and last moment. `checked` is false when the samples carry no clip-path or
 * transform at all (filmed before they were recorded).
 */
export function judgeDrawn(samples, { visibleAbove = WORDMARK.overlap } = {}) {
  const recorded = (samples ?? []).some((s) => ['old', 'new'].some((k) => s[k] && ('clip' in s[k] || 'transform' in s[k])));
  if (!recorded) return { checked: false, suspects: [] };
  const found = new Map();
  const note = (image, cause, value, ms) => {
    const key = `${image}|${cause}|${value}`;
    const hit = found.get(key);
    if (hit) hit.toMs = ms;
    else found.set(key, { image, cause, value, fromMs: ms, toMs: ms });
  };
  for (const s of samples) {
    for (const k of ['old', 'new']) {
      const img = s[k];
      if (!img || effective(img) <= visibleAbove) continue;
      if (clips(img.clip)) note(k, 'clip-path', img.clip, s.ms);
      if (clips(s.anc?.pairClip)) note(k, 'image-pair clip-path', s.anc.pairClip, s.ms);
      if (clips(s.anc?.groupClip)) note(k, 'group clip-path', s.anc.groupClip, s.ms);
      const why = hides(img.transform, img.w, img.h);
      if (why) note(k, `transform (${why})`, img.transform, s.ms);
    }
  }
  return { checked: true, suspects: [...found.values()] };
}

/**
 * Every wordmark verdict for one strip, from what the sampler collected.
 * `got` is collect()'s result (or a sample file's `judge` block with its
 * `samples`); `boxes` the wordmark measured on each page; `scenario` 'arrive'
 * or 'page'. Returns the manifest entry's verdict fields, the verdicts, and
 * the problems (every one starts `<where>: wordmark` or names the elements
 * named wordmark, so a re-judge can find and replace them).
 */
export function judgeStripWordmark({ got, samples, boxes, scenario, where }) {
  const kind = scenario === 'page' ? 'blink' : 'overlap';
  const key = kind === 'blink' ? 'wordmarkBlink' : 'wordmarkOverlap';
  const images = { old: !!boxes?.before, new: !!boxes?.after };
  const ok = !!got?.ok;
  const series = ok ? samples ?? [] : [];
  const blend = got?.resolved?.new?.css?.mixBlendMode || 'plus-lighter';
  const verdict = judgeWordmark(series, { kind, images, blend });
  // With both wordmarks there, an empty series means the sampler saw no
  // transition; say why.
  if (!ok && images.old && images.new) verdict.reason = got?.reason ?? 'no samples';
  const problems = [];
  if (verdict.unsampled) problems.push(`${where}: ${key} could not be judged (${verdict.reason})`);
  else if (!verdict.pass) {
    const w = verdict.worst;
    problems.push(`${where}: ${key} FAILED at +${w.ms} ms (old ${w.old}, new ${w.new}${kind === 'blink' ? `, coverage ${w.score} by ${w.blend}` : ''})`);
  }
  if (kind === 'blink' && verdict.blends?.some((b) => b !== 'plus-lighter' && b !== 'normal')) {
    problems.push(`${where}: wordmarkBlink judged blend ${verdict.blends.join(', ')} as normal`);
  }
  let blank = null;
  if (kind === 'overlap') {
    blank = judgeBlank(series, { images });
    if (!ok && images.old && images.new) blank.reason = got?.reason ?? blank.reason;
    if (blank.unsampled) problems.push(`${where}: wordmarkBlank could not be measured (${blank.reason})`);
    else if (!blank.pass) problems.push(`${where}: wordmarkBlank FAILED, ${blank.ms} ms with both under ${blank.below} (+${blank.start} to +${blank.end} ms)`);
  }
  const drawn = judgeDrawn(series);
  for (const s of drawn.suspects) {
    problems.push(`${where}: wordmark ${s.image} image counted visible while hidden by its ${s.cause} ${s.value} (+${s.fromMs} to +${s.toMs} ms)`);
  }
  const count = Math.max(boxes?.before?.count ?? 0, boxes?.after?.count ?? 0);
  if (count > 1) problems.push(`${where}: ${count} elements named wordmark on one page`);
  // A live-frame sample the replay disagrees with means the replay is not
  // what the browser drew, so the verdict cannot be trusted either way.
  if (ok && got.replayVsLive?.worst?.diff > 0.05) {
    const d = got.replayVsLive.worst;
    problems.push(`${where}: wordmark replay disagrees with a live sample (${d.part} at +${d.ms} ms: live ${d.live}, replay ${d.replay})`);
  }
  const fields = {
    [key]: {
      pass: verdict.pass, unsampled: verdict.unsampled, worst: verdict.worst, threshold: verdict.threshold ?? null, reason: verdict.reason ?? null,
      ...(verdict.blends ? { blends: verdict.blends } : {}),
    },
    ...(blank ? { wordmarkBlank: { pass: blank.pass, unsampled: blank.unsampled, ms: blank.ms, start: blank.start, end: blank.end, threshold: blank.threshold, below: blank.below, reason: blank.reason ?? null } } : {}),
    wordmarkDrawn: drawn,
  };
  return { key, kind, verdict, blank, drawn, fields, problems };
}

/** Is this problem one judgeStripWordmark writes for `where`? */
export const isWordmarkProblem = (p, where) => p.startsWith(`${where}: wordmark`) || (p.startsWith(`${where}: `) && / elements named wordmark on one page$/.test(p));

/** One line for the console: every verdict of a strip. */
export function describeWordmark({ key, verdict, blank, drawn }, judge) {
  let out = `${key} ${verdict.unsampled ? `UNSAMPLED (${verdict.reason})` : verdict.pass ? 'pass' : 'FAIL'}`;
  if (verdict.worst) out += ` worst ${verdict.worst.score} at +${verdict.worst.ms} ms (old ${verdict.worst.old}, new ${verdict.worst.new}${verdict.worst.blend ? `, ${verdict.worst.blend}` : ''})`;
  if (blank) out += `; blank ${blank.unsampled ? `UNSAMPLED (${blank.reason})` : `${blank.ms} ms ${blank.pass ? 'pass' : 'FAIL'}${blank.ms ? ` (+${blank.start} to +${blank.end})` : ''}`}`;
  out += drawn.checked ? (drawn.suspects.length ? `; drawn SUSPECT (${drawn.suspects.length})` : '; drawn ok') : '; drawn not recorded';
  if (judge?.ok) out += `; group ${judge.groupAnimates ? (judge.groupMoves ? 'moves' : 'animates in place') : 'does not animate'}`;
  return out;
}
