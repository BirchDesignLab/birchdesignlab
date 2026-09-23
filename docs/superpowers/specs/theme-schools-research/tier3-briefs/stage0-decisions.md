# Tier 3: the founder's Stage 0 decisions (09-23-26)

Binding. Where this file and a brief disagree, this file wins. The founder
answered "tier 3 yes to all" and "stage 0 yes to all", with the overrides
below, and added: "keep in mind that this is going to be the magnum opus for
at least a few months." The founder did not read all of `portal.md`.

**Per-school decisions outside Stage 0.** "Tier 3 yes to all" makes each
brief's recommended option the default. At each pair's stage, list the
per-school decisions being applied and let the founder revisit any of them
before the build starts (decisions are shared).

## Set-wide (portal.md section 7)

**S1. Reduced motion: out of scope for the portal.** Founder: "this is a lab
thing and a portfolio piece. i don't care about reduced motion in this
context." Drop P3 (the reduced-motion hard cut) and every per-school
reduced-motion item from Tier 3, and critics stop flagging it. Existing
reduced-motion code in schools may stay but gets no further work. Amend the
README's "Motion and backgrounds" section to match. The root business pages
(`/`, `/about/` and the rest, rendered by quiet through BaseLayout) are not
part of this: they keep their behaviour exactly. Tooling note:
`capture.mjs` emulates reduced motion for deterministic stills; if a school
stops honouring it, an infinite animation will be caught mid-frame, which is
fine for review but not for pixel diffs.

**S2. The view-transition naming contract: yes.**
- The switcher gets its own name (`bdl-switcher`) with no animation, so it
  holds still above every transition instead of tilting and ghosting with
  each school's arrival.
- `wordmark` stays the only name that pairs across schools.
- A school may name its own persistent chrome `<id>-*` (for example
  `vaporwave-taskbar`), applied only when both sides of the swap are that
  school, so the chrome holds still on in-school page changes and joins the
  school's arrival or departure otherwise. The runtime already sets
  `data-from-theme` on the arriving page (`runtime.ts:97`); Stage 1 adds
  `data-to-theme` on the departing page, and the README gives the selector
  recipe. The built-site guard keeps checking that names are unique per page
  and learns the allowed shapes (`wordmark`, `bdl-switcher`, `<id>-*`).
- Parked for the transitions phase, set-wide: whether each Home billboard
  carries `wordmark`, so the giant name morphs into the header wordmark when
  a visitor leaves Home.

**S3. Glass vs vaporwave: yes, with an override.** Founder: "honestly we
need more interactable details not less. even if they do nothing."
- Glass keeps the hero toggle and the location pill and gains more
  interactable details (switches, sliders, segmented controls, steppers,
  draggable panes). Where it is cheap, a control does something small and
  playful (the toggle flips the glass tint); it may also do nothing.
- This is a principle for every school, not only glass: more interactable
  details, not fewer.
- Accessibility and parity: a control that does something is a real control
  with an `aria-label`; one that does nothing is `aria-hidden` and not
  focusable. Check the word-parity guard for any visible label text.
- Glass wallpaper leads with warm or blue hues (the Big Sur warm set, or
  Bloom blue); magenta and cyan are accents only, to stay off vaporwave's
  palette. Glass adds no window title bar (vaporwave owns window chrome) and
  keeps its traffic lights.

**S4. Swiss vs bauhaus: yes.** No red type in bauhaus (its F2 declined);
swiss adds no lowercase (its D3 = none); a swiss rotated giant keeps the
copy's capital.

**S5. Needlework: yes.** Grandmillennial owns counted cross-stitch
lettering; cottagecore's hoop goes freehand with no alphabet row;
cottagecore gets twine, grandmillennial keeps bows.

**S6. Room placards: yes.** Each school's era, signature and lesson render
as a placard in the switcher dialog, plus a one-time prompt on the first
portal load. No dialog opens by itself.

**S7. Switcher order: yes, chronological by era after quiet.** Shuffle stays
random (it already is: `switcher.ts:178`).

**S8. Break the shared wireframe: yes.** Each school re-expresses the
process row and at least one other shared skeleton in its own idiom, and
schools may reorder sections.

## Per-school decisions taken in Stage 0

**Vaporwave F1 = (b).** The Home hero stays exactly as it is, as the one
sunset. The other pages get mall, lobby and screensaver framing (a lobby or
atrium, a `screensaver.scr` window, a Win95 desktop, a marble head). Rewrite
`meta.ts` era, signature and lesson to match (F2 wording in the brief, for
the founder's approval).
- Founder reference, 09-23-26: "i used to play a game called marbloid made
  by supyrb... one of my favorite types of vaporwave. greek marble,
  overstylized 3d graphics." Study these before designing vaporwave's pair
  stage: https://www.supyrb.com/project/marbloid/ and
  https://www.supyrb.com/project/vapordays/
- Implication: F3 (the head) and the plaza lean toward rendered, glossy,
  over-stylised 3D marble (busts, columns, spheres) rather than flat drawn
  vectors. three.js is already a dependency; the one-WebGL-canvas-per-page
  rule still holds, and Home's canvas is the sunset. Bring a concrete
  proposal to the founder at the pair stage.

**Glassmorphism D1: Liquid Glass forward.** Founder: "look to the new apple
liquid glass for inspiration." Lensing and refraction, specular edge light,
tint that adapts to what is behind the glass, controls that materialize
rather than fade (dossier sources [3] [4] [5]). **D3 = no:** the school
forbids paper grain, so no noise layer unless it proves necessary, and then
back to the founder. **D5:** superseded by S3 (keep and add controls).

**Bauhaus F2: declined** (S4).

**Swiss D1 = yes:** a red duotone of the Shining Tree still as a full-bleed
About field; drop the Home red rectangle. **D2 = yes:** one full-height
condensed "Birch" running vertically, About only. **D3 = none** (S4).

**Grandmillennial D = yes:** a decorative cross-stitch alphabet band on the
sampler, `aria-hidden` SVG.

**Cottagecore D1 = yes, dated 09-23-26.** Founder: "how about the 23rd since
that's today" (the day the schools were built). The specimen label,
postmark, stamp value, sampler signature and envelope carry studio-voiced
words with that one fixed date; how the date is lettered on each object is
a design choice. The words are copy: draft them and get the founder's
approval before they ship. **D3 = yes:** garden twine replaces the satin
bow.

## Still open from before (carry forward)

- Quiet's header marks Contact as current on the root `/contact/sent/`
  page. Left alone because quiet renders the live root pages; fixing it
  would change a production page slightly. The founder's call.
