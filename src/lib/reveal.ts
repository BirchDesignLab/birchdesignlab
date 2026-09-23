/**
 * Quiet weighted reveals: elements marked [data-reveal] settle in as they
 * scroll into view. Gated on .reveal-on (set on <html> here) so content is
 * never hidden without JS; elements already in view settle at once, with no
 * flash. Styles live in src/styles/base.css.
 *
 * Returns the teardown for src/lib/lifecycle.ts onMount: used by the root
 * layout and by the /t/ portal runtime.
 */
export function mountReveals(): () => void {
  const els = document.querySelectorAll('[data-reveal]');
  document.documentElement.classList.add('reveal-on');
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-settled');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -20% 0px' },
  );
  els.forEach((el) => {
    const r = el.getBoundingClientRect();
    if (r.top < window.innerHeight && r.bottom > 0) {
      el.classList.add('is-settled'); // in view on load: show at once
    } else {
      io.observe(el);
    }
  });
  return () => io.disconnect();
}
