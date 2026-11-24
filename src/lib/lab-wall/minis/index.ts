/**
 * The miniature registry. Each miniature is its own dynamic import, so none
 * of them is in the page's first script: the wall loads a miniature when its
 * tile first needs to draw.
 */
import type { MiniFactory } from '../types';

export const MINI_IDS = [
  'bdl-001',
  'bdl-002',
  // bdl-003 (Novgorod Letters) is hidden until the piece is built (founder, 11-24): its miniature stays in ./bdl-003.ts
  // for the day it returns, but it is not registered, so no tile asks for it.
  'bdl-005',
  'bdl-007',
  'bdl-008',
  'bdl-009',
  'bdl-010',
  'bdl-011',
  'bdl-012',
  'bdl-013',
] as const;

export type MiniId = (typeof MINI_IDS)[number];

export interface LoadedMini {
  factory: MiniFactory;
  /** The "try it" line for the piece. */
  hint: string;
}

type Module = { default: MiniFactory; hint: string };

const LOADERS: Record<MiniId, () => Promise<Module>> = {
  'bdl-001': () => import('./bdl-001'),
  'bdl-002': () => import('./bdl-002'),
  'bdl-005': () => import('./bdl-005'),
  'bdl-007': () => import('./bdl-007'),
  'bdl-008': () => import('./bdl-008'),
  'bdl-009': () => import('./bdl-009'),
  'bdl-010': () => import('./bdl-010'),
  'bdl-011': () => import('./bdl-011'),
  'bdl-012': () => import('./bdl-012'),
  'bdl-013': () => import('./bdl-013'),
};

/** True for an id that has a miniature. */
export function hasMini(id: string): id is MiniId {
  return Object.prototype.hasOwnProperty.call(LOADERS, id);
}

/** Load one miniature's module, or null for an id with no miniature (a newer catalog entry). */
export async function loadMini(id: string): Promise<LoadedMini | null> {
  if (!hasMini(id)) return null;
  const m = await LOADERS[id]();
  return { factory: m.default, hint: m.hint };
}
