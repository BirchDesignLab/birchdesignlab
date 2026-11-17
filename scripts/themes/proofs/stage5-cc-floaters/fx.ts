/**
 * Cottagecore floaters (Stage 5 proof a6): fireflies by lamplight in the dark
 * scheme, dandelion seeds on the breeze in the light scheme. One canvas, one
 * loop, one lifecycle. Canvas 2D, because it is a few soft dots and a few
 * hairline seeds.
 *
 * Lifecycle (src/themes/README.md, Motion and backgrounds), unchanged from
 * the fireflies it replaces: mounted per page with onMount and torn down
 * before the next swap; a no-op on any other school's page; it watches
 * data-scheme (the switcher flips it in place), pauses when the tab is
 * hidden, caps the pixel ratio at 1.5, throttles to 30 fps, caches both
 * sprites (halo, seeds) offscreen, and paints one still frame under reduced
 * motion. The page reads the same with the canvas blank.
 *
 * Where they live (D7 (a)): the canvas is fixed at z-index 0, over the cloth
 * and under `main` (z-index 1), so the sheets, cards and notes sit on top of
 * the floaters. Tier B: theme.css's `.cc-motes { display: none }` and its
 * dark-only `display: block` collapse to `display: block` in both schemes
 * (this file draws the one that belongs to the scheme and clears the other).
 *
 * Fireflies (dark): count, colour, halo and text avoidance as before. The
 * pulse is now a burst (item 12): 2 to 4 flashes about 500 ms apart, each a
 * 120 to 180 ms rise and a 250 ms fall, then 4 to 8 s fully dark. Each mote
 * has its own clock, so they never flash together.
 *
 * Dandelions (light): pappus seeds, about 8 on desktop and 4 on a phone,
 * each on its own clock, riding a slow breeze up and across with a sway and a
 * turn, and now and then a gust. They fade off text like the fireflies.
 *
 * Pointer (S3, passive, one listener per event type, no layout reads): a seed
 * drifts away from a passing cursor or a tap; a hovered or tapped firefly
 * flashes.
 *
 * Text (item 14): the text rects are measured in document space once on mount
 * and again, debounced, when the body resizes or the fonts arrive. The draw
 * subtracts scrollY. There is no per-scroll getBoundingClientRect sweep.
 */
import { onMount } from '../../lib/lifecycle';

const SCHOOL = 'cottagecore';
const FRAME_MS = 1000 / 30;

/* ---------- numbers (the write-up quotes these) ---------- */
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
  /** Peak alpha of the lit core: today's own peak (0.35 + 0.6). The halo
      sprite's centre stop is lifted from 0.42 to 0.6 (brief item 12). */
  coreAlpha: 0.95,
  /** Halo radius in mote radii: 7 when barely lit, growing by 7 more at the
      peak of a flash (it was a fixed 9). Core radius: 0.7 growing by 0.8 at
      the peak (it was 0.7 growing by 0.3). A flash has to register at page
      scale at a glance, not only in a close crop (brief item 12's verify). */
  haloMin: 7,
  haloGrow: 7,
  coreMin: 0.7,
  coreGrow: 0.8,
  /** Clear air (px) kept between a mote's centre and any text; the larger
      halo needs a little more than the 8 it had. */
  textPad: 12,
  /** A cursor this close (px) flashes a mote; a finger gets more room. */
  hoverRadius: 26,
  tapRadius: 44,
  /** A touched mote will not be touched again for this long (ms). */
  touchCooldown: 1400,
  /** Per 30 fps frame: how fast a mote fades off text and back on. It was a
      single 0.08 both ways; off is now quicker so a scrolled-under line never
      catches a lit mote. */
  fadeIn: 0.08,
  fadeOut: 0.25,
};
const SEED = {
  desktop: 8,
  phone: 4,
  phoneWidth: 700,
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
  /** Alpha of a whole seed before cover and edge fade. */
  alphaMin: 0.55,
  alphaMax: 0.82,
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
  /** Sprite units to CSS px at size 1. */
  spriteScale: 0.62,
  /** Clear air (px) kept between a seed's drawn extent and any text. */
  textPad: 12,
  /** Seconds of travel looked ahead when testing for text. */
  lookAhead: 0.7,
};
/** Ink-brown, the school's --cc-ink. The seeds are drawn in it at low alpha. */
const SEED_INK = '58, 42, 31';

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
}
interface TextRect {
  l: number;
  t: number;
  r: number;
  b: number;
}

/* ---------- sprites, painted once ---------- */

/** A halo's radial gradient painted once to an offscreen sprite; motes then
    drawImage it scaled and alpha-blended, instead of building a fresh
    gradient every mote, every frame. (Unchanged.) */
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

/** One dandelion seed, upright, on a 128 x 128 sprite. The pappus is a fan of
    hairline filaments from the top of a hairline stalk (the beak), each bowed
    a little and ending in a pin-head; a small tapered seed body hangs below.
    Drawn in full ink; the caller sets the alpha. The anchor (where the stalk
    meets the filaments) is at sprite (64, 48). */
const SEED_SPRITE_SIZE = 128;
const SEED_ANCHOR = { x: 64, y: 48 };
function buildSeedSprite(filaments: number, rnd: () => number): HTMLCanvasElement {
  const sprite = document.createElement('canvas');
  sprite.width = sprite.height = SEED_SPRITE_SIZE;
  const c = sprite.getContext('2d')!;
  const { x: ax, y: ay } = SEED_ANCHOR;
  c.lineCap = 'round';
  // Stalk (beak) and the seed body.
  c.strokeStyle = `rgba(${SEED_INK}, 0.85)`;
  c.lineWidth = 1.1;
  c.beginPath();
  c.moveTo(ax, ay);
  c.lineTo(ax, ay + 44);
  c.stroke();
  c.fillStyle = `rgba(${SEED_INK}, 0.95)`;
  c.beginPath();
  c.moveTo(ax, ay + 40);
  c.bezierCurveTo(ax + 4.2, ay + 46, ax + 3.2, ay + 58, ax, ay + 70);
  c.bezierCurveTo(ax - 3.2, ay + 58, ax - 4.2, ay + 46, ax, ay + 40);
  c.fill();
  // Pappus: filaments fanned over the upper hemisphere, a touch longer at the
  // sides than at the crown, as a parachute reads.
  c.lineWidth = 0.85;
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
    c.strokeStyle = `rgba(${SEED_INK}, ${0.5 + rnd() * 0.18})`;
    c.beginPath();
    c.moveTo(ax, ay);
    c.quadraticCurveTo(mx, my, ex, ey);
    c.stroke();
    c.fillStyle = `rgba(${SEED_INK}, 0.7)`;
    c.beginPath();
    c.arc(ex, ey, 1.25, 0, Math.PI * 2);
    c.fill();
  }
  // The little knot where the filaments meet.
  c.fillStyle = `rgba(${SEED_INK}, 0.9)`;
  c.beginPath();
  c.arc(ax, ay, 1.8, 0, Math.PI * 2);
  c.fill();
  return sprite;
}

/* ---------- small helpers ---------- */
const rand = (a: number, b: number) => a + Math.random() * (b - a);

function inAnyRect(x: number, y: number, rects: TextRect[], pad: number): boolean {
  for (const r of rects) {
    if (x >= r.l - pad && x <= r.r + pad && y >= r.t - pad && y <= r.b + pad) return true;
  }
  return false;
}

/** Whether a seed drawn with its anchor at (x, y) at scale k would touch a
    text rect: the pappus fan reaches 40 sprite units to each side and 42 above
    the anchor, the body 70 below it. */
function seedHitsText(x: number, y: number, k: number, rects: TextRect[]): boolean {
  const l = x - 40 * k - SEED.textPad;
  const r = x + 40 * k + SEED.textPad;
  const t = y - 42 * k - SEED.textPad;
  const b = y + 70 * k + SEED.textPad;
  for (const q of rects) {
    if (l < q.r && r > q.l && t < q.b && b > q.t) return true;
  }
  return false;
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
    let textRects: TextRect[] = [];
    let nextGust = 0;
    let lastFireflyT = -1e9;
    let lastSeedT = -1e9;
    let gustStart = -1e9;

    /* Pointer: written by the listeners, read by the tick. */
    const pointer = { x: -1e4, y: -1e4, at: -1e9, fine: false };
    const tap = { x: 0, y: 0, pending: false };

    const seedFireflies = () => {
      // Few, and fewer on a phone: a scatter, not a swarm. (Unchanged.)
      const count = Math.round(Math.min(18, Math.max(7, (width * height) / 70000)));
      fireflies = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.14,
        r: 1.3 + Math.random() * 1.1,
        wander: Math.random() * Math.PI * 2,
        cover: 1,
        flashes: [],
        rest: -1,
        touched: -1e9,
      }));
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

    const seedDandelions = () => {
      const count = width < SEED.phoneWidth ? SEED.phone : SEED.desktop;
      seeds = Array.from({ length: count }, (_, i) => {
        const s: Seed = {
          x: 0,
          y: 0,
          vx: SEED.windX,
          vy: SEED.windY,
          size: rand(0.8, 1.25),
          sprite: i % 2,
          drift: rand(0.7, 1.35),
          swayPhase: Math.random() * Math.PI * 2,
          swayRate: (Math.PI * 2) / rand(3.6, 6.4),
          swayAmp: rand(5, 11),
          turnPhase: Math.random() * Math.PI * 2,
          turnRate: (Math.PI * 2) / rand(7, 13),
          alpha: rand(SEED.alphaMin, SEED.alphaMax),
          cover: 1,
        };
        spawnSeed(s, true);
        s.cover = 1;
        return s;
      });
    };

    /* Text, measured in document space (item 14): once on mount, then
       debounced when the body resizes or the fonts arrive. Never per scroll. */
    const collectTextRects = () => {
      const sx = window.scrollX;
      const sy = window.scrollY;
      const scope = document.querySelectorAll<HTMLElement>(
        '[data-theme="cottagecore"] :is(header, main, footer) :is(h1, h2, h3, h4, p, li, a, label, blockquote, figcaption, button, input, textarea)',
      );
      const out: TextRect[] = [];
      scope.forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 1 || r.height < 1) return;
        out.push({ l: r.left + sx, t: r.top + sy, r: r.right + sx, b: r.bottom + sy });
      });
      textRects = out;
    };
    let rectTimer = 0;
    const scheduleRects = () => {
      clearTimeout(rectTimer);
      rectTimer = window.setTimeout(collectTextRects, 150);
    };

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // A phone's toolbar resizes the viewport on scroll; keep the floaters
      // where they are rather than scattering them again.
      if (!fireflies.length) seedFireflies();
      if (!seeds.length) seedDandelions();
      collectTextRects();
    };

    /* ----- fireflies ----- */
    const drawFireflies = (t: number, still: boolean, sy: number, dsy: number) => {
      // The burst clock is absolute rAF time, so after a gap (light scheme,
      // hidden tab) every rest has passed and the whole swarm would flash on
      // the same frame. Re-stagger each mote whenever the branch resumes.
      if (t - lastFireflyT > FRAME_MS * 3) {
        for (const m of fireflies) {
          m.flashes = [];
          m.rest = t + rand(0, FIREFLY.darkMax);
        }
      }
      lastFireflyT = t;
      for (const m of fireflies) {
        if (!still) {
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
        // The burst clock: each mote rests 4 to 8 s, flashes 2 to 4 times,
        // rests again. First rest is random so no two ever line up.
        if (!still) {
          if (m.rest < 0) m.rest = t + rand(0, FIREFLY.darkMax);
          if (!m.flashes.length && t >= m.rest) {
            m.flashes = makeBurst(t);
            m.rest = flashEnd(m.flashes[m.flashes.length - 1]) + rand(FIREFLY.darkMin, FIREFLY.darkMax);
          }
          // A cursor on a mote, or a finger near one, sets it flashing.
          if (t - m.touched > FIREFLY.touchCooldown) {
            const near = pointer.fine && t - pointer.at < SEED.pointerIdle && Math.hypot(m.x - pointer.x, m.y - pointer.y) < FIREFLY.hoverRadius;
            const tapped = tap.pending && Math.hypot(m.x - tap.x, m.y - tap.y) < FIREFLY.tapRadius;
            if (near || tapped) {
              m.touched = t;
              m.flashes = makeBurst(t, 2);
              m.rest = flashEnd(m.flashes[m.flashes.length - 1]) + rand(FIREFLY.darkMin, FIREFLY.darkMax);
            }
          }
        }
        // Keep motes out of the reading column: fade toward invisible, on an
        // ease rather than a hard cut, while one sits over a text block.
        const target = inAnyRect(m.x, m.y + sy, textRects, FIREFLY.textPad) || inAnyRect(m.x, m.y + sy + dsy, textRects, FIREFLY.textPad) ? 0 : 1;
        m.cover = still ? target : m.cover + (target - m.cover) * (target < m.cover ? FIREFLY.fadeOut : FIREFLY.fadeIn);
        let env = 0;
        if (still) env = 0.7;
        else {
          for (const f of m.flashes) env = Math.max(env, flashEnvelope(f, t));
          if (m.flashes.length && t > flashEnd(m.flashes[m.flashes.length - 1])) m.flashes = [];
        }
        const lit = env * m.cover;
        if (lit < 0.01) continue;
        const haloR = m.r * (FIREFLY.haloMin + FIREFLY.haloGrow * env);
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
    const drawDandelions = (t: number, dt: number, still: boolean, sy: number, dsy: number) => {
      let gust = 0;
      if (t - lastSeedT > FRAME_MS * 3) {
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
      }
      const pointerLive = pointer.fine && t - pointer.at < SEED.pointerIdle;
      const relax = 1 - Math.exp(-dt / SEED.settle);
      for (const s of seeds) {
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
          if (s.x > width + 50 || s.y < -60 || s.x < -90 || s.y > height + 90) spawnSeed(s, false);
        }
        // Fade off text, looking ahead along the drift so a seed is gone
        // before it reaches a line, not after.
        const ax = s.x + s.vx * SEED.lookAhead;
        const ay = s.y + s.vy * SEED.lookAhead;
        const kk = s.size * SEED.spriteScale;
        const over = seedHitsText(s.x, s.y + sy, kk, textRects) || seedHitsText(ax, ay + sy, kk, textRects) || seedHitsText(s.x, s.y + sy + dsy, kk, textRects);
        const target = over ? 0 : 1;
        s.cover = still ? target : s.cover + (target - s.cover) * (target < s.cover ? SEED.fadeOut : SEED.fadeIn);
        // Fade in and out at the viewport's edges rather than popping.
        const edge = Math.min(1, Math.max(0, Math.min(s.x + 30, width + 30 - s.x, s.y + 30, height + 30 - s.y) / 70));
        const a = s.alpha * s.cover * edge;
        if (a < 0.01) continue;
        const turn = 0.42 + 0.58 * Math.abs(Math.cos(s.turnPhase));
        const angle = Math.sin(s.swayPhase) * 0.22 + Math.max(-0.35, Math.min(0.35, s.vx * 0.006));
        const k = kk;
        ctx.save();
        ctx.translate(s.x, s.y);
        ctx.rotate(angle);
        ctx.scale(turn, 1);
        ctx.globalAlpha = a;
        ctx.drawImage(seedSprites[s.sprite], -SEED_ANCHOR.x * k, -SEED_ANCHOR.y * k, SEED_SPRITE_SIZE * k, SEED_SPRITE_SIZE * k);
        ctx.restore();
      }
      ctx.globalAlpha = 1;
    };

    const draw = (t: number, dt: number, still: boolean) => {
      ctx.clearRect(0, 0, width, height);
      const sy = window.scrollY;
      // Text moves under the floaters as the page scrolls, so test where the
      // scroll is taking it: six frames of the last frame's scroll.
      const dsy = (sy - lastSy) * 6;
      lastSy = sy;
      if (root.dataset.scheme === 'dark') drawFireflies(t, still, sy, dsy);
      else drawDandelions(t, dt, still, sy, dsy);
      tap.pending = false;
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < FRAME_MS) return;
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
       mouse or pen is tracked as a passing cursor; every pointer type can tap. */
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      pointer.x = e.clientX;
      pointer.y = e.clientY;
      pointer.at = performance.now();
      pointer.fine = true;
    };
    const onPointerDown = (e: PointerEvent) => {
      tap.x = e.clientX;
      tap.y = e.clientY;
      tap.pending = true;
    };
    const onPointerLeave = () => {
      pointer.fine = false;
    };

    resize();
    sync();
    // PROOF-ONLY: the harness hands in an object to read state from. Delete
    // these lines when this file replaces src/themes/cottagecore/fx.ts.
    const probe = (window as unknown as { __ccFloatersProbe?: { get?: () => unknown } }).__ccFloatersProbe;
    if (probe) probe.get = () => ({ fireflies, seeds, textRects, width, height, scrollY: window.scrollY });

    const onResize = () => {
      resize();
      sync();
      scheduleRects();
    };
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-scheme'] });
    const bodyObserver = new ResizeObserver(scheduleRects);
    bodyObserver.observe(document.body);
    window.addEventListener('resize', onResize);
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave, { passive: true });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);
    document.fonts?.ready.then(scheduleRects);

    return () => {
      stop();
      clearTimeout(rectTimer);
      observer.disconnect();
      bodyObserver.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerdown', onPointerDown);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
      ctx.clearRect(0, 0, width, height);
    };
  });
}
