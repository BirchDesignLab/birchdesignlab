import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// Source-level invariants for the card landing, in the same spirit as
// contact-bark-credit.test.ts: cheap regex checks that keep the load-bearing
// wiring from being refactored away silently. Context: docs/ar-card/HANDOFF.md.

const root = join(__dirname, '..');
const landing = readFileSync(join(root, 'src', 'components', 'CardLanding.astro'), 'utf8');
const hello = readFileSync(join(root, 'src', 'pages', 'hello.astro'), 'utf8');
const showcase = readFileSync(join(root, 'src', 'pages', 'showcase.astro'), 'utf8');
const astroConfig = readFileSync(join(root, 'astro.config.mjs'), 'utf8');
const EMDASH = String.fromCharCode(0x2014);

describe('card channels', () => {
  it('gives every channel its own page, with no rewrite indirection', () => {
    expect(hello).toContain('channel="kraft"');
    expect(showcase).toContain('channel="showcase"');
    // public/_redirects is what the rewrite version needed. Its absence is the
    // point: a channel is a page now, so the URL a card carries is a real file.
    expect(existsSync(join(root, 'public', '_redirects'))).toBe(false);
  });

  it('keeps the channel pages out of the sitemap', () => {
    expect(astroConfig).toContain("page.includes('/hello')");
    expect(astroConfig).toContain("page.includes('/showcase')");
  });

  it('does not invent channels beyond the two that exist', () => {
    // The tier 1 wood path is deliberately undecided until its QR is etched,
    // so a third channel page appearing here should be a conscious act.
    const channelPages = readdirSync(join(root, 'src', 'pages'))
      .filter(f => f.endsWith('.astro'))
      .filter(f => readFileSync(join(root, 'src', 'pages', f), 'utf8').includes('CardLanding'));
    expect(channelPages.sort()).toEqual(['hello.astro', 'showcase.astro']);
  });
});

describe('card landing', () => {
  it('ships with AR disabled and no AR UI', () => {
    expect(landing).toMatch(/AR_ENABLED:\s*false/);
    // The mount point renders only behind the flag, never unconditionally.
    expect(landing).toMatch(/CONFIG\.AR_ENABLED\s*&&\s*<div id="ar-root">/);
    expect(landing).not.toMatch(/coming soon/i);
  });

  it('takes its channel as a prop rather than parsing the URL', () => {
    expect(landing).toMatch(/const \{ channel, path \} = Astro\.props/);
    expect(landing).not.toContain('location.pathname');
    // The per-card and per-medium params are gone: kraft cards are identical
    // and NFC was dropped, so both were labels with nothing to label.
    expect(landing).not.toContain('URLSearchParams');
  });

  it('sends the scan beacon fire-and-forget, carrying only the channel', () => {
    expect(landing).toContain('navigator.sendBeacon');
    expect(landing).toContain("'/api/beacon'");
    expect(landing).toMatch(/JSON\.stringify\(\{ ts: Date\.now\(\), channel: channel \}\)/);
  });

  it('builds the vCard through the escaped lib builder', () => {
    expect(landing).toMatch(/import \{ buildVcf \} from '\.\.\/lib\/vcard'/);
    expect(landing).toContain('birch-design-lab.vcf');
  });

  it('offers all three actions, each pointing somewhere real', () => {
    expect(landing).toContain('Save contact');
    expect(landing).toContain('Visit the site');
    expect(landing).toContain('Enter the Lab');
    expect(landing).toMatch(/siteUrl:\s*'\/'/);
    expect(landing).toMatch(/labUrl:\s*'\/lab\/'/);
  });

  it('stays out of search results but unfurls when shared', () => {
    expect(landing).toContain('noindex');
    expect(landing).toContain('og:image');
    expect(landing).toContain('twitter:card');
  });

  it('honors reduced motion and keeps visitor-facing copy emdash-free', () => {
    expect(landing).toContain('prefers-reduced-motion: no-preference');
    expect(landing).not.toContain(EMDASH);
  });
});
