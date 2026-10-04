# B1 task 1: swiss type and grid (items 1, 2, 7, 8)

Shared rules: `b-common.md`. Swiss brief items 1, 2, 7 and 8.

1. **One giant per page; collapse the type scale** (item 1). Three tokens
   plus the page's giant; below the hero nothing is larger than lead size
   except the Services numerals. Home loses its extra display blocks
   (`.door-title`, `.pull`, `.closer-lead` come down to lead).
2. **Stop drawing the grid** (item 2). Delete the resting guides
   (`Header.astro` `.sw-guides` markup and its CSS), including the mobile
   column line through body copy. Update the comment that calls the grid
   "the picture". Structure shows through shared edges instead. Keep any
   guide the page swap itself uses; task 4 adds a grid key that shows the
   guides on demand, so keep the guide CSS reusable if that is cheap.
3. **One family: Archivo only** (item 7), lifted from `../proofs/swiss-type.md`:
   standard axes, body Archivo 400 width 100 (the founder's pick), Public
   Sans and IBM Plex Mono imports and `meta.fonts` entries dropped, one
   Archivo woff2 preloaded, section indices (`.sw-idx`) removed from the
   markup with the grid rows renumbered (the proof's minor C5), metadata in
   Archivo. Size the giants from the frame or container units, not `100vw`
   (proof minor C4).
4. **Line-based vertical rhythm** (item 8): body 1.0625rem / 24px, `--u` the
   24px line, section paddings, row gaps and block heights in lines; remove
   the Home `padding-top: 0.35em` hack.

Leave colour, red, dark tokens, page compositions, phones and buttons to
tasks 2 to 4 except where these items force a change.
