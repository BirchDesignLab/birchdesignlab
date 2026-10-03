# Proof a5: bauhaus assembly feel behind one switch (F1)

Brief: `briefs/a5-bauhaus-assembly.md`. Nothing under `src/` changed. Proof CSS:
`scripts/themes/proofs/stage4-bauhaus-assembly/proof.css`. Harness:
`scripts/themes/harness/stage4-bauhaus-assembly-proof.mjs`. Images:
`scripts/themes/.out/stage4-proofs/bauhaus-assembly/` (GPU Chromium, RTX 3070
through D3D11, string in `renderer.txt`).

## The question

With the assembly behind one variable, what do the three feels look like side
by side, so the founder can pick at the end-of-pair stop?

## What was made

One switch, `html[data-bh-assembly='a' | 'b' | 'c']`. No attribute means (b),
the recommendation that ships until the founder picks. It drives `.asm`
through these custom properties:

| Variable | (a) today | (b) mechanical | (c) middle |
|---|---|---|---|
| `--bh-asm-name` | `bh-assemble` (fades in) | `bh-assemble-solid` (opaque by 1%, about 5 ms) | same as b |
| `--bh-asm-dur` | 820ms | 480ms | 480ms |
| `--bh-asm-ease` | `cubic-bezier(0.2, 0.9, 0.25, 1.12)` | `cubic-bezier(0.3, 0, 0.15, 1)` | `cubic-bezier(0.3, 0, 0.15, 1.235)` |
| `--bh-d-scale` (times each shape's inline `--d`) | 1 | 0.6 | 0.6 |
| `--bh-beat-gap` (times a shape's `--beat`) | 0 | 260ms | 260ms |
| `--bh-sub-scale` (times a shape's `--sub`) | 0 | 1 | 1 |

Delay is `--d * d-scale + --beat * beat-gap + --sub * sub-scale`. Under (a) the
beat terms are zero, so (a) is today's CSS exactly (timing.json: delays, durations
and easings match the frozen build shape for shape; the hero ends 1580 ms, About's B
1380 ms). The whole block sits inside `prefers-reduced-motion: no-preference`, so
reduced motion still gets the finished poster.

Beats (tagged in the proof by `:nth-child`, which in Tier B becomes `--beat` and
`--sub` written inline on the shapes):
- Home hero: beat 0 bar and stem (stem 70 ms in); beat 1 blue disc and red square (square 70 ms in);
  beat 2 triangle, ring (70 ms in) and eye (140 ms in).
- About's B: beat 0 stem; beat 1 red and blue bowls (blue 70 ms in); beat 2 the dot.

## Numbers worth knowing

- **Today's "12% overshoot" is a control point; its real peak is 3.0%.**
  `bezier.mjs` samples the curves: (a) peaks 3.01% past the mark at 69% of the
  way; (b) 0%; (c) 2.97% at 80%. The brief's (c) says "3% overshoot", which
  read as a real peak makes (c) overshoot as far as (a) does, only later and with
  solid shapes. See the question below.
- Hero finishes: (a) 1580 ms, (b) and (c) 1140 ms. About's B: (a) 1380, (b) and (c) 1000.
  The brief's "about 1.1 s" holds for the hero; to land exactly on 1.1 s, shave the
  beat gap to 250 ms.
- **The pink square, gone.** Opacity at +480 ms, read from the animations
  (timing.json): in (a) the red square is 0.77, the yellow triangle 0.32 and the
  blue disc 0.96, so red over blue reads pink; in (b) and (c) every shape that has
  started is 1.0 (a shape that has not started yet is 0, not translucent). The
  sheets show it: the pink square in column +473 ms of the (a) row, solid red in (b) and (c).
  About's B in (a) shows both bowls see-through and overlapping at +304 to +553 ms
  (the translucent B bowls); in (b) and (c) they are opaque at every frame.
- **The ending is identical.** The settled hero and B, pixel for pixel, (b) and (c)
  against (a): 16 of 16 identical (finals.json, both schemes, 1440 and 390).

## What the images show

All in `scripts/themes/.out/stage4-proofs/bauhaus-assembly/`:
- `sheet__home__1440__light.jpg`, `..._dark`, `sheet__home__390__light.jpg`, `..._dark`:
  the Home hero, three feels stacked, on load (top block) and on arrival from Quiet
  through the real switcher (bottom block). 13 columns, each labelled with its real
  frame time in ms since the assembly began.
- `sheet__about__1440__light.jpg`, `..._dark`, `sheet__about__390__*`: About's B, on load.
- `timing.json` (per-shape delay, duration, easing, end, opacity at 240, 480, 720 ms),
  `finals.json`, `strips/` (frame times), `frames/` (every frame), `problems.json`.
- Frames are real composited screencast frames. Zero is the first shape's animation
  start (read from the page's clock after the film), so labels can be off by about
  one frame (16 to 33 ms). Frames in red labels are older than the column time by 60 ms or more
  (the screencast sends nothing while the page is still).

## Answer

The three settings are the table above, as Tier B ships them. (b) is the default,
(a) and (c) are a one-attribute change. The shapes whose timing needed more than the
three variables (duration, ease, solid-or-fade): the **hero's seven shapes and About's
four** need a per-shape `--beat` and `--sub`, because beats cannot come from the
global stagger. Every other poster (Footer, Services, Contact, Sent, About's tree and
manifesto) just compresses its existing `--d` by 0.6 and needs no markup change.
If the founder wants beats there too, each gets `--beat` the same way.

## Tier B should lift

1. Replace the `.asm` rule and `@keyframes bh-assemble` in `src/themes/bauhaus/theme.css`
   with `proof.css` (both keyframes, the three variable blocks, the beat rule). The
   proof's `.asm` rule carries `transform-box: fill-box` and `transform-origin: center`
   from the current rule; they must survive the swap or every shape turns about the
   viewBox origin. Keep
   the reveal-gate pause rule and the reduced-motion rule as they are. `--ease-land`
   has no other user and can go.
2. Add inline `--beat` and `--sub` to the hero shapes (`Home.astro:19-25`) and About's B
   (`About.astro:15-18`) and drop the `:nth-child` tags.
3. Set `data-bh-assembly` on `<html>` only if the founder wants a runtime switch;
   otherwise the default block is the pick and (a) and (c) stay as commented blocks.
   Each feel block sets `--bh-beat-d-scale` (0 for b and c, 1 for a), so copying any
   block's values into the default block picks that feel with no attribute.

## For the founder

- (c) as built keeps (a)'s real peak (3.0%). If you meant a gentler middle, a 1.5% 
  peak is `cubic-bezier(0.3, 0, 0.15, 1.16)` on this family (not filmed).
- The 1440 Home hero runs 6 px past the bottom of a 900 px window, so its last
  6 px of crop are the window edge; nothing is lost (problems.json lists these
  as "outside the viewport").
