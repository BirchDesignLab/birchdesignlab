/**
 * Thin bootstrap for the GPU test harness (marble-scene.html, driven by
 * render-marble.mjs and render-venus.mjs): imports the shared scene module
 * from src/themes/vaporwave/marble/scene.js (served at /marble/ by both
 * scripts' local servers) and exposes window.marble, so the offline stills
 * and the live About bust run the identical camera, materials and lights.
 *
 * Moved here 09-25-26 (Tier 3 stage 3, wave B2, seat vw-4a): this file used
 * to hold the whole scene; it is now this bootstrap only.
 *
 * Two stages are lazily created, one per quality ('still' for every existing
 * prop and the kiosk Venus, 'live' for About's Venus poster, which must
 * match the live bust's first frame). The Venus GLB is fetched once and
 * shared onto whichever stage needs it.
 *
 * Usage (in the page, after the module loads):
 *   await window.marble.render({ prop, tint, size, quality })  // PNG data URL
 *   window.marble.info()                                        // GPU and props
 */
import { createStage, loadVenus, DEFAULT_VENUS_VIEW } from '/marble/scene.js';

const stages = {};
// `supersample` (B2 fix round 3): a separate stage built the way the live
// bust builds its own (createStage's supersample path), for the handoff
// estimator (b2r3-vw-fix-marble3-aa.mjs). The shipped stills never set it.
function getStage(quality, supersample = false) {
  const key = supersample ? `${quality}-ss` : quality;
  if (!stages[key]) {
    const s = createStage({ quality, supersample, readback: true });
    document.body.appendChild(s.renderer.domElement);
    s.renderer.domElement.style.display = 'none'; // only the active stage's canvas is read, via toDataURL
    stages[key] = s;
  }
  return stages[key];
}

const venusPromises = {};
async function ensureVenus(stage, url) {
  if (!venusPromises[url]) venusPromises[url] = loadVenus(url);
  stage.setVenusMesh(await venusPromises[url]);
}

async function render(opts = {}) {
  const quality = opts.quality ?? 'still';
  const stage = getStage(quality, Boolean(opts.supersample));
  const isVenus = opts.prop === 'venus' || opts.prop === 'venus-kiosk';
  // venusUrl lets a debug harness point at an intermediate (unsimplified)
  // mesh, e.g. process-venus.mjs's --debug output, without touching the
  // production path (/marble/venus.glb, the default).
  if (isVenus) await ensureVenus(stage, opts.venusUrl ?? '/marble/venus.glb');
  const merged = isVenus ? { ...DEFAULT_VENUS_VIEW, ...opts } : opts;
  stage.renderer.domElement.style.display = 'block';
  const url = stage.render(merged);
  stage.renderer.domElement.style.display = 'none';
  return url;
}

function info() {
  return getStage('still').info();
}

window.marble = { render, info, ready: true };
