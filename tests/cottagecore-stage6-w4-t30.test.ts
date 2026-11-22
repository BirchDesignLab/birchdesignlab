import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Stage 6 wave 4, task 30: cottagecore's closing C (critique B1 to B4, A1; task 19, 23 and 27 minors), pinned in source. */
const read = (p: string) => readFileSync(new URL(`../src/themes/cottagecore/${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fx = read('fx.ts');
const toys = read('toys.ts');
const needle = read('needle.ts');
const css = read('theme.css');
const meta = read('meta.ts');
const home = read('pages/Home.astro');
const sent = read('pages/Sent.astro');

describe('released seeds start small and grow (B1)', () => {
  it('gives each puff a bornAt and waits n x 70 ms (n = seeds already seated), still and undrawn', () => {
    expect(fx).toMatch(/stagger: 70, grow0: 0\.3, growMs: 1400/);
    // The stagger counts seated seeds (Stage 6 minor m7), never the point index, which counts points with no seat.
    const rel = fx.slice(fx.indexOf('const releasePuff'), fx.indexOf('const draw = '));
    expect(rel).not.toMatch(/i \* PUFF\.stagger/);
    expect(rel).toContain('const wait = placedAt.length * PUFF.stagger;');
    expect(rel).toContain('s.bornAt = t + wait;');
    expect(rel).toContain('s.dieAt = (s.dieAt ?? t) + wait;');
    expect(rel.indexOf('if (!placed) continue;')).toBeLessThan(rel.indexOf('const wait = placedAt.length'));
    expect(rel.indexOf('const wait = placedAt.length')).toBeLessThan(rel.indexOf('placedAt.push(i);'));
    expect(fx).toContain('if (s.puff && !still && t < (s.bornAt ?? 0)) continue;');
  });
  it('scales only the drawImage size, never s.size', () => {
    expect(fx).toContain('const g = s.puff && !still ? puffGrowth(t - (s.bornAt ?? 0)) : 1;');
    expect(fx).toContain('-SEED_ANCHOR.x * kk * g');
    const release = fx.slice(fx.indexOf('const releasePuff'), fx.indexOf('const draw = '));
    expect(release).not.toMatch(/size = [^;]*puffGrowth|\.size \*=|\.size = .*0\.3/);
  });
});

describe('the closer, the needle and Sent (B2, B3, B4)', () => {
  it('keeps the closer padding the puff probe holds (9.6rem lost seeds at 1000, 820 and 390)', () => {
    expect(home).toMatch(/\.closer \{ padding-bottom: 11\.6rem; \}/);
  });
  it('trims the stale CC6 comment to its history line (19/C2)', () => {
    expect(home).not.toContain('The copy block lets its three children join the hero grid');
    expect(home).toContain('so the sheet slides right into it. It is a float now (task 19, below)');
  });
  it('light rose thread is the rose-deep over dark\'s edge, with a contrast row', () => {
    expect(css).toContain('--thread-rose: var(--cc-rose-deep);');
    expect(css.match(/--thread-rose-edge: #7a3440;/g)).toHaveLength(2);
    expect(meta).toMatch(/fg: '--thread-rose', bg: \['--hoop-cloth'\], min: 3/);
  });
  it('Sent from 600 to 820: the toys leave the row for the gutters beside the envelope', () => {
    const q = sent.slice(sent.indexOf('@media (min-width: 600px) and (max-width: 820px)'));
    expect(q).toContain('.env-col { position: relative; }');
    expect(q).toMatch(/\.toys \{ position: absolute; inset: 0;/);
    expect(q).toContain('right: calc(50% + min(38%, 9rem) + 1.2rem)');
    expect(q).toContain('left: calc(50% + min(38%, 9rem) + 1.2rem)');
    expect(sent).toContain('pad="#cc-pad-sent"');
  });
});

describe('minors', () => {
  it('phone seeds under sizeMin seat only inside the header band (19/C3)', () => {
    expect(fx).toContain('const tiny = size < SEED.sizeMin;');
    expect(fx).toContain('if (tiny && !inHeaderBand(x, y, k, sy, turn, angle)) continue;');
    expect(fx).toContain("const head = document.querySelector('header');");
  });
  it('a cancel mark at opacity 0 is not text, one that shows is, and a press measures again (23/C2)', () => {
    expect(fx).toContain("closest('.cancel-pad .cm')");
    expect(fx).toContain('< 0.05');
    expect(fx.match(/window\.addEventListener\('cc:stamp', onStamp\);/g)).toHaveLength(1);
    expect(fx.match(/window\.removeEventListener\('cc:stamp', onStamp\);/g)).toHaveLength(1);
    expect(toys).toContain("export const STAMP_EVENT = 'cc:stamp';");
    expect(toys).toContain('window.dispatchEvent(new Event(STAMP_EVENT));');
  });
  it('a thread colour flips only when a thread was sewn (27/C1)', () => {
    const fin = needle.slice(needle.indexOf('const finish = () =>'), needle.indexOf('const removeThread'));
    expect(fin.indexOf('removeThread(th); return;')).toBeLessThan(fin.indexOf('nextC = (nextC ^ 1)'));
  });
  it('the word mask follows the manifesto and the hoop while a thread lives (27/C2)', () => {
    expect(needle).toContain('ro = new ResizeObserver(() => { if (alive && framed && threads.length) measure(); });');
    expect(needle).toContain('ro.observe(hoop);');
    expect(needle).toContain("cloth.querySelector('.manifesto')");
  });
  it('the needle is held clear of the call-to-action (27/C3)', () => {
    expect(needle).toContain('p.y = Math.min(p.y, avoid.t - avoid.reachDown);');
  });
  it('the loop\'s first frame uses the rAF timestamp, so dt and the travel\'s t are never negative (27/C4)', () => {
    expect(needle).toContain('lastFrame = 0;');
    expect(needle).toContain('if (!lastFrame) lastFrame = now;');
    expect(needle).toContain('const dt = Math.max(0, Math.min(64, now - lastFrame));');
    expect(needle).toContain('Math.min(1, Math.max(0, (now - tr.t0) / tr.dur))');
  });
});

describe('the touch beat for the clock, the stamp and the needle (A1)', () => {
  it('runs on the common conditions, touch only, once per page visit', () => {
    expect(toys).toContain("import { scheduleBeat } from '../bauhaus/parts/beat';");
    expect(toys).toMatch(/cottagecore:clock:\$\{location\.pathname\}/);
    expect(toys).toMatch(/cottagecore:stamp:\$\{location\.pathname\}/);
    expect(toys).toMatch(/if \(mouseHere\(\)\) return \(\) => \{\};/);
    expect(toys).not.toContain('nudgeOnce');
    expect(needle).toContain("scheduleBeat('cottagecore:needle', [body],");
    expect(needle).not.toContain('nudgeIo');
  });
});
