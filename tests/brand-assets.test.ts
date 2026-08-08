import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = join(process.cwd(), 'assets', 'brand');

function svgFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return svgFiles(p);
    return name.endsWith('.svg') ? [p] : [];
  });
}

describe('brand assets', () => {
  it('at least the two marks exist', () => {
    const names = svgFiles(ROOT).map((p) => p.split(/[\\/]/).pop());
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

  it('marks and lockups use only brand fills, exactly one moss each', () => {
    const brandOnly = svgFiles(ROOT).filter((p) =>
      /(?:mark-|lockup-)[^\\/]*\.svg$/.test(p),
    );
    for (const file of brandOnly) {
      const svg = readFileSync(file, 'utf8');
      const fills = [...svg.matchAll(/fill="([^"]+)"/g)].map((m) => m[1].toLowerCase());
      for (const f of fills) expect(['#f4f0e6', '#a3bd8f', 'none'], file).toContain(f);
      expect(fills.filter((f) => f === '#a3bd8f'), file).toHaveLength(1);
    }
  });
});
