/**
 * designation → experiment component. One line per experiment.
 * Entries with no component here render specimen plate + notice only
 * (used for `forthcoming` status or copy-only specimens).
 */
import BDL001 from './bdl-001/Experiment.astro';
import BDL002 from './bdl-002/Experiment.astro';
import BDL003 from './bdl-003/Experiment.astro';
import BDL006 from './bdl-006/Experiment.astro';

// Values are Astro component imports; typed loosely because Astro's
// component factory type lives at an internal path that shifts between minors.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const experimentComponents: Record<string, any> = {
  'BDL-001': BDL001,
  'BDL-002': BDL002,
  'BDL-003': BDL003,
  'BDL-006': BDL006,
};
