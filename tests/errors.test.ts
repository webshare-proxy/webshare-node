import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';
import {
  Webshare,
  APIError,
  BadRequestError,
  AuthenticationError,
  PermissionDeniedError,
  NotFoundError,
  RateLimitError,
  InternalServerError,
  ResponseDecodeError,
} from '../src/index.js';
import { TestServer, json, text } from './server.js';

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
  return new Webshare({ apiKey: 'test-key', baseURL: server.url, maxRetries: 0 });
}

describe('error mapping', () => {
  test.each([
    [400, BadRequestError],
    [401, AuthenticationError],
    [403, PermissionDeniedError],
    [404, NotFoundError],
    [429, RateLimitError],
    [500, InternalServerError],
    [502, InternalServerError],
  ])('maps %i to the right class', async (status, cls) => {
    const client = makeClient();
    server.respond(json(status, { detail: 'nope' }));
    const err = await client.profile.get().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(cls);
    expect((err as APIError).status).toBe(status);
    expect((err as APIError).detail).toBe('nope');
  });

  test('unmapped statuses fall back to APIError', async () => {
    const client = makeClient();
    server.respond(json(418, { detail: 'teapot' }));
    const err = await client.profile.get().catch((e: unknown) => e);
    expect(err).toBeInstanceOf(APIError);
    expect(err).not.toBeInstanceOf(BadRequestError);
    expect((err as APIError).status).toBe(418);
  });

  test('surfaces DRF field errors (documented list-of-strings shape)', async () => {
    const client = makeClient();
    server.respond(json(400, { mode: ['This field is required.'] }));
    const err = (await client.proxies.list({ mode: 'direct' }).catch((e: unknown) => e)) as APIError;
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.fieldErrors).toEqual({ mode: ['This field is required.'] });
    expect(err.detail).toContain('This field is required.');
  });

  test('surfaces field errors in the live list-of-objects shape', async () => {
    const client = makeClient();
    // Verbatim shape returned by the real API.
    server.respond(json(400, { mode: [{ message: 'This field is required.', code: 'required' }] }));
    const err = (await client.proxies.list({ mode: 'direct' }).catch((e: unknown) => e)) as APIError;
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.fieldErrors).toEqual({ mode: ['This field is required.'] });
    expect(err.detail).toContain('This field is required.');
    expect(err.body).toEqual({ mode: [{ message: 'This field is required.', code: 'required' }] });
  });

  test('accepts mixed string/object field-error lists', async () => {
    const client = makeClient();
    server.respond(
      json(400, { password: ['Too short.', { message: 'Too common.', code: 'password_too_common' }] }),
    );
    const err = (await client.profile.get().catch((e: unknown) => e)) as APIError;
    expect(err.fieldErrors).toEqual({ password: ['Too short.', 'Too common.'] });
  });

  test('requestID is null when no X-Request-ID header is present', async () => {
    const client = makeClient();
    server.respond(json(404, { detail: 'Not found.' }));
    const err = (await client.profile.get().catch((e: unknown) => e)) as APIError;
    expect(err.requestID).toBeNull();
  });

  test('surfaces the API error code (e.g. 2fa_needed) and X-Request-ID', async () => {
    const client = makeClient();
    server.respond(
      json(403, { detail: 'Two factor authentication is needed.', code: '2fa_needed' }, { 'x-request-id': 'req-123' }),
    );
    const err = (await client.profile.get().catch((e: unknown) => e)) as APIError;
    expect(err).toBeInstanceOf(PermissionDeniedError);
    expect(err.code).toBe('2fa_needed');
    expect(err.requestID).toBe('req-123');
    expect(err.detail).toBe('Two factor authentication is needed.');
  });

  test('tolerates non-JSON error bodies (raw text becomes detail)', async () => {
    const client = makeClient();
    server.respond(text(502, '<html>Bad gateway</html>'));
    const err = (await client.profile.get().catch((e: unknown) => e)) as APIError;
    expect(err).toBeInstanceOf(InternalServerError);
    expect(err.detail).toBe('<html>Bad gateway</html>');
    expect(err.body).toBe('<html>Bad gateway</html>');
  });

  test('tolerates bare JSON string bodies', async () => {
    const client = makeClient();
    server.respond(json(400, 'plain message'));
    const err = (await client.profile.get().catch((e: unknown) => e)) as APIError;
    expect(err.detail).toBe('plain message');
  });

  test('keeps the raw parsed body', async () => {
    const client = makeClient();
    server.respond(json(400, { detail: 'nope', extra: 1 }));
    const err = (await client.profile.get().catch((e: unknown) => e)) as APIError;
    expect(err.body).toEqual({ detail: 'nope', extra: 1 });
  });

  test('exposes retryAfter (seconds) on non-retried errors', async () => {
    const client = makeClient();
    server.respond(json(429, { detail: 'Request was throttled.' }, { 'retry-after': '7' }));
    const err = (await client.ipAuthorizations.create({ ip_address: '1.2.3.4' }).catch((e: unknown) => e)) as APIError;
    expect(err).toBeInstanceOf(RateLimitError);
    expect(err.retryAfter).toBe(7);
  });

  test('parses HTTP-date Retry-After values into positive seconds', async () => {
    const client = makeClient();
    const future = new Date(Date.now() + 30_000).toUTCString();
    server.respond(json(429, { detail: 'throttled' }, { 'retry-after': future }));
    const err = (await client.ipAuthorizations.create({ ip_address: '1.2.3.4' }).catch((e: unknown) => e)) as APIError;
    expect(err.retryAfter).toBeGreaterThan(20);
    expect(err.retryAfter).toBeLessThanOrEqual(30);
  });

  test.each([
    ['   ', 'whitespace'],
    ['-5', 'negative'],
    ['soon', 'unparseable'],
    [new Date(Date.now() - 60_000).toUTCString(), 'past HTTP-date'],
  ])('treats Retry-After %j (%s) as absent', async (headerValue) => {
    const client = makeClient();
    server.respond(json(429, { detail: 'throttled' }, { 'retry-after': headerValue }));
    const err = (await client.ipAuthorizations.create({ ip_address: '1.2.3.4' }).catch((e: unknown) => e)) as APIError;
    expect(err.retryAfter).toBeNull();
  });

  test('caps the captured error body at 1 MiB and detail at 2 KB', async () => {
    const client = makeClient();
    server.respond(text(400, 'x'.repeat(1_500_000)));
    const err = (await client.profile.get().catch((e: unknown) => e)) as APIError;
    expect(err).toBeInstanceOf(BadRequestError);
    expect((err.body as string).length).toBe(1024 * 1024);
    expect(err.detail.length).toBe(2048);
    expect(err.message.length).toBeLessThan(3000);
  });

  test('truncates a long JSON detail to 2 KB', async () => {
    const client = makeClient();
    server.respond(json(400, { detail: 'd'.repeat(10_000) }));
    const err = (await client.profile.get().catch((e: unknown) => e)) as APIError;
    expect(err.detail.length).toBe(2048);
    expect((err.body as { detail: string }).detail.length).toBe(10_000);
  });
});

describe('success-path decode failures', () => {
  test('a 2xx with a non-JSON body throws ResponseDecodeError, not a SyntaxError', async () => {
    const client = makeClient();
    server.respond(text(200, '<html>maintenance page</html>'));
    const err = (await client.profile.get().catch((e: unknown) => e)) as ResponseDecodeError;
    expect(err).toBeInstanceOf(ResponseDecodeError);
    expect(err).not.toBeInstanceOf(SyntaxError);
    expect(err.status).toBe(200);
    expect(err.bodyText).toContain('<html>');
  });

  test('a malformed pagination envelope throws ResponseDecodeError', async () => {
    const client = makeClient();
    server.respond(json(200, { unexpected: 'shape' }));
    const err = (await client.notifications.list().catch((e: unknown) => e)) as ResponseDecodeError;
    expect(err).toBeInstanceOf(ResponseDecodeError);
    expect(err.message).toContain('pagination envelope');
  });

  test('decode failures are not retried', async () => {
    const client = new Webshare({ apiKey: 'test-key', baseURL: server.url, maxRetries: 2 });
    server.respond(text(200, 'not json'));
    await expect(client.profile.get()).rejects.toBeInstanceOf(ResponseDecodeError);
    expect(server.requests).toHaveLength(1);
  });
});
