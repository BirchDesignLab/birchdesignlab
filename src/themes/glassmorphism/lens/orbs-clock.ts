/**
 * Drives Home's orbs from the lens's own clock instead of a CSS
 * `animation-timeline: view()` (proofs/lens.md, finding 2 and the "Rim
 * alignment" table: a co-located WebGL lens and a CSS scroll-driven orb can
 * disagree by 7 to 21 px while scrolling because the compositor moves the
 * orb and the lens reads its box on the main thread a frame or more late;
 * moving both from the same rAF keeps them within about 0.3 px). Only Home
 * carries the lens (README, "Wave B2: orbs on the lens clock"); every other
 * glass page keeps `theme.css`'s `animation-timeline: view()` untouched.
 *
 * `.orbs[data-js-driven]` (set by `Orbs.astro`'s `jsDriven` prop on Home
 * only) tells `theme.css` to drop the scroll-linked half of the orb's
 * animation shorthand (keeping the time-based `glass-drift` wobble), and
 * tells this module which `.orb` elements to drive.
 *
 * Feedback-loop note: CSS `view()` timelines compute progress from the
 * target's un-transformed layout position, precisely so an animation that
 * moves the element cannot also move its own timeline out from under it.
 * Reading `getBoundingClientRect()` every frame after this module has
 * already applied a scroll-linked `translate` would create exactly that
 * loop (each frame's offset would shift the next frame's "layout" position).
 * So each orb's untransformed document-relative top is measured once, with
 * its own scroll-linked `translate` cleared back to the stylesheet's static
 * `-50% -50%`, and cached; only `window.scrollY` is read every frame.
 */

interface TrackedOrb {
  el: HTMLElement;
  group: HTMLElement;
  rate: number;
  docTop: number;
  height: number;
}

function parseRate(el: HTMLElement): number {
  const raw = getComputedStyle(el).getPropertyValue('--scroll-rate').trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0.45;
}

export function mountOrbClock(): (() => void) | void {
  const groups = document.querySelectorAll<HTMLElement>('.orbs[data-js-driven]');
  if (groups.length === 0) return;

  const tracked: TrackedOrb[] = [];
  for (const g of groups) {
    for (const el of g.querySelectorAll<HTMLElement>('.orb')) {
      tracked.push({ el, group: g, rate: parseRate(el), docTop: 0, height: 0 });
    }
  }
  if (tracked.length === 0) return;

  function measure() {
    for (const o of tracked) {
      o.el.style.translate = ''; // back to the stylesheet's static -50% -50%
    }
    // A second pass: only after every orb's translate is cleared does each
    // rect reflect the untransformed layout (clearing one orb cannot move
    // another's containing block, but batching the writes before any read
    // avoids a layout thrash per orb).
    for (const o of tracked) {
      const r = o.el.getBoundingClientRect();
      o.docTop = r.top + window.scrollY;
      o.height = r.height;
    }
  }
  measure();

  const ro = new ResizeObserver(() => measure());
  tracked.forEach((o) => ro.observe(o.el));
  window.addEventListener('orientationchange', measure);

  let raf = requestAnimationFrame(function frame() {
    raf = requestAnimationFrame(frame);
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    for (const o of tracked) {
      if (!o.group.hasAttribute('data-live')) continue; // its section is off-screen (fx.ts's mountOrbs)
      const elementTop = o.docTop - scrollY;
      const span = vh + o.height;
      const progress = span <= 0 ? 0 : Math.min(1, Math.max(0, (vh - elementTop) / span));
      const px = o.rate * vh * progress;
      o.el.style.translate = `-50% calc(-50% - ${px.toFixed(2)}px)`;
    }
  });

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('orientationchange', measure);
    for (const o of tracked) o.el.style.removeProperty('translate');
  };
}
