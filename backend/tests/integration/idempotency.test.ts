import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTransaction } from '../../src/database/transaction.js';
import { claimIdempotency, completeIdempotency, fingerprint } from '../../src/shared/idempotency.js';
import { createTestContext, type TestContext, type TestUser } from '../support/context.js';

describe('idempotency (real PostgreSQL, concurrent transactions)', () => {
  let ctx: TestContext;
  let admin: TestUser;

  beforeAll(async () => {
    ctx = await createTestContext();
    admin = await ctx.createUser({ roles: ['system_admin'] });
  });
  afterAll(async () => ctx?.close());

  const provision = async (key: string | undefined, payload: Record<string, unknown>, actor = admin) =>
    ctx.app.inject({
      method: 'POST',
      url: '/v1/admin/users',
      headers: { ...(await ctx.auth(actor)), ...(key === undefined ? {} : { 'idempotency-key': key }) },
      payload,
    });

  const countUsers = async (email: string) =>
    (await ctx.owner.query(`SELECT count(*)::int AS n FROM app_user WHERE email = $1`, [email])).rows[0].n;
  const countAudit = async (op: string, email: string) =>
    (await ctx.owner.query(`SELECT count(*)::int AS n FROM audit_event WHERE operation = $1 AND after_state->>'email' = $2`, [op, email]))
      .rows[0].n;

  it('requires an Idempotency-Key on idempotent operations', async () => {
    const r = await provision(undefined, { email: 'nokey@example.test', displayName: 'No Key' });
    expect(r.statusCode).toBe(400);
    expect(r.json().error.code).toBe('IDEMPOTENCY_KEY_REQUIRED');
    expect(await countUsers('nokey@example.test')).toBe(0);
    const bad = await provision('bad key!', { email: 'nokey@example.test', displayName: 'No Key' });
    expect(bad.json().error.code).toBe('IDEMPOTENCY_KEY_INVALID');
  });

  it('a retry with the same key and body returns the stored result and writes nothing more', async () => {
    const body = { email: 'retry@example.test', displayName: 'Retry Person' };
    const first = await provision('retry-key-0001', body);
    expect(first.statusCode).toBe(201);
    expect(first.headers['idempotent-replayed']).toBeUndefined();
    const second = await provision('retry-key-0001', { displayName: 'Retry Person', email: 'retry@example.test' }); // key order differs
    expect(second.statusCode).toBe(201);
    expect(second.headers['idempotent-replayed']).toBe('true');
    expect(second.json()).toEqual(first.json());
    expect(await countUsers('retry@example.test')).toBe(1);
    expect(await countAudit('user.provisioned', 'retry@example.test')).toBe(1);
  });

  it('the same key with a different request is refused (422) and changes nothing', async () => {
    await provision('conflict-key-01', { email: 'c1@example.test', displayName: 'C One' });
    const r = await provision('conflict-key-01', { email: 'c2@example.test', displayName: 'C Two' });
    expect(r.statusCode).toBe(422);
    expect(r.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED');
    expect(await countUsers('c2@example.test')).toBe(0);
  });

  it('keys are scoped by principal: another user’s identical key is independent', async () => {
    const other = await ctx.createUser({ roles: ['super_admin'] });
    const a = await provision('shared-key-0001', { email: 'p1@example.test', displayName: 'P1' });
    const b = await provision('shared-key-0001', { email: 'p2@example.test', displayName: 'P2' }, other);
    expect(a.statusCode).toBe(201);
    expect(b.statusCode).toBe(201);
    expect(b.headers['idempotent-replayed']).toBeUndefined();
  });

  it('keys are scoped by operation', async () => {
    const target = await ctx.createUser();
    const p = await provision('cross-op-key-01', { email: 'op1@example.test', displayName: 'Op' });
    const g = await ctx.app.inject({
      method: 'POST',
      url: `/v1/admin/users/${target.id}/roles`,
      headers: { ...(await ctx.auth(admin)), 'idempotency-key': 'cross-op-key-01' },
      payload: { role: 'teacher', reason: 'scope test' },
    });
    expect(p.statusCode).toBe(201);
    expect(g.statusCode).toBe(200);
  });

  it('a failed operation stores nothing, so a corrected retry executes', async () => {
    await provision('dup-email-key-1', { email: 'taken@example.test', displayName: 'First' });
    const clash = await provision('dup-email-key-2', { email: 'taken@example.test', displayName: 'Second' });
    expect(clash.statusCode).toBe(409);
    const stored = await ctx.owner.query(`SELECT count(*)::int AS n FROM idempotency_record WHERE idempotency_key = 'dup-email-key-2'`);
    expect(stored.rows[0].n).toBe(0);
    // Same key retried (still conflicting) re-executes and is refused again rather than replaying a phantom success.
    expect((await provision('dup-email-key-2', { email: 'taken@example.test', displayName: 'Second' })).statusCode).toBe(409);
  });

  it('concurrent duplicates: exactly one execution, every caller gets the same result', async () => {
    const body = { email: 'race@example.test', displayName: 'Race Person' };
    const results = await Promise.all(Array.from({ length: 12 }, () => provision('race-key-000001', body)));
    expect(results.map((r) => r.statusCode)).toEqual(Array(12).fill(201));
    const ids = new Set(results.map((r) => r.json().id));
    expect(ids.size).toBe(1);
    expect(results.filter((r) => r.headers['idempotent-replayed'] === 'true')).toHaveLength(11);
    expect(await countUsers('race@example.test')).toBe(1);
    expect(await countAudit('user.provisioned', 'race@example.test')).toBe(1);
  });

  it('concurrent conflicting requests with one key: one wins, the others are refused', async () => {
    const results = await Promise.all(
      Array.from({ length: 6 }, (_, i) => provision('race-conflict-01', { email: `rc${i}@example.test`, displayName: `RC ${i}` })),
    );
    const codes = results.map((r) => r.statusCode).sort();
    expect(codes.filter((c) => c === 201)).toHaveLength(1);
    expect(codes.filter((c) => c === 422)).toHaveLength(5);
  });

  it('a duplicate waits for the in-flight transaction; if that rolls back, the duplicate executes', async () => {
    const principalUserId = admin.id;
    const fp = fingerprint({ op: 'manual' });
    let releaseFirst!: () => void;
    const firstHolding = new Promise<void>((r) => (releaseFirst = r));
    let firstClaimed!: () => void;
    const claimed = new Promise<void>((r) => (firstClaimed = r));

    const first = withTransaction(
      ctx.pool,
      async (tx) => {
        const c = await claimIdempotency(tx, { principalUserId, operation: 'test.manual', key: 'manual-key-0001', fingerprint: fp, retentionHours: 1 });
        expect(c.kind).toBe('new');
        firstClaimed();
        await firstHolding;
        throw new Error('first attempt fails after claiming');
      },
      { retries: 0 },
    ).catch((e: Error) => e.message);

    await claimed;
    const second = withTransaction(ctx.pool, async (tx) => {
      const c = await claimIdempotency(tx, { principalUserId, operation: 'test.manual', key: 'manual-key-0001', fingerprint: fp, retentionHours: 1 });
      expect(c.kind).toBe('new'); // the first rolled back, so this one owns the key
      if (c.kind === 'new') await completeIdempotency(tx, c.recordId, { status: 200, body: { ok: 'second' } });
      return c.kind;
    });
    await new Promise((r) => setTimeout(r, 200)); // second is now blocked on the unique index
    releaseFirst();
    expect(await first).toBe('first attempt fails after claiming');
    expect(await second).toBe('new');
    const rows = await ctx.owner.query(`SELECT response_body FROM idempotency_record WHERE idempotency_key = 'manual-key-0001'`);
    expect(rows.rows).toEqual([{ response_body: { ok: 'second' } }]);
  });

  it('a completed record is immutable (trigger), including for the owner', async () => {
    await expect(
      ctx.owner.query(`UPDATE idempotency_record SET response_status = 500 WHERE idempotency_key = 'retry-key-0001'`),
    ).rejects.toThrow(/immutable/);
  });
});
