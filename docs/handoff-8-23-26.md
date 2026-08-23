# Handoff · 08-23-26 · launch-prep sweep

A long session, ~9 days out from the 09-01 launch. It opened with a full
repo critique, corrected a stale-local mistake mid-stream, then shipped a large
batch of launch-blocker, performance, accessibility, and test work. `main` is
clean and every PR below is merged. The remaining launch work is founder
territory (copy, testimonial, two design calls) plus a real-device pass on the
WebGL/perf changes.

## What shipped (PRs merged this session)

- **#51 — strip provisional/first-draft markers + ship gate.** The
  `<!-- first-draft copy -->` / `<!-- provisional copy -->` markers were HTML
  comments, which Astro's `compressHTML` passes through verbatim, so they shipped
  into production view-source on 7 pages. Removed all 8; added
  `tests/no-draft-markers.test.ts` so `vitest run` fails if any reappear.
- **#54 — deploy.md reconcile.** The runbook still described the contact form as
  stashed, mailto-only, and paid-plan-gated, and told the reader to `git stash
  pop` a stash that no longer exists. Reconciled to the shipped reality (live +
  free via the verified Routing destination; www redirect done; analytics = GA4).
- **#55 — contact Worker hardening.** Sanitize `name` before it reaches the email
  Subject header (control chars collapsed; header-injection guard), and set
  `Referrer-Policy` + `X-Frame-Options` on all five Worker responses via one
  `secure()` helper (`_headers` does not apply to Worker output).
- **#56 — immutable model caching.** The 3.2MB glb moved into
  `src/experiments/bdl-007/` and is imported via `?url`, so Astro emits it into
  `/_astro/` under a content-hashed name and it inherits the existing
  `/_astro/* immutable` rule. A re-export self-invalidates under a new hash. The
  Draco decoder stays in `public/draco/` (DRACOLoader needs a directory) with a
  bounded `max-age` + `stale-while-revalidate` rule. This is the "cache headers"
  pickup that had been carried across two handoffs.
- **#57 — label the hero bark as BDL-001.** A hairline smallcaps credit on the
  home hero ("BDL-001 · The Bark Engine, live" → /lab/bdl-001), naming the live
  generative field a visitor otherwise reads as a texture.
- **#58 — font CLS via metric-matched fallbacks.** Added `fontaine`
  (build-time devDependency) to generate a `<Family> fallback` `@font-face` sized
  to the real font's metrics, so the billboard (Marcellus, the LCP text) no longer
  reflows when it swaps in over Georgia. Note: our families are referenced through
  CSS custom properties, which fontaine's usage-rewriter does not touch, so the
  generated names (`Marcellus fallback`, `Spectral fallback`) are inserted into the
  `--font-*` stacks in `tokens.css` by hand.
- **#59 — bdl-007 GPU.** Pixel ratio capped at 1.5 (was 2; ~44% fewer pixels on
  hidpi), and the ambient state (breath, fireflies, idle yaw) throttled to 30fps
  while active interaction stays 60fps.
- **#60 — bark pause off-screen/hidden + 30fps.** BarkField had no pause path: it
  repainted the full-viewport hero at 60fps even when scrolled past or the tab was
  hidden, competing with scroll compositing (the "scroll lags" report). Added an
  IntersectionObserver + visibilitychange pause and a 30fps cap. Applies to home,
  About, and /contact/sent (one shared component).
- **#61 — contact Worker tests.** `tests/contact-worker.test.ts` drives the
  exported fetch handler with a mocked env and asserts every branch (valid, honeypot,
  400, 429, 502, 405, trailing slash, non-form, subject sanitization, ASSETS
  delegation) plus the security headers. The launch-critical path had zero tests.
- **#62 — distinct OG cards for lab experiments and studies.** Every `/lab/<slug>`
  shared one generic card. Added `lab-experiment` and `lab-study` cards, resolved
  by the layout (ExperimentLayout / StudyLayout pass an `ogImage` override through
  HeadCommon to Seo, since a pathname can't reveal the type). Scoped to two
  category cards, not one-per-experiment (founder call).
- **#63 — bdl-007 correctness batch.** The gltf teardown leak (decoded model
  dropped without disposal if teardown won the loader race — now disposed via a
  shared `disposeObject3D`), live reduced-motion (MediaQueryList + change listener
  instead of a one-time boolean), and keyboard control (arrows turn, +/- zoom,
  Home/0 reset; canvas focusable, `role=application`). Four adversarial-review
  fixes folded in (see Traps).

## How the session started: the critique, and a stale-local correction

The session opened with a six-dimension repo critique (a parallel-reader
workflow: code, docs/memory, showcasing, content/UX, launch/perf, and the cache
task). Most of the work above came out of it.

**A correction to record.** The critique ran against a local `main` that was 9
commits behind `origin`. It reported analytics as "beacon absent / launch-day
traffic at risk" — wrong: GA4 had already shipped (PR #52, prior session). The
method was fine; the stale checkout produced a confidently-wrong finding. Lesson,
now in memory: `git fetch` and compare HEAD to `origin/main` at the START of any
scan or critique, not only before branching.

## Analytics: GA4 only (reaffirmed 08-23)

`src/components/Analytics.astro` runs GA4 (`G-44Y71C24L7`), prod-gated and lazily
loaded after idle so Lighthouse holds; the global `gtag` is exposed so Google Ads
can share the tag. Cloudflare Web Analytics and TWIPLA were considered and
deferred — one vendor until there is a reason for more. The founder reaffirmed
GA4-only this session. Cloudflare's zone-level analytics (server-side, no beacon)
is harmless if on; what is NOT added is any CF beacon script.

## Performance / GPU (founder-flagged)

The founder noticed bdl-007's GPU draw and, separately, that scrolling lagged
after leaving and returning to the site. Both addressed:

- **bdl-007** (#59, #63): pixel ratio 1.5, ambient 30fps, plus the correctness
  batch. It already paused fully when off-screen or the tab is hidden.
- **BarkField** (#60): the scroll lag was **not a memory leak** (the renderer
  guards against double-loops via `start()` calling `stop()` first, and listeners
  are cleaned up). It was continuous off-screen rendering. Now paused off-screen /
  hidden and capped at 30fps. If post-return lag persists on a real device, the
  next suspect is WebGL context-loss: bdl-007 recovers from a lost context, the
  bark renderer does not yet (a follow-up).

## Traps and patterns worth carrying forward

1. **The preview pane cannot composite WebGL.** Screenshots of the 3D stage or
   the bark field time out ("Browser pane is not displayed, so the page is not
   compositing frames"). WebGL visuals and GPU cost can only be verified on a real
   device (real Chrome via `scripts/lab/`, or a founder eyeball). Build-inspection
   (bundle references, dist layout, generated CSS) verifies everything that lives
   in the build; runtime rendering does not.
2. **For code you cannot runtime-verify, substitute an adversarial review.**
   The #63 WebGL changes were implemented then run through a four-lens parallel
   review workflow (disposal, reduced-motion, keyboard, regression) before the PR.
   It caught three real bugs that would otherwise have shipped: a modifier-key
   hijack (Ctrl/Cmd +/-/0 and Alt+Arrow captured, breaking browser zoom and
   history for keyboard users), a nudge-during-reset dead key, and a
   reduced-motion listener that leaked if the renderer constructor threw.
3. **Edit/Write and JSON escapes.** Writing a `\uXXXX` (or `\n`, `\r`, `\t`)
   escape into Edit/Write content decodes it to a real byte and corrupts source
   (a control-char regex became a binary file, twice). Use `\x00-\x1f\x7f` hex
   escapes for control-char classes; they pass through because they are not JSON
   escapes. In memory as well.
4. **The bdl-007 page is a single viewport.** `scrollHeight === innerHeight`, so
   there is nothing to scroll to. A "wheel-scroll trap" fix was implemented and
   then dropped (#56) because it only disabled wheel-zoom-before-grab to prevent a
   trap that does not exist on a non-scrolling page.
5. **fontaine + CSS custom properties.** fontaine generates the metric-matched
   `@font-face` from the `@fontsource` `@font-face` rules, but it rewrites literal
   `font-family:` declarations only — not CSS custom properties. Since the site
   references faces via `--font-billboard` etc., the generated fallback names had
   to be inserted into those stacks in `tokens.css` by hand.
6. **The glb caching rail.** `?url`-importing an asset lands it hashed in
   `/_astro/`; that is the durable cache path for anything that would otherwise
   sit at a fixed public path and revalidate every visit.

## Open threads for the next session

**Founder territory (the real remaining launch-blockers):**

1. **#5 home copy-lock.** The hero opener + subline, the closer lead ("Ready when
   you are."), the /lab intro, and the /contact/sent body are the last provisional
   copy. Founder's words.
2. **#8 testimonial.** The Cheer & Chatter client cleared publishing; the founder is
   editing the text (pulling their own name out, grammar). When it lands, place one
   pull-quote on the home page (near the "From the lab" band) and one on the BDL-005
   study. The client can be named; the founder cannot.
3. **#12 home service "doors".** The Software / Websites blocks are not clickable.
   The founder previously had per-door links and disliked them, so this is a design
   decision, not a mechanical wiring job.
4. **#11 contact right-hand column.** The known-open design note (empty right column
   on desktop; no on-page trust signals). Circle-back.

**Verification (device):** merge is done; on a real phone/laptop confirm the
bdl-007 keyboard path (Tab to the hero, arrows/zoom/reset), the home/About scroll
after leaving and returning (no lag), a Lighthouse run on the home page (CLS ~0,
Performance 100), and the lower bdl-007 GPU draw.

**Deferred, tracked:** per-experiment OG art (category cards shipped instead);
BarkField WebGL context-loss recovery (only if post-return lag persists);
bdl-007 flick momentum still assumes a 60Hz pointer cadence (coasts ~half on a
120Hz device) — the one item from the old "still open" list not closed this
session.

## Housekeeping

- The `docs/bdl-ar-card-prompt-pack-v3.md` and `-v4.md` files are intentionally
  left untracked (founder direction; future work, not this session's).
- The CLAUDE.md change shipped alongside this handoff: the zettelkasten path
  corrected to `C:\vault\zettelkasten\birchdesignlab\`, and a now-redundant
  branch-ceremony override line removed.
- Workflow unchanged: branch + PR for everything; merging to `main` deploys via
  Workers Builds.
