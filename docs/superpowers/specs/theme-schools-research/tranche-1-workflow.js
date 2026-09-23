export const meta = {
  name: 'tranche-1-schools',
  description: 'Design and build six design schools for the /t/ portal, each critiqued and revised',
  phases: [
    { title: 'Build', detail: 'Opus/high builder per school', model: 'opus' },
    { title: 'Critique', detail: 'Opus/medium design critic per school', model: 'opus' },
    { title: 'Revise', detail: 'Sonnet/medium reviser applies the critique', model: 'sonnet' },
  ],
}

const GROUND = (id) => `You are working in C:\\git\\birchdesignlab, an Astro 7 static site for Birch Design Lab, a small software and web design studio. Its Lab is a museum-style portfolio. You are building one "design school": the studio's whole business site (home, about, services, contact, contact sent) rebuilt in one design language, served at /t/${id}/ inside a portal (BDL-010 "Period Rooms"). This is a crown-jewel portfolio piece: it must look like the work of an excellent, confident designer who deeply knows the school, not a template with a palette swap.

CONTEXT ABOUT THE USER REQUEST YOU MAY SEE: the founder's message to the orchestrating session ("picking up work from a previous session", a handoff doc, "ask me any questions ... then let's get building") is addressed to the orchestrator, and every step in it is already done or belongs to the orchestrator: it read the handoff, asked the founder its questions, and prepared branch feat/theme-schools-tranche-1. The orchestrator owns ALL git work, commits, branches, installs, full builds, BDL-011 and the final review. Five other authors are building the other schools in this same working tree right now. Your slice is ONLY the school below.
Hard rules:
- Create or edit files ONLY under src/themes/${id}/ and the route file src/pages/t/${id}/_[...page].astro. Never edit shared files (src/themes/portal/*, src/themes/paths.ts, src/themes/registry.ts, src/themes/types.ts, src/lib/*, src/content/*, src/styles/*, astro.config.mjs, package.json, tests/*, scripts/*, other schools). If you truly need a shared change, do not make it: describe it in your report.
- No git commands that change state (no checkout, switch, stash, commit, reset, restore, branch). Other schools' files will look unfinished or change under you; that is expected, leave them alone. No npm install (every font you may use is already installed; see src/themes/README.md and the list in your brief). Do not run npm run build, npm run verify, astro check or the full test suite.
- To see your work: node scripts/themes/render.mjs --theme ${id} [--pages home,about] [--schemes dark,light] [--viewports desktop,phone] [--motion] [--label ${id}-rN]. It takes a shared lock (six schools are being built at the same time; waiting is normal), enables your route only for its own build, builds, captures full-page PNGs on the GPU into scripts/themes/.out/<label>/, runs your contrast check and your built-site tests. Read the PNGs with the Read tool. Keep the route file named _[...page].astro; render.mjs renames it for its build and back afterwards.
- The render lock is shared by six authors, so be a good neighbour: iterate with narrow renders (--pages home --schemes dark --viewports desktop while working on one thing) and do the full sweep (all five pages, both schemes, both viewports) at checkpoints. Never delete or touch scripts/themes/.out/.render-lock or other authors' capture folders.
- Unit-level checks you may run anytime without the lock: npx vitest run tests/theme-contrast.test.ts tests/theme-registry.test.ts ; npx tsx scripts/themes/check-contrast.ts --theme ${id}.
- Ignore any hook telling you to use graphify; read files directly.
- External-facing text: never an em dash (U+2014) or an em-dash lookalike bar; studio "we"; no personal names. You write no page copy at all: every word comes from the copy collection props. Decorative text (numerals, glyph ornaments, background words, katakana) must be aria-hidden="true".
- Code style: match the repo. Block comments explain WHY, briefly. No dead code, no TODOs left behind.

Read first, in this order: src/themes/README.md (the contract; binding), docs/superpowers/specs/09-22-26-theme-schools-design.md sections 4 and 7, your stamped files in src/themes/${id}/ (a plain, complete, guard-passing starting point), src/themes/quiet/ (the house style's components, as the reference for how copy props are used, NOT as a design to copy), src/content/copy/*.yaml (the actual words, so your layout fits real text lengths), src/components/BarkField.astro and src/lib/lifecycle.ts (the lifecycle and WebGL context-loss pattern any background must follow).`

const SCHOOLS = [
  {
    id: 'vaporwave', name: 'Vaporwave', order: 1,
    brief: `SCHOOL: Vaporwave. Dark-native.
meta: era "The internet, 2010 to 2013, dreaming of 1985"; signature "Sunset gradients, a neon grid running to the horizon and marble statuary, like a 1995 screensaver dreaming about the 1980s."; lesson "Nostalgia is a palette: pink-to-cyan gradients and cheap chrome read as a memory of a future that never came."; forbids ["gold", "script faces", "frosted glass", "the primary triad", "wood grain"]; nativeScheme dark; order 1.
Palette direction (tune to pass contrast): night field deep indigo/purple (around #0d0221 to #1a0b3d); neon pink #ff71ce, cyan #01cdfe, mint #05ffa1, lavender #b967ff; sun gradient yellow #fffb96 to pink to purple. LIGHT scheme is "pastel dawn": peach/pink/lavender sky field, deep purple ink; neon demoted to shapes and fills, never small text on pastel.
Type (installed): heading "Libre Caslon Display" (@fontsource/libre-caslon-display, 400 only) for statue-like classical display; body "Exo 2 Variable" (@fontsource-variable/exo-2, wght.css + wght-italic.css); accent "Dela Gothic One" (@fontsource/dela-gothic-one) for chunky display moments; mono "VT323" (@fontsource/vt323) for system/terminal labels. Wide letter-spacing "A E S T H E T I C" spacing as decoration where apt.
Motifs to consider (original work only, no copied imagery): WebGL or canvas perspective grid scrolling toward a striped setting sun on the home hero (this school is the one that genuinely wants a GPU background); CRT scanlines overlay (CSS); chromatic-aberration text shadows on the billboard; content sections as retro OS windows (title bars with window buttons, bevelled edges); a marble texture made procedurally (SVG feTurbulence) on a column or on the wordmark instead of photographic statuary; palm silhouettes as original SVG; aria-hidden katakana ornaments (they will render in the system CJK font). Arrival view transition: a CRT power-on or VHS tracking glitch keyed on html[data-theme='vaporwave'].
Background rules: follow README "Motion and backgrounds" exactly (onMount guarded by data-theme, one WebGL canvas max, DPR cap 1.5, pause when hidden or off-screen, context loss handled, released in teardown, reduced motion draws one still frame, page reads fine if the canvas is blank).`,
  },
  {
    id: 'grandmillennial', name: 'Grandmillennial', order: 2,
    brief: `SCHOOL: Grandmillennial. Light-native, ornament-heavy.
meta: era "Parlour revival, 2019, after 1900s to 1960s interiors"; signature "Chintz, scalloped edges and gilt frames: your grandmother's parlour, made fresh."; lesson "More is more when it is edited: pattern on pattern, held together by one disciplined palette."; forbids ["neon", "frosted glass", "the primary triad", "visible grids", "sans-serif display type"]; nativeScheme light; order 2; assets { provenance: 'original-vector', note: <say what you drew> }.
Palette: ivory/cream field, hunter green, oxblood or cranberry, blue-and-white porcelain blue, gold used for rules and ornament only (gold text fails on cream). DARK scheme is a lacquered room: deep hunter green or oxblood lacquer field, cream text, gold that passes contrast (a light gold) for kickers and rules.
Type (installed): heading "Playfair Display Variable" (@fontsource-variable/playfair-display, wght.css + wght-italic.css); body "Cormorant Garamond Variable" (@fontsource-variable/cormorant-garamond, wght + italic; set body large, around 1.25rem, weight 500, it is a delicate face); accent "Pinyon Script" (@fontsource/pinyon-script) for a monogram and flourishes (aria-hidden if not copy).
Motifs (all original vector work you draw in SVG or CSS): striped awning with a scalloped lower edge; chinoiserie lattice or trellis pattern; a simple original chintz floral as an SVG pattern; gilt frames (double rule plus corner ornaments) around a framed "portrait" hero; a monogram cartouche; piped and pleated edges; bows. Keep ornament to CSS/SVG under src/themes/grandmillennial/ (inline or assets/). Arrival view transition: drapes parting or a soft scalloped reveal.`,
  },
  {
    id: 'glassmorphism', name: 'Glassmorphism', order: 3,
    brief: `SCHOOL: Glassmorphism. Light-native, the legibility-coupled school.
meta: era "Big Sur and Windows 11, 2020 to 2021"; signature "Frosted glass panels floating over soft, blurred blobs of colour: a 2021 app store screenshot."; lesson "Depth without shadows: translucency and blur make the layers, and legibility becomes the whole design problem."; forbids ["serif type", "ornament", "hard black rules", "paper grain", "pattern fills"]; nativeScheme light; order 3.
Palette: LIGHT pale lilac/sky field with saturated blurred colour blobs (violet, cyan, peach, pink); white translucent panels (backdrop-filter blur around 24px, saturate), 1px light borders, soft large shadows; deep ink. DARK: deep navy field, luminous blobs (magenta, electric blue, teal), smoked translucent panels, near-white ink.
Type (installed): heading "Plus Jakarta Sans Variable" (@fontsource-variable/plus-jakarta-sans), body "Inter Variable" (@fontsource-variable/inter, wght.css), accent "Space Grotesk Variable" (@fontsource-variable/space-grotesk) for numerals and labels.
Legibility is the design problem: text sits on translucent panels over moving colour. Declare meta.contrast pairs for panel text composited over the WORST-case blob colour under a panel, in both schemes (e.g. { fg: '--mark', bg: ['--glass', '--blob-brightest'], min: 4.5 }), and make them pass. Provide a @supports not (backdrop-filter) fallback with opaque-enough panels.
Motifs: slowly drifting blurred blobs (CSS animated gradients or a canvas 2D field, NOT WebGL unless you need it), floating glass cards with generous radii, pill buttons, a floating glass nav bar, segmented controls, a glass form. Arrival view transition: blur-in (filter blur to 0 with a slight scale).`,
  },
  {
    id: 'cottagecore', name: 'Cottagecore', order: 4,
    brief: `SCHOOL: Cottagecore. Light-native.
meta: era "Cottagecore, 2018 to 2020, after rural crafts and old recipe books"; signature "Pressed flowers, gingham and handwriting: a cottage kitchen table in June."; lesson "Warmth is texture and imperfection: hand-drawn marks and soft naturals make a page feel made, not manufactured."; forbids ["neon", "chrome", "the primary triad", "frosted glass", "geometric sans display type"]; nativeScheme light; order 4; assets { provenance: 'original-vector', note: <say what you drew> }.
Palette: LIGHT warm linen/cream field, sage green, dusty rose, butter yellow, ink brown. DARK is LAMPLIGHT, not inverted gingham: deep ink-brown or forest ground, cream ink, a warm amber glow (radial light as if from a lamp), gingham reduced to a faint embroidered texture; a few drifting fireflies or dust motes (canvas 2D, few particles, respect lifecycle rules) are welcome in dark.
Type (installed): heading "Fraunces Variable" (@fontsource-variable/fraunces: soft.css / wonk.css / full.css expose the SOFT and WONK axes; use them); body "Lora Variable" (@fontsource-variable/lora); accent "Caveat Variable" (@fontsource-variable/caveat) for handwritten kickers and notes.
Motifs (original vector work): gingham via CSS repeating gradients; pressed-flower SVGs (daisies, lavender sprigs, ferns) drawn by you; embroidered dashed borders; torn-paper edges (SVG mask); recipe-card panels; washi-tape strips; a hand-drawn underline. Arrival view transition: a soft page-turn or petal drift.`,
  },
  {
    id: 'bauhaus', name: 'Bauhaus', order: 5,
    brief: `SCHOOL: Bauhaus. Light-native. The contrast-hard school.
meta: era "Weimar and Dessau, 1919 to 1933"; signature "Circles, squares and triangles in red, yellow and blue on off-white: a Dessau poster you can walk through."; lesson "Form follows function, and function can still be joyful: primary shapes and primary colours on a strict grid."; forbids ["pastels", "pattern fills", "squiggles", "brown", "texture", "serif type", "gradients"]; nativeScheme light; order 5.
Palette: LIGHT off-white paper, black ink, red, yellow, blue. DOCTRINE: the primaries are poster blocks and shapes, NEVER small text or links on the paper (blue on black is 2.44:1, yellow on white 1.07:1). Text is black on paper, or white/black on a primary block where that pair passes (declare every such pair in meta.contrast). DARK: near-black field, off-white ink, primaries still poster blocks, blue lifted toward ultramarine for shapes.
Type (installed): heading "League Spartan Variable" (@fontsource-variable/league-spartan), body "Jost Variable" (@fontsource-variable/jost, Futura-like), accent "Unbounded Variable" (@fontsource-variable/unbounded) for big numerals.
Motifs: asymmetric poster compositions of circle, square and triangle (SVG, original), thick black rules, text set flush left and vertical rotated labels, numbered modules on a strict grid, shapes that assemble on load (CSS animation, reduced-motion safe). Must be clearly distinct from Swiss (which is monochrome plus one red, no shapes) and from Memphis (pastel, squiggles). Arrival view transition: a primary shape wipe (clip-path circle or square expanding).`,
  },
  {
    id: 'swiss', name: 'Swiss', order: 6,
    brief: `SCHOOL: Swiss (International Typographic Style). Light-native. Restraint as the flex.
meta: era "Zurich and Basel, 1950s to 1960s"; signature "Huge flush-left sans-serif type on a strict grid with one red: a 1960s Zurich poster."; lesson "Objectivity: a grid, one type family and asymmetry organise information so clearly that it becomes beautiful."; forbids ["ornament", "gradients", "rounded corners", "more than one accent colour", "serif type", "shadows", "icons"]; nativeScheme light; order 6.
Palette: LIGHT white or warm white paper, black ink, ONE red (choose a red that passes 4.5:1 as text if you set text in it, e.g. around #d0021b; otherwise red only for large type and blocks, declared in meta.contrast). DARK: a straight negative print, black field, white ink, the red lifted to pass on black.
Type (installed): "Archivo Variable" (@fontsource-variable/archivo; wdth.css exposes a width axis for condensed display) for display, "Public Sans Variable" (@fontsource-variable/public-sans) for text, "IBM Plex Mono" (@fontsource/ibm-plex-mono) sparingly for numerals and metadata. One sans voice overall.
Motifs: a visible modular grid (hairlines), enormous flush-left headlines, extreme scale contrast, section numerals (aria-hidden), asymmetric columns, ragged-right text, rotated vertical text, pure typographic composition, no images or icons. Arrival view transition: a crisp column wipe or a hard cut under 250ms.`,
  },
]

const BUILD = (s) => `${GROUND(s.id)}

${s.brief}

YOUR TASK (builder):
1. Fill src/themes/${s.id}/meta.ts completely (fonts with at most two preload woff2 URLs imported with ?url from the package's files/ latin subset; contrast extras for every surface you put text on beyond the required pairs). Import the fonts' CSS in the route file.
2. Design and implement theme.css (both schemes, complete no-JS native scheme, all rules scoped under [data-theme='${s.id}'], arrival view transition), Header, Footer and the five pages, plus fx.ts/assets if the school needs them. Restructure the stamped components freely; keep every copy field and link (the guard compares words and links with quiet).
3. Iterate: render at least four times (label ${s.id}-r1, -r2, ...). Each round, Read the PNGs for all five pages at desktop AND phone in BOTH schemes, write yourself a short critique against the signature sentence and the forbids list, fix, re-render. If you add a background animation, also render --pages home --motion --viewports desktop --schemes dark,light and look at it. Stop only when render.mjs reports all checks passed AND a designer who loves this school would be impressed.
4. Final report (plain text, concise): final render label; what you built (layout grammar, motifs, fx); the contrast table summary; anything still weak; any shared-file change you need (none expected).`

const CRITIQUE_SCHEMA = {
  type: 'object',
  properties: {
    grade: { type: 'string', enum: ['A', 'B', 'C', 'D'] },
    summary: { type: 'string' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'integer', description: '1 = most important' },
          area: { type: 'string', enum: ['signature', 'craft', 'mobile', 'scheme', 'legibility', 'contract', 'fx', 'a11y', 'copy-rules', 'performance'] },
          where: { type: 'string', description: 'page/scheme/viewport or file:line' },
          problem: { type: 'string' },
          fix: { type: 'string', description: 'concrete, specific change' },
        },
        required: ['priority', 'area', 'where', 'problem', 'fix'],
      },
    },
    captureLabel: { type: 'string', description: 'render label you reviewed' },
  },
  required: ['grade', 'summary', 'issues', 'captureLabel'],
}

const CRITIQUE = (s, report) => `${GROUND(s.id)}

${s.brief}

YOUR TASK (design critic, READ-ONLY: do not edit any file): another designer just built this school. Their report:
---
${report}
---
Get fresh evidence: run node scripts/themes/render.mjs --theme ${s.id} --label ${s.id}-critique (and, if the school has a background animation, --pages home --motion --viewports desktop --label ${s.id}-critique-motion). Read EVERY PNG: five pages, desktop and phone, both schemes. Then read the code in src/themes/${s.id}/.
Judge it the way a demanding design director would judge a case-study piece, then the way a senior engineer would review it:
- signature: would a non-designer name this school in five seconds? Is anything off-school or does it use a forbidden motif?
- craft: type scale and rhythm, spacing, alignment, hierarchy, how real copy lengths sit, awkward wraps, empty or cramped areas, the header and footer, the contact form, the sent page.
- mobile (390px): no horizontal scroll, tap targets, stacking order, legibility.
- scheme: is the other scheme DESIGNED (per the doctrine in the brief) or merely inverted? No-JS native scheme complete?
- legibility and contrast beyond the token check (text over imagery, over animation, over gradients).
- contract (README): parity-safe decoration (aria-hidden), links via hrefFor with data-astro-reload for Lab/Privacy, exactly one transition:name, contact form contract, no em dash.
- fx: lifecycle per README (onMount guarded by data-theme, teardown releases GPU, DPR cap, pause hidden/off-screen, context loss, reduced motion still frame), and cost.
- a11y: headings (one h1), focus visibility, form labels, reduced motion.
Return up to 15 issues, most important first, each with a concrete fix. Grade A only if you would ship it as a portfolio flagship unchanged.`

const REVISE = (s, report, critique) => `${GROUND(s.id)}

${s.brief}

YOUR TASK (reviser): you are finishing this school. The builder's report:
---
${report}
---
A design critic reviewed it (grade ${critique.grade}): ${critique.summary}
Issues, most important first:
${critique.issues.map((i) => `${i.priority}. [${i.area}] ${i.where}: ${i.problem}\n   FIX: ${i.fix}`).join('\n')}

Fix every issue you agree with (all of them unless one is wrong; if you reject one, say why). Then render (labels ${s.id}-f1, -f2, ...), Read all the PNGs again (five pages, desktop and phone, both schemes; the motion capture if there is a background), and keep polishing until render.mjs reports all checks passed and the page is flagship quality. Final report (concise): final render label, what changed, rejected critique points with reasons, anything still weak, any shared-file change needed.`

const results = await pipeline(
  SCHOOLS,
  (s) => agent(BUILD(s), { label: `build:${s.id}`, phase: 'Build', model: 'opus', effort: 'high' }),
  (report, s) =>
    agent(CRITIQUE(s, report), { label: `critique:${s.id}`, phase: 'Critique', schema: CRITIQUE_SCHEMA, model: 'opus', effort: 'medium' })
      .then((critique) => ({ report, critique })),
  (prev, s) =>
    agent(REVISE(s, prev.report, prev.critique), { label: `revise:${s.id}`, phase: 'Revise', model: 'sonnet', effort: 'medium' })
      .then((final) => ({ id: s.id, grade: prev.critique.grade, critiqueSummary: prev.critique.summary, issues: prev.critique.issues.length, final })),
)
return results