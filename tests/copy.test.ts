import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { copySchema } from '../src/lib/copy-schema';
import { rich } from '../src/lib/rich';
import { SITE_DESCRIPTION } from '../src/lib/seo/site';

const DIR = new URL('../src/content/copy/', import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith('.yaml'));
const load = (f: string) => parse(readFileSync(new URL(f, DIR), 'utf8'));

describe('copy collection files', () => {
  it('has exactly one file per page plus chrome', () => {
    expect(files.sort()).toEqual(['about.yaml', 'chrome.yaml', 'contact.yaml', 'home.yaml', 'sent.yaml', 'services.yaml']);
  });

  for (const f of files) {
    it(`${f} parses against the schema and names its own page`, () => {
      const data = copySchema.parse(load(f));
      expect(`${data.page}.yaml`).toBe(f);
    });
  }

  it('never carries a copy of SITE_DESCRIPTION (it is injected, F049)', () => {
    for (const f of files) {
      const raw = readFileSync(new URL(f, DIR), 'utf8').replace(/\s+/g, ' ');
      // Whole sentence, not a prefix: services shares the opening words legitimately.
      expect(raw.includes(SITE_DESCRIPTION), f).toBe(false);
      expect(raw.includes("Concocted in a lab"), f).toBe(false);
    }
  });

  it('carries no em dash (external copy rule)', () => {
    for (const f of files) expect(readFileSync(new URL(f, DIR), 'utf8').includes('—'), f).toBe(false);
  });
});

describe('copy schema strictness', () => {
  const sent = load('sent.yaml');
  it('rejects unknown keys', () => {
    expect(() => copySchema.parse({ ...sent, subtitle: 'x' })).toThrow();
  });
  it('rejects empty strings', () => {
    expect(() => copySchema.parse({ ...sent, heading: '' })).toThrow();
  });
  it('rejects a home description (it is injected)', () => {
    expect(() => copySchema.parse({ ...load('home.yaml'), description: 'x' })).toThrow();
  });
  it('rejects a nav target that is not a page or the Lab', () => {
    const chrome = load('chrome.yaml');
    expect(() => copySchema.parse({ ...chrome, nav: [{ to: 'blog', label: 'Blog' }] })).toThrow();
  });
});

describe('rich', () => {
  it('turns *x* into em and **x** into strong', () => {
    expect(rich('*Birch*: the root meaning **to shine**.')).toBe('<em>Birch</em>: the root meaning <strong>to shine</strong>.');
  });
  it('escapes markup and quotes', () => {
    expect(rich('<script>alert("x")</script> & *ok*')).toBe('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; <em>ok</em>');
  });
  it('leaves unpaired asterisks alone', () => {
    expect(rich('5 * 3')).toBe('5 * 3');
  });
});
