/** Pure draft math: renderer-agnostic by spec (mirrors bark's pattern core).
 *  A draft is the weaver's notation: threading (which shaft each warp end is
 *  on), tie-up (which shafts each treadle lifts), treadling (which treadle
 *  each pick uses). Interlacement falls out of the three. */

export interface Draft {
  shafts: number;
  treadles: number;
  threading: number[];   // repeating unit; values 0..shafts-1
  tieUp: boolean[][];    // [treadle][shaft]; true = shaft lifted
  treadling: number[];   // repeating unit; values 0..treadles-1
}

export function shaftAt(d: Draft, end: number): number {
  return d.threading[end % d.threading.length];
}

export function treadleAt(d: Draft, pick: number): number {
  return d.treadling[pick % d.treadling.length];
}

/** Lifted shaft = warp over weft at this crossing. */
export function isWarpOver(d: Draft, end: number, pick: number): boolean {
  return d.tieUp[treadleAt(d, pick)][shaftAt(d, end)];
}

function gcd(a: number, b: number): number {
  while (b !== 0) [a, b] = [b, a % b];
  return a;
}

export function lcm(a: number, b: number): number {
  return (a / gcd(a, b)) * b;
}
