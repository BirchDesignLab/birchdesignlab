# Handoff · 08-18-26

Session: BDL-005 specimen refresh, sitewide reading-measure pass, BDL-007
specced and planned. PRs #23, #24, #25 all merged; main is clean and
deployed.

## What shipped today

- **PR #23 — BDL-005 specimen refresh + reading measures.** Production
  screenshots (real domain in the live-app header, room URL blurred), new
  trivia-console and Studio-readiness shots, front-facing showcase frame,
  founder copy pass (em dashes out, waitlist and gaming-commission
  paragraphs cut, exact LOC: 19,947). New tokens `--measure` (80ch) and
  `--measure-wide` (105ch) replaced the hardcoded 44-68ch caps sitewide.
- **PR #24 — fixes on #23's fallout + BDL-007 spec.** Study prose
  centering restored (the full-wrap experiment was walked back same day:
  "turned the knob too far"; the keeper is `--measure-wide` centered by
  `.wrap`), Built-with chips contained, alignment triage on home,
  services, and contact (intros widened, tiny display-heading ch caps
  dropped, contact fine-print de-duplicated).
- **PR #25 — the working-specimen mark went vertical.** The horizontal
  accent bar read as an em dash. Now a 2px upright tick in three places:
  catalog cards, home Lab preview, study-plate living-specimen link. One
  grammar: the green tick marks what is alive.

## Screenshot pipeline (new, reusable)

- C&C repo `scripts/screenshots/sweep-live-shots.mjs --base
  https://cheerandchatter.com` shoots production (headed Chrome; night
  state is browser-local, production is safe).
- This repo: `scripts/import-specimen-shots.mjs` (crop toast/scrollbar,
  blur the room URL, place into `src/content/lab/bdl-005/`) then
  `scripts/compress-specimen-images.mjs` (lossy palette, ~4x smaller).
- Uncommitted in the C&C repo: `--event` flag on record-showcase.mjs,
  `--headed`/size flags on shoot-bdl-card.mjs. Fold into that repo's next
  commit.

## BDL-007 · The Shining Tree — ready to execute

Spec and plan are on main (see lab-backlog "In flight"). Execution not
started; approach (subagent-driven vs inline) not yet chosen by the
founder. Facts already verified so nobody re-derives them: glb material
names are `canopy`, `stone`, `peel-outside`, `peel-underside`,
`moss-star`, `lichen-crust` (living set matches `/moss|canopy|lichen/i`);
three stable is 0.185.1; the draco glb and the transparent front-on still
live in the C&C repo (`public/models/bdlOrganic.draco.glb`,
`public/icons/bdl-model-still.png`).

## Loose ends

- **Brand-cream vitest failure** predates today and persists on main:
  `8a-mark-day.svg` fills with `--bark-white` (#f5f1e8) but the
  brand-assets test allowlist only has `--bark-warm` (#f4f0e6). Brand is
  LOCKED, so which cream is canonical is a founder call. A task chip was
  spawned for it.
- **Pokemon night**: exists as a Studio theme with content (151 caller
  items, playable), but no event document in Sanity yet. The specimen
  copy names Harry Potter Bingo instead; add Pokemon when the event is
  real.
- **C&C sponsor slide**: the break-screen rotation is interstitial, club
  card, BDL card, venue-thanks card. The BDL card IS the sponsor card.
  No separate sponsor slide exists in the code path.
