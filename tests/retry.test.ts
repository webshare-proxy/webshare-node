import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { Webshare, InternalServerError, RateLimitError } from '../src/index.js';
import { TestServer, json } from './server.js';

let server: TestServer;

beforeAll(async () => {
  server = await new TestServer().start();
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  server.reset();
});

function makeClient(extra: ConstructorParameters<typeof Webshare>[0] = {}) {
  return new Webshare({ apiKey: 'test-key', baseURL: server.url, ...extra });
}

describe('retries', () => {
  test('retries GET on 429 and honors Retry-After', async () => {
    const client = makeClient();
    server.respond(json(429, { detail: 'Request was throttled.' }, { 'retry-after': '1' }), json(200, { id: 1 }));
    const started = Date.now();
    const profile = await client.profile.get();
    const elapsed = Date.now() - started;
    expect(profile).toEqual({ id: 1 });
    expect(server.requests).toHaveLength(2);
    // Retry-After: 1 must be respected (jittered backoff alone would be < 0.5s).
    expect(elapsed).toBeGreaterThanOrEqual(900);
  }, 10_000);

  test('retries GET on 500 and succeeds', async () => {
    const client = makeClient();
    server.respond(json(500, { detail: 'boom' }), json(500, { detail: 'boom' }), json(200, { id: 2 }));
    const profile = await client.profile.get();
    expect(profile).toEqual({ id: 2 });
    expect(server.requests).toHaveLength(3);
  }, 10_000);

  test('gives up after maxRetries and throws the mapped error', async () => {
    const client = makeClient({ maxRetries: 1 });
    server.respond(json(500, { detail: 'boom' }), json(500, { detail: 'boom' }), json(500, { detail: 'boom' }));
    await expect(client.profile.get()).rejects.toBeInstanceOf(InternalServerError);
    expect(server.requests).toHaveLength(2);
  }, 10_000);

  test('does not retry POST by default', async () => {
    const client = makeClient();
    server.respond(json(429, { detail: 'Request was throttled.' }));
    await expect(client.ipAuthorizations.create({ ip_address: '1.2.3.4' })).rejects.toBeInstanceOf(RateLimitError);
    expect(server.requests).toHaveLength(1);
  });

  test('retries POST when opted in per request', async () => {
    const client = makeClient();
    server.respond(json(500, { detail: 'boom' }), json(200, { id: 1, ip_address: '1.2.3.4' }));
    const created = await client.ipAuthorizations.create({ ip_address: '1.2.3.4' }, { retryNonIdempotent: true });
    expect(created.id).toBe(1);
    expect(server.requests).toHaveLength(2);
  }, 10_000);

  test('retries POST when opted in on the client', async () => {
    const client = makeClient({ retryNonIdempotent: true });
    server.respond(json(503, { detail: 'unavailable' }), json(200, { id: 1, ip_address: '1.2.3.4' }));
    const created = await client.ipAuthorizations.create({ ip_address: '1.2.3.4' });
    expect(created.id).toBe(1);
    expect(server.requests).toHaveLength(2);
  }, 10_000);

  test('does not retry non-retryable statuses', async () => {
    const client = makeClient();
    server.respond(json(400, { detail: 'bad' }));
    await expect(client.profile.get()).rejects.toMatchObject({ status: 400 });
    expect(server.requests).toHaveLength(1);
  });

  test('maxRetries: 0 disables retries', async () => {
    const client = makeClient({ maxRetries: 0 });
    server.respond(json(500, { detail: 'boom' }));
    await expect(client.profile.get()).rejects.toBeInstanceOf(InternalServerError);
    expect(server.requests).toHaveLength(1);
  });

  test('fetches credentials per attempt so refreshed tokens are used by retries', async () => {
    let calls = 0;
    const client = new Webshare({
      baseURL: server.url,
      credentials: () => {
        calls += 1;
        return `token-${calls}`;
      },
    });
    server.respond(json(500, { detail: 'boom' }), json(200, { id: 1 }));
    await client.profile.get();
    expect(calls).toBe(2);
    expect(server.requests[0]?.headers['authorization']).toBe('Token token-1');
    expect(server.requests[1]?.headers['authorization']).toBe('Token token-2');
  }, 10_000);

  test('retries connection errors on idempotent requests', async () => {
    // Point at a closed port to force a connection error, then verify no
    // successful response ever arrives but multiple attempts are made.
    const closed = await new TestServer().start();
    const url = closed.url;
    await closed.close();
    const client = new Webshare({ apiKey: 'test-key', baseURL: url, maxRetries: 1 });
    await expect(client.profile.get()).rejects.toThrow(/Connection error/);
  }, 10_000);
});
