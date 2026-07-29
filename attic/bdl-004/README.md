# Attic: BDL-004 · The Loom

Retired from the site 2026-07-29 by founder call: the build is complete and
tested but the founder judges it visually unacceptable, and a redo is unlikely.
Kept whole rather than deleted in case that changes.

What lives here (paths as they were in the repo):

- `experiment/` — was `src/experiments/bdl-004/` (TheLoom.svelte, ClothCanvas,
  DraftPanel, TreadleBar, YarnShelf, data/{yarns,presets}.ts)
- `weave/` — was `src/lib/weave/` (draft, stripes, daily, render2d, export,
  schema)
- `tests/` — was `tests/weave-*.test.ts` (7 files); excluded from the vitest
  run because `vitest.config.ts` only includes `tests/**`
- `bdl-004.md` — was `src/content/lab/bdl-004.md` (the catalog entry)

To resurrect: move the four pieces back to those paths, re-add the `BDL-004`
entry to `src/experiments/registry.ts`, and fix the relative imports if any
paths shifted in the meantime. Spec and plan remain in
`docs/superpowers/{specs,plans}/2026-07-16-bdl-004-the-loom*`.

The BDL-004 designation stays burned — a future experiment takes the next
number, per the numbering note in `docs/lab-backlog.md`.
