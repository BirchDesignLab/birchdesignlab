/** The five root business pages the theme-schools work must leave untouched,
    and the one block excluded from their copy fixtures: the home page's
    lab-derived specimen lines, which change whenever a specimen ships. */
export const ROOT_PAGES = [
  { name: 'home', route: '/', file: 'index.html' },
  { name: 'about', route: '/about/', file: 'about/index.html' },
  { name: 'services', route: '/services/', file: 'services/index.html' },
  { name: 'contact', route: '/contact/', file: 'contact/index.html' },
  { name: 'sent', route: '/contact/sent/', file: 'contact/sent/index.html' },
];

export const ROOT_SKIP = ['.specimens'];
