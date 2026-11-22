import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { offScreen } from '../src/themes/vaporwave/elevator';
import { swipeAxis } from '../src/themes/vaporwave/deck';

/* Stage 6 wave 4 task 29 (stop 4 critique C5, the signifier rule, and the
   task 19, 24 and 25 minors) for vaporwave: source checks and the pure
   helpers. The behaviour is filmed and measured by
   scripts/themes/stage6/w4-t29-*.mjs. */

const read = (p: string) => readFileSync(`src/themes/vaporwave/${p}`, 'utf8').replace(/\r\n/g, '\n');
const elevator = read('elevator.ts');
const deck = read('deck.ts');
const desktop = read('desktop.ts');
const windows = read('windows.ts');
const css = read('theme.css');
const home = read('pages/Home.astro');
const sent = read('pages/Sent.astro');
const meta = read('meta.ts');

describe('C5: the elevator scrolls an off-screen window into view', () => {
  it('offScreen says a rect with nothing in the viewport\'s height is off screen, and any overlap is in view', () => {
    expect(offScreen({ top: -400, bottom: -10 }, 844)).toBe(true);
    expect(offScreen({ top: 900, bottom: 1300 }, 844)).toBe(true);
    expect(offScreen({ top: 844, bottom: 1200 }, 844)).toBe(true);
    expect(offScreen({ top: 100, bottom: 500 }, 844)).toBe(false);
    expect(offScreen({ top: -200, bottom: 20 }, 844)).toBe(false);
    expect(offScreen({ top: 800, bottom: 1200 }, 844)).toBe(false);
  });
  it('B1 and 1F activate the window first, then scroll it to the middle only when it is off screen', () => {
    const bring = elevator.slice(elevator.indexOf('const bring ='), elevator.indexOf('const arrive ='));
    expect(bring.indexOf('door.dispatchEvent(new CustomEvent(ACTIVATE_EVENT))')).toBeGreaterThan(0);
    expect(bring.indexOf('offScreen(door.getBoundingClientRect(), window.innerHeight)')).toBeGreaterThan(bring.indexOf('dispatchEvent'));
    // Only on the phone and tablet layouts: the desktop (1440) scrolls nothing.
    expect(elevator).toContain("export const BRING_QUERY = '(max-width: 900px)';");
    expect(bring).toContain('window.matchMedia(BRING_QUERY).matches && offScreen(');
    expect(bring).toContain("door.scrollIntoView({ behavior: 'smooth', block: 'center' })");
    expect(elevator).toContain("if (floor === 0) bring(document.querySelector('.door-0'));");
    expect(elevator).toContain("else if (floor === 1) bring(document.querySelector('.door-1'));");
  });
  it('2F stays as built: it flips the CRT and scrolls nothing', () => {
    const arrive = elevator.slice(elevator.indexOf('const arrive ='), elevator.indexOf('const step ='));
    expect(arrive).toContain("screen.classList.add('flip')");
    expect(arrive).not.toContain('scrollIntoView');
  });
});

describe('19/C2: the kiosk props never get smaller across 900 to 901', () => {
  const block = home.slice(home.indexOf('@media (max-width: 900px)'));
  it('both props step down to the desktop\'s 108px at 900, from 820', () => {
    expect(block).toContain('max(108px, calc(178px - (100vw - 820px) * 0.875))');
    expect(block).toContain('max(108px, calc(136px - (100vw - 820px) * 0.35))');
  });
});

describe('24/C1, C2, C3 and C4: the remote and the window comment', () => {
  it('C1: an arrow press with any modifier is not the remote\'s', () => {
    expect(deck).toMatch(/if \(event\.altKey \|\| event\.ctrlKey \|\| event\.metaKey \|\| event\.shiftKey\) return;\s*cancelBeat\(\);\s*event\.preventDefault\(\);/);
  });
  it('C2: a vertical drag cancels the click as a horizontal one does', () => {
    expect(deck).toMatch(/if \(axis === 'y'\) \{[^}]*suppressClick = true;\s*return;/);
    expect(deck).toMatch(/suppressClick = true;\s*try \{ hero\.setPointerCapture/);
  });
  it('C3: the line between scanning and scrolling is the diagonal, so no swipe is neither', () => {
    for (let deg = 5; deg < 90; deg += 1) {
      if (deg === 45) continue; // the diagonal itself: equal sides, the browser's own tie
      const dx = Math.cos((deg * Math.PI) / 180) * 40;
      const dy = Math.sin((deg * Math.PI) / 180) * 40;
      expect(swipeAxis(dx, dy)).toBe(deg < 45 ? 'x' : 'y');
    }
    expect(swipeAxis(6, 5)).toBeNull();
    expect(deck).not.toContain('ay * 1.5');
  });
  it('C4: windows.ts says a finger activates on release, not on pointerdown', () => {
    expect(windows).not.toMatch(/pointerdown still brings the window to the\s*\n \* front/);
    expect(windows).toMatch(/a finger brings a window to the\s*\n \* front on\s*\n \* release|a finger brings a window to the front on\s*\n? ?\* ?release/);
  });
});

describe('25/C3 and C4: the drive glyphs and the phone windows', () => {
  const drives = sent.slice(sent.indexOf('<div class="drives"'), sent.indexOf('</div>', sent.indexOf('<div class="drives"')));
  it('C3: no drive glyph is filled with the bevel highlight; the bodies are the school\'s ink on the window\'s face', () => {
    expect(drives).not.toContain('--bevel-hi');
    expect(drives).toContain('--mark-muted');
    expect(meta).toMatch(/fg: '--mark-muted', bg: \['--field-raised'\], min: 4\.5, note: '[^']*drive glyphs/);
  });
  it('C4: a phone window opens below the icon row (the layer\'s top plus one cell)', () => {
    expect(sent).toContain('top: calc(var(--ltop) + var(--ch) + 0.4rem + var(--wn) * 2.2rem);');
  });
});

describe('the signifier rule (stop 4 critique A1) for vaporwave', () => {
  it('a window title bar has the grab cursor and a gated hover only where windows.ts mounted a drag on it', () => {
    expect(windows).toContain("bar.setAttribute('data-drag', '')");
    expect(windows).toContain("bar.removeAttribute('data-drag')");
    const at = css.indexOf(".vw-win-bar[data-drag] { cursor: grab; }");
    expect(at).toBeGreaterThan(0);
    expect(css.lastIndexOf('@media (hover: hover) and (pointer: fine)', at)).toBeGreaterThan(css.lastIndexOf('\n}\n', at));
    expect(css).toMatch(/\.vw-win-bar\[data-drag\]:hover \{ box-shadow: inset 0 -2px 0 var\(--bar-ink\); \}/);
    expect(css).toMatch(/\.vw-win-bar\.inactive\[data-drag\]:hover \{ box-shadow: inset 0 -2px 0 var\(--bar-ink-dim\); \}/);
    expect(css).not.toMatch(/\.vw-win-bar \{[^}]*cursor: grab;/);
  });
  it('the remote, the Sent icons and the elevator keys keep their pointer cursors and gated hovers', () => {
    expect(home).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.deck \{ cursor: pointer; \}\s*\.deck:hover/);
    expect(home).toMatch(/\.floor \{\s*appearance: none; margin: 0; cursor: pointer;/);
    expect(home).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.floor\[aria-pressed='false'\]:hover/);
    expect(sent).toMatch(/pointer-events: auto; cursor: pointer;/);
    expect(sent).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.desktop-icon:not\(\[data-selected\]\):hover \.icon-label/);
  });
  it('the remote, the Sent icons and the elevator each have one touch beat on the common conditions, for a finger only', () => {
    expect(deck).toContain("import { scheduleBeat, spendBeat } from '../bauhaus/parts/beat'");
    expect(deck).toContain("const BEAT_KEY = 'vaporwave:remote'");
    expect(deck).toMatch(/scheduleBeat\(BEAT_KEY, \[button\], beat, abort\.signal, \(\) => mode === 'play' && !gesture && inView\)/);
    expect(desktop).toContain("'vaporwave:icons'");
    expect(desktop).toContain("import { scheduleBeat } from '../bauhaus/parts/beat'");
    expect(elevator).toContain("scheduleBeat('vaporwave:elevator', [elevator], beat, abort.signal,");
    for (const src of [deck, desktop, elevator]) {
      expect(src).toContain("window.matchMedia('(hover: hover) and (pointer: fine)').matches");
      expect(src.match(/scheduleBeat\(/g)).toHaveLength(1);
    }
  });
  it('the remote\'s beat is one short pause that the visitor can take over, and the elevator\'s lights, opens and scrolls nothing', () => {
    expect(deck).toContain('export const BEAT_PAUSE_MS = 700');
    expect(deck).toMatch(/const cancelBeat = \(\) => \{\s*if \(!beating\) return;/);
    const beat = elevator.slice(elevator.indexOf('const beat = () =>'), elevator.indexOf('if (elevator &&'));
    expect(beat).not.toMatch(/aria-pressed|ACTIVATE_EVENT|scrollIntoView|classList\.add\('flip'\)/);
  });
  it('the icons\' beat selects the first icon in view for a moment and lets go unless the visitor has picked something', () => {
    expect(desktop).toContain('const BEAT_SELECT_MS = 1300');
    expect(desktop).toMatch(/if \(selected === icon\) select\(null\);/);
  });
  it('no beat stores anything, loops or plays a sound', () => {
    for (const src of [deck, desktop, elevator]) {
      const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
      expect(code).not.toMatch(/setInterval|localStorage|sessionStorage|Audio/);
    }
  });
});
