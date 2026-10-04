import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { NUMERAL_PARTS } from '../src/themes/bauhaus/parts/numerals';

const read = (p: string) => readFileSync(p, 'utf8');
const css = read('src/themes/bauhaus/theme.css');
const numeral = read('src/themes/bauhaus/parts/Numeral.astro');
const meta = read('src/themes/bauhaus/meta.ts');

describe('bauhaus constructed numerals', () => {
  it('builds all ten digits from bars, rings, halves and quarters', () => {
    for (const d of '0123456789') {
      expect(NUMERAL_PARTS[d]?.length, `digit ${d}`).toBeGreaterThan(0);
      for (const part of NUMERAL_PARTS[d]) expect(['bar', 'ring', 'half', 'quad']).toContain(part.kind);
    }
  });
  it('keeps the real digits in the DOM, hides the drawing, assembles on reveal', () => {
    expect(numeral).toContain('class="num-t"');
    expect(numeral).toMatch(/class="num" aria-hidden="true" data-reveal/);
    expect(numeral).toContain('class="asm"');
  });
  it('is 0.9em tall, and Unbounded is gone', () => {
    expect(css).toContain('var(--nm-h, 0.9em)');
    expect(css).not.toMatch(/--font-num|Unbounded/);
    expect(meta).not.toContain('Unbounded');
  });
});

describe('bauhaus one lowercase voice', () => {
  it('no school file sets text-transform: uppercase', () => {
    const files = ['src/themes/bauhaus/theme.css', 'src/themes/bauhaus/Footer.astro', 'src/themes/bauhaus/Header.astro'];
    for (const f of readdirSync('src/themes/bauhaus/pages')) files.push(`src/themes/bauhaus/pages/${f}`);
    for (const f of files) expect(read(f), f).not.toMatch(/text-transform:\s*uppercase/);
  });
});

describe('bauhaus labels are lowercased by rule', () => {
  const block = (src: string, sel: string) => {
    const i = src.indexOf(sel + ' {');
    expect(i, sel).toBeGreaterThan(-1);
    return src.slice(i, src.indexOf('}', i));
  };
  it.each(['.kicker', '.btn', '.more'])('%s sets text-transform: lowercase', (s) => {
    expect(block(css, `[data-theme='bauhaus'] ${s}`)).toMatch(/text-transform:\s*lowercase/);
  });
  it('contact labels and footer location are lowercase', () => {
    expect(block(read('src/themes/bauhaus/pages/Contact.astro'), 'label')).toMatch(/text-transform:\s*lowercase/);
    expect(block(read('src/themes/bauhaus/Footer.astro'), '.loc')).toMatch(/text-transform:\s*lowercase/);
  });
});

describe('bauhaus composition and printshop register (B2 task 2)', () => {
  const page = (n: string) => read(`src/themes/bauhaus/pages/${n}.astro`);
  it('services carries one 45 degree ink bar across the module', () => {
    const s = page('Services');
    expect(s.match(/rotate\(-45 /g)?.length).toBe(1);
  });
  it('contact focus is a red offset square, with a red rule on the panel', () => {
    const c = page('Contact');
    expect(c).toMatch(/8px 8px 0 2px var\(--red\)/);
    expect(c).not.toContain("8px 8px 0 2px var(--blue)");
    expect(c).toContain('form::before');
  });
  it('footer copyright row is lowercase by rule', () => {
    const f = read('src/themes/bauhaus/Footer.astro');
    const i = f.indexOf('.fine {');
    expect(f.slice(i, f.indexOf('}', i))).toMatch(/text-transform:\s*lowercase/);
  });
  it('the lab typophoto trial was dropped (founder, 10-03-26)', () => {
    const h = page('Home');
    expect(h).not.toContain("from 'astro:assets'");
    expect(h).not.toContain('grayscale(1)');
  });
});
