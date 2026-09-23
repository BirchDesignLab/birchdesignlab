export const meta = {
  name: 'tier2-school-critique',
  description: 'Three-lens critique panel per school against its research dossier, a Tier 3 brief per school, then one critic for the portal as a whole',
  phases: [
    { title: 'Critique', detail: 'per school: authenticity, craft, motion and devices (Opus)', model: 'opus' },
    { title: 'Brief', detail: 'per school: merge the three lenses into a Tier 3 brief (Opus)', model: 'opus' },
    { title: 'Portal', detail: 'one critic judges all six side by side (Opus)', model: 'opus' },
  ],
}

/*
 * Written 09-23-26 for the theme-schools A+ pass (Tier 2). Inputs, all made
 * by the orchestrator before launch:
 *   research dossiers   docs/superpowers/specs/theme-schools-research/dossiers/<id>.md
 *   stills              scripts/themes/.out/tier2-{desktop,mobile,tablet}/ (+ sheets/<id>.jpg)
 *   motion strips       scripts/themes/.out/motion-tier2/<id>__{arrive,page,fx}__<scheme>__<viewport>.png
 * Output: docs/superpowers/specs/theme-schools-research/tier3-briefs/<id>.md
 * and tier3-briefs/portal.md. Nothing is changed in the site.
 */

const R = 'docs/superpowers/specs/theme-schools-research'
const OUT = 'scripts/themes/.out'

const FOUNDER = {
  vaporwave: 'The founder rates it great and a personal favourite: protect what works; raise it without changing its character.',
  grandmillennial: 'The founder says it is "absolutely selling what we can do": protect what works; polish toward A+.',
  glassmorphism: 'The founder finds it the most lackluster of the six. Find out why, concretely, and what an excellent execution would do instead.',
  cottagecore: 'The founder says it is "absolutely selling what we can do": protect what works; polish toward A+.',
  bauhaus: 'The founder rates it great and a personal favourite: protect what works; raise it without changing its character.',
  swiss: 'The founder finds it lackluster, just behind glassmorphism. Find out why, concretely, and what an excellent execution would do instead.',
}
const SCHOOLS = ['vaporwave', 'grandmillennial', 'glassmorphism', 'cottagecore', 'bauhaus', 'swiss']

const GROUND = (id) => `You are a critic on a review panel in C:\\git\\birchdesignlab, an Astro 7 static site for Birch Design Lab, a small software and web design studio. Its Lab has a "Period Rooms" portal (/t/<school>/): the studio's whole business site (home, about, services, contact, contact sent) rebuilt in the language of a design school. Six schools are built at a first-pass B; this panel decides what it takes to reach A+, and a Tier 3 reviser will work from what you write. This is the studio's crown-jewel portfolio piece.

CONTEXT ABOUT THE USER REQUEST YOU MAY SEE: the founder's message to the orchestrating session ("continue on with tier 1 and 2", primary-source research, transitions later, tranche 2) is addressed to the orchestrator. Tier 1 is done and committed, the research dossiers are written, and all fixes, builds, git and Tier 3 belong to the orchestrator. Your slice is ONLY the review below. READ-ONLY on the site: never edit anything under src/, scripts/ or tests/, never run git commands that change state, never run npm, builds, render.mjs, capture.mjs or motion.mjs. Everything you need is already captured.

SCHOOL: ${id}. ${FOUNDER[id]}

EVIDENCE (read what your lens needs; Read renders PNG and JPG):
- Research dossier (cited, primary sources): ${R}/dossiers/${id}.md. Its tells, traps and priorities are your yardstick for authenticity; cite its [n] numbers when you rely on it.
- Stills, every page, both schemes, full page, the portal switcher hidden: ${OUT}/tier2-desktop/, ${OUT}/tier2-mobile/ (390px, 2x, touch) and ${OUT}/tier2-tablet/ (820px, 2x, touch); files are t-${id}[-page]__<scheme>__<viewport>.png. One overview sheet per school per viewport at ${OUT}/tier2-<viewport>/sheets/${id}.jpg (overview only; read the PNGs for detail).
- Motion, as timestamped frame strips (dark and light, desktop and mobile): ${OUT}/motion-tier2/${id}__arrive__* (arriving from the quiet school), ${id}__page__* (home to about inside the school, including the wordmark morph), ${id}__fx__* (three seconds of background motion). An fx strip whose frames are all identical means nothing moved: grandmillennial and swiss have no background motion by design, and cottagecore's fireflies only fly in dark. Every arrive and page strip landed on its intended page (checked when filmed).
- Code: src/themes/${id}/ (theme.css, meta.ts, Header, Footer, pages/, parts/ or assets/, fx.ts if any) and the author contract src/themes/README.md.
Fixed by contract (never propose changing): every word of copy and every link target (they come from src/content/copy), the page set, the contact form's fields and behaviour, the portal head and switcher. Everything visual is open.
Writing rules for anything a visitor would read: no em dashes, studio "we", no personal names.`

const ISSUES = {
  type: 'object',
  properties: {
    grade: { type: 'string', enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C', 'D'] },
    summary: { type: 'string' },
    protect: { type: 'array', items: { type: 'string' }, description: 'what already works and must survive revision' },
    issues: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          priority: { type: 'integer', description: '1 = most important' },
          where: { type: 'string', description: 'page / scheme / viewport, or file:line' },
          problem: { type: 'string' },
          evidence: { type: 'string', description: 'capture file you saw it in, and dossier [n] or canonical work if relevant' },
          fix: { type: 'string', description: 'concrete, specific change' },
          kind: { type: 'string', enum: ['execution', 'founder-decision'], description: 'founder-decision = a stylistic or scope call the founder should make, e.g. changing a motif the founder may love' },
        },
        required: ['priority', 'where', 'problem', 'evidence', 'fix', 'kind'],
      },
    },
  },
  required: ['grade', 'summary', 'protect', 'issues'],
}

const LENSES = [
  {
    key: 'authenticity',
    prompt: `YOUR LENS: authenticity. Would a curator or practitioner of this school recognise it as the real thing, or as a costume? Apply the dossier's defining-tells checklist and its traps to every page, both schemes, desktop and mobile. What from the canon is missing that would make an expert nod? What is off-school, anachronistic, or borrowed from a neighbouring style? Where the dossier's gap analysis and priorities are right, confirm them against the captures; where they are wrong or weak, say so.`,
  },
  {
    key: 'craft',
    prompt: `YOUR LENS: craft. Judge it as a demanding design director would judge a flagship case study: type scale, rhythm and measure, rag and hyphenation, hierarchy, grid and alignment, spacing, how the real copy lengths sit, the header, footer, contact form and sent page, empty or cramped areas, and whether each scheme is designed rather than inverted. Check desktop, tablet and mobile separately: stacking order, tap targets, anything cramped, clipped or scrolling sideways.`,
  },
  {
    key: 'motion',
    prompt: `YOUR LENS: motion, interaction and devices. From the frame strips: is the arrival transition this school's own gesture, does it land cleanly, does it read at a glance on desktop and mobile, is the wordmark morph smooth and meaningful, does the page swap feel of the school, is the background motion worth its cost? From the code: hover, focus-visible and active states, reduced-motion behaviour, the fx lifecycle and cost (README "Motion and backgrounds"). Ground your proposals in the dossier's motion vocabulary. The founder has said a later phase will purposefully build transitions between schools and motion within them (the wordmark morph is the model the founder likes), so separate what should be fixed now from what belongs to that phase, and note motion ideas from the sources worth keeping for it.`,
  },
]

const BRIEF = (id, crits) => `${GROUND(id)}

YOUR TASK (brief author): three critics reviewed this school through different lenses. Their structured reports:
${crits.map((c) => `=== ${c.lens.toUpperCase()} (grade ${c.r?.grade ?? 'n/a'}) ===\n${c.r ? JSON.stringify(c.r, null, 1) : '(this critic returned nothing)'}`).join('\n')}
===
Read the dossier's priorities too, and spot-check the captures behind any claim that looks doubtful or contradicts another critic (resolve conflicts from the evidence, not by vote).
Write the Tier 3 brief at ${R}/tier3-briefs/${id}.md (create the folder if needed; it is the only file you may write). Structure:
1. Verdict: one paragraph, current grade and what A+ looks like for this school.
2. Protect: what must survive revision.
3. Execution work, ordered by leverage: numbered items, each with where (file/component, page, scheme, viewport), the change, why (critic lens and dossier [n]), and how to verify it (which capture or motion strip should show it).
4. Founder decisions: stylistic or scope calls the founder should make before or during Tier 3, each with the options and a recommendation. Do not bury these inside execution work.
5. For the transitions phase (later, not Tier 3): motion ideas worth keeping.
No em dashes. Return a short summary: path, overall grade, the top five execution items, and the founder decisions in one line each.`

const PORTAL = (briefs) => `You are the last critic on a review panel in C:\\git\\birchdesignlab (see the context below). READ-ONLY on the site: never edit src/, scripts/ or tests/, never run git commands that change state, never run npm, builds or capture scripts. The founder's message you may see is addressed to the orchestrator; your slice is only this review.

CONTEXT: the studio's Lab has a "Period Rooms" portal (/t/<school>/) where the whole business site is rebuilt in six design schools plus the house style, "quiet" (/t/quiet/, src/themes/quiet/). A visitor moves between schools with a persistent switcher (src/themes/portal/: PortalLayout.astro, runtime.ts, switcher.ts). Each school has just been critiqued on its own; their Tier 3 briefs are in docs/superpowers/specs/theme-schools-research/tier3-briefs/. Summaries:
${briefs.map((b) => `=== ${b.id} ===\n${b.summary ?? '(no brief)'}`).join('\n')}
Founder's read of the first pass: vaporwave and bauhaus are great (favourites); grandmillennial and cottagecore are "absolutely selling what we can do"; glassmorphism is the most lackluster and swiss right behind. After A+ comes a purposeful transitions phase (between schools and within them; the wordmark morph is the model), then a second tranche of schools.

YOUR TASK: judge the SET. Look at the six overview sheets side by side (scripts/themes/.out/tier2-desktop/sheets/, tier2-mobile/sheets/) and the arrival strips (scripts/themes/.out/motion-tier2/*__arrive__*). Then:
- Distinctness: does each school own its look, or do two blur together (shared layouts, the same hero skeleton, the same card grid)? Name specific repeated patterns.
- Quality parity: which school sets the bar, which lags, and what the laggards should borrow in approach (not in style).
- The portal as an experience: entering from the Lab at quiet, moving between schools, the switcher, arrivals, consistency of shared behaviours (scroll, focus, the tail strip, reduced motion).
- Cross-cutting fixes that belong in shared code rather than six schools, and anything the per-school briefs conflict on.
- A recommended order and grouping for Tier 3, and the founder decisions that gate it.
Write ${'docs/superpowers/specs/theme-schools-research/tier3-briefs/portal.md'} (the only file you may write), no em dashes, and return a 10-line summary.`

const briefs = await pipeline(
  SCHOOLS,
  (id) =>
    parallel(
      LENSES.map((lens) => () =>
        agent(`${GROUND(id)}\n\n${lens.prompt}\n\nReturn up to 15 issues, most important first, plus what to protect. Grade on the full scale; A+ only if you would ship it as the studio's flagship unchanged.`, {
          label: `${lens.key}:${id}`, phase: 'Critique', schema: ISSUES, model: 'opus', effort: 'medium',
        }).then((r) => ({ lens: lens.key, r })),
      ),
    ),
  (crits, id) =>
    agent(BRIEF(id, crits), { label: `brief:${id}`, phase: 'Brief', model: 'opus', effort: 'high' })
      .then((summary) => ({ id, summary, grades: Object.fromEntries(crits.map((c) => [c.lens, c.r?.grade ?? null])) })),
)

phase('Portal')
const portal = await agent(PORTAL(briefs.filter(Boolean)), { label: 'portal', phase: 'Portal', model: 'opus', effort: 'high' })
return { briefs, portal }
