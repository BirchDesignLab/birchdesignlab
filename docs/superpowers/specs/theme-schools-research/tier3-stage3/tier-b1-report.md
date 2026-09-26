# Tier 3, Stage 3, wave B1 (the rooms): report for the founder

Written 09-25-26 at the B1 stop. Branch `feat/theme-schools-tier3-stage3`.
Plan: `tier-b-plan.md`. Nothing here is merged or live.

## How it ran

- **Workflow 1, the build (12 agents):** per school, two Sonnet builders in
  sequence, then an Opus critic and a Sonnet verifier, then a Sonnet fixer
  and an Opus re-critic. Both re-critics still blocked.
- **The orchestrator's own look** at the sheets found four vaporwave brief
  requirements unmet (the kiosk had no base, the About plinth was two thin
  slivers, Home stacked two checker floors with a flat band between them,
  Sent's desktop tile was nearly invisible).
- **Workflow 2, fix round 2 (5 agents):** glass fix A on Opus `high` (the
  hard debugging), glass fix B on Sonnet `high` (orb placement by hand and
  the founder sheets), vaporwave on Sonnet `xhigh` (stepped up after the
  first Sonnet fixer's misses), an Opus re-critic per school.
- **Workflow 3, cleanup (3 agents):** the two small vaporwave defects the
  last re-critic found, the glass scrolled sheets re-shot, an Opus critic.
- Every result was checked against the workflow journals and the disk.
  Glass fix B's structured report came back empty; its work is on disk and
  the re-critic confirmed it.

One tooling finding worth keeping: headless Chromium on this machine reports
`prefers-reduced-transparency: reduce` by default, which put the first
round's glass light sheets in the E10 off state (milky). `capture.mjs` and
`motion.mjs` now force `no-preference` over CDP; any new probe must do the
same.

## What was built

### Glassmorphism

- **Wallpaper, painted offline once** (`scripts/themes/glassmorphism/paint-wallpaper.mjs`):
  six files, light and dark by dawn, day and dusk, AVIF with WebP fallback,
  9 to 18 KB each, hashed under `/_astro/`. Day is the default; dawn and dusk
  wait for B2's control. The coral bridge fixes warm light's grey-mauve
  overlap. The same file becomes the lens texture in B2.
- **Materials (E1, E8):** thin showpiece, regular, thick chrome, solid;
  no sheen stripe; a luminosity step in each blur; a rim ring.
- **Orbs:** flat discs in the warm set (D7 B), placed by hand so every
  text-bearing pane frosts a real share of an orb (the probe's "useless orb"
  list went from 12 to 0), drifting on scroll through `view()` timelines.
- **Type:** Inter Display headings (opsz, weight 740, tracking -0.022em) and
  body on the same Inter opsz file; the Plus Jakarta and Inter wght files
  are gone (2,684 bytes less).
- **D4 vibrancy:** the "Design Lab" headline takes its colours from the
  wallpaper, held to 3:1.
- **Layout (E5, E6, E7, E13, E16):** Services steps on one baseline; Home's
  ask a full-width strip; About's button on its pane; Contact's columns
  aligned; the footer a slim thick-glass dock; no glass on glass; "Birch"
  shows in the phone header; the header shadow deepens on scroll.
- **Text off the bare wallpaper:** every kicker, heading and link that sat on
  the field now sits on a surface.
- **The Liquid pane:** a frosted base for every engine; the SVG bevel only
  behind the Blink gate, mounted after the arrival has finished and the page
  is idle; no bevel on the header or pill shapes (it defeated their frost).
  Safari 17 keeps its blur: the build's CSS minifier had been dropping the
  `-webkit-` declarations; they now live in `@supports` blocks it keeps.
- **E10 off state** (reduced transparency, more contrast, forced colours)
  works in both schemes, including live toggles.
- **The lens placeholder:** a static frosted disc in the Home hero, under
  the content, where B2's WebGL lens goes.
- Phone targets at least 44 px in the header and footer.

### Vaporwave

- **The kiosk (E3):** the Lab CRT on a free-standing pedestal with the
  information desk header, TOUCH SCREEN TO BEGIN and the floor directory
  plaque; a marble sphere grounded beside it.
- **The lobby:** flattened atrium tile with a sheen, a potted palm and a
  marble column replace the sunset closers on Home and Services (F1 (b)).
- **Contact:** a `screensaver.scr` window playing the resort sunset inside
  the OS frame, converged on its vanishing point, with Settings and Preview
  buttons (inert until B2).
- **Sent:** a Win95 desktop, a patterned tile carried to the page bottom,
  with four aria-hidden desktop icons; `transmission.sys` has a close button
  only (E6).
- **About:** a three-tier pastel marble plinth between the columns, sized for
  the Venus, with a stand-in sphere seated on it; the plaque on two balanced
  lines (E12).
- **The system:** the restart loop is the only loop (the tear variant and
  `?vwLoop=` are gone), and every wrap now draws the full tear then its echo;
  Home's windows are a real cascade with the back window inactive (E4); kana
  in Dela Gothic One everywhere (E5); Win95 press and dotted focus (E8); the
  mobile and tablet pass (E10); the horizon at 30 fps with its far-line
  shimmer faded (E11); Home's intro composition (E13); four mixed-script
  titles (E14); floors pause off-screen (E15); the tray clock reads 19:93;
  your wall label, word for word; 44 px phone targets.
- The Home hero is unchanged (pixel-diffed against the base build).

## Calls for the founder

1. **Glass arrival is a little slower than before.** Arriving at glass from
   another school lands about 20 to 70 ms later than the pre-Stage-3 build in
   most cases (light desktop matches), and dark desktop holds the navy field
   a frame or two longer. The cause is the richer page's first draw, not the
   bevel (deferred) or the wallpaper. Options: accept it now and take it into
   the transitions phase (recommended; B2 adds the lens, so measure again at
   the gates), or make the first frame lighter now (a smaller wallpaper
   bitmap, fewer frosted panes in the first view).
2. **The pane bend.** In Chromium the bend reads mostly as a thinner frost
   band, about 25 px, at each pane's rim, where crisp orb edges show through:
   the Tier A look you approved. One switch (`FULL_FROST_TO_RIM`) frosts to
   the edge, but then the bend nearly disappears. Recommended: keep it.
3. **Sent's desktop** is a pink and cyan diagonal lattice in the school's
   palette, not Win95 teal. Keep, or go teal?
4. **Home and Services now end on a plain footer:** the lobby floor stops at
   the footer rule. Keep, or carry the floor on under the footer?
5. Small ones, taste: Home's glass ask as a full-width strip (the brief's
   other option is a centred card over an orb); the tablet vaporwave header
   drops "DESIGN LAB" from the wordmark between 621 and 860 px to fit one
   strip.

Owed before the PR, not a call: a look at glass on your iPhone (Safari's
frosted panes cannot be seen from Windows) and the iOS scroll check for the
lens once B2 builds it.

**Answered (09-25-26):** accept the later arrival and re-measure after B2;
keep the pane bend as approved; keep Sent's lattice; keep the plain footer;
push and stop (`stage3-decisions.md`, "Answers at the B1 stop").

## Where to look

- Glass: `scripts/themes/.out/stage3-b1/glass-final/` (`index.md` lists every
  sheet): full pages before and after, scrolled viewports (the wallpaper is
  fixed, so full-page shots show it only in the first screen), motion strips,
  and `s3-thumbnails.jpg`.
- Vaporwave: `scripts/themes/.out/stage3-b1/vaporwave-final/` (`index.md`):
  full pages before and after, crops of the kiosk, the About centrepiece, the
  Home closer, Contact's screensaver and Sent's desktop, motion strips.

## Gates

`npm run verify` on the B1 tree, clean: 347 unit tests, astro check 0 errors
and 0 warnings, 483 built-site tests. The full Stage 3 gates
(`harness/stage-gates.mjs`) run once after B2, as planned.

After the cleanup critic, the orchestrator fixed its last two findings by
hand: Sent's desktop pattern is now one surface (the body's background), so
it no longer restarts with a row of notches at the footer and the portal
tail; the kiosk sphere lost its added drop-shadow and CSS ellipse, keeping
only the contact shadow rendered with it. Sent's kana title went from 0.85 to
1.1rem, since the ultra-heavy Dela Gothic kanji closed up at 13.6 px.

## Next

B2 after your calls: glass's Control Centre, the production lens and the
Services settings pane; vaporwave's interactables, the marble pipeline and
the live Venus bust (once the download is in `scripts/themes/.out/meshes/venus/`);
then the Stage 3 gates, the S3 side by side and the stop.
