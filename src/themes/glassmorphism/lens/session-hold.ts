/**
 * The Control Centre's session hold, wired into every glass page (called
 * from `Footer.astro`, which ships on all five). See `settings.ts` for the
 * storage schema and the known drawn-ahead-copy gap.
 *
 * `registerBeforeSwap` runs at module scope, not inside `onMount`: a module
 * script executes once per hard load no matter how many times its page's
 * body is swapped out from under it (src/lib/lifecycle.ts), so a listener
 * registered here at import time stays attached, and correct, for the whole
 * SPA session, including every later swap away from glass and back
 * (`event.newDocument.documentElement.dataset.theme` gates it so it does
 * nothing on someone else's school's arrival). `applySettingsNow` is called
 * from `onMount` instead, because it must re-run for every new body, not
 * just the first one: it is a cheap, idempotent safety net behind the inline
 * head script (hard load) and the before-swap listener (every navigation),
 * for the one case neither covers on its own, a body that already exists
 * with stale attributes for some other reason.
 */
import type { TransitionBeforeSwapEvent } from 'astro:transitions/client';
import { readSettings, writeSettings, applyToDocument, DEFAULT_SETTINGS, type GlassSettings } from './settings';

function safeSessionStorage(): Storage | null {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function currentSettings(): GlassSettings {
  const storage = safeSessionStorage();
  return storage ? readSettings(storage) : { ...DEFAULT_SETTINGS };
}

export function updateSettings(patch: Partial<GlassSettings>): GlassSettings {
  const next = { ...currentSettings(), ...patch };
  const storage = safeSessionStorage();
  if (storage) writeSettings(storage, next);
  applyToDocument(document, next);
  return next;
}

/** Applies the held settings to the current document. Safe to call on every
    page load; it only ever sets three attributes to values already derived
    from what is on screen or from sessionStorage, so it can never itself
    introduce a flip. */
export function applySettingsNow(): void {
  applyToDocument(document, currentSettings());
}

let registered = false;

/** See the module doc: call once, at module scope. */
export function registerBeforeSwap(): void {
  if (registered) return;
  registered = true;
  document.addEventListener('astro:before-swap', (event) => {
    const e = event as TransitionBeforeSwapEvent;
    if (e.newDocument.documentElement.dataset.theme !== 'glassmorphism') return;
    applyToDocument(e.newDocument, currentSettings());
  });
}
