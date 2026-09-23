/**
 * The light/dark contract on <html>.
 *
 * `data-scheme` is the visitor's light/dark choice and the only attribute the
 * token CSS keys on. It replaced two attributes on 09-22-26: `data-theme`
 * (which now names a design school on /t/ routes) and `data-face` (which had
 * mirrored data-theme since 08-18-26, when the Lab stopped inverting).
 *
 * The inline bootstrap in ThemeBootstrap.astro cannot import this module, so
 * it repeats readStoredScheme's rules by hand. Keep the two in step.
 */
export type Scheme = 'light' | 'dark';

export const SCHEME_ATTR = 'data-scheme';
export const SCHEME_KEY = 'scheme';
/** Pre-09-22-26 storage key. Read once, migrated to SCHEME_KEY, then removed. */
export const LEGACY_SCHEME_KEY = 'theme';

type ReadStorage = Pick<Storage, 'getItem'>;
type WriteStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function isScheme(value: unknown): value is Scheme {
  return value === 'light' || value === 'dark';
}

/** The stored choice, preferring the current key over the legacy one; junk reads as no choice. */
export function readStoredScheme(storage: ReadStorage | null): Scheme | null {
  if (!storage) return null;
  try {
    const current = storage.getItem(SCHEME_KEY);
    if (isScheme(current)) return current;
    const legacy = storage.getItem(LEGACY_SCHEME_KEY);
    return isScheme(legacy) ? legacy : null;
  } catch {
    return null;
  }
}

function safeStorage(): WriteStorage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** What the page is painting now. Absent attribute (no JS yet) means dark, as in tokens.css. */
export function currentScheme(root: HTMLElement = document.documentElement): Scheme {
  return root.getAttribute(SCHEME_ATTR) === 'light' ? 'light' : 'dark';
}

/** Paint `next` and remember it. Storage failures are fine: the scheme still switches. */
export function setScheme(
  next: Scheme,
  root: HTMLElement = document.documentElement,
  storage: WriteStorage | null = safeStorage(),
): void {
  root.setAttribute(SCHEME_ATTR, next);
  try {
    storage?.setItem(SCHEME_KEY, next);
    storage?.removeItem(LEGACY_SCHEME_KEY);
  } catch {
    /* storage blocked: the scheme still switches, just not persisted */
  }
}
