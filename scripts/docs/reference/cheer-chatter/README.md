# Source: Cheer & Chatter repo, ingested 09-03-26

Reference material for the "document generation tool" backlog item
(`docs/lab-backlog.md`). Copied byte-identical from
`C:/git/websites/cheerAndChatter/files/scripts/docs/` — not wired to this
repo, paths inside them (`docs/project-review/...`, `../documentation/...`)
resolve there, not here. Read them for the pattern, don't run them from here.

Two approaches, proven on real deliveries:

- **`check-review-pages.mjs` + `build-review-pdf.mjs`** — Playwright renders
  a hard-8.5x11in-boxed HTML/CSS letterhead doc to PDF. The checker measures
  each `.page` for clipped overflow and screenshots it before the build
  script commits to a PDF; `overflow:hidden` on `.page` means anything too
  tall is silently CLIPPED, not reflowed, so skipping the checker ships
  broken pages with no error. Ported and generalized here as
  `scripts/docs/check-pages.mjs` / `build-pdf.mjs`, which take any document
  path and know nothing about a particular document. What C&C keeps as one
  CSS file per document is split here into `docs/_letterhead/` (a single
  skeleton plus a day and a night theme) so a new document is a thin
  content file rather than a copy of the letterhead; `docs/pricing/` is the
  first one.
- **`build-manual-docx.mjs`** — a hand-rolled markdown -> DOCX converter on
  `docx` (docx-js), covering exactly what the two C&C manuals used: headings,
  bold/italic/code, bullet/numbered lists with wrapped continuations,
  2-column pipe tables, images sized from their own PNG headers, `---` rules.
  `docx` is deliberately not a dependency of either repo; point `NODE_PATH`
  at a scratch install. Not yet ported here — nothing in this repo needed
  DOCX output yet.

If the doc-gen tool gets built for real, this directory is scratch to work
from, not something to keep importing from forever — fold the parts that
survive into `scripts/docs/` proper and delete this once it's superseded.
