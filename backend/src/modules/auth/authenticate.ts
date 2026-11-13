import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../../config/config.js';
import type { Pool } from '../../database/pool.js';
import { withTransaction } from '../../database/transaction.js';
import { parseCookies } from '../../shared/cookies.js';
import { AppError, errors } from '../../shared/errors.js';
import { appendAudit } from '../audit/audit.js';
import { IdentityProviderUnavailableError, TokenRejectedError, type TokenVerifier, type VerifiedIdentity } from './oidc.js';
import { findUserByIdentity, loadPrincipal, type Principal } from './principal.js';
import {
  clearSessionCookie,
  csrfMatches,
  csrfTokenFor,
  type ResolvedSession,
  resolveSession,
  revokeUserSessions,
  setSessionCookie,
} from './session.js';

/**
 * Authentication boundary. Two mechanisms, each enabled only by explicit configuration:
 *
 *  - Browser session (AUTH_SESSION_ENABLED): the backend-issued HttpOnly session cookie (ADR 0008). State-changing
 *    requests also need the CSRF token and an allowed Origin (verifyCsrf).
 *  - Bearer access token (AUTH_BEARER_ENABLED): Authorization: Bearer <access token from the configured OIDC provider>,
 *    for non-browser clients (ADR 0004). Not subject to CSRF (browsers never attach it automatically).
 *
 * The only inputs trusted are the verified (issuer, subject) or a live session row. There is no fallback, development
 * bypass or header-based identity. Roles and status are re-read from the database on every request.
 */

export interface AuthDeps {
  config: Config;
  pool: Pool;
  verifier: TokenVerifier;
}

declare module 'fastify' {
  interface FastifyRequest {
    /** Set when the request authenticated with a session cookie. */
    session?: ResolvedSession;
  }
}

// RFC 6750 b64token; the scheme name is case-insensitive (RFC 7235).
const BEARER_RE = /^Bearer ([A-Za-z0-9\-._~+/]+=*)$/i;
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

export function requestAuditContext(request: FastifyRequest) {
  return { requestId: request.id, correlationId: request.correlationId, clientIp: request.ip };
}

function unauthenticated(deps: AuthDeps, message?: string, bearerError?: string) {
  if (deps.config.auth.bearerEnabled) {
    return errors.unauthenticated(message, bearerError ? `Bearer error="${bearerError}"` : 'Bearer');
  }
  // Cookie-only deployment: no WWW-Authenticate challenge (there is no HTTP auth scheme to offer).
  return new AppError(401, 'UNAUTHENTICATED', message ?? 'Authentication is required.');
}

export async function authenticate(request: FastifyRequest, reply: FastifyReply, deps: AuthDeps): Promise<Principal> {
  const header = request.headers.authorization;
  if (header !== undefined) {
    if (!deps.config.auth.bearerEnabled) throw unauthenticated(deps, 'Bearer authentication is not enabled on this API.');
    return authenticateBearer(request, deps, header);
  }
  const session = deps.config.auth.session;
  if (session) {
    const secret = parseCookies(request.headers.cookie)[session.cookie.sessionName];
    if (secret) return authenticateSession(request, reply, deps, secret);
  }
  throw unauthenticated(deps);
}

async function authenticateBearer(request: FastifyRequest, deps: AuthDeps, header: string): Promise<Principal> {
  const m = BEARER_RE.exec(header);
  if (!m) throw unauthenticated(deps, 'The Authorization header must be "Bearer <token>".', 'invalid_request');

  let identity: VerifiedIdentity;
  try {
    identity = await deps.verifier.verify(m[1]!);
  } catch (err) {
    if (err instanceof TokenRejectedError) {
      request.log.info({ tokenRejected: err.reason }, 'access token rejected');
      throw unauthenticated(deps, 'The access token is not valid.', 'invalid_token');
    }
    if (err instanceof IdentityProviderUnavailableError) {
      request.log.error({ err: { message: err.message } }, 'identity provider unavailable; refusing request');
      throw errors.unavailable('Sign-in cannot be verified right now. Try again shortly.');
    }
    throw err;
  }

  let user = await findUserByIdentity(deps.pool, identity.issuer, identity.subject);
  if (!user && deps.config.oidc.linkByVerifiedEmail && identity.email && identity.emailVerified) {
    user = await linkByVerifiedEmail(request, deps.pool, identity);
  }
  if (!user) {
    request.log.warn({ issuer: identity.issuer }, 'authenticated identity is not linked to an application user');
    throw errors.notProvisioned();
  }

  const principal = await loadPrincipal(deps.pool, user, { issuer: identity.issuer, subject: identity.subject });
  principal.auth = { method: 'bearer' };
  if (principal.status !== 'active') {
    await auditInactive(request, deps.pool, principal);
    throw errors.inactive();
  }
  return principal;
}

async function authenticateSession(request: FastifyRequest, reply: FastifyReply, deps: AuthDeps, secret: string): Promise<Principal> {
  const cfg = deps.config.auth.session!;
  const s = await resolveSession(deps.pool, cfg, secret);
  if (!s) {
    clearSessionCookie(reply, cfg);
    throw unauthenticated(deps, 'Your session has ended. Sign in again.');
  }
  if (s.rotated && s.currentSecret) {
    setSessionCookie(reply, cfg, s.currentSecret, s.absoluteExpiresAt);
    reply.header('X-CSRF-Token', csrfTokenFor(s.currentSecret));
  }
  const user = (
    await deps.pool.query<{ id: string; email: string; display_name: string; status: Principal['status'] }>(
      `SELECT id, email, display_name, status FROM app_user WHERE id = $1`,
      [s.userId],
    )
  ).rows[0];
  if (!user) {
    clearSessionCookie(reply, cfg);
    throw unauthenticated(deps, 'Your session has ended. Sign in again.');
  }
  const principal = await loadPrincipal(deps.pool, user, { issuer: s.issuer, subject: s.subject });
  principal.auth = { method: 'session', sessionId: s.id };
  if (principal.status !== 'active') {
    // Normally already revoked when the status changed; revoke here too so a missed path cannot leave a live session.
    await revokeUserSessions(deps.pool, principal.userId, 'account_inactive');
    clearSessionCookie(reply, cfg);
    await auditInactive(request, deps.pool, principal);
    throw errors.inactive();
  }
  request.session = s;
  return principal;
}

/**
 * CSRF defence for cookie-authenticated, state-changing requests (ADR 0008):
 *  1. Origin must be present and be one of the trusted origins (CORS_ALLOWED_ORIGINS + the API's own origin).
 *  2. X-CSRF-Token must equal the token derived from the session secret the request presented.
 * Bearer requests and safe methods are exempt. Refusals are audited.
 */
export async function verifyCsrf(request: FastifyRequest, principal: Principal, deps: AuthDeps): Promise<void> {
  if (principal.auth?.method !== 'session' || SAFE_METHODS.has(request.method)) return;
  const cfg = deps.config.auth.session!;
  const origin = request.headers.origin;
  let reason: string | null = null;
  if (typeof origin !== 'string' || origin === 'null') reason = 'origin_missing';
  else if (!cfg.trustedOrigins.includes(origin)) reason = 'origin_not_allowed';
  else if (!request.session || !csrfMatches(request.session.presentedSecret, request.headers['x-csrf-token'])) reason = 'token_invalid';
  if (!reason) return;
  request.log.warn({ csrf: reason }, 'cross-site request protection refused a request');
  await appendAudit(deps.pool, {
    actor: { kind: 'user', principal },
    operation: 'auth.csrf_refused',
    outcome: 'refused',
    entity: { type: 'route', id: `${request.method} ${request.routeOptions.url ?? ''}` },
    reason,
    request: requestAuditContext(request),
  }).catch((err) => request.log.error({ err }, 'failed to audit CSRF refusal'));
  throw errors.csrf();
}

async function auditInactive(request: FastifyRequest, pool: Pool, principal: Principal): Promise<void> {
  await appendAudit(pool, {
    actor: { kind: 'user', principal },
    operation: 'auth.inactive_account_refused',
    outcome: 'refused',
    entity: { type: 'app_user', id: principal.userId },
    reason: `account ${principal.status}`,
    request: requestAuditContext(request),
  }).catch((err) => request.log.error({ err }, 'failed to audit inactive-account refusal'));
}

/**
 * Optional first-sign-in linking (OIDC_LINK_BY_VERIFIED_EMAIL=true): links the identity to an existing, active user with
 * the same email when the provider asserts email_verified=true and that user has no identity from this issuer yet.
 * Never creates a user. Audited.
 */
export async function linkByVerifiedEmail(request: FastifyRequest, pool: Pool, identity: VerifiedIdentity) {
  try {
    return await withTransaction(pool, async (tx) => {
      const r = await tx.query<{ id: string; email: string; display_name: string; status: 'active' | 'suspended' | 'deactivated' }>(
        `SELECT u.id, u.email, u.display_name, u.status FROM app_user u
          WHERE u.email = $1 AND u.status = 'active'
            AND NOT EXISTS (SELECT 1 FROM user_identity i WHERE i.user_id = u.id AND i.issuer = $2)
          FOR UPDATE`,
        [identity.email, identity.issuer],
      );
      const u = r.rows[0];
      if (!u) return null;
      await tx.query(
        `INSERT INTO user_identity (user_id, issuer, subject, email_at_link, link_method) VALUES ($1, $2, $3, $4, 'verified_email')`,
        [u.id, identity.issuer, identity.subject, identity.email],
      );
      await appendAudit(tx, {
        actor: { kind: 'system', label: 'auth.oidc' },
        operation: 'user_identity.linked',
        entity: { type: 'app_user', id: u.id },
        after: { issuer: identity.issuer, linkMethod: 'verified_email' },
        reason: 'first sign-in with a provider-verified email matching a provisioned account',
        request: requestAuditContext(request),
      });
      return u;
    });
  } catch (err) {
    // A concurrent first sign-in linked it already: read the committed mapping.
    if ((err as { code?: string }).code === '23505') return findUserByIdentity(pool, identity.issuer, identity.subject);
    throw err;
  }
}
