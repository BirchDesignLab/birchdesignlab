/** The yarn shelf: 14 natural-dye colors. Curated so every combination
 *  looks intentional. No free pickers by spec. */
import type { Yarn } from '../../../lib/weave/schema';
import type { Stripe } from '../../../lib/weave/stripes';

export const YARNS: Yarn[] = [
  { id: 'ecru', name: 'Undyed ecru', hex: '#e8dfc9' },
  { id: 'grey', name: 'Undyed grey', hex: '#a8a29a' },
  { id: 'walnut', name: 'Walnut', hex: '#6b5138' },
  { id: 'oak', name: 'Oak gall', hex: '#4a3f30' },
  { id: 'iron', name: 'Iron black', hex: '#2e2a26' },
  { id: 'madder', name: 'Madder', hex: '#9e4638' },
  { id: 'cochineal', name: 'Cochineal', hex: '#8a3550' },
  { id: 'onion', name: 'Onion skin', hex: '#c08a3e' },
  { id: 'weld', name: 'Weld', hex: '#c9b45a' },
  { id: 'flax', name: 'Flax', hex: '#c7b28a' },
  { id: 'nettle', name: 'Nettle', hex: '#7a8a5a' },
  { id: 'heather', name: 'Heather', hex: '#7d6b7a' },
  { id: 'woad', name: 'Woad', hex: '#5a7a96' },
  { id: 'indigo', name: 'Indigo', hex: '#33465e' },
];

const byId = new Map(YARNS.map((y) => [y.id, y.hex]));

export function yarnHex(id: string): string {
  const hex = byId.get(id);
  if (!hex) throw new Error(`unknown yarn: ${id}`);
  return hex;
}

/** Daily-warp combos: preset plus warp/weft stripes known to sing together.
 *  Curated as pairs, not independent picks: a solid colorway landing on the
 *  houndstooth draft would erase the pattern into plain twill. */
export const DAILY_WARPS: { preset: string; warp: Stripe[]; weft: Stripe[] }[] = [
  { preset: 'plain', warp: [{ yarn: 'ecru', count: 1 }], weft: [{ yarn: 'indigo', count: 1 }] },
  { preset: 'plain', warp: [{ yarn: 'walnut', count: 1 }], weft: [{ yarn: 'onion', count: 1 }] },
  { preset: 'twill', warp: [{ yarn: 'indigo', count: 6 }, { yarn: 'woad', count: 2 }], weft: [{ yarn: 'grey', count: 1 }] },
  { preset: 'twill', warp: [{ yarn: 'madder', count: 1 }], weft: [{ yarn: 'flax', count: 1 }] },
  { preset: 'herringbone', warp: [{ yarn: 'grey', count: 1 }], weft: [{ yarn: 'iron', count: 1 }] },
  { preset: 'herringbone', warp: [{ yarn: 'heather', count: 4 }, { yarn: 'grey', count: 4 }], weft: [{ yarn: 'cochineal', count: 1 }] },
  { preset: 'houndstooth', warp: [{ yarn: 'iron', count: 4 }, { yarn: 'ecru', count: 4 }], weft: [{ yarn: 'iron', count: 4 }, { yarn: 'ecru', count: 4 }] },
  { preset: 'houndstooth', warp: [{ yarn: 'oak', count: 4 }, { yarn: 'flax', count: 4 }], weft: [{ yarn: 'oak', count: 4 }, { yarn: 'flax', count: 4 }] },
  { preset: 'goose-eye', warp: [{ yarn: 'flax', count: 1 }], weft: [{ yarn: 'madder', count: 1 }] },
  { preset: 'goose-eye', warp: [{ yarn: 'nettle', count: 1 }], weft: [{ yarn: 'ecru', count: 1 }] },
];
