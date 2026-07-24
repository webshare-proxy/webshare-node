import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { Webshare, WebshareError, APIConnectionTimeoutError, VERSION } from '../src/index.js';
import { TestServer, json, page } from './server.js';

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

describe('client construction', () => {
  test('throws a clear error without any credential', () => {
    const saved = process.env['WEBSHARE_API_KEY'];
    delete process.env['WEBSHARE_API_KEY'];
    try {
      expect(() => new Webshare()).toThrow(WebshareError);
      expect(() => new Webshare()).toThrow(/WEBSHARE_API_KEY/);
    } finally {
      if (saved !== undefined) process.env['WEBSHARE_API_KEY'] = saved;
    }
  });

  test('reads WEBSHARE_API_KEY from the environment', async () => {
    const saved = process.env['WEBSHARE_API_KEY'];
    process.env['WEBSHARE_API_KEY'] = 'env-key';
    try {
      const client = new Webshare({ baseURL: server.url });
      server.respond(json(200, { id: 1 }));
      await client.profile.get();
      expect(server.lastRequest.headers['authorization']).toBe('Token env-key');
    } finally {
      if (saved !== undefined) process.env['WEBSHARE_API_KEY'] = saved;
      else delete process.env['WEBSHARE_API_KEY'];
    }
  });
});

describe('request behavior', () => {
  test('sends the Authorization Token header and User-Agent', async () => {
    const client = makeClient();
    server.respond(json(200, { id: 1 }));
    await client.profile.get();
    const req = server.lastRequest;
    expect(req.headers['authorization']).toBe('Token test-key');
    expect(req.headers['user-agent']).toBe(`webshare-node/${VERSION}`);
    expect(req.headers['accept']).toBe('application/json');
    expect(req.url).toBe('/api/v2/profile/');
  });

  test('calls the credentials provider per request (async provider)', async () => {
    let calls = 0;
    const client = new Webshare({
      baseURL: server.url,
      credentials: async () => {
        calls += 1;
        return `token-${calls}`;
      },
    });
    server.respond(json(200, { id: 1 }), json(200, { id: 1 }));
    await client.profile.get();
    expect(server.lastRequest.headers['authorization']).toBe('Token token-1');
    await client.profile.get();
    expect(server.lastRequest.headers['authorization']).toBe('Token token-2');
    expect(calls).toBe(2);
  });

  test('sends default headers and per-request headers (null removes)', async () => {
    const client = makeClient({ defaultHeaders: { 'X-Custom': 'a', 'X-Removed': 'x' } });
    server.respond(json(200, { id: 1 }));
    await client.profile.get({ headers: { 'X-Per-Request': 'b', 'X-Removed': null } });
    const req = server.lastRequest;
    expect(req.headers['x-custom']).toBe('a');
    expect(req.headers['x-per-request']).toBe('b');
    expect(req.headers['x-removed']).toBeUndefined();
  });

  test('sends X-Subuser and X-Webshare-Federated-Access headers, per-request overriding client', async () => {
    const client = makeClient({ subuserId: 7, federatedUserId: 42 });
    server.respond(json(200, []), json(200, []));
    await client.stats.list();
    expect(server.lastRequest.headers['x-subuser']).toBe('7');
    expect(server.lastRequest.headers['x-webshare-federated-access']).toBe('42');
    await client.stats.list(undefined, { subuserId: 9 });
    expect(server.lastRequest.headers['x-subuser']).toBe('9');
  });

  test('serializes query params: omits unset, booleans as true/false, arrays comma-joined', async () => {
    const client = makeClient();
    server.respond(page([]));
    await client.proxies.list({ mode: 'direct', valid: true, country_code__in: 'FR,US', search: undefined });
    const url = new URL(server.lastRequest.url, server.url);
    expect(url.pathname).toBe('/api/v2/proxy/list/');
    expect(url.searchParams.get('mode')).toBe('direct');
    expect(url.searchParams.get('valid')).toBe('true');
    expect(url.searchParams.get('country_code__in')).toBe('FR,US');
    expect(url.searchParams.has('search')).toBe(false);
  });

  test('times out with APIConnectionTimeoutError', async () => {
    const client = makeClient({ timeout: 100, maxRetries: 0 });
    server.respond(() => {
      /* never respond */
    });
    await expect(client.profile.get()).rejects.toBeInstanceOf(APIConnectionTimeoutError);
  });

  test('per-request timeout overrides the client timeout', async () => {
    const client = makeClient({ timeout: 60_000, maxRetries: 0 });
    server.respond(() => {
      /* never respond */
    });
    await expect(client.profile.get({ timeout: 100 })).rejects.toBeInstanceOf(APIConnectionTimeoutError);
  });

  test('honors an AbortSignal', async () => {
    const client = makeClient({ maxRetries: 0 });
    server.respond(() => {
      /* never respond */
    });
    const controller = new AbortController();
    const promise = client.profile.get({ signal: controller.signal });
    setTimeout(() => controller.abort(), 30);
    await expect(promise).rejects.toThrow(/abort/i);
  });

  test('supports a custom fetch implementation', async () => {
    let used = 0;
    const client = makeClient({
      fetch: (url, init) => {
        used += 1;
        return globalThis.fetch(url, init);
      },
    });
    server.respond(json(200, { id: 1 }));
    await client.profile.get();
    expect(used).toBe(1);
  });
});
