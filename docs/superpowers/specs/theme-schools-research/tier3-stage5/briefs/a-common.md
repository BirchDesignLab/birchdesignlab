# Stage 5 Tier A proofs: rules shared by every proof task

Read with your own task brief (`a1` to `a6` in this folder). Decisions:
`../stage5-decisions.md` (binding, including its "Answers" section), then
`../../tier3-briefs/stage0-decisions.md`, then the school brief
(`../../tier3-briefs/grandmillennial.md` or `cottagecore.md`) and its dossier
(`../../dossiers/<school>.md`).

- **Nothing under `src/` changes.** A proof answers a question at sheet scale
  so Tier B can build with confidence. Proof styles and markup are injected
  into a frozen build (the Stage 4 pattern: `scripts/themes/proofs/stage4-*`
  and `scripts/themes/harness/stage4-*-proof.mjs`, written up in
  `../../tier3-stage4/proofs/`). Write the variant CSS and SVG so Tier B can
  lift them into the school: every rule under `html[data-theme='<school>']`,
  every pattern or drawing as markup that drops into the school's `parts/`
  or `assets/` unchanged.
- **Build once, inject, capture.** Freeze the current site with
  `node scripts/themes/snap.mjs --name stage5-base --port <your port> -- <cmd>`
  (or `--reuse` if `scripts/themes/.out/snap-stage5-base/` already exists),
  inject the variant with Playwright `addStyleTag` / `addScriptTag` or page
  `evaluate`, and capture. GPU Chromium (`BDL_GPU=1`), the renderer string
  saved as `renderer.txt` beside the images.
- **Sizes:** 1440, 1280, 1024, 820 and 390 unless the task names fewer; light
  and dark. Phones at 2x device scale.
- **Images** go to `scripts/themes/.out/stage5-proofs/<task name>/` with an
  `index.md` listing every image and what it shows. Founder sheets: a few
  stitched JPGs a person can read at a glance (`contact-sheet.mjs`,
  `harness/grid-sheet.mjs`). Motion goes in timestamped strips of real
  composited frames (`motion.mjs` or a harness built the same way).
- **Write-up:** `docs/superpowers/specs/theme-schools-research/tier3-stage5/proofs/<task name>.md`:
  the question, what was made, what the images show (paths), the answer, and
  exactly what Tier B should lift. Plain English, no em dashes. If the Write
  tool refuses the file, put its full text in your returned report and say
  so; the controller saves it.
- **Copy is fixed:** no visible word changes anywhere (word parity). A
  decorative word that is not copy is `aria-hidden` SVG; the cottagecore D1
  wording in `../stage5-decisions.md` is approved and is the only new text.
- **Character is protected.** Both schools "absolutely sell what we can do"
  (founder): the brief's "Protect" list is binding. Raise, never repaint.
- **Commit** your scripts, the proof CSS and SVG, and the write-up only.
