import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import { Webshare, WebshareError } from '../src/index.js';
import { TestServer, page } from './server.js';

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

function makeClient() {
  return new Webshare({ apiKey: 'test-key', baseURL: server.url });
}

describe('pagination', () => {
  test('exposes the raw envelope', async () => {
    const client = makeClient();
    server.respond(
      page([{ id: 1 }, { id: 2 }], { count: 5, next: `${server.url}/api/v2/proxy/ipauthorization/?page=2`, previous: null }),
    );
    const result = await client.ipAuthorizations.list();
    expect(result.count).toBe(5);
    expect(result.results).toHaveLength(2);
    expect(result.previous).toBeNull();
    expect(result.hasNextPage()).toBe(true);
  });

  test('async iteration crosses page boundaries following next verbatim', async () => {
    const client = makeClient();
    server.respond(
      page([{ id: 1 }, { id: 2 }], { count: 5, next: `${server.url}/api/v2/proxy/ipauthorization/?page=2&page_size=2` }),
      page([{ id: 3 }, { id: 4 }], { count: 5, next: `${server.url}/api/v2/proxy/ipauthorization/?page=3&page_size=2` }),
      page([{ id: 5 }], { count: 5, next: null }),
    );
    const ids: number[] = [];
    for await (const key of await client.ipAuthorizations.list({ page_size: 2 })) {
      ids.push(key.id);
    }
    expect(ids).toEqual([1, 2, 3, 4, 5]);
    expect(server.requests).toHaveLength(3);
    // The follow-up requests hit the exact next URLs, verbatim.
    expect(server.requests[1]?.url).toBe('/api/v2/proxy/ipauthorization/?page=2&page_size=2');
    expect(server.requests[2]?.url).toBe('/api/v2/proxy/ipauthorization/?page=3&page_size=2');
    // Auth is still applied when following next URLs.
    expect(server.requests[1]?.headers['authorization']).toBe('Token test-key');
  });

  test('nextPage() fetches the next page; throws when exhausted', async () => {
    const client = makeClient();
    server.respond(
      page([{ id: 1 }], { count: 2, next: `${server.url}/api/v2/proxy/ipauthorization/?page=2` }),
      page([{ id: 2 }], { count: 2, next: null }),
    );
    const first = await client.ipAuthorizations.list();
    const second = await first.nextPage();
    expect(second.results).toEqual([{ id: 2 }]);
    expect(second.hasNextPage()).toBe(false);
    await expect(second.nextPage()).rejects.toBeInstanceOf(WebshareError);
  });

  test('refuses to follow a cross-origin next URL and never sends credentials there', async () => {
    const foreign = await new TestServer().start();
    try {
      const client = makeClient();
      server.respond(page([{ id: 1 }], { count: 2, next: `${foreign.url}/api/v2/proxy/ipauthorization/?page=2` }));
      const first = await client.ipAuthorizations.list();
      expect(first.hasNextPage()).toBe(true);
      await expect(first.nextPage()).rejects.toThrow(WebshareError);
      await expect(first.nextPage()).rejects.toThrow(/cross-origin/);
      expect(foreign.requests).toHaveLength(0);
    } finally {
      await foreign.close();
    }
  });

  test('supports the starting_after variant (proxy activity) with the same Page type', async () => {
    const client = makeClient();
    server.respond(
      page([{ timestamp: 't1' }, { timestamp: 't2' }], {
        count: 3,
        next: `${server.url}/api/v2/proxy/activity/?starting_after=t2&page_size=2`,
      }),
      page([{ timestamp: 't3' }], { count: 3, next: null }),
    );
    const seen: string[] = [];
    for await (const activity of await client.proxyActivity.list({ page_size: 2 })) {
      seen.push(activity.timestamp);
    }
    expect(seen).toEqual(['t1', 't2', 't3']);
    expect(server.requests[1]?.url).toBe('/api/v2/proxy/activity/?starting_after=t2&page_size=2');
  });
});
