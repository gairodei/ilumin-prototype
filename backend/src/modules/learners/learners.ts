import type { PoolClient, Queryable } from '../../database/pool.js';
import { errors } from '../../shared/errors.js';
import { appendAudit, type AuditActor, type AuditRequestContext } from '../audit/audit.js';

/**
 * Learner profile (Stage 2B): the one canonical learner identity per user, keyed by app_user (no second identity
 * model). It holds only what the application lifecycle needs that the user record does not: the country of residence
 * (PD-P3-01 region rule; "set at registration" in the prototype, so it is set once). Name and email stay on app_user.
 */

export interface LearnerProfileView {
  userId: string;
  countryCode: string;
  createdAt: string;
}

export async function getLearnerProfile(db: Queryable, userId: string): Promise<LearnerProfileView | null> {
  const r = await db.query<{ user_id: string; country_code: string; created_at: Date }>(
    `SELECT user_id, country_code, created_at FROM learner_profile WHERE user_id = $1`,
    [userId],
  );
  const p = r.rows[0];
  return p ? { userId: p.user_id, countryCode: p.country_code, createdAt: p.created_at.toISOString() } : null;
}

/**
 * Creates the caller's own profile, once. Concurrent requests create exactly one row (primary key + ON CONFLICT): a
 * repeat with the same country returns the existing profile (created=false); a different country is refused, because
 * the country is not changed here.
 */
export async function ensureLearnerProfile(
  tx: PoolClient,
  ctx: { actor: AuditActor & { kind: 'user' }; request?: AuditRequestContext },
  input: { countryCode: string },
): Promise<{ profile: LearnerProfileView; created: boolean }> {
  const userId = ctx.actor.principal.userId;
  const ins = await tx.query(
    `INSERT INTO learner_profile (user_id, country_code, created_by) VALUES ($1, $2, $1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId, input.countryCode],
  );
  const profile = (await getLearnerProfile(tx, userId))!;
  if (!ins.rowCount) {
    if (profile.countryCode !== input.countryCode) {
      throw errors.domain(409, 'IMMUTABLE_RECORD', 'Your learner profile already exists; its country is not changed here.');
    }
    return { profile, created: false };
  }
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'learner_profile.created',
    entity: { type: 'learner_profile', id: userId },
    after: { countryCode: input.countryCode },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return { profile, created: true };
}
