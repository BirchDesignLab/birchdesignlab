/** BDL-001 The Bark Engine. Ported from the mockup's spec-a.js. */
import { T, TAU, clamp, easeOut, mulberry32 } from '../draw';
import { generateBark } from '../../bark/pattern';
import type { Dash } from '../../bark/pattern';
import type { Mini, MiniFactory } from '../types';

export const hint = 'Touch to regrow';

type Grown = Dash & { born: number };
interface Layer {
  ds: Grown[];
  t: number;
  sx: number;
  sy: number;
  fade: number | null;
  instant: boolean;
}

const factory: MiniFactory = (): Mini => {
  let W = 0, H = 0;
  let rnd = mulberry32(2026);
  let layers: Layer[] = [];
  let lastSeedT = -99, seedAt = { x: 0.5, y: 0.5 }, nextAuto = 15;
  function spawn(t: number, sx: number, sy: number, instant: boolean) {
    // A smaller tile gets more dashes per pixel and rows no closer than about 15px, so it reads as bands of lenticels (bark), not scattered flecks.
    const n = Math.round(clamp((W * H) / 1100, 170, 480));
    const ds: Grown[] = generateBark(((rnd() * 1e9) | 0) || 7, { density: n, bands: clamp(Math.round(H / 15), 7, 22) }).map((d) => ({ ...d, born: 0 }));
    const speed = 0.42 * W; // px per second of the growth wave
    for (const d of ds) {
      const dist = Math.hypot((d.x - sx) * W, (d.y - sy) * H);
      d.born = instant ? -20 : t + dist / speed + rnd() * 0.3;
    }
    for (const L of layers) if (L.fade == null) L.fade = t;
    layers.push({ ds, t, sx, sy, fade: null, instant });
    lastSeedT = t; seedAt = { x: sx, y: sy };
  }
  return {
    t0: 0,
    resize(w, h) { W = w; H = h; layers = []; rnd = mulberry32(2026); spawn(0, 0.5, 0.5, true); }, // wall: deterministic so per-frame resizes do not reshuffle
    // rest: the whole trunk grown, at every size (the growth wave is what waking shows)
    rest() { return 0; },
    enter(p, t) { spawn(t, p.x, p.y, false); },
    draw(c, t, _dt, p) {
      const dark = T.dark;
      c.fillStyle = dark ? '#16130f' : '#ece6d8';
      c.fillRect(0, 0, W, H);
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, dark ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.35)');
      g.addColorStop(1, dark ? 'rgba(0,0,0,.35)' : 'rgba(120,100,70,.10)');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      // the trunk's curve: lit in the middle, falling away at the sides, so the dashes read as lenticels on bark and not as scattered flecks
      const cyl = c.createLinearGradient(0, 0, W, 0);
      cyl.addColorStop(0, dark ? 'rgba(0,0,0,.4)' : 'rgba(110,90,60,.2)'); cyl.addColorStop(0.5, dark ? 'rgba(244,239,226,.08)' : 'rgba(255,255,255,.4)'); cyl.addColorStop(1, dark ? 'rgba(0,0,0,.4)' : 'rgba(110,90,60,.2)');
      c.fillStyle = cyl; c.fillRect(0, 0, W, H);
      if (p.a > 0.5 && t - lastSeedT > 2.4 && Math.hypot((p.x - seedAt.x) * W, (p.y - seedAt.y) * H) > W * 0.22) spawn(t, p.x, p.y, false);
      else if (t > nextAuto) { spawn(t, rnd(), rnd(), false); nextAuto = t + 17; }
      const ink = dark ? [244, 239, 226] : [38, 32, 24];
      layers = layers.filter((L) => L.fade == null || t - L.fade < 1);
      for (const L of layers) {
        const la = L.fade == null ? 1 : 1 - clamp((t - L.fade) / 1);
        for (const d of L.ds) {
          const gr = clamp((t - d.born) / 1.0);
          if (gr <= 0) continue;
          const len = d.w * W * easeOut(gr);
          const th = Math.max(2.4, d.h * H * 1.35);
          const a = (0.4 + 0.55 * d.shade) * (0.88 + 0.12 * Math.sin(t * 0.8 + d.x * 9 + d.y * 5)) * la;
          c.fillStyle = `rgba(${ink[0]},${ink[1]},${ink[2]},${a})`;
          c.save(); c.translate(d.x * W, d.y * H); c.rotate(d.rot);
          c.fillRect(-len / 2, -th / 2, len, th);
          c.restore();
        }
      }
      const L = layers[layers.length - 1];
      if (L && !L.instant) {
        const age = Math.max(0, t - L.t);
        if (age < 3.4) {
          c.strokeStyle = dark ? `rgba(163,189,143,${0.35 * (1 - age / 3.4)})` : `rgba(43,74,55,${0.3 * (1 - age / 3.4)})`;
          c.lineWidth = 1.5; c.beginPath(); c.arc(L.sx * W, L.sy * H, age * 0.42 * W, 0, TAU); c.stroke();
          c.fillStyle = dark ? 'rgba(163,189,143,.9)' : 'rgba(43,74,55,.9)';
          c.beginPath(); c.arc(L.sx * W, L.sy * H, 4 * (1 - age / 3.4) + 1.5, 0, TAU); c.fill();
        }
      }
    },
  };
};

export default factory;
