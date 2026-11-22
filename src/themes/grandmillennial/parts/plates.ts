/**
 * Grandmillennial Home: the plates swing (Stage 6 w3 task 26). Brushing a plate with the mouse, or tapping
 * it (touch, pen or a mouse click), sets it swinging from its top rim: one damped swing under 600 ms, the direction from the pointer's
 * travel (a tap swings it away from the tap point), its neighbours in the same group tilting slightly in
 * sympathy a beat later. The plates stay inert (aria-hidden, not focusable); nothing is stored.
 *
 * The swing is a Web Animation on `transform` (a rotation about the plate's top rim, written as
 * translate(0,-h) rotate(a) translate(0,h) so the plate's own resting `rotate` is untouched): no layout, no
 * style writes while it plays, nothing at all at rest. It is cancelled while the page is hidden and while
 * the hero is off screen, and by the cleanup. The amplitude is clamped so a swung plate never reaches the
 * gilt frame, the plaque or the bow (measured at swing start, from the plate's own arc).
 *
 * Stage 6 w4 task 30 (critique B7): the swing is a pendulum big enough to see (18 degrees at the struck plate), and
 * the room it may use is the gilt frame, the plaque, the bow and the resting discs of the other plates, so a plate
 * never swings over the frame, its text or another plate. On touch, with nothing to brush, one plate gives a
 * half-size swing once a visit on the common conditions (bauhaus/parts/beat.ts).
 *
 * The maths is pure and exported, so the tests pin it without a DOM. The mount is parts/toys.ts's pattern:
 * initPlates(landmark) returns a cleanup, run under lib/lifecycle's onMount.
 */
import { scheduleBeat } from '../../bauhaus/parts/beat';

/* ---------- the swing, pure ---------- */

/** One swing lasts this long, lag included: under the 600 ms the brief allows. */
export const SWING_MS = 560;
/** Damping (1/s) and angular frequency (rad/s): a pendulum (one big swing out, a small one back), not a buzz. */
export const DAMP = 6.5;
export const OMEGA = 12;
/** The largest angle the struck plate reaches, in degrees, and the share its neighbours tilt. A disc swinging about
    its rim shifts its centre by only radius x angle, so 9 degrees was about 4px at 820: 18 is a swing you can see. */
export const PEAK_DEG = 18;
export const SYMPATHY = 0.24;
/** However brushes pile up, no plate is ever carried past this: the struck plate's peak with a little slack for a restart in phase. */
export const CAP_DEG = PEAK_DEG * 1.1;
/** Each neighbour starts this much later per place away from the struck plate. */
export const LAG_MS = 38;
/** Keyframes per swing: one every 17.5 ms, a frame at 60 Hz. */
export const SAMPLES = 32;
/** Where the swing is eased out to rest: the last 15% fades so it never ends on a step. */
const TAPER_FROM = 0.85;

/** Displacement (deg) at time t (ms) of a swing that starts at th0 (deg) with impulse b, after `lag` ms of waiting. */
export function swingAngle(t: number, th0: number, b: number, lag = 0): number {
  const s = Math.max(0, t - lag) / 1000;
  const x = Math.exp(-DAMP * s) * (th0 * Math.cos(OMEGA * s) + b * Math.sin(OMEGA * s));
  const u = t / SWING_MS;
  const w = u <= TAPER_FROM ? 1 : u >= 1 ? 0 : 0.5 * (1 + Math.cos(Math.PI * (u - TAPER_FROM) / (1 - TAPER_FROM)));
  return x * w;
}

/** The sampled swing, SAMPLES + 1 angles from t = 0 to SWING_MS. */
export function swingSamples(th0: number, b: number, lag = 0): number[] {
  return Array.from({ length: SAMPLES + 1 }, (_, i) => swingAngle((i * SWING_MS) / SAMPLES, th0, b, lag));
}

/** The largest |x| of a unit impulse (th0 = 0, b = 1): the impulse that reaches `peak` degrees is peak / this. */
export const UNIT_PEAK = Math.max(...swingSamples(0, 1).map(Math.abs));

/**
 * The impulse (and its samples) for a swing in `dir` (+1 clockwise: the bottom of the plate goes left) whose
 * highest reach is `peakDeg`, shrunk until every sample sits inside [-negLim, posLim] (the room the plate has
 * either side). th0 is the displacement it starts from when a brush lands on a plate still swinging, so the
 * amplitude never adds up: the bound holds however fast the brushes come.
 */
export function fitSwing(th0: number, peakDeg: number, dir: 1 | -1, lag: number, posLim: number, negLim: number): { b: number; samples: number[] } {
  const full = (dir * peakDeg) / UNIT_PEAK;
  for (let k = 20; k >= 0; k--) {
    const b = (full * k) / 20;
    const samples = swingSamples(th0, b, lag);
    if (samples.every((x) => x <= posLim + 1e-6 && x >= -negLim - 1e-6)) return { b, samples };
  }
  return { b: 0, samples: swingSamples(th0, 0, lag) };
}

/** A brush moving right pushes the bottom of a hanging plate right: a negative (anticlockwise) angle. 0 when the pointer did not move. */
export function dirFromTravel(vx: number): 1 | -1 | 0 {
  return vx > 0 ? -1 : vx < 0 ? 1 : 0;
}

/** A tap right of the plate's centre pushes it left (clockwise, +1), a tap left pushes it right. 0 when dead centre. */
export function dirFromTap(tapX: number, centreX: number): 1 | -1 | 0 {
  const d = tapX - centreX;
  return Math.abs(d) < 1 ? 0 : d > 0 ? 1 : -1;
}

/* ---------- the room a plate has, pure ---------- */

export interface Rect { l: number; t: number; r: number; b: number }
export interface Pt { x: number; y: number }

/** The point `c` after a CSS rotate of `deg` about `p` (screen coordinates, y down: positive is clockwise). */
export function rotateAbout(c: Pt, p: Pt, deg: number): Pt {
  const a = (deg * Math.PI) / 180, cos = Math.cos(a), sin = Math.sin(a);
  const dx = c.x - p.x, dy = c.y - p.y;
  return { x: p.x + cos * dx - sin * dy, y: p.y + sin * dx + cos * dy };
}

/** Distance from a point to a rectangle (0 inside it). */
export function distToRect(pt: Pt, r: Rect): number {
  return Math.hypot(Math.max(r.l - pt.x, 0, pt.x - r.r), Math.max(r.t - pt.y, 0, pt.y - r.b));
}

/** A plate's resting disc: another plate the swinging one must not cross. */
export interface Disc { c: Pt; r: number }

/**
 * How far (degrees, at most maxDeg) a plate whose disc has radius `radius` and centre `c` can swing about `p`
 * in direction `sign` before its disc touches any of `rects` or any of the resting `discs` (centre distance under
 * the sum of the radii): the arc of the centre, checked every `step` degrees. A disc already closer than that at rest
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

/** A vector turned by `deg` (CSS rotate: positive is clockwise on screen, y down). */
const turn = (v: Pt, deg: number): Pt => rotateAbout(v, { x: 0, y: 0 }, deg);

/**
 * The pivot of a plate's swing, as an offset from its centre in the plate's OWN frame (the frame `transform` works in,
 * after the resting `rotate`): the SCREEN top of the plate, so the offset is the up vector turned by minus the rest
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

/** The transform of one keyframe: a rotation of `deg` about the screen top of a plate `h` px tall resting at `restDeg`. */
export function swingTransform(deg: number, h: number, restDeg = 0): string {
  const o = pivotOffset(h, restDeg);
  const px = (n: number) => `${(Math.abs(n) < 5e-4 ? 0 : n).toFixed(3)}px`;
  return `translate(${px(o.x)}, ${px(o.y)}) rotate(${deg.toFixed(3)}deg) translate(${px(-o.x)}, ${px(-o.y)})`;
}

/* ---------- the mount ---------- */

/** Bigger than the disc a plate paints, so a swung rim never grazes a protected box: the 24 scallops of the rim bulge to
    about 50.2 of 52 units (0.966 of the half width), and 0.98 covers them and a hair of the drop shadow. */
const DISC = 0.98;
/** A press that moves more than this, or lasts longer than TAP_MS, is a scroll or a hold, not a tap. */
const TAP_SLOP = 10;
const TAP_MS = 500;

interface Geo { c: Pt; w: number; rest: number; p: Pt; pos: number; neg: number }
interface Live { th0: number; b: number; lag: number; anim: Animation }

export function initPlates(hero: HTMLElement | null): (() => void) | void {
  if (!hero) return;
  const plates = [...hero.querySelectorAll<SVGElement>('.plates .gm-plate, .plate-row .gm-plate')];
  if (!plates.length) return;

  const running = new Map<SVGElement, Live>();
  let geo: Map<SVGElement, Geo> | null = null;
  let live = true;

  const isShown = (el: Element) => el.getClientRects().length > 0;
  const groupOf = (el: SVGElement) => plates.filter((p) => p.parentElement === el.parentElement && isShown(p));

  const cancelAll = () => {
    for (const { anim } of running.values()) anim.cancel();
    running.clear();
    geo = null;
  };

  /** Where each shown plate hangs and how far it may swing either way (measured with every plate at rest). */
  const measure = () => {
    const h = hero.getBoundingClientRect();
    const rel = (r: DOMRect): Rect => ({ l: r.left - h.left, t: r.top - h.top, r: r.right - h.left, b: r.bottom - h.top });
    const protect = ['.gilt', '.plaque', '.bow']
      .map((s) => hero.querySelector(s)).filter((e): e is Element => !!e).map((e) => rel(e.getBoundingClientRect()));
    // Every shown plate at rest: its centre, width and resting turn. A swinging plate must clear the others' resting
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
    return out;
  };

  const angleNow = (st: Live | undefined): number =>
    st && st.anim.playState === 'running' ? swingAngle(Number(st.anim.currentTime ?? 0), st.th0, st.b, st.lag) : 0;

  const play = (el: SVGElement, dir: 1 | -1 | 0, peak: number, lag: number) => {
    const g = geo?.get(el);
    if (!g) return;
    const prev = running.get(el);
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
    running.set(el, { th0, b, lag: wait, anim });
    anim.onfinish = () => { if (running.get(el)?.anim === anim) running.delete(el); };
  };

  /** The struck plate swings; the others of its group tilt the same way a beat later, each place further away a beat later still. `scale` is the share of the full swing (the touch beat gives half). */
  const swing = (el: SVGElement, dir: 1 | -1 | 0, scale = 1) => {
    if (!live) return;
    // measured only while every plate is at rest: a plate mid-swing has moved off its hanging place
    if (!running.size || !geo) geo = measure();
    const group = groupOf(el);
    const at = group.indexOf(el);
    const d = dir || (geo.get(el) && geo.get(el)!.pos >= geo.get(el)!.neg ? 1 : -1);
    play(el, d, PEAK_DEG * scale, 0);
    group.forEach((n, i) => { if (n !== el) play(n, d, PEAK_DEG * SYMPATHY * scale, LAG_MS * Math.abs(i - at)); });
  };

  const plateAt = (t: EventTarget | null): SVGElement | null => {
    const s = (t as Element | null)?.closest?.('svg.gm-plate') as SVGElement | null;
    return s && plates.includes(s) ? s : null;
  };

  /* mouse: brushing a plate swings it, the way the pointer was travelling */
  let over: SVGElement | null = null;
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
  const onLeave = () => { over = null; lastX = null; lastVx = 0; lastVxAt = 0; };

  /* a tap (touch, pen or a mouse click) swings it away from the tap point; a swipe that starts on a plate is the page's,
     and cancels the tap; a mouse press that is dragged or held is no click */
  let tap: { id: number; x: number; y: number; t: number; p: SVGElement } | null = null;
  const onDown = (e: PointerEvent) => {
    // Only the primary button (a touch or a pen contact reports 0): a right click opens the menu and a middle click
    // scrolls, and neither is a tap on a plate (task 26, r1 minor N1).
    const p = e.button === 0 ? plateAt(e.target) : null;
    tap = p ? { id: e.pointerId, x: e.clientX, y: e.clientY, t: e.timeStamp, p } : null;
  };
  const onUp = (e: PointerEvent) => {
    const t = tap;
    tap = null;
    if (!t || e.pointerId !== t.id) return;
    if (e.timeStamp - t.t > TAP_MS || Math.hypot(e.clientX - t.x, e.clientY - t.y) > TAP_SLOP) return;
    const r = t.p.getBoundingClientRect();
    swing(t.p, dirFromTap(e.clientX, (r.left + r.right) / 2));
  };
  const onCancel = () => { tap = null; };

  /* The first animated frame of a plate (its drop shadow is a filter) costs the GPU a one-off 240 ms or so; paid on the
     first brush it is a hitch in the swing itself. So each shown plate plays one invisible 80 ms animation (a hundredth of
     a degree) once, when the hero is in view and the page has been quiet for a moment, or the moment a pointer arrives,
     whichever comes first. Nothing stays running, nothing is written. */
  let warmed = false;
  let warmTimer = 0;
  const warmAnims: Animation[] = [];
  const warm = () => {
    window.clearTimeout(warmTimer);
    warmTimer = 0;
    if (warmed || !live || document.hidden) return;
    warmed = true;
    for (const el of plates) {
      if (!isShown(el)) continue;
      warmAnims.push(el.animate([{ transform: 'rotate(0.01deg)' }, { transform: 'rotate(0deg)' }], { duration: 80 }));
    }
  };

  /* nothing moves while the page is hidden or the plates are off screen */
  const onVisibility = () => { if (document.hidden) cancelAll(); };
  const io = new IntersectionObserver((entries) => {
    live = entries[entries.length - 1].isIntersecting;
    if (!live) { cancelAll(); window.clearTimeout(warmTimer); warmTimer = 0; }
    else if (!warmed && !warmTimer) warmTimer = window.setTimeout(warm, 900);
  });
  io.observe(hero);
  const ro = new ResizeObserver(() => cancelAll());
  ro.observe(hero);

  /* The touch beat (Stage 6 w4 task 30, critique A1): with no pointer to brush them, one plate gives a half-size swing,
     once a visit, when it is at least 60% on screen, the page has been still 400 ms and no form field has focus
     (bauhaus/parts/beat.ts). The first shown plate in document order that qualifies; a press on any plate spends it. */
  const beatAbort = new AbortController();
  const stopBeat = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ? () => {}
    : scheduleBeat('grandmillennial:plates', plates, (t) => { if (isShown(t)) swing(t as SVGElement, 0, 0.5); }, beatAbort.signal, (t) => live && isShown(t) && !running.size && !document.hidden);

  hero.addEventListener('pointerenter', warm);
  hero.addEventListener('pointerdown', warm);
  hero.addEventListener('pointermove', onMove);
  hero.addEventListener('pointerleave', onLeave);
  hero.addEventListener('pointerdown', onDown);
  hero.addEventListener('pointerup', onUp);
  hero.addEventListener('pointercancel', onCancel);
  document.addEventListener('visibilitychange', onVisibility);
  return () => {
    hero.removeEventListener('pointerenter', warm);
    hero.removeEventListener('pointerdown', warm);
    hero.removeEventListener('pointermove', onMove);
    hero.removeEventListener('pointerleave', onLeave);
    hero.removeEventListener('pointerdown', onDown);
    hero.removeEventListener('pointerup', onUp);
    hero.removeEventListener('pointercancel', onCancel);
    document.removeEventListener('visibilitychange', onVisibility);
    io.disconnect();
    ro.disconnect();
    stopBeat();
    beatAbort.abort();
    window.clearTimeout(warmTimer);
    for (const a of warmAnims) a.cancel();
    cancelAll();
  };
}
