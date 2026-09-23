# Period Rooms: the set and the portal (Tier 3 brief)

Written 09-23-26 by the last critic on the panel, after the six per-school briefs in this folder. It judges the set rather than any one school: whether the six rooms stay distinct from one another, whether their quality is even, how the portal feels to walk through, what belongs in shared code, and where the six briefs disagree. It ends with an order for Tier 3 and the founder decisions that gate it.

Evidence I looked at: the six desktop and six mobile overview sheets (`scripts/themes/.out/tier2-desktop/sheets/`, `tier2-mobile/sheets/`), the arrival strips (`motion-tier2/*__arrive__*`, desktop in both schemes and two mobile), and the shared code: `src/themes/portal/` (PortalLayout, runtime, switcher), `src/themes/README.md`, `src/themes/*/theme.css` view-transition blocks, `tests/built/portal.test.ts` and `scripts/themes/lib/visible-text.mjs`. Every claim below that depends on code was checked against the current tree.

## Verdict

The set works. At a glance nobody would confuse two schools, and the founder's ranking matches the captures: vaporwave and bauhaus set the bar, grandmillennial and cottagecore sell the studio, glassmorphism and swiss lag.

What holds the set back is shared, not per-school:

1. **All six rooms sit on one wireframe.** Each school changed the finish but not the layout, and the portal's same-page Shuffle, which keeps your scroll position, makes that obvious.
2. **Three pairs sit close to each other, and some per-school recommendations would push them closer:**
   - swiss and bauhaus
   - glassmorphism and vaporwave
   - grandmillennial and cottagecore
3. **The portal lets every school down in the same places:**
   - The switcher gets caught in each school's page transition and distorted with it.
   - The house style has no transition of its own when you return to it.
   - Reduced motion is handled five different ways.
   - Nothing in the rooms explains what the visitor is looking at.

## 1. Distinctness

### What each room owns (and should keep)

| School | What it owns in the set |
|---|---|
| Vaporwave | The site as a 1995 operating system: taskbar, file-name windows, `setup.exe` progress bars, a mail-client contact form. |
| Bauhaus | The site as a constructed poster: primaries as solid blocks, shapes that assemble, lowercase geometric type. |
| Grandmillennial | The site as a formal room: symmetry, gilt frames, porcelain, awning and valance, centred composition. |
| Cottagecore | The site as a table-top collage: pressed specimens, paper, washi tape, handwriting, and an off-centre layout. |
| Swiss | The site as a typographic sheet: one family, giant type, and full-bleed colour fields. |
| Glassmorphism | The site as layered material: depth and blur over colour. The material is right but the room is not yet built around it (see its brief). |

### The shared wireframe

Every school kept quiet's section order, although the README says "section order on screen" is theirs. Most also kept quiet's arrangement *inside* each section. With Shuffle landing on the same scroll position, the visitor sees the same furniture in a new fabric. These are the repeated patterns, read from the desktop sheets:

| Pattern | Where it repeats | Schools that already break it |
|---|---|---|
| Home "What we build" as **two equal side-by-side cards** (Software, Web design) | vaporwave windows, glass panes, grandmillennial swatch cards, cottagecore index cards, bauhaus 01/02 boxes | swiss (stacked list) |
| Services "How a project runs" as a **four-up horizontal row of equal columns** | vaporwave progress bars, bauhaus colour-ruled columns, swiss giant numerals, grandmillennial four medallions, glass four cards | cottagecore (2x2 in a recipe box); vaporwave partly, because the progress bars reinterpret the row |
| Closing **centred headline plus one button** band ("Ready when you are", "Every project starts...") | all six | none |
| Contact: **title and form on the left, email aside on the right** | all six | vaporwave partly (the form is a mail window) |
| Footer: **name and location on the left, nav on the right** | five | grandmillennial (centred cartouche) |
| Home hero: **billboard on the left, picture on the right** | swiss (red rectangle), bauhaus (shape poster), cottagecore (specimen), glass (window and orbs) | grandmillennial (centred portrait), vaporwave (centred sunset) |

The strongest rooms are the ones that *reinterpret* a section rather than restyle it. Vaporwave's four steps became an installer. Cottagecore's steps became a recipe card. This is the lever for the laggards (section 2).

Recommendation (founder decision S8): each school re-expresses **at least the process row and one other shared skeleton** in its own idiom during Tier 3. Candidates already in the briefs:
- glass: the E1 grouped pane
- swiss: the per-page compositions after item 5
- grandmillennial: the collected porcelain wall (the Services medallions could hang on it)

For bauhaus, one candidate that is in no brief: the four steps as one constructed diagram rather than four columns. Nobody needs to rewrite the whole flow.

### Pair 1: swiss and bauhaus (the closest pair)

The two already share a lot:
- flat colour
- sans display type
- black and off-white with red
- a billboard on the left with a coloured block on the right on Home
- in dark, a black wall with white type and red fields

The dark desktop sheets are the most confusable in the set, and on phones both collapse to a black column with a red band. Three items in the briefs would move them closer still:
- **Bauhaus F2** ("red as a second ink", display and emphasis type in red). Swiss E5 makes red the one mark and the field colour. Red *type* is a Swiss move, and bauhaus's own doctrine ("primaries are blocks, never text") is what separates the two. **Set recommendation: decline F2.** This overrides the bauhaus brief.
- **Swiss D3 (lowercase for decorative and rotated words)** and **D2 (a lowercase "birch" rotated giant).** Universal lowercase is a Bauhaus signature (Bayer), and bauhaus E2 is pushing further into it. **Set recommendation: swiss D3 = "none".** The rotated giant, if D2 ships, keeps the copy's own capital ("Birch"). This overrides the swiss brief's recommendation.
- **Swiss D1** (a red duotone photo field on About, and dropping the Home red rectangle) moves *away* from bauhaus. It removes the one hero skeleton the two share and gives swiss photography, which bauhaus does not have. Support it.

Dark scheme: bauhaus F6 keeps the black wall, and swiss E4 designs dark as the black sheet. Both are fine alone. To keep them apart, bauhaus's dark pages should lead with yellow and blue blocks, and swiss's with red and white. Where the same section is a red field in both schools, one of them changes. Today the only clash is the Home hero; the About closer (swiss red, bauhaus yellow) and the Services CTA (swiss red, bauhaus blue) already differ.

### Pair 2: glassmorphism and vaporwave

- **Palette.** Both are indigo in dark, with magenta, cyan and violet. At sheet scale, glass dark and vaporwave dark read as the same purple-and-pink page. Glass E3 ("fixed and saturated, using the full orb hues") would make the overlap stronger unless the hues move. **Set recommendation (S3):** glass's saturated wallpaper takes its lead from the Big Sur warm set (orange, coral, deep blue) or from Windows 11 Bloom blue, and magenta is demoted to an accent. This fits the glass brief's own D1 hybrid ("2021 Dribbble colour") without taking vaporwave's sunset palette. The palette should be decided before glass E3 is built.
- **Window chrome.** Vaporwave owns "the site as software windows". Glass's Home hero is also a window, with traffic lights and a fake toggle, and glass D5 recommends an inert title-bar label. That adds more window chrome. **Set recommendation:** take the D5 option that removes the toggle and the locale pill *without* adding a title bar. Keep the traffic lights as the one small platform tell (they are on the glass protect list), so that glass reads as material and light, not as a second operating system.
- Vaporwave F1 (the sunset only on Home) helps as well, because it thins the purple-gradient mass across vaporwave's other pages.

### Pair 3: grandmillennial and cottagecore

They are well separated overall: formal and symmetric against collage and off-centre; green, oxblood and gilt against brown, cream and gingham. There are two real collisions:
- **Needlework on the About closer, in both.** Grandmillennial's closer is a cross-stitch sampler (its brief protects it and D adds a cross-stitch alphabet band). Cottagecore's closer is an embroidery hoop, and its item 10 adds "a small cross-stitch border or alphabet row" plus a "B.D.L. 2026" cross-stitch signature. The same guarantee sentence would sit in the same stitched object on the same page of two rooms. **Set recommendation (S5):**
  - Cross-stitch lettering (alphabet band, maker's mark in counted stitch) belongs to **grandmillennial**'s framed sampler. A formal, finished needlepoint piece is a grandmillennial tell.
  - **Cottagecore** keeps the hoop but uses freehand embroidery (satin-stitch florals, loose thread, work in progress) and no alphabet row.
  - Trim cottagecore item 10's sampler bullet and D1's "B.D.L. 2026" cross-stitch signature to match.
- **Bows.** Grandmillennial owns the ribbon bow. Cottagecore D3 (swap the Services satin bow for garden twine) is right for the set as well as for the school: support it.

### Phones

On phones every school becomes a single column in quiet's section order, so the wireframe shows more.

**Stay distinct on phones:**
- vaporwave: every block is a window
- bauhaus: full-bleed shape blocks
- grandmillennial: framed hero, awning

**Converge on phones:**
- glass reads as white cards on lilac (its brief confirms this)
- swiss reads as a plain text column once the grid has nothing to hang on

The two laggards lag more on phones than on desktop. Their Tier 3 review should start with the mobile sheet (see Order).

## 2. Quality parity

**Who sets the bar, and why (approach, not style).** Vaporwave and bauhaus each have a *governing metaphor that changes what the components are*, not just how they look. A section becomes an object from the period: a Services step becomes an installer progress bar; a numeral is built from shapes; the contact form is a mail client; the hero assembles. Their motion also *means something inside the metaphor*: a CRT powering on, a poster being constructed. Grandmillennial and cottagecore have the metaphor (a room, a table) and most of the objects, so they sell the studio. What they lack is finish, not concept.

**Laggards and what to borrow:**
- **Glassmorphism** has a material but no metaphor for the components; every section is the same card. Borrow bauhaus's approach of *assigning roles*: one showpiece per page, and glass thickness and position by role (E1). Borrow vaporwave's approach of *turning a section into a platform object*: the four steps as one grouped settings-style pane, the footer as a dock (E6). Motion should mean something within the material (E4, the backdrop moving under the glass) rather than being a blur applied to the whole page.
- **Swiss** has a strong hero moment and then a template below it. Borrow bauhaus's discipline that *every page is composed as one poster*: one giant per page, and colour as fields and structure rather than decoration (swiss items 1 to 3 already say this). Borrow cottagecore's and grandmillennial's *one hero object per page*: the D1 duotone image, and the D2 rotated giant.
- **Both laggards:** reinterpret at least one shared section (section 1, S8). That is the cheapest way to close the gap to the bar-setters.

## 3. The portal as an experience

### Entering from the Lab

The BDL-010 card links to `/t/quiet/` as a full load. Quiet is the regular site, so the visitor lands on a page they may have just left, and the only sign they have entered an exhibit is the switcher bar in the bottom-right corner. The how-to lines are on the Lab card, not in the room. The rooms also have no placard:
- `meta.lesson` is written for all seven schools and rendered nowhere; `PortalData` carries only `era` and `signature`, which appear only inside the switcher dialog.

Consequences for the briefs:
- **Vaporwave F2** (rewrite era, signature and lesson) and **bauhaus E4** (replace the lesson line) change nothing a visitor sees unless the lesson is rendered.
- **Bauhaus E4's verify step** ("the switcher's wall label shows the new line") would fail today.

Recommendation (S6):
- Add `lesson` to `PortalData`.
- Show the current room's era, signature and lesson as a placard at the top of the switcher dialog.
- On the first portal load in a session (no `data-from-theme`), show a one-line prompt above the bar: "Period Rooms: this site in seven design schools. Pick a room." It is dismissed on the first interaction, and the dismissal is remembered in sessionStorage, which is acceptable for a per-viewer convenience.
- No auto-opening dialog.

Order the school list by era, so the dialog reads like walking through the exhibit: quiet, bauhaus (1919), swiss (1950s), vaporwave (2010), cottagecore (2018), grandmillennial (2019), glassmorphism (2020). Today the order is quiet, vaporwave, grandmillennial, glassmorphism, cottagecore, bauhaus, swiss. The change touches only the `order` fields (S7).

### Moving between schools (the arrival strips)

**The switcher is swept up in every school's page transition.** `<bdl-switcher>` is persisted, but it has no `view-transition-name`, so it is captured in the root snapshot and animated with each school's root choreography:
- cottagecore arrival, +400 ms: tilted and doubled
- grandmillennial mobile arrival, +400 ms: split by the wipe, so the label reads "Quietnnial"
- vaporwave: collapsed with the CRT
- glass: blurred

The Lab's one fixed instrument should be the one thing that never moves. This is fix P1.

**Nothing happens for a while after the click, and the delay differs by school.** First visible change after the click, in the desktop arrival strips:

| School | First visible change |
|---|---|
| swiss | about +160 ms |
| bauhaus, grandmillennial | about +240 ms |
| glassmorphism, cottagecore | about +400 ms |
| vaporwave | about +480 to 560 ms |

The old-page keyframes have no delay (vaporwave's `vw-crt-off` starts at 0 ms), so the gap comes *before* the view transition starts, not from the choreography. The cause is not font weight: vaporwave preloads the smallest pair (38 KB) and starts last, while cottagecore preloads 159 KB. Candidates are page fetch and parse, the destination's module scripts, or capture timing in `motion.mjs`. **Measure with a performance trace before fixing** (P4).

Separately, the switcher gives no feedback while the next page loads. A pressed or busy state on the control that was used would cover any remaining delay.

**The house style has no transition of its own.** Quiet has no `theme.css` and no global view-transition rule exists anywhere in `src/`. Returning to quiet from any school therefore gets the browser's default 250 ms crossfade and the default wordmark morph. That is the one unchoreographed move in the portal, and it happens every time a visitor goes back to compare. It belongs in the transitions phase. Quiet's styles are shared with the root business pages, but those pages do not use the ClientRouter, so a rule scoped to `html[data-theme='quiet']` is low risk.

**Wordmark ghosting is a common fault.** Bauhaus F8, grandmillennial item 4 ("the two never show together") and cottagecore item 2 (the wordmark stretching; the `object-fit: none` fix) all fix the same thing: the browser's default crossfade of two differently shaped wordmarks. The grandmillennial arrival (+240 to 320 ms) shows the quiet caps and the italic "Birch" legible together. One recipe in the README fixes it for all six (P5).

### Shared behaviours

- **Scroll.** A same-page school switch restores the position proportionally (`runtime.ts:74`). Page lengths differ a lot (grandmillennial Home is roughly 1.6 times swiss Home on the desktop sheet), so proportional restore can land in a different section. For the transitions phase: restore to the *section* that was at the top, keyed to a copy field. Word parity guarantees every school renders the same fields.
- **Focus.** It is correct. Link navigations focus `#main`. Switcher navigations leave focus on the persisted switcher, and `dialog.close()` returns it to the open button. Nothing to change.
- **The 76 px tail.**

  | School | Tail |
  |---|---|
  | grandmillennial, cottagecore, bauhaus | painted |
  | swiss, glassmorphism | unpainted, but harmless because the footer sits on the page field |
  | vaporwave | unpainted and visible as a flat band under its floor (its brief, E3) |

  The rule is fine; add it to the capture review checklist.
- **Reduced motion.** There are five different implementations, and three will leak once schools add named groups:

  | School | VT reduce block |
  |---|---|
  | vaporwave | wildcard groups, old and new: `animation: none !important` |
  | grandmillennial | wildcard, `animation: none` |
  | cottagecore | wildcard, `animation-duration: 1ms` |
  | glassmorphism | root old/new and `group(wordmark)` only |
  | swiss | `new(root)` and `group(wordmark)` only |
  | bauhaus | root old/new and `group(wordmark)` only |
  | quiet | none (browser default crossfade) |

  In glass, swiss and bauhaus, the wordmark's image pair still runs the default crossfade under reduce. When `vw-taskbar`, `cc-header` or `glass-bar` arrive, any school without a wildcard lets them animate. The briefs also conflict:
  - swiss wants a blanket hard cut
  - glass wants "an 83ms linear fade instead of none"
  - cottagecore uses 1 ms

  One portal policy settles it (S1, P3).

## 4. Cross-cutting fixes for shared code

These go in one portal PR before any school's Tier 3 work, because several school items depend on them.

**P1. The switcher gets its own named group that does not animate.**
- **Where:** `PortalLayout.astro`.
- **Change:**
  - Give `<bdl-switcher>` the inline style `view-transition-name: bdl-switcher`.
  - Add a small `<style is:inline>` in the head with:
    - `::view-transition-group(bdl-switcher) { animation: none }`
    - `::view-transition-old(bdl-switcher) { display: none }`
    - `::view-transition-new(bdl-switcher) { animation: none }`
  - It must be inline (not an Astro-bundled style), so it does not join each school's stylesheet set checked by "each school ships only its own CSS". It names no school, so "styles name no other school" stays green.
- **Verify:**
  - Re-film any arrival and a cottagecore page swap. The switcher crop is identical in every frame except for the label text.
  - Add that check to `motion.mjs` as a pixel diff of the switcher's box, with the label masked.

**P2. Chrome groups only for swaps within a school (the contract amendment behind S2).**

*Built in Stage 1 (09-23-26). The shipped recipe is one `:is()` rule per name, and `data-to-theme` only affects the old capture; `src/themes/README.md` ("View-transition names") is the contract of record, not the two-rule sketch below.*

The problem: a school-named group such as `vw-taskbar` or `cc-header` only pairs within its own school. On a cross-school swap, the old page's named element is styled by the *new* school's CSS, which cannot name it (the guard forbids naming another school). So it falls back to the browser's default fade and "animates apart from the arrival". Vaporwave raised this; it applies to cottagecore, glassmorphism and grandmillennial too.

- **Change:**
  - In `runtime.ts` `astro:before-preparation`, set `data-to-theme=<destination>` on the *current* `<html>`. That runs before the view transition captures the old page. The attribute is dropped automatically when the router replaces `<html>` attributes; overwrite it on every navigation so an aborted one cannot leave it stale.
  - Schools then name chrome only within their own school, so across schools the header stays in the root and rides the arrival:
    - old side: `html[data-theme='x'][data-to-theme='x'] .header { view-transition-name: x-header }`
    - new side: `html[data-theme='x'][data-from-theme='x'] ...`
  - Update the README naming rule:
    - `wordmark` is the one cross-school pair
    - `bdl-switcher` belongs to the portal
    - school names are `<id>-*`, used once per page
  - Tighten `tests/built/portal.test.ts:111` to allow only those three shapes, in addition to uniqueness.
- **Unblocks:** vaporwave E9, cottagecore item 2, glassmorphism D6, and grandmillennial H's "second name".

**P3. One reduced-motion policy, owned by the portal.**
- **Change:** in `runtime.ts` `astro:before-swap`, if `matchMedia('(prefers-reduced-motion: reduce)').matches`, call `e.viewTransition.skipTransition()`. `TransitionBeforeSwapEvent.viewTransition` exists in the installed Astro 7 (`node_modules/astro/dist/transitions/events.d.ts:23`).
  - The result is a hard cut everywhere, quiet included.
  - Schools may delete their view-transition reduce blocks and keep their in-page reduce rules.
- **Replaces:** swiss's proposed test that "the reduce block covers every view-transition selector"; one portal test does the job.
- **Depends on S1.** If the founder prefers a short fade, the portal applies one 120 ms opacity crossfade to the root under reduce instead, and still skips every named group.

**P4. The delay before the transition starts.**
- **Change:**
  - Profile the arrival for swiss and vaporwave (fastest and slowest) and find where 300 to 400 ms goes before `startViewTransition`.
  - Likely remedies:
    - prefetch every school's same page (and its font preloads) when the dialog opens, and the Shuffle target when the pointer is over Shuffle
    - lower `FONT_WAIT_MS` (600) if fonts turn out to matter on a real network
    - a busy state on the switcher control
  - Target: first visible change at or under 160 ms for every school on the local build.

**P5. The wordmark recipe, in the README.**
- **Change:** document one default that all six adopt and may then tune:
  - `::view-transition-old(wordmark)` fades out over the first 35% of the group duration, and `-new(wordmark)` fades in from 40%, so the two are never legible together.
  - Both get `height: 100%; object-fit: none` (the cottagecore finding), so a wordmark with a different aspect ratio is not stretched.
  - The founder named the wordmark morph the model for the transitions phase, so it should be solid first.
- **Resolves:** bauhaus F8, the wordmark part of grandmillennial item 4, and cottagecore's stretch.

**P6. Room placards and order (S6, S7).**
- **Change:**
  - `lesson` goes into `PortalData`.
  - The switcher dialog gets a current-room placard.
  - The first-load prompt is added.
  - `order` is renumbered chronologically.
- **Note:** the switcher lives in its own shadow root, so none of this touches school CSS.

**Also settled here (no code):** the word-parity walker drops any subtree under `aria-hidden="true"`, SVG `<text>` included (`scripts/themes/lib/visible-text.mjs:37-38`). That answers cottagecore's open question and covers grandmillennial D and vaporwave E5. Decorative lettering is safe as long as the `aria-hidden` is on the SVG or an ancestor.

**Shared acceptance for page swaps in Tier 3** (every school's swap fix is held to it):
- No frame shows both pages' body text legible.
- No white or unpainted frame.
- The switcher is stable (P1).
- In-school swaps stay under the README's ~700 ms.
- Reduced motion is a hard cut (P3).

## 5. Where the briefs conflict

| Conflict | Briefs | Resolution |
|---|---|---|
| Extra view-transition names vs "one `transition:name`" | vaporwave E9, cottagecore 2, glass D6, grandmillennial H, swiss D5 | P2 and S2: school names `<id>-*` for in-school swaps only; `wordmark` stays the only cross-school pair. Swiss D5 (the billboard carries `wordmark` on Home) is a separate question for the transitions phase and generalises to every school, because every Home has a billboard. Decide it once for the set, not only for swiss. |
| Reduced motion: hard cut, 83 ms fade, or 1 ms | swiss 176, glass 202, cottagecore reduce block | P3 and S1. Recommend a hard cut. |
| Scope of transition work in Tier 3 | swiss D4 and bauhaus F8 (defects only); glass D9, vaporwave E1, grandmillennial 4 (defect fixes); cottagecore D5 (a new arrival gesture now) | Principle: Tier 3 repairs defects against the shared acceptance; new choreography waits. Allow cottagecore D5 only in the form its item 2 fix needs (an opaque new sheet with a small lift *replacing* the page turn). The "laid on the table" gesture is designed in the transitions phase. |
| Red as type | bauhaus F2 (yes) vs swiss E5 (red is swiss's one mark) | Decline bauhaus F2 (section 1, pair 1). |
| Lowercase | bauhaus E2 (more lowercase), swiss D2/D3 (lowercase decorative words) | Lowercase stays with bauhaus; swiss D3 = none. |
| Cross-stitch lettering | grandmillennial D, cottagecore 10 and D1 | Grandmillennial owns counted cross-stitch; cottagecore's hoop goes freehand (S5). |
| Window chrome | glass D5 (title bar) vs vaporwave's identity | Glass removes the toggle and pill without adding a title bar. |
| Saturated purple field | glass E3 vs vaporwave's palette | Glass wallpaper hues away from magenta and cyan (S3). |
| Wall label edits that nobody sees | vaporwave F2, bauhaus E4 | Render `lesson` (P6); otherwise these two items have no visitor effect. |
| A bottom dock | glass E6 (footer "dock") vs vaporwave F6 (declined a bottom taskbar because the switcher owns the bottom strip) | No conflict, provided the glass dock stays in the page flow at the footer and is not fixed. State that in E6. |

## 6. Recommended order for Tier 3

Stop at each stage for the founder (decisions are shared). Pairs run as units so each boundary is reviewed side by side.

**Stage 0: founder decisions S1 to S8** (below). Put them in one sitting with the side-by-side sheets. S2, S3 and S4 change what the pairs build.

**Stage 1: the portal PR (P1 to P6)**, plus the README amendment and the guard change. It is small and mechanical, and it unblocks four schools' items. Re-film all arrival strips afterwards as the new baseline.

**Stage 2: the defect sweep across all six, in parallel.** These are repairs, not design, and each has a clear verify step:
- vaporwave: E1 swap, E2 Contact overflow, the tail from E3
- glassmorphism: E15 swap blur
- swiss: the transition repair (D4 scope)
- cottagecore: item 2 double exposure
- grandmillennial: item 3 swatch grid, item 4 timing
- bauhaus: E5 widows (F8 is covered by P5)

Everything is held to the shared swap acceptance.

**Stage 3: pair B, glassmorphism and vaporwave.**
- **Why first:** glass lags most, and its palette and chrome decisions (S3) set the boundary with vaporwave. Vaporwave's F1 (sunset only on Home) is decided in the same sitting, because it changes the balance on both sides.
- **How:** review the mobile sheets first.

**Stage 4: pair A, swiss and bauhaus.**
- **Why:** swiss is the second laggard, and S4 (red and lowercase) sets its boundary with bauhaus.
- **Mobile:** swiss's poster first screen on phones is part of this stage.

**Stage 5: pair C, grandmillennial and cottagecore.**
- **Why last:** both are selling already, and S5 is their only boundary. Their big items (papered walls, several hands, flora) are additive and do not interact with the other pairs.

**Stage 6: set re-review.**
- Regenerate all twelve sheets and the arrival strips.
- Run this same set critique against them.
- Check the boundaries: the confusable pairs at thumbnail scale in dark, and phones.
- Only then open the transitions phase.

## 7. Founder decisions that gate Tier 3

- **S1. Reduced-motion policy for page swaps.** Options:
  - (a) a hard cut everywhere, owned by the portal
  - (b) one short crossfade, owned by the portal
  - (c) per-school, as today

  **Recommend (a).** It gates P3 and resolves swiss vs glass.
- **S2. The view-transition naming contract.**
  - Allow `bdl-switcher` (portal) and `<id>-*` names for in-school swaps, via `data-to-theme`, with `wordmark` the only cross-school pair. **Recommend yes.** It gates vaporwave E9, cottagecore 2, glass D6 and grandmillennial H.
  - Park "the Home billboard carries `wordmark`" (swiss D5) for the transitions phase as a set-wide question.
- **S3. Glass vs vaporwave boundary.**
  - Glass wallpaper hues: **recommend** a lead from the Big Sur warm set or Bloom blue, with magenta and cyan as accents only.
  - Glass window chrome: **recommend** removing the toggle and pill without a title bar, and keeping the traffic lights.
  - This decision is made together with glass D1 and D5 and vaporwave F1.
- **S4. Swiss vs bauhaus boundary.**
  - **Recommend:** decline bauhaus F2 (no red type), swiss D3 = none, and the swiss rotated giant (if D2 ships) keeps the copy's capital.
  - Support swiss D1 and bauhaus F6, with the colour rule from section 1.
- **S5. Needlework ownership.** **Recommend:** grandmillennial owns counted cross-stitch lettering; cottagecore's hoop goes freehand with no alphabet row. Twine for cottagecore (its D3) and bows for grandmillennial.
- **S6. Room placards.** **Recommend:** render `lesson`, era and signature as a placard in the switcher dialog, plus a one-time prompt on the first portal load. No auto-opening dialog. Without it, vaporwave F2 and bauhaus E4 are invisible.
- **S7. Switcher order.** **Recommend** chronological by era after quiet.
- **S8. Breaking the shared wireframe.** **Recommend:** each school re-expresses the process row and at least one other shared skeleton in its own idiom (section 1 lists candidates). The founder should also say whether any school may reorder sections. The README allows it; none has done it.

Per-school decisions that should be taken in Stage 0 because they change a boundary:
- glassmorphism D1 and D5
- vaporwave F1
- bauhaus F2
- swiss D1, D2 and D3
- grandmillennial D
- cottagecore D1 and D3

Every other per-school decision can wait for its pair's stage.
