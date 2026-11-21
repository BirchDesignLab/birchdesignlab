/**
 * Cottagecore's two table toys (Stage 6 w3 task 23): the dandelion clock
 * (Home's closer, Sent) and the date stamp (Contact, Sent). Both are inert and
 * aria-hidden (assets/Dandelion.astro, assets/DateStamp.astro): a press is the
 * whole interface, so they take pointer and touch and no keys.
 *
 * Press: a mouse acts on the press; a touch or a pen acts on the RELEASE, if
 * it did not move past a few px and the page did not scroll, so a vertical
 * swipe that starts on a toy scrolls the page and fires nothing (a scroll
 * ends in pointercancel), and a long press acts as a tap. Nothing is stored:
 * the state is the DOM's and the animations', and a fresh body (each visit,
 * each in-school swap) starts fresh.
 *
 * Lifecycle: mounted with onMount from the header (like fx.ts) and torn down
 * before the next swap; the teardown removes every listener, timer, observer
 * and animation, and puts every attribute and inline style back.
 *
 * The clock blows seeds into fx.ts's canvas through one window event
 * (`cc:blow`), which fx.ts also reads in the dark scheme as a tap on clear
 * cloth, where the same spot calls a firefly that rises.
 */
import { onMount } from '../../lib/lifecycle';

const SCHOOL = 'cottagecore';

/** The release a clock sends fx.ts (client pixels). `points` are where the seeds leave the head. */
export interface BlowDetail {
  x: number;
  y: number;
  r: number;
  n: number;
  points: Array<{ x: number; y: number }>;
}
export const BLOW_EVENT = 'cc:blow';

/** A touch counts as a tap when it moves no more than this many px and the page no more than 3. */
const SLOP = 10;
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** One press on `el`: `fire` runs on a mouse press and on a touch or pen release that stayed put. */
function bindPress(el: HTMLElement, fire: () => void): () => void {
  const downs = new Map<number, { x: number; y: number; sy: number; moved: boolean }>();
  const onDown = (e: PointerEvent) => {
    if (e.pointerType === 'mouse') {
      if (e.button === 0) fire();
      return;
    }
    downs.set(e.pointerId, { x: e.clientX, y: e.clientY, sy: window.scrollY, moved: false });
  };
  const onMove = (e: PointerEvent) => {
    const p = downs.get(e.pointerId);
    if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > SLOP) p.moved = true;
  };
  const onUp = (e: PointerEvent) => {
    const p = downs.get(e.pointerId);
    downs.delete(e.pointerId);
    if (!p || p.moved || Math.abs(window.scrollY - p.sy) > 3) return;
    fire();
  };
  const onCancel = (e: PointerEvent) => { downs.delete(e.pointerId); };
  // A long press on a phone would open the browser's menu on the drawing.
  const onMenu = (e: Event) => e.preventDefault();
  // A press on a toy takes no focus: the field a visitor is typing in keeps it (Contact's form stays usable
  // while the stamp thunks), and a touch's compatibility mousedown does not blur it either.
  const onMouseDown = (e: Event) => e.preventDefault();
  el.addEventListener('mousedown', onMouseDown);
  el.addEventListener('pointerdown', onDown);
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerup', onUp);
  el.addEventListener('pointercancel', onCancel);
  el.addEventListener('contextmenu', onMenu);
  return () => {
    el.removeEventListener('mousedown', onMouseDown);
    el.removeEventListener('pointerdown', onDown);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerup', onUp);
    el.removeEventListener('pointercancel', onCancel);
    el.removeEventListener('contextmenu', onMenu);
    downs.clear();
  };
}

/** Once, when the toy first scrolls into view: set `data-nudge` for its one-shot sway or lift. */
function nudgeOnce(el: HTMLElement): () => void {
  const off = () => el.removeAttribute('data-nudge');
  el.addEventListener('animationend', off);
  let io: IntersectionObserver | null = null;
  if ('IntersectionObserver' in window) {
    io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      el.setAttribute('data-nudge', '');
      io?.disconnect();
      io = null;
    }, { threshold: 0.6 });
    io.observe(el);
  }
  return () => {
    io?.disconnect();
    el.removeEventListener('animationend', off);
    off();
  };
}

/* ---------- the dandelion clock ---------- */

/** A tap blows 6 to 10 seeds; the bald patch refills over about 20 s. */
const BLOW = { min: 6, max: 10, refillMs: 20000, fadeMs: 2800, first: 1800, last: 16200 };

export function initDandelion(el: HTMLElement): () => void {
  const svg = el.querySelector<SVGSVGElement>('svg');
  const head = el.querySelector<SVGGElement>('.dc-head');
  const seeds = [...el.querySelectorAll<SVGPathElement>('.sd')];
  if (!svg || !head || !seeds.length) return () => {};
  const root = document.documentElement;
  const anims = new Map<SVGPathElement, Animation>();
  let litTimer = 0;

  /** A seed is on the head when it is not mid-refill. */
  const present = (s: SVGPathElement) => !anims.has(s);

  const fire = () => {
    const dark = root.dataset.scheme === 'dark';
    const rect = svg.getBoundingClientRect();
    const k = rect.width / 100;
    const cx = rect.left + 50 * k;
    const cy = rect.top + 46 * k;
    const r = 33 * k;
    const points: BlowDetail['points'] = [];
    let oy = cy;
    if (!dark) {
      // The bald patch: the seeds nearest a random bearing, as many as are on the head up to 6 to 10.
      const here = seeds.filter(present);
      const n = Math.min(here.length, Math.round(rand(BLOW.min, BLOW.max)));
      if (!n) return;
      const aim = rand(0, Math.PI * 2);
      const gap = (s: SVGPathElement) => {
        const d = Math.abs(Number(s.dataset.a) - aim) % (Math.PI * 2);
        return Math.min(d, Math.PI * 2 - d) + Math.random() * 0.22;
      };
      const go = here.sort((a, b) => gap(a) - gap(b)).slice(0, n);
      // Each seed refills in its own window, spread so the last is whole about 20 s after the tap.
      const order = go.map((_, i) => i).sort(() => Math.random() - 0.5);
      go.forEach((s, i) => {
        const j = order[i];
        const start = n === 1 ? BLOW.first : BLOW.first + (j / (n - 1)) * (BLOW.last - BLOW.first) + rand(-400, 400);
        const a = Number(s.dataset.a);
        const dx = Math.cos(a) * 7;
        const dy = Math.sin(a) * 7 - 3;
        const t = (ms: number) => Math.min(1, Math.max(0, ms / BLOW.refillMs));
        const gone = t(240);
        const back = t(Math.max(start, 400));
        const whole = t(Math.max(start, 400) + BLOW.fadeMs);
        const anim = s.animate([
          { opacity: 1, transform: 'translate(0px, 0px) scale(1)', offset: 0 },
          { opacity: 0, transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(1.04)`, offset: gone },
          { opacity: 0, transform: 'translate(0px, 0px) scale(0.55)', offset: back },
          { opacity: 1, transform: 'translate(0px, 0px) scale(1)', offset: whole },
          { opacity: 1, transform: 'translate(0px, 0px) scale(1)', offset: 1 },
        ], { duration: BLOW.refillMs, easing: 'linear', fill: 'none' });
        anims.set(s, anim);
        anim.onfinish = anim.oncancel = () => { anims.delete(s); };
        const px = Number(s.dataset.px);
        const py = Number(s.dataset.py);
        points.push({ x: rect.left + px * k, y: rect.top + py * k });
      });
    } else {
      // By lamplight the same spot calls a firefly (fx.ts), from the top of the head, which glows while it rises.
      oy = cy - r * 0.5;
      el.setAttribute('data-lit', '');
      clearTimeout(litTimer);
      litTimer = window.setTimeout(() => el.removeAttribute('data-lit'), 1300);
    }
    window.dispatchEvent(new CustomEvent<BlowDetail>(BLOW_EVENT, { detail: { x: cx, y: oy, r, n: points.length, points } }));
    // A little shiver of the whole head, whichever way the room is lit.
    head.animate([{ rotate: '0deg' }, { rotate: '5deg' }, { rotate: '-3deg' }, { rotate: '0deg' }], { duration: 520, easing: 'ease-out' });
  };

  const offPress = bindPress(el, fire);
  const offNudge = nudgeOnce(el);
  return () => {
    offPress();
    offNudge();
    clearTimeout(litTimer);
    el.removeAttribute('data-lit');
    for (const a of anims.values()) { a.oncancel = a.onfinish = null; a.cancel(); }
    anims.clear();
    head.getAnimations().forEach((a) => a.cancel());
  };
}

/* ---------- the date stamp ---------- */

/** How much of its own ink a mark keeps at each age (0 is the newest); the six-slot Contact pad shows five. */
const AGE_INK = [1, 0.8, 0.6, 0.42, 0.26, 0];
const PRESS_MS = 300;
/** The rubber meets the paper this far into the press (a share of PRESS_MS). */
const CONTACT = 0.26;

export function initStamp(el: HTMLElement): () => void {
  const pad = el.dataset.pad ? document.querySelector<HTMLElement>(el.dataset.pad) : null;
  const body = el.querySelector<SVGGElement>('.ds-body');
  const shadow = el.querySelector<SVGEllipseElement>('.ds-shadow');
  const slots = pad ? [...pad.querySelectorAll<SVGSVGElement>('.cm')] : [];
  if (!pad || !body || !slots.length) return () => {};
  // How far a fresh mark may sit from the pad's middle (rem), set by the page.
  const jx = Number(pad.dataset.jx || 0.8);
  const jy = Number(pad.dataset.jy || 1.6);
  const inks = AGE_INK.slice(0, slots.length);
  // Age per slot: the number of presses since it was laid; a slot not yet used is as old as the oldest.
  const age = slots.map(() => slots.length);
  const base = slots.map(() => 0);
  const anims = new Set<Animation>();

  const track = (a: Animation) => {
    anims.add(a);
    a.onfinish = a.oncancel = () => anims.delete(a);
    return a;
  };

  const press = () => {
    // The stamp: it hops, comes down on its face (a squash) and settles; its shadow tightens as it lands.
    body.getAnimations().forEach((a) => a.cancel());
    shadow?.getAnimations().forEach((a) => a.cancel());
    track(body.animate([
      { transform: 'translateY(-5px)', offset: 0 },
      { transform: 'translateY(2.6px) scaleY(0.96)', offset: CONTACT },
      { transform: 'translateY(-0.9px)', offset: 0.55 },
      { transform: 'translateY(0)', offset: 1 },
    ], { duration: PRESS_MS, easing: 'ease-out' }));
    if (shadow) {
      track(shadow.animate([
        { transform: 'scale(0.82)', opacity: 0.6, offset: 0 },
        { transform: 'scale(1.06)', opacity: 1, offset: CONTACT },
        { transform: 'scale(1)', opacity: 1, offset: 1 },
      ], { duration: PRESS_MS, easing: 'ease-out' }));
    }

    // The oldest slot (or a blank one) takes the fresh mark; the rest age a step and lighten.
    let fresh = 0;
    for (let i = 1; i < slots.length; i++) if (age[i] > age[fresh]) fresh = i;
    for (let i = 0; i < slots.length; i++) {
      if (i === fresh) continue;
      if (age[i] < slots.length) age[i] += 1;
      slots[i].style.opacity = String((base[i] * (inks[Math.min(age[i], inks.length - 1)] ?? 0)).toFixed(3));
    }
    age[fresh] = 0;
    base[fresh] = rand(0.4, 0.92);
    const m = slots[fresh];
    // Laid straight down: no fade-out transition on the way, the mark comes in with the rubber.
    m.style.transition = 'none';
    m.style.setProperty('--rot', `${rand(-70, 70).toFixed(1)}deg`);
    m.style.setProperty('--dx', `${rand(-jx, jx).toFixed(2)}rem`);
    m.style.setProperty('--dy', `${rand(-jy, jy).toFixed(2)}rem`);
    m.style.opacity = base[fresh].toFixed(3);
    void m.getBoundingClientRect();
    m.style.transition = '';
    track(m.animate([
      { opacity: 0, scale: '1.14' },
      { opacity: base[fresh], scale: '1' },
    ], { duration: 150, delay: Math.round(PRESS_MS * CONTACT), easing: 'ease-out', fill: 'backwards' }));
  };

  const offPress = bindPress(el, press);
  const offNudge = nudgeOnce(el);
  return () => {
    offPress();
    offNudge();
    for (const a of anims) { a.oncancel = a.onfinish = null; a.cancel(); }
    anims.clear();
    for (const m of slots) {
      m.style.opacity = '';
      m.style.transition = '';
      m.style.removeProperty('--rot');
      m.style.removeProperty('--dx');
      m.style.removeProperty('--dy');
    }
  };
}

/** Mount every toy on the page; a no-op on any other school's page. */
export function mountToys(): void {
  onMount(() => {
    if (document.documentElement.dataset.theme !== SCHOOL) return;
    const off: Array<() => void> = [];
    document.querySelectorAll<HTMLElement>('[data-cc-toy="dandelion"]').forEach((el) => off.push(initDandelion(el)));
    document.querySelectorAll<HTMLElement>('[data-cc-toy="stamp"]').forEach((el) => off.push(initStamp(el)));
    if (!off.length) return;
    return () => off.forEach((f) => f());
  });
}
