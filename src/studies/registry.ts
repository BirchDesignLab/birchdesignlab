/**
 * In-page pieces a study renders after its narrative, keyed by designation,
 * the way src/experiments/registry.ts keys experiment stages. Most studies
 * have none. BDL-011 (the design schools) adds its school index here.
 *
 * Static imports on purpose, like the experiments registry: a study's extra
 * is small, and the one known cost of this shape (every /lab/<slug> page
 * links every registered component's CSS) is the pre-existing F016 twin
 * logged in docs/lab-backlog.md.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Astro components, same shape as experimentComponents
export const studyExtras: Record<string, any> = {};
