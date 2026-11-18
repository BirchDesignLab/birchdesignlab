# README charts: Opus xhigh design critique (11-17-26)

Founder feedback after the first full build (binding): charts 2 and 7, tone down the birch "bark line things"; chart 4, "the fonts, styles, and cards don't really look right"; and a design critique of the whole README with 1 to 3 ideas per chart. Critique by an Opus xhigh read-only agent; scratch evidence in gitignored `scripts/readme/.out/critic2/` (real school homes at 1440 both schemes, `schools-facts.json`, github renders, zooms).

## A. Chart 4: why it looks wrong

**Root cause.** `portal.mjs` forces seven schools into one card template: a tracked caps label, a two-line wordmark capped at 34px, a 40x4 rounded accent bar, the copy line, four palette dots, rx 12 corners, and one face per school (`subsetPinned` in `portal.json`) for label, wordmark and copy alike. Each school's real lockup is two or three faces with their own case, tracking and colour per line, and its own composition. So the chart reads as a theme picker with the font swapped, not seven schools.

**Panel by panel** (chart still vs the live home):
- **Quiet.** Live: Marcellus UPPERCASE, tracked .12em, centred, green (#2b4a37 light, #6f9678 dark), bark across the whole hero. Chart: mixed-case ink, left-aligned, bark only in a foot band.
- **Swiss.** Live: Archivo 700 at -0.045em, stacked three lines ("Birch / Design / Lab"), copy (Archivo 600) set apart on the right. Chart: two lines, no tracking, drawn column hairlines (dossier: "grid felt… never drawn"); rounded card and bar break meta.ts `forbids: rounded corners`.
- **Bauhaus.** Live: lowercase "birch design lab", League Spartan 800 at -0.02em, "lab" stepped right; shapes on a black shelf. Chart: Title Case plus a letterspaced "BAUHAUS" label (dossier §3: "One case, and it is lower"); three small icons.
- **Glassmorphism.** "Design Lab" carries the vibrant gradient (`--vibrant-a` to `--vibrant-b`) at Inter 740 / opsz 32 (chart pins 600 / 28). Live orbs are crisp, shaded cobalt (`--blob-violet`), orange (`--blob-cyan`), coral (`--blob-peach`) behind a white window with traffic-light dots; the chart has pale blurred `-hi` blobs.
- **Vaporwave.** Live: "BIRCH" in Dela Gothic One with chrome gradient and cyan/pink offsets, then "DESIGN LAB" in Libre Caslon Display caps at .62em, katakana kicker above. Chart: whole mark in mixed-case Caslon; sun-on-grid is dossier trap 1 (the home keeps one sunset).
- **Grandmillennial.** Live: centred; "Birch" Playfair italic 600, "DESIGN LAB" Playfair 400 caps at .38em, two-tone green and oxblood (gold in dark), gilt swash, oval cartouche, striped scallop awning on top. Chart: both lines same italic, left, one colour, pink lace scallop at the foot.
- **Cottagecore.** Live: "Birch" Fraunces roman 600 (SOFT 100, WONK 1) with a rose scribble underline, "Design Lab" Fraunces italic 380 in green, copy in Caveat. Chart: Fraunces italic pinned by `subset_font.py` at opsz 9 (a text cut) and SOFT 0, the wrong cut (the hard "b"); the dashed stitch border is not on the home.

**Card system and builder bugs.**
- Copy is set in each school's display face at 14.5px (grotesques shouting, Caslon Display hairlines at text size); secondary faces never used (Caveat, Cormorant, Jost, Dela Gothic, Exo 2).
- Scale contrast (the main signal for Swiss, Bauhaus, Quiet) flattened by the 34px cap.
- Palette dots read as SaaS UI; they draw `--field-raised`, which nearly matches the field, so a dot vanishes.
- Phone: Bauhaus's accent bar collides with the shapes (`4-portal-schools.phone.light.360.png`).
- The 8th "copy" cell reads as a blank tan box in stills.
- The path captions uppercase a path ("SRC/THEMES/SCHOOL/").
- **Caption glyph fallback (bug).** `shell.mjs` never adds "FIG. N …" to the glyph set: chart 4's caption renders "4", "I", ":" in Georgia; chart 7's "M", "J", ",". Append the caption to `glyphs.display` in portal.mjs and timeline.mjs; make the subset step fail when its cmap lacks any char.

**Redesign spec.**
1. Replace `face` in portal.json with per-span `faces`: wm1, wm2, kicker, copy, each with its own src, axis pins, case, tracking, colour token and alignment (from `critic2/schools-facts.json`). Pin axes to what the site computes: Fraunces SOFT 100, WONK 1, opsz = rendered px; Inter 740 / opsz 32; Playfair italic 600 plus roman 400. Dela Gothic needs its Japanese subset merged in.
2. Each panel becomes a crop of that school's real home hero: own alignment (centred: Quiet, Vaporwave, Grandmillennial; flush-left: Swiss, Bauhaus, Glass, Cottagecore), wordmark sized to fit, uncapped; Swiss and Bauhaus three lines at about 44 to 52px.
3. Corners follow each school's `forbids`: rx 0 for Quiet, Swiss, Bauhaus, Vaporwave; 20 for Glass; a gilt double rule for Grandmillennial; Cottagecore a slightly rotated paper sheet (-1deg) with washi tape.
4. One true motif each, from the live home: bark everywhere (Quiet); one red block, no drawn grid (Swiss); shapes on a black shelf (Bauhaus); crisp orbs plus window dots (Glass); kicker plus chrome (Vaporwave); cartouche plus awning (Grandmillennial); gingham scallop top plus pressed daisy (Cottagecore).
5. Drop the accent bar, the dots and the in-panel name labels. Label each panel outside it in house style (Marcellus caps .16em plus a Spectral italic era line from meta.ts), like a wall label.
6. Fold the copy cell into one top line in house style ("One sentence, seven schools: …"); the traveller animation drops from it. Cut the path captions to one compact two-column list, paths never uppercased.
7. Motion: each school arrives once in its own manner, about 2.5s total.

## B. Bark on charts 2 and 7

Now: chart 2 has 96 trunk dashes (40% heavy, 2.2/3.8px at .78); chart 7 has 116 (40% heavy) on top of 22 event marks. Junctions sit about 60px apart, so the "near junction" density (`birch.mjs` `lenticels`) covers nearly the whole trunk: a barcode, plus a 1.8px wobbly ink outline.

- Count: one pair per 70 to 90 units (about 15 pairs on chart 2, about 12 ambient pairs on chart 7).
- Weight and opacity: thin 1.4px at .28, heavy 2.6px at .55; heavy at most 15%, only in 2 or 3 tight "scar" bands (3 pairs, 10 to 14 units apart). On chart 7 heavy marks are reserved for events.
- Shape: long dash 45 to 85% of trunk width, partner 20 to 40%, offset.
- Rhythm: gaps of 50 to 120 units; no extra density near junctions; leave plus or minus 14 units clear around each junction or event so the chevron eye reads alone.
- Outline: fill only, a 1px edge at .25 opacity, wobble plus or minus 0.6.
- Branch scars: one dark chevron-shaped scar under each of the 2 or 3 biggest junctions (src/ and docs/; Portal Day).
- Left bark edge on every frame: remove it (doubles the trunk on 2 and 7, means nothing on 1, 3, 5, 6, crowds chart 6's cluster title, 48 to 68 paths per chart).

## C. The README as a page

**Blocker.** Stale Stage 5 status: main merged Stage 5 (PR #117, bc9bf82) but README still says unmerged (about lines 274 to 275, 332, 476, 480) and the timeline lacks "2026-11-17 Stage 5 merged (PR 117)". The hero loop shows five schools; grandmillennial and cottagecore are missing.

**Important.**
- First screen: heading then a six-sentence spec paragraph, then a loop captured in dark throughout (a black slab in light theme), no caption; on a phone the paragraph fills the first screen. Lead with two short sentences, then the hero with a one-line caption; fold "This README is a map…" into the opening; drop the "Repository:" line.
- Repository map: the chart, a 17-row path table and an 11-row docs table overlap. Trim the path table to its "Start with" pointers.
- Mermaid sources: the seven `details` blocks expand into GitHub-rendered yellow and navy diagrams (the classDefs), an off-brand second copy. Strip the classDefs or move all seven to a "Chart sources" appendix.
- Text size: smallest chart text 11.1 to 11.6px at 830 (charts 1011 to 1081 units wide). Aim for 12.5px or more.
- Uppercased fragments: chart 1 "HONEYPOT THEN", "VALIDATE WITH SRC/LIB/CONTACT/VALIDATE.TS".
- Colour roles with no key: store/cloud/you as tan, sage, white. Add a three-swatch key, or give colours a meaning per chart.
- Phone tables: the 5-column Lab table and 3-column tables scroll sideways at 390px.
- Motion timing: on github.com (Chromium) each SVG's animation starts at first paint, so readers do see it (chart 7 still mid-grow 250ms after scroll-in). Keep each sequence at 2.5s or less.

**Minor.** 12-item Contents duplicates GitHub's outline button; `---` before each H2 doubles GitHub's H2 rule; chart 6's cluster title floats outside its box; chart 5 draws "npm run verify" as a decision diamond; chart 1's tick badges are unexplained; "stored as `type: study`" sits beside "experiment (genre study)".

**Taste.** Voice mixes "we" with "the studio" (6 times): pick "we". "Three things to know" plus three bold lead-ins, and "is more than a form handler", read templated. "Opus-grade review" is jargon. No em dashes. The warm brown-black dark card sits a little pasted-on against #0d1117. Nothing in the house type appears until chart 1.

## D. Ideas (curious, not committing)

1. **Served:** a bot dot peels off at the honeypot to its cheerful success page while a real lead runs the full net; two lanes, "edge" and "/api/*", make `run_worker_first` the point; a small plate of the numbers (5/min, 40/day, 30 days, cron 14:17 UTC).
2. **Repo map:** root at the bottom growing upward, limbs weighted by file count; small green seals on the sensitive-code branches; a cross-section variant (rings for depth, wedges for folders).
3. **Lab:** a specimen drawer of 12 accession plates filled by status (live solid, forthcoming outlined, retired struck through; BDL-004 an empty labelled slot); one real wall label drawn from frontmatter.
4. **Portal:** a wordmark-morph strip (the one paired element in seven states); a salon hang of seven hero crops at different sizes with museum labels; each panel's `forbids` struck through beneath it as a tease for BDL-011.
5. **Build/deploy:** a rail line with "staging" a dotted ghost station; `npm run deploy` a dashed bypass track ("ships the working tree"); a revert arrow from live back to the branch.
6. **Harness:** swimlanes by model with 1x/2x/4x cost ticks; maxRounds as two visible loops before "parked".
7. **Timeline:** a horizontal trunk (fits 830 better than 1056px of height); lenticel length set by PRs merged per week; month ring bands for scale.
8. **README:** a light/dark wordmark banner in the chart system at line 1; a "See the site / Read the Lab / Run it" trio after the hero for the two audiences; gather contributor sections under one "Working in the repo" heading so the page reads as a portfolio first.
