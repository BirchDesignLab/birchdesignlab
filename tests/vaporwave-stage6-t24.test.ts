import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { COUNTER_START, DECK_WORDS, TAPE_RATE, formatCounter, swipeAxis } from '../src/themes/vaporwave/deck';

/** Stage 6 wave 3, task 24: vaporwave's VCR remote and page-wide window
    activation. Behaviour is filmed (the task report); these pin the
    decisions in source and test the deck's pure helpers. */
const read = (p: string) => readFileSync(`src/themes/vaporwave/${p}`, 'utf8');
const home = read('pages/Home.astro');
const fx = read('fx.ts');
const deck = read('deck.ts');
const windows = read('windows.ts');

describe('the deck', () => {
  it('uses only the approved words beside PLAY (stop 3 answer 3)', () => {
    expect(DECK_WORDS).toEqual({ play: 'PLAY', pause: 'PAUSE', ff: 'FF', rew: 'REW' });
  });
  it('runs the tape about 4x forward or backward, and freezes it on pause', () => {
    expect(TAPE_RATE.play).toBe(1);
    expect(TAPE_RATE.pause).toBe(0);
    expect(TAPE_RATE.ff).toBe(4);
    expect(TAPE_RATE.rew).toBeLessThan(0);
  });
  it('formats the counter as today\'s m:ss:cc and never below zero', () => {
    expect(formatCounter(COUNTER_START)).toBe('0:19:85');
    expect(formatCounter(61.5)).toBe('1:01:50');
    expect(formatCounter(-3)).toBe('0:00:00');
  });
  it('decides a swipe only past 8px, horizontal when wider than tall, else leaves it to scroll (task 24 C3)', () => {
    expect(swipeAxis(5, 1)).toBeNull();
    expect(swipeAxis(12, 3)).toBe('x');
    expect(swipeAxis(-12, 3)).toBe('x');
    expect(swipeAxis(3, 12)).toBe('y');
    // The old half-again rule left 34 to 45 degrees from the horizontal neither scrolling nor scanning.
    expect(swipeAxis(10, 9)).toBe('x');
    expect(swipeAxis(10, 7)).toBe('x');
    expect(swipeAxis(9, 10)).toBe('y');
    expect(swipeAxis(9, 9)).toBe('y');
    expect(swipeAxis(-20, 16)).toBe('x');
  });
  it('is one real button named Play or Pause, aria-pressed while paused, its face aria-hidden', () => {
    expect(home).toMatch(/<button type="button" class="osd osd-l deck" aria-label="Play" aria-pressed="false" data-deck>/);
    expect(home).toMatch(/<span class="deck-face" aria-hidden="true">/);
    expect(deck).toContain("button.setAttribute('aria-label', mode === 'pause' ? 'Pause' : 'Play');");
    expect(deck).toContain("button.setAttribute('aria-pressed', String(mode === 'pause'));");
  });
  it('mounts through onMount and returns a cleanup', () => {
    expect(home).toContain('onMount(mountDeck);');
    expect(deck).toMatch(/return \(\) => \{[\s\S]*intersection\.disconnect\(\);[\s\S]*removeEventListener\('pagehide'/);
  });
  it('lets a vertical swipe on the hero scroll', () => {
    expect(home).toContain('.hero { touch-action: pan-y pinch-zoom;');
  });
  it('gates the hover and pauses the band loop off screen', () => {
    expect(home).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{\s*\.deck \{ cursor: pointer; \}/);
    expect(home).toContain('.hero[data-deck-off] .deck-band, .hero[data-deck-off] .deck-band span { animation-play-state: paused; }');
  });
});

describe('the horizon under the deck', () => {
  it('runs off a tape clock and stops its loop while paused', () => {
    expect(fx).toContain('rate !== 0 && !reducedMotion.matches');
    expect(fx).toContain('rate = TAPE_RATE[mode];');
  });
  it('draws tape noise as a separate blended pass, leaving the main shader as it was, so PLAY keeps its cost', () => {
    const frag = fx.slice(fx.indexOf('const FRAG = `'), fx.indexOf('const NOISE_FRAG'));
    expect(frag.length).toBeGreaterThan(1000);
    expect(frag).not.toContain('uNoise');
    expect(frag).not.toContain('snow');
    expect(fx).toContain('const pass = noiseOn ? noiseProgram() : null;');
    expect(fx).toContain('gl.useProgram(program);');
  });
  it('counts only a forward wrap as the seam, and keeps the cycle position positive', () => {
    expect(fx).toContain('const wrapped = time > lastTime && cyclePos < lastCyclePos;');
    expect(fx).toContain('const cyclePos = ((time % CYCLE) + CYCLE) % CYCLE;');
  });
  it('removes its deck listener on teardown', () => {
    expect(fx).toContain('canvas.removeEventListener(DECK_EVENT, onDeck);');
  });
});

describe('window activation (V9)', () => {
  it('is page-wide: every window, any press, and focus inside', () => {
    expect(windows).toContain("const wins = Array.from(document.querySelectorAll<HTMLElement>('.vw-win'));");
    expect(windows).toContain("win.addEventListener('focusin', onFocus);");
    expect(windows).toContain("win.addEventListener('pointerdown', onDown, true);");
    expect(windows).toContain(".classList.toggle('inactive', other !== win);");
  });
  it('mounts on every page with windows', () => {
    for (const page of ['Home', 'Services', 'Contact', 'About', 'Sent']) {
      expect(read(`pages/${page}.astro`)).toContain('onMount(mountWindowActivation);');
    }
  });
  it('leaves About without drag, as before', () => {
    expect(read('pages/About.astro')).not.toContain('mountWindowDrag');
  });
});
