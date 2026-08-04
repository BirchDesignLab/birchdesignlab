import { describe, it, expect } from 'vitest';
import { renderLogo, renderLogoCanvas, LOGO_SIZE, BG, MARK, DASHES } from '../scripts/og/logo';

const SCALE = LOGO_SIZE / 32;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 0xff, (n >> 8) & 0xff, n & 0xff];
}

function pixelAt(x: number, y: number): [number, number, number, number] {
  const ctx = renderLogoCanvas().getContext('2d');
  const { data } = ctx.getImageData(Math.round(x), Math.round(y), 1, 1);
  return [data[0], data[1], data[2], data[3]];
}

describe('renderLogo', () => {
  it('produces a square PNG at the size Google wants', () => {
    const png = renderLogo();
    expect(png.subarray(1, 4).toString('ascii')).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(LOGO_SIZE);
    expect(png.readUInt32BE(20)).toBe(LOGO_SIZE);
  });

  it('is at least 112px, Google\'s documented minimum', () => {
    expect(LOGO_SIZE).toBeGreaterThanOrEqual(112);
  });

  it('is deterministic', () => {
    expect(renderLogo().equals(renderLogo())).toBe(true);
  });

  it('leaves the rounded corner transparent, not filled with the background color', () => {
    const [r, g, b, a] = pixelAt(2, 2);
    const [bgR, bgG, bgB] = hexToRgb(BG);
    // Nothing is drawn in the rounded-away corner, so it stays fully
    // transparent - proving the corner radius from the favicon survived,
    // rather than the old plain fillRect() that painted it opaque.
    expect(a).toBe(0);
    expect([r, g, b]).not.toEqual([bgR, bgG, bgB]);
  });

  it('fills the background color well inside the square, away from any dash', () => {
    // Pick a point in the top margin: below the rounded corner's influence,
    // above the first dash's y-range, clear of every dash's x-range too.
    const firstDashY = Math.min(...DASHES.map(([, y]) => y));
    const safeX = (16 / 32) * LOGO_SIZE;
    const safeY = (firstDashY / 2 / 32) * LOGO_SIZE;
    const [r, g, b, a] = pixelAt(safeX, safeY);
    const [bgR, bgG, bgB] = hexToRgb(BG);
    expect([r, g, b, a]).toEqual([bgR, bgG, bgB, 255]);
  });

  it('fills the mark color inside a known dash', () => {
    const [x, y, w, h] = DASHES[0];
    const centerX = (x + w / 2) * SCALE;
    const centerY = (y + h / 2) * SCALE;
    const [r, g, b, a] = pixelAt(centerX, centerY);
    const [markR, markG, markB] = hexToRgb(MARK);
    expect([r, g, b, a]).toEqual([markR, markG, markB, 255]);
  });
});
