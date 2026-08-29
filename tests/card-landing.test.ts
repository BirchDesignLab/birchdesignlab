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
const greetings = readFileSync(join(root, 'src', 'pages', 'greetings.astro'), 'utf8');
const astroConfig = readFileSync(join(root, 'astro.config.mjs'), 'utf8');
const EMDASH = String.fromCharCode(0x2014);

describe('card channels', () => {
  it('gives every channel its own page, with no rewrite indirection', () => {
    expect(hello).toContain('channel="kraft"');
    expect(showcase).toContain('channel="showcase"');
    expect(greetings).toContain('channel="wood"');
    // public/_redirects is what the rewrite version needed. Its absence is the
    // point: a channel is a page now, so the URL a card carries is a real file.
    expect(existsSync(join(root, 'public', '_redirects'))).toBe(false);
  });

  it('keeps the channel pages out of the sitemap', () => {
    expect(astroConfig).toContain("page.includes('/hello')");
    expect(astroConfig).toContain("page.includes('/showcase')");
    expect(astroConfig).toContain("page.includes('/greetings')");
  });

  it('does not invent channels beyond the three that exist', () => {
    // /greetings (tier 1 wood) was decided and wired 08-28-26 (AR card prompt
    // pack v4) — see docs/ar-card/HANDOFF.md. A fourth channel page appearing
    // here should still be a conscious act.
    const channelPages = readdirSync(join(root, 'src', 'pages'))
      .filter(f => f.endsWith('.astro'))
      .filter(f => readFileSync(join(root, 'src', 'pages', f), 'utf8').includes('CardLanding'));
    expect(channelPages.sort()).toEqual(['greetings.astro', 'hello.astro', 'showcase.astro']);
  });
});

describe('card landing', () => {
  it('ships with no AR UI, and treats AR as a per-channel opt-in', () => {
    // AR belongs to a card someone can point a camera at, not to the app, so
    // it defaults off and a channel has to ask for it.
    expect(landing).toMatch(/const \{ channel, path, ar = false \} = Astro\.props/);
    // The mount point renders only behind that prop, never unconditionally.
    expect(landing).toMatch(/ar\s*&&\s*<div id="ar-root">/);
    expect(landing).not.toMatch(/coming soon/i);
  });

  it('has no channel opting into AR yet, since the module does not exist', () => {
    // Only the component invocation counts; the files talk about AR in prose.
    const tag = (src: string) => (src.match(/<CardLanding[^>]*\/>/) ?? [''])[0];
    expect(tag(hello)).not.toMatch(/\bar\b/);
    // /showcase is a QR on a television and never becomes an AR channel.
    expect(tag(showcase)).not.toMatch(/\bar\b/);
  });

  it('takes its channel as a prop rather than parsing the URL', () => {
    expect(landing).toMatch(/= Astro\.props/);
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

  it('carries Marcellus in the document rather than fetching it', () => {
    // The page has no BaseLayout and no stylesheet link, so an @fontsource
    // import cannot reach it. If this ever becomes a linked font, the brand
    // face arrives late on the two lines that carry the brand.
    expect(landing).toContain("from '../lib/card-font'");
    expect(landing).toContain('data:font/woff2;base64');
    expect(landing).toMatch(/font-family: 'Marcellus'/);
    // Marcellus ships one weight; anything above 400 faux-bolds.
    expect(landing).not.toMatch(/font-weight:\s*[5-9]00/);
    const generated = readFileSync(join(root, 'src', 'lib', 'card-font.ts'), 'utf8');
    expect(generated).toContain('scripts/ar-card/subset-marcellus.mjs');
  });

  it('honors reduced motion and keeps visitor-facing copy emdash-free', () => {
    expect(landing).toContain('prefers-reduced-motion: no-preference');
    expect(landing).not.toContain(EMDASH);
  });
});
