/** Repeating color orders along warp or weft. What makes plaid possible. */

export interface Stripe {
  yarn: string;  // yarn id from the shelf
  count: number; // how many consecutive threads
}

export function seqLength(seq: Stripe[]): number {
  return seq.reduce((sum, s) => sum + s.count, 0);
}

/** Yarn id for thread i, repeating the sequence forever. */
export function yarnAt(seq: Stripe[], i: number): string {
  const len = seqLength(seq);
  let k = i % len;
  for (const s of seq) {
    if (k < s.count) return s.yarn;
    k -= s.count;
  }
  return seq[seq.length - 1].yarn; // unreachable when counts are positive
}
