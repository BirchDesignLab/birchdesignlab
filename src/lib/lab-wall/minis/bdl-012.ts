/** BDL-012 The Data Map: pulses travel the links. Ported from the mockup's spec-c.js. */
import { T, TAU, alpha, clamp, mix, mulberry32, rr } from '../draw';
import type { Mini, MiniFactory } from '../types';

export const hint = 'Touch a node';

type Node = { id: string; col: number; y: number; l: string; s: string; glow: number; hot: number };
type Link = { a: Node; b: Node; hot: number };
type Pulse = { l: Link; u: number; sp: number; done?: boolean };

const factory: MiniFactory = (): Mini => {
  let W = 0, H = 0, tt = 0, spawnAt = 0.5, hotAcc = 0, seeded = false;
  const rnd = mulberry32(12);
  const N: Node[] = ([
    { id: 'sanity', col: 0, y: 0.3, l: 'Sanity', s: 'content' }, { id: 'tt', col: 0, y: 0.5, l: 'Ticket Tailor', s: 'tickets' }, { id: 'do', col: 0, y: 0.74, l: 'Durable Object', s: 'live game' },
    { id: 'wk', col: 1, y: 0.4, l: 'Worker', s: 'Cloudflare' }, { id: 'rs', col: 1, y: 0.66, l: 'Resend', s: 'email' },
    { id: 'web', col: 2, y: 0.27, l: 'Website', s: '' }, { id: 'ph', col: 2, y: 0.44, l: 'Phone', s: '' }, { id: 'tv', col: 2, y: 0.61, l: 'Venue TV', s: '' }, { id: 'in', col: 2, y: 0.78, l: 'Inbox', s: '' },
  ] as const).map((n) => ({ ...n, glow: 0, hot: 0 }));
  const byId: Record<string, Node> = Object.fromEntries(N.map((n) => [n.id, n]));
  const L: Link[] = ([['sanity', 'wk'], ['tt', 'wk'], ['do', 'wk'], ['wk', 'web'], ['wk', 'rs'], ['rs', 'in'], ['do', 'ph'], ['do', 'tv'], ['wk', 'ph']] as const).map(([a, b]) => ({ a: byId[a]!, b: byId[b]!, hot: 0 }));
  const SRC = [byId.sanity!, byId.tt!, byId.do!];
  let pulses: Pulse[] = [];
  const nx = (n: Node) => [0.15, 0.5, 0.85][n.col]! * W, ny = (n: Node) => n.y * H;
  const nw = () => Math.max(92, W * 0.19), nh = () => Math.max(34, H * 0.1);
  const pt = (l: Link, u: number): [number, number] => {
    const x0 = nx(l.a) + nw() / 2, y0 = ny(l.a), x3 = nx(l.b) - nw() / 2, y3 = ny(l.b), dx = (x3 - x0) * 0.5, v = 1 - u;
    return [v * v * v * x0 + 3 * v * v * u * (x0 + dx) + 3 * v * u * u * (x3 - dx) + u ** 3 * x3, v * v * v * y0 + 3 * v * v * u * y0 + 3 * v * u * u * y3 + u ** 3 * y3];
  };
  const emit = (l: Link, u = 0) => { if (pulses.length < 34) pulses.push({ l, u, sp: 0.3 + rnd() * 0.06 }); };
  function update(dt: number, hotNode: Node | null) {
    tt += dt; spawnAt -= dt;
    if (spawnAt <= 0) { const s = SRC[Math.floor(rnd() * 3)]!; L.filter((l) => l.a === s).forEach((l) => emit(l)); spawnAt = 1.5 + rnd() * 0.6; }
    if (hotNode) { hotAcc += dt; if (hotAcc > 0.45) { hotAcc = 0; const outs = L.filter((l) => l.a === hotNode); (outs.length ? outs : L.filter((l) => l.b === hotNode)).forEach((l) => emit(l)); } }
    for (const q of pulses) {
      q.u += q.sp * dt;
      if (q.u >= 1 && !q.done) { q.done = true; q.l.b.glow = 1; L.filter((l) => l.a === q.l.b).forEach((l) => emit(l)); }
    }
    pulses = pulses.filter((q) => !q.done);
    N.forEach((n) => { n.glow = Math.max(0, n.glow - dt * 1.1); });
  }
  return {
    t0: 0,
    resize(w, h) { W = w; H = h; if (!seeded) { seeded = true; for (let i = 0; i < 60; i++) update(0.1, null); } },
    draw(c, _t, dt, p) {
      update(Math.min(dt, 0.12), null);
      let hotNode: Node | null = null;
      if (p.a > 0.3) { let best = 1e9; for (const n of N) { const d = Math.hypot(p.x * W - nx(n), p.y * H - ny(n)); if (d < best && d < Math.max(70, W * 0.13)) { best = d; hotNode = n; } } }
      if (hotNode) { hotAcc += Math.min(dt, 0.12); if (hotAcc > 0.45) { hotAcc = 0; const hn: Node = hotNode; const outs = L.filter((l) => l.a === hn); (outs.length ? outs : L.filter((l) => l.b === hn)).forEach((l) => emit(l)); } }
      N.forEach((n) => { n.hot += ((n === hotNode ? 1 : 0) - n.hot) * (1 - Math.exp(-dt * 10)); });
      L.forEach((l) => { l.hot += ((hotNode && (l.a === hotNode || l.b === hotNode) ? 1 : 0) - l.hot) * (1 - Math.exp(-dt * 10)); });
      const ac = T.accent;
      c.fillStyle = T.raised; c.fillRect(0, 0, W, H);
      const fs = clamp(Math.min(H * 0.032, W * 0.027), 8, 13);
      c.font = `${fs}px Marcellus, serif`; c.letterSpacing = fs * 0.14 + 'px'; c.fillStyle = T.muted; c.textAlign = 'center'; c.textBaseline = 'middle';
      (W < 500 ? ['LIVES', 'TRAVELS', 'SHOWS UP'] : ['WHERE IT LIVES', 'WHERE IT TRAVELS', 'WHERE IT SHOWS UP']).forEach((s, i) => c.fillText(s, [0.15, 0.5, 0.85][i]! * W, H * 0.15));
      c.letterSpacing = '0px';
      for (const l of L) {
        const x0 = nx(l.a) + nw() / 2, y0 = ny(l.a), x3 = nx(l.b) - nw() / 2, y3 = ny(l.b), dx = (x3 - x0) * 0.5;
        c.strokeStyle = l.hot > 0.05 ? ac : alpha(T.mark, 0.28); c.lineWidth = 1.2 + l.hot * 1.4; c.globalAlpha = 1;
        c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(x0 + dx, y0, x3 - dx, y3, x3, y3); c.stroke();
      }
      for (const q of pulses) {
        for (let k = 5; k >= 0; k--) { const u = Math.max(0, q.u - k * 0.022), [x, y] = pt(q.l, u); c.fillStyle = alpha(ac, 0.5 * (1 - k / 6)); c.beginPath(); c.arc(x, y, 4.2 - k * 0.4, 0, TAU); c.fill(); }
        const [x, y] = pt(q.l, q.u); c.fillStyle = ac; c.beginPath(); c.arc(x, y, 4, 0, TAU); c.fill();
        c.fillStyle = alpha(ac, 0.18); c.beginPath(); c.arc(x, y, 10, 0, TAU); c.fill();
      }
      for (const n of N) {
        const w = nw(), h = nh(), x = nx(n) - w / 2, y = ny(n) - h / 2, e = Math.max(n.glow, n.hot);
        c.save(); if (e > 0.05) { c.shadowColor = alpha(ac, 0.55 * e); c.shadowBlur = 16 * e; }
        rr(c, x, y, w, h, 8); c.fillStyle = T.field; c.fill(); c.restore();
        c.strokeStyle = e > 0.05 ? mix(T.mark, ac, Math.min(1, e + 0.2)) : T.line; c.lineWidth = 1 + e; rr(c, x, y, w, h, 8); c.stroke();
        c.fillStyle = T.mark; c.font = `${fs * 1.12}px Marcellus, serif`;
        if (n.s) { c.fillText(n.l, nx(n), ny(n) - h * 0.14); c.font = `italic ${fs * 0.9}px Spectral, serif`; c.fillStyle = T.muted; c.fillText(n.s, nx(n), ny(n) + h * 0.26); } else c.fillText(n.l, nx(n), ny(n) + 1);
      }
      c.textAlign = 'left';
    },
  };
};

export default factory;
