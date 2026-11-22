import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

/* Stage 6 wave 3, task 27: cottagecore's needle and thread on About's hoop, pinned in source. */
const read = (p: string) => readFileSync(new URL(`../src/themes/cottagecore/${p}`, import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const needle = read('needle.ts');
const toys = read('toys.ts');
const about = read('pages/About.astro');
const art = read('assets/Needle.astro');
const css = read('theme.css');
const meta = read('meta.ts');

describe('the needle is inert, aria-hidden and wordless', () => {
  it('marks the needle and the stitch layer aria-hidden, with no focusable control and no words', () => {
    expect(art).toMatch(/data-cc-toy="needle"[^>]*aria-hidden="true"/);
    expect(art).not.toMatch(/tabindex|<button|<a |<text|<title|<desc|aria-label/);
    expect(art).toContain('focusable="false"');
    expect(about).toMatch(/<svg class="nt-layer" aria-hidden="true" focusable="false">/);
    expect(needle).not.toMatch(/aria-label|tabindex|textContent|innerText|innerHTML/);
  });

  it('is mounted with the other toys, so it tears down before a swap and remounts once', () => {
    expect(toys).toContain("import { initNeedle } from './needle';");
    expect(toys).toContain("[data-cc-toy=\"needle\"]");
    expect(needle).toMatch(/return \(\) => \{\s*alive = false;/);
  });

  it('puts the needle on the hoop after the cloth and the layer inside the cloth, under the words', () => {
    expect(about).toMatch(/<\/div>\s*<Needle \/>\s*<\/div>/);
    expect(about).toMatch(/\.manifesto \{\s*position: relative; z-index: 1;/);
    expect(about).toContain('.cloth :global(.sig) { width: 8.4rem; margin-top: -0.2rem; position: relative; z-index: 1; }');
    expect(css).toMatch(/\.nt-layer \{[^}]*clip-path: circle\(calc\(50% - 2px\)\);/s);
    expect(needle).toContain("maskEl.setAttribute('id', 'nt-keep')");
    expect(needle).toContain("selectNodeContents(words)");
    expect(needle).toContain("cloth.querySelector('.sig')");
  });
});

describe('touch and mouse', () => {
  it('lets a vertical swipe scroll and picks up after a 200 ms press or a horizontal move', () => {
    expect(art).toMatch(/touch-action: pan-y;/);
    expect(art).not.toMatch(/touch-action: none/);
    expect(needle).toContain('const HOLD_MS = 200;');
    expect(needle).toMatch(/Math\.abs\(dx\) > Math\.abs\(dy\)\) pickUp\(g\)/);
    expect(needle).toMatch(/passive: false/);
    expect(needle).toMatch(/Math\.abs\(sy\(\) - p\.sy\) > 3/);
  });

  it('ignores a mouse button that is not the primary one', () => {
    expect(needle).toMatch(/e\.pointerType === 'mouse' && e\.button !== 0/);
  });

  it('gates hover to fine pointers and shows the one-shot nudge without hover', () => {
    const style = art.slice(art.indexOf('<style>'));
    const outside = style.replace(/@media \(hover: hover\) and \(pointer: fine\) \{[\s\S]*?\n  \}/g, '');
    expect(outside).not.toContain(':hover');
    expect(style).toMatch(/@media \(hover: hover\) and \(pointer: fine\) \{[^}]*cursor: grab;/s);
    expect(style).toContain('[data-nudge]');
    expect(needle).toContain("el.setAttribute('data-nudge', '')");
  });
});

describe('the stitch', () => {
  it('runs a freehand dashed stitch in the sprig threads, alternating rose and sage per thread', () => {
    expect(needle).toContain('nextC = (nextC ^ 1) as 0 | 1;');
    expect(needle).toMatch(/const DASH = 3\.2;\s*const GAP = 7\.4;/);
    expect(needle).toContain("'stroke-dasharray'");
    // light: the school's rose-deep over dark's edge colour (Stage 6 w4 task 30, critique B3); dark: deepened to clear 3:1
    expect(css).toContain("--thread-rose: var(--cc-rose-deep);");
    expect(css).toContain('--thread-rose: #a24a58;');
    expect(css).toContain('--thread-sage: #56704a;');
    expect(css).toContain("[data-theme='cottagecore'] .nt-thread[data-c='1']");
  });

  it('ties a French knot at the last stitch inside the linen, on release', () => {
    expect(needle).toContain("k.setAttribute('class', 'nt-knot');");
    expect(needle).toMatch(/th\.pts\[th\.lastIn \* 2\]/);
    expect(needle).toMatch(/const onNeedleUp[\s\S]*?finish\(\);\s*glideHome\(\);/);
  });

  it('unpicks 15 s after the knot, oldest stitch first and one thread at a time, in a loop that exists only while it works', () => {
    expect(needle).toContain('const LIFE_MS = 15000;');
    expect(needle).toContain('th.due = th.endedAt + LIFE_MS;');
    expect(needle).toMatch(/threads\.some\(\(t\) => t\.unpicking\)\) return;/);
    expect(needle).toContain('th.trim += (UNPICK_PX_S * dt) / 1000;');
    expect(needle).toMatch(/if \(travel \|\| threads\.some\(\(t\) => t\.unpicking\)\) raf = requestAnimationFrame\(tick\);/);
    // a due thread nobody can see is simply removed
    expect(needle).toMatch(/if \(document\.hidden \|\| !onScreen\) \{\s*removeThread\(first\);/);
  });

  it('keeps nothing: no storage, no network, no audio', () => {
    expect(needle).not.toMatch(/localStorage|sessionStorage|indexedDB|fetch\(|Audio|AudioContext|navigator\.sendBeacon/);
  });

  it('removes every listener, timer, frame and observer on teardown', () => {
    for (const ev of ['pointerdown', 'pointermove', 'pointerup', 'pointercancel']) {
      expect(needle).toContain(`removeEventListener('${ev}'`);
    }
    expect(needle).toContain("removeEventListener('touchmove'");
    expect(needle).toContain('cancelAnimationFrame(raf)');
    expect(needle).toContain('window.clearTimeout(dueTimer)');
    expect(needle).toContain('window.clearTimeout(idleTimer)');
    expect(needle).toContain('io?.disconnect()');
    expect(needle).toContain('stopBeat();');
    expect(needle).toContain('ro?.disconnect();');
  });

  it('parks the needle in CSS, so an idle hoop has no inline style and no frame', () => {
    expect(art).toContain('rotate: -112deg;');
    expect(art).toMatch(/left: calc\(50% - \(50% - var\(--ring, 0\.9rem\) \/ 2\) \* 0\.766\);/);
    expect(needle).toContain("el.style.translate = ''");
    expect(needle).not.toMatch(/setInterval/);
  });
});

describe('contrast', () => {
  it('holds the edge of each thread against the hoop linen', () => {
    expect(meta).toMatch(/fg: '--thread-rose-edge', bg: \['--hoop-cloth'\], min: 3/);
    expect(meta).toMatch(/fg: '--thread-sage-edge', bg: \['--hoop-cloth'\], min: 3/);
  });
});
