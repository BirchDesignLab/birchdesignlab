# W4 task 29: closing B, swiss and vaporwave

Shared rules: `w4-common.md`. Sources: `../stop4-critique.md` A1, C1, C2,
C3, C5 (the founder took every verdict; C4 keeps the Sent icons as built),
wave 3 deferred minors for tasks 19, 21, 24 and 25 (quoted below).

**1. Swiss pressed-field edge (C1).** Keep the inverse; add a 1px edge
while pressed, paint only. Bleed fields already paint
`box-shadow: 0 0 0 100vw var(--bleed-fill)` with
`clip-path: inset(0 -100vw)` (`theme.css` around 376 to 378): in the
`[data-sw-flip]` rules (around 442, 454, 474, 492) set `box-shadow: 0 0 0
100vw var(--bleed-fill), 0 0 0 calc(100vw + 1px) var(--flip-edge)` and
`clip-path: inset(-1px -100vw)`. Non-bleed fields (About red, Contact red
aside): `outline: 1px solid var(--flip-edge); outline-offset: -1px`.
`--flip-edge` is the field's rest colour (red for `.sw-red`, `--black` for
`.sw-black` and the light `.sw-sheet`, `--white-field` for the dark
`.sw-sheet.sw-white`). Skip an edge that already sits on a rule (no 2px
doubling); never touch `.sw-btn` (around 398 to 401). Nothing moves.

**2. Swiss numeral (C2).** In `begin()` start from the current weight
(`r.weight`, not `W_REST`), ease down to 100 over about 200 ms, then rise
100 to 900 over the hold (`toys.ts` around 247); a re-press during
snap-back no longer jumps. The touch gate is unchanged.

**3. Swiss About sweep (C3).** The desktop query (`toys.ts` around 95)
becomes `(min-width: 1280px)`, so 1024 to 1279 takes the title-stack sweep.

**4. Swiss minors:**
- 21/C1: a resize keeps the About sweep at its current cut (restore it in
  `remeasure` before re-observing), no one-frame pop to the rest cut.
- 21/C2: the numeral's pointer cursor covers only the glyph ±8px, not the
  whole three-column box (with the signifier rule).
- 21/C3: while a field is held flipped, its button's hover does not take a
  ground equal to the flipped field (no white on white or black on black).
- The signifier rule: the numeral, the full stop and the "Birch" get their
  cursors; the numeral and the full stop get a touch beat in the school's
  manner (no beat on the fields or "Birch").

**5. Vaporwave elevator (C5).** On arrival at B1 or 1F, if the target
window's rect is outside the viewport, call
`scrollIntoView({ behavior: 'smooth', block: 'center' })` after the
activate event fires; when it is in view, do nothing (1440 unchanged).
2F stays as built. It still navigates nowhere.

**6. Vaporwave minors:**
- 19/C2: the kiosk props never get smaller as the window widens across 900
  to 901 (match the phone and desktop sizes at the step).
- 24/C1: the deck's arrow keys ignore any press with a modifier
  (`deck.ts` around 220 to 226).
- 24/C2: a vertical drag off the remote button cancels the click, as a
  horizontal one does.
- 24/C3: a swipe between about 45 and 56 degrees is classed so it either
  scrolls or scans, never neither (measure it on touch emulation).
- 24/C4: `windows.ts`'s header comment matches activation on release.
- 24/C5: the report names that About and Services windows hold nothing
  focusable, so their tab-walk sheet cannot exist (no tabindex added).
- 25/C3: the My Computer drive glyphs read in light (a palette ink with a
  contrast pair, not `--bevel-hi` on `--field-raised`).
- 25/C4: phone windows open below the icon row (no overlap at 390x844).
- The signifier rule: the remote, the Sent icons, the elevator keys and the
  windows' title bars get their cursors and a gated hover; the remote, the
  Sent icons and the elevator get a touch beat in the school's manner.

**Owns:** `src/themes/swiss/**`, `src/themes/vaporwave/**`,
`tests/swiss-*.test.ts`, `tests/built/swiss*.test.ts`,
`tests/vaporwave-*.test.ts`, `scripts/themes/swiss/**`,
`scripts/themes/vaporwave/**`, `scripts/themes/stage6/w4-t29-*.mjs`.

**Films:** swiss each field pressed at 1440 and 390 in both schemes (the
edge visible against the page; no layout shift, measured); the numeral
hold at 1440 and 390 (timed strip from rest and a re-press mid-return);
the About sweep at 1024 and 1280 (strips at five scroll offsets) and a
resize mid-sweep; vaporwave elevator B1 and 1F at 390 and 820 (the window
scrolled into view) and at 1440 (no scroll); the kiosk props at 900 and
901; the Sent drive glyphs in light; phone windows at 390x844; every toy's
cursor and hover at 1440 and every touch beat at 390 (strips); arrival and
in-school swap at 1440 and 390 for both schools against `stage6-base`.
