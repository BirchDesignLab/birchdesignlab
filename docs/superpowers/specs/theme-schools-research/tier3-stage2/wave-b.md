# Tier 3, Stage 2: wave B (cottagecore, grandmillennial, bauhaus)

Written 09-23-26 at the wave B stop. Workflow `aplus-tier3-stage2-sweep-wave-b-workflow.js`,
run `wf_7d1f069a-767`, 7 agents, none empty:

- three builders (Opus/high);
- three verifiers (Sonnet/medium);
- a critic (Opus/medium).

No fix round ran: nothing blocker or major was found.

The orchestrator checked every result against `journal.jsonl` and the disk,
and ran `npm run verify`: 331 unit tests, astro check 0 errors and 0
warnings, 440 built-site tests. The bauhaus verifier filmed nothing (it
reported static checks only), so the orchestrator verified bauhaus live from
a fresh snapshot:
- overlap 8 of 8 (worst 0.065);
- blank 39 ms at most;
- blink 4 of 4;
- no drawn suspects;
- switcher hold-still 8 of 8;
- full-frame and scrolled films opened.

Labels `stage2-bauhaus-orch*`.

Commits:
- `adeffef`: cottagecore;
- `b36a179`: grandmillennial;
- `ce4477a`: bauhaus.

## Results

| school | overlap | blank (max) | blink | switcher | verifier | critic |
|---|---|---|---|---|---|---|
| cottagecore | 12/12 | 31 ms (was 148) | 4/4 | pass | pass, live | 2 minor |
| grandmillennial | 8/8 | 45 ms | 4/4 | 8/8 | pass, live | 1 minor |
| bauhaus | 8/8 | 39 ms | 4/4 | 8/8 | static only; orchestrator live pass | 1 minor |

- **cottagecore**:
  - Item 2: the old sheet fades to the table, the table shows for a beat of
    1 to 2 frames, and the new sheet comes in opaque with a 10 px settle.
    `cottagecore-header` (a new wrapper around the valance and bar) holds
    still in-school, including on a swap clicked from the footer. The
    fireflies stay outside it and keep working.
  - The page trim: specimen paths are re-encoded losslessly. HTML is 34 to
    37% smaller, gzip about half, and all 20 stills are pixel-identical. The
    first render is unchanged, so the bytes were not the cost.
- **grandmillennial**:
  - Item 3: the No. 1 swatch is cut from the full chintz, turned and
    shifted.
  - Item 4: the drapes open from the first frame; the wordmark default with
    a 45 ms blank; a staggered in-school fade.
  - The awning blinked, so it is named `grandmillennial-header` (decision
    8).
  - One brief line still misses: "visible parting by +160 ms on dark
    desktop" is hidden by a first-draw stall of about 430 ms, the same on
    main (held item 2).
- **bauhaus**:
  - E5: balance and pretty; widows 11 to 5, the 12ch cap untouched.
  - The circle wipe starts at a 6% radius with no flat start. Ready to
    first visible change fell from 221 to 104 ms cold.
  - The wordmark default with a 39 ms blank.

## Small calls

1. **Bauhaus, the old wordmark over the new nav on a phone arrival.** For
   about 50 to 60 ms (around +333 to +366 ms, light mobile), quiet's faint
   "BIRCH DESIGN LAB" sits over bauhaus's new nav row. The images inherit
   the wordmark group's 120 ms delay, which is there so "the shape leads and
   the mark settles". Recommend: the old wordmark starts fading at once (no
   delay on `-old`); the new one keeps the delay.
2. **Cottagecore's beat of bare table** (1 to 2 frames) between the old
   sheet and the new. With the brief's tighter timing, the old billboard
   still read under the new sheet. Recommend: accept it; it reads as one
   sheet taken away and a fresh one laid down.
3. **Grandmillennial's header gradient is copied by hand** from the body's
   (a maintainability nit). Tidy it into one shared token, as cottagecore
   did. No call needed.

## The held review (the founder's four items, after wave B)

Evidence from all six schools; the critic compared them side by side.

1. **Safari.** Still untestable with the current equipment. Stays parked.

2. **The first-draw freeze follows page weight, not the dark scheme.**
   | school | longest presented-frame gap, desktop arrival, fresh browser |
   |---|---|
   | grandmillennial | 424 to 435 ms (main 423) |
   | cottagecore | 327 to 380 ms |
   | vaporwave | 234 to 307 ms |
   | glassmorphism | about 220 ms |
   | bauhaus | 86 to 88 ms |
   | swiss | under 100 ms |

   - The stalling schools draw heavy pictures: pattern fills and gilt
     (grandmillennial), 787 specimen paths and the fireflies (cottagecore),
     WebGL (vaporwave), blur and glow (glass). The flat schools do not stall.
   - Once, grandmillennial stalled about 414 ms in light, so dark is not
     required. It is worst at the largest viewport in a fresh browser.
   - Cottagecore's 37% HTML cut did not move it, so the cost is drawing the
     content for the first time, not downloading it.
   - Two ways to reduce it:
     - draw the destination ahead of time, off screen (the P4 trace's
       technique, measured at 75 to 107 ms);
     - make each heavy school cheaper to draw the first time.

3. **The wordmark dropping in after a scrolled swap has one shared cause.**
   - Every school's header scrolls away with the page. On a swap clicked
     from low down a page, the old wordmark's captured box sits above the
     viewport, so the wordmark morphs down from off screen.
   - The header sits empty for about 250 ms in every school: grandmillennial
     about +355 ms, cottagecore about +457 ms, bauhaus about +473 ms.
     Pinned named headers make the gap more visible.
   - One portal-level fix would cover all seven schools. Just before the old
     page is captured, if its wordmark is outside the viewport, the runtime
     removes the wordmark's name. The new wordmark then has nothing to morph
     from and fades in where it sits, on each school's own wordmark-in fade.

4. **Glassmorphism's plain fade is part of a wider pattern.**
   - Under Stage 2's two rules (no double exposure; chrome holds still), the
     repairs converged on one safe shape: the old page fades to the field, a
     beat, the new page comes up.
   - Glass, cottagecore, grandmillennial and swiss's in-school swaps now
     share that family. Cottagecore's arrival sits near a plain fade too.
     Bauhaus's hard wipe and vaporwave's CRT stay distinct.
   - That is the right shape for a defect fix and the wrong one for the
     transformations the founder wants next. The transitions phase starts
     from this finding: every school needs its own gesture, and glass needs
     its material one most.
