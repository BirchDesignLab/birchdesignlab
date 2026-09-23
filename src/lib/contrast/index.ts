/** The token contrast checker (spec §6.3): CSS token reading plus color math. */
export * from './css-tokens';
export * from './check';

/**
 * Where a school's tokens live, repo-relative. Quiet is the house style, so its
 * tokens are the root site's own; every other school carries a theme.css.
 */
export function themeCssPath(id: string): string {
  return id === 'quiet' ? 'src/styles/tokens.css' : `src/themes/${id}/theme.css`;
}
