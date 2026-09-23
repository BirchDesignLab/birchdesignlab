/**
 * Fireflies by lamplight: a handful of warm motes drifting over the dark
 * scheme. Canvas 2D, because it is a few soft dots and nothing more.
 *
 * Lifecycle (src/themes/README.md, Motion and backgrounds): mounted per page
 * with onMount and torn down before the next swap; a no-op on any other
 * school's page, since module scripts outlive navigation. It runs only while
 * the dark scheme is on (the switcher can flip it in place, so it watches
 * data-scheme), pauses when the tab is hidden, caps the pixel ratio at 1.5,
 * throttles to 30 fps, and under reduced motion paints one still frame. The
 * page reads the same with the canvas blank.
 */
import { onMount } from '../../lib/lifecycle';

const SCHOOL = 'cottagecore';
const FRAME_MS = 1000 / 30;

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
  period: number;
  wander: number;
  /** Eased 0-1: how visible this mote is where it currently sits, faded
      toward 0 while it drifts over a line of text. */
  cover: number;
}

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
  g.addColorStop(0, 'rgba(255, 214, 130, 0.42)');
  g.addColorStop(0.25, 'rgba(240, 170, 80, 0.16)');
  g.addColorStop(1, 'rgba(240, 165, 80, 0)');
  sctx.fillStyle = g;
  sctx.fillRect(0, 0, HALO_SPRITE_SIZE, HALO_SPRITE_SIZE);
  return sprite;
}

/** Whether (x, y) falls inside (or near) any of the given rects: a cheap
    point-in-rect test run against the page's text blocks each frame. */
function inAnyRect(x: number, y: number, rects: DOMRect[]): boolean {
  const pad = 8;
  for (const r of rects) {
    if (x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad) return true;
  }
  return false;
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
    let motes: Mote[] = [];
    let width = 0;
    let height = 0;
    let raf = 0;
    let last = 0;
    let textRects: DOMRect[] = [];

    const seed = () => {
      // Few, and fewer on a phone: a scatter, not a swarm.
      const count = Math.round(Math.min(18, Math.max(7, (width * height) / 70000)));
      motes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.14,
        r: 1.3 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        period: 3200 + Math.random() * 4200,
        wander: Math.random() * Math.PI * 2,
        cover: 1,
      }));
    };

    // Viewport-relative rects of the page's text, so a mote can fade as it
    // wanders over a line of copy. The canvas is fixed (viewport space) but
    // text scrolls with the page, so this is recomputed on resize and scroll.
    const collectTextRects = () => {
      const main = document.querySelector('[data-theme="cottagecore"] main');
      textRects = main
        ? Array.from(main.querySelectorAll<HTMLElement>('h1, h2, h3, p, li, a')).map((el) => el.getBoundingClientRect())
        : [];
    };
    let scrollScheduled = false;
    const onScroll = () => {
      if (scrollScheduled) return;
      scrollScheduled = true;
      requestAnimationFrame(() => {
        collectTextRects();
        scrollScheduled = false;
      });
    };

    const resize = () => {
      const dpr = Math.min(1.5, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      // A phone's toolbar resizes the viewport on scroll; keep the motes
      // where they are rather than scattering them again.
      if (!motes.length) seed();
      collectTextRects();
    };

    const draw = (t: number, still: boolean) => {
      ctx.clearRect(0, 0, width, height);
      for (const m of motes) {
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
        // Keep motes out of the reading column: fade toward invisible, on
        // an ease rather than a hard cut, while one sits over a text block.
        const target = inAnyRect(m.x, m.y, textRects) ? 0 : 1;
        m.cover = still ? target : m.cover + (target - m.cover) * 0.08;
        if (m.cover < 0.01) continue;
        // A slow glow-and-fade, the way a firefly pulses.
        const pulse = (still ? 0.7 : Math.pow(0.5 + 0.5 * Math.sin(m.phase + (t / m.period) * Math.PI * 2), 3)) * m.cover;
        const haloR = m.r * 9;
        ctx.globalAlpha = pulse;
        ctx.drawImage(halo, m.x - haloR, m.y - haloR, haloR * 2, haloR * 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = `rgba(255, 238, 190, ${Math.min(1, (0.35 + 0.6 * pulse) * m.cover)})`;
        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r * (0.7 + 0.3 * pulse), 0, Math.PI * 2);
        ctx.fill();
      }
    };

    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < FRAME_MS) return;
      last = t;
      draw(t, false);
    };

    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const sync = () => {
      stop();
      const dark = root.dataset.scheme === 'dark';
      if (!dark) {
        ctx.clearRect(0, 0, width, height);
        return;
      }
      if (reduced.matches) draw(0, true);
      else if (!document.hidden) raf = requestAnimationFrame(tick);
    };

    resize();
    sync();

    const onResize = () => {
      resize();
      sync();
    };
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-scheme'] });
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('visibilitychange', sync);
    reduced.addEventListener('change', sync);

    return () => {
      stop();
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('visibilitychange', sync);
      reduced.removeEventListener('change', sync);
      ctx.clearRect(0, 0, width, height);
    };
  });
}
