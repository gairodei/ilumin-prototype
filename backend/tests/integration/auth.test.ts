import { SignJWT } from 'jose';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { b64u } from '../support/oidc-issuer.js';
import { createTestContext, type TestContext, type TestUser } from '../support/context.js';

describe('OIDC authentication boundary', () => {
  let ctx: TestContext;
  let user: TestUser;

  beforeAll(async () => {
    ctx = await createTestContext();
    user = await ctx.createUser({ roles: ['teacher'] });
  });
  afterAll(async () => ctx?.close());

  const me = (authorization?: string) =>
    ctx.app.inject({ method: 'GET', url: '/v1/me', headers: authorization ? { authorization } : {} });

  it('accepts a valid provider-signed token and maps it to the application user', async () => {
    const r = await me(`Bearer ${await user.token()}`);
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ id: user.id, email: user.email, roles: [{ role: 'teacher', label: 'Teacher' }], agency: null });
    expect(ctx.issuer.discoveryRequests()).toBeGreaterThan(0);
  });

  it('rejects a request without authentication (401 + WWW-Authenticate)', async () => {
    const r = await me();
    expect(r.statusCode).toBe(401);
    expect(r.headers['www-authenticate']).toBe('Bearer');
    expect(r.json().error.code).toBe('UNAUTHENTICATED');
  });

  it.each([
    ['Basic dXNlcjpwYXNz', 'invalid_request'],
    ['Bearer', 'invalid_request'],
    ['bearer abc.def.ghi extra', 'invalid_request'],
    ['Bearer not-a-jwt', 'invalid_token'],
    ['Bearer a.b.c', 'invalid_token'],
  ])('rejects a malformed Authorization header: %s', async (header, err) => {
    const r = await me(header);
    expect(r.statusCode).toBe(401);
    expect(r.headers['www-authenticate']).toBe(`Bearer error="${err}"`);
  });

  const rejects = async (token: string) => {
    const r = await me(`Bearer ${token}`);
    expect(r.statusCode).toBe(401);
    expect(r.json().error).toMatchObject({ code: 'UNAUTHENTICATED', message: 'The access token is not valid.' });
    expect(r.headers['www-authenticate']).toBe('Bearer error="invalid_token"');
  };

  it('rejects an expired token', async () => {
    const now = Math.floor(Date.now() / 1000);
    await rejects(await ctx.issuer.token(user.subject, {}, { issuedAt: now - 3600, expiresIn: now - 600 }));
  });

  it('accepts a token within the clock tolerance but rejects one beyond it', async () => {
    const now = Math.floor(Date.now() / 1000);
    const slightly = await ctx.issuer.token(user.subject, {}, { issuedAt: now - 600, expiresIn: now - 10 });
    expect((await me(`Bearer ${slightly}`)).statusCode).toBe(200);
    await rejects(await ctx.issuer.token(user.subject, {}, { issuedAt: now - 600, expiresIn: now - 60 }));
  });

  it('rejects a token that is not valid yet (nbf in the future)', async () => {
    await rejects(await ctx.issuer.token(user.subject, {}, { notBefore: Math.floor(Date.now() / 1000) + 600 }));
  });

  it('rejects a token from another issuer', async () => {
    await rejects(await ctx.issuer.token(user.subject, {}, { issuer: 'https://evil.example.com/' }));
  });

  it('rejects a token for another audience', async () => {
    await rejects(await ctx.issuer.token(user.subject, {}, { audience: 'https://another-api.example.com' }));
  });

  it('rejects a token signed with a key that is not in the provider JWKS (forged)', async () => {
    await rejects(await ctx.issuer.forgedToken(user.subject));
  });

  it('rejects a token whose payload was altered after signing', async () => {
    const t = await user.token();
    const [h, , s] = t.split('.');
    const tampered = b64u(JSON.stringify({ iss: ctx.issuer.issuer, aud: ctx.issuer.audience, sub: 'someone-else', exp: 9999999999, iat: 1 }));
    await rejects(`${h}.${tampered}.${s}`);
  });

  it('rejects alg "none" (unsigned) tokens', async () => {
    const h = b64u(JSON.stringify({ alg: 'none', typ: 'JWT' }));
    const p = b64u(JSON.stringify({ iss: ctx.issuer.issuer, aud: ctx.issuer.audience, sub: user.subject, exp: 9999999999, iat: 1 }));
    await rejects(`${h}.${p}.`);
    await rejects(`${h}.${p}.sig`);
  });

  it('rejects HS256 tokens (symmetric algorithm confusion)', async () => {
    const secret = new TextEncoder().encode('a-secret-that-an-attacker-chose-0123456789');
    const t = await new SignJWT({})
      .setProtectedHeader({ alg: 'HS256', kid: 'test-key-1' })
      .setIssuer(ctx.issuer.issuer)
      .setAudience(ctx.issuer.audience)
      .setSubject(user.subject)
      .setIssuedAt()
      .setExpirationTime('5m')
      .sign(secret);
    await rejects(t);
  });

  it('rejects tokens without sub, exp or iat', async () => {
    await rejects(await ctx.issuer.token(user.subject, {}, { omit: ['sub'] }));
    await rejects(await ctx.issuer.token(user.subject, {}, { omit: ['exp'] }));
    await rejects(await ctx.issuer.token(user.subject, {}, { omit: ['iat'] }));
  });

  it('ignores role claims in the token: roles come only from the database', async () => {
    const t = await ctx.issuer.token(user.subject, { roles: ['super_admin'], groups: ['super_admin'], role: 'super_admin' });
    const r = await me(`Bearer ${t}`);
    expect(r.statusCode).toBe(200);
    expect(r.json().roles).toEqual([{ role: 'teacher', label: 'Teacher' }]);
    const admin = await ctx.app.inject({
      method: 'GET',
      url: `/v1/admin/users/${user.id}`,
      headers: { authorization: `Bearer ${t}` },
    });
    expect(admin.statusCode).toBe(403);
  });

  it('ignores identity headers a browser or proxy might send', async () => {
    const r = await ctx.app.inject({
      method: 'GET',
      url: '/v1/me',
      headers: { 'x-user-id': user.id, 'x-role': 'super_admin', 'x-forwarded-user': user.email },
    });
    expect(r.statusCode).toBe(401);
  });

  it('refuses a valid identity that is not linked to an application user (no auto-provisioning)', async () => {
    const t = await ctx.issuer.token('unknown-subject', { email: 'stranger@example.test', email_verified: true });
    const r = await me(`Bearer ${t}`);
    expect(r.statusCode).toBe(403);
    expect(r.json().error.code).toBe('ACCOUNT_NOT_PROVISIONED');
    const n = await ctx.owner.query(`SELECT count(*)::int AS n FROM app_user WHERE email = 'stranger@example.test'`);
    expect(n.rows[0].n).toBe(0);
  });

  it('refuses suspended and deactivated users, and audits the refusal', async () => {
    for (const status of ['suspended', 'deactivated'] as const) {
      const u = await ctx.createUser({ roles: ['finance_admin'], status });
      const r = await me(`Bearer ${await u.token()}`);
      expect(r.statusCode).toBe(403);
      expect(r.json().error.code).toBe('ACCOUNT_INACTIVE');
      const a = await ctx.owner.query(
        `SELECT operation, outcome, actor_user_id, reason, request_id FROM audit_event WHERE actor_user_id = $1`,
        [u.id],
      );
      expect(a.rows).toEqual([
        { operation: 'auth.inactive_account_refused', outcome: 'refused', actor_user_id: u.id, reason: `account ${status}`, request_id: r.headers['x-request-id'] },
      ]);
    }
  });

  it('deactivation takes effect on the very next request', async () => {
    const u = await ctx.createUser({ roles: ['learner'] });
    const token = await u.token();
    expect((await me(`Bearer ${token}`)).statusCode).toBe(200);
    await ctx.owner.query(`UPDATE app_user SET status = 'deactivated', status_reason = 'left' WHERE id = $1`, [u.id]);
    expect((await me(`Bearer ${token}`)).statusCode).toBe(403);
  });

  it('role removal takes effect on the very next request', async () => {
    const u = await ctx.createUser({ roles: ['system_admin'] });
    const target = await ctx.createUser();
    const token = await u.token();
    const get = () => ctx.app.inject({ method: 'GET', url: `/v1/admin/users/${target.id}`, headers: { authorization: `Bearer ${token}` } });
    expect((await get()).statusCode).toBe(200);
    await ctx.owner.query(
      `UPDATE user_role SET revoked_at = now(), revoke_reason = 'test' WHERE user_id = $1 AND role = 'system_admin'`,
      [u.id],
    );
    expect((await get()).statusCode).toBe(403);
  });

  it('fails closed with 503 (not 401) when the identity provider cannot be reached', async () => {
    const local = await createTestContext();
    try {
      const u = await local.createUser();
      const token = await u.token();
      await local.issuer.close(); // provider down before the first verification
      const r = await local.app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${token}` } });
      expect(r.statusCode).toBe(503);
      expect(r.json().error.code).toBe('SERVICE_UNAVAILABLE');
    } finally {
      local.issuer.close = async () => {};
      await local.close();
    }
  });

  it('refuses discovery documents whose issuer does not match exactly', async () => {
    const local = await createTestContext();
    try {
      const u = await local.createUser();
      local.issuer.setDiscoveryIssuer(`${local.issuer.issuer}/`);
      const r = await local.app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${await u.token()}` } });
      expect(r.statusCode).toBe(503);
    } finally {
      await local.close();
    }
  });

  describe('optional linking by provider-verified email', () => {
    it('is off by default', async () => {
      const u = await ctx.createUser({ linkIdentity: false });
      const t = await ctx.issuer.token('new-sub-1', { email: u.email, email_verified: true });
      expect((await me(`Bearer ${t}`)).statusCode).toBe(403);
    });

    it('when enabled, links only verified emails of active, unlinked users, and audits it', async () => {
      const local = await createTestContext({ OIDC_LINK_BY_VERIFIED_EMAIL: 'true' });
      try {
        const u = await local.createUser({ linkIdentity: false, roles: ['learner'] });
        const call = async (sub: string, claims: Record<string, unknown>) =>
          local.app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${await local.issuer.token(sub, claims)}` } });
        expect((await call('s-unverified', { email: u.email, email_verified: false })).statusCode).toBe(403);
        expect((await call('s-verified', { email: u.email.toUpperCase(), email_verified: true })).statusCode).toBe(200);
        // A second identity from the same issuer cannot take over the account.
        expect((await call('s-other', { email: u.email, email_verified: true })).statusCode).toBe(403);
        const links = await local.owner.query(`SELECT subject, link_method FROM user_identity WHERE user_id = $1`, [u.id]);
        expect(links.rows).toEqual([{ subject: 's-verified', link_method: 'verified_email' }]);
        const audit = await local.owner.query(`SELECT operation, actor_type, actor_label FROM audit_event WHERE entity_id = $1`, [u.id]);
        expect(audit.rows).toEqual([{ operation: 'user_identity.linked', actor_type: 'system', actor_label: 'auth.oidc' }]);
        const inactive = await local.createUser({ linkIdentity: false, status: 'deactivated' });
        expect((await call('s-inactive', { email: inactive.email, email_verified: true })).statusCode).toBe(403);
      } finally {
        await local.close();
      }
    });
  });
});
