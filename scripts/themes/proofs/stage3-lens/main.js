/**
 * Boot and frame loop for the stage 3 lens proof page.
 *
 * Written 09-25-26 for Tier 3 stage 3 (Tier A proofs). A proof, not
 * production code. Reads the query parameters (index.html lists them),
 * paints and mounts the wallpaper, lays out the orbs, gives the panes their
 * filters, creates the lens, and runs one requestAnimationFrame loop that
 * moves the orbs (JS driver), reads the backdrop model, steps and draws the
 * lens and re-tints the panes. Every frame's rAF delta and the loop's own
 * work time are recorded for the harness, which reads them through
 * window.__lens.
 *
 * Usage: loaded by index.html as a module.
 */
import { paintWallpaper, mountWallpaper, layoutOrbs, driveOrbs, readModel, sampleModel, bendSupport, setupPanes, tintPanes } from './room.js';
import { createLens, FEEL } from './lens.js';

const q = new URLSearchParams(location.search);
const root = document.documentElement;
const phone = innerWidth <= 600;
const opt = {
  tint: q.get('tint') === 'tinted' ? 'tinted' : 'clear',
  lens: q.get('lens') === 'svg' ? 'svg' : 'webgl',
  layer: q.get('layer') === 'under' ? 'under' : 'over',
  orbs: q.get('orbs') === 'css' ? 'css' : 'js',
  bend: q.get('bend') === 'off' ? 'off' : 'auto',
  probe: q.get('probe'),
  at: q.get('at'),
  debug: q.has('debug'),
  bevel: q.get('bevel') === 'out' ? 'out' : 'in',
};

const support = bendSupport();
const bend = opt.bend === 'auto' && support.bend;
// The SVG lens only where url() backdrop filters work; WebGL otherwise.
if (opt.lens === 'svg' && !support.bend) opt.lens = 'webgl';
root.dataset.lens = opt.lens;
root.dataset.layer = opt.layer;
root.dataset.orbs = opt.orbs;
root.dataset.bevel = opt.bevel;
root.classList.toggle('bend', bend);
root.classList.toggle('tinted', opt.tint === 'tinted');
root.classList.toggle('debug', opt.debug);

const wall = paintWallpaper();
await mountWallpaper(wall);
layoutOrbs();
const panes = setupPanes(bend);
const dpr = Math.min(2, devicePixelRatio || 1);
const radius = phone ? 64 : 92;
// Start the lens across an orb's edge, where bending shows: the big gold
// orb's left edge on desktop, the blue orb's left edge on a phone.
function startAt() {
  if (opt.at) return opt.at.split(',').map(Number);
  const o = readModel(0, false).orbs[phone ? 2 : 0];
  const a = phone ? (200 * Math.PI) / 180 : (150 * Math.PI) / 180;
  return [o.cx + Math.cos(a) * o.r, o.cy + Math.sin(a) * o.r];
}
const start = startAt();
const lens = createLens({ wallCanvas: wall, mode: opt.lens, dpr, radius, start });
lens.snapTint(opt.tint);
if (opt.probe) {
  lens.setProbe(opt.probe);
  root.dataset.probe = opt.probe;
}

for (const b of document.querySelectorAll('[data-tint]')) {
  b.addEventListener('click', () => setTint(b.dataset.tint));
}
function setTint(t) {
  opt.tint = t;
  root.classList.toggle('tinted', t === 'tinted');
  for (const b of document.querySelectorAll('[data-tint]')) b.setAttribute('aria-pressed', String(b.dataset.tint === t));
  lens.setTint(t);
}
setTint(opt.tint);
addEventListener('resize', () => layoutOrbs());

/* ---------- the frame loop ---------- */
const frames = [];
let last = null;
let n = 0;
let model = null;
const readout = document.getElementById('probe-readout');
function frame(now) {
  const t0 = performance.now();
  const y = scrollY;
  if (opt.orbs === 'js') driveOrbs(y);
  model = readModel(y, opt.orbs === 'css');
  model.sample = (x, yy) => sampleModel(model, x, yy);
  lens.step(now, model);
  if (n++ % 3 === 0) tintPanes(model);
  const work = performance.now() - t0;
  if (last != null) {
    frames.push({ t: now, dt: now - last, work, sy: y });
    if (frames.length > 6000) frames.splice(0, 1000);
  }
  last = now;
  if (opt.debug) readout.textContent = `lens ${lens.state.x.toFixed(0)},${lens.state.y.toFixed(0)} e ${(lens.state.e * 100).toFixed(2)}% lift ${lens.state.liftV.toFixed(2)} work ${work.toFixed(2)}ms`;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

window.__lens = {
  ready: true,
  opt,
  support,
  bend,
  feel: FEEL,
  renderer: lens.renderer,
  dpr,
  radius,
  frames,
  panes: panes.map((p) => p.id),
  resetFrames() { frames.length = 0; },
  state() { const s = lens.state; return { x: s.x, y: s.y, vx: s.vx, vy: s.vy, held: s.held, e: s.e, lift: s.liftV, tint: s.tintV, R: s.R, box: s.box }; },
  bounds: () => lens.bounds(),
  setTint,
  moveTo: (x, y) => lens.moveTo(x, y),
  setProbe: (p) => lens.setProbe(p),
  setHidden: (h) => lens.setHidden(h),
  startTrace: () => lens.startTrace(),
  stopTrace: () => lens.stopTrace(),
  model: () => ({ wall: model.wall, orbs: model.orbs }),
};
root.dataset.ready = '1';
