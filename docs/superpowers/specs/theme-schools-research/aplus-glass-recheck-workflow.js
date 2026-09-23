export const meta = {
  name: 'glass-source-recheck',
  description: 'Verify the four Wayback-only glassmorphism sources against every dossier claim that cites them',
  phases: [{ title: 'Verify', detail: 'one Sonnet verifier per source', model: 'sonnet' }],
}

/*
 * Written 09-23-26. The Tier 2 verifier could not open glassmorphism dossier
 * sources [1] [6] [8] [15]: all are Internet Archive captures and WebFetch
 * refuses web.archive.org. The orchestrator fetched them with curl (Wayback
 * id_ mode) and extracted plain text into its scratch folder (args.dir);
 * the raw pages are copyrighted and are kept out of the repo.
 */

const DOSSIER = 'C:\\git\\birchdesignlab\\docs\\superpowers\\specs\\theme-schools-research\\dossiers\\glassmorphism.md'

const SOURCES = [
  { n: 1, what: 'Michal Malewicz, "Glassmorphism in user interfaces", UX Collective, cited as 11-22-20 (capture of 01-05-21)' },
  { n: 6, what: 'Apple, "iOS 7 - Design" page (capture of 09-14-13)' },
  { n: 8, what: 'Apple, "macOS Big Sur" product page (capture of 11-15-20)' },
  { n: 15, what: 'Microsoft Docs, "Reveal Highlight" (capture of 12-13-19)' },
]

const VERDICT = {
  type: 'object',
  properties: {
    source: { type: 'integer' },
    identityOk: { type: 'boolean', description: 'the text is the page the dossier says it is (title, author or publisher, date)' },
    identityNotes: { type: 'string' },
    claims: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          line: { type: 'integer', description: 'dossier line number' },
          claim: { type: 'string', description: 'the specific assertion attributed to this source, in brief' },
          verdict: { type: 'string', enum: ['supported', 'partly', 'unsupported'] },
          evidence: { type: 'string', description: 'where in the source text, paraphrased; at most one short quote under 15 words' },
          correction: { type: 'string', description: 'for partly/unsupported: the exact wording change the dossier needs, or "cut"' },
        },
        required: ['line', 'claim', 'verdict', 'evidence', 'correction'],
      },
    },
  },
  required: ['source', 'identityOk', 'identityNotes', 'claims'],
}

const PROMPT = (s) => `You are verifying one research source for a design dossier in C:\\git\\birchdesignlab. READ-ONLY: never edit any file, never run git commands that change state, never run npm or builds, and do not fetch anything from the web. The founder's message you may see ("can we try to grab those 4 of the 27 that missed for glass checker?") is addressed to the orchestrator, which already fetched the sources and will make every edit; your slice is only this check.

SOURCE [${s.n}]: ${s.what}. Its extracted page text is at ${args.dir}/src-${s.n}.txt (the raw capture is src-${s.n}.html beside it, for anything the text extraction lost, such as dates in metadata).

TASK: read the dossier at ${DOSSIER} and find EVERY sentence or table cell that cites [${s.n}], alone or with other sources. For each, decide whether source [${s.n}] supports the part of the claim attributed to it. Where a claim cites several sources, judge only what this source is being used for; say "partly" when this source carries some of it and another cited source must carry the rest. Check quoted words character for character. Check the source-list entry too (title, author, publisher, date). Be adversarial: if the text does not clearly say it, the verdict is not "supported". Paraphrase evidence; at most one short quote under 15 words.`

phase('Verify')
const results = await parallel(
  SOURCES.map((s) => () =>
    agent(PROMPT(s), { label: `verify:[${s.n}]`, phase: 'Verify', schema: VERDICT, model: 'sonnet', effort: 'medium' }),
  ),
)
return results
