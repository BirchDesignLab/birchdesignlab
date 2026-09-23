/**
 * Watch the wordmark's view-transition images through a swap and hand
 * wordmark-judge.mjs an opacity series. Used by motion.mjs `--crop wordmark`.
 *
 * Written 09-23-26 for Tier 3 stage 2 (the P5 proof). Three parts:
 *
 *   samplerInit   an init script. It wraps Document.prototype
 *                 .startViewTransition so every transition the router starts
 *                 is seen, and from `ready` until `finished` it samples, every
 *                 animation frame, the computed opacity of ::view-transition,
 *                 ::view-transition-group(wordmark), -image-pair(wordmark),
 *                 -old(wordmark) and -new(wordmark) (getComputedStyle on the
 *                 pseudo resolves the animated value in this Chromium). It
 *                 also records every animation on those pseudos
 *                 (document.getAnimations(): keyframes, timing, start time)
 *                 and, once, what the browser resolved for each pseudo's
 *                 animation-name, -duration, -delay, -timing-function and
 *                 -fill-mode.
 *   replay        run in the page after the swap. The frame-by-frame samples
 *                 are not enough on their own: the view-transition animations
 *                 run on the compositor, but requestAnimationFrame waits for
 *                 the main thread, and the arriving school's scripts can hold
 *                 it for 150 ms or more right when the images cross-fade (seen
 *                 on HEAD, quiet to cottagecore: no sample between +197 and
 *                 +373 ms after the call, the whole of Astro's 180 ms fade).
 *                 So each recorded animation is replayed on a hidden probe
 *                 element (same keyframes, same timing, paused and seeked to
 *                 each moment on the transition's own timeline) and the
 *                 browser's own interpolation gives the opacity every 4 ms.
 *                 The replay is checked against the live samples it overlaps;
 *                 a disagreement is reported, never averaged away.
 *   collect       Node side: pulls the run that followed the trigger, runs
 *                 the replay, and returns the samples (ms since the trigger)
 *                 plus what the browser resolved.
 *
 * The trigger mark: call `markTrigger(page)` just before the click. It
 * returns the page's clock as epoch ms, so screencast frames and samples
 * share one zero.
 */

export const PSEUDOS = {
  vt: '::view-transition',
  group: '::view-transition-group(wordmark)',
  pair: '::view-transition-image-pair(wordmark)',
  old: '::view-transition-old(wordmark)',
  new: '::view-transition-new(wordmark)',
};

/** The init script. Self-contained: Playwright serialises it into every
    document the context opens. */
export function samplerInit(PSEUDOS) {
  if (window.__bdlWm) return;
  const state = { trigger: null, runs: [] };
  window.__bdlWm = state;
  const orig = Document.prototype.startViewTransition;
  if (typeof orig !== 'function') {
    state.unsupported = true;
    return;
  }
  const byPe = Object.fromEntries(Object.entries(PSEUDOS).map(([k, pe]) => [pe, k]));
  const CSS = ['animationName', 'animationDuration', 'animationDelay', 'animationTimingFunction', 'animationFillMode',
    'animationIterationCount', 'opacity', 'mixBlendMode', 'objectFit', 'objectPosition', 'height'];
  const plain = (o) => JSON.parse(JSON.stringify(o));
  Document.prototype.startViewTransition = function (...args) {
    const run = { calledAt: performance.now(), readyAt: null, finishedAt: null, live: [], anims: {}, css: null, error: null };
    state.runs.push(run);
    const vt = orig.apply(this, args);
    let done = false;
    const tick = () => {
      if (done) return;
      // The time the browser computed this frame's animations for, not the
      // moment this callback runs (which can be 15 ms later).
      const t = document.timeline.currentTime ?? performance.now();
      const mine = document.getAnimations().filter((a) => byPe[a.effect?.pseudoElement]);
      const seen = {};
      let groupAnim = null;
      for (const a of mine) {
        const pe = a.effect.pseudoElement;
        const i = (seen[pe] = (seen[pe] ?? -1) + 1);
        if (pe === PSEUDOS.group && (!groupAnim || a.effect.getComputedTiming().endTime > groupAnim.effect.getComputedTiming().endTime)) groupAnim = a;
        if (a.startTime == null) continue;
        const key = `${byPe[pe]}#${i}`;
        const prev = run.anims[key];
        if (prev && prev.startTime === a.startTime && prev.name === (a.animationName ?? a.id)) continue;
        run.anims[key] = {
          part: byPe[pe], order: i, name: a.animationName ?? a.id ?? '', startTime: a.startTime, playbackRate: a.playbackRate,
          keyframes: plain(a.effect.getKeyframes()), timing: plain(a.effect.getTiming()),
        };
      }
      const op = {};
      for (const [k, pe] of Object.entries(PSEUDOS)) op[k] = Number(getComputedStyle(document.documentElement, pe).opacity);
      const progress = groupAnim ? groupAnim.effect.getComputedTiming().progress : null;
      run.live.push({ t, op, progress, animating: mine.length });
      if (!run.css && mine.some((a) => a.startTime != null)) {
        run.css = {};
        for (const [k, pe] of Object.entries(PSEUDOS)) {
          const cs = getComputedStyle(document.documentElement, pe);
          run.css[k] = Object.fromEntries(CSS.map((p) => [p, cs[p]]));
        }
      }
      requestAnimationFrame(tick);
    };
    vt.ready.then(
      () => {
        run.readyAt = performance.now();
        tick();
      },
      (e) => { run.error = `ready rejected: ${e?.name ?? ''} ${e?.message ?? e}`; },
    );
    vt.finished.then(
      () => { run.finishedAt = performance.now(); done = true; },
      (e) => { run.finishedAt = performance.now(); done = true; run.error ??= `finished rejected: ${e?.message ?? e}`; },
    );
    return vt;
  };
}

/** Mark the trigger in the page; returns the page clock as epoch ms. */
export function markTrigger(page) {
  return page.evaluate(() => {
    const t = performance.now();
    if (window.__bdlWm) window.__bdlWm.trigger = t;
    return performance.timeOrigin + t;
  });
}

/** In the page: replay the recorded animations on probe elements and read
    each part's opacity at every time in `times` (page clock, ms). */
function replayInPage({ anims, times, statics, parts }) {
  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-10px;top:-10px;width:1px;height:1px;overflow:hidden;pointer-events:none;contain:strict';
  document.documentElement.append(host);
  const probes = {};
  for (const part of parts) {
    const el = document.createElement('div');
    el.style.opacity = '1';
    host.append(el);
    const list = anims
      .filter((a) => a.part === part)
      .sort((a, b) => a.order - b.order)
      .map((a) => {
        const kfs = a.keyframes.map((k) => {
          const f = { offset: k.offset, easing: k.easing };
          if (k.composite && k.composite !== 'auto') f.composite = k.composite;
          if ('opacity' in k) f.opacity = k.opacity;
          return f;
        });
        const anim = el.animate(kfs, a.timing);
        anim.pause();
        return { anim, start: a.startTime, rate: a.playbackRate || 1, opacity: kfs.some((k) => 'opacity' in k), long: anim.effect.getComputedTiming().endTime };
      });
    probes[part] = { el, list, opacity: list.some((p) => p.opacity) };
  }
  const groupMain = [...(probes.group?.list ?? [])].sort((a, b) => b.long - a.long)[0] ?? null;
  const rows = times.map((T) => {
    for (const p of Object.values(probes)) for (const x of p.list) x.anim.currentTime = (T - x.start) * x.rate;
    const op = {};
    for (const part of parts) op[part] = probes[part].opacity ? Number(getComputedStyle(probes[part].el).opacity) : statics[part];
    const progress = groupMain ? groupMain.anim.effect.getComputedTiming().progress : null;
    return { T, op, progress };
  });
  host.remove();
  return rows;
}

const median = (xs) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.floor(s.length / 2)] : 1;
};
const r3 = (n) => (n == null ? n : Math.round(n * 1000) / 1000);

/**
 * Collect the run that followed the trigger. Returns `{ ok, reason? }` plus
 * calledMs, readyMs, finishedMs, samples (replayed and live, as
 * wordmark-judge.mjs wants them, `ms` since the trigger), liveSamples,
 * liveMaxGapMs, replaySamples, replayVsLive, resolved (per part: the CSS the
 * browser computed and the animations it ran), groupAnimates, groupMoves,
 * groupPath and error.
 * `stepMs` is the replay grid.
 */
export async function collect(page, { stepMs = 4 } = {}) {
  const state = await page.evaluate(() => window.__bdlWm ?? null);
  if (!state) return { ok: false, reason: 'the sampler was not installed in this page' };
  if (state.unsupported) return { ok: false, reason: 'this browser has no document.startViewTransition' };
  const trigger = state.trigger;
  if (trigger == null) return { ok: false, reason: 'no trigger was marked' };
  const run = state.runs.find((r) => r.calledAt >= trigger);
  if (!run) return { ok: false, reason: `no view transition started after the trigger (${state.runs.length} before it)` };
  const base = { calledMs: Math.round(run.calledAt - trigger), readyMs: run.readyAt == null ? null : Math.round(run.readyAt - trigger), finishedMs: run.finishedAt == null ? null : Math.round(run.finishedAt - trigger) };
  if (run.readyAt == null) return { ok: false, reason: `the transition never became ready${run.error ? ` (${run.error})` : ''}`, ...base };
  if (run.finishedAt == null) return { ok: false, reason: 'the transition had not finished when the film ended', ...base };
  const anims = Object.values(run.anims);
  const parts = Object.keys(PSEUDOS);
  // A part no animation touches keeps its static opacity, which the live
  // samples read directly.
  const statics = Object.fromEntries(parts.map((p) => [p, median(run.live.map((s) => s.op[p]))]));
  const from = Math.min(run.readyAt, ...anims.map((a) => a.startTime));
  const grid = [];
  for (let T = from; T <= run.finishedAt; T += stepMs) grid.push(T);
  const liveTimes = run.live.map((s) => s.t).filter((t) => t >= from && t <= run.finishedAt);
  const rows = await page.evaluate(replayInPage, { anims, times: [...grid, ...liveTimes], statics, parts });
  const replayed = rows.slice(0, grid.length);
  const atLive = rows.slice(grid.length);

  // Replay against the live samples it overlaps. A live sample taken before
  // every animation had a start time shows a pending animation, so only the
  // ones after the last start are compared.
  const lastStart = Math.max(...anims.map((a) => a.startTime), -Infinity);
  let worstDiff = { diff: 0, ms: null, part: null };
  let compared = 0;
  atLive.forEach((row, i) => {
    const live = run.live.find((s) => s.t === liveTimes[i]);
    if (!live || live.t < lastStart) return;
    compared++;
    for (const p of parts) {
      const d = Math.abs(row.op[p] - live.op[p]);
      if (d > worstDiff.diff) worstDiff = { diff: r3(d), ms: Math.round(live.t - trigger), part: p, live: r3(live.op[p]), replay: r3(row.op[p]) };
    }
  });

  const toSample = (T, op, progress, src) => ({
    ms: Math.round((T - trigger) * 10) / 10,
    src,
    progress: r3(progress),
    old: { own: r3(op.old), pair: r3(op.pair), group: r3(op.group), vt: r3(op.vt) },
    new: { own: r3(op.new), pair: r3(op.pair), group: r3(op.group), vt: r3(op.vt) },
  });
  const samples = [
    ...replayed.map((r) => toSample(r.T, r.op, r.progress, 'replay')),
    ...run.live.filter((s) => s.t >= from && s.t <= run.finishedAt).map((s) => toSample(s.t, s.op, s.progress, 'live')),
  ].sort((a, b) => a.ms - b.ms);

  // What the browser resolved, per part: the CSS it computed and the
  // animations it actually ran.
  const resolved = {};
  for (const p of parts) {
    const css = run.css?.[p] ?? null;
    const ran = anims
      .filter((a) => a.part === p)
      .map((a) => ({
        name: a.name,
        duration: a.timing.duration,
        delay: a.timing.delay,
        fill: a.timing.fill,
        keyframeEasing: [...new Set(a.keyframes.map((k) => k.easing))].join(' | '),
        startMs: Math.round(a.startTime - trigger),
        properties: [...new Set(a.keyframes.flatMap((k) => Object.keys(k).filter((x) => !['offset', 'computedOffset', 'easing', 'composite'].includes(x))))],
      }));
    resolved[p] = { css, animations: ran };
  }
  // Does the group move? Its keyframes' first and last boxes differ.
  const moveKeys = ['transform', 'width', 'height'];
  const groupAnims = anims.filter((a) => a.part === 'group');
  const ends = (a) => {
    const [f, l] = [a.keyframes[0], a.keyframes[a.keyframes.length - 1]];
    const pickBox = (k) => Object.fromEntries(moveKeys.filter((p) => p in k).map((p) => [p, k[p]]));
    return f && l ? { from: pickBox(f), to: pickBox(l) } : null;
  };
  // Numbers compared to a tenth of a pixel: the browser writes the same
  // height as 48.5469px at one end and 48.547px at the other.
  const nums = (v) => String(v).match(/-?[0-9.]+(e-?[0-9]+)?/g)?.map(Number) ?? [];
  const differs = (a, b) => {
    const [x, y] = [nums(a), nums(b)];
    return x.length !== y.length || x.some((n, i) => Math.abs(n - y[i]) > 0.1);
  };
  const groupMoves = groupAnims.some((a) => {
    const e = ends(a);
    return e && moveKeys.some((k) => k in e.from && differs(e.from[k], e.to[k]));
  });
  const groupPath = groupAnims.map(ends).filter(Boolean);
  const liveGaps = run.live.slice(1).map((s, i) => s.t - run.live[i].t);
  return {
    ok: true,
    ...base,
    samples,
    liveSamples: run.live.length,
    liveMaxGapMs: liveGaps.length ? Math.round(Math.max(...liveGaps)) : null,
    replaySamples: replayed.length,
    replayVsLive: { compared, worst: worstDiff },
    resolved,
    groupAnimates: groupAnims.length > 0,
    groupMoves,
    groupPath,
    error: run.error,
  };
}
