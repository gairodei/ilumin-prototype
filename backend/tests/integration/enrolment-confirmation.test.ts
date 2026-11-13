import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { buildApp } from '../../src/app/build-app.js';
import { createPool, type Pool } from '../../src/database/pool.js';
import { withTransaction } from '../../src/database/transaction.js';
import { confirmEnrolment, type ConfirmEnrolmentResult } from '../../src/modules/enrolments/confirmation.js';
import { assertPrerequisitesAllowed, PRODUCTION_PREREQUISITES, type Prerequisites } from '../../src/modules/enrolments/prerequisites.js';
import { prerequisitesOf } from '../../src/modules/enrolments/wiring.js';
import { checkSeatInvariants, releaseSeat } from '../../src/modules/seats/seat-service.js';
import { AppError } from '../../src/shared/errors.js';
import { createTestContext, type TestContext, type TestUser } from '../support/context.js';
import type { Principal } from '../../src/modules/auth/principal.js';
import { createNextDraftVersion, publishProgrammeVersion } from '../../src/modules/programmes/programmes.js';
import { batchFor, domainFixture, type DomainFixture, principalOf, publishedProgramme } from '../support/domain.js';
import {
  allowTestEvidence,
  approvedApplication,
  type LearnerFixture,
  learnerWithProfile,
  testPrerequisites,
} from '../support/enrolment.js';

/**
 * Stage 2B confirmation boundary on real PostgreSQL. Production adapters must fail closed; the transactional mechanics
 * are exercised with the TEST-ONLY adapters (tests/support/enrolment.ts) on a database explicitly marked as a test
 * database. Races use independent connections forced to contend on the batch lock (as in the Stage 2A ledger tests).
 */

const codeOf = (e: unknown) => (e instanceof AppError ? e.code : ((e as { code?: string }).code ?? String(e)));

describe('enrolment confirmation boundary', () => {
  let ctx: TestContext;
  let f: DomainFixture;
  let fo: Awaited<ReturnType<typeof publishedProgramme>>;
  let racers: Pool;
  let admin: pg.Client;
  let confirmer: TestUser;
  let confirmerPrincipal: Principal;

  beforeAll(async () => {
    ctx = await createTestContext();
    await allowTestEvidence(ctx); // before the API pool opens any connection
    f = await domainFixture(ctx);
    fo = await publishedProgramme(ctx, f, { level: 3 });
    racers = createPool({ ...ctx.config.database, poolMax: 22 }, 'ilumin-test-racers-2b');
    admin = new pg.Client({ connectionString: ctx.db.adminUrl });
    await admin.connect();
    confirmer = await ctx.createUser({ roles: ['finance_admin'] });
    confirmerPrincipal = await principalOf(ctx, confirmer);
  });
  afterAll(async () => {
    await racers?.end();
    await admin?.end();
    await ctx?.close();
  });

  const sp = () => fo.version.feeOptions.find((o) => o.deliveryMode === 'self_paced')!.id;
  const fa = () => fo.version.feeOptions.find((o) => o.deliveryMode === 'fully_assisted')!.id;
  const count = async (sql: string, params: unknown[] = []) => (await ctx.owner.query<{ n: number }>(sql, params)).rows[0]!.n;
  const onlineBatch = (o: Record<string, unknown> = {}) => batchFor(ctx, f, fo, { location: 'online', ...o });

  async function approved(batchId: string, o: { feeOptionId?: string; learner?: LearnerFixture } = {}) {
    const l = o.learner ?? (await learnerWithProfile(ctx));
    const app = await approvedApplication(ctx, l, { programmeId: fo.programme.id, feeOptionId: o.feeOptionId ?? sp(), batchId, decider: f.adminPrincipal });
    expect(app.status).toBe('approved');
    return { l, app };
  }
  const confirm = (applicationId: string, p: Prerequisites, o: { key?: string; pool?: Pool } = {}): Promise<ConfirmEnrolmentResult> =>
    confirmEnrolment(o.pool ?? ctx.pool, p, { applicationId, actor: { kind: 'user', principal: confirmerPrincipal }, idempotencyKey: o.key ?? `confirm-${randomUUID()}` }, { configEnv: ctx.config.env });

  /**
   * Forces real contention: a blocker holds the batch row lock (L7) until `expected` attempts are waiting on a lock, then
   * releases them all at once (the Stage 2A ledger technique).
   */
  async function contend<T>(batchId: string, expected: number, launch: () => Promise<T>[]): Promise<PromiseSettledResult<T>[]> {
    const blocker = await racers.connect();
    try {
      await blocker.query('BEGIN');
      await blocker.query('SELECT 1 FROM batch WHERE id = $1 FOR UPDATE', [batchId]);
      const attempts = launch();
      let early: unknown = null;
      for (const p of attempts) p.catch((e) => (early ??= e));
      const deadline = Date.now() + 20_000;
      for (;;) {
        if (early) throw new Error(`an attempt failed before reaching a lock: ${String((early as Error).message ?? early)}`);
        const w = await admin.query<{ n: number }>(
          `SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname = $1 AND application_name = 'ilumin-test-racers-2b' AND wait_event_type = 'Lock'`,
          [ctx.db.name],
        );
        if (w.rows[0]!.n >= expected) break;
        if (Date.now() > deadline) throw new Error(`only ${w.rows[0]!.n} of ${expected} attempts reached a lock`);
        await new Promise((r) => setTimeout(r, 20));
      }
      await blocker.query('COMMIT');
      return await Promise.allSettled(attempts);
    } finally {
      await blocker.query('ROLLBACK').catch(() => {});
      blocker.release();
    }
  }

  /** Nothing of a confirmation exists for this application: still approved, no enrolment, no seat, no success audit. */
  async function nothingWritten(appId: string, learnerId: string) {
    expect((await ctx.owner.query(`SELECT status FROM learner_application WHERE id = $1`, [appId])).rows[0].status).toBe('approved');
    expect(await count(`SELECT count(*)::int AS n FROM enrolment WHERE application_id = $1`, [appId])).toBe(0);
    expect(await count(`SELECT count(*)::int AS n FROM seat_allocation WHERE learner_user_id = $1`, [learnerId])).toBe(0);
    expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE operation = 'application.enrolled' AND entity_id = $1`, [appId])).toBe(0);
    expect(await count(`SELECT count(*)::int AS n FROM outbox_message WHERE topic = 'enrolment.confirmed' AND payload->>'applicationId' = $1`, [appId])).toBe(0);
  }

  it('the test database is marked; the application itself runs with the production adapters', async () => {
    expect((await ctx.pool.query(`SELECT current_setting('ilumin.test_evidence', true) AS v`)).rows[0].v).toBe('allowed');
    expect(prerequisitesOf(ctx.services)).toBe(PRODUCTION_PREREQUISITES);
  });

  describe('fails closed', () => {
    it('with the production adapters nothing is confirmed: Finance authorization and the signed agreement are not available', async () => {
      const batch = await onlineBatch();
      const { l, app } = await approved(batch.id);
      await expect(confirm(app.id, PRODUCTION_PREREQUISITES)).rejects.toMatchObject({ code: 'FINANCE_AUTHORIZATION_REQUIRED' });
      const t = testPrerequisites();
      await expect(confirm(app.id, { ...PRODUCTION_PREREQUISITES, finance: t.finance })).rejects.toMatchObject({ code: 'SIGNED_AGREEMENT_REQUIRED' });
      await nothingWritten(app.id, l.user.id);
      expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE operation = 'enrolment.confirm_refused' AND entity_id = $1`, [app.id])).toBe(2);
    });

    it('missing signed agreement, or an agreement for other terms, fails', async () => {
      const batch = await onlineBatch();
      const { l, app } = await approved(batch.id);
      await expect(confirm(app.id, testPrerequisites({ agreement: 'none' }))).rejects.toMatchObject({ code: 'SIGNED_AGREEMENT_REQUIRED' });
      const revised = (await ctx.owner.query(`SELECT id FROM terms_version WHERE code = 'REVISED-1'`)).rows[0].id;
      await expect(confirm(app.id, testPrerequisites({ agreement: { signedForTermsVersionId: revised } }))).rejects.toMatchObject({ code: 'SIGNED_AGREEMENT_REQUIRED' });
      await nothingWritten(app.id, l.user.id);
    });

    it('missing Finance authorization fails before anything else is checked; a pending payment does not qualify', async () => {
      const batch = await onlineBatch();
      const { l, app } = await approved(batch.id);
      const none = testPrerequisites({ finance: 'none' });
      await expect(confirm(app.id, none)).rejects.toMatchObject({ code: 'FINANCE_AUTHORIZATION_REQUIRED' });
      expect(none.calls).toMatchObject({ finance: 1, agreement: 0 });
      const pending = testPrerequisites({ finance: 'pending' });
      const err = await confirm(app.id, pending).catch((e) => e);
      expect(err).toMatchObject({ code: 'FINANCE_AUTHORIZATION_REQUIRED' });
      expect(err.message).toMatch(/pending/i);
      expect(pending.calls.agreement).toBe(0);
      await nothingWritten(app.id, l.user.id);
    });

    it('only an approved application is confirmed (never draft, submitted or rejected → enrolled)', async () => {
      const batch = await onlineBatch();
      const l = await learnerWithProfile(ctx);
      const draftApp = (await ctx.pool.query(
        `INSERT INTO learner_application (learner_user_id, programme_id, programme_version_id, terms_version_id, fee_option_id)
         VALUES ($1, $2, $3, (SELECT id FROM terms_version WHERE status = 'in_force'), $4) RETURNING id`,
        [l.user.id, fo.programme.id, fo.version.id, sp()],
      )).rows[0].id;
      await expect(confirm(draftApp, testPrerequisites())).rejects.toMatchObject({ code: 'ACADEMIC_APPROVAL_REQUIRED' });
      await expect(confirm(randomUUID(), testPrerequisites())).rejects.toMatchObject({ code: 'NOT_FOUND' });
      expect(await count(`SELECT count(*)::int AS n FROM seat_allocation WHERE batch_id = $1`, [batch.id])).toBe(0);
    });

    it('commencement: unresolved on the start date (U-05) and commenced batches are refused under the batch lock', async () => {
      const batch = await onlineBatch();
      const { l, app } = await approved(batch.id);
      await expect(confirm(app.id, testPrerequisites({ commencement: 'unresolved' }))).rejects.toMatchObject({ code: 'COMMENCEMENT_UNRESOLVED' });
      const started = await confirm(app.id, testPrerequisites({ commencement: 'commenced' })).catch((e) => e);
      expect(started).toMatchObject({ code: 'BATCH_NOT_ELIGIBLE' });
      expect(started.details[0].message).toMatch(/^BATCH_STARTED/);
      await nothingWritten(app.id, l.user.id);
    });

    it('a programme-version mismatch between the application and its batch is refused (defence in depth)', async () => {
      // Publish v2 with a batch on it, then corrupt the application past every trigger (superuser, replica mode): the
      // confirmation must still refuse, because the seat service checks the version under the batch lock.
      const prog = await publishedProgramme(ctx, f, { level: 3 });
      const b1 = await batchFor(ctx, f, prog, { location: 'online' });
      const l = await learnerWithProfile(ctx);
      const app = await approvedApplication(ctx, l, { programmeId: prog.programme.id, feeOptionId: prog.version.feeOptions[0]!.id, batchId: b1.id, decider: f.adminPrincipal });
      const v2 = await withTransaction(ctx.pool, async (tx) => {
        const actor = { actor: { kind: 'user' as const, principal: f.adminPrincipal } };
        const d = await createNextDraftVersion(tx, actor, prog.programme.id);
        return publishProgrammeVersion(tx, actor, { programmeId: prog.programme.id, versionId: d.id, approval: { approvedByUserId: f.finance.id, reference: `FIN-${randomUUID()}` } });
      });
      const b2 = await batchFor(ctx, f, { programme: prog.programme, version: v2 }, { location: 'online', acceptedFeeOptionIds: v2.feeOptions.map((o) => o.id) });
      const c = new pg.Client({ connectionString: ctx.db.adminUrl.replace(/\/[^/]*$/, `/${ctx.db.name}`) });
      await c.connect();
      try {
        await c.query(`SET session_replication_role = replica`);
        await c.query(`UPDATE learner_application SET batch_id = $2 WHERE id = $1`, [app.id, b2.id]);
      } finally {
        await c.end();
      }
      await expect(confirm(app.id, testPrerequisites())).rejects.toMatchObject({ code: 'PROGRAMME_VERSION_MISMATCH' });
      await nothingWritten(app.id, l.user.id);
    });
  });

  describe('confirms with verified prerequisites (test-only adapters)', () => {
    it('one transaction: seat, enrolment, application → enrolled, history, audit and outbox, all linked', async () => {
      const batch = await onlineBatch({ capacity: 5 });
      const { l, app } = await approved(batch.id, { feeOptionId: fa() });
      const r = await confirm(app.id, testPrerequisites());
      expect(r.status).toBe(201);
      const e = r.enrolment;
      expect(e).toMatchObject({
        applicationId: app.id,
        learnerUserId: l.user.id,
        programmeVersionId: fo.version.id,
        termsVersion: { code: 'LEGACY-1' },
        batch: { id: batch.id },
        feeOptionId: fa(),
        deliveryMode: 'fully_assisted',
        state: 'confirmed',
        evidenceTrust: 'test_only',
        financeAuthorization: { kind: 'verified_payment' },
      });
      const seat = (await ctx.owner.query(`SELECT * FROM seat_allocation WHERE id = $1`, [e.seatAllocationId])).rows[0];
      expect(seat).toMatchObject({ state: 'occupied', batch_id: batch.id, learner_user_id: l.user.id, fee_option_id: fa(), authority_kind: 'enrolment_confirmation', authority_ref: e.id });
      expect((await ctx.owner.query(`SELECT status FROM learner_application WHERE id = $1`, [app.id])).rows[0].status).toBe('enrolled');
      expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE operation = 'enrolment.confirmed' AND entity_id = $1`, [e.id])).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE operation = 'seat.allocated' AND entity_id = $1`, [e.seatAllocationId])).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM outbox_message WHERE topic = 'enrolment.confirmed' AND dedupe_key = $1`, [e.id])).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM outbox_message WHERE topic = 'seat.allocated' AND dedupe_key = $1`, [e.seatAllocationId])).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM application_event WHERE application_id = $1 AND action = 'enrolled'`, [app.id])).toBe(1);
      expect(await checkSeatInvariants(ctx.pool, batch.id)).toEqual([]);
      // An approved arrangement also authorizes (PD-P0-07 agency rule's shape); recorded as such.
      const b2 = await onlineBatch();
      const other = await approved(b2.id);
      expect((await confirm(other.app.id, testPrerequisites({ finance: 'arrangement' }))).enrolment.financeAuthorization.kind).toBe('approved_arrangement');
    });

    it('the seat of a confirmed enrolment is not released while the enrolment is confirmed; the enrolment is immutable', async () => {
      const batch = await onlineBatch();
      const { app } = await approved(batch.id);
      const { enrolment } = await confirm(app.id, testPrerequisites());
      await expect(withTransaction(ctx.pool, (tx) =>
        releaseSeat(tx, { actor: { kind: 'system', label: 'test' } }, { allocationId: enrolment.seatAllocationId, reason: 'test release', authority: { kind: 'administrative_adjustment', ref: 'X' } }),
      )).rejects.toMatchObject({ code: 'IL002' });
      await expect(ctx.owner.query(`UPDATE enrolment SET batch_id = batch_id WHERE id = $1`, [enrolment.id])).rejects.toMatchObject({ code: 'IL005' });
    });

    it('duplicate confirmation consumes no extra seat: same key replays, another key returns the existing enrolment', async () => {
      const batch = await onlineBatch();
      const { l, app } = await approved(batch.id);
      const key = `dup-${randomUUID()}`;
      const r1 = await confirm(app.id, testPrerequisites(), { key });
      const r2 = await confirm(app.id, testPrerequisites(), { key });
      const r3 = await confirm(app.id, testPrerequisites());
      expect(r1).toMatchObject({ status: 201, replayed: false });
      expect(r2).toMatchObject({ status: 201, replayed: true, enrolment: { id: r1.enrolment.id } });
      expect(r3).toMatchObject({ status: 200, replayed: false, enrolment: { id: r1.enrolment.id } });
      expect(await count(`SELECT count(*)::int AS n FROM seat_allocation WHERE learner_user_id = $1`, [l.user.id])).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM enrolment WHERE application_id = $1`, [app.id])).toBe(1);
    });

    it('concurrent duplicate confirmations (different keys) make one enrolment and one seat', async () => {
      const batch = await onlineBatch();
      const { l, app } = await approved(batch.id);
      // All 8 overlap: the first holds the application lock (L6) and waits on the batch; the others wait on the application.
      const rs = await contend(batch.id, 8, () => Array.from({ length: 8 }, () => confirm(app.id, testPrerequisites(), { pool: racers })));
      const ok = rs.filter((x): x is PromiseFulfilledResult<ConfirmEnrolmentResult> => x.status === 'fulfilled').map((x) => x.value);
      const failed = rs.filter((x) => x.status === 'rejected').map((x) => codeOf((x as PromiseRejectedResult).reason));
      expect(failed).toEqual([]);
      expect(ok.filter((x) => x.status === 201)).toHaveLength(1);
      expect(ok.filter((x) => x.status === 200)).toHaveLength(7);
      expect(new Set(ok.map((x) => x.enrolment.id)).size).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM seat_allocation WHERE learner_user_id = $1`, [l.user.id])).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM enrolment WHERE learner_user_id = $1`, [l.user.id])).toBe(1);
    });

    it('rollback: a failure after the seat and enrolment were written leaves nothing behind; a retry then succeeds', async () => {
      const batch = await onlineBatch({ capacity: 2 });
      const { l, app } = await approved(batch.id);
      // Fault injection on this test database only: the LAST write of the confirmation (its outbox message) fails.
      await ctx.owner.query(`CREATE FUNCTION test_fail_enrolment_outbox() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN IF NEW.topic = 'enrolment.confirmed' THEN RAISE EXCEPTION 'injected failure'; END IF; RETURN NEW; END $$`);
      await ctx.owner.query(`CREATE TRIGGER test_fail_enrolment_outbox BEFORE INSERT ON outbox_message FOR EACH ROW EXECUTE FUNCTION test_fail_enrolment_outbox()`);
      const key = `rb-${randomUUID()}`;
      try {
        await expect(confirm(app.id, testPrerequisites(), { key })).rejects.toThrow(/injected failure/);
      } finally {
        await ctx.owner.query(`DROP TRIGGER test_fail_enrolment_outbox ON outbox_message`);
        await ctx.owner.query(`DROP FUNCTION test_fail_enrolment_outbox()`);
      }
      await nothingWritten(app.id, l.user.id);
      expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE operation IN ('seat.allocated', 'enrolment.confirmed') AND metadata->>'batchId' = $1`, [batch.id])).toBe(0);
      expect(await count(`SELECT count(*)::int AS n FROM outbox_message WHERE topic = 'seat.allocated' AND payload->>'batchId' = $1`, [batch.id])).toBe(0);
      expect(await count(`SELECT count(*)::int AS n FROM idempotency_record WHERE idempotency_key = $1`, [key])).toBe(0);
      expect((await confirm(app.id, testPrerequisites(), { key })).status).toBe(201);
    });

    it('last seat: 20 approved learners confirm concurrently for the last place — exactly one enrolment, 19 BATCH_FULL, nothing partial', async () => {
      const batch = await onlineBatch({ capacity: 3 });
      for (let i = 0; i < 2; i++) await confirm((await approved(batch.id)).app.id, testPrerequisites());
      const contenders: Array<Awaited<ReturnType<typeof approved>>> = [];
      for (let i = 0; i < 20; i++) contenders.push(await approved(batch.id));

      const results = await contend(batch.id, 20, () => contenders.map((c) => confirm(c.app.id, testPrerequisites(), { pool: racers })));
      const won = results.filter((r) => r.status === 'fulfilled');
      const lost = results.filter((r) => r.status === 'rejected').map((r) => codeOf((r as PromiseRejectedResult).reason));
      expect(won).toHaveLength(1);
      expect(lost).toEqual(Array(19).fill('BATCH_FULL'));
      expect(await count(`SELECT count(*)::int AS n FROM seat_allocation WHERE batch_id = $1 AND state IN ('held', 'occupied')`, [batch.id])).toBe(3);
      expect(await count(`SELECT count(*)::int AS n FROM enrolment WHERE batch_id = $1`, [batch.id])).toBe(3);
      expect(await count(`SELECT count(*)::int AS n FROM learner_application WHERE batch_id = $1 AND status = 'approved'`, [batch.id])).toBe(19);
      expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE operation = 'enrolment.confirmed' AND metadata->>'batchId' = $1`, [batch.id])).toBe(3);
      expect(await count(`SELECT count(*)::int AS n FROM outbox_message WHERE topic = 'enrolment.confirmed' AND payload->>'batchId' = $1`, [batch.id])).toBe(3);
      expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE operation = 'enrolment.confirm_refused' AND reason LIKE 'BATCH_FULL%' AND entity_id = ANY($1::text[])`, [contenders.map((c) => c.app.id)])).toBe(19);
      // No automatic transfer: every loser still has the batch they chose.
      expect(await count(`SELECT count(*)::int AS n FROM learner_application WHERE id = ANY($1::uuid[]) AND batch_id <> $2`, [contenders.map((c) => c.app.id), batch.id])).toBe(0);
      expect(await checkSeatInvariants(ctx.pool, batch.id)).toEqual([]);
    });
  });

  describe('no test-fixture bypass in production', () => {
    it('test-only adapters are refused outside the test environment, at use and when the app is built', async () => {
      const t = testPrerequisites();
      expect(() => assertPrerequisitesAllowed(t, 'production')).toThrow(/test-only/);
      expect(() => assertPrerequisitesAllowed(t, 'development')).toThrow(/test-only/);
      expect(() => assertPrerequisitesAllowed(t, 'test', 'production')).toThrow(/test-only/);
      expect(() => assertPrerequisitesAllowed({ ...PRODUCTION_PREREQUISITES, finance: { ...t.finance, trust: 'production ' as never } }, 'test')).toThrow();
      expect(() => assertPrerequisitesAllowed(PRODUCTION_PREREQUISITES, 'production')).not.toThrow();
      await expect(buildApp({ ...ctx.services, config: { ...ctx.config, env: 'production' }, prerequisites: t }, { logger: false })).rejects.toThrow(/test-only/);
      const batch = await onlineBatch();
      const { app } = await approved(batch.id);
      await expect(confirmEnrolment(ctx.pool, t, { applicationId: app.id, actor: { kind: 'user', principal: confirmerPrincipal }, idempotencyKey: `prod-${randomUUID()}` }, { configEnv: 'production' }))
        .rejects.toThrow(/test-only/);
    });

    it('the database refuses test-only evidence unless it is marked as a test database', async () => {
      const batch = await onlineBatch();
      const { l, app } = await approved(batch.id);
      // The same database, but connections that do not carry the test marker (as in any production database).
      const raw = new pg.Pool({ connectionString: ctx.db.appUrl, max: 2, options: '-c ilumin.test_evidence=' });
      try {
        await expect(confirm(app.id, testPrerequisites(), { pool: raw as unknown as Pool })).rejects.toMatchObject({ code: 'IL009' });
      } finally {
        await raw.end();
      }
      await nothingWritten(app.id, l.user.id);
    });

    it('production code cannot reach the test adapters: the build compiles src/ only', () => {
      const build = JSON.parse(readFileSync(new URL('../../tsconfig.build.json', import.meta.url), 'utf8'));
      expect(build.include).toEqual(['src/**/*.ts']);
    });
  });

  describe('enrolment reads', () => {
    it('the learner, admissions staff and the batch’s Coordinators read it; other learners and roles do not', async () => {
      const batch = await onlineBatch();
      const { l, app } = await approved(batch.id);
      const { enrolment } = await confirm(app.id, testPrerequisites());
      const get = async (u: TestUser, url: string) => ctx.app.inject({ method: 'GET', url, headers: await ctx.auth(u) });
      expect((await get(l.user, `/v1/enrolments/${enrolment.id}`)).statusCode).toBe(200);
      expect((await get(l.user, '/v1/learner/enrolments')).json().enrolments.map((e: { id: string }) => e.id)).toEqual([enrolment.id]);
      expect((await get(l.user, `/v1/applications/${app.id}/enrolment`)).json().enrolment.id).toBe(enrolment.id);
      expect((await get(f.admin, `/v1/enrolments/${enrolment.id}`)).statusCode).toBe(200);
      expect((await get(f.coordinator, `/v1/enrolments/${enrolment.id}`)).statusCode).toBe(200);
      const otherCoord = await ctx.createUser({ roles: ['academic_coordinator'] });
      await onlineBatch({ coordinatorUserIds: [otherCoord.id] });
      const otherLearner = await learnerWithProfile(ctx);
      for (const u of [otherCoord, otherLearner.user, confirmer, await ctx.createUser({ roles: ['business_admin'] })]) {
        expect((await get(u, `/v1/enrolments/${enrolment.id}`)).statusCode).toBe(403);
      }
    });
  });
});
