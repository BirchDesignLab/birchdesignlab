# W3 task 26: grandmillennial, the plates swing

Shared rules: `w3-common.md`. Source: `../a1-critic-grandmillennial.md`
("Interactables" 2), stop 1 call 7. Wave 2 task 15 drew Home's plates once
through `<use>`; keep that.

**The plates swing (Home).** Brushing a plate with the mouse, or tapping it,
sets it swinging from its top rim: one damped swing under 600 ms, the
direction from the pointer's travel (a tap swings it away from the tap
point); its neighbours tilt slightly in sympathy. Nothing loops at rest and
nothing moves while the page is hidden or the plates are off screen. Inert
(`aria-hidden`, not focusable). The swing is a rotation about the hanging
point (transforms only, no layout change), and a plate never swings over
the hero frame or its text. On touch a vertical swipe that starts on a plate
scrolls; only a tap swings.

**Owns:** `src/themes/grandmillennial/**`, `tests/gm-*.test.ts`,
`scripts/themes/grandmillennial/**`, `scripts/themes/stage6/w3-t26-*.mjs`.

**Films:** brush left to right and right to left, and tap, at 1440 and 1101
(mouse) and 820 and 390 (touch), both schemes, as strips over 700 ms;
rapid brushes (no runaway amplitude); a vertical swipe starting on a plate
scrolls; idle 3 s after a swing with zero style writes; in-school swap
mid-swing (torn down, at rest on return).
