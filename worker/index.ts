/**
 * The site Worker. Static pages are served by the assets layer before this
 * code runs; the only requests that reach it are ones that match no file,
 * which in practice means the contact endpoint (plus stray 404s that the
 * assets config already resolves to Astro's 404 page).
 *
 * POST /api/contact: honeypot -> rate limit -> validate -> email the owner,
 * then a 303 redirect so the no-JS form lands on /contact/sent. Errors return
 * plain pages rather than JSON because the form works without JavaScript.
 */
import { parseContactSubmission } from '../src/lib/contact/validate';

// Notification recipient. Must be a VERIFIED Email Routing destination: sending
// to a verified destination is free on all plans (Cloudflare Email Service),
// whereas sending to hello@ (a routing address, not a destination) is rejected
// on the free plan and returns 502. Kept out of any visitor-facing output.
const CONTACT_TO = 'birchdesignlab@gmail.com';
// Public address shown to visitors in the 502 fallback (never the private inbox).
const CONTACT_PUBLIC = 'hello@birchdesignlab.com';
const CONTACT_FROM = { email: 'forms@birchdesignlab.com', name: 'birchdesignlab.com contact form' };

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    // Accept the trailing-slash variant too. The form posts to /api/contact,
    // but a stale cached 301 (or any slash-normalizing hop) can turn that into
    // /api/contact/, which would otherwise fall through to the assets layer and
    // 405 the POST. Matching both keeps the endpoint robust to that.
    if (url.pathname === '/api/contact' || url.pathname === '/api/contact/') {
      if (request.method !== 'POST') {
        return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
      }
      return handleContact(request, env, url);
    }

    // Anything else that missed the assets layer: let the assets binding
    // resolve it (it owns the 404 page).
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;

async function handleContact(request: Request, env: Env, url: URL): Promise<Response> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return errorPage(url, 400, 'That submission was not a form post.');
  }

  const field = (name: string) => {
    const v = form.get(name);
    return typeof v === 'string' ? v : undefined;
  };

  const parsed = parseContactSubmission({
    name: field('name'),
    email: field('email'),
    message: field('message'),
    company: field('company'),
  });

  // Bots that fill the honeypot get a cheerful success and no email.
  if (!parsed.ok && parsed.honeypot) return sentRedirect(url);

  const ip = request.headers.get('CF-Connecting-IP') ?? 'unknown';
  const { success } = await env.CONTACT_RATE_LIMITER.limit({ key: ip });
  if (!success) {
    return errorPage(url, 429, 'Too many messages in a row. Give it a minute and try again.');
  }

  if (!parsed.ok) {
    return errorPage(url, 400, parsed.errors.join(' '));
  }

  const { name, email, message } = parsed.data;
  try {
    await env.EMAIL.send({
      to: CONTACT_TO,
      from: CONTACT_FROM,
      replyTo: email,
      subject: `Contact form: ${name}`,
      text: [`From: ${name} <${email}>`, '', message].join('\n'),
    });
  } catch (err) {
    console.error('contact email send failed', err);
    return errorPage(
      url,
      502,
      `The message did not go through. Email ${CONTACT_PUBLIC} directly and it will reach the same person.`
    );
  }

  return sentRedirect(url);
}

/** 303 so the browser GETs the confirmation page and refresh cannot resubmit.
 *  Trailing slash matches Astro's directory-format output and saves the
 *  assets layer's 307 canonicalization hop. */
function sentRedirect(url: URL): Response {
  return Response.redirect(new URL('/contact/sent/', url.origin).toString(), 303);
}

/** Minimal self-contained error page; the form itself is no-JS, so errors have
 *  to be pages, not JSON. Styled just enough to not feel like a crash. */
function errorPage(url: URL, status: number, detail: string): Response {
  const back = new URL('/contact', url.origin).toString();
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
  <h1>That did not send</h1>
  <p>${escapeHtml(detail)}</p>
  <p><a href="${back}">Back to the form</a></p>
</main>
</body>
</html>`;
  return new Response(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
