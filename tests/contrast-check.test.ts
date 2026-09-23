import { describe, it, expect } from 'vitest';
import {
  parseTokenBlocks,
  tokensFor,
  resolveColor,
  composite,
  contrastRatio,
  checkTheme,
  REQUIRED_PAIRS,
  themeCssPath,
  type RGBA,
} from '../src/lib/contrast';
import { hexToOklch } from '../src/lib/oklch';

const WHITE: RGBA = [255, 255, 255, 1];
const BLACK: RGBA = [0, 0, 0, 1];
const none = {};

describe('contrastRatio', () => {
  it('matches known WCAG ratios', () => {
    expect(contrastRatio(BLACK, [WHITE])).toBeCloseTo(21, 5);
    expect(+contrastRatio([0, 0, 255, 1], [BLACK]).toFixed(2)).toBe(2.44);
    expect(+contrastRatio([255, 255, 0, 1], [WHITE]).toFixed(2)).toBe(1.07);
  });

  it('composites translucent text over the background first', () => {
    // 50% black over white paints mid grey, not black.
    expect(contrastRatio([0, 0, 0, 0.5], [WHITE])).toBeLessThan(5);
  });
});

describe('resolveColor', () => {
  it('reads hex in all four lengths', () => {
    expect(resolveColor('#fff', none)).toEqual([255, 255, 255, 1]);
    expect(resolveColor('#f008', none)).toEqual([255, 0, 0, 0x88 / 255]);
    expect(resolveColor('#1c1a17', none)).toEqual([28, 26, 23, 1]);
    expect(resolveColor('#1C1A1780', none)).toEqual([28, 26, 23, 128 / 255]);
  });

  it('reads rgb() in comma and space syntax, with alpha and percentages', () => {
    expect(resolveColor('rgb(10, 20, 30)', none)).toEqual([10, 20, 30, 1]);
    expect(resolveColor('rgba(10, 20, 30, 0.5)', none)).toEqual([10, 20, 30, 0.5]);
    expect(resolveColor('rgb(10 20 30 / 25%)', none)).toEqual([10, 20, 30, 0.25]);
    expect(resolveColor('rgb(100% 0% 50%)', none)).toEqual([255, 0, 127.5, 1]);
  });

  it('reads hsl()', () => {
    const [r, g, b] = resolveColor('hsl(120, 100%, 25%)', none);
    expect([r, g, b].map(Math.round)).toEqual([0, 128, 0]);
    const [r2, g2, b2, a2] = resolveColor('hsl(0.5turn 100% 50% / 0.4)', none);
    expect([r2, g2, b2].map(Math.round)).toEqual([0, 255, 255]);
    expect(a2).toBe(0.4);
  });

  it('round-trips oklch() through src/lib/oklch.ts', () => {
    for (const hex of ['#a3bd8f', '#2b4a37', '#f5f1e8', '#1c1a17']) {
      const { l, c, h } = hexToOklch(hex);
      const [r, g, b] = resolveColor(`oklch(${l * 100}% ${c} ${h})`, none);
      const back = '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
      expect(back).toBe(hex);
      expect(resolveColor(`oklch(${l} ${c} ${h}deg / 50%)`, none)[3]).toBe(0.5);
    }
  });

  it('mixes in srgb with CSS default percentages', () => {
    const [r, g, b, a] = resolveColor('color-mix(in srgb, #000 50%, #fff)', none);
    expect([r, g, b]).toEqual([127.5, 127.5, 127.5]);
    expect(a).toBe(1);
    // Mixing with transparent fades, it does not darken: premultiplied alpha.
    expect(resolveColor('color-mix(in srgb, #f4f0e6 18%, transparent)', none)).toEqual([244, 240, 230, 0.18]);
    // Percentages under 100 in total scale the alpha.
    expect(resolveColor('color-mix(in srgb, #000 20%, #fff 20%)', none)[3]).toBeCloseTo(0.4, 10);
  });

  it('mixes in oklch', () => {
    const [r, g, b] = resolveColor('color-mix(in oklch, #000, #fff)', none);
    // Perceptual midpoint sits lighter than the sRGB one.
    expect(r).toBe(g);
    expect(g).toBe(b);
    expect(r).toBeGreaterThan(90);
    expect(r).toBeLessThan(120);
  });

  it('follows var() chains and fallbacks', () => {
    const tokens = { '--a': 'var(--b)', '--b': 'var(--c)', '--c': '#123456' };
    expect(resolveColor('var(--a)', tokens)).toEqual([0x12, 0x34, 0x56, 1]);
    expect(resolveColor('var(--nope, var(--c))', tokens)).toEqual([0x12, 0x34, 0x56, 1]);
    expect(resolveColor('var(--nope, #fff)', tokens)).toEqual(WHITE);
    expect(resolveColor('color-mix(in srgb, var(--c) 50%, var(--c))', tokens)).toEqual([0x12, 0x34, 0x56, 1]);
  });

  it('throws on a var() cycle, naming the chain', () => {
    const tokens = { '--a': 'var(--b)', '--b': 'var(--a)' };
    expect(() => resolveColor('var(--a)', tokens)).toThrow('--a -> --b -> --a');
  });

  it('throws naming a missing token and an unsupported value', () => {
    expect(() => resolveColor('var(--gone)', none)).toThrow('--gone');
    expect(() => resolveColor('lab(50% 20 20)', none)).toThrow('lab(50% 20 20)');
    expect(() => resolveColor('rebeccapurple', none)).toThrow('rebeccapurple');
  });
});

describe('composite', () => {
  it('lays transparent over the field and gets the field', () => {
    expect(composite([[0, 0, 0, 0], [28, 26, 23, 1]])).toEqual([28, 26, 23]);
  });

  it('blends a translucent layer', () => {
    expect(composite([[255, 255, 255, 0.5], BLACK])).toEqual([127.5, 127.5, 127.5]);
  });

  it('throws when the bottom layer is not opaque', () => {
    expect(() => composite([BLACK, [255, 255, 255, 0.5]])).toThrow(/opaque/);
    expect(() => composite([])).toThrow();
  });
});

describe('parseTokenBlocks', () => {
  it('keeps top-level rules and skips at-rule blocks whole', () => {
    const blocks = parseTokenBlocks(`
      /* a comment with { braces } */
      @import url('x.css');
      :root, :root[data-scheme='dark'] { --a: #000; color-scheme: dark; --m: color-mix(in srgb, var(--a) 50%, #fff); }
      @media (prefers-color-scheme: light) { html:not(.js) { --a: #fff; } }
      @font-face { font-family: X; src: url('x;y.woff2'); }
      html { --b: #111 }
    `);
    expect(blocks.map((b) => b.selectors)).toEqual([[':root', ":root[data-scheme='dark']"], ['html']]);
    expect(blocks[0].decls).toEqual({
      '--a': '#000',
      'color-scheme': 'dark',
      '--m': 'color-mix(in srgb, var(--a) 50%, #fff)',
    });
    expect(blocks.map((b) => b.order)).toEqual([0, 1]);
  });
});

describe('tokensFor', () => {
  const css = `
    :root { --x: bare; --only-root: yes; }
    :root[data-scheme='light'] { --x: light; }
    :root[data-theme='vapor'] { --x: theme; --y: theme; }
    html[data-theme="vapor"][data-scheme=light] { --y: theme-light; }
    @media (prefers-color-scheme: light) { :root { --x: media; } }
    html :root { --x: descendant; }
    html:not(.js) { --x: nojs; }
    .other { --x: other; }
    html.js { --z: js; }
  `;
  const blocks = parseTokenBlocks(css);

  it('lets the scheme block beat bare :root', () => {
    expect(tokensFor(blocks, { scheme: 'light' })['--x']).toBe('light');
    expect(tokensFor(blocks, { scheme: 'dark' })['--x']).toBe('bare');
  });

  it('lets theme+scheme beat theme-only, and theme beat the scheme block on source order', () => {
    const t = tokensFor(blocks, { theme: 'vapor', scheme: 'light' });
    expect(t['--y']).toBe('theme-light');
    expect(t['--x']).toBe('theme');
    expect(tokensFor(blocks, { theme: 'vapor', scheme: 'dark' })['--y']).toBe('theme');
  });

  it('ignores @media blocks, descendants, :not() and other classes', () => {
    const t = tokensFor(blocks, { scheme: 'dark' });
    expect(t['--x']).toBe('bare');
    expect(t['--only-root']).toBe('yes');
    expect(t['--z']).toBe('js');
  });

  it('does not apply another theme\'s blocks', () => {
    expect(tokensFor(blocks, { theme: 'other', scheme: 'light' })['--y']).toBeUndefined();
  });
});

describe('checkTheme', () => {
  it('reports a missing token as a failing row, not a throw', () => {
    const css = `:root { --field: #fff; --field-raised: #eee; --mark: #000; --mark-muted: #333;
      --link: #00e; --accent: #060; --on-accent: #fff; }`;
    const rows = checkTheme(css, { id: 'test', contrast: [{ fg: '--ghost', bg: ['--field'], min: 4.5 }] });
    expect(rows).toHaveLength((REQUIRED_PAIRS.length + 1) * 2);
    const ghost = rows.filter((r) => r.pair.fg === '--ghost');
    expect(ghost).toHaveLength(2);
    for (const r of ghost) {
      expect(r.ok).toBe(false);
      expect(r.error).toMatch('--ghost');
    }
    expect(rows.filter((r) => r.pair.fg !== '--ghost').every((r) => r.ok)).toBe(true);
  });

  it('turns unparseable CSS into failing rows', () => {
    const rows = checkTheme(':root { --field: #fff;', { id: 'broken' });
    expect(rows.every((r) => !r.ok && r.error)).toBe(true);
  });
});

describe('themeCssPath', () => {
  it('points quiet at the house tokens and other schools at their theme.css', () => {
    expect(themeCssPath('quiet')).toBe('src/styles/tokens.css');
    expect(themeCssPath('vaporwave')).toBe('src/themes/vaporwave/theme.css');
  });
});
