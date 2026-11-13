import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AuditReasonRequiredError, appendAudit } from '../../src/modules/audit/audit.js';
import { withTransaction } from '../../src/database/transaction.js';
import { createTestContext, type TestContext } from '../support/context.js';

describe('append-only audit (real PostgreSQL privileges and triggers)', () => {
  let ctx: TestContext;
  let eventId: string;

  beforeAll(async () => {
    ctx = await createTestContext();
    const r = await appendAudit(ctx.pool, {
      actor: { kind: 'system', label: 'test.setup' },
      operation: 'test.event_written',
      entity: { type: 'test', id: 'T-1' },
      before: { a: 1 },
      after: { a: 2 },
      reason: 'fixture',
      request: { requestId: 'req-1', correlationId: 'corr-1', clientIp: '203.0.113.7' },
    });
    eventId = r.id;
  });
  afterAll(async () => ctx?.close());

  it('the API role can append and read audit events with full context', async () => {
    const row = (await ctx.pool.query(`SELECT * FROM audit_event WHERE id = $1`, [eventId])).rows[0];
    expect(row).toMatchObject({
      actor_type: 'system',
      actor_label: 'test.setup',
      operation: 'test.event_written',
      outcome: 'succeeded',
      entity_type: 'test',
      entity_id: 'T-1',
      request_id: 'req-1',
      correlation_id: 'corr-1',
      client_ip: '203.0.113.7',
      before_state: { a: 1 },
      after_state: { a: 2 },
      reason: 'fixture',
    });
    expect(row.occurred_at).toBeInstanceOf(Date);
  });

  it.each([
    ['UPDATE', `UPDATE audit_event SET reason = 'rewritten'`],
    ['DELETE', `DELETE FROM audit_event`],
    ['TRUNCATE', `TRUNCATE audit_event`],
  ])('the API role cannot %s audit events (no privilege)', async (_op, sql) => {
    await expect(ctx.pool.query(sql)).rejects.toMatchObject({ code: '42501' });
  });

  it.each([
    ['UPDATE', `UPDATE audit_event SET reason = 'rewritten'`],
    ['DELETE', `DELETE FROM audit_event`],
    // Since Stage 2A, seat_allocation references audit_event (audit linkage), so a plain TRUNCATE is refused earlier by
    // the foreign key; CASCADE gets past that check and reaches the append-only trigger, which still refuses it.
    ['TRUNCATE', `TRUNCATE audit_event CASCADE`],
  ])('even the schema owner cannot %s audit events (trigger)', async (_op, sql) => {
    await expect(ctx.owner.query(sql)).rejects.toThrow(/append-only/);
  });

  it('a plain TRUNCATE by the schema owner is refused as well (referenced by seat allocations)', async () => {
    await expect(ctx.owner.query(`TRUNCATE audit_event`)).rejects.toMatchObject({ code: '0A000' });
  });

  it('history is unchanged after every attempt', async () => {
    const row = (await ctx.owner.query(`SELECT reason FROM audit_event WHERE id = $1`, [eventId])).rows[0];
    expect(row.reason).toBe('fixture');
  });

  it('the API role cannot disable the triggers or alter the table', async () => {
    await expect(ctx.pool.query(`ALTER TABLE audit_event DISABLE TRIGGER audit_event_no_update_delete`)).rejects.toMatchObject({
      code: '42501',
    });
    await expect(ctx.pool.query(`DROP TABLE audit_event`)).rejects.toMatchObject({ code: '42501' });
  });

  it('the API role cannot delete rows anywhere in the foundation schema', async () => {
    for (const t of ['app_user', 'user_identity', 'user_role', 'staff_scope', 'agency', 'agency_user', 'idempotency_record']) {
      await expect(ctx.pool.query(`DELETE FROM ${t}`)).rejects.toMatchObject({ code: '42501' });
    }
  });

  it('a user actor must be a real user; a system actor must be labelled (database CHECK)', async () => {
    await expect(
      ctx.pool.query(`INSERT INTO audit_event (actor_type, operation, outcome, entity_type) VALUES ('user', 'x.y', 'succeeded', 't')`),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      ctx.pool.query(`INSERT INTO audit_event (actor_type, operation, outcome, entity_type) VALUES ('system', 'x.y', 'succeeded', 't')`),
    ).rejects.toMatchObject({ code: '23514' });
  });

  it('refuses to write an event that requires a reason without one', async () => {
    await expect(
      appendAudit(ctx.pool, {
        actor: { kind: 'system', label: 'test' },
        operation: 'test.override',
        entity: { type: 'test' },
        reason: '   ',
        reasonRequired: true,
      }),
    ).rejects.toBeInstanceOf(AuditReasonRequiredError);
  });

  it('an audit row written in a rolled-back transaction disappears with the state change', async () => {
    await expect(
      withTransaction(ctx.pool, async (tx) => {
        await appendAudit(tx, { actor: { kind: 'system', label: 't' }, operation: 'test.rolled_back', entity: { type: 'test' } });
        throw new Error('business failure');
      }),
    ).rejects.toThrow('business failure');
    const n = await ctx.pool.query(`SELECT count(*)::int AS n FROM audit_event WHERE operation = 'test.rolled_back'`);
    expect(n.rows[0].n).toBe(0);
  });

  it('records the server-derived actor, roles, request id and socket IP — not client-supplied values', async () => {
    const admin = await ctx.createUser({ roles: ['system_admin'] });
    const r = await ctx.app.inject({
      method: 'POST',
      url: '/v1/admin/users',
      remoteAddress: '198.51.100.20',
      headers: {
        ...(await ctx.auth(admin)),
        'idempotency-key': 'audit-actor-test-1',
        'x-forwarded-for': '1.2.3.4',
        'x-request-id': 'client-chosen-id',
        'x-correlation-id': 'flow-42',
      },
      payload: { email: 'new.person@example.test', displayName: 'New Person' },
    });
    expect(r.statusCode).toBe(201);
    expect(r.headers['x-request-id']).not.toBe('client-chosen-id');
    const row = (
      await ctx.owner.query(`SELECT * FROM audit_event WHERE operation = 'user.provisioned' AND entity_id = $1`, [r.json().id])
    ).rows[0];
    expect(row).toMatchObject({
      actor_type: 'user',
      actor_user_id: admin.id,
      actor_roles: ['system_admin'],
      request_id: r.headers['x-request-id'],
      correlation_id: 'flow-42',
      client_ip: '198.51.100.20', // TRUST_PROXY=false: X-Forwarded-For ignored
      after_state: { email: 'new.person@example.test', displayName: 'New Person', status: 'active', identityLinked: false },
    });
  });

  it('honours X-Forwarded-For only from a configured trusted proxy', async () => {
    const local = await createTestContext({ TRUST_PROXY: '127.0.0.1' });
    try {
      const admin = await local.createUser({ roles: ['system_admin'] });
      const call = async (remoteAddress: string, key: string) =>
        local.app.inject({
          method: 'POST',
          url: '/v1/admin/users',
          remoteAddress,
          headers: { ...(await local.auth(admin)), 'idempotency-key': key, 'x-forwarded-for': '203.0.113.99' },
          payload: { email: `${key}@example.test`, displayName: key },
        });
      const viaProxy = await call('127.0.0.1', 'trusted-proxy-1');
      const direct = await call('198.51.100.5', 'untrusted-1');
      const ip = async (id: string) =>
        (await local.owner.query(`SELECT host(client_ip) AS ip FROM audit_event WHERE entity_id = $1`, [id])).rows[0].ip;
      expect(await ip(viaProxy.json().id)).toBe('203.0.113.99');
      expect(await ip(direct.json().id)).toBe('198.51.100.5');
    } finally {
      await local.close();
    }
  });

  it('the application exposes no audit update or delete endpoint', () => {
    const writes = ctx.app.routeInventory.filter((r) => /audit/i.test(r.url) && r.method !== 'GET' && r.method !== 'HEAD');
    expect(writes).toEqual([]);
  });

  it('owner connections from a plain client are also refused (sanity: not a pool artefact)', async () => {
    const c = new pg.Client({ connectionString: ctx.db.ownerUrl });
    await c.connect();
    try {
      await expect(c.query(`DELETE FROM audit_event WHERE id = $1`, [eventId])).rejects.toThrow(/append-only/);
    } finally {
      await c.end();
    }
  });
});
