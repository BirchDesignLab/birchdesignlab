import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/* Stage 6 wave 2 task 14: grandmillennial rosette tails, ribbon tape, swag, frames, GM2 to GM6.
   Source checks: they fail if one of the task's calls is quietly undone. */
const GM = new URL('../src/themes/grandmillennial/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, GM), 'utf8').replace(/\r\n/g, '\n');
const css = read('theme.css');
const light = css.slice(css.indexOf(":root[data-theme='grandmillennial'] {"), css.indexOf("[data-scheme='dark'] {"));
const dark = css.slice(css.indexOf("[data-scheme='dark'] {"), css.indexOf(':where([data-theme'));
const token = (block: string, name: string) => block.match(new RegExp(`${name}:\\s*([^;]+);`))?.[1].trim();

describe('grandmillennial Stage 6 wave 2 task 14', () => {
  it('GM1: the rosette tails are about 95 units with the taller viewBox', () => {
    const r = read('parts/Rosette.astro');
    expect(r).toContain('viewBox="-42 -42 84 145"');
    expect(r).toContain('tail(95)');
    expect(r).toContain('tail(88)'); // one about 7 units shorter
    expect(r).toContain('M-6 0L6 0L8.5'); // 6 either side widening to 8.5 at the cut
    expect(r).toContain('rotate(17)');
    expect(r).toContain('rotate(-17)');
  });

  it('the Contact trust line is a ribbon tape with picots, swallow-tail cut ends and a nail each end', () => {
    const c = read('pages/Contact.astro');
    expect(c).toMatch(/<p class="trust">/);
    expect(c).toMatch(/\.trust::before \{[^}]*clip-path: polygon\(0 0, 100% 0, calc\(100% - 14px\) 50%/s);
    expect(c).toMatch(/\.trust::after \{[^}]*radial-gradient\(circle at 28px 50%[^}]*radial-gradient\(circle at calc\(100% - 28px\) 50%/s);
    expect(c).toContain('var(--tape)');
    expect(token(light, '--tape')).toBeTruthy();
    expect(token(dark, '--tape')).toBeTruthy();
    const meta = read('meta.ts');
    expect(meta).toContain("fg: '--tape-ink', bg: ['--tape']");
  });

  it('the four cameos hang from one swag: a curve, a tie each, the phone column', () => {
    const s = read('pages/Services.astro');
    expect(s).toContain('class="swag swag-h"');
    expect(s).toContain('class="swag swag-v"');
    expect(s).toMatch(/\.cameo::before/);
    // the cameo's hang height reads the same parabola the curve is drawn on
    expect(s).toContain('margin-top: calc(var(--top) + var(--sag) * var(--f) + var(--tie))');
    expect(s).toContain('M0 12Q50 92 100 12'); // top 12, sag 40: control at top + 2 * sag
  });

  it('GM2: the process band butts the ticking (no gap, no doubled top rule)', () => {
    const s = read('pages/Services.astro');
    expect(s).toMatch(/\.process \{\s*margin-top: 0;/);
    expect(s).toContain('border-block-end: 1px solid var(--rule)');
  });

  it('GM3: both intros lie on the trellis lattice', () => {
    for (const p of ['pages/Services.astro', 'pages/Contact.astro']) {
      expect(read(p)).toContain('<section class="intro gm-trellis">');
    }
  });

  it('GM5: the dark lacquer yellow is lifted from the mustard and the kicker has its own pair', () => {
    expect(token(dark, '--lacquer-yellow')).toBe('#84560a');
    expect(token(dark, '--lacquer-accent')).toBeTruthy();
    expect(read('meta.ts')).toContain("fg: '--lacquer-accent', bg: ['--lacquer-yellow']");
  });

  it('GM6: the dark hero wall is a moonlit sage, lighter than the founder room, in step with the palette file', () => {
    const palettes = JSON.parse(readFileSync(new URL('../scripts/themes/grandmillennial/chinoiserie-palettes.json', import.meta.url), 'utf8'));
    expect(palettes.dark.ground).toBe('#1e2e25');
    expect(token(dark, '--sc-ground')).toBe(palettes.dark.ground);
    expect(read('assets/chinoiserie-dark.svg')).toContain('#1e2e25');
  });

  it('frames: chintz runs are whole cells (round(down) to the 48-unit cell) with a stem for the slack', () => {
    const f = read('parts/Framed.astro');
    expect(f).toContain('round(down, 100%, 48px)');
    expect(f).toContain('class="run top"');
    expect(f).toMatch(/\.run::before \{[^}]*background: var\(--c-leaf\)/);
  });

  it('the lone third specimen card is centred where two abreast fit', () => {
    const h = read('pages/Home.astro');
    expect(h).toContain('(min-width: 561px) and (max-width: 695px), (min-width: 861px) and (max-width: 956px)');
    expect(h).toContain('.specimens li:nth-child(3):last-child');
  });

  it('GM4: from 701 to 820 the live bird has its own pair, further left on the same limb', () => {
    const a = read('pages/About.astro');
    expect(a).toContain('BIRD_TABLET = { home: [240, 271, 0.5, -1], away: [261, 259, 0.5, 1] }');
    expect(a).toContain('BIRD_PHONE = { home: [336, 217, 0.5, -1], away: [357, 204, 0.5, 1] }'); // 390 keeps the phone pair
  });
});
