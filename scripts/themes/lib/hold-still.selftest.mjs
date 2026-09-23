/**
 * Proof that hold-still.mjs tells a switcher that held still from one that
 * rode the transition, on synthetic frames. Run it after touching the
 * thresholds:
 *   node scripts/themes/lib/hold-still.selftest.mjs
 *
 * Written 09-23-26 for Tier 3 stage 1 (portal.md P1). Each frame is drawn
 * like the real switcher (dark buttons, 1px translucent seams, a muted
 * kicker, a label, icons) over a page background, then passed through JPEG
 * at the screencast's quality (82), the same noise motion.mjs sees. The bar
 * is judged against two references, before (Quiet) and after (a longer
 * label, placed elsewhere, as on a phone where the bar is centred). Runs at
 * 1x (desktop) and 2x (the mobile viewport's device scale).
 */
import { createCanvas, loadImage } from '@napi-rs/canvas';
import { HOLD_STILL, toPixels, judgeHoldStill } from './hold-still.mjs';

const W = 900;
const H = 160;
const INK = '#f4f0e6';
const MUTED = '#b3ab9b';
const BG = '#1c1a17';
const LINE = 'rgba(244, 240, 230, 0.2)';

/** The three pages a bar can sit over: quiet charcoal, vaporwave navy with
    neon lines, grandmillennial green with serif text. Lines run under the
    bar so its seams show a different page in every frame. */
const PAGES = {
  quiet(ctx) {
    ctx.fillStyle = '#16140f';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#8a8478';
    for (let i = 0; i < 12; i++) ctx.fillRect(40 + i * 70, 30 + (i % 3) * 40, 44, 4);
  },
  vapor(ctx) {
    ctx.fillStyle = '#07011a';
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = '#18e0ff';
    ctx.lineWidth = 2;
    for (let i = -4; i < 14; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 80, 0);
      ctx.lineTo(i * 80 + 160, H);
      ctx.stroke();
    }
  },
  green(ctx) {
    ctx.fillStyle = '#12301f';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#c9c0a8';
    ctx.font = '28px serif';
    for (let y = 30; y < H; y += 36) ctx.fillText('businesses across the Mississippi Gulf Coast', 10, y);
  },
};

/** The bar's buttons in CSS px, laid out right to left from `right`. */
function layout(label, right, top) {
  const widths = [60 + label.length * 9, 96, 80, 80];
  const boxes = [];
  let x = right;
  for (let i = widths.length - 1; i >= 0; i--) {
    x -= widths[i];
    boxes.unshift({ x, y: top, w: widths[i], h: 44 });
    x -= 1; // the seam
  }
  return boxes;
}

function drawBar(ctx, label, boxes) {
  const first = boxes[0];
  const last = boxes[boxes.length - 1];
  ctx.fillStyle = LINE;
  ctx.fillRect(first.x - 1, first.y - 1, last.x + last.w - first.x + 2, first.h + 2);
  boxes.forEach((b, i) => {
    ctx.fillStyle = BG;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.fillStyle = INK;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.8;
    ctx.font = '600 13px sans-serif';
    ctx.textBaseline = 'middle';
    if (i === 0) {
      ctx.fillStyle = MUTED;
      ctx.font = '500 11px sans-serif';
      ctx.fillText('SCHOOL', b.x + 14, b.y + 22);
      ctx.fillStyle = INK;
      ctx.font = '600 13px sans-serif';
      ctx.fillText(label, b.x + 70, b.y + 22);
      ctx.beginPath();
      ctx.moveTo(b.x + b.w - 22, b.y + 19);
      ctx.lineTo(b.x + b.w - 14, b.y + 19);
      ctx.lineTo(b.x + b.w - 18, b.y + 25);
      ctx.fill();
    } else {
      // An icon (a stroked square with a diagonal) and a word.
      ctx.strokeRect(b.x + 14, b.y + 14, 16, 16);
      ctx.beginPath();
      ctx.moveTo(b.x + 14, b.y + 30);
      ctx.lineTo(b.x + 30, b.y + 14);
      ctx.stroke();
      ctx.fillText(['', 'Shuffle', 'Dark', 'Leave'][i], b.x + 38, b.y + 22);
    }
  });
}

/** One frame: a page, then the bar however this frame shows it, through JPEG. */
async function frame(k, page, paint) {
  const canvas = createCanvas(W * k, H * k);
  const ctx = canvas.getContext('2d');
  ctx.scale(k, k);
  PAGES[page](ctx);
  paint?.(ctx, k);
  const jpeg = await loadImage(await canvas.encode('jpeg', 82));
  const out = createCanvas(W * k, H * k);
  const octx = out.getContext('2d');
  octx.drawImage(jpeg, 0, 0);
  return octx.getImageData(0, 0, W * k, H * k);
}

const BEFORE = layout('Quiet', 860, 60);
const AFTER = layout('Grandmillennial', 780, 60);

/** A transform about the bar's centre, for the scaled and tilted cases. */
function about(ctx, boxes, fn) {
  const first = boxes[0];
  const last = boxes[boxes.length - 1];
  const cx = (first.x + last.x + last.w) / 2;
  const cy = first.y + first.h / 2;
  ctx.translate(cx, cy);
  fn(ctx);
  ctx.translate(-cx, -cy);
}

const CASES = [
  // Held still: one of the two pictures, over any page.
  { name: 'before, same page', page: 'quiet', want: true, paint: (c) => drawBar(c, 'Quiet', BEFORE) },
  { name: 'before, page changed under the seams', page: 'vapor', want: true, paint: (c) => drawBar(c, 'Quiet', BEFORE) },
  { name: 'after, over the new page', page: 'green', want: true, paint: (c) => drawBar(c, 'Grandmillennial', AFTER) },
  { name: 'after, over a busier page', page: 'vapor', want: true, paint: (c) => drawBar(c, 'Grandmillennial', AFTER) },
  {
    name: 'after, snapshot placed one frame pixel off',
    page: 'green',
    want: true,
    paint: (c, k) => drawBar(c, 'Grandmillennial', AFTER.map((b) => ({ ...b, x: b.x + 1 / k, y: b.y - 1 / k }))),
  },
  // Moved: anything else.
  { name: 'missing (vaporwave +480 ms)', page: 'vapor', want: false },
  {
    name: 'ghosted, half faded',
    page: 'vapor',
    want: false,
    paint: (c) => { c.globalAlpha = 0.5; drawBar(c, 'Grandmillennial', AFTER); c.globalAlpha = 1; },
  },
  {
    name: 'faded to 85%',
    page: 'green',
    want: false,
    paint: (c) => { c.globalAlpha = 0.85; drawBar(c, 'Grandmillennial', AFTER); c.globalAlpha = 1; },
  },
  {
    name: 'scaled to 97%',
    page: 'green',
    want: false,
    paint: (c) => { c.save(); about(c, AFTER, (x) => x.scale(0.97, 0.97)); drawBar(c, 'Grandmillennial', AFTER); c.restore(); },
  },
  {
    name: 'tilted 1 degree (cottagecore +400 ms)',
    page: 'green',
    want: false,
    paint: (c) => { c.save(); about(c, AFTER, (x) => x.rotate(Math.PI / 180)); drawBar(c, 'Grandmillennial', AFTER); c.restore(); },
  },
  {
    name: 'blurred 1.5px (glassmorphism)',
    page: 'green',
    want: false,
    paint: (c) => { c.filter = 'blur(1.5px)'; drawBar(c, 'Grandmillennial', AFTER); c.filter = 'none'; },
  },
  {
    name: 'sliced by a wipe, old left and new right (grandmillennial mobile)',
    page: 'green',
    want: false,
    paint: (c) => {
      drawBar(c, 'Grandmillennial', AFTER);
      c.save();
      c.beginPath();
      c.rect(0, 0, 640, H);
      c.clip();
      PAGES.quiet(c);
      drawBar(c, 'Quiet', BEFORE);
      c.restore();
    },
  },
  {
    name: 'clipped, one button gone',
    page: 'green',
    want: false,
    paint: (c) => {
      drawBar(c, 'Grandmillennial', AFTER);
      const b = AFTER[3];
      c.fillStyle = '#12301f';
      c.fillRect(b.x, b.y, b.w, b.h);
    },
  },
  {
    name: 'one icon half wiped (grandmillennial mobile +240 ms)',
    page: 'quiet',
    want: false,
    paint: (c) => {
      drawBar(c, 'Quiet', BEFORE);
      const b = BEFORE[1];
      c.fillStyle = BG;
      c.fillRect(b.x + 12, b.y + 10, 12, 24);
    },
  },
];

let failures = 0;
for (const k of [1, 2]) {
  const before = await frame(k, 'quiet', (c) => drawBar(c, 'Quiet', BEFORE));
  const after = await frame(k, 'green', (c) => drawBar(c, 'Grandmillennial', AFTER));
  const refs = [
    { img: before, boxes: toPixels(BEFORE, k) },
    { img: after, boxes: toPixels(AFTER, k) },
  ];
  console.log(`${k}x (a button differs above ${HOLD_STILL.cell * 100}% of its pixels)`);
  for (const c of CASES) {
    const img = await frame(k, c.page, c.paint);
    const { stable, worst } = judgeHoldStill([{ ms: 0, img }], refs);
    const ok = stable === c.want;
    if (!ok) failures++;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${stable ? 'still' : 'moved'}  ${(worst.score * 100).toFixed(1).padStart(5)}%  ${c.name}`);
  }
  // A whole strip: still frames around one bad one, which the judge names.
  const strip = [
    { ms: -1, img: before },
    { ms: 80, img: await frame(k, 'vapor', (c) => drawBar(c, 'Quiet', BEFORE)) },
    { ms: 480, img: await frame(k, 'vapor') },
    { ms: 640, img: await frame(k, 'green', (c) => drawBar(c, 'Grandmillennial', AFTER)) },
  ];
  const verdict = judgeHoldStill(strip, refs);
  const ok = !verdict.stable && verdict.worst.ms === 480;
  if (!ok) failures++;
  console.log(`  ${ok ? 'ok  ' : 'FAIL'} strip: stable ${verdict.stable}, worst +${verdict.worst.ms} ms`);
}
console.log(failures ? `${failures} case(s) wrong` : 'all cases right');
process.exitCode = failures ? 1 : 0;
