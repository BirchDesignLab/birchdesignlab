# Grandmillennial: Tier 3 brief

School id `grandmillennial`. Written 09-23-26 from three Tier 2 critiques (authenticity, craft, motion, each B+), the research dossier (`dossiers/grandmillennial.md`, cited as [n] and by its G, T and M codes), and my own spot-checks of the captures behind any claim that was doubtful or where the critics disagreed. The founder says this school is "absolutely selling what we can do", so every item below is polish. None of it is a teardown.

Paths: stills in `scripts/themes/.out/tier2-<viewport>/t-grandmillennial[-page]__<scheme>__<viewport>.png`, motion strips in `scripts/themes/.out/motion-tier2/grandmillennial__<kind>__<scheme>__<viewport>.png`. A Tier 3 re-capture should land at the same names so before and after can be compared side by side.

Contract reminders for the reviser: copy, link targets, page set, contact form fields and behaviour, portal head and switcher are fixed. Exactly one `transition:name` (the header wordmark). Any new surface that carries text gets a `meta.contrast` entry. Every new transform or animation is gated by `prefers-reduced-motion: no-preference`. `meta.forbids` already lists "visible grids".

## 1. Verdict

**B+ now.** The room is designed. The awning and valance bracket every page as one house, the palette is disciplined, and the Home hero (a gilt-framed portrait on a chintz mat, hung from an oxblood bow on trellis paper) is the strongest single image in the portal. What holds it at B+ is that it reads as **ornament on cream, not pattern on pattern** (G2): most views carry one small patterned object on a plain field, the promised toile is a two-tone leaf ditsy (G1), the Services No. 1 swatch tiles in a visible grid (which breaks the school's own `forbids`), the prints look new rather than heirloom (G4), the dark "lacquer" is matte (G3), and the type measure and breakpoints are looser than the ornament. **A+ looks like this:** every page has at least one room-scale papered wall where two or three patterns meet (wall, stripe border, framed swatch) with text on raised cards; a real single-ink figurative toile; one saturated, glossy anchor surface per page in both schemes; prints that look faded and hand-blocked; a collected, off-axis porcelain wall that survives phones; body type set to a stationery measure; and an arrival where the drapes visibly part from the first frame and the wordmark hands over cleanly.

## 2. Protect

These survive revision. Change around them, not through them.

1. **Awning header and box-pleated valance footer** bracketing every page (T11 [13]), with the dark swap to an oxblood and cream awning and an oxblood footer. (All three critics.)
2. **Home hero:** portrait hung from the oxblood bow, chintz mat, gilt frame, oval cartouche, trellis paper. It reads on desktop, tablet and phone. Fix its responsive details (item 9), never its concept.
3. **Palette and text tokens:** cream cotton ground, oxblood, cobalt porcelain blue, hunter green, gold only as rule and ornament. The dark scheme is a composed room, not an inversion; keep the hunter hue exactly. Only the `--c-*` pattern inks may move (item 7).
4. **Type trio:** Playfair italic display, Cormorant body, Pinyon for signature moments only ("Ready when you are.", "Sent.", the seal, the monogram).
5. **The chintz repeat** in `parts/Defs.astro #gm-chintz`, and the chintz-topped and stripe-topped scalloped valance heads on Home's "What we build" cards (a correct small T1 moment).
6. **Home Lab band:** saturated porcelain-blue room in light, oxblood in dark, scalloped edges. It is the one anchor surface that already works (T6).
7. **Services sample book:** pinked swatches with "No. 1 / No. 2" tags (T12 [21]) and the porcelain oval roman-numeral medallions I to IV.
8. **Contact desk:** the ruled writing-paper textarea with its margin line, and the envelope with the wax seal. **Sent:** the seal plus the Pinyon "Sent." signature.
9. **About:** the cross-stitch sampler closer, the gilt oval with its chintz mat, the Playfair italic drop cap B, and the founder letter in a gilt corner-scroll frame.
10. **Footer cartouche monogram** and the Mississippi Gulf Coast italic line.
11. **Motion temperament:** short and settled, no springy overshoot on chrome (M6 [10]). The drapes idea (a centre-out reveal that opens on the symmetric hero). Drapes only when arriving from another school, a quiet swap between rooms of the same house (the `:not([data-from-theme='grandmillennial'])` guard). No `fx.ts`, zero background runtime cost. The reduced-motion block that kills every view-transition animation. The comment explaining why the brightness filter was removed from the drapes.
12. **Interaction marks already in the school's language:** the gold diamond for the current nav item, and the scheme-aware focus ring (oxblood on cream, gold on lacquer, remapped inside the band and footer).

## 3. Execution work, ordered by leverage

Leverage means visible gain per unit of work, with prerequisites first. Items 1 to 3 are the pattern foundation that items 5, 11 and 12 build on.

### 1. Draw a real toile de Jouy

- **Where:** `parts/Defs.astro` (replace `#gm-porcelaine`), `parts/Toile.astro`; used first on the Services No. 2 swatch (`pages/Services.astro`), then as a wall in item 2. Both schemes, all viewports.
- **Change:** a single-ink, figurative repeat in engraved line and hatching: scattered pastoral islands with bare ground between them, after Huet's "The Activities of the Farm" [6]. Studio-native vignettes: a birch grove with a bench, a writing desk under a tree, a small figure reading a letter, a garden urn. Large repeat (at least 400px), half-drop, motifs crossing tile edges so no seam reads. One ink per scheme: `--porcelain-ink` or `--oxblood` on `--field` in light, gold line on hunter in dark. No fills beyond the ink; tone comes from hatching density. Update `meta.ts` `assets.note` to name it.
- **Why:** authenticity P1, craft (swatch scale), dossier G1, T4, C5, priority 1 [6][7]. `meta.ts` promises toile and today there is none. It also unlocks the M2 roller-print wipe later.
- **Verify:** `t-grandmillennial-services__light__desktop.png` and `__dark__desktop.png`: the No. 2 swatch shows recognisable little scenes in one ink, no leaf scatter. Zoom to 100%: line, not blobs.

### 2. Pattern at room scale: one papered wall per page

- **Where:** Services (behind the two offerings), Contact (behind the desk card and envelope), About (the founder-letter band, currently faint ticking), Home (optional: the intro and "What we build" zone already has the card toppers; see below). Both schemes, desktop, tablet, mobile.
- **Change:** each page gets at least one full-bleed patterned wall, edged top and bottom by a ticking or stripe band, so two or three patterns meet in one viewport (wall, border stripe, framed swatch or card topper). All text sits on `--field-raised` cards, never on pattern. Suggested assignment so the house is mixed, not matched (T8 [15]): **Services** toile wall behind the offerings with a ticking border; **Contact** chintz wallpaper behind the desk, so the letter lies on a papered wall; **About** a stronger stripe or the chintz behind the founder letter (or the chinoiserie scene, founder decision A). Wall inks run quieter than swatch inks (see founder decision F for how loud). The 200px `#gm-chintz` tile will show its grid across a 1440px wall: give walls their own larger repeat (at least 400px, half-drop) or verify at full width that no row reads.
- **Why:** authenticity P2, craft P7 and P8, dossier G2, T1, priority 2 [1][13]. The white-and-beige trap [13] is the single biggest gap between B+ and A+. Spot-check confirms: Services has roughly 1,000px of bare cream between hero and steps band; Contact is cream (or plain hunter) around a frame and an envelope.
- **Verify:** every `tier2-desktop` and `tier2-mobile` page capture, both schemes: at least one viewport-height stretch per page where two or more patterns meet; no text sits directly on pattern; contrast check passes; no visible tile seam or grid at 1440px.

### 3. Fix the No. 1 swatch's visible grid

- **Where:** `parts/Defs.astro` `#gm-chintz-swatch` (100x100 tile, line 93), Services No. 1 swatch, both schemes, all viewports.
- **Change:** stop halving the 200px tile. Either clip the full-size `#gm-chintz` (or a larger dedicated swatch repeat, 300 to 400px, half-drop) inside the swatch so it shows a fragment of a bigger design, as a real cutting does, or offset the crop so no row or column aligns. Consider also enlarging the swatches (item 13).
- **Why:** authenticity P3, craft P7. Spot-check confirms rows of identical rose clusters in a rigid grid. It breaks `meta.forbids: 'visible grids'` and the dossier's own "Visible tiling" trap (section 4). The dossier called the half-scale swatch "a good craft call"; the capture shows otherwise, so the evidence wins.
- **Verify:** `t-grandmillennial-services__light__desktop.png` and `__dark__`, `tier2-mobile` services: No. 1 reads as a cut of fabric, no repeating rows visible.

### 4. Arrival and in-school motion: fix the dead start, the wordmark ghost and the muddy swap

- **Where:** `theme.css` lines 323 to 352 (the "Arrival: the drapes part" block). The critics' line numbers (543 to 568) were stale; the block is at 323.
- **Change, three parts, all inside the existing no-preference guard:**
  - (a) **Dead start.** Start `gm-drapes` at `clip-path: inset(0 47% 0 47%)` and change the new-root curve from `cubic-bezier(0.62, 0, 0.22, 1)` to a decelerating one such as `cubic-bezier(0.33, 0, 0.15, 1)`. Keep 640ms. The drapes then visibly part from frame one and slow as they gather.
  - (b) **Wordmark double exposure.** Stagger the pair: `::view-transition-old(wordmark)` fades 1 to 0 over the first 40% of 560ms, `::view-transition-new(wordmark)` holds at 0 until 30% then fades in. Leave the group's position and size tween as it is. Scope to the arriving-from-another-school selector.
  - (c) **In-school swap.** Replace the symmetric 260ms crossfade with a staggered one at about 300ms, ease-out: old root 1 to 0 over 0 to 45%, new root 0 to 1 over 40 to 100%. Check the header and awning do not visibly blink at the midpoint; if they do, fall back to fading the new root in over an old root held at full opacity for the first 60%. Do not add a second view-transition name for the header (contract).
- **Why:** motion P1, P2, P3; craft P9; dossier M6 [10]. Spot-check confirms: the dark desktop arrive strip is unchanged from "before" through +400ms, then half open at +480; the page strip at +160 and +240ms ghosts Home's plates and cartouche through "The shining tree".
- **Verify:** re-film `grandmillennial__arrive__*` (all four): visible parting by +160ms in dark desktop, no frame with both "BIRCH DESIGN LAB" caps and the italic "Birch" legible together. Re-film `grandmillennial__page__*`: no frame at +160 or +240 where both pages' headlines are legible. Reduced motion stays instant.

### 5. One saturated anchor surface per page in light

- **Where:** Services "How a project runs" band, About founder letter or hero, Contact (covered by the item 2 wall), light scheme; check dark equivalents stay anchored.
- **Change:** one room per page in a single strong colour. Home already has the porcelain Lab band. **Services:** the process band becomes a buttery lacquer yellow with hunter text if founder decision B says yes, otherwise hunter with cream text. **About:** the founder letter sits on a hunter or oxblood room in light too (card stays `--field-raised` or the text goes to a contrast-checked pair). Add a `meta.contrast` entry for every new text-on-surface pair.
- **Why:** authenticity P5, dossier G5, T6, priority 4 [11][13]. Spot-check confirms About, Services and Contact light are cream end to end apart from small objects.
- **Verify:** `t-grandmillennial-about__light__desktop.png`, `-services__light__desktop.png`, `-contact__light__desktop.png`: each shows one saturated surface; contrast test passes.

### 6. Make the dark room lacquered (static)

- **Where:** `theme.css` line 168 (`[data-scheme='dark'] body`, currently a 5% radial), plus framed cards and the Lab band in dark.
- **Change:** a static lacquer treatment on a fixed pseudo-element: a deeper edge vignette, a soft diagonal specular band (for example a 115deg linear-gradient peaking near `rgb(255 240 200 / 0.06)` over a narrow band), and a faint highlight edge (top-left inner light) on framed cards and the Lab band. No motion, no filter per frame. Hunter hue unchanged.
- **Why:** authenticity P4, motion P10 (static half), dossier G3, T6, priority 3 [11]. Moving sheen is deferred (section 5, founder decision G).
- **Verify:** `t-grandmillennial__dark__desktop.png`, `-about__dark`, `-services__dark`: the field reads as a glossy surface with a visible highlight, not a flat colour; text contrast unchanged; `fx` strips still identical (nothing moves).

### 7. Age the prints

- **Where:** `theme.css` `--c-*` pattern inks (light lines 75 to 80, dark 141 to 146), `parts/Defs.astro` chintz and new toile, `Plate.astro`, `Jar.astro`.
- **Change:** drop chroma of the `--c-*` inks only, by about 15 to 25%. Bake a static cotton or paper grain into the pattern ground (one `feTurbulence` inside the pattern, or a tiny noise PNG; never a per-frame filter over the page). Add a slight registration offset between colour fills and outline, and a thin brown outline on chintz motifs after Morris's Little Chintz [4]. Vary the recurring rose slightly (two or three variants) so it is not stamped identically everywhere. Text tokens untouched.
- **Why:** authenticity P6, dossier G4, T2, T9, priority 5 [1][4] ("faded D. Porthault").
- **Verify:** Home hero mat and Services swatches at 100% in `tier2-desktop`: softer, grained, outlined; contrast test unaffected; no scroll jank (grain is static).

### 8. Set the body type to a stationery measure and fix two-axis blocks

- **Where:** `theme.css` `--measure` (line 87, 36em); Home intro (`Home.astro` around line 228); About `.story`; Services `.offer-text p`; Services `.steps p` (`Services.astro` line 159, `hyphens: auto`); About founder frame heading; About stacked layout 760 to 1100px; Services hero lede.
- **Change:**
  - `--measure` to about 30em (65 to 72 characters of Cormorant). Home intro capped at 28em, raised to about 1.45rem, in `--mark` not muted, so it reads as a lede.
  - Services steps: remove `hyphens: auto`, add `text-wrap: pretty`, and pick one axis (centre the text under the centred medallion and heading, or left-align all three). Align paragraph tops across the four columns.
  - About founder frame: resolve the centred heading over left-set text (left-align the heading with a short gold rule to match "The shining tree", or centre it with a centred ornament). Raise the ticking from 0.09 to about 0.16 with a narrow pinstripe if the ticking stays (item 2 may replace it).
  - About stacked layout: centre the H1 and rule under the oval and cap the story at about 32em, centred block, drop cap kept.
  - Services hero: first lede sentence in Playfair italic at about 1.6rem in `--mark`, second in Cormorant; tighten the gap to the first offering by about 30%.
- **Why:** craft P1, P2, P11, P12, P13. Spot-check confirms ques-tionnaire, be-ginning, of-fer, busi-ness in the steps band and roughly 85 characters a line in the Home intro.
- **Verify:** `tier2-desktop` Home, About, Services; `tier2-tablet` About: no body line over about 75 characters, no hyphenation in the steps, one alignment axis per block.

### 9. Home hero at tablet and phone

- **Where:** `pages/Home.astro` hero (oval billboard "DESIGN LAB" around line 186, tagline plaque, frame width, `.plates` media query at 332 to 345).
- **Change:**
  - "DESIGN LAB" in the oval: tie size and tracking to the oval (container query units, or tracking from about 0.3em to 0.2em under 900px) and keep at least 12% clearance to the inner gold rule at every width.
  - Tagline plaque: let it grow wider than the frame (a nameplate may) or clamp the size so "A design lab, not an agency." holds one line; if it must break, break after "lab," so it reads as a couplet, never "not / an agency."
  - Tablet: scale the frame up to about 44vw so it does not float in a field of trellis.
- **Why:** craft P3, P4, P5. Spot-check confirms "DESIGN LAB" touching the inner rule on tablet and the dangling "not" on tablet and phone.
- **Verify:** `t-grandmillennial__light__tablet.png`, `__light__mobile.png` and dark equivalents.

### 10. A collected porcelain wall that survives phones, and a real Kangxi jar

- **Where:** `pages/Home.astro` `.plates` (hidden under 1100px) and the Lab band jars (last hidden under 1100px, all under 480px); `parts/Plate.astro`, `parts/Jar.astro`.
- **Change:** rehang the hero plates as an irregular collected group of three to five pieces of mixed sizes and patterns, off-axis (this is Home's one deliberate asymmetry, G8). Redraw at least one jar as the Kangxi ginger jar: prunus branches reserved in white on a cracked-ice cobalt ground [9]. Give plates finer brushwork with ink-wash tonal variation instead of one flat cobalt. Responsive: at 760 to 1100px a smaller grouping close to the frame; on phones a row of two or three small mixed plates under the tagline plaque, or one plate overlapping the frame's lower corner. Keep one jar in the Lab band on phones, set beside the heading rather than as a mirrored pair.
- **Why:** authenticity P7 and P12, craft P3 and P10, dossier G7, G8, G9, T5, T8, priority 6 [9][15].
- **Verify:** `tier2-desktop` Home (irregular hang, no mirrored pairs), `tier2-tablet` and `tier2-mobile` Home (porcelain present), both schemes.

### 11. Mix the frames: a chintz border with a blue band

- **Where:** `parts/Framed.astro`, `parts/Corner.astro`; Contact desk card, About founder letter, closers.
- **Change:** build a chintz floral-meander border strip that ends in a thin porcelain-blue band [2]. Per page, keep the gilt corner scrolls on one element only; give another the chintz border; give a third a ribbon-tape or pinked edge. Suggested: Contact desk card gets the chintz border, the Home closer keeps gilt, About founder letter gets the chintz border if it is not on the chinoiserie wall. Also add the blue band as a thin line inside the gold rule under the footer valance (craft P14).
- **Why:** authenticity P9, craft P14, dossier G6, T3, T8, priority 7 [2][15]. Every frame is currently the same gilt set, the opposite of the Mix.
- **Verify:** `tier2-desktop` Contact, About, Home: at least two frame types visible across the site, each page not repeating one frame type.

### 12. Contact composition

- **Where:** `pages/Contact.astro` grid, envelope (`--flap`, `theme.css` line 71), both schemes.
- **Change:** top-align the envelope with the form frame, or tuck it at a slight angle overlapping the frame's right edge like a letter laid on the desk (Contact's one off-axis move, G8). In light, darken `--flap` by about 6% L so the fold reads (it currently equals `--paper`; the dark flap already reads). Set the pair on the item 2 papered wall.
- **Why:** craft P8, authenticity P2 and P12.
- **Verify:** `t-grandmillennial-contact__light__desktop.png` (flap visible, no 140px dead bands above and below the envelope), `__dark__`, and mobile.

### 13. Services offerings layout

- **Where:** `pages/Services.astro` offering rows.
- **Change:** enlarge swatches to about 34% of the row and let them overlap the item 2 wall, with the text on a `--field-raised` card; align the heading's cap height to the swatch's top edge. Services' off-axis move: the two swatches slightly rotated and overlapping their cards, like cuttings laid on a table.
- **Why:** craft P7, authenticity P12, dossier G2, G8.
- **Verify:** `t-grandmillennial-services__light__desktop.png`: no dead cream band, shared top line.

### 14. Home Lab band entries as catalogue cards

- **Where:** `pages/Home.astro` band, around lines 305 to 315, desktop and tablet.
- **Change:** set BDL-008 and BDL-007 as two side-by-side catalogue cards or hung labels at desktop, the BDL number in Playfair italic over a gold rule. Keep the `data-parity-skip` wrapper. Jars per item 10.
- **Why:** craft P10.
- **Verify:** `t-grandmillennial__light__desktop.png` band: two distinct entries, not a paragraph with captions; phone stacks cleanly.

### 15. Tactile interaction states

- **Where:** `theme.css` `.gm-btn` (lines 238 to 259; critics cited stale numbers), `.gm-more .curl`; `Header.astro` `.wordmark` (line 62) and `.swash` (lines 90 to 92).
- **Change:**
  - `.gm-btn:active`: the cushion sinks, `translateY(1px)` with a shallower shadow, 60ms.
  - `.gm-more:hover .curl, :focus-visible .curl`: `translate: 0.18em 0` over 220ms, no rotation or bounce.
  - `.wordmark:focus-visible`: an oval ring (`border-radius: 50% / 45%`, small padding, `outline-offset: 4px`); on hover and focus the swash path and bead take `--accent` over 180ms. Confirm the padding does not shift the desktop masthead geometry.
  - Move every transform transition (button lift and press, curl nudge) inside `@media (prefers-reduced-motion: no-preference)`; colour and opacity changes may stay outside.
- **Why:** motion P4, P5, P6, P7; dossier T7 [16] and section 6 (reduced motion must cover every addition).
- **Verify:** code read plus a manual browser pass (hover, press, keyboard focus on the wordmark); no capture covers states.

### 16. About: sampler border and birch redraw

- **Where:** About closer sampler; `parts/Birch.astro`.
- **Change:** give the sampler a stitched strawberry-vine or Greek-key border around the card (the alphabet band is founder decision D). Redraw the birch as a hand-coloured botanical study: tapering trunk, papery bark marks and lenticels, drooping catkins, serrated leaves at varied angles, a faint ground line. If founder decision A puts a chinoiserie birch scene on About, draw the botanical to match its hand. About's off-axis move: hang the oval slightly off-centre beside a small second frame, or let it overlap the scene.
- **Why:** authenticity P10 and P15, dossier T9 [1]. The craft critic listed the birch under "protect"; my spot-check sides with authenticity: the zigzag trunk with three symmetric leaf pairs is clip-art weight next to the chintz. Protect the oval, its mat and its placement; redraw the drawing inside it.
- **Verify:** `t-grandmillennial-about__light__desktop.png` and `__dark__`.

### 17. Small caps for kickers, nav, footer name and form labels

- **Where:** `theme.css` `.gm-kicker` (line 209), Header nav, Footer `.name`, Contact labels.
- **Change:** Cormorant SC (installed) at weight 600, tracking about 0.14 to 0.16em, sized so the x-height matches today's caps. Import it in the route per the README. Show the founder a before and after.
- **Why:** craft P15, authenticity P14, dossier section 5 and priority 10 (inference, cheap).
- **Verify:** `tier2-desktop` Contact (NAME / EMAIL labels), any kicker; `tier2-mobile` nav: heavier, engraved colour, not spidery.

### 18. Footer tightening

- **Where:** `Footer.astro`, `[data-portal-tail]`, all pages.
- **Change:** trim the empty skirt below the copyright line (keep the 76px portal tail painted), add the thin porcelain-blue band from item 11 under the valance. Leave the cartouche as is.
- **Why:** craft P14.
- **Verify:** any `tier2-desktop` capture: no large dead band at the bottom.

## 4. Founder decisions

Bring these to the founder before or during Tier 3. Items that depend on them are marked above.

- **A. A chinoiserie scenic wall (G10, T10 [18][19]).** Options: (1) About: a hand-painted, non-repeating birch-and-bird chinoiserie wall behind the oval, which gives the studio's birch a native home in the school; (2) a Home frieze; (3) none. **Recommend (1).** It is the signature an interiors editor would look for after toile, and About is the page about the birch.
- **B. Add a buttery lacquer yellow (Brook Street [11]).** Options: (1) a yellow surface token used once, on the Services process band, hunter text, with a contrast entry; (2) keep the palette closed and use hunter or oxblood for light anchors. **Recommend (1),** on Services only. Yellow is on record [4][11] and is the one move that makes the anchor feel Colefax rather than more of the same.
- **C. Trim the bows (G11).** Options: keep all four; or keep Home and Sent, give Services a tassel or pleated rosette, hang About's oval on a picture wire or plain ribbon. **Recommend the trim.** Four identical bows are a matched set and tip toward cute [1].
- **D. Sampler alphabet band.** Is a decorative cross-stitch alphabet or numeral band "copy"? **Recommend yes to adding it,** drawn as an `aria-hidden` SVG stitch grid (no text nodes) so word parity is untouched. The border in item 16 does not need this decision.
- **E. Duplicate wordmark on Home phones.** The header "Birch / DESIGN LAB" and the hero cartouche "Birch / DESIGN LAB" sit about 500px apart on a phone (confirmed). Options: (1) on Home under 760px, a compact one-line header wordmark; (2) replace the oval billboard with a monogram on phones; (3) accept it. **Recommend (1).** Option 2 risks word parity, since the billboard is `chrome.name`, and the header wordmark must stay as the transition anchor.
- **F. How loud the walls go (item 2).** Options: full-ink walls; walls at reduced ink (about 60%) with swatches at full strength; toile walls at full ink (single ink is calm) and chintz walls reduced. **Recommend the last one,** and show the Contact wall first as a test before rolling out to every page. The founder has said the school sells; this is the riskiest change to its current balance.
- **G. Should the dark room move?** Tier 3 builds a static lacquer sheen (item 6). A scroll-driven travelling highlight (M5) is a transitions-phase option. **Recommend static only for now;** decide on motion in the transitions phase.
- **H. Contract questions for the transitions phase** (decide before that phase starts, not in Tier 3): (1) chintz-faced drapes need fixed overlay panels, a second named view-transition group, or an experiment styling `::view-transition-image-pair(root)` with a chintz background (unverified; test first); (2) the wordmark-to-monogram morph (M3) needs a second `transition:name`; (3) a school choreographing its own exit needs a shared departure hook. **Recommend** trying the overlay-panel route for (1), which needs no contract change, and taking (2) and (3) to the portal owners as one contract amendment.
- **I. The swash pen-in on arrival (motion P9).** Now or in the transitions phase. **Recommend the transitions phase,** so Tier 3 stays on pattern and layout.

## 5. For the transitions phase (later, not Tier 3)

Motion ideas worth keeping, grounded in the dossier. All mellow, no overshoot except where noted, all covered by reduced motion.

1. **Chintz-faced drapes (M1, [2]).** Two panels faced with `#gm-chintz`, a gathered top, a porcelain-blue band and gilt piping at the leading edge, drawn aside left and right. Interim option if the mechanism waits: soften the clip's leading edges with a mask-image gradient (a narrow pleated shadow) so the reveal edge reads as cloth. Mechanism per founder decision H.
2. **Toile roller-print wipe (M2, [6][7]).** A single-ink toile band printed across the viewport left to right like a roller pass, then lifted, as the entrance from flat schools (Swiss, Bauhaus). Needs item 1's toile first.
3. **Drapes close on exit.** Needs the departure hook (decision H3).
4. **Wordmark to monogram (M3).** The calling card becomes the footer cartouche seal. Needs a second name (decision H2).
5. **The swash is penned in (T9, M3).** On arrival from another school only, `stroke-dashoffset` 1 to 0 with `pathLength=1` over about 500ms after the wordmark lands (delay about 450ms), then the bead fades in. Static under reduced motion.
6. **The portrait sways once (M6).** On Home arrival the portrait on its ribbon swings one cycle and settles, under 600ms: the only permitted overshoot, because it hangs.
7. **Lacquer sheen (M5, [11]).** If the founder wants the room to move: CSS scroll-driven (`animation-timeline: scroll()`), transform-only, on a fixed pseudo-element, no `fx.ts`, no pointer JS.
8. **Scenic frieze drift (M4, [18][19]).** Once the chinoiserie scene exists (decision A), let it drift slowly sideways with scroll.
9. **The seal presses (M7).** Sent arrives by a full POST and reload (`data-astro-reload`, fixed by contract), so no view transition runs. Build it as a one-shot load animation on `.sent` seal: scale 1.06 to 0.97 to 1 over about 420ms with a small wax-shadow spread.
10. **The nav diamond slides.** On in-school swaps, the current-page gold diamond travels to its new item like a hanging bead rather than jumping.
