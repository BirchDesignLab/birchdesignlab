export const meta = {
  name: 'tier2-school-research',
  description: 'Primary-source research dossier per design school, cited and URL-verified, to feed the Tier 3 revisions',
  phases: [
    { title: 'Research', detail: 'two Sonnet researchers per school: visual canon, founding texts + motion', model: 'sonnet' },
    { title: 'Synthesize', detail: 'Opus writes the cited dossier with a gap analysis against our build', model: 'opus' },
    { title: 'Verify', detail: 'Sonnet opens every cited URL and cuts what it does not support', model: 'sonnet' },
  ],
}

/*
 * Written 09-23-26 for the theme-schools A+ pass. The founder asked for
 * research "from trusted, reliable primary sources" so the Tier 3 revisers get
 * the best possible information. Output: one dossier per school in
 * docs/superpowers/specs/theme-schools-research/dossiers/<id>.md.
 */

const DOSSIERS = 'docs/superpowers/specs/theme-schools-research/dossiers'

const GROUND = (s) => `You are researching one design school for Birch Design Lab, a small software and web design studio (C:\\git\\birchdesignlab, an Astro static site). Its Lab has a "Period Rooms" portal (/t/<school>/) where the studio's whole business site is rebuilt in the language of a design school or movement. Six schools are built; they are good (a first-pass B) and are about to be revised toward A+. Your research is what the revisers will work from, so accuracy matters more than volume.

CONTEXT ABOUT THE USER REQUEST YOU MAY SEE: the founder's message to the orchestrating session ("continue on with tier 1 and 2", research from primary sources, transitions later, tranche 2) is addressed to the orchestrator. Tier 1 fixes, builds, git, commits, critiques and revisions are all the orchestrator's and are already in hand. Your slice is ONLY the research task below. Never run git commands that change state, never run npm, builds or scripts/themes/render.mjs, and never edit anything under src/, scripts/ or tests/.

SCHOOL: ${s.name} (id ${s.id}). ${s.what}

SOURCE STANDARD (binding):
- Primary sources first: museum and archive catalogue records for original works (object pages with maker, date, medium), original publications and their facsimiles or scans, statements, interviews and writings by the originators, the article or publication that coined a term, official design-system documentation from the company that shipped the style, standards documents, Internet Archive captures of original pages.
- Acceptable as secondary, and labelled as such: peer-reviewed scholarship, university-press books, museum essays and exhibition texts, established design publications with named authors.
- Never cite: Wikipedia (use it only to find primary sources), Pinterest, content farms, SEO listicles, AI-generated pages, uncredited blogs. If only weak sources exist for a claim, say so plainly instead of citing them.
- Every claim carries a working URL you actually opened. Never invent a URL, title, date, accession number or quote. If you could not open a source, say so.
- Quotes: at most one short quote per source, under 15 words, in quotation marks with attribution. Otherwise paraphrase in your own words.
Tools: WebSearch and WebFetch (load them with ToolSearch if they are not already available).

LEADS (starting points to verify, not conclusions; follow the evidence where it goes): ${s.leads}`

const SCHOOLS = [
  {
    id: 'vaporwave', name: 'Vaporwave',
    what: 'Our build is dark-native: a WebGL sunset over a neon perspective grid, marble columns, palms, retro OS windows, a taskbar header, katakana ornament, VT323 and Libre Caslon Display. The founder rates it great.',
    leads: 'Macintosh Plus "Floral Shoppe" (Ramona Xavier / Vektroid, 2011) and its cover art; Chuck Person\'s "Eccojams Vol. 1" (Daniel Lopatin, 2010); James Ferraro "Far Side Virtual" (2011); writing by Adam Harper on vaporwave and the "virtual plaza" (2012); Grafton Tanner "Babbling Corpse" (Zero Books, 2016); Windows 95/98 interface conventions (Microsoft\'s own documentation or the Windows Interface Guidelines); the Helios bust and classical statuary in the cover art. Settle one authenticity question with evidence: how vaporwave differs from outrun / synthwave / retrowave (the neon grid and striped sun), and which of our motifs belong to which. Report it neutrally; the founder loves the current build, so the dossier informs a decision, it does not make one.',
  },
  {
    id: 'grandmillennial', name: 'Grandmillennial',
    what: 'Our build is light-native: a striped scalloped awning, original chintz and toile patterns, gilt frames, blue-and-white porcelain, ginger jars, bows, a wax seal; dark is a lacquered hunter-green room. Playfair Display, Cormorant Garamond, Pinyon Script. The founder says it is "selling what we can do".',
    leads: 'the term as coined by Emma Bazilian in House Beautiful (2019); decorators Mario Buatta ("Prince of Chintz"), Dorothy Draper, Sister Parish, Bunny Williams; Colefax and Fowler; chintz history at the V&A; de Gournay and Zuber chinoiserie wallpaper; Schumacher archives; blue-and-white porcelain collections (V&A, Met); scalloped and skirted upholstery, pleated lampshades, needlepoint. Look for what separates a contemporary grandmillennial room from a period room or plain "granny chic".',
  },
  {
    id: 'glassmorphism', name: 'Glassmorphism',
    what: 'Our build is light-native: frosted translucent panels over drifting coloured orbs, Plus Jakarta Sans, Inter, Space Grotesk; dark is navy with smoked glass. The founder finds it the most lackluster of the six; find out, from the sources, what an excellent execution has that ours lacks.',
    leads: 'Michal Malewicz\'s 2020 articles that named "glassmorphism" (UX Collective / Hype4); Apple macOS Big Sur (2020) and iOS 7 (2013) translucency and vibrancy, Apple Human Interface Guidelines "Materials"; Apple Liquid Glass (WWDC 2025) as the current successor; Microsoft Fluent Design "Acrylic" (2017) and Windows 11 "Mica" official docs, with their layering, noise, tint and luminosity recipes; Windows Vista Aero Glass (2007) as ancestor; W3C Filter Effects Level 2 (backdrop-filter). Capture the recipes precisely: blur radii, tint and saturation, noise, borders and edge highlights, shadows, how the systems keep text legible.',
  },
  {
    id: 'cottagecore', name: 'Cottagecore',
    what: 'Our build is light-native: linen, gingham, original pressed-flower vectors, washi tape, recipe cards, Fraunces (soft/wonk axes), Lora, Caveat; dark is lamplight with fireflies. The founder says it is "selling what we can do".',
    leads: 'origins of the term on Tumblr (about 2017-2018) and its documented spread; scholarship on cottagecore as an aesthetic (journal articles); primary artefacts it draws on: herbaria and pressed-flower albums (Emily Dickinson\'s herbarium at Harvard\'s Houghton Library, Kew, Smithsonian), gingham and printed-cotton textile history (V&A, Met), William Morris and the Arts and Crafts movement (V&A, William Morris Gallery), Beatrix Potter\'s illustrations (V&A, National Trust), handwritten recipe manuscripts in library collections. Look for what makes it feel handmade rather than stock-rustic.',
  },
  {
    id: 'bauhaus', name: 'Bauhaus',
    what: 'Our build is light-native: red, yellow and blue circles, squares and triangles assembled on load, thick black rules, lowercase headings in League Spartan, Jost body, Unbounded numerals; primaries are blocks, never text. The founder rates it great.',
    leads: 'Bauhaus-Archiv / Museum für Gestaltung Berlin, Harvard Art Museums (Busch-Reisinger Bauhaus collection), MoMA "Bauhaus 1919-1933" (2009); Herbert Bayer\'s universal alphabet and lowercase-only typography (1925); Joost Schmidt\'s 1923 exhibition poster; László Moholy-Nagy, "Typophoto" and the Bauhausbücher; Wassily Kandinsky\'s 1923 questionnaire mapping yellow triangle, red square, blue circle; Oskar Schlemmer\'s Triadic Ballet (motion); Jan Tschichold, "Die neue Typographie" (1928, strictly a New Typography text; note the distinction); the Dessau building. Distinguish Bauhaus from later "Bauhaus-style" clichés.',
  },
  {
    id: 'swiss', name: 'Swiss',
    what: 'Our build is light-native: huge flush-left Archivo on a visible modular grid, one red, numbered sections, Public Sans text, IBM Plex Mono metadata, no images or ornament. The founder finds it lackluster, just behind glassmorphism; find out, from the sources, what an excellent execution has that ours lacks.',
    leads: 'Josef Müller-Brockmann\'s posters (Museum für Gestaltung Zürich eMuseum, MoMA), his "Grid Systems in Graphic Design" (1981); the journal Neue Grafik (1958-1965); Armin Hofmann, "Graphic Design Manual" (1965) and the Basel school; Emil Ruder, "Typographie" (1967); Karl Gerstner, "Designing Programmes" (1964); Max Bill; Akzidenz-Grotesk and Neue Haas Grotesk / Helvetica (1957); objective photography and photomontage in Swiss posters; Letterform Archive holdings. Pay attention to what gives the best Swiss work its tension and energy (scale contrast, rhythm, diagonal and asymmetric composition, photography, colour fields), since a merely tidy grid reads as dull.',
  },
]

const CANON = (s) => `${GROUND(s)}

YOUR TASK (researcher, visual canon; READ-ONLY, you write no files): find the canonical works of this school in primary sources. Aim for 8 to 15 exemplars that a curator would pick, each with: title, maker, date, the holding institution or original publication, the URL you opened, and 2 to 4 precise observations of what makes it canonical (composition, grid, scale, type, colour values where the record or a good reproduction shows them, ornament, texture, materials, photography). Then list the defining visual tells that recur across the canon, and the traps: clichés and neighbouring styles often mistaken for this one. Return a structured markdown report. Mark every source primary or secondary.`

const TEXTS = (s) => `${GROUND(s)}

YOUR TASK (researcher, founding texts and motion; READ-ONLY, you write no files): find what the school's originators and primary documents actually said: manifestos, teaching texts, the articles that coined the term, official design-system documentation, interviews with the people who made it. Extract its principles in your own words, each cited. Then research its MOTION VOCABULARY, because a later phase will design transitions between schools and motion within them: how works of this school move or were animated (period film, stage, broadcast, screen savers, UI animation specifications, physical materials and how they behave), with concrete, citable details such as timings, easings, physical metaphors and anything a web animation could honour. Return a structured markdown report. Mark every source primary or secondary.`

const SYNTH = (s, canon, texts) => `${GROUND(s)}

YOUR TASK (dossier author): write the definitive reference for this school at ${DOSSIERS}/${s.id}.md (create the directory if needed; this file is the only thing you may write). Tier 3 revisers will work from it, so make it precise, cited and actionable.

Two researchers reported:
=== VISUAL CANON ===
${canon}
=== FOUNDING TEXTS AND MOTION ===
${texts}
===

Before writing, look at our build: read src/themes/${s.id}/ (theme.css, meta.ts, Header, Footer, pages/, parts/ or assets/ if present) and the renders: scripts/themes/.out/mobile-review/sheets/${s.id}.jpg (mobile, all pages, both schemes) and the desktop captures in the newest scripts/themes/.out/${s.id}-f*/ or ${s.id}-final/ folder (Read the PNGs). Do not run builds.

Dossier structure (markdown, no em dashes anywhere, cite as [n] with a numbered source list at the end giving URL and primary/secondary):
1. The school in one paragraph, as its originators would recognise it.
2. The canon: the exemplars, one line each on why they matter.
3. Defining tells: a checklist a critic can apply to our pages, each item cited.
4. Traps: clichés and neighbouring styles to avoid, cited.
5. Palette and type evidence: what the sources show, and how it maps to what is available to us (fonts installed in package.json under @fontsource; we cannot license new commercial faces).
6. Motion vocabulary: within-page motion and arrival/transition ideas grounded in the sources, for the later transitions phase.
7. Gap analysis against our build: what already lands, what is missing or wrong, each point tied to a file or component and to a tell or source. Be specific and honest; ${s.id === 'glassmorphism' || s.id === 'swiss' ? 'the founder finds this school lackluster, so explain why from the evidence.' : 'the founder likes this school, so protect what works.'}
8. Priorities for Tier 3: the 5 to 10 highest-leverage changes, most important first.
Resolve conflicts between the two reports by going back to the sources yourself. Drop anything you cannot support. Return a 5-line summary: file path, source count (primary/secondary), top three priorities.`

const VERIFY_SCHEMA = {
  type: 'object',
  properties: {
    sourcesChecked: { type: 'integer' },
    sourcesOk: { type: 'integer' },
    sourcesRemovedOrReplaced: { type: 'integer' },
    claimsCut: { type: 'integer' },
    primaryShare: { type: 'string', description: 'e.g. "14 of 19 primary"' },
    notes: { type: 'string' },
  },
  required: ['sourcesChecked', 'sourcesOk', 'sourcesRemovedOrReplaced', 'claimsCut', 'primaryShare', 'notes'],
}

const VERIFY = (s) => `${GROUND(s)}

YOUR TASK (source verifier): the dossier at ${DOSSIERS}/${s.id}.md must survive scrutiny. Open EVERY URL in its source list with WebFetch. For each: does the page exist, is it what the dossier says (institution, maker, date, title), and does it support the specific claims that cite it? Is its primary/secondary label right, and does it meet the source standard? Fix the dossier in place (it is the only file you may edit): correct wrong details, replace a dead or mislabelled source only with one you actually opened, and cut any claim no source supports (renumber citations). Check the no-em-dash rule and the quote rule. Append a short "Verification" section at the end listing what you checked, changed and cut.`

const results = await pipeline(
  SCHOOLS,
  (s) =>
    Promise.all([
      agent(CANON(s), { label: `canon:${s.id}`, phase: 'Research', model: 'sonnet', effort: 'high' }),
      agent(TEXTS(s), { label: `texts:${s.id}`, phase: 'Research', model: 'sonnet', effort: 'high' }),
    ]),
  ([canon, texts], s) =>
    agent(SYNTH(s, canon ?? '(canon researcher returned nothing)', texts ?? '(texts researcher returned nothing)'), {
      label: `dossier:${s.id}`, phase: 'Synthesize', model: 'opus', effort: 'high',
    }),
  (summary, s) =>
    agent(VERIFY(s), { label: `verify:${s.id}`, phase: 'Verify', schema: VERIFY_SCHEMA, model: 'sonnet', effort: 'medium' })
      .then((check) => ({ id: s.id, summary, check })),
)
return results
