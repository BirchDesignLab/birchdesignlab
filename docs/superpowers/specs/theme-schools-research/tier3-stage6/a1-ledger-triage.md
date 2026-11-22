# Stage 6 A1: Stage 5 ledger triage

Sonnet `medium`, read-only, 11-19-26. Code evidence only (no renders);
lines are the tree at a21248e. Source: `docs/private/stage5-ledger.md`.

**Finding:** B1 task 6 and B2 task 6 cleared every cottagecore item and the
B1 items they named; the deferred minors from B1 tasks 1, 3, 4 and 5 were in
no fix task. Proof and evidence records are moot.

## Live, for the wave (grandmillennial)

| Ledger ref | Item | Evidence | Fix |
|---|---|---|---|
| B1 T5 C6 | Hover rules outside `(hover:hover) and (pointer:fine)` | Header.astro:178, Footer.astro:100, Home.astro:389 (shares :focus-visible), theme.css:289 | Gate each; split Home's rule so focus stays ungated |
| B1 T5 C5 | Tassel tug has no press phase | Header.astro:249-269 | Small fixed pull on pointerdown, track on move, spring from there |
| B1 T5 rc1-N1 | Tug target about 20px wide, 761-1100 | Header.astro:138-139, :190; hit rect :31 | Hit area at least 24px |
| B1 T3 C8 | Phone nav tracking 0.1em (brief 0.14-0.16) | Header.astro:191 | 0.14em, check fit at 390 |
| B1 T4 C3 | Home frame shrinks between 1101 and about 1257 | Home.astro:120 vs :413 | Make the frame width monotonic across 1100; match plate aspect |
| B1 T4 C5 | All eight plates inlined, half always hidden (Home 154 KB) | Home.astro:21-48, :140, :420 | Shared symbol via `<use>`, or one set per width; measure |
| B1 T3 N1 | Chintz frame runs end in half roses | Framed.astro:16-19, Defs.astro:125 | Whole cells per run, or centre the pattern under the corner knots |
| B1 T3 N2 | Lone third specimen card 861-999 and 561-699 | Home.astro:344, :433 | Explicit columns per breakpoint (UNSURE until rendered) |
| B1 T3 C5 | Contact envelope centred, 143px wall bands | Contact.astro:84 | `align-items: start` |
| B1 T3 C6 | Chintz border costs about 50px at 390; column steps | Framed.astro:91-93 | Equal outer widths at phone (UNSURE magnitude) |
| B1 T3 C7 | Services lede gap 12% tighter, brief said 30% | Services.astro:70 | Trim the room's top padding |
| B1 T4 rc1-N1 | Home canopy height hand-fitted, untested | Header.astro:206 | Probe or test asserting the heights match |
| B1 T1 r2-N4 | Canopy swap image sized 100vw incl. scrollbar | theme.css:649-650 | Size to match body::before; low priority |
| B1 T1 C3 | Chintz tile inline, +13 KB raw a page | Defs.astro:122 | Optional trim; measure |

## Possible founder calls (taste)

- B1 T3 C9: Contact has one frame type; the brief's ribbon-tape or pinked
  frame was never added. Add a third frame, or drop the brief item.
- B1 T1 r2-N3: the dark ramp darkens the awning's gilt piping at the top
  edge. A look, otherwise leave.
- The rosette's short tails (carried): the code has two 45-unit tails since
  B2 task 6; render Services and judge ribbon versus stubs.

## Unsure until rendered

Specimen orphan (561, 650, 699, 861, 900, 999); Contact column widths at
390; half roses at 820, 1024, 1440; the B1 task 6 bird fixes at 820 and
390; the canopy match under a fallback font.

## Fixed or moot

Cottagecore: all (header wrap, dead rules, postmark bands, textarea rule,
focus ring, tape over label, stale comments, fx resize sweep, seed linger,
fonts-ready sweep, fan test, the answered calls). Grandmillennial: Contact
strip above the valance, `.trust` dark shadow, Greek key, duplicate
contrast pair, About weight, bird perch and tap, the answered B1 calls,
the oval's wire, the phone alphabet. Moot: proof records, edit scripts
(deleted in 5dbe5b0), evidence-gap and bytes-not-recorded items, the
documented dark toile ground.
