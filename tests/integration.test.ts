import { describe, expect, test } from 'vitest';
import { Webshare } from '../src/index.js';

const apiKey = process.env['WEBSHARE_API_KEY'];

// Runs against the real API only when WEBSHARE_API_KEY is set.
describe.skipIf(apiKey === undefined || apiKey === '')('integration (real API)', () => {
  test('profile get + proxies list', async () => {
    const client = new Webshare();
    const profile = await client.profile.get();
    expect(typeof profile.id).toBe('number');
    expect(typeof profile.email).toBe('string');

    const proxies = await client.proxies.list({ mode: 'direct', page_size: 5 });
    expect(typeof proxies.count).toBe('number');
    expect(Array.isArray(proxies.results)).toBe(true);
  }, 60_000);
});
