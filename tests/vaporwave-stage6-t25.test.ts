import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { cellOf, nearestFree } from '../src/themes/vaporwave/desktop';
import { FLOORS, START_FLOOR, route } from '../src/themes/vaporwave/elevator';

/** Stage 6 wave 3, task 25: vaporwave's Sent desktop and the Home elevator.
    Behaviour is filmed (the task report); these pin the decisions in source
    and test the pure helpers. */
const read = (p: string) => readFileSync(`src/themes/vaporwave/${p}`, 'utf8');
const sent = read('pages/Sent.astro');
const home = read('pages/Home.astro');
const desktop = read('desktop.ts');
const elevator = read('elevator.ts');
const windows = read('windows.ts');
const win = read('parts/Win.astro');

describe('the icon grid', () => {
  it('puts a point in the nearest whole cell, clamped to the grid', () => {
    expect(cellOf(0, 88, 4)).toBe(0);
    expect(cellOf(43, 88, 4)).toBe(0);
    expect(cellOf(45, 88, 4)).toBe(1);
    expect(cellOf(-300, 88, 4)).toBe(0);
    expect(cellOf(900, 88, 4)).toBe(3);
  });
  it('finds the nearest free cell, and none on a full grid', () => {
    expect(nearestFree(1, 1, 3, 3, new Set())).toEqual([1, 1]);
    expect(nearestFree(1, 1, 3, 3, new Set(['1,1']))).toEqual(expect.arrayContaining([expect.any(Number)]));
    const near = nearestFree(0, 0, 3, 1, new Set(['0,0', '1,0']));
    expect(near).toEqual([2, 0]);
    const full = new Set(['0,0', '1,0']);
    expect(nearestFree(0, 0, 2, 1, full)).toBeNull();
  });
});

describe('the Sent desktop (stop 3 answer 3 words)', () => {
  it('uses only the approved words', () => {
    for (const w of ['My Computer', 'Recycle Bin', 'readme.txt', 'birch.exe', '0 object(s)']) expect(sent).toContain(w);
  });
  it('makes each icon a real button with its visible name in an aria-hidden span', () => {
    for (const key of ['computer', 'bin', 'exe', 'readme']) expect(sent).toContain(`data-desk-icon="${key}"`);
    expect(sent).toMatch(/<button type="button" class="desktop-icon" data-desk-icon="computer" aria-label="My Computer: opens a window">/);
    expect(sent).toContain('<span class="icon-label" aria-hidden="true">My Computer</span>');
  });
  it('ships the windows hidden and aria-hidden, each with a real X', () => {
    for (const key of ['computer', 'bin', 'readme']) {
      expect(sent).toMatch(new RegExp(`data-desk-win="${key}" data-touch-drag hidden aria-hidden="true"`));
    }
    expect(sent).toContain('closeLabel="Close My Computer"');
    expect(win).toContain('<button type="button" class="close vw-win-x" aria-label={closeLabel} data-win-close>');
    expect(win).toContain('<span class="vw-win-title" aria-hidden="true">{title}</span>');
  });
  it('lists the site page names in the Notepad, as plain text', () => {
    for (const f of ['index.htm', 'about.htm', 'services.htm', 'contact.htm']) expect(sent).toContain(`<li>${f}</li>`);
  });
  it('keeps the message window above the icons and clamps the clip to the inline axis', () => {
    expect(sent).toContain('width: min(100%, 560px); z-index: 5;');
    expect(sent).toContain('position: absolute; z-index: 1; pointer-events: none;');
    expect(sent).toContain('overflow-x: clip;');
  });
  it('keeps the icon row to four tracks up to 800px, clear of the centred message window (fix round 1)', () => {
    // 4 x 88 does not fit the 338px layer at 360, and the column from 701px sat under the dialog until about 760.
    expect(sent).toContain('@media (max-width: 800px)');
    expect(sent).toContain('grid-template-columns: repeat(4, minmax(0, var(--cw)));');
    expect(sent).toContain('.desktop-icon { width: 100%; }');
    expect(sent).not.toContain('repeat(auto-fill, var(--cw))');
    // desktop.ts reads the real, fractional cell pitch, not the rounded offsetWidth.
    expect(desktop).toContain('icons[0].getBoundingClientRect()');
    expect(desktop).not.toContain('first.offsetWidth');
  });
  it('opens on a double-click, a double tap and Enter; closes on the X and Escape', () => {
    expect(desktop).toContain("on(el, 'dblclick', () => open(el));");
    expect(desktop).toContain('now - lastTap.t < TAP_MS');
    expect(desktop).toContain("if (event.key !== 'Enter' || event.repeat) return;");
    expect(desktop).toContain("event.key !== 'Escape'");
    expect(desktop).toContain("'[data-win-close]'");
  });
  it('lets a vertical swipe scroll: a finger picks up after 200 ms or a horizontal move over 8px', () => {
    expect(desktop).toContain('const HOLD_MS = 200;');
    expect(desktop).toContain('const SLOP_PX = 8;');
    expect(sent).toContain('touch-action: pan-y;');
    expect(windows).toContain("win.hasAttribute('data-touch-drag')");
    expect(windows).toContain('const TOUCH_HOLD_MS = 200;');
  });
  it('hands the front and the caption to mountWindowActivation by event', () => {
    expect(windows).toContain("export const ACTIVATE_EVENT = 'vw-activate';");
    expect(windows).toContain('win.addEventListener(ACTIVATE_EVENT, onRequest);');
    expect(desktop).toContain('win.dispatchEvent(new CustomEvent(ACTIVATE_EVENT));');
  });
  it('mounts through onMount and cleans up every listener, timer, loop and window', () => {
    expect(sent).toContain('onMount(mountDesktop);');
    expect(desktop).toMatch(/return \(\) => \{\s*abort\.abort\(\);\s*window\.clearTimeout\(beatTimer\);\s*stopWait\(\);\s*endSaver\(false\);[\s\S]*closeWindow\(win, false\)[\s\S]*for \(const fn of cleanups\) fn\(\);/);
    expect(desktop).toContain('loop?.destroy();');
    expect(desktop).toContain("cleanups.push(() => resizer.disconnect());");
  });
  it('ends the screensaver on any key (Escape included, and only that), a click or a tap', () => {
    expect(desktop).toContain('event.stopImmediatePropagation();');
    expect(desktop).toContain("document.addEventListener('keydown', onSaverKey, true);");
    expect(desktop).toContain("saver.addEventListener('click', onSaverClick);");
  });
  it('reuses the existing pipes loop instead of a second canvas pipeline', () => {
    expect(desktop).toContain("import { createLoop } from './screensaver';");
    expect(desktop).toContain("loop.setMode('pipes');");
  });
  it('stores nothing and plays no sound', () => {
    for (const src of [desktop, elevator]) {
      expect(src).not.toMatch(/localStorage|sessionStorage|indexedDB|AudioContext|new Audio|\.play\(\)/);
    }
  });
});

describe('the elevator', () => {
  it('has the three floors, the car starting at 1F', () => {
    expect(FLOORS).toEqual(['B1', '1F', '2F']);
    expect(START_FLOOR).toBe(1);
  });
  it('steps a floor at a time', () => {
    expect(route(1, 0)).toEqual([0]);
    expect(route(0, 2)).toEqual([1, 2]);
    expect(route(2, 0)).toEqual([1, 0]);
    expect(route(1, 1)).toEqual([]);
  });
  it('is three real buttons, aria-pressed, the words in aria-hidden spans, the readout aria-hidden', () => {
    for (const [n, label] of [['0', 'B1 software'], ['1', '1F web'], ['2', '2F lab']]) {
      expect(home).toContain(`data-floor="${n}" aria-label="${label}" aria-pressed="false"`);
    }
    expect(home).toContain('<div class="floor-box" aria-hidden="true" data-floor-box>');
    expect(elevator).toContain("b.setAttribute('aria-pressed', String(i === floor))");
  });
  it('activates B1 and 1F as the doors and flips the CRT for 2F, navigating nowhere', () => {
    expect(elevator).toContain("bring(document.querySelector('.door-0'))");
    expect(elevator).toContain("bring(document.querySelector('.door-1'))");
    expect(elevator).toContain("door.dispatchEvent(new CustomEvent(ACTIVATE_EVENT))");
    expect(elevator).toContain("screen.classList.add('flip')");
    // Task 29 (C5): B1 and 1F scroll their window into view when it is off screen, and nothing else scrolls or navigates.
    expect(elevator).not.toMatch(/location|history|scrollTo|\.href/);
    expect(elevator.match(/scrollIntoView/g)).toHaveLength(1);
    expect(elevator).toContain("door.scrollIntoView({ behavior: 'smooth', block: 'center' })");
  });
  it('mounts on Home through onMount and gates its hover', () => {
    expect(home).toContain('onMount(mountElevator);');
    expect(home).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.floor\[aria-pressed='false'\]:hover/);
  });
  it('keeps the keys and the readout clear of the props: the stand deepens under 900px', () => {
    expect(home).toContain('padding-bottom: calc(0.78 * clamp(82px, 20.95vw, 136px) - 7px);');
  });
});
