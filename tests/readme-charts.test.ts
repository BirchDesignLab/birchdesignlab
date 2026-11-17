// Drift gate for the README charts (spec: docs/superpowers/specs/2026-11-17-readme-charts.md).
// Every built chart is a <picture> in README.md (light + dark SVG) followed by a
// <details> holding its Mermaid source. The SVGs record the sha256 of that source
// at build time, so editing a Mermaid block without rebuilding fails here.
// No browser: text, hashes and file checks only.
import { existsSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO, mermaidBlocks, normalizeMermaid, readmeText, registry, sha256, svgName, svgPath } from '../scripts/readme/charts/source.mjs';

type Chart = {
  n: number;
  name: string;
  built: boolean;
  kind: 'mermaid' | 'showpiece';
  title: string;
  alt: string;
  data?: string;
};
const charts: Chart[] = registry.charts;
const built = charts.filter((c) => c.built);
const schemes = ['light', 'dark'] as const;
const stale = (c: Chart) => `README chart ${c.n} is stale: run node scripts/readme/charts/build.mjs`;
const readme = readmeText();
const fences = mermaidBlocks(readme);

type Found = { dark: string; light: string; alt: string; mermaid: string | null };
function findPicture(c: Chart): Found | null {
  for (const m of readme.matchAll(/<picture>([\s\S]*?)<\/picture>([\s\S]*?)(?=<picture>|$)/g)) {
    const inner = m[1];
    const dark = inner.match(/<source[^>]*srcset="([^"]+)"/)?.[1] ?? '';
    const light = inner.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? '';
    if (!light.includes(`/${c.n}-${c.name}.`)) continue;
    const alt = inner.match(/<img[^>]*alt="([^"]*)"/)?.[1] ?? '';
    const after = m[2].match(/^\s*<details>\s*<summary>Chart source \(Mermaid\)<\/summary>\s*```mermaid\n([\s\S]*?)```\s*<\/details>/);
    return { dark, light, alt, mermaid: after ? normalizeMermaid(after[1]) : null };
  }
  return null;
}

/**
 * Showpieces (4 Portal, 7 Timeline) are built from JSON, and the JSON must agree
 * with the Mermaid in the <details>: return what differs, so a wording edit in
 * either one fails the test. Phase 2 registers one comparer per showpiece here.
 */
const agreement: Record<string, (json: unknown, mermaid: string) => string[]> = {};

describe('README charts', () => {
  it('registry covers the README: one chart per Mermaid block, in order', () => {
    expect(fences.length).toBe(charts.length);
    expect(charts.map((c) => c.n)).toEqual(charts.map((_, i) => i + 1));
  });

  it('has no <picture> that is not a registered, built chart', () => {
    const srcs = [...readme.matchAll(/<picture>[\s\S]*?<img[^>]*src="([^"]+)"/g)].map((m) => m[1]);
    for (const s of srcs.filter((x) => x.includes('assets/readme/charts/'))) {
      expect(built.some((c) => s.endsWith(svgName(c, 'light'))), `unregistered chart image ${s}`).toBe(true);
    }
  });

  describe.each(built)('chart $n ($name)', (c) => {
    const pic = findPicture(c);

    it('is a <picture> in the README with real alt text', () => {
      expect(pic, `README has no <picture> for chart ${c.n}`).not.toBeNull();
      expect(pic!.dark).toContain(`assets/readme/charts/${svgName(c, 'dark')}`);
      expect(pic!.light).toContain(`assets/readme/charts/${svgName(c, 'light')}`);
      expect(pic!.alt.length).toBeGreaterThan(40);
      expect(pic!.alt).toBe(c.alt);
    });

    it('has both SVG files', () => {
      for (const s of schemes) expect(existsSync(svgPath(c, s)), `missing ${svgName(c, s)}`).toBe(true);
    });

    it('keeps its Mermaid source in the <details> that follows, unchanged', () => {
      expect(pic?.mermaid, `chart ${c.n}: the <picture> must be followed by the Mermaid <details>`).not.toBeNull();
      expect(sha256(pic!.mermaid!), `chart ${c.n}'s <details> is not README block ${c.n}`).toBe(sha256(fences[c.n - 1]));
    });

    if (c.kind === 'mermaid') {
      it.each(schemes)('%s SVG was built from the current Mermaid block', (s) => {
        const svg = readFileSync(svgPath(c, s), 'utf8');
        const recorded = svg.match(/<metadata[^>]*data-source-hash="([0-9a-f]{64})"/)?.[1];
        expect(recorded, stale(c)).toBeDefined();
        expect(recorded, stale(c)).toBe(sha256(pic!.mermaid!));
      });
    } else {
      it.each(schemes)('%s SVG was built from the current data file', (s) => {
        const svg = readFileSync(svgPath(c, s), 'utf8');
        const recorded = svg.match(/<metadata[^>]*data-source-hash="([0-9a-f]{64})"/)?.[1];
        expect(c.data, `chart ${c.n} needs a data file in charts.json`).toBeDefined();
        const data = readFileSync(resolve(REPO, c.data!), 'utf8');
        expect(recorded, stale(c)).toBe(sha256(data));
      });
      it('agrees with its Mermaid fallback', () => {
        const compare = agreement[c.name];
        expect(compare, `no agreement check registered for ${c.name}`).toBeDefined();
        const json = JSON.parse(readFileSync(resolve(REPO, c.data!), 'utf8'));
        expect(compare(json, pic!.mermaid!)).toEqual([]);
      });
    }

    it.each(schemes)('%s SVG is safe to show through <img>', (s) => {
      const file = svgPath(c, s);
      if (!existsSync(file)) return;
      const svg = readFileSync(file, 'utf8');
      expect(svg).not.toMatch(/<script/i);
      expect(svg).not.toMatch(/foreignObject/i);
      expect(svg).not.toMatch(/url\(\s*['"]?https?:/i);
      expect(svg).not.toMatch(/@import/i);
      expect(svg).not.toMatch(/(?:href|src)\s*=\s*["'](?!#)/i);
      expect(svg).toMatch(/<title[ >]/);
      expect(svg).toMatch(/<desc[ >]/);
      expect(statSync(file).size).toBeLessThan(150 * 1024);
      const dashes = new RegExp(`[${String.fromCharCode(0x2013, 0x2014)}]`);
      expect(dashes.test(svg), 'no em or en dashes in an SVG').toBe(false);
    });
  });
});
