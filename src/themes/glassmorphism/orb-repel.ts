/**
 * Orbs that ease away from the cursor (Stage 6 R1, G7: "a slow orb drift
 * returns, or orbs ease away from the cursor"). Pure math shared by the two
 * drivers: light.ts moves every page's CSS-driven orbs, and Home's
 * lens/orbs-clock.ts folds the same offset into the translate it already
 * writes from the lens's own frame, so the lens and its orbs never disagree.
 *
 * Fine pointers only, and event-driven: an orb moves only while it eases
 * toward a new target after the pointer moved, so a still pointer, a hidden
 * page or an off-screen section runs no loop at all.
 */

/** How far past an orb's own edge the cursor still pushes it (px), the
    largest push (px, and at most 0.4 of the radius, so a small orb moves
    less), and the easing time constant (ms): slow, so it drifts, not
    jumps. */
export const REPEL = { reach: 240, maxPush: 64, tau: 520 } as const;

/** The offset an orb whose resting centre is (cx, cy) and radius r eases
    toward while the cursor is at (px, py): away from the cursor, strongest
    when the cursor is over the orb's centre, zero past `reach` beyond its
    edge. */
export function repelTarget(cx: number, cy: number, r: number, px: number, py: number): [number, number] {
  const dx = cx - px;
  const dy = cy - py;
  const dist = Math.hypot(dx, dy);
  const zone = r + REPEL.reach;
  if (!(dist < zone) || r <= 0) return [0, 0];
  const k = 1 - dist / zone;
  const mag = Math.min(REPEL.maxPush, r * 0.4) * k * k;
  if (dist < 1e-3) return [0, -mag];
  return [(dx / dist) * mag, (dy / dist) * mag];
}

/** One frame of exponential easing from `cur` toward `target` over `dt`
    ms; snaps once within 0.05 px, so a settled orb reports no change. */
export function easeStep(cur: number, target: number, dt: number, tau: number = REPEL.tau): number {
  const next = cur + (target - cur) * (1 - Math.exp(-Math.max(0, dt) / tau));
  return Math.abs(next - target) < 0.05 ? target : next;
}
