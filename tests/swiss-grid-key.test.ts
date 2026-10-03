import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const key = readFileSync('src/themes/swiss/GridKey.astro', 'utf8');
const footer = readFileSync('src/themes/swiss/Footer.astro', 'utf8');
const css = readFileSync('src/themes/swiss/theme.css', 'utf8');

describe('swiss grid key', () => {
  it('is a real button with an aria-label and no visible text', () => {
    expect(key).toMatch(/<button[^>]*type="button"[^>]*aria-label="[^"]+"[^>]*><\/button>/);
  });
  it('holds on pointer and on Space or Enter, and lets go on release or blur', () => {
    for (const ev of ['pointerdown', 'pointerup', 'pointercancel', 'keydown', 'keyup', 'blur']) expect(key).toContain(`'${ev}'`);
    expect(key).toMatch(/e\.key !== ' ' && e\.key !== 'Enter'/);
  });
  it('starts hidden and is mounted by the footer', () => {
    expect(key).toMatch(/data-sw-guides hidden/);
    expect(footer).toContain('<GridKey />');
  });
  it('sits in the footer flow, never fixed, so it cannot meet the portal switcher', () => {
    const rule = key.slice(key.indexOf('.grid-key {'), key.indexOf('}', key.indexOf('.grid-key {')));
    expect(rule).not.toMatch(/position:\s*fixed/);
    expect(footer.indexOf('<GridKey />')).toBeLessThan(footer.indexOf('</footer>'));
  });
  it('shows 12, 6 or 4 guides to match the school columns', () => {
    expect(key).toContain('repeat(var(--cols)');
    expect(key).toContain('nth-child(n + 7)');
    expect(key).toContain('nth-child(n + 5)');
  });
});

describe('swiss button rule', () => {
  it('is two lines tall with its label on the lower line', () => {
    const block = css.slice(css.indexOf(".sw-btn {"));
    expect(block).toMatch(/align-items: flex-end/);
    expect(block).toMatch(/min-height: calc\(var\(--u\) \* 2\)/);
  });
});
