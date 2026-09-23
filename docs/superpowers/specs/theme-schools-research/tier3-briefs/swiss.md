# Swiss: Tier 3 brief

Compiled 09-23-26 from three critic reports (authenticity, craft, motion; all B-), the school dossier (`../dossiers/swiss.md`, cited as [n]) and a spot-check of the tier 2 captures. Where the critics disagreed, the call below was made from the evidence, and the reason is given.

Fixed by contract, never touched: copy, link targets, page set, contact form fields and behaviour, portal head and switcher. Everything visual is open.

---

## 1. Verdict

**Current grade: B-.** The room has the school's rules and little of the tension they were for [dossier section 7]. That is why the founder finds it lackluster. The heroes are real Swiss moments: the Home billboard (close to the Neue Grafik no. 2 cover [11]), "The shining tree", "Start a conversation" and, best of all, "Sent." with its red full stop. Below each hero every page falls into one shared template: mono index, red kicker, a mid-size display heading on the left with body on the right, a gutter-inset colour card, then the footer. Three to five display-size elements per page flatten the scale contrast. Hairline guides drawn over every sheet make it read as a Figma overlay of a Swiss page. Red is spent as a UI accent. Dark is a mechanical inversion: coral red, black type on red, and a glaring paper slab for the lab band. There is no image and no rotation at a scale that counts. The page swap slices two headlines into letter salad ("Thrch / sl esign / treb", confirmed in `motion-tier2/swiss__page__light__desktop.png` at +160 ms).

**A+ looks like this:** each page is one poster under one programme. It has one giant (occasionally two), and everything else sits in two small sizes. Colour runs as whole fields to the sheet edge. The grid is felt in shared edges and line-based intervals, never drawn. The whole room uses one grotesque family, and at least one page has a rotated or photographic image that stands for its subject [1][4][5][8]. Dark is designed as the black sheet the canon already uses [3][5][6][8], with Swiss red intact. A swap is a clean paste-up, never a glitch. Keep the rules and add the tension.

## 2. Protect

- **Home billboard:** stacked flush-left "Birch / Design / Lab" in tight Archivo (-0.045em, 0.86 leading) [11].
- **About hero:** "The shining tree" at poster scale beside the etymology column. This is the best page composition in the room.
- **Sent:** "Sent." at ~38vw with the red full stop. One giant, one small block, nothing else. It is the model for every other page.
- **Contact hero** "Start a conversation" at full frame width. Contact in dark is one of the strongest screens.
- **Services numerals** 1 2 3 4 as a huge figure over small title and body [11].
- **Flush left, ragged right, nothing centred** anywhere; no hyphenation; `text-wrap: pretty` (tell 5).
- **No ornament, shadows, radii, gradients or texture** (trap: faux print). Square buttons.
- **`#da0016`** as the Swiss red.
- **Dark as a black sheet** in principle (the execution changes; the idea stays).
- **Subgrid discipline:** nav links and footer blocks start on column lines. Keep the alignments and lose the drawn lines.
- **Quiet header and footer**, 44px touch targets under `(pointer: coarse)` and below 640px (Header.astro, Footer.astro).
- **`overflow-x: clip`** and vw-capped display sizes. There is no sideways scroll at any captured viewport.
- **No background fx** (no `fx.ts`). Posters are static [dossier section 6]. Do not add ambient motion.
- **Hard, stepped, no-crossfade transition character**, keyed to grid tokens, with a true hard cut under reduced motion. Only the pacing and the separation of the two sheets are wrong.
- **Contact field focus:** a 2px red inset outline plus a red border (Contact.astro). Focus on `.sw-red` switches to `--on-accent`.
- **Button hover as a whole-field inversion.** It is the right grammar, so extend it.
- **The single `transition:name`** on the header wordmark.

## 3. Execution work, ordered by leverage

### 1. One giant per page; collapse the type scale

- **Where:** `theme.css` type roles. `pages/Home.astro` (`.door-title` 7rem, `.pull` 6.75rem, `.closer-lead` 12rem). `pages/Services.astro` (offering titles ~7rem, red band headline). `pages/About.astro` (red band pull ~7.5rem). All viewports, both schemes.
- **Change:** define three tokens plus a per-page giant:
  - `--t-small` (~0.8125rem, for captions and legal)
  - `--t-body` (1.0625rem)
  - `--t-lead` (~`clamp(1.5rem, 2.4vw, 2.25rem)`, weight 700)
  - `--t-giant`, set per page

  Demote to `--t-lead` 700: door titles, Services offering titles, the Home lab pull, the About red pull, the Services red closer headline and the Home closer "Ready when you are.". Emphasis now comes from weight and position, not size. Giants:

  | Page | Giant |
  |---|---|
  | Home | billboard |
  | About | title |
  | Services | title plus the numerals row (the one page allowed two, per tell 1 "occasionally two") |
  | Contact | title |
  | Sent | "Sent." |

  Delete intermediate sizes until no more than about five type sizes remain in the whole theme.
- **Why:** craft 1, authenticity 2. Tells 1 and 2, trap "Everything big", section 7 item 3 [10][11]. Home currently has four display blocks and "Ready when you are." at ~158px nearly matches the name.
- **Verify:** `tier2-desktop/t-swiss__light__desktop.png` and `t-swiss-services__light__desktop.png`. Below the hero, nothing should be larger than lead size except the Services numerals. `tier2-mobile/t-swiss__light__mobile.png` should keep a ratio of 4:1 or more between the billboard and "Software".

### 2. Stop drawing the grid

- **Where:** `Header.astro:10-12` (`.sw-guides` markup) and `theme.css:147-170`. All pages, all viewports.
- **Change:** delete the resting guides entirely, including the mobile col-2 line that runs through body copy. Show the structure through shared edges instead. Per page, pick one or two hanging lines, and hang the hero subline, section bodies, lab summaries, the form column and the footer legal from them. Update the header comment that calls the grid "the picture". Guides come back only inside the transition, later (section 5).
- **Why:** authenticity 1, craft 2, motion 8. Tell 4 and trap 1: no canon piece draws its grid [1]-[11], and Gerstner says the grid is for the designer [13]. The guides are the single biggest "costume" signal. In dark they run through the "Sent." letterforms.
- **Verify:** every tier2 still has no hairlines outside real rules. `t-swiss-contact-sent__dark__desktop.png` shows clean letterforms. The `tier2-mobile` sheet has no line through the Home and About body copy.

### 3. Colour as a field, full bleed

- **Where:** `theme.css:256-265` (`.sw-bleed` = -gutter at 1024px and up). Home `.lab`, the About and Services red closers, Contact `.direct` aside. Desktop and tablet.
- **Change:** replace the gutter-bleed with true full-bleed fields. The wrapper spans the viewport (`margin-inline: calc(50% - 50vw)` or a full-width section outside `.sw-row`), and the content sits back on the frame grid. Never half-bleed. For the Contact aside, either sit it exactly inside the frame edge or run it as a full-bleed right field from col 10 to the viewport edge. Either way, top-align it to the section rule: it currently sits 13px below the rule at 827px and overhangs the frame on the right only (x 1403 vs 1382), confirmed in `t-swiss-contact__light__desktop.png`. Make at least one light-scheme section a full black sheet with paper type (see item 6), so black fields are not dark-only.
- **Why:** authenticity 3, craft 3. Tell 9, section 7 item 7, priority 4 [3][4][5][6][8]. The ink band currently stops ~27px short of the viewport while the text margin sits at ~42px, so it reads as a UI card.
- **Verify:** `t-swiss__light__desktop.png` (lab band touches both viewport edges), `t-swiss-services__light__desktop.png` (red closer touches both edges), `t-swiss-contact__light__desktop.png` (aside flush and top-aligned). Also check the tablet stills.

### 4. Design dark as the black sheet, with Swiss red intact

- **Where:** `theme.css:53-69` dark tokens, `.sw-ink`, `.sw-red`, and `meta.ts` contrast.
- **Constraint the critics missed:** the contrast checker (`src/lib/contrast/check.ts:276-280`) requires `--accent` on `--field` at 4.5 and `--on-accent` on `--accent` at 4.5 in both schemes. On `#0b0b0b`:
  - `#da0016` as text is only ~3.8:1.
  - White on any red light enough to pass as text fails.

  That is why the build lifted to coral and put black type on it. One red with white type cannot live in the required `--accent` pair in dark.
- **Change:** split the tokens.
  - **Fields:** add `--red-field: #da0016` in both schemes and an `--on-red: #ffffff` primitive that is not remapped in dark. `#161616` is not white. White on `#da0016` is ~5.3:1. Every red field and red button uses these, including the Services and About closers, the Contact aside, the Home CTA and the Sent full stop. Register `{ fg: '--on-red', bg: ['--red-field'], min: 4.5 }` in `meta.contrast`.
  - **Text accent:** keep `--accent` as the required text accent. In dark, lift it along red, not toward orange: keep green and blue near zero (for example around `#ff1a2b`; confirm with the checker). `--on-accent` stays dark to satisfy the required pair. After item 5, `--accent` is used almost nowhere as text anyway.
  - **Home lab band in dark:** never a paper slab. Make it a full-bleed red field with white type (recommended; it gives dark its own design), or a `#161616` field with a hairline. Remove the double-negative comment and `--red-on-ink`.
  - Tune the dark grey steps separately rather than mirroring light.
- **Why:** authenticity 4, craft 4. Dossier section 5 keeps `#da0016`; black sheets are canon [3][5][6][8]. Confirmed in `t-swiss__dark__desktop.png`: the paper slab spans y≈1000-1425, and the coral hero block carries black type.
- **Verify:** `t-swiss__dark__desktop.png`, `t-swiss-about__dark__desktop.png`, `t-swiss-services__dark__desktop.png`, and the `tier2-mobile` dark columns. Red reads the same hue as light, with white type on red and no paper-coloured band. The contrast test passes in both schemes.

### 5. Retire red as a UI accent; give states a Swiss grammar

- **Where:** `theme.css:118` (`a:hover`), `:120` (focus), `:199-206` (`.sw-kicker` red), `:250-251`. `Header.astro:66-67` (hover and `aria-current` both red). `Footer.astro:39`. `About.astro:48` (etymology `strong` in red).
- **Change:** red is kept only for fields, the one CTA per page, and at most one typographic mark per page (the Sent full stop is the model).
  - Kickers are set in ink.
  - The etymology "to shine" is set in bold ink.
  - Nav current page is shown as an ink field (background `--mark`, colour `--field`, a small inline pad), or with weight 700 against 500.
  - Hover means the underline thickens from 0.08em to 0.16em, instantly, with the colour unchanged. Never animate `wght`, because it reflows the rag.
  - Gate every `:hover` behind `@media (hover: hover) and (pointer: fine)`.
  - Add `:active`: `.sw-btn` inverts to the other field for the duration of the press (no scale); links and nav get a hard ink block.
  - **Focus:** `outline: 3px solid var(--mark); outline-offset: 2px` on paper, `--field` inside black fields, `--on-red` inside red fields. `.sw-btn:focus-visible` also inverts its fill. Add the focus-ring pairs to `meta.contrast` (3:1).
- **Why:** authenticity 13, craft 14, motion 5, 6, 7 and 15. Trap "Accent-colour thinking" [4][7]. Hovered nav currently looks identical to the current page, and tapped links stay red on touch (`swiss__page__dark__mobile.png` +80).
- **Verify:** `t-swiss-about__light__desktop.png` shows no red except fields and at most one mark. `swiss__page__light__desktop.png` +80 shows no red hover on the tapped link on mobile. Tab through Contact and Home in both schemes; the ring must be visible on paper, black and red.

### 6. Give each page its own composition under one programme

- **Where:** `pages/Home.astro`, `About.astro`, `Services.astro`, `Contact.astro`. The shared `.sw-sec` template in `theme.css:186-190`.
- **Change:** one rule set, different divisions per page (Gerstner's mobile grid [13], Hofmann's series [6]). Remove the title-left/body-right table on at least two of the three content pages.
  - **Home (2 fields).**
    - Hero: the billboard grows to ~20vw so "Design" spans cols 1-10. The lead and subline become one small block hung from a single column line on the baseline of "Lab". The red rectangle's fate is founder decision D1.
    - Doors: two equal side-by-side fields (cols 1-6 and 7-12), each with a title at lead size above its body. "How we build" hangs under the right-hand body.
    - Lab: a full-bleed black field in light (red in dark, item 4).
    - Closer: lead size inside a full-bleed red field, with the CTA as the field's one block.
  - **About (3 fields).**
    - Hero: unchanged.
    - Section 02 (the founder): lead plus two body columns running to the frame edge. Col 12 is empty today, so fill it. The rotation is founder decision D2.
    - Manifesto: a full-bleed field (red, or the D1 image field) with the pull at lead size.
  - **Services (4 fields).**
    - Title giant stays.
    - Custom software and Web design sit side by side as two fields with titles at lead size, removing the dead zone under each title (y≈580-1060 in `t-swiss-services__light__desktop.png`).
    - The numerals row becomes the page's second giant: each numeral as wide as its field.
    - Closer: a full-bleed red field.
  - **Contact (1 sheet).** Run the hero as a full-bleed black sheet in light as well (it is the strongest dark screen, so let light borrow it). Paper type, form below on paper, and the email aside as a red field per item 3.
  - **Sent:** leave it alone apart from items 2 and 7.
- **Why:** authenticity 5, craft 5. Trap "Equal rhythm", section 7 item 4, priority 7 [6][10][13].
- **Verify:** `tier2-desktop/sheets/swiss.jpg`. The five pages should read as five posters of one family, not one template with different words. No section structure should repeat across all three content pages.

### 7. One family: Archivo only

- **Where:**
  - Route `src/pages/t/swiss/[...page].astro:6-9`.
  - `meta.ts` fonts and preload.
  - `theme.css:39-41` stacks.
  - `.sw-idx`, `.designation` (Home), footer `.legal` and the Contact meta line.
- **Change:**
  - **Imports:** import `@fontsource-variable/archivo/standard.css` (weight and width axes). Add `standard-italic.css` only if an `<em>` in copy still needs italic; otherwise set `em` roman 700 as About already does. Drop the Public Sans and IBM Plex Mono imports and `meta.fonts` entries.
  - **Preload:** preload `archivo-latin-standard-normal.woff2`.
  - **Body:** set body in Archivo 400 at width 100. If it reads too characterful at 17px, Inter is the reviser's fallback (a judgement call, dossier section 5).
  - **Section indices:** these are aria-hidden decoration, so drop them. If kept, set them in Archivo 700 tabular figures at `--t-small`.
  - **Metadata:** set designations, colophon and the Contact meta line in Archivo.
- **Why:** authenticity 9, craft 7. Tell 10, trap "Monospace metadata", priority 6 [10][11]. Condensed width also unlocks items 9 and D2.
- **Verify:** `t-swiss-contact__light__desktop.png` shows no mono line under "Send it". `t-swiss__light__desktop.png` shows no mono "01 / 2.1 / BDL-008". The network log shows only Archivo woff2 for swiss.

### 8. Line-based vertical rhythm (fields, not just columns)

- **Where:** `theme.css:50` (`--u: 8px`) and `:89-90` (17px / 1.45). `Home.astro:153` (the `padding-top: 0.35em` hack). All section paddings.
- **Change:**
  - Set the body to 1.0625rem / 24px (line-height 1.4118), or 16/24, and set `--u` to the 24px line (use half-lines where needed).
  - Express every section padding, row gap and block height in lines.
  - Define row tracks so side-by-side text blocks share a first baseline, using a shared row plus a cap-height offset, not ad hoc padding.
  - Size buttons in lines (item 11).
- **Why:** authenticity 10, craft 12. Tell 3, section 7 item 2, priority 3 [10].
- **Verify:** `t-swiss-services__light__desktop.png`. Hero sublines, section bodies and numeral captions start on the same line grid; overlay a 24px ruler on the PNG to confirm.

### 9. Phones: the first screen is a poster

- **Where:**
  - `Header.astro:50-55, 72-82` at under 640px.
  - Hero sizes in each page at 390px.
  - `theme.css` `.sw-idx` on phones.
- **Change:**
  - **Header:** one flush-left band. The wordmark sits on one line, with the four links in one row on the 4-column grid (one per column, 0.875rem, 44px targets kept). Today it is a cramped 2x2 cluster beside a two-line wordmark.
  - **Heroes:** size the phone billboard so "Design" fills the measure (~30vw, using Archivo width ~85-90% if needed to fit; verify no overflow at 390px). Make the About, Services and Contact titles phone giants the same way.
  - **Home first screen:** the giant plus one field. Body type starts at or below the fold.
  - **Labels:** drop stacked label layers on phones. Today section heads carry index, kicker, sub-index and title; keep one.
- **Why:** authenticity 11, craft 10, motion 14. The billboard currently fills ~40% of the first screen and is barely twice "Software".
- **Verify:** `tier2-mobile/t-swiss__light__mobile.png` and `__dark__mobile.png` (first 844px is one poster), `tier2-mobile/sheets/swiss.jpg`. No horizontal scroll at 390px (hard requirement).

### 10. Repair the page transition (defect fix only)

- **Where:** `theme.css:293-326`. Every in-school swap and every arrival, desktop and mobile.
- **Change:**
  - **Never show both sheets' type at once.** Phase (a), 0-280ms: the old snapshot is cleared to the bare field colour in hard column panels (animate `::view-transition-old(root)` `clip-path` in steps, over a `::view-transition` or `group(root)` background of `var(--field)`). Phase (b): hold ~60ms on the bare sheet. Phase (c), 340-640ms: `new(root)` is revealed panel by panel. The reviser must confirm in the strip that the exposed area shows field colour, not the live page.
  - **Pacing:** 90-110ms per panel with uneven spacing between keyframes (tell 12 [10]), linear or stepped, no ease-out. The total stays under the ~700ms cap.
  - **Panel count follows the grid:** add `--div` per breakpoint (4 below 640px, 6 above). Compute panel edges from `--edge: max(var(--margin), (100% - 1760px) / 2)` so they land on real column lines on phones and on sheets wider than ~1904px.
  - **Wordmark group:** ~560ms linear with a flat tail (station clock [21][22]). Old and new wordmark images swap in one step, never a crossfade.
  - **Reduced motion:** replace the reduce block with a wildcard (`::view-transition-group(*)`, `-old(*)`, `-new(*)` set to `animation: none !important`) so no new keyframe leaks.
- **Why:** motion 1, 2, 3, 4 and 10; authenticity 8. Section 6 ideas 1-3, section 7 item 9. The current 240ms six-step wipe is one or two frames per step and garbles type (confirmed in `swiss__page__light__desktop.png` +160/+240/+320).
- **Verify:** re-film `motion-tier2/swiss__page__*` and `swiss__arrive__*`. No frame should show glyphs from both pages, and each panel should be visible for at least 5 frames. The `__mobile` strips should show panel edges on the 4-column lines. A reduced-motion run should show a hard cut.
- **Scope:** founder decision D4 confirms the scope. Everything beyond this repair goes to section 5.

### 11. One rule for buttons

- **Where:** `theme.css:270-291` (`.sw-btn`, min-height 72px, label top-left). CTAs on Home, About, Services, Contact.
- **Change:** a button is an exact grid field:
  - **Height:** two text lines (48px on the item 8 unit).
  - **Label:** bottom-left, on the baseline.
  - **Width:** one rule per viewport. Cols 10-12 on desktop, the full form column for "Send it", and full width on phones. Today "Visit the lab" is `min-width: 50%` on mobile while "Let's start your project" is full width.
  - **Colour:** a red field with white type on paper or black, and a black field inside red. Never a paper box on red; the About dark "Let's get started" box goes.
- **Why:** authenticity 12, craft 9. The current tall slabs with a top-left label and empty fill read as sizing bugs.
- **Verify:** `t-swiss-contact__light__desktop.png` ("Send it"), `t-swiss-about__dark__desktop.png`, and the `tier2-mobile` sheet (all CTAs share one width rule per viewport).

### 12. Tablet as its own sheet

- **Where:** 640-1023px, the 6-column sheet. Home hero, Contact.
- **Change:**
  - **Home:** billboard at ~24vw so "Design" spans the frame, with the subline hung on col 4.
  - **Contact:** the email field runs full-bleed as a full-width red field above or below the form, not a right-offset narrow box.
  - Check every item 6 composition at 820px on purpose.
- **Why:** craft 11.
- **Verify:** `tier2-tablet/sheets/swiss.jpg`, `t-swiss__light__tablet.png`, `t-swiss-contact__light__tablet.png`.

### 13. Orphans and the footer

- **Where:** Home 02 `.more`, the About 02 body columns, `Footer.astro`.
- **Change:**
  - Hang "How we build" directly under the last door body, on its column line. Today it floats at col 8 (item 6 moves it anyway).
  - Compose the footer as one small-type colophon on the page's hanging lines. The legal line sits on the baseline of the last nav link, with bottom padding of whole lines. Paint `[data-portal-tail]` in the field colour if the footer should run to the bottom.
- **Why:** craft 13.
- **Verify:** `t-swiss__light__desktop.png` around y≈922, and the footer tail in `t-swiss-about__light__desktop.png`.

## 4. Founder decisions

**D1. Image in the room.** The canon is built on photographs [4][5][6][7], *Grid Systems* gives a chapter to them [10], and the room has none. The Home hero's red rectangle stands for nothing (authenticity 7, craft 6, 15).
- **A.** A red duotone of `src/experiments/bdl-007/still.png` (the Shining Tree) as a full-bleed field on About, carrying the manifesto in white. This is the Wachsmann model [4] and doubles the page's own "shining tree" idea. Decorative `alt=""`, optimised through astro:assets and lazy below the fold.
- **B.** No photograph. Use a constructed figure that stands for the content, as the Tonhalle posters do [1]. For example, the birch stem-plus-chevron mark as pure geometry, enlarged and cropped by the sheet edge on Home.
- **C.** Neither. Drop the Home red rectangle and let the name take the sheet, or make the rectangle the full-height field the hero sits on.
- **Recommendation:** A on About, plus C on Home (the billboard is Home's image). This is the single largest step from B to A. Photography is what Swiss has and the portal's Bauhaus room does not (trap "Bauhaus overlap").

**D2. A rotated giant.** The canon rotates its biggest element at full sheet height [5][8], or the whole composition [2]. Here, only 16px kickers rotate (authenticity 6, craft 8). Either way, the small `.sw-vert` kickers are retired and set level (execution, item 6).
- **A.** One aria-hidden decorative word per chosen page, in condensed Archivo (width ~62%), running the full height of its section up the frame edge.
- **B.** A 45-degree turned field on Services.
- **C.** No rotation.
- **Recommendation:** A, on About only. Use the word "birch" in lowercase, running the height of section 02 beside the founder text, which echoes the etymology. One page with rotation keeps it a programme choice rather than a new template. It also needs item 7's width axis.

**D3. Lowercase.** Lowercase is a strong period marker [3][4][7][8] (tell 11), but not universal: the Neue Grafik title is capitalised [11]. It would be applied with CSS `text-transform` only; copy and parity are unaffected.
- **Options:** lowercase all giants; lowercase decorative and rotated words only; or none.
- **Recommendation:** decorative and rotated words only. Keep the name and page titles in their current case.

**D4. Transition scope in Tier 3.** The founder said transitions come later, but the current swap garbles type on every page change.
- **A.** Tier 3 does the defect repair in item 10 only.
- **B.** Defer everything to the transitions phase.
- **Recommendation:** A. The garble reads as a bug, not a style.

**D5. Wordmark handoff and the one-name rule** (orchestrator plus founder, transitions phase). Home's billboard is the wordmark at poster scale. The strongest move is the billboard collapsing into the header mark, and that needs the billboard to hold `transition:name="wordmark"` on Home instead of the header link.
- **Options:** allow it per page (the name stays unique per page), or keep the header-only rule.
- **Recommendation:** allow it, and decide before the transitions phase. Do not ship it in Tier 3.

## 5. For the transitions phase (not Tier 3)

- **Station-clock signature** for everything: constant-velocity travel, a held beat, then a hard switch. Compress the 58:2 ratio into ~700ms [21][22]. No ease-out, no overshoot.
- **Gerstner re-division as the page-to-page programme** [13]. Each page owns a division (Home 2, About 3, Services 4, Contact 6). The arrival draws the old page's guides, slides them linearly to the new lines, holds, fills fields in a programmed uneven order (tell 12 [10]), then withdraws the guides. This is the one place the grid may be drawn (trap 1). The guide layer can be a `repeating-linear-gradient` on `::view-transition-group(root)` at the `--div` pitch.
- **Paste-up in non-contiguous field order**, for example panels 1, 4, 2, 6, 3, 5, using multi-rectangle `polygon()` clip paths.
- **Arrival from another school:** a first hard step on `html[data-from-theme]:not([data-from-theme='swiss'])::view-transition-old(root)` to `grayscale(1) contrast(1.2)`. The old school is "stripped to black and paper" before Swiss lays itself down (section 6 idea 6). In-school swaps skip it.
- **Billboard to wordmark handoff on Home** (D5): 17.5rem stacked grotesque travels to the header mark at constant velocity, holds, and the images swap in one step.
- **Rotation into place:** if D2 ships, the giant word arrives horizontal and turns 90 degrees into its spine at constant velocity with a hard stop. It is the one moving thing per view; under reduced motion it simply appears.
- **Motion blur belongs to a photograph, never to type** [5], relevant if D1 A ships.
- **Keep:** no ambient fx, a hard cut under reduced motion, and a built-site test asserting that the reduce block covers every `::view-transition-*` selector `theme.css` declares.
