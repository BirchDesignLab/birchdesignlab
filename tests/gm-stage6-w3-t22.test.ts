import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { ALPHABET, FONT, THREADS, glyphCells, nextThread, stitchDelay, stitchOrder, SEW_MS } from '../src/themes/grandmillennial/parts/sampler';

/* Stage 6 wave 3, task 22: grandmillennial's two interactables (the sampler's letters re-stitch, the envelope
   opens), pinned in source, plus the pure stitch-order walk. */
const GM = new URL('../src/themes/grandmillennial/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, GM), 'utf8').replace(/\r\n/g, '\n');

describe('the sampler stitch order', () => {
  it('has 26 letters, each a 5 x 7 glyph', () => {
    expect(ALPHABET).toHaveLength(26);
    for (const ch of ALPHABET) expect(FONT[ch], ch).toHaveLength(35);
  });

  it('works every filled cell of every letter exactly once', () => {
    for (const ch of ALPHABET) {
      const order = stitchOrder(ch);
      const want = glyphCells(ch).map((c) => c.join(',')).sort();
      expect(order.map((c) => c.join(',')).sort(), ch).toEqual(want);
    }
  });

  it('starts at the top-left stitch and mostly walks to a neighbouring cell (the needle rarely lifts)', () => {
    for (const ch of ALPHABET) {
      const order = stitchOrder(ch);
      expect(order[0], ch).toEqual(glyphCells(ch)[0]);
      const lifts = order.slice(1).filter((c, i) => Math.max(Math.abs(c[0] - order[i][0]), Math.abs(c[1] - order[i][1])) > 1).length;
      // a letter of strokes (T, H, K, X...) lifts a few times; none walks by jumping every step
      expect(lifts, ch).toBeLessThanOrEqual(4);
    }
  });

  it('walks the set oxblood, hunter, gold, then round again', () => {
    expect(THREADS).toEqual(['oxblood', 'hunter', 'gold']);
    expect([0, 1, 2, 0].map(nextThread)).toEqual([1, 2, 0, 1]);
  });

  it('spreads the stitches over the budget so the last starts at SPREAD and ends near 500 ms', () => {
    expect(stitchDelay(0, 18)).toBe(0);
    const last = stitchDelay(17, 18) + SEW_MS;
    expect(last).toBeGreaterThanOrEqual(480);
    expect(last).toBeLessThanOrEqual(520);
    expect(stitchDelay(0, 1)).toBe(0);
  });
});

describe('the sampler (About)', () => {
  const about = read('pages/About.astro');
  it('is 26 real buttons labelled "Letter X, re-stitch", with no aria-pressed', () => {
    expect(about).toContain('aria-label={`Letter ${l.ch}, re-stitch`}');
    expect(about).toContain('<button type="button" class="ltr"');
    expect(about).not.toContain('aria-pressed');
  });

  it('keeps one tab stop with arrows, mounts through onMount and cleans up', () => {
    expect(about).toMatch(/onMount\(\(\) => \{\s*if \(document\.documentElement\.dataset\.theme !== 'grandmillennial'\) return;\s*return initSampler\(/);
    const toys = read('parts/toys.ts');
    for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown', 'Home', 'End']) expect(toys).toContain(`'${key}'`);
    for (const ev of ['click', 'keydown', 'focusin', 'animationend']) {
      expect(toys).toContain(`addEventListener('${ev}'`);
      expect(toys).toContain(`removeEventListener('${ev}'`);
    }
  });

  it('draws in over about 500 ms on an ease-out, and gates the hover', () => {
    expect(about).toMatch(/animation: gm-sew 150ms cubic-bezier\(0\.3, 0\.6, 0\.3, 1\) both; animation-delay: var\(--d\)/);
    const hover = about.slice(about.indexOf('@media (hover: hover) and (pointer: fine)'));
    expect(hover).toMatch(/^@media \(hover: hover\) and \(pointer: fine\) \{\s*\.ltr:hover/);
  });

  it('threads come from the palette, each at 3:1 as a graphic (meta.contrast), in both schemes', () => {
    const css = read('theme.css');
    const meta = read('meta.ts');
    expect(css.match(/--thread-hunter:/g)).toHaveLength(2);
    expect(css.match(/--thread-gold:/g)).toHaveLength(2);
    expect(meta).toMatch(/fg: '--thread-hunter', bg: \['--field-raised'\], min: 3/);
    expect(meta).toMatch(/fg: '--thread-gold', bg: \['--field-raised'\], min: 3/);
    expect(meta).toMatch(/fg: '--thread', bg: \['--field-raised'\], min: 3/);
  });
});

describe('the envelope (Contact)', () => {
  const contact = read('pages/Contact.astro');
  it('the wax seal is the one button: "Envelope, open", aria-expanded, the picture aria-hidden', () => {
    expect(contact).toContain('<button class="seal-btn" type="button" aria-label="Envelope, open" aria-expanded="false">');
    expect(contact).toMatch(/<div class="flap" aria-hidden="true">/);
    // the card carries the monogram only: the B and no words
    expect(contact).toContain('<span class="card"><span class="mono">B</span></span>');
    const toys = read('parts/toys.ts');
    expect(toys).toContain("'Envelope, close'");
    expect(toys).toContain("'Envelope, open'");
    expect(toys).toContain("setAttribute('aria-expanded'");
  });

  it('hinges about 160 degrees over 300 ms and slides the card 24px', () => {
    expect(contact).toContain('rotateX(-160deg)');
    expect(contact).toMatch(/transition: transform 300ms var\(--ease\), z-index 0s linear 150ms/);
    expect(contact).toContain('translate: -50% -24px;');
  });

  it('lies under the form in the one-column desk, so the folded flap cannot cover it', () => {
    expect(contact).toMatch(/\.envelope \{ width: min\(100%, 28rem\); justify-self: center; rotate: 1\.4deg; z-index: 0; \}/);
    expect(contact).toMatch(/\.write \{ position: relative; z-index: 1; \}/);
  });

  it('the seal hover is gated and its tap target is at least 44px', () => {
    expect(contact).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.seal-btn:hover/);
    expect(contact).toContain('--seal-size: 4.6rem');
  });

  it('the notecard ink holds its contrast pair in both schemes', () => {
    const css = read('theme.css');
    expect(css.match(/--notecard-ink:/g)).toHaveLength(2);
    expect(css.match(/--notecard:/g)).toHaveLength(2);
    expect(read('meta.ts')).toMatch(/fg: '--notecard-ink', bg: \['--notecard'\], min: 4\.5/);
  });
});
