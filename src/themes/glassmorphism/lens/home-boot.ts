/**
 * Wires Home's Control Centre controls (the switch, the frost slider, the
 * time-of-day segmented control) to the session-held settings, and mounts
 * the production lens and the lens-driven orb clock once the page has
 * arrived and gone idle. Mounted from Home.astro's own `<script>` (onMount),
 * since Home is the only glass page with any of this.
 */
import { mountLens, planLensStart, placePoster, type LensHandle } from './lens';
import { mountOrbClock } from './orbs-clock';
import { afterArrivalIdle } from './idle-after-arrival';
import { currentSettings, updateSettings } from './session-hold';
import { loadWallpaperImage } from './wallpaper-images';
import type { Scheme } from './wallpaper-images';
import type { TimeOfDay, Tint } from './settings';

function scheme(): Scheme {
  return document.documentElement.dataset.scheme === 'dark' ? 'dark' : 'light';
}

/** The travel box's top and bottom insets: below the header bar, above the
    portal switcher. Stage 6 (the diagnosis's note for the glass critic): the
    bottom used to read `[data-portal-tail]`, the 76 px spacer at the END of
    the document, which sits far below the viewport on Home, so the inset was
    always 0. It now measures the fixed `bdl-switcher` itself (the same
    element lens.ts's collectObstructions reads). */
function chromeInsets(): { top: number; bottom: number } {
  const header = document.querySelector('.site-header');
  const switcher = document.querySelector('bdl-switcher');
  const top = header ? header.getBoundingClientRect().bottom + 8 : 0;
  let bottom = 0;
  if (switcher) {
    const r = switcher.getBoundingClientRect();
    if (r.width > 0 && r.height > 0 && r.top < window.innerHeight) bottom = window.innerHeight - r.top + 8;
  }
  return { top: Math.max(0, top), bottom: Math.max(0, bottom) };
}

/** The lens's off state: `prefers-contrast: more` hides the canvas, its
    shadows and the hit control (theme.css) and the poster stands in, so no
    lens mounts at all (no invisible WebGL context, loop or listeners).
    Stage 6, stop 1 call 1 (a): `prefers-reduced-transparency` no longer
    hides it; the Portal ignores that setting for glass. */
function lensHidden(): boolean {
  return window.matchMedia('(prefers-contrast: more)').matches;
}

/** `?lensProbe=identity|seam` (README, item 5): a production-behind-a-flag
    version of the Tier A proof's own `?probe=` (proofs/lens.md, "Probes for
    the harness"). Anything else, including the parameter's absence, is
    normal operation. */
function probeParam(): 'identity' | 'seam' | null {
  const v = new URLSearchParams(location.search).get('lensProbe');
  return v === 'identity' || v === 'seam' ? v : null;
}

export function mountHomeGlass(): (() => void) | void {
  if (document.documentElement.dataset.theme !== 'glassmorphism') return;
  const host = document.getElementById('glass-lens-host');
  const poster = document.querySelector<HTMLElement>('.lens-poster');
  if (!host || !poster) return;

  const switchBtn = document.querySelector<HTMLButtonElement>('.control-centre .cc-tint-switch');
  const frostInput = document.querySelector<HTMLInputElement>('.cc-frost');
  const todButtons = [...document.querySelectorAll<HTMLButtonElement>('.cc-seg')];

  let lens: LensHandle | null = null;

  function reflect(tint: Tint, frost: number, tod: TimeOfDay) {
    switchBtn?.setAttribute('aria-checked', String(tint === 'tinted'));
    if (frostInput) frostInput.value = String(Math.round(frost * 100));
    for (const b of todButtons) b.setAttribute('aria-checked', String(b.dataset.tod === tod));
  }
  const start = currentSettings();
  reflect(start.tint, start.frost, start.tod);

  function onSwitch() {
    const wasTinted = switchBtn?.getAttribute('aria-checked') === 'true';
    const next = updateSettings({ tint: wasTinted ? 'clear' : 'tinted' });
    reflect(next.tint, next.frost, next.tod);
    lens?.setTint(next.tint);
  }
  switchBtn?.addEventListener('click', onSwitch);

  function onFrost() {
    if (!frostInput) return;
    const next = updateSettings({ frost: Number(frostInput.value) / 100 });
    reflect(next.tint, next.frost, next.tod);
  }
  frostInput?.addEventListener('input', onFrost);

  const todHandlers = new Map<HTMLButtonElement, () => void>();
  for (const b of todButtons) {
    const tod = b.dataset.tod as TimeOfDay;
    const handler = () => {
      void (async () => {
        // Decode the target file before switching anything: the CSS
        // background and the lens texture both read the browser's image
        // cache right after, so the swap never shows a blank or half-loaded
        // frame (README, item 3: "the swap waits until the new image has
        // decoded"). A failed decode (offline, a bad build) leaves the
        // current time of day in place rather than flipping to a blank one.
        try {
          await loadWallpaperImage(scheme(), tod);
        } catch {
          return;
        }
        const next = updateSettings({ tod });
        reflect(next.tint, next.frost, next.tod);
        lens?.setTod(next.tod);
      })();
    };
    todHandlers.set(b, handler);
    b.addEventListener('click', handler);
  }

  // orbs-clock.ts's own rAF loop drives Home's orbs; its onMove hook fires
  // only in a frame it actually repositions one, invalidating the lens so
  // it redraws in that same frame instead of going stale (README, item 2).
  // `lens` is read through the closure, not passed by value, so this wiring
  // is correct even though the lens itself mounts later, once idle.
  // Round 5 (R1): mounted BEFORE the start is planned. mountOrbClock writes
  // every orb's clock position synchronously, so the plan below reads the
  // orbs where they really are; round 4 planned first, against the static
  // unscrolled orbs, and the lens's mount then re-planned against the
  // clock's and jumped 626 px across the 820 window.
  const stopOrbClock = mountOrbClock(() => lens?.invalidate());

  // Glass fix round 3 (the critic's arrival jump): settle the poster on the
  // lens's real start now, at mount, not at the idle mount a few hundred ms
  // later. Where the poster's CSS spot is already the start nothing moves;
  // elsewhere it moves once, here, early. The lens re-runs the decision at
  // its own mount (the layout may have settled since: a web font, the
  // viewport) and, finding the poster on a still-valid spot, keeps it
  // (cornerStart's `preferred`, chooseStart's poster preference). If the
  // visitor has scrolled in between, every candidate has moved with the
  // window, so the lens takes this plan as is: it starts where the poster
  // already sits.
  let plan: ReturnType<typeof planLensStart> | null = null;
  const planScrollY = window.scrollY;
  try {
    plan = planLensStart(poster, window.innerWidth <= 600, chromeInsets(), false);
    const pr = poster.getBoundingClientRect();
    if (Math.hypot(pr.left + pr.width / 2 - plan.x, pr.top + pr.height / 2 - plan.y) > 0.5) placePoster(poster, plan.x, plan.y, plan.radius);
  } catch {
    /* Geometry only: a failure leaves the CSS spot, exactly as before. */
  }

  function mount(usePlan: ReturnType<typeof planLensStart> | null) {
    // One lens per Home visit (Stage 6, diagnosis C): a second call must
    // never overwrite a live lens without destroying it.
    if (lens || lensHidden()) return;
    const settings = currentSettings();
    lens = mountLens({
      host: host!,
      poster: poster!,
      phone: window.innerWidth <= 600,
      initialTint: settings.tint,
      initialTod: settings.tod,
      scheme,
      chromeInsets,
      probe: probeParam(),
      plan: usePlan,
    });
  }
  let idleDone = false;
  const stopIdle = afterArrivalIdle(() => {
    idleDone = true;
    mount(Math.abs(window.scrollY - planScrollY) > 1 ? plan : null);
  });

  // Stage 6 wave 2 (T1 C3): the contrast setting can change mid-visit.
  // Turning more contrast on tears the lens down (its CSS hides the canvas
  // anyway; this also stops its loop and listeners); turning it off mounts
  // a fresh lens, planned against the layout as it is now. Before the idle
  // mount has run, the idle mount itself reads the setting.
  const contrastMq = window.matchMedia('(prefers-contrast: more)');
  function onContrast() {
    if (!idleDone) return;
    if (contrastMq.matches) {
      lens?.destroy();
      lens = null;
    } else {
      mount(null);
    }
  }
  contrastMq.addEventListener('change', onContrast);
  return () => {
    stopIdle();
    contrastMq.removeEventListener('change', onContrast);
    lens?.destroy();
    lens = null;
    stopOrbClock?.();
    switchBtn?.removeEventListener('click', onSwitch);
    frostInput?.removeEventListener('input', onFrost);
    for (const [b, handler] of todHandlers) b.removeEventListener('click', handler);
  };
}
