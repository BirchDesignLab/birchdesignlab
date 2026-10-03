Task 3 done: see commit. verify green (vitest, astro check, build, dist tests). Sheets: scripts/themes/.out/stage4/task-3/ (GPU RTX 3070, 5 sizes x light/dark x 4 pages, probes.json).

## Fix round 1
- C1/film:rotated-birch: About.astro --sw-tx per width cut; ink delta vs frame now within 1px at 1920-640 (measure-birch-ink.mjs).
- C2/film:home-composition: Home.astro stacked door rule scoped to max-width 639.98px; doors 0px rule/padding from 640 up (probe-doors.mjs).
- C3: About.astro manifesto keeps .sw-lead size from 1024 (overrides removed).
- verify green.
