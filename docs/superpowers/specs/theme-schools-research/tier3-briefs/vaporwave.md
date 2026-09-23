# Vaporwave: Tier 3 brief

Written 09-23-26 from three Tier 2 critic reports (authenticity B, craft B+, motion B), the research dossier (`dossiers/vaporwave.md`, cited as [n]), and spot checks of the captures and code. The founder rates this school great and counts it a personal favourite. Tier 3 raises it and keeps its character. Copy, link targets, the page set, the form, and the portal head and switcher are fixed by contract. Everything visual is open.

## 1. Verdict

**Current grade: B.** The software layer is real vaporwave and among the best work in the portal. The taskbar header, the Win95 windows with bevels and accelerators, the file-name titles, the C:\> kickers, Japanese used as titles, contact as a mail client and Sent as a system dialog all come straight from the canon [1][5][11][14]. Three things hold it at B. First, the picture layer is synthwave's, not vaporwave's: a striped sun on all five pages (twice on Home) and a cyan grid on four, with no plaza, lobby or information desk anywhere (tells 1 and 4, traps 1 and 5) [4][6][9][15]. Second, there are concrete craft faults: Contact scrolls sideways at 1440, horizons sit off their vanishing points, window pairs look misaligned rather than cascaded, and every page's floor stops 76px short of the page bottom. Third, the in-school page swap flashes a white hero and then a red sky with a lime-green sun. **A+ here** keeps the Home hero exactly as the founder loves it, as the school's one sunset screensaver, and fixes every craft and motion fault. It also adds the missing canon centre, a corporate-leisure layer (information-desk kiosk, lobby tile, one found classical head), so the whole reads as "a 1995 PC in a mall lobby" and not "an outrun poster with windows on it". The work adds; it does not strip.

## 2. Protect

These survive revision unchanged in character. All three critics agree on each unless noted.

- **Taskbar header** (`Header.astro`): wordmark as Start, nav as task buttons with the current page pressed via `aria-current` (inverted bevel and hatch), and the tray with バーチ and a frozen 12:00. The mixed-script tray is the best single canon detail in the build [11][12].
- **Window chrome** (`parts/Win.astro`, `.vw-win*`): title-bar icon, bevel hi/lo edges, underlined menu accelerators, the Go address bar on web_design.htm, and founder.txt's File/Edit/Search/Help, which is Notepad's own menu [11][14].
- **File-name titles and prompts**: software.exe, web_design.htm, custom_software.exe, setup.exe, new_message.eml, mail.txt, transmission.sys, beorc.txt, founder.txt, and the C:\> kickers. This is the "B:/Start Up" move [5].
- **Japanese as titles**: バーチ・デザイン・ラボ, デザイン, サービス, シャイニング・ツリー, メッセージ送信完了, and the vertical outline kana beside the sections they name [1][7].
- **Services setup.exe progress bars** (STEP 1/4 to 4/4, the last cyan): the best single craft idea in the school.
- **The Home hero as one set piece**: CSS sky under the WebGL canvas, striped sun, palms, low-poly ridges, chrome Dela Gothic BIRCH, katakana title, and the VCR OSD (PLAY, SP 0:19:85). This is the founder's favourite. Fixes may change its cost and seams, never its composition.
- **Light "pastel dawn" scheme**: designed, not inverted, and the nearer of the two schemes to the pastel register (dossier section 5). The Lab CRT stays dark in light, as a screen should. `nativeScheme` stays.
- **CRT arrival from another school** (`vw-crt-off` / `vw-crt-on`, theme.css:397-422): recorded-media hardware, done by about 640ms, readable on a phone (dossier 6.7).
- **fx.ts lifecycle**: owner check, DPR cap, IntersectionObserver and visibility pauses, context loss and restore, scheme re-read, WEBGL_lose_context on teardown, STILL_TIME frame under reduced motion.
- **Reduced-motion coverage and the five-blink limit** (WCAG 2.2.2).
- **`.vw-btn` press physics** (hover lifts to an 8px drop, active sinks to 2px) and the contact inputs' cyan-outline and pink-halo focus.
- **Beorc rune on marble, the Lab CRT with the VW-1985 badge and phosphor LEDs, the About columns and meander** (kept; see F3 for adding damage).
- **Type system**: Libre Caslon Display for headings, Exo 2 for body, VT323 for mono and chrome, Dela Gothic One for the billboard.

## 3. Execution work, ordered by leverage

Items marked **(gated)** depend on a founder decision in section 4. Do them after that call, or do only the part the call cannot change.

### E1. Fix the in-school page swap (white hero, green sun, TV switching off)

- **Where**: `theme.css:398-429` (in-school root animations and `@keyframes vw-track`); `fx.ts` context creation (about line 372). Every page swap inside the school, both schemes, desktop and mobile.
- **Change**:
  (a) The outgoing Home hero loses its WebGL pixels in the snapshot and shows a grey-white field behind the palms for 160 to 320ms. Keep the pixels: either create the context with `preserveDrawingBuffer: true`, or on `astro:before-preparation` render one last frame and set the canvas to `visibility: hidden` so the dark CSS sky shows.
  (b) The in-school old root runs the power-off keyframe (`vw-crt-off` with `brightness(3)` and `scale(1, 0.02)`). Give it its own short keyframe: opacity 1 to 0 over about 120ms, with no brightness boost and no squash. Keep `vw-crt-off` for leaving the school.
  (c) In `vw-track`, remove `hue-rotate(60deg) saturate(2)` and `hue-rotate(-30deg)`, or cap them at about 8deg. Carry the tracking error with `translateX`/`skewX` on `steps()`, one horizontal tear band (clip-path), and at most `brightness(1.15)`. Keep the 360ms `steps(6)` cadence. If a chroma split is wanted, use a brief `--neon-pink`/`--neon-cyan` text-shadow on the incoming h1, not a hue rotation of the whole root.
- **Why**: all three critics (motion 1 and 2, authenticity 8, craft 12). I confirmed it in `motion-tier2/vaporwave__page__dark__desktop.png`: +160 to +320ms show a grey-white hero, and +400ms shows a red sky with a lime-green sun. Motion's diagnosis (lost drawing buffer plus the CRT-off keyframe on an in-school swap) is more precise than authenticity's "white slab" and is the one to follow. Green is off-palette, and a full-frame colour inversion reads as a GPU fault, not tape [dossier 6.7].
- **Verify**: re-film `vaporwave__page__{dark,light}__{desktop,mobile}`. No frame may be lighter than the scheme's sky, and no hue may fall outside the pink/violet/cyan/peach band. The +400ms frame should show the About hero in its own colours with at most a horizontal tear.

### E2. Stop Contact scrolling sideways at desktop

- **Where**: `pages/Contact.astro:85-111` (`.trust`, `.trust-part { white-space: nowrap }`), desktop 861px to about 1500px, both schemes.
- **Change**: let the trust line wrap between parts at every width. Set `.trust` to `display: flex; flex-wrap: wrap; column-gap`, keep `nowrap` inside each part, and hide `.sep` when parts wrap. The simplest route is to stack the two parts as terminal lines at every width, as the 520px rule already does. Drop `.trust` to about 1.15rem in the side column. Add `min-width: 0` to the side column's grid child.
- **Why**: craft 1 and authenticity 9. Confirmed: both `t-vaporwave-contact__*__desktop.png` are 1471px wide, while every other desktop capture is 1440. mail.txt and its shadow run 31px past the viewport.
- **Verify**: the contact desktop captures are 1440 wide. Also check `document.documentElement.scrollWidth <= innerWidth` at 1024, 1280 and 1440.

### E3. Build the plaza: the Lab CRT as an information desk, the footer floor as lobby tile

- **Where**: `pages/Home.astro` `.crt` (Lab block); `Footer.astro:24, 59-61` (`.floor`, `.plane`); the portal tail `[data-portal-tail]` (README "Footer"). All pages, both schemes, all viewports.
- **Change**:
  - Kiosk: keep the CRT, its badge and its LEDs. Add an aria-hidden kiosk header strip above the screen such as `インフォメーション INFORMATION DESK`, a `TOUCH SCREEN TO BEGIN` strip under it, and a small floor-directory plaque (for example `B1 SOFTWARE / 1F WEB / 2F LAB`, decorative only). Make the housing read as a free-standing kiosk (a plinth or base under the bezel), not a desk monitor. Visible copy is untouched.
  - Lobby tile: flatten the floor's perspective (a higher camera, less vanishing), add a soft reflective sheen band and a planter or column base at one edge, and remove any horizon glow. The floor should read as polished atrium tile, not a road to the horizon.
  - Floor to the bottom: the flat 76px band under every floor is the portal tail, which this school never paints. Paint `[data-portal-tail]` with the floor's continuation, or its lower-edge colour, from the footer's scoped styles, following the README's contract (never target it beyond painting its background). Alternatively, fade the plane's near edge with a mask so no hard edge shows.
- **Why**: dossier priority 1, tell 1, gap 1 [4][6][1: 情報デスクVIRTUAL]; authenticity 2 and 15; craft 4. I confirmed the tail cause in `t-vaporwave-contact-sent__light__desktop.png`: the floor ends at y 1246 and the flat band runs to 1322, which is 76px, the portal tail's height.
- **Verify**: the Home captures show a kiosk that reads as public information furniture at a glance. On every page's captures the floor meets the bottom edge with no flat band. Light and dark both.

### E4. Make the window stacks read as an OS: inactive back windows, true cascades

- **Where**: `parts/Win.astro` (add an `inactive` prop) and `.vw-win-bar` in `theme.css:261-267`; `pages/Services.astro` (custom_software.exe behind web_design.htm); `pages/Home.astro` (the software.exe / web_design.htm pair). Desktop and tablet.
- **Change**:
  - Add an inactive caption: a desaturated lavender or grey two-stop gradient with dimmed title ink (contrast-checked; record it in `meta.ts` if the palette is declared there), plus dimmed caption buttons. Apply it statically to the back window on Services and on Home. The active bar keeps its current look (see F5).
  - Services: size custom_software.exe to its content plus the overlap (drop any min-height), or move the overlap up so it covers body text, not an empty purple slab.
  - Home: commit to a real cascade. The second window offsets in x and y and overlaps the first by 40 to 60px, with the back one inactive, as Services does. Otherwise level the pair on one row with `align-items: stretch`. The current 56px vertical drop with mismatched heights reads as a grid bug.
- **Why**: dossier priority 5, gap 6, trap 3 [14]; authenticity 5; craft 6 and 7; motion 11. Motion rates the whole feature a founder call because it quiets the neon bars. I split it: static inactive state on back windows only is execution (it is what makes an overlap read as a cascade), while focus-follows-hover or scroll is left to F5.
- **Verify**: on `t-vaporwave-services__*__desktop.png` exactly one bar is neon. On Home desktop and tablet the pair reads as a deliberate cascade (or a level row), with no blank slab visible.

### E5. Set the kana in Dela Gothic One

- **Where**: `src/pages/t/vaporwave/[...page].astro:10` (imports only `latin-400.css`); `.vw-kana`, `.tray-kana`, `.opener-kana`, `.intro-kana` and any other kana selectors.
- **Change**: import `@fontsource/dela-gothic-one/japanese-400.css` (unicode-range sliced, so only the slices hit download) and put Dela Gothic One first in every kana stack, keeping the OS fallbacks after it. Check that the outlined vertical kana still read at their weights. Measure and record the bytes transferred per page.
- **Why**: dossier priority 6, section 5 [type]; authenticity 7. Thin OS kana next to the heavy chrome BIRCH clash, and they vary by device.
- **Verify**: `t-vaporwave__dark__desktop.png` shows デザイン and バーチ・デザイン・ラボ in the same face family as BIRCH. Record the added KB in the commit message.

### E6. Make Sent a correct message box on a grounded stage

- **Where**: `parts/Win.astro` (add a `buttons` prop: `'full' | 'close' | 'help-close'`); `pages/Sent.astro` (dialog, stage, `--hz-*` at lines 37 and 62). Desktop and tablet, both schemes.
- **Change**:
  - Render transmission.sys with a close button only. A Win95 message box has no minimise or maximise [11][14].
  - Give it message-box layout: the striped-sun check glyph left of the text at icon size, with text and CTA sharing one left edge. At present the CTA hangs right-aligned under a left-indented paragraph, which gives the card two alignment edges. As an option, set the CTA as the default button with a dotted focus rectangle (see E8).
  - Let the stage's floor run to the footer rule: tie `--hz-line` to the stage's full height, or shorten the stage. That removes the smeared band at y about 775 and the empty 130px strip beneath it.
  - The sun's placement here is **(gated)** by F1. If a sun stays, apply E7.
- **Why**: authenticity 6; craft 3. Confirmed in `t-vaporwave-contact-sent__light__desktop.png`: three caption buttons, the CTA's right edge misaligned with the text column, and the grid ending in a pale band well above the footer.
- **Verify**: the Sent captures show a single close button, one text edge, and a floor that meets the footer.

### E7. One rule for every horizon: the sun sits on the vanishing point **(gated by F1)**

- **Where**: `parts/Horizon.astro` (expose `--hz-vp-x`, defaulting to `var(--hz-sun-x)`); `Services.astro:145` (`--hz-sun-x: 66%`), `Sent.astro:37` (`84%`); Contact's side scene.
- **Change**: make the grid's vanishing point follow `--hz-sun-x`, or centre the sun. Wherever a sun survives F1, it must sit on the grid's convergence, and no rectangle may clip its stripes (Sent's lower stripes are cut at the dialog's shadow edge).
- **Why**: craft 2. The Home hero centres its sun on the vanishing point, but Services and Sent hang theirs off-axis over a centred grid, which reads as an accident.
- **Verify**: every horizon in the desktop and mobile captures converges under its sun.

### E8. Give the taskbar and buttons real Win95 behaviour

- **Where**: `Header.astro:537-571` (`.wordmark`, `.task`); `theme.css:214, 322-324` (global focus, `.vw-btn:hover`); footer links; `.vw-more`.
- **Change**:
  - Press state: on `.wordmark:active` and `.task:active`, swap `border-color` to `var(--bevel-lo) var(--bevel-hi) var(--bevel-hi) var(--bevel-lo)`, take the `--task-pressed` fill, and shift the content 1px right and down, with no transition. Give `.wordmark` a hover to match `.task:hover`. This also gives the wordmark morph something to morph from inside the school.
  - Focus: on `.task`, `.wordmark` and `.vw-btn`, draw a `2px dotted currentColor` outline at about `-5px` offset (inside the bevel), plus a contrast-checked outer `box-shadow: 0 0 0 2px var(--link)` so WCAG 2.4.11 holds. Keep the cyan ring on text links.
  - Touch: wrap hover rules for `.vw-btn`, `.task`, `.wordmark`, `.vw-more` and the footer links in `@media (hover: hover) and (pointer: fine)`. Leave `:active` unconditional.
- **Why**: motion 4, 5 and 6 [11][14]. A school whose grammar is bevelled controls needs its controls to press.
- **Verify**: a keyboard pass on desktop shows the dotted rectangle inside each task button. A tap on the tablet or mobile emulation leaves no lifted CTA or tinted task button behind.

### E9. Keep the taskbar still during swaps; clean up the arrival

- **Where**: `Header.astro` scoped style (`.taskbar`); `theme.css:397-422` (arrival and wordmark group); header CSS load order.
- **Change**:
  - Give `.taskbar` a CSS `view-transition-name: vw-taskbar`, with `::view-transition-group(vw-taskbar)` set to `animation: none` for in-school swaps, so only page content tracks. Contract check: the README bans extra `transition:name` *directives*; the built guard (`tests/built/portal.test.ts:111`) only fails on duplicate CSS `view-transition-name`s, and none exist in this school today, so a unique CSS name passes. Catch: on arrival from another school, `vw-taskbar` exists only on the new page, so it would animate apart from the CRT power-on. Either give `::view-transition-new(vw-taskbar)` the same `vw-crt-on` on arrival, or scope the name to in-school swaps. If neither is clean, fall back to starting `vw-track`'s clip-path below the taskbar and removing the skew.
  - Arrival wordmark: fade `::view-transition-old(wordmark)` out over the first 120ms and bring `::view-transition-new(wordmark)` in from about 300ms, so the empty bevel with ghosted serif text never shows.
  - Light arrival: under `[data-scheme='light']`, drop `vw-crt-on`'s 65% brightness from 1.5 to about 1.1. The pastel page currently goes nearly white at +480 to +640ms. The dark interstitial can stay.
  - Mobile light arrival FOUC (header unstyled at +480ms, bevelled at +560ms): make sure the header's styles are in the new document's head before the snapshot, or hold the header's opacity at 0 until they apply.
- **Why**: motion 3 and 8; craft 13. In the OS the school quotes, the taskbar is the fixed thing while windows change [11].
- **Verify**: re-film the page strips (taskbar identical in every frame) and the arrive strips (no ghost wordmark, no white-out in light, no unstyled header at +480ms on mobile light).

### E10. Mobile and tablet pass

- **Where**: all h1s (the chromatic text-shadow); `.vw-win` shadow and `.vw-wrap`; `Header.astro` at 820px and 390px; `Footer.astro` nav; Home's "HOW WE BUILD" and "[ VISIT THE LAB ]".
- **Change**:
  - Chromatic split: scale the offset with the type (about `0.03em`, clamped to 1 to 3px) and lower the alpha under 700px, so 3rem Caslon on a phone is not tripled.
  - Window shadow: under 520px, drop the offset to 6px, or add the offset to `.vw-wrap`'s right padding, so windows sit centred in a 390 column.
  - Tap targets: pad both secondary links to a 44px hit area (padding-block with a matching negative margin). Anchor HOW WE BUILD as a mono status line right-aligned under the what-we-build windows, so it belongs to them.
  - Tablet header at 820: fit one strip (tighter task-button padding, Start as icon plus BIRCH), and keep バーチ in the tray wherever it fits. Phone: keep two rows, with row one Start only and the tray at the right of the button row, so it reads as a docked bar.
  - Tablet footer nav: fit all four links on one line (tighter letter-spacing) or use a deliberate 2x2, so CONTACT is never stranded alone.
- **Why**: craft 5, 9, 14 and 15.
- **Verify**: the `tier2-mobile` and `tier2-tablet` captures for services, about and home (h1 legibility, centred windows); `t-vaporwave__light__tablet.png` header and footer.

### E11. Throttle and de-shimmer the WebGL horizon

- **Where**: `fx.ts:479-485` (tick), `:433` (DPR), `:326-334` (floor lines).
- **Change**: throttle drawing to 30fps (skip frames under 33ms, as the studio's other fields do). Cap DPR at 1.25 on coarse-pointer or narrow viewports. Fade far grid lines earlier as they thin (for example `1.0 - smoothstep(0.04, 0.18, wz)`), and scale alpha by true line width so the rows under the horizon stop crawling. No palette or composition change.
- **Why**: motion 7 and 9. The shimmer sits in the most-watched band of the founder's favourite hero.
- **Verify**: the `vaporwave__fx__dark__desktop.png` frames show no dotted speckle rows between the horizon glow and the first solid grid row. The composition matches the current captures.

### E12. About's marble plaque

- **Where**: `pages/About.astro` quote plaque and plinth, desktop.
- **Change**: balance the spaced caps into two sentences (`text-wrap: balance` with a max-width of about 26ch, or a line break in the markup that leaves the copy string unchanged). Make the plinth a deliberate stepped base (two tiers, each about 12px wider) or match the plaque's width exactly. Remove the window-style offset shadow from the marble object.
- **Why**: craft 8. Marble is statuary, not a window.
- **Verify**: `t-vaporwave-about__*__desktop.png`: two balanced lines, no lone GUARANTEE, and a base that reads as intended.

### E13. Home hero copy and kana composition

- **Where**: `pages/Home.astro`, the intro block and the outline デザイン, desktop.
- **Change**: align the kana block's top to the h1's cap height and its right edge to the windows' right edge (about x 1310). Size it to span the h1 and lede, and bring the lede to the h1's measure, so the left block and the kana column form one composition with no 300px hole.
- **Why**: craft 10.
- **Verify**: `t-vaporwave__*__desktop.png`, y 900 to 1310.

### E14. Mixed-script decorative titles

- **Where**: aria-hidden window titles and badges site-wide (`Win.astro` titles, the CRT badge, kiosk strips from E3).
- **Change**: mix Japanese and Latin in single decorative labels, as the canon does ("外ギン Aviation" [1]). Examples: `サービス services.exe`, `メール new_message.eml`, `VW-1985 ビデオ`. Visible headings stay as they are. Keep it to three or four labels so it stays titling, not wallpaper (trap 4).
- **Why**: authenticity 13, dossier gap 10 [1].
- **Verify**: the desktop captures show mixed-script bars on a few windows only.

### E15. Pause the CSS floors off-screen

- **Where**: `theme.css:370` (`.vw-floor::before`, `1.6s linear infinite`), used on the Home closer, Services ask, Contact side and Sent stage (whichever survive F1), and the footer floor if it animates.
- **Change**: one shared IntersectionObserver that toggles `animation-play-state`. This is independent of F4's loop-or-drive call.
- **Why**: motion 10 (the cost half).
- **Verify**: DevTools animations panel; no visual change in the captures.

## 4. Founder decisions

Bring these to the founder before, or at a checkpoint during, Tier 3. Each changes what the school *is*, so none should be resolved by the reviser.

### F1. How far the sunset travels (the hero's family)

The striped sun appears on all five pages, twice on Home, with a grid on four. That repetition is what makes the school read as outrun [15], and it turns his favourite hero into wallpaper. Dossier trap 2: a sunset framed as resort imagery (brochure, lobby mural, travel-agency screensaver) is vaporwave [6]; seen over a grid running to the horizon, it is outrun.

- **(a) Own it.** Keep every sun and grid, and name the synthwave inflection in `meta.ts`. Cheapest, least authentic.
- **(b) One hero, then resort framing.** Keep the Home hero exactly. Home closer and Services closer become a lobby or atrium (checker floor from E3, potted palm, skylight). Contact's side scene becomes a framed `screensaver.scr` window playing a small "Neo Sunsetters"-style resort loop, so the sun lives inside an OS frame [6]. Sent sits on a Win95 teal desktop or a tiled bitmap wallpaper. About gets the found head (F3), with or without a small sun behind it.
- **(c) Demote the grid.** Keep suns but drop the grids outside Home.

**Recommendation: (b).** It keeps the hero he loves as the one sunset, and makes it rarer and stronger. It also supplies the missing plaza (dossier priority 1) using space the extra suns take now. If he wants a middle step, Contact's screensaver window is the cheapest single conversion to show him first. E6 and E7 apply to whichever suns remain.

### F2. The wall label (`meta.ts` era, signature, lesson)

The current strings lead with the synthwave picture ("dreaming of 1985", "a neon grid running to the horizon") and state the palette as the genre's lesson (trap 6). The dossier also bars unsourced lore on the placard (trap 7).

- If F1 is (a): keep the picture but add a clause naming the synthwave inflection, and rewrite `lesson` off palette-as-canon.
- If F1 is (b) or (c), a suggested signature: "Windows 95 chrome, file names for titles, Japanese for headlines, a mall lobby and a broken marble head, with one sunset screensaver on the front page." A suggested era: "The internet, 2010 to 2013, dreaming of mid-90s software and shopping malls." A suggested lesson: nostalgia sold back as corporate leisure, so the comfort is the product [8], phrased in his voice.

**Recommendation:** decide together with F1. The wording is his, with no em dashes and the studio "we".

### F3. A found classical head, and whether the columns break

There is no bust anywhere, and the pristine columns read as Greek revival (trap 5). The canon's object is a damaged head cut out as stock imagery [9].

- **(a) The CC0 Helios E49 photograph** [9]: cut out, duotoned pink and cyan, hard shadow. The most canon-exact option. It changes `assets.provenance` from `original-vector` and adds a raster, and its link to the Floral Shoppe cover rests on encyclopedia usage, not an artist statement [9].
- **(b) A drawn broken bust**: chipped nose, crown holes with no rays, flat vector marble matching `Marble.astro`. It keeps `original-vector`.
- **(c) No head.** Break one column only (a snapped capital or a missing drum).

**Recommendation: (b) plus one broken column.** It stays consistent with a school that draws everything, and the damage carries the "found object" read. Place it as the About hero centrepiece between the columns.

### F4. The grid: drive or loop

The steady `linear infinite` forward scroll (`fx.ts` `uScroll = time*0.55`, `.vw-floor::before`) is the outrun sensation of driving. The canon's motion unit is the loop with its seam showing [3, W][7]. The loop evidence rests on a weak source.

- **(a)** Keep the drive.
- **(b)** Same speed, a 4 to 8 second cycle that visibly restarts with a one- or two-frame tracking hiccup at the seam.
- **(c)** Slow to about 0.3 cells per second, a drift.

**Recommendation: (b).** At a glance the hero looks the same. On a second look it reads as a screensaver loop, not a road. Show him a side-by-side before committing. The reduced-motion still does not change.

### F5. How much the captions quiet down

E4 makes back windows inactive where two windows overlap.

- **Scope:** stop there, or add focus-follows (the window under the pointer, focus or viewport centre goes active and the others inactive).
- **Gradient:** keep the three-stop pink/lavender/cyan active bar or move to Win95's two-stop [14].

**Recommendation:** stop at the static back windows for Tier 3 and bank focus-follows for the transitions phase. Keep the three-stop active bar he likes, and make only the inactive bar two-stop, so the pair still reads as a system palette. Show a before and after of Services.

### F6. A bottom taskbar echo

The Win95 taskbar docks at the bottom with the clock bottom right [12]. Authenticity proposed a decorative second taskbar in the footer, or task buttons docked to the bottom on mobile.

**Recommendation: decline for Tier 3.** The header already is the taskbar, and two taskbars read as a bug. The portal switcher also occupies the bottom strip. Revisit mobile docking only if the header's two-row layout still feels wrong after E10.

## 5. For the transitions phase (not Tier 3)

- **Boot on arrival, shutdown on departure** (dossier priority 3, tell 7 [1][5]). The other school's page is what was on screen. Then the CRT band (kept), a brief splash with a progress row or a "Starting BIRCH 95..." line, the desktop painting in, and the taskbar arriving last, 400 to 600ms in total. Leaving reuses `vw-crt-off` as shutdown. Pair-specific entrances via `html[data-from-theme]` (for example, quiet's bark as the wallpaper the boot paints over).
- **In-school swap as minimise and restore.** The current page's windows collapse toward the old task button while the new page's windows expand from the newly pressed one: 200ms each, using only roll, slide, collapse/expand and fade [13]. The wordmark stays as the fixed anchor, which is the morph model the founder likes. E8's pressed Start and task buttons are the frames it grows from.
- **Remove the 12px window drop shadow** for the duration of any window animation, then restore it on landing [13].
- **Focus-follows captions**: the window nearest viewport centre goes active on scroll (F5).
- **A live tape counter**: SP 0:19:85 steps once a second in the existing throttled fx tick, aria-hidden, frozen under reduced motion. Never an indefinite blink (WCAG 2.2.2).
- **The loop seam** if F4 is (b): a matching seam hiccup on the CSS floors and screensaver windows, so every loop in the school restarts the same way.
