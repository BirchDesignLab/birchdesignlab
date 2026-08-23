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

export function ogImageFor(pathname: string): string {
  const clean = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (clean === '/lab' || clean.startsWith('/lab/')) return 'lab';
  return OG_PAGES.find((p) => p.route === clean)?.name ?? 'home';
}
