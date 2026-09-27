/**
 * The Control Centre's session hold (stage3-decisions.md, "Answers at the
 * start of B2", item 2): Clear/Tinted, the frost amount and the time of day
 * persist in sessionStorage for the whole session, including after leaving
 * glass for another school and coming back, and are applied before first
 * paint on every path:
 *   - a hard load: `applyToDocument` runs from a tiny inline `is:inline`
 *     script in the glass route's head slot (src/pages/t/glassmorphism/
 *     [...page].astro), synchronously, before the body parses;
 *   - an in-school swap: `astro:before-swap`'s `event.newDocument`;
 *   - a cross-school arrival: the same `astro:before-swap` event fires for
 *     every ClientRouter navigation in the /t/ portal, glass-to-glass and
 *     glass-to-elsewhere-and-back alike, so the one listener below (module
 *     scope, registered once, alive for the whole SPA session per
 *     src/lib/lifecycle.ts's module-identity note) covers it too, gated on
 *     the destination being glass.
 *
 * Known gap, reported rather than silently claimed fixed: the portal's
 * drawn-ahead copy (`src/themes/portal/runtime.ts`, `copyOf`) strips every
 * `<script>`, so this module never runs inside it and the copy's DOM is
 * built from a fresh, un-personalised fetch of the destination page. That
 * copy is a scratch GPU-warm iframe at opacity 0.001 that is always thrown
 * away before the visitor's real navigation lands (never the page they
 * actually see), so this does not ship a visible flip; it is still worth
 * naming because "every path" in the brief could be read to include it.
 *
 * Pure logic only lives here (readSettings/writeSettings/applyToDocument
 * take a Document, not `document`), so it is unit-testable with a fake
 * storage and a jsdom-free stub (tests/glass-settings.test.ts).
 */

export type Tint = 'clear' | 'tinted';
export type TimeOfDay = 'dawn' | 'day' | 'dusk';

export interface GlassSettings {
  tint: Tint;
  /** 0 (no extra frost) to 1 (maximum): scales the blur tokens' px amount. */
  frost: number;
  tod: TimeOfDay;
}

export const DEFAULT_SETTINGS: GlassSettings = { tint: 'clear', frost: 0.5, tod: 'day' };

const STORAGE_KEY = 'bdl:theme-schools:glassmorphism:controls';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

function isTint(v: unknown): v is Tint {
  return v === 'clear' || v === 'tinted';
}
function isTod(v: unknown): v is TimeOfDay {
  return v === 'dawn' || v === 'day' || v === 'dusk';
}

/** Parses and validates whatever sessionStorage holds; any shape mismatch
    (corrupt JSON, an old schema, a value from a future build) falls back to
    the default rather than throwing or serving a partial object. */
export function parseSettings(raw: string | null): GlassSettings {
  if (!raw) return { ...DEFAULT_SETTINGS };
  try {
    const v = JSON.parse(raw) as Partial<GlassSettings>;
    const frost = typeof v.frost === 'number' && Number.isFinite(v.frost) ? Math.min(1, Math.max(0, v.frost)) : DEFAULT_SETTINGS.frost;
    return {
      tint: isTint(v.tint) ? v.tint : DEFAULT_SETTINGS.tint,
      frost,
      tod: isTod(v.tod) ? v.tod : DEFAULT_SETTINGS.tod,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function readSettings(storage: StorageLike): GlassSettings {
  try {
    return parseSettings(storage.getItem(STORAGE_KEY));
  } catch {
    // A private-mode or blocked-storage exception reads as "use the default",
    // never as a thrown error out of a settings read (README's browser
    // storage discipline, artifact-adjacent but the same rule here: never let
    // a storage exception break the page).
    return { ...DEFAULT_SETTINGS };
  }
}

export function writeSettings(storage: StorageLike, next: GlassSettings): void {
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage full or blocked: the setting still applies to the live
    // document for this page; it just will not carry to the next one.
  }
}

/** The literal source `applyToDocument` needs baked in, and what the tiny
    inline head script (src/pages/t/glassmorphism/[...page].astro) reproduces
    by hand in its own string (it cannot import a module and still run
    synchronously ahead of the parser without becoming a module script
    itself, which would defer it past first paint). Keep the two in sync. */
export const SETTINGS_STORAGE_KEY = STORAGE_KEY;

export interface ApplyTarget {
  documentElement: {
    dataset: DOMStringMap;
    style: { setProperty(name: string, value: string): void };
  };
}

/** The three literal -webkit-backdrop-filter stages theme.css keys off
    data-glass-frost-step (Safari ignores custom properties inside the
    prefixed property, BCD issue 25914, so it cannot read --glass-frost
    continuously the way the unprefixed property does). `null` means the
    unqualified, tuned-baseline rules apply (theme.css calls this "mid"),
    so the attribute is removed rather than ever set to the literal string
    "mid" -- there is no rule keyed off that value, and leaving a stale
    "mid" or "low"/"high" attribute behind after a slider move back to the
    middle third would otherwise keep matching the wrong stage's rule. */
function frostStepFor(frost: number): 'low' | 'high' | null {
  if (frost <= 1 / 3) return 'low';
  if (frost >= 2 / 3) return 'high';
  return null;
}

/** Writes the settings onto `<html>` as data attributes plus one CSS custom
    property, before first paint. `data-glass-tint` and `data-glass-tod`
    drive theme.css's Clear/Tinted and time-of-day rules (the wallpaper image
    and the pane/lens tint); `--glass-frost` scales the blur tokens for
    Chromium's unprefixed backdrop-filter continuously, and
    `data-glass-frost-step` drives Safari's stepped -webkit-backdrop-filter
    rules (B2 fix round, item 1: this was never written before, so the
    slider had no effect in Safari at all). Every pane and the lens read
    these, not a class list, so a control component never needs to reach
    into another component's markup. */
export function applyToDocument(target: ApplyTarget, s: GlassSettings): void {
  target.documentElement.dataset.glassTint = s.tint;
  target.documentElement.dataset.glassTod = s.tod;
  target.documentElement.style.setProperty('--glass-frost', s.frost.toFixed(3));
  const step = frostStepFor(s.frost);
  if (step) target.documentElement.dataset.glassFrostStep = step;
  else delete target.documentElement.dataset.glassFrostStep;
}
