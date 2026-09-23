import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { THEMES, getTheme } from '../src/themes/registry';
import { PAGE_IDS, SCHOOL_ID, pagePath, pageFromPath, rootPathFor, hrefFor, schoolStaticPaths } from '../src/themes/paths';

const THEMES_DIR = new URL('../src/themes/', import.meta.url);
const schoolDirs = readdirSync(THEMES_DIR).filter(
  (d) => statSync(new URL(d, THEMES_DIR)).isDirectory() && existsSync(new URL(`${d}/meta.ts`, THEMES_DIR)),
);

describe('theme registry', () => {
  it('registers every src/themes/<id>/meta.ts, and nothing else', () => {
    expect(THEMES.map((t) => t.id).sort()).toEqual([...schoolDirs].sort());
  });

  it('includes quiet, the house style, first', () => {
    expect(THEMES[0]?.id).toBe('quiet');
  });

  it('has unique ids and orders', () => {
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
    expect(new Set(THEMES.map((t) => t.order)).size).toBe(THEMES.length);
  });

  for (const t of THEMES) {
    describe(t.id, () => {
      it('has a URL-safe id', () => {
        expect(t.id).toMatch(SCHOOL_ID);
      });
      it('fills every descriptive field', () => {
        for (const key of ['name', 'era', 'lesson', 'signature'] as const) expect(t[key].trim().length, key).toBeGreaterThan(0);
        expect(t.forbids.length).toBeGreaterThan(0);
      });
      it('has a one-sentence signature', () => {
        expect(t.signature.trim()).toMatch(/[.!?]$/);
        expect(t.signature.trim().slice(0, -1)).not.toMatch(/[.!?]\s/);
      });
      it('preloads at most two font files', () => {
        const preloads = t.fonts.flatMap((f) => f.preload ?? []);
        expect(preloads.length).toBeLessThanOrEqual(2);
        for (const p of preloads) expect(p).toMatch(/\.woff2$/);
      });
      it('has a route file', () => {
        expect(existsSync(new URL(`../src/pages/t/${t.id}/[...page].astro`, import.meta.url))).toBe(true);
      });
      it('writes no em dash in its descriptive text', () => {
        const text = [t.name, t.era, t.lesson, t.signature, ...t.forbids].join(' ');
        expect(text.includes('—')).toBe(false);
      });
    });
  }

  it('getTheme finds by id and misses cleanly', () => {
    expect(getTheme('quiet')?.name).toBe('Quiet');
    expect(getTheme('nope')).toBeUndefined();
  });
});

describe('paths', () => {
  it('keeps the root hrefs the root pages have always used', () => {
    expect(PAGE_IDS.map((p) => pagePath(p))).toEqual(['/', '/about', '/services', '/contact', '/contact/sent/']);
    expect(hrefFor('lab')).toBe('/lab');
    expect(hrefFor('privacy')).toBe('/privacy');
  });

  it('gives school pages trailing-slash paths under /t/<id>/', () => {
    expect(pagePath('home', 'swiss')).toBe('/t/swiss/');
    expect(pagePath('about', 'swiss')).toBe('/t/swiss/about/');
    expect(pagePath('sent', 'swiss')).toBe('/t/swiss/contact/sent/');
    expect(hrefFor('lab', 'swiss')).toBe('/lab/');
    expect(hrefFor('privacy', 'swiss')).toBe('/privacy/');
  });

  it('round-trips every page of every school', () => {
    for (const t of THEMES) {
      for (const page of PAGE_IDS) expect(pageFromPath(pagePath(page, t.id))).toEqual({ theme: t.id, page });
    }
  });

  it('rejects paths that are not school pages', () => {
    for (const p of ['/', '/about/', '/t/', '/t/x/nope/', '/t/X/', '/t/../etc/', '/lab/bdl-001/']) {
      expect(pageFromPath(p), p).toBeNull();
    }
  });

  it('maps a school page to its canonical root page', () => {
    expect(PAGE_IDS.map(rootPathFor)).toEqual(['/', '/about/', '/services/', '/contact/', '/contact/sent/']);
  });

  it('gives each school route exactly the five pages', () => {
    const paths = schoolStaticPaths();
    expect(paths.map((p) => p.props.page)).toEqual([...PAGE_IDS]);
    expect(paths.map((p) => p.params.page)).toEqual([undefined, 'about', 'services', 'contact', 'contact/sent']);
  });
});
