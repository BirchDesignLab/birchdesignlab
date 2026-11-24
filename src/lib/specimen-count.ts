// The Lab List's count line. Pure and separate from the component so the
// wording is testable without rendering Astro, and so the server render and
// the client-side filter update can never word it differently. It uses the
// same two state words the cards do: "live" and "coming soon".
export function labCountLabel(total: number, live: number): string {
  const pieces = `${total} ${total === 1 ? 'piece' : 'pieces'}.`;
  if (total === 0) return pieces;
  const soon = total - live;
  if (soon === 0) return `${pieces} ${total === 1 ? 'Live.' : 'All live.'}`;
  if (live === 0) return `${pieces} ${total === 1 ? 'Coming soon.' : 'All coming soon.'}`;
  return `${pieces} ${live} live, ${soon} coming soon.`;
}
