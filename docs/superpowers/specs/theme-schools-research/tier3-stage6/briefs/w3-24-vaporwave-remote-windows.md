# W3 task 24: vaporwave, the VCR remote and windows that activate

Shared rules: `w3-common.md`. Source: `../a1-critic-vaporwave.md`
("Interactables" 1, V9), stop 1 call 7, stop 3 answer 3 (words approved).
Runtime task: the remote drives the WebGL sunset grid.

1. **The VCR remote on the Home hero.** The on-screen display becomes the
   deck's controls. Tap or Space pauses: the grid freezes, the OSD reads
   "❚❚ PAUSE", and a jittering tracking band rolls up the frame. Hold (or
   the right and left arrows) for fast-forward and rewind: the grid runs
   about 4x or reversed, tape noise over the frame, the counter spinning;
   the OSD reads "FF" or "REW". Release snaps back to "▶ PLAY" with the
   seam hiccup. Touch: tap pauses, a horizontal swipe on the hero does FF
   (right) or REW (left); a vertical swipe scrolls. One real button,
   `aria-label` "Play" or "Pause" matching the OSD, `aria-pressed` while
   paused. **Approved words, exactly:** "PAUSE", "FF", "REW", beside
   today's "PLAY". Paused state resets on leaving the page. The shader
   change keeps today's frame cost: measure before and after at 1440 on the
   GPU, and the loop still stops while hidden or off screen.
2. **Pressing any window activates it (V9).** Widen `windows.ts`'s overlap
   group to the page: pressing a window (anywhere on it, not only the title
   bar) brings it to the front and makes its caption active; the
   previously active one goes to the inactive grey wave 2 set. One active
   caption per page at all times. Pointer, touch and keyboard focus inside
   a window all activate it. Inert as a toy (no new control): the
   activation follows focus and press.

**Owns:** `src/themes/vaporwave/**`, `tests/vaporwave-*.test.ts`,
`scripts/themes/vaporwave/**`, `scripts/themes/stage6/w3-t24-*.mjs`.

**Films:** the remote at 1440 and 390, both schemes: pause, hold FF, hold
REW, arrows, swipe FF and REW on touch, a vertical swipe scrolls, release
hiccup; frame cost before and after; window activation on Contact, About and
Services at 1440 and 820 by press and by tabbing; arrival and in-school swap
at 1440 and 390 with the deck paused (torn down, PLAY on return).
