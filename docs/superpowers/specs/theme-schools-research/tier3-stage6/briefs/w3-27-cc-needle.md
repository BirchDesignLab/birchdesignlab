# W3 task 27: cottagecore, needle and thread on the hoop

Shared rules: `w3-common.md`. Source: `../a1-critic-cottagecore.md`
("Interactables" 2), stop 1 call 7, Stage 0 S5 (freehand). Wave 2 task 16
moved About's hoop onto the lighter board in dark with deepened threads:
use those thread colours.

**Needle and thread (About).** A needle is parked on the hoop's rim. Drag it
across the linen, or tap points one after another, and a freehand running
stitch follows in rose or sage (alternating per thread), dashes along the
path at the school's stitch length; releasing ties a small French knot at
the end. Stitches unpick themselves after about 15 s, oldest first, thread
by thread. Stitches stay inside the hoop's linen circle (clipped to it)
and never cover the hoop's words or the date line. An `aria-hidden` SVG
layer; the needle is inert (`aria-hidden`, not focusable). On touch the
needle picks up only after a short press on it; a vertical swipe anywhere
else, including over the linen, scrolls. Memory only; nothing loops when no
thread is unpicking.

**Owns:** `src/themes/cottagecore/**`, `tests/cottagecore-*.test.ts`,
`scripts/themes/cottagecore/**`, `scripts/themes/stage6/w3-t27-*.mjs`.

**Films:** a drag stitch and a tapped stitch at 1440, 820 and 390, both
schemes (strips through the knot and the unpicking); stitches clipped at the
linen's edge; the hoop's words clear; a vertical swipe on the linen scrolls
on touch; idle with no thread: zero style writes; in-school swap mid-stitch
(torn down, empty on return).
