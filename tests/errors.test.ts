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

  test('surfaces DRF field errors', async () => {
    const client = makeClient();
    server.respond(json(400, { mode: ['This field is required.'] }));
    const err = (await client.proxies.list({ mode: 'direct' }).catch((e: unknown) => e)) as APIError;
    expect(err).toBeInstanceOf(BadRequestError);
    expect(err.fieldErrors).toEqual({ mode: ['This field is required.'] });
    expect(err.detail).toContain('This field is required.');
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
});
