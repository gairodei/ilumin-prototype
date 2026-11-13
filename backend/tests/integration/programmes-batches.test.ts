import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { withTransaction } from '../../src/database/transaction.js';
import type { GrantableRole } from '../../src/modules/auth/roles.js';
import { createNextDraftVersion, publishProgrammeVersion } from '../../src/modules/programmes/programmes.js';
import { allocateSeat } from '../../src/modules/seats/seat-service.js';
import { createTestContext, type TestContext, type TestUser } from '../support/context.js';
import { allowEligibility, batchFor, domainFixture, type DomainFixture, learner, publishedProgramme } from '../support/domain.js';

/**
 * Stage 2A API and security: real server requests (Fastify inject, real OIDC tokens, real PostgreSQL).
 */

describe('programme and batch APIs', () => {
  let ctx: TestContext;
  let f: DomainFixture;
  let fo: Awaited<ReturnType<typeof publishedProgramme>>;
  let key = 0;

  beforeAll(async () => {
    ctx = await createTestContext();
    f = await domainFixture(ctx);
    fo = await publishedProgramme(ctx, f, { level: 3 });
  });
  afterAll(async () => ctx?.close());

  const req = async (method: 'GET' | 'POST' | 'PATCH' | 'PUT', url: string, user: TestUser | null, payload?: unknown, idemKey?: string) =>
    ctx.app.inject({
      method,
      url,
      headers: {
        ...(user ? await ctx.auth(user) : {}),
        ...(method === 'GET' ? {} : { 'idempotency-key': idemKey ?? `k-${++key}-${randomUUID()}` }),
      },
      ...(payload === undefined ? {} : { payload: payload as object }),
    });

  const batchBody = (o: Record<string, unknown> = {}) => ({
    code: `B-${randomUUID().slice(0, 8).toUpperCase()}`,
    programmeId: fo.programme.id,
    programmeVersionId: fo.version.id,
    startDate: '2027-04-01',
    timeZone: 'Europe/London',
    capacity: 12,
    status: 'open',
    acceptedFeeOptionIds: fo.version.feeOptions.map((x) => x.id),
    coordinatorUserIds: [f.coordinator.id],
    ...o,
  });
  const programmeBody = (o: Record<string, unknown> = {}) => ({
    code: `P-${randomUUID().slice(0, 8).toUpperCase()}`,
    title: 'Level 3 Diploma',
    level: 3,
    pricing: { model: 'fee_options', options: [{ label: 'Self-Paced', deliveryMode: 'self_paced', priceMinor: 120000, currency: 'GBP' }] },
    ...o,
  });

  const userWith = async (role: GrantableRole | 'agency_user') =>
    role === 'agency_user'
      ? ctx.createUser({ agency: { id: await ctx.createAgency(), role: 'agency_admin' } })
      : ctx.createUser({ roles: [role] });

  describe('authentication and role matrix', () => {
    it('refuses unauthenticated requests on every Stage 2A route', async () => {
      const b = await batchFor(ctx, f, fo);
      for (const [m, u] of [
        ['GET', '/v1/programmes'],
        ['POST', '/v1/programmes'],
        ['GET', `/v1/programmes/${fo.programme.id}/versions`],
        ['GET', '/v1/batches'],
        ['POST', '/v1/batches'],
        ['GET', `/v1/batches/${b.id}/occupancy`],
        ['PATCH', `/v1/batches/${b.id}`],
        ['GET', `/v1/batches/${b.id}/seats`],
      ] as const) {
        const r = await req(m, u, null, m === 'GET' ? undefined : {});
        expect(r.statusCode, `${m} ${u}`).toBe(401);
      }
    });

    const ALL: Array<GrantableRole | 'agency_user'> = [
      'super_admin', 'system_admin', 'academic_admin', 'finance_admin', 'business_admin',
      'academic_coordinator', 'assessor', 'teacher', 'iqa', 'learner', 'agency_user',
    ];

    it('programme creation: Super Admin, System Admin, Academic Admin only (PD-R1-10); refusals audited', async () => {
      for (const role of ALL) {
        const u = await userWith(role);
        const r = await req('POST', '/v1/programmes', u, programmeBody());
        const allowed = ['super_admin', 'system_admin', 'academic_admin'].includes(role);
        expect(r.statusCode, role).toBe(allowed ? 201 : 403);
        if (!allowed) {
          const a = await ctx.owner.query(`SELECT operation FROM audit_event WHERE actor_user_id = $1`, [u.id]);
          expect(a.rows.map((x) => x.operation), role).toEqual(['authz.denied']);
        }
      }
    });

    it('batch creation: the batch-edit right (Super Admin, Academic Admin, System Admin) only', async () => {
      for (const role of ALL) {
        const r = await req('POST', '/v1/batches', await userWith(role), batchBody());
        expect(r.statusCode, role).toBe(['super_admin', 'system_admin', 'academic_admin'].includes(role) ? 201 : 403);
      }
    });

    it('programme reads: programme administrators and Finance; nobody else (PD-2A-01)', async () => {
      for (const role of ALL) {
        const r = await req('GET', `/v1/programmes/${fo.programme.id}`, await userWith(role));
        expect(r.statusCode, role).toBe(['super_admin', 'system_admin', 'academic_admin', 'finance_admin'].includes(role) ? 200 : 403);
      }
    });
  });

  describe('staff scope and agency isolation', () => {
    it('allocated staff read only their own batch; Coordinators see its seats, Teachers do not; nobody else', async () => {
      const a = await batchFor(ctx, f, fo);
      const b = await batchFor(ctx, f, fo);
      const teacher = await ctx.createUser({ roles: ['teacher'] });
      expect((await req('POST', `/v1/batches/${a.id}/staff`, f.admin, { userId: teacher.id, role: 'teacher', reason: 'class teacher' })).statusCode).toBe(201);

      expect((await req('GET', `/v1/batches/${a.id}`, f.coordinator)).statusCode).toBe(200);
      expect((await req('GET', `/v1/batches/${a.id}/seats`, f.coordinator)).statusCode).toBe(200);
      expect((await req('GET', `/v1/batches/${a.id}/occupancy`, teacher)).statusCode).toBe(200);
      expect((await req('GET', `/v1/batches/${a.id}/seats`, teacher)).statusCode).toBe(403);
      expect((await req('GET', `/v1/batches/${b.id}`, teacher)).statusCode).toBe(403);

      const otherCoord = await ctx.createUser({ roles: ['academic_coordinator'] });
      expect((await req('GET', `/v1/batches/${a.id}`, otherCoord)).statusCode).toBe(403);
      const list = await req('GET', '/v1/batches?limit=200', teacher);
      expect(list.statusCode).toBe(200);
      expect(list.json().batches.map((x: { id: string }) => x.id)).toEqual([a.id]);
      expect((await req('GET', '/v1/batches?limit=200', otherCoord)).json().batches).toEqual([]);
    });

    it('agency users and learners get no batch or occupancy data (no cross-agency reads)', async () => {
      const a = await batchFor(ctx, f, fo);
      const agencyUser = await userWith('agency_user');
      const l = await learner(ctx);
      for (const u of [agencyUser, l]) {
        for (const url of [`/v1/batches/${a.id}`, `/v1/batches/${a.id}/occupancy`, `/v1/batches/${a.id}/seats`, '/v1/batches', '/v1/programmes']) {
          expect((await req('GET', url, u)).statusCode, url).toBe(403);
        }
      }
    });
  });

  describe('forced identifiers', () => {
    it('an unknown programme id is 404; a version of another programme is PROGRAMME_VERSION_MISMATCH', async () => {
      const other = await publishedProgramme(ctx, f, { level: 3 });
      expect((await req('POST', '/v1/batches', f.admin, batchBody({ programmeId: randomUUID() }))).statusCode).toBe(404);
      const r = await req('POST', '/v1/batches', f.admin, batchBody({ programmeVersionId: other.version.id }));
      expect(r.statusCode).toBe(409);
      expect(r.json().error.code).toBe('PROGRAMME_VERSION_MISMATCH');
      expect((await req('GET', `/v1/programmes/${fo.programme.id}/versions/${other.version.id}`, f.admin)).statusCode).toBe(404);
    });

    it('a superseded or draft version is refused for new batches', async () => {
      const p = await publishedProgramme(ctx, f, { level: 3 });
      const actor = { actor: { kind: 'user' as const, principal: f.adminPrincipal } };
      const v2 = await withTransaction(ctx.pool, (tx) => createNextDraftVersion(tx, actor, p.programme.id));
      const body = batchBody({ programmeId: p.programme.id, acceptedFeeOptionIds: p.version.feeOptions.map((o) => o.id) });
      const draft = await req('POST', '/v1/batches', f.admin, { ...body, programmeVersionId: v2.id });
      expect(draft.json().error.code).toBe('PROGRAMME_VERSION_MISMATCH');
      await withTransaction(ctx.pool, (tx) =>
        publishProgrammeVersion(tx, actor, { programmeId: p.programme.id, versionId: v2.id, approval: { approvedByUserId: f.finance.id, reference: 'FIN-V2' } }),
      );
      const old = await req('POST', '/v1/batches', f.admin, { ...body, programmeVersionId: p.version.id });
      expect(old.statusCode).toBe(409);
      expect(old.json().error.code).toBe('PROGRAMME_VERSION_MISMATCH');
      expect((await req('POST', '/v1/batches', f.admin, { ...body, programmeVersionId: v2.id })).statusCode).toBe(201);
    });

    it('a fee option of another programme is refused (create and change); a retired option is not eligible', async () => {
      const other = await publishedProgramme(ctx, f, { level: 3 });
      const foreign = other.version.feeOptions[0]!.id;
      const c = await req('POST', '/v1/batches', f.admin, batchBody({ acceptedFeeOptionIds: [foreign] }));
      expect(c.json().error.code).toBe('PROGRAMME_VERSION_MISMATCH');
      const b = await batchFor(ctx, f, fo);
      const put = await req('PUT', `/v1/batches/${b.id}/fee-options`, f.admin, {
        feeOptionIds: [...b.acceptedFeeOptions.map((o) => o.id), foreign], reason: 'add option', expectedRowVersion: b.rowVersion,
      });
      expect(put.json().error.code).toBe('PROGRAMME_VERSION_MISMATCH');
      // Retire an option (Finance), then try to accept it.
      const p = await publishedProgramme(ctx, f, { level: 3 });
      const [o1, o2] = p.version.feeOptions;
      await ctx.pool.query(`UPDATE fee_option SET status = 'retired', retired_at = now(), retired_by = $2, retire_reason = 'replaced' WHERE id = $1`, [o2!.id, f.finance.id]);
      const r = await req('POST', '/v1/batches', f.admin, batchBody({ programmeId: p.programme.id, programmeVersionId: p.version.id, acceptedFeeOptionIds: [o1!.id, o2!.id] }));
      expect(r.json().error.code).toBe('BATCH_NOT_ELIGIBLE');
      await expect(ctx.pool.query(`UPDATE fee_option SET status = 'active', retired_at = NULL, retired_by = NULL, retire_reason = NULL WHERE id = $1`, [o2!.id])).rejects.toMatchObject({ code: 'IL002' });
    });

    it('a body that tries to set occupancy or authority fields is refused (strict validation)', async () => {
      const b = await batchFor(ctx, f, fo);
      for (const extra of [{ enrolled: 0 }, { occupancy: 1 }, { programmeId: randomUUID() }, { status: 'open' }]) {
        const r = await req('PATCH', `/v1/batches/${b.id}`, f.admin, { capacity: 20, reason: 'x reason', expectedRowVersion: b.rowVersion, ...extra });
        expect(r.statusCode, JSON.stringify(extra)).toBe(400);
      }
    });
  });

  describe('programme lifecycle and restrictions', () => {
    it('creates a draft with generated fee-option ids; Level 3 must use fee options; codes are unique', async () => {
      const body = programmeBody();
      const r = await req('POST', '/v1/programmes', f.admin, body);
      expect(r.statusCode).toBe(201);
      const { programme, draftVersion } = r.json();
      expect(programme).toMatchObject({ status: 'draft', level: 3, currentPublishedVersionId: null });
      expect(draftVersion).toMatchObject({ versionNumber: 1, status: 'draft', pricingModel: 'fee_options', snapshot: null });
      expect(draftVersion.feeOptions.map((o: { code: string }) => o.code)).toEqual([`${body.code}-FO-001`]);
      expect((await req('POST', '/v1/programmes', f.admin, body)).statusCode).toBe(409);
      const sp = await req('POST', '/v1/programmes', f.admin, programmeBody({ pricing: { model: 'single_price', priceMinor: 1000, currency: 'GBP' } }));
      expect(sp.statusCode).toBe(400);
      const l2 = await req('POST', '/v1/programmes', f.admin, programmeBody({ level: 2, pricing: { model: 'single_price', priceMinor: 1000, currency: 'GBP' } }));
      expect(l2.statusCode).toBe(201);
      expect(l2.json().draftVersion.feeOptions).toEqual([]); // no invented options for a single-price programme
    });

    it('there is no publication route; a draft cannot become active without a Finance-approved published version', async () => {
      const r = await req('POST', '/v1/programmes', f.admin, programmeBody());
      const { programme, draftVersion } = r.json();
      expect((await req('POST', `/v1/programmes/${programme.id}/versions/${draftVersion.id}/publish`, f.admin, {})).statusCode).toBe(404);
      const act = await req('POST', `/v1/programmes/${programme.id}/status`, f.admin, { status: 'active', reason: 'go live', expectedRowVersion: 1 });
      expect(act.statusCode).toBe(409);
      expect(act.json().error.code).toBe('INVALID_STATE_TRANSITION');
      // Publishing without an approval record is impossible in the database itself.
      await expect(
        ctx.pool.query(`UPDATE programme_version SET status = 'published', snapshot = '{}', published_by = $2, published_at = now() WHERE id = $1`, [draftVersion.id, f.admin.id]),
      ).rejects.toMatchObject({ code: '23514' });
      // An approval from someone without Finance authority is refused.
      const actor = { actor: { kind: 'user' as const, principal: f.adminPrincipal } };
      await expect(
        withTransaction(ctx.pool, (tx) => publishProgrammeVersion(tx, actor, { programmeId: programme.id, versionId: draftVersion.id, approval: { approvedByUserId: f.admin.id, reference: 'X' } })),
      ).rejects.toMatchObject({ code: 'FORBIDDEN' });
    });

    it('published versions are immutable', async () => {
      await expect(ctx.pool.query(`UPDATE programme_version SET currency = 'EUR' WHERE id = $1`, [fo.version.id])).rejects.toMatchObject({ code: 'IL005' });
      await expect(ctx.pool.query(`UPDATE programme_version_fee_option SET price_minor = 1 WHERE programme_version_id = $1`, [fo.version.id])).rejects.toMatchObject({ code: 'IL005' });
      await expect(ctx.pool.query(`DELETE FROM programme_version_fee_option WHERE programme_version_id = $1`, [fo.version.id])).rejects.toMatchObject({ code: '42501' });
    });

    it('closed and archived programmes take no new batches; archived is final', async () => {
      const p = await publishedProgramme(ctx, f, { level: 3 });
      const body = batchBody({ programmeId: p.programme.id, programmeVersionId: p.version.id, acceptedFeeOptionIds: p.version.feeOptions.map((o) => o.id) });
      const close = await req('POST', `/v1/programmes/${p.programme.id}/status`, f.admin, { status: 'closed', reason: 'intake closed', expectedRowVersion: p.programme.rowVersion });
      expect(close.statusCode).toBe(200);
      const r = await req('POST', '/v1/batches', f.admin, body);
      expect(r.statusCode).toBe(409);
      expect(r.json().error.code).toBe('BATCH_NOT_ELIGIBLE');
      const arch = await req('POST', `/v1/programmes/${p.programme.id}/status`, f.admin, { status: 'archived', reason: 'retired', expectedRowVersion: close.json().programme.rowVersion });
      expect(arch.statusCode).toBe(200);
      const back = await req('POST', `/v1/programmes/${p.programme.id}/status`, f.admin, { status: 'active', reason: 'undo', expectedRowVersion: arch.json().programme.rowVersion });
      expect(back.json().error.code).toBe('INVALID_STATE_TRANSITION');
      const draft = (await req('POST', '/v1/programmes', f.admin, programmeBody())).json();
      const d = await req('POST', '/v1/batches', f.admin, batchBody({ programmeId: draft.programme.id, programmeVersionId: draft.draftVersion.id }));
      expect(d.statusCode).toBe(409);
    });
  });

  describe('batch configuration', () => {
    it('only batch administrators change capacity', async () => {
      const b = await batchFor(ctx, f, fo, { capacity: 10 });
      for (const role of ['academic_coordinator', 'finance_admin', 'business_admin', 'learner', 'teacher'] as const) {
        const u = role === 'academic_coordinator' ? f.coordinator : await ctx.createUser({ roles: [role] });
        const r = await req('PATCH', `/v1/batches/${b.id}`, u, { capacity: 50, reason: 'bigger room', expectedRowVersion: b.rowVersion });
        expect(r.statusCode, role).toBe(403);
      }
      expect((await req('GET', `/v1/batches/${b.id}/occupancy`, f.admin)).json().occupancy.capacity).toBe(10);
    });

    it('stale and repeated requests: row-version conflicts are refused, idempotent repeats replay once', async () => {
      const b = await batchFor(ctx, f, fo, { capacity: 10 });
      const k = `patch-${b.id}`;
      const body = { capacity: 11, reason: 'one more chair', expectedRowVersion: b.rowVersion };
      const first = await req('PATCH', `/v1/batches/${b.id}`, f.admin, body, k);
      const again = await req('PATCH', `/v1/batches/${b.id}`, f.admin, body, k);
      expect(first.statusCode).toBe(200);
      expect(again.statusCode).toBe(200);
      expect(again.headers['idempotent-replayed']).toBe('true');
      expect(again.json()).toEqual(first.json());
      const reused = await req('PATCH', `/v1/batches/${b.id}`, f.admin, { ...body, capacity: 12 }, k);
      expect(reused.json().error.code).toBe('IDEMPOTENCY_KEY_REUSED');
      const stale = await req('PATCH', `/v1/batches/${b.id}`, f.admin, { ...body, capacity: 13 });
      expect(stale.statusCode).toBe(409);
      expect(stale.json().error.code).toBe('STALE_RESOURCE');
      const audits = await ctx.owner.query(`SELECT count(*)::int AS n FROM audit_event WHERE operation = 'batch.updated' AND entity_id = $1`, [b.id]);
      expect(audits.rows[0].n).toBe(1);
    });

    it('invalid or missing time zones are refused, in the API and in the database (no default zone)', async () => {
      for (const tz of ['GMT', 'UTC', 'Europe/Londn', '+01:00', 'EST5EDT', 'posix/Europe/London', '', 'Europe/London; DROP']) {
        expect((await req('POST', '/v1/batches', f.admin, batchBody({ timeZone: tz }))).statusCode, tz).toBe(400);
      }
      const { timeZone: _omit, ...noZone } = batchBody();
      expect((await req('POST', '/v1/batches', f.admin, noZone)).statusCode).toBe(400);
      expect((await req('POST', '/v1/batches', f.admin, batchBody({ timeZone: 'Asia/Dubai' }))).statusCode).toBe(201);
      const b = await batchFor(ctx, f, fo);
      await expect(ctx.pool.query(`UPDATE batch SET time_zone = 'Mars/Olympus' WHERE id = $1`, [b.id])).rejects.toMatchObject({ code: 'IL007' });
    });

    it('invalid lifecycle transitions are refused; a batch with places is not cancelled or rescheduled', async () => {
      const b = await batchFor(ctx, f, fo, { capacity: 3 });
      for (const status of ['in_progress', 'completed', 'archived']) {
        const r = await req('POST', `/v1/batches/${b.id}/status`, f.admin, { status, reason: 'try it', expectedRowVersion: b.rowVersion });
        expect(r.json().error.code, status).toBe('INVALID_STATE_TRANSITION');
      }
      await withTransaction(ctx.pool, async (tx) =>
        allocateSeat(tx, { actor: { kind: 'system', label: 'test' } }, {
          batchId: b.id,
          subject: { kind: 'learner', learnerUserId: (await learner(ctx)).id },
          feeOptionId: fo.version.feeOptions[0]!.id,
          authority: { kind: 'enrolment_confirmation', ref: 'E1' },
          eligibility: allowEligibility(),
        }),
      );
      const cancel = await req('POST', `/v1/batches/${b.id}/status`, f.admin, { status: 'cancelled', reason: 'no tutor', expectedRowVersion: b.rowVersion });
      expect(cancel.json().error.code).toBe('INVALID_STATE_TRANSITION');
      const move = await req('PATCH', `/v1/batches/${b.id}`, f.admin, { startDate: '2027-05-01', reason: 'later', expectedRowVersion: b.rowVersion });
      expect(move.json().error.code).toBe('INVALID_STATE_TRANSITION');
      const rm = await req('PUT', `/v1/batches/${b.id}/fee-options`, f.admin, {
        feeOptionIds: [fo.version.feeOptions[1]!.id], reason: 'drop option', expectedRowVersion: b.rowVersion,
      });
      expect(rm.json().error.code).toBe('BATCH_NOT_ELIGIBLE');
      const empty = await batchFor(ctx, f, fo);
      const ok = await req('POST', `/v1/batches/${empty.id}/status`, f.admin, { status: 'cancelled', reason: 'no learners', expectedRowVersion: empty.rowVersion });
      expect(ok.statusCode).toBe(200);
      const reopen = await req('POST', `/v1/batches/${empty.id}/status`, f.admin, { status: 'open', reason: 'undo', expectedRowVersion: ok.json().batch.rowVersion });
      expect(reopen.json().error.code).toBe('INVALID_STATE_TRANSITION');
    });

    it('single-price batches have one delivery mode and no fee options', async () => {
      const sp = await publishedProgramme(ctx, f, { level: 5 });
      const base = batchBody({ programmeId: sp.programme.id, programmeVersionId: sp.version.id, acceptedFeeOptionIds: undefined });
      expect((await req('POST', '/v1/batches', f.admin, base)).statusCode).toBe(400);
      expect((await req('POST', '/v1/batches', f.admin, { ...base, deliveryMode: 'unknown_mode' })).statusCode).toBe(400);
      const ok = await req('POST', '/v1/batches', f.admin, { ...base, deliveryMode: 'self_paced' });
      expect(ok.statusCode).toBe(201);
      expect(ok.json().batch).toMatchObject({ pricingModel: 'single_price', deliveryMode: 'self_paced', acceptedFeeOptions: [] });
      expect((await req('POST', '/v1/batches', f.admin, { ...batchBody(), deliveryMode: 'self_paced' })).statusCode).toBe(400);
    });

    it('there is no route that takes, releases or moves a seat', async () => {
      const writes = ctx.app.routeInventory.filter((r) => /seat|enrol|reserv/i.test(r.url) && r.method !== 'GET' && r.method !== 'HEAD');
      expect(writes).toEqual([]);
      const b = await batchFor(ctx, f, fo);
      for (const url of [`/v1/batches/${b.id}/seats`, `/v1/batches/${b.id}/seats/allocate`, `/v1/seats`]) {
        expect((await req('POST', url, f.admin, {})).statusCode, url).toBe(404);
      }
      const sa = await ctx.createUser({ roles: ['super_admin'] });
      expect((await req('POST', `/v1/batches/${b.id}/seats`, sa, { learnerUserId: sa.id })).statusCode).toBe(404);
    });
  });

  describe('staff allocations', () => {
    it('P-33: a Coordinator of the batch cannot also be its assessor (API and database)', async () => {
      const b = await batchFor(ctx, f, fo);
      const both = await ctx.createUser({ roles: ['academic_coordinator', 'assessor'] });
      expect((await req('POST', `/v1/batches/${b.id}/staff`, f.admin, { userId: both.id, role: 'academic_coordinator', reason: 'second coordinator' })).statusCode).toBe(201);
      for (const fn of ['assignment', 'pd', 'observation']) {
        const r = await req('POST', `/v1/batches/${b.id}/staff`, f.admin, { userId: both.id, role: 'assessor', assessorFunction: fn, reason: 'assess' });
        expect(r.json().error.code, fn).toBe('STAFF_ALLOCATION_CONFLICT');
      }
      await expect(
        ctx.pool.query(`INSERT INTO staff_scope (user_id, role, scope_kind, scope_id, assessor_function) VALUES ($1, 'assessor', 'batch', $2, 'pd')`, [both.id, b.id]),
      ).rejects.toMatchObject({ code: 'IL003' });
      // The same person may assess a different batch.
      const other = await batchFor(ctx, f, fo);
      expect((await req('POST', `/v1/batches/${other.id}/staff`, f.admin, { userId: both.id, role: 'assessor', assessorFunction: 'pd', reason: 'assess' })).statusCode).toBe(201);
    });

    it('IQA independence, role required, assessor function required, self-allocation refused', async () => {
      const b = await batchFor(ctx, f, fo);
      const t = await ctx.createUser({ roles: ['teacher', 'iqa'] });
      expect((await req('POST', `/v1/batches/${b.id}/staff`, f.admin, { userId: t.id, role: 'teacher', reason: 'teach' })).statusCode).toBe(201);
      expect((await req('POST', `/v1/batches/${b.id}/staff`, f.admin, { userId: t.id, role: 'iqa', reason: 'iqa' })).json().error.code).toBe('STAFF_ALLOCATION_CONFLICT');
      const noRole = await ctx.createUser({ roles: ['teacher'] });
      expect((await req('POST', `/v1/batches/${b.id}/staff`, f.admin, { userId: noRole.id, role: 'assessor', assessorFunction: 'pd', reason: 'x reason' })).statusCode).toBe(400);
      const as = await ctx.createUser({ roles: ['assessor'] });
      expect((await req('POST', `/v1/batches/${b.id}/staff`, f.admin, { userId: as.id, role: 'assessor', reason: 'no function' })).statusCode).toBe(400);
      const selfAdmin = await ctx.createUser({ roles: ['academic_admin', 'teacher'] });
      expect((await req('POST', `/v1/batches/${b.id}/staff`, selfAdmin, { userId: selfAdmin.id, role: 'teacher', reason: 'myself' })).statusCode).toBe(403);
      expect((await req('POST', `/v1/batches/${b.id}/staff`, f.coordinator, { userId: as.id, role: 'assessor', assessorFunction: 'pd', reason: 'x reason' })).statusCode).toBe(403);
    });

    it('a batch keeps at least one Academic Coordinator; a revoked allocation stops granting access', async () => {
      const b = await batchFor(ctx, f, fo);
      const staff = (await req('GET', `/v1/batches/${b.id}`, f.admin)).json().staff;
      const only = staff.find((s: { role: string }) => s.role === 'academic_coordinator');
      const last = await req('POST', `/v1/batches/${b.id}/staff/${only.id}/revoke`, f.admin, { reason: 'leaving' });
      expect(last.json().error.code).toBe('INVALID_STATE_TRANSITION');
      const second = await ctx.createUser({ roles: ['academic_coordinator'] });
      expect((await req('POST', `/v1/batches/${b.id}/staff`, f.admin, { userId: second.id, role: 'academic_coordinator', reason: 'cover' })).statusCode).toBe(201);
      expect((await req('GET', `/v1/batches/${b.id}`, second)).statusCode).toBe(200);
      const alloc = (await req('GET', `/v1/batches/${b.id}`, f.admin)).json().staff.find((s: { userId: string }) => s.userId === second.id);
      expect((await req('POST', `/v1/batches/${b.id}/staff/${alloc.id}/revoke`, f.admin, { reason: 'cover ended' })).statusCode).toBe(200);
      expect((await req('GET', `/v1/batches/${b.id}`, second)).statusCode).toBe(403);
    });
  });

  it('creates a batch end to end and reports occupancy derived from the ledger', async () => {
    const r = await req('POST', '/v1/batches', f.admin, batchBody({ capacity: 7 }));
    expect(r.statusCode).toBe(201);
    const { batch, staff, occupancy } = r.json();
    expect(batch).toMatchObject({ status: 'open', timeZone: 'Europe/London', startDate: '2027-04-01', capacity: 7, deliveryMode: null });
    expect(batch.acceptedFeeOptions).toHaveLength(2);
    expect(staff).toEqual([expect.objectContaining({ userId: f.coordinator.id, role: 'academic_coordinator' })]);
    expect(occupancy).toEqual({ batchId: batch.id, capacity: 7, active: 0, held: 0, occupied: 0, unattributed: 0, available: 7, acceptingAllocations: true });
    const audit = await ctx.owner.query(`SELECT actor_user_id, request_id FROM audit_event WHERE operation = 'batch.created' AND entity_id = $1`, [batch.id]);
    expect(audit.rows).toEqual([{ actor_user_id: f.admin.id, request_id: r.headers['x-request-id'] }]);
  });
});
