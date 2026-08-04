import { describe, it, expect } from 'vitest';
import { renderLogo, LOGO_SIZE } from '../scripts/og/logo';

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
});
