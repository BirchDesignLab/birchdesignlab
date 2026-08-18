import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'assets', 'brand');
const TOKENS = join(process.cwd(), 'src', 'styles', 'tokens.css');

function svgFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return svgFiles(p);
    return name.endsWith('.svg') ? [p] : [];
  });
}

/**
 * The palette, read from the stylesheet rather than copied into this file.
 * An earlier version of this test hardcoded two hexes and went stale the
 * moment a day/night mark pair arrived using bark-white and charcoal: the
 * assets were correct and on-palette, and the test called them broken.
 */
function brandHexes(): Set<string> {
  const css = readFileSync(TOKENS, 'utf8');
  return new Set(
    [...css.matchAll(/^\s*--[\w-]+:\s*(#[0-9a-f]{3,8});/gim)].map((m) =>
      m[1].toLowerCase(),
    ),
  );
}

/** Every colour an SVG paints with, however it is applied. */
function paintedColors(svg: string): string[] {
  const attrs = [
    ...svg.matchAll(/(?:fill|stroke|stop-color)="([^"]+)"/g),
  ].map((m) => m[1].toLowerCase());
  return attrs.filter((c) => c !== 'none' && !c.startsWith('url('));
}

const MOSS = '#a3bd8f';

/**
 * The approved marks and lockups, locked 2026-08-13 in PR #16. Each carries
 * exactly one moss dash against paper; that single accent is the point of
 * the mark, so losing it is as much a regression as doubling it. Named
 * explicitly because the invariant belongs to these four assets, not to
 * every file that happens to match the brand naming pattern.
 */
const ONE_MOSS_EACH = new Set([
  'mark-dense.svg',
  'mark-small.svg',
  'lockup-canopy.svg',
  'lockup-sideby.svg',
]);

const basename = (p: string) => p.split(/[\\/]/).pop()!;

describe('brand assets', () => {
  it('at least the two marks exist', () => {
    const names = svgFiles(ROOT).map(basename);
    expect(names).toContain('mark-dense.svg');
    expect(names).toContain('mark-small.svg');
  });

  it('no live text or font dependencies in any brand svg', () => {
    for (const file of svgFiles(ROOT)) {
      const svg = readFileSync(file, 'utf8');
      expect(svg, file).not.toMatch(/<text[\s>]/);
      expect(svg, file).not.toMatch(/font-family/);
    }
  });

  it('the palette parses out of tokens.css', () => {
    // Guards the guard: a silently empty set would make the next test vacuous.
    const hexes = brandHexes();
    expect(hexes.size).toBeGreaterThan(10);
    expect(hexes).toContain(MOSS);
  });

  it('marks and lockups paint only in brand colours', () => {
    const hexes = brandHexes();
    const brandOnly = svgFiles(ROOT).filter((p) =>
      /(?:mark-|lockup-)[^\\/]*\.svg$/.test(p),
    );
    expect(brandOnly.length).toBeGreaterThan(0);

    for (const file of brandOnly) {
      // fill AND stroke: the day/night marks are drawn entirely in strokes,
      // so a fill-only check reads their background rect and nothing else.
      for (const c of paintedColors(readFileSync(file, 'utf8'))) {
        expect(hexes, `${file}: ${c}`).toContain(c);
      }
    }
  });

  it('moss is a single accent, never repeated', () => {
    const brandOnly = svgFiles(ROOT).filter((p) =>
      /(?:mark-|lockup-)[^\\/]*\.svg$/.test(p),
    );

    for (const file of brandOnly) {
      const moss = paintedColors(readFileSync(file, 'utf8')).filter(
        (c) => c === MOSS,
      );
      if (ONE_MOSS_EACH.has(basename(file))) {
        expect(moss, file).toHaveLength(1);
      } else {
        // Other marks may carry no moss at all; what they may not do is
        // scatter it, which would cost the single dash its meaning.
        expect(moss.length, file).toBeLessThanOrEqual(1);
      }
    }
  });
});
