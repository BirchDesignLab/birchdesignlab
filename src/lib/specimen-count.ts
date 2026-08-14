// The Lab catalog's count line. Pure and separate from the component so the
// pluralisation is testable without rendering Astro, and so the server render
// and the client-side filter update can never word it differently.
export function specimenCountLabel(total: number, working: number): string {
  return `${total} specimen${total === 1 ? '' : 's'} · ${working} working`;
}
