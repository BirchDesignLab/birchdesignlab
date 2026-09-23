/**
 * An original palm silhouette, generated rather than traced: a leaning,
 * tapering trunk and serrated fronds grown along quadratic spines. Returns
 * SVG path data in a 260 x 420 box, crown near the top, trunk foot at the
 * bottom edge.
 */
type Pt = [number, number];

const CROWN: Pt = [138, 104];

/** [angle in degrees (SVG, y down), length, droop at the tip, half-width] */
const FRONDS: Array<[number, number, number, number]> = [
  [-172, 118, 70, 13],
  [-150, 116, 34, 13],
  [-122, 88, 14, 11],
  [-92, 66, 8, 9],
  [-58, 92, 14, 11],
  [-28, 118, 40, 13],
  [-6, 112, 76, 12],
  [150, 84, 78, 10],
  [32, 86, 80, 10],
];

const r = (n: number) => Math.round(n * 10) / 10;

function frond([deg, len, droop, width]: [number, number, number, number]): string {
  const a = (deg * Math.PI) / 180;
  const dir: Pt = [Math.cos(a), Math.sin(a)];
  const [cx, cy] = CROWN;
  const end: Pt = [cx + dir[0] * len, cy + dir[1] * len + droop];
  const ctrl: Pt = [cx + dir[0] * len * 0.55, cy + dir[1] * len * 0.55 - len * 0.2];
  const at = (t: number): Pt => [
    (1 - t) ** 2 * cx + 2 * (1 - t) * t * ctrl[0] + t * t * end[0],
    (1 - t) ** 2 * cy + 2 * (1 - t) * t * ctrl[1] + t * t * end[1],
  ];
  const tangent = (t: number): Pt => {
    const dx = 2 * (1 - t) * (ctrl[0] - cx) + 2 * t * (end[0] - ctrl[0]);
    const dy = 2 * (1 - t) * (ctrl[1] - cy) + 2 * t * (end[1] - ctrl[1]);
    const m = Math.hypot(dx, dy) || 1;
    return [dx / m, dy / m];
  };
  const sideA: Pt[] = [];
  const sideB: Pt[] = [];
  const steps = 16;
  for (let i = 1; i <= steps; i++) {
    const t = i / (steps + 1);
    const p = at(t);
    const d = tangent(t);
    const n: Pt = [-d[1], d[0]];
    // Leaflets alternate long and short and sweep toward the tip, which is
    // what reads as "palm" at silhouette scale.
    const w = width * Math.sin(Math.PI * Math.min(1, t * 1.15)) ** 0.6 * (i % 2 ? 1 : 0.38);
    const sweep = i % 2 ? w * 0.7 : 0;
    sideA.push([p[0] + n[0] * w + d[0] * sweep, p[1] + n[1] * w + d[1] * sweep]);
    sideB.push([p[0] - n[0] * w * 0.8 + d[0] * sweep, p[1] - n[1] * w * 0.8 + d[1] * sweep]);
  }
  const pts = [CROWN, ...sideA, end, ...sideB.reverse()];
  return `M${pts.map(([x, y]) => `${r(x)} ${r(y)}`).join('L')}Z`;
}

export const palmFronds: string[] = FRONDS.map(frond);

export const palmTrunk =
  'M104 420C107 330 116 220 133 110L144 112C130 222 124 330 122 420Z';

/** Ring notches down the trunk, drawn as short strokes in the field colour. */
export const palmRings: string[] = Array.from({ length: 16 }, (_, i) => {
  const t = (i + 1) / 17;
  const y = 112 + t * 300;
  const x = 139 - t * 26 - t * t * 4;
  const half = 5 + t * 4;
  return `M${r(x - half)} ${r(y)}L${r(x + half)} ${r(y - 3)}`;
});
