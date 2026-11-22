// Stage 6 w3 task 18, item 5 C3: a jittery tap on the approved phone and
// portrait-tablet corner start leaves the lens in place. A release whose whole
// travel from the press is within TAP_SLOP_PX is a tap, not a throw: zero
// velocity, and the lens goes back to where it was pressed, so the rest check
// sees the approved spot (within 2px) and keeps it.
// One-off source edit, kept for the record: node scripts/themes/stage6/w3-t18-glass-lens-edit.mjs
import { readFileSync, writeFileSync } from 'node:fs';

function edit(path, pairs) {
  let s = readFileSync(path, 'utf8');
  const crlf = s.includes('\r\n');
  s = s.replace(/\r\n/g, '\n');
  for (const [a, b] of pairs) {
    const n = s.split(a).length - 1;
    if (n !== 1) throw new Error(`${path}: expected 1 match, found ${n}:\n${a}`);
    s = s.replace(a, () => b);
  }
  writeFileSync(path, crlf ? s.replace(/\n/g, '\r\n') : s);
}

edit('src/themes/glassmorphism/lens/physics.ts', [
  [
    `/** Cap a release velocity at FEEL.maxThrow, keeping its direction. */`,
    `/** Stage 6 w3 task 18 (T9 C3): a release whose whole travel from the press
    is at most this many px is a tap (finger jitter), not a throw. Not in
    FEEL, which stays the proof's verbatim feel. */
export const TAP_SLOP_PX = 6;

/** True when a press at (x0, y0) released at (x1, y1) is a tap, not a throw. */
export function isTap(x0: number, y0: number, x1: number, y1: number): boolean {
  return Math.hypot(x1 - x0, y1 - y0) <= TAP_SLOP_PX;
}

/** Cap a release velocity at FEEL.maxThrow, keeping its direction. */`,
  ],
]);

edit('src/themes/glassmorphism/lens/lens.ts', [
  [
    `import { FEEL, Lag2, releaseVelocity, capThrow,`,
    `import { FEEL, Lag2, releaseVelocity, capThrow, isTap,`,
  ],
  [
    `    x: 0, y: 0, vx: 0, vy: 0, held: false,
    grab: [0, 0] as [number, number],`,
    `    x: 0, y: 0, vx: 0, vy: 0, held: false,
    grab: [0, 0] as [number, number],
    /** Where the lens was when the current press began (the tap check). */
    press: [0, 0] as [number, number],`,
  ],
  [
    `    s.grab = [ev.clientX - s.x, ev.clientY - s.y];
    s.samples = [{ t: ev.timeStamp, x: s.x, y: s.y }];`,
    `    s.grab = [ev.clientX - s.x, ev.clientY - s.y];
    s.press = [s.x, s.y];
    s.samples = [{ t: ev.timeStamp, x: s.x, y: s.y }];`,
  ],
  [
    `    const v = releaseVelocity(samplesArr, ev.timeStamp);
    [s.vx, s.vy] = capThrow(v[0], v[1]);
    s.samples = [];`,
    `    const v = releaseVelocity(samplesArr, ev.timeStamp);
    [s.vx, s.vy] = capThrow(v[0], v[1]);
    // A tap (T9 C3): a few px of finger jitter is not a throw. No glide, and
    // the lens goes back to where it was pressed, so a tap on the approved
    // half-covered corner start leaves it there (checkRest's corner margin).
    if (isTap(s.press[0], s.press[1], s.x, s.y)) {
      s.vx = 0;
      s.vy = 0;
      [s.x, s.y] = s.press;
    }
    s.samples = [];`,
  ],
]);
console.log('lens edits applied');
