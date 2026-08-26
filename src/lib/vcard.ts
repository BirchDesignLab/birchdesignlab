/**
 * vCard 3.0 builder for the AR card landing (src/pages/ar-card.astro).
 * Lives outside the page so the escaping rules are unit-testable: the card
 * identity is founder-editable data, and a comma in a title must never be
 * able to corrupt the card someone scans off permanent physical inventory.
 * Context: docs/ar-card/HANDOFF.md.
 */

export interface VcardIdentity {
  /** True while the card identity is the studio itself. Set false when a
   *  personal name goes in; the N field then splits "First Last" into
   *  given/family so recipients' contacts sort by surname. */
  isOrg: boolean;
  name: string;
  title: string;
  company: string;
  phone: string;
  email: string;
  url: string;
}

// Control characters built via fromCharCode so no escape sequences live in
// this source (see the Edit/Write corruption note in the repo memory).
const CR = String.fromCharCode(13);
const LF = String.fromCharCode(10);
const CRLF = CR + LF;
const BACKSLASH = String.fromCharCode(92);

/** RFC 2426 TEXT escaping: backslash, semicolon, comma, newline. */
export function escapeVcf(value: string): string {
  return value
    .replaceAll(BACKSLASH, BACKSLASH + BACKSLASH)
    .replaceAll(';', BACKSLASH + ';')
    .replaceAll(',', BACKSLASH + ',')
    .replaceAll(CRLF, BACKSLASH + 'n')
    .replaceAll(LF, BACKSLASH + 'n')
    .replaceAll(CR, BACKSLASH + 'n');
}

/** Structured N field (Family;Given;Middle;Prefix;Suffix). An org name sits
 *  whole in the family slot; a personal name splits on its last space. */
function buildN(name: string, isOrg: boolean): string {
  if (isOrg) return 'N:' + escapeVcf(name) + ';;;;';
  const parts = name.trim().split(' ').filter(Boolean);
  const family = parts.length > 1 ? (parts[parts.length - 1] as string) : '';
  const given = parts.length > 1 ? parts.slice(0, -1).join(' ') : (parts[0] ?? '');
  return 'N:' + escapeVcf(family) + ';' + escapeVcf(given) + ';;;';
}

/** vCard 3.0 with CRLF line endings (iOS is strict about this). Empty fields
 *  are omitted; FN is mandatory, so it falls back to the company name. */
export function buildVcf(card: VcardIdentity): string {
  const displayName = card.name || card.company;
  const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
  if (displayName) lines.push(buildN(displayName, card.isOrg));
  lines.push('FN:' + escapeVcf(displayName));
  if (card.company) lines.push('ORG:' + escapeVcf(card.company));
  if (card.isOrg) lines.push('X-ABShowAs:COMPANY');
  if (card.title) lines.push('TITLE:' + escapeVcf(card.title));
  if (card.phone) lines.push('TEL;TYPE=CELL:' + escapeVcf(card.phone));
  if (card.email) lines.push('EMAIL;TYPE=INTERNET:' + escapeVcf(card.email));
  if (card.url) lines.push('URL:' + escapeVcf(card.url));
  lines.push('END:VCARD');
  return lines.join(CRLF) + CRLF;
}
