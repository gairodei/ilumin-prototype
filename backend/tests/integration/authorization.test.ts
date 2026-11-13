import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app.js';
import { loadPrincipal } from '../../src/modules/auth/principal.js';
import { ROLES, type GrantableRole } from '../../src/modules/auth/roles.js';
import {
  allocatedAssessor,
  assignedToBatch,
  coordinatorOfBatch,
  isIndependentOfBatch,
  param,
} from '../../src/modules/authz/policy.js';
import { createTestContext, type TestContext, type TestUser } from '../support/context.js';

const BATCH_1 = '11111111-1111-4111-8111-111111111111';
const BATCH_2 = '22222222-2222-4222-8222-222222222222';

describe('server-side authorization', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestContext();
  });
  afterAll(async () => ctx?.close());

  const get = async (url: string, user: TestUser) =>
    ctx.app.inject({ method: 'GET', url, headers: await ctx.auth(user) });

  describe('role matrix on staff-account administration (PD-MR-G1-01)', () => {
    const allowed: GrantableRole[] = ['super_admin', 'system_admin'];
    const refused = ROLES.filter((r) => !allowed.includes(r as GrantableRole));

    it.each(allowed)('%s may read a staff account', async (role) => {
      const actor = await ctx.createUser({ roles: [role] });
      const target = await ctx.createUser();
      expect((await get(`/v1/admin/users/${target.id}`, actor)).statusCode).toBe(200);
    });

    it.each(refused)('%s is refused (and the refusal is audited)', async (role) => {
      const agency = role === 'agency_user' ? await ctx.createAgency() : null;
      const actor = await ctx.createUser(
        agency ? { agency: { id: agency, role: 'agency_admin' } } : { roles: [role as GrantableRole] },
      );
      const target = await ctx.createUser();
      const r = await get(`/v1/admin/users/${target.id}`, actor);
      expect(r.statusCode).toBe(403);
      expect(r.json().error.code).toBe('FORBIDDEN');
      const a = await ctx.owner.query(
        `SELECT operation, outcome, entity_type, entity_id, request_id, metadata->>'policy' AS policy
           FROM audit_event WHERE actor_user_id = $1`,
        [actor.id],
      );
      expect(a.rows).toEqual([
        {
          operation: 'authz.denied',
          outcome: 'refused',
          entity_type: 'route',
          entity_id: 'GET /v1/admin/users/:userId',
          request_id: r.headers['x-request-id'],
          policy: 'hasAnyRole(super_admin|system_admin)',
        },
      ]);
    });

    it('a user with no role at all is refused', async () => {
      const nobody = await ctx.createUser();
      const target = await ctx.createUser();
      expect((await get(`/v1/admin/users/${target.id}`, nobody)).statusCode).toBe(403);
    });
  });

  describe('role grants', () => {
    const grant = async (actor: TestUser, targetId: string, role: string, key = `grant-${Math.random().toString(36).slice(2)}`) =>
      ctx.app.inject({
        method: 'POST',
        url: `/v1/admin/users/${targetId}/roles`,
        headers: { ...(await ctx.auth(actor)), 'idempotency-key': key },
        payload: { role, reason: 'joins the finance team' },
      });

    it('a System Administrator grants a role; before/after and reason are audited', async () => {
      const admin = await ctx.createUser({ roles: ['system_admin'] });
      const target = await ctx.createUser({ roles: ['teacher'] });
      const r = await grant(admin, target.id, 'finance_admin');
      expect(r.statusCode).toBe(200);
      expect(r.json()).toEqual({ userId: target.id, roles: ['finance_admin', 'teacher'] });
      const a = await ctx.owner.query(
        `SELECT actor_user_id, actor_roles, operation, before_state, after_state, reason FROM audit_event
          WHERE entity_id = $1 AND operation = 'user_role.granted'`,
        [target.id],
      );
      expect(a.rows).toEqual([
        {
          actor_user_id: admin.id,
          actor_roles: ['system_admin'],
          operation: 'user_role.granted',
          before_state: { roles: ['teacher'] },
          after_state: { roles: ['finance_admin', 'teacher'] },
          reason: 'joins the finance team',
        },
      ]);
    });

    it('nobody grants roles to themselves (policy, and a database CHECK)', async () => {
      const admin = await ctx.createUser({ roles: ['super_admin'] });
      expect((await grant(admin, admin.id, 'finance_admin')).statusCode).toBe(403);
      await expect(
        ctx.owner.query(`INSERT INTO user_role (user_id, role, granted_by) VALUES ($1, 'finance_admin', $1)`, [admin.id]),
      ).rejects.toMatchObject({ code: '23514' });
    });

    it('a System Administrator cannot grant Super Administrator or change a Super Administrator', async () => {
      const sys = await ctx.createUser({ roles: ['system_admin'] });
      const plain = await ctx.createUser();
      const sup = await ctx.createUser({ roles: ['super_admin'] });
      expect((await grant(sys, plain.id, 'super_admin')).statusCode).toBe(403);
      expect((await grant(sys, sup.id, 'teacher')).statusCode).toBe(403);
      const roles = await ctx.owner.query(`SELECT role FROM user_role WHERE user_id = ANY($1) AND revoked_at IS NULL`, [[plain.id, sup.id]]);
      expect(roles.rows.map((x) => x.role)).toEqual(['super_admin']);
      const refusals = await ctx.owner.query(`SELECT count(*)::int AS n FROM audit_event WHERE actor_user_id = $1 AND outcome = 'refused'`, [sys.id]);
      expect(refusals.rows[0].n).toBe(2);
    });

    it('a Super Administrator can grant Super Administrator', async () => {
      const sup = await ctx.createUser({ roles: ['super_admin'] });
      const plain = await ctx.createUser();
      expect((await grant(sup, plain.id, 'super_admin')).statusCode).toBe(200);
    });

    it('validates the role name and refuses the derived agency_user role', async () => {
      const sup = await ctx.createUser({ roles: ['super_admin'] });
      const plain = await ctx.createUser();
      for (const bad of ['agency_user', 'root', '']) {
        const r = await grant(sup, plain.id, bad);
        expect(r.statusCode).toBe(400);
        expect(r.json().error.details[0].path).toBe('body.role');
      }
    });

    it('the last active Super Administrator cannot be removed, revoked or deactivated', async () => {
      const local = await createTestContext();
      try {
        const sup = await local.createUser({ roles: ['super_admin'] });
        const sys = await local.createUser({ roles: ['system_admin'] });
        const revoke = await local.app.inject({
          method: 'POST',
          url: `/v1/admin/users/${sup.id}/roles/super_admin/revoke`,
          headers: await local.auth(sys),
          payload: { reason: 'cleanup' },
        });
        expect(revoke.statusCode).toBe(403); // System Admins can't touch Super Admin records
        const sup2 = await local.createUser({ roles: ['super_admin'] });
        const deact = (actor: TestUser, target: TestUser) =>
          local.auth(actor).then((h) =>
            local.app.inject({ method: 'POST', url: `/v1/admin/users/${target.id}/status`, headers: h, payload: { status: 'deactivated', reason: 'left' } }),
          );
        // Two Super Admins try to deactivate each other at the same moment: exactly one may succeed.
        const [a, b] = await Promise.all([deact(sup, sup2), deact(sup2, sup)]);
        expect([a.statusCode, b.statusCode].sort()).toEqual([200, 409].sort((x, y) => x - y));
        const active = await local.owner.query(
          `SELECT count(*)::int AS n FROM user_role r JOIN app_user u ON u.id = r.user_id
            WHERE r.role = 'super_admin' AND r.revoked_at IS NULL AND u.status = 'active'`,
        );
        expect(active.rows[0].n).toBe(1);
      } finally {
        await local.close();
      }
    });
  });

  describe('ownership and tenant isolation', () => {
    it('a user reads their own profile but not someone else’s', async () => {
      const learner = await ctx.createUser({ roles: ['learner'] });
      const other = await ctx.createUser({ roles: ['learner'] });
      expect((await get(`/v1/users/${learner.id}`, learner)).statusCode).toBe(200);
      expect((await get(`/v1/users/${other.id}`, learner)).statusCode).toBe(403);
    });

    it('an agency user sees only their own agency (cross-agency access refused, no enumeration)', async () => {
      const agencyA = await ctx.createAgency('A');
      const agencyB = await ctx.createAgency('B');
      const userA = await ctx.createUser({ agency: { id: agencyA, role: 'agency_admin' } });
      await ctx.createUser({ agency: { id: agencyB } });
      const own = await get(`/v1/agencies/${agencyA}/members`, userA);
      expect(own.statusCode).toBe(200);
      expect(own.json().members.map((m: { userId: string }) => m.userId)).toEqual([userA.id]);
      const other = await get(`/v1/agencies/${agencyB}/members`, userA);
      expect(other.statusCode).toBe(403);
      const missing = await get(`/v1/agencies/99999999-9999-4999-8999-999999999999/members`, userA);
      expect(missing.statusCode).toBe(403); // same answer as an existing foreign agency
    });

    it('a deactivated agency or a revoked membership loses agency access at once', async () => {
      const agency = await ctx.createAgency('C');
      const u = await ctx.createUser({ agency: { id: agency } });
      expect((await get(`/v1/agencies/${agency}/members`, u)).statusCode).toBe(200);
      await ctx.owner.query(`UPDATE agency SET status = 'inactive' WHERE id = $1`, [agency]);
      expect((await get(`/v1/agencies/${agency}/members`, u)).statusCode).toBe(403);
      await ctx.owner.query(`UPDATE agency SET status = 'active' WHERE id = $1`, [agency]);
      await ctx.owner.query(`UPDATE agency_user SET revoked_at = now(), revoke_reason = 'left' WHERE user_id = $1`, [u.id]);
      expect((await get(`/v1/agencies/${agency}/members`, u)).statusCode).toBe(403);
    });

    it('Business Admin and Super Administrator see any agency; Finance does not', async () => {
      const agency = await ctx.createAgency('D');
      for (const [role, status] of [['business_admin', 200], ['super_admin', 200], ['finance_admin', 403], ['academic_admin', 403]] as const) {
        const u = await ctx.createUser({ roles: [role] });
        expect((await get(`/v1/agencies/${agency}/members`, u)).statusCode).toBe(status);
      }
    });
  });

  describe('scope primitives against database-loaded principals', () => {
    const principalOf = async (u: TestUser) => {
      const row = (await ctx.pool.query(`SELECT id, email, display_name, status FROM app_user WHERE id = $1`, [u.id])).rows[0];
      return loadPrincipal(ctx.pool, row, { issuer: ctx.issuer.issuer, subject: u.subject });
    };
    const evalPol = async (pol: ReturnType<typeof assignedToBatch>, u: TestUser, params: Record<string, string>) =>
      (await pol.evaluate({ principal: await principalOf(u), params, query: {}, db: ctx.pool })).allow;

    it('Coordinator assignment and batch assignment', async () => {
      const coord = await ctx.createUser({ roles: ['academic_coordinator'], scopes: [{ role: 'academic_coordinator', kind: 'batch', id: BATCH_1 }] });
      expect(await evalPol(coordinatorOfBatch(param('b')), coord, { b: BATCH_1 })).toBe(true);
      expect(await evalPol(coordinatorOfBatch(param('b')), coord, { b: BATCH_2 })).toBe(false);
    });

    it('a scope stops counting when its role is revoked or the scope is revoked', async () => {
      const t = await ctx.createUser({ roles: ['teacher'], scopes: [{ role: 'teacher', kind: 'batch', id: BATCH_1 }] });
      const pol = assignedToBatch(param('b'), ['teacher']);
      expect(await evalPol(pol, t, { b: BATCH_1 })).toBe(true);
      await ctx.owner.query(`UPDATE user_role SET revoked_at = now(), revoke_reason = 'x' WHERE user_id = $1`, [t.id]);
      expect(await evalPol(pol, t, { b: BATCH_1 })).toBe(false);
      const t2 = await ctx.createUser({ roles: ['teacher'], scopes: [{ role: 'teacher', kind: 'batch', id: BATCH_1 }] });
      await ctx.owner.query(`UPDATE staff_scope SET revoked_at = now(), revoke_reason = 'x' WHERE user_id = $1`, [t2.id]);
      expect(await evalPol(pol, t2, { b: BATCH_1 })).toBe(false);
    });

    it('Assessor allocation by batch and by learner override', async () => {
      const learnerId = '33333333-3333-4333-8333-333333333333';
      const byBatch = await ctx.createUser({ roles: ['assessor'], scopes: [{ role: 'assessor', kind: 'batch', id: BATCH_1 }] });
      const byLearner = await ctx.createUser({ roles: ['assessor'], scopes: [{ role: 'assessor', kind: 'learner', id: learnerId }] });
      const pol = allocatedAssessor(param('learner'), param('batch'));
      expect(await evalPol(pol, byBatch, { learner: learnerId, batch: BATCH_1 })).toBe(true);
      expect(await evalPol(pol, byBatch, { learner: learnerId, batch: BATCH_2 })).toBe(false);
      expect(await evalPol(pol, byLearner, { learner: learnerId, batch: BATCH_2 })).toBe(true);
    });

    it('learner-level scopes are Assessor-only (database CHECK)', async () => {
      const t = await ctx.createUser({ roles: ['teacher'] });
      await expect(
        ctx.owner.query(`INSERT INTO staff_scope (user_id, role, scope_kind, scope_id) VALUES ($1, 'teacher', 'learner', $2)`, [t.id, BATCH_1]),
      ).rejects.toMatchObject({ code: '23514' });
    });

    it('IQA independence: not the batch’s Teacher, Assessor or Coordinator (PD-IQB-02)', async () => {
      const both = await ctx.createUser({ roles: ['iqa', 'teacher'], scopes: [{ role: 'teacher', kind: 'batch', id: BATCH_1 }] });
      expect(await isIndependentOfBatch(ctx.pool, both.id, BATCH_1)).toBe(false);
      expect(await isIndependentOfBatch(ctx.pool, both.id, BATCH_2)).toBe(true);
    });
  });

  describe('fail closed', () => {
    it('the application refuses to start if a route has no access rule', async () => {
      const built = await buildApp(ctx.services, { logger: false });
      expect(() => built.get('/v1/unguarded', async () => 'x')).toThrow(/has no access rule/);
      expect(() => built.post('/v1/unguarded-write', async () => 'x')).toThrow(/has no access rule/);
      await built.close();
    });

    it('unknown routes return 404 JSON (not a default page)', async () => {
      const r = await ctx.app.inject({ method: 'GET', url: '/v1/does-not-exist' });
      expect(r.statusCode).toBe(404);
      expect(r.json().error.code).toBe('NOT_FOUND');
    });

    it('there is no unauthenticated write endpoint; only the health checks are public', () => {
      const inv = ctx.app.routeInventory;
      expect(inv.length).toBeGreaterThan(5);
      const pub = inv.filter((r) => r.access === 'public').map((r) => `${r.method} ${r.url}`).sort();
      expect(pub).toEqual(['GET /health/live', 'GET /health/ready', 'HEAD /health/live', 'HEAD /health/ready']);
      for (const r of inv.filter((x) => !['GET', 'HEAD'].includes(x.method))) expect(r.access).not.toBe('public');
    });
  });
});
