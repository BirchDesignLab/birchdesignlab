/**
 * Page lifecycle for client scripts that must work both on plain pages and
 * under Astro's ClientRouter.
 *
 * On a plain page (every root business page and the Lab) a module script runs
 * once, after parse, and the page ends with `pagehide`. Under ClientRouter (the
 * /t/ portal) a module script still runs only ONCE per hard load, while the
 * body it set up is swapped out from under it on every navigation. A script
 * that initialises at module scope therefore goes dead after the first swap
 * (F004 in the theme-schools critique) and leaks whatever it created.
 *
 * onMount(fn) is the one pattern both worlds share:
 * - fn runs for the current body immediately, and again for each new body the
 *   router swaps in (`astro:page-load`), at most once per body element;
 * - the teardown fn returns runs on `astro:before-swap` (the router is about
 *   to replace the body) and on a real `pagehide` (not a bfcache freeze, which
 *   keeps the page alive to resume).
 *
 * Without the router the extra listeners simply never fire, so on root pages
 * this is exactly the old "run once, clean up on pagehide" behaviour.
 */
export type Teardown = () => void;

interface EventHost {
  addEventListener(type: string, listener: (event: Event) => void): void;
}

export interface LifecycleEnv {
  doc: EventHost & { body: object | null };
  win: EventHost;
}

function defaultEnv(): LifecycleEnv {
  return { doc: document, win: window };
}

export function onMount(fn: () => void | Teardown, env: LifecycleEnv = defaultEnv()): void {
  const mounted = new WeakSet<object>();
  let teardown: Teardown | undefined;

  const stop = () => {
    const t = teardown;
    teardown = undefined;
    t?.();
  };

  const run = () => {
    const body = env.doc.body;
    if (!body || mounted.has(body)) return;
    mounted.add(body);
    // Defensive: if a swap happened without before-swap (should not), the
    // previous body's resources are released before the new mount.
    stop();
    teardown = fn() || undefined;
  };

  run();
  env.doc.addEventListener('astro:page-load', run);
  env.doc.addEventListener('astro:before-swap', stop);
  env.win.addEventListener('pagehide', (event) => {
    if (!(event as PageTransitionEvent).persisted) stop();
  });
}
