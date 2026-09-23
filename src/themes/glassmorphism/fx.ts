/** Pauses each section's drifting orbs while the section is off-screen, so a
    reader scrolled past the hero does not keep every panel below re-blurring
    for orbs they cannot see. Mounted once per page via onMount
    (src/lib/lifecycle.ts); .orbs:not([data-live]) .orb is paused in
    theme.css. */
export function mountOrbs(): (() => void) | void {
  if (document.documentElement.dataset.theme !== 'glassmorphism') return;
  const groups = document.querySelectorAll<HTMLElement>('.orbs');
  if (groups.length === 0) return;

  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        (entry.target as HTMLElement).toggleAttribute('data-live', entry.isIntersecting);
      }
    },
    { rootMargin: '25% 0px' },
  );
  groups.forEach((el) => io.observe(el));

  return () => io.disconnect();
}
