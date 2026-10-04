# Stage 4 Tier A proofs: rules shared by every proof task

Read with your own task brief (`a1` to `a5` in this folder). Decisions:
`../stage4-decisions.md` (binding), then `../../tier3-briefs/stage0-decisions.md`,
then the school brief (`../../tier3-briefs/swiss.md` or `bauhaus.md`) and its
dossier (`../../dossiers/<school>.md`).

- **Nothing under `src/` changes.** A proof answers a question at sheet scale
  so Tier B can build with confidence. Proof styles and markup are injected
  into a frozen build (the Stage 3 pattern: `scripts/themes/proofs/stage3-palette/`
  and `scripts/themes/harness/stage3-palette-proof.mjs`, written up in
  `../../tier3-stage3/proofs/palette.md`). Write the variant CSS so Tier B can
  lift it into `theme.css`: every rule under `html[data-theme='<school>']`.
- **Build once, inject, capture.** Freeze the current site with
  `node scripts/themes/snap.mjs --name stage4-base --port <your port> -- <cmd>`
  (or `--reuse` if `scripts/themes/.out/snap-stage4-base/` already exists), inject
  the variant with Playwright `addStyleTag` / `addScriptTag` or page
  `evaluate`, and capture. GPU Chromium (`BDL_GPU=1`), the renderer string
  saved as `renderer.txt` beside the images.
- **Sizes:** 1440, 1280, 1024, 820 and 390 unless the task names fewer; light
  and dark. Phones at 2x device scale.
- **Images** go to `scripts/themes/.out/stage4-proofs/<task name>/` with an
  `index.md` listing every image and what it shows. Founder sheets: a few
  stitched JPGs a person can read at a glance (`contact-sheet.mjs`,
  `harness/grid-sheet.mjs`).
- **Write-up:** `docs/superpowers/specs/theme-schools-research/tier3-stage4/proofs/<task name>.md`:
  the question, what was made, what the images show (paths), the answer, and
  exactly what Tier B should lift. Plain English, no em dashes. If the Write
  tool refuses the file, put its full text in your returned report and say
  so; the controller saves it.
- **Copy is fixed:** no visible word changes anywhere (word parity). A
  decorative word that is not copy (the rotated "Birch") is `aria-hidden`.
- **Commit** your scripts, the proof CSS and the write-up only.
