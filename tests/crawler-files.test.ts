import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/** Crawler housekeeping (11-22-26 quick wins): /favicon.ico and
    /.well-known/security.txt, both static files under public/. */
describe('favicon.ico', () => {
  const ico = readFileSync('public/favicon.ico');
  it('is an icon file holding 16, 32 and 48 px PNG frames', () => {
    expect(ico.readUInt16LE(2)).toBe(1); // type: icon
    const n = ico.readUInt16LE(4);
    const sizes = Array.from({ length: n }, (_, i) => ico.readUInt8(6 + 16 * i));
    expect(sizes).toEqual([16, 32, 48]);
    const first = ico.readUInt32LE(6 + 12);
    expect(ico.subarray(first, first + 4).toString('latin1')).toBe('\x89PNG');
  });
});

describe('security.txt', () => {
  const txt = readFileSync('public/.well-known/security.txt', 'utf8');
  it('points at the contact page, not a personal address', () => {
    expect(txt).toMatch(/^Contact: https:\/\/birchdesignlab\.com\/contact\/$/m);
    expect(txt).not.toMatch(/@/);
  });
  it('has not expired (RFC 9116 requires Expires; renew it yearly when this fails)', () => {
    const m = txt.match(/^Expires: (.+)$/m);
    expect(m).not.toBeNull();
    expect(new Date(m![1]).getTime()).toBeGreaterThan(Date.now());
  });
});
