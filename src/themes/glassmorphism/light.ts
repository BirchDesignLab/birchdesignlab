/**
 * Light that moves (Stage 6 R1, G7). Two parts, both event-driven: nothing
 * here runs a loop while the pointer is still, the page is hidden or a
 * section is off-screen.
 *
 * 1. Every pane's specular rim and soft highlight follow the pointer.
 *    theme.css draws them ("Light that moves") from --spec-x/--spec-y (px
 *    in the pane's own box) and [data-lit], which this toggles. Fine
 *    pointers light the pane under them; a touch lights the pane where it
 *    lands for a moment (no preventDefault anywhere, so a swipe still
 *    scrolls).
 * 2. The CSS-driven orbs (every page but Home, whose orbs ride the lens
 *    clock and get the same offset there, lens/orbs-clock.ts) ease away from
 *    a fine pointer (orb-repel.ts). The offset is a margin: the orb's
 *    transform and translate already belong to its drift and scroll
 *    animations, which an inline value cannot override. Each orb's target
 *    is taken once per pointer move or scroll (Stage 6 wave 2, T3 C2), not
 *    every frame: the box includes the drift transform, so a per-frame
 *    target kept moving and the loop never settled under a still pointer.
 *
 * E10 (prefers-contrast: more) is flat and still: no pane lights and no orb
 * is pushed (Stage 6 wave 2, T3 C3); turning it on mid-visit drops the light
 * and eases every orb home.
 *
 * Mounted from Footer.astro (every glass page), via onMount.
 */
import { repelTarget, easeStep } from './orb-repel';

const PANES = '.glass, .glass-strong';

export function mountLight(): (() => void) | void {
  if (document.documentElement.dataset.theme !== 'glassmorphism') return;
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
  const contrast = window.matchMedia('(prefers-contrast: more)');

  /* ---- 1. the pane light ---- */
  let lit: HTMLElement | null = null;
  let px = 0;
  let py = 0;
  let spotRaf = 0;
  let tapTimer = 0;
  const place = () => {
    spotRaf = 0;
    if (!lit) return;
    const r = lit.getBoundingClientRect();
    lit.style.setProperty('--spec-x', `${(px - r.left).toFixed(1)}px`);
    lit.style.setProperty('--spec-y', `${(py - r.top).toFixed(1)}px`);
  };
  const light = (next: HTMLElement | null) => {
    const pane = contrast.matches ? null : next;
    if (pane === lit) return;
    lit?.removeAttribute('data-lit');
    lit = pane;
    if (lit) {
      // Place before lighting, so the fade-in starts at the pointer.
      place();
      lit.setAttribute('data-lit', '');
    }
  };
  const paneAt = (e: PointerEvent) => {
    const t = e.target;
    return t instanceof Element ? t.closest<HTMLElement>(PANES) : null;
  };
  const onMove = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    px = e.clientX;
    py = e.clientY;
    light(paneAt(e));
    if (lit && !spotRaf) spotRaf = requestAnimationFrame(place);
    pointerMoved();
  };
  const onDown = (e: PointerEvent) => {
    if (e.pointerType !== 'touch') return;
    px = e.clientX;
    py = e.clientY;
    clearTimeout(tapTimer);
    lit?.removeAttribute('data-lit');
    lit = null;
    light(paneAt(e));
    tapTimer = window.setTimeout(() => light(null), 650);
  };
  // Chromium fires pointerleave on html for a touch the moment the finger
  // lifts; the tap timer alone owns touch, or the 650 ms highlight is gone
  // in a frame or two.
  const onLeave = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    light(null);
    pointer = null;
    kick();
  };
  // The pane slides under a still pointer while the page scrolls.
  const onScroll = () => {
    if (lit && !spotRaf) spotRaf = requestAnimationFrame(place);
    if (pointer) pointerMoved();
  };

  /* ---- 2. the orbs ease away ---- */
  interface Tracked { el: HTMLElement; group: HTMLElement; ox: number; oy: number; tx: number; ty: number }
  const tracked: Tracked[] = [];
  for (const el of document.querySelectorAll<HTMLElement>('.orbs:not([data-js-driven]) .orb')) {
    const group = el.closest<HTMLElement>('.orbs');
    if (group) tracked.push({ el, group, ox: 0, oy: 0, tx: 0, ty: 0 });
  }
  let pointer: { x: number; y: number } | null = null;
  let orbRaf = 0;
  let last = 0;
  /** Each orb's target for the pointer where it is now: read once here, on
      a pointer move, a scroll or the pointer leaving, never per frame. */
  const retarget = () => {
    for (const o of tracked) {
      o.tx = 0;
      o.ty = 0;
      if (pointer && o.group.hasAttribute('data-live')) {
        const r = o.el.getBoundingClientRect();
        // The resting centre: the box's centre less the offset already applied.
        [o.tx, o.ty] = repelTarget(r.left + r.width / 2 - o.ox, r.top + r.height / 2 - o.oy, r.width / 2, pointer.x, pointer.y);
      }
    }
  };
  const frame = (now: number) => {
    orbRaf = 0;
    const dt = last ? Math.min(64, now - last) : 16;
    last = now;
    let moving = false;
    for (const o of tracked) {
      const nx = easeStep(o.ox, o.tx, dt);
      const ny = easeStep(o.oy, o.ty, dt);
      if (nx !== o.ox || ny !== o.oy) {
        moving = true;
        o.ox = nx;
        o.oy = ny;
        o.el.style.marginLeft = nx ? `${nx.toFixed(2)}px` : '';
        o.el.style.marginTop = ny ? `${ny.toFixed(2)}px` : '';
      }
    }
    if (moving) orbRaf = requestAnimationFrame(frame);
    else last = 0;
  };
  const kick = () => {
    retarget();
    if (tracked.length && !orbRaf) orbRaf = requestAnimationFrame(frame);
  };
  const pointerMoved = () => {
    if (!fine.matches || tracked.length === 0) return;
    pointer = contrast.matches ? null : { x: px, y: py };
    kick();
  };
  const onContrast = () => {
    if (!contrast.matches) return;
    light(null);
    pointer = null;
    kick();
  };

  document.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerdown', onDown, { passive: true });
  document.documentElement.addEventListener('pointerleave', onLeave);
  window.addEventListener('scroll', onScroll, { passive: true });
  contrast.addEventListener('change', onContrast);

  return () => {
    document.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerdown', onDown);
    document.documentElement.removeEventListener('pointerleave', onLeave);
    window.removeEventListener('scroll', onScroll);
    contrast.removeEventListener('change', onContrast);
    cancelAnimationFrame(spotRaf);
    cancelAnimationFrame(orbRaf);
    clearTimeout(tapTimer);
    lit?.removeAttribute('data-lit');
    for (const p of document.querySelectorAll<HTMLElement>(PANES)) {
      p.style.removeProperty('--spec-x');
      p.style.removeProperty('--spec-y');
    }
    for (const o of tracked) {
      o.el.style.removeProperty('margin-left');
      o.el.style.removeProperty('margin-top');
    }
  };
}
