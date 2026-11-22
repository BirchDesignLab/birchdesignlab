/**
 * Stage 6 wave 4, task 30: one-off edit of grandmillennial parts/plates.ts.
 *   critique B7   PEAK_DEG 18, OMEGA 12, DAMP 6.5, SWING_MS 560; CAP_DEG follows; the sibling plates' resting discs
 *                 are obstacles in arcLimit (a circle test), so the room rule really binds
 *   26/C2         lastVx resets on pointerleave and goes stale; an entry with no horizontal move uses the room default
 *   26/C3         a re-strike keeps a live neighbour moving through its lag
 *   26/C4         the pivot is the screen top of a turned plate (the offset is turned by minus the rest angle)
 *   26/C5         DISC 0.98 (the scallops reach about 0.966 of the half width), comment fixed
 *   26/r1-N1      a plate ignores a press that is not the primary button
 *   A1            the touch beat: one plate, a half-size swing, once a visit, on the common conditions (beat.ts)
 * Kept for the record; each hunk checks its anchor, so it refuses to run twice.
 *
 *   node scripts/themes/stage6/w4-t30-edit-plates.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const file = 'src/themes/grandmillennial/parts/plates.ts';
let src = readFileSync(file, 'utf8').replace(/\r\n/g, '\n');
function swap(name, from, to) {
  if (src.split(from).length !== 2) throw new Error(`hunk "${name}": anchor missing or not unique (already applied?)`);
  src = src.replace(from, () => to);
  console.log('ok', name);
}

swap('imports',
` * The maths is pure and exported, so the tests pin it without a DOM. The mount is parts/toys.ts's pattern:
 * initPlates(landmark) returns a cleanup, run under lib/lifecycle's onMount.
 */
`,
` * Stage 6 w4 task 30 (critique B7): the swing is a pendulum big enough to see (18 degrees at the struck plate), and
 * the room it may use is the gilt frame, the plaque, the bow and the resting discs of the other plates, so a plate
 * never swings over the frame, its text or another plate. On touch, with nothing to brush, one plate gives a
 * half-size swing once a visit on the common conditions (bauhaus/parts/beat.ts).
 *
 * The maths is pure and exported, so the tests pin it without a DOM. The mount is parts/toys.ts's pattern:
 * initPlates(landmark) returns a cleanup, run under lib/lifecycle's onMount.
 */
import { scheduleBeat } from '../../bauhaus/parts/beat';
`);

swap('constants',
`/** Damping (1/s) and angular frequency (rad/s): about 1.4 swings before it settles. */
export const DAMP = 7.5;
export const OMEGA = 15;
/** The largest angle the struck plate reaches, in degrees, and the share its neighbours tilt. */
export const PEAK_DEG = 9;`,
`/** Damping (1/s) and angular frequency (rad/s): a pendulum (one big swing out, a small one back), not a buzz. */
export const DAMP = 6.5;
export const OMEGA = 12;
/** The largest angle the struck plate reaches, in degrees, and the share its neighbours tilt. A disc swinging about
    its rim shifts its centre by only radius x angle, so 9 degrees was about 4px at 820: 18 is a swing you can see. */
export const PEAK_DEG = 18;`);

swap('arclimit',
`/**
 * How far (degrees, at most maxDeg) a plate whose disc has radius \`radius\` and centre \`c\` can swing about \`p\`
 * in direction \`sign\` before its disc touches any of \`rects\`: the arc of the centre, checked every \`step\` degrees.
 */
export function arcLimit(c: Pt, p: Pt, radius: number, rects: Rect[], sign: 1 | -1, maxDeg: number, step = 0.5): number {
  let ok = 0;
  for (let a = step; a <= maxDeg + 1e-9; a += step) {
    const q = rotateAbout(c, p, sign * a);
    if (rects.some((r) => distToRect(q, r) < radius)) break;
    ok = a;
  }
  return ok;
}

/** The hanging point of a plate: the top of its rim, in the plate's own frame, turned by its resting rotation (deg). */
export function hangPoint(c: Pt, w: number, restDeg: number): Pt {
  const r = (restDeg * Math.PI) / 180;
  return { x: c.x + (w / 2) * Math.sin(r), y: c.y - (w / 2) * Math.cos(r) };
}

/** The transform of one keyframe: a rotation of \`deg\` about the top rim of a plate \`h\` px tall. */
export function swingTransform(deg: number, h: number): string {
  return \`translate(0, \${-h / 2}px) rotate(\${deg.toFixed(3)}deg) translate(0, \${h / 2}px)\`;
}`,
`/** A plate's resting disc: another plate the swinging one must not cross. */
export interface Disc { c: Pt; r: number }

/**
 * How far (degrees, at most maxDeg) a plate whose disc has radius \`radius\` and centre \`c\` can swing about \`p\`
 * in direction \`sign\` before its disc touches any of \`rects\` or any of the resting \`discs\` (centre distance under
 * the sum of the radii): the arc of the centre, checked every \`step\` degrees. A disc already closer than that at rest
 * (two plates hung overlapping) blocks only a swing that brings the centres closer still, so it never freezes a plate.
 */
export function arcLimit(c: Pt, p: Pt, radius: number, rects: Rect[], sign: 1 | -1, maxDeg: number, discs: Disc[] = [], step = 0.5): number {
  const rest = discs.map((d) => Math.hypot(c.x - d.c.x, c.y - d.c.y));
  let ok = 0;
  for (let a = step; a <= maxDeg + 1e-9; a += step) {
    const q = rotateAbout(c, p, sign * a);
    if (rects.some((r) => distToRect(q, r) < radius)) break;
    if (discs.some((d, i) => Math.hypot(q.x - d.c.x, q.y - d.c.y) < Math.min(radius + d.r, rest[i] - 1e-6))) break;
    ok = a;
  }
  return ok;
}

/** A vector turned by \`deg\` (CSS rotate: positive is clockwise on screen, y down). */
const turn = (v: Pt, deg: number): Pt => rotateAbout(v, { x: 0, y: 0 }, deg);

/**
 * The pivot of a plate's swing, as an offset from its centre in the plate's OWN frame (the frame \`transform\` works in,
 * after the resting \`rotate\`): the SCREEN top of the plate, so the offset is the up vector turned by minus the rest
 * angle. Written in the plate's frame a plate turned 20 degrees would swing from a point on its rim 20 degrees round,
 * and bob (task 26, minor C4).
 */
export function pivotOffset(h: number, restDeg: number): Pt {
  return turn({ x: 0, y: -h / 2 }, -restDeg);
}

/** The hanging point of a plate in the page: the top of its rim on screen, whatever its resting rotation (deg). */
export function hangPoint(c: Pt, w: number, restDeg: number): Pt {
  const o = turn(pivotOffset(w, restDeg), restDeg);
  return { x: c.x + o.x, y: c.y + o.y };
}

/** The transform of one keyframe: a rotation of \`deg\` about the screen top of a plate \`h\` px tall resting at \`restDeg\`. */
export function swingTransform(deg: number, h: number, restDeg = 0): string {
  const o = pivotOffset(h, restDeg);
  const px = (n: number) => \`\${(Math.abs(n) < 5e-4 ? 0 : n).toFixed(3)}px\`;
  return \`translate(\${px(o.x)}, \${px(o.y)}) rotate(\${deg.toFixed(3)}deg) translate(\${px(-o.x)}, \${px(-o.y)})\`;
}`);

swap('disc',
`/** Bigger than the disc a plate paints (the rim reaches 47 of 52 units) so a swung rim never grazes a protected box. */
const DISC = 0.94;`,
`/** Bigger than the disc a plate paints, so a swung rim never grazes a protected box: the 24 scallops of the rim bulge to
    about 50.2 of 52 units (0.966 of the half width), and 0.98 covers them and a hair of the drop shadow. */
const DISC = 0.98;`);

swap('geo-type',
`interface Geo { c: Pt; w: number; p: Pt; pos: number; neg: number }`,
`interface Geo { c: Pt; w: number; rest: number; p: Pt; pos: number; neg: number }`);

swap('measure',
`    const out = new Map<SVGElement, Geo>();
    for (const el of plates) {
      if (!isShown(el)) continue;
      const cs = getComputedStyle(el);
      const w = parseFloat(cs.width) || el.getBoundingClientRect().width;
      const rest = cs.rotate && cs.rotate !== 'none' ? parseFloat(cs.rotate) || 0 : 0;
      const b = rel(el.getBoundingClientRect());
      const c = { x: (b.l + b.r) / 2, y: (b.t + b.b) / 2 };
      const p = hangPoint(c, w, rest);
      const radius = (w / 2) * DISC;
      out.set(el, {
        c, w, p,
        pos: arcLimit(c, p, radius, protect, 1, CAP_DEG),
        neg: arcLimit(c, p, radius, protect, -1, CAP_DEG),
      });
    }
    return out;`,
`    // Every shown plate at rest: its centre, width and resting turn. A swinging plate must clear the others' resting
    // discs (a sympathetic neighbour tilts a few degrees about its own pivot, so each disc is swelled by that reach).
    const rows: Array<{ el: SVGElement; c: Pt; w: number; rest: number }> = [];
    for (const el of plates) {
      if (!isShown(el)) continue;
      const cs = getComputedStyle(el);
      const w = parseFloat(cs.width) || el.getBoundingClientRect().width;
      const rest = cs.rotate && cs.rotate !== 'none' ? parseFloat(cs.rotate) || 0 : 0;
      const b = rel(el.getBoundingClientRect());
      rows.push({ el, c: { x: (b.l + b.r) / 2, y: (b.t + b.b) / 2 }, w, rest });
    }
    const sway = (SYMPATHY * CAP_DEG * Math.PI) / 180;
    const out = new Map<SVGElement, Geo>();
    for (const { el, c, w, rest } of rows) {
      const p = hangPoint(c, w, rest);
      const radius = (w / 2) * DISC;
      const discs: Disc[] = rows.filter((o) => o.el !== el).map((o) => ({ c: o.c, r: (o.w / 2) * DISC * (1 + sway) }));
      out.set(el, {
        c, w, rest, p,
        pos: arcLimit(c, p, radius, protect, 1, CAP_DEG, discs),
        neg: arcLimit(c, p, radius, protect, -1, CAP_DEG, discs),
      });
    }
    return out;`);

swap('play',
`    const prev = running.get(el);
    const th0 = angleNow(prev);
    const d = dir || (g.pos >= g.neg ? 1 : -1);
    const { b, samples } = fitSwing(th0, peak, d, lag, Math.min(g.pos, CAP_DEG), Math.min(g.neg, CAP_DEG));
    prev?.anim.cancel();
    if (samples.every((x) => Math.abs(x) < 0.02)) { running.delete(el); return; }
    const h = g.w;
    const anim = el.animate(
      samples.map((x, i) => ({ offset: i / SAMPLES, transform: swingTransform(x, h) })),
      { duration: SWING_MS, easing: 'linear' },
    );
    running.set(el, { th0, b, lag, anim });`,
`    const prev = running.get(el);
    const th0 = angleNow(prev);
    const d = dir || (g.pos >= g.neg ? 1 : -1);
    // A plate already swinging takes the new swing at once from where it is: waiting out a lag would hold it still
    // mid-arc for a beat (task 26, minor C3). Only a plate at rest waits its turn.
    const wait = prev && prev.anim.playState === 'running' ? 0 : lag;
    const { b, samples } = fitSwing(th0, peak, d, wait, Math.min(g.pos, CAP_DEG), Math.min(g.neg, CAP_DEG));
    prev?.anim.cancel();
    if (samples.every((x) => Math.abs(x) < 0.02)) { running.delete(el); return; }
    const h = g.w;
    const anim = el.animate(
      samples.map((x, i) => ({ offset: i / SAMPLES, transform: swingTransform(x, h, g.rest) })),
      { duration: SWING_MS, easing: 'linear' },
    );
    running.set(el, { th0, b, lag: wait, anim });`);

swap('swing-scale',
`  /** The struck plate swings; the others of its group tilt the same way a beat later, each place further away a beat later still. */
  const swing = (el: SVGElement, dir: 1 | -1 | 0) => {
    if (!live) return;
    // measured only while every plate is at rest: a plate mid-swing has moved off its hanging place
    if (!running.size || !geo) geo = measure();
    const group = groupOf(el);
    const at = group.indexOf(el);
    const d = dir || (geo.get(el) && geo.get(el)!.pos >= geo.get(el)!.neg ? 1 : -1);
    play(el, d, PEAK_DEG, 0);
    group.forEach((n, i) => { if (n !== el) play(n, d, PEAK_DEG * SYMPATHY, LAG_MS * Math.abs(i - at)); });
  };`,
`  /** The struck plate swings; the others of its group tilt the same way a beat later, each place further away a beat later still. \`scale\` is the share of the full swing (the touch beat gives half). */
  const swing = (el: SVGElement, dir: 1 | -1 | 0, scale = 1) => {
    if (!live) return;
    // measured only while every plate is at rest: a plate mid-swing has moved off its hanging place
    if (!running.size || !geo) geo = measure();
    const group = groupOf(el);
    const at = group.indexOf(el);
    const d = dir || (geo.get(el) && geo.get(el)!.pos >= geo.get(el)!.neg ? 1 : -1);
    play(el, d, PEAK_DEG * scale, 0);
    group.forEach((n, i) => { if (n !== el) play(n, d, PEAK_DEG * SYMPATHY * scale, LAG_MS * Math.abs(i - at)); });
  };`);

swap('mouse-vx',
`  let over: SVGElement | null = null;
  let lastX: number | null = null;
  let lastVx = 0;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      if (tap && e.pointerId === tap.id && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_SLOP) tap = null;
      return;
    }
    const vx = e.movementX || (lastX === null ? 0 : e.clientX - lastX);
    lastX = e.clientX;
    if (vx) lastVx = vx;
    const p = plateAt(e.target);
    if (p && p !== over) swing(p, dirFromTravel(lastVx));
    over = p;
  };
  const onLeave = () => { over = null; lastX = null; };`,
`  let over: SVGElement | null = null;
  let lastX: number | null = null;
  let lastVx = 0;
  let lastVxAt = 0;
  /** A sideways move this recent still says which way the pointer was travelling (ms). */
  const VX_FRESH = 90;
  const onMove = (e: PointerEvent) => {
    if (e.pointerType !== 'mouse') {
      if (tap && e.pointerId === tap.id && Math.hypot(e.clientX - tap.x, e.clientY - tap.y) > TAP_SLOP) tap = null;
      return;
    }
    const vx = e.movementX || (lastX === null ? 0 : e.clientX - lastX);
    lastX = e.clientX;
    if (vx) { lastVx = vx; lastVxAt = e.timeStamp; }
    const p = plateAt(e.target);
    // An entry with no sideways move (straight down onto a plate, or after the pointer has rested) has no direction:
    // the plate takes the way it has most room (task 26, minor C2).
    if (p && p !== over) swing(p, dirFromTravel(e.timeStamp - lastVxAt < VX_FRESH ? lastVx : 0));
    over = p;
  };
  const onLeave = () => { over = null; lastX = null; lastVx = 0; lastVxAt = 0; };`);

swap('button',
`  const onDown = (e: PointerEvent) => {
    const p = plateAt(e.target);
    tap = p ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, p } : null;
  };`,
`  const onDown = (e: PointerEvent) => {
    // Only the primary button (a touch or a pen contact reports 0): a right click opens the menu and a middle click
    // scrolls, and neither is a tap on a plate (task 26, r1 minor N1).
    const p = e.button === 0 ? plateAt(e.target) : null;
    tap = p ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, p } : null;
  };`);

swap('beat',
`  hero.addEventListener('pointerenter', warm);`,
`  /* The touch beat (Stage 6 w4 task 30, critique A1): with no pointer to brush them, one plate gives a half-size swing,
     once a visit, when it is at least 60% on screen, the page has been still 400 ms and no form field has focus
     (bauhaus/parts/beat.ts). The first shown plate in document order that qualifies; a press on any plate spends it. */
  const beatAbort = new AbortController();
  const stopBeat = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ? () => {}
    : scheduleBeat('grandmillennial:plates', plates, (t) => { if (isShown(t)) swing(t as SVGElement, 0, 0.5); }, beatAbort.signal, (t) => live && isShown(t) && !running.size && !document.hidden);

  hero.addEventListener('pointerenter', warm);`);

swap('teardown',
`    io.disconnect();
    ro.disconnect();
    window.clearTimeout(warmTimer);`,
`    io.disconnect();
    ro.disconnect();
    stopBeat();
    beatAbort.abort();
    window.clearTimeout(warmTimer);`);

writeFileSync(file, src);
