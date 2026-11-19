# Stage 6 A1: glassmorphism critic

Opus `high`, 11-19-26. Live probes on port 4463 (stage6-base, GPU), viewport
frames at every scroll offset, 1440x900 and 1280x800, both schemes, in two
modes: intended (`prefers-reduced-transparency: no-preference` forced) and
reduce (Windows Transparency effects off). Probes
`scripts/themes/stage6/critic-glassmorphism-{live,montage,controls}.mjs`;
output in `scripts/themes/.out/stage6-critic-glassmorphism/`.

## Diagnosis

Two separate failures.

**Reduce mode (most likely the founder's machine):** opaque cards on a flat
field, lens hidden with a white disc left behind, ghost orbs, dead controls.
Alone matches "the transparency thing doesn't work".

**Intended mode:** still not glass, because glass shows through what it does
to detail behind it, and there is none. The wallpaper is already a blur and
the orbs are soft discs, so a 20-30px frost changes nothing measurable
(gutter and pane have identical high-frequency energy, 0.507 vs 0.516; the
Frost slider moves 1.5/255). Heavy saturate and brightness make each pane a
hotter pink or lavender card. The rim bend is erased by running the
displacement before the blur. The header, the one place text passes
beneath, is the thickest glass. Big Sur frosts crisp windows and text, Aero
the live desktop, Liquid Glass keeps a clear interior with a lensing rim and
moving specular light: we have none of detail behind, a visible rim band, or
light that moves.

## Findings

- **G1 blocker, all pages desktop, reduce mode.** E10 flattens the wallpaper
  (`#fdece0` / `#0d1b4a`), panes 94-96% opaque with no blur, orbs crisp clip
  art ghosting through panes, the pink orb hard-cut at the hero edge, the
  lens poster a blank white disc, all three Control Centre controls dead.
  Fix: reduced transparency means opaque surfaces, not no wallpaper (Windows
  and macOS keep the wallpaper). Keep wallpaper, orbs and lens; panes become
  Mica (opaque, tinted from the wallpaper under each pane, fx.ts already
  computes it), rim and shadow kept; hide Frost, keep Time of day. Founder
  call whether the Lab honours the setting at all; critic recommends
  honouring it with Mica.
- **G2 blocker, all pages, intended.** Nothing to frost: a pre-blurred mesh
  wallpaper (2560x1600, 10-17 KB) and soft orbs. Fix: repaint crisp-edged
  (Big Sur's layered hard-edged waves with light and shadow bands); orbs get
  crisp edges and a specular line (R1).
- **G3 important, every pane, light.** Panes read as pink or lavender cards:
  `saturate(2.1)` / `(1.7)` plus `brightness(1.08-1.12)`; interior hues
  264-334 against 228 for the open wallpaper. Fix: thin pane saturate at
  most 1.2, no brightness step, blur 8-12px (now 20-30), light fill about
  0.15, soft inner plate behind body text only.
- **G4 important, bendable panes.** Rim refraction invisible: `url(#bevel)`
  runs before the blur (fx.ts `buildOne()`; its own comment at about
  318-335 admits it). Fix: a masked rim band whose backdrop-filter is the
  displacement only, over the frosted interior.
- **G5 important, Home lens (design).** Fixed at z-index -1 under every
  pane, refracts only its own redraw of the blurred wallpaper and orbs, never
  text; at rest reads as an embossed coin; lives in a gutter. Earns its place
  only on top of the page bending real content; as built, redesign (R2).
- **G6 important, header.** The one place content passes under glass has
  the thickest material (fill 0.7, blur 30, no bevel). Fix: fill about 0.35,
  a rim lensing band, a scroll-edge fade.
- **G7 important, all pages desktop.** A still picture: the 3 s fx strip is
  eight identical frames; panes ignore the pointer. Fix: pointer-tracked
  specular rim and highlight on every pane; a slow orb drift or orbs that
  run from the cursor.
- **G8 important, Control Centre.** Frost across its range changes the hero
  pane by 1.5/255 (Tinted 10.1). Fixed by G2; until then scale fill with
  blur.
- **G9 minor, Home.** Two switches drive Clear/Tinted; Tinted is subtle.
  Keep one; make Tinted read.
- **G10 important, Home tablet 820.** The Control Centre is a 240px 2x2
  stranded left with about 500px of empty wallpaper; Time stacks; Frost is a
  tall empty box. Span it 1x4 or centre it full width.
- **G11 minor, About tablet.** The reading pane touches the title's
  descenders at 721-1279. More padding or less overlap.
- **G12 minor, Contact.** The showpiece thin pane is the form, about 70%
  opaque wells. Make the intro the showpiece or hairline the fields.
- **G13 important (boundary), light.** Palette drifting toward vaporwave:
  coral blurred into blue under `saturate(2.1)` gives mauve, orchid and
  lavender; rose orb `#d63c73`; `--wp-body` mauve `#6b5a8e`. Structure still
  separates them. Fix: neutral glass; coral meets blue through cream light;
  rose orb to amber; `--wp-body` a deep warm blue.
- **G14 minor (tooling).** Full-page sheets show the fixed wallpaper only in
  the top viewport; judge glass from viewport-at-offset captures.
- **G15 taste, Services light.** The solid cream settings pane out-shouts the
  thin head card. Tint it toward the wallpaper.
- **G16 minor, phone.** Below the hero most cards are tinted rectangles;
  fixed by R1's crisp wallpaper.

## Rework proposals

**R1, a backdrop worth frosting and a real material (moderate, about two
tasks).** Repaint the six wallpapers (`scripts/themes/glassmorphism/paint-wallpaper.mjs`)
as crisp Big Sur layered waves in amber, coral and deep blue, coral meeting
blue through cream, no mauve; crisp orbs with a specular line; material blur
8-12, saturate at most 1.2, no brightness, thin fill about 0.15 light and
0.35 dark, inner plates behind body text; rim lensing as an unblurred
displacement band (G4); a pointer-tracked specular rim on every pane; a
clearer header with a scroll-edge fade; the Mica fallback (G1). Costs:
tokens, the fx.ts rim layer, a contrast re-measure, the repaint (the lens
texture follows). Risks: the worst-orb contrast method will push fills back
up unless inner plates are accepted (a D2-style founder call); per-pane GPU
cost needs a 390 trace; Safari gets frost only.

**R2, Liquid Glass over the page (larger, two waves).** The lens becomes a
top-layer magnifier bending real text, icons and the Control Centre
(Chromium: a fixed element with `backdrop-filter: url(#lens-displace)`, no
blur; Safari and Firefox keep today's WebGL lens); header and footer become
clear lensing bars content warps under; two or three more glass toys (a
pill lens, a glass ruler over the Services steps, slider thumbs that magnify
their track); panes drop to plain frost with R1's rims. Costs: a new, simpler
Chromium lens path; pointer pass-through with a rim handle (the z-index -1
problem disappears); keyboard kept. Risks: full effect Chromium-only (iPhone
sees the fallback); glass on glass over panes is a canon bend for the
founder; hit-testing over links.

R1 then R2; they stack. Rejected: draggable Aero windows (vaporwave owns the
OS desktop metaphor).

## First three

1. The Mica reduce fallback (G1). 2. Crisp wallpaper and retuned material
(G2, G3, G4, G13). 3. A proof sheet of the Chromium top-layer lens bending
real DOM, so the founder picks R1 alone or R1 plus R2 before lens.ts changes.
