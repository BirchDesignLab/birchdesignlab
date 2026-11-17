import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { OG_PAGES, OG_LAB_CARDS, OG_LAB_CUSTOM, ogImageFor, ogImageForLab } from '../src/lib/og/manifest';

describe('OG manifest', () => {
  it('has unique names and routes', () => {
    expect(new Set(OG_PAGES.map((p) => p.name)).size).toBe(OG_PAGES.length);
    expect(new Set(OG_PAGES.map((p) => p.route)).size).toBe(OG_PAGES.length);
  });

  it('home has no title line', () => {
    expect(OG_PAGES.find((p) => p.name === 'home')?.title).toBeNull();
  });
});

describe('ogImageFor', () => {
  it('maps exact routes', () => {
    expect(ogImageFor('/')).toBe('home');
    expect(ogImageFor('/services')).toBe('services');
    expect(ogImageFor('/about')).toBe('about');
    expect(ogImageFor('/contact')).toBe('contact');
    expect(ogImageFor('/lab')).toBe('lab');
  });

  it('experiment pages share the lab card', () => {
    expect(ogImageFor('/lab/bdl-001')).toBe('lab');
    expect(ogImageFor('/lab/bdl-003/')).toBe('lab');
  });

  it('tolerates trailing slashes', () => {
    expect(ogImageFor('/services/')).toBe('services');
  });

  it('unknown routes fall back to home', () => {
    expect(ogImageFor('/styleguide')).toBe('home');
    expect(ogImageFor('/definitely-404')).toBe('home');
  });
});

describe('Lab cards', () => {
  it('an entry with its own card gets it, everything else gets the shared one', () => {
    expect(ogImageForLab('BDL-012', 'lab-experiment')).toBe('bdl-012');
    expect(ogImageForLab('BDL-001', 'lab-experiment')).toBe('lab-experiment');
  });

  it('custom card names never collide with a generated card', () => {
    // Both land in public/og/ as <name>.png; a clash would silently overwrite.
    const generated = new Set([...OG_PAGES, ...OG_LAB_CARDS].map((c) => c.name));
    for (const c of OG_LAB_CUSTOM) expect(generated.has(c.name), c.name).toBe(false);
  });

  it('every custom card has its committed source image', () => {
    // The prebuild copy throws without it, which would fail the deploy.
    for (const c of OG_LAB_CUSTOM) expect(existsSync(c.src), c.src).toBe(true);
  });
});
