/**
 * Cottagecore floaters: fireflies by lamplight in the dark scheme, dandelion
 * seeds on the breeze in the light scheme. One canvas, one loop, one
 * lifecycle. Canvas 2D, because it is a few soft dots and a few hairline
 * seeds. (Stage 5 B2 task 5, lifted from the a6 proof.)
 *
 * Lifecycle (src/themes/README.md, Motion and backgrounds): mounted per page
 * with onMount and torn down before the next swap; a no-op on any other
 * school's page, since module scripts outlive navigation. It watches
 * data-scheme (the switcher flips it in place), pauses when the tab is
 * hidden, caps the pixel ratio at 1.5, throttles to 30 fps, caches both
 * sprites (halo, seeds) offscreen, and under reduced motion paints one still
 * frame. The page reads the same with the canvas blank.
 *
 * Where they live (D7 (a)): the canvas stays over the cloth and under `main`.
 * It is fixed at z-index 0 inside the header; `main` is z-index 1, so the
 * sheets, cards and notes sit on top of the floaters and a seed or mote under
 * a sheet is simply hidden. Nothing here moves a floater above `main`.
 *
 * Fireflies (dark): the pulse is a burst: 2 to 4 flashes about 500 ms apart,
 * each a 120 to 180 ms rise and a 250 ms fall, then 4 to 8 s fully dark. Each
 * mote has its own clock, so they never flash together. The halo grows from
 * 7 to 14 mote radii over a flash (4.5 to 8 on a phone, where the screen is
 * mostly text and the larger halo and its pad left no clear cloth to flash
 * on); a mote fades out of any line of text within a pad of its halo's peak
 * (just over half of it on a phone), measured line by line over the header,
 * main and footer. Colour and drift are unchanged from the first proof.
 *
 * Fireflies keep loop (Stage 6 CC1): like the seeds, the motes are kept where
 * they can be seen. Every 400 ms a mote under a sheet, within the pad of a
 * line or off the screen is re-seated on open cloth in view (away from the
 * others) and bursts within about two seconds. On a phone there are about 10
 * motes on 2.5 to 5 s rests, and the loop keeps a burst showing about every
 * 2 s: when no mote on clear cloth is bursting or about to, one is called
 * early. Nothing is seated before the fonts have settled.
 *
 * The tap (CC2, dark): a tap on clear cloth (no link, control, sheet or line
 * of text under it) calls the nearest mote within 160 px to drift there and
 * burst twice; with none that near, a new mote lights at the tap and joins
 * the swarm (at most six of these stay, the oldest goes first).
 *
 * Dandelions (light): pappus seeds, about 8 on desktop and 5 on a phone, each
 * on its own clock, riding a slow breeze up and across with a sway and a
 * turn, and now and then a gust. They fade off text like the fireflies. They
 * were timid, so they are drawn about 1.5 times larger and a little inkier,
 * and the loop keeps at least minShown of them on the cloth in view (it
 * re-seats a seed nobody can see into a clear spot), so a phone's first
 * screen has two or three where the page has room for them. A seed counts as
 * on show by its fan (crown and both tips), so one drifting out from behind a
 * sheet counts. It is kept off text by its drawn shape (a half disc for the
 * fan, a narrow strip for the stalk), not a box around both. A view too
 * cramped for a seed at its own size gets it at a smaller one, down to
 * sizeMin; on a phone only, a view with no seat even at sizeMin (About and
 * Contact, where the body is sheet edge to edge) may seat one or two smaller
 * seeds (phoneSizes, at most phoneTinyMax at once) in the header cloth beside
 * the wordmark and under the nav, under the paper like every seed. A view
 * with no seat at any of those sizes shows no seed. Every seed starts held
 * (not drawn, not moved) and is seated by
 * the keep loop on a strict seat, where it fades in, and none is seated or
 * shown until the fonts have settled and the text has been measured against
 * them, so the first frame never paints over a line that is about to reflow.
 *
 * Seats (Stage 6 CC3): the keep loop counts a seat only when the whole drawn
 * seed (fan and stalk) clears the viewport edges, every sheet and
 * every line of text with a margin and stays clear for a couple of seconds of
 * drift, prefers the upwind (left) gutter, spaces seats by counting a seed
 * seated in the last two seconds as there, and lets minShown fall to what
 * fits: a view with no such seat gets fewer seeds, never one wedged into the
 * strip under the header or onto the right edge. There is no looser tier
 * (the phone's smaller sizes change the seed, never the seat test), and no
 * seed is shown that has not been seated (a seed that drifts out of
 * view re-enters from an edge and may cross a sheet, as before).
 *
 * Pointer (S3, passive, one listener per event type, no layout reads): a seed
 * drifts away from a passing mouse cursor; a seed is kicked and a firefly
 * flashed by a tap. A mouse click is a tap on the press. A touch is a tap
 * only on its release, with no meaningful movement since the press and no
 * scroll (a touch that becomes a scroll never was one), so scrolling a phone
 * does not scatter the seeds or flash the fireflies under the finger.
 *
 * The clock (Stage 6 w3 task 23): the dandelion clock on the closer and the sent page (toys.ts) sends one
 * `cc:blow` window event when it is pressed. By day that releases the 6 to 10 seeds it lost into this canvas as
 * puffs: ordinary seeds that leave the head with a kick and then ride the breeze like the rest, off text by the
 * same fade. A puff is seated by the seat rules (the whole drawn seed clear of the viewport edges, every sheet and
 * every line of text, and clear for seatMinLife s of drift; a seed with no such seat is not released, and the
 * event's `report` callback is told which seeds were, so the clock lifts only those off its head), is kept
 * out of the keep loop (it is never re-seated), at most puffCap live at once (the oldest fade first), and goes
 * when it leaves the view or after puffLife. By lamplight the same event is a tap on clear cloth at the clock,
 * and the mote it calls (or lights) rises from there.
 *
 * Text (item 14): text is measured line by line, in document space, once on
 * mount (after the fonts) and again, debounced, when the body resizes, the
 * window's width changes or the fonts arrive. A resize that changes only the
 * height (a phone's toolbar sliding mid-scroll) does not move the text, so
 * its sweep waits until the page has been still. The draw subtracts scrollY.
 * There is no scroll listener and no layout read while scrolling.
 */
import { onMount } from '../../lib/lifecycle';

const SCHOOL = 'cottagecore';
const FRAME_MS = 1000 / 30;
/** A gap this long between two drawn frames of a branch is a real pause (a
    hidden tab, a long stay in the other scheme), not a main-thread stall. */
const PAUSE_MS = 1500;

/* ---------- numbers ---------- */
const FIREFLY = {
  /** Flashes per burst, inclusive. */
  flashesMin: 2,
  flashesMax: 4,
  /** Start to start of two flashes in a burst, with +/- jitter (ms). */
  gap: 500,
  gapJitter: 70,
  riseMin: 120,
  riseMax: 180,
  fall: 250,
  /** Fully dark between bursts (ms). */
  darkMin: 4000,
  darkMax: 8000,
  /** Peak alpha of the lit core: the old peak (0.35 + 0.6). The halo sprite's
      centre stop is lifted from 0.42 to 0.6. */
  coreAlpha: 0.95,
  /** Halo radius in mote radii: 7 when barely lit, growing by 7 more at the
      peak of a flash. Core radius: 0.7 growing by 0.8 at the peak. */
  haloMin: 7,
  haloGrow: 7,
  /** On a phone (narrower than SEED.phoneWidth) the halo is smaller, 4.5 growing
      by 3.5: a phone's first screens are mostly text, and the desktop halo plus
      its pad left almost no cloth for a mote to flash on (founder call 13,
      11-17-26: 0.13 lit on average at 390, the proof's was 0.3). The lifecycle,
      the rests, the colour and the count are the same. */
  phoneHaloMin: 4.5,
  phoneHaloGrow: 3.5,
  /** The share of the halo's peak radius kept clear of text. The halo's outer
      quarter is nearly transparent, so a phone keeps just over half. */
  padShare: 1,
  phonePadShare: 0.55,
  coreMin: 0.7,
  coreGrow: 0.8,
  /** On a phone the swarm is bigger (about 10) and the rests shorter (2.5 to
      5 s): below the first screen, with most of the cloth under sheets and
      text, 7 motes on 4 to 8 s rests put a burst on clear cloth one second
      in four (CC1, Stage 6 critic: 0.16 of frames lit on average at 390). */
  phoneCount: 10,
  phoneDarkMin: 2500,
  phoneDarkMax: 5000,
  /** A cursor this close (px) flashes a mote; a finger gets more room. */
  hoverRadius: 26,
  tapRadius: 44,
  /** The tap (CC2): a tap on clear cloth calls the nearest mote within
      callRadius (px) to drift to it and burst twice; with none that close a
      new mote lights there and joins the swarm. A called mote takes callMs to
      arrive, and its first flash comes callLead ms after the tap, so the
      answer shows at once. At most extraMax lit-by-tap motes stay (the
      oldest goes first). */
  callRadius: 160,
  callMs: 900,
  callLead: 220,
  extraMax: 6,
  /** The keep loop (CC1): how often (ms) the motes are checked for any
      resting where nobody can see them, how far apart (px) two seats must be
      (relaxed in the second half of the tries), and how long (ms) a seated
      mote may wait for its first burst. On a phone the loop also keeps a
      burst showing: if no mote on clear cloth is bursting or about to, one is
      called early, so the gap between two visible bursts stays near 2 s. */
  keepEvery: 400,
  seatTries: 60,
  seatApart: 56,
  seatApartTight: 30,
  seatWait: [250, 2000] as const,
  paceAhead: 1200,
  paceWait: [150, 800] as const,
  /** A touched mote will not be touched again for this long (ms). */
  touchCooldown: 1400,
  /** Per 30 fps frame: how fast a mote fades off text and back on. */
  fadeIn: 0.08,
  fadeOut: 0.25,
};
/** Clear air (px) kept between a mote's centre and any text: the halo's PEAK
    radius (a share of it on a phone), so a flashing mote never paints a
    visible halo over a line. */
const fireflyPad = (r: number, phone: boolean) =>
  phone
    ? r * (FIREFLY.phoneHaloMin + FIREFLY.phoneHaloGrow) * FIREFLY.phonePadShare
    : r * (FIREFLY.haloMin + FIREFLY.haloGrow) * FIREFLY.padShare;

const SEED = {
  desktop: 8,
  phone: 5,
  phoneWidth: 700,
  /** The loop keeps at least this many seeds on the cloth in view. */
  minShown: 3,
  /** Breeze in px/s: across (+x) and up (-y). */
  windX: 21,
  windY: -11,
  /** Seconds a seed takes to settle back onto the breeze after a push. */
  settle: 1.1,
  /** Gust: every gustEvery s (range), lasting gustLen s, at up to gustAmp x. */
  gustEveryMin: 14,
  gustEveryMax: 30,
  gustLen: 2.8,
  gustAmp: 3.2,
  /** Alpha of a whole seed before cover and edge fade (a little inkier than
      the first proof's 0.55 to 0.82). */
  alphaMin: 0.7,
  alphaMax: 0.95,
  /** Pointer: a passing cursor pushes inside pushRadius (px/s^2 at the
      cursor), a tap kicks inside tapRadius (px/s at the tap). */
  pushRadius: 120,
  pushAccel: 600,
  tapRadius: 170,
  tapKick: 230,
  /** A parked cursor stops pushing after this long (ms). */
  pointerIdle: 1500,
  /** Per 30 fps frame, as for the fireflies. */
  fadeIn: 0.15,
  fadeOut: 0.4,
  /** The fade, per frame, of a seed whose drawn shape is ON a line of text right
      now (not one the lookahead sees coming): text can arrive under a seed
      between two frames (a wheel step), and a faded-but-lit seed on a line is
      still seed ink on text, so it is gone on the first frame that sees it. */
  fadeOutNow: 1,
  /** Sprite units to CSS px at size 1: 1.5 times the first proof's 0.62. */
  spriteScale: 0.93,
  /** Clear air (px) kept between a seed's drawn shape and any text. */
  textPad: 8,
  /** Seconds of travel looked ahead when testing for text. */
  lookAhead: 0.7,
  /** Size range (times spriteScale). A seed that cannot find room at its own
      size is seated smaller, never below sizeMin. */
  sizeMin: 0.8,
  sizeMax: 1.25,
  /** Phones only (Stage 6 w3 task 19, stop 3 answer 2): the cloth of a phone's header is the one
      patch left beside the wordmark and under the nav on a view whose body is all sheet (About,
      Contact's first screens), and none fits a seed of sizeMin. Past sizeMin, a seed may take one of
      these smaller sizes, tried last and in this order, and no more than phoneTinyMax of them show
      at once (1 or 2 seeds is the aim, not a swarm of specks). The seat rules do not change: the whole
      drawn seed clear of the viewport edges, every sheet and every line of text by the same margins,
      and clear for the same seatMinLife of drift, so a seed is never wedged in a sliver (CC3). */
  phoneSizes: [0.58, 0.42] as const,
  phoneTinyMax: 2,
  /** Seating: candidates tried per size, and how far along its drift (s, in
      steps of seatStep) a seat must stay clear to be preferred. */
  seatTries: 160,
  seatPool: 10,
  seatStep: 0.5,
  seatHorizon: 5,
  /** Least spacing (px) between two seats, relaxed for the second half of the tries. */
  seatApart: 90,
  seatApartTight: 70,
  /** How often (ms) the loop checks that enough seeds are showing. */
  keepEvery: 400,
  /** CC3: a seat counts only with the whole drawn seed (fan and stalk) this far
      (px) inside the viewport and clear of every sheet and line of text, so
      none is wedged into the strip under the header or onto the right edge.
      Seats near the side gutters (within gutterShare of the width) are
      preferred by gutterBonus seconds of life (the upwind one only). A seed seated in the last
      seatSettleMs still counts as there for the spacing test. */
  seatMargin: 8,
  gutterShare: 0.22,
  /** A seat must stay clear this long (s) riding its drift. */
  seatMinLife: 2,
  gutterBonus: 1.5,
  seatSettleMs: 2000,
};
/** The clock's release (Stage 6 w3 task 23): at most puffCap released seeds live at once, each for puffLife ms
    (the last puffFade ms of it a fade), leaving the head with a kick (px/s) that the breeze takes back over. */
const PUFF = { cap: 30, life: 42000, fade: 2500, kickX: [20, 85], kickY: [15, 60], tries: 14, window: 1200 } as const;
/** Ink-brown, the school's --cc-ink. The seeds are drawn in it. */
const SEED_INK = '58, 42, 31';

/** A tap, on a touch or a pen: a release within this many px of the press and
    this long after it, with the page scrolled no more than maxScroll px. */
const TAP = { slop: 10, maxMs: 600, maxScroll: 3 };
/** A resize that changes only the viewport's height (a phone toolbar) re-measures
    the text only after the page has been still this long (ms). */
const SETTLE_MS = 700;

/* ---------- types ---------- */
interface Flash {
  start: number;
  rise: number;
}
interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  wander: number;
  /** Eased 0-1: visible where it sits, faded toward 0 over text. */
  cover: number;
  flashes: Flash[];
  /** When the next burst starts; -1 until the first frame sets it. */
  rest: number;
  touched: number;
  /** A mote called by a tap: where it is drifting to, and until when (ms). */
  call: { x: number; y: number; until: number; rise: boolean } | null;
  /** Lit by a tap with no mote near; the oldest of these goes past extraMax. */
  extra: number;
}
interface Seed {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  sprite: number;
  drift: number;
  swayPhase: number;
  swayRate: number;
  swayAmp: number;
  turnPhase: number;
  turnRate: number;
  alpha: number;
  cover: number;
  /** The size it was born with; a cramped seat may use a smaller one. */
  base: number;
  /** When the keep loop last seated it (ms). */
  seatedAt: number;
  /** True from mount until the keep loop has found it a strict seat: a held
      seed is not moved or drawn, so none fades in anywhere it was thrown. */
  held: boolean;
  /** A seed released by the clock: outside the keep loop, gone at dieAt (ms). */
  puff?: boolean;
  dieAt?: number;
}
type Pt = [number, number];
interface Box {
  l: number;
  t: number;
  r: number;
  b: number;
}

/* ---------- sprites, painted once ---------- */

/** A halo's radial gradient painted once to an offscreen sprite; motes then
    drawImage it scaled and alpha-blended, instead of building a fresh
    gradient every mote, every frame. */
const HALO_SPRITE_SIZE = 128;
function buildHaloSprite(): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = HALO_SPRITE_SIZE;
  const sctx = sprite.getContext('2d')!;
  const r = HALO_SPRITE_SIZE / 2;
  const g = sctx.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, 'rgba(255, 214, 130, 0.6)');
  g.addColorStop(0.25, 'rgba(240, 170, 80, 0.16)');
  g.addColorStop(1, 'rgba(240, 165, 80, 0)');
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, HALO_SPRITE_SIZE, HALO_SPRITE_SIZE);
  return sprite;
}

/** A small deterministic generator so the two seed sprites are the same
    drawing on every load. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** One dandelion seed, upright, on a 128 x 128 unit sprite (painted at twice
    that, so the larger seeds stay crisp). The pappus is a fan of hairline
    filaments from the top of a hairline stalk (the beak), each bowed a little
    and ending in a pin-head; a small tapered seed body hangs below. Drawn in
    full ink; the caller sets the alpha. The anchor (where the stalk meets the
    filaments) is at sprite unit (64, 48). */
const SEED_SPRITE_SIZE = 128;
const SEED_SPRITE_PX = 256;
const SEED_ANCHOR = { x: 64, y: 48 };
function buildSeedSprite(filaments: number, rnd: () => number): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = SEED_SPRITE_PX;
  const c = sprite.getContext('2d')!;
  c.scale(SEED_SPRITE_PX / SEED_SPRITE_SIZE, SEED_SPRITE_PX / SEED_SPRITE_SIZE);
  const { x: ax, y: ay } = SEED_ANCHOR;
  c.lineCap = 'round';
  // Stalk (beak) and the seed body.
  c.strokeStyle = `rgba(${SEED_INK}, 0.95)`;
  c.lineWidth = 1.25;
  c.beginPath();
  c.moveTo(ax, ay);
  c.lineTo(ax, ay + 44);
  c.stroke();
  c.fillStyle = `rgba(${SEED_INK}, 1)`;
  c.beginPath();
  c.moveTo(ax, ay + 40);
  c.bezierCurveTo(ax + 4.2, ay + 46, ax + 3.2, ay + 58, ax, ay + 70);
  c.bezierCurveTo(ax - 3.2, ay + 58, ax - 4.2, ay + 46, ax, ay + 40);
  c.fill();
  // Pappus: filaments fanned over the upper hemisphere, a touch longer at the
  // sides than at the crown, as a parachute reads.
  c.lineWidth = 1;
  const spread = 1.2; // radians either side of straight up
  for (let i = 0; i < filaments; i++) {
    const u = filaments === 1 ? 0.5 : i / (filaments - 1);
    const a = -Math.PI / 2 + (u - 0.5) * 2 * spread + (rnd() - 0.5) * 0.07;
    const len = 41 + Math.cos((u - 0.5) * Math.PI) * -6 + (rnd() - 0.5) * 4;
    const ex = ax + Math.cos(a) * len;
    const ey = ay + Math.sin(a) * len;
    // Bow outward from the stalk so the fan has body.
    const mx = ax + Math.cos(a) * len * 0.55 + Math.cos(a + Math.PI / 2) * (u - 0.5) * -5;
    const my = ay + Math.sin(a) * len * 0.55 + 2.5;
    c.strokeStyle = `rgba(${SEED_INK}, ${0.62 + rnd() * 0.2})`;
    c.beginPath();
    c.moveTo(ax, ay);
    c.quadraticCurveTo(mx, my, ex, ey);
    c.stroke();
    c.fillStyle = `rgba(${SEED_INK}, 0.85)`;
    c.beginPath();
    c.arc(ex, ey, 1.45, 0, Math.PI * 2);
    c.fill();
  }
  // The little knot where the filaments meet.
  c.fillStyle = `rgba(${SEED_INK}, 1)`;
  c.beginPath();
  c.arc(ax, ay, 2, 0, Math.PI * 2);
  c.fill();
  return sprite;
}

/* ---------- small helpers ---------- */
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function inAnyBox(x: number, y: number, boxes: Box[], pad: number): boolean {
  for (const r of boxes) {
    if (x >= r.l - pad && x <= r.r + pad && y >= r.t - pad && y <= r.b + pad) return true;
  }
  return false;
}

/** Whether a seed drawn with its anchor at (x, y) at scale k, tilted by
    `angle` (radians, as the draw rotates it about the anchor), would come
    within SEED.textPad of a text box. The drawing is a fan of filaments
    reaching 45 sprite units (pin-heads included) over the anchor, a hair
    below it at most, and a thin stalk and body hanging 70 units under it. The
    tilt swings the stalk sideways (up to ~40 units at the foot of a 0.57 rad
    tilt) and drops the fan's low tip below the anchor (its tips sit 38 units
    out), so the test is the fan's half disc, lowered by the tilt, plus the
    stalk as the tilted segment it is, not an upright strip: a seed whose
    body hangs onto a line beside it is on that line. A bounding box would
    keep a seed a whole fan's width from a line it only passes beside. */
function seedHitsText(x: number, y: number, k: number, boxes: Box[], angle = 0, margin = 0): boolean {
  const pad = SEED.textPad + margin;
  const sin = Math.sin(angle);
  const cos = Math.cos(angle);
  const reach = 45 * k + pad;
  const low = y + (3 + 38 * Math.abs(sin)) * k + pad;
  const half = 4 * k + pad;
  const footX = x - 70 * k * sin;
  const footY = y + 70 * k * cos;
  for (const q of boxes) {
    if (q.t < low) {
      const cx = Math.min(Math.max(x, q.l), q.r);
      const cy = Math.min(Math.max(y, q.t), Math.min(q.b, low));
      if (Math.hypot(cx - x, cy - y) < reach) return true;
    }
    if (segmentHitsBox(x, y, footX, footY, q.l - half, q.t - pad, q.r + half, q.b)) return true;
  }
  return false;
}

/** Whether the segment (x0, y0) to (x1, y1) crosses the box (Liang-Barsky). */
function segmentHitsBox(x0: number, y0: number, x1: number, y1: number, l: number, t: number, r: number, b: number): boolean {
  let u0 = 0;
  let u1 = 1;
  const dx = x1 - x0;
  const dy = y1 - y0;
  for (const [p, q] of [[-dx, x0 - l], [dx, r - x0], [-dy, y0 - t], [dy, b - y0]] as const) {
    if (p === 0) {
      if (q < 0) return false;
    } else {
      const u = q / p;
      if (p < 0) { if (u > u1) return false; if (u > u0) u0 = u; } else { if (u < u0) return false; if (u < u1) u1 = u; }
    }
  }
  return true;
}

/** Where a firefly's flash is, 0-1, at time t. */
function flashEnvelope(f: Flash, t: number): number {
  const u = t - f.start;
  if (u <= 0) return 0;
  if (u < f.rise) {
    const k = u / f.rise;
    return k * k * (3 - 2 * k);
  }
  const d = (u - f.rise) / FIREFLY.fall;
  if (d >= 1) return 0;
  return (1 - d) * (1 - d);
}
const flashEnd = (f: Flash) => f.start + f.rise + FIREFLY.fall;

/** A burst of 2 to 4 flashes starting at t0, about 500 ms apart. */
function makeBurst(t0: number, flashes?: number): Flash[] {
  const n = flashes ?? FIREFLY.flashesMin + Math.floor(Math.random() * (FIREFLY.flashesMax - FIREFLY.flashesMin + 1));
  const out: Flash[] = [];
  let start = t0;
  for (let i = 0; i < n; i++) {
    out.push({ start, rise: rand(FIREFLY.riseMin, FIREFLY.riseMax) });
    start += FIREFLY.gap + rand(-FIREFLY.gapJitter, FIREFLY.gapJitter);
  }
  return out;
}

/** Touch: a tap on a washi tape lifts its free corner and lays it back down
    (fine pointers do the same on hover, in CSS). The tapes are inert and
    aria-hidden; this only sets and clears a data flag. */
export function mountTapes(): void {
  onMount(() => {
    if (document.documentElement.dataset.theme !== SCHOOL) return;
    const timers = new Map<Element, number>();
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const tape = (e.target as Element | null)?.closest?.('.cc-tape');
      if (!tape) return;
      tape.setAttribute('data-lift', '');
      clearTimeout(timers.get(tape));
      timers.set(tape, window.setTimeout(() => {
        tape.removeAttribute('data-lift');
        timers.delete(tape);
      }, 1100));
    };
    document.addEventListener('pointerdown', onDown, { passive: true });
    return () => {
      document.removeEventListener('pointerdown', onDown);
      timers.forEach((id, tape) => { clearTimeout(id); tape.removeAttribute('data-lift'); });
      timers.clear();
    };
  });
}

export function mountFireflies(): void {
  onMount(() => {
    const root = document.documentElement;
    if (root.dataset.theme !== SCHOOL) return;
    const canvas = document.querySelector<HTMLCanvasElement>('[data-cc-motes]');
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const halo = buildHaloSprite();
    const seedSprites = [buildSeedSprite(17, lcg(7)), buildSeedSprite(22, lcg(41))];
    let fireflies: Firefly[] = [];
    let seeds: Seed[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let last = 0;
    let prev = 0;
    let lastSy = window.scrollY;
    /** Lines of text, and the sheets that sit over the cloth, in document space. */
    let textBoxes: Box[] = [];
    let coverBoxes: Box[] = [];
    let nextGust = 0;
    let lastFireflyT = -1e9;
    let lastSeedT = -1e9;
    let lastKeepT = -1e9;
    let lastFireflyKeepT = -1e9;
    let gustStart = -1e9;
    /** Which branch drew last frame, so a flip re-staggers the clocks. */
    let branch = '';
    /** False until the fonts have settled and the text has been measured
        against them; nothing is shown or seated before that. */
    let fontsSettled = false;
    /** False once torn down, so a late promise does nothing. */
    let alive = true;

    /* Pointer: written by the listeners, read by the tick. */
    const pointer = { x: -1e4, y: -1e4, at: -1e9, fine: false };
    /** `clear` is whether the tap landed on clear cloth (no link, control, text
        line or sheet under it, measured when it happened). */
    const tap = { x: 0, y: 0, pending: false, clear: false, rise: false };
    /** The clock's release waiting for the next frame (see the header). */
    let blow: { at: number; x: number; y: number; r: number; n: number; points: Array<{ x: number; y: number }>; report?: (placed: number[]) => void } | null = null;
    let extras = 0;

    const newFirefly = (x: number, y: number, r = 1.3 + Math.random() * 1.1): Firefly => ({
      x,
      y,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.14,
      r,
      wander: Math.random() * Math.PI * 2,
      cover: 1,
      flashes: [],
      rest: -1,
      touched: -1e9,
      call: null,
      extra: 0,
    });
    const seedFireflies = () => {
      // A scatter, not a swarm; about 10 on a phone (CC1).
      const count = width < SEED.phoneWidth ? FIREFLY.phoneCount : Math.round(Math.min(18, Math.max(7, (width * height) / 70000)));
      fireflies = Array.from({ length: count }, () => newFirefly(Math.random() * width, Math.random() * height));
    };

    const spawnSeed = (s: Seed, anywhere: boolean) => {
      if (anywhere) {
        s.x = Math.random() * width;
        s.y = Math.random() * height;
      } else if (Math.random() < 0.5) {
        s.x = -40;
        s.y = rand(height * 0.15, height);
      } else {
        s.x = rand(0, width * 0.85);
        s.y = height + 40;
      }
      s.cover = 0;
    };

    /** How the draw turns and tilts a seed (the same two numbers the draw uses). */
    const turnOf = (s: Seed) => 0.42 + 0.58 * Math.abs(Math.cos(s.turnPhase));
    const angleOf = (s: Seed) => Math.sin(s.swayPhase) * 0.22 + Math.max(-0.35, Math.min(0.35, s.vx * 0.006));
    /** The fan's crown and both tips and the body's middle as DRAWN (squeezed
        by turn across the seed's width, then tilted by angle about the anchor),
        not as an upright, full-width fan. */
    const drawnPoints = (x: number, y: number, k: number, turn: number, angle: number): Pt[] => {
      const c = Math.cos(angle);
      const n = Math.sin(angle);
      const at = (px: number, py: number): Pt => [x + px * c - py * n, y + px * n + py * c];
      return [at(0, -42 * k), at(-40 * k * turn, -10 * k), at(40 * k * turn, -10 * k), at(0, 35 * k)];
    };
    const edgeFade = (s: Seed) => Math.min(1, Math.max(0, Math.min(s.x + 30, width + 30 - s.x, s.y + 30, height + 30 - s.y) / 70));
    const onSheet = (x: number, y: number) => inAnyBox(x, y, coverBoxes, 0);
    const pointOnShow = (px: number, py: number, sy: number) => px >= 0 && px <= width && py >= 0 && py <= height && !onSheet(px, py + sy);
    /** A seed is on show when its fan is: the crown and both tips, as the
        seed is drawn now (turned and tilted), inside the viewport and off every
        sheet and band. The anchor and the body may be tucked under a sheet;
        that is a seed drifting out from behind the paper, and it is what a
        phone's mostly-sheet first screen has room for. */
    const seedOnShow = (x: number, y: number, k: number, sy: number, turn: number, angle: number) => {
      const [crown, left, right] = drawnPoints(x, y, k, turn, angle);
      return pointOnShow(crown[0], crown[1], sy) && pointOnShow(left[0], left[1], sy) && pointOnShow(right[0], right[1], sy);
    };
    /** Whether any of a seed's drawn points (anchor, crown, both tips, body
        middle) is on show. False means the seed is wholly under a sheet or off
        the screen, so moving it loses nothing anyone can see. */
    const seedVisible = (x: number, y: number, k: number, sy: number, turn: number, angle: number) =>
      pointOnShow(x, y, sy) || drawnPoints(x, y, k, turn, angle).some(([px, py]) => pointOnShow(px, py, sy));
    /** The drawn seed, fan and stalk (CC3). Every drawn point (the crown, both
        tips, two points along each arc, the anchor and two along the stalk)
        must be inside the viewport by SEED.seatMargin and off every sheet by
        half of it: a fan half under a sheet, a stalk running behind one, a
        seed in the strip under the header or over the right edge is a sliver,
        not a seat. There is no looser tier: a view with no such seat gets
        fewer seeds (minShown falls to what fits), never a wedged one. */
    const seedFits = (x: number, y: number, k: number, sy: number, turn: number, angle: number) => {
      const m = SEED.seatMargin;
      const c = Math.cos(angle);
      const n = Math.sin(angle);
      const at = (px: number, py: number): Pt => [x + px * c - py * n, y + px * n + py * c];
      const pts: Pt[] = [...drawnPoints(x, y, k, turn, angle).slice(0, 3), at(-30 * k * turn, -30 * k), at(30 * k * turn, -30 * k), [x, y], at(0, 35 * k), at(0, 70 * k)];
      for (const [px, py] of pts) {
        if (px < m || px > width - m || py < m || py > height - m) return false;
        if (inAnyBox(px, py + sy, coverBoxes, m / 2)) return false;
      }
      return true;
    };
    /** A seat: the whole drawn seed clear with a margin, and a margin of air
        from text. */
    const seatClear = (x: number, y: number, k: number, sy: number, turn: number, angle: number) =>
      seedFits(x, y, k, sy, turn, angle) && !seedHitsText(x, y + sy, k, textBoxes, angle, SEED.seatMargin);
    /** Seconds a seat stays clear (whole seed on show, off text) riding its drift. */
    const seatLife = (x: number, y: number, k: number, vx: number, vy: number, sy: number, turn: number, angle: number) => {
      let t = SEED.seatStep;
      for (; t < SEED.seatHorizon; t += SEED.seatStep) {
        if (!seatClear(x + vx * t, y + vy * t, k, sy, turn, angle)) break;
      }
      return t;
    };

    /** Seat a seed on a clear patch of the cloth in view: fan on show, off
        every line of text now and where the breeze will have taken it, and
        not on top of another shown seed. Of the clear patches found it takes
        the one it can stay on longest, so a cramped header does not have
        seeds popping in and out every second. A view with no room at the
        seed's own size gets it at a smaller one (never under sizeMin). False
        if the view has none at all. */
    const seatSeed = (s: Seed, sy: number, t: number): boolean => {
      const vx = SEED.windX * s.drift;
      const vy = SEED.windY * s.drift;
      const sizes: number[] = [s.base, SEED.sizeMin + (s.base - SEED.sizeMin) / 2, SEED.sizeMin];
      // Phones only, and last: a smaller seed than sizeMin when no seat fits the others, while fewer
      // than phoneTinyMax of them are showing (a seed seated in the last two seconds counts).
      if (width < SEED.phoneWidth) {
        let tiny = 0;
        for (const o of seeds) {
          if (o !== s && !o.held && o.size < SEED.sizeMin && (o.cover > 0.3 || t - o.seatedAt < SEED.seatSettleMs)) tiny++;
        }
        if (tiny < SEED.phoneTinyMax) sizes.push(...SEED.phoneSizes);
      }
      const turn = turnOf(s);
      const angle = angleOf(s);
      for (const size of sizes) {
        const k = size * SEED.spriteScale;
        let bx = 0;
        let by = 0;
        let best = -1;
        let pool = 0;
        for (let i = 0; i < SEED.seatTries && pool < SEED.seatPool; i++) {
          const x = rand(24, width - 24);
          const y = rand(24, height - 24);
          if (!seatClear(x, y, k, sy, turn, angle) || !seatClear(x + vx * SEED.lookAhead, y + vy * SEED.lookAhead, k, sy, turn, angle)) continue;
          const apart = i < SEED.seatTries / 2 ? SEED.seatApart : SEED.seatApartTight;
          // A seed seated in the last two seconds still has cover 0 (it fades
          // in), so it counts as there: three seats made in one pass must not
          // pile onto one patch.
          let crowded = false;
          for (const o of seeds) {
            if (o !== s && (o.cover > 0.3 || t - o.seatedAt < SEED.seatSettleMs) && Math.hypot(o.x - x, o.y - y) < apart) { crowded = true; break; }
          }
          if (crowded) continue;
          // A seat that is gone in a second or two is not a seat: the seed
          // would be wedged where it is seated and then slide out of the
          // clear patch across a sheet or off the edge.
          const clear = seatLife(x, y, k, vx, vy, sy, turn, angle);
          if (clear < SEED.seatMinLife) continue;
          pool++;
          // The side gutters are where a seat lasts and nothing is crossed.
          // The breeze runs right, so only the upwind (left) gutter earns the
          // bonus: a seat in the right one is out of the edge within seconds,
          // which is how seeds got stacked down the right edge.
          const gutter = x < width * SEED.gutterShare ? SEED.gutterBonus : 0;
          const life = clear + Math.random() * 0.4 + gutter;
          if (life > best) { best = life; bx = x; by = y; }
        }
        if (pool) {
          s.size = size;
          s.x = bx;
          s.y = by;
          s.vx = vx;
          s.vy = vy;
          s.cover = 0;
          s.seatedAt = t;
          s.held = false;
          return true;
        }
      }
      return false;
    };

    /** Seat the seeds still held (those thrown nowhere at mount) on strict
        seats: up to minShown at once and one more a tick, or all of them when
        `all` (the still frame). `shown` is how many are on show now. Returns
        how many it seated and whether the view had no seat for the next. */
    const seatHeld = (sy: number, t: number, shown: number, all: boolean) => {
      let placed = 0;
      for (const s of seeds) {
        if (!s.held) continue;
        if (!all && shown + placed >= SEED.minShown && placed >= 1) break;
        if (!seatSeed(s, sy, t)) return { placed, noRoom: true };
        placed++;
      }
      return { placed, noRoom: false };
    };

    const seedDandelions = () => {
      const count = width < SEED.phoneWidth ? SEED.phone : SEED.desktop;
      seeds = Array.from({ length: count }, (_, i) => {
        const size = rand(SEED.sizeMin, SEED.sizeMax);
        const s: Seed = {
          x: 0,
          y: 0,
          vx: SEED.windX,
          vy: SEED.windY,
          size,
          base: size,
          sprite: i % 2,
          drift: rand(0.7, 1.35),
          swayPhase: Math.random() * Math.PI * 2,
          swayRate: (Math.PI * 2) / rand(3.6, 6.4),
          swayAmp: rand(5, 11),
          turnPhase: Math.random() * Math.PI * 2,
          turnRate: (Math.PI * 2) / rand(7, 13),
          alpha: rand(SEED.alphaMin, SEED.alphaMax),
          cover: 0,
          seatedAt: -1e9,
          held: false,
        };
        // Every seed starts unseen (cover 0) and fades in where it is clear,
        // and nothing is seated or shown until the fonts have settled and the
        // text has been measured against them (fontsSettled), so none is ever
        // drawn over a line that is about to reflow. The opening view's
        // first seeds are seated by the keep loop on its first tick after.
        spawnSeed(s, true);
        s.held = true;
        return s;
      });
    };

    /* Text, measured line by line in document space (item 14): once on mount,
       then debounced when the body or window resizes or the fonts arrive.
       Never per scroll. Line boxes, not element boxes, so the clear cloth
       beside a short line is clear. */
    const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'CANVAS']);
    const collectTextRects = () => {
      const sx = window.scrollX;
      const sy = window.scrollY;
      const text: Box[] = [];
      const cover: Box[] = [];
      const range = document.createRange();
      const push = (out: Box[], r: { left: number; top: number; right: number; bottom: number; width: number; height: number }) => {
        if (r.width < 1 || r.height < 1) return;
        out.push({ l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy });
      };
      document.querySelectorAll('header, main, footer').forEach((region) => {
        const walker = document.createTreeWalker(region, NodeFilter.SHOW_TEXT, {
          // The date stamp's cancel marks (task 23) are laid and faded by a press, so they are not lines of text
          // to keep seeds off (they sit over a postage stamp or a postcard that already is one).
          acceptNode: (n) => (n.nodeValue && n.nodeValue.trim() && !SKIP_TAGS.has(n.parentElement?.tagName ?? '') && !n.parentElement?.closest('.cancel-pad') ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
        });
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          range.selectNodeContents(n);
          for (const r of range.getClientRects()) push(text, r);
        }
        region.querySelectorAll('input, textarea, select, button').forEach((el) => push(text, el.getBoundingClientRect()));
      });
      document.querySelectorAll('.cc-paper, .cc-torn, .cc-gingham, .hoop').forEach((el) => push(cover, el.getBoundingClientRect()));
      textBoxes = text;
      coverBoxes = cover;
    };
    let rectTimer = 0;
    /** One full text sweep after `delay` ms, and never in the middle of a
        scroll: if the page has moved since the sweep's own last look it asks
        again in 200 ms, so a sweep lands on a page that is still. It keeps
        its own scroll reading (not the draw loop's lastSy), so it settles
        even when no frame is running (a hidden tab, or the loop at rest). */
    let sweepSy = NaN;
    const sweep = () => {
      if (!alive) return;
      const sy = window.scrollY;
      if (Math.abs(sy - sweepSy) > 0.5) {
        sweepSy = sy;
        rectTimer = window.setTimeout(sweep, 200);
        return;
      }
      sweepSy = NaN;
      collectTextRects();
    };
    const scheduleRects = (delay = 150) => {
      clearTimeout(rectTimer);
      // Seed the reading with where the page is now, so a page already at
      // rest sweeps on the first try after `delay`.
      sweepSy = window.scrollY;
      rectTimer = window.setTimeout(sweep, delay);
    };

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // A phone's toolbar resizes the viewport on scroll; keep the floaters
      // where they are rather than scattering them again. The text is
      // measured once here, for the first layout (and again once the fonts
      // settle, onFonts); every later resize only schedules a sweep (onResize).
      if (!fireflies.length || !seeds.length) {
        collectTextRects();
        if (!fireflies.length) seedFireflies();
        if (!seeds.length) seedDandelions();
      }
    };

    /* ----- fireflies ----- */
    /** How long a mote rests in the dark between bursts (ms): 4 to 8 s, and 2.5
        to 5 s on a phone. */
    const restFor = (phone: boolean) => (phone ? rand(FIREFLY.phoneDarkMin, FIREFLY.phoneDarkMax) : rand(FIREFLY.darkMin, FIREFLY.darkMax));

    /** Whether a mote's place is one anybody can see it from: on the screen,
        clear of every line of text by its halo's pad, and not under a sheet. */
    const fireflyPlaceOk = (m: Firefly, sy: number, phone: boolean) =>
      m.x >= 0 && m.x <= width && m.y >= 0 && m.y <= height &&
      !inAnyBox(m.x, m.y + sy, textBoxes, fireflyPad(m.r, phone)) &&
      !inAnyBox(m.x, m.y + sy, coverBoxes, m.r * 2);

    /** The seeds' keep loop, for the fireflies (CC1): put a mote that nobody
        can see (under a sheet, within the pad of a line, off the screen) on a
        patch of open cloth in view, away from the other motes, and let it
        burst within about two seconds. False if the view has no such patch. */
    const seatFirefly = (m: Firefly, t: number, sy: number, phone: boolean): boolean => {
      const pad = fireflyPad(m.r, phone);
      for (let i = 0; i < FIREFLY.seatTries; i++) {
        const x = rand(14, width - 14);
        const y = rand(14, height - 14);
        if (inAnyBox(x, y + sy, textBoxes, pad) || inAnyBox(x, y + sy, coverBoxes, m.r * 2)) continue;
        const apart = i < FIREFLY.seatTries / 2 ? FIREFLY.seatApart : FIREFLY.seatApartTight;
        let crowded = false;
        for (const o of fireflies) {
          if (o !== m && Math.hypot(o.x - x, o.y - y) < apart && fireflyPlaceOk(o, sy, phone)) { crowded = true; break; }
        }
        if (crowded) continue;
        const wait = t + rand(FIREFLY.seatWait[0], FIREFLY.seatWait[1]);
        m.x = x;
        m.y = y;
        m.cover = 0;
        m.flashes = [];
        m.rest = m.rest < 0 ? wait : Math.min(m.rest, wait);
        return true;
      }
      return false;
    };

    const keepFireflies = (t: number, sy: number, phone: boolean) => {
      // Phones only (Stage 6 w3 task 19, w2 task 16 C2). A re-seat pulls the mote's
      // rest in to 0.25 to 2 s, so on a desktop it made the approved Stage 5 scatter
      // (4 to 8 s rests, a mote under a sheet simply unseen) busier on text-dense
      // pages. The desktop keeps its motes where they drift, as it did before CC1.
      if (!phone) return;
      for (const m of fireflies) {
        // A mote a tap has just called is where the finger put it.
        if (m.call || t - m.touched < FIREFLY.callMs + 600) continue;
        if (!fireflyPlaceOk(m, sy, phone)) seatFirefly(m, t, sy, phone);
      }
      // A burst showing about every 2 s: when no mote on clear cloth is
      // bursting or about to, the soonest one is called early.
      let live = false;
      let soonest: Firefly | null = null;
      for (const m of fireflies) {
        if (!fireflyPlaceOk(m, sy, phone)) continue;
        if (m.flashes.length || (m.rest >= 0 && m.rest <= t + FIREFLY.paceAhead)) { live = true; break; }
        if (!soonest || m.rest < soonest.rest) soonest = m;
      }
      if (!live && soonest) soonest.rest = t + rand(FIREFLY.paceWait[0], FIREFLY.paceWait[1]);
    };

    /** The tap (CC2), on clear cloth in the dark: the nearest mote within
        callRadius drifts to the finger and bursts twice; with none that near, a
        new mote lights at the tap and joins the swarm. */
    const answerTap = (t: number, phone: boolean) => {
      let nearest: Firefly | null = null;
      let best = FIREFLY.callRadius;
      for (const m of fireflies) {
        const d = Math.hypot(m.x - tap.x, m.y - tap.y);
        if (d < best) { best = d; nearest = m; }
      }
      const m = nearest ?? newFirefly(tap.x, tap.y, 1.8);
      if (nearest) {
        m.call = { x: tap.x, y: tap.y, until: t + FIREFLY.callMs, rise: tap.rise };
      } else {
        // From the clock a new mote lifts off the head.
        if (tap.rise) { m.vy = -1.4; m.vx = (Math.random() - 0.5) * 0.2; }
        m.extra = ++extras;
        fireflies.push(m);
        const lit = fireflies.filter((o) => o.extra > 0);
        if (lit.length > FIREFLY.extraMax) {
          const oldest = lit.reduce((a, b) => (a.extra < b.extra ? a : b));
          fireflies.splice(fireflies.indexOf(oldest), 1);
        }
      }
      m.touched = t;
      // From the clock four flashes, so the mote is seen rising; a tap on the cloth keeps two.
      m.flashes = makeBurst(t + (nearest ? FIREFLY.callLead : 100), tap.rise ? 4 : 2);
      m.rest = flashEnd(m.flashes[m.flashes.length - 1]) + restFor(phone);
    };

    const drawFireflies = (t: number, still: boolean, sy: number, dsy: number, switched: boolean) => {
      const phone = width < SEED.phoneWidth;
      // The burst clock is absolute rAF time, so after a real pause (a flip
      // from the light scheme, a hidden tab) every rest has passed and the
      // whole swarm would flash on the same frame. Re-stagger each mote then.
      // A stall of a frame or two does not count: bursts in flight carry on.
      if (switched || t - lastFireflyT > PAUSE_MS) {
        for (const m of fireflies) {
          m.flashes = [];
          m.rest = t + rand(0, phone ? FIREFLY.phoneDarkMax : FIREFLY.darkMax);
        }
      }
      lastFireflyT = t;
      if (!still) {
        if (tap.pending && tap.clear) answerTap(t, phone);
        // Nothing is seated before the fonts have settled and the text has been
        // measured against them, as for the seeds.
        if (fontsSettled && (switched || t - lastFireflyKeepT > FIREFLY.keepEvery)) {
          lastFireflyKeepT = t;
          keepFireflies(t, sy, phone);
        }
      }
      for (const m of fireflies) {
        if (!still) {
          if (m.call) {
            // Drifting to the finger: an ease, not a jump.
            m.x += (m.call.x - m.x) * 0.14;
            m.y += (m.call.y - m.y) * 0.14;
            m.vx = m.vy = 0;
            if (t >= m.call.until) {
              // A mote called to the clock lifts off it.
              if (m.call.rise) m.vy = -1.4;
              m.call = null;
            }
          } else {
            m.wander += (Math.random() - 0.5) * 0.08;
            m.vx = m.vx * 0.985 + Math.cos(m.wander) * 0.006;
            m.vy = m.vy * 0.985 + Math.sin(m.wander) * 0.005 - 0.0015;
            m.x += m.vx * 2;
            m.y += m.vy * 2;
            if (m.x < -20) m.x = width + 20;
            if (m.x > width + 20) m.x = -20;
            if (m.y < -20) m.y = height + 20;
            if (m.y > height + 20) m.y = -20;
          }
        }
        // The burst clock: each mote rests 4 to 8 s (2.5 to 5 on a phone),
        // flashes 2 to 4 times, rests again. First rest is random so no two
        // ever line up.
        if (!still) {
          if (m.rest < 0) m.rest = t + rand(0, phone ? FIREFLY.phoneDarkMax : FIREFLY.darkMax);
          if (!m.flashes.length && t >= m.rest) {
            m.flashes = makeBurst(t);
            m.rest = flashEnd(m.flashes[m.flashes.length - 1]) + restFor(phone);
          }
          // A cursor on a mote, or a finger near one, sets it flashing.
          if (t - m.touched > FIREFLY.touchCooldown) {
            const near = pointer.fine && t - pointer.at < SEED.pointerIdle && Math.hypot(m.x - pointer.x, m.y - pointer.y) < FIREFLY.hoverRadius;
            const tapped = tap.pending && Math.hypot(m.x - tap.x, m.y - tap.y) < FIREFLY.tapRadius;
            if (near || tapped) {
              m.touched = t;
              m.flashes = makeBurst(t, 2);
              m.rest = flashEnd(m.flashes[m.flashes.length - 1]) + restFor(phone);
            }
          }
        }
        // Keep motes out of the reading column: fade toward invisible, on an
        // ease rather than a hard cut, while one sits within a halo's peak
        // radius of a line of text.
        const pad = fireflyPad(m.r, phone);
        const target = inAnyBox(m.x, m.y + sy, textBoxes, pad) || inAnyBox(m.x, m.y + sy + dsy, textBoxes, pad) ? 0 : 1;
        // A mote a tap has just called comes up quickly where the finger put it.
        const rise = m.call || t - m.touched < FIREFLY.callMs + 600 ? FIREFLY.fadeOut : FIREFLY.fadeIn;
        m.cover = still ? target : m.cover + (target - m.cover) * (target < m.cover ? FIREFLY.fadeOut : rise);
        let env = 0;
        if (still) env = 0.7;
        else {
          for (const f of m.flashes) env = Math.max(env, flashEnvelope(f, t));
          if (m.flashes.length && t > flashEnd(m.flashes[m.flashes.length - 1])) m.flashes = [];
        }
        const lit = env * m.cover;
        if (lit < 0.01) continue;
        const haloR = m.r * (phone ? FIREFLY.phoneHaloMin + FIREFLY.phoneHaloGrow * env : FIREFLY.haloMin + FIREFLY.haloGrow * env);
        ctx.globalAlpha = lit;
        ctx.drawImage(halo, m.x - haloR, m.y - haloR, haloR * 2, haloR * 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(255, 238, 190, ${Math.min(1, FIREFLY.coreAlpha * lit)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * (FIREFLY.coreMin + FIREFLY.coreGrow * env), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    /* ----- dandelions ----- */
    const drawDandelions = (t: number, dt: number, still: boolean, sy: number, dsy: number, switched: boolean) => {
      let gust = 0;
      if (switched || t - lastSeedT > PAUSE_MS) {
        nextGust = 0;
        gustStart = -1e9;
      }
      lastSeedT = t;
      if (!still) {
        if (!nextGust) nextGust = t + rand(SEED.gustEveryMin, SEED.gustEveryMax) * 1000 * 0.5;
        if (t >= nextGust) {
          gustStart = t;
          nextGust = t + rand(SEED.gustEveryMin, SEED.gustEveryMax) * 1000;
        }
        const u = (t - gustStart) / (SEED.gustLen * 1000);
        if (u >= 0 && u < 1) gust = SEED.gustAmp * Math.pow(Math.sin(Math.PI * u), 2);
        // Keep the cloth in view from going bare: when fewer than minShown
        // seeds are showing, a seed that has faded out (or is hidden under a
        // sheet) is seated on a clear patch and fades in there.
        if (fontsSettled && (switched || t - lastKeepT > SEED.keepEvery)) {
          lastKeepT = t;
          let shown = 0;
          for (const s of seeds) if (!s.held && !s.puff && s.cover > 0.5 && edgeFade(s) > 0.5 && seedOnShow(s.x, s.y, s.size * SEED.spriteScale, sy, turnOf(s), angleOf(s))) shown++;
          // The seeds held since mount are seated first: minShown at once, then
          // one more a tick, so the rest fade in a few at a time. None is shown
          // without a strict seat; when the view has none, the rest stay held.
          const held = seatHeld(sy, t, shown, false);
          shown += held.placed;
          if (held.noRoom) shown = SEED.minShown;
          for (const s of seeds) {
            if (shown >= SEED.minShown) break;
            if (s.held || s.puff) continue;
            // Only a seed nobody can see is moved: one that has faded out, or
            // is wholly under a sheet or off the screen. A seed part way out
            // from behind a sheet, or leaving at an edge, finishes its fade.
            const gone = s.alpha * s.cover * edgeFade(s) < 0.05 || !seedVisible(s.x, s.y, s.size * SEED.spriteScale, sy, turnOf(s), angleOf(s));
            if (!gone) continue;
            // minShown falls to what fits: when the view has no clear seat for a
            // seed, the next one will not find one either.
            if (!seatSeed(s, sy, t)) break;
            shown++;
          }
        }
      }
      else if (fontsSettled) seatHeld(sy, t, 0, true);
      const pointerLive = pointer.fine && t - pointer.at < SEED.pointerIdle;
      const relax = 1 - Math.exp(-dt / SEED.settle);
      let spent = false;
      for (const s of seeds) {
        if (s.held) continue;
        if (s.puff && t >= (s.dieAt ?? 0)) { spent = true; continue; }
        if (!still) {
          s.swayPhase += s.swayRate * dt;
          s.turnPhase += s.turnRate * dt;
          const wind = 1 + gust * s.drift;
          const tx = SEED.windX * s.drift * wind + Math.sin(s.swayPhase) * s.swayAmp;
          const ty = SEED.windY * s.drift * (1 + gust * 0.5) + Math.cos(s.swayPhase * 0.7) * s.swayAmp * 0.45;
          s.vx += (tx - s.vx) * relax;
          s.vy += (ty - s.vy) * relax;
          // Answer the pointer: a passing cursor pushes away, a tap kicks.
          if (pointerLive) {
            const dx = s.x - pointer.x;
            const dy = s.y - pointer.y;
            const d = Math.hypot(dx, dy);
            if (d < SEED.pushRadius && d > 0.01) {
              const k = (1 - d / SEED.pushRadius) * SEED.pushAccel * dt;
              s.vx += (dx / d) * k;
              s.vy += (dy / d) * k;
            }
          }
          if (tap.pending) {
            const dx = s.x - tap.x;
            const dy = s.y - tap.y;
            const d = Math.hypot(dx, dy);
            if (d < SEED.tapRadius) {
              const k = (1 - d / SEED.tapRadius) * SEED.tapKick;
              const nx = d > 0.01 ? dx / d : 1;
              const ny = d > 0.01 ? dy / d : -1;
              s.vx += nx * k;
              s.vy += ny * k - k * 0.15;
            }
          }
          s.x += s.vx * dt;
          s.y += s.vy * dt;
          if (s.x > width + 50 || s.y < -60 || s.x < -90 || s.y > height + 90) {
            // A released seed that leaves the view is gone; the others come back in from an edge.
            if (s.puff) { s.dieAt = t; continue; }
            spawnSeed(s, false);
          }
        }
        // Fade off text, looking ahead along the drift so a seed is gone
        // before it reaches a line, not after.
        const ax = s.x + s.vx * SEED.lookAhead;
        const ay = s.y + s.vy * SEED.lookAhead;
        const kk = s.size * SEED.spriteScale;
        // On a line right now (a wheel step can bring text under a seed between
        // two frames) fades fastest; a line the lookahead sees coming, a
        // little slower; nothing at all before the fonts have settled.
        const tilt = angleOf(s);
        const onNow = seedHitsText(s.x, s.y + sy, kk, textBoxes, tilt);
        const over = onNow || seedHitsText(ax, ay + sy, kk, textBoxes, tilt) || seedHitsText(s.x, s.y + sy + dsy, kk, textBoxes, tilt) || !fontsSettled;
        const target = over ? 0 : 1;
        s.cover = still ? target : s.cover + (target - s.cover) * (target < s.cover ? (onNow ? SEED.fadeOutNow : SEED.fadeOut) : SEED.fadeIn);
        // Fade in and out at the viewport's edges rather than popping.
        const a = s.alpha * s.cover * edgeFade(s) * (s.puff ? Math.min(1, Math.max(0, ((s.dieAt ?? 0) - t) / PUFF.fade)) : 1);
        if (a < 0.01) continue;
        const turn = turnOf(s);
        const angle = tilt;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(angle);
        ctx.scale(turn, 1);
        ctx.globalAlpha = a;
        ctx.drawImage(seedSprites[s.sprite], -SEED_ANCHOR.x * kk, -SEED_ANCHOR.y * kk, SEED_SPRITE_SIZE * kk, SEED_SPRITE_SIZE * kk);
        ctx.restore();
      }
      if (spent) seeds = seeds.filter((s) => !(s.puff && t >= (s.dieAt ?? 0)));
      ctx.globalAlpha = 1;
    };

    /** The clock's release by day: up to rel.n seeds leave the head, each only where it has a strict seat. */
    const releasePuff = (t: number, sy: number, rel: NonNullable<typeof blow>): number[] => {
      const placedAt: number[] = [];
      if (!fontsSettled || !rel.points.length) return placedAt;
      // Room for them: the oldest puffs fade first.
      const live = seeds.filter((s) => s.puff);
      const over = live.length + rel.n - PUFF.cap;
      if (over > 0) {
        live.sort((a, b) => (a.dieAt ?? 0) - (b.dieAt ?? 0));
        for (const s of live.slice(0, over)) s.dieAt = Math.min(s.dieAt ?? 0, t + 700);
      }
      for (let i = 0; i < rel.n; i++) {
        const from = rel.points[i % rel.points.length];
        const drift = rand(0.7, 1.35);
        const vx = SEED.windX * drift;
        const vy = SEED.windY * drift;
        const base = rand(SEED.sizeMin, SEED.sizeMax);
        const s: Seed = {
          x: from.x,
          y: from.y,
          vx,
          vy,
          size: base,
          base,
          sprite: i % 2,
          drift,
          swayPhase: Math.random() * Math.PI * 2,
          swayRate: (Math.PI * 2) / rand(3.6, 6.4),
          swayAmp: rand(5, 11),
          turnPhase: Math.random() * Math.PI * 2,
          turnRate: (Math.PI * 2) / rand(7, 13),
          alpha: rand(SEED.alphaMin, SEED.alphaMax),
          cover: 0,
          seatedAt: t,
          held: false,
          puff: true,
          dieAt: t + PUFF.life + rand(-4000, 4000),
        };
        const turn = turnOf(s);
        const angle = angleOf(s);
        const sizes = [base, SEED.sizeMin + (base - SEED.sizeMin) / 2, SEED.sizeMin];
        let placed = false;
        for (let k = 0; k < PUFF.tries && !placed; k++) {
          // Off the head's rim, a few px round the seed's own place, with a kick up and across that the
          // breeze then takes back over (the same settle as a tap's kick). The seat is tested along that
          // path, not only along the drift it settles to: where the kick would carry the seed into a line
          // of text it would only fade out, and a seed that fades out was never seated.
          const x = from.x + rand(-7, 7);
          const y = from.y + rand(-7, 7);
          const kx = rand(PUFF.kickX[0], PUFF.kickX[1]);
          const ky = rand(PUFF.kickY[0], PUFF.kickY[1]);
          // Where the kick has carried it once the breeze has the seed again (the kick's own travel is its speed times the settle).
          const sx = x + kx * SEED.settle;
          const sy2 = y - ky * SEED.settle;
          for (const size of sizes) {
            const kk = size * SEED.spriteScale;
            const along = SEED.lookAhead;
            if (
              !seatClear(x, y, kk, sy, turn, angle) ||
              !seatClear(x + (vx + kx) * along, y + (vy - ky) * along, kk, sy, turn, angle) ||
              !seatClear(sx, sy2, kk, sy, turn, angle) ||
              seatLife(sx, sy2, kk, vx, vy, sy, turn, angle) < SEED.seatMinLife
            ) continue;
            s.x = x;
            s.y = y;
            s.size = size;
            s.vx = vx + kx;
            s.vy = vy - ky;
            placed = true;
            break;
          }
        }
        if (!placed) continue;
        seeds.push(s);
        placedAt.push(i);
      }
      return placedAt;
    };

    const draw = (t: number, dt: number, still: boolean) => {
      ctx.clearRect(0, 0, width, height);
      const sy = window.scrollY;
      // Text moves under the floaters as the page scrolls, so test where the
      // scroll is taking it: six frames of the last frame's scroll.
      const dsy = (sy - lastSy) * 6;
      lastSy = sy;
      const now = root.dataset.scheme === 'dark' ? 'dark' : 'light';
      const switched = now !== branch;
      branch = now;
      if (blow) {
        const b = blow;
        blow = null;
        if (t - b.at < PUFF.window) {
          if (now === 'dark') {
            // A tap on clear cloth at the clock; the mote it calls rises.
            tap.x = b.x;
            tap.y = b.y;
            tap.clear = true;
            tap.rise = true;
            tap.pending = true;
            b.report?.([]);
          } else b.report?.(releasePuff(t, sy, b));
        } else b.report?.([]);
      }
      if (now === 'dark') drawFireflies(t, still, sy, dsy, switched);
      else drawDandelions(t, dt, still, sy, dsy, switched);
      tap.pending = false;
      tap.rise = false;
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      // 30 fps, except while the page is scrolling by day: text slides under the
      // seeds on every compositor frame, so a skipped frame would leave the last
      // one's ink on a line for 33 ms. Seeds move by real dt, so a faster frame
      // costs nothing but the work; the fireflies step per frame, so they keep 30.
      const scrolling = root.dataset.scheme !== 'dark' && Math.abs(window.scrollY - lastSy) > 0.5;
      if (t - last < FRAME_MS && !scrolling) return;
      const dt = Math.min(0.1, prev ? (t - prev) / 1000 : FRAME_MS / 1000);
      prev = t;
      last = t;
      draw(t, dt, false);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
      prev = 0;
    };

    const sync = () => {
      stop();
      if (reduced.matches) draw(0, 0, true);
      else if (!document.hidden) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, width, height);
    };

    /* One passive listener per event type. Touch moves are scrolls, so only a
       mouse or pen is tracked as a passing cursor. A tap is a mouse press, or a
       touch or pen RELEASE with no meaningful movement since its press and no
       scroll (pointercancel is the browser taking the touch for a scroll). */
    const presses = new Map<number, { x: number; y: number; sy: number; at: number; moved: boolean }>();
    /** Whether a tap landed on clear cloth: not on a link or control, not on a
        sheet, and far enough from every line of text that a mote lit there
        (at its largest) would not fade out. */
    /** A press on a toy (the clock, the date stamp) is the toy's, not a tap on the cloth. */
    const onToy = (e: PointerEvent) => e.target instanceof Element && !!e.target.closest('[data-cc-toy]');
    const tapIsClear = (e: PointerEvent) => {
      const el = e.target instanceof Element ? e.target : null;
      if (el?.closest('a, button, input, textarea, select, label, summary, [role="button"], .cc-paper, .cc-torn, .cc-gingham')) return false;
      const sy = window.scrollY;
      return !inAnyBox(e.clientX, e.clientY + sy, textBoxes, fireflyPad(2.4, width < SEED.phoneWidth)) && !onSheet(e.clientX, e.clientY + sy);
    };
    const onPointerMove = (e: PointerEvent) => {
      const p = presses.get(e.pointerId);
      if (p && Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP.slop) p.moved = true;
      if (e.pointerType === 'touch') return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.at = performance.now();
      pointer.fine = true;
    };
    const onPointerDown = (e: PointerEvent) => {
      if (onToy(e)) return;
      if (e.pointerType === 'mouse') {
        tap.x = e.clientX;
        tap.y = e.clientY;
        tap.clear = tapIsClear(e);
        tap.pending = true;
        return;
      }
      presses.set(e.pointerId, { x: e.clientX, y: e.clientY, sy: window.scrollY, at: performance.now(), moved: false });
    };
    const onPointerUp = (e: PointerEvent) => {
      const p = presses.get(e.pointerId);
      presses.delete(e.pointerId);
      if (!p || p.moved) return;
      if (Math.hypot(e.clientX - p.x, e.clientY - p.y) > TAP.slop) return;
      if (performance.now() - p.at > TAP.maxMs || Math.abs(window.scrollY - p.sy) > TAP.maxScroll) return;
      tap.x = e.clientX;
      tap.y = e.clientY;
      tap.clear = tapIsClear(e);
      tap.pending = true;
    };
    const onPointerCancel = (e: PointerEvent) => {
      presses.delete(e.pointerId);
    };
    const onBlow = (e: Event) => {
      const d = (e as CustomEvent).detail;
      if (d && Number.isFinite(d.x) && Number.isFinite(d.y)) {
        blow?.report?.([]);
        blow = { at: performance.now(), x: d.x, y: d.y, r: d.r, n: d.n, points: d.points ?? [], report: typeof d.report === 'function' ? d.report : undefined };
      }
    };
    const onPointerLeave = () => {
      pointer.fine = false;
    };

    resize();
    sync();

    /* The fonts have settled: measure the text against them, then (and only
       then) let the seeds be seated and shown. */
    const onFonts = () => {
      if (!alive) return;
      collectTextRects();
      fontsSettled = true;
      if (reduced.matches) sync();
    };
    // Debounced only: no synchronous text sweep on a resize. A change of width
    // moves the text, so it is re-measured soon; a change of height alone (a
    // phone toolbar) does not, so it waits until the page is still.
    let lastW = window.innerWidth;
    const onResize = () => {
      const widthChanged = window.innerWidth !== lastW;
      lastW = window.innerWidth;
      resize();
      sync();
      scheduleRects(widthChanged ? 150 : SETTLE_MS);
    };
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-scheme'] });
    const bodyObserver = new ResizeObserver(() => scheduleRects());
    bodyObserver.observe(document.body);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true });
    window.addEventListener('pointercancel', onPointerCancel, { passive: true });
    window.addEventListener('cc:blow', onBlow);
    document.documentElement.addEventListener('pointerleave', onPointerLeave, { passive: true });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    // After the first layout (resize() above forced it), so the font loads it
    // began are pending and `ready` waits for them. Cancelled by `alive`.
    if (document.fonts) document.fonts.ready.then(onFonts);
    else onFonts();

    return () => {
      alive = false;
      stop();
      clearTimeout(rectTimer);
      observer.disconnect();
      bodyObserver.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointerup', onPointerUp);
      window.removeEventListener('pointercancel', onPointerCancel);
      window.removeEventListener('cc:blow', onBlow);
      blow?.report?.([]);
      blow = null;
      presses.clear();
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
      ctx.clearRect(0, 0, width, height);
    };
  });
}
