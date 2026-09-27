/** E12 pointer light ("Reveal"): a masked 1px border ring plus a soft halo
    that tracks the pointer across each command group. theme.css paints the
    ring and halo from --reveal-x/--reveal-y (in px, relative to the group's
    own box) and the [data-reveal-active] attribute this module toggles; this
    file only owns the pointer math, one `pointermove` listener per group,
    mounted via onMount (src/lib/lifecycle.ts) so it tears down on every swap
    and never runs twice for one body.

    Groups (brief E12, plus the Control Centre, B2's own call since the
    Control Centre postdates the brief): the header's .seg, the footer's
    .pills, the Contact field group (Contact.astro's new .field-group wrapper
    around the three fields), and .control-centre. Not the door cards or any
    other pane: E12 scopes this to command groups, not to decoration. */
export function mountReveal(): (() => void) | void {
  if (document.documentElement.dataset.theme !== 'glassmorphism') return;

  // Fine-pointer hover only (brief E12): a touch or coarse pointer gets no
  // listener at all, so there is nothing to tear down on those devices and
  // nothing for a tap to leave stuck.
  const hoverMq = window.matchMedia('(hover: hover) and (pointer: fine)');
  if (!hoverMq.matches) return;

  const groups = [...document.querySelectorAll<HTMLElement>('.seg, .pills, .field-group, .control-centre')];
  if (groups.length === 0) return;

  // Reduced motion keeps the lit ring (a real accessibility affordance) but
  // drops the travel: the light holds at the group's centre instead of
  // chasing the pointer.
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const cleanups: Array<() => void> = [];
  for (const group of groups) {
    const setCentre = () => {
      const r = group.getBoundingClientRect();
      group.style.setProperty('--reveal-x', `${r.width / 2}px`);
      group.style.setProperty('--reveal-y', `${r.height / 2}px`);
    };
    const onMove = (e: PointerEvent) => {
      const r = group.getBoundingClientRect();
      group.style.setProperty('--reveal-x', `${e.clientX - r.left}px`);
      group.style.setProperty('--reveal-y', `${e.clientY - r.top}px`);
    };
    const onEnter = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' && e.pointerType !== 'pen') return;
      group.setAttribute('data-reveal-active', '');
      if (reducedMotion) setCentre();
    };
    const onLeave = () => group.removeAttribute('data-reveal-active');

    group.addEventListener('pointerenter', onEnter);
    group.addEventListener('pointerleave', onLeave);
    if (!reducedMotion) group.addEventListener('pointermove', onMove);

    cleanups.push(() => {
      group.removeEventListener('pointerenter', onEnter);
      group.removeEventListener('pointerleave', onLeave);
      if (!reducedMotion) group.removeEventListener('pointermove', onMove);
      group.removeAttribute('data-reveal-active');
      group.style.removeProperty('--reveal-x');
      group.style.removeProperty('--reveal-y');
    });
  }

  return () => cleanups.forEach((fn) => fn());
}
