# Proof a6: cottagecore, dandelion floaters by day and fireflies that flash (item 12, Stage 1 note, S3)

Shared rules: `a-common.md`. Task name for paths: `cc-floaters`.

**Question.** Can the light scheme gain dandelion seeds as the daytime
counterpart of the dark-mode fireflies (founder, Stage 1: "maybe we can do
dandelion floaters for the day mode?"), with the fireflies' burst flash
(item 12) and both answering the pointer (S3, founder answer to item 14),
without touching what the founder likes about the fireflies?

**Make.** A proof copy of `src/themes/cottagecore/fx.ts`
(`scripts/themes/proofs/stage5-cc-floaters/fx.ts`) injected over the frozen
build, written so Tier B can replace `fx.ts` with it:
- **Fireflies (dark, protected):** count, colour, halo, text avoidance and
  the whole lifecycle unchanged (theme guard, `data-scheme` observer,
  hidden-tab pause, DPR cap 1.5, 30 fps throttle, sprite-cached halo,
  teardown). Only the pulse changes, per item 12: bursts of 2 to 4 flashes
  (120 to 180 ms rise, 250 ms fall, about 500 ms apart), then 4 to 8 s dark;
  per-mote count and phase, never synchronised; peak core alpha toward 0.6.
- **Dandelions (light only):** pappus seeds (hairline stalk, a parachute of
  radiating filaments, a small seed body) in ink-brown at low alpha, sprite
  cached. About 8 on desktop, 4 on phones. Each on its own clock: drifting
  up and across on a slow breeze with a gentle sway and turn, an occasional
  gust; they fade off text blocks like the fireflies and never cross body
  text; they live over the cloth and under the sheets (D7 (a)).
- **Pointer (S3):** a seed drifts away from a passing cursor or a tap; a
  tapped or hovered firefly flashes. Pointer handling is passive and cheap
  (one listener, no per-move layout reads).
- Item 14's bookkeeping: text rects in document space once on mount and on
  debounced resize; the draw subtracts `scrollY`; no per-scroll
  `getBoundingClientRect` sweep.
- Specimens never move: nothing in the page's drawings animates.

**Capture.** Timestamped strips: dark Home 1440 and 390 (flashes visible in
some frames, several dark motes in others, never all lit together); light
Home and About 1440 and 390 (seeds drifting, none over body text); a pointer
strip for each. A CPU and frame-time note (DevTools performance or
`requestAnimationFrame` timing) against today's fireflies.

**Answer to give.** The proof `fx.ts` ready to lift, the numbers used, the
strips, and the cost note.

**Owns.** `scripts/themes/proofs/stage5-cc-floaters/**`,
`scripts/themes/harness/stage5-cc-floaters-proof.mjs`,
`docs/superpowers/specs/theme-schools-research/tier3-stage5/proofs/cc-floaters.md`.
