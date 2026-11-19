# Stage 6 A1: vaporwave critic

Opus `high`, 11-19-26. Probes `scripts/themes/stage6/critic-vaporwave-{tiles,crop,measure}.mjs`
on port 4466 (stage6-base); output in `scripts/themes/.out/stage6-critic-vaporwave/`
(`measure.json`: DOM at 390, 600, 820, 1024, 1280, 1440, both schemes).

**Verdict:** dark desktop is still at the bar. Shortfalls are at 820 and
390, and in light. No sideways scroll at any width.

## Findings

- **V1 important, Services 761-1440.** The vertical サービス kana collides
  with the second lede paragraph (92px overlap at 1024) and wraps into two
  columns at 1280+, orphaning ス. Fix: `.intro-kana { white-space: nowrap }`;
  pad `.sublines` right by the kana width plus a gap; cap the kana near 4.5rem
  at 761-1100.
- **V2 important, Home hero, tablet 820.** The palms swallow the sun: 44px of
  the centre clear against a sun about 420px wide (hero 980px tall). Fix: a
  761-1100 band with palms about 50% and 58% high, offsets about -14% and
  -18% (or `height: min(66%, 60vw)`). Desktop untouched.
- **V3 important, Home and Services plaza below 900px.** The kiosk's Venus
  and sphere hide at 900 and below, the lobby planter at 620 and below, so
  the phone lobby is one lone column. Fix: seat both stills in front of the
  stand's lower corners at `clamp(64px, 14vw, 96px)`; keep the planter about
  64px left with the column right.
- **V4 important, lobby skylight, Home and Services closers.** In light it
  paints as a dark mauve smudge (`.lobby-sky` mixes near-black
  `--bb-plain`); in both schemes the glow starts on a hard top edge. Fix:
  light mixes from white or the sun highlight; centre the ellipse about -10%
  or mask the top 12%.
- **V5 important, About live bust, tablet and desktop.** The showpiece is
  undersized to drag: centrepiece 164px at 820, 260px at 1440; about 250px of
  dead sky at 820. Fix: `.centerpiece` at `clamp(200px, 30vw, 380px)`, 260+
  at 820.
- **V6 important, About in-school swap, desktop dark.** Bust missing at +400
  and +480 ms, pops in at +560: `parts/Still.astro:17` hard-codes
  `loading="lazy"`. Fix: an `eager` prop (`loading="eager"`,
  `fetchpriority="high"`) for the centrepiece only.
- **V7 minor, footer nav at 600, 1280, 1440.** FACEBOOK wraps alone to a
  second row. Fix: two deliberate rows at 621+, site links then socials.
- **V8 minor, phone header 390.** Task labels fill their buttons edge to
  edge (SERVICES, CONTACT 61/61). Fix: letter-spacing 0.06em, about 0.68rem,
  padding-inline 0.35rem; check 360.
- **V9 minor, Contact and About windows.** Every caption is active; Win95
  has one. Fix: static inactive captions for mail.txt and screensaver.scr;
  widen windows.ts's overlap group to the page so pressing any window
  activates it (an interactable on every page).
- **V10 minor, light, Contact screensaver.scr.** Light sky blows out to
  white; the sun's top touches the bezel in both schemes. Fix: lavender top,
  sun down about 8%.
- **V11 minor, Home hero, phone dark.** One faint sun stripe gap (desktop 4,
  phone light 3); lower half dissolves into haze. Fix: shorten the haze or
  raise the sun below 760px.
- **V12 taste, Home and Services closers.** Same room (palm, column,
  skylight): the F1 repetition again. Give Services its own props (Venus on
  a drum, a fountain basin, an escalator rail).
- **V13 taste, About plaque.** Sentence-per-line still breaks mid-sentence.
  One block span per sentence; copy unchanged.
- **V14 taste, light Services and Contact backdrop.** Soft blurred cloud
  blobs drift toward glass. A hard-edged pastel "Clouds" bitmap or tiled
  wallpaper instead (Win95 canon).

## For transitions

T1: the desktop in-school swap holds the skew from +400 to +1040 ms, reads
stuck. T2: phone light arrival from quiet: header mid-layout at +400 ms, a
white band at the top at +480.

## What glass must not borrow (S3)

Pink, lavender and cyan gradient bars and the violet or indigo dark ground;
pink and cyan chromatic split (the lens rim must stay warm or neutral); hard
offset shadows; outlined vertical kana, mono or C:\> kickers, bevels;
checker or grid floors, sunsets, marble or classical props; in light the
lavender, pink and peach dawn gradient. Today's boundary sheets read apart.

## Interactables

1. **VCR remote on the Home hero.** The OSD becomes the deck's controls:
   tap or Space to pause (grid freezes, ❚❚ PAUSE, a jittering tracking band
   rolls up); hold or arrows for FF and REW (grid 4x or reversed, tape noise,
   spinning counter); release snaps to PLAY with the seam hiccup. Touch: tap
   pauses, a horizontal swipe does FF or REW. A real button, aria-pressed.
   The most felt-by-anyone option.
2. **A Sent desktop that works.** Icons select, drag on a snap grid, and
   double-click open small draggable windows: My Computer (drives), Recycle
   Bin (0 objects), readme.txt (Notepad of the site's file names), birch.exe
   (hourglass, then the screensaver full-window). Fills tablet's empty
   desktop; phone gets the icons as a top row.
3. **Elevator directory on the kiosk.** The B1 / 1F / 2F plaque becomes
   bevelled floor buttons; a press lights it, steps a floor readout, and
   activates the matching window (2F flips the CRT to its Lab list).
   Navigates nowhere. An optional one-tone "ding" is the founder's call.

New visible labels (file-name style, aria-hidden) are the founder's call.

## First three

1. V1. 2. V2 and V5, with V6 in the same task. 3. V3 and V4.
