/**
 * Wires Home's Control Centre controls (the switch, the frost slider, the
 * time-of-day segmented control) to the session-held settings, and mounts
 * the production lens and the lens-driven orb clock once the page has
 * arrived and gone idle. Mounted from Home.astro's own `<script>` (onMount),
 * since Home is the only glass page with any of this.
 */
import { mountLens, type LensHandle } from './lens';
import { mountOrbClock } from './orbs-clock';
import { afterArrivalIdle } from './idle-after-arrival';
import { currentSettings, updateSettings } from './session-hold';
import { loadWallpaperImage } from './wallpaper-images';
import type { Scheme } from './wallpaper-images';
import type { TimeOfDay, Tint } from './settings';

function scheme(): Scheme {
  return document.documentElement.dataset.scheme === 'dark' ? 'dark' : 'light';
}

function chromeInsets(): { top: number; bottom: number } {
  const header = document.querySelector('.site-header');
  const tail = document.querySelector('[data-portal-tail]');
  const top = header ? header.getBoundingClientRect().bottom + 8 : 0;
  const bottom = tail ? window.innerHeight - tail.getBoundingClientRect().top + 8 : 0;
  return { top: Math.max(0, top), bottom: Math.max(0, bottom) };
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

  const switchBtn = document.querySelector<HTMLButtonElement>('.hero .window-bar .switch');
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

  const stopIdle = afterArrivalIdle(() => {
    const settings = currentSettings();
    lens = mountLens({
      host,
      poster,
      phone: window.innerWidth <= 600,
      initialTint: settings.tint,
      initialTod: settings.tod,
      scheme,
      chromeInsets,
      probe: probeParam(),
    });
  });
  // orbs-clock.ts's own rAF loop drives Home's orbs; its onMove hook fires
  // only in a frame it actually repositions one, invalidating the lens so
  // it redraws in that same frame instead of going stale (README, item 2).
  // `lens` is read through the closure, not passed by value, so this wiring
  // is correct even though the lens itself mounts later, once idle.
  const stopOrbClock = mountOrbClock(() => lens?.invalidate());

  return () => {
    stopIdle();
    lens?.destroy();
    lens = null;
    stopOrbClock?.();
    switchBtn?.removeEventListener('click', onSwitch);
    frostInput?.removeEventListener('input', onFrost);
    for (const [b, handler] of todHandlers) b.removeEventListener('click', handler);
  };
}
