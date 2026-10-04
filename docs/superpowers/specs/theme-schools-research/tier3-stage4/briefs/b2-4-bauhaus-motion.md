# B2 task 4: bauhaus motion: the assembly switch, press states, the see-saw, Sent's roll and the loose shapes (F1, E10, E12, S3)

Shared rules: `b2-common.md`. Bauhaus decision F1, items E10 and E12, and the
founder's interactables answer (`stage4-decisions.md`, "Answers", 3).

1. **The assembly switch** (F1), lifted from `../proofs/bauhaus-assembly.md`
   (keep `transform-box: fill-box` and `transform-origin` on `.asm`, the
   proof's own warning). The founder's answer at the Tier A stop: **(a),
   today's feel, stays the default.** (b) and (c) ship behind a URL switch so
   the founder can compare live: `?bh-assembly=b` or `?bh-assembly=c` on any
   bauhaus page sets `data-bh-assembly` on `<html>` before first paint (an
   inline head script, no flash), remembers it for the session
   (`sessionStorage`), and re-applies it after every in-school swap (Astro's
   swap replaces `<html>` attributes). `?bh-assembly=a` clears it. No visible
   control; the switch is temporary and leaves once the founder picks, so
   keep it in one place that is easy to remove.
2. **Hover gating, press states, see-saw** (E10): every `:hover` rule inside
   `@media (hover: hover) and (pointer: fine)`; `.btn:active` presses 2px with
   the square becoming a circle at once; `.more:active::after` nudges 8px; nav
   `a:active` fills to the red block at once; the see-saw plank pivots on the
   triangle apex, tips about 8 degrees toward the circle when it lands and
   returns level when the square lands, two mechanical stops, no overshoot,
   gated by the same reveal.
3. **Sent: the circle rolls** (E12): it appears at the top of the triangle's
   hypotenuse, travels down the slope, then across into the square, with a
   small paper dot showing the roll.
4. **The loose shapes** (interactable): the Home hero's free shapes (circle,
   square, triangle) and Sent's trio can be picked up and dragged with mouse
   or touch, and on release fall back to their marks on the beam with the
   school's mechanical landing (no spring overshoot). Vertical swipes on
   phones still scroll the page unless the touch starts on a shape. They do
   something, so each draggable shape is reachable as a control with an
   `aria-label` (or the group is `aria-hidden` and not focusable if you judge
   it purely decorative; say which and why). Never disturb the protected
   build order on load.
5. **Stretch, only if everything above passes:** the questionnaire card:
   three outline shapes and three colour chips; tapping a shape then a colour
   fills it, and the house pairing (yellow triangle, red square, blue circle)
   is the one that "clicks" into place. `aria-hidden` and inert if
   decorative. Credit nothing in visible copy (no new words).
