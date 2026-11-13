import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { API_ORIGIN, APP_ORIGIN, createTestContext, sessionEnv, type TestContext, type TestUser } from '../support/context.js';
import { callback, cookieFrom, login, setCookieLine, startLogin, writeHeaders } from '../support/session.js';

/**
 * Browser sign-in (authorization code + PKCE, backend-managed sessions) against the local test issuer and a real
 * PostgreSQL database. Time-dependent cases move the stored timestamps with the owner connection; validity is always
 * decided by the database clock.
 */
describe('browser sessions (OIDC code + PKCE, BFF)', () => {
  let ctx: TestContext;
  let user: TestUser;
  let admin: TestUser;
  const name = () => ctx.config.auth.session!.cookie.sessionName;
  const loginName = () => ctx.config.auth.session!.cookie.loginName;
  const sessionGet = (cookie?: string, url = '/v1/me') =>
    ctx.app.inject({ method: 'GET', url, headers: cookie ? { cookie } : {} });
  const countAudit = async (operation: string) =>
    (await ctx.owner.query(`SELECT count(*)::int AS n FROM audit_event WHERE operation = $1`, [operation])).rows[0].n as number;
  const lastFailure = async () =>
    (await ctx.owner.query(`SELECT reason FROM audit_event WHERE operation = 'auth.login_failed' ORDER BY seq DESC LIMIT 1`)).rows[0]
      ?.reason as string | undefined;

  beforeAll(async () => {
    ctx = await createTestContext((issuer) => sessionEnv(issuer));
    user = await ctx.createUser({ roles: ['teacher'] });
    admin = await ctx.createUser({ roles: ['system_admin'] });
  });
  afterAll(async () => ctx?.close());

  describe('login and callback', () => {
    it('login redirects to the provider with state, nonce and an S256 PKCE challenge, and sets a short-lived login cookie', async () => {
      const s = await startLogin(ctx);
      expect(s.authorize.origin + s.authorize.pathname).toBe(`${ctx.issuer.issuer}/authorize`);
      const q = s.authorize.searchParams;
      expect(q.get('response_type')).toBe('code');
      expect(q.get('client_id')).toBe(ctx.issuer.clientId);
      expect(q.get('redirect_uri')).toBe(`${API_ORIGIN}/v1/auth/callback`);
      expect(q.get('code_challenge_method')).toBe('S256');
      expect(q.get('scope')).toContain('openid');
      expect(s.state).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(s.nonce).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(s.state).not.toBe(s.nonce);
      const line = setCookieLine(s.res, loginName())!;
      expect(line).toMatch(/HttpOnly/);
      expect(line).toMatch(/Secure/);
      expect(line).toMatch(/SameSite=Lax/);
      expect(line).toMatch(/Max-Age=600/);
      expect(loginName()).toBe('__Host-ilumin_login');
      // The database holds hashes and the challenge only — never the state, nonce or verifier themselves.
      const row = (await ctx.owner.query(`SELECT * FROM auth_login_attempt ORDER BY created_at DESC LIMIT 1`)).rows[0];
      expect(row.code_challenge).toBe(s.codeChallenge);
      expect(JSON.stringify(row)).not.toContain(s.verifier);
      expect(JSON.stringify(row)).not.toContain(s.state);
    });

    it('a successful callback creates a session (HttpOnly, Secure, SameSite, __Host-) and redirects to the requested page', async () => {
      const s = await startLogin(ctx, `?returnTo=${encodeURIComponent(`${APP_ORIGIN}/courses?x=1#frag`)}`);
      const r = await callback(ctx, s, user);
      expect(r.statusCode).toBe(303);
      expect(r.headers.location).toBe(`${APP_ORIGIN}/courses?x=1`);
      const line = setCookieLine(r, name())!;
      expect(name()).toBe('__Host-ilumin_session');
      for (const attr of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/']) expect(line).toContain(attr);
      expect(line).not.toMatch(/Domain=/);
      expect(setCookieLine(r, loginName())).toMatch(/Max-Age=0/); // login cookie cleared
      const secret = cookieFrom(r, name())!;
      const me = await sessionGet(`${name()}=${secret}`);
      expect(me.statusCode).toBe(200);
      expect(me.json().id).toBe(user.id);
      const stored = (await ctx.owner.query(`SELECT secret_hash FROM auth_session WHERE user_id = $1`, [user.id])).rows;
      expect(stored.length).toBeGreaterThan(0);
      expect(JSON.stringify(stored)).not.toContain(secret);
      expect(await countAudit('auth.login')).toBeGreaterThan(0);
    });

    it('the session endpoint returns the CSRF token and expiries, never provider tokens', async () => {
      const s = await login(ctx, user);
      const r = await sessionGet(s.cookie, '/v1/auth/session');
      expect(r.statusCode).toBe(200);
      const b = r.json();
      expect(b.csrfToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(Date.parse(b.session.absoluteExpiresAt)).toBeGreaterThan(Date.now());
      expect(r.body).not.toMatch(/opaque-access-token|id_token|eyJ/);
    });

    it('refuses an unknown or tampered state (and audits the reason)', async () => {
      const s = await startLogin(ctx);
      const r = await callback(ctx, s, user, { state: 'A'.repeat(43) });
      expect(r.statusCode).toBe(400);
      expect(r.json().error.code).toBe('LOGIN_FAILED');
      expect(await lastFailure()).toBe('unknown_state');
      expect(setCookieLine(r, name())).toBeUndefined();
    });

    it('refuses a callback without the login cookie (another browser / login CSRF)', async () => {
      const s = await startLogin(ctx);
      const r = await callback(ctx, s, user, { verifier: null });
      expect(r.statusCode).toBe(400);
      expect(await lastFailure()).toBe('login_cookie_missing');
    });

    it('refuses a callback whose PKCE verifier cookie does not match the challenge', async () => {
      const s = await startLogin(ctx);
      const r = await callback(ctx, s, user, { verifier: 'B'.repeat(43) });
      expect(r.statusCode).toBe(400);
      expect(await lastFailure()).toBe('login_binding_mismatch');
    });

    it('refuses when the provider rejects the PKCE verifier (code issued for another challenge)', async () => {
      const s = await startLogin(ctx);
      const r = await callback(ctx, s, user, { issue: { codeChallenge: 'C'.repeat(43) } });
      expect(r.statusCode).toBe(400);
      expect(await lastFailure()).toBe('code_rejected');
    });

    it('refuses an ID token with the wrong nonce', async () => {
      const s = await startLogin(ctx);
      const r = await callback(ctx, s, user, { issue: { nonce: 'not-the-nonce' } });
      expect(r.statusCode).toBe(400);
      expect(await lastFailure()).toBe('nonce_mismatch');
    });

    it.each([
      ['another issuer', { issuer: 'https://evil.example.com/' }],
      ['another audience (client id)', { audience: 'someone-else' }],
      ['a forged signature', { forged: true }],
    ])('refuses an ID token from %s', async (_label, idToken) => {
      const s = await startLogin(ctx);
      const r = await callback(ctx, s, user, { issue: { idToken } });
      expect(r.statusCode).toBe(400);
      expect(await lastFailure()).toBe('id_token_invalid');
    });

    it('refuses an expired ID token', async () => {
      const now = Math.floor(Date.now() / 1000);
      const s = await startLogin(ctx);
      const r = await callback(ctx, s, user, { issue: { idToken: { issuedAt: now - 3600, expiresIn: now - 600 } } });
      expect(r.statusCode).toBe(400);
      expect(await lastFailure()).toBe('id_token_expired');
    });

    it('refuses a callback whose "iss" parameter names another issuer (RFC 9207 mix-up defence)', async () => {
      const s = await startLogin(ctx);
      const r = await callback(ctx, s, user, { extraQuery: '&iss=https%3A%2F%2Fevil.example.com%2F' });
      expect(r.statusCode).toBe(400);
      expect(await lastFailure()).toBe('issuer_mismatch');
    });

    it('refuses an expired login attempt (database clock)', async () => {
      const s = await startLogin(ctx);
      await ctx.owner.query(
        `UPDATE auth_login_attempt SET created_at = now() - interval '2 hours', expires_at = now() - interval '1 hour'
          WHERE code_challenge = $1`,
        [s.codeChallenge],
      );
      const r = await callback(ctx, s, user);
      expect(r.statusCode).toBe(400);
      expect(await lastFailure()).toBe('login_expired');
    });

    it('a replayed callback (same state and code) is refused and creates no second session', async () => {
      const s = await startLogin(ctx);
      const code = ctx.issuer.issueCode({
        sub: user.subject,
        nonce: s.nonce,
        codeChallenge: s.codeChallenge,
        redirectUri: ctx.config.auth.session!.redirectUri,
      });
      const before = (await ctx.owner.query(`SELECT count(*)::int AS n FROM auth_session`)).rows[0].n;
      expect((await callback(ctx, s, user, { code })).statusCode).toBe(303);
      const again = await callback(ctx, s, user, { code });
      expect(again.statusCode).toBe(400);
      expect(await lastFailure()).toBe('state_already_used');
      expect((await ctx.owner.query(`SELECT count(*)::int AS n FROM auth_session`)).rows[0].n).toBe(before + 1);
    });

    it('a provider error on the callback is a plain failure', async () => {
      const s = await startLogin(ctx);
      const r = await ctx.app.inject({
        method: 'GET',
        url: `/v1/auth/callback?error=access_denied&state=${s.state}`,
        headers: { cookie: `${loginName()}=${s.verifier}` },
      });
      expect(r.statusCode).toBe(400);
      expect(await lastFailure()).toBe('provider_error');
    });

    it('an identity that is not provisioned, or an inactive account, gets the same generic answer (no enumeration)', async () => {
      const stranger = { id: 'x', email: 'x', subject: 'never-provisioned', token: async () => '' };
      const s1 = await startLogin(ctx);
      const r1 = await callback(ctx, s1, stranger);
      const suspended = await ctx.createUser({ roles: ['teacher'], status: 'suspended' });
      const s2 = await startLogin(ctx);
      const r2 = await callback(ctx, s2, suspended);
      expect(r1.statusCode).toBe(400);
      expect(r2.statusCode).toBe(400);
      expect(r1.json().error.message).toBe(r2.json().error.message);
      expect(r1.json().error.code).toBe('LOGIN_FAILED');
      expect(await lastFailure()).toBe('account_inactive');
    });

    it.each([
      ['an origin that is not allow-listed', 'https://evil.example.com/'],
      ['a scheme-relative URL', '//evil.example.com/x'],
      ['a relative path', '/dashboard'],
      ['a javascript: URL', 'javascript:alert(1)'],
      ['credentials in the URL', `https://user:pw@app.ilumin.test/`],
      ['a look-alike host', 'https://app.ilumin.test.evil.example.com/'],
      ['a backslash trick', 'https:\\\\evil.example.com'],
    ])('refuses returnTo with %s (strict redirect allow-list)', async (_label, target) => {
      const r = await ctx.app.inject({ method: 'GET', url: `/v1/auth/login?returnTo=${encodeURIComponent(target)}` });
      expect(r.statusCode).toBe(400);
      expect(r.headers.location).toBeUndefined();
    });

    it('session fixation: a session cookie presented at sign-in is revoked, and a fresh secret is issued', async () => {
      const old = await login(ctx, user);
      const s = await startLogin(ctx);
      const r = await callback(ctx, s, user, { extraCookie: old.cookie });
      expect(r.statusCode).toBe(303);
      const fresh = cookieFrom(r, name())!;
      expect(fresh).not.toBe(old.secret);
      expect((await sessionGet(old.cookie)).statusCode).toBe(401);
      expect((await sessionGet(`${name()}=${fresh}`)).statusCode).toBe(200);
      // An attacker-chosen value is never accepted as a session.
      expect((await sessionGet(`${name()}=${'D'.repeat(43)}`)).statusCode).toBe(401);
    });
  });

  describe('session lifecycle', () => {
    it('missing or malformed cookies are refused with 401, and an invalid cookie is cleared', async () => {
      expect((await sessionGet()).statusCode).toBe(401);
      const r = await sessionGet(`${name()}=not-a-session`);
      expect(r.statusCode).toBe(401);
      expect(setCookieLine(r, name())).toMatch(/Max-Age=0/);
      // Cookie-only API: no Bearer challenge is advertised when bearer is disabled (checked separately), but here bearer
      // is enabled in the test environment as well, so the challenge is present.
      expect(r.headers['www-authenticate']).toBe('Bearer');
    });

    it('idle expiry ends the session (database clock)', async () => {
      const s = await login(ctx, user);
      await ctx.owner.query(
        `UPDATE auth_session SET last_seen_at = now() - interval '2 hours', idle_expires_at = now() - interval '1 second'
          WHERE id = (SELECT id FROM auth_session ORDER BY created_at DESC LIMIT 1)`,
      );
      expect((await sessionGet(s.cookie)).statusCode).toBe(401);
    });

    it('absolute expiry ends the session even when it is in active use', async () => {
      const s = await login(ctx, user);
      await ctx.owner.query(
        `UPDATE auth_session SET created_at = now() - interval '13 hours', absolute_expires_at = now() - interval '1 second',
                idle_expires_at = now() - interval '1 second'
          WHERE id = (SELECT id FROM auth_session ORDER BY created_at DESC LIMIT 1)`,
      );
      expect((await sessionGet(s.cookie)).statusCode).toBe(401);
    });

    it('activity extends the idle expiry (throttled to one write per minute)', async () => {
      const s = await login(ctx, user);
      const id = (await ctx.owner.query(`SELECT id FROM auth_session ORDER BY created_at DESC LIMIT 1`)).rows[0].id;
      await ctx.owner.query(
        `UPDATE auth_session SET last_seen_at = now() - interval '5 minutes', idle_expires_at = now() + interval '1 minute' WHERE id = $1`,
        [id],
      );
      expect((await sessionGet(s.cookie)).statusCode).toBe(200);
      const after = (await ctx.owner.query(`SELECT idle_expires_at > now() + interval '25 minutes' AS extended FROM auth_session WHERE id = $1`, [id]))
        .rows[0];
      expect(after.extended).toBe(true);
    });

    it('rotation: a due session gets a new secret; the old one works only during the grace period', async () => {
      const s = await login(ctx, user);
      const id = (await ctx.owner.query(`SELECT id FROM auth_session ORDER BY created_at DESC LIMIT 1`)).rows[0].id;
      await ctx.owner.query(`UPDATE auth_session SET rotated_at = now() - interval '20 minutes' WHERE id = $1`, [id]);
      const r = await sessionGet(s.cookie);
      expect(r.statusCode).toBe(200);
      const next = cookieFrom(r, name())!;
      expect(next).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(next).not.toBe(s.secret);
      expect(r.headers['x-csrf-token']).toMatch(/^[A-Za-z0-9_-]{43}$/);
      expect(r.headers['x-csrf-token']).not.toBe(s.csrfToken);
      expect((await sessionGet(s.cookie)).statusCode).toBe(200); // grace period
      expect((await sessionGet(`${name()}=${next}`)).statusCode).toBe(200);
      await ctx.owner.query(`UPDATE auth_session SET previous_valid_until = now() - interval '1 second' WHERE id = $1`, [id]);
      expect((await sessionGet(s.cookie)).statusCode).toBe(401);
      expect((await sessionGet(`${name()}=${next}`)).statusCode).toBe(200);
    });

    it('concurrent requests at rotation time: exactly one rotation wins and every request succeeds', async () => {
      const s = await login(ctx, user);
      const id = (await ctx.owner.query(`SELECT id FROM auth_session ORDER BY created_at DESC LIMIT 1`)).rows[0].id;
      await ctx.owner.query(`UPDATE auth_session SET rotated_at = now() - interval '20 minutes' WHERE id = $1`, [id]);
      const rs = await Promise.all(Array.from({ length: 6 }, () => sessionGet(s.cookie)));
      expect(rs.every((r) => r.statusCode === 200)).toBe(true);
      expect(rs.filter((r) => cookieFrom(r, name())).length).toBe(1);
    });

    it('logout revokes the session server-side and clears the cookie', async () => {
      const s = await login(ctx, user);
      const r = await ctx.app.inject({ method: 'POST', url: '/v1/auth/logout', headers: writeHeaders(s) });
      expect(r.statusCode).toBe(200);
      expect(r.json().loggedOut).toBe(true);
      expect(r.json().providerLogoutUrl).toContain(`${ctx.issuer.issuer}/logout`);
      expect(setCookieLine(r, name())).toMatch(/Max-Age=0/);
      expect((await sessionGet(s.cookie)).statusCode).toBe(401); // the copied cookie is dead too
      const row = (await ctx.owner.query(`SELECT revoked_reason FROM auth_session ORDER BY created_at DESC LIMIT 1`)).rows[0];
      expect(row.revoked_reason).toBe('logout');
      expect(await countAudit('auth.logout')).toBeGreaterThan(0);
    });

    it('deactivating a user revokes every session at once; the next request is refused', async () => {
      const victim = await ctx.createUser({ roles: ['teacher'] });
      const a = await login(ctx, victim);
      const b = await login(ctx, victim);
      const adminSession = await login(ctx, admin);
      const r = await ctx.app.inject({
        method: 'POST',
        url: `/v1/admin/users/${victim.id}/status`,
        headers: writeHeaders(adminSession),
        payload: { status: 'deactivated', reason: 'left the organisation' },
      });
      expect(r.statusCode).toBe(200);
      const open = (await ctx.owner.query(`SELECT count(*)::int AS n FROM auth_session WHERE user_id = $1 AND revoked_at IS NULL`, [victim.id]))
        .rows[0].n;
      expect(open).toBe(0);
      expect((await sessionGet(a.cookie)).statusCode).toBe(401);
      expect((await sessionGet(b.cookie)).statusCode).toBe(401);
    });

    it('a status change made outside the API (no revocation) is still enforced on the next request', async () => {
      const u = await ctx.createUser({ roles: ['teacher'] });
      const s = await login(ctx, u);
      await ctx.owner.query(`UPDATE app_user SET status = 'suspended', status_reason = 'test' WHERE id = $1`, [u.id]);
      const r = await sessionGet(s.cookie);
      expect(r.statusCode).toBe(403);
      expect(r.json().error.code).toBe('ACCOUNT_INACTIVE');
      const open = (await ctx.owner.query(`SELECT count(*)::int AS n FROM auth_session WHERE user_id = $1 AND revoked_at IS NULL`, [u.id]))
        .rows[0].n;
      expect(open).toBe(0);
    });

    it('role and scope changes apply on the next request of an existing session', async () => {
      const u = await ctx.createUser({ roles: ['teacher'] });
      const s = await login(ctx, u);
      expect((await sessionGet(s.cookie, `/v1/admin/users/${user.id}`)).statusCode).toBe(403);
      await ctx.owner.query(`INSERT INTO user_role (user_id, role, grant_reason) VALUES ($1, 'system_admin', 'test')`, [u.id]);
      expect((await sessionGet(s.cookie, `/v1/admin/users/${user.id}`)).statusCode).toBe(200);
      await ctx.owner.query(
        `UPDATE user_role SET revoked_at = now(), revoke_reason = 'test' WHERE user_id = $1 AND role = 'system_admin'`,
        [u.id],
      );
      expect((await sessionGet(s.cookie, `/v1/admin/users/${user.id}`)).statusCode).toBe(403);
    });
  });

  describe('CSRF and cross-origin protection', () => {
    const post = (headers: Record<string, string>) =>
      ctx.app.inject({
        method: 'POST',
        url: '/v1/admin/users',
        headers: { 'idempotency-key': `csrf-${Math.random().toString(36).slice(2, 12)}`, ...headers },
        payload: { email: `csrf.${Math.random().toString(36).slice(2, 8)}@example.test`, displayName: 'CSRF Case' },
      });

    it('accepts a state-changing request with the trusted Origin and the CSRF token', async () => {
      const s = await login(ctx, admin);
      expect((await post(writeHeaders(s))).statusCode).toBe(201);
    });

    it.each([
      ['no CSRF token', (h: Record<string, string>) => ({ ...h, 'x-csrf-token': '' })],
      ['a wrong CSRF token', (h: Record<string, string>) => ({ ...h, 'x-csrf-token': 'E'.repeat(43) })],
      ['no Origin header', (h: Record<string, string>) => Object.fromEntries(Object.entries(h).filter(([k]) => k !== 'origin'))],
      ['a foreign Origin', (h: Record<string, string>) => ({ ...h, origin: 'https://evil.example.com' })],
      ['Origin "null"', (h: Record<string, string>) => ({ ...h, origin: 'null' })],
    ])('refuses a cookie-authenticated write with %s (403, audited, nothing written)', async (_label, mutate) => {
      const s = await login(ctx, admin);
      const before = await countAudit('user.provisioned');
      const refusals = await countAudit('auth.csrf_refused');
      const r = await post(mutate(writeHeaders(s)) as Record<string, string>);
      expect(r.statusCode).toBe(403);
      expect(r.json().error.code).toBe('CSRF_FAILED');
      expect(await countAudit('user.provisioned')).toBe(before);
      expect(await countAudit('auth.csrf_refused')).toBe(refusals + 1);
    });

    it("a CSRF token from another session is refused (tokens are bound to the session's secret)", async () => {
      const a = await login(ctx, admin);
      const b = await login(ctx, admin);
      expect((await post({ ...writeHeaders(a), 'x-csrf-token': b.csrfToken })).statusCode).toBe(403);
    });

    it('logout also requires CSRF protection', async () => {
      const s = await login(ctx, user);
      const r = await ctx.app.inject({ method: 'POST', url: '/v1/auth/logout', headers: { cookie: s.cookie, origin: APP_ORIGIN } });
      expect(r.statusCode).toBe(403);
      expect((await sessionGet(s.cookie)).statusCode).toBe(200);
    });

    it('CORS: the trusted origin may send credentials; any other origin gets no CORS grant', async () => {
      const ok = await ctx.app.inject({
        method: 'OPTIONS',
        url: '/v1/admin/users',
        headers: { origin: APP_ORIGIN, 'access-control-request-method': 'POST', 'access-control-request-headers': 'x-csrf-token,content-type' },
      });
      expect(ok.headers['access-control-allow-origin']).toBe(APP_ORIGIN);
      expect(ok.headers['access-control-allow-credentials']).toBe('true');
      expect(String(ok.headers['access-control-allow-headers'])).toMatch(/X-CSRF-Token/i);
      const bad = await ctx.app.inject({
        method: 'OPTIONS',
        url: '/v1/admin/users',
        headers: { origin: 'https://evil.example.com', 'access-control-request-method': 'POST' },
      });
      // No Access-Control-Allow-Origin = no grant: the browser blocks the request and hides any response. (The plugin
      // still emits Allow-Credentials, which grants nothing without a matching Allow-Origin.)
      expect(bad.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('a cross-origin read with the cookie returns data only without a CORS grant (the browser hides it)', async () => {
      const s = await login(ctx, user);
      const r = await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie: s.cookie, origin: 'https://evil.example.com' } });
      expect(r.headers['access-control-allow-origin']).toBeUndefined();
    });

    it('bearer-authenticated writes are not subject to CSRF (no ambient credentials)', async () => {
      const r = await post({ authorization: `Bearer ${await admin.token()}` });
      expect(r.statusCode).toBe(201);
    });
  });
});

describe('authentication mode configuration', () => {
  it('with bearer disabled, an Authorization header is refused even with a valid provider token', async () => {
    const ctx = await createTestContext((issuer) => sessionEnv(issuer, { AUTH_BEARER_ENABLED: 'false' }));
    try {
      const u = await ctx.createUser({ roles: ['teacher'] });
      const r = await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: { authorization: `Bearer ${await u.token()}` } });
      expect(r.statusCode).toBe(401);
      expect(r.headers['www-authenticate']).toBeUndefined();
      const s = await login(ctx, u);
      expect((await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie: s.cookie } })).statusCode).toBe(200);
    } finally {
      await ctx.close();
    }
  });

  it('with sessions disabled, the sign-in routes do not exist and session cookies are ignored', async () => {
    const ctx = await createTestContext();
    try {
      expect((await ctx.app.inject({ method: 'GET', url: '/v1/auth/login' })).statusCode).toBe(404);
      const r = await ctx.app.inject({ method: 'GET', url: '/v1/me', headers: { cookie: `__Host-ilumin_session=${'F'.repeat(43)}` } });
      expect(r.statusCode).toBe(401);
    } finally {
      await ctx.close();
    }
  });

  it('only GET sign-in routes are public; there is still no unauthenticated write endpoint', async () => {
    const ctx = await createTestContext((issuer) => sessionEnv(issuer));
    try {
      const pub = ctx.app.routeInventory.filter((r) => r.access === 'public').map((r) => `${r.method} ${r.url}`).sort();
      expect(pub).toEqual([
        'GET /health/live',
        'GET /health/ready',
        'GET /v1/auth/callback',
        'GET /v1/auth/login',
        'HEAD /health/live',
        'HEAD /health/ready',
        'HEAD /v1/auth/callback',
        'HEAD /v1/auth/login',
        'OPTIONS *',
      ]);
      for (const r of ctx.app.routeInventory.filter((x) => !['GET', 'HEAD', 'OPTIONS'].includes(x.method))) {
        expect(r.access).not.toBe('public');
      }
    } finally {
      await ctx.close();
    }
  });
});
