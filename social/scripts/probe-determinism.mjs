/**
 * BDL-007 determinism probe. Step 1 of the render prompt.
 *
 * Answers three questions with measurements rather than with reading:
 *
 *   1. How is time driven, and does page.clock actually reach it?
 *   2. What still reads real time that the fake clock cannot touch?
 *   3. Where does randomness enter, and is all of it seeded?
 *
 * Then it renders the same 30 frames twice, in two separate browser sessions,
 * and diffs them frame by frame. Two identical runs are the only evidence that
 * matters; everything above is the explanation for the result.
 *
 *   node scripts/probe-determinism.mjs [--variant A] [--framing SQ]
 *
 * Records nothing into out/ that survives: the probe writes to
 * out/.probe/ and leaves the frames there for inspection.
 */
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { capture } from '../lib/capture.mjs';
import { psnr } from '../lib/ffmpeg.mjs';
import { frameName } from '../lib/frames.mjs';
import { currentCommit, requireDevServer } from '../lib/devserver.mjs';
import { resolveRow } from '../render/framing.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const WORK = path.join(SOCIAL_DIR, 'out', '.probe');

const argv = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};

const VARIANT = arg('variant', 'A').toUpperCase();
const FRAMING = arg('framing', 'SQ').toUpperCase();
const PROBE_FRAMES = 30;

/**
 * Instrumentation, injected as a context init script AFTER the seeded
 * Math.random, so it observes the seeded function rather than replacing it.
 *
 * Everything it records lands on window.__BDL_PROBE for read-back.
 */
const INSTRUMENT = `(() => {
  const probe = {
    // --- randomness ---
    mathRandomCalls: 0,
    mathRandomSites: {},          // call site -> count
    cryptoCalls: 0,
    // --- time ---
    perfNowCalls: 0,
    perfNowFirst: null,
    perfNowLast: null,
    dateNowFirst: Date.now(),
    dateNowLast: null,
    rafCallbacks: 0,
    timeoutsSet: 0,
    intervalsSet: 0,
    // --- wall clock, unreachable by page.clock by construction ---
    wallStart: null,
  };
  window.__BDL_PROBE = probe;

  // A real, un-fakeable wall clock reference. If page.clock is working, the
  // page's own performance.now() advances far faster than this does.
  try { probe.wallStart = new Date().toISOString(); } catch {}

  // --- Math.random, with call sites -------------------------------------
  const realRandom = Math.random;
  Math.random = function () {
    probe.mathRandomCalls++;
    // Third stack line is the caller of Math.random.
    const site = (new Error().stack || '').split('\\n')[2] || 'unknown';
    const key = site.trim().replace(/^at\\s+/, '').slice(0, 160);
    probe.mathRandomSites[key] = (probe.mathRandomSites[key] || 0) + 1;
    return realRandom.call(Math);
  };

  // --- crypto entropy ----------------------------------------------------
  if (globalThis.crypto && globalThis.crypto.getRandomValues) {
    const realCrypto = globalThis.crypto.getRandomValues.bind(globalThis.crypto);
    globalThis.crypto.getRandomValues = function (arr) {
      probe.cryptoCalls++;
      return realCrypto(arr);
    };
  }

  // --- performance.now ---------------------------------------------------
  const perf = globalThis.performance;
  if (perf && typeof perf.now === 'function') {
    const realNow = perf.now.bind(perf);
    perf.now = function () {
      const v = realNow();
      probe.perfNowCalls++;
      if (probe.perfNowFirst === null) probe.perfNowFirst = v;
      probe.perfNowLast = v;
      return v;
    };
  }

  // --- Date.now ----------------------------------------------------------
  const realDateNow = Date.now.bind(Date);
  Date.now = function () {
    const v = realDateNow();
    probe.dateNowLast = v;
    return v;
  };

  // --- rAF / timers ------------------------------------------------------
  const realRaf = globalThis.requestAnimationFrame;
  if (typeof realRaf === 'function') {
    globalThis.requestAnimationFrame = function (cb) {
      return realRaf.call(globalThis, function (ts) {
        probe.rafCallbacks++;
        return cb(ts);
      });
    };
  }
  const realTimeout = globalThis.setTimeout;
  globalThis.setTimeout = function (...args) { probe.timeoutsSet++; return realTimeout.apply(globalThis, args); };
  const realInterval = globalThis.setInterval;
  globalThis.setInterval = function (...args) { probe.intervalsSet++; return realInterval.apply(globalThis, args); };
})();`;

/** Read the probe object plus a few scene-visible facts out of the page. */
const READ_BACK = `(() => {
  const p = window.__BDL_PROBE || {};
  const h = window.__BDL_HARNESS || {};
  return {
    probe: {
      mathRandomCalls: p.mathRandomCalls,
      mathRandomSites: p.mathRandomSites,
      cryptoCalls: p.cryptoCalls,
      perfNowCalls: p.perfNowCalls,
      perfNowFirst: p.perfNowFirst,
      perfNowLast: p.perfNowLast,
      dateNowFirst: p.dateNowFirst,
      dateNowLast: p.dateNowLast,
      rafCallbacks: p.rafCallbacks,
      timeoutsSet: p.timeoutsSet,
      intervalsSet: p.intervalsSet,
      wallStart: p.wallStart,
    },
    harness: {
      drawCalls: h.drawCalls,
      modelReady: h.modelReady,
      fontsReady: h.fontsReady,
      firstDrawAt: h.firstDrawAt,
      rafCallbacks: h.rafCallbacks,
      contexts: (h.contexts || []).length,
    },
    ready: window.__BDL_READY === true,
    error: window.__BDL_ERROR || null,
    devicePixelRatio: window.devicePixelRatio,
    reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches,
    // Wall clock at read-back, to compare against the page's own perf clock.
    wallEnd: new Date().toISOString(),
  };
})()`;

async function runOnce(label, row) {
  const framesDir = path.join(WORK, label);
  let readBack = null;

  const result = await capture({
    url: row.url,
    viewport: row.viewport,
    deviceScaleFactor: row.deviceScaleFactor,
    fps: row.fps,
    timeScale: row.timeScale,
    seconds: PROBE_FRAMES / row.fps,
    settleFrames: row.settle,
    framesDir,
    readyFlag: row.readyFlag ?? undefined,
    readySelector: row.readySelector ?? undefined,
    stageFn: row.stageFn ?? undefined,
    readyTimeoutMs: 60_000,
    loop: false,
    initScripts: [INSTRUMENT],
    onFrame: async (page, i, total) => {
      if (row.variant === 'C') {
        await page.evaluate((f) => window.__BDL_ORBIT?.(f), i / total);
      }
      if (i === PROBE_FRAMES - 1) {
        readBack = await page.evaluate(READ_BACK);
      }
    },
  });

  return { ...result, readBack };
}

function topSites(sites = {}, n = 8) {
  return Object.entries(sites)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n);
}

async function main() {
  console.log(`probe: BDL-007 variant ${VARIANT}, framing ${FRAMING}\n`);

  await requireDevServer();
  const commit = await currentCommit();
  console.log(`dev server up at http://localhost:4321 (commit ${commit?.slice(0, 8) ?? 'unknown'})\n`);

  const row = resolveRow({
    id: 'PROBE', variant: VARIANT, kind: 'harness', framing: FRAMING,
    fps: 30, seconds: 8, loop: true,
  });

  console.log(`url: ${row.url}`);
  console.log(
    `viewport ${row.viewport.width}x${row.viewport.height} @ dSF ${row.deviceScaleFactor} ` +
      `-> frames ${row.captureSize.width}x${row.captureSize.height} -> output ${row.output.width}x${row.output.height}`
  );
  console.log(`duration target ${row.seconds}s -> ${row.seconds}s (${''})\n`);

  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });

  console.log(`run A: ${PROBE_FRAMES} frames...`);
  const a = await runOnce('run-a', row);
  console.log(`run B: ${PROBE_FRAMES} frames (fresh browser, fresh context)...`);
  const b = await runOnce('run-b', row);

  if (a.readBack?.error) console.log(`\n!! run A reported: ${JSON.stringify(a.readBack.error)}`);
  if (b.readBack?.error) console.log(`\n!! run B reported: ${JSON.stringify(b.readBack.error)}`);

  // --- frame-by-frame diff ------------------------------------------------
  console.log(`\ndiffing ${PROBE_FRAMES} frame pairs...`);
  const diffs = [];
  for (let i = 0; i < PROBE_FRAMES; i++) {
    const fa = path.join(WORK, 'run-a', frameName(i));
    const fb = path.join(WORK, 'run-b', frameName(i));
    diffs.push({ frame: i, psnr: await psnr(fa, fb) });
  }

  const identical = diffs.filter((d) => d.psnr === Infinity).length;
  const worst = diffs
    .filter((d) => d.psnr !== Infinity)
    .sort((x, y) => x.psnr - y.psnr)[0];

  // Bit-identity is the ideal and usually achieved, but the GPU is entitled to
  // round the last bit differently between processes. A frame pair above
  // VISUALLY_IDENTICAL_DB differs by about one least-significant bit on a
  // handful of pixels: it is not scene state drifting, and it survives the H.264
  // encode as literally the same output. Below it, something real has moved.
  const VISUALLY_IDENTICAL_DB = 50;
  const visuallySame = diffs.filter((d) => d.psnr >= VISUALLY_IDENTICAL_DB).length;

  const report = {
    generated_at: new Date().toISOString(),
    commit,
    variant: VARIANT,
    framing: FRAMING,
    url: row.url,
    frames_compared: PROBE_FRAMES,
    identical_frames: identical,
    worst_frame: worst ?? null,
    diffs,
    run_a: a.readBack,
    run_b: b.readBack,
  };
  await writeFile(path.join(WORK, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');

  // --- print --------------------------------------------------------------
  const pa = a.readBack?.probe ?? {};
  const pb = b.readBack?.probe ?? {};

  console.log('\n=== TIME ===');
  for (const [label, p, r] of [['run A', pa, a.readBack], ['run B', pb, b.readBack]]) {
    const perfSpan = (p.perfNowLast ?? 0) - (p.perfNowFirst ?? 0);
    const dateSpan = (p.dateNowLast ?? 0) - (p.dateNowFirst ?? 0);
    const wallSpan = r?.wallEnd && p.wallStart ? (Date.parse(r.wallEnd) - Date.parse(p.wallStart)) : null;
    console.log(
      `  ${label}: performance.now span ${perfSpan.toFixed(1)}ms over ${p.perfNowCalls} calls | ` +
        `Date.now span ${dateSpan}ms | real wall ${wallSpan}ms | rAF callbacks ${r?.harness?.rafCallbacks}`
    );
  }

  console.log('\n=== RANDOMNESS ===');
  for (const [label, p] of [['run A', pa], ['run B', pb]]) {
    console.log(`  ${label}: Math.random x${p.mathRandomCalls}, crypto.getRandomValues x${p.cryptoCalls}`);
    for (const [site, n] of topSites(p.mathRandomSites)) {
      console.log(`      ${n.toString().padStart(5)}  ${site}`);
    }
  }

  console.log('\n=== HARNESS ===');
  for (const [label, r] of [['run A', a.readBack], ['run B', b.readBack]]) {
    const h = r?.harness ?? {};
    console.log(
      `  ${label}: ready=${r?.ready} model=${h.modelReady} fonts=${h.fontsReady} ` +
        `contexts=${h.contexts} drawCalls=${h.drawCalls} dpr=${r?.devicePixelRatio} reducedMotion=${r?.reducedMotion}`
    );
  }

  console.log('\n=== DOUBLE-RENDER DIFF ===');
  console.log(`  ${identical}/${PROBE_FRAMES} frame pairs bit-identical`);
  console.log(`  ${visuallySame}/${PROBE_FRAMES} frame pairs at or above ${VISUALLY_IDENTICAL_DB}dB`);
  if (worst) {
    console.log(`  worst pair: frame ${worst.frame} at ${worst.psnr.toFixed(2)}dB`);
    const below = diffs.filter((d) => d.psnr < VISUALLY_IDENTICAL_DB);
    if (below.length) {
      console.log(`  BELOW THRESHOLD: frames ${below.map((d) => d.frame).join(', ')}`);
      console.log('  a frame below the threshold means scene state drifted, not GPU rounding.');
    }
  }

  const deterministic = visuallySame === PROBE_FRAMES;
  console.log(`\n  VERDICT: ${deterministic ? 'DETERMINISTIC' : 'NOT DETERMINISTIC'}`);
  console.log(`\nfull report: ${path.relative(SOCIAL_DIR, path.join(WORK, 'report.json'))}`);

  process.exit(deterministic ? 0 : 2);
}

await main();
