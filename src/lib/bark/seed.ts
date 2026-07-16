import { hashString } from './pattern';

export type SeedStrategy = 'date' | 'page' | 'visit';

/** THE one-line default deferred by the spec. Change here and only here. */
export const DEFAULT_SEED_STRATEGY: SeedStrategy = 'date';

export function resolveSeed(
  strategy: SeedStrategy = DEFAULT_SEED_STRATEGY,
  pathname?: string,
): number {
  switch (strategy) {
    case 'date': return hashString(new Date().toISOString().slice(0, 10));
    case 'page': return hashString(pathname ?? (typeof location !== 'undefined' ? location.pathname : '/'));
    case 'visit': return (Math.random() * 0xffffffff) >>> 0;
  }
}
