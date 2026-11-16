/**
 * Render one take of BDL-012, the data map: a journey travelling the map,
 * portrait 4:5 for a feed. Writes to out/review/ with a contact sheet, like
 * render-one.mjs, because a take gets looked at before it gets posted.
 *
 *   node scripts/render-bdl-012.mjs                       the "ticket" journey
 *   node scripts/render-bdl-012.mjs --play publish        publish|ticket|game|form
 *   node scripts/render-bdl-012.mjs --seconds 24
 *   node scripts/render-bdl-012.mjs --origin http://localhost:4400
 *
 * How this differs from the BDL-007 loops, and why:
 *
 * 1. It records the page itself, not a harness. The map is a route
 *    (/lab/bdl-012/) and already takes ?play=<journey>, so there is nothing
 *    for a harness to stage. The shot is dressed with CSS injected here: the
 *    Lab chrome and the paragraph above the map come out, and the caption is
 *    enlarged, because at feed size the caption is the only text anyone can
 *    read. None of that CSS exists on the site.
 *
 * 2. It is a take, not a loop. A journey has a beginning and an end, so
 *    loop is false and there is no seam to measure.
 *
 * 3. CSS motion has to be put on the fake clock by hand. lib/capture.mjs
 *    freezes timers and requestAnimationFrame, which is all a WebGL scene
 *    has. This page also moves with CSS transitions, keyframes and
 *    element.animate(), and those run on the compositor's real clock: left
 *    alone, every box would finish lighting up inside a single frame, since a
 *    screenshot takes longer in real time than the transition does. CLOCK_SYNC
 *    below pauses each animation as it appears and sets its currentTime from
 *    performance.now(), which IS the fake clock. It runs from the page's own
 *    rAF, so it steps exactly when the scene does.
 *
 * --origin exists because this take can also be shot from `npm run preview`
 * (the built site, same checkout). The pipeline rule is "current code, never
 * production", and a local build of the working tree keeps it. The default
 * is still the dev server.
 */
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { capture } from '../lib/capture.mjs';
import { encode } from '../lib/encode.mjs';
import { contactSheet, evenIndices } from '../lib/contact.mjs';
import { DEV_ORIGIN, requireDevServer } from '../lib/devserver.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOCIAL_DIR = path.resolve(HERE, '..');
const REVIEW = path.join(SOCIAL_DIR, 'out', 'review');

const argv = process.argv.slice(2);
const arg = (n, d) => {
  const i = argv.indexOf(`--${n}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

// Seconds each journey needs: half a second of lead-in, 3s a step (1.3s of
// travel, 1.7s of hold), then a beat on the closing caption.
const STEPS = { publish: 5, ticket: 6, game: 3, form: 5 };
const PLAY = arg('play', 'ticket');
if (!STEPS[PLAY]) throw new Error(`--play must be one of ${Object.keys(STEPS).join(', ')}`);
const SECONDS = Number(arg('seconds', String(Math.ceil(0.5 + STEPS[PLAY] * 3 + 2.5))));
const ORIGIN = arg('origin', DEV_ORIGIN);
const FPS = 30;
const VIEWPORT = { width: 1080, height: 1350 }; // 4:5
const TAG = `V012-${PLAY}-PT-${SECONDS}s`;

const SHOT_CSS = `
  html { scroll-behavior: auto !important; }
  .hatch, details.label, details.plate,
  #dm-map-section .sec-head, #dm-map-section .sec-intro, #dm-map-section .map-tools { display: none !important; }
  .dm .page { padding-inline: 24px !important; }
  .dm .tour { margin-top: 18px !important; }
  .dm .tour .t-label { display: none !important; }
  .dm .caption { min-height: 132px !important; padding: 18px 24px !important; }
  .dm .caption .c-step { width: 64px !important; height: 64px !important; font-size: 24px !important; }
  .dm .caption .c-text { font-size: 33px !important; line-height: 1.22 !important; }
  .dm .caption .c-text small { font-size: 19px !important; margin-top: 4px; }
  .dm .map-fit { margin-top: 26px !important; }
  /* A take is watched, not operated. The page's captions that tell a visitor
     what to press (the idle prompt before the journey starts, the line under
     the closing caption, the Show everything pill) read as a screen recording
     in a feed, so they come out of the shot. Found by watching the first take
     frame by frame on 11-16-26; the contact sheet had hidden both ends. */
  .dm .tour button.reset { display: none !important; }
  .dm .map-hint, .dm .skip-map, .dm .box-drawer { display: none !important; }
  .dm .caption:not(.shot-live) { visibility: hidden !important; }
  .dm .caption.shot-done .c-text small { display: none !important; }
`;

const DRESS = `(() => {
  const css = ${JSON.stringify(SHOT_CSS)};
  addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style');
    s.textContent = css;
    document.head.appendChild(s);
    // Mark the caption once a journey step is on it, and again on the closing
    // line, so SHOT_CSS can hide the two that are instructions.
    const cap = document.getElementById('dm-caption');
    if (cap) new MutationObserver(() => {
      const mark = cap.querySelector('.c-step')?.textContent ?? '';
      cap.classList.toggle('shot-live', /^[0-9]+$/.test(mark) || mark === '✓');
      cap.classList.toggle('shot-done', mark === '✓');
    }).observe(cap, { childList: true, subtree: true });
  });
})();`;

const CLOCK_SYNC = `(() => {
  const born = new WeakMap();
  const sync = () => {
    const now = performance.now();
    for (const a of document.getAnimations()) {
      if (!born.has(a)) { born.set(a, now); a.pause(); }
      const t = now - born.get(a);
      const end = a.effect ? a.effect.getComputedTiming().endTime : Infinity;
      // Past its end, let it finish for real so it leaves getAnimations().
      if (t >= end) a.finish(); else a.currentTime = t;
    }
    requestAnimationFrame(sync);
  };
  requestAnimationFrame(sync);
})();`;

async function main() {
  if (ORIGIN === DEV_ORIGIN) await requireDevServer();

  const framesDir = path.join(REVIEW, `${TAG}-frames`);
  const outFile = path.join(REVIEW, `${TAG}.mp4`);
  const sheetFile = path.join(REVIEW, `${TAG}-contact.png`);
  await mkdir(REVIEW, { recursive: true });

  console.log(`${TAG}`);
  console.log(`  ${ORIGIN}/lab/bdl-012/?play=${PLAY}`);
  console.log(`  ${VIEWPORT.width}x${VIEWPORT.height}, ${SECONDS}s at ${FPS}fps\n`);

  const shot = await capture({
    url: `${ORIGIN}/lab/bdl-012/?play=${PLAY}`,
    viewport: VIEWPORT,
    fps: FPS,
    seconds: SECONDS,
    framesDir,
    readyFlag: null,
    readySelector: '#dm[data-ready]',
    readyTimeoutMs: 60_000,
    initScripts: [DRESS, CLOCK_SYNC],
    loop: false,
    onProgress: (i, t) => process.stdout.write(`\r  frame ${i}/${t}`),
  });
  process.stdout.write('\r                        \r');

  const enc = await encode({ framesDir, frameCount: shot.frameCount, outFile, fps: FPS, loop: false });
  console.log(`  encoded ${(enc.bytes / 1024 / 1024).toFixed(2)} MB, ${enc.frames} frames`);

  await contactSheet({
    framesDir,
    indices: evenIndices(shot.frameCount, 8),
    outFile: sheetFile,
    cellWidth: 360,
    columns: 4,
  });

  console.log(`\n  video:   ${path.relative(SOCIAL_DIR, outFile)}`);
  console.log(`  contact: ${path.relative(SOCIAL_DIR, sheetFile)}`);
  console.log(`  frames kept in ${path.relative(SOCIAL_DIR, framesDir)}`);
}

await main();
