/**
 * Runs `cb` once the page has arrived (no lingering `data-from-theme`, the
 * cross-school arrival mark `src/themes/portal/runtime.ts` clears when the
 * view transition finishes) and the main thread has gone idle. Mirrors
 * `fx.ts`'s `mountPanes()` start gate (B1 fix round 2): mounting the lens
 * during the arrival's own view transition cost the same kind of dropped
 * frames that gate was written to avoid, so the lens and the Control Centre
 * use the identical wait.
 *
 * Stage 6 (diagnosis C): `cb` runs at most once per call. The arrival path
 * used to leave its 2500 ms safety timer running after the MutationObserver
 * had already fired, so the callback ran twice and Home mounted a second,
 * ghost lens over the first. `runIdle` now fires once (`fired`), and the
 * observer path clears the safety timer.
 */
export function afterArrivalIdle(cb: () => void): () => void {
  let idleId = 0;
  let timerId = 0;
  let cancelled = false;
  let fired = false;
  const w = window as unknown as {
    requestIdleCallback?: (fn: () => void, o?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };
  const runIdle = () => {
    if (cancelled || fired) return;
    fired = true;
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
    let safety = 0;
    const mo = new MutationObserver(() => {
      if (!('fromTheme' in html.dataset)) {
        mo.disconnect();
        clearTimeout(safety);
        runIdle();
      }
    });
    mo.observe(html, { attributeFilter: ['data-from-theme'] });
    safety = window.setTimeout(() => {
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
