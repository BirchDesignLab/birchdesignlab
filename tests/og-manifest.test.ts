import { describe, it, expect } from 'vitest';
import { OG_PAGES, ogImageFor } from '../src/lib/og/manifest';

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
