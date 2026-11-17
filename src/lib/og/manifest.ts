/** Which pages get OG cards, and how a pathname finds its card. */

export interface OgPage {
  name: string;          // file stem under public/og/
  route: string;         // exact pathname, no trailing slash (except '/')
  title: string | null;  // smallcaps line under the wordmark; null = wordmark only
}

export const OG_PAGES: OgPage[] = [
  { name: 'home', route: '/', title: null },
  { name: 'services', route: '/services', title: 'Services' },
  { name: 'about', route: '/about', title: 'About' },
  { name: 'contact', route: '/contact', title: 'Contact' },
  { name: 'lab', route: '/lab', title: 'The Lab' },
];

/**
 * Lab detail cards. Experiments and studies share the /lab/<slug> shape, so a
 * pathname can't tell them apart; these are resolved by the layout instead
 * (ExperimentLayout passes 'lab-experiment', StudyLayout passes 'lab-study',
 * both via the Seo `ogImage` override). They have no `route` because they are
 * never matched by pathname. Kept separate from OG_PAGES so ogImageFor's route
 * table stays exact; both lists feed the card generator.
 */
export const OG_LAB_CARDS: { name: string; title: string }[] = [
  { name: 'lab-experiment', title: 'Experiment' },
  { name: 'lab-study', title: 'Study' },
];

/**
 * Lab entries with a card of their own, for pieces made to be shared. The
 * image is a committed capture (see the script named beside each); the
 * generator copies it into public/og/ under `name` at prebuild. Everything
 * else in the Lab keeps the two shared cards above.
 */
export const OG_LAB_CUSTOM: { designation: string; name: string; src: string }[] = [
  // scripts/og/capture-bdl-012.mjs
  { designation: 'BDL-012', name: 'bdl-012', src: 'src/experiments/bdl-012/og.png' },
];

/** The card for one Lab entry: its own if it has one, else the shared card. */
export function ogImageForLab(designation: string, shared: string): string {
  return OG_LAB_CUSTOM.find((c) => c.designation === designation)?.name ?? shared;
}

export function ogImageFor(pathname: string): string {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (clean === '/lab' || clean.startsWith('/lab/')) return 'lab';
  return OG_PAGES.find((p) => p.route === clean)?.name ?? 'home';
}
