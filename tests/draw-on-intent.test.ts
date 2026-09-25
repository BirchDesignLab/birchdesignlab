import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  drawOnIntent, navigationBegan, swapBegan, navigationLanded, navigationRefused, pageRestored,
} from '../src/themes/portal/runtime';

/**
 * The founder's rules for drawing a school ahead (tier3-briefs/
 * stage0-decisions.md, "Call 1 revised" and "The press trigger"), pinned so an
 * edit that breaks one fails `npm run verify` rather than only a film:
 *   - a mouse resting 400 ms on a switcher row or Shuffle draws its page;
 *   - keyboard focus staying 500 ms draws it;
 *   - a press (mouse or touch) draws nothing, and touch never draws at all;
 *   - only the switcher's rows and Shuffle draw ahead, never a page link.
 * And, from the Stage 2 review (code-1, 09-24-26) and the review of its fix,
 * what a navigation does to a rest: one being timed when it begins is
 * dropped, none is timed until the latest navigation's page lands, and the
 * same link is timed afresh after; an abort with nothing after it, a refused
 * preparation or a back/forward-cache restore ends the wait too. Driven here
 * with plain AbortSignals in the order Astro's router sends its events;
 * that the runtime is wired to those events is checked in the browser
 * (scripts/themes/harness/draw-ahead-nav-probe.mjs and
 * draw-ahead-nav-code-probe.mjs).
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
    const add = vi.spyOn(target, 'addEventListener');
    drawOnIntent(target, () => PATH, vi.fn());
    expect(add.mock.calls.map((c) => c[0]).sort()).toEqual(['focusin', 'focusout', 'pointerout', 'pointerover']);
  });
});

describe('drawOnIntent: a navigation and the rest', () => {
  beforeEach(() => { vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] }); });
  // Module state: every test leaves no navigation under way.
  afterEach(() => { pageRestored(); vi.useRealTimers(); });

  /** A rest on the link, then whether it drew within the dwell. */
  const drewAfterRest = (fire: (t: string, i?: Record<string, unknown>) => boolean, draw: ReturnType<typeof vi.fn>) => {
    const before = draw.mock.calls.length;
    fire('pointerout', { pointerType: 'mouse' });
    fire('pointerover', { pointerType: 'mouse' });
    vi.advanceTimersByTime(400);
    return draw.mock.calls.length > before;
  };
  /** A navigation through to its landing, as the router sends it. */
  const land = (signal: AbortSignal) => { swapBegan(signal); navigationLanded(); navigationLanded(); /* after-swap, then page-load */ };
  const flush = () => Promise.resolve();

  it('a rest being timed when a navigation begins draws nothing', () => {
    const { draw, fire } = setup();
    fire('pointerover', { pointerType: 'mouse' });
    vi.advanceTimersByTime(300);
    const nav = new AbortController();
    navigationBegan(nav.signal);
    vi.advanceTimersByTime(2000);
    land(nav.signal);
    vi.advanceTimersByTime(2000);
    expect(draw).not.toHaveBeenCalled();
  });

  it('no rest is timed while the next page loads (the mouse reaching Shuffle during a slow load)', () => {
    const { draw, fire } = setup();
    navigationBegan(new AbortController().signal);
    fire('pointerover', { pointerType: 'mouse' });
    fire('focusin');
    vi.advanceTimersByTime(2000);
    expect(draw).not.toHaveBeenCalled();
  });

  it('once the page has landed, the same link is timed afresh, and a rest begun after the swap survives page-load', () => {
    const { draw, fire } = setup();
    const nav = new AbortController();
    navigationBegan(nav.signal);
    fire('pointerover', { pointerType: 'mouse' }); // remembered, not timed
    swapBegan(nav.signal);
    navigationLanded(); // after-swap
    vi.advanceTimersByTime(2000);
    expect(draw).not.toHaveBeenCalled(); // a pointer left still draws nothing
    fire('pointerover', { pointerType: 'mouse' }); // it moves: same link, new page
    vi.advanceTimersByTime(200);
    navigationLanded(); // page-load, mid-rest: a no-op
    vi.advanceTimersByTime(200);
    expect(draw).toHaveBeenCalledTimes(1);
  });

  it('a navigation aborted with nothing after it (a same-page hash link) ends the wait', async () => {
    const { draw, fire } = setup();
    const nav = new AbortController();
    navigationBegan(nav.signal);
    nav.abort(); // the skip link: aborted, no before-preparation of its own
    await flush();
    expect(drewAfterRest(fire, draw)).toBe(true);
  });

  it('a navigation aborted by the one that replaced it keeps the wait for the new one', async () => {
    const { draw, fire } = setup();
    const first = new AbortController();
    const second = new AbortController();
    navigationBegan(first.signal);
    first.abort(); // transition() aborts the old one...
    navigationBegan(second.signal); // ...and dispatches the new one's before-preparation in the same stretch
    await flush();
    expect(drewAfterRest(fire, draw)).toBe(false);
    land(second.signal);
    expect(drewAfterRest(fire, draw)).toBe(true);
  });

  it("an older navigation landing while a newer one loads (Back during the capture) does not end the wait", async () => {
    const { draw, fire } = setup();
    const first = new AbortController();
    const second = new AbortController();
    navigationBegan(first.signal);
    first.abort();
    navigationBegan(second.signal); // Back, during the first's capture
    await flush();
    land(first.signal); // the first still swaps: its after-swap and page-load
    expect(drewAfterRest(fire, draw)).toBe(false);
    land(second.signal);
    expect(drewAfterRest(fire, draw)).toBe(true);
  });

  it('a refused preparation (the full-load fallback, stopped) ends the wait', () => {
    const { draw, fire } = setup();
    const nav = new AbortController();
    navigationBegan(nav.signal);
    navigationRefused(nav.signal);
    expect(drewAfterRest(fire, draw)).toBe(true);
  });

  it('a page restored from the back/forward cache mid-navigation ends the wait', () => {
    const { draw, fire } = setup();
    navigationBegan(new AbortController().signal);
    pageRestored();
    expect(drewAfterRest(fire, draw)).toBe(true);
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

