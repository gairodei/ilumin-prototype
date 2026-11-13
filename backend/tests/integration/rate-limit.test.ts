import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DbRateLimiter } from '../../src/shared/rate-limit.js';
import { createTestContext, sessionEnv, type TestContext } from '../support/context.js';
import { callback, startLogin } from '../support/session.js';

/** Rate limiting on real PostgreSQL (shared counters) and the in-process general limiter. */
describe('rate limiting', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext((issuer) =>
      sessionEnv(issuer, {
        RATE_LIMIT_LOGIN: '3/60',
        RATE_LIMIT_CALLBACK_FAILURES: '2/900',
        RATE_LIMIT_SENSITIVE: '2/60',
        RATE_LIMIT_API: '5/60',
      }),
    );
  });
  afterAll(async () => ctx?.close());

  const loginFrom = (remoteAddress: string, headers: Record<string, string> = {}) =>
    ctx.app.inject({ method: 'GET', url: '/v1/auth/login', remoteAddress, headers });

  it('limits sign-in initiation per client IP with a consistent 429 and Retry-After', async () => {
    const codes = [];
    for (let i = 0; i < 4; i++) codes.push((await loginFrom('192.0.2.10')).statusCode);
    expect(codes).toEqual([302, 302, 302, 429]);
    const r = await loginFrom('192.0.2.10');
    expect(r.statusCode).toBe(429);
    expect(r.json().error.code).toBe('RATE_LIMITED');
    expect(Number(r.headers['retry-after'])).toBeGreaterThan(0);
    // Another client is unaffected.
    expect((await loginFrom('192.0.2.11')).statusCode).toBe(302);
  });

  it('does not trust a spoofed X-Forwarded-For when TRUST_PROXY=false', async () => {
    const codes = [];
    for (let i = 0; i < 5; i++) {
      codes.push((await loginFrom('192.0.2.20', { 'x-forwarded-for': `203.0.113.${i}` })).statusCode);
    }
    expect(codes).toEqual([302, 302, 302, 429, 429]);
  });

  it('counts in PostgreSQL, so every API instance shares the same limit', async () => {
    const other = new DbRateLimiter(ctx.pool); // a second "instance" with its own limiter object
    for (let i = 0; i < 3; i++) await other.hit('login:ip:192.0.2.30', ctx.config.rateLimits.login);
    expect((await loginFrom('192.0.2.30')).statusCode).toBe(429);
    // Keys are stored hashed: no client IP in clear.
    const raw = await ctx.owner.query(`SELECT encode(key_hash, 'escape') AS k FROM rate_limit_counter`);
    expect(JSON.stringify(raw.rows)).not.toContain('192.0.2.30');
  });

  it('limits sign-in callback failures per IP; once reached, even a valid callback is refused until the window ends', async () => {
    const user = await ctx.createUser({ roles: ['teacher'] });
    const ip = '192.0.2.40';
    let n = 0;
    const fresh = () => startLogin(ctx, '', {}, `198.18.0.${++n}`); // sign-in starts from distinct addresses
    const bad = async () => {
      const s = await fresh();
      return ctx.app.inject({ method: 'GET', url: `/v1/auth/callback?code=x&state=${s.state}`, remoteAddress: ip });
    };
    expect((await bad()).statusCode).toBe(400);
    expect((await bad()).statusCode).toBe(400);
    expect((await bad()).statusCode).toBe(429);
    const s = await fresh();
    const code = ctx.issuer.issueCode({
      sub: user.subject,
      nonce: s.nonce,
      codeChallenge: s.codeChallenge,
      redirectUri: ctx.config.auth.session!.redirectUri,
    });
    const blocked = await ctx.app.inject({
      method: 'GET',
      url: `/v1/auth/callback?code=${code}&state=${s.state}`,
      remoteAddress: ip,
      headers: { cookie: `${ctx.config.auth.session!.cookie.loginName}=${s.verifier}` },
    });
    expect(blocked.statusCode).toBe(429);
    // Successful callbacks from other addresses are not counted as failures.
    expect((await callback(ctx, await fresh(), user)).statusCode).toBe(303);
  });

  it('limits sensitive account operations per user, across requests, with 429', async () => {
    const admin = await ctx.createUser({ roles: ['system_admin'] });
    const provision = async (n: number) =>
      ctx.app.inject({
        method: 'POST',
        url: '/v1/admin/users',
        headers: { authorization: `Bearer ${await admin.token()}`, 'idempotency-key': `rl-sensitive-${n}` },
        payload: { email: `rl${n}.${Math.random().toString(36).slice(2, 7)}@example.test`, displayName: `RL ${n}` },
      });
    const codes = [(await provision(1)).statusCode, (await provision(2)).statusCode, (await provision(3)).statusCode];
    expect(codes).toEqual([201, 201, 429]);
    const n = (await ctx.owner.query(`SELECT count(*)::int AS n FROM app_user WHERE display_name LIKE 'RL %'`)).rows[0].n;
    expect(n).toBe(2); // the limited request wrote nothing
  });

  it('limits general authenticated API requests per user (per instance)', async () => {
    const u = await ctx.createUser({ roles: ['teacher'] });
    const token = await u.token();
    const codes = [];
    for (let i = 0; i < 6; i++) {
      codes.push((await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${token}` } })).statusCode);
    }
    expect(codes).toEqual([200, 200, 200, 200, 200, 429]);
    const other = await ctx.createUser({ roles: ['teacher'] });
    const r = await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${await other.token()}` } });
    expect(r.statusCode).toBe(200);
  });
});

describe('rate limiting behind a trusted proxy', () => {
  it('uses X-Forwarded-For only from the configured proxy address', async () => {
    const ctx = await createTestContext((issuer) => sessionEnv(issuer, { RATE_LIMIT_LOGIN: '1/60', TRUST_PROXY: '10.0.0.1' }));
    try {
      const via = (remoteAddress: string, xff: string) =>
        ctx.app.inject({ method: 'GET', url: '/v1/auth/login', remoteAddress, headers: { 'x-forwarded-for': xff } });
      // Through the trusted proxy: distinct clients are distinct keys.
      expect((await via('10.0.0.1', '198.51.100.1')).statusCode).toBe(302);
      expect((await via('10.0.0.1', '198.51.100.2')).statusCode).toBe(302);
      expect((await via('10.0.0.1', '198.51.100.1')).statusCode).toBe(429);
      // From an untrusted peer the header is ignored: the peer address is the key.
      expect((await via('192.0.2.99', '198.51.100.3')).statusCode).toBe(302);
      expect((await via('192.0.2.99', '198.51.100.4')).statusCode).toBe(429);
    } finally {
      await ctx.close();
    }
  });
});
