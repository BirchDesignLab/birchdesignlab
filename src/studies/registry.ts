/**
 * In-page pieces a study renders after its narrative, keyed by designation,
 * the way src/experiments/registry.ts keys experiment stages. Most studies
 * have none. BDL-005 shows the shape of the work and a working miniature of
 * the live app; BDL-011 (the design schools) adds its school index here.
 *
 * Static imports on purpose, like the experiments registry: a study's extra
 * is small, and the one known cost of this shape (every /lab/<slug> page
 * links every registered component's CSS) is the pre-existing F016 twin
 * logged in docs/lab-backlog.md.
 *
 * An extra may carry its own script (founder call 11-16-26, for BDL-005's
 * miniature). The layout and the narrative above it still ship none.
 */
import BDL005 from './bdl-005/Extra.astro';

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- Astro components, same shape as experimentComponents
export const studyExtras: Record<string, any> = {
  'BDL-005': BDL005,
};
