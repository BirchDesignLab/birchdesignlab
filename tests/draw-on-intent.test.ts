import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { drawOnIntent } from '../src/themes/portal/runtime';

/**
 * The founder's rules for drawing a school ahead (tier3-briefs/
 * stage0-decisions.md, "Call 1 revised" and "The press trigger"), pinned so an
 * edit that breaks one fails `npm run verify` rather than only a film:
 *   - a mouse resting 400 ms on a switcher row or Shuffle draws its page;
 *   - keyboard focus staying 500 ms draws it;
 *   - a press (mouse or touch) draws nothing, and touch never draws at all;
 *   - only the switcher's rows and Shuffle draw ahead, never a page link.
 * The rest being dropped when a navigation begins needs the router, so it is
 * checked in the browser (scripts/themes/harness/draw-ahead-check.mjs).
 */

const PATH = '/t/cottagecore/';

function setup() {
  const target = new EventTarget();
  const draw = vi.fn();
  drawOnIntent(target, () => PATH, draw);
  const fire = (type: string, init: Record<string, unknown> = {}) =>
    target.dispatchEvent(Object.assign(new Event(type), { relatedTarget: null, ...init }));
  return { target, draw, fire };
}

describe('drawOnIntent: when a school is drawn ahead', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('a mouse resting 400 ms draws the page, once', () => {
    const { draw, fire } = setup();
    fire('pointerover', { pointerType: 'mouse' });
    vi.advanceTimersByTime(399);
    expect(draw).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(draw).toHaveBeenCalledTimes(1);
    expect(draw).toHaveBeenCalledWith(PATH);
  });

  it('a mouse that leaves before 400 ms draws nothing (browsing the rows)', () => {
    const { draw, fire } = setup();
    fire('pointerover', { pointerType: 'mouse' });
    vi.advanceTimersByTime(350);
    fire('pointerout', { pointerType: 'mouse' });
    vi.advanceTimersByTime(1000);
    expect(draw).not.toHaveBeenCalled();
  });

  it('keyboard focus draws after 500 ms, not at the mouse rest', () => {
    const { draw, fire } = setup();
    fire('focusin');
    vi.advanceTimersByTime(499);
    expect(draw).not.toHaveBeenCalled();
    vi.advanceTimersByTime(1);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('a press draws nothing, mouse or touch (the founder dropped the press trigger)', () => {
    const { draw, fire } = setup();
    for (const pointerType of ['mouse', 'touch', 'pen']) fire('pointerdown', { pointerType });
    vi.advanceTimersByTime(2000);
    expect(draw).not.toHaveBeenCalled();
  });

  it('touch and pen never start a rest (phones do not draw ahead)', () => {
    const { draw, fire } = setup();
    fire('pointerover', { pointerType: 'touch' });
    fire('pointerover', { pointerType: 'pen' });
    vi.advanceTimersByTime(2000);
    expect(draw).not.toHaveBeenCalled();
  });

  it('listens for nothing but rest and leave: no press, click, key or touch listener', () => {
    const target = new EventTarget();
    const types: string[] = [];
    const add = target.addEventListener.bind(target);
    target.addEventListener = (type: string, ...rest: never[]) => { types.push(type); return add(type, ...rest); };
    drawOnIntent(target, () => PATH, vi.fn());
    expect(types.sort()).toEqual(['focusin', 'focusout', 'pointerout', 'pointerover']);
  });
});

describe('drawing ahead is wired to the switcher only', () => {
  /** Every .ts and .astro file under src/. */
  const walk = (dir: string): string[] =>
    readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      return statSync(p).isDirectory() ? walk(p) : /\.(ts|astro)$/.test(f) ? [p] : [];
    });
  const src = fileURLToPath(new URL('../src/', import.meta.url));
  const users = walk(src)
    .filter((f) => !f.endsWith(join('portal', 'runtime.ts')))
    .filter((f) => /\b(drawOnIntent|drawAheadOf)\b/.test(readFileSync(f, 'utf8')));

  it('only switcher.ts calls it outside the runtime (never a page link: the fixer withdrew that)', () => {
    expect(users.map((f) => relative(src, f).split(sep).join('/'))).toEqual(['themes/portal/switcher.ts']);
  });

  it('switcher.ts draws ahead for its dialog rows and Shuffle, and nothing else', () => {
    const s = readFileSync(join(src, 'themes', 'portal', 'switcher.ts'), 'utf8');
    expect([...s.matchAll(/drawOnIntent\((\w+),/g)].map((m) => m[1])).toEqual(['dialog', 'shuffle']);
    expect(s).not.toMatch(/drawAheadOf/);
  });
});

