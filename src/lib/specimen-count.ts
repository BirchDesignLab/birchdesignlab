// The Lab List's count line. Pure and separate from the component so the
// wording is testable without rendering Astro, and so the server render and
// the client-side filter update can never word it differently. States are
// "open today" and "still in the workshop"; the cards themselves say
// "Coming soon" on a piece that is not open yet.
export function labCountLabel(total: number, live: number): string {
  if (total === 0) return '0 pieces.';
  if (total === 1) return live === 1 ? '1 piece. Open today.' : '1 piece. Still in the workshop.';
  const pieces = `${total} pieces.`;
  const soon = total - live;
  if (soon === 0) return `${pieces} All open today.`;
  if (live === 0) return `${pieces} All still in the workshop.`;
  if (soon === 1) return `${pieces} ${live} open today, one still in the workshop.`;
  return `${pieces} ${live} open today, ${soon} still in the workshop.`;
}
