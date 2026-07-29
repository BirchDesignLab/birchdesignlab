/** The daily warp: which preset-and-colorway combo the loom opens with. */
import { hashString, mulberry32 } from '../bark/pattern';

export function pickDaily(dateString: string, count: number): number {
  const rnd = mulberry32(hashString(dateString));
  return Math.floor(rnd() * count);
}
