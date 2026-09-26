# Tier 3, Stage 3 (pair B: glassmorphism and vaporwave): decisions before the build

Written 09-25-26 at the start of Stage 3, from `HANDOFF-09-24-26-stage3.md`,
`stage0-decisions.md` (binding), the two briefs, `portal.md` section 1 "Pair 2"
and `stage2-report.md`. The Stage 0 rule: list the per-school decisions being
applied and let the founder revisit any of them before anything is built.
Branch `feat/theme-schools-tier3-stage3`, from `main` at `87608f0` (PR #90
merged 09-24-26).

Marked **[fixed]** where the founder has already decided, **[default]** where
"Tier 3 yes to all" makes the brief's recommendation stand unless revisited,
and **[ask]** where a call is open.

## References studied (09-25-26)

- **Vapordays (supyrb):** rendered 3D stills and loops. White marble statues
  (Venus de Milo, David, a portrait bust, a toga figure), glossy white grid
  tile rooms with floor reflections, potted palms, a beige PC with a CRT, VHS
  tapes, a teal-to-lavender glass panel, iridescent chrome ribbons, a rainbow
  prism on a black mirror floor, pastel cloud skies. Clean studio light.
- **Marbloid (supyrb):** isometric floating plazas of marble slabs (black
  with white veins, white, pink), pastel-tinted and holographic busts and
  statues, chrome-iridescent dolphins, glossy spheres, fluted columns, palms,
  CRTs, grid tile, low-poly faceted holographic figures, pastel cloud skies.
- Read: glossy, pastel-tinted, over-stylised, rendered. The statuary is
  pristine; the tint, gloss and staging are what keep it off Greek revival.

## Glassmorphism

1. **D1 lineage: Liquid Glass forward [fixed].** Lensing and refraction,
   specular edge light, tint that adapts to what is behind, controls that
   materialize.
2. **How the lensing is made [ask].** True refraction of the page behind a
   pane has two routes on the web:
   - (a) An SVG displacement filter in `backdrop-filter`. Real bending of
     whatever sits behind the glass, pure CSS and SVG, cheap. Chromium only
     (Chrome, Edge, Android). Safari, including an iPhone, and Firefox get
     frosted glass with the specular edge and tint but no bend.
   - (b) WebGL: one canvas draws the wallpaper and orbs itself and bends them
     under the glass. Works in Safari. Heavy: script-drawn (so drawing ahead
     does not warm it), and keeping it in step with momentum scrolling on
     iOS is a real risk.
   - (c) (a) for every pane, plus a WebGL lens only on the one draggable
     glass object, so an iPhone still sees bending where it matters most.
   - Recommendation: **(c)**. The draggable lens is where refraction is the
     point; everywhere else (a) degrades to good frosted glass. To be proven
     in Tier A before it is committed to (Safari behaviour confirmed, not
     assumed).
3. **Palette lead [ask, shown first].** Warm (Big Sur: orange, coral, deep
   blue) or blue (Windows 11 Bloom). Magenta and cyan as accents only.
   Recommendation: **warm Big Sur**. It is Apple's own lineage, which Liquid
   Glass forward points at, and it is the farthest from vaporwave's pink,
   violet and cyan. Dark becomes deep blue with ember and coral light, not
   indigo and violet. Tier A shows both as comps beside vaporwave dark at
   sheet scale, desktop and phone.
4. **Chrome [fixed, S3].** No window title bar; keep the traffic lights.
5. **Interactable details [ask on the set].** Proposal:
   - A Control Centre cluster on Home, glass's own platform object (as the
     taskbar is vaporwave's): the kept hero toggle flips the glass between
     Clear and Tinted (the iOS 26 setting, literally); a frost slider sets
     the blur on every pane; a segmented control picks the wallpaper's time
     of day (dawn, day, dusk); the location pill stays.
   - A draggable glass lens you can slide across the wallpaper (the item 2
     showpiece).
   - Services' four steps become one settings-style grouped pane (E1) with
     inert switches and a stepper beside each step (`aria-hidden`, not
     focusable).
   - Settings made with the live controls hold across glass pages for the
     session.
   - Live controls are real `<button>`/`<input>` with `aria-label`; inert
     ones follow the README.
6. **D3 noise: none [fixed].** Back to the founder only if the glass needs it.
7. **D2 contrast method: C [default]**, the WCAG 3:1 floor for display-only
   regions.
8. **D4 the coloured headline [ask, revisit].** Default B keeps the
   Dribbble gradient "Design Lab" as the one coloured text. Under Liquid
   Glass forward, recommendation: **C, vibrancy**: the headline takes its
   colour from the wallpaper behind it (Apple's vibrant text), still the one
   coloured text, held to 3:1.
9. **D7 orbs: B, flat discs with crisp edges [default].** Crisp edges are
   what lensing visibly bends, so B suits Liquid Glass better still.
10. **D8 heading face [ask, revisit].** Default A keeps Plus Jakarta Sans
    (chosen for the hybrid). Recommendation under Liquid Glass forward:
    **B, Inter Display** through Inter's `opsz` axis, the nearest open face
    to Apple's SF. Tier A shows a specimen of both on the hero.
11. **Work:** E1 to E14 and E16 under Liquid Glass, plus item 5. E10 (reduced
    transparency, increased contrast) stays: S1 drops reduced motion only.
    E4's reduced-motion guard is dropped under S1. Glass's page-swap
    choreography stays the transitions phase's. E15 and D6 were done in
    Stage 2.

## Vaporwave

12. **F1 = (b) [fixed].** The Home hero stays exactly as it is, the one
    sunset. Other pages: mall, lobby, screensaver and desktop framing.
13. **F2 the wall label [ask, words are the founder's].** Drafts (studio
    "we", no em dashes):
    - era: "The internet, 2010 to 2013, dreaming of mid-90s software and
      shopping malls."
    - signature: "Windows 95 chrome, file names for titles, Japanese for
      headlines, a mall lobby and glossy marble statuary, with one sunset
      screensaver on the front page."
    - lesson, three options:
      - A. "Nostalgia gets sold back to us as leisure. The lobby, the
        screensaver and the marble feel like comfort, and the comfort is the
        product."
      - B. "We borrow the mall, the operating system and the museum gift
        shop, because vaporwave's point is that comfort was always for
        sale."
      - C. "The genre remembers a future somebody sold us, and plays it back
        until the memory itself feels like home."
14. **F3 the head [ask, concrete proposal].** Rendered marble, not drawn:
    - An offline render pipeline, committed under `scripts/themes/vaporwave/`
      (three.js in the GPU Playwright browser): glossy, over-stylised marble
      with a pastel tint and iridescent chrome accents, studio light, pink
      and cyan rim light. Output: transparent AVIF and WebP stills.
    - Stills dress the new rooms: a bust and a glossy marble sphere beside
      the Home information desk (the kiosk, E3), a column and palm on the
      lobby tile (Services closer), the About centrepiece.
    - About's bust is live: About has no WebGL canvas today, so it takes its
      one: drag to turn the bust, a slow idle turn, and the still render as
      its poster, so a blank canvas and the drawn-ahead copy both show it.
    - Source mesh: a CC0 museum scan (licence to be confirmed in Tier A),
      compressed for the web. `assets.provenance` moves from
      `original-vector` to `public-domain`, with a note. Downloading the
      mesh needs your yes (file, source and size named first).
    - Damage: recommendation **pristine, tinted and glossy**, as in your
      references, with no broken column; the tint and gloss carry the
      vaporwave read. The brief's chipped bust and snapped column are the
      alternative.
    - Cheaper alternatives: stills only (no live canvas), or the brief's
      drawn vector bust.
15. **F4 the grid: (b), a loop with a visible seam [default, shown first].**
    Tier A films drive against loop side by side before it is committed.
16. **F5 captions [default].** Static inactive back windows only; keep the
    three-stop active bar; the inactive bar goes two-stop. Before and after
    of Services shown.
17. **F6 bottom taskbar echo: declined [default].**
18. **The pressed task button on an in-school swap [ask, backlog].** Instant
    or a 250 ms fade of that button only. Recommendation: **instant**. Win95
    buttons snap, E8 gives the button its press on pointer down, and the
    taskbar already holds still through the swap.
19. **Interactable details for vaporwave [ask on the set].** S3 makes "more,
    not fewer" a rule for every school. Proposal:
    - Windows drag by their title bar on desktop (they settle back on the
      next page).
    - Contact's `screensaver.scr` window gets Win95 Display Properties
      buttons: Settings cycles the screensaver loop (the resort sunset, a
      marble sphere, 3D pipes), Preview runs it full-window until a click.
    - The kiosk's TOUCH SCREEN TO BEGIN plays a short attract loop on the
      CRT when tapped.
    - Caption buttons press (bevel inverts) and do nothing else, `aria-hidden`.
    - The frozen 12:00 tray clock stays frozen (protected).
20. **Work:** the E3 plaza (kiosk and lobby tile), E4 to E8, E10 to E15 and
    the rest of E9, under F1 (b), with F2 to F5 as decided. E1, E2, the E3
    floor tail, the font preloads and the light CRT power-on were done in
    Stage 2. Phone targets under 44 px in both schools' chrome are fixed
    here.

## How Stage 3 runs (proposal)

- **Before anything:** film the before set (`motion.mjs --label
  stage3-before`, the same 48 as `stage2-after`), machine alone.
- **Tier A, proofs (stop after):** the palette comps, the lensing spike in
  Chromium and WebKit, drive against loop, the type specimen, the Services
  captions before and after, and the marble pipeline's first render with a
  confirmed CC0 mesh. Nothing merges; the founder picks.
- **Tier B, the build (stop after):** glass and vaporwave in parallel
  builders on their own `snap.mjs` ports, an Opus critic per school, Sonnet
  verifiers with required adversarial cases and a films minimum, then the
  S3 side-by-side, `harness/stage-gates.mjs`, strips and sheets.
- Scripts go in `scripts/themes/` or `scripts/themes/harness/` (and
  `scripts/themes/vaporwave/` for the render pipeline), never a scratchpad.

## Answers (founder, 09-25-26)

"Everything sounds pretty good to me." Every [default] stands. The [ask]
items:

1. Lensing: **(c)**, yes. Asked what the glass lens would look like; shown a
   live canvas mock (a draggable clear puck over a warm wallpaper: centre
   magnified, edge band pulling in what lies just outside with a faint
   colour fringe, bright top-left rim, a soft shadow, stretching along a
   fling and settling back, Clear and Tinted).
   - Founder on the mock: "i like the draggable lens in clear or tinted.
     can we make it a little less bouncy when dragging? kind of rubbery
     where we're shooting for glass." So the lens handles as rigid glass:
     at most about 4% stretch along a fling, eased in and out with no
     oscillation, a glide that decays to a stop (no spring, no overshoot),
     no bounce off the edges (it stops against them), and a small lift
     (deeper shadow) while held. A second mock showed that feel.
2. Palette: **warm Big Sur** leads.
3. Glass controls: yes, "we'll just have to see how that actually
   manifests".
4. D4: **C, vibrancy** (the founder took the recommendation).
5. D8: **show both** (Plus Jakarta Sans and Inter Display) in Tier A.
6. F3: **the proposal as written** (rendered, pristine, tinted and glossy;
   stills dress the rooms; About's bust is live and draggable; CC0 mesh,
   downloaded only after the founder's yes with file, source and size).
7. F2 era: **"2012 to 2017"** (founder: "i don't really know the vaporwave
   history"). Draft era becomes "The internet, 2012 to 2017, dreaming of
   mid-90s software and shopping malls." The signature draft stands; the
   lesson (A, B or C) is still to pick, A by default.
8. Pressed task button: **instant**.
9. Vaporwave interactables: yes. **The frozen tray clock reads 19:93, not
   12:00** (founder). It stays frozen and `aria-hidden`.

## Answers at the Tier A stop (founder, 09-25-26)

To `tier-a-report.md`:

1. Heading face: the founder asked why Plus Jakarta over Inter Display
   (the recommendation was Inter Display) and to see a side by side; sent
   `type/specimen.png`. **Plus Jakarta Sans** (founder: "i like plus jakarta
   since it's more square"). D8 = A; the heading face stays as it is.
2. Tear or restart: the founder asked whether the tear is an artistic
   choice or a bug. Answered: a choice (brief F4 (b)): vaporwave's canon
   motion is a loop with its seam showing, like a GIF or a tape loop
   restarting, and the tear is a two-frame tape-tracking jolt at that
   seam; the old endless forward drive is outrun's "driving" feel. **Open:**
   tear, restart, or keep the old drive (F4 (a)).
3. Lens: **the recommendations, tweak from there**: the WebGL lens
   everywhere, under the page content in the Home hero's empty half.
   Pane edge: **bending inward**.
4. Marble head: **discuss further and see options.** The founder is happy
   to make a free account somewhere (for example Sketchfab) but will not
   pay for any model. Next: show the candidates side by side (and look at
   other free sources, such as threedscans.com, whose licence must be
   checked on its own page), then the founder downloads the pick.
5. Dev tools: **yes**: add `meshoptimizer` as an explicit devDependency and
   keep `sharp` for AVIF.
6. WebKit: the founder asked whether Playwright is not already installed.
   Answered: the Playwright package and its Chromium are installed; WebKit
   is a separate engine download (about 150 MB). **Open:** yes or no.
   Wall label lesson: the three drafts were put to the founder again.
   **Open.** Era: "whichever years are the correct one": vaporwave began
   in 2010 to 2011 (Eccojams 2010, Floral Shoppe 2011), its core visual
   canon is 2011 to 2013, and the glossy rendered-marble wave the founder
   references is 2017 to 2019 (supyrb's Vapordays renders are dated 11-17
   to 04-18; Marbloid 2019). Recommended wording: "The internet in the
   2010s" (correct across all of it). **Open:** confirm.
7. Push: "only if we're at a good stopping point" (the context window was
   getting full). Stopped here with a handoff; branch pushed.

## Final answers at the Tier A stop (founder, 09-25-26)

These settle the open items above; where they differ, these win.

1. Heading face: **Inter Display** (D8 = B). Founder: "if it's for
   glassmorphism, inter display probably fits better with that style." This
   replaces the "Plus Jakarta, more square" answer given minutes before.
   Weight about 740 with tracking about -0.022em (the proof's match to
   Jakarta 760); with brief E14 one Inter opsz file serves headings and
   body, about 2.7 KB less than today once the Jakarta and Inter wght files
   go.
2. Grid loop: **restart** ("kind of torn but let's give restart a try").
   Tier B removes the 'tear' variant and the proof-only `?vwLoop=` query.
3. (Unchanged: the lens recommendations, bevel inward.)
4. Marble head: a next-session discussion with options, as above.
5. (Unchanged: meshoptimizer and sharp.)
6. **Playwright WebKit: yes** (install it at the start of the next
   session). Wall label: **lesson B, reworded by the founder**; era **the
   2010s**. The label becomes:
   - era: "The internet in the 2010s, dreaming of mid-90s software and
     shopping malls."
   - signature: "Windows 95 chrome, file names for titles, Japanese for
     headlines, a mall lobby and glossy marble statuary, with one sunset
     screensaver on the front page."
   - lesson: "We borrow the mall, the operating system and the museum gift
     shop, because the ethos behind vaporwave is that comfort was always
     for sale."
7. Record everything, push the branch, update the handoff and memory; the
   founder starts a new session.

## Answers at the start of Tier B (founder, 09-25-26)

To `tier-b-plan.md` and the candidates sheet
(`scripts/themes/.out/stage3-proofs/marble/candidates.jpg`, made by
`scripts/themes/vaporwave/marble-candidates-sheet.mjs` from
`marble-candidates.json`; the sweep is in `proofs/marble.md`):

1. Marble head: **the Venus** ("i like the venus one honestly"): the Musée
   Saint-Raymond's Tête d'Aphrodite-Vénus from the Chiragan villa (Parian
   marble, 1st century, a Knidian Aphrodite type), CC0 on Sketchfab,
   199,994 triangles. Checked at 1920 px before asking for the download:
   nose, lips and chin intact; an old break line crosses the neck, which the
   plinth cut hides. The founder downloads it (free Sketchfab account).
2. Glass wallpaper: **painted offline** into image files (dawn, day and dusk
   in each scheme), one source for the CSS background and the lens texture.
3. Tier B runs in **two waves with a stop between**: B1 the rooms, B2 the
   showpieces and interactables, then the gates.
4. B1 dresses the rooms with the **Tier A stand-in stills**; the head goes in
   during B2.

## Answers at the B1 stop (founder, 09-25-26)

To `tier-b1-report.md`, "Calls for the founder":

1. Glass arrival 20 to 70 ms later than the base build: **accept, revisit
   later** (re-measure at the Stage 3 gates after B2 adds the lens; the
   transitions phase takes it with the other arrival work).
2. The pane bend: not raised separately; the approved Tier A look stands
   (`FULL_FROST_TO_RIM` stays false).
3. Sent's desktop: **keep the pink and cyan lattice** (not Win95 teal).
4. Home and Services: **keep the plain footer** (the lobby floor stops at the
   footer rule).
5. **Push the branch and stop here**; B2 starts in a new session.

Then: the Venus is downloaded (`scripts/themes/.out/meshes/venus/`, CC0 per
its `license.txt`), and the founder's iPhone look at glass will happen **after
deploy** ("i'll have to look at the glass on iphone after it get deployed").

## Answers at the start of B2 (founder, 09-25-26)

To the B2 launch questions, on branch `feat/theme-schools-tier3-stage3-b2`
(fresh from `main` at `29733fc`):

1. The Venus's default tint: **white marble with pastel rims** (lavender-grey
   veins; the pink and cyan rim light carries the vaporwave read). The
   builder still renders every tint as a sheet for the B2 stop.
2. Glass Control Centre settings (Clear/Tinted, frost, time of day) **hold
   for the whole session, including after leaving glass and coming back**
   (sessionStorage), applied before first paint on return. If the drawn-ahead
   arrival cannot avoid a visible flip, the builder reports it rather than
   shipping the flash.
3. The merged branches `feat/theme-schools-tier3-stage3` and
   `fix/vaporwave-screensaver-phone` are **deleted**, locally and on the
   remote.
4. The B2 model plan with split seats and Opus `high` critics (below, in
   `tier-b-plan.md`, "Wave B2 as run"): **launch as proposed**.
