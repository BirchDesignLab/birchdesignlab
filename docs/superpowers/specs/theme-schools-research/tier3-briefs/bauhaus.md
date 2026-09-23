# Bauhaus: Tier 3 brief

Written 09-23-26 from three Tier 2 critic reports (authenticity, craft, motion; all B+), the school dossier (`../dossiers/bauhaus.md`, cited as [n]), the code in `src/themes/bauhaus/`, and spot checks of the captures. The founder rates this school highly and it is a personal favourite. The job is to raise it without changing its character.

Capture paths below are short forms: `desktop/`, `mobile/` and `tablet/` mean `scripts/themes/.out/tier2-<viewport>/`, and `motion/` means `scripts/themes/.out/motion-tier2/`. Line numbers were checked against the current files. Some line numbers in the critic reports were wrong, so use the ones here.

---

## 1. Verdict

**Current grade: B+ (all three lenses agree).** This reads as real Bauhaus, not a costume. The hero is a stacked lowercase name against a balance-beam poster. Heavy 6px rules sit on a twelve-column grid, primary colours appear as full-bleed blocks, and the shapes assemble on load. All of that comes from the school itself [6][7][27]. What holds it below A is a short list of correctable errors plus a few canon moves it has not made yet:

- **The pairing.** The Kandinsky pairing the stylesheet claims is broken in five places. The worst is the footer, the last thing every visitor sees.
- **Mixed case.** Every label is set in spaced capitals inside an otherwise lowercase house.
- **Numerals.** The most repeated ornament is borrowed from a 2020s font (Unbounded).
- **Missing canon.** There is no diagonal and no printshop register.
- **Wall label.** The lesson line opens with Sullivan's slogan.

**A+ looks like this:**

- Every free-standing primary shape obeys yellow triangle, red square, blue circle.
- One lowercase voice runs from the headings down to the form labels.
- Numerals are built from bars and circles, after Albers [16]. They become the school's signature detail.
- One deliberate diagonal answers Schmidt [6].
- The working pages carry the black-and-red printshop ink [3][4].
- Headings break cleanly, and phones keep the structural rules.
- Assembly lands like cut paper on a mark, not like a UI spring. The founder chooses the curve.
- The hero, the header and the colour bands look exactly as they do today.

## 2. Protect

These must survive revision unchanged in structure, scale and character.

- **Home hero, all viewports.** The stacked lowercase "birch / design / lab" with its staircase step, the balance-beam poster (red square and blue circle on the beam, yellow triangle below, stem, ring), the heavy base rule, and the build order (bar, circle, square, triangle, stem, ring). Only the dark ring and stem colour and the ease may change (items E1 and F1).
- **Header.** The trio mark in the exact pairing, the lowercase League Spartan wordmark, the current page as a solid red block, and the heavy closing rule.
- **Rules and grid.** The 6px rule system and the twelve-column grid, including the Services offering body hanging from a heavy left rule. That rule is Moholy-Nagy's device [11]: keep it and extend it to mobile (E8).
- **Colour bands.** Full-bleed primary bands as the poster moments: the red lab band, the yellow About manifesto, the blue Services ask, the yellow Contact email band. Each keeps its declared text pair.
- **Home doors.** The outlined 01 card beside the solid yellow 02 card, the big-against-small size contrast [18], and each door's paired shape.
- **Services process.** The four-column "how a project runs" module with coloured top bars and pairing-true minis (blue circle, red square, yellow triangle, neutral ring).
- **About.** The constructed B assembling in the page strip (stem rises, bowls rotate in; the best single piece of motion in the school), and the short dash rules above the etymology columns.
- **Sent.** Yellow triangle, red square, blue circle docked in it, all on one rule, with the huge "sent." as the page.
- **Buttons and emphasis.** The .btn ink slab whose red square turns into a circle on hover, and the field-coloured focus moat. Emphasis by weight only, no italics.
- **Assembly on load.** `.asm` with per-shape `--from`/`--d`, reveal gating (`data-reveal`, parked until scrolled in, assembles without JS), and reduced motion getting the finished poster. The dossier's worry that the reveal gate leaves shapes unassembled in full-page captures (gap 9) is resolved: `desktop/t-bauhaus__light__desktop.png` shows the lab band and see-saw fully assembled.
- **No background fx.** No fx.ts and no infinite animation.
- **Dark scheme concept.** The poster pinned to a black wall (Triadic Ballet black series [19]).
- **Contact panel.** The heavy-bordered raised panel for the form.
- **Durations.** 640 ms arrival and 420 ms in-school swap, within the README budget.

## 3. Execution work, ordered by leverage

### E1. Make the Kandinsky pairing true everywhere

The pairing is stated at `theme.css:12-14` and is broken in five places.

**Where:**
- `Footer.astro:13-15` (`.corner`): every page, both schemes, all viewports.
- `pages/Home.astro:55-56` (`.lab-shapes`).
- `pages/Contact.astro:19-21` (`.talk`).
- `pages/About.astro:18` (loose circle beside the B) and `:31` (the tree's sun).
- `theme.css:69` (dark `--poster-mark: var(--red)`, which paints the hero ring at `Home.astro:24` and the stem at `Home.astro:23` red).

**Change:**
- **Footer corner.** Replace the red quarter-circle and yellow square with a red square and a yellow triangle locked to the band's top rule. The triangle's hypotenuse gives every page's closing band a diagonal. Keep the scale (`clamp(150px, 22vw, 300px)`, 120px on mobile) and the bleed off the right edge. The motion critic suggests the square spin in from -90deg to a hard stop. Do not use blue: blue on ink measures 2.28 (dossier section 5 table).
- **Lab band.** Use a yellow triangle rising in front of an ink circle, which is the same geometry with the colours swapped. The critics offered a paper circle as the alternative; ink matches the current dark triangle's weight on red, so use ink.
- **Contact.** The blue circle meets a red square (swap `:20` from a circle to a rect of the same size, still entering on `translateX(80%)`). The yellow triangle keeps its hinge role at the join.
- **About.** The loose circle becomes a small yellow triangle; the tree's sun becomes a paper circle.
- **Dark scheme.** Set `--poster-mark: var(--paper)` and update the comment at `theme.css:49-55`, which says ink would vanish, so red was chosen. The B's red bowl and the hero eye's yellow stroke are founder calls (F3). Do not touch them here.
- **Comment.** Keep the `theme.css:12-14` comment but make it exact: "free-standing primary shapes keep that pairing; ink and paper are outside the triad."

**Why:** Authenticity P1-P3, craft P1, motion P3 and P12. Dossier tell 2, trap 6, gap 1, priority 1 [7][23].

**Verify:**
- The desktop, mobile and tablet footers show a red square and a yellow triangle.
- `desktop/t-bauhaus__light__desktop.png`: the lab band shows no yellow circle.
- `desktop/t-bauhaus-contact__light__desktop.png`: one circle only.
- `desktop/t-bauhaus-about__light__desktop.png`: no yellow circle anywhere.
- `desktop/t-bauhaus__dark__desktop.png`: the ring and stem are paper.
- `motion/bauhaus__arrive__dark__mobile.png`: the last shape to land is not red.

### E2. One lowercase voice

**Where:**
- `theme.css:170-181` (`.kicker`), `:197-215` (`.btn`), `:230-242` (`.more`).
- `pages/Contact.astro:78-83` (`label`).
- `Footer.astro` `.loc`.
- `pages/Home.astro:59` (vertical lab kicker, which inherits `.kicker`).

**Change:** Remove `text-transform: uppercase` from all of them and carry hierarchy by weight, size, the leading shape and the rule:

| Element | New setting |
|---|---|
| `.kicker` | League Spartan 700, about 1rem, tracking 0.01em, still led by its shape |
| `.btn` and `.more` | lowercase League Spartan 700, 1.125-1.25rem, tracking 0 |
| Contact labels | Jost 600, 1rem, no tracking |
| Footer `.loc` | Jost 500, 0.95rem |

Words and link text are unchanged. Only the case transform and tracking change.

Then check that "let's start your project" still holds its slab at 390px, and that the vertical lab kicker still reads bottom to top at its new size.

**Why:** Authenticity P4, craft P2. Weimar capitals against Dessau lowercase is an era collision. Dossier tell 3, trap 8, priority 2 [8][12][17].

**Verify:**
- `desktop/t-bauhaus-contact__light__desktop.png` shows no spaced capitals anywhere: labels, send button, footer location.
- `desktop/t-bauhaus__light__desktop.png`: "what we build", "how we build", "visit the lab".
- `mobile/` Home: the button fits on one line.

### E3. Constructed numerals replace Unbounded

**Where:**
- Home doors (`pages/Home.astro:41`, sized at `:165`).
- Services offerings (`pages/Services.astro:31`) and process steps (`:49`, sized at `:152`).
- `.num` at `theme.css:256-262`.
- BDL designations at `pages/Home.astro:214`.
- `--font-num` at `theme.css:39`.
- `meta.ts` fonts (the Unbounded accent entry).

**Change:**
- **Numerals 0-4.** Build them as inline SVG from a small module of vertical bar, horizontal bar, full circle and quarter circle, after Albers's Kombinationsschrift [16]. Fill in ink, or `currentColor` so they follow the block pair on yellow. Size them in em to match the current glyph boxes.
- **Markup.** Keep them `aria-hidden`, as the numerals are now.
- **Assembly.** Assemble each numeral with the existing `.asm` machinery (bars scale in on their axis, bowls rotate in, as the About B does) and gate it with `data-reveal`. Keep the pace fast for the four-step list [11].
- **BDL designations.** Move them to League Spartan 700 with `font-variant-numeric: tabular-nums`, so the label no longer switches face mid-word.
- **Clean-up.** Delete `--font-num` and the Unbounded entry in `meta.fonts`.

A shared component (for example `src/themes/bauhaus/parts/Numeral.astro`) keeps the construction in one place.

**Why:** Authenticity P5, craft P3, motion P13. Unbounded has no period basis and is the most repeated ornament. Dossier canon 7-8, gap 3, priority 3 [1][16].

**Verify:**
- `desktop/t-bauhaus__light__desktop.png` doors: 01 and 02 are visibly built from bars and bowls.
- `desktop/t-bauhaus-services__light__desktop.png`: offerings and steps 01-04.
- The lab band shows BDL-008 in one face.
- A page strip shows a numeral assembling.
- The reduced-motion capture shows the numerals finished.

### E4. Correct the wall label (lesson line)

**Where:** `meta.ts:10` (`lesson`). This is theme metadata, not `src/content/copy`, so it is open.

**Change:** Drop "Form follows function". Rebuild the line on the school's own Dessau motto [24]. Candidate: "Art and technology, a new unity: a few elementary forms, a strict grid, and every shape given a job." No em dashes.

The dossier suggests crediting Kandinsky by name if the pairing is mentioned [23]. The visitor-copy rule forbids personal names, so the candidate leaves the pairing out rather than attribute it to "the Bauhaus" (trap 7).

**Why:** Authenticity P6. "Form follows function" is Sullivan's (1896), not the school's, and a practitioner would catch it on sight. Dossier trap 1, priority 9 [28][24].

**Verify:** The portal switcher's wall label for Bauhaus shows the new line. Grep the repo for "Form follows" and expect no hits under `src/themes/bauhaus`.

### E5. Balanced headings and pretty body text

**Where:** `theme.css:92-98` (`:where(h1,h2,h3)`), plus Services `.pull` (`pages/Services.astro`), the Home closer and opener headings, the About manifesto, the Contact email-band line, and body `p`.

**Change:**
- Add `text-wrap: balance` to h1-h3, `.pull`, `.lead` and the display ledes.
- Add `text-wrap: pretty` to paragraphs.
- Re-check any heading capped in `ch` (the Services process heading at 12ch). Widen the cap so "how a project runs" can sit on one line at desktop.

**Why:** Craft P4. The widows "are.", "runs", "agency.", "guarantee." and "same." are the first thing a type-literate visitor sees.

**Verify:**
- `desktop/t-bauhaus__light__desktop.png` closer: no lone "are.".
- `desktop/t-bauhaus-services__light__desktop.png` process heading.
- The mobile sheet for Home, About and Contact.

### E6. One diagonal composition, then let the footer carry the rest

**Where:**
- `pages/Services.astro:18-20` (the hero circle and square on a rule).
- `pages/Sent.astro:13-16` plus its layout at `:20-58`.

**Change:**
- **Services hero.** Add a single heavy ink bar crossing the circle-and-square module on a 45 degree axis, a Schmidt cross [6]. Leave the circle, square and base rule where they are, so the module still locks to the grid.
- **Sent.** Keep the composition exactly as it is, since it is protected; its triangle already supplies the diagonal. Tell the story it implies instead (see E12) and fix its balance (see E11).
- **Home hero and About.** Get no new diagonal. The E1 footer triangle gives every page's closing band one, and more turns into confetti.

**Resolved conflict:** authenticity also proposed a diagonal About closer, and craft proposed re-setting Sent on a 45 degree axis. Both are declined. The dossier caps it at one diagonal per page type [6][20], and Sent is on the protect list.

**Why:** Authenticity P7, craft P8, motion P10. Dossier tell 6, trap 2 (an all-orthogonal page drifts to De Stijl), priority 4 [6][20].

**Verify:** `desktop/t-bauhaus-services__light__desktop.png` and `__dark__` hero, plus the Services columns on the mobile sheet. Check that the bar does not cross the h1 at 390px.

### E7. Printshop register on the working surfaces (the parts that need no red text)

**Where:**
- Contact form panel (`pages/Contact.astro:70-100`).
- Services offering bodies (`pages/Services.astro`, the `.offering-body` region near `:125`).

**Change:** Inside these two surfaces the only colour is red on ink and paper:

- **Contact field focus.** It becomes a red square, not blue: `pages/Contact.astro:97-100`, changing `8px 8px 0 2px var(--blue)` to `var(--red)`. That also removes a pairing break on the most-used control (motion P8).
- **Contact panel.** A red 6px rule sits across the panel's top edge, inside the ink border.
- **Services offering bodies.** A small red leading square marks each offering body's first paragraph. The heavy left rule stays ink.
- **Everything else.** Heroes, bands and closers keep the full triad.

Red as display or emphasis *text* waits on F2.

**Why:** Authenticity P8, motion P8. Every page is currently the full-triad poster and the workshop never appears. Dossier tell 4, gap 5, priority 5 [3][4].

**Verify:**
- `desktop/t-bauhaus-contact__light__desktop.png` and `__dark__`: a red rule on the panel.
- A focus-state still (Tab into Name) shows a red offset square.
- The Services captures, both schemes.

### E8. Phones and tablets keep the structure

**Where:**
- `pages/Services.astro:195` (`.offering-body { border-left: 0; padding-left: 0; }` under 760px).
- The Services offering grid at 761-900px.
- Mobile band compositions: the Home `.lab-shapes`, the About manifesto shapes, and the Services `.ask-shapes` (`pages/Services.astro:185-186`, `order: 2; position: static`).

**Change:**
- **Offering rule on mobile.** Keep the heavy left rule, with `padding-left` about 14px.
- **Tablet offerings.** At 761-900px, give the offering head 4 columns and the body 8, or move the stacked layout up to 900px.
- **Mobile bands.** Stop stacking the band shapes after the content in their own tall slab. Lock them to the band's bottom edge at no more than about 140px tall, clipped at the bleed, with the content's bottom padding overlapping them. Alternatively, pin them at about 120px in the band's top-right corner with the heading measure reduced to clear them. Either way, cut the dead red and yellow scroll.

**Why:** Craft P5, P10, P11. The offering left rule is Moholy-Nagy's device [11]; nothing should float [27].

**Verify:**
- `mobile/t-bauhaus-services__light__mobile.png`: the rule is present.
- `mobile/t-bauhaus__light__mobile.png` lab band: shorter, and the shapes are composed.
- The About and Services columns on the mobile sheet.
- The Services columns on the tablet sheet (`tablet/sheets/bauhaus.jpg`).

### E9. Services process steps and the dark scheme's solidity

**Where:**
- `pages/Services.astro:159` (`.step p { color: var(--mark-muted) }`).
- `theme.css:61` (dark `--field-raised: #1f1f1e`).
- `theme.css:76-87` (body weight 400).

**Change:**
- **Step bodies.** Set them in `var(--mark)` at 1.125rem with `text-wrap: pretty`, and align their tops to a shared line.
- **Dark raised panel.** Make it clearly distinct, around #262523. Re-measure `--mark` against it; `meta.contrast` currently lists `--mark-muted` on `--field-raised`, so update that pair if the muted text goes.
- **Dark body weight.** Raise it to 450-480, and apply the same weight to text under 16px in both schemes.

**Why:** Craft P6, P9, authenticity P15. Jost 400 renders thin on #121212, and the process band all but disappears in dark. Dossier section 5 type row [14][17].

**Verify:**
- `desktop/t-bauhaus-services__dark__desktop.png` process band: the panel is visible and the text reads solid.
- `desktop/t-bauhaus__dark__desktop.png` intro paragraph.

### E10. Hover gating, press states, see-saw physics

**Where:**
- `theme.css:104`, `:223-227`, `:252-253`.
- `Header.astro:73`.
- `Footer.astro` `nav a:hover`.
- `pages/Home.astro:83-86` (`.seesaw`).

**Change:**
- **Hover gating.** Wrap every `:hover` rule in `@media (hover: hover) and (pointer: fine)`, so a tap no longer leaves the red slab or the underline stuck on touch screens.
- **Press states** (transform-only, removed under reduced motion):
  - `.btn:active`: `translateY(2px)`, with the `::after` square becoming a circle instantly, like a stamp.
  - `.more:active::after`: `translateX(8px)`.
  - Nav `a:active`: fills to the red current block instantly.
- **See-saw.** The plank starts level and pivots on the triangle apex (`transform-box: view-box`, origin about 200px 172px). It tips about 8 degrees toward the circle when the circle lands, then returns level when the square lands. Two mechanical stops with no overshoot, gated by the same reveal. Reduced motion shows it level.

**Why:** Motion P6, P7, P9. Motor, not muscle [5]; rotation about a fixed pivot with a hard landing [20][22].

**Verify:**
- `motion/bauhaus__page__dark__mobile.png` at +80 ms: no hover underline on the tapped link.
- The see-saw assembling in a real scroll of the Home closer.

### E11. Composition balance on Contact, Sent, the opener, About and the footer

**Where and change:**
- **Contact** (`pages/Contact.astro:66`, `.talk`; `:104-110`, `.trust`). Align the composition's base rule to the form panel's bottom edge, by sharing grid rows or using `align-self: end`, and trim the section's bottom padding. Restyle the trust line so each item leads with its own small red square (the `.dot` becomes a leading marker, not a separator). That way nothing dangles when it wraps at 390px. The copy is unchanged.
- **Sent** (`pages/Sent.astro:20-58`). Carry the composition's base rule across the full grid as the rule above `.note`, so both halves share one ground line and the empty lower-right quadrant closes.
- **Home opener.** Run the lede's top rule from column 1 to column 11 at full `--rule` weight, so the lede hangs from a line that starts at the headline's margin. Reduce the bottom padding to about 5rem.
- **About founder** (`pages/About.astro:25-40`). Make the tree panel `position: sticky` inside the left column so it travels with the reading.
- **Footer.**
  - Snap the nav's top rule to exactly 3 grid columns.
  - Set the copyright row in lowercase with `text-transform`, which changes its appearance, not its words.
  - Trim the bottom padding so the portal tail does not read as extra ink.

**Why:** Craft P7, P8, P12, P13, P14. Modules lock on a grid [27]; nothing floats [2].

**Verify:**
- `desktop/t-bauhaus-contact__light__desktop.png`: no empty strip above the yellow band.
- `mobile/t-bauhaus-contact__dark__mobile.png` trust line.
- `desktop/t-bauhaus-contact-sent__dark__desktop.png`: a shared ground line.
- `desktop/t-bauhaus__light__desktop.png` opener.
- `desktop/t-bauhaus-about__light__desktop.png` founder section.

### E12. Sent: the circle rolls

**Where:** `pages/Sent.astro:16`.

**Change:** Replace the straight `translate(-420px, -220px)` with two stages: the circle appears at the top of the triangle's hypotenuse (near 0,110), travels down the slope, then across into the square. Use `offset-path`, or two translate keyframes on `--ease-snap`, with a `rotate()` showing the roll through a small paper dot on the circle. Reduced motion shows it at rest.

**Why:** Motion P10, authenticity protect list. The page's one natural diagonal becomes the story [6][20].

**Verify:** A Sent motion capture, or a manual scroll of `/t/bauhaus/contact/sent/`, shows the circle travelling along the slope.

---

## 4. Founder decisions

Settle these before or during Tier 3. The reviser should not decide them alone.

### F1. The assembly feel

The critics all agree the current motion reads as a spring. The founder likes it.

**Options:**
- **(a) Keep as is.** 820 ms, `cubic-bezier(0.2,0.9,0.25,1.12)` with a 12% overshoot, opacity fade-in, and the hero finishing at about 1.58 s with the ring and eye last.
- **(b) Mechanical.**
  - Shapes solid from their first visible frame: keyframes `0% {opacity:0; transform:var(--from)} 1% {opacity:1}`, which ends the pink square, the translucent B bowls and the grey dark stem.
  - A no-overshoot stop such as `cubic-bezier(0.3,0,0.15,1)`.
  - The hero regrouped into three beats (bar and stem; square and circle; triangle, ring and eye), about 1.1 s total.
- **(c) Middle ground.** Option (b)'s solid shapes and beats with a very small 3% overshoot.

**Evidence:** `motion/bauhaus__arrive__light__desktop.png` at +480 ms shows the pink square; `motion/bauhaus__page__light__desktop.png` at +400 to +640 ms shows the translucent bowls. Dossier section 6 [19][20][22].

**Recommendation:** (b). Build it behind a single variable swap and put A/B strips side by side for the founder.

### F2. Red as a second ink

Red as a second ink is period-true [3][4], but it reverses the declared doctrine "primaries are blocks, never text" (`meta.ts`, `theme.css:5-7`).

**Options:**
- **(a) Keep the doctrine.**
- **(b) Allow red #b8231a on paper at display and emphasis sizes in light.** It measures 5.56. It would never be used as body copy on dark, where red on #121212 is 3.70. Add a `meta.contrast` pair.

**Recommendation:** (b). It completes E7 (one red display word per working page) and unlocks a red option for F4.

### F3. Pairing edge cases in constructed forms

**The About B's red upper bowl** (`About.astro:16`):
- **Keep it.** Constructed letters follow the type rule, not the shape rule.
- **Ink it.** The bowl becomes ink and the blue lower bowl stays.

**The hero eye's yellow stroke** (`Home.astro:25`), a yellow ring inside the ring:
- **Keep it.**
- **Neutral.** A paper or field stroke, leaving a neutral "point" after Kandinsky [25].

**Recommendation:** Keep the B (it reads convincingly as constructed type [1][16]). Make the eye neutral, because it is a free-standing circle in the founder's favourite composition, and the pairing claim should hold there.

### F4. Emphasis on "to shine" (About etymology)

"to shine" is `**strong**` in `src/content/copy/about.yaml`, so the house `strong` rule (`theme.css:159-166`, a yellow slab) paints it. The critics disagree: authenticity calls it a marker-pen highlight, and craft protects the yellow slab as a house rule.

**Options:**
- **(a) Keep the slab.** It is a hard-edged block of colour, consistent with "primaries are blocks".
- **(b) Weight 700 with a heavy red underline rule.** Needs F2.
- **(c) Weight 700 led by a small red square.**

**Recommendation:** (a). It is the only `strong` on the site, its edges are hard, and it fits the blocks doctrine. Revisit only if the founder reads it as a highlighter.

### F5. Photography in the lab band (typophoto)

**Proposal:** Grayscale, high-contrast square crops of each case study's existing `hero` image beside BDL-008 and BDL-007, set between the heavy rules on the red band, with the yellow-and-ink composition kept at the right edge.

**Evidence:** Dossier tell 7, gap 6, priority 7 [4][11].

**Scope notes:**
- It adds image weight to Home.
- BDL-008's hero is a clipped screenshot, so the result is a product shot rather than a photograph.

**Recommendation:** Yes, as a trial at desktop and tablet only. Omit it on phones if the band gets long (see E8).

### F6. Does dark get a moment of its own?

`theme.css:49-55` deliberately keeps dark ink-on-black to avoid a bright band. Craft asks for one change of field in dark, such as the doors on a paper slab.

**Options:**
- **(a) Keep the black wall.** E1 and E9 alone (paper ring and stem, a distinct raised panel, heavier body text) already give dark more presence.
- **(b) Add one paper slab in dark.** The doors section or the opener.

**Recommendation:** (a) for Tier 3. Revisit after seeing E1 and E9 in dark.

### F7. Ambient motion

**Options:**
- **(a) Stay static.**
- **(b) Add a perforated paper disc in the hero ring**, rotating once every 40-60 s, paused off-screen and removed under reduced motion. It is after the Light Prop [5]. Never attribute a speed to its maker in copy.

**Recommendation:** (a). A still poster is authentic, and the disc belongs in the transitions phase (T4) as a mask, where it earns more.

### F8. Pull any transition fixes forward?

The founder has scheduled transitions for later. Three cheap CSS defects exist now:

- **Wordmark ghosting on arrival.** Old capitals show under the new trio on mobile at +320 ms, and the new mark shows over the unwiped page on desktop at +320 ms.
- **Arbitrary wipe origin.** The circle wipe opens from 88%/10%, a point tied to nothing on the page.
- **Torn words mid-swap.** In the left-to-right in-school swap.

**Recommendation:** Pull forward only the wordmark ghost fix: `::view-transition-old(wordmark)` fades out in about 120 ms, and `::view-transition-new(wordmark)` holds at opacity 0 until about 260 ms. It is a visible defect on the first frame a visitor sees. Leave the wipe shape and origin to the transitions phase (T1-T3).

---

## 5. For the transitions phase (later, not Tier 3)

Motion ideas worth banking, each grounded in dossier section 6:

- **T1. Arrival from the hero's own circle.** Move the circle-wipe origin to the Home hero blue circle's centre per viewport: about 79% 33% desktop and 72% 22% mobile, via a `--wipe-at` custom property. Then drop the hero circle's `--from` to a small scale so the wipe hands off to it. The arrival becomes the blue circle opening the door.
- **T2. Three-beat mask arrival.** The new page opens through a triangle, then a square, then a circle, after the Triadic Ballet's three series [19].
- **T3. Bauhaus-to-Bauhaus as Schmidt's diagonal cross.** Replace the left-to-right inset (`theme.css:328-331`) with a 45 degree wipe, led by a heavy ink band, keeping 420 ms and `--ease-snap` [6].
- **T4. The rotating perforated disc.** The new page shows through its holes as it turns once, after the Light Prop and *Lightplay* [5]. This is the crown-jewel candidate.
- **T5. Disassembly on leave.** The outgoing page's shapes fly off along their own `--from` axes before the next page assembles. The `.asm` data already encodes each axis, so a reverse class is cheap. This also fixes the page morph's lingering "n lab" letters and coexisting old shapes (`motion/bauhaus__page__light__desktop.png` at +240 to +320 ms).
- **T6. The wordmark as a machine part.** The trio's three shapes separate and re-dock, each on its own axis, instead of crossfading in place.
- **T7. Reduced motion stays unchanged.** The finished poster.
