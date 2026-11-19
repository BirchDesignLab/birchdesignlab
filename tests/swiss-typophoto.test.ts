import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, readdirSync } from 'node:fs';

const home = readFileSync('src/themes/swiss/pages/Home.astro', 'utf8');
const about = readFileSync('src/themes/swiss/pages/About.astro', 'utf8');
const services = readFileSync('src/themes/swiss/pages/Services.astro', 'utf8');
const source = readFileSync('src/assets/swiss-photos-SOURCE.md', 'utf8');

describe('swiss typophoto (P4)', () => {
  it('records both photographs with their Commons pages, author and CC0', () => {
    expect(source).toContain('https://commons.wikimedia.org/wiki/File:Part_of_birch_trunk_in_Norrkila.jpg');
    expect(source).toContain('https://commons.wikimedia.org/wiki/File:Birch_trunk_in_Norrkila_1.jpg');
    expect(source).toContain('W.carter');
    expect(source).toMatch(/CC0/);
  });
  it('ships web derivatives only, as AVIF and WebP pairs, never an original', () => {
    const files = readdirSync('src/assets').filter((f) => f.startsWith('swiss-'));
    expect(files.some((f) => /\.(jpe?g|png)$/i.test(f))).toBe(false);
    for (const base of ['swiss-lab-band-1200', 'swiss-lab-band-2000', 'swiss-field-720', 'swiss-field-1200', 'swiss-field-1800']) {
      expect(existsSync(`src/assets/${base}.avif`), base + ' avif').toBe(true);
      expect(existsSync(`src/assets/${base}.webp`), base + ' webp').toBe(true);
    }
  });
  it('retires the Shining Tree image from About', () => {
    expect(existsSync('src/assets/swiss-field.webp')).toBe(false);
    expect(about).not.toContain('swiss-field.webp');
    expect(about).toContain('swiss-field-1200.avif');
  });
  it("sets Home's photograph behind the lab kicker and pull, decorative", () => {
    expect(home).toContain('swiss-lab-band-2000.avif');
    expect(home).toMatch(/<picture class="lab-photo" aria-hidden="true">/);
    expect(home).toMatch(/alt=""/);
    // Every line of type over it carries the sheet's ground.
    expect(home).toMatch(/<p class="sw-kicker lab-kicker"><span class="cut">/);
    expect(home).toMatch(/<p class="sw-lead pull"><span class="cut">/);
    // White marks on the black sheet in light; the same file, uninverted, in dark.
    expect(home).toMatch(/filter: invert\(1\);/);
    expect(home).toMatch(/\[data-scheme='dark'\]\) \.lab-photo img \{ filter: none; \}/);
  });
  it("hangs About's manifesto and button from the foot of the field on a desktop", () => {
    expect(about).toMatch(/min-height: clamp\(640px, 54vw, 1000px\);\s+align-content: end;/);
    expect(about).toMatch(/<picture class="field-img" aria-hidden="true">/);
  });
});

describe('swiss services timetable (S8)', () => {
  it('is a list of full-width rows ruled between, the numeral decorative', () => {
    expect(services).toMatch(/<ol class="steps">/);
    expect(services).toMatch(/<p class="num" aria-hidden="true">/);
    expect(services).toMatch(/\.step \{\s+grid-column: 1 \/ -1;\s+display: grid;\s+grid-template-columns: subgrid;/);
    expect(services).toMatch(/\.step \+ \.step \{ border-top: 1px solid var\(--mark\);/);
  });
  it('sets numeral, title and text on column lines, the numeral on the left', () => {
    expect(services).toMatch(/\.num \{[^}]*grid-column: 1 \/ 4;/);
    expect(services).toMatch(/\.step-title \{[^}]*grid-column: 4 \/ 7;/);
    expect(services).toMatch(/\.step-body \{[^}]*grid-column: 7 \/ -1;/);
  });
  it('keeps the numeral line box on the baseline grid, five lines on a phone', () => {
    expect(services).toContain('--sw-l: round(up, 0.72em, var(--u));');
    expect(services).toMatch(/--sw-n: 62;/);
    expect(services).toContain('font-size: calc(var(--u) * 5 / 0.687);');
    expect(services).toContain('--sw-l: calc(var(--u) * 5);');
  });
  it('no longer sets the steps as four equal columns', () => {
    expect(services).not.toMatch(/repeat\(4, minmax/);
  });
});
