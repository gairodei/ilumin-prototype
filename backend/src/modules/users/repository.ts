import type { Queryable } from '../../database/pool.js';
import type { GrantableRole } from '../auth/roles.js';

export interface UserRecord {
  id: string;
  email: string;
  displayName: string;
  status: 'active' | 'suspended' | 'deactivated';
  createdAt: string;
}

interface Row {
  id: string;
  email: string;
  display_name: string;
  status: UserRecord['status'];
  created_at: Date;
}

const toRecord = (r: Row): UserRecord => ({
  id: r.id,
  email: r.email,
  displayName: r.display_name,
  status: r.status,
  createdAt: r.created_at.toISOString(),
});

export async function getUser(db: Queryable, id: string, opts: { forUpdate?: boolean } = {}): Promise<UserRecord | null> {
  const r = await db.query<Row>(
    `SELECT id, email, display_name, status, created_at FROM app_user WHERE id = $1${opts.forUpdate ? ' FOR UPDATE' : ''}`,
    [id],
  );
  return r.rows[0] ? toRecord(r.rows[0]) : null;
}

export async function activeRoles(db: Queryable, userId: string): Promise<GrantableRole[]> {
  const r = await db.query<{ role: GrantableRole }>(
    `SELECT role FROM user_role WHERE user_id = $1 AND revoked_at IS NULL ORDER BY role`,
    [userId],
  );
  return r.rows.map((x) => x.role);
}

export async function insertUser(
  db: Queryable,
  u: { email: string; displayName: string; createdBy: string | null },
): Promise<UserRecord> {
  const r = await db.query<Row>(
    `INSERT INTO app_user (email, display_name, created_by) VALUES ($1, $2, $3)
     RETURNING id, email, display_name, status, created_at`,
    [u.email, u.displayName, u.createdBy],
  );
  return toRecord(r.rows[0]!);
}

/**
 * Locks every active Super Administrator grant (in id order) and returns the user ids whose account is active.
 * Used to keep at least one active Super Administrator (prototype "last Super Administrator" lock, PD-MR-G1-01).
 */
export async function lockActiveSuperAdmins(db: Queryable): Promise<string[]> {
  // Statement 1 takes the locks (every path that can remove the last Super Administrator calls this first, so they
  // serialise here). Statement 2 runs with a fresh READ COMMITTED snapshot, so it sees account-status changes committed
  // by a transaction we waited for — a single joined statement would read app_user from its pre-wait snapshot.
  await db.query(`SELECT id FROM user_role WHERE role = 'super_admin' AND revoked_at IS NULL ORDER BY id FOR UPDATE`);
  const r = await db.query<{ user_id: string }>(
    `SELECT r.user_id FROM user_role r JOIN app_user u ON u.id = r.user_id
      WHERE r.role = 'super_admin' AND r.revoked_at IS NULL AND u.status = 'active'`,
  );
  return r.rows.map((x) => x.user_id);
}
