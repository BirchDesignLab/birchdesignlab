# B2 task 5: cottagecore fx: the firefly flash, the dandelions, the pointer, cheaper bookkeeping (items 12, 14; D7; the Stage 1 note; S3; Tier A call 8)

Shared rules: `b2-common.md`. Brief items 12 and 14, decision D7 (a), the
founder's Stage 1 note (`../../tier3-briefs/stage0-decisions.md`), S3.

1. **Lift the proof** (`../proofs/cc-floaters.md`,
   `scripts/themes/proofs/stage5-cc-floaters/fx.ts`) into
   `src/themes/cottagecore/fx.ts`: the fireflies' burst flash (otherwise
   unchanged: count, colour, halo, drift, text avoidance and the whole
   lifecycle), the dandelion seeds by day, both answering the pointer, text
   rects in document space with no scroll sweep.
2. **The seeds were timid** (Tier A call 8): about 1.5 times larger, a
   little more ink, and two or three always on the first phone screen at
   390 (spawned or seeded into the visible cloth, over the cloth and under
   the sheets, never over body text). At 1440 they read at a glance in a
   whole-page view without crowding.
3. **The proof's deferred minors:** resize is debounced only (no synchronous
   sweep on every resize); a main-thread stall does not wipe in-flight
   bursts (re-stagger only after a real pause such as a hidden tab); the
   text padding covers the halo's peak radius, and the text-overlap measure
   counts the halo, not only its centre.
4. **D7 (a), documented:** the canvas stays over the cloth and under `main`;
   say so in `fx.ts`'s header comment.
5. **Cost:** frame time and CPU against today's fireflies, recorded in the
   report (the proof's method). Zero layout reads while scrolling.

**Films:** dark Home at 1440 and 390 (flashes in some frames, dark motes in
others, never all lit together); light Home and About at 1440 and 390 (seeds
drifting, two or three on the first phone screen, none over body text); the
pointer (a cursor pass at 1440, a tap at 390) in both schemes; an in-school
swap and a scheme toggle (the canvas tears down and rebuilds cleanly, no
console errors).
