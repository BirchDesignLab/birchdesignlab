/**
 * Were both wordmarks legible at once, or did a still wordmark blink? A pure
 * verdict over opacity samples, behind motion.mjs's `--crop wordmark` strips.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the P5 proof). Every school's header
 * carries view-transition-name `wordmark`, so every swap draws two images of
 * it, ::view-transition-old(wordmark) and ::view-transition-new(wordmark),
 * inside ::view-transition-image-pair(wordmark) inside
 * ::view-transition-group(wordmark). What the eye gets from each image is its
 * own opacity times the pair's times the group's (times ::view-transition's,
 * which nobody animates today but costs nothing to include). The samples come
 * from lib/wordmark-sampler.mjs; this file only judges them.
 *
 * Two verdicts:
 *   overlap  for an arrival from another school (two different wordmarks):
 *            fails if at any sample min(effOld, effNew) > 0.10, i.e. both are
 *            legible together, one smeared across the other.
 *   blink    for an in-school swap (the same wordmark on both sides; the
 *            images are drawn plus-lighter, so what shows is their sum):
 *            fails if at any sample effOld + effNew < 0.90, i.e. a wordmark
 *            that should hold still dimmed.
 * A strip with no samples, or with one of the two images missing, is
 * unsampled and fails: the judge saw nothing, which is never a pass.
 *
 * A sample is `{ ms, old: { own, pair, group, vt }, new: { ... } }`, `ms`
 * being the time since the trigger; a missing factor counts as 1.
 * The self-test (`node scripts/themes/lib/wordmark-judge.selftest.mjs`)
 * proves the verdicts on synthetic series.
 */

export const WORDMARK = {
  /** Both images above this effective opacity at once counts as overlap. */
  overlap: 0.1,
  /** The two images of one wordmark summing below this counts as a blink. */
  blink: 0.9,
};

const r3 = (n) => Math.round(n * 1000) / 1000;

/** One image's effective opacity: its own times its ancestors'. */
export function effective(img) {
  if (!img) return 0;
  return (img.own ?? 1) * (img.pair ?? 1) * (img.group ?? 1) * (img.vt ?? 1);
}

function unsampled(kind, reason, n = 0) {
  return { kind, pass: false, unsampled: true, reason, samples: n, worst: null };
}

/**
 * Judge a series. `kind` is 'overlap' or 'blink'; `images` says whether an
 * old and a new wordmark existed at all (measured on the pages, not
 * inferred from the samples, since a missing image samples as opacity 0 and
 * would pass overlap for the wrong reason).
 */
export function judgeWordmark(samples, { kind, images = { old: true, new: true }, ...opts } = {}) {
  const { overlap, blink } = { ...WORDMARK, ...opts };
  if (kind !== 'overlap' && kind !== 'blink') throw new Error(`unknown wordmark verdict ${kind}`);
  if (!images.old || !images.new) {
    return unsampled(kind, `no ${!images.old ? 'old' : 'new'} wordmark to judge`);
  }
  if (!samples?.length) return unsampled(kind, 'no samples (no view transition ran, or it never became ready)');
  let worst = null;
  for (const s of samples) {
    const o = effective(s.old);
    const n = effective(s.new);
    const score = kind === 'overlap' ? Math.min(o, n) : o + n;
    const worse = !worst || (kind === 'overlap' ? score > worst.score : score < worst.score);
    if (worse) worst = { ms: s.ms, old: r3(o), new: r3(n), score: r3(score) };
  }
  const pass = kind === 'overlap' ? worst.score <= overlap : worst.score >= blink;
  return { kind, pass, unsampled: false, samples: samples.length, worst, threshold: kind === 'overlap' ? overlap : blink };
}
