# Stage 5 Tier B, wave B1 (grandmillennial): rules shared by every task

Read with your own task brief (`b1-1` to `b1-5` in this folder).

**Binding, in order:** `../stage5-decisions.md` (all its "Answers"
sections), `../tier-a-report.md` ("Answers": the founder took every call),
`../../tier3-briefs/stage0-decisions.md`, then
`../../tier3-briefs/grandmillennial.md` (the items your task names). The
proofs in `../proofs/` (`gm-toile.md`, `gm-walls.md`, `gm-chinoiserie.md`)
say exactly what to lift; their critics' deferred minors are listed in
`scripts/themes/.out/stage5/ledger.md` (Tasks 1 to 3) and are yours to fix
when you lift that code. `src/themes/README.md` holds the school contract.

- **Character is protected.** The founder: this school is "absolutely selling
  what we can do". The brief's section 2 ("Protect") is binding: the awning
  and valance, the Home hero concept, the palette and text tokens (only the
  `--c-*` pattern inks move), the type trio, the chintz repeat, the Lab
  band, the sample book, the Contact desk, About's sampler, oval, drop cap
  and letter frame, the footer cartouche, the interaction marks. Raise,
  never repaint.
- **Fixed by contract:** copy (word parity: no visible word added, removed
  or changed), link targets, page set, Contact form fields and behaviour,
  the portal head and switcher, exactly one cross-school
  `transition:name` (the header wordmark). Everything visual is open.
- **Do not regress Stage 2:** the drapes part from frame one on arrival
  (`gm-drapes`, 640 ms), the staggered wordmark pair, the in-school
  staggered swap, `grandmillennial-header` held still in-school. Whenever
  your task touches layout or the header, film an arrival through the real
  switcher and an in-school swap at 1440 and 390 and compare with the
  baseline snap (`stage5-base`).
- **No reduced-motion work** (S1); critics do not flag it. No `fx.ts`, no
  background runtime cost: grandmillennial stays static apart from
  interactions and the protected transitions.
- **Interactables** (S3, and the founder's 10-03-26 answer: every
  interactable is in scope). One that does something is a real control
  with an `aria-label`; one that does nothing is `aria-hidden` and not
  focusable. Hover rules inside `@media (hover: hover) and (pointer: fine)`;
  touch works too. No visible label text.
- **S5:** grandmillennial owns counted cross-stitch lettering, and keeps
  bows (trimmed per decision C).
- **Patterns:** walls and swatches never show a tile row or seam at 1440;
  text never sits on pattern (it sits on `--field-raised` cards, and in dark
  a card must read as raised on its wall, not sunk: the a1 critic's C5).
- **Contrast:** every token or layering change updates `meta.ts` contrast
  pairs, and `npm run verify` checks them in both schemes.
- **Weight:** large SVG art (the toile, the chintz wall, the chinoiserie
  scene) loads as external files the browser caches (per scheme where the
  ink differs), never inlined on every page. Record the bytes per page
  before and after in your report.
- **Every review size** (1440, 1280, 1024, 820, 390), light and dark.
  Whole-page before and after sheets against `snap-stage5-base`.
- **Do not polish copy-dependent line breaks** (the copy pass comes later),
  except where the brief names one (item 9's tagline plaque).
- No em dashes in anything a visitor reads.
