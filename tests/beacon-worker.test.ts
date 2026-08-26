import { describe, it, expect, vi } from 'vitest';
import worker from '../worker/index';

// Same construction pattern as contact-worker.test.ts: pull types off the
// worker's fetch signature instead of rebuilding the generated Env.
type WorkerEnv = Parameters<typeof worker.fetch>[1];
type WorkerRequest = Parameters<typeof worker.fetch>[0];

function makeEnv(over: Record<string, unknown> = {}) {
  const analytics = { writeDataPoint: vi.fn() };
  const assets = { fetch: vi.fn().mockResolvedValue(new Response('asset', { status: 200 })) };
  const env = { AR_ANALYTICS: analytics, ASSETS: assets, ...over };
  return env as unknown as WorkerEnv & {
    AR_ANALYTICS: typeof analytics;
    ASSETS: typeof assets;
  };
}

function beaconRequest(body: string | null, opts: { method?: string; path?: string } = {}) {
  const { method = 'POST', path = '/api/beacon' } = opts;
  const url = `https://birchdesignlab.com${path}`;
  if (body === null) {
    return new Request(url, { method }) as unknown as WorkerRequest;
  }
  return new Request(url, { method, body }) as unknown as WorkerRequest;
}

const GOOD = JSON.stringify({ ts: 1787700000000, channel: 'kraft' });

function expectSecureHeaders(res: Response) {
  expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  expect(res.headers.get('x-frame-options')).toBe('DENY');
}

describe('beacon worker', () => {
  it('records a scan against its channel and returns an empty 204', async () => {
    const env = makeEnv();
    const res = await worker.fetch(beaconRequest(GOOD), env);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(env.AR_ANALYTICS.writeDataPoint).toHaveBeenCalledTimes(1);
    expect(env.AR_ANALYTICS.writeDataPoint).toHaveBeenCalledWith({
      indexes: ['kraft'],
      doubles: [1787700000000],
    });
    expectSecureHeaders(res);
  });

  it('keeps each channel separate', async () => {
    const env = makeEnv();
    await worker.fetch(beaconRequest(JSON.stringify({ ts: 1, channel: 'showcase' })), env);
    expect(env.AR_ANALYTICS.writeDataPoint.mock.calls[0][0].indexes).toEqual(['showcase']);
  });

  it('accepts the trailing-slash path', async () => {
    const env = makeEnv();
    const res = await worker.fetch(beaconRequest(GOOD, { path: '/api/beacon/' }), env);
    expect(res.status).toBe(204);
    expect(env.AR_ANALYTICS.writeDataPoint).toHaveBeenCalledTimes(1);
  });

  it('defaults a missing timestamp rather than rejecting the scan', async () => {
    const env = makeEnv();
    await worker.fetch(beaconRequest(JSON.stringify({ channel: 'kraft' })), env);
    expect(env.AR_ANALYTICS.writeDataPoint).toHaveBeenCalledWith({
      indexes: ['kraft'],
      doubles: [0],
    });
  });

  it('writes nothing when the channel is missing: an unlabelled scan is noise', async () => {
    const env = makeEnv();
    const res = await worker.fetch(beaconRequest(JSON.stringify({ ts: 1 })), env);
    expect(res.status).toBe(204);
    expect(env.AR_ANALYTICS.writeDataPoint).not.toHaveBeenCalled();
  });

  it('drops malformed JSON silently and still returns 204', async () => {
    const env = makeEnv();
    const res = await worker.fetch(beaconRequest('not json at all'), env);
    expect(res.status).toBe(204);
    expect(env.AR_ANALYTICS.writeDataPoint).not.toHaveBeenCalled();
    expectSecureHeaders(res);
  });

  it('drops an oversized body without writing', async () => {
    const env = makeEnv();
    const body = JSON.stringify({ ts: 1, channel: 'x'.repeat(2000) });
    const res = await worker.fetch(beaconRequest(body), env);
    expect(res.status).toBe(204);
    expect(env.AR_ANALYTICS.writeDataPoint).not.toHaveBeenCalled();
  });

  it('drops an empty body without writing', async () => {
    const env = makeEnv();
    const res = await worker.fetch(beaconRequest(''), env);
    expect(res.status).toBe(204);
    expect(env.AR_ANALYTICS.writeDataPoint).not.toHaveBeenCalled();
  });

  it('caps the channel at the Analytics Engine index limit', async () => {
    const env = makeEnv();
    await worker.fetch(beaconRequest(JSON.stringify({ ts: 1, channel: 'a'.repeat(300) })), env);
    const point = env.AR_ANALYTICS.writeDataPoint.mock.calls[0][0] as { indexes: string[] };
    expect(point.indexes[0].length).toBe(96);
  });

  it('still returns 204 when the analytics binding is absent (local dev)', async () => {
    const env = makeEnv({ AR_ANALYTICS: undefined });
    const res = await worker.fetch(beaconRequest(GOOD), env);
    expect(res.status).toBe(204);
  });

  it('rejects non-POST with 405 and never writes', async () => {
    const env = makeEnv();
    const res = await worker.fetch(beaconRequest(null, { method: 'GET' }), env);
    expect(res.status).toBe(405);
    expect(res.headers.get('allow')).toBe('POST');
    expect(env.AR_ANALYTICS.writeDataPoint).not.toHaveBeenCalled();
    expectSecureHeaders(res);
  });
});
