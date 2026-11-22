/**
 * Cottagecore's needle and thread (Stage 6 w3 task 27): About's embroidery hoop.
 * A needle is parked on the rim (assets/Needle.astro). Drag it across the linen,
 * or tap points on the linen one after another, and a freehand running stitch
 * follows, in rose then sage then rose (one colour per thread). Letting go ties
 * a small French knot at the end. A thread unpicks itself about 15 s after its
 * knot, from its oldest stitch to its newest, one thread at a time, oldest
 * thread first.
 *
 * Inert and aria-hidden, like the school's other toys: a press is the whole
 * interface, so it takes pointer and touch and no keys. The stitch layer is an
 * aria-hidden SVG under the hoop's words, clipped to the linen circle by CSS
 * (theme.css `.nt-layer`), and a mask built here knocks out the manifesto's
 * lines and the maker's line, so a thread never covers a word.
 *
 * Touch: the needle picks up after a 200 ms press on it, or a mostly
 * horizontal move over 8 px (as bauhaus's .loose shapes do); a vertical swipe
 * anywhere else, the linen included, scrolls the page. A tap on the linen acts
 * on the release, if the finger stayed put and the page did not scroll.
 *
 * Cost: nothing runs at rest. A requestAnimationFrame loop exists only while the
 * needle travels or a thread unpicks; a thread that is waiting out its 15 s is
 * one timeout. A thread that comes due while the page is hidden or the hoop is
 * off screen is simply removed, with no frames. Memory only: nothing is stored.
 *
 * Lifecycle: mounted by toys.ts (onMount, torn down before the next swap); the
 * teardown removes every listener, timer, frame and observer, and puts the
 * needle, its attributes and the stitch layer back as the markup had them.
 */
import { scheduleBeat } from '../bauhaus/parts/beat';

const NS = 'http://www.w3.org/2000/svg';
const SLOP = 10;
const HOLD_MS = 200;
const HSLOP = 8;
/** A thread unpicks this long after its knot is tied. */
const LIFE_MS = 15000;
/** A tapped sequence ties off after this long with no new tap. */
const IDLE_MS = 1500;
/** How fast an unpicking thread is pulled out, px per second. */
const UNPICK_PX_S = 340;
const MAX_THREADS = 12;
const MAX_POINTS = 1800;
/** A sample is laid at least this far from the last (px). */
const STEP = 2.6;
/** The stitch: a dash and a gap along the path (the round caps add the stroke width to each dash). */
const DASH = 3.2;
const GAP = 7.4;
const PERIOD = DASH + GAP;
const W_UNDER = 3.4;
const W_OVER = 2.1;
const KNOT_R = 3.6;
/** The needle is held this far inside the hoop's outer edge (px). */
const KEEP_IN = 3;

interface Pt { x: number; y: number }

interface Thread {
  c: 0 | 1;
  g: SVGGElement;
  under: SVGPathElement;
  over: SVGPathElement;
  knot: SVGGElement | null;
  /** Samples, x y pairs in layer units, with the running length at each. */
  pts: number[];
  cum: number[];
  /** The path from the first sample (the live thread grows by appending). */
  d: string;
  tx: number;
  ty: number;
  /** The last sample that lay inside the linen: the knot sits there. */
  lastIn: number;
  /** 0 while the thread is live; else when its knot was tied (ms). */
  endedAt: number;
  due: number;
  unpicking: boolean;
  trim: number;
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - 2 * (1 - t) * (1 - t));
const ns = <K extends keyof SVGElementTagNameMap>(tag: K): SVGElementTagNameMap[K] => document.createElementNS(NS, tag);

export function initNeedle(el: HTMLElement): () => void {
  const hoop = el.closest<HTMLElement>('.hoop');
  const cloth = hoop?.querySelector<HTMLElement>('.cloth') ?? null;
  const layer = cloth?.querySelector<SVGSVGElement>('.nt-layer') ?? null;
  const group = layer?.querySelector<SVGGElement>('.nt-threads') ?? null;
  const body = el.querySelector<HTMLElement>('.nd-body');
  if (!hoop || !cloth || !layer || !group || !body) return () => {};

  const threads: Thread[] = [];
  let alive = true;
  let nextC: 0 | 1 = 0;
  let live: Thread | null = null;
  let raf = 0;
  let lastFrame = 0;
  let idleTimer = 0;
  let dueTimer = 0;
  let onScreen = true;
  let framed = false;
  let maskEl: SVGMaskElement | null = null;

  /* ---- geometry: page pixels, cached at the start of each interaction ---- */
  /** Layer units per page pixel; the hoop's centre and radii (page px); the needle's parked tip (page px). */
  const geo = { k: 1, cx: 0, cy: 0, left: 0, top: 0, linenR: 1, hoopR: 1, homeX: 0, homeY: 0, S: 0 };
  /** The call-to-action under the hoop (page px), and how far the needle's body (the hit padding too) reaches from
      its tip: left and right, and down. The tip is held where the body clears the link (clampTip). */
  const avoid = { l: 0, r: 0, t: 0, on: false, reachL: 0, reachR: 0, reachDown: 0 };
  const cta = hoop.parentElement?.querySelector<HTMLElement>('a') ?? null;
  /** The needle's offset from its park (page px), what `translate` holds. */
  const off: Pt = { x: 0, y: 0 };
  const sx = () => window.scrollX;
  const sy = () => window.scrollY;

  const readOffset = (): Pt => {
    const t = getComputedStyle(el).translate;
    if (!t || t === 'none') return { x: 0, y: 0 };
    const [a, b] = t.split(/\s+/);
    return { x: parseFloat(a) || 0, y: parseFloat(b ?? '0') || 0 };
  };

  /** Measure the hoop and the parked tip afresh (page px). The first call also sizes the layer and builds the mask. */
  const measure = () => {
    const c = cloth.getBoundingClientRect();
    const h = hoop.getBoundingClientRect();
    const n = el.getBoundingClientRect();
    const o = readOffset();
    if (!framed) {
      geo.S = c.width;
      layer.setAttribute('viewBox', `0 0 ${c.width} ${c.height}`);
      const defs = ns('defs');
      maskEl = ns('mask');
      maskEl.setAttribute('id', 'nt-keep');
      maskEl.setAttribute('maskUnits', 'userSpaceOnUse');
      defs.appendChild(maskEl);
      layer.insertBefore(defs, layer.firstChild);
      group.setAttribute('mask', 'url(#nt-keep)');
      framed = true;
    }
    geo.k = geo.S / c.width;
    geo.left = c.left + sx();
    geo.top = c.top + sy();
    geo.cx = c.left + sx() + c.width / 2;
    geo.cy = c.top + sy() + c.height / 2;
    geo.linenR = c.width / 2 - 2;
    geo.hoopR = h.width / 2 - KEEP_IN;
    geo.homeX = n.left + sx() - o.x;
    geo.homeY = n.top + sy() - o.y;
    off.x = o.x;
    off.y = o.y;
    // The body's reach from the tip (its box and the 0.8rem by 0.5rem hit padding round it), for the link below.
    const bb = body.getBoundingClientRect();
    const pad = 14;
    avoid.reachL = n.left - bb.left + pad;
    avoid.reachR = bb.right - n.left + pad;
    avoid.reachDown = bb.bottom - n.top + pad;
    const a = cta?.getBoundingClientRect();
    avoid.on = !!a && a.width > 1;
    if (a) {
      avoid.l = a.left + sx();
      avoid.r = a.right + sx();
      avoid.t = a.top + sy();
    }
    knockOut(c);
  };

  /** The mask keeps the whole layer except the manifesto's lines and the maker's line. */
  const knockOut = (c: DOMRect) => {
    if (!maskEl) return;
    while (maskEl.firstChild) maskEl.removeChild(maskEl.firstChild);
    const w = ns('rect');
    w.setAttribute('width', String(geo.S));
    w.setAttribute('height', String(geo.S));
    w.setAttribute('fill', '#fff');
    maskEl.appendChild(w);
    const boxes: DOMRect[] = [];
    const words = cloth.querySelector('.manifesto');
    if (words) {
      const r = document.createRange();
      r.selectNodeContents(words);
      boxes.push(...Array.from(r.getClientRects()));
    }
    const sig = cloth.querySelector('.sig');
    if (sig) boxes.push(sig.getBoundingClientRect());
    const pad = 5;
    for (const b of boxes) {
      if (b.width < 1 || b.height < 1) continue;
      const k = geo.k;
      const rr = ns('rect');
      rr.setAttribute('x', ((b.left - c.left - pad) * k).toFixed(1));
      rr.setAttribute('y', ((b.top - c.top - pad) * k).toFixed(1));
      rr.setAttribute('width', ((b.width + pad * 2) * k).toFixed(1));
      rr.setAttribute('height', ((b.height + pad * 2) * k).toFixed(1));
      rr.setAttribute('rx', String((3 * k).toFixed(1)));
      rr.setAttribute('fill', '#000');
      maskEl.appendChild(rr);
    }
  };

  /** Page px to layer units. */
  const toLayer = (px: number, py: number): Pt => ({ x: (px - geo.left) * geo.k, y: (py - geo.top) * geo.k });
  const dashScale = () => Math.min(1, Math.max(0.8, geo.S / 480));

  /* ---- threads ---- */

  const render = (th: Thread, full: boolean) => {
    if (full || th.unpicking) {
      // Rebuild from the trimmed start; the dash phase is the length trimmed, so a stitch never crawls.
      let i = 0;
      while (i < th.cum.length - 1 && th.cum[i + 1] <= th.trim) i++;
      let d = '';
      if (i >= th.cum.length - 1) d = '';
      else {
        const seg = th.cum[i + 1] - th.cum[i] || 1;
        const f = (th.trim - th.cum[i]) / seg;
        const x0 = th.pts[i * 2] + (th.pts[i * 2 + 2] - th.pts[i * 2]) * f;
        const y0 = th.pts[i * 2 + 1] + (th.pts[i * 2 + 3] - th.pts[i * 2 + 1]) * f;
        d = `M${x0.toFixed(1)} ${y0.toFixed(1)}`;
        for (let j = i + 1; j < th.cum.length; j++) d += `L${th.pts[j * 2].toFixed(1)} ${th.pts[j * 2 + 1].toFixed(1)}`;
      }
      th.under.setAttribute('d', d);
      th.over.setAttribute('d', d);
      const phase = String((th.trim % (PERIOD * dashScale())).toFixed(2));
      th.under.setAttribute('stroke-dashoffset', phase);
      th.over.setAttribute('stroke-dashoffset', phase);
    } else {
      th.under.setAttribute('d', th.d);
      th.over.setAttribute('d', th.d);
    }
  };

  const beginThread = (at: Pt) => {
    if (live) return;
    const u = dashScale();
    const c = nextC;
    const g = ns('g');
    g.setAttribute('class', 'nt-thread');
    g.setAttribute('data-c', String(c));
    const mk = (cls: string, w: number) => {
      const p = ns('path');
      p.setAttribute('class', cls);
      p.setAttribute('stroke-width', (w * u).toFixed(2));
      p.setAttribute('stroke-dasharray', `${(DASH * u).toFixed(2)} ${(GAP * u).toFixed(2)}`);
      return p;
    };
    const under = mk('nt-under', W_UNDER);
    const over = mk('nt-over', W_OVER);
    g.appendChild(under);
    g.appendChild(over);
    group.appendChild(g);
    const th: Thread = {
      c, g, under, over, knot: null,
      pts: [at.x, at.y], cum: [0], d: `M${at.x.toFixed(1)} ${at.y.toFixed(1)}`,
      tx: 0, ty: 0, lastIn: -1, endedAt: 0, due: 0, unpicking: false, trim: 0,
    };
    if (inLinen(at)) th.lastIn = 0;
    threads.push(th);
    live = th;
    // Too many threads: the oldest goes now.
    const ended = threads.filter((t) => t.endedAt && !t.unpicking);
    if (threads.length > MAX_THREADS && ended.length) { ended[0].due = 0; schedule(); }
  };

  const inLinen = (p: Pt) => Math.hypot(p.x - geo.S / 2, p.y - geo.S / 2) <= (geo.linenR - 4) * geo.k;

  /** Lay samples along a smooth curve from the thread's last sample to `to` (layer units). */
  const extend = (th: Thread, to: Pt) => {
    const n = th.pts.length / 2;
    if (n >= MAX_POINTS) return;
    const fx = th.pts[(n - 1) * 2];
    const fy = th.pts[(n - 1) * 2 + 1];
    const vx = to.x - fx;
    const vy = to.y - fy;
    const dist = Math.hypot(vx, vy);
    if (dist < STEP) return;
    // A cubic Hermite from the last sample to the new one: it leaves along the previous heading and arrives
    // along this chord, so a hand-drawn line has no corners.
    const steps = Math.max(1, Math.ceil(dist / (STEP + 0.6)));
    const m0x = th.tx || vx;
    const m0y = th.ty || vy;
    const s0 = Math.hypot(m0x, m0y) || 1;
    const a0x = (m0x / s0) * dist * 0.9;
    const a0y = (m0y / s0) * dist * 0.9;
    for (let s = 1; s <= steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      const h00 = 2 * t3 - 3 * t2 + 1;
      const h10 = t3 - 2 * t2 + t;
      const h01 = -2 * t3 + 3 * t2;
      const h11 = t3 - t2;
      const x = h00 * fx + h10 * a0x + h01 * to.x + h11 * vx * 0.9;
      const y = h00 * fy + h10 * a0y + h01 * to.y + h11 * vy * 0.9;
      const px = th.pts[th.pts.length - 2];
      const py = th.pts[th.pts.length - 1];
      th.cum.push(th.cum[th.cum.length - 1] + Math.hypot(x - px, y - py));
      th.pts.push(x, y);
      th.d += `L${x.toFixed(1)} ${y.toFixed(1)}`;
      if (inLinen({ x, y })) th.lastIn = th.pts.length / 2 - 1;
    }
    th.tx = vx;
    th.ty = vy;
    render(th, false);
  };

  /** Tie the live thread off: a French knot at the last stitch inside the linen. A thread of one sample is dropped. */
  const finish = () => {
    const th = live;
    if (!th) return;
    live = null;
    // A thread that was begun and dropped (a click on the needle with no move, a hold released in place, a drag that
    // never reached the linen) was never sewn: the colour in the eye stays, so two threads in a row never share one.
    if (th.pts.length < 4 || th.lastIn < 1) { removeThread(th); return; }
    nextC = (nextC ^ 1) as 0 | 1;
    el.setAttribute('data-c', String(nextC));
    const kx = th.pts[th.lastIn * 2];
    const ky = th.pts[th.lastIn * 2 + 1];
    const k = ns('g');
    k.setAttribute('class', 'nt-knot');
    const u = dashScale();
    const b = ns('circle');
    b.setAttribute('class', 'nt-kb');
    b.setAttribute('cx', kx.toFixed(1));
    b.setAttribute('cy', ky.toFixed(1));
    b.setAttribute('r', (KNOT_R * u).toFixed(2));
    const gl = ns('path');
    gl.setAttribute('class', 'nt-kg');
    gl.setAttribute('d', `M${(kx - 1.4 * u).toFixed(1)} ${(ky - 0.9 * u).toFixed(1)}q.5-1 1.4-1.2`);
    k.appendChild(b);
    k.appendChild(gl);
    th.g.appendChild(k);
    th.knot = k;
    th.endedAt = performance.now();
    th.due = th.endedAt + LIFE_MS;
    schedule();
  };

  const removeThread = (th: Thread) => {
    th.g.remove();
    const i = threads.indexOf(th);
    if (i >= 0) threads.splice(i, 1);
    if (live === th) live = null;
  };

  /* ---- unpicking: the oldest ended thread, one at a time ---- */

  const schedule = () => {
    window.clearTimeout(dueTimer);
    dueTimer = 0;
    if (!alive || threads.some((t) => t.unpicking)) return;
    let first: Thread | null = null;
    for (const t of threads) if (t.endedAt && (!first || t.due < first.due)) first = t;
    if (!first) return;
    const wait = first.due - performance.now();
    if (wait > 0) {
      dueTimer = window.setTimeout(schedule, wait);
      return;
    }
    // Due: unpick it, unless nobody can see (then it is just gone).
    if (document.hidden || !onScreen) {
      removeThread(first);
      schedule();
      return;
    }
    first.unpicking = true;
    first.trim = 0;
    loop();
  };

  /* ---- the needle: it travels (a tap, or gliding home), or it is held (a drag) ---- */

  interface Travel { ax: number; ay: number; cx: number; cy: number; bx: number; by: number; t0: number; dur: number; sew: boolean; done?: () => void }
  let travel: Travel | null = null;
  const queue: Pt[] = [];

  const clampTip = (x: number, y: number): Pt => {
    const dx = x - geo.cx;
    const dy = y - geo.cy;
    const d = Math.hypot(dx, dy);
    const p = d <= geo.hoopR ? { x, y } : { x: geo.cx + (dx / d) * geo.hoopR, y: geo.cy + (dy / d) * geo.hoopR };
    // Held clear of the call-to-action: where the body would reach it, the tip stops short, so a held or idling needle
    // never sits over the link and a click on the link is never the needle's (27/C3).
    if (avoid.on && p.x + avoid.reachR > avoid.l && p.x - avoid.reachL < avoid.r) p.y = Math.min(p.y, avoid.t - avoid.reachDown);
    return p;
  };

  /** Put the needle's tip at page (x, y); a live thread is sewn to it. */
  const moveTip = (x: number, y: number) => {
    const p = clampTip(x, y);
    off.x = p.x - geo.homeX;
    off.y = p.y - geo.homeY;
    el.style.translate = `${off.x.toFixed(1)}px ${off.y.toFixed(1)}px`;
    if (live) extend(live, toLayer(p.x, p.y));
  };
  const tipPage = (): Pt => ({ x: geo.homeX + off.x, y: geo.homeY + off.y });

  const startTravel = (to: Pt, sew: boolean, done?: () => void) => {
    const a = tipPage();
    const dx = to.x - a.x;
    const dy = to.y - a.y;
    const dist = Math.hypot(dx, dy);
    // A gentle bow, as a hand's stitch is never ruler straight.
    const bow = sew ? (Math.random() < 0.5 ? -1 : 1) * dist * (0.05 + Math.random() * 0.06) : dist * 0.08;
    const mx = (a.x + to.x) / 2 - (dy / (dist || 1)) * bow;
    const my = (a.y + to.y) / 2 + (dx / (dist || 1)) * bow;
    travel = { ax: a.x, ay: a.y, cx: mx, cy: my, bx: to.x, by: to.y, t0: performance.now(), dur: Math.min(700, Math.max(220, dist * (sew ? 1.1 : 1.3))), sew, done };
    loop();
  };

  const stepTravel = (now: number) => {
    const tr = travel;
    if (!tr) return;
    const t = Math.min(1, Math.max(0, (now - tr.t0) / tr.dur));
    const e = ease(t);
    const u = 1 - e;
    const x = u * u * tr.ax + 2 * u * e * tr.cx + e * e * tr.bx;
    const y = u * u * tr.ay + 2 * u * e * tr.cy + e * e * tr.by;
    moveTip(x, y);
    if (t >= 1) {
      travel = null;
      tr.done?.();
    }
  };

  const glideHome = () => {
    const a = tipPage();
    if (Math.hypot(a.x - geo.homeX, a.y - geo.homeY) < 1) { el.style.translate = ''; return; }
    startTravel({ x: geo.homeX, y: geo.homeY }, false, () => { el.style.translate = ''; off.x = 0; off.y = 0; });
  };

  /** The queue of tapped points: sew to each in turn, tie off after a pause. */
  const nextTap = () => {
    const to = queue.shift();
    if (!to) {
      idleTimer = window.setTimeout(() => { idleTimer = 0; finish(); glideHome(); }, IDLE_MS);
      return;
    }
    startTravel(to, true, nextTap);
  };

  /* ---- the frame loop: only while something moves ---- */

  const loop = () => {
    if (raf || !alive) return;
    // The first frame's own timestamp starts the clock (it can be earlier than performance.now() here).
    lastFrame = 0;
    raf = requestAnimationFrame(tick);
  };
  const tick = (now: number) => {
    raf = 0;
    if (!alive) return;
    if (!lastFrame) lastFrame = now;
    const dt = Math.max(0, Math.min(64, now - lastFrame));
    lastFrame = now;
    if (travel) stepTravel(now);
    const th = threads.find((t) => t.unpicking);
    if (th) {
      th.trim += (UNPICK_PX_S * dt) / 1000;
      const total = th.cum[th.cum.length - 1];
      if (th.trim >= total - 0.5 || document.hidden || !onScreen) {
        removeThread(th);
        schedule();
      } else {
        render(th, true);
      }
    }
    if (travel || threads.some((t) => t.unpicking)) raf = requestAnimationFrame(tick);
  };

  /* ---- the needle, picked up ---- */

  interface Grab { id: number; type: string; x0: number; y0: number; held: boolean; px: number; py: number; gx: number; gy: number; hold: number }
  let grab: Grab | null = null;

  const pickUp = (g: Grab) => {
    window.clearTimeout(g.hold);
    g.held = true;
    window.clearTimeout(idleTimer);
    idleTimer = 0;
    travel = null;
    queue.length = 0;
    measure();
    el.setAttribute('data-held', '');
    try { body.setPointerCapture(g.id); } catch { /* not capturable */ }
    const tip = tipPage();
    g.gx = tip.x - (g.px + sx());
    g.gy = tip.y - (g.py + sy());
    if (!live) beginThread(toLayer(tip.x, tip.y));
    el.setAttribute('data-c', String(live!.c));
  };

  const onNeedleDown = (e: PointerEvent) => {
    if (grab || !e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const g: Grab = { id: e.pointerId, type: e.pointerType, x0: e.clientX, y0: e.clientY, held: false, px: e.clientX, py: e.clientY, gx: 0, gy: 0, hold: 0 };
    grab = g;
    if (e.pointerType === 'touch') {
      // A finger: the needle picks up after a short press, or on a mostly horizontal move (below); a vertical swipe scrolls.
      g.hold = window.setTimeout(() => { if (grab === g && !g.held) pickUp(g); }, HOLD_MS);
    } else {
      e.preventDefault();
      pickUp(g);
    }
  };
  const onNeedleMove = (e: PointerEvent) => {
    const g = grab;
    if (!g || e.pointerId !== g.id) return;
    g.px = e.clientX;
    g.py = e.clientY;
    if (!g.held) {
      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;
      if (Math.hypot(dx, dy) < HSLOP) return;
      if (Math.abs(dx) > Math.abs(dy)) pickUp(g);
      else { window.clearTimeout(g.hold); grab = null; return; }
    }
    moveTip(e.clientX + sx() + g.gx, e.clientY + sy() + g.gy);
  };
  const onNeedleUp = (e: PointerEvent) => {
    const g = grab;
    if (!g || e.pointerId !== g.id) return;
    window.clearTimeout(g.hold);
    grab = null;
    if (!g.held) return;
    el.removeAttribute('data-held');
    try { body.releasePointerCapture(g.id); } catch { /* already released */ }
    finish();
    glideHome();
  };
  // Once a finger holds the needle the page must not scroll under it.
  const onTouchMove = (e: TouchEvent) => { if (grab?.held && grab.type === 'touch' && e.cancelable) e.preventDefault(); };
  const onLost = (e: PointerEvent) => { if (grab && e.pointerId === grab.id) onNeedleUp(e); };
  const swallow = (e: Event) => e.preventDefault();

  body.addEventListener('pointerdown', onNeedleDown);
  body.addEventListener('pointermove', onNeedleMove);
  body.addEventListener('pointerup', onNeedleUp);
  body.addEventListener('pointercancel', onNeedleUp);
  body.addEventListener('lostpointercapture', onLost);
  body.addEventListener('touchmove', onTouchMove, { passive: false });
  body.addEventListener('contextmenu', swallow);
  body.addEventListener('dragstart', swallow);
  // A press on the needle takes no focus and starts no text selection.
  body.addEventListener('mousedown', swallow);

  /* ---- taps on the linen ---- */

  const downs = new Map<number, { x: number; y: number; sy: number; moved: boolean }>();
  const onClothDown = (e: PointerEvent) => {
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    downs.set(e.pointerId, { x: e.clientX, y: e.clientY, sy: sy(), moved: false });
  };
  const onClothMove = (e: PointerEvent) => {
    const p = downs.get(e.pointerId);
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLOP) p.moved = true;
  };
  const onClothUp = (e: PointerEvent) => {
    const p = downs.get(e.pointerId);
    downs.delete(e.pointerId);
    if (!p || p.moved || Math.abs(sy() - p.sy) > 3 || grab?.held) return;
    measure();
    const at = { x: e.clientX + sx(), y: e.clientY + sy() };
    // Only the linen: a tap on its rim or a corner of its box does nothing.
    if (Math.hypot(at.x - geo.cx, at.y - geo.cy) > geo.linenR) return;
    window.clearTimeout(idleTimer);
    idleTimer = 0;
    queue.push(at);
    // A tap while the needle is gliding home takes it from where it is.
    if (travel && !travel.sew) travel = null;
    if (!live) beginThread(toLayer(tipPage().x, tipPage().y));
    el.setAttribute('data-c', String(live!.c));
    if (!travel) nextTap();
  };
  const onClothCancel = (e: PointerEvent) => { downs.delete(e.pointerId); };
  cloth.addEventListener('pointerdown', onClothDown);
  cloth.addEventListener('pointermove', onClothMove);
  cloth.addEventListener('pointerup', onClothUp);
  cloth.addEventListener('pointercancel', onClothCancel);

  /* ---- the hoop in view, the first-visit nudge ---- */

  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => { for (const en of entries) onScreen = en.isIntersecting; });
    io.observe(hoop);
  }
  // The touch beat (Stage 6 w4 task 30, critique A1): once per visit, when the needle is at least 60% visible, the page
  // has been still 400 ms and no form field has focus (bauhaus/parts/beat.ts), a small draw-back and settle, so a visitor
  // who has not met it finds it moves. A mouse has the grab cursor and the steel highlight instead.
  const offNudge = () => el.removeAttribute('data-nudge');
  el.addEventListener('animationend', offNudge);
  const beatAbort = new AbortController();
  const stopBeat = window.matchMedia('(hover: hover) and (pointer: fine)').matches
    ? () => {}
    : scheduleBeat('cottagecore:needle', [body], () => el.setAttribute('data-nudge', ''), beatAbort.signal, () => !grab && !travel && !live && !threads.some((t) => t.unpicking));

  // A resize or a rotation while a thread lives re-flows the manifesto: the word mask is built again so the threads
  // keep clear of the words (27/C2). Nothing is measured while there is no thread.
  let ro: ResizeObserver | null = null;
  if ('ResizeObserver' in window) {
    ro = new ResizeObserver(() => { if (alive && framed && threads.length) measure(); });
    ro.observe(hoop);
    // the hoop keeps its size from 640 to 1440 while the manifesto's own size (a vw clamp) reflows its lines
    const words = cloth.querySelector('.manifesto');
    if (words) ro.observe(words);
  }

  return () => {
    alive = false;
    window.clearTimeout(idleTimer);
    window.clearTimeout(dueTimer);
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    travel = null;
    queue.length = 0;
    if (grab) { window.clearTimeout(grab.hold); try { body.releasePointerCapture(grab.id); } catch { /* gone */ } }
    grab = null;
    body.removeEventListener('pointerdown', onNeedleDown);
    body.removeEventListener('pointermove', onNeedleMove);
    body.removeEventListener('pointerup', onNeedleUp);
    body.removeEventListener('pointercancel', onNeedleUp);
    body.removeEventListener('lostpointercapture', onLost);
    body.removeEventListener('touchmove', onTouchMove);
    body.removeEventListener('contextmenu', swallow);
    body.removeEventListener('dragstart', swallow);
    body.removeEventListener('mousedown', swallow);
    cloth.removeEventListener('pointerdown', onClothDown);
    cloth.removeEventListener('pointermove', onClothMove);
    cloth.removeEventListener('pointerup', onClothUp);
    cloth.removeEventListener('pointercancel', onClothCancel);
    downs.clear();
    io?.disconnect();
    ro?.disconnect();
    stopBeat();
    beatAbort.abort();
    el.removeEventListener('animationend', offNudge);
    for (const t of threads) t.g.remove();
    threads.length = 0;
    live = null;
    maskEl?.parentElement?.remove();
    maskEl = null;
    group.removeAttribute('mask');
    layer.removeAttribute('viewBox');
    if (el.style.translate) el.style.translate = '';
    el.removeAttribute('data-held');
    el.removeAttribute('data-nudge');
    el.setAttribute('data-c', '0');
  };
}
