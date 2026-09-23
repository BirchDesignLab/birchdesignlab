/**
 * Render a copy string with the two inline marks the copy collection allows:
 * `*emphasis*` becomes <em> and `**strong**` becomes <strong>. Everything
 * else is HTML-escaped, so a copy file can never inject markup.
 *
 * Kept free of astro:content so it is unit-testable in plain Node.
 */
export function rich(source: string): string {
  const escaped = source
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
