import { randomUUID } from 'node:crypto';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { withTransaction } from '../../src/database/transaction.js';
import { decideApplication } from '../../src/modules/applications/applications.js';
import { allocateSeat } from '../../src/modules/seats/seat-service.js';
import { createNextDraftVersion, publishProgrammeVersion } from '../../src/modules/programmes/programmes.js';
import { createTestContext, sessionEnv, type TestContext, type TestUser } from '../support/context.js';
import { batchFor, domainFixture, type DomainFixture, principalOf, publishedProgramme } from '../support/domain.js';
import { learnerWithProfile, testPrerequisites } from '../support/enrolment.js';
import { login, writeHeaders } from '../support/session.js';

/**
 * Stage 2B: learner profile, application lifecycle, explicit batch choice (P3) and authorization — real server requests
 * (Fastify inject, real OIDC tokens) on real PostgreSQL. The app uses the PRODUCTION prerequisite adapters unless a
 * test places the test-only adapters on its own Services object (approval needs document review, PD-AC2-01).
 */

type Method = 'GET' | 'POST' | 'PATCH' | 'PUT';

describe('learner applications and batch choice', () => {
  let ctx: TestContext;
  let f: DomainFixture;
  let l3: Awaited<ReturnType<typeof publishedProgramme>>;
  let key = 0;

  beforeAll(async () => {
    ctx = await createTestContext();
    f = await domainFixture(ctx);
    l3 = await publishedProgramme(ctx, f, { level: 3 });
  });
  afterAll(async () => ctx?.close());
  afterEach(() => {
    delete ctx.services.prerequisites; // back to the production adapters
  });

  const req = async (method: Method, url: string, user: TestUser | null, payload?: unknown, idemKey?: string) =>
    ctx.app.inject({
      method,
      url,
      headers: {
        ...(user ? await ctx.auth(user) : {}),
        ...(method === 'GET' ? {} : { 'idempotency-key': idemKey ?? `k-${++key}-${randomUUID()}` }),
      },
      ...(payload === undefined ? {} : { payload: payload as object }),
    });

  const sp = () => l3.version.feeOptions.find((o) => o.deliveryMode === 'self_paced')!.id;
  const fa = () => l3.version.feeOptions.find((o) => o.deliveryMode === 'fully_assisted')!.id;
  const count = async (sql: string, params: unknown[] = []) => (await ctx.owner.query<{ n: number }>(sql, params)).rows[0]!.n;

  /** A learner with a profile and a draft application with complete details (no batch yet). */
  async function draft(o: { country?: string; feeOptionId?: string | null; programmeId?: string } = {}) {
    const l = await learnerWithProfile(ctx, o.country ?? 'GB');
    const created = await req('POST', '/v1/applications', l.user, {
      programmeId: o.programmeId ?? l3.programme.id,
      ...(o.feeOptionId === null ? {} : { feeOptionId: o.feeOptionId ?? sp() }),
    });
    expect(created.statusCode, created.body).toBe(201);
    const a = created.json().application;
    const upd = await req('PATCH', `/v1/applications/${a.id}`, l.user, {
      expectedRowVersion: a.rowVersion,
      dateOfBirth: '1991-02-03',
      address: '2 Example Road',
      postcode: 'EX2 2MP',
    });
    expect(upd.statusCode, upd.body).toBe(200);
    return { l, app: upd.json().application };
  }
  const choose = (u: TestUser, app: { id: string; rowVersion: number }, batchId: string | null) =>
    req('PUT', `/v1/applications/${app.id}/batch`, u, { expectedRowVersion: app.rowVersion, batchId });
  async function submitted(o: Parameters<typeof draft>[0] & { batchId: string }) {
    const d = await draft(o);
    const c = await choose(d.l.user, d.app, o.batchId);
    expect(c.statusCode, c.body).toBe(200);
    const s = await req('POST', `/v1/applications/${d.app.id}/submit`, d.l.user, { expectedRowVersion: c.json().application.rowVersion });
    expect(s.statusCode, s.body).toBe(200);
    return { l: d.l, app: s.json().application };
  }
  const onlineBatch = (o: Record<string, unknown> = {}) => batchFor(ctx, f, l3, { location: 'online', ...o });
  /** Fills a batch's remaining places with administrative seats for other learners (not through applications). */
  async function fill(batchId: string, n: number) {
    for (let i = 0; i < n; i++) {
      const other = await ctx.createUser({ roles: ['learner'] });
      await withTransaction(ctx.pool, (tx) =>
        allocateSeat(tx, { actor: { kind: 'user', principal: f.adminPrincipal } }, {
          batchId,
          subject: { kind: 'learner', learnerUserId: other.id },
          feeOptionId: sp(),
          authority: { kind: 'administrative_adjustment', ref: `TEST-FILL-${other.id}` },
          reason: 'test: fill the batch',
          eligibility: async () => {},
        }),
      );
    }
  }

  describe('learner profile', () => {
    it('is created once, per user, from the session; repeats return it; the country is not changed here', async () => {
      const u = await ctx.createUser({ roles: ['learner'] });
      expect((await req('GET', '/v1/learner/profile', u)).statusCode).toBe(404);
      const r1 = await req('POST', '/v1/learner/profile', u, { countryCode: 'GB' });
      expect(r1.statusCode).toBe(201);
      expect(r1.json().profile).toMatchObject({ userId: u.id, countryCode: 'GB' });
      expect((await req('POST', '/v1/learner/profile', u, { countryCode: 'GB' })).statusCode).toBe(200);
      const changed = await req('POST', '/v1/learner/profile', u, { countryCode: 'AE' });
      expect(changed.statusCode).toBe(409);
      expect(changed.json().error.code).toBe('IMMUTABLE_RECORD');
      expect((await req('POST', '/v1/learner/profile', u, { countryCode: 'gb' })).statusCode).toBe(400);
      expect((await req('POST', '/v1/learner/profile', u, { countryCode: 'GB', userId: f.admin.id })).statusCode).toBe(400);
    });

    it('concurrent creation makes exactly one profile and one audit event', async () => {
      const u = await ctx.createUser({ roles: ['learner'] });
      const rs = await Promise.all(Array.from({ length: 10 }, () => req('POST', '/v1/learner/profile', u, { countryCode: 'AE' })));
      expect(rs.map((r) => r.statusCode).sort()).toEqual([200, 200, 200, 200, 200, 200, 200, 200, 200, 201]);
      expect(await count(`SELECT count(*)::int AS n FROM learner_profile WHERE user_id = $1`, [u.id])).toBe(1);
      expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE operation = 'learner_profile.created' AND entity_id = $1`, [u.id])).toBe(1);
    });

    it('only learners have a learner profile (staff, agencies and the database refuse it)', async () => {
      const staff = await ctx.createUser({ roles: ['academic_admin'] });
      expect((await req('POST', '/v1/learner/profile', staff, { countryCode: 'GB' })).statusCode).toBe(403);
      await expect(ctx.owner.query(`INSERT INTO learner_profile (user_id, country_code, created_by) VALUES ($1, 'GB', $1)`, [staff.id]))
        .rejects.toMatchObject({ code: 'IL008' });
    });
  });

  describe('application lifecycle', () => {
    it('creates a draft for the session learner, freezing the programme version and the terms version in force (LEGACY-1)', async () => {
      const u = await ctx.createUser({ roles: ['learner'] });
      expect((await req('POST', '/v1/applications', u, { programmeId: l3.programme.id })).json().error.code).toBe('LEARNER_PROFILE_REQUIRED');
      const l = await learnerWithProfile(ctx, 'GB');
      const r = await req('POST', '/v1/applications', l.user, { programmeId: l3.programme.id, feeOptionId: fa() });
      expect(r.statusCode).toBe(201);
      const a = r.json().application;
      expect(a).toMatchObject({
        status: 'draft',
        learner: { userId: l.user.id, countryCode: 'GB' },
        programme: { id: l3.programme.id, versionId: l3.version.id, pricingModel: 'fee_options' },
        termsVersion: { code: 'LEGACY-1' },
        feeOption: { id: fa(), deliveryMode: 'fully_assisted' },
        deliveryMode: 'fully_assisted',
        batch: null,
      });
      // A learner id in the body is not accepted: ownership comes from the session.
      expect((await req('POST', '/v1/applications', l.user, { programmeId: l3.programme.id, learnerUserId: f.admin.id })).statusCode).toBe(400);
      // One open application at a time (PD-NB1-02).
      const second = await req('POST', '/v1/applications', l.user, { programmeId: l3.programme.id });
      expect(second.statusCode).toBe(409);
      expect(second.json().error.code).toBe('APPLICATION_ALREADY_OPEN');
    });

    it('concurrent creation for one learner makes exactly one open application', async () => {
      const l = await learnerWithProfile(ctx);
      const rs = await Promise.all(Array.from({ length: 8 }, () => req('POST', '/v1/applications', l.user, { programmeId: l3.programme.id })));
      expect(rs.filter((r) => r.statusCode === 201)).toHaveLength(1);
      expect(rs.filter((r) => r.statusCode === 409).every((r) => r.json().error.code === 'APPLICATION_ALREADY_OPEN')).toBe(true);
      expect(await count(`SELECT count(*)::int AS n FROM learner_application WHERE learner_user_id = $1`, [l.user.id])).toBe(8 - 7);
    });

    it('submission needs complete details, a fee option and an explicitly chosen batch', async () => {
      const l = await learnerWithProfile(ctx);
      const a = (await req('POST', '/v1/applications', l.user, { programmeId: l3.programme.id })).json().application;
      const r = await req('POST', `/v1/applications/${a.id}/submit`, l.user, { expectedRowVersion: a.rowVersion });
      expect(r.statusCode).toBe(409);
      expect(r.json().error.code).toBe('APPLICATION_INCOMPLETE');
      expect(r.json().error.details.map((d: { path: string }) => d.path).sort()).toEqual(['address', 'batchId', 'dateOfBirth', 'feeOptionId']);
      expect((await req('PATCH', `/v1/applications/${a.id}`, l.user, { expectedRowVersion: a.rowVersion, dateOfBirth: '2999-01-01' })).statusCode).toBe(400);
    });

    it('draft → submitted → under review → approved, with history, actors and no personal data in the audit log', async () => {
      const batch = await onlineBatch();
      const { l, app } = await submitted({ batchId: batch.id });
      expect(app).toMatchObject({ status: 'submitted', batch: { id: batch.id }, deliveryMode: 'self_paced' });
      const rv = await req('POST', `/v1/applications/${app.id}/review`, f.admin, { expectedRowVersion: app.rowVersion });
      expect(rv.statusCode, rv.body).toBe(200);
      ctx.services.prerequisites = testPrerequisites();
      const ok = await req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision: 'approve', expectedRowVersion: rv.json().application.rowVersion });
      expect(ok.statusCode, ok.body).toBe(200);
      expect(ok.json().application).toMatchObject({ status: 'approved', decidedBy: f.admin.id });
      const h = (await req('GET', `/v1/applications/${app.id}/history`, l.user)).json().events;
      expect(h.map((e: { action: string }) => e.action)).toEqual(['created', 'details_updated', 'batch_selected', 'submitted', 'review_started', 'approved']);
      expect(h.find((e: { action: string }) => e.action === 'approved')).toMatchObject({ actorUserId: f.admin.id, fromStatus: 'under_review', toStatus: 'approved' });
      const audits = await ctx.owner.query(`SELECT after_state::text AS s FROM audit_event WHERE entity_id = $1`, [app.id]);
      for (const a of audits.rows) expect(a.s).not.toMatch(/Example Road|EX2 2MP|1991-02-03/);
      // Approval is not enrolment: no enrolment and no seat exist.
      expect(await count(`SELECT count(*)::int AS n FROM enrolment WHERE application_id = $1`, [app.id])).toBe(0);
      expect(await count(`SELECT count(*)::int AS n FROM seat_allocation WHERE learner_user_id = $1`, [l.user.id])).toBe(0);
    });

    it('approval fails closed with the production adapters: mandatory documents cannot be verified yet (PD-AC2-01)', async () => {
      const batch = await onlineBatch();
      const { app } = await submitted({ batchId: batch.id });
      const r = await req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision: 'approve', expectedRowVersion: app.rowVersion });
      expect(r.statusCode).toBe(409);
      expect(r.json().error.code).toBe('ADMISSION_DOCUMENTS_REQUIRED');
      expect((await req('GET', `/v1/applications/${app.id}`, f.admin)).json().application.status).toBe('submitted');
      ctx.services.prerequisites = testPrerequisites({ documents: 'none' });
      expect((await req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision: 'approve', expectedRowVersion: app.rowVersion })).json().error.code)
        .toBe('ADMISSION_DOCUMENTS_REQUIRED');
    });

    it('refusal needs a reason, is final, and a decided application is never decided again', async () => {
      const batch = await onlineBatch();
      const { l, app } = await submitted({ batchId: batch.id });
      expect((await req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision: 'reject', expectedRowVersion: app.rowVersion })).statusCode).toBe(400);
      const rej = await req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision: 'reject', reason: 'Entry requirements not met', expectedRowVersion: app.rowVersion });
      expect(rej.statusCode, rej.body).toBe(200);
      const a = rej.json().application;
      expect(a.status).toBe('rejected');
      ctx.services.prerequisites = testPrerequisites();
      for (const decision of ['approve', 'reject', 'withdraw', 'request_information']) {
        const again = await req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision, reason: 'again', expectedRowVersion: a.rowVersion });
        expect(again.statusCode, decision).toBe(409);
        expect(again.json().error.code).toBe('INVALID_STATE_TRANSITION');
      }
      expect((await req('POST', `/v1/applications/${app.id}/withdraw`, l.user, { expectedRowVersion: a.rowVersion })).json().error.code).toBe('INVALID_STATE_TRANSITION');
      expect((await req('PATCH', `/v1/applications/${app.id}`, l.user, { expectedRowVersion: a.rowVersion, address: 'x' })).json().error.code).toBe('INVALID_STATE_TRANSITION');
      // A refused learner may apply again (the refused application stays as history).
      expect((await req('POST', '/v1/applications', l.user, { programmeId: l3.programme.id })).statusCode).toBe(201);
    });

    it('returned for information: the learner edits and resubmits; then it can be approved', async () => {
      const batch = await onlineBatch();
      const { l, app } = await submitted({ batchId: batch.id });
      const ret = await req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision: 'request_information', reason: 'Please correct the postcode', expectedRowVersion: app.rowVersion });
      expect(ret.json().application.status).toBe('information_requested');
      const ed = await req('PATCH', `/v1/applications/${app.id}`, l.user, { expectedRowVersion: ret.json().application.rowVersion, postcode: 'EX9 9ZZ' });
      expect(ed.statusCode, ed.body).toBe(200);
      const re = await req('POST', `/v1/applications/${app.id}/submit`, l.user, { expectedRowVersion: ed.json().application.rowVersion });
      expect(re.json().application.status).toBe('submitted');
      ctx.services.prerequisites = testPrerequisites();
      expect((await req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision: 'approve', expectedRowVersion: re.json().application.rowVersion })).json().application.status).toBe('approved');
    });

    it('withdrawal: by the learner (no reason needed) and by admissions staff (reason required)', async () => {
      const batch = await onlineBatch();
      const a = await submitted({ batchId: batch.id });
      const w = await req('POST', `/v1/applications/${a.app.id}/withdraw`, a.l.user, { expectedRowVersion: a.app.rowVersion });
      expect(w.json().application.status).toBe('withdrawn');
      const b = await submitted({ batchId: batch.id });
      expect((await req('POST', `/v1/applications/${b.app.id}/decision`, f.admin, { decision: 'withdraw', expectedRowVersion: b.app.rowVersion })).statusCode).toBe(400);
      const sw = await req('POST', `/v1/applications/${b.app.id}/decision`, f.admin, { decision: 'withdraw', reason: 'Learner asked by phone', expectedRowVersion: b.app.rowVersion });
      expect(sw.json().application.status).toBe('withdrawn');
      const d = await draft();
      expect((await req('POST', `/v1/applications/${d.app.id}/withdraw`, d.l.user, { expectedRowVersion: d.app.rowVersion })).json().application.status).toBe('withdrawn');
    });

    it('invalid transitions are refused by the API and by the database (never draft → enrolled)', async () => {
      const d = await draft();
      ctx.services.prerequisites = testPrerequisites();
      expect((await req('POST', `/v1/applications/${d.app.id}/decision`, f.admin, { decision: 'approve', expectedRowVersion: d.app.rowVersion })).json().error.code).toBe('INVALID_STATE_TRANSITION');
      expect((await req('POST', `/v1/applications/${d.app.id}/review`, f.admin, { expectedRowVersion: d.app.rowVersion })).json().error.code).toBe('INVALID_STATE_TRANSITION');
      expect((await req('PATCH', `/v1/applications/${d.app.id}`, d.l.user, { expectedRowVersion: d.app.rowVersion, status: 'enrolled' })).statusCode).toBe(400);
      await expect(ctx.owner.query(`UPDATE learner_application SET status = 'enrolled', enrolled_at = now() WHERE id = $1`, [d.app.id])).rejects.toMatchObject({ code: 'IL002' });
      await expect(ctx.owner.query(`UPDATE learner_application SET status = 'approved' WHERE id = $1`, [d.app.id])).rejects.toMatchObject({ code: 'IL002' });
      const batch = await onlineBatch();
      const { app } = await submitted({ batchId: batch.id });
      await ctx.owner.query(`UPDATE learner_application SET status = 'approved', decided_at = now(), decided_by = $2 WHERE id = $1`, [app.id, f.admin.id]);
      // approved → enrolled only with its confirmed enrolment row.
      await expect(ctx.owner.query(`UPDATE learner_application SET status = 'enrolled', enrolled_at = now() WHERE id = $1`, [app.id])).rejects.toMatchObject({ code: 'IL002' });
      // Submitted details and history are frozen.
      await expect(ctx.owner.query(`UPDATE learner_application SET address = 'changed' WHERE id = $1`, [app.id])).rejects.toMatchObject({ code: 'IL005' });
      await expect(ctx.owner.query(`UPDATE application_event SET reason = 'x' WHERE application_id = $1`, [app.id])).rejects.toMatchObject({ code: 'IL005' });
      await expect(ctx.owner.query(`DELETE FROM application_event WHERE application_id = $1`, [app.id])).rejects.toMatchObject({ code: 'IL005' });
    });

    it('stale requests and concurrent decisions: one decision wins, the other changes nothing', async () => {
      const batch = await onlineBatch();
      const { app } = await submitted({ batchId: batch.id });
      const other = await ctx.createUser({ roles: ['academic_admin'] });
      expect((await req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision: 'reject', reason: 'stale test', expectedRowVersion: app.rowVersion - 1 })).json().error.code).toBe('STALE_RESOURCE');
      ctx.services.prerequisites = testPrerequisites();
      const [x, y] = await Promise.all([
        req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision: 'approve', expectedRowVersion: app.rowVersion }),
        req('POST', `/v1/applications/${app.id}/decision`, other, { decision: 'reject', reason: 'Concurrent reviewer', expectedRowVersion: app.rowVersion }),
      ]);
      expect([x.statusCode, y.statusCode].sort()).toEqual([200, 409]);
      expect(await count(`SELECT count(*)::int AS n FROM application_event WHERE application_id = $1 AND action IN ('approved', 'rejected')`, [app.id])).toBe(1);
    });

    it('a repeated decision with the same Idempotency-Key is replayed, not applied twice', async () => {
      const batch = await onlineBatch();
      const { app } = await submitted({ batchId: batch.id });
      const k = `decide-${randomUUID()}`;
      const body = { decision: 'request_information', reason: 'Need ID', expectedRowVersion: app.rowVersion };
      const r1 = await req('POST', `/v1/applications/${app.id}/decision`, f.admin, body, k);
      const r2 = await req('POST', `/v1/applications/${app.id}/decision`, f.admin, body, k);
      expect(r2.headers['idempotent-replayed']).toBe('true');
      expect(r2.json()).toEqual(r1.json());
      expect(await count(`SELECT count(*)::int AS n FROM application_event WHERE application_id = $1 AND action = 'information_requested'`, [app.id])).toBe(1);
    });
  });

  describe('explicit batch choice (P3)', () => {
    it('lists every candidate with its reasons, earliest first; nothing is preselected', async () => {
      const early = await onlineBatch({ startDate: '2027-01-11' });
      const ae = await batchFor(ctx, f, l3, { startDate: '2027-01-12', location: 'AE' });
      const unset = await batchFor(ctx, f, l3, { startDate: '2027-01-13' });
      const d = await draft({ country: 'GB' });
      const r = await req('GET', `/v1/applications/${d.app.id}/eligible-batches`, d.l.user);
      expect(r.statusCode).toBe(200);
      expect(r.json().currentBatchId).toBeNull();
      const byId = new Map(r.json().batches.map((b: { batchId: string }) => [b.batchId, b]));
      expect(byId.get(early.id)).toMatchObject({ eligible: true, commencement: 'before_start_date', placesLeftAdvisory: true, deliveryMode: 'self_paced' });
      expect(byId.get(ae.id)).toMatchObject({ eligible: false, reasons: [{ code: 'REGION_MISMATCH' }] });
      expect(byId.get(unset.id)).toMatchObject({ eligible: false, reasons: [{ code: 'LOCATION_NOT_CONFIGURED' }] });
      const starts = r.json().batches.map((b: { startDate: string }) => b.startDate);
      expect(starts).toEqual([...starts].sort());
      // A learner in the batch's country may choose it (PD-P3-01).
      const ae2 = await draft({ country: 'AE' });
      expect((await choose(ae2.l.user, ae2.app, ae.id)).statusCode).toBe(200);
      expect((await choose(d.l.user, d.app, ae.id)).json().error).toMatchObject({ code: 'BATCH_NOT_ELIGIBLE' });
    });

    it('Level 3: the fee option decides the mode; the batch must accept it; Self-Paced and Fully Assisted share a mixed batch', async () => {
      const mixed = await onlineBatch();
      const faOnly = await onlineBatch({ acceptedFeeOptionIds: [fa()] });
      const spL = await draft({ feeOptionId: sp() });
      const faL = await draft({ feeOptionId: fa() });
      const noOpt = await draft({ feeOptionId: null });
      const r = await choose(spL.l.user, spL.app, faOnly.id);
      expect(r.statusCode).toBe(409);
      expect(r.json().error.details[0].message).toMatch(/^FEE_OPTION_NOT_ACCEPTED/);
      expect((await choose(noOpt.l.user, noOpt.app, mixed.id)).json().error.details[0].message).toMatch(/^FEE_OPTION_REQUIRED/);
      const a = await choose(spL.l.user, spL.app, mixed.id);
      const b = await choose(faL.l.user, faL.app, mixed.id);
      expect(a.json().application).toMatchObject({ batch: { id: mixed.id }, deliveryMode: 'self_paced' });
      expect(b.json().application).toMatchObject({ batch: { id: mixed.id }, deliveryMode: 'fully_assisted' });
      // Changing to an option the chosen batch doesn't take is refused (no silent change of batch).
      const sw = await choose(faL.l.user, b.json().application, faOnly.id);
      const ch = await req('PATCH', `/v1/applications/${faL.app.id}`, faL.l.user, { expectedRowVersion: sw.json().application.rowVersion, feeOptionId: sp() });
      expect(ch.json().error.code).toBe('BATCH_NOT_ELIGIBLE');
    });

    it('Level 2/4/5 single price: no fee option; the delivery mode comes from the batch', async () => {
      const l2 = await publishedProgramme(ctx, f, { level: 2 });
      const batch = await batchFor(ctx, f, l2, { location: 'online', deliveryMode: 'self_paced' });
      const l = await learnerWithProfile(ctx);
      const withOpt = await req('POST', '/v1/applications', l.user, { programmeId: l2.programme.id, feeOptionId: sp() });
      expect(withOpt.statusCode).toBe(400);
      const a = (await req('POST', '/v1/applications', l.user, { programmeId: l2.programme.id })).json().application;
      expect(a).toMatchObject({ feeOption: null, deliveryMode: null, programme: { pricingModel: 'single_price' } });
      const c = await choose(l.user, a, batch.id);
      expect(c.json().application).toMatchObject({ feeOption: null, deliveryMode: 'self_paced', batch: { id: batch.id } });
    });

    it('refuses a batch of another programme version, a full batch, a closed batch and a batch without a Coordinator', async () => {
      // Another version: a separate programme publishes v2 and runs a batch on it; the application stays on v1.
      const own = await publishedProgramme(ctx, f, { level: 3 });
      const v1App = await draft({ programmeId: own.programme.id, feeOptionId: own.version.feeOptions[0]!.id });
      const v2 = await withTransaction(ctx.pool, async (tx) => {
        const actor = { actor: { kind: 'user' as const, principal: f.adminPrincipal } };
        const draftV = await createNextDraftVersion(tx, actor, own.programme.id);
        return publishProgrammeVersion(tx, actor, { programmeId: own.programme.id, versionId: draftV.id, approval: { approvedByUserId: f.finance.id, reference: `FIN-${randomUUID()}` } });
      });
      const onV2 = await batchFor(ctx, f, { programme: own.programme, version: v2 }, { location: 'online', acceptedFeeOptionIds: v2.feeOptions.map((o) => o.id) });
      const vm = await choose(v1App.l.user, v1App.app, onV2.id);
      expect(vm.json().error.code).toBe('PROGRAMME_VERSION_MISMATCH');

      const d = await draft();

      const full = await onlineBatch({ capacity: 1 });
      await fill(full.id, 1);
      const fr = await choose(d.l.user, d.app, full.id);
      expect(fr.statusCode).toBe(409);
      expect(fr.json().error.code).toBe('BATCH_FULL');

      const closed = await onlineBatch({ status: 'planned' });
      await ctx.owner.query(`UPDATE batch SET status = 'cancelled' WHERE id = $1`, [closed.id]);
      expect((await choose(d.l.user, d.app, closed.id)).json().error.details.map((x: { message: string }) => x.message.split(':')[0])).toContain('BATCH_STATUS');

      const coord = await ctx.createUser({ roles: ['academic_coordinator'] });
      const nocoord = await onlineBatch({ coordinatorUserIds: [coord.id] });
      await ctx.owner.query(`UPDATE app_user SET status = 'suspended', status_reason = 'test' WHERE id = $1`, [coord.id]);
      expect((await choose(d.l.user, d.app, nocoord.id)).json().error.details[0].message).toMatch(/^NO_COORDINATOR/);

      // Nothing was chosen by any refused attempt.
      expect((await req('GET', `/v1/applications/${d.app.id}`, d.l.user)).json().application.batch).toBeNull();
    });

    it('commencement: a started batch is refused; on its start date the choice is saved but labelled unresolved (U-05)', async () => {
      const started = await onlineBatch({ startDate: '2026-01-05' });
      const d = await draft();
      expect((await choose(d.l.user, d.app, started.id)).json().error.details[0].message).toMatch(/^BATCH_STARTED/);
      // A zone where it is currently mid-day, so "today" cannot roll over during the test.
      const zones = ['Europe/London', 'Asia/Tokyo', 'America/New_York', 'Asia/Kolkata', 'Pacific/Auckland', 'America/Los_Angeles', 'Asia/Dubai'];
      const pick = await ctx.owner.query<{ tz: string; d: string }>(
        `SELECT tz, to_char((now() AT TIME ZONE tz)::date, 'YYYY-MM-DD') AS d FROM unnest($1::text[]) tz
          WHERE extract(hour FROM now() AT TIME ZONE tz) BETWEEN 2 AND 21 LIMIT 1`,
        [zones],
      );
      const today = await onlineBatch({ startDate: pick.rows[0]!.d, timeZone: pick.rows[0]!.tz });
      const c = await choose(d.l.user, d.app, today.id);
      expect(c.statusCode, c.body).toBe(200);
      expect(c.json().eligibility).toMatchObject({ eligible: true, commencement: 'unresolved' });
      expect(c.json().eligibility.commencementBasis).toMatch(/U-05/);
    });

    it('never reassigns: a chosen batch that fills keeps the choice; the learner re-chooses explicitly (PD-P3-05)', async () => {
      const b1 = await onlineBatch({ capacity: 2 });
      const b2 = await onlineBatch();
      const d = await draft();
      const c = await choose(d.l.user, d.app, b1.id);
      await fill(b1.id, 2);
      const s = await req('POST', `/v1/applications/${d.app.id}/submit`, d.l.user, { expectedRowVersion: c.json().application.rowVersion });
      expect(s.json().error.code).toBe('BATCH_FULL');
      const still = (await req('GET', `/v1/applications/${d.app.id}`, d.l.user)).json().application;
      expect(still).toMatchObject({ status: 'draft', batch: { id: b1.id } });

      // After submission: re-choice only when the chosen batch can no longer take the learner.
      const sub = await submitted({ batchId: b2.id });
      const b3 = await onlineBatch();
      expect((await choose(sub.l.user, sub.app, b3.id)).json().error.code).toBe('INVALID_STATE_TRANSITION');
      await fill(b2.id, 10 - 0);
      const re = await choose(sub.l.user, sub.app, b3.id);
      expect(re.statusCode, re.body).toBe(200);
      expect(re.json().application).toMatchObject({ status: 'submitted', batch: { id: b3.id } });
      const ev = (await req('GET', `/v1/applications/${sub.app.id}/history`, sub.l.user)).json().events.at(-1);
      expect(ev).toMatchObject({ action: 'batch_selected', data: { how: 'rechosen_after_ineligible', previousBatchId: b2.id } });
      // The system never wrote a batch change: every batch event is the learner's own.
      expect(await count(`SELECT count(*)::int AS n FROM application_event WHERE action IN ('batch_selected', 'batch_cleared') AND actor_user_id IS DISTINCT FROM learner_user_id`)).toBe(0);
    });
  });

  describe('authorization', () => {
    it('every Stage 2B endpoint needs authentication', async () => {
      const id = randomUUID();
      const routes: Array<[Method, string]> = [
        ['GET', '/v1/learner/profile'], ['POST', '/v1/learner/profile'], ['GET', '/v1/learner/applications'], ['GET', '/v1/learner/enrolments'],
        ['POST', '/v1/applications'], ['GET', '/v1/applications'], ['GET', `/v1/applications/${id}`], ['PATCH', `/v1/applications/${id}`],
        ['PUT', `/v1/applications/${id}/batch`], ['POST', `/v1/applications/${id}/submit`], ['POST', `/v1/applications/${id}/withdraw`],
        ['POST', `/v1/applications/${id}/review`], ['POST', `/v1/applications/${id}/decision`], ['GET', `/v1/applications/${id}/history`],
        ['GET', `/v1/applications/${id}/eligible-batches`], ['GET', `/v1/applications/${id}/enrolment`], ['GET', `/v1/enrolments/${id}`],
      ];
      for (const [m, u] of routes) expect((await req(m, u, null, m === 'GET' ? undefined : {})).statusCode, `${m} ${u}`).toBe(401);
    });

    it('cross-learner access is refused; a learner lists only their own applications', async () => {
      const batch = await onlineBatch();
      const a = await submitted({ batchId: batch.id });
      const b = await draft();
      for (const [m, u, body] of [
        ['GET', `/v1/applications/${a.app.id}`, undefined],
        ['GET', `/v1/applications/${a.app.id}/history`, undefined],
        ['GET', `/v1/applications/${a.app.id}/eligible-batches`, undefined],
        ['PATCH', `/v1/applications/${a.app.id}`, { expectedRowVersion: a.app.rowVersion, address: 'x' }],
        ['PUT', `/v1/applications/${a.app.id}/batch`, { expectedRowVersion: a.app.rowVersion, batchId: batch.id }],
        ['POST', `/v1/applications/${a.app.id}/withdraw`, { expectedRowVersion: a.app.rowVersion }],
      ] as Array<[Method, string, unknown]>) {
        expect((await req(m, u, b.l.user, body)).statusCode, `${m} ${u}`).toBe(403);
      }
      const mine = (await req('GET', '/v1/learner/applications', b.l.user)).json().applications;
      expect(mine.map((x: { id: string }) => x.id)).toEqual([b.app.id]);
      expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE outcome = 'refused' AND actor_user_id = $1`, [b.l.user.id])).toBeGreaterThanOrEqual(6);
    });

    it('wrong staff roles (Finance, Business Admin, Coordinator of the batch, Teacher, agency) see and decide nothing', async () => {
      const batch = await onlineBatch();
      const { app } = await submitted({ batchId: batch.id });
      const agencyId = await ctx.createAgency();
      const people = [
        await ctx.createUser({ roles: ['finance_admin'] }),
        await ctx.createUser({ roles: ['business_admin'] }),
        f.coordinator, // a Coordinator of this very batch (PD-MC-11: admissions stay out of the Coordinator portal)
        await ctx.createUser({ roles: ['teacher'], scopes: [{ role: 'teacher', kind: 'batch', id: batch.id }] }),
        await ctx.createUser({ agency: { id: agencyId, role: 'agency_admin' } }),
      ];
      for (const p of people) {
        expect((await req('GET', `/v1/applications/${app.id}`, p)).statusCode).toBe(403);
        expect((await req('GET', '/v1/applications', p)).statusCode).toBe(403);
        expect((await req('POST', `/v1/applications/${app.id}/decision`, p, { decision: 'reject', reason: 'not mine', expectedRowVersion: app.rowVersion })).statusCode).toBe(403);
        expect((await req('POST', `/v1/applications/${app.id}/review`, p, { expectedRowVersion: app.rowVersion })).statusCode).toBe(403);
      }
      expect((await req('GET', '/v1/applications', f.admin)).statusCode).toBe(200);
    });

    it('admissions staff act only as reviewers: no learner-only action on someone else’s application', async () => {
      const batch = await onlineBatch();
      const d = await draft();
      const sys = await ctx.createUser({ roles: ['system_admin'] });
      const sup = await ctx.createUser({ roles: ['super_admin'] });
      for (const staff of [f.admin, sys, sup]) {
        expect((await req('GET', `/v1/applications/${d.app.id}`, staff)).statusCode).toBe(200);
        expect((await req('PUT', `/v1/applications/${d.app.id}/batch`, staff, { expectedRowVersion: d.app.rowVersion, batchId: batch.id })).statusCode).toBe(403);
        expect((await req('POST', `/v1/applications/${d.app.id}/submit`, staff, { expectedRowVersion: d.app.rowVersion })).statusCode).toBe(403);
        expect((await req('PATCH', `/v1/applications/${d.app.id}`, staff, { expectedRowVersion: d.app.rowVersion, address: 'x' })).statusCode).toBe(403);
        expect((await req('GET', '/v1/learner/profile', staff)).statusCode).toBe(403);
      }
    });

    it('no self-approval: an admissions officer who is also a learner cannot decide their own application (API, service, database)', async () => {
      const dual = await ctx.createUser({ roles: ['academic_admin', 'learner'] });
      await req('POST', '/v1/learner/profile', dual, { countryCode: 'GB' });
      const batch = await onlineBatch();
      const a = (await req('POST', '/v1/applications', dual, { programmeId: l3.programme.id, feeOptionId: sp() })).json().application;
      const u = (await req('PATCH', `/v1/applications/${a.id}`, dual, { expectedRowVersion: a.rowVersion, dateOfBirth: '1980-01-01', address: 'Dual Street' })).json().application;
      const c = (await choose(dual, u, batch.id)).json().application;
      const s = (await req('POST', `/v1/applications/${a.id}/submit`, dual, { expectedRowVersion: c.rowVersion })).json().application;
      ctx.services.prerequisites = testPrerequisites();
      const own = await req('POST', `/v1/applications/${a.id}/decision`, dual, { decision: 'approve', expectedRowVersion: s.rowVersion });
      expect(own.statusCode).toBe(403);
      expect(await count(`SELECT count(*)::int AS n FROM audit_event WHERE outcome = 'refused' AND actor_user_id = $1 AND reason LIKE '%own account%'`, [dual.id])).toBe(1);
      const principal = await principalOf(ctx, dual);
      await expect(withTransaction(ctx.pool, (tx) => decideApplication(tx, { actor: { kind: 'user', principal } }, a.id, { decision: 'approve', expectedRowVersion: s.rowVersion }, testPrerequisites().documents)))
        .rejects.toMatchObject({ code: 'FORBIDDEN' });
      await expect(ctx.owner.query(`UPDATE learner_application SET status = 'approved', decided_at = now(), decided_by = $2 WHERE id = $1`, [a.id, dual.id]))
        .rejects.toMatchObject({ code: '23514' });
      // Another admissions officer may decide it.
      expect((await req('POST', `/v1/applications/${a.id}/decision`, f.admin, { decision: 'approve', expectedRowVersion: s.rowVersion })).statusCode).toBe(200);
    });

    it('no confirmation endpoint exists; no API write can set an enrolment, a seat, a payment or a signature', async () => {
      const writes = ctx.app.routeInventory.filter((r) => !['GET', 'HEAD', 'OPTIONS'].includes(r.method));
      expect(writes.filter((r) => /confirm|enrol|seat|payment|agreement|signature/i.test(r.url))).toEqual([]);
      const batch = await onlineBatch();
      const { l, app } = await submitted({ batchId: batch.id });
      for (const u of [`/v1/applications/${app.id}/confirm`, `/v1/applications/${app.id}/enrolment`, '/v1/enrolments']) {
        expect((await req('POST', u, f.admin, {})).statusCode, u).toBe(404);
      }
      expect((await req('POST', `/v1/applications/${app.id}/decision`, f.admin, { decision: 'enrol', expectedRowVersion: app.rowVersion })).statusCode).toBe(400);
      expect((await req('POST', `/v1/applications/${app.id}/submit`, l.user, { expectedRowVersion: app.rowVersion, paid: true, signed: true })).statusCode).toBe(400);
    });
  });
});

describe('cookie sessions: CSRF on Stage 2B writes', () => {
  let ctx: TestContext;
  beforeAll(async () => {
    ctx = await createTestContext((issuer) => sessionEnv(issuer));
  });
  afterAll(async () => ctx?.close());

  it('a cookie-authenticated write without the CSRF token is refused; with it, it succeeds', async () => {
    const u = await ctx.createUser({ roles: ['learner'] });
    const s = await login(ctx, u);
    const { 'x-csrf-token': _t, ...noCsrf } = writeHeaders(s);
    const bad = await ctx.app.inject({ method: 'POST', url: '/v1/learner/profile', headers: { ...noCsrf, 'idempotency-key': `csrf-${randomUUID()}` }, payload: { countryCode: 'GB' } });
    expect(bad.statusCode).toBe(403);
    expect(bad.json().error.code).toBe('CSRF_FAILED');
    const ok = await ctx.app.inject({ method: 'POST', url: '/v1/learner/profile', headers: { ...writeHeaders(s), 'idempotency-key': `csrf-${randomUUID()}` }, payload: { countryCode: 'GB' } });
    expect(ok.statusCode, ok.body).toBe(201);
  });
});
