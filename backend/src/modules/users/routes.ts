import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { defineRoute, type Services } from '../../app/route.js';
import { errors } from '../../shared/errors.js';
import { ROLE_LABELS, STAFF_AND_LEARNER_ROLES, type GrantableRole } from '../auth/roles.js';
import {
  allOf,
  anyOf,
  authenticatedUser,
  hasAnyRole,
  isSelf,
  notSelf,
  param,
  staffAccountAdmin,
} from '../authz/policy.js';
import { revokeUserSessions } from '../auth/session.js';
import { activeRoles, getUser, insertUser, lockActiveSuperAdmins } from './repository.js';

/**
 * Stage 1A user endpoints. They exercise the foundation (authentication, policies, audit, idempotency, transactions);
 * they are not the full staff-administration feature.
 *
 * Rules taken from the prototype decisions:
 *  - Staff accounts, role grants and status changes: Super Administrator or System Administrator (PD-MR-G1-01).
 *  - Super Administrator records are read-only for System Administrators; at least one active Super Administrator stays.
 *  - Nobody changes their own roles or status (P10 §C row 2; also a database CHECK).
 */

const uuidParam = z.string().uuid({ message: 'must be a UUID' });
const reason = z.string().trim().min(3, 'a reason of at least 3 characters is required').max(1000);
const role = z.enum(STAFF_AND_LEARNER_ROLES, { error: 'is not a grantable role' });

const UserIdParams = z.object({ userId: uuidParam });

const ProvisionBody = z
  .object({
    email: z.string().trim().toLowerCase().email('must be an email address').max(320),
    displayName: z.string().trim().min(1).max(200),
    /** The subject ("sub") of this person at the configured identity provider, if already known. */
    identitySubject: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

const GrantBody = z.object({ role, reason }).strict();
const RevokeParams = z.object({ userId: uuidParam, role });
const ReasonBody = z.object({ reason }).strict();
const StatusBody = z.object({ status: z.enum(['active', 'suspended', 'deactivated']), reason }).strict();

const targetUser = param('userId');

export function registerUserRoutes(app: FastifyInstance, services: Services): void {
  // The caller's own account: identity, roles and scopes as the server sees them.
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/me',
    access: authenticatedUser,
    handler: async ({ principal }) => ({
      status: 200,
      body: {
        id: principal.userId,
        email: principal.email,
        displayName: principal.displayName,
        roles: [...principal.roles].sort().map((r) => ({ role: r, label: ROLE_LABELS[r] })),
        agency: principal.agency,
        scopes: principal.scopes,
      },
    }),
  });

  // Ownership example: a user reads their own profile; staff-account administrators and Academic Admins read any.
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/users/:userId',
    params: UserIdParams,
    access: anyOf(isSelf(targetUser), hasAnyRole('super_admin', 'system_admin', 'academic_admin')),
    handler: async ({ db, params }) => {
      const u = await getUser(db, params.userId);
      if (!u) throw errors.notFound('User not found.');
      return { status: 200, body: { id: u.id, displayName: u.displayName, status: u.status } };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/admin/users/:userId',
    params: UserIdParams,
    access: staffAccountAdmin,
    handler: async ({ db, params }) => {
      const u = await getUser(db, params.userId);
      if (!u) throw errors.notFound('User not found.');
      return { status: 200, body: { ...u, roles: await activeRoles(db, u.id) } };
    },
  });

  // Provision an application user (no password: they sign in through the identity provider). Idempotent.
  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/admin/users',
    body: ProvisionBody,
    access: staffAccountAdmin,
    idempotent: { operation: 'users.provision' },
    rateLimit: 'sensitive',
    handler: async ({ db, body, principal, audit, services: s }) => {
      let user;
      try {
        user = await insertUser(db, { email: body.email, displayName: body.displayName, createdBy: principal.userId });
        if (body.identitySubject) {
          await db.query(
            `INSERT INTO user_identity (user_id, issuer, subject, email_at_link, link_method, linked_by)
             VALUES ($1, $2, $3, $4, 'admin', $5)`,
            [user.id, s.config.oidc.issuer, body.identitySubject, body.email, principal.userId],
          );
        }
      } catch (err) {
        if ((err as { code?: string }).code === '23505') throw errors.conflict('A user with this email or identity already exists.');
        throw err;
      }
      await audit({
        operation: 'user.provisioned',
        entity: { type: 'app_user', id: user.id },
        after: { email: user.email, displayName: user.displayName, status: user.status, identityLinked: !!body.identitySubject },
      });
      return { status: 201, body: { ...user, roles: [] } };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/admin/users/:userId/roles',
    params: UserIdParams,
    body: GrantBody,
    access: allOf(staffAccountAdmin, notSelf(targetUser)),
    idempotent: { operation: 'user_roles.grant' },
    rateLimit: 'sensitive',
    handler: async ({ db, params, body, principal, audit, refuse }) => {
      const target = await getUser(db, params.userId, { forUpdate: true });
      if (!target) throw errors.notFound('User not found.');
      const before = await activeRoles(db, target.id);
      const actorIsSuper = principal.roles.has('super_admin');
      if (body.role === 'super_admin' && !actorIsSuper) {
        await refuse('only a Super Administrator grants the Super Administrator role', { type: 'app_user', id: target.id });
      }
      if (before.includes('super_admin') && !actorIsSuper) {
        await refuse('Super Administrator accounts are read-only for System Administrators', { type: 'app_user', id: target.id });
      }
      if (target.status !== 'active') throw errors.conflict('Roles can only be granted to an active account.');
      if (before.includes(body.role)) throw errors.conflict('The user already holds this role.');
      await db.query(`INSERT INTO user_role (user_id, role, granted_by, grant_reason) VALUES ($1, $2, $3, $4)`, [
        target.id,
        body.role,
        principal.userId,
        body.reason,
      ]);
      const after = [...before, body.role].sort() as GrantableRole[];
      await audit({
        operation: 'user_role.granted',
        entity: { type: 'app_user', id: target.id },
        before: { roles: before },
        after: { roles: after },
        reason: body.reason,
        reasonRequired: true,
      });
      return { status: 200, body: { userId: target.id, roles: after } };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/admin/users/:userId/roles/:role/revoke',
    params: RevokeParams,
    body: ReasonBody,
    access: allOf(staffAccountAdmin, notSelf(targetUser)),
    transactional: true,
    rateLimit: 'sensitive',
    handler: async ({ db, params, body, principal, audit, refuse }) => {
      const actorIsSuper = principal.roles.has('super_admin');
      // Lock order: Super Administrator grants first (shared by every last-Super-Admin check), then the target user.
      const supers = params.role === 'super_admin' ? await lockActiveSuperAdmins(db) : null;
      const target = await getUser(db, params.userId, { forUpdate: true });
      if (!target) throw errors.notFound('User not found.');
      const before = await activeRoles(db, target.id);
      if ((before.includes('super_admin') || params.role === 'super_admin') && !actorIsSuper) {
        await refuse('Super Administrator accounts are read-only for System Administrators', { type: 'app_user', id: target.id });
      }
      if (!before.includes(params.role)) throw errors.conflict('The user does not hold this role.');
      if (supers && supers.length <= 1 && supers.includes(target.id)) {
        throw errors.conflict('The last active Super Administrator cannot lose the role.');
      }
      await db.query(
        `UPDATE user_role SET revoked_at = now(), revoked_by = $3, revoke_reason = $4
          WHERE user_id = $1 AND role = $2 AND revoked_at IS NULL`,
        [target.id, params.role, principal.userId, body.reason],
      );
      // Batch / learner allocations that depended on this role stop counting at once (loadPrincipal joins on the
      // active role); they are not deleted, so history and re-grant behaviour stay explicit.
      const after = before.filter((r) => r !== params.role);
      await audit({
        operation: 'user_role.revoked',
        entity: { type: 'app_user', id: target.id },
        before: { roles: before },
        after: { roles: after },
        reason: body.reason,
        reasonRequired: true,
      });
      return { status: 200, body: { userId: target.id, roles: after } };
    },
  });

  // Account status. A non-active account is refused at authentication on its very next request.
  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/admin/users/:userId/status',
    params: UserIdParams,
    body: StatusBody,
    access: allOf(staffAccountAdmin, notSelf(targetUser)),
    transactional: true,
    rateLimit: 'sensitive',
    handler: async ({ db, params, body, principal, audit, refuse }) => {
      const supers = await lockActiveSuperAdmins(db);
      const target = await getUser(db, params.userId, { forUpdate: true });
      if (!target) throw errors.notFound('User not found.');
      const roles = await activeRoles(db, target.id);
      if (roles.includes('super_admin') && !principal.roles.has('super_admin')) {
        await refuse('Super Administrator accounts are read-only for System Administrators', { type: 'app_user', id: target.id });
      }
      if (target.status === body.status) throw errors.conflict(`The account is already ${body.status}.`);
      if (body.status !== 'active' && supers.length <= 1 && supers.includes(target.id)) {
        throw errors.conflict('The last active Super Administrator cannot be suspended or deactivated.');
      }
      await db.query(
        `UPDATE app_user SET status = $2, status_changed_at = now(), status_changed_by = $3,
                status_reason = $4, updated_at = now()
          WHERE id = $1`,
        [target.id, body.status, principal.userId, body.reason],
      );
      // A suspended or deactivated account loses every browser session in the same transaction (and authentication
      // re-checks the status on every request regardless).
      const sessionsRevoked = body.status === 'active' ? 0 : await revokeUserSessions(db, target.id, 'account_inactive');
      await audit({
        operation: 'user.status_changed',
        entity: { type: 'app_user', id: target.id },
        before: { status: target.status },
        after: { status: body.status, sessionsRevoked },
        reason: body.reason,
        reasonRequired: true,
      });
      return { status: 200, body: { userId: target.id, status: body.status } };
    },
  });
}
