import type { PoolClient, Queryable } from '../../database/pool.js';
import { pgCode, pgConstraint } from '../../shared/db-errors.js';
import { type ErrorDetail, errors } from '../../shared/errors.js';
import { type AuditActor, type AuditRequestContext, appendAudit } from '../audit/audit.js';
import type { AdmissionDocumentsPort, CommencementPolicy } from '../enrolments/prerequisites.js';
import {
  type ApplicantFacts,
  type BatchEligibility,
  evaluateWithPolicy,
  type Ineligibility,
  loadBatchFacts,
  loadCandidateBatches,
} from './eligibility.js';

/**
 * Learner applications (Stage 2B; ADR 0013).
 *
 * Lock order (docs/production-transaction-rules.md §1, §6): programme configuration (FOR SHARE, creation only) → the
 * application (L6, FOR UPDATE). Nothing here locks a batch: a batch is chosen against an advisory reading, and the
 * confirmation boundary re-checks it under the batch lock (L7). Every rule here is also enforced by migration 0008.
 *
 * Ownership is server-authoritative: the learner is always the authenticated principal; an application id from the
 * request is resolved to its stored owner, and the owner is re-checked here under the row lock.
 */

export interface ActorContext {
  actor: AuditActor;
  request?: AuditRequestContext;
}

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'under_review'
  | 'information_requested'
  | 'approved'
  | 'rejected'
  | 'withdrawn'
  | 'enrolled';

const OPEN_FOR_DECISION: ApplicationStatus[] = ['submitted', 'under_review', 'information_requested'];
const LEARNER_EDITABLE: ApplicationStatus[] = ['draft', 'information_requested'];
const LEARNER_WITHDRAWABLE: ApplicationStatus[] = ['draft', 'submitted', 'under_review', 'information_requested'];
/** PD-P3-05: after submission the learner re-chooses only when the chosen batch can no longer take them. */
const RECHOOSE_ONLY: ApplicationStatus[] = ['submitted', 'under_review', 'approved'];

export interface ApplicationView {
  id: string;
  status: ApplicationStatus;
  learner: { userId: string; displayName: string; countryCode: string };
  programme: { id: string; code: string; title: string; status: string; versionId: string; pricingModel: 'fee_options' | 'single_price' };
  termsVersion: { id: string; code: string };
  feeOption: { id: string; code: string; label: string; deliveryMode: string; status: string; priceMinor: number; currency: string } | null;
  deliveryMode: string | null;
  batch: { id: string; code: string; startDate: string; timeZone: string; location: string | null; selectedAt: string } | null;
  details: { dateOfBirth: string | null; address: string | null; postcode: string | null };
  submittedAt: string | null;
  decidedAt: string | null;
  decidedBy: string | null;
  enrolledAt: string | null;
  createdAt: string;
  updatedAt: string;
  rowVersion: number;
}

interface Row {
  id: string;
  status: ApplicationStatus;
  learner_user_id: string;
  display_name: string;
  country_code: string;
  programme_id: string;
  programme_code: string;
  programme_title: string;
  programme_status: string;
  programme_version_id: string;
  pricing_model: 'fee_options' | 'single_price';
  terms_version_id: string;
  terms_code: string;
  fee_option_id: string | null;
  fo_code: string | null;
  fo_label: string | null;
  fo_mode: string | null;
  fo_status: string | null;
  fo_price: string | null;
  fo_currency: string | null;
  delivery_mode: string | null;
  batch_id: string | null;
  batch_code: string | null;
  batch_start: string | null;
  batch_tz: string | null;
  batch_location: string | null;
  batch_selected_at: Date | null;
  dob: string | null;
  address: string | null;
  postcode: string | null;
  submitted_at: Date | null;
  decided_at: Date | null;
  decided_by: string | null;
  enrolled_at: Date | null;
  created_at: Date;
  updated_at: Date;
  row_version: number;
}

const SELECT = `
  SELECT a.id, a.status, a.learner_user_id, u.display_name, lp.country_code, a.programme_id, p.code AS programme_code,
         p.title AS programme_title, p.status AS programme_status, a.programme_version_id, v.pricing_model,
         a.terms_version_id, t.code AS terms_code, a.fee_option_id, fo.code AS fo_code, fo.label AS fo_label,
         fo.delivery_mode AS fo_mode, fo.status AS fo_status, pv.price_minor::text AS fo_price, pv.currency AS fo_currency,
         a.delivery_mode, a.batch_id, b.code AS batch_code, to_char(b.start_date, 'YYYY-MM-DD') AS batch_start,
         b.time_zone AS batch_tz, b.location AS batch_location, a.batch_selected_at,
         to_char(a.date_of_birth, 'YYYY-MM-DD') AS dob, a.address, a.postcode, a.submitted_at, a.decided_at, a.decided_by,
         a.enrolled_at, a.created_at, a.updated_at, a.row_version
    FROM learner_application a
    JOIN app_user u ON u.id = a.learner_user_id
    JOIN learner_profile lp ON lp.user_id = a.learner_user_id
    JOIN programme p ON p.id = a.programme_id
    JOIN programme_version v ON v.id = a.programme_version_id
    JOIN terms_version t ON t.id = a.terms_version_id
    LEFT JOIN fee_option fo ON fo.id = a.fee_option_id
    LEFT JOIN programme_version_fee_option pv ON pv.programme_version_id = a.programme_version_id AND pv.fee_option_id = a.fee_option_id
    LEFT JOIN batch b ON b.id = a.batch_id`;

const iso = (d: Date | null) => (d ? d.toISOString() : null);

function toView(r: Row): ApplicationView {
  return {
    id: r.id,
    status: r.status,
    learner: { userId: r.learner_user_id, displayName: r.display_name, countryCode: r.country_code },
    programme: {
      id: r.programme_id,
      code: r.programme_code,
      title: r.programme_title,
      status: r.programme_status,
      versionId: r.programme_version_id,
      pricingModel: r.pricing_model,
    },
    termsVersion: { id: r.terms_version_id, code: r.terms_code },
    feeOption: r.fee_option_id
      ? {
          id: r.fee_option_id,
          code: r.fo_code!,
          label: r.fo_label!,
          deliveryMode: r.fo_mode!,
          status: r.fo_status!,
          priceMinor: Number(r.fo_price),
          currency: r.fo_currency!,
        }
      : null,
    deliveryMode: r.delivery_mode,
    batch: r.batch_id
      ? {
          id: r.batch_id,
          code: r.batch_code!,
          startDate: r.batch_start!,
          timeZone: r.batch_tz!,
          location: r.batch_location,
          selectedAt: r.batch_selected_at!.toISOString(),
        }
      : null,
    details: { dateOfBirth: r.dob, address: r.address, postcode: r.postcode },
    submittedAt: iso(r.submitted_at),
    decidedAt: iso(r.decided_at),
    decidedBy: r.decided_by,
    enrolledAt: iso(r.enrolled_at),
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
    rowVersion: r.row_version,
  };
}

export async function getApplication(db: Queryable, id: string): Promise<ApplicationView | null> {
  const r = await db.query<Row>(`${SELECT} WHERE a.id = $1`, [id]);
  return r.rows[0] ? toView(r.rows[0]) : null;
}

/** Locks the application row only (L6). */
async function lockApplication(tx: PoolClient, id: string): Promise<Row> {
  const r = await tx.query<Row>(`${SELECT} WHERE a.id = $1 FOR UPDATE OF a`, [id]);
  if (!r.rows[0]) throw errors.notFound('Application not found.');
  return r.rows[0];
}

// ── Errors ───────────────────────────────────────────────────────────────────────────────────────────────────────────

const stale = () => errors.domain(409, 'STALE_RESOURCE', 'The application changed since it was read. Reload and try again.');
const badState = (m: string) => errors.domain(409, 'INVALID_STATE_TRANSITION', m);
const userIdOf = (a: AuditActor) => (a.kind === 'user' ? a.principal.userId : null);

/** One API error for a list of eligibility reasons (stable codes: the most specific one leads, every reason is listed). */
export function eligibilityError(reasons: Ineligibility[]) {
  const details: ErrorDetail[] = reasons.map((x) => ({ path: 'batchId', message: `${x.code}: ${x.message}` }));
  const codes = reasons.map((x) => x.code);
  if (codes.includes('PROGRAMME_VERSION_MISMATCH')) {
    return errors.domain(409, 'PROGRAMME_VERSION_MISMATCH', 'The batch runs another programme version.', details);
  }
  if (codes.length === 1 && codes[0] === 'BATCH_FULL') return errors.domain(409, 'BATCH_FULL', 'The batch has no place left.', details);
  return errors.domain(409, 'BATCH_NOT_ELIGIBLE', 'This batch cannot take this application.', details);
}

function requireOwner(row: Row, ctx: ActorContext): void {
  if (userIdOf(ctx.actor) !== row.learner_user_id) throw errors.forbidden();
}
function requireNotOwner(row: Row, ctx: ActorContext): void {
  const id = userIdOf(ctx.actor);
  if (!id || id === row.learner_user_id) throw errors.forbidden('You cannot decide your own application.');
}
function requireVersion(row: Row, expected: number): void {
  if (row.row_version !== expected) throw stale();
}

// ── History ──────────────────────────────────────────────────────────────────────────────────────────────────────────

type Action =
  | 'created'
  | 'details_updated'
  | 'batch_selected'
  | 'batch_cleared'
  | 'submitted'
  | 'withdrawn_by_learner'
  | 'review_started'
  | 'information_requested'
  | 'approved'
  | 'rejected'
  | 'withdrawn_by_staff'
  | 'enrolled';

export interface RecordInput {
  applicationId: string;
  learnerUserId: string;
  action: Action;
  from: ApplicationStatus | null;
  to: ApplicationStatus;
  reason?: string | null;
  /** Non-personal facts only. */
  data?: Record<string, unknown>;
  auditOperation: string;
  /** Audit-only extra facts (never personal data). */
  after?: Record<string, unknown>;
}

/** Appends the audit event and the application's history row in the caller's transaction. */
export async function recordApplicationEvent(tx: Queryable, ctx: ActorContext, e: RecordInput): Promise<string> {
  const reason = e.reason?.trim() || null;
  const audit = await appendAudit(tx, {
    actor: ctx.actor,
    operation: e.auditOperation,
    entity: { type: 'learner_application', id: e.applicationId },
    before: e.from ? { status: e.from } : undefined,
    after: { status: e.to, ...(e.data ?? {}), ...(e.after ?? {}) },
    reason,
    reasonRequired: ['information_requested', 'rejected', 'withdrawn_by_staff'].includes(e.action),
    metadata: { learnerUserId: e.learnerUserId },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  await tx.query(
    `INSERT INTO application_event (application_id, learner_user_id, action, from_status, to_status, actor_user_id, reason, data, audit_event_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [e.applicationId, e.learnerUserId, e.action, e.from, e.to, userIdOf(ctx.actor), reason, JSON.stringify(e.data ?? {}), audit.id],
  );
  return audit.id;
}

export interface ApplicationEventView {
  seq: string;
  action: Action;
  fromStatus: string | null;
  toStatus: string;
  actorUserId: string | null;
  reason: string | null;
  data: unknown;
  occurredAt: string;
}

export async function applicationHistory(db: Queryable, id: string): Promise<ApplicationEventView[]> {
  const r = await db.query<{
    seq: string;
    action: Action;
    from_status: string | null;
    to_status: string;
    actor_user_id: string | null;
    reason: string | null;
    data: unknown;
    occurred_at: Date;
  }>(
    `SELECT seq::text, action, from_status, to_status, actor_user_id, reason, data, occurred_at
       FROM application_event WHERE application_id = $1 ORDER BY seq`,
    [id],
  );
  return r.rows.map((x) => ({
    seq: x.seq,
    action: x.action,
    fromStatus: x.from_status,
    toStatus: x.to_status,
    actorUserId: x.actor_user_id,
    reason: x.reason,
    data: x.data,
    occurredAt: x.occurred_at.toISOString(),
  }));
}

// ── Create ───────────────────────────────────────────────────────────────────────────────────────────────────────────

async function checkFeeOption(db: Queryable, versionId: string, pricingModel: string, feeOptionId: string): Promise<void> {
  if (pricingModel !== 'fee_options') {
    throw errors.validation([{ path: 'feeOptionId', message: 'this programme has a single price and no fee options' }]);
  }
  const r = await db.query<{ status: string }>(
    `SELECT o.status FROM programme_version_fee_option f JOIN fee_option o ON o.id = f.fee_option_id
      WHERE f.programme_version_id = $1 AND f.fee_option_id = $2`,
    [versionId, feeOptionId],
  );
  if (!r.rows[0]) throw errors.domain(409, 'PROGRAMME_VERSION_MISMATCH', 'The fee option is not part of this programme version.');
  if (r.rows[0].status !== 'active') throw errors.domain(409, 'BATCH_NOT_ELIGIBLE', 'This fee option has been retired.');
}

export async function createApplication(
  tx: PoolClient,
  ctx: ActorContext,
  input: { programmeId: string; feeOptionId?: string | undefined },
): Promise<ApplicationView> {
  const learnerUserId = userIdOf(ctx.actor);
  if (!learnerUserId) throw new Error('an application is created by its learner');
  const profile = await tx.query(`SELECT 1 FROM learner_profile WHERE user_id = $1`, [learnerUserId]);
  if (!profile.rowCount) {
    throw errors.domain(409, 'LEARNER_PROFILE_REQUIRED', 'Create your learner profile (country of residence) before applying.');
  }
  const active = await tx.query(`SELECT 1 FROM enrolment WHERE learner_user_id = $1 AND state = 'confirmed'`, [learnerUserId]);
  if (active.rowCount) {
    // PD-E-15: no second active enrolment; an application could never be confirmed.
    throw errors.domain(409, 'APPLICATION_ALREADY_OPEN', 'You already have an active enrolment.');
  }
  // Configuration before L6 (§5 rule 1): the programme and its published version, read-locked.
  const p = await tx.query<{ status: string }>(`SELECT status FROM programme WHERE id = $1 FOR SHARE`, [input.programmeId]);
  if (!p.rows[0]) throw errors.notFound('Programme not found.');
  if (p.rows[0].status !== 'active') throw errors.domain(409, 'BATCH_NOT_ELIGIBLE', `The programme is ${p.rows[0].status} and takes no applications.`);
  const v = await tx.query<{ id: string; pricing_model: string }>(
    `SELECT id, pricing_model FROM programme_version WHERE programme_id = $1 AND status = 'published' FOR SHARE`,
    [input.programmeId],
  );
  const version = v.rows[0];
  if (!version) throw errors.domain(409, 'PROGRAMME_VERSION_MISMATCH', 'The programme has no published version.');
  if (input.feeOptionId) await checkFeeOption(tx, version.id, version.pricing_model, input.feeOptionId);
  const t = await tx.query<{ id: string; code: string }>(`SELECT id, code FROM terms_version WHERE status = 'in_force'`);
  if (!t.rows[0]) throw new Error('no terms version is in force');

  let id: string;
  try {
    const r = await tx.query<{ id: string }>(
      `INSERT INTO learner_application (learner_user_id, programme_id, programme_version_id, terms_version_id, fee_option_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING id`,
      [learnerUserId, input.programmeId, version.id, t.rows[0].id, input.feeOptionId ?? null],
    );
    id = r.rows[0]!.id;
  } catch (err) {
    if (pgCode(err) === '23505' && pgConstraint(err) === 'la_one_open_per_learner_uq') {
      throw errors.domain(409, 'APPLICATION_ALREADY_OPEN', 'You already have an open application (one at a time, PD-NB1-02).');
    }
    throw err;
  }
  await recordApplicationEvent(tx, ctx, {
    applicationId: id,
    learnerUserId,
    action: 'created',
    from: null,
    to: 'draft',
    data: { programmeId: input.programmeId, programmeVersionId: version.id, termsVersion: t.rows[0].code, feeOptionId: input.feeOptionId ?? null },
    auditOperation: 'application.created',
  });
  return (await getApplication(tx, id))!;
}

// ── Learner edits ────────────────────────────────────────────────────────────────────────────────────────────────────

export interface UpdateDetailsInput {
  expectedRowVersion: number;
  feeOptionId?: string | undefined;
  dateOfBirth?: string | undefined;
  address?: string | undefined;
  postcode?: string | null | undefined;
}

export async function updateApplicationDetails(
  tx: PoolClient,
  ctx: ActorContext,
  id: string,
  input: UpdateDetailsInput,
): Promise<ApplicationView> {
  const a = await lockApplication(tx, id);
  requireOwner(a, ctx);
  requireVersion(a, input.expectedRowVersion);
  if (!LEARNER_EDITABLE.includes(a.status)) {
    throw badState(`Details change only in a draft or a returned application (this one is ${a.status}).`);
  }
  const changed: string[] = [];
  if (input.feeOptionId !== undefined && input.feeOptionId !== a.fee_option_id) {
    await checkFeeOption(tx, a.programme_version_id, a.pricing_model, input.feeOptionId);
    if (a.batch_id) {
      const accepts = await tx.query(
        `SELECT 1 FROM batch_fee_option WHERE batch_id = $1 AND fee_option_id = $2 AND removed_at IS NULL`,
        [a.batch_id, input.feeOptionId],
      );
      if (!accepts.rowCount) {
        // Never silently drop or replace the learner's batch choice: they choose again first.
        throw errors.domain(409, 'BATCH_NOT_ELIGIBLE', 'Your chosen batch does not take this fee option. Choose a batch that does, or clear your batch choice first.');
      }
    }
    changed.push('feeOptionId');
  }
  if (input.dateOfBirth !== undefined) {
    const ok = await tx.query<{ ok: boolean }>(`SELECT $1::date <= current_date AS ok`, [input.dateOfBirth]);
    if (!ok.rows[0]!.ok) throw errors.validation([{ path: 'dateOfBirth', message: 'cannot be in the future' }]);
    if (input.dateOfBirth !== a.dob) changed.push('dateOfBirth');
  }
  if (input.address !== undefined && input.address !== a.address) changed.push('address');
  if (input.postcode !== undefined && input.postcode !== a.postcode) changed.push('postcode');
  if (!changed.length) throw errors.validation([{ message: 'nothing to change' }]);

  await tx.query(
    `UPDATE learner_application
        SET fee_option_id = $2, date_of_birth = $3::date, address = $4, postcode = $5
      WHERE id = $1`,
    [
      a.id,
      input.feeOptionId !== undefined ? input.feeOptionId : a.fee_option_id,
      input.dateOfBirth !== undefined ? input.dateOfBirth : a.dob,
      input.address !== undefined ? input.address : a.address,
      input.postcode !== undefined ? input.postcode : a.postcode,
    ],
  );
  // Personal data stays out of the audit and history: only the NAMES of changed fields are recorded.
  await recordApplicationEvent(tx, ctx, {
    applicationId: a.id,
    learnerUserId: a.learner_user_id,
    action: 'details_updated',
    from: a.status,
    to: a.status,
    data: { changedFields: changed, ...(changed.includes('feeOptionId') ? { feeOptionId: input.feeOptionId } : {}) },
    auditOperation: 'application.details_updated',
  });
  return (await getApplication(tx, a.id))!;
}

async function applicantFacts(db: Queryable, a: Row): Promise<ApplicantFacts> {
  return {
    programmeId: a.programme_id,
    programmeVersionId: a.programme_version_id,
    programmeStatus: a.programme_status,
    pricingModel: a.pricing_model,
    feeOptionId: a.fee_option_id,
    feeOptionActive: a.fee_option_id ? a.fo_status === 'active' : false,
    feeOptionMode: a.fo_mode,
    learnerCountry: a.country_code,
  };
}

/** The learner's batch list (P3): every candidate with its reasons, earliest first. Nothing is preselected. */
export async function eligibleBatches(db: Queryable, policy: CommencementPolicy, id: string): Promise<{ application: ApplicationView; batches: BatchEligibility[] }> {
  const r = await db.query<Row>(`${SELECT} WHERE a.id = $1`, [id]);
  const a = r.rows[0];
  if (!a) throw errors.notFound('Application not found.');
  const facts = await applicantFacts(db, a);
  const candidates = await loadCandidateBatches(db, a.programme_id);
  const batches: BatchEligibility[] = [];
  for (const b of candidates) batches.push(await evaluateWithPolicy(db, policy, facts, b, { checkRegion: true, checkCapacity: true }));
  return { application: toView(a), batches };
}

/**
 * Explicit batch choice. Draft / returned: the learner chooses, changes or clears freely among eligible batches.
 * Submitted, under review or approved: a new choice only when the chosen batch can no longer take them (PD-P3-05),
 * never by the system, and the delivery mode stays frozen (database). A refused choice changes nothing.
 */
export async function selectBatch(
  tx: PoolClient,
  ctx: ActorContext,
  id: string,
  input: { expectedRowVersion: number; batchId: string | null },
  policy: CommencementPolicy,
): Promise<{ application: ApplicationView; eligibility: BatchEligibility | null }> {
  const a = await lockApplication(tx, id);
  requireOwner(a, ctx);
  requireVersion(a, input.expectedRowVersion);
  const facts = await applicantFacts(tx, a);

  if (!LEARNER_EDITABLE.includes(a.status)) {
    if (!RECHOOSE_ONLY.includes(a.status)) throw badState(`The batch choice of a ${a.status} application does not change.`);
    if (input.batchId === null) throw badState('A submitted application keeps a batch choice; choose another batch instead.');
    const current = a.batch_id ? await loadBatchFacts(tx, a.batch_id) : null;
    const now = current ? await evaluateWithPolicy(tx, policy, facts, current, { checkRegion: false, checkCapacity: true }) : null;
    if (now && now.eligible) {
      throw badState('Your chosen batch can still take you. After submission the batch changes only when it no longer can (PD-P3-05).');
    }
  }

  if (input.batchId === null) {
    if (!a.batch_id) throw errors.validation([{ path: 'batchId', message: 'no batch is chosen' }]);
    await tx.query(`UPDATE learner_application SET batch_id = NULL, batch_selected_at = NULL WHERE id = $1`, [a.id]);
    await recordApplicationEvent(tx, ctx, {
      applicationId: a.id,
      learnerUserId: a.learner_user_id,
      action: 'batch_cleared',
      from: a.status,
      to: a.status,
      data: { previousBatchId: a.batch_id, previousBatchCode: a.batch_code },
      auditOperation: 'application.batch_cleared',
    });
    return { application: (await getApplication(tx, a.id))!, eligibility: null };
  }

  if (input.batchId === a.batch_id) throw errors.validation([{ path: 'batchId', message: 'this batch is already your choice' }]);
  const b = await loadBatchFacts(tx, input.batchId);
  if (!b || b.programmeId !== a.programme_id) throw errors.domain(404, 'NOT_FOUND', 'Batch not found for this programme.');
  const elig = await evaluateWithPolicy(tx, policy, facts, b, { checkRegion: true, checkCapacity: true });
  if (!elig.eligible) throw eligibilityError(elig.reasons);

  await tx.query(`UPDATE learner_application SET batch_id = $2, batch_selected_at = now() WHERE id = $1`, [a.id, b.id]);
  await recordApplicationEvent(tx, ctx, {
    applicationId: a.id,
    learnerUserId: a.learner_user_id,
    action: 'batch_selected',
    from: a.status,
    to: a.status,
    data: {
      batchId: b.id,
      batchCode: b.code,
      previousBatchId: a.batch_id,
      commencement: elig.commencement,
      placesLeftAtChoice: elig.placesLeft,
      how: LEARNER_EDITABLE.includes(a.status) ? 'chosen' : 'rechosen_after_ineligible',
    },
    auditOperation: 'application.batch_selected',
  });
  return { application: (await getApplication(tx, a.id))!, eligibility: elig };
}

export async function submitApplication(
  tx: PoolClient,
  ctx: ActorContext,
  id: string,
  input: { expectedRowVersion: number },
  policy: CommencementPolicy,
): Promise<{ application: ApplicationView; eligibility: BatchEligibility }> {
  const a = await lockApplication(tx, id);
  requireOwner(a, ctx);
  requireVersion(a, input.expectedRowVersion);
  if (!LEARNER_EDITABLE.includes(a.status)) throw badState(`A ${a.status} application is not submitted.`);
  const missing: ErrorDetail[] = [];
  if (!a.dob) missing.push({ path: 'dateOfBirth', message: 'is required' });
  if (!a.address) missing.push({ path: 'address', message: 'is required' });
  if (a.pricing_model === 'fee_options' && !a.fee_option_id) missing.push({ path: 'feeOptionId', message: 'is required' });
  if (!a.batch_id) missing.push({ path: 'batchId', message: 'choose a batch' });
  if (missing.length) {
    throw errors.domain(409, 'APPLICATION_INCOMPLETE', 'The application is not complete.', missing);
  }
  const b = await loadBatchFacts(tx, a.batch_id!);
  const elig = await evaluateWithPolicy(tx, policy, await applicantFacts(tx, a), b!, { checkRegion: false, checkCapacity: true });
  if (!elig.eligible) throw eligibilityError(elig.reasons);

  await tx.query(`UPDATE learner_application SET status = 'submitted', submitted_at = now() WHERE id = $1`, [a.id]);
  await recordApplicationEvent(tx, ctx, {
    applicationId: a.id,
    learnerUserId: a.learner_user_id,
    action: 'submitted',
    from: a.status,
    to: 'submitted',
    data: { batchId: a.batch_id, commencement: elig.commencement },
    auditOperation: 'application.submitted',
  });
  return { application: (await getApplication(tx, a.id))!, eligibility: elig };
}

export async function withdrawByLearner(
  tx: PoolClient,
  ctx: ActorContext,
  id: string,
  input: { expectedRowVersion: number; reason?: string | undefined },
): Promise<ApplicationView> {
  const a = await lockApplication(tx, id);
  requireOwner(a, ctx);
  requireVersion(a, input.expectedRowVersion);
  if (!LEARNER_WITHDRAWABLE.includes(a.status)) throw badState(`A ${a.status} application is not withdrawn here.`);
  await tx.query(`UPDATE learner_application SET status = 'withdrawn' WHERE id = $1`, [a.id]);
  await recordApplicationEvent(tx, ctx, {
    applicationId: a.id,
    learnerUserId: a.learner_user_id,
    action: 'withdrawn_by_learner',
    from: a.status,
    to: 'withdrawn',
    reason: input.reason ?? null,
    auditOperation: 'application.withdrawn',
  });
  return (await getApplication(tx, a.id))!;
}

// ── Academic review ──────────────────────────────────────────────────────────────────────────────────────────────────

export async function startReview(tx: PoolClient, ctx: ActorContext, id: string, input: { expectedRowVersion: number }): Promise<ApplicationView> {
  const a = await lockApplication(tx, id);
  requireNotOwner(a, ctx);
  requireVersion(a, input.expectedRowVersion);
  if (a.status !== 'submitted') throw badState(`Review starts on a submitted application (this one is ${a.status}).`);
  await tx.query(`UPDATE learner_application SET status = 'under_review' WHERE id = $1`, [a.id]);
  await recordApplicationEvent(tx, ctx, {
    applicationId: a.id,
    learnerUserId: a.learner_user_id,
    action: 'review_started',
    from: a.status,
    to: 'under_review',
    auditOperation: 'application.review_started',
  });
  return (await getApplication(tx, a.id))!;
}

export type Decision = 'approve' | 'reject' | 'request_information' | 'withdraw';

/**
 * An academic decision (PD-AC2-02): only while the application is open (submitted, under review, returned); approved,
 * rejected and withdrawn are final, and a decided application is never decided again. Approval needs the mandatory
 * admission documents (PD-AC2-01) — fail closed until document review exists. Approval is NOT enrolment: the remaining
 * prerequisites (signed agreement, Finance authorization, commencement, capacity) are checked at confirmation.
 */
export async function decideApplication(
  tx: PoolClient,
  ctx: ActorContext,
  id: string,
  input: { decision: Decision; reason?: string | undefined; expectedRowVersion: number },
  documents: AdmissionDocumentsPort,
): Promise<ApplicationView> {
  const a = await lockApplication(tx, id);
  requireNotOwner(a, ctx);
  requireVersion(a, input.expectedRowVersion);
  if (!OPEN_FOR_DECISION.includes(a.status)) {
    throw badState(
      a.status === 'draft'
        ? 'The application is decided after the learner submits it.'
        : `This application is already ${a.status.replace('_', ' ')}; a decided application is not decided again.`,
    );
  }
  const reason = input.reason?.trim() || null;
  if (input.decision !== 'approve' && (!reason || reason.length < 3)) {
    throw errors.validation([{ path: 'reason', message: 'a reason of at least 3 characters is required' }]);
  }

  let to: ApplicationStatus;
  let action: Action;
  const data: Record<string, unknown> = {};
  if (input.decision === 'approve') {
    const docs = await documents.verify(tx, {
      applicationId: a.id,
      learnerUserId: a.learner_user_id,
      programmeId: a.programme_id,
      programmeVersionId: a.programme_version_id,
      termsVersionId: a.terms_version_id,
      batchId: a.batch_id,
      feeOptionId: a.fee_option_id,
    });
    if (docs.status !== 'approved') throw errors.domain(409, 'ADMISSION_DOCUMENTS_REQUIRED', docs.reason);
    data.documentsRef = docs.ref;
    to = 'approved';
    action = 'approved';
  } else if (input.decision === 'reject') {
    to = 'rejected';
    action = 'rejected';
  } else if (input.decision === 'request_information') {
    to = 'information_requested';
    action = 'information_requested';
  } else {
    to = 'withdrawn';
    action = 'withdrawn_by_staff';
  }
  const records = to === 'approved' || to === 'rejected' || to === 'withdrawn';
  await tx.query(
    `UPDATE learner_application
        SET status = $2,
            decided_at = CASE WHEN $3::boolean THEN now() ELSE decided_at END,
            decided_by = CASE WHEN $3::boolean THEN $4::uuid ELSE decided_by END
      WHERE id = $1`,
    [a.id, to, records, userIdOf(ctx.actor)],
  );
  await recordApplicationEvent(tx, ctx, {
    applicationId: a.id,
    learnerUserId: a.learner_user_id,
    action,
    from: a.status,
    to,
    reason,
    data,
    auditOperation: `application.${action}`,
  });
  return (await getApplication(tx, a.id))!;
}

// ── Lists ────────────────────────────────────────────────────────────────────────────────────────────────────────────

export async function listLearnerApplications(db: Queryable, learnerUserId: string): Promise<ApplicationView[]> {
  const r = await db.query<Row>(`${SELECT} WHERE a.learner_user_id = $1 ORDER BY a.created_at DESC LIMIT 100`, [learnerUserId]);
  return r.rows.map(toView);
}

export interface WorklistFilter {
  status?: ApplicationStatus | undefined;
  programmeId?: string | undefined;
  batchId?: string | undefined;
  limit: number;
  /** Keyset: (created_at, id) of the last row seen. */
  before?: { at: string; id: string } | undefined;
}

/** Admissions worklist: submitted, under review, returned and approved by default; any status on request. Oldest first. */
export async function listApplications(db: Queryable, f: WorklistFilter): Promise<ApplicationView[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, ...v: unknown[]) => {
    const idx = v.map((x) => {
      params.push(x);
      return `$${params.length}`;
    });
    let i = 0;
    where.push(sql.replace(/\?/g, () => idx[i++]!));
  };
  if (f.status) add('a.status = ?', f.status);
  else add(`a.status IN ('submitted', 'under_review', 'information_requested', 'approved')`);
  if (f.programmeId) add('a.programme_id = ?', f.programmeId);
  if (f.batchId) add('a.batch_id = ?', f.batchId);
  if (f.before) add('(a.created_at, a.id) > (?::timestamptz, ?::uuid)', f.before.at, f.before.id);
  params.push(f.limit);
  const r = await db.query<Row>(`${SELECT} WHERE ${where.join(' AND ')} ORDER BY a.created_at, a.id LIMIT $${params.length}`, params);
  return r.rows.map(toView);
}
