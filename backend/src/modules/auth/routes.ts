import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { definePublicRoute, defineRoute, rateLimitsFor, type Services } from '../../app/route.js';
import type { SessionAuthConfig } from '../../config/config.js';
import { withTransaction } from '../../database/transaction.js';
import { parseCookies } from '../../shared/cookies.js';
import { errors } from '../../shared/errors.js';
import { appendAudit } from '../audit/audit.js';
import { policy, allow, deny } from '../authz/policy.js';
import { linkByVerifiedEmail, requestAuditContext } from './authenticate.js';
import { LoginRejectedError, type OidcLoginClient } from './oidc-client.js';
import { IdentityProviderUnavailableError } from './oidc.js';
import { findUserByIdentity, loadPrincipal } from './principal.js';
import {
  clearLoginCookie,
  clearSessionCookie,
  createSession,
  csrfTokenFor,
  revokeBySecret,
  revokeSession,
  setLoginCookie,
  setSessionCookie,
  sha256,
} from './session.js';

/**
 * Browser sign-in endpoints (ADR 0008). Only registered when AUTH_SESSION_ENABLED=true.
 *
 *   GET  /v1/auth/login?returnTo=<allow-listed URL>  → 302 to the provider (state, nonce, PKCE S256)
 *   GET  /v1/auth/callback?code&state[&iss]           → verifies everything, creates the session, 303 to returnTo
 *   GET  /v1/auth/session                              → who is signed in, session expiry and the CSRF token
 *   POST /v1/auth/logout                               → revokes the session server-side (CSRF-protected)
 *
 * Every callback failure returns the same 400 LOGIN_FAILED (no account enumeration); the precise reason is logged and
 * audited. Callback failures are rate-limited per client IP in PostgreSQL.
 */

const B64U43 = /^[A-Za-z0-9_-]{43}$/;
const s256 = (verifier: string) => createHash('sha256').update(verifier).digest('base64url');
const random43 = () => randomBytes(32).toString('base64url');

/** Strict redirect allow-list: absolute http(s) URL, no credentials, origin listed exactly. Fragment removed. */
export function safeReturnTo(raw: string | undefined, cfg: SessionAuthConfig, production: boolean): string | null {
  if (raw === undefined || raw === '') return cfg.defaultRedirect;
  if (raw.length > 2048) return null;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null; // relative and scheme-relative values are refused, not resolved
  }
  if (u.protocol !== 'https:' && (production || u.protocol !== 'http:')) return null;
  if (u.username || u.password) return null;
  if (!cfg.redirectOrigins.includes(u.origin)) return null;
  u.hash = '';
  return u.toString();
}

const LoginQuery = z.object({ returnTo: z.string().max(4096).optional() }).strict();
const CallbackQuery = z
  .object({
    code: z.string().min(1).max(2048).optional(),
    state: z.string().max(200).optional(),
    iss: z.string().max(500).optional(),
    error: z.string().max(200).optional(),
    error_description: z.string().max(2000).optional(),
    error_uri: z.string().max(2000).optional(),
    session_state: z.string().max(500).optional(),
  })
  .strict();

const sessionAuthenticated = policy('sessionAuthenticated', ({ principal }) =>
  principal.auth?.method === 'session' ? allow : deny('requires a browser session'),
);

type FailReason =
  | 'provider_error'
  | 'missing_parameters'
  | 'unknown_state'
  | 'state_already_used'
  | 'login_cookie_missing'
  | 'login_binding_mismatch'
  | 'login_expired'
  | 'identity_not_provisioned'
  | 'account_inactive'
  | LoginRejectedError['reason'];

export function registerAuthRoutes(app: FastifyInstance, services: Services, client: OidcLoginClient): void {
  const cfg = services.config.auth.session!;
  const prod = services.config.env === 'production';

  definePublicRoute(app, services, {
    method: 'GET',
    url: '/v1/auth/login',
    access: 'public',
    query: LoginQuery,
    handler: async ({ request, query }, reply) => {
      await rateLimitsFor(services).db.enforce(`login:ip:${request.ip}`, services.config.rateLimits.login);
      const returnTo = safeReturnTo(query.returnTo, cfg, prod);
      if (!returnTo) throw errors.validation([{ path: 'returnTo', message: 'is not an allowed redirect target' }]);

      const state = random43();
      const nonce = random43();
      const verifier = random43(); // PKCE code verifier: kept only in the browser's login cookie
      const codeChallenge = s256(verifier);
      let location: string;
      try {
        location = await client.authorizationUrl({ state, nonce, codeChallenge });
      } catch (err) {
        if (err instanceof IdentityProviderUnavailableError) {
          request.log.error({ err: { message: err.message } }, 'identity provider unavailable at sign-in');
          throw errors.unavailable('Sign-in is unavailable right now. Try again shortly.');
        }
        throw err;
      }
      await services.pool.query(
        `INSERT INTO auth_login_attempt (state_hash, code_challenge, nonce_hash, return_to, client_ip, expires_at)
         VALUES ($1, $2, $3, $4, $5::inet, now() + make_interval(secs => $6))`,
        [sha256(state), codeChallenge, sha256(nonce), returnTo, request.ip, cfg.loginTtlSeconds],
      );
      setLoginCookie(reply, cfg, verifier);
      reply.header('location', location);
      return { status: 302, body: undefined };
    },
  });

  definePublicRoute(app, services, {
    method: 'GET',
    url: '/v1/auth/callback',
    access: 'public',
    query: CallbackQuery,
    handler: async ({ request, query }, reply) => {
      const limits = rateLimitsFor(services).db;
      const failKey = `callback_fail:ip:${request.ip}`;
      const gate = await limits.peek(failKey, services.config.rateLimits.callbackFailures);
      if (!gate.allowed) throw errors.rateLimited(gate.retryAfterSeconds);

      const verifier = parseCookies(request.headers.cookie)[cfg.cookie.loginName];
      clearLoginCookie(reply, cfg); // single use, whatever happens next

      const fail = async (reason: FailReason, attemptId?: string): Promise<never> => {
        await limits.hit(failKey, services.config.rateLimits.callbackFailures);
        request.log.warn({ loginFailed: reason }, 'sign-in callback refused');
        await appendAudit(services.pool, {
          actor: { kind: 'system', label: 'auth.oidc' },
          operation: 'auth.login_failed',
          outcome: 'refused',
          entity: { type: 'auth_login_attempt', id: attemptId ?? null },
          reason,
          request: requestAuditContext(request),
        }).catch((err) => request.log.error({ err }, 'failed to audit sign-in failure'));
        throw errors.loginFailed();
      };

      if (!query.state || !B64U43.test(query.state)) return fail(query.error ? 'provider_error' : 'missing_parameters');
      if (!verifier || !B64U43.test(verifier)) return fail('login_cookie_missing');

      // Consume the attempt atomically, and only with the matching PKCE binding (the login cookie). A replayed callback
      // finds it consumed; a callback carried to another browser lacks the cookie.
      const consumed = await services.pool.query<{ id: string; nonce_hash: Buffer; return_to: string; live: boolean }>(
        `UPDATE auth_login_attempt SET consumed_at = now()
          WHERE state_hash = $1 AND code_challenge = $2 AND consumed_at IS NULL
          RETURNING id, nonce_hash, return_to, expires_at > now() AS live`,
        [sha256(query.state), s256(verifier)],
      );
      const attempt = consumed.rows[0];
      if (!attempt) {
        const known = await services.pool.query<{ id: string; consumed: boolean; code_challenge: string }>(
          `SELECT id, consumed_at IS NOT NULL AS consumed, code_challenge FROM auth_login_attempt WHERE state_hash = $1`,
          [sha256(query.state)],
        );
        const k = known.rows[0];
        if (!k) return fail('unknown_state');
        if (k.consumed) return fail('state_already_used', k.id);
        const same = k.code_challenge.length === 43 && timingSafeEqual(Buffer.from(k.code_challenge), Buffer.from(s256(verifier)));
        return fail(same ? 'unknown_state' : 'login_binding_mismatch', k.id);
      }
      if (!attempt.live) return fail('login_expired', attempt.id);
      if (query.error || !query.code) return fail(query.error ? 'provider_error' : 'missing_parameters', attempt.id);

      let identity;
      try {
        client.checkCallbackIssuer(query.iss);
        const idToken = await client.exchangeCode(query.code, verifier);
        identity = await client.verifyIdToken(idToken, attempt.nonce_hash);
      } catch (err) {
        if (err instanceof LoginRejectedError) return fail(err.reason, attempt.id);
        if (err instanceof IdentityProviderUnavailableError) {
          request.log.error({ err: { message: err.message } }, 'identity provider unavailable at callback');
          throw errors.unavailable('Sign-in is unavailable right now. Try again shortly.');
        }
        throw err;
      }

      let user = await findUserByIdentity(services.pool, identity.issuer, identity.subject);
      if (!user && services.config.oidc.linkByVerifiedEmail && identity.email && identity.emailVerified) {
        user = await linkByVerifiedEmail(request, services.pool, identity);
      }
      if (!user) return fail('identity_not_provisioned', attempt.id);
      if (user.status !== 'active') return fail('account_inactive', attempt.id);

      const presented = parseCookies(request.headers.cookie)[cfg.cookie.sessionName];
      const created = await withTransaction(services.pool, async (tx) => {
        if (presented) await revokeBySecret(tx, presented, 'replaced_at_login'); // session fixation defence
        const s = await createSession(tx, cfg, {
          userId: user.id,
          issuer: identity.issuer,
          subject: identity.subject,
          clientIp: request.ip,
        });
        const principal = await loadPrincipal(tx, user, { issuer: identity.issuer, subject: identity.subject });
        await appendAudit(tx, {
          actor: { kind: 'user', principal },
          operation: 'auth.login',
          entity: { type: 'auth_session', id: s.id },
          metadata: { method: 'oidc_authorization_code_pkce' },
          request: requestAuditContext(request),
        });
        return s;
      });
      setSessionCookie(reply, cfg, created.secret, created.absoluteExpiresAt);
      reply.header('location', attempt.return_to);
      return { status: 303, body: undefined };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/auth/session',
    access: sessionAuthenticated,
    handler: async ({ request, principal }) => {
      const s = request.session!;
      const secret = s.currentSecret ?? s.presentedSecret;
      return {
        status: 200,
        body: {
          user: { id: principal.userId, displayName: principal.displayName, email: principal.email },
          roles: [...principal.roles].sort(),
          session: { idleExpiresAt: s.idleExpiresAt.toISOString(), absoluteExpiresAt: s.absoluteExpiresAt.toISOString() },
          csrfToken: csrfTokenFor(secret),
        },
      };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/auth/logout',
    access: sessionAuthenticated,
    transactional: true,
    handler: async ({ db, request, audit }, reply) => {
      await revokeSession(db, request.session!.id, 'logout');
      await audit({ operation: 'auth.logout', entity: { type: 'auth_session', id: request.session!.id } });
      clearSessionCookie(reply, cfg);
      const providerLogoutUrl = await client.providerLogoutUrl();
      return { status: 200, body: { loggedOut: true, ...(providerLogoutUrl ? { providerLogoutUrl } : {}) } };
    },
  });
}

/** For tests and diagnostics: the session cookie value a response set, if any. */
export function sessionCookieFrom(setCookie: string | string[] | undefined, name: string): string | undefined {
  const list = setCookie === undefined ? [] : Array.isArray(setCookie) ? setCookie : [setCookie];
  for (const c of list) {
    const [pair] = c.split(';');
    const i = pair!.indexOf('=');
    if (pair!.slice(0, i) === name) return pair!.slice(i + 1);
  }
  return undefined;
}
