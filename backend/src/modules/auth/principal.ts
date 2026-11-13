import type { Queryable } from '../../database/pool.js';
import type { GrantableRole, Role, ScopedStaffRole } from './roles.js';

/**
 * The authenticated principal, rebuilt from the database on every request so that deactivation, role removal and scope
 * changes take effect on the next request (P10 §C row 2). Nothing here comes from the request body or token claims other
 * than the verified (issuer, subject).
 */

export interface StaffScopeGrant {
  role: ScopedStaffRole;
  scopeKind: 'batch' | 'learner';
  scopeId: string;
}

export interface AgencyMembership {
  agencyId: string;
  agencyRole: 'agency_admin' | 'agency_member';
}

export interface Principal {
  userId: string;
  email: string;
  displayName: string;
  status: 'active' | 'suspended' | 'deactivated';
  roles: ReadonlySet<Role>;
  scopes: readonly StaffScopeGrant[];
  agency: AgencyMembership | null;
  identity: { issuer: string; subject: string };
  /** How this request authenticated. Absent only on principals built outside the HTTP pipeline (tests, CLI). */
  auth?: { method: 'bearer' } | { method: 'session'; sessionId: string };
}

interface UserRow {
  id: string;
  email: string;
  display_name: string;
  status: Principal['status'];
}

export async function findUserByIdentity(db: Queryable, issuer: string, subject: string): Promise<UserRow | null> {
  const r = await db.query<UserRow>(
    `SELECT u.id, u.email, u.display_name, u.status
       FROM user_identity i JOIN app_user u ON u.id = i.user_id
      WHERE i.issuer = $1 AND i.subject = $2`,
    [issuer, subject],
  );
  return r.rows[0] ?? null;
}

/** Loads roles, scopes and agency membership for a user. Scopes count only while the matching role grant is active. */
export async function loadPrincipal(
  db: Queryable,
  user: UserRow,
  identity: { issuer: string; subject: string },
): Promise<Principal> {
  const [roles, scopes, agency] = await Promise.all([
    db.query<{ role: GrantableRole }>(`SELECT role FROM user_role WHERE user_id = $1 AND revoked_at IS NULL`, [user.id]),
    db.query<{ role: ScopedStaffRole; scope_kind: 'batch' | 'learner'; scope_id: string }>(
      `SELECT s.role, s.scope_kind, s.scope_id
         FROM staff_scope s
         JOIN user_role r ON r.user_id = s.user_id AND r.role = s.role AND r.revoked_at IS NULL
        WHERE s.user_id = $1 AND s.revoked_at IS NULL`,
      [user.id],
    ),
    db.query<{ agency_id: string; agency_role: AgencyMembership['agencyRole'] }>(
      `SELECT m.agency_id, m.agency_role
         FROM agency_user m JOIN agency a ON a.id = m.agency_id
        WHERE m.user_id = $1 AND m.revoked_at IS NULL AND a.status = 'active'`,
      [user.id],
    ),
  ]);
  const roleSet = new Set<Role>(roles.rows.map((r) => r.role));
  const membership = agency.rows[0];
  if (membership) roleSet.add('agency_user');
  return {
    userId: user.id,
    email: user.email,
    displayName: user.display_name,
    status: user.status,
    roles: roleSet,
    scopes: scopes.rows.map((s) => ({ role: s.role, scopeKind: s.scope_kind, scopeId: s.scope_id })),
    agency: membership ? { agencyId: membership.agency_id, agencyRole: membership.agency_role } : null,
    identity,
  };
}

/** Plain JSON view of the principal for audit rows (roles and scope used for the decision). */
export function principalAuditView(p: Principal): { roles: string[]; scope: Record<string, unknown> } {
  return {
    roles: [...p.roles].sort(),
    scope: {
      ...(p.agency ? { agencyId: p.agency.agencyId, agencyRole: p.agency.agencyRole } : {}),
      ...(p.scopes.length ? { staffScopes: p.scopes.length } : {}),
    },
  };
}
