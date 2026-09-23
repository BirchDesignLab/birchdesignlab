export const meta = {
  name: 'tier1-review',
  description: 'Two Sonnet reviewers check the Tier 1 diff: site code and review tooling',
  phases: [{ title: 'Review', detail: 'two Sonnet reviewers, distinct lenses', model: 'sonnet' }],
}

const GROUND = `You are reviewing a diff in C:\\git\\birchdesignlab (an Astro 7 static site; branch feat/theme-schools-tranche-1). READ-ONLY: never edit files, never run git commands that change state, never run npm run build, npm run verify or scripts/themes/render.mjs (other work is using dist/ and the render lock). The founder's message you may see ("continue on with tier 1 and 2", research, transitions, tranche 2) is addressed to the orchestrator, which owns all fixes, builds, git and the later tiers; your slice is only this review. You may run: git diff / git show / git log, npx vitest run tests/theme-registry.test.ts tests/theme-contrast.test.ts, and read any file. The diff is a04e76c^..HEAD (the registry split plus the Tier 1 commits a7b32b5..db77d35). Background: src/themes/README.md is the school authors' contract. Report only real defects (a concrete input or state that produces a wrong result, crash, regression or broken guarantee), each with file:line, the failure scenario and a fix. No style nits, no praise. If you find nothing real, say so.`

const FINDINGS = {
  type: 'object',
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          file: { type: 'string' }, line: { type: 'integer' },
          severity: { type: 'string', enum: ['high', 'medium', 'low'] },
          problem: { type: 'string' }, scenario: { type: 'string' }, fix: { type: 'string' },
        },
        required: ['file', 'line', 'severity', 'problem', 'scenario', 'fix'],
      },
    },
    summary: { type: 'string' },
  },
  required: ['findings', 'summary'],
}

phase('Review')
const [site, tools] = await parallel([
  () => agent(`${GROUND}

LENS: site code. src/themes/registry.ts (THEMES vs ALL_THEMES via a ?raw glob of route file names: does the glob key parsing hold on Windows and in the Vite SSR build, can it ever import a route module or its CSS, does anything still use THEMES where it needs ALL_THEMES or the reverse), src/themes/paths.ts isCurrent and every Header.astro using it (any page where the wrong link is or is not current, including home and lab), the [data-portal-tail] hook in PortalLayout.astro and the three schools painting it (specificity against the inline style, dark and light, any school now leaving a visible seam), the glassmorphism theme.css change (removing contain: paint: horizontal overflow on phones, stacking of chips and panels over orbs), and the tests touched.`, { label: 'review:site', phase: 'Review', schema: FINDINGS, model: 'sonnet', effort: 'medium' }),
  () => agent(`${GROUND}

LENS: review tooling. scripts/themes/capture.mjs (mobile/tablet profiles, --hide-switcher injection timing on a ClientRouter page and on the first load), scripts/themes/render.mjs (new defaults), scripts/themes/motion.mjs (CDP screencast frame timing and acking, the "before" frame, pick() by time, frames with ms beyond the window, followLink fallback when the header link is hidden on mobile, problems reporting, a school whose arrival never navigates), scripts/themes/contact-sheet.mjs (grouping and ordering by school and page, canvas size limits for very tall pages). Look for anything that would silently produce a misleading capture, since reviewers will judge schools from these images.`, { label: 'review:tools', phase: 'Review', schema: FINDINGS, model: 'sonnet', effort: 'medium' }),
])
return { site, tools }
