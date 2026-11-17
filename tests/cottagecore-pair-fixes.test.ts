import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const ROOT = new URL('../src/themes/cottagecore/', import.meta.url);
const read = (p: string) => readFileSync(new URL(p, ROOT), 'utf8');
const css = read('theme.css');
const home = read('pages/Home.astro');
const services = read('pages/Services.astro');
const contact = read('pages/Contact.astro');
const sent = read('pages/Sent.astro');

/* Stage 5 B2 task 6: the pair C fixes (the critic's calls, the founder's two answers, the deferred
   minors). Structural only: the sheets and films are the evidence for how they look. */
describe('cottagecore pair C fixes', () => {
  it('stacks the recipe cards below 860px (A1), 60 to 62 characters a line, dealt left then right', () => {
    for (const page of [home, services]) {
      expect(page).toMatch(/@media \(max-width: 859px\)/);
      expect(page).not.toMatch(/@media \(max-width: 700px\)/);
      expect(page).toMatch(/width: min\(100%, 36\.5rem\); padding-inline: 1\.5rem/);
      expect(page).toMatch(/justify-self: start/);
      expect(page).toMatch(/justify-self: end/);
    }
  });

  it('draws the hoop freehand: a satin and stem-stitch sprig and a running-stitch script (A2)', () => {
    const sampler = read('assets/Sampler.astro');
    for (const c of ['sk-stem', 'sk-chain-rose', 'sk-knot-heart', 'sk-leaf']) expect(sampler).toContain(c);
    // Lazy daisies are open chain loops (unfilled), not satin teardrops.
    const daisy = sampler.slice(sampler.indexOf('function lazyDaisy'), sampler.indexOf('// The sprig:'));
    expect(daisy).toContain('chain(');
    expect(daisy).not.toContain('satin(');
    expect(sampler).not.toMatch(/CHART|CELL/);
    const sig = read('assets/Signature.astro');
    expect(sig).toContain('sig-run');
    expect(sig).toContain('sig-swash');
    expect(sig).not.toMatch(/skewX/);
    expect(css).toMatch(/\.cc-signature \.sig-run \{[^}]*stroke-dasharray/);
    // The cloth is linen now, not the counted Aida weave.
    expect(read('pages/About.astro')).not.toMatch(/Aida cloth/);
  });

  it('gives the header daisy a bigger head on a short stem that ends on the baseline', () => {
    const header = read('Header.astro');
    expect(header).toMatch(/kind="daisy" seed=\{11\} short/);
    expect(header).toMatch(/\.wm-daisy\) \{[^}]*width: 2.45rem[^}]*align-self: baseline/s);
    expect(read('assets/Pressed.astro')).toMatch(/short\?: boolean/);
  });

  it('holds the header on one line from 641 to the phone breakpoint', () => {
    expect(read('Header.astro')).toMatch(/@media \(min-width: 641px\) and \(max-width: 900px\)[^}]*column-gap/s);
  });

  it('lifts a dark tape corner as a hole with a shadow, light unchanged', () => {
    const dark = css.slice(css.indexOf('By lamplight the lift is a corner peeled'));
    expect(dark).toMatch(/\[data-scheme='dark'\] \.cc-tape::before \{[^}]*mask-composite: subtract/s);
    expect(dark).toMatch(/\.cc-tape\[data-lift\]::before/);
    expect(dark).toMatch(/--flap: rgba\(255, 244, 224, 0\.2\)/);
    // The light fold is still the cream wedge at 0.6 / 0.3.
    expect(css).toMatch(/rgba\(255, 253, 247, 0\.6\), rgba\(255, 253, 247, 0\.3\)/);
    // Every variant sets its own corner direction for the hole.
    for (const v of ['cut', 'ragged', 'pinked']) expect(css).toMatch(new RegExp(`\\.cc-tape--${v} \\{[^}]*--corner-dir`));
  });

  it('paints the dark clipping as newsprint a step under the board, with a visible focus ring', () => {
    const lum = (hex: string) => {
      const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
      return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    };
    const dark = css.slice(css.indexOf("[data-scheme='dark'] {"));
    const tok = (n: string) => dark.match(new RegExp(`${n}: (#[0-9a-f]{6})`))![1];
    const clip = lum(tok('--clip-paper'));
    const board = lum(tok('--board'));
    expect(clip).toBeLessThan(board * 0.85);
    const ratio = (a: number, b: number) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    expect(ratio(lum(tok('--clip-ink')), clip)).toBeGreaterThanOrEqual(4.5);
    expect(home).toMatch(/\.specimens \.des:focus-visible \{ outline: 2px solid var\(--clip-ink\)/);
  });

  it('puts the lenticels on the twig curve, and the Sent and Contact stamp and cancel together', () => {
    expect(read('assets/Pressed.astro')).toMatch(/Lenticels sit ON the twig/);
    expect(sent).not.toMatch(/arcId="pm-arc-sent" flip/);
    expect(contact).toMatch(/\.postcard :global\(\.postmark\) \{[^}]*margin: -2rem 2\.2rem 0 0/s);
    // Cancel ink is muted in the dark scheme.
    expect(read('assets/Postmark.astro')).toMatch(/--pm-ink: color-mix\(in srgb, var\(--mark-muted\) 55%, transparent\)/);
  });

  it('keeps the ring clear of the heading by construction, not by a line count', () => {
    expect(contact).toMatch(/\.invite \{[^}]*padding-bottom: 2\.4rem/s);
    expect(contact).not.toMatch(/min-height: 5\.9rem/);
    expect(contact).not.toMatch(/Task 4 adds/);
    expect(sent).not.toMatch(/across the twine/);
  });

  it('shows the wax myrtle under the postcard at tablet and phone, and no resize grip or double rule', () => {
    expect(contact).toMatch(/@media \(max-width: 860px\) \{[^@]*\.post-posy \{[^}]*height: 6rem/s);
    expect(contact).toMatch(/\.pp-myrtle\) \{[^}]*rotate: 160deg/);
    expect(contact).toMatch(/resize: none/);
    expect(contact).not.toMatch(/resize: vertical/);
    // One rule at the edge: no bottom border over a faint rule.
    expect(contact).toMatch(/\.field textarea \{[^}]*border-bottom: 0/s);
  });

  it('has no dead duplicate type rules', () => {
    expect(css).not.toMatch(/\[data-theme='cottagecore'\] \.cc-hand \{[^}]*font-weight/);
    expect(css).not.toMatch(/\[data-theme='cottagecore'\] \.cc-note-link \{[^}]*font-size: 2rem/);
    expect(css).not.toMatch(/\[data-theme='cottagecore'\] :is\(h1, h2, h3\) \{[^}]*font-variation-settings/);
    expect(read('Header.astro')).not.toMatch(/font-size: 1\.45rem;\s*line-height: 1;\s*padding-block: 0\.6rem/);
  });

  it('draws a magnolia with a cone, thick creamy petals and a rust leaf', () => {
    const pressed = read('assets/Pressed.astro');
    const mag = pressed.slice(pressed.indexOf("if (kind === 'magnolia')"), pressed.indexOf("if (kind === 'passion')"));
    expect(mag).toContain("'cone'");
    expect(mag).toContain('petal--cream');
    expect(mag).toContain('leaf--rust');
    expect(mag).not.toMatch(/'heart'/);
    expect(css).toMatch(/\.pressed \.petal--cream/);
  });
});
