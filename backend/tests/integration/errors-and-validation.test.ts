import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createTestContext, type TestContext, type TestUser } from '../support/context.js';

describe('request validation, error responses and request ids', () => {
  let ctx: TestContext;
  let admin: TestUser;
  let headers: Record<string, string>;

  beforeAll(async () => {
    ctx = await createTestContext({ CORS_ALLOWED_ORIGINS: 'https://lms.example.test', BODY_LIMIT_BYTES: '2048' });
    admin = await ctx.createUser({ roles: ['super_admin'] });
    headers = { ...(await ctx.auth(admin)), 'idempotency-key': 'validation-key-1' };
  });
  afterAll(async () => ctx?.close());

  const errorShape = (body: unknown, code: string) => {
    expect(body).toMatchObject({ error: { code, message: expect.any(String), requestId: expect.stringMatching(/^[0-9a-f-]{36}$/) } });
  };

  it('field errors are listed with their paths (400 VALIDATION_FAILED)', async () => {
    const r = await ctx.app.inject({ method: 'POST', url: '/v1/admin/users', headers, payload: { email: 'not-an-email', displayName: '' } });
    expect(r.statusCode).toBe(400);
    errorShape(r.json(), 'VALIDATION_FAILED');
    expect(r.json().error.details.map((d: { path: string }) => d.path).sort()).toEqual(['body.displayName', 'body.email']);
  });

  it('unknown fields are refused (strict bodies), so typos and smuggled fields never pass silently', async () => {
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/v1/admin/users',
      headers,
      payload: { email: 'x@example.test', displayName: 'X', roles: ['super_admin'] },
    });
    expect(r.statusCode).toBe(400);
    expect(JSON.stringify(r.json().error.details)).toMatch(/roles/);
  });

  it('invalid path parameters are refused before any database access', async () => {
    const r = await ctx.app.inject({ method: 'GET', url: '/v1/admin/users/not-a-uuid', headers: await ctx.auth(admin) });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.details[0]).toEqual({ path: 'params.userId', message: 'must be a UUID' });
  });

  it('authentication comes before validation (no schema probing without a token)', async () => {
    const r = await ctx.app.inject({ method: 'POST', url: '/v1/admin/users', payload: { nonsense: true } });
    expect(r.statusCode).toBe(401);
    const bad = await ctx.app.inject({ method: 'GET', url: '/v1/admin/users/not-a-uuid' });
    expect(bad.statusCode).toBe(401);
  });

  it('authorization comes before body validation', async () => {
    const learner = await ctx.createUser({ roles: ['learner'] });
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/v1/admin/users',
      headers: { ...(await ctx.auth(learner)), 'idempotency-key': 'learner-attempt-1' },
      payload: { nonsense: true },
    });
    expect(r.statusCode).toBe(403);
  });

  it('malformed JSON → 400 MALFORMED_REQUEST', async () => {
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/v1/admin/users',
      headers: { ...headers, 'content-type': 'application/json' },
      payload: '{"email": ',
    });
    expect(r.statusCode).toBe(400);
    errorShape(r.json(), 'MALFORMED_REQUEST');
  });

  it('non-JSON bodies → 415', async () => {
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/v1/admin/users',
      headers: { ...headers, 'content-type': 'text/plain' },
      payload: 'email=x',
    });
    expect(r.statusCode).toBe(415);
    errorShape(r.json(), 'UNSUPPORTED_MEDIA_TYPE');
  });

  it('oversized bodies → 413', async () => {
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/v1/admin/users',
      headers,
      payload: { email: 'big@example.test', displayName: 'x'.repeat(5000) },
    });
    expect(r.statusCode).toBe(413);
    errorShape(r.json(), 'PAYLOAD_TOO_LARGE');
  });

  it('not found → 404 with the standard shape', async () => {
    const r = await ctx.app.inject({ method: 'GET', url: '/v1/admin/users/99999999-9999-4999-8999-999999999999', headers: await ctx.auth(admin) });
    expect(r.statusCode).toBe(404);
    errorShape(r.json(), 'NOT_FOUND');
  });

  it('unexpected errors → 500 with no internal detail', async () => {
    const original = ctx.pool.query.bind(ctx.pool);
    ctx.pool.query = (async (...args: Parameters<typeof original>) => {
      const sql = String(args[0]);
      if (sql.includes('FROM app_user WHERE id')) throw new Error('relation "secret_internal_table" does not exist');
      return original(...args);
    }) as typeof ctx.pool.query;
    try {
      const r = await ctx.app.inject({ method: 'GET', url: `/v1/admin/users/${admin.id}`, headers: await ctx.auth(admin) });
      expect(r.statusCode).toBe(500);
      errorShape(r.json(), 'INTERNAL');
      expect(r.body).not.toContain('secret_internal_table');
    } finally {
      ctx.pool.query = original;
    }
  });

  it('every response carries a server-generated request id and the caller’s correlation id', async () => {
    const r = await ctx.app.inject({ method: 'GET', url: '/health/live', headers: { 'x-request-id': 'spoofed', 'x-correlation-id': 'trace-abc-123' } });
    expect(r.headers['x-request-id']).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.headers['x-correlation-id']).toBe('trace-abc-123');
    const unsafe = await ctx.app.inject({ method: 'GET', url: '/health/live', headers: { 'x-correlation-id': 'bad id\twith<chars>' } });
    expect(unsafe.headers['x-correlation-id']).toBe(unsafe.headers['x-request-id']);
  });

  it('security headers are set on API responses', async () => {
    const r = await ctx.app.inject({ method: 'GET', url: '/health/live' });
    expect(r.headers['cache-control']).toBe('no-store');
    expect(r.headers['x-content-type-options']).toBe('nosniff');
    expect(r.headers['x-frame-options']).toBe('DENY');
    expect(r.headers['content-security-policy']).toContain("default-src 'none'");
  });

  it('CORS allows only the configured exact origin', async () => {
    const ok = await ctx.app.inject({
      method: 'OPTIONS',
      url: '/v1/me',
      headers: { origin: 'https://lms.example.test', 'access-control-request-method': 'GET' },
    });
    expect(ok.headers['access-control-allow-origin']).toBe('https://lms.example.test');
    const evil = await ctx.app.inject({
      method: 'OPTIONS',
      url: '/v1/me',
      headers: { origin: 'https://evil.example.test', 'access-control-request-method': 'GET' },
    });
    expect(evil.headers['access-control-allow-origin']).toBeUndefined();
  });
});
