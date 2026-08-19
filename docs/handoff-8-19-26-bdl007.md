# Handoff · 08-19-26 · BDL-007 The Shining Tree

A second session on 08-19-26, separate from the SEO/contact-form thread in
`handoff-8-19-26.md`. This one built, shipped, and polished **BDL-007 The
Shining Tree**, the interactive three.js stage for the organic 3D wordmark
at `/lab/bdl-007`, then handled two follow-ups (a favicon set, a Safari
cert report). `main` is clean: `npx vitest run` 138/138, `npx astro check`
0 errors, `npm run build` 15 pages. Nothing left open.

## What shipped (PRs merged this session)

- **#29 — BDL-007 build.** The whole experiment, executed subagent-driven
  from the approved plan: `fireflies.ts` (pure seeded steering, tested),
  `stage.ts` (three.js scene, weighted drag/flick/zoom, moss breath,
  gathering fireflies, dispose), the Astro shell with still-first loading,
  the registry entry, and the specimen content. Every task reviewed; two
  whole-branch reviews. The final review caught the big one: the glb is
  GPU-instanced, so gather targets had to come from `getMatrixAt`, not base
  geometry (which sat at node pivots buried inside the letterforms).
- **#30 — brand-assets test rewrite.** The long-failing "brand-cream" test.
  It read `fill` only (the day/night marks are stroke-drawn) and hardcoded
  two hexes. Now parses the palette from `tokens.css` and checks
  fill/stroke/stop-color. Suite went 135/136 -> 138/138. The logos were
  always correct and on-palette; the test was wrong.
- **#31 — 8c favicon set.** Replaced the placeholder favicon (which was also
  off-palette, `#1C1B19`/`#F4F1EA` vs the real `--charcoal`/`--bark-warm`)
  with the approved 8c mark plus 32/180/512 PNGs. Added the missing
  `rel=icon` PNG fallback; `apple-touch-icon` moved off the gitignored
  build artefact `/og/logo.png` to a committed asset. First adoption of the
  locked brand set.
- **#32 — re-shot still.** The old `still.png` was shot against the old
  lighting and would jump at the crossfade. Re-captured from the live tuned
  WebGL buffer (keeps alpha), pedestal removed in post. 1.2MB -> 281KB, and
  the `Image` hints were corrected (they asked for a 1200px candidate a
  592px source can't supply; `sizes=100vw` for an image that renders ~470px).
- **#48 — mobile framing, disclosure affordances, bordered hatch.** See below.
- **#49 — Safari cert report** (docs only). See below.

## Tuning (folded into #29 during a live founder pass)

Landed straight from the working loop with the founder watching the screen,
which caught two bugs a review would not have: an `onBeforeCompile` uniform
that was never declared in the GLSL (so the moss scale pulse silently never
compiled), and moss/lichen sharing one `customProgramCacheKey`. The tuning:

- ACES tone mapping; key/rim intensities cut and tints pulled toward neutral
  (a warm key meeting a cool rim across a rough diffuse lobe was the
  "iridescent" fringing). Ambient raised.
- Moss/lichen albedo set from brand tokens (`--green-moss`, `--stone-warm`).
  They ship white in every export; the colour lived in the staging code.
- Two bark bump maps recovered from the uncompressed glb as ~118KB WebP.
- The breath pulses in size as well as brightness (vertex-shader scale on the
  instanced moss).
- Final timings by eye: 60s idle yaw, 20s breath, 20s firefly gather. **These
  differ from the approved spec (30/9/8); the spec is kept as the record, so
  read the code for what ships.**
- A Vite plugin drops ~1.3MB of dead Draco decoder copies Vite emits from
  three's module-scope defaults.

## Mobile pass (#48)

Reported from a Pro Max: mark small and low with dead space up top, and
scrolling slid the wall label under the fixed hatch pill.

- **Framing.** `frameCamera()` fits the front silhouette to whichever axis is
  tighter (horizontal FOV is the constraint on a portrait phone), recomputed
  on resize. Iterated live: first too low, then over-corrected to riding high
  (the mark is top-heavy, chunky B up top), settled by aiming above centre
  (`FRAME_DROP` 0.22) for a visual centre. `FIT_FILL` 0.74 leaves margin so
  nothing clips.
- **Ground shadow removed.** A fixed pedestal plane drew as a hard blob or a
  smear once the distance became aspect-aware, and implied a floor the
  starfield doesn't have. The mark floats now.
- **Disclosure affordances.** The specimen plate and how-to label are both
  `<details>` and didn't say so. Each summary got a moss caret (chevron down =
  expand) and a hover wash. Desktop and mobile; BDL-006 inherits it.
- **Hatch.** Kept the floating pill (the founder likes the gap) but gave it a
  real accent-60% border, since `--line-accent` (accent at 45%) blended into
  the stage. Mobile clearance moved to `padding-top` on `main` (a first-child
  margin collapsed out and let the pill overlap the label at rest).

Verified in real Chrome at portrait and desktop, since the built-in preview
pane can't composite WebGL.

## Safari cert report (#49, docs only)

A friend hit Safari's "connection is not private / certificate not valid" on
birchdesignlab.com. **The live cert is valid** from outside (GTS, good dates,
correct SANs, chain verifies, `ssl_verify_result=0`). The site is not the
vector. Cause is device- or network-side. The friend works for a 10-15 person
shop that had a data theft months ago, so the note records the full triage:
the decisive tell is the warning cert's issuer (filter/firewall vendor =
benign; unknown/self-signed = escalate), plus filter-vs-attacker separators
(major sites also warning, DNS resolving to a private IP, cellular clean) and
post-breach device-hygiene checks. Not the founder's network to probe. Full
detail in `docs/lab-backlog.md` under "Prod ops notes".

## Traps worth carrying forward (this model)

1. The glb declares `EXT_mesh_gpu_instancing`. Moss and lichen are placed by
   `instanceMatrix`, not node transforms; anything sampling the surface must
   go through `getMatrixAt`.
2. A uniform added via `onBeforeCompile` must be declared in the GLSL by hand.
   three auto-declares only its own built-ins; binding a value without the
   declaration fails to compile with no JS-side signal.
3. Material names mislead: `canopy` is the green moss/lichen cover, `stone` is
   the birch bark face.
4. The design tool authors materials from `tokens.css`. A glTF
   `baseColorFactor` converted from linear to sRGB returns brand tokens
   exactly; moss/lichen only read white because their colour was in the
   staging code, not the mesh.

Capture workflow for the next lighting change: the preview pane can't
composite, so stills come from real Chrome via
`scripts/lab/receive-capture.mjs` + `scripts/lab/prepare-still.mjs`. Four
probes now live in `scripts/lab/` (inspect-glb, extract-glb-textures,
sample-reference-colors, receive-capture/prepare-still).

## Open, none blocking

From the final review and mobile pass, all recorded in `docs/lab-backlog.md`:
no cache headers on `/models/*` or `/draco/*` (the 3.2MB glb revalidates on
every repeat visit — best next pickup, a `public/_headers` edit); flick
momentum assumes a 60Hz pointer cadence; no keyboard path for turning the
model; `reduceMotion` sampled once at mount with no change listener; the
decoded gltf leaks if teardown wins the race with the loader. The re-shot
still is 592x963 native — fine at the stage's cap, slightly soft on a 2x
display at the widest viewport.
