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
 *
 * B2 fix round: two things the glass critic measured and blocked on.
 * - `onMove`, called only in the frame this loop actually writes a new
 *   `translate` (i.e. `scrollY` or the viewport height changed since the
 *   last frame): `home-boot.ts` wires this to the lens's own `invalidate()`,
 *   so the lens redraws in the same frame the orbs move instead of never
 *   redrawing at all (the critic's blocking #1: 0 lens draws while the
 *   orbs moved 251-294 px on scroll).
 * - When neither `scrollY` nor the viewport height changed, the frame does
 *   no work at all: no `getBoundingClientRect`, no style write, no `onMove`
 *   call (the nit: "rewrites every Home orb's translate each frame even
 *   when scrollY is unchanged"). Idle time is now a bare comparison, not a
 *   loop over every tracked orb.
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

/** `onMove` is called once per frame in which this loop actually repositions
    an orb (never while idle): the lens's own redraw hook. */
export function mountOrbClock(onMove?: () => void): (() => void) | void {
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
    // Round 4 (G1, the round-3 re-critic's blocker): CSS view() measures the
    // UNTRANSFORMED layout box, and the stylesheet's static `translate:
    // -50% -50%` is a transform. Clearing back to '' left that -50% in the
    // rect, so every orb's docTop read h/2 too high and its progress ran
    // ahead by (h/2)/(vh+h): 17 to 65 px above B1's view() placement at
    // every scroll. `none` removes the translate for the read pass, so the
    // rect is the layout box view() itself uses.
    for (const o of tracked) {
      o.el.style.translate = 'none';
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
    for (const o of tracked) {
      o.el.style.translate = ''; // back to the stylesheet's static -50% -50% until the next frame writes
    }
    lastScrollY = NaN; // the translates were just cleared: rewrite them next frame
  }
  let lastScrollY = NaN;
  measure();

  const ro = new ResizeObserver(() => measure());
  tracked.forEach((o) => ro.observe(o.el));
  window.addEventListener('orientationchange', measure);

  let lastVh = NaN;
  let lastLive = '';
  const groupList = [...groups];
  let raf = requestAnimationFrame(function frame() {
    raf = requestAnimationFrame(frame);
    const vh = window.innerHeight;
    const scrollY = window.scrollY;
    // Which groups are live (fx.ts's mountOrbs sets data-live from an
    // IntersectionObserver, which reports AFTER this loop's first frame).
    // Glass fix round 3: without this in the idle test, the first frame
    // skipped every not-yet-live group and marked the scroll position done,
    // so Home's orbs sat untranslated at rest and then jumped 200 to 300 px
    // on the first scroll; a resize's measure() (which clears every
    // translate) likewise left them untranslated until the next scroll.
    let live = '';
    for (const g of groupList) live += g.hasAttribute('data-live') ? '1' : '0';
    // Idle: neither the scroll position, the viewport height nor the live
    // set changed since the last frame, so every orb's progress is identical
    // to what is already on screen. Skip the read/write pass entirely (a
    // real cost saved, not just a draw skipped) and call nothing, so the
    // lens does not redraw for a frame in which nothing actually moved.
    if (scrollY === lastScrollY && vh === lastVh && live === lastLive) return;
    lastScrollY = scrollY;
    lastVh = vh;
    lastLive = live;
    for (const o of tracked) {
      if (!o.group.hasAttribute('data-live')) continue; // its section is off-screen (fx.ts's mountOrbs)
      const elementTop = o.docTop - scrollY;
      const span = vh + o.height;
      const progress = span <= 0 ? 0 : Math.min(1, Math.max(0, (vh - elementTop) / span));
      const px = o.rate * vh * progress;
      o.el.style.translate = `-50% calc(-50% - ${px.toFixed(2)}px)`;
    }
    onMove?.();
  });

  return () => {
    cancelAnimationFrame(raf);
    ro.disconnect();
    window.removeEventListener('orientationchange', measure);
    for (const o of tracked) o.el.style.removeProperty('translate');
  };
}
