/**
 * Firefly steering for the Shining Tree stage, as pure seeded functions:
 * no three.js, no Math.random, so vitest can hold it to account without
 * WebGL. stage.ts owns rendering; this owns motion.
 */
export type Vec3 = [number, number, number];

export interface Fly {
  pos: Vec3;
  vel: Vec3;
  /** per-fly noise phase: the organic look comes from this, not boid math */
  phase: number;
  /** index into the gather-target list (mod length) */
  target: number;
}

const MAX_SPEED = 0.9;      // units/s, hard clamp
const WANDER_SPEED = 0.22;  // cruising pace
const GATHER_SPEED = 0.45;  // approach pace
const STEER = 2.0;          // how fast velocity chases its desire (1/s)

/** mulberry32: tiny deterministic PRNG, plenty for ambience */
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createFlies(count: number, bounds: number, seed: number): Fly[] {
  const rand = rng(seed);
  const flies: Fly[] = [];
  for (let i = 0; i < count; i++) {
    // Uniform random point in sphere of radius `bounds`
    const theta = rand() * Math.PI * 2;
    const z = rand() * 2 - 1;  // uniform in [-1, 1]
    const u = rand();
    const r = bounds * Math.cbrt(u);  // cube root for uniform distribution in 3D
    const xy = Math.sqrt(1 - z * z);  // sin(phi)

    flies.push({
      pos: [
        r * xy * Math.cos(theta),
        r * xy * Math.sin(theta),
        r * z,
      ],
      vel: [0, 0, 0],
      phase: rand() * Math.PI * 2,
      target: Math.floor(rand() * 1024),
    });
  }
  return flies;
}

export function stepFlies(
  flies: Fly[],
  opts: {
    mode: 'wander' | 'gather';
    dt: number;
    time: number;
    targets: readonly Vec3[];
    bounds: number;
  },
): void {
  const { mode, dt, time, targets, bounds } = opts;
  const blend = 1 - Math.exp(-STEER * dt);

  for (const f of flies) {
    let desire: Vec3;

    if (mode === 'gather' && targets.length > 0) {
      const t = targets[f.target % targets.length];
      const dx = t[0] - f.pos[0];
      const dy = t[1] - f.pos[1];
      const dz = t[2] - f.pos[2];
      const d = Math.hypot(dx, dy, dz) || 1e-6;
      // ease off close to the target so they hover instead of orbiting
      const pace = Math.min(GATHER_SPEED, d * 1.2);
      desire = [
        (dx / d) * pace + Math.sin(time * 3.1 + f.phase) * 0.04,
        (dy / d) * pace + Math.sin(time * 2.3 + f.phase * 1.7) * 0.04,
        (dz / d) * pace + Math.cos(time * 2.7 + f.phase) * 0.04,
      ];
    } else {
      // wander: layered sines per axis, phase-shifted per fly
      desire = [
        Math.sin(time * 0.7 + f.phase) * WANDER_SPEED,
        Math.sin(time * 0.5 + f.phase * 2.1) * WANDER_SPEED * 0.6,
        Math.cos(time * 0.6 + f.phase * 1.3) * WANDER_SPEED,
      ];
      // soft containment: past the bounds, desire points home
      const r = Math.hypot(f.pos[0], f.pos[1], f.pos[2]);
      if (r > bounds) {
        const pull = (r - bounds) * 0.8;
        desire[0] -= (f.pos[0] / r) * pull;
        desire[1] -= (f.pos[1] / r) * pull;
        desire[2] -= (f.pos[2] / r) * pull;
      }
    }

    f.vel[0] += (desire[0] - f.vel[0]) * blend;
    f.vel[1] += (desire[1] - f.vel[1]) * blend;
    f.vel[2] += (desire[2] - f.vel[2]) * blend;

    const s = Math.hypot(f.vel[0], f.vel[1], f.vel[2]);
    if (s > MAX_SPEED) {
      const k = MAX_SPEED / s;
      f.vel[0] *= k; f.vel[1] *= k; f.vel[2] *= k;
    }

    f.pos[0] += f.vel[0] * dt;
    f.pos[1] += f.vel[1] * dt;
    f.pos[2] += f.vel[2] * dt;
  }
}

export function scatter(flies: Fly[], strength: number, seed: number): void {
  const rand = rng(seed);
  for (const f of flies) {
    const theta = rand() * Math.PI * 2;
    const z = rand() * 2 - 1;
    const r = Math.sqrt(1 - z * z);
    f.vel[0] += Math.cos(theta) * r * strength;
    f.vel[1] += z * strength;
    f.vel[2] += Math.sin(theta) * r * strength;
  }
}
