import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { defineRoute } from '../../src/app/route.js';
import { withTransaction } from '../../src/database/transaction.js';
import { authenticatedUser } from '../../src/modules/authz/policy.js';
import { claimIdempotency, completeIdempotency, isFinancialOperation, purgeExpiredIdempotency } from '../../src/shared/idempotency.js';
import { createTestContext, type TestContext, type TestUser } from '../support/context.js';

/** Idempotency lifecycle: response cache vs permanent records, purge rules, concurrency. Real PostgreSQL. */
describe('idempotency lifecycle', () => {
  let ctx: TestContext;
  let admin: TestUser;
  const provision = async (key: string, email: string) =>
    ctx.app.inject({
      method: 'POST',
      url: '/v1/admin/users',
      headers: { ...(await ctx.auth(admin)), 'idempotency-key': key },
      payload: { email, displayName: 'Lifecycle Test' },
    });
  const record = async (key: string) =>
    (await ctx.owner.query(`SELECT * FROM idempotency_record WHERE idempotency_key = $1`, [key])).rows[0];

  beforeAll(async () => {
    ctx = await createTestContext();
    admin = await ctx.createUser({ roles: ['system_admin'] });
  });
  afterAll(async () => ctx?.close());

  it('ordinary operations store a temporary response cache with an expiry', async () => {
    await provision('life-cache-0001', 'cache1@example.test');
    const r = await record('life-cache-0001');
    expect(r.retention_class).toBe('response_cache');
    expect(r.expires_at).not.toBeNull();
  });

  it('purge removes only completed, expired response-cache records — never permanent ones or live ones', async () => {
    await provision('life-expired-01', 'expired1@example.test');
    await provision('life-fresh-0001', 'fresh1@example.test');
    await ctx.owner.query(
      `INSERT INTO idempotency_record (principal_user_id, operation, idempotency_key, request_fingerprint, retention_class,
                                       expires_at, created_at, completed_at, response_status, response_body)
       VALUES ($1, 'payments.capture', 'life-permanent1', repeat('a', 64), 'permanent', NULL, now() - interval '5 years',
               now() - interval '5 years', 201, '{}')`,
      [admin.id],
    );
    // created_at/expires_at are immutable for the API role; the owner moves time for the test.
    await ctx.owner.query(`ALTER TABLE idempotency_record DISABLE TRIGGER idempotency_record_guard`);
    await ctx.owner.query(
      `UPDATE idempotency_record SET created_at = now() - interval '10 days', expires_at = now() - interval '1 day'
        WHERE idempotency_key = 'life-expired-01'`,
    );
    await ctx.owner.query(`ALTER TABLE idempotency_record ENABLE TRIGGER idempotency_record_guard`);

    const purged = await purgeExpiredIdempotency(ctx.pool);
    expect(purged).toBe(1);
    expect(await record('life-expired-01')).toBeUndefined();
    expect(await record('life-fresh-0001')).toBeDefined();
    expect(await record('life-permanent1')).toBeDefined();
  });

  it('after a response cache is purged, the same key executes again (it is only a cache) — domain constraints still hold', async () => {
    const first = await provision('life-reuse-0001', 'reuse1@example.test');
    expect(first.statusCode).toBe(201);
    await ctx.owner.query(`ALTER TABLE idempotency_record DISABLE TRIGGER idempotency_record_guard`);
    await ctx.owner.query(
      `UPDATE idempotency_record SET created_at = now() - interval '10 days', expires_at = now() - interval '1 day'
        WHERE idempotency_key = 'life-reuse-0001'`,
    );
    await ctx.owner.query(`ALTER TABLE idempotency_record ENABLE TRIGGER idempotency_record_guard`);
    await purgeExpiredIdempotency(ctx.pool);
    const again = await provision('life-reuse-0001', 'reuse1@example.test');
    // The replay cache is gone, so the operation runs again — and the UNIQUE email constraint (the domain guarantee)
    // refuses the duplicate. Financial operations get both: permanent records AND domain UNIQUE keys (Stage 2).
    expect(again.statusCode).toBe(409);
    expect((await ctx.owner.query(`SELECT count(*)::int AS n FROM app_user WHERE email = 'reuse1@example.test'`)).rows[0].n).toBe(1);
  });

  it('financial operations must use permanent records (refused at route registration and at claim time)', async () => {
    expect(isFinancialOperation('payments.capture')).toBe(true);
    expect(isFinancialOperation('reservation.release')).toBe(true);
    expect(isFinancialOperation('users.provision')).toBe(false);
    const app = ctx.app as FastifyInstance;
    expect(() =>
      defineRoute(app, ctx.services, {
        method: 'POST',
        url: '/v1/test/pay',
        access: authenticatedUser,
        idempotent: { operation: 'payments.capture' },
        handler: async () => ({ status: 200, body: {} }),
      }),
    ).toThrow(/needs idempotent.retention 'permanent'/);
    await expect(
      withTransaction(ctx.pool, (tx) =>
        claimIdempotency(tx, { principalUserId: admin.id, operation: 'payment.refund', key: 'fin-key-0001', fingerprint: 'f'.repeat(64), retentionHours: 1 }),
      ),
    ).rejects.toThrow(/must use retention class "permanent"/);
    const claim = await withTransaction(ctx.pool, async (tx) => {
      const c = await claimIdempotency(tx, {
        principalUserId: admin.id,
        operation: 'payment.refund',
        key: 'fin-key-0002',
        fingerprint: 'f'.repeat(64),
        retentionHours: 1,
        retentionClass: 'permanent',
      });
      if (c.kind === 'new') await completeIdempotency(tx, c.recordId, { status: 201, body: { ok: true } });
      return c;
    });
    expect(claim.kind).toBe('new');
    const r = await record('fin-key-0002');
    expect(r.retention_class).toBe('permanent');
    expect(r.expires_at).toBeNull();
  });

  it('the database refuses an inconsistent retention class and changes to a record’s retention', async () => {
    await expect(
      ctx.owner.query(
        `INSERT INTO idempotency_record (principal_user_id, operation, idempotency_key, request_fingerprint, retention_class, expires_at)
         VALUES ($1, 'x.y', 'bad-retention-1', repeat('a', 64), 'permanent', now() + interval '1 hour')`,
        [admin.id],
      ),
    ).rejects.toMatchObject({ code: '23514' });
    await expect(
      ctx.pool.query(`UPDATE idempotency_record SET retention_class = 'response_cache' WHERE idempotency_key = 'fin-key-0002'`),
    ).rejects.toThrow(/immutable/);
  });

  it('cleanup is safe under concurrency: a purge never removes a record an in-flight duplicate is using', async () => {
    await provision('life-race-00001', 'race1@example.test');
    await ctx.owner.query(`ALTER TABLE idempotency_record DISABLE TRIGGER idempotency_record_guard`);
    await ctx.owner.query(
      `UPDATE idempotency_record SET created_at = now() - interval '10 days', expires_at = now() - interval '1 day'
        WHERE idempotency_key = 'life-race-00001'`,
    );
    await ctx.owner.query(`ALTER TABLE idempotency_record ENABLE TRIGGER idempotency_record_guard`);
    // A transaction holds the row (as a replaying request would while it reads it under lock).
    const holder = await ctx.pool.connect();
    try {
      await holder.query('BEGIN');
      await holder.query(`SELECT 1 FROM idempotency_record WHERE idempotency_key = 'life-race-00001' FOR UPDATE`);
      expect(await purgeExpiredIdempotency(ctx.pool)).toBe(0); // SKIP LOCKED: not waited on, not deleted
      await holder.query('COMMIT');
    } finally {
      holder.release();
    }
    // Several purges racing each other delete it exactly once.
    const counts = await Promise.all(Array.from({ length: 4 }, () => purgeExpiredIdempotency(ctx.pool)));
    expect(counts.reduce((a, b) => a + b, 0)).toBe(1);
  });

  it('the API role cannot delete idempotency records directly', async () => {
    await expect(ctx.pool.query(`DELETE FROM idempotency_record`)).rejects.toMatchObject({ code: '42501' });
    await expect(ctx.pool.query(`SELECT purge_expired_idempotency_records(0)`)).rejects.toThrow(/max_rows/);
  });
});
