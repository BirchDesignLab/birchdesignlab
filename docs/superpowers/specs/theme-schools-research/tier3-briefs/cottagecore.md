# Cottagecore: Tier 3 brief

Panel: authenticity (B+), craft (B+), motion (B). Yardstick: `dossiers/cottagecore.md` (tells 1 to 9, gap list 7.2, priorities 8). Written 09-23-26 from the tier2 captures; claims marked "spot-checked" were confirmed in the PNGs or code by the brief author.

## 1. Verdict

**Current grade: B+.** This is real cottagecore, not a costume. The gingham is a true yarn cross, the washi is translucent and torn, the specimens are named and firmly outlined, the About herbarium sheet is near canon, and the lamplight dark scheme is designed rather than inverted. The founder is right that it sells what the studio can do. Three things hold it at B+. First, it is written in one handwriting, one weight and one ink everywhere, so it reads as a font, not as people (tell 2). Second, its made objects say nothing about who made them, when or where: a scribble stands where the hero label should be, and the postmark, stamp and sampler are blank (tells 1 and 9). Third, the finish slips in a few places: specimens float on drop-shadows (tell 3), text drifts off the ruled lines (tell 8), the tablet footer orphans "Contact", and every page change double-exposes two pages for about 240 ms. **A+ looks like** a table that one studio has visibly worked at over time. There are several hands in several inks, specimens pressed flat and labelled with a place and a date, a signed sampler, a postmarked card, no countable repeats, and paper that behaves like paper in both schemes. The curtain and table stay still while only the sheet changes. None of this needs a new idea. Every item finishes something the first pass already set up.

## 2. Protect

Do not remove, restyle or weaken these. Revision works around them.

- **Gingham weave logic** in light: two 50% thread gradients crossing so the crossings darken, with scalloped valance and hem, painted into the portal tail so the cloth runs to the page bottom [3].
- **Washi tapes**: translucent, torn ends, three patterns (gingham, dot, stripe) [23]. Vary their shapes (item 9) but keep the material.
- **Pressed.astro drawing**: named species, firm outlines, seeded jitter [21]. The About birch twig mounted with gum strips [18].
- **About herbarium sheet**: specimen left, double-ruled etymology label right. This is the most canon-true composition [1][18].
- **Recipe cards** with the № numbering and the rose double rule [16].
- **Two-part jar-label wordmark** (Fraunces "Birch" plus handwritten "Design Lab"), its `transition:name="wordmark"`, and the morph. The founder likes it.
- **Fraunces SOFT/WONK as the display voice** [24][25]. Vary the axes by role (item 17); do not swap the face.
- **Contact postcard with perforated stamp; Sent envelope with lavender tucked in.** Enrich them (decision D1), keep the objects.
- **Lamplight dark concept**: ink-brown ground, cream ink, amber lamp pools, amber CTA, fireflies dark-only on independent clocks, fading off text blocks.
- **fx.ts lifecycle**: theme guard, MutationObserver on `data-scheme`, hidden-tab pause, DPR cap 1.5, 30 fps throttle, sprite-cached halo, reduced-motion still frame, full teardown.
- **Specimens never move.** No swaying flowers, in any phase (dossier section 6).
- **Mobile handwritten nav with the stitched seam.** Desktop should learn from it (item 8), not the other way round.
- **Sewn-label primary button** with its inner running stitch; stitched `aria-current` underline; wavy-underline link hover; `.cc-note-link` arrow nudge.
- **Contact field focus-visible** (dashed line to solid accent with note-tint fill): the best focus state in the portal.
- **Torn butter notes** for the Lab list and the Services method sheet; the Sent page composition.
- **Home hero billboard scale** ("Birch" / "Design Lab" / hand kicker).
- **Compositor-only VT keyframes** (no filter on full-viewport snapshots) and the reduced-motion VT collapse.
- **Restraint**: sparse single objects on a table; no mason jars, chalkboards, stock photos, cartoon animals or tradwife iconography (dossier traps).

## 3. Execution work, ordered by leverage

Contract reminders for the reviser: copy and link targets come from `src/content/copy` and do not change. Any new visible words (labels, postmark, signature) are decorative, `aria-hidden`, and wait on decision D1. Every new ink needs a `meta.contrast` entry in both schemes. Every new name in `view-transition-name` must be unique per page (`tests/built/portal.test.ts`), and styles may not name another school.

### 1. Give the page several hands (tell 2, highest leverage)

- **Where:** `theme.css` (`--font-hand` users: `.cc-hand`, `.wm-hand`, `.no`, `.f-loc`, labels), `Header.astro` mobile nav, `Footer.astro`, `Home.astro` kicker/lead, `Services.astro` kicker, `Contact.astro` labels, `About.astro`, `Sent.astro`. All pages, both schemes, all viewports.
- **Change:** define three hand roles from Caveat Variable's 400 to 700 axis as custom properties (`--hand-kicker`, `--hand-note`, `--hand-label`, each with weight, ink, size step, tilt):
  - *Kicker hand* (section kickers, "A design lab, not an agency."): about 650, rose-deep in light / amber in dark, -1.5deg.
  - *Margin-note hand* ("How we build", "Visit the lab", back links, footer "Mississippi Gulf Coast"): about 450, sepia from the existing ink-brown family, a touch larger, +1deg.
  - *Label hand* (form labels, № numerals, specimen and sheet labels): about 400, sage-dark in light / sage-light in dark, upright.
  - Mobile nav keeps its hand but takes the margin-note voice. Do not add a second script font in Tier 3.
- **Why:** authenticity #1, craft #7, dossier 7.2 item 1 and priority 1 [16][17]. Real recipe books carry several hands added at different times.
- **Verify:** `tier2-desktop/t-cottagecore__light__desktop.png`: the kicker, "How we build" and "From the lab" should read as three different writers. Contact labels should read as a lighter, upright hand. Run the contrast checker for every new ink against `--paper`, `--note` and `--field` in both schemes.

### 2. Stop the double exposure and keep the room still between in-school pages

- **Where:** `theme.css` VT block (currently lines ~474 to 503), `Header.astro`. All viewports, both schemes.
- **Change:**
  - Old root: opacity-only exit of about 180 ms, ease-out. Optionally add scaleY(0.99) as the start of "pressed away".
  - New root: delay about 120 ms. It reaches full opacity within its first quarter and gets its motion from a small lift (see D5), so it covers the old page like an opaque sheet laid on top. Total under 700 ms (README).
  - **Superseded by Stage 1 (09-23-26):** use the README's contract (`src/themes/README.md`, "View-transition names"): the name is `cottagecore-header`, set by one `:is()` rule keyed on `data-to-theme` and `data-from-theme`, never `cc-header`.
  - Give the valance and header bar their own `view-transition-name: cc-header`, used once per page. On in-school swaps its group gets `animation: none`, so the curtain, wordmark row and nav hold still and only `main` changes. Key it on `html[data-theme='cottagecore']:not([data-from-theme])` or on `html[data-from-theme='cottagecore']`, depending on how the portal sets the attribute; check which one it uses for in-school navigations first. Never name another school in the selector (portal guard).
  - Wordmark group: `::view-transition-old(wordmark), ::view-transition-new(wordmark) { height: 100%; object-fit: none; object-position: left center; }` with separate fade keyframes: old out over the first 40%, new in over the last 50%. Quiet's caps then do not stretch-smear across "Birch".
- **Why:** motion #1, #2, #4. Spot-checked: `motion-tier2/cottagecore__page__light__desktop.png` +160 to +400 ms shows the old "Birch" billboard under "The shining tree", with the nav and switcher ghosting.
- **Verify:** re-film `cottagecore__page__*` and `cottagecore__arrive__*`. No frame should show two billboards or two paragraph sets. The header row should be pixel-identical across page-strip frames. On arrive strips, the wordmark should keep its aspect ratio at +240/+320 ms on mobile.
- **Portal note, not a school fix:** the portal switcher (`bdl-switcher`, persisted) is captured in the root snapshot and tilts with the page (+240 ms in the page strip). The orchestrator should give it a portal-wide named group with `animation: none`. Cottagecore must not style it.

### 3. Press the specimens flat (tell 3)

- **Where:** `theme.css` `--press-shadow` (light ~line 93, dark ~line 172) and the `.pressed` filter; `Home.astro` hero sheet; loose corner sprigs on Home, Services and Contact.
- **Change:** on specimens that sit on paper, set `--press-shadow` to none, or to a hairline contact shadow at most (0 0.5px 0 at about 0.12 alpha). Mount the hero sprig stems with two or three small gum strips, reusing the About twig's strip drawing. On mounted sheets only, desaturate petal fills by about 8 to 12%. Loose sprigs lying on the cloth may keep a very soft contact shadow, because they are objects on a table, not mounted, but none should float.
- **Why:** authenticity #3, craft #8, dossier 7.2 item 3, priority 3 [15][18].
- **Verify:** `t-cottagecore__dark__desktop.png` hero sheet: no dark halo under the fern, daisy or rose. Light hero: stems visibly held by strips.

### 4. Put the writing on the lines (tell 8)

- **Where:** `theme.css` `.cc-ruled` (~lines 285 to 291), `About.astro` `.letter` (~92 to 102, including its 640px override), the Contact textarea. Home service cards, Services recipe cards, About founder note. All viewports.
- **Change:** use whole-pixel pitches wherever a rule tracks text (`--lh: 30px` or `32px`, not 1.8rem/1.9rem, which are 28.8px/30.4px and let the repeating gradient drift against fractional line boxes). Make every paragraph margin an exact multiple of `--lh`. Set `background-origin: content-box` and derive `background-position-y` from the baseline (about `0.78 * --lh`, measured against Lora's metrics), so the rule sits about 0.2em under each baseline. The rules must belong to the same rotated box as the text so they tilt together.
- **Why:** craft #1, authenticity #6. Spot-checked: the About letter is close in paragraph 1 and slips a few px by paragraph 3. The drift is clearer on the tilted Home cards (dark desktop, "spreadsheet that has grown" line).
- **Verify:** crop `t-cottagecore-about__light__desktop.png` around y 960 to 1560, and the Services "Custom software" card, at desktop and at the tablet/mobile 2x captures. The last line of each block should sit on a rule the same way the first does.

### 5. Keep the cloth a cloth by lamplight (tell 6)

- **Where:** `theme.css` dark tokens (`--gingham-thread: transparent`, `--gingham-texture` dashed SVG, ~lines 139 to 141), `.cc-gingham`, valance/hem (~357), portal tail. Dark, every page.
- **Change:** keep the real two-thread cross in dark: sage thread at about 0.14 to 0.22 alpha over `#1c251d`, so the crossings still show three tones. Drop the dashed SVG, or keep it as a faint running stitch *over* the check rather than instead of it. Give the valance and hem scallops a 1px lamp-lit rim so their shapes survive. This stays dark cloth by lamplight, which is the spec's doctrine ("lamplight, not inverted gingham"). It must not become light gingham on a dark page.
- **Why:** authenticity #5, craft #11 (the two agree; the Tier 1 comment "only a running stitch" is the current intent, but the result reads as graph paper). Spot-checked: `t-cottagecore__dark__desktop.png` Lab band y ~1450+ reads as a dashed grid.
- **Verify:** dark desktop Home Lab band and the top and bottom valances read as woven check at a glance. The butter note on top still passes contrast.

### 6. Fix the tablet layout (820px)

- **Where:** `Footer.astro` (grid ~line 42, collapse at 760px ~82); `Home.astro` cards (~263); `Services.astro` recipe cards (~176). Tablet, both schemes, every page for the footer.
- **Change:**
  - Footer: below about 1000px, use two rows: wordmark and fine print on the first, nav on its own full-width row. Nav items `white-space: nowrap`; a single word must never wrap alone.
  - Cards: keep two columns down to about 700px. When stacked, cap each card at about 32rem and alternate left and right with their existing tilts, like cards dealt onto a table. Reserve the specimen corner with padding or `shape-outside` so sprigs never cross text.
- **Why:** craft #2, #3; dossier tell 7 (pocket-sized scale) [7][8]. Spot-checked: `tier2-tablet/t-cottagecore__light__tablet.png` footer shows "Contact" orphaned on a second line.
- **Verify:** `tier2-tablet/sheets/cottagecore.jpg`, every column's footer; tablet Home y 1500 to 3200: cards about 60 to 70 characters per line, fern clear of text.

### 7. Rework the Contact composition and field language

- **Where:** `Contact.astro`, `theme.css` field styles. Desktop and mobile, both schemes. Field names, labels, behaviour and order are fixed by contract; only the styling moves.
- **Change:**
  - Labels sit about 0.25rem above their writing line (today about 50px above the dashed line: spot-checked). Size each input to one ruled line, so label, line and typed text read as one entry.
  - The textarea continues the ruled lines with no surrounding dashed box. Keep a `--field-line` focus outline for 3:1.
  - "Send it": scale it to the other CTAs (padding about 0.95em 1.8em) and left-align it to the field edge.
  - Postcard: give the heading `padding-inline-end` (about 8rem) so "works" and "the same." clear the postmark ring and cancel lines.
  - Right column: end both columns together. Either make the postcard `position: sticky` beside the form, or bottom-align a second object (the fern and rose mounted on a small card with gum strips) so the loose sprigs stop floating in about 250px of empty cloth. Tuck any remaining loose sprig under the postcard's edge.
  - Mobile trust line: wrap each phrase in a nowrap span so the line breaks at the flower, never after "A reply".
- **Why:** craft #4, #5, #14.
- **Verify:** `t-cottagecore-contact__light__desktop.png` y 200 to 1200 (form entries read as written lines; no ring touching the heading; columns end within about 40px of each other); `tier2-mobile/t-cottagecore-contact__light__mobile.png` trust line.

### 8. Give the desktop header the phone's care

- **Where:** `Header.astro` (~75 to 95). Desktop and tablet, both schemes.
- **Change:** `align-items: last baseline` so the wordmark and nav share a baseline (today the wordmark sits about 10px higher). Wordmark about 2.3 to 2.5rem, with the daisy sprig large enough to read as a daisy. Nav at 1.05 to 1.1rem in `--mark`, not muted, with the same stitched current-page marker. Add a 160 ms colour transition on hover.
- **Why:** craft #6, motion #7 (hard hover snap).
- **Verify:** crop `t-cottagecore__light__desktop.png` y 0 to 160.

### 9. Hide the repeats (tell 5)

- **Where:** `theme.css` `.cc-torn` (~295 to 307), `.cc-tape` (~318 to 333). Lab note, Services method sheet, About letter, every tape.
- **Change:** replace the single 240px torn tile with one tile of 900px or more, or three variants chosen per instance through a custom property (`--torn-variant` or offset `--torn-x`). Add three or four tape clip-path variants (one straight-cut end, one torn both ends, different end angles), plus a per-instance `--tape-w`.
- **Why:** authenticity #12, craft #10, dossier 7.2 item 6, priority 6 [21].
- **Verify:** `t-cottagecore-services__light__desktop.png` y 1040 to 1060 and 1445 to 1460: no countable period along the tear. The Home card tapes show different outlines.

### 10. Build the signed and dated objects (after D1)

- **Where:** `Home.astro` `.herb-label .hl-hand` (currently a squiggle SVG); `Contact.astro` postmark and stamp; `Sent.astro` envelope; `Sampler.astro`/`About.astro` hoop.
- **Change:** once D1 fixes the wording:
  - Hero label: set in the label hand, laid out like an RHS label (names line, place, date, collector) [1][18].
  - Postmark: letter the ring. Give the stamp a small value numeral.
  - Sent envelope: the same stamp plus a cancel.
  - Sampler: chart the maker's line in cross-stitch below the motif, with a small cross-stitch border or alphabet row just inside the ring, so the hoop holds stitching, not type [14]. Keep the manifesto as live text.
  - All new words are decorative and `aria-hidden`. Confirm the word-parity guard ignores `aria-hidden` SVG text. If it does not, draw the letters as paths.
- **Why:** authenticity #2, #7, #8; craft #9; dossier 7.2 items 2, 4, 5, priorities 2 and 7.
- **Verify:** Home hero label legible at desktop and 2x mobile; `t-cottagecore-contact__light__desktop.png` postmark; `t-cottagecore-contact-sent__dark__desktop.png` envelope; About hoop at desktop.

### 11. Paste one printed clipping

- **Where:** `Home.astro` `.specimens` (the BDL-008 / BDL-007 list on the butter note). Both schemes.
- **Change:** set the list as a trimmed printed slip pasted on the note: a whiter or greyer paper tone, straight edges, a slight counter-tilt, Lora small caps accession numbers, and one corner held by a small tape or a hairline glue shadow. Plex Mono only if it is already loaded; do not add a font for this. The list text and links stay as they are.
- **Why:** authenticity #11, dossier 7.2 item 7, priority 8 [16][17]. Manuscript books mix hands with pasted print.
- **Verify:** Home "From the lab" note, light and dark desktop.

### 12. Make the fireflies flash

- **Where:** `fx.ts` pulse (~lines 145 to 163).
- **Change:** replace `pow(0.5 + 0.5 sin, 3)` with a burst envelope. Each flash is a 120 to 180 ms rise and a 250 ms fall, repeated 2 to 4 times about 500 ms apart, then 4 to 8 s dark. Burst count and phase are per mote and never synchronised. Raise the peak core alpha from about 0.42 toward 0.6 so a flash registers at a glance. Keep the count, the text-avoidance, the reduced-motion still frame and the rest of the lifecycle.
- **Why:** motion #6, authenticity #14, dossier 7.2 item 9, priority 5 [28].
- **Verify:** `motion-tier2/cottagecore__fx__dark__desktop.png` shows visible flashes in some frames and several dark motes in others, never all motes lit together.

### 13. Tactile states and touch hygiene

- **Where:** `theme.css` `.cc-label` (~390 to 400), `.cc-note-link` (~420), `Header.astro` nav, `Footer.astro` nav, Contact `.mail`, the reduced-motion block.
- **Change:**
  - `.cc-label:active`: `translate: 0 1px; rotate: 0deg`, shallower shadow, 80 ms, so it reads as pressed flat onto the cloth.
  - Wrap the hover rotate, lift and arrow nudge in `@media (hover: hover)` so nothing sticks after a tap.
  - Footer nav and the Privacy link at 760px and below: inline-flex, `min-height: 44px`, padding-block about 0.6rem. Optionally set them in the margin-note hand to echo the header's phone nav.
  - Under `prefers-reduced-motion: reduce`, set `transition-duration: 0s` on `.cc-label` and `.cc-note-link svg` (end states kept).
- **Why:** motion #7, #8, #12.
- **Verify:** `tier2-mobile/t-cottagecore-contact__light__mobile.png` footer row spacing. Code review for `:active` and the hover guard.

### 14. Cheaper firefly bookkeeping

- **Where:** `fx.ts` `collectTextRects` / `onScroll` (~95 to 110).
- **Change:** collect text rects in document space (`rect.top + scrollY`) once on mount and on resize (debounced). In `draw()`, subtract the current `window.scrollY`. Drop the per-scroll `getBoundingClientRect` sweep; if a scroll listener remains, it only caches `scrollY`.
- **Why:** motion #9. It removes dozens of layout reads per scroll tick on phones.
- **Verify:** fireflies still fade off text after scrolling (dark mobile fx strip), and there are no console errors.

### 15. Hero and About balance

- **Where:** `Home.astro` hero; `About.astro` herbarium sheet.
- **Change:**
  - Home lead: about 1.3rem in full `--mark` (not `--mark-muted`), with the 33rem measure kept. Vertically centre the hero grid, or align the lead's last line with the sheet's lower tape, so both columns end together.
  - About sheet: trim the bottom padding to match the top, or let the twig run to the lower corner. Set `.etym-more` in `--mark` at about 1.02rem so it reads as the label's note.
- **Why:** craft #12, #13. The lead is the one sentence that explains the business.
- **Verify:** `t-cottagecore__light__desktop.png` y 420 to 720; `t-cottagecore-about__light__desktop.png` y 560 to 650.

### 16. Remount the Services bouquet (after D3)

- **Where:** `Services.astro` `.bow` (~25 to 28, 94 to 96). Both schemes.
- **Change:** as D3 decides. The recommended option is ink-brown garden twine with a plain knot.
- **Verify:** `t-cottagecore-services__light__desktop.png` hero right; mobile sheet services column.

### 17. Vary the Fraunces wetness by role

- **Where:** `theme.css` ~212 to 219 (`'SOFT' 100, 'WONK' 1` on all h1 to h3, `.pull`, `.wm-name`, `.f-name`).
- **Change:** SOFT 100 for the billboard "Birch" and "Sent." and the wordmark. SOFT about 50 for h2 sheet titles. SOFT 0 to 20 with WONK 0 for card h3s. Pick one treatment for the italic pull quotes by eye: SuperSoft or Sharp (the critics split; judge it against the billboard in the capture). Never animate `wght`.
- **Why:** craft #15, authenticity #15, dossier 7.2 item 10 [24].
- **Verify:** Home light desktop: billboard, "What we build" cards and the About pull quote read as three wetnesses.

## 4. Founder decisions

Take these to the founder before or at the start of Tier 3. Items 10, 16 and parts of 2 wait on them.

**D1. What the made objects say (new visible words, all decorative and aria-hidden).**
- Options: (a) keep them wordless, in which case the hero squiggle must go, because a placeholder is worse than nothing; (b) studio-voiced labels, as drafted below; (c) labels with species names only, with no place or date.
- Draft for (b), studio only, never a person's name:
  - Hero label: common and Latin names of the sprig, "Mississippi Gulf Coast", a date, "coll. Birch Design Lab".
  - Postmark ring: "GULF COAST MS" plus a date. The stamp takes a small value numeral.
  - Sampler: "B.D.L. 2026" in cross-stitch.
  - Sent envelope: the same stamp and cancel.
- Date: use one fixed, meaningful date (for example the launch date, 09-01-26, in MM-DD-YY) rather than a live "today" date. A live date is a gimmick on a static build and changes every capture.
- **Recommendation: (b), with the fixed date.** It is the cheapest route to tells 1 and 9, and it fits the founder's "specific, observed" taste.

**D2. Gulf Coast flora.**
- Options: (a) keep the English cottage four (fern, lavender, oxeye daisy, dog rose) everywhere; (b) add two or three Gulf Coast specimens in the Pressed.astro style (southern magnolia leaf or bloom, *Passiflora incarnata*, wax myrtle or Spanish moss) and give each page its own hero species; (c) swap entirely to Gulf Coast.
- **Recommendation: (b).** The About letter already says the birch "has no business surviving" here. English cottage flowers beside Gulf Coast specimens tell the same story as the birch, and one hero species per page removes the composition-level repeat (tell 5 [21], tell 1 [2][11]). Keep the birch on About. It also feeds the D1 hero label.

**D3. The Services satin bow.**
- Options: (a) keep it; (b) ink-brown garden twine or raffia with a plain knot; (c) mount the bouquet on a small herbarium sheet with gum strips.
- **Recommendation: (b).** The bow is the one motif that drifts toward wedding and gift-shop decor (the "Laura Ashley pastiche" and "mass-market rustic" traps [5][13]). Option (c) would repeat the About composition too closely.

**D4. Paper in the dark scheme.**
- Options: (a) keep lamp-brown papers (the Tier 1 endorsement); (b) dimmed cream papers (about #d9ccb2 to #cbbd9f) lit by the amber pools, with ink-brown text, and only the room going dark; (c) the hybrid: keep brown cards and notes, but lift the mounted herbarium sheets (Home hero, About) to a heavier, lighter-toned board so specimen sheets separate from the table.
- **Recommendation: (c) as a trial, with a side-by-side capture of (a) and (b) on Home dark for the founder to choose from.** The authenticity critic is right that the hero sheet currently shares a material with the cards and table (spot-checked). A full switch to cream reverses a decision the founder already signed off.

**D5. The arrival gesture in Tier 3.**
- Options: (a) keep the rotateY page-turn and only fix the double exposure; (b) replace it now with a minimal "laid on the table": translateY(10px) scale(1.01) to rest over about 480 ms, cubic-bezier(0.2, 0.7, 0.2, 1), no overshoot ("pressing only goes one way" [15][18]), and leave the full choreography for the transitions phase.
- **Recommendation: (b).** Item 2 needs a new-root keyframe anyway. The -16deg turn does not register at 390px, and the dossier calls it generic. This does not pre-empt the transitions phase; it gives that phase a correct first beat.

**D6. Light-scheme life before the transitions phase.**
- Options: (a) nothing until the transitions phase; (b) ship one small write-on now: `.cc-hand` kickers and `.cc-scribble::after` reveal left to right once, via a clip-path inset, 400 to 600 ms, IntersectionObserver-triggered below the fold, jumping to the end state under reduced motion.
- **Recommendation: (a).** The founder has scheduled transitions for later, and a partial choreography shipped now would have to be reworked. Record the gap (dossier trap 8) so it stays visible.

**D7. Where the fireflies live.**
- Options: (a) keep them in the header's stacking context, under `main`, so they only drift over the tablecloth and vanish behind full sheets (About, Contact); (b) move the canvas to a body-level layer so they visit the margins of full sheets.
- **Recommendation: (a), documented** in the fx.ts header comment. Fireflies over the cloth and never over paper fits the lamplight doctrine. The current behaviour is only a problem because it looks accidental.

**D8. One indigo thread.**
- Options: (a) no blue; (b) a single indigo-and-white gingham tape, or indigo as the specimen-label ink, without displacing the sage.
- **Recommendation: (b), as one tape only.** It ties the build to real gingham and to Morris [2][3] at almost no cost. Add a contrast entry if it carries any text.

## 5. For the transitions phase (later, not Tier 3)

Keep these ideas. All are compositor-only, run once, land in their end state under reduced motion, and fit inside the ~700 ms arrival budget or run after it as in-page reveals.

- **Full "laid on the table" choreography**, keyed on `html[data-from-theme]`: the sheet is set down, then tapes are laid (scaleX from one torn end, settling to their tilt; the tape lands last because it holds the paper [23]), then the paper stops settling from 1.01 as its shadow collapses [15][18], then kickers and scribbles write on left to right [17][20]. About 900 ms in total, one pass.
- **"Pressed away" exit**: the old sheet flattens (scaleY toward 0.99) and fades, one way only.
- **Wordmark after landing**: once the shared group has settled, `.wm-hand` writes itself on and `.wm-daisy` rotates to its -12deg rest "as if tucked in". Never during the move (dossier section 6).
- **Stitch that sews**: the `aria-current` underline writes on like a running stitch being sewn, or slides between links as its own named group [17][20].
- **Sent envelope flap**: on the contact-to-sent swap the flap closes (rotateX, one way, about 500 ms), so sending reads as sealing the letter. Under reduced motion it is already shut. This is Potter's flap reveal [9]. A second flap candidate is a note lifting to show the Lab list.
- **Ink settle (original, untested)**: Fraunces SOFT easing from 0 to 100 on `.wm-name` or the billboard after arrival. Measure layout shift first, since WONK does not tween and `wght` must never animate [24]. This is a founder call before any prototype.
