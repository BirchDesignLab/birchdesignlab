/**
 * Runs `cb` once the page has arrived (no lingering `data-from-theme`, the
 * cross-school arrival mark `src/themes/portal/runtime.ts` clears when the
 * view transition finishes) and the main thread has gone idle. Mirrors
 * `fx.ts`'s `mountPanes()` start gate (B1 fix round 2): mounting the lens
 * during the arrival's own view transition cost the same kind of dropped
 * frames that gate was written to avoid, so the lens and the Control Centre
 * use the identical wait.
 */
export function afterArrivalIdle(cb: () => void): () => void {
  let idleId = 0;
  let timerId = 0;
  let cancelled = false;
  const w = window as unknown as {
    requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const runIdle = () => {
    if (cancelled) return;
    if (w.requestIdleCallback) idleId = w.requestIdleCallback(cb, { timeout: 1000 });
    else timerId = window.setTimeout(cb, 120);
  };
  const cancelIdle = () => {
    if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
    if (timerId) clearTimeout(timerId);
    idleId = 0;
    timerId = 0;
  };
  const html = document.documentElement;
  if ('fromTheme' in html.dataset) {
    const mo = new MutationObserver(() => {
      if (!('fromTheme' in html.dataset)) {
        mo.disconnect();
        runIdle();
      }
    });
    mo.observe(html, { attributeFilter: ['data-from-theme'] });
    const safety = window.setTimeout(() => {
      mo.disconnect();
      runIdle();
    }, 2500);
    return () => {
      cancelled = true;
      mo.disconnect();
      clearTimeout(safety);
      cancelIdle();
    };
  }
  runIdle();
  return () => {
    cancelled = true;
    cancelIdle();
  };
}
