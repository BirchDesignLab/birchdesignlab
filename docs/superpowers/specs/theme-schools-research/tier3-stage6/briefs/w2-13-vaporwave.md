# W2 task 13: vaporwave, V1 to V14

Shared rules: `w2-common.md`. Source: `../a1-critic-vaporwave.md`
(findings V1 to V14, each with its fix), stop 1 call 10 (V12 and V14 taken).
The interactables (VCR remote, pressing any window to activate it, the Sent
desktop, the elevator) are wave 3: here V9 is only the static inactive
captions. The two transitions notes (T1, T2) stay for the transitions phase.

Build every finding's fix as the report states it, measuring each against
its own numbers:

- **V1** Services 761 to 1440: the vertical kana no longer collides with the
  lede or wraps (`white-space: nowrap`, the sublines padded right by the kana
  width plus a gap, the kana capped near 4.5rem at 761 to 1100).
- **V2** Home hero 761 to 1100: the palms no longer swallow the sun (a band
  with palms about 50% and 58% high, offsets about -14% and -18%, or
  `height: min(66%, 60vw)`); desktop untouched.
- **V3** the phone plaza: Venus and the sphere seated in front of the kiosk
  stand's lower corners at `clamp(64px, 14vw, 96px)` below 900px; the lobby
  planter kept about 64px left with the column right below 620px.
- **V4** the lobby skylight: in light mixed from white or the sun highlight,
  not near-black; the glow's hard top edge gone in both schemes (centre the
  ellipse about -10% or mask the top 12%).
- **V5** About's live bust: `.centerpiece` at `clamp(200px, 30vw, 380px)`,
  260px or more at 820; the dead sky at 820 reduced.
- **V6** About in-school swap: an `eager` prop on `parts/Still.astro`
  (`loading="eager"`, `fetchpriority="high"`) for the centrepiece only.
- **V7** the footer nav at 621px and up: two deliberate rows (site links,
  then socials), so FACEBOOK never wraps alone.
- **V8** the phone header at 390 and 360: labels no longer fill their
  buttons (letter-spacing 0.06em, about 0.68rem, padding-inline 0.35rem).
- **V9** static inactive captions (Windows 95 grey) for `mail.txt` and
  `screensaver.scr`; one active caption per page.
- **V10** Contact's screensaver in light: a lavender top instead of white
  blow-out; the sun down about 8% so it clears the bezel in both schemes.
- **V11** the phone hero in dark: no sun stripe gap, the lower half not lost
  in haze (shorten the haze or raise the sun below 760px).
- **V12** Services' closer gets its own lobby props (Venus on a drum, a
  fountain basin, an escalator rail) instead of Home's palm, column and
  skylight. Aria-hidden stills, no words.
- **V13** About's plaque: one block span per sentence so no line breaks
  mid-sentence; copy unchanged.
- **V14** light Services and Contact: the soft cloud blobs become a
  hard-edged pastel Windows 95 "Clouds" bitmap or tiled wallpaper. Glass
  must stay clearly apart: run a boundary sheet beside glass in light.

**Owns:** `src/themes/vaporwave/**`, `tests/vaporwave-*.test.ts`,
`scripts/themes/vaporwave/**`, `scripts/themes/stage6/w2-t13-*.mjs`.

**Films:** every finding at the sizes it names plus every review size, both
schemes; About in-school swap at 1440 dark (the bust present at +400 and
+480 ms); arrival and in-school swap at 1440 and 390 against `stage6-base`
(layout changes on Home, Services, About); the glass boundary sheet in light
at 1440 and 390.
