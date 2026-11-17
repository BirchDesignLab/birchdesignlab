/**
 * The site Worker. Static pages are served by the assets layer before this
 * code runs; the only requests that reach it are ones that match no file,
 * which in practice means the contact endpoint (plus stray 404s that the
 * assets config already resolves to Astro's 404 page).
 *
 * POST /api/contact: honeypot -> rate limit -> validate -> daily cap -> email
 * the owner, then a 303 redirect so the no-JS form lands on /contact/sent. If
 * the email fails, the submission is held in KV and a daily cron (scheduled()
 * below) retries it until it sends or expires, so a lead is never lost to a
 * transient send failure. Errors return
 * plain pages rather than JSON because the form works without JavaScript.
 * School forms under /t/<id>/ also send a hidden `return` field holding the
 * school id; when it names a school whose sent page really exists, every exit
 * (the redirect and the error pages' back link) stays inside that school.
 * No `return` field means the root form, which behaves exactly as before.
 *
 * POST /api/beacon: scan counter for the card landings (src/components/
 * CardLanding.astro, context in docs/ar-card/HANDOFF.md). Writes one Analytics
 * Engine data point per scan: no cookies, no IP, no user agent, no PII of any
 * kind. The contract is fail-silent: whatever happens, the visitor gets an
 * empty 204.
 */
import { parseContactSubmission } from '../src/lib/contact/validate';
// The shape of a school id, shared with the site's own routing. Checked before
// the value goes anywhere near a URL, so raw form input is never echoed into
// Location or a link. Imported, not exported from here: workerd reads a main
// module's named exports as entrypoints.
import { SCHOOL_ID as THEME_ID } from '../src/themes/paths';

// Notification recipient. Must be a VERIFIED Email Routing destination: sending
// to a verified destination is free on all plans (Cloudflare Email Service),
// whereas sending to hello@ (a routing address, not a destination) is rejected
// on the free plan and returns 502. Kept out of any visitor-facing output.
const CONTACT_TO = 'birchdesignlab@gmail.com';
// Public address shown to visitors in the 502 fallback (never the private inbox).
const CONTACT_PUBLIC = 'hello@birchdesignlab.com';
const CONTACT_FROM = { email: 'forms@birchdesignlab.com', name: 'birchdesignlab.com contact form' };

// Global cap on valid submissions per UTC day. The per-IP limiter stops one
// sender hammering the form; this stops a bot that rotates IPs from flooding
// the inbox. Far above any real day's traffic.
const DAILY_CAP = 40;
// How long a submission whose email failed is held for the daily retry.
const HELD_TTL_SECONDS = 60 * 60 * 24 * 30;
// The day counter only needs to outlive its own day.
const COUNT_TTL_SECONDS = 60 * 60 * 48;
// Most held submissions one cron run will try: above DAILY_CAP so a full day
// of failed sends drains in one run, and about 150 KV/email calls at most,
// far under a run's subrequest budget.
const RETRY_BATCH = 50;
// A held submission this old is close to its TTL; the retry logs it loudly so
// a lasting send failure (unverified destination, sending disabled) shows up
// in Workers Logs instead of leads quietly expiring.
const HELD_WARN_DAYS = 25;

/** A contact submission as held in KV between a failed send and its retry. */
interface HeldSubmission {
  name: string;
  email: string;
  message: string;
  at: string;
}

function contactEmail(s: HeldSubmission, delayed = false) {
  return {
    to: CONTACT_TO,
    from: CONTACT_FROM,
    replyTo: s.email,
    subject: `${delayed ? 'Contact form (delayed)' : 'Contact form'}: ${s.name}`,
    text: [
      `From: ${s.name} <${s.email}>`,
      ...(delayed ? [`Submitted: ${s.at} (first send failed; this is the retry)`] : []),
      '',
      s.message,
    ].join('\n'),
  };
}

// Referrer-Policy and X-Frame-Options are NOT applied by public/_headers to
// Worker-generated responses: the assets layer serves static files before the
// Worker runs, so only those get _headers. The zone already adds
// X-Content-Type-Options and HSTS to Worker responses; these two are the gap.
// Route every Worker response through secure() so all five paths carry them.
// See docs/deploy.md, "Headers the Worker must set".
const SECURITY_HEADERS: Record<string, string> = {
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
};

function secure(response: Response): Response {
  for (const [header, value] of Object.entries(SECURITY_HEADERS)) {
    response.headers.set(header, value);
  }
  return response;
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    // Accept the trailing-slash variant too. The form posts to /api/contact,
    // but a stale cached 301 (or any slash-normalizing hop) can turn that into
    // /api/contact/, which would otherwise fall through to the assets layer and
    // 405 the POST. Matching both keeps the endpoint robust to that.
    if (url.pathname === '/api/contact' || url.pathname === '/api/contact/') {
      if (request.method !== 'POST') {
        return secure(new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } }));
      }
      return handleContact(request, env, url);
    }

    // Same trailing-slash tolerance as /api/contact.
    if (url.pathname === '/api/beacon' || url.pathname === '/api/beacon/') {
      if (request.method !== 'POST') {
        return secure(new Response(null, { status: 405, headers: { Allow: 'POST' } }));
      }
      return handleBeacon(request, env);
    }

    // Anything else that missed the assets layer: let the assets binding
    // resolve it (it owns the 404 page).
    return env.ASSETS.fetch(request);
  },

  /** Daily cron: retry every held contact submission. A success is deleted;
   *  a failure stays for tomorrow until its TTL runs out. */
  async scheduled(_controller, env): Promise<void> {
    await retryHeld(env);
  },
} satisfies ExportedHandler<Env>;

/** Retry held submissions, oldest first (keys sort by their ISO timestamp). */
async function retryHeld(env: Env): Promise<void> {
  const list = await env.CONTACT_KV.list({ prefix: 'held:', limit: RETRY_BATCH });
  for (const { name: key } of list.keys) {
    // Everything per record sits inside the try: one corrupt value or KV
    // error must not stop the rest of the batch (keys list oldest first, so a
    // bad oldest record would otherwise block every retry until it expired).
    try {
      const held = await env.CONTACT_KV.get<HeldSubmission>(key, 'json');
      if (!held) continue;
      await env.EMAIL.send(contactEmail(held, true));
      await env.CONTACT_KV.delete(key);
    } catch (err) {
      console.error('held contact retry failed', key, err);
      const ageDays = (Date.now() - Date.parse(key.slice('held:'.length, 'held:'.length + 24))) / 864e5;
      if (ageDays > HELD_WARN_DAYS) {
        console.error('HELD CONTACT EXPIRING SOON', key, Math.floor(ageDays), 'days old');
      }
    }
  }
}

/** Count this submission against today's cap. True if it is over the cap.
 *  Fails open: if KV is unreachable a real lead must still go through. The
 *  cap is soft: read-then-write is not atomic, KV caches reads per location
 *  for up to 60s, and a put over KV's one-write-per-second-per-key limit
 *  throws (and is allowed through). A bot spread across locations can pass
 *  40; for a flood guard on a quiet inbox that is acceptable. */
async function overDailyCap(env: Env): Promise<boolean> {
  try {
    const key = `count:${new Date().toISOString().slice(0, 10)}`;
    const n = Number(await env.CONTACT_KV.get(key)) || 0;
    if (n >= DAILY_CAP) return true;
    await env.CONTACT_KV.put(key, String(n + 1), { expirationTtl: COUNT_TTL_SECONDS });
    return false;
  } catch (err) {
    console.error('contact daily cap check failed (allowing)', err);
    return false;
  }
}

/** Hold a submission whose email failed. True if it was saved. */
async function holdSubmission(env: Env, s: HeldSubmission): Promise<boolean> {
  try {
    await env.CONTACT_KV.put(`held:${s.at}:${crypto.randomUUID()}`, JSON.stringify(s), {
      expirationTtl: HELD_TTL_SECONDS,
    });
    return true;
  } catch (err) {
    console.error('contact hold failed', err);
    return false;
  }
}

async function handleContact(request: Request, env: Env, url: URL): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    // No form, so no `return` field to read: this one always goes to root.
    return errorPage(url, 400, 'That submission was not a form post.');
  }

  const field = (name: string) => {
    const v = form.get(name);
    return typeof v === 'string' ? v : undefined;
  };

  // Resolved once, up front, so every exit below (honeypot, 429, 400, 502,
  // success) lands in the same place.
  const theme = await resolveReturnTheme(field('return'), env, url.origin);

  const parsed = parseContactSubmission({
    name: field('name'),
    email: field('email'),
    message: field('message'),
    company: field('company'),
  });

  // Bots that fill the honeypot get a cheerful success and no email.
  if (!parsed.ok && parsed.honeypot) return sentRedirect(url, theme);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.CONTACT_RATE_LIMITER.limit({ key: ip });
  if (!success) {
    return errorPage(url, 429, 'Too many messages in a row. Give it a minute and try again.', theme);
  }

  if (!parsed.ok) {
    return errorPage(url, 400, parsed.errors.join(' '), theme);
  }

  if (await overDailyCap(env)) {
    return errorPage(
      url,
      429,
      `The form is taking a breather for today. Email ${CONTACT_PUBLIC} directly and it will reach the same person.`,
      theme,
    );
  }

  const { name, email, message } = parsed.data;
  const submission: HeldSubmission = { name, email, message, at: new Date().toISOString() };
  try {
    await env.EMAIL.send(contactEmail(submission));
  } catch (err) {
    console.error('contact email send failed', err);
    if (await holdSubmission(env, submission)) {
      // Saved for the daily retry: the visitor's message will arrive, just
      // late. Say so plainly rather than call it a failure.
      return messagePage(
        url,
        202,
        'Your message is saved',
        `Our mail service hiccuped, so your message was saved and will be delivered within a day. No need to send it again. If it is urgent, email ${CONTACT_PUBLIC}.`,
        theme,
      );
    }
    return errorPage(
      url,
      502,
      `The message did not go through. Email ${CONTACT_PUBLIC} directly and it will reach the same person.`,
      theme,
    );
  }

  return sentRedirect(url, theme);
}

/** The school a submission should return to, or undefined for root.
 *  Two gates: the raw value must match THEME_ID, and /t/<id>/contact/sent/
 *  must actually exist in the built assets. Existence is asked of the assets
 *  binding rather than a list in this file because the school registry is
 *  build-time (src/themes); a hardcoded copy here would drift the first time
 *  a school is added or retired, and the built pages are the one source that
 *  cannot. Anything else (no field, bad shape, non-200, a throwing fetch)
 *  quietly falls back to root: a visitor should never be stranded by this. */
async function resolveReturnTheme(
  raw: string | undefined,
  env: Env,
  origin: string,
): Promise<string | undefined> {
  if (raw === undefined || !THEME_ID.test(raw)) return undefined;
  try {
    const res = await env.ASSETS.fetch(new Request(new URL(`/t/${raw}/contact/sent/`, origin)));
    // Only the status matters; release the body rather than leave it pending.
    await res.body?.cancel();
    return res.status === 200 ? raw : undefined;
  } catch {
    return undefined;
  }
}

/** Record one card scan in Analytics Engine. Body is the landing page's
 *  {ts, channel} JSON. The channel is the name of the card that led here
 *  ("kraft", "showcase", ...), baked into the page rather than parsed out of a
 *  URL, and it goes in as the index so per-channel counts group on it. That is
 *  the whole payload: no cookies, no IP, no user agent, nothing per-visitor.
 *  Anything malformed is dropped without comment: a beacon endpoint must never
 *  give a visitor an error, and the binding is absent in local dev. */
async function handleBeacon(request: Request, env: Env): Promise<Response> {
  try {
    const raw = await request.text();
    if (raw.length > 0 && raw.length <= 1024) {
      const data = JSON.parse(raw) as Record<string, unknown>;
      // 96 bytes is the Analytics Engine index limit. Channel names are short
      // ASCII labels we choose, so slicing by character is safe here.
      const channel = typeof data.channel === 'string' ? data.channel.slice(0, 96) : '';
      const ts = typeof data.ts === 'number' && Number.isFinite(data.ts) ? data.ts : 0;
      if (channel) {
        // Not awaited: writeDataPoint is fire-and-forget by design.
        env.AR_ANALYTICS?.writeDataPoint({ indexes: [channel], doubles: [ts] });
      }
    }
  } catch {
    // Fail silent by contract.
  }
  return secure(new Response(null, { status: 204 }));
}

/** 303 so the browser GETs the confirmation page and refresh cannot resubmit.
 *  Trailing slash matches Astro's directory-format output and saves the
 *  assets layer's 307 canonicalization hop. */
function sentRedirect(url: URL, theme?: string): Response {
  const path = theme ? `/t/${theme}/contact/sent/` : '/contact/sent/';
  // Built by hand rather than Response.redirect so secure() can add headers:
  // a response from Response.redirect() has an immutable headers guard.
  return secure(
    new Response(null, {
      status: 303,
      headers: { Location: new URL(path, url.origin).toString() },
    }),
  );
}

/** Minimal self-contained error page; the form itself is no-JS, so errors have
 *  to be pages, not JSON. Styled just enough to not feel like a crash. */
function errorPage(url: URL, status: number, detail: string, theme?: string): Response {
  return messagePage(url, status, 'That did not send', detail, theme);
}

function messagePage(url: URL, status: number, heading: string, detail: string, theme?: string): Response {
  // `theme` has already passed resolveReturnTheme, so it is safe in a URL.
  const back = new URL(theme ? `/t/${theme}/contact/` : '/contact/', url.origin).toString();
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Contact · Birch Design Lab</title>
<style>
  body { font-family: Georgia, serif; background: #171a18; color: #f2efe9;
         display: grid; place-items: center; min-height: 100vh; margin: 0; }
  main { max-width: 34rem; padding: 2rem; }
  a { color: #a3bd8f; }
</style>
</head>
<body>
<main>
  <h1>${escapeHtml(heading)}</h1>
  <p>${escapeHtml(detail)}</p>
  <p><a href="${back}">Back to the form</a></p>
</main>
</body>
</html>`;
  return secure(
    new Response(html, {
      status,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }),
  );
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
