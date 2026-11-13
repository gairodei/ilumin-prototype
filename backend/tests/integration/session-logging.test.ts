import { Writable } from 'node:stream';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp, loggerOptions } from '../../src/app/build-app.js';
import { createTestContext, sessionEnv, type TestContext } from '../support/context.js';
import { cookieFrom } from '../support/session.js';

/** The sign-in flow must not leak session secrets, PKCE verifiers, state, codes, CSRF tokens or personal data to logs. */
describe('sign-in logging', () => {
  let ctx: TestContext;
  let app: Awaited<ReturnType<typeof buildApp>>;
  const raw: string[] = [];

  beforeAll(async () => {
    ctx = await createTestContext((issuer) => sessionEnv(issuer));
    const stream = new Writable({
      write(chunk, _enc, cb) {
        raw.push(String(chunk));
        cb();
      },
    });
    // A second app over the same services, logging at debug level into memory.
    app = await buildApp({ ...ctx.services, loginClient: undefined }, { logger: { ...(loggerOptions('debug') as object), stream } as never });
    await app.ready();
  });
  afterAll(async () => {
    await app?.close();
    await ctx?.close();
  });

  it('logs outcomes and reasons only', async () => {
    const user = await ctx.createUser({ roles: ['teacher'], email: 'private.learner@example.test' });
    const cfg = ctx.config.auth.session!;
    const start = await app.inject({ method: 'GET', url: '/v1/auth/login' });
    const authorize = new URL(start.headers.location as string);
    const state = authorize.searchParams.get('state')!;
    const verifier = cookieFrom(start, cfg.cookie.loginName)!;
    const code = ctx.issuer.issueCode({
      sub: user.subject,
      nonce: authorize.searchParams.get('nonce')!,
      codeChallenge: authorize.searchParams.get('code_challenge')!,
      redirectUri: cfg.redirectUri,
    });
    const cb = await app.inject({
      method: 'GET',
      url: `/v1/auth/callback?code=${code}&state=${state}`,
      headers: { cookie: `${cfg.cookie.loginName}=${verifier}` },
    });
    expect(cb.statusCode).toBe(303);
    const secret = cookieFrom(cb, cfg.cookie.sessionName)!;
    const s = await app.inject({ method: 'GET', url: '/v1/auth/session', headers: { cookie: `${cfg.cookie.sessionName}=${secret}` } });
    const csrf = s.json().csrfToken as string;
    // A failing callback too (reason must be logged, inputs must not).
    await app.inject({ method: 'GET', url: `/v1/auth/callback?code=leakycode123&state=${state}`, headers: { cookie: `${cfg.cookie.loginName}=${verifier}` } });

    const all = raw.join('');
    for (const leaked of [secret, verifier, state, code, csrf, 'leakycode123', 'private.learner@example.test', ctx.issuer.clientSecret]) {
      expect(all).not.toContain(leaked);
    }
    expect(all).toContain('"loginFailed":"state_already_used"');
    expect(all).toContain('"route":"/v1/auth/callback"');
  });
});
