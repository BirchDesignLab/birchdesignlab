/** Renders one OG card: dark face, bark field, wordmark, optional smallcaps title. */
import { join } from 'node:path';
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import { generateBark } from '../../src/lib/bark/pattern';
import { drawBarkDashes } from '../../src/lib/bark/draw2d';

export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

// Locked dark-face palette.
const BG = '#1c1a17';
const MARK = '#f4f0e6';
const MUTED = '#a89f8f';

// Type treatment knobs.
const WORDMARK = 'BIRCH DESIGN LAB';
const WORDMARK_SIZE = 84;
const WORDMARK_TRACKING = 14;  // px between glyphs, billboard spread
const TITLE_SIZE = 34;
const TITLE_TRACKING = 8;
const TITLE_GAP = 72;          // wordmark baseline to title baseline

GlobalFonts.registerFromPath(
  join(import.meta.dirname, 'fonts', 'Marcellus-Regular.ttf'),
  'Marcellus',
);

/** Manual letterspacing: per-glyph draw keeps output identical across canvas versions. */
function drawTracked(
  ctx: ReturnType<ReturnType<typeof createCanvas>['getContext']>,
  text: string,
  centerX: number,
  baselineY: number,
  tracking: number,
): void {
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + tracking * (text.length - 1);
  let x = centerX - total / 2;
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, x, baselineY);
    x += widths[i] + tracking;
  });
}

export function renderOgCard(seed: number, title: string | null): Buffer {
  const canvas = createCanvas(OG_WIDTH, OG_HEIGHT);
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, OG_WIDTH, OG_HEIGHT);

  drawBarkDashes(ctx, generateBark(seed), MARK, OG_WIDTH, OG_HEIGHT);

  ctx.fillStyle = MARK;
  ctx.textBaseline = 'alphabetic';
  ctx.font = `${WORDMARK_SIZE}px Marcellus`;
  const wordmarkY = title ? OG_HEIGHT / 2 : OG_HEIGHT / 2 + WORDMARK_SIZE * 0.35;
  drawTracked(ctx, WORDMARK, OG_WIDTH / 2, wordmarkY, WORDMARK_TRACKING);

  if (title) {
    ctx.fillStyle = MUTED;
    ctx.font = `${TITLE_SIZE}px Marcellus`;
    drawTracked(ctx, title.toUpperCase(), OG_WIDTH / 2, wordmarkY + TITLE_GAP, TITLE_TRACKING);
  }

  return canvas.toBuffer('image/png');
}
