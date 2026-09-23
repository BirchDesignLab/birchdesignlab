import { describe, it, expect, vi } from 'vitest';
import worker from '../worker/index';

// The worker's fetch takes (request, env); pull the env type from it so the
// test never has to reconstruct the full generated Env shape.
type WorkerEnv = Parameters<typeof worker.fetch>[1];
// The worker's fetch is typed for Cloudflare's IncomingRequest, not the plain
// global Request the tests build; cast through this at construction.
type WorkerRequest = Parameters<typeof worker.fetch>[0];

function makeEnv(over: Record<string, unknown> = {}) {
  const email = { send: vi.fn().mockResolvedValue(undefined) };
  const rateLimiter = { limit: vi.fn().mockResolvedValue({ success: true }) };
  const assets = { fetch: vi.fn().mockResolvedValue(new Response('asset', { status: 200 })) };
  const env = { EMAIL: email, CONTACT_RATE_LIMITER: rateLimiter, ASSETS: assets, ...over };
  // Cast for the call site; the tests only touch the three bindings above.
  return env as unknown as WorkerEnv & {
    EMAIL: typeof email;
    CONTACT_RATE_LIMITER: typeof rateLimiter;
    ASSETS: typeof assets;
  };
}

function contactRequest(
  fields: Record<string, string>,
  opts: { method?: string; path?: string } = {},
) {
  const { method = 'POST', path = '/api/contact' } = opts;
  const url = `https://birchdesignlab.com${path}`;
  if (method === 'GET' || method === 'HEAD') {
    return new Request(url, { method }) as unknown as WorkerRequest;
  }
  const body = new FormData();
  for (const [key, value] of Object.entries(fields)) body.append(key, value);
  return new Request(url, { method, body }) as unknown as WorkerRequest;
}

const GOOD = { name: 'Ada Lovelace', email: 'ada@example.com', message: 'Build me a thing.' };
const CRLF = String.fromCharCode(13, 10); // avoids writing raw escapes into source

function expectSecureHeaders(res: Response) {
  expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  expect(res.headers.get('x-frame-options')).toBe('DENY');
}

describe('contact worker', () => {
  it('emails the verified business inbox and 303s on a valid submission', async () => {
    const env = makeEnv();
    const res = await worker.fetch(contactRequest(GOOD), env);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe('https://birchdesignlab.com/contact/sent/');
    expect(env.EMAIL.send).toHaveBeenCalledTimes(1);
    const msg = env.EMAIL.send.mock.calls[0][0] as {
      to: string;
      from: { email: string };
      replyTo: string;
      subject: string;
    };
    expect(msg.to).toBe('birchdesignlab@gmail.com');
    expect(msg.from.email).toBe('forms@birchdesignlab.com');
    expect(msg.replyTo).toBe('ada@example.com');
    expect(msg.subject).toBe('Contact form: Ada Lovelace');
    expectSecureHeaders(res);
  });

  it('treats a filled honeypot as success but sends no email', async () => {
    const env = makeEnv();
    const res = await worker.fetch(contactRequest({ ...GOOD, company: 'Bot Co' }), env);
    expect(res.status).toBe(303);
    expect(env.EMAIL.send).not.toHaveBeenCalled();
  });

  it('returns 400 on a validation failure and sends no email', async () => {
    const env = makeEnv();
    const res = await worker.fetch(contactRequest({ ...GOOD, name: '' }), env);
    expect(res.status).toBe(400);
    expect(env.EMAIL.send).not.toHaveBeenCalled();
    expectSecureHeaders(res);
  });

  it('returns 429 when the rate limiter rejects, before validating or sending', async () => {
    const env = makeEnv({ CONTACT_RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) } });
    const res = await worker.fetch(contactRequest(GOOD), env);
    expect(res.status).toBe(429);
    expect(env.EMAIL.send).not.toHaveBeenCalled();
    expectSecureHeaders(res);
  });

  it('returns 502 when the email send fails', async () => {
    const env = makeEnv({ EMAIL: { send: vi.fn().mockRejectedValue(new Error('send failed')) } });
    const res = await worker.fetch(contactRequest(GOOD), env);
    expect(res.status).toBe(502);
    expectSecureHeaders(res);
  });

  it('405s a non-POST to the endpoint with an Allow header', async () => {
    const env = makeEnv();
    const res = await worker.fetch(contactRequest({}, { method: 'GET' }), env);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect(env.EMAIL.send).not.toHaveBeenCalled();
    expectSecureHeaders(res);
  });

  it('accepts the trailing-slash variant of the endpoint', async () => {
    const env = makeEnv();
    const res = await worker.fetch(contactRequest(GOOD, { path: '/api/contact/' }), env);
    expect(res.status).toBe(303);
    expect(env.EMAIL.send).toHaveBeenCalledTimes(1);
  });

  it('400s a body that is not a form post', async () => {
    const env = makeEnv();
    const req = new Request('https://birchdesignlab.com/api/contact', {
      method: 'POST',
      body: 'not a form',
      headers: { 'content-type': 'application/json' },
    }) as unknown as WorkerRequest;
    const res = await worker.fetch(req, env);
    expect(res.status).toBe(400);
    expect(env.EMAIL.send).not.toHaveBeenCalled();
  });

  it('flattens control characters out of the email subject (header-injection guard)', async () => {
    const env = makeEnv();
    await worker.fetch(contactRequest({ ...GOOD, name: `Ada${CRLF}Bcc: evil@example.com` }), env);
    const subject = (env.EMAIL.send.mock.calls[0][0] as { subject: string }).subject;
    expect(subject).toBe('Contact form: Ada Bcc: evil@example.com');
    expect([...subject].every((ch) => ch.charCodeAt(0) >= 32)).toBe(true);
  });

  it('delegates non-endpoint paths to the ASSETS binding', async () => {
    const env = makeEnv();
    const req = new Request('https://birchdesignlab.com/about/', { method: 'GET' }) as unknown as WorkerRequest;
    const res = await worker.fetch(req, env);
    expect(env.ASSETS.fetch).toHaveBeenCalledWith(req);
    expect(res.status).toBe(200);
  });
});

// School forms (spec section 5) add a hidden `return` field naming the school.
// The Worker confirms /t/<id>/contact/sent/ exists in ASSETS before using it.
describe('contact worker, school return path', () => {
  const ROOT_SENT = 'https://birchdesignlab.com/contact/sent/';
  const THEME_SENT = 'https://birchdesignlab.com/t/vaporwave/contact/sent/';

  /** ASSETS mock that answers 200 only for the listed paths, 404 otherwise. */
  function assetsServing(...paths: string[]) {
    return {
      fetch: vi.fn(async (req: Request) =>
        new Response('asset', { status: paths.includes(new URL(req.url).pathname) ? 200 : 404 }),
      ),
    };
  }

  function assetPaths(env: { ASSETS: { fetch: { mock: { calls: unknown[][] } } } }) {
    return env.ASSETS.fetch.mock.calls.map((call) => new URL((call[0] as Request).url).pathname);
  }

  it('redirects to the school sent page when that page exists', async () => {
    const env = makeEnv({ ASSETS: assetsServing('/t/vaporwave/contact/sent/') });
    const res = await worker.fetch(contactRequest({ ...GOOD, return: 'vaporwave' }), env);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(THEME_SENT);
    expect(assetPaths(env)).toEqual(['/t/vaporwave/contact/sent/']);
    expect(env.EMAIL.send).toHaveBeenCalledTimes(1);
    expectSecureHeaders(res);
  });

  it('falls back to root when a well-formed school has no sent page', async () => {
    const env = makeEnv({ ASSETS: assetsServing() });
    const res = await worker.fetch(contactRequest({ ...GOOD, return: 'vaporwave' }), env);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(ROOT_SENT);
    expect(assetPaths(env)).toEqual(['/t/vaporwave/contact/sent/']);
  });

  it.each(['../etc', 'Vaporwave', 'a'.repeat(40), 'https://evil.example', 'x y', ''])(
    'falls back to root for malformed return %j without touching ASSETS',
    async (bad) => {
      const env = makeEnv({ ASSETS: assetsServing('/t/vaporwave/contact/sent/') });
      const res = await worker.fetch(contactRequest({ ...GOOD, return: bad }), env);
      expect(res.status).toBe(303);
      expect(res.headers.get('location')).toBe(ROOT_SENT);
      expect(env.ASSETS.fetch).not.toHaveBeenCalled();
      expectSecureHeaders(res);
    },
  );

  it('falls back to root when the ASSETS lookup throws', async () => {
    const env = makeEnv({ ASSETS: { fetch: vi.fn().mockRejectedValue(new Error('assets down')) } });
    const res = await worker.fetch(contactRequest({ ...GOOD, return: 'vaporwave' }), env);
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(ROOT_SENT);
    expect(env.EMAIL.send).toHaveBeenCalledTimes(1);
  });

  it('sends a honeypot bot to the school sent page with no email', async () => {
    const env = makeEnv({ ASSETS: assetsServing('/t/vaporwave/contact/sent/') });
    const res = await worker.fetch(
      contactRequest({ ...GOOD, company: 'Bot Co', return: 'vaporwave' }),
      env,
    );
    expect(res.status).toBe(303);
    expect(res.headers.get('location')).toBe(THEME_SENT);
    expect(env.EMAIL.send).not.toHaveBeenCalled();
  });

  it('points the 429 page back at the school form', async () => {
    const env = makeEnv({
      ASSETS: assetsServing('/t/vaporwave/contact/sent/'),
      CONTACT_RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) },
    });
    const res = await worker.fetch(contactRequest({ ...GOOD, return: 'vaporwave' }), env);
    expect(res.status).toBe(429);
    const html = await res.text();
    expect(html).toContain('<a href="https://birchdesignlab.com/t/vaporwave/contact/">Back to the form</a>');
    expect(env.EMAIL.send).not.toHaveBeenCalled();
    expectSecureHeaders(res);
  });

  it('points the 400 page back at the school form', async () => {
    const env = makeEnv({ ASSETS: assetsServing('/t/vaporwave/contact/sent/') });
    const res = await worker.fetch(contactRequest({ ...GOOD, name: '', return: 'vaporwave' }), env);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('href="https://birchdesignlab.com/t/vaporwave/contact/"');
  });

  it('points the 502 page back at the school form', async () => {
    const env = makeEnv({
      ASSETS: assetsServing('/t/vaporwave/contact/sent/'),
      EMAIL: { send: vi.fn().mockRejectedValue(new Error('send failed')) },
    });
    const res = await worker.fetch(contactRequest({ ...GOOD, return: 'vaporwave' }), env);
    expect(res.status).toBe(502);
    expect(await res.text()).toContain('href="https://birchdesignlab.com/t/vaporwave/contact/"');
    expectSecureHeaders(res);
  });

  it('leaves a root submission exactly as before: old Location, old back link, no lookup', async () => {
    const okEnv = makeEnv();
    const ok = await worker.fetch(contactRequest(GOOD), okEnv);
    expect(ok.headers.get('location')).toBe(ROOT_SENT);
    expect(okEnv.ASSETS.fetch).not.toHaveBeenCalled();

    const limitedEnv = makeEnv({ CONTACT_RATE_LIMITER: { limit: vi.fn().mockResolvedValue({ success: false }) } });
    const limited = await worker.fetch(contactRequest(GOOD), limitedEnv);
    expect(limited.status).toBe(429);
    expect(await limited.text()).toContain('<a href="https://birchdesignlab.com/contact">Back to the form</a>');
    expect(limitedEnv.ASSETS.fetch).not.toHaveBeenCalled();
  });
});
