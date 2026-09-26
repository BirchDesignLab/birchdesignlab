# Theme schools: Tier 3 Stage 3 handoff, wave B2 (09-25-26)

Start here. It supersedes `HANDOFF-09-25-26-stage3-tierB.md`. Wave B1 (the
rooms) is built, reviewed, committed and pushed; the founder answered the B1
stop. Wave B2 (the showpieces and interactables, then the Stage 3 gates) has
not started.

## Where things stand

- Branch `feat/theme-schools-tier3-stage3` (from `main` at `87608f0`), pushed.
  This session's commits: `33e5011` (WebKit lens run, the head sweep, the
  plan), `519a5f2` (wave B1), then the B1 stop answers and this handoff.
- `npm run verify` clean at `519a5f2`: 347 unit tests, astro check 0 errors
  0 warnings, 483 built-site tests.
- Founder sheets: `scripts/themes/.out/stage3-b1/glass-final/` and
  `vaporwave-final/` (each has an `index.md`). The before set is still
  `scripts/themes/.out/stage3-before` and `snap-stage3-base`.
- **The Venus mesh is downloaded** (founder, 09-25-26) into
  `scripts/themes/.out/meshes/venus/` (gitignored, 32 MB): `scene.gltf`,
  `scene.bin` (7.5 MB), three PNG textures (26 MB, discarded by the pipeline)
  and `license.txt` (CC0-1.0, "Credit is not mandatory. Commercial use is
  allowed."). Two meshes, 126,294 and 73,700 triangles (199,994 together,
  split at the 65,532-vertex limit), with normals, tangents and UVs; merge
  them before simplifying.
- **The founder's iPhone look at glass happens after deploy** (founder,
  09-25-26), not before the PR: there is no branch preview today. Anything it
  finds goes into a follow-up PR.

## Read first, in this order

All under `docs/superpowers/specs/theme-schools-research/`.

1. `tier3-stage3/tier-b-plan.md`: the two-wave plan and B2's model table.
2. `tier3-stage3/tier-b1-report.md`: what B1 built and the calls.
3. `tier3-stage3/stage3-decisions.md`: every Stage 3 decision; the last
   sections ("Answers at the start of Tier B", "Answers at the B1 stop") win.
4. `tier3-stage3/proofs/lens.md` (the production lens recipe, the WebKit run)
   and `proofs/marble.md` (the pipeline, the live-bust plan, the Venus).
5. The briefs `tier3-briefs/glassmorphism.md` and `vaporwave.md`,
   `tier3-briefs/stage0-decisions.md` (binding), `src/themes/README.md`,
   `HANDOFF-09-24-26-stage3.md` (gates and tools).

## Decided (do not re-ask)

- Glass arrival lands 20 to 70 ms later than base: accepted; re-measure at
  the gates after B2's lens; the transitions phase owns it.
- The pane bend stays the approved Tier A look (`FULL_FROST_TO_RIM` false in
  `src/themes/glassmorphism/fx.ts`).
- Sent keeps its pink and cyan lattice desktop; Home and Services keep a
  plain footer.
- Everything in `stage3-decisions.md` before that (Liquid Glass forward, warm
  Big Sur, Inter Display, lens WebGL everywhere under the content with the
  rigid-glass feel, restart loop, 19:93, the wall label, the interactables).

## Wave B2: the work

Plan it from `tier-b-plan.md`, show the model plan and agent count, launch.
Then the gates and a stop.

- **glass-3:** the Control Centre on Home (Clear/Tinted toggle, frost slider,
  dawn/day/dusk segmented control reading the six painted wallpapers,
  location pill), live settings held across glass pages for the session; the
  production WebGL lens from `scripts/themes/proofs/stage3-lens/lens.js`
  (texture = the same wallpaper file; under the content in the hero; the
  frosted disc placeholder becomes its poster; draw on change; pause
  off-screen; context loss; the `FEEL` constants as proven; Home's orbs move
  on the lens's clock); **the lens drag must suppress text selection** (the
  WebKit run found a mouse drag selects page text); the Services settings
  pane (inert switches and steppers, aria-hidden); E11 touch-safe states;
  E12 pointer light; phone targets.
- **vw-3, interactables:** windows drag by their title bar on desktop (settle
  back on the next page); Contact's screensaver Settings (cycles resort
  sunset, marble sphere, 3D pipes) and Preview (full-window until a click);
  the kiosk's TOUCH SCREEN TO BEGIN attract loop; caption buttons press.
  Settings and Preview become real buttons with aria-labels.
- **vw-4, marble:** move the scene into `src/themes/vaporwave/marble/` and
  have `render-marble.mjs` import it; add `meshoptimizer` 1.1.1 as an
  explicit devDependency (founder yes); the processing script (read the
  glTF, drop textures and UVs, centre, simplify to about 30,000 triangles,
  quantize, meshopt-encode, GLB); render the Venus stills and replace the
  stand-ins where the head belongs (About's plinth is sized for it; the
  kiosk); the live About bust (poster = the still from the same module,
  three.js via dynamic import, rigid drag, idle turn, one canvas, DPR caps,
  context loss, teardown); re-measure the still's seat on the plinth with
  `measure-still-bbox.mjs`'s solid-silhouette method (the stand-in's 25.7%
  offset does not carry over); `meta.ts` provenance to `public-domain` with
  the Venus note from `proofs/marble.md`.
- **Then:** `harness/stage-gates.mjs --before-dir stage3-before --after-label
  stage3-after`, the S3 side by side, strips and sheets, a B2 report, and a
  stop. After deploy: the founder's iPhone look at glass (Safari's frosted
  panes cannot be seen from Windows) and the lens's iOS scroll check.

## Lessons from B1

- **Look at the sheets yourself.** The critics passed four vaporwave brief
  requirements that were plainly unmet (the kiosk had no base, the plinth was
  two slivers, two floors stacked, an invisible tile); the orchestrator's own
  look caught them. Crop tall sheets with `harness/crop.mjs`.
- **Headless Chromium here reports `prefers-reduced-transparency: reduce`**
  by default. `capture.mjs` and `motion.mjs` force `no-preference` over CDP;
  every new probe must too, or glass films its E10 off state (milky light).
- **Lightningcss drops paired prefixed declarations** (Astro builds for
  esnext, so no targets): a `-webkit-` declaration only survives alone in an
  `@supports (-webkit-...)` block. Check the built CSS, not the source.
- **A workflow agent's structured report can come back as a placeholder**
  (glass fix B): check the disk and the next critic before trusting it.
- **Agents leave `snap.mjs --hold` servers running.** Check `netstat` for
  ports 4460 to 4480 after every workflow and stop stale ones.
- **Tier fixers by what failed:** the arrival flat frame needed Opus `high`
  (the Sonnet fixer claimed a fix its own film contradicted); the vaporwave
  second round went to Sonnet `xhigh` and landed everything.
- Workflow agents see the triggering user message; say it is handled in
  every prompt. Verify every result against `journal.jsonl` and the disk.
