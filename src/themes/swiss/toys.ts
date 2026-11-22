/**
 * Swiss toys (Stage 6 wave 3, task 21; A1 critic P2 and P6). Every one is a
 * variable-axis or colour change on the school's own face and fields, hard
 * stops and constant speeds, nothing eased, nothing stored. Each init returns
 * a cleanup that removes every listener, timer, frame request and observer and
 * puts the page back; each is deaf and at rest from the router's
 * before-preparation (the swap's snapshot) until the new page has landed.
 *
 *   initAboutSweep   About. The rotated "Birch" spine (from 1280) widens from
 *                    its rest cut to 125 and back as the founder section
 *                    crosses the screen, scroll-linked, its ink always the
 *                    section's height. Under 1280 the spine has little or no
 *                    travel (105 to 125 from 1024, the widest below that: the
 *                    room beside the text is spent) or does not exist (under
 *                    640), so the same sweep goes to the title stack, which
 *                    can only narrow: it narrows from its rest cut to 62 as
 *                    the title scrolls away. A resize keeps the sweep at its
 *                    current cut.
 *   initNumeralHold  Services. Inert. Pressing a step numeral dips its weight
 *                    from where it is to 100 (about 200 ms), then it travels
 *                    100 to 900 over about a second while held; release snaps
 *                    it back to rest at a constant speed. A mouse over the
 *                    digit gets a pointer and a rule under it; a finger gets
 *                    one small beat (below).
 *   initStopDrag     Sent. Inert. The red full stop drags along the baseline,
 *                    clamped to the measure, and snaps back at a constant
 *                    speed.
 *   initFieldPress   Every page. Inert. A red field goes white with red type,
 *                    a black field white with black type (a white one black),
 *                    while it is pressed. A press that starts on a link or a
 *                    control is that control's.
 *
 * Touch: a finger that starts on a numeral, the stop or a field picks it up
 * only after about 200 ms still (or, for the stop, a mostly horizontal move
 * over 8px), and a vertical swipe still scrolls: none of these calls
 * preventDefault on a touch.
 */
import { scheduleBeat } from '../bauhaus/parts/beat';

const isSwiss = () => document.documentElement.dataset.theme === 'swiss';
/** A real mouse on a fine pointer: the cursor and hover live there, the touch beat on everything else. */
const mouseHere = (): boolean => window.matchMedia('(hover: hover) and (pointer: fine)').matches;

/** The time a finger has to stay still before a toy takes it, and how far "still" is. */
const TOUCH_HOLD_MS = 200;
const SLOP_PX = 8;
/** The hold before a snap-back, and the time a full-range snap-back takes (the dial's, wave 2: 100 ms, then at most 252). */
const BACK_HOLD_MS = 100;
const BACK_FULL_MS = 252;

/** Run `cb` when the router is about to snapshot, and again once it should be back (the swap never came). */
function onNavigate(freeze: () => void, thaw: () => void): () => void {
  let timer = 0;
  const handler = () => {
    freeze();
    clearTimeout(timer);
    timer = window.setTimeout(thaw, 2500);
  };
  document.addEventListener('astro:before-preparation', handler);
  return () => {
    clearTimeout(timer);
    document.removeEventListener('astro:before-preparation', handler);
  };
}

/* ---------- About: the spine sweeps, the title narrows ---------- */

/** Archivo's cuts of the width axis at weight 900, as About.astro's CSS has them (the advance of "Birch" in ems, the ink over advance, the drop and the shift in ems). */
interface Cut { w: number; r: number; k: number; ty: number; tx: number }
const CUTS: Cut[] = [
  { w: 62, r: 1.725, k: 0.9775, ty: 0.039, tx: 0.028 },
  { w: 75, r: 2.064, k: 0.9683, ty: 0.0564, tx: 0.03 },
  { w: 105, r: 2.816, k: 0.9622, ty: 0.0777, tx: 0.032 },
  { w: 125, r: 3.2211, k: 0.9677, ty: 0.073, tx: 0.025 },
];
const WIDEST = 125;
const NARROWEST = 62;
const SPINE_PROPS = ['--sw-bwdth', '--sw-birch-r', '--sw-k', '--sw-ty', '--sw-tx'] as const;

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

function cutAt(table: Cut[], w: number): Cut {
  if (w <= table[0].w) return table[0];
  for (let i = 1; i < table.length; i++) {
    if (w <= table[i].w) {
      const t = (w - table[i - 1].w) / (table[i].w - table[i - 1].w);
      const a = table[i - 1];
      const b = table[i];
      return { w, r: lerp(a.r, b.r, t), k: lerp(a.k, b.k, t), ty: lerp(a.ty, b.ty, t), tx: lerp(a.tx, b.tx, t) };
    }
  }
  return table[table.length - 1];
}

export function initAboutSweep(): (() => void) | void {
  if (!isSwiss()) return;
  const sec = document.querySelector<HTMLElement>('section.founder');
  const birch = sec?.querySelector<HTMLElement>('.sw-birch');
  const title = document.querySelector<HTMLElement>('section.hero h1.title');
  const lines = title ? [...title.querySelectorAll<HTMLElement>('.ln')] : [];
  if (!sec || !birch || !title || lines.length === 0) return;

  // From 1280 the spine has a real run (62 or 75 to 125); below it the run is 20 units or none, so the title stack takes the sweep.
  const desk = window.matchMedia('(min-width: 1280px)');
  const abort = new AbortController();
  const opts = { signal: abort.signal };
  let frozen = false;
  let raf = 0;
  let visible = false;
  let spineCuts: Cut[] = [];
  let titleRest = 100;

  const clearSpine = () => { for (const p of SPINE_PROPS) birch.style.removeProperty(p); };
  const clearTitle = () => { for (const l of lines) l.style.removeProperty('--sw-d'); };
  const clearAll = () => { clearSpine(); clearTitle(); };

  /** What the sweep is on, now: the spine from 1024, the title stack below. */
  const target = () => (desk.matches ? sec : title);

  /** Read the rest values (the CSS ones, with nothing inline) and build the spine's table. */
  const measure = () => {
    clearAll();
    // The spine is the toy only while the sweep is on it: that is when a mouse over it gets its cursor and its ink block (About.astro).
    birch.toggleAttribute('data-live', desk.matches);
    if (desk.matches) {
      const cs = getComputedStyle(birch);
      const w = parseFloat(cs.getPropertyValue('--sw-bwdth'));
      const rest: Cut = {
        w,
        r: parseFloat(cs.getPropertyValue('--sw-birch-r')),
        k: parseFloat(cs.getPropertyValue('--sw-k')),
        ty: parseFloat(cs.getPropertyValue('--sw-ty')),
        tx: parseFloat(cs.getPropertyValue('--sw-tx')),
      };
      spineCuts = Number.isFinite(w) && Number.isFinite(rest.r) ? [rest, ...CUTS.filter((c) => c.w > w)] : [];
    } else {
      titleRest = parseFloat(getComputedStyle(title).getPropertyValue('--sw-s')) || 100;
    }
  };

  const update = () => {
    raf = 0;
    if (frozen) return;
    if (desk.matches) {
      if (spineCuts.length < 2) return;
      const r = sec.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 as the section's top meets the screen's foot, 1 as its foot leaves the top.
      const p = (vh - r.top) / (vh + r.height);
      const tri = clamp01(1 - Math.abs(2 * p - 1));
      if (tri <= 0.001) { clearSpine(); return; }
      const c = cutAt(spineCuts, lerp(spineCuts[0].w, WIDEST, tri));
      birch.style.setProperty('--sw-bwdth', c.w.toFixed(2));
      birch.style.setProperty('--sw-birch-r', c.r.toFixed(4));
      birch.style.setProperty('--sw-k', c.k.toFixed(4));
      birch.style.setProperty('--sw-ty', `${c.ty.toFixed(4)}em`);
      birch.style.setProperty('--sw-tx', `${c.tx.toFixed(4)}em`);
    } else {
      // Narrows as the title scrolls up out of the sheet: one title's height of scroll reaches the narrowest.
      const h = title.getBoundingClientRect().height || 1;
      const t = clamp01(window.scrollY / h);
      if (t <= 0.001) { clearTitle(); return; }
      const d = lerp(titleRest, NARROWEST, t);
      for (const l of lines) l.style.setProperty('--sw-d', d.toFixed(2));
    }
  };
  const schedule = () => { if (!raf && visible && !frozen) raf = requestAnimationFrame(update); };

  const io = new IntersectionObserver((entries) => {
    visible = entries.some((e) => e.isIntersecting);
    if (visible) schedule();
  });
  // `visible` carries across a re-observe (the observer reports again at once), so a resize
  // does not stop the sweep for the frames before it does.
  const observe = () => { io.disconnect(); io.observe(target()); };

  // measure() clears the inline cut to read the rest values; put the sweep back in the same task, so a resize
  // (a window drag, a phone's URL bar) never paints one frame at the rest cut (Stage 6 w3 task 21, C1).
  const remeasure = () => {
    measure();
    observe();
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
    if (visible && !frozen) update();
    else schedule();
  };
  window.addEventListener('scroll', schedule, { passive: true, signal: abort.signal });
  window.addEventListener('resize', remeasure, opts);
  desk.addEventListener('change', remeasure, opts);
  const stopNav = onNavigate(
    () => { frozen = true; if (raf) { cancelAnimationFrame(raf); raf = 0; } clearAll(); },
    () => { frozen = false; schedule(); },
  );
  void document.fonts.ready.then(() => { if (!abort.signal.aborted) remeasure(); });
  remeasure();

  return () => {
    abort.abort();
    stopNav();
    io.disconnect();
    if (raf) cancelAnimationFrame(raf);
    clearAll();
    birch.removeAttribute('data-live');
  };
}

/* ---------- Services: hold a numeral ---------- */

const W_REST = 700;
const W_MIN = 100;
const W_MAX = 900;
const RISE_MS = 1000;
/** Weight units a millisecond on the way back: the full range in BACK_FULL_MS, constant. */
const W_SPEED = (W_MAX - W_MIN) / BACK_FULL_MS;
/** A press travels from the current weight down to W_MIN at a constant speed: rest to the hairline in about 200 ms (Stage 6 w4 task 29, critique C2). */
const DIP_MS = 200;
const DIP_SPEED = (W_REST - W_MIN) / DIP_MS;
/** The touch beat (the common conditions are beat.ts's): a short dip and a short rise, then the ordinary snap-back. */
const BEAT_DIP_TO = 450;
const BEAT_RISE_TO = 800;
const BEAT_RISE_MS = 440;

export function initNumeralHold(page: Element | null, root: Document | Element = document): (() => void) | void {
  if (!page || !isSwiss()) return;
  const nums = [...page.querySelectorAll<HTMLElement>('.steps .num')];
  if (nums.length === 0) return;
  const abort = new AbortController();
  const opts = { signal: abort.signal };

  interface Run { raf: number; hold: number; weight: number; started: boolean; gate: number }
  const runs = new Map<HTMLElement, Run>();
  let press: { id: number; num: HTMLElement; x: number; y: number } | null = null;
  let frozen = false;

  /** The numeral is the digit, not the empty columns its box spans: a press counts on the glyph and a few pixels round it. */
  const onGlyph = (n: HTMLElement, x: number, y: number) => {
    const rg = document.createRange();
    rg.selectNodeContents(n);
    const r = rg.getBoundingClientRect();
    return x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8;
  };
  for (const n of nums) n.dataset.live = '';

  const runOf = (n: HTMLElement): Run => {
    let r = runs.get(n);
    if (!r) { r = { raf: 0, hold: 0, weight: W_REST, started: false, gate: 0 }; runs.set(n, r); }
    return r;
  };
  const show = (n: HTMLElement, w: number) => { runOf(n).weight = w; n.style.fontWeight = w.toFixed(1); };
  const stopRun = (n: HTMLElement) => {
    const r = runOf(n);
    if (r.raf) { cancelAnimationFrame(r.raf); r.raf = 0; }
    if (r.hold) { clearTimeout(r.hold); r.hold = 0; }
    if (r.gate) { clearTimeout(r.gate); r.gate = 0; }
  };
  const rest = (n: HTMLElement) => {
    stopRun(n);
    const r = runOf(n);
    r.started = false;
    r.weight = W_REST;
    n.style.removeProperty('font-weight');
    delete n.dataset.held;
  };

  /**
   * The press has settled: the weight travels from where it is down to the
   * thinnest (constant speed, about 200 ms from rest), then up to the heaviest
   * while held. Starting from the current weight means a press during the
   * snap-back never jumps (critique C2).
   */
  const begin = (n: HTMLElement) => {
    stopRun(n);
    const r = runOf(n);
    r.started = true;
    n.dataset.held = '';
    const from = r.weight;
    const dipMs = Math.max(0, from - W_MIN) / DIP_SPEED;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = now - t0;
      let w: number;
      if (t < dipMs) w = from - DIP_SPEED * t;
      else w = Math.min(W_MAX, W_MIN + ((W_MAX - W_MIN) * (t - dipMs)) / RISE_MS);
      show(n, w);
      r.raf = w >= W_MAX ? 0 : requestAnimationFrame(step);
    };
    show(n, from);
    r.raf = requestAnimationFrame(step);
  };

  /** The touch beat: a small version of the hold (dip, rise), let go of at once so the snap-back brings it home. */
  const beat = (n: HTMLElement) => {
    stopRun(n);
    const r = runOf(n);
    r.started = true;
    const from = r.weight;
    const dipMs = Math.max(0, from - BEAT_DIP_TO) / DIP_SPEED;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = now - t0;
      if (t < dipMs) { show(n, from - DIP_SPEED * t); r.raf = requestAnimationFrame(step); return; }
      const w = Math.min(BEAT_RISE_TO, BEAT_DIP_TO + ((BEAT_RISE_TO - BEAT_DIP_TO) * (t - dipMs)) / BEAT_RISE_MS);
      show(n, w);
      if (w >= BEAT_RISE_TO) { r.raf = 0; snapBack(n); return; }
      r.raf = requestAnimationFrame(step);
    };
    r.raf = requestAnimationFrame(step);
  };

  /** Released: after the hold, back to rest at a constant speed, then stop dead. */
  const snapBack = (n: HTMLElement) => {
    const r = runOf(n);
    stopRun(n);
    if (!r.started) { rest(n); return; }
    r.hold = window.setTimeout(() => {
      r.hold = 0;
      const from = r.weight;
      const t0 = performance.now();
      const step = (now: number) => {
        const d = W_SPEED * (now - t0);
        const w = from < W_REST ? Math.min(W_REST, from + d) : Math.max(W_REST, from - d);
        if (w === W_REST) { rest(n); return; }
        show(n, w);
        r.raf = requestAnimationFrame(step);
      };
      r.raf = requestAnimationFrame(step);
    }, BACK_HOLD_MS);
  };

  const end = (id?: number) => {
    if (!press || (id !== undefined && id !== press.id)) return;
    const n = press.num;
    press = null;
    snapBack(n);
  };

  const down = (e: Event) => {
    const p = e as PointerEvent;
    if (frozen || press) return;
    if (p.pointerType === 'mouse' && p.button !== 0) return;
    const num = p.target instanceof Element ? p.target.closest<HTMLElement>('.num') : null;
    if (!num || !nums.includes(num) || !onGlyph(num, p.clientX, p.clientY)) return;
    stopRun(num);
    press = { id: p.pointerId, num, x: p.clientX, y: p.clientY };
    if (p.pointerType === 'touch') {
      const r = runOf(num);
      r.started = false;
      r.gate = window.setTimeout(() => { r.gate = 0; if (press && press.num === num) begin(num); }, TOUCH_HOLD_MS);
    } else {
      begin(num);
    }
  };
  const move = (e: Event) => {
    const p = e as PointerEvent;
    if (!press || p.pointerId !== press.id) return;
    // A finger that moves before the press has settled is a swipe: the page's.
    if (!runOf(press.num).started && Math.hypot(p.clientX - press.x, p.clientY - press.y) > SLOP_PX) {
      const n = press.num;
      press = null;
      rest(n);
    }
  };
  const up = (e: Event) => end((e as PointerEvent).pointerId);

  // A mouse: the pointer and the underline rule belong to the digit and a few pixels round it, not to the three-column
  // box it sits in (Stage 6 w3 task 21 C2). `data-hot` is the signal; Services.astro paints it, on a fine hover pointer only.
  let hotNum: HTMLElement | null = null;
  const setHot = (n: HTMLElement | null) => {
    if (hotNum === n) return;
    hotNum?.removeAttribute('data-hot');
    hotNum = n;
    n?.setAttribute('data-hot', '');
  };
  const hover = (e: Event) => {
    const p = e as PointerEvent;
    if (p.pointerType !== 'mouse' || frozen || !mouseHere()) return;
    const num = p.target instanceof Element ? p.target.closest<HTMLElement>('.num') : null;
    setHot(num && nums.includes(num) && onGlyph(num, p.clientX, p.clientY) ? num : null);
  };

  const freeze = () => {
    frozen = true;
    press = null;
    setHot(null);
    for (const n of nums) rest(n);
  };

  root.addEventListener('pointerdown', down, opts);
  root.addEventListener('pointermove', move, opts);
  root.addEventListener('pointermove', hover, opts);
  page.addEventListener('pointerleave', () => setHot(null), opts);
  document.addEventListener('pointerup', up, opts);
  document.addEventListener('pointercancel', up, opts);
  root.addEventListener('contextmenu', (e) => { if (e.target instanceof Element && e.target.closest('.num')) e.preventDefault(); }, opts);
  window.addEventListener('blur', freeze, opts);
  document.addEventListener('visibilitychange', () => { if (document.hidden) freeze(); }, opts);
  const stopNav = onNavigate(freeze, () => { frozen = false; });
  // A blur or a hidden tab ends the press and nothing else: the next press works.
  window.addEventListener('focus', () => { frozen = false; }, opts);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) frozen = false; }, opts);

  // A finger gets one small beat of the hold, once a visit, on the common conditions (beat.ts); a mouse has the pointer and the step.
  if (!mouseHere()) {
    scheduleBeat('swiss:numerals', nums, (t) => beat(t as HTMLElement), abort.signal, (t) => !frozen && !press && !runOf(t as HTMLElement).started);
  }

  return () => {
    abort.abort();
    stopNav();
    press = null;
    setHot(null);
    for (const n of nums) { rest(n); delete n.dataset.live; }
    runs.clear();
  };
}

/* ---------- Sent: drag the red full stop ---------- */

/** The touch beat's slide out, at a constant speed. */
const STOP_BEAT_MS = 320;

export function initStopDrag(stop: HTMLElement | null): (() => void) | void {
  if (!stop || !isSwiss()) return;
  const sheet = stop.closest<HTMLElement>('.sent');
  if (!sheet) return;
  const abort = new AbortController();
  const opts = { signal: abort.signal };
  stop.dataset.live = '';

  let dx = 0;
  let lo = 0;
  let hi = 0;
  let speed = 1;
  let press: { id: number; x: number; y: number; dx0: number; engaged: boolean; touch: boolean } | null = null;
  let gate = 0;
  let hold = 0;
  let ret = 0;
  let raf = 0;
  let want = 0;
  let frozen = false;

  const put = (v: number) => {
    dx = v;
    if (v === 0) stop.style.removeProperty('translate');
    else stop.style.translate = `${v.toFixed(2)}px 0`;
  };
  const stopTimers = () => {
    if (gate) { clearTimeout(gate); gate = 0; }
    if (hold) { clearTimeout(hold); hold = 0; }
    if (ret) { cancelAnimationFrame(ret); ret = 0; }
    if (raf) { cancelAnimationFrame(raf); raf = 0; }
  };
  const rest = () => {
    stopTimers();
    press = null;
    delete stop.dataset.held;
    put(0);
  };

  /** The limits, from where the stop sits at rest: the measure's two edges. */
  const limits = () => {
    const f = sheet.getBoundingClientRect();
    const r = stop.getBoundingClientRect();
    const restLeft = r.left - dx;
    lo = f.left - restLeft;
    hi = f.right - (restLeft + r.width);
    // Full measure in BACK_FULL_MS: the same constant speed wherever it is let go.
    speed = Math.max(1, f.width) / BACK_FULL_MS;
  };

  const engage = (p: PointerEvent) => {
    if (!press) return;
    press.engaged = true;
    press.x = p.clientX;
    press.dx0 = dx;
    stop.dataset.held = '';
    try { stop.setPointerCapture(p.pointerId); } catch { /* not capturable */ }
  };

  const snapBack = () => {
    stopTimers();
    if (dx === 0) { rest(); return; }
    hold = window.setTimeout(() => {
      hold = 0;
      const from = dx;
      const t0 = performance.now();
      const step = (now: number) => {
        const d = speed * (now - t0);
        const v = from > 0 ? Math.max(0, from - d) : Math.min(0, from + d);
        if (v === 0) { rest(); return; }
        put(v);
        ret = requestAnimationFrame(step);
      };
      ret = requestAnimationFrame(step);
    }, BACK_HOLD_MS);
  };

  /**
   * The touch beat: the stop slides about its own width along the baseline and
   * snaps back by the ordinary return. It goes the way there is room: the word
   * fills the measure, so that is usually left, over its last letter, as a full
   * drag would.
   */
  const beat = () => {
    limits();
    const dist = Math.max(24, stop.getBoundingClientRect().width * 0.9);
    const to = hi >= dist ? dist : lo <= -dist ? -dist : 0;
    if (to === 0) return;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / STOP_BEAT_MS);
      put(to * t);
      if (t >= 1) { ret = 0; snapBack(); return; }
      ret = requestAnimationFrame(step);
    };
    ret = requestAnimationFrame(step);
  };

  const down = (e: Event) => {
    const p = e as PointerEvent;
    if (frozen || press) return;
    if (p.pointerType === 'mouse' && p.button !== 0) return;
    stopTimers();
    limits();
    press = { id: p.pointerId, x: p.clientX, y: p.clientY, dx0: dx, engaged: false, touch: p.pointerType === 'touch' };
    if (press.touch) gate = window.setTimeout(() => { gate = 0; engage(p); }, TOUCH_HOLD_MS);
    else engage(p);
  };
  const move = (e: Event) => {
    const p = e as PointerEvent;
    if (!press || p.pointerId !== press.id) return;
    if (!press.engaged) {
      // A finger: a mostly horizontal move over the slop picks the stop up; a vertical one is a scroll.
      const mx = p.clientX - press.x;
      const my = p.clientY - press.y;
      if (Math.abs(mx) > SLOP_PX && Math.abs(mx) > Math.abs(my)) { clearTimeout(gate); gate = 0; engage(p); }
      else if (Math.hypot(mx, my) > SLOP_PX) { clearTimeout(gate); gate = 0; press = null; }
      return;
    }
    want = Math.min(hi, Math.max(lo, press.dx0 + p.clientX - press.x));
    if (!raf) raf = requestAnimationFrame(() => { raf = 0; put(want); });
  };
  const up = (e: Event) => {
    const p = e as PointerEvent;
    if (!press || p.pointerId !== press.id) return;
    const was = press.engaged;
    press = null;
    try { stop.releasePointerCapture(p.pointerId); } catch { /* already gone */ }
    if (gate) { clearTimeout(gate); gate = 0; }
    if (was) {
      if (raf) { cancelAnimationFrame(raf); raf = 0; put(want); }
      delete stop.dataset.held;
      snapBack();
    }
  };
  const freeze = () => { frozen = true; rest(); };

  stop.addEventListener('pointerdown', down, opts);
  stop.addEventListener('pointermove', move, opts);
  stop.addEventListener('pointerup', up, opts);
  stop.addEventListener('pointercancel', up, opts);
  stop.addEventListener('contextmenu', (e) => e.preventDefault(), opts);
  window.addEventListener('blur', () => { if (press?.engaged) { press = null; delete stop.dataset.held; snapBack(); } else if (press) rest(); }, opts);
  document.addEventListener('visibilitychange', () => { if (document.hidden) rest(); }, opts);
  const stopNav = onNavigate(freeze, () => { frozen = false; });

  // A finger gets one small beat of the drag, once a visit, on the common conditions (beat.ts); a mouse has the grab cursor and the keyline.
  if (!mouseHere()) scheduleBeat('swiss:stop', [stop], beat, abort.signal, () => !frozen && !press && dx === 0 && !ret && !hold);

  return () => {
    abort.abort();
    stopNav();
    rest();
    delete stop.dataset.live;
  };
}

/* ---------- Every page: fields invert while pressed ---------- */

const FIELD = '.sw-red, .sw-sheet, .sw-black';
const CONTROL = 'a, button, input, textarea, select, label, summary, [role="button"], [role="slider"], [contenteditable]';
const FLIP = 'data-sw-flip';

/**
 * The field under a press, or null. A field's fill runs out to the sheet's
 * edge past its box (a spread shadow), so a press out there counts when it
 * lands on the page itself and not on something else; a field that bleeds to
 * the right only (Contact's address on a desktop) counts from its own left.
 */
function fieldAt(e: PointerEvent): HTMLElement | null {
  const t = e.target;
  if (!(t instanceof Element)) return null;
  const inside = t.closest<HTMLElement>(FIELD);
  if (inside) {
    const control = t.closest(CONTROL);
    return control && inside.contains(control) ? null : inside;
  }
  if (t !== document.documentElement && t !== document.body && !t.matches('main, [data-portal-tail]')) return null;
  for (const f of document.querySelectorAll<HTMLElement>(FIELD)) {
    if (!f.classList.contains('sw-bleed')) continue;
    const r = f.getBoundingClientRect();
    if (e.clientY < r.top || e.clientY > r.bottom) continue;
    const shadow = getComputedStyle(f).boxShadow;
    const rightOnly = /\s[1-9]\d*(\.\d+)?px\s+0px\s+0px\s+\d/.test(shadow);
    if (rightOnly ? e.clientX >= r.left : true) return f;
  }
  return null;
}

export function initFieldPress(): (() => void) | void {
  if (!isSwiss()) return;
  const abort = new AbortController();
  const opts = { signal: abort.signal };
  let press: { id: number; field: HTMLElement; x: number; y: number; gate: number } | null = null;
  let frozen = false;

  const off = () => {
    if (!press) return;
    clearTimeout(press.gate);
    press.field.removeAttribute(FLIP);
    press = null;
  };
  const down = (e: Event) => {
    const p = e as PointerEvent;
    if (frozen || press) return;
    if (p.pointerType === 'mouse' && p.button !== 0) return;
    const field = fieldAt(p);
    if (!field) return;
    press = { id: p.pointerId, field, x: p.clientX, y: p.clientY, gate: 0 };
    if (p.pointerType === 'touch') {
      // A finger: the field turns once the press has stayed still, so a swipe over a field never flashes it.
      press.gate = window.setTimeout(() => { if (press && press.field === field) { press.gate = 0; field.setAttribute(FLIP, ''); } }, TOUCH_HOLD_MS);
    } else {
      field.setAttribute(FLIP, '');
    }
  };
  const move = (e: Event) => {
    const p = e as PointerEvent;
    if (press && p.pointerId === press.id && p.pointerType === 'touch' && Math.hypot(p.clientX - press.x, p.clientY - press.y) > SLOP_PX) off();
  };
  const up = (e: Event) => {
    if (press && (e as PointerEvent).pointerId === press.id) off();
  };
  document.addEventListener('pointerdown', down, opts);
  document.addEventListener('pointermove', move, opts);
  document.addEventListener('pointerup', up, opts);
  document.addEventListener('pointercancel', up, opts);
  window.addEventListener('blur', off, opts);
  document.addEventListener('visibilitychange', () => { if (document.hidden) off(); }, opts);
  const stopNav = onNavigate(() => { frozen = true; off(); }, () => { frozen = false; });

  return () => {
    abort.abort();
    stopNav();
    off();
    for (const f of document.querySelectorAll(`[${FLIP}]`)) f.removeAttribute(FLIP);
  };
}
