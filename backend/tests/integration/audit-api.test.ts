import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appendAudit } from '../../src/modules/audit/audit.js';
import { createTestContext, type TestContext, type TestUser } from '../support/context.js';

/** Read-only audit API: direct API calls (not route visibility), real PostgreSQL. */
describe('audit read API', () => {
  let ctx: TestContext;
  let superAdmin: TestUser;
  const get = async (user: TestUser, query = '') =>
    ctx.app.inject({ method: 'GET', url: `/v1/audit/events${query}`, headers: await ctx.auth(user) });

  beforeAll(async () => {
    ctx = await createTestContext();
    superAdmin = await ctx.createUser({ roles: ['super_admin'] });
    const sys = { kind: 'system' as const, label: 'test.seed' };
    for (let i = 0; i < 7; i++) {
      await appendAudit(ctx.pool, { actor: sys, operation: 'test.paged_event', entity: { type: 'thing', id: `T-${i}` } });
    }
    await appendAudit(ctx.pool, {
      actor: sys,
      operation: 'test.sensitive_event',
      entity: { type: 'secret_thing', id: 'S-1' },
      before: { email: 'person@example.test', nested: { clientSecret: 'abc', phone: '+447700900123' } },
      after: { password: 'hunter2', token: 'eyJ.x.y', status: 'active' },
      metadata: { authorization: 'Bearer z', note: 'kept' },
    });
    await ctx.owner.query(
      `INSERT INTO audit_event (occurred_at, actor_type, actor_label, operation, outcome, entity_type, entity_id)
       VALUES (now() - interval '200 days', 'system', 'test.seed', 'test.old_event', 'succeeded', 'thing', 'OLD')`,
    );
  });
  afterAll(async () => ctx?.close());

  it('the Super Administrator reads events, filtered on the server by entity, operation and outcome', async () => {
    const r = await get(superAdmin, '?entityType=thing&entityId=T-3');
    expect(r.statusCode).toBe(200);
    expect(r.json().events.map((e: { entity: { id: string } }) => e.entity.id)).toEqual(['T-3']);
    const ops = await get(superAdmin, '?operation=test.paged_event&outcome=succeeded');
    expect(ops.json().events).toHaveLength(7);
  });

  it('paginates with a stable keyset cursor and bounded page sizes', async () => {
    const seen: string[] = [];
    let cursor = '';
    for (let page = 0; page < 5; page++) {
      const r = await get(superAdmin, `?operation=test.paged_event&limit=3${cursor ? `&cursor=${cursor}` : ''}`);
      expect(r.statusCode).toBe(200);
      seen.push(...r.json().events.map((e: { entity: { id: string } }) => e.entity.id));
      cursor = r.json().nextCursor;
      if (!cursor) break;
    }
    expect(seen).toEqual(['T-6', 'T-5', 'T-4', 'T-3', 'T-2', 'T-1', 'T-0']);
    expect((await get(superAdmin, '?limit=201')).statusCode).toBe(400);
    expect((await get(superAdmin, '?limit=0')).statusCode).toBe(400);
    expect((await get(superAdmin, '?cursor=bm90LWEtbnVtYmVy')).statusCode).toBe(400);
  });

  it('applies a bounded time range (default 7 days, at most 93 days)', async () => {
    const def = await get(superAdmin, '?entityId=OLD');
    expect(def.json().events).toEqual([]);
    const from = new Date(Date.now() - 210 * 86400_000).toISOString();
    const to = new Date(Date.now() - 150 * 86400_000).toISOString();
    const old = await get(superAdmin, `?entityId=OLD&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    expect(old.json().events.map((e: { entity: { id: string } }) => e.entity.id)).toEqual(['OLD']);
    const tooWide = await get(superAdmin, `?from=${encodeURIComponent(new Date(Date.now() - 100 * 86400_000).toISOString())}`);
    expect(tooWide.statusCode).toBe(400);
    expect((await get(superAdmin, '?from=yesterday')).statusCode).toBe(400);
    expect((await get(superAdmin, `?from=${encodeURIComponent(to)}&to=${encodeURIComponent(from)}`)).statusCode).toBe(400);
  });

  it('redacts credentials and masks contact details', async () => {
    const r = await get(superAdmin, '?entityId=S-1');
    const e = r.json().events[0];
    expect(e.before.email).toBe('p***@example.test');
    expect(e.before.nested.clientSecret).toBe('[redacted]');
    expect(e.before.nested.phone).toBe('*********0123');
    expect(e.after).toEqual({ password: '[redacted]', token: '[redacted]', status: 'active' });
    expect(e.metadata).toEqual({ authorization: '[redacted]', note: 'kept' });
    expect(r.body).not.toContain('hunter2');
    expect(r.body).not.toContain('person@example.test');
  });

  it('every read is itself audited', async () => {
    await get(superAdmin, '?entityType=thing');
    const row = (
      await ctx.owner.query(
        `SELECT actor_user_id, metadata FROM audit_event WHERE operation = 'audit.read' ORDER BY seq DESC LIMIT 1`,
      )
    ).rows[0];
    expect(row.actor_user_id).toBe(superAdmin.id);
    expect(row.metadata.filters.entityType).toBe('thing');
  });

  it.each([
    'system_admin',
    'academic_admin',
    'finance_admin',
    'business_admin',
    'academic_coordinator',
    'assessor',
    'teacher',
    'iqa',
    'learner',
  ] as const)('refuses %s (provisional default: Super Administrator only), and audits the refusal', async (role) => {
    const u = await ctx.createUser({ roles: [role] });
    const r = await get(u, '?entityType=thing');
    expect(r.statusCode).toBe(403);
    expect(r.body).not.toContain('T-1');
    const refusal = (
      await ctx.owner.query(
        `SELECT count(*)::int AS n FROM audit_event WHERE operation = 'authz.denied' AND actor_user_id = $1`,
        [u.id],
      )
    ).rows[0].n;
    expect(refusal).toBe(1);
  });

  it('agency users cannot read any audit information, including about their own agency', async () => {
    const agencyA = await ctx.createAgency('A');
    const agencyB = await ctx.createAgency('B');
    const adminA = await ctx.createUser({ agency: { id: agencyA, role: 'agency_admin' } });
    for (const q of [`?entityType=agency&entityId=${agencyA}`, `?entityType=agency&entityId=${agencyB}`, '']) {
      const r = await get(adminA, q);
      expect(r.statusCode).toBe(403);
    }
  });

  it('there is no update or delete operation on audit events', async () => {
    const id = (await ctx.owner.query(`SELECT id FROM audit_event LIMIT 1`)).rows[0].id;
    for (const method of ['PUT', 'PATCH', 'DELETE', 'POST'] as const) {
      for (const url of ['/v1/audit/events', `/v1/audit/events/${id}`]) {
        const r = await ctx.app.inject({ method, url, headers: await ctx.auth(superAdmin), payload: {} });
        expect([404, 405]).toContain(r.statusCode);
      }
    }
    expect(ctx.app.routeInventory.filter((x) => x.url.startsWith('/v1/audit')).map((x) => x.method).sort()).toEqual(['GET', 'HEAD']);
  });

  it('unauthenticated callers are refused', async () => {
    expect((await ctx.app.inject({ method: 'GET', url: '/v1/audit/events' })).statusCode).toBe(401);
  });
});
