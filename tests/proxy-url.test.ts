import { describe, expect, test } from 'vitest';
import { buildProxyUrl, buildProxyListDownloadUrl, WebshareError } from '../src/index.js';

describe('buildProxyUrl', () => {
  test('direct mode with credentials', () => {
    expect(
      buildProxyUrl({ mode: 'direct', username: 'user', password: 'pass', proxyAddress: '1.2.3.4', port: 8168 }),
    ).toBe('http://user:pass@1.2.3.4:8168');
  });

  test('direct mode with IP authorization (no credentials)', () => {
    expect(buildProxyUrl({ mode: 'direct', proxyAddress: '1.2.3.4', port: 8168 })).toBe('http://1.2.3.4:8168');
  });

  test('direct mode requires proxyAddress and port', () => {
    expect(() => buildProxyUrl({ mode: 'direct', username: 'u', password: 'p', port: 80 })).toThrow(WebshareError);
    expect(() => buildProxyUrl({ mode: 'direct', username: 'u', password: 'p', proxyAddress: '1.2.3.4' })).toThrow(
      WebshareError,
    );
  });

  test('backbone with country and sticky session (documented example)', () => {
    expect(
      buildProxyUrl({ mode: 'backbone', username: 'myuser', password: 'password', countryCodes: ['us'], session: 1234 }),
    ).toBe('http://myuser-us-1234:password@p.webshare.io:80');
  });

  test('backbone with city and rotate (documented example)', () => {
    expect(
      buildProxyUrl({
        mode: 'backbone',
        username: 'myuser',
        password: 'password',
        countryCodes: ['us'],
        city: 'los_angeles',
        rotate: true,
      }),
    ).toBe('http://myuser-us-city_los_angeles-rotate:password@p.webshare.io:80');
  });

  test('backbone with country, city and session in the documented order', () => {
    expect(
      buildProxyUrl({
        mode: 'backbone',
        username: 'myuser',
        password: 'password',
        countryCodes: ['de'],
        city: 'munich',
        session: '1234',
      }),
    ).toBe('http://myuser-de-city_munich-1234:password@p.webshare.io:80');
  });

  test('backbone with multiple country codes, lowercased', () => {
    expect(
      buildProxyUrl({ mode: 'backbone', username: 'u', password: 'p', countryCodes: ['US', 'FR', 'de'] }),
    ).toBe('http://u-us-fr-de:p@p.webshare.io:80');
  });

  test('backbone IP-authorization mode (no credentials, custom port)', () => {
    expect(buildProxyUrl({ mode: 'backbone', port: 9999 })).toBe('http://p.webshare.io:9999');
  });

  test('socks5 scheme', () => {
    expect(buildProxyUrl({ mode: 'backbone', scheme: 'socks5', username: 'u', password: 'p', port: 1080 })).toBe(
      'socks5://u:p@p.webshare.io:1080',
    );
  });

  test('percent-encodes credentials', () => {
    expect(buildProxyUrl({ mode: 'direct', username: 'u ser', password: 'p@ss', proxyAddress: '1.2.3.4', port: 80 })).toBe(
      'http://u%20ser:p%40ss@1.2.3.4:80',
    );
  });

  test('rejects session combined with rotate', () => {
    expect(() =>
      buildProxyUrl({ mode: 'backbone', username: 'u', password: 'p', session: 1, rotate: true }),
    ).toThrow(/mutually exclusive/);
  });

  test('rejects non-numeric sessions', () => {
    expect(() => buildProxyUrl({ mode: 'backbone', username: 'u', password: 'p', session: 'abc' })).toThrow(/numeric/);
  });

  test('rejects invalid country codes', () => {
    expect(() => buildProxyUrl({ mode: 'backbone', username: 'u', password: 'p', countryCodes: ['usa'] })).toThrow(
      /country code/,
    );
  });

  test('rejects invalid city names', () => {
    expect(() => buildProxyUrl({ mode: 'backbone', username: 'u', password: 'p', city: 'los angeles' })).toThrow(
      /letters and underscores/,
    );
  });

  test('rejects username without password', () => {
    expect(() => buildProxyUrl({ mode: 'backbone', username: 'u' })).toThrow(/together/);
  });

  test('rejects backbone username params in direct mode', () => {
    expect(() =>
      buildProxyUrl({ mode: 'direct', username: 'u', password: 'p', proxyAddress: '1.2.3.4', port: 80, rotate: true }),
    ).toThrow(/backbone/);
  });

  test('rejects username params in backbone IP-authorization mode', () => {
    expect(() => buildProxyUrl({ mode: 'backbone', countryCodes: ['us'] })).toThrow(/username\/password/);
  });
});

describe('buildProxyListDownloadUrl', () => {
  test('builds the documented path with defaults', () => {
    expect(buildProxyListDownloadUrl({ token: 'abc123' })).toBe(
      'https://proxy.webshare.io/api/v2/proxy/list/download/abc123/-/any/username/direct/-/',
    );
  });

  test('joins country codes with hyphens and adds plan_id', () => {
    expect(
      buildProxyListDownloadUrl({
        token: 'tok',
        country_codes: ['US', 'FR'],
        authentication_method: 'sourceip',
        endpoint_mode: 'backbone',
        search: 'some search',
        plan_id: 12,
      }),
    ).toBe('https://proxy.webshare.io/api/v2/proxy/list/download/tok/US-FR/any/sourceip/backbone/some%20search/?plan_id=12');
  });

  test('supports a custom base URL', () => {
    expect(buildProxyListDownloadUrl({ token: 't', baseURL: 'http://localhost:1234/' })).toBe(
      'http://localhost:1234/api/v2/proxy/list/download/t/-/any/username/direct/-/',
    );
  });

  test('requires a token', () => {
    expect(() => buildProxyListDownloadUrl({ token: '' })).toThrow(WebshareError);
  });
});
