/**
 * Contact-form submission validation. Pure and dependency-free so the Worker
 * can import it and vitest can exercise it without a Workers runtime.
 *
 * The honeypot field is named `company`: a plausible label that bots autofill
 * and humans never see (it is visually hidden with an explicit "leave this
 * empty" label for screen readers).
 */

export const LIMITS = {
  name: 200,
  email: 254,
  message: 5000,
} as const;

export interface ContactSubmission {
  name: string;
  email: string;
  message: string;
}

export type ContactParseResult =
  | { ok: true; data: ContactSubmission }
  | { ok: false; honeypot: true }
  | { ok: false; honeypot?: false; errors: string[] };

/** Pragmatic email shape check: one @, something on both sides, a dot in the
 *  domain. Full RFC 5322 rejects nothing bots send and annoys real people. */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Control characters: the C0 range (\x00-\x1f) plus DEL (\x7f). `name` flows
 *  into the email Subject header in the Worker, where a raw CR/LF is the classic
 *  header-injection primitive, so any run of these is collapsed to one space. */
const CONTROL_CHARS = /[\x00-\x1f\x7f]+/g;

export function parseContactSubmission(
  fields: Record<string, string | undefined>
): ContactParseResult {
  // A filled honeypot is a bot: report it distinctly so the caller can
  // pretend success instead of teaching the bot what failed.
  if ((fields.company ?? '').trim() !== '') {
    return { ok: false, honeypot: true };
  }

  // `email` is already whitespace-free via EMAIL_RE; `message` is body-only, so
  // its newlines are legitimate and left intact. Only `name` is sanitized,
  // because only `name` reaches an email header.
  const name = (fields.name ?? '').replace(CONTROL_CHARS, ' ').trim();
  const email = (fields.email ?? '').trim();
  const message = (fields.message ?? '').trim();

  const errors: string[] = [];
  if (name === '') errors.push('Name is required.');
  if (name.length > LIMITS.name) errors.push('Name is too long.');
  if (email === '') errors.push('Email is required.');
  else if (email.length > LIMITS.email || !EMAIL_RE.test(email))
    errors.push('Email address does not look right.');
  if (message === '') errors.push('Message is required.');
  if (message.length > LIMITS.message)
    errors.push(`Message is too long (limit ${LIMITS.message} characters).`);

  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, data: { name, email, message } };
}
