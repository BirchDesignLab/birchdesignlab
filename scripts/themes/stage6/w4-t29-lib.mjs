/**
 * Stage 6 wave 4, task 29: shared launcher and helpers for the task's evidence
 * scripts (swiss and vaporwave closing B). It is w4-t28-lib with its own
 * output folder, plus touch helpers over CDP (a held finger, a swipe at an
 * angle) and a pixel reader. GPU Chromium (d3d11, renderer checked), reduced
 * transparency forced to no-preference, the portal prompt suppressed.
 * SNAP_BASE (set by snap.mjs) picks the server, default http://127.0.0.1:4470.
 * Output: scripts/themes/.out/stage6/w4/t29/ (gitignored scratch).
 */
import { mkdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, loadImage } from '@napi-rs/canvas';
export * from './w4-t28-lib.mjs';

export const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '.out', 'stage6', 'w4', 't29');
await mkdir(OUT, { recursive: true });

/** One finger, held: start, then the caller waits, then end. CDP touch events become real pointer events (pointerType touch). */
export async function touchStart(cdp, x, y, id = 1) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id }] });
}
export async function touchMove(cdp, x, y, id = 1) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x, y, id }] });
}
export async function touchEnd(cdp) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

/** A swipe of `len` px at `deg` degrees above the horizontal (0 is a flat swipe, 90 is straight up), in `steps` moves, 16 ms apart. */
export async function swipe(page, cdp, x, y, deg, len = 120, steps = 12) {
  const dx = Math.cos((deg * Math.PI) / 180) * len;
  const dy = -Math.sin((deg * Math.PI) / 180) * len;
  await touchStart(cdp, x, y);
  for (let i = 1; i <= steps; i++) {
    await touchMove(cdp, x + (dx * i) / steps, y + (dy * i) / steps);
    await page.waitForTimeout(16);
  }
  await touchEnd(cdp);
}

/** Pixels of a PNG buffer, read at (x, y) device pixels. */
export async function pixelReader(png) {
  const img = await loadImage(png);
  const c = createCanvas(img.width, img.height);
  const g = c.getContext('2d');
  g.drawImage(img, 0, 0);
  const data = g.getImageData(0, 0, img.width, img.height).data;
  return {
    width: img.width,
    height: img.height,
    at(x, y) {
      if (x < 0 || y < 0 || x >= img.width || y >= img.height) return [0, 0, 0];
      const i = (Math.round(y) * img.width + Math.round(x)) * 4;
      return [data[i], data[i + 1], data[i + 2]];
    },
  };
}

export const hex = (rgb) => `#${rgb.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
/** Distance between two rgb triples (max channel difference). */
export const near = (a, b, tol = 12) => a.every((v, i) => Math.abs(v - b[i]) <= tol);
