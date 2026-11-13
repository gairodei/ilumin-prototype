import { Writable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, loggerOptions } from '../../src/app/build-app.js';
import { createTestContext, type TestContext } from '../support/context.js';

describe('structured request logging', () => {
  let ctx: TestContext;
  const lines: Record<string, unknown>[] = [];
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeAll(async () => {
    ctx = await createTestContext();
    const stream = new Writable({
      write(chunk, _enc, cb) {
        for (const l of String(chunk).split('\n').filter(Boolean)) lines.push(JSON.parse(l));
        cb();
      },
    });
    app = await buildApp(ctx.services, { logger: { ...(loggerOptions('debug') as object), stream } as never });
    await app.ready();
  });
  afterAll(async () => {
    await app?.close();
    await ctx?.close();
  });

  it('writes one structured line per request with request and correlation ids, and no secrets or personal data', async () => {
    const admin = await ctx.createUser({ roles: ['system_admin'], email: 'private.person@example.test' });
    const token = await admin.token();
    const r = await app.inject({
      method: 'POST',
      url: '/v1/admin/users?debug=secret-query-value',
      headers: { authorization: `Bearer ${token}`, 'idempotency-key': 'log-test-0001', 'x-correlation-id': 'corr-log-1', cookie: 'session=abc' },
      payload: { email: 'another.person@example.test', displayName: 'Another Person' },
    });
    expect(r.statusCode).toBe(201);
    await app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: 'Bearer forged.token.value' } });

    const done = lines.filter((l) => l.msg === 'request completed');
    expect(done[0]).toMatchObject({
      requestId: r.headers['x-request-id'],
      correlationId: 'corr-log-1',
      method: 'POST',
      route: '/v1/admin/users',
      path: '/v1/admin/users',
      status: 201,
      userId: admin.id,
    });
    const all = JSON.stringify(lines);
    for (const secret of [token, 'forged.token.value', 'private.person@example.test', 'another.person@example.test', 'Another Person', 'secret-query-value', 'session=abc']) {
      expect(all).not.toContain(secret);
    }
    expect(lines.some((l) => l.tokenRejected === 'malformed' || l.tokenRejected === 'invalid_signature')).toBe(true);
  });
});
