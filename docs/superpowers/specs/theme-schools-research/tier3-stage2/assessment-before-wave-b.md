# Tier 3, Stage 2: where we stand before wave B

Written 09-23-26 after the wave A follow-up, at the stop the founder asked
for ("do the wave A follow up then stop to assess where we stand before wave
B"). Branch `feat/theme-schools-tier3-stage2`, nothing pushed.

## Done

| step | agents | result |
|---|---|---|
| Step 0, baseline | 0 | HEAD verify clean; 48 before strips |
| Step 1, P5 proof | 4 | Astro's layered 180 ms fade found and overridden; the wordmark default proved on cottagecore and quiet (`p5-proof.md`) |
| Wave A | 10 | vaporwave E1, E2, floor, fonts; glassmorphism E15; swiss item 10; judge hardened (`wave-a.md`) |
| Wave A follow-up | 9 | swiss and glass headers hold still in-school; vaporwave light power-on, light tear and preserveDrawingBuffer; swiss's scrolled-swap overlap caught and fixed |

That is 23 agents in all. Every result was checked against its
`journal.jsonl` and the manifests on disk.

`npm run verify` is clean after the follow-up: 331 unit tests, astro check
0 errors and 0 warnings, 440 built-site tests. The render lock's race test
passes (three contenders, strictly in turn).

Final verdicts for the three schools:
- the wordmark never overlaps;
- the blank is at most 35 ms (vaporwave), 59 ms (glassmorphism) and 0 ms
  (swiss);
- no blink, and no drawn suspects;
- the switcher holds still in 8 of 8 per school.

## What wave A taught (carried into wave B's prompts)

1. **Named chrome has three traps, now in the README.**
   - Pinning with `animation: none` alone can add both pictures (bolder
     type).
   - A backdrop-filter on a captured element strips Chrome's subpixel text,
     and the switcher then fails hold-still.
   - Non-sticky chrome shows its new picture over a scrolled old page.

   Cottagecore names its header in wave B (item 2), and grandmillennial may
   name its awning. Neither header is sticky and neither blurs, so the third
   trap applies. Every named-chrome lane films `probe-scrolled-swap.mjs`.
2. **Sonnet verifiers found nothing in six lanes; the Opus critic found
   every real major.** Those were swiss's clipped wordmark, swiss's
   vanishing nav, and swiss's scrolled overlap. The verifiers did re-film
   and confirm the verdicts, which has value, but they did not find new
   faults. For wave B:
   - the verifier gets a fixed list of adversarial cases: a scrolled swap,
     the header crop, the phone first, and every "before" it compares
     against;
   - the critic stays Opus;
   - the tiering rule (verify seats Sonnet/medium) is kept.
3. **Agents wrote probes in the session scratchpad.** They are now in
   `scripts/themes/harness/`. Wave B's prompts name that folder as the only
   place for scripts.
4. **Iteration is real work.**
   - Glass took four rounds to find the underlay.
   - Swiss took three rounds to pin its header without bold type or a
     blinking link.
   So a lane that looks "done" in one round deserves suspicion.

## Wave B, as planned (7 agents, up to 13)

- **cottagecore** (port 4464):
  - item 2: an opaque new sheet with a small lift replaces the page turn;
    `cottagecore-header` is named in-school only, per the README, with the
    scrolled-swap background;
  - tune the wordmark blank from about 148 ms to 80 ms or less;
  - the 337 KB page: cut structurally, with pixel-identical stills as
    acceptance;
  - the fireflies are protected.
- **grandmillennial** (port 4465):
  - item 3: the No. 1 swatch clips the full chintz;
  - item 4: (a) the drapes start at `inset(0 47%)` on a decelerating curve;
    (b) the wordmark default and its blank; (c) the staggered in-school
    swap, naming `grandmillennial-header` if the awning blinks (founder
    decision 8).
- **bauhaus** (port 4466):
  - E5: `text-wrap` balance and pretty; the 12ch cap is not widened
    (decision 9);
  - the circle wipe gets a visible first frame;
  - the wordmark default and its blank.
- **Contrasting schools for `--from`:** cottagecore from vaporwave;
  grandmillennial from swiss; bauhaus from swiss.

## After wave B (Step 4, unchanged)

1. The gates on a fresh Worker build:
   - `npm run verify` and `smoke.mjs --contact`;
   - hold-still at desktop, mobile and phone;
   - the `--unname-switcher` negative control;
   - the wordmark judge for all six schools and quiet;
   - 48 after-strips and before/after sheets;
   - `trace-arrival.mjs`.
2. A review panel (up to 11 agents).
3. `stage2-report.md`, then the founder's stop.

## Open, small

- **Swiss's header band on a scrolled swap.** The new header carries the
  bare field, so the faint column guides vanish from that band for the
  swap (about 650 ms). Recommend accepting it: the guides go at pair stage
  4 (swiss item 2).

## Growing list for the transitions phase

- Safari/WebKit filming (the founder saw stutter on the phone).
- Dark-desktop first draws stall, with no frames presented for 200 to
  400 ms: vaporwave, cottagecore, and glass (whose dark orb glow and blurs
  are likely suspects). The off-screen draw is the real fix.
- On a swap clicked from low down a page, the wordmark slides in from above
  the viewport (its old box was scrolled away), in every school. Vaporwave's
  taskbar shows an empty Start slot for about 200 ms meanwhile.
- Glass's swap is a correct but plain fade; its material choreography is
  still to design.
