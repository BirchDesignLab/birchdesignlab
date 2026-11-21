import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Stage 6 wave 3, task 23: cottagecore's dandelion clock and date stamp, pinned in source. */
const read = (p: string) => readFileSync(new URL(`../src/themes/cottagecore/${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const fx = read('fx.ts');
const toys = read('toys.ts');
const header = read('Header.astro');
const home = read('pages/Home.astro');
const contact = read('pages/Contact.astro');
const sent = read('pages/Sent.astro');
const dandelion = read('assets/Dandelion.astro');
const stamp = read('assets/DateStamp.astro');
const mark = read('assets/CancelMark.astro');

describe('the toys are inert, aria-hidden and wordless', () => {
  it('marks every toy aria-hidden with a data-cc-toy hook and no focusable control', () => {
    expect(dandelion).toMatch(/data-cc-toy="dandelion" aria-hidden="true"/);
    expect(stamp).toMatch(/data-cc-toy="stamp" data-pad=\{pad\} aria-hidden="true"/);
    for (const src of [dandelion, stamp, mark]) {
      expect(src).not.toMatch(/tabindex|<button|<a /);
      expect(src).toContain('focusable="false"');
    }
    expect(mark).toMatch(/aria-hidden="true"/);
  });

  it('adds no visible word: the only lettering is the postmark ring and date, in aria-hidden SVG', () => {
    expect(mark).toContain('GULF COAST MS');
    expect(mark).toContain('SEP 23 2026');
    expect(dandelion).not.toMatch(/<text/);
    expect(stamp).not.toMatch(/<text/);
    for (const src of [dandelion, stamp, mark, toys]) expect(src).not.toMatch(/aria-label|<title|<desc/);
  });

  it('gates hover to fine pointers and shows a cursor there; the nudge needs no hover', () => {
    for (const src of [dandelion, stamp]) {
      expect(src).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{[^}]*cursor: pointer;/s);
      expect(src).toMatch(/\[data-nudge\]/);
    }
    // every :hover is inside the media block
    for (const src of [dandelion, stamp]) {
      const css = src.slice(src.indexOf('<style>'));
      const outside = css.replace(/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n  \}/g, '');
      expect(outside).not.toContain(':hover');
    }
  });

  it('lets a vertical swipe scroll: no touch-action none, a touch acts on the release', () => {
    for (const src of [dandelion, stamp]) {
      expect(src).toMatch(/touch-action: manipulation;/);
      expect(src).not.toMatch(/touch-action: none/);
    }
    expect(toys).toMatch(/if \(e\.pointerType === 'mouse'\) \{\s*if \(e\.button === 0\) fire\(\);\s*return;\s*\}/);
    expect(toys).toMatch(/if \(!p \|\| p\.moved \|\| Math\.abs\(window\.scrollY - p\.sy\) > 3\) return;/);
    expect(toys).toContain("el.addEventListener('pointercancel', onCancel);");
  });
});

describe('the dandelion clock (Home closer, Sent)', () => {
  it('stands in the Home closer beside the lavender and under the button on narrow widths', () => {
    expect(home).toContain('<Dandelion class="c-clock" />');
    expect(home).toMatch(/\.closer :global\(\.c-clock\) \{ position: absolute; bottom: -1rem; width: 7\.6rem; left: max\(0px, calc\(50% - 25rem - 8\.6rem\)\)/);
    expect(home).toMatch(/\.closer \{ padding-bottom: 11.6rem; \}/);
    expect(home).toMatch(/\.closer :global\(\.c-left\), \.closer :global\(\.c-right\) \{ width: 4rem; bottom: 15.8rem; \}/);
  });

  it('lies under the Sent envelope with the date stamp', () => {
    expect(sent).toContain('<Dandelion class="sent-clock" />');
    expect(sent).toContain('<DateStamp class="sent-stamp" pad="#cc-pad-sent" />');
  });

  it('draws 26 hairline seeds, each a path the toy can take off', () => {
    expect(dandelion).toMatch(/const N = 26;/);
    expect(dandelion).toContain('<path class="sd"');
  });

  it('blows 6 to 10 seeds, nearest a random bearing, refilling over 20 s', () => {
    expect(toys).toMatch(/const BLOW = \{ min: 6, max: 10, refillMs: 20000,/);
    expect(toys).toMatch(/Math\.min\(here\.length, Math\.round\(rand\(BLOW\.min, BLOW\.max\)\)\)/);
    expect(toys).toMatch(/s\.animate\(\[/);
    expect(toys).toMatch(/\{ duration: BLOW\.refillMs, easing: 'linear', fill: 'none' \}/);
    // a seed mid-refill is not blown again
    expect(toys).toMatch(/const present = \(s: SVGPathElement\) => !anims\.has\(s\) && !asked\.has\(s\);/);
  });

  it('lifts off the head only the seeds fx.ts says it released (round 1, C1)', () => {
    // fire() picks the candidates and asks; the bald patch is built in report(), from the indices fx.ts answers with
    expect(toys).toMatch(/report\?: \(placed: number\[\]\) => void;/);
    expect(toys).toMatch(/report = \(placed\) => \{[\s\S]*?bald\(placed\.map\(\(i\) => go\[i\]\)\.filter\(Boolean\)\);/);
    const fire = toys.slice(toys.indexOf('const fire = () =>'), toys.indexOf('const offPress'));
    expect(fire).not.toMatch(/\bs\.animate\(/);
    expect(toys).toMatch(/if \(report\) window\.setTimeout\(\(\) => report\?\.\(\[\]\), 1500\);/);
    expect(toys).toMatch(/alive = false;\s*asked\.clear\(\);/);
  });

  it('sends one cc:blow event and, in the dark scheme, blows nothing', () => {
    expect(toys).toContain("export const BLOW_EVENT = 'cc:blow';");
    expect(toys).toMatch(/if \(!dark\) \{/);
    expect(toys).toMatch(/\} else \{\s*\/\/ By lamplight the same spot calls a firefly/);
    expect(toys).toMatch(/window\.dispatchEvent\(new CustomEvent<BlowDetail>\(BLOW_EVENT/);
  });
});

describe('fx.ts takes the release', () => {
  it('reads the event with one listener and removes it on teardown', () => {
    expect(fx.match(/window\.addEventListener\('cc:blow', onBlow\);/g)).toHaveLength(1);
    expect(fx.match(/window\.removeEventListener\('cc:blow', onBlow\);/g)).toHaveLength(1);
  });

  it('ignores a press on a toy, so a toy press is never also a tap on the cloth', () => {
    expect(fx).toMatch(/const onToy = \(e: PointerEvent\) => e\.target instanceof Element && !!e\.target\.closest\('\[data-cc-toy\]'\);/);
    expect(fx).toMatch(/const onPointerDown = \(e: PointerEvent\) => \{\s*if \(onToy\(e\)\) return;/);
  });

  it('seats a puff by the seat rules, along the path of its kick, and never re-seats it', () => {
    const fn = fx.slice(fx.indexOf('const releasePuff'), fx.indexOf('const draw = '));
    expect(fn).toMatch(/!seatClear\(x, y, kk, sy, turn, angle\)/);
    expect(fn).toMatch(/seatLife\(sx, sy2, kk, vx, vy, sy, turn, angle\) < SEED\.seatMinLife/);
    expect(fn).toMatch(/if \(!placed\) continue;/);
    // it answers with the indices it placed, on every path (placed, none seated, window passed, dark, teardown)
    expect(fn).toMatch(/placedAt\.push\(i\);/);
    expect(fx).toMatch(/else b\.report\?\.\(releasePuff\(t, sy, b\)\);|b\.report\?\.\(releasePuff\(t, sy, b\)\)/);
    expect(fx.match(/\.report\?\.\(\[\]\)|b\.report\?\.\(\[\]\)/g)!.length).toBeGreaterThanOrEqual(4);
    // the cancel marks are not text to keep seeds off
    expect(fx).toMatch(/closest\('\.cancel-pad'\)/);
    expect(fx).toMatch(/if \(s\.held \|\| s\.puff\) continue;/);
    expect(fx).toMatch(/for \(const s of seeds\) if \(!s\.held && !s\.puff && s\.cover > 0\.5/);
  });

  it('caps the live puffs, fades the oldest and lets one go when it leaves the view', () => {
    expect(fx).toMatch(/const PUFF = \{ cap: 30, life: 42000, fade: 2500,/);
    expect(fx).toMatch(/for \(const s of live\.slice\(0, over\)\) s\.dieAt = Math\.min\(s\.dieAt \?\? 0, t \+ 700\);/);
    expect(fx).toMatch(/if \(s\.puff\) \{ s\.dieAt = t; continue; \}/);
    expect(fx).toMatch(/if \(spent\) seeds = seeds\.filter\(\(s\) => !\(s\.puff && t >= \(s\.dieAt \?\? 0\)\)\);/);
  });

  it('in the dark scheme turns the event into a tap on clear cloth whose mote rises', () => {
    expect(fx).toMatch(/tap\.clear = true;\s*tap\.rise = true;\s*tap\.pending = true;/);
    expect(fx).toMatch(/tap\.rise \? 4 : 2/);
    expect(fx).toMatch(/if \(m\.call\.rise\) m\.vy = -1\.4;/);
    expect(fx).toMatch(/tap\.pending = false;\s*tap\.rise = false;/);
  });
});

describe('the date stamp (Contact, Sent)', () => {
  it('stands on the cloth beside the Contact postcard and lays marks over its postage stamp', () => {
    expect(contact).toContain('<DateStamp class="pp-stamp" pad="#cc-pad-contact" />');
    expect(contact).toMatch(/<div class="cancel-pad" id="cc-pad-contact" data-jx="0\.9" data-jy="1\.8" aria-hidden="true">/);
    // the layer is the postage stamp's own box and takes no press
    expect(contact).toMatch(/\.cancel-pad \{\s*grid-column: 2; grid-row: 1; align-self: end;[\s\S]*?width: 5\.6rem; height: 6\.6rem;[\s\S]*?pointer-events: none;/);
    // six slots, so five show and the oldest is fading as the next is laid
    expect(contact).toMatch(/\{\[1, 2, 3, 4, 5, 6\]\.map\(/);
  });

  it('keeps one mark on Sent: one press cancels the stamp afresh', () => {
    expect(sent).toMatch(/<div class="cancel-pad" id="cc-pad-sent"[^>]*>\s*<CancelMark arcId="cm-arc-s1" \/>\s*<\/div>/);
  });

  it('lays a fresh mark at a random angle and ink, ages the rest, and fades the oldest to nothing', () => {
    expect(toys).toMatch(/const AGE_INK = \[1, 0\.8, 0\.6, 0\.42, 0\.26, 0\];/);
    expect(toys).toMatch(/rand\(-70, 70\)/);
    expect(toys).toMatch(/base\[fresh\] = rand\(0\.4, 0\.92\);/);
    expect(toys).toMatch(/for \(let i = 1; i < slots\.length; i\+\+\) if \(age\[i\] > age\[fresh\]\) fresh = i;/);
    expect(toys).toMatch(/\{ duration: 150, delay: Math\.round\(PRESS_MS \* CONTACT\)/);
  });

  it('uses the postmark ring and date and its ink, a little stronger by lamplight', () => {
    expect(mark).toContain('r="33"');
    expect(mark).toContain('r="24.5"');
    expect(mark).toMatch(/--cm-ink: color-mix\(in srgb, var\(--mark-muted\) 85%, transparent\)/);
  });
});

describe('lifecycle', () => {
  it('mounts from the header with onMount and returns one teardown that undoes everything', () => {
    expect(header).toMatch(/import \{ mountToys \} from '\.\/toys';/);
    expect(header).toMatch(/mountToys\(\);/);
    expect(toys).toMatch(/if \(document\.documentElement\.dataset\.theme !== SCHOOL\) return;/);
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel', 'contextmenu']) {
      expect(toys).toContain(`el.addEventListener('${ev}'`);
      expect(toys).toContain(`el.removeEventListener('${ev}'`);
    }
    expect(toys).toMatch(/a\.oncancel = a\.onfinish = null; a\.cancel\(\);/);
    expect(toys).toMatch(/io\?\.disconnect\(\);/);
    expect(toys).toContain("el.addEventListener('mousedown', onMouseDown);");
    expect(toys).not.toMatch(/localStorage|sessionStorage|fetch\(|Audio|new Audio/);
    expect(toys).not.toMatch(/setInterval|requestAnimationFrame/);
  });
});
