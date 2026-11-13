import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { FastifyReply } from 'fastify';
import type { SessionAuthConfig } from '../../config/config.js';
import type { Queryable } from '../../database/pool.js';
import { appendSetCookie, serializeCookie } from '../../shared/cookies.js';

/**
 * Backend-managed browser sessions (ADR 0008).
 *
 *  - The cookie holds a 256-bit random secret. The database stores only SHA-256(secret), so a database read does not
 *    yield usable session cookies.
 *  - Validity is decided with the DATABASE clock: not revoked, before the idle expiry and before the absolute expiry.
 *  - Rotation: once the secret is older than SESSION_ROTATION_MINUTES, a request gets a new secret (Set-Cookie). The old
 *    one stays valid for SESSION_ROTATION_GRACE_SECONDS so that parallel requests already in flight do not fail.
 *  - Sessions are only ever created after a verified sign-in (never "upgraded" from an anonymous id), and sign-in revokes
 *    any session cookie the browser presented, so a planted cookie can never become authenticated (no fixation).
 *  - CSRF token = HMAC-SHA256(key = session secret, "ilumin.csrf.v1"). It is derived, never stored, changes with
 *    rotation, and cannot be computed without the HttpOnly cookie.
 */

export const SECRET_RE = /^[A-Za-z0-9_-]{43}$/;
const TOUCH_INTERVAL_SECONDS = 60;

export const sha256 = (s: string): Buffer => createHash('sha256').update(s).digest();
export const newSecret = (): string => randomBytes(32).toString('base64url');
export const csrfTokenFor = (secret: string): string => createHmac('sha256', secret).update('ilumin.csrf.v1').digest('base64url');

export function csrfMatches(secret: string, presented: unknown): boolean {
  if (typeof presented !== 'string' || presented.length !== 43) return false;
  return timingSafeEqual(Buffer.from(csrfTokenFor(secret)), Buffer.from(presented));
}

export type RevocationReason = 'logout' | 'account_inactive' | 'replaced_at_login' | 'administrator';

export interface ResolvedSession {
  id: string;
  userId: string;
  issuer: string;
  subject: string;
  /** The secret the browser presented (current or, during the grace period, previous). CSRF is checked against it. */
  presentedSecret: string;
  /** The secret the browser should use from now on (differs from presentedSecret right after rotation). */
  currentSecret: string | null;
  rotated: boolean;
  absoluteExpiresAt: Date;
  idleExpiresAt: Date;
}

export async function createSession(
  db: Queryable,
  cfg: SessionAuthConfig,
  s: { userId: string; issuer: string; subject: string; clientIp: string | null },
): Promise<{ id: string; secret: string; absoluteExpiresAt: Date }> {
  const secret = newSecret();
  const r = await db.query<{ id: string; absolute_expires_at: Date }>(
    `INSERT INTO auth_session (user_id, issuer, subject, secret_hash, idle_expires_at, absolute_expires_at, created_ip)
     VALUES ($1, $2, $3, $4,
             LEAST(now() + make_interval(mins => $5), now() + make_interval(hours => $6)),
             now() + make_interval(hours => $6), $7::inet)
     RETURNING id, absolute_expires_at`,
    [s.userId, s.issuer, s.subject, sha256(secret), cfg.idleMinutes, cfg.absoluteHours, s.clientIp],
  );
  return { id: r.rows[0]!.id, secret, absoluteExpiresAt: r.rows[0]!.absolute_expires_at };
}

/** Looks the secret up, enforces expiry with the database clock, and rotates or extends the session when due. */
export async function resolveSession(db: Queryable, cfg: SessionAuthConfig, secret: string): Promise<ResolvedSession | null> {
  if (!SECRET_RE.test(secret)) return null;
  const hash = sha256(secret);
  const r = await db.query<{
    id: string;
    user_id: string;
    issuer: string;
    subject: string;
    is_current: boolean;
    rotation_due: boolean;
    touch_due: boolean;
    absolute_expires_at: Date;
    idle_expires_at: Date;
  }>(
    `SELECT id, user_id, issuer, subject, secret_hash = $1 AS is_current,
            rotated_at <= now() - make_interval(mins => $2) AS rotation_due,
            last_seen_at <= now() - make_interval(secs => $3) AS touch_due,
            absolute_expires_at, idle_expires_at
       FROM auth_session
      WHERE (secret_hash = $1 OR (previous_secret_hash = $1 AND previous_valid_until > now()))
        AND revoked_at IS NULL AND idle_expires_at > now() AND absolute_expires_at > now()`,
    [hash, cfg.rotationMinutes, TOUCH_INTERVAL_SECONDS],
  );
  const row = r.rows[0];
  if (!row) return null;
  const base = {
    id: row.id,
    userId: row.user_id,
    issuer: row.issuer,
    subject: row.subject,
    presentedSecret: secret,
    absoluteExpiresAt: row.absolute_expires_at,
  };

  if (row.is_current && row.rotation_due) {
    const next = newSecret();
    // Compare-and-swap on the current hash: of two concurrent rotations exactly one wins; the loser keeps working
    // because its secret is now the "previous" one, valid for the grace period.
    const u = await db.query<{ idle_expires_at: Date }>(
      `UPDATE auth_session
          SET previous_secret_hash = secret_hash,
              previous_valid_until = now() + make_interval(secs => $4),
              secret_hash = $3, rotated_at = now(), last_seen_at = now(),
              idle_expires_at = LEAST(now() + make_interval(mins => $5), absolute_expires_at)
        WHERE id = $1 AND secret_hash = $2 AND revoked_at IS NULL
        RETURNING idle_expires_at`,
      [row.id, hash, sha256(next), cfg.rotationGraceSeconds, cfg.idleMinutes],
    );
    if (u.rows[0]) return { ...base, currentSecret: next, rotated: true, idleExpiresAt: u.rows[0].idle_expires_at };
  } else if (row.touch_due) {
    const u = await db.query<{ idle_expires_at: Date }>(
      `UPDATE auth_session SET last_seen_at = now(), idle_expires_at = LEAST(now() + make_interval(mins => $2), absolute_expires_at)
        WHERE id = $1 AND revoked_at IS NULL RETURNING idle_expires_at`,
      [row.id, cfg.idleMinutes],
    );
    if (u.rows[0]) return { ...base, currentSecret: row.is_current ? secret : null, rotated: false, idleExpiresAt: u.rows[0].idle_expires_at };
  }
  return { ...base, currentSecret: row.is_current ? secret : null, rotated: false, idleExpiresAt: row.idle_expires_at };
}

export async function revokeSession(db: Queryable, sessionId: string, reason: RevocationReason): Promise<boolean> {
  const r = await db.query(
    `UPDATE auth_session SET revoked_at = now(), revoked_reason = $2 WHERE id = $1 AND revoked_at IS NULL`,
    [sessionId, reason],
  );
  return (r.rowCount ?? 0) > 0;
}

/** Revokes every active session of a user (deactivation, suspension). Returns how many were revoked. */
export async function revokeUserSessions(db: Queryable, userId: string, reason: RevocationReason): Promise<number> {
  const r = await db.query(
    `UPDATE auth_session SET revoked_at = now(), revoked_reason = $2 WHERE user_id = $1 AND revoked_at IS NULL`,
    [userId, reason],
  );
  return r.rowCount ?? 0;
}

/** Revokes the session a browser presents, if any (used at sign-in against fixation). */
export async function revokeBySecret(db: Queryable, secret: string, reason: RevocationReason): Promise<void> {
  if (!SECRET_RE.test(secret)) return;
  await db.query(
    `UPDATE auth_session SET revoked_at = now(), revoked_reason = $2
      WHERE (secret_hash = $1 OR previous_secret_hash = $1) AND revoked_at IS NULL`,
    [sha256(secret), reason],
  );
}

// ── Cookies ─────────────────────────────────────────────────────────────────────────────────────────────────────────

const cookieBase = (cfg: SessionAuthConfig) => ({
  secure: cfg.cookie.secure,
  httpOnly: true,
  sameSite: cfg.cookie.sameSite,
  path: '/',
  ...(cfg.cookie.domain ? { domain: cfg.cookie.domain } : {}),
});

export function setSessionCookie(reply: FastifyReply, cfg: SessionAuthConfig, secret: string, absoluteExpiresAt: Date): void {
  const maxAge = Math.max(1, Math.floor((absoluteExpiresAt.getTime() - Date.now()) / 1000));
  appendSetCookie(reply, serializeCookie(cfg.cookie.sessionName, secret, { ...cookieBase(cfg), maxAgeSeconds: maxAge }));
}

export function clearSessionCookie(reply: FastifyReply, cfg: SessionAuthConfig): void {
  appendSetCookie(reply, serializeCookie(cfg.cookie.sessionName, '', { ...cookieBase(cfg), maxAgeSeconds: 0 }));
}

/**
 * The login-attempt cookie carries the PKCE code verifier. SameSite=Lax (not Strict) because it must accompany the
 * top-level redirect back from the provider. It lives at most AUTH_LOGIN_TTL_SECONDS and is cleared at the callback.
 */
export function setLoginCookie(reply: FastifyReply, cfg: SessionAuthConfig, verifier: string): void {
  appendSetCookie(
    reply,
    serializeCookie(cfg.cookie.loginName, verifier, { ...cookieBase(cfg), sameSite: 'Lax', maxAgeSeconds: cfg.loginTtlSeconds }),
  );
}

export function clearLoginCookie(reply: FastifyReply, cfg: SessionAuthConfig): void {
  appendSetCookie(reply, serializeCookie(cfg.cookie.loginName, '', { ...cookieBase(cfg), sameSite: 'Lax', maxAgeSeconds: 0 }));
}
