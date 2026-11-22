import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/** Stage 6 wave 2, task 10: the stop 2 answers for swiss and wave 1's deferred
    minors (T4 C3 to C6, T6 C3 to C8), pinned in source. The measured results
    are in the task report; these keep the decisions from drifting. */
const dial = readFileSync('src/themes/swiss/WidthDial.astro', 'utf8');
// LF-normalised: a Windows checkout (autocrlf) writes CRLF, and a slice below matches on '\n'.
const home = readFileSync('src/themes/swiss/pages/Home.astro', 'utf8').replace(/\r\n/g, '\n');
const about = readFileSync('src/themes/swiss/pages/About.astro', 'utf8');
const services = readFileSync('src/themes/swiss/pages/Services.astro', 'utf8');
const key = readFileSync('src/themes/swiss/GridKey.astro', 'utf8');
const source = readFileSync('src/assets/swiss-photos-SOURCE.md', 'utf8');

describe('swiss lab band (stop 2 answer 3)', () => {
  it('ends the photograph on a full-width rule, whichever scheme', () => {
    expect(home).toMatch(/\.lab-photo \{[^}]*box-shadow: 0 1px 0 var\(--mark-muted\);/);
  });
  it('on phones gives the photograph a band of twelve lines and sets the pull under it', () => {
    const phone = home.slice(home.indexOf('/* Phones: the band is a picture.'), home.indexOf('@media (min-width: 640px) {\n    /* The photograph'));
    expect(phone).toMatch(/@media \(max-width: 639\.98px\)/);
    expect(phone).toContain('grid-template-rows: calc(var(--u) * 12) auto');
    expect(phone).toContain('.lab-photo { bottom: auto; height: calc(var(--u) * 12.5); }');
    expect(phone).toContain('.pull { margin-top: 0; }');
    // No label under the pull on a phone: it sits on the sheet's ground.
    expect(phone).toContain('.pull .cut { background: none; box-shadow: none; }');
  });
  it('keeps the tablet and desktop composition (the band has its own height from 640)', () => {
    expect(home).toMatch(/\.lab-head \{ min-height: clamp\(260px, 30vw, 520px\); \}/);
  });
});

describe('swiss dial (S1, S2, T4 C3)', () => {
  it('measures the word by its right edge, so the width axis step is in the table', () => {
    expect(dial).toContain('return range.getBoundingClientRect().right - heroR.left;');
    expect(dial).not.toContain('return range.getBoundingClientRect().width;');
    expect(dial).toContain('Winv(ledeR.left - gap - heroR.left)');
    expect(dial).toContain('const bar = W(cur) - left - (INK_A + INK_B * cur) * size + gap;');
    expect(dial).toContain('dial.style.width = `${W(max) - left}px`');
  });
  it('lets the CSS rest stand when the cap agrees with it', () => {
    expect(dial).toMatch(/if \(Math\.abs\(rest - cssRest\) <= 0\.25\) rest = cssRest;\s+else h1\.style\.setProperty\('--sw-rest', rest\.toFixed\(2\)\);/);
  });
  it('sets the CSS rest to the measured cap: 94.7 to 1195, then full width', () => {
    expect(home).toMatch(/@media \(min-width: 1024px\) \{\s*\.billboard \{ --sw-rest: 94\.7; \}/);
    expect(home).toMatch(/@container \(min-width: 1100px\) \{\s*\.billboard \{ --sw-rest: 125; \}/);
  });
});

describe('swiss grid key (T4 C4)', () => {
  it('drops a column tag that would cover the key to the line below it', () => {
    expect(key).toContain("guides.style.setProperty('--clear-y'");
    expect(key).toContain("col.dataset.clear = ''");
    expect(key).toMatch(/\.guides span\[data-clear\]::before \{ top: var\(--clear-y, 0px\); \}/);
    expect(key).toMatch(/kr\.top < u/);
  });
});

describe('swiss flush-left, line by line (T4 C5)', () => {
  it("sets each line of About's stacked title by its own first letter, on desktop and phone", () => {
    for (const line of [1, 2, 3]) expect(about.split(`.title .ln:nth-child(${line}) {`).length - 1).toBe(2);
    expect(about).toContain('.title .ln:nth-child(2) { margin-inline-start: -0.0211em; }');
    expect(about).toContain('.title .ln:nth-child(2) { margin-inline-start: -0.0128em; }');
  });
  it("records why Services' title is not corrected line by line", () => {
    expect(services).toContain('The title is not set flush line by line');
  });
});

describe('swiss About photograph (T6 C4, C8)', () => {
  it("rules the trunk band's foot below 1024", () => {
    expect(about).toMatch(/@media \(max-width: 1023\.98px\) \{\s+\.manifesto::after \{[^}]*top: calc\(var\(--fld-w\) \* var\(--fld-ratio\) - 1px\);[^}]*height: 1px;[^}]*background: var\(--black\);/);
  });
  it('gives `sizes` the rendered widths at every size, avif and webp alike', () => {
    const sizes = 'sizes="(min-width: 1024px) clamp(922px, 77.8vw, 1440px), (min-width: 640px) min(100vw, 820px), min(125vw, 900px)"';
    expect(about.split(sizes).length - 1).toBe(2);
    // The widths are the ones the CSS renders.
    expect(about).toContain('--fld-w: min(125vw, 900px);');
    expect(about).toContain('--fld-w: min(100vw, 820px);');
    expect(about).toContain('min-height: clamp(640px, 54vw, 1000px);');
  });
});

describe('swiss Services numerals and rows (T6 C5, C6)', () => {
  it('lifts the flat-topped 1 to the cap line', () => {
    expect(services).toContain('translate: 0 calc(3.8px - var(--sw-l) / 2 + 0.369em - var(--sw-flat, 0em));');
    expect(services).toContain('.step:nth-child(1) .num { margin-inline-start: -0.1em; --sw-flat: 0.0108em; }');
    expect(services).toContain('translate: 0 calc(4.2px - var(--sw-l) / 2 + 0.369em - var(--sw-flat, 0em));');
  });
  it('makes every phone row a whole number of lines', () => {
    expect(services).toMatch(/\.step-body \{ grid-column: 1 \/ -1; grid-row: 2; max-width: none; margin-top: var\(--u\); \}/);
  });
});

describe('swiss photo weights (T6 C7)', () => {
  it('records the served files, not the source, and the real change per visitor', () => {
    for (const n of ['45,246', '85,750', '142,226', '190,726']) expect(source).toContain(n);
    expect(source).toMatch(/74,603/);
    expect(source).not.toContain('190,250 bytes, re-encoded');
  });
});
