import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Source-level invariants for the AR card landing, in the same spirit as
// contact-bark-credit.test.ts: cheap regex checks that keep the load-bearing
// wiring from being refactored away silently. Context: docs/ar-card/HANDOFF.md.

const root = join(__dirname, '..');
const page = readFileSync(join(root, 'src', 'pages', 'ar-card.astro'), 'utf8');
const redirects = readFileSync(join(root, 'public', '_redirects'), 'utf8');
const astroConfig = readFileSync(join(root, 'astro.config.mjs'), 'utf8');
const EMDASH = String.fromCharCode(0x2014);

describe('channel rewrites', () => {
  it('rewrites /hello (both slash forms) to /ar-card/ with a 200', () => {
    const rules = redirects
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'));
    expect(rules).toContain('/hello /ar-card/ 200');
    expect(rules).toContain('/hello/ /ar-card/ 200');
  });

  it('defines no channel beyond /hello (tier 1 path is deliberately undecided)', () => {
    const sources = redirects
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#'))
      .map((line) => line.split(/\s+/)[0]);
    for (const source of sources) {
      expect(source === '/hello' || source === '/hello/').toBe(true);
    }
  });
});

describe('ar-card landing page', () => {
  it('ships with AR disabled and no AR UI', () => {
    expect(page).toMatch(/AR_ENABLED:\s*false/);
    // The mount point renders only behind the flag, never unconditionally.
    expect(page).toMatch(/CONFIG\.AR_ENABLED\s*&&\s*<div id="ar-root">/);
    expect(page).not.toMatch(/coming soon/i);
  });

  it('parses the channel generically from the pathname (no /hello hardcoded)', () => {
    expect(page).toContain("location.pathname.split('/').filter(Boolean).join('/')");
    expect(page).not.toMatch(/['"]\/hello['"]/);
  });

  it('sends the scan beacon fire-and-forget', () => {
    expect(page).toContain('navigator.sendBeacon');
    expect(page).toContain("'/api/beacon'");
  });

  it('builds the vCard through the escaped lib builder', () => {
    expect(page).toMatch(/import \{ buildVcf \} from '\.\.\/lib\/vcard'/);
    expect(page).toContain('birch-design-lab.vcf');
  });

  it('stays out of search results but unfurls when shared', () => {
    expect(page).toContain('noindex');
    expect(page).toContain('og:image');
    expect(page).toContain('twitter:card');
    expect(astroConfig).toContain("page.includes('/ar-card')");
  });

  it('honors reduced motion and keeps visitor-facing copy emdash-free', () => {
    expect(page).toContain('prefers-reduced-motion: no-preference');
    expect(page).not.toContain(EMDASH);
  });
});
