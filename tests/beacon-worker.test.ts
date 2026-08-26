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

const GOOD = JSON.stringify({ ts: 1787700000000, path: '/hello', c: 'k12', s: 'qr' });

function expectSecureHeaders(res: Response) {
  expect(res.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
  expect(res.headers.get('x-frame-options')).toBe('DENY');
}

describe('beacon worker', () => {
  it('records a scan and returns an empty 204', async () => {
    const env = makeEnv();
    const res = await worker.fetch(beaconRequest(GOOD), env);
    expect(res.status).toBe(204);
    expect(await res.text()).toBe('');
    expect(env.AR_ANALYTICS.writeDataPoint).toHaveBeenCalledTimes(1);
    expect(env.AR_ANALYTICS.writeDataPoint).toHaveBeenCalledWith({
      indexes: ['hello'],
      blobs: ['/hello', 'k12', 'qr'],
      doubles: [1787700000000],
    });
    expectSecureHeaders(res);
  });

  it('accepts the trailing-slash path', async () => {
    const env = makeEnv();
    const res = await worker.fetch(beaconRequest(GOOD, { path: '/api/beacon/' }), env);
    expect(res.status).toBe(204);
    expect(env.AR_ANALYTICS.writeDataPoint).toHaveBeenCalledTimes(1);
  });

  it('defaults missing fields instead of rejecting them', async () => {
    const env = makeEnv();
    const res = await worker.fetch(beaconRequest(JSON.stringify({ path: '/hello/' })), env);
    expect(res.status).toBe(204);
    expect(env.AR_ANALYTICS.writeDataPoint).toHaveBeenCalledWith({
      indexes: ['hello'],
      blobs: ['/hello/', '', ''],
      doubles: [0],
    });
  });

  it('indexes an empty or bare path as root', async () => {
    const env = makeEnv();
    await worker.fetch(beaconRequest(JSON.stringify({ path: '/' })), env);
    expect(env.AR_ANALYTICS.writeDataPoint.mock.calls[0][0].indexes).toEqual(['root']);
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
    const res = await worker.fetch(beaconRequest(JSON.stringify({ path: 'x'.repeat(2000) })), env);
    expect(res.status).toBe(204);
    expect(env.AR_ANALYTICS.writeDataPoint).not.toHaveBeenCalled();
  });

  it('drops an empty body without writing', async () => {
    const env = makeEnv();
    const res = await worker.fetch(beaconRequest(''), env);
    expect(res.status).toBe(204);
    expect(env.AR_ANALYTICS.writeDataPoint).not.toHaveBeenCalled();
  });

  it('caps blob lengths so junk cannot bloat a data point', async () => {
    const env = makeEnv();
    // Long enough to overflow every per-field cap, short enough that the
    // whole body stays under the 1KB drop threshold.
    const long = 'a'.repeat(200);
    await worker.fetch(
      beaconRequest(JSON.stringify({ path: '/' + long, c: long.slice(0, 100), s: long.slice(0, 100) })),
      env,
    );
    const point = env.AR_ANALYTICS.writeDataPoint.mock.calls[0][0] as {
      indexes: string[];
      blobs: string[];
    };
    expect(point.blobs[0].length).toBe(128);
    expect(point.blobs[1].length).toBe(64);
    expect(point.blobs[2].length).toBe(64);
    expect(point.indexes[0].length).toBeLessThanOrEqual(96);
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
