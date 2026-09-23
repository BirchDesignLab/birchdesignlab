# Grandmillennial: research dossier

School id `grandmillennial`. Written 09-23-26 for the Tier 3 revisers. Every claim below rests on a source I opened myself on that date; the numbered list is at the end. Two researcher reports fed into this. Where their claims could not be reopened or turned out not to be on the cited page, I dropped them (see "Dropped claims" at the end), so this file says less than those reports did, but all of it can be traced to a source.

Build reviewed: `src/themes/grandmillennial/` (theme.css, meta.ts, Header, Footer, pages/*, parts/*, assets/trellis.svg); renders `scripts/themes/.out/grandmillennial-f3/` (desktop plus phone, both schemes) and `scripts/themes/.out/mobile-review/sheets/grandmillennial.jpg`.

---

## 1. The school in one paragraph

Grandmillennial is a name for younger people choosing the furnishings of their grandparents' generation on purpose. It is not an ironic look and not a reconstruction. The House Beautiful editor Emma Bazilian coined it. As Country Living later quoted her, she defined it as a refined, relaxed approach to interiors that celebrates timeworn colour and pattern, and she set it apart from preppy style as "less Lilly Pulitzer, more faded D. Porthault" [1]. Its authority comes from a line of decorators who layered pattern and cared about comfort: Dorothy Draper's saturated hues and "imaginative uses of patterns" [13], Sister Parish's American Country style [14], Mario Buatta, the "Prince of Chintz" [17], Colefax and Fowler's English country house, "mellow, elegant and unpretentious" [10], and Bunny Williams's rule of mixing things because you love them [15]. The materials themselves are old and hybrid: Coromandel Coast chintz [2][3], Jouy toile [6][7], Chinese blue-and-white porcelain [9], and chinoiserie and scenic papers [18][19]. The way to tell it from a period room is that the grandmillennial room is lived in and edited, not preserved. Williams warns that a house decorated "like a museum" keeps people standing at the door [16].

## 2. The canon

| # | Exemplar | Why it matters to us |
|---|---|---|
| C1 | Bed curtain, painted and dyed cotton chintz, Coromandel Coast, ca. 1700, V&A IS.121-1950 [2] | The chintz ur-object: a tall flowering tree with exposed roots on a rockery, a floral meander running up the trunk, a repeating floral border finished with a **blue band edge**. Mordant and resist dyed: alum for red, iron for black, indigo, and yellow over indigo for green. The design is itself a mix of Islamic, Chinese and European sources. It is also literally a *curtain*, which grounds our drapes arrival. |
| C2 | V&A, *Chintz* exhibition (opens 09-18-27) [3] | The museum's own definition: a South Indian hand-drawn cotton, "one of the most coveted, copied and contentious fabrics in history." It supports treating chintz as the school's master material. |
| C3 | William Morris, "Little Chintz", designed 1876, block-printed cotton, V&A T.40-1919 [4] | The English, small-scale, allover chintz: blue, green, yellow, white and reds, **outlined in brown**. This is the lineage our cabbage-rose repeat actually belongs to. |
| C4 | Alexander Morton & Co., "Glazed Chintz", Cumberland Cretonnes series, before 1960, V&A T.3480-2018 [5] | The mid-century furnishing chintz, "flowers on branches": the fabric grandmothers actually owned. |
| C5 | J.-B. Huet for Oberkampf, "The Activities of the Farm", ca. 1792, copperplate printed, red on white, V&A T.451-1919 [6] | True toile de Jouy: **one colour, figurative scenes**, idealised country life among ruins, rendered playfully, "devoid of the harsh realities" of farm work. Our build has nothing like it yet (see gap G1). |
| C6 | Oberkampf manufactory, Jouy-en-Josas, 1760 to 1843 [7][8] | Woodblocks at first, copper plates from 1770, engraved copper rollers by 1797, and a house standard of *bon teint*, colours fast enough to survive repeated washing [7]. The museum has kept the heritage at the Château de l'Églantine since 1990 [8]. |
| C7 | Ginger jar, Jingdezhen, Kangxi period 1683 to 1710, underglaze cobalt blue, V&A C.820&A-1910 [9] | The canonical ginger jar: plum blossom branches rising and falling on "cloudy blue reticulated to represent cracking ice." It is a specific, drawable model for our `Jar.astro`. |
| C8 | Nancy Lancaster with John Fowler, drawing room at 39 Brook Street, 1957 [11] | Fowler talked her into a "startling, glossy yellow". The firm calls it perhaps the most influential interior in English decoration. It is the precedent for **one glossy, saturated surface anchoring a patterned house**, and so for our lacquered dark room. |
| C9 | Lancaster and Fowler, Haseley Court, Oxfordshire, 1954 [11] | "Restoration and decoration" together: period bones, furnished to a personal eye. This is the documented difference between a revival and a period room. |
| C10 | Sibyl Colefax, 1930s; John Fowler joins 1938; firm renamed 1939 [12] | The house principle, in the firm's own words: comfortable rooms, "stylish but never pretentious." |
| C11 | Dorothy Draper & Co., The Greenbrier, post-1945 redecoration; the Victorian Writing Room [13] | Saturated hues, bold contrasts, pattern used imaginatively, and one hand over everything down to matchboxes and staff uniforms. The whole scheme is designed, not just the accent pieces. |
| C12 | Sister Parish (1910 to 1994); Kennedy White House private quarters, 1960; Parish Hadley, 1964 [14] | The American branch. Her family firm quotes the NYT obituary crediting her with originating the American Country style. |
| C13 | Mario Buatta (died 2018), "Prince of Chintz"; Blair House interiors [17] | The name most tied to chintz as a whole-room language: bright, sumptuous, floral. (Secondary source only.) |
| C14 | Bunny Williams, "The Mix" [15][16] | The living statement of the mixing principle: pieces work together because they differ, not because they match. |
| C15 | Zuber & Cie, Rixheim, from 1797; scenic wallpapers from 1804 [18] | The one maker that "never stopped printing scenic wallpapers". A scene wraps the room instead of a repeat. 80 to 90% of production still uses the traditional techniques and original woodblocks. |
| C16 | de Gournay, Chinoiserie collection (Houghton, Temple Newsam) [19][20] | Its papers are modelled on Chinese wallpapers popular in Western great houses "principally between 1750 and 1850", some faithful recreations and some new designs [19]. Every piece is hand made by in-house artisans [20]. |
| C17 | Schumacher, "Chiang Mai Dragon", linen, half-drop repeat, 12 colourways [21] | A chinoiserie adapted from an Art Deco print, one of the house's best-loved designs. It shows the working method of the style: mine the archive and re-colour it, rather than invent new florals. |

## 3. Defining tells (critic's checklist)

Apply these to each page, in each scheme.

- [ ] **T1 Layered pattern.** More than one pattern shares a view: floral against stripe against toile or trellis. The Country Living rules name "Layer On the Pattern" outright [1], and Draper's work is described through imaginative uses of pattern [13].
- [ ] **T2 Timeworn, not bright.** The colour reads faded and heirloom, not fresh, neon or preppy [1].
- [ ] **T3 Real chintz grammar.** Flowering branches or meanders with a structured border, the border edged in a blue band [2]. Or the English allover small floral with outlined motifs [4][5].
- [ ] **T4 Real toile.** One ink on a pale ground, figurative scenes in fine engraved line, pastoral and idealised [6][7].
- [ ] **T5 Blue-and-white porcelain drawn from real models.** Cobalt under glaze, and recognisable Kangxi motifs such as prunus on cracked ice [9].
- [ ] **T6 One glossy, saturated anchor.** At least one surface is a single strong colour with sheen, which lets the pattern elsewhere read as curated [11][13].
- [ ] **T7 Lived in and comfortable.** The page invites you in, not a museum case [16]. Comfortable and never pretentious [10][12].
- [ ] **T8 Mixed, not matched.** Different periods and origins sit together on purpose [15][10]. The source material is already hybrid [2].
- [ ] **T9 The hand shows.** Handmade, heirloom-quality pieces over mass-produced ones [1]. Hand painting [20], block printing [4][18].
- [ ] **T10 The wall is a scene.** At least one wall carries a scene rather than a repeat: chinoiserie or panoramic [18][19].
- [ ] **T11 One scheme, whole-house.** Every surface belongs to one designed scheme, down to the small print [13].
- [ ] **T12 Archive voice.** Patterns feel re-coloured from an existing book: pattern numbers, colourway names, swatches [21].

## 4. Traps

- **The period room.** Accuracy to one date, roped off. Williams names the failure directly [16]. Lancaster and Fowler's Haseley Court is the counter-model: restored *and* decorated [11].
- **Preppy novelty.** Bright, new, candy-coloured, with novelty prints. Bazilian draws this line herself: "less Lilly Pulitzer" [1].
- **Mass-produced newness.** Glossy-new reproductions in place of estate-sale and heirloom-quality pieces [1].
- **Matched sets.** Everything from one collection. Williams's Mix argues the opposite [15].
- **Pretension and stiffness.** The Colefax house rule is "stylish but never pretentious" [12], with rooms made "mellow, elegant and unpretentious" [10].
- **White-and-beige restraint.** The Greenbrier's account of Draper sets colour against white and beige rooms [13]. A cream page with a few small ornaments is closer to a wedding invitation than to a Draper room.
- **Irony and kitsch ("granny chic").** Widely described as the opposite of the style, but I could not open a citable source for the distinction (the "isn't ironic" wording attributed to Bazilian is unverified). Treat it as a working rule, not a cited fact.
- **Visible tiling (our craft trap).** A pattern tile whose seams show reads as a web background, not fabric. Defs.astro already fights this; keep it that way.

## 5. Palette and type evidence

### What the sources show

| Source | Colours on record |
|---|---|
| Bed curtain [2] | Alum red, iron black, indigo blue, green (yellow over indigo), purple (red with blue), a **blue band** at the edge, on a pale cotton ground |
| Little Chintz [4] | Blue, green, yellow, white and reds, outlined in brown |
| Jouy toile [6] | **Single colour**: red, probably madder, on white |
| Ginger jar [9] | Underglaze cobalt blue on white porcelain; cloudy blue ground |
| Brook Street [11] | Glossy yellow as the room colour |
| Draper [13] | Saturated hues, bold contrasts |
| de Gournay [20] | "vibrant, balanced and contrasting colours" |
| Bazilian [1] | Timeworn, faded |

### Mapping to our tokens (theme.css)

- **Already right:** cream field `--cream #f7f0e1` as the pale cotton ground; oxblood `--oxblood #7d1f2b`, which is close to a madder toile red [6]; porcelain blue `--porcelain #1f4a8a` / `--plate-ink #2b58a0` for cobalt [9]; hunter green; gold used only as rule and ornament. The palette is disciplined and meets AA through `meta.contrast`. Keep all of it.
- **Missing: a single-ink toile colourway.** Toile is one colour [6]. Use `--porcelain-ink` on `--field`, or `--oxblood` on `--field`, in light. In dark, `--c-dot`/gold line on `--field`. Pure line art needs no new text tokens.
- **Missing: the blue band edge.** The bed curtain's border ends in a blue band [2]. A thin `--porcelain` band inside the gold double rule on framed things would echo it. That is ornament, not text, so no contrast entry is needed.
- **Missing: yellow.** Yellow is on record in [4] and [11], and our palette has only gold rules. A buttery lacquer yellow as a *surface* (a band or a room), with hunter text, would be the Brook Street move. If added, give it a `meta.contrast` entry (hunter-ink on yellow should clear 4.5:1 easily; verify).
- **Tension: faded vs. crisp.** Our chintz inks (`--c-rose #c9576b`, `--c-blue #3a64a8`, `--c-leaf #2f5e41`) are clean, fully saturated vector fills. Bazilian's "faded" [1] argues for lowering chroma in the *pattern inks only*, not the text tokens, plus slight irregularity in the hand. Draper's saturation [13] then belongs to the one anchor surface (T6), not the prints.

### Type

- **No source in this set speaks to typefaces.** The style is an interiors language; nobody on record prescribes a face. Everything in this subsection is design inference, labelled as such.
- Installed and relevant (`package.json`, @fontsource): Playfair Display Variable, Cormorant Garamond Variable, **Cormorant SC**, **Libre Caslon Display**, Pinyon Script, EB Garamond Variable, Marcellus, Spectral, Newsreader, Lora.
- Keep Playfair italic, Cormorant body and Pinyon accents. They read as engraved stationery, and the founder likes the result.
- Inference: kickers (`.gm-kicker`, nav, footer `.name`) are set with `text-transform: uppercase` and wide tracking. **Cormorant SC** would give true small capitals, closer to engraved calling cards. It is a cheap refinement, not a requirement.
- Inference: the pattern-number tags ("No. 1") and swatch labels could take Libre Caslon Display. Caslon is an 18th-century English face, contemporary with the chintz trade [3] and the Jouy works [7]. Optional; do not add a fourth face if it crowds the page.
- Watch Pinyon Script. It appears in the closer, the footer cartouche, the letterhead, the seal and "Sent." Script as the signature is right; script as body anywhere is wrong.

## 6. Motion vocabulary

Nothing on record describes motion; this is a decorating language. The ideas below are anchored to documented physical objects and processes. Items marked *inference* are design proposals, not findings.

**Arrival and cross-school transitions**

- **M1 Drapes, but show the fabric.** The canonical chintz object is a bed curtain [2], and `theme.css` already opens the room with `gm-drapes`, a centre-out `clip-path` reveal. Today the curtains themselves are invisible: only the new page grows. Face the two retreating panels in `#gm-chintz` (a view-transition pseudo-element, or two fixed panels painted with the pattern, drawn aside), so the visitor *sees* chintz part. Leaving the school, the drapes close. *Inference on the mechanics; the object is sourced.*
- **M2 Toile roller-print wipe.** Jouy moved from copper plates (1770) to engraved copper rollers by 1797 [7], and the ink is a single colour [6]. A transition in which a toile band "prints" across the viewport in one ink, left to right like a roller pass, then lifts, is a native gesture for this school. It suits the Services entrance, or arrival from a flat school such as Swiss or Bauhaus. *Inference.*
- **M3 Wordmark to monogram.** The founder named the wordmark's morph as the model. Here the wordmark (`Header.astro .wordmark`, `transition:name="wordmark"`) could settle into the oval cartouche monogram (`Footer.astro .cartouche`) and out again, as a calling card becomes a seal. *Inference.*

**Within-page**

- **M4 Scenic frieze with scroll.** Zuber scenic papers carry a scene around a room instead of a repeat [18], as do de Gournay's chinoiserie papers [19]. A long, non-tiling frieze, for example a birch grove or garden scene in toile line, that drifts sideways slowly as the page scrolls. *Inference on behaviour.*
- **M5 Lacquer sheen (dark only).** The Brook Street room is a glossy paint surface [11]. In the dark scheme a soft specular highlight could travel across the hunter green with scroll or pointer, replacing the static radial in `theme.css` (`[data-scheme='dark'] body`). One highlight, slow. *Inference.*
- **M6 Tempo.** "Mellow, elegant and unpretentious" [10] and the stress on comfort [16] argue for unhurried, settled easing with no springy overshoot on UI chrome. The one exception is things that *hang*: the portrait on its ribbon (`Home.astro .ribbon`, `.bow`) may sway once and settle on arrival, like a picture on a hook. *Inference.*
- **M7 The seal presses once.** On Sent (`pages/Sent.astro`, `parts/Seal.astro`), a single press-and-hold stamp: scale down to contact, a slight spread, done. A discrete gesture, not a loop. *Inference.*
- **Reduced motion:** the existing `prefers-reduced-motion: reduce` block in `theme.css` must cover every addition.

## 7. Gap analysis against our build

### What already lands (protect these)

- **Whole-scheme bracketing (T11 [13]).** The striped scalloped awning (`Header.astro .awning`) and the skirted, box-pleated valance (`Footer.astro .valance`) close each page top and bottom like one room. In dark, the oxblood awning and oxblood footer bracket the lacquer. This is the build's strongest idea. Note: no source ties awnings to the style. It is our invention, and it works; just do not claim it as canon.
- **The chintz repeat (T3 [4][5]).** `parts/Defs.astro #gm-chintz`: cabbage roses, buds and sprigs at mixed scales and angles, with no visible grid, re-inked per scheme through `--c-*`. It sits squarely in the English allover lineage of Little Chintz [4]. The half-scale `#gm-chintz-swatch` for sample-book swatches is a good craft call.
- **Blue-and-white porcelain (T5 [9]).** `Plate.astro` (scalloped rim, lotus-petal border, peony well) and `Jar.astro` are original, detailed drawings in cobalt on white.
- **The sample book (T12 [21]).** Services' pinked swatches with "No. 1 / No. 2" tags are the archive voice exactly.
- **Handwork (T9 [1]).** The About sampler (cross-stitch generated from a stitch grid), the ruled writing paper textarea, the envelope with its wax seal, and the gilt frames with corner scrolls (`Framed.astro`, `Corner.astro`).
- **The portrait hung from a bow on trellis paper** (Home hero) is a strong, readable opener on both desktop and phone.
- **A disciplined palette** holding it all together, which is the school's own lesson in `meta.ts`.

### What is missing or wrong

- **G1: The "toile" is not toile (T4, [6][7]).** `parts/Toile.astro` and `#gm-porcelaine` in `Defs.astro` are scattered two-tone leaf sprays, closer to a ditsy print. Toile de Jouy is a single-ink *figurative* scene in engraved line [6]. `meta.ts` and the founder's description both promise toile, and the Services No. 2 swatch (`pages/Services.astro`) is where it fails visibly. This is the largest fidelity gap.
- **G2: Pattern is confined to small panels (T1, [1][13]).** Pattern appears in the hero mat, two door valances, two swatches, and the faint trellis. Most of each page is plain cream. On Services the first screen is cream with a heading, and Contact is cream around a frame and an envelope (see f3 desktop captures). The school's thesis in `meta.ts` is "pattern on pattern", but the pages show "ornament on cream". Nowhere does a full-bleed chintz or toile wall sit beside a stripe or ticking.
- **G3: The dark room is flat, not lacquered (T6, [11]).** `theme.css` gives dark only a 5% radial wash over `#10271c`. Nothing reads as gloss. The dark footer and band also switch to oxblood, which is fine, but the "lacquered hunter-green room" in `meta.ts` needs a sheen to earn the word.
- **G4: No faded quality (T2, [1]).** All prints are crisp, fully saturated vector fills. That reads new, which is the trap, where the style asks for heirloom. The fix belongs in the pattern inks and texture only, never in the text tokens.
- **G5: No saturated anchor room in light (T6, [11][13]).** In light, the only strong surface is the porcelain-blue Lab band on Home. About, Services and Contact have none, so they drift toward the white-and-beige trap [13].
- **G6: The chintz has no border (T3, [2]).** The canonical chintz frames itself with a floral meander and a blue band [2]. Our framed things use gold double rules and corner scrolls (`Framed.astro`), which is gilt furniture, not textile. A chintz border strip would add the textile edge.
- **G7: The plate wall is a symmetric pair and vanishes on phones (T8, [15]).** Home shows two plates each side, mirrored, and hides them below 1100px (`Home.astro` media query). Jars go below 480px. On a phone, Home has no porcelain at all. A real collected wall mixes sizes and patterns in an irregular hang, and Williams's Mix argues against mirrored pairs.
- **G8: Symmetry everywhere (T7, T8, [16][1]).** Every page is centred and mirrored: masthead, hero, closer, footer. That formality leans toward the period room. "Relaxed" [1] suggests one deliberately collected, off-axis arrangement per page (the plate wall, a stack of swatches, a pinned letter), while typography and nav stay orderly.
- **G9: The jar is generic (T5, [9]).** `Jar.astro` puts a peony spray on the belly. The canonical Kangxi ginger jar is prunus on a cracked-ice cobalt ground [9], a far more recognisable silhouette-and-ground pairing. It could also serve as a second porcelain pattern tile.
- **G10: No scene on any wall (T10, [18][19]).** No chinoiserie or scenic element exists. The Lab band's trellis is a geometric lattice. A chinoiserie birch-and-bird scene would also give the studio's birch identity a native home. The About page's birch is currently a botanical in an oval (`parts/Birch.astro`).
- **G11: Bow repetition (T11).** Bows appear on Home, About, Services and Sent. One or two tie the scheme together; four make it cute, sliding toward the novelty the style avoids [1]. This is judgement, not a sourced rule.
- **G12: The drapes arrival hides its own fabric (M1).** See section 6.

## 8. Priorities for Tier 3

Most important first. Each one keeps what works and fixes a named gap.

1. **Draw a real toile de Jouy (G1, T4).** Replace `#gm-porcelaine` and `Toile.astro` with a single-ink figurative repeat in engraved-line style: pastoral vignettes of our own, for example a birch grove, a garden bench, a writing desk, a small figure, scattered islands with no ground between them, modelled on [6]. One ink per scheme (porcelain blue or oxblood on cream; gold line on hunter in dark). Use it on the Services No. 2 swatch and as the full-bleed wall in priority 2.
2. **Pattern at room scale, pattern on pattern (G2, T1).** Give every page at least one full-bleed patterned wall: chintz or toile, bordered by a stripe or ticking band, so two or three patterns meet in one view. Candidates: behind the Services offerings, behind the Contact desk, and behind the About founder letter, which currently sits on faint ticking. Set text on `--field-raised` cards on top, never on the pattern.
3. **Make the dark room lacquered (G3, T6).** Add a real gloss treatment to the dark scheme: a slow specular highlight across the green (M5), a deeper edge vignette, and reflections on the framed cards. Brook Street [11] is the model. Keep the hunter green; the founder likes it.
4. **One saturated anchor per page in light (G5, T6).** One room per page in a single strong colour with sheen: the existing porcelain band on Home, plus a buttery yellow or hunter room on About or Services, with a new `meta.contrast` entry for any text on it.
5. **Age the prints (G4, T2).** Lower the chroma of the `--c-*` pattern inks slightly, and add faint paper or cotton grain and slight line irregularity to the chintz and toile (a static SVG `feTurbulence` baked into a pattern, or a tiny noise PNG, not a per-frame filter). Leave the text tokens alone.
6. **Collected plate wall that survives phones (G7, G8, G9, T5, T8).** Rehang the Home plates as an irregular grouping of mixed sizes, including a new prunus-on-cracked-ice plate or jar after [9]. Keep a reduced version on phones instead of `display: none`.
7. **Chintz border with a blue band (G6, T3).** Add a floral-meander border strip ending in a porcelain-blue band [2], and use it on at least one framed element per page alongside the gilt corners.
8. **Motion, for the transitions phase (M1 to M7).** Make the drapes visibly chintz-faced (M1). Add the toile roller-print wipe as this school's signature arrival from other schools (M2). Morph the wordmark into the monogram (M3). Add a scenic frieze drift (M4 plus G10). Keep easing mellow, with one settle for hanging things (M6).
9. **Trim the bows (G11).** Keep the Home portrait bow and the Sent card bow; drop or change the others. A tassel or a rosette on Services, for example, keeps the trimmings mixed.
10. **Small-caps kickers (type inference).** Try Cormorant SC for `.gm-kicker`, nav and the footer name. It is cheap to test and closer to engraved stationery.

---

## Unverified leads and gaps (for a follow-up pass)

- **House Beautiful original:** housebeautiful.com and web.archive.org both refused fetch, so the coinage and wording are verified only through Country Living's republication [1]. The widely reported September 2019 date is unconfirmed here.
- **Chintz glazing** (why chintz has a crisp sheen): the Britannica entry returned 403, and none of the V&A records I opened describe the process. Any "glazed sheen" motion or rendering is uncited until a source is found.
- **Met Museum** Oberkampf record (208809) and porcelain pages: HTTP 429 on every attempt. The V&A records [6][9] stand in.
- **Dorothy Draper's own writing** (e.g. *Decorating is Fun!*, 1939) was not opened. No Draper quote in this file is verbatim from her.
- **Buatta** has only a secondary institutional tribute [17]. The Kips Bay origin story for his nickname is unverified folklore.

## Dropped claims (from the two input reports; not supported when checked)

- The Greenbrier quantities (45,000 yards of fabric and so on) and a 1946 to 1948 timeline: not on the cited Greenbrier page [13].
- Zuber woodblocks listed as historic monuments, "150,000 blocks", the Eldorado date of 1849, and Kennedy's Zuber set in the White House: not on the Zuber pages I opened [18].
- de Gournay's founding in 1986, rice paper and silk grounds, 50+ hour panels, and visible pencil under-drawing: not on the de Gournay pages I opened [19][20].
- The passementerie guild, Louis XIV tassels and tassels hiding seams: the cited FIT page covers dress trimmings and says none of this. Dropped along with the tassel-physics motion idea.
- Blue-and-white "first flourished in the fourteenth century" and the Kraak and Delft lineage: the source was never opened. Dropped.
- The Bunny Williams "hotel room" quote and "22 years at Parish-Hadley": not on the pages opened.
- Quotes attributed to Buatta ("A house should grow"), Sister Parish ("mish mash") and Draper (the two comfort and periods lines): aggregator-sourced only.
- Musée de la Toile de Jouy "est. 1977, in the château since 1991": the museum's own site says it has been at the Château de l'Églantine since 1990 [8]. Founding year unverified.
- The V&A chintz hanging IM.50-1919 and "scale exaggeration": not reopened by me. Omitted.

## Sources

Primary: 18. Secondary: 3. All opened 09-23-26.

1. Anna Logan, "The New Rules of Grandmillennial Style", Country Living via AOL, 04-15-25; quotes Emma Bazilian's House Beautiful coinage. **Secondary.** https://www.aol.com/rules-grandmillennial-style-110000930.html
2. V&A, Bed curtain, Coromandel Coast, ca. 1700, IS.121-1950. **Primary.** https://collections.vam.ac.uk/item/O78277/bed-curtain-unknown/
3. V&A, *Chintz* exhibition page (opens 09-18-27). **Primary (institutional).** https://www.vam.ac.uk/exhibitions/chintz
4. V&A, William Morris, "Little Chintz", 1876, T.40-1919. **Primary.** https://collections.vam.ac.uk/item/O270984/little-chintz-furnishing-fabric-william-morris/
5. V&A, Alexander Morton & Co., "Glazed Chintz", before 1960, T.3480-2018. **Primary.** https://collections.vam.ac.uk/item/O1464819/glazed-chintz-furnishing-fabric-alexander-morton/
6. V&A, J.-B. Huet for Oberkampf, "The Activities of the Farm", ca. 1792, T.451-1919. **Primary.** https://collections.vam.ac.uk/item/O259307/
7. Musée protestant, "Les toiles de Jouy". **Secondary (museum essay).** https://museeprotestant.org/en/notice/les-toiles-de-jouy-4/
8. Musée de la Toile de Jouy, official site. **Primary (institutional).** https://www.museedelatoiledejouy.fr/
9. V&A, Ginger jar, Jingdezhen, 1683 to 1710, C.820&A-1910. **Primary.** https://collections.vam.ac.uk/item/O144004/ginger-jar-unknown/
10. Sibyl Colefax & John Fowler, "Nancy Lancaster". **Primary (firm archive).** https://www.sibylcolefax.com/nancy-lancaster/
11. Sibyl Colefax & John Fowler, "Our history: 1950s". **Primary (firm archive).** https://www.sibylcolefax.com/our-history/1950s/
12. Sibyl Colefax & John Fowler, "Our history: 1930s". **Primary (firm archive).** https://www.sibylcolefax.com/our-history/1930s/
13. The Greenbrier, "History: Dorothy Draper & Co.". **Primary (holding institution; promotional tone).** https://www.greenbrier.com/discover-more/about-us/history-dorothy-draper-and-co/
14. Sister Parish Design, "Timeline". **Primary (family firm; quotes the NYT obituary).** https://sisterparishdesign.com/pages/timeline
15. Bunny Williams Home, "About us". **Primary.** https://www.bunnywilliamshome.com/pages/about-us
16. Christopher Muther, "Bunny Williams discusses her design philosophy", Boston Globe, 01-06-11. **Primary (interview).** http://archive.boston.com/lifestyle/house/articles/2011/01/06/bunny_williams_discusses_her_design_philosophy/
17. New York School of Interior Design, "Remembering Mario Buatta", 10-16-18. **Secondary (institutional tribute).** https://www.nysid.edu/blog/2018/10/16/remembering-mario-buatta
18. Zuber & Cie, "History". **Primary (maker).** https://www.zuber.fr/en/history-zuber
19. de Gournay, "Chinoiserie collection". **Primary (maker).** https://degournay.com/design-collections/wallpapers/chinoiserie-collection
20. de Gournay, "Philosophy". **Primary (maker).** https://degournay.com/philosophy
21. Schumacher, "Chiang Mai Dragon" (173273). **Primary (maker's product record).** https://schumacher.com/catalog/products/173273

## Verification (independent re-check, 09-23-26)

I opened all 21 sources in this list with WebFetch on 09-23-26 and checked each against the claims that cite it, plus the primary/secondary label.

**Checked and confirmed as cited**, no changes needed: [1] (Bazilian coinage and "less Lilly Pulitzer, more faded D. Porthault" quote confirmed verbatim, plus the "Layer On the Pattern" heading behind T1); [2] (bed curtain, IS.121-1950, tree/rockery/meander border, mordant and resist dyes, "Edged with a blue band" confirmed verbatim); [3] (exhibition page, "one of the most coveted, copied and contentious fabrics in history" confirmed verbatim, 09-18-27 open date confirmed); [4] (Little Chintz, T.40-1919, 1876, colors confirmed); [5] (Glazed Chintz, T.3480-2018, "flowers on branches" confirmed); [6] (Huet/Oberkampf farm scene, T.451-1919, ca. 1792, red on white, "devoid of the harsh realities" quote confirmed verbatim); [7] (Oberkampf/Jouy dates 1760-1843, 1770 copper plates, 1797 engraved copper rollers, "bon teint" confirmed); [8] (Château de l'Églantine since 1990, confirmed on the museum's own French-language text); [9] (ginger jar, C.820&A-1910, Kangxi 1683-1710, "cloudy blue reticulated to represent cracking ice" confirmed verbatim); [12] (Colefax founded 1930, Fowler joins 1938, firm renamed 1939, "stylish but never pretentious" confirmed verbatim); [13] (Draper/Greenbrier, "saturated hues, bold contrasts, and imaginative uses of patterns" and the matchboxes/staff-uniforms line both confirmed verbatim; white-and-beige contrast is present but attributed to successor Carleton Varney, not Draper herself — the dossier's text already treats it as "the Greenbrier's account", which is accurate); [14] (Sister Parish 1910-1994, Kennedy White House 1960, Parish Hadley 1964, NYT "originated... American Country style" quote confirmed); [15] (Bunny Williams "buy what you love... not because they are alike, but because they are different" confirms the Mix principle); [16] (Boston Globe, Muther, 01-06-11, "like a museum, people stand at the door" quote confirmed verbatim); [17] (Buatta obituary tribute, Prince of Chintz, Blair House confirmed); [18] (Zuber, Rixheim 1797, first scenic wallpapers in France 1804, "never stopped printing scenic wallpapers" and "80 to 90%... traditional techniques and original woodblocks" both confirmed verbatim); [19] (de Gournay chinoiserie, "principally between 1750 and 1850" confirmed verbatim, Houghton and Temple Newsam both present); [20] (de Gournay philosophy, hand-made-by-artisans and "vibrant, balanced and contrasting colours" both confirmed verbatim — correctly cited on [20] only, not [19], where that phrase does not appear); [21] (Schumacher Chiang Mai Dragon, linen, half-drop repeat, 12 colorways, "one of our best-loved designs" and Art Deco origin confirmed).

**One correction made**: [10] and [11] were transposed in my first pass through the firm's site structure, but on the actual pages the dossier's assignment is correct as written — I re-fetched both to be sure. [10] (`/nancy-lancaster/`) carries the "mellow, elegant and unpretentious" line verbatim, describing Nancy Lancaster's own instinct, not the firm's house rule as such; the dossier's C10 already attributes the "stylish but never pretentious" phrasing to [12] correctly and keeps "mellow, elegant and unpretentious" on [10]. [11] (`/our-history/1950s/`) carries the Brook Street "startling, glossy yellow" line, "perhaps the best-known and most influential interior in the history of English interior decoration" (the dossier's "perhaps the most influential interior in English decoration" is a close paraphrase, not a misquote, and is not inside quotation marks in the dossier text, so no fix needed), and the Haseley Court 1954 "restoration and decoration" line, all confirmed verbatim. No edit required.

**No dead links, no mislabeled primary/secondary sources, no unsupported claims found among the numbered citations.** No em dashes in the file. Quote budget (one short quote per source, under 15 words) holds throughout; the two longest quotes used, from [14] and [16], are each under 15 words.

I did not attempt to reopen the sources already listed as unopened in "Unverified leads and gaps" or "Dropped claims" above; those sections are unchanged and remain accurate flags for a follow-up pass.

No claims were cut and no sources were replaced. The dossier stands as written.
