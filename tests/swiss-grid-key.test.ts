import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const key = readFileSync('src/themes/swiss/GridKey.astro', 'utf8');
const header = readFileSync('src/themes/swiss/Header.astro', 'utf8');
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
  it('starts hidden and is mounted by the header, not the footer', () => {
    expect(key).toMatch(/data-sw-guides hidden/);
    expect(header).toContain('<GridKey />');
    expect(header.indexOf('<GridKey />')).toBeLessThan(header.indexOf('</header>'));
    expect(footer).not.toContain('GridKey');
  });
  it('the key itself is never fixed, so it cannot meet the portal switcher', () => {
    const rule = key.slice(key.indexOf('.grid-key {'), key.indexOf('}', key.indexOf('.grid-key {')));
    expect(rule).not.toMatch(/position:\s*fixed/);
  });
  it('G held anywhere shows the grid, except while typing', () => {
    expect(key).toMatch(/e\.key === 'g' \|\| e\.key === 'G'/);
    expect(key).toMatch(/INPUT\|TEXTAREA\|SELECT/);
    expect(key).toContain("document.addEventListener('keydown', gDown)");
    expect(key).toContain("document.addEventListener('keyup', gUp)");
  });
  it('draws hairlines at the column edges and a baseline on every line', () => {
    expect(key).toMatch(/\.guides span \{ border-inline: 1px solid/);
    expect(key).toMatch(/repeating-linear-gradient\(180deg/);
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
