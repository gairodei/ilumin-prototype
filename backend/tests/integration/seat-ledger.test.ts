import { randomUUID } from 'node:crypto';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app.js';
import { defineRoute } from '../../src/app/route.js';
import { createPool, type Pool, type PoolClient } from '../../src/database/pool.js';
import { withTransaction } from '../../src/database/transaction.js';
import { appendAudit } from '../../src/modules/audit/audit.js';
import { hasAnyRole } from '../../src/modules/authz/policy.js';
import {
  allocateSeat,
  allocationHistory,
  checkSeatInvariants,
  readOccupancy,
  releaseSeat,
  secureSeat,
  type SeatSubject,
} from '../../src/modules/seats/seat-service.js';
import { mapDatabaseError } from '../../src/shared/db-errors.js';
import { AppError } from '../../src/shared/errors.js';
import { createTestContext, type TestContext, type TestUser } from '../support/context.js';
import { allowEligibility, batchFor, domainFixture, type DomainFixture, learner, publishedProgramme } from '../support/domain.js';

/**
 * Stage 2A main acceptance: the seat ledger is concurrency-safe on real PostgreSQL. Races use independent connections
 * (a dedicated pool, one connection per attempt) and are forced to contend: a blocker transaction holds the batch row
 * lock until every attempt is queued on it, then lets them go at once.
 */

const SYSTEM = { actor: { kind: 'system' as const, label: 'test: future enrolment service' } };
const errCode = (e: unknown) => (e instanceof AppError ? e.code : ((e as { code?: string }).code ?? String(e)));

describe('seat ledger (P1) on PostgreSQL', () => {
  let ctx: TestContext;
  let f: DomainFixture;
  let racers: Pool;
  let admin: pg.Client;
  let fo: Awaited<ReturnType<typeof publishedProgramme>>;

  beforeAll(async () => {
    ctx = await createTestContext();
    f = await domainFixture(ctx);
    // 20 racers + the blocker + one spare. Files run in parallel against one cluster: keep the budget tight.
    racers = createPool({ ...ctx.config.database, poolMax: 22 }, 'ilumin-test-racers');
    admin = new pg.Client({ connectionString: ctx.db.adminUrl });
    await admin.connect();
    fo = await publishedProgramme(ctx, f, { level: 3 });
  });
  afterAll(async () => {
    await racers?.end();
    await admin?.end();
    await ctx?.close();
  });

  const optionA = () => fo.version.feeOptions[0]!.id;
  const learnerSubject = (u: TestUser): SeatSubject => ({ kind: 'learner', learnerUserId: u.id });

  const allocate = (pool: Pool, batchId: string, who: TestUser, ref = `ENR-${who.id}`, extra: Record<string, unknown> = {}) =>
    withTransaction(
      pool,
      (tx) =>
        allocateSeat(tx, SYSTEM, {
          batchId,
          subject: learnerSubject(who),
          feeOptionId: optionA(),
          authority: { kind: 'enrolment_confirmation', ref },
          eligibility: allowEligibility(),
          ...extra,
        }),
      { lockTimeoutMs: 15_000 },
    );

  /** Holds the batch row lock until `expected` other sessions wait on a lock, then commits. */
  async function contend<T>(batchId: string, expected: number, launch: () => Promise<T>[]): Promise<PromiseSettledResult<T>[]> {
    const blocker = await racers.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT 1 FROM batch WHERE id = $1 FOR UPDATE', [batchId]);
      const attempts = launch();
      // An attempt that fails before reaching the lock (e.g. no connection) is reported at once, not as a timeout.
      let early: unknown = null;
      for (const p of attempts) p.catch((e) => (early ??= e));
      const deadline = Date.now() + 15_000;
      for (;;) {
        if (early) throw new Error(`an attempt failed before reaching the batch lock: ${String((early as Error).message ?? early)}`);
        const w = await admin.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pg_stat_activity
            WHERE datname = $1 AND application_name = 'ilumin-test-racers' AND wait_event_type = 'Lock'`,
          [ctx.db.name],
        );
        if (w.rows[0]!.n >= expected) break;
        if (Date.now() > deadline) throw new Error(`only ${w.rows[0]!.n} of ${expected} attempts reached the batch lock`);
        await new Promise((r) => setTimeout(r, 20));
      }
      await blocker.query('COMMIT');
      return await Promise.allSettled(attempts);
    } finally {
      await blocker.query('ROLLBACK').catch(() => {}); // no-op after COMMIT; ends the transaction on an early failure
      blocker.release();
    }
  }

  const count = async (sql: string, params: unknown[]) => (await ctx.owner.query<{ n: number }>(sql, params)).rows[0]!.n;
  const auditCount = (op: string, batchId: string) =>
    count(`SELECT count(*)::int AS n FROM audit_event WHERE operation = $1 AND metadata->>'batchId' = $2`, [op, batchId]);
  const outboxCount = (topic: string, batchId: string) =>
    count(`SELECT count(*)::int AS n FROM outbox_message WHERE topic = $1 AND payload->>'batchId' = $2`, [topic, batchId]);

  describe('last seat race', () => {
    it('20 concurrent attempts for the last place: exactly one wins, the rest fail cleanly, nothing is overbooked', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 3 });
      for (let i = 0; i < 2; i++) await allocate(ctx.pool, batch.id, await learner(ctx));
      const people = await Promise.all(Array.from({ length: 20 }, () => learner(ctx)));

      // Each attempt also claims a PERMANENT Stage 1B idempotency record in the same transaction, as a route would.
      const results = await contend(batch.id, 20, () =>
        people.map((p) =>
          withTransaction(
            racers,
            async (tx: PoolClient) => {
              await tx.query(
                `INSERT INTO idempotency_record (principal_user_id, operation, idempotency_key, request_fingerprint, retention_class, expires_at)
                 VALUES ($1, 'seat.test_allocate', $2, 'fp', 'permanent', NULL)`,
                [p.id, `race-${p.id}`],
              );
              return allocateSeat(tx, SYSTEM, {
                batchId: batch.id,
                subject: learnerSubject(p),
                feeOptionId: optionA(),
                authority: { kind: 'enrolment_confirmation', ref: `ENR-${p.id}` },
                eligibility: allowEligibility(),
              });
            },
            { lockTimeoutMs: 15_000 },
          ),
        ),
      );

      const won = results.filter((r) => r.status === 'fulfilled');
      const lost = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
      expect(won).toHaveLength(1);
      expect(lost).toHaveLength(19);
      expect(new Set(lost.map((r) => errCode(r.reason)))).toEqual(new Set(['BATCH_FULL']));

      const occ = (await readOccupancy(ctx.pool, batch.id))!;
      expect(occ).toMatchObject({ capacity: 3, active: 3, available: 0, acceptingAllocations: false });
      expect(await checkSeatInvariants(ctx.pool, batch.id)).toEqual([]);
      // Audit, outbox and idempotency reconcile with the ledger: 3 places, 3 allocation events, 3 messages, and exactly
      // one committed idempotency claim (the 19 refusals rolled theirs back).
      expect(await count(`SELECT count(*)::int AS n FROM seat_allocation WHERE batch_id = $1`, [batch.id])).toBe(3);
      expect(await auditCount('seat.allocated', batch.id)).toBe(3);
      expect(await outboxCount('seat.allocated', batch.id)).toBe(3);
      expect(
        await count(`SELECT count(*)::int AS n FROM idempotency_record WHERE operation = 'seat.test_allocate' AND idempotency_key LIKE 'race-%'`, []),
      ).toBe(1);
    });

    it('many batches, many racers: occupancy never exceeds capacity (property check)', async () => {
      for (const cap of [1, 2, 5]) {
        const batch = await batchFor(ctx, f, fo, { capacity: cap });
        const people = await Promise.all(Array.from({ length: cap + 8 }, () => learner(ctx)));
        const results = await Promise.allSettled(people.map((p) => allocate(racers, batch.id, p)));
        expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(cap);
        expect((await readOccupancy(ctx.pool, batch.id))!.active).toBe(cap);
        expect(await checkSeatInvariants(ctx.pool, batch.id)).toEqual([]);
      }
    });
  });

  describe('duplicate allocation race', () => {
    it('the same allocation twice at once (same authority): one place, the repeat is a no-op', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 5 });
      const p = await learner(ctx);
      const results = await contend(batch.id, 2, () => [allocate(racers, batch.id, p, 'ENR-1'), allocate(racers, batch.id, p, 'ENR-1')]);
      const ok = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
      expect(ok.every(Boolean)).toBe(true);
      expect(ok.map((r) => r!.created).sort()).toEqual([false, true]);
      expect(ok[0]!.allocation.id).toBe(ok[1]!.allocation.id);
      expect((await readOccupancy(ctx.pool, batch.id))!.active).toBe(1);
      expect(await auditCount('seat.allocated', batch.id)).toBe(1);
      expect(await outboxCount('seat.allocated', batch.id)).toBe(1);
    });

    it('the same subject under two different authorities at once: one place, the other ALLOCATION_ALREADY_EXISTS', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 5 });
      const p = await learner(ctx);
      const results = await contend(batch.id, 2, () => [allocate(racers, batch.id, p, 'ENR-A'), allocate(racers, batch.id, p, 'ENR-B')]);
      expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
      const rej = results.find((r): r is PromiseRejectedResult => r.status === 'rejected')!;
      expect(errCode(rej.reason)).toBe('ALLOCATION_ALREADY_EXISTS');
      expect((await readOccupancy(ctx.pool, batch.id))!.active).toBe(1);
      expect(await checkSeatInvariants(ctx.pool, batch.id)).toEqual([]);
    });

    it('the database refuses a second active place even when the service is bypassed (partial unique index)', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 5 });
      const p = await learner(ctx);
      await allocate(ctx.pool, batch.id, p);
      await expect(
        withTransaction(ctx.pool, async (tx) => {
          const id = randomUUID();
          const a = await appendAudit(tx, { ...SYSTEM, operation: 'seat.allocated', entity: { type: 'seat_allocation', id } });
          await tx.query(
            `INSERT INTO seat_allocation (id, batch_id, subject_kind, learner_user_id, fee_option_id, state, authority_kind, authority_ref, allocation_audit_id)
             VALUES ($1, $2, 'learner', $3, $4, 'occupied', 'enrolment_confirmation', 'bypass', $5)`,
            [id, batch.id, p.id, optionA(), a.id],
          );
        }),
      ).rejects.toMatchObject({ code: '23505', constraint: 'seat_active_learner_uq' });
    });

    it('through the HTTP pipeline with the same Idempotency-Key twice at once: one effect, an identical replay', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 5 });
      const app = await buildApp(ctx.services, { logger: false });
      // A stand-in for a future enrolment-confirmation route: subject from the authenticated principal, never the body.
      defineRoute(app, ctx.services, {
        method: 'POST',
        url: '/test/stage2a/allocate',
        access: hasAnyRole('learner'),
        idempotent: { operation: 'seat.test_confirm', retention: 'permanent' },
        lockTimeoutMs: 15_000,
        handler: async ({ db, principal }) => {
          const r = await allocateSeat(db as PoolClient, { actor: { kind: 'user', principal } }, {
            batchId: batch.id,
            subject: { kind: 'learner', learnerUserId: principal.userId },
            feeOptionId: optionA(),
            authority: { kind: 'enrolment_confirmation', ref: `ENR-HTTP-${principal.userId}` },
            eligibility: allowEligibility(),
          });
          return { status: r.created ? 201 : 200, body: { allocationId: r.allocation.id } };
        },
      });
      await app.ready();
      try {
        const p = await learner(ctx);
        const headers = { ...(await ctx.auth(p)), 'idempotency-key': `confirm-${p.id}` };
        const [a, b] = await Promise.all([
          app.inject({ method: 'POST', url: '/test/stage2a/allocate', headers, payload: {} }),
          app.inject({ method: 'POST', url: '/test/stage2a/allocate', headers, payload: {} }),
        ]);
        expect([a.statusCode, b.statusCode]).toEqual([201, 201]);
        expect(a.json()).toEqual(b.json());
        expect([a.headers['idempotent-replayed'], b.headers['idempotent-replayed']].filter(Boolean)).toEqual(['true']);
        expect((await readOccupancy(ctx.pool, batch.id))!.active).toBe(1);
        expect(await auditCount('seat.allocated', batch.id)).toBe(1);
        const rec = await ctx.owner.query(
          `SELECT retention_class, expires_at FROM idempotency_record WHERE principal_user_id = $1 AND operation = 'seat.test_confirm'`,
          [p.id],
        );
        expect(rec.rows).toEqual([{ retention_class: 'permanent', expires_at: null }]);
      } finally {
        await app.close();
      }
    });
  });

  describe('release race', () => {
    it('two concurrent releases of one allocation: one effective release, capacity restored once, one history entry', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 2 });
      const p = await learner(ctx);
      const { allocation } = await allocate(ctx.pool, batch.id, p);
      const release = () =>
        withTransaction(racers, (tx) =>
          releaseSeat(tx, SYSTEM, { allocationId: allocation.id, reason: 'withdrawn before start', authority: { kind: 'enrolment_confirmation', ref: 'WD-1' } }),
        );
      const results = await contend(batch.id, 2, () => [release(), release()]);
      const values = results.map((r) => (r.status === 'fulfilled' ? r.value : null));
      expect(values.every(Boolean)).toBe(true);
      expect(values.map((v) => v!.released).sort()).toEqual([false, true]);
      expect((await readOccupancy(ctx.pool, batch.id))!).toMatchObject({ active: 0, available: 2 });
      expect(await auditCount('seat.released', batch.id)).toBe(1);
      expect(await outboxCount('seat.released', batch.id)).toBe(1);
      const h = (await allocationHistory(ctx.pool, allocation.id))!;
      expect(h.events.map((e) => e.operation)).toEqual(['seat.allocated', 'seat.released']);
      expect(h.allocation).toMatchObject({ state: 'released', endReason: 'withdrawn before start' });
      expect(h.allocation.endAuditId).toBe(h.events[1]!.id);
      expect(await checkSeatInvariants(ctx.pool, batch.id)).toEqual([]);
    });

    it('a released place frees capacity for exactly one new allocation; ended allocations are history and never change', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 1 });
      const [a, b, c] = [await learner(ctx), await learner(ctx), await learner(ctx)];
      const { allocation } = await allocate(ctx.pool, batch.id, a);
      await withTransaction(ctx.pool, (tx) =>
        releaseSeat(tx, SYSTEM, { allocationId: allocation.id, reason: 'withdrawn', authority: { kind: 'enrolment_confirmation', ref: 'WD' } }),
      );
      const r = await Promise.allSettled([allocate(racers, batch.id, b), allocate(racers, batch.id, c)]);
      expect(r.filter((x) => x.status === 'fulfilled')).toHaveLength(1);
      await expect(ctx.pool.query(`UPDATE seat_allocation SET state = 'occupied' WHERE id = $1`, [allocation.id])).rejects.toMatchObject({ code: 'IL002' });
      expect(await checkSeatInvariants(ctx.pool, batch.id)).toEqual([]);
    });

    it('an unknown allocation, or one from another batch, is ALLOCATION_NOT_FOUND', async () => {
      const b1 = await batchFor(ctx, f, fo);
      const b2 = await batchFor(ctx, f, fo);
      const { allocation } = await allocate(ctx.pool, b1.id, await learner(ctx));
      const rel = (allocationId: string, batchId?: string) =>
        withTransaction(ctx.pool, (tx) =>
          releaseSeat(tx, SYSTEM, { allocationId, reason: 'test', authority: { kind: 'enrolment_confirmation', ref: 'X' }, ...(batchId ? { batchId } : {}) }),
        );
      await expect(rel(randomUUID())).rejects.toMatchObject({ code: 'ALLOCATION_NOT_FOUND' });
      await expect(rel(allocation.id, b2.id)).rejects.toMatchObject({ code: 'ALLOCATION_NOT_FOUND' });
      expect((await readOccupancy(ctx.pool, b1.id))!.active).toBe(1);
    });
  });

  describe('rollback', () => {
    it('a failure after the seat mutation commits nothing: no place, no audit, no outbox, capacity unchanged', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 2 });
      const p = await learner(ctx);
      let allocationId = '';
      await expect(
        withTransaction(ctx.pool, async (tx) => {
          await tx.query(
            `INSERT INTO idempotency_record (principal_user_id, operation, idempotency_key, request_fingerprint, retention_class, expires_at)
             VALUES ($1, 'seat.test_allocate', $2, 'fp', 'permanent', NULL)`,
            [p.id, `rollback-${p.id}`],
          );
          const r = await allocateSeat(tx, SYSTEM, {
            batchId: batch.id,
            subject: learnerSubject(p),
            feeOptionId: optionA(),
            authority: { kind: 'enrolment_confirmation', ref: 'ENR-RB' },
            eligibility: allowEligibility(),
          });
          allocationId = r.allocation.id;
          // Visible inside the transaction …
          expect((await readOccupancy(tx, batch.id))!.active).toBe(1);
          throw new Error('injected failure after the seat mutation');
        }),
      ).rejects.toThrow('injected failure');
      expect(allocationId).not.toBe('');
      // … and gone after the rollback.
      expect(await count(`SELECT count(*)::int AS n FROM seat_allocation WHERE id = $1`, [allocationId])).toBe(0);
      expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE entity_id = $1`, [allocationId])).toBe(0);
      expect(await count(`SELECT count(*)::int AS n FROM outbox_message WHERE dedupe_key = $1`, [allocationId])).toBe(0);
      expect(await count(`SELECT count(*)::int AS n FROM idempotency_record WHERE idempotency_key = $1`, [`rollback-${p.id}`])).toBe(0);
      expect((await readOccupancy(ctx.pool, batch.id))!).toMatchObject({ active: 0, available: 2 });
    });

    it('a refusal by the caller’s eligibility check writes nothing and runs after the batch lock', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 2 });
      const p = await learner(ctx);
      const seen: unknown[] = [];
      await expect(
        withTransaction(ctx.pool, (tx) =>
          allocateSeat(tx, SYSTEM, {
            batchId: batch.id,
            subject: learnerSubject(p),
            feeOptionId: optionA(),
            authority: { kind: 'enrolment_confirmation', ref: 'ENR-NE' },
            eligibility: async (_tx, c) => {
              seen.push(c);
              throw new AppError(409, 'BATCH_NOT_ELIGIBLE', 'the learner is not eligible (test)');
            },
          }),
        ),
      ).rejects.toMatchObject({ code: 'BATCH_NOT_ELIGIBLE' });
      expect(seen).toEqual([expect.objectContaining({ activeBefore: 0, feeOptionId: optionA(), batch: expect.objectContaining({ id: batch.id, capacity: 2 }) })]);
      expect((await readOccupancy(ctx.pool, batch.id))!.active).toBe(0);
      expect(await auditCount('seat.allocated', batch.id)).toBe(0);
    });
  });

  describe('capacity reduction', () => {
    it('an administrator cannot reduce capacity below occupancy: refused, no place released', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 4 });
      for (let i = 0; i < 3; i++) await allocate(ctx.pool, batch.id, await learner(ctx));
      const r = await ctx.app.inject({
        method: 'PATCH',
        url: `/v1/batches/${batch.id}`,
        headers: { ...(await ctx.auth(f.admin)), 'idempotency-key': `cap-${batch.id}` },
        payload: { capacity: 2, reason: 'smaller room', expectedRowVersion: batch.rowVersion },
      });
      expect(r.statusCode).toBe(409);
      expect(r.json().error.code).toBe('CAPACITY_CONFLICT');
      expect((await readOccupancy(ctx.pool, batch.id))!).toMatchObject({ capacity: 4, active: 3 });
      // The database refuses it too, for any path.
      await expect(ctx.pool.query(`UPDATE batch SET capacity = 2 WHERE id = $1`, [batch.id])).rejects.toMatchObject({ code: 'IL001' });
      // Down to exactly the occupancy is allowed.
      const ok = await ctx.app.inject({
        method: 'PATCH',
        url: `/v1/batches/${batch.id}`,
        headers: { ...(await ctx.auth(f.admin)), 'idempotency-key': `cap3-${batch.id}` },
        payload: { capacity: 3, reason: 'smaller room', expectedRowVersion: batch.rowVersion },
      });
      expect(ok.statusCode).toBe(200);
      expect(ok.json().occupancy).toMatchObject({ capacity: 3, active: 3, available: 0 });
      expect(await checkSeatInvariants(ctx.pool, batch.id)).toEqual([]);
    });

    it('capacity reduction racing allocations never ends above capacity', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 10 });
      for (let i = 0; i < 4; i++) await allocate(ctx.pool, batch.id, await learner(ctx));
      const people = await Promise.all(Array.from({ length: 10 }, () => learner(ctx)));
      const shrink = withTransaction(racers, (tx) => tx.query(`UPDATE batch SET capacity = 6 WHERE id = $1`, [batch.id]), { lockTimeoutMs: 15_000 });
      const results = await Promise.allSettled([shrink, ...people.map((p) => allocate(racers, batch.id, p))]);
      const occ = (await readOccupancy(ctx.pool, batch.id))!;
      expect(occ.active).toBeLessThanOrEqual(occ.capacity);
      expect(await checkSeatInvariants(ctx.pool, batch.id)).toEqual([]);
      // Either the shrink won (capacity 6, at most 6 places) or allocations filled past 6 first and the shrink was refused.
      if (results[0]!.status === 'fulfilled') expect(occ.capacity).toBe(6);
      else expect(errCode((results[0] as PromiseRejectedResult).reason)).toBe('IL001');
    });

    it('the capacity trigger refuses an over-capacity insert that bypasses the service', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 1 });
      await allocate(ctx.pool, batch.id, await learner(ctx));
      const p = await learner(ctx);
      const err = await withTransaction(ctx.pool, async (tx) => {
        const id = randomUUID();
        const a = await appendAudit(tx, { ...SYSTEM, operation: 'seat.allocated', entity: { type: 'seat_allocation', id } });
        await tx.query(
          `INSERT INTO seat_allocation (id, batch_id, subject_kind, learner_user_id, fee_option_id, state, authority_kind, authority_ref, allocation_audit_id)
           VALUES ($1, $2, 'learner', $3, $4, 'occupied', 'enrolment_confirmation', 'bypass', $5)`,
          [id, batch.id, p.id, optionA(), a.id],
        );
      }).catch((e) => e);
      expect(err).toMatchObject({ code: 'IL001' });
      expect(mapDatabaseError(err)).toMatchObject({ status: 409, code: 'CAPACITY_CONFLICT' });
      expect((await readOccupancy(ctx.pool, batch.id))!.active).toBe(1);
    });
  });

  describe('allocation rules', () => {
    it('refuses a fee option the batch does not accept, a missing option, and an option on a single-price batch', async () => {
      const [optA, optB] = fo.version.feeOptions;
      const onlyA = await batchFor(ctx, f, fo, { acceptedFeeOptionIds: [optA!.id] });
      const p = await learner(ctx);
      await expect(allocate(ctx.pool, onlyA.id, p, 'R', { feeOptionId: optB!.id })).rejects.toMatchObject({ code: 'BATCH_NOT_ELIGIBLE' });
      await expect(allocate(ctx.pool, onlyA.id, p, 'R', { feeOptionId: null })).rejects.toMatchObject({ code: 'BATCH_NOT_ELIGIBLE' });
      const sp = await publishedProgramme(ctx, f, { level: 2 });
      const spBatch = await batchFor(ctx, f, sp);
      await expect(allocate(ctx.pool, spBatch.id, p, 'R', { feeOptionId: optA!.id })).rejects.toMatchObject({ code: 'BATCH_NOT_ELIGIBLE' });
      const ok = await allocate(ctx.pool, spBatch.id, p, 'R', { feeOptionId: null });
      expect(ok.allocation).toMatchObject({ feeOptionId: null, state: 'occupied' });
    });

    it('refuses a cancelled batch and a programme-version mismatch', async () => {
      const batch = await batchFor(ctx, f, fo);
      await ctx.pool.query(`UPDATE batch SET status = 'cancelled' WHERE id = $1`, [batch.id]);
      await expect(allocate(ctx.pool, batch.id, await learner(ctx))).rejects.toMatchObject({ code: 'BATCH_NOT_ELIGIBLE' });
      const open = await batchFor(ctx, f, fo);
      await expect(allocate(ctx.pool, open.id, await learner(ctx), 'R', { expectedProgrammeVersionId: randomUUID() })).rejects.toMatchObject({
        code: 'PROGRAMME_VERSION_MISMATCH',
      });
    });

    it('a learner place needs a real learner account; agency reservations are staged until P8; no fabricated subjects', async () => {
      const batch = await batchFor(ctx, f, fo);
      const notLearner = await ctx.createUser({ roles: ['teacher'] });
      await expect(allocate(ctx.pool, batch.id, notLearner)).rejects.toMatchObject({ code: 'IL006' });
      const agency = await ctx.createAgency();
      const err = await withTransaction(ctx.pool, (tx) =>
        allocateSeat(tx, SYSTEM, {
          batchId: batch.id,
          subject: { kind: 'agency_reservation', reservationId: randomUUID(), agencyId: agency },
          feeOptionId: optionA(),
          authority: { kind: 'agency_reservation', ref: 'RES-1' },
          eligibility: allowEligibility(),
        }),
      ).catch((e) => e);
      expect(err).toMatchObject({ code: 'IL006' });
      expect(mapDatabaseError(err)).toMatchObject({ code: 'BATCH_NOT_ELIGIBLE' });
      // An unattributed place exists only as a legacy-migration record (CHECK), never as an ordinary allocation.
      const bad = await withTransaction(ctx.pool, async (tx) => {
        const id = randomUUID();
        const a = await appendAudit(tx, { ...SYSTEM, operation: 'seat.allocated', entity: { type: 'seat_allocation', id } });
        await tx.query(
          `INSERT INTO seat_allocation (id, batch_id, subject_kind, state, authority_kind, authority_ref, allocation_audit_id)
           VALUES ($1, $2, 'unattributed', 'occupied', 'enrolment_confirmation', 'x', $3)`,
          [id, batch.id, a.id],
        );
      }).catch((e) => e);
      expect(bad).toMatchObject({ code: '23514', constraint: 'seat_subject_shape' });
      expect((await readOccupancy(ctx.pool, batch.id))!.active).toBe(0);
    });

    it('an administrative adjustment requires a reason, which is audited', async () => {
      const batch = await batchFor(ctx, f, fo);
      const p = await learner(ctx);
      await expect(
        allocate(ctx.pool, batch.id, p, 'ADJ-1', { authority: { kind: 'administrative_adjustment', ref: 'APPROVAL-1' } }),
      ).rejects.toMatchObject({ code: 'VALIDATION_FAILED' });
      const r = await allocate(ctx.pool, batch.id, p, 'ADJ-1', {
        authority: { kind: 'administrative_adjustment', ref: 'APPROVAL-1' },
        reason: 'approved correction',
      });
      const a = await ctx.owner.query(`SELECT reason FROM audit_event WHERE id = $1`, [r.allocation.allocationAuditId]);
      expect(a.rows[0].reason).toBe('approved correction');
    });

    it('held → occupied (secure) is idempotent and both states count against capacity', async () => {
      const batch = await batchFor(ctx, f, fo, { capacity: 2 });
      const p = await learner(ctx);
      const { allocation } = await allocate(ctx.pool, batch.id, p, 'ENR-H', { state: 'held' });
      expect((await readOccupancy(ctx.pool, batch.id))!).toMatchObject({ active: 1, held: 1, occupied: 0 });
      const sec = () => withTransaction(ctx.pool, (tx) => secureSeat(tx, SYSTEM, { allocationId: allocation.id, authority: { kind: 'enrolment_confirmation', ref: 'PAY-1' } }));
      expect((await sec()).secured).toBe(true);
      expect((await sec()).secured).toBe(false);
      expect((await readOccupancy(ctx.pool, batch.id))!).toMatchObject({ active: 1, held: 0, occupied: 1 });
    });

    it('a lock wait beyond the transaction’s lock_timeout is a clean 503-class refusal with nothing written', async () => {
      const batch = await batchFor(ctx, f, fo);
      const blocker = await racers.connect();
      try {
        await blocker.query('BEGIN');
        await blocker.query('SELECT 1 FROM batch WHERE id = $1 FOR UPDATE', [batch.id]);
        const err = await withTransaction(
          ctx.pool,
          (tx) =>
            allocateSeat(tx, SYSTEM, {
              batchId: batch.id,
              subject: { kind: 'learner', learnerUserId: f.admin.id },
              feeOptionId: optionA(),
              authority: { kind: 'enrolment_confirmation', ref: 'T' },
              eligibility: allowEligibility(),
            }),
          { lockTimeoutMs: 200 },
        ).catch((e) => e);
        expect(err).toMatchObject({ code: '55P03' });
        expect(mapDatabaseError(err)).toMatchObject({ status: 503, code: 'SERVICE_UNAVAILABLE' });
      } finally {
        await blocker.query('ROLLBACK');
        blocker.release();
      }
      expect((await readOccupancy(ctx.pool, batch.id))!.active).toBe(0);
    });
  });

  it('the whole ledger satisfies every invariant at the end of the suite', async () => {
    expect(await checkSeatInvariants(ctx.pool)).toEqual([]);
  });
});
