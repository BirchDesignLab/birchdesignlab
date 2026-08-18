# BDL-007 · The Shining Tree — design

Approved by the founder 08-18-26, brainstormed the same day. An interactive
three.js stage for the organic 3D wordmark: a showcase, a flex of the logo.

## What it is

The bdlOrganic mark on a museum-at-night stage. Visitors can grab it, flick
it, lean in. Left alone, it lives: the moss breathes, and fireflies gather
to it. Designation BDL-007 (004 stays retired), title **The Shining Tree**,
`device: universal`.

Budget: hundreds of lines, not tens of thousands. One dependency added:
`three` (newest stable, per the house deps policy). No GSAP, no Threlte, no
model-viewer — the animation needs are ~15 lines of lerp and sine, and the
custom work (steering, material pulse) needs raw three anyway.

## Files

```
src/experiments/bdl-007/
  Experiment.astro     stage shell: canvas host, still fallback, loading veil
  stage.ts             scene build, render loop, interaction, dispose (~300 lines)
  fireflies.ts         particle steering as pure functions (~80 lines, unit-tested)
public/models/bdlOrganic.draco.glb   3.2MB, copied from the C&C repo (already made)
public/draco/                        decoder wasm copied from the three package, not CDN'd
src/content/lab/bdl-007.md           specimen entry
src/experiments/registry.ts          one line: 'BDL-007'
```

`Experiment.astro` renders immediately; an IntersectionObserver triggers the
dynamic `import('./stage')`, so three.js is a page-specific chunk fetched
only when the stage scrolls into view. `stage.ts` exports
`mountStage(canvas): () => void` — the return is dispose (renderer, geometries,
listeners), called on Astro page swap. `fireflies.ts` is pure state-in/state-out
so vitest can exercise it without WebGL.

## Scene

- Field: charcoal, read from the live `--field` token at mount.
- Camera: ~35° FOV, model centered and fit.
- Light: warm key, low and raking (bark texture); cool rim from behind
  (white bark off dark field); soft ambient floor.
- Ground: fade-to-black disc with a blurred contact shadow. Pedestal, no geometry.
- Idle: slow yaw, one rotation per ~30s, until the first grab — then never
  resumes. The visitor owns it after that.

## Interaction

- Drag rotates with weight: velocity carries after release, exponential
  damping. Vertical tilt clamped ±35°.
- Wheel / pinch zoom, clamped 0.8x–1.8x.
- Double-tap/click eases back to the blessed front pose (the C&C still's
  15° camera notion) and re-levels.
- No UI chrome. The object is the interface.

Wall label (howto):

1. Drag to turn. Flick to spin.
2. Pinch or scroll to lean in.
3. Be still a moment; watch the moss.
4. Double-tap to reset.

## The living beats

**Breathing moss.** Find the moss material by name in the gltf (verify the
name in the glb during build; fallback: pick by dominant green albedo). Give
it a faint emissive in its own green and sine the intensity on a ~9s cycle,
barely-there to noticeable. Breathing, not blinking.

**Fireflies gather.** ~40 points, additive soft sprites, warm yellow-green.
Two states. *Wander*: drift in a loose volume around the model on noise.
*Gather*: after ~8s without interaction, each fly steers toward a moss-surface
point (sampled once at load from the moss mesh vertices), hovers, and pulses
loosely in sync with the moss breath. Any grab scatters them back to wander
with a burst impulse. Steering is seek + jitter + speed clamp per fly — no
boid math; organic reads come from per-fly noise phase.

## Reduced motion

Honored narrowly: visitor-caused motion (drag, flick, zoom, reset) stays
fully live; autonomous motion stops. Idle yaw off, moss pulse held at
mid-intensity, fireflies as a static faint constellation.

## Loading, fallback, perf

- The committed front-facing still renders in the shell from first paint,
  ghosted, under a "waking the grove" line. The C&C break-screen rule reused:
  nothing the visitor sees may depend on code that might not arrive.
- Three + glb load on intersection; the still crossfades to the live canvas.
- No WebGL: the still stays; the wall label swaps to "This specimen needs
  WebGL; here it is at rest."
- Renderer pixel ratio capped at 2. Loop pauses on `visibilitychange` and
  when scrolled out of view. Full dispose on page swap.

## Testing

- `fireflies.ts` under vitest: seek converges, speed clamps hold, scatter
  impulse decays, gather targets lie on sampled points.
- `astro check` for types; `npx vitest run` and `npm run build` clean before PR.
- Browser pass on the dev server: drag/flick/zoom/reset, reduced-motion
  emulation, WebGL-off fallback, mobile viewport.

## Out of scope

True growth/weathering (geometry morphing, seasons), the dawn lighting cycle
(judged busy alongside the two chosen beats), model variants (cascade marks),
any server component.
