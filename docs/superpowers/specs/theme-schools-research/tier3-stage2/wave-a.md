# Tier 3, Stage 2: wave A (vaporwave, glassmorphism, swiss)

Written 09-23-26 at the wave A stop. Workflow `aplus-tier3-stage2-sweep-workflow.js`,
run `wf_4dc64378-1d2`, 10 agents, none empty:

- T, tooling (Opus/high);
- three builders (Opus/high);
- three verifiers (Sonnet/medium);
- a critic (Opus/medium);
- a swiss fixer (Opus/high) and its re-check (Sonnet/medium).

The orchestrator checked every result against `journal.jsonl` and the
manifests on disk, re-ran the wordmark judge (exit 0) and both self-tests,
and ran `npm run verify`: 331 unit tests, astro check 0 errors and 0
warnings, 440 built-site tests.

Commits:
- `8401cd3`: the judge and the lock;
- `6c39a30`: vaporwave;
- `c875b0d`: glassmorphism;
- `af06655`: swiss.

## Results

| school | wordmark overlap | blank (max) | blink | drawn | switcher hold-still | verifier | critic |
|---|---|---|---|---|---|---|---|
| vaporwave | 8/8 | 35 ms | 4/4 | 12 checked, 0 suspect | 8/8 | pass | 2 minor |
| glassmorphism | 8/8 | 59 ms | 4/4 | 12 checked, 0 suspect | 8/8 | pass | 1 minor |
| swiss | 8/8 (12/12 re-check) | 0 ms | 4/4 | 12 checked, 0 suspect | 8/8 | pass | 2 major, 1 fixed |

- **vaporwave**:
  - E1: no white hero, no red sky or green sun, one tear band.
  - E2: scrollWidth equals the viewport at 390, 1024, 1280 and 1440.
  - The floor runs to the page bottom.
  - Exo 2 and VT323 are preloaded (cap four). That is 57.5 KB the page
    already fetched, now fetched before the swap.
  - Cold first render 150 to 89 ms; first visible change 239 to 173 ms.
- **glassmorphism**: E15. No blur and no double headline. Both swaps now
  fade through the field (83 ms out, 250 or 275 ms in, from +60 ms).
- **swiss**:
  - Item 10: panels clear to the bare field, hold, then lay. No frame mixes
    two sheets' type.
  - The wordmark is a one-step swap at 345 ms, top-anchored so quiet's
    taller wordmark is never cut off (the critic's first major, fixed).

Sheets: `scripts/themes/.out/stage2-{vaporwave,glassmorphism,swiss}-compare/`.

## Open for the founder

1. **Swiss's nav, and glass's header, on in-school swaps** (the critic's
   second swiss major). Swiss's panels now clear and re-lay the header nav
   with the page: on phones the links are gone from about +308 to +656 ms.
   At HEAD the nav looked still. Glass's header bar dips toward the field
   for about 2 frames. The fix is the S2 contract: name the header
   `swiss-header` and `glassmorphism-header`, in-school only, so it holds
   still. Cottagecore does the same in wave B.
2. **Vaporwave's light CRT power-on** whites the pastel page out from about
   +360 to +600 ms. It did on HEAD too. It fails "no white frame", but the
   CRT arrival is protected. Option: a light-only `vw-crt-on` with lower
   brightness through the opening, keeping the beam line and the timing.
3. **Swiss desktop pacing.** Six panels cannot go one per beat at 90 to
   110 ms within the ~700 ms cap (that would take about 960 ms), so desktop
   lays them in four uneven beats (1, 2, 1, 2). Phones go one per beat.

## Small follow-ups (no call needed)

- Vaporwave light: the tear band and the skew slivers show the dark
  `#07011a` view-transition background as a dark band for 60 to 180 ms.
  Make that background follow the scheme.
- Vaporwave: `preserveDrawingBuffer: true` may be redundant now that the
  context outlives the swap. It costs a buffer copy every frame; drop it if
  the strips hold without it.

## Deferred (pair stages or the transitions phase)

- Glass's swap is a plain fade through the field: correct, but nothing
  glass-specific. The material choreography waits for the transitions phase
  (E15's scope).
- Dark-desktop first draws stall. Vaporwave: no frames presented for 234 to
  307 ms in a fresh browser. Glass: about 220 ms of first raster, likely the
  dark-only orb glow plus the blurs. Transitions phase (the off-screen
  draw), or a glass first-frame pass.
- Vaporwave's kiosk and lobby tile, E4 to E15, and F1 to F6: pair stage 3.
- Swiss draws its column guides in the new sheet during the lay phase; its
  item 2 removes them. Pair stage 4.
