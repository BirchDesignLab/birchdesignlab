# B1 task 5: grandmillennial tactile states and interactables (item 15; S3: the bell-pull tassel and the swatch lift)

Shared rules: `b1-common.md`. Brief item 15 (without its reduced-motion
bullet, S1) and the founder's interactables (`../stage5-decisions.md`, item
14 and "Answers").

1. **Tactile states** (item 15): `.gm-btn:active` sinks (`translateY(1px)`,
   a shallower shadow, 60 ms); `.gm-more` hover and focus nudge the curl
   0.18em over 220 ms, no rotation or bounce; `.wordmark:focus-visible` an
   oval ring (`border-radius: 50% / 45%`, `outline-offset: 4px`) without
   shifting the desktop masthead; on hover and focus the swash and bead take
   `--accent` over 180 ms. Hover rules gated to hover-capable pointers.
2. **The bell-pull tassel:** a tasselled bell pull hangs from the awning
   (desktop and tablet at the awning's edge; on phones only if it fits
   without crowding the nav). Drag or tug it down (mouse or touch) and it
   stretches a little and springs back on release with one damped swing (it
   hangs, so a small overshoot is allowed, as the brief allows the portrait
   one). A click or tap gives a short tug. Inert: `aria-hidden`, not
   focusable. It sits in the header chrome, so it must hold still with
   `grandmillennial-header` in-school and never break the drapes on
   arrival.
3. **The swatch lift:** on Services, pressing (or hovering, on fine
   pointers) a sample-book swatch lifts it like a cutting picked off the
   table (a small lift, a deeper shadow, a slight straightening of its
   rotation) and shows the pinked selvedge edge with a printed register
   strip underneath (dots in the swatch's inks, no words). Release lays it
   back. Inert and `aria-hidden` unless you make it a real control (then it
   needs an `aria-label` and must not add words).

**Films:** the tassel tug (mouse at 1440, touch at 820 and 390), the swatch
lift (1440 hover, 390 press), the button press and the wordmark focus ring
(1440), both schemes; an in-school swap with the tassel present at 1440.
