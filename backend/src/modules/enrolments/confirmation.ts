import { randomUUID } from 'node:crypto';
import type { Pool, PoolClient, Queryable } from '../../database/pool.js';
import { withTransaction } from '../../database/transaction.js';
import { AppError, errors } from '../../shared/errors.js';
import { claimIdempotency, completeIdempotency, fingerprint, validateIdempotencyKey } from '../../shared/idempotency.js';
import { recordApplicationEvent } from '../applications/applications.js';
import { eligibilityError } from '../applications/applications.js';
import { evaluateWithPolicy, loadBatchFacts } from '../applications/eligibility.js';
import { appendAudit, type AuditRequestContext } from '../audit/audit.js';
import type { Principal } from '../auth/principal.js';
import { enqueueOutbox } from '../outbox/outbox.js';
import { allocateSeat } from '../seats/seat-service.js';
import {
  assertPrerequisitesAllowed,
  evidenceTrust,
  type PrerequisiteContext,
  type Prerequisites,
} from './prerequisites.js';

/**
 * The enrolment-confirmation boundary (Stage 2B; ADR 0013). INTERNAL: there is no HTTP route that calls it. Stage 2C
 * wires it to genuine signed-agreement evidence and Finance authorization; until then the production prerequisite
 * adapters fail closed (SIGNED_AGREEMENT_REQUIRED / FINANCE_AUTHORIZATION_REQUIRED) and nothing can be confirmed.
 *
 * ONE database transaction, in the global lock order (docs/production-transaction-rules.md §1, §6):
 *   L0  idempotency record (permanent; operation 'enrolment.confirm')
 *   --  discover the application WITHOUT a lock; refuse early unless it is approved (or return its enrolment)
 *   L1–L3  Finance authorization: the adapter locks its own payment / receipt / arrangement rows (they rank above L6)
 *   L6  the application, FOR UPDATE; re-checked against the discovered row (row_version) — changed → STALE_RESOURCE
 *   L6  signed-agreement evidence (a child record of the enrolment level), for the application's own terms version
 *   L7  the batch, inside allocateSeat; under that lock: programme version, status, Coordinator, fee option, delivery
 *       mode, capacity, and commencement — which must be established as not started (U-05: the start date itself is
 *       'unresolved' and refused)
 *   --  seat (allocateSeat: audit + outbox), enrolment row, application → enrolled, history, audit, outbox
 *   L0  idempotency completion → COMMIT, all or nothing.
 * Any refusal rolls everything back (no seat, no enrolment, application unchanged) and is audited separately.
 * A learner is never moved to another batch here (no automatic transfer).
 */

export interface EnrolmentView {
  id: string;
  applicationId: string;
  learnerUserId: string;
  programmeId: string;
  programmeVersionId: string;
  termsVersion: { id: string; code: string };
  batch: { id: string; code: string; startDate: string; timeZone: string };
  feeOptionId: string | null;
  deliveryMode: string;
  state: 'confirmed';
  seatAllocationId: string;
  agreementRef: string;
  financeAuthorization: { kind: string; ref: string };
  commencementBasis: string;
  evidenceTrust: 'verified' | 'test_only';
  confirmedAt: string;
  confirmedBy: string | null;
}

const ENROLMENT_SELECT = `
  SELECT e.id, e.application_id, e.learner_user_id, e.programme_id, e.programme_version_id, e.terms_version_id, t.code AS terms_code,
         e.batch_id, b.code AS batch_code, to_char(b.start_date, 'YYYY-MM-DD') AS batch_start, b.time_zone AS batch_tz,
         e.fee_option_id, e.delivery_mode, e.state, e.seat_allocation_id, e.agreement_ref, e.finance_authorization_kind,
         e.finance_authorization_ref, e.commencement_basis, e.evidence_trust, e.confirmed_at, e.confirmed_by
    FROM enrolment e JOIN batch b ON b.id = e.batch_id JOIN terms_version t ON t.id = e.terms_version_id`;

interface EnrolmentRow {
  id: string;
  application_id: string;
  learner_user_id: string;
  programme_id: string;
  programme_version_id: string;
  terms_version_id: string;
  terms_code: string;
  batch_id: string;
  batch_code: string;
  batch_start: string;
  batch_tz: string;
  fee_option_id: string | null;
  delivery_mode: string;
  state: 'confirmed';
  seat_allocation_id: string;
  agreement_ref: string;
  finance_authorization_kind: string;
  finance_authorization_ref: string;
  commencement_basis: string;
  evidence_trust: 'verified' | 'test_only';
  confirmed_at: Date;
  confirmed_by: string | null;
}

const toEnrolment = (r: EnrolmentRow): EnrolmentView => ({
  id: r.id,
  applicationId: r.application_id,
  learnerUserId: r.learner_user_id,
  programmeId: r.programme_id,
  programmeVersionId: r.programme_version_id,
  termsVersion: { id: r.terms_version_id, code: r.terms_code },
  batch: { id: r.batch_id, code: r.batch_code, startDate: r.batch_start, timeZone: r.batch_tz },
  feeOptionId: r.fee_option_id,
  deliveryMode: r.delivery_mode,
  state: r.state,
  seatAllocationId: r.seat_allocation_id,
  agreementRef: r.agreement_ref,
  financeAuthorization: { kind: r.finance_authorization_kind, ref: r.finance_authorization_ref },
  commencementBasis: r.commencement_basis,
  evidenceTrust: r.evidence_trust,
  confirmedAt: r.confirmed_at.toISOString(),
  confirmedBy: r.confirmed_by,
});

export async function getEnrolment(db: Queryable, id: string): Promise<EnrolmentView | null> {
  const r = await db.query<EnrolmentRow>(`${ENROLMENT_SELECT} WHERE e.id = $1`, [id]);
  return r.rows[0] ? toEnrolment(r.rows[0]) : null;
}

export async function enrolmentForApplication(db: Queryable, applicationId: string): Promise<EnrolmentView | null> {
  const r = await db.query<EnrolmentRow>(`${ENROLMENT_SELECT} WHERE e.application_id = $1`, [applicationId]);
  return r.rows[0] ? toEnrolment(r.rows[0]) : null;
}

export async function listLearnerEnrolments(db: Queryable, learnerUserId: string): Promise<EnrolmentView[]> {
  const r = await db.query<EnrolmentRow>(`${ENROLMENT_SELECT} WHERE e.learner_user_id = $1 ORDER BY e.confirmed_at DESC`, [learnerUserId]);
  return r.rows.map(toEnrolment);
}

interface AppRow {
  id: string;
  status: string;
  learner_user_id: string;
  programme_id: string;
  programme_status: string;
  programme_version_id: string;
  pricing_model: 'fee_options' | 'single_price';
  terms_version_id: string;
  batch_id: string | null;
  fee_option_id: string | null;
  fo_status: string | null;
  fo_mode: string | null;
  delivery_mode: string | null;
  country_code: string;
  row_version: number;
}

const APP_SELECT = `
  SELECT a.id, a.status, a.learner_user_id, a.programme_id, p.status AS programme_status, a.programme_version_id,
         v.pricing_model, a.terms_version_id, a.batch_id, a.fee_option_id, fo.status AS fo_status,
         fo.delivery_mode AS fo_mode, a.delivery_mode, lp.country_code, a.row_version
    FROM learner_application a
    JOIN programme p ON p.id = a.programme_id
    JOIN programme_version v ON v.id = a.programme_version_id
    JOIN learner_profile lp ON lp.user_id = a.learner_user_id
    LEFT JOIN fee_option fo ON fo.id = a.fee_option_id`;

export interface ConfirmEnrolmentInput {
  applicationId: string;
  /** The authenticated principal on whose authority Stage 2C confirms (its idempotency scope). */
  actor: { kind: 'user'; principal: Principal };
  idempotencyKey: string;
  request?: AuditRequestContext;
}

export interface ConfirmEnrolmentResult {
  status: 200 | 201;
  enrolment: EnrolmentView;
  replayed: boolean;
}

const refusal = {
  approval: (status: string) =>
    errors.domain(409, 'ACADEMIC_APPROVAL_REQUIRED', `Only an approved application is confirmed (this one is ${status.replace('_', ' ')}).`),
  finance: (why: string) => errors.domain(409, 'FINANCE_AUTHORIZATION_REQUIRED', why),
  agreement: (why: string) => errors.domain(409, 'SIGNED_AGREEMENT_REQUIRED', why),
  commencement: () =>
    errors.domain(
      409,
      'COMMENCEMENT_UNRESOLVED',
      'Today is the batch’s start date in its time zone. Whether it has commenced depends on the commencement rule (U-05), which is not decided, so the enrolment is not confirmed.',
    ),
};

function contextOf(a: AppRow): PrerequisiteContext {
  return {
    applicationId: a.id,
    learnerUserId: a.learner_user_id,
    programmeId: a.programme_id,
    programmeVersionId: a.programme_version_id,
    termsVersionId: a.terms_version_id,
    batchId: a.batch_id!,
    feeOptionId: a.fee_option_id,
    deliveryMode: a.delivery_mode!,
  };
}

export async function confirmEnrolment(
  pool: Pool,
  prerequisites: Prerequisites,
  input: ConfirmEnrolmentInput,
  opts: { configEnv: string },
): Promise<ConfirmEnrolmentResult> {
  assertPrerequisitesAllowed(prerequisites, opts.configEnv);
  const key = validateIdempotencyKey(input.idempotencyKey);
  const actorCtx = { actor: input.actor, ...(input.request ? { request: input.request } : {}) };
  try {
    return await withTransaction(
      pool,
      async (tx) => {
        // L0
        const claim = await claimIdempotency(tx, {
          principalUserId: input.actor.principal.userId,
          operation: 'enrolment.confirm',
          key,
          fingerprint: fingerprint({ applicationId: input.applicationId }),
          retentionHours: 1,
          retentionClass: 'permanent',
        });
        if (claim.kind === 'replay') {
          return { status: claim.response.status as 200 | 201, enrolment: (claim.response.body as { enrolment: EnrolmentView }).enrolment, replayed: true };
        }
        const finish = async (status: 200 | 201, enrolment: EnrolmentView): Promise<ConfirmEnrolmentResult> => {
          await completeIdempotency(tx, claim.recordId, { status, body: { enrolment } });
          return { status, enrolment, replayed: false };
        };

        // Discover (no lock).
        const found = (await tx.query<AppRow>(`${APP_SELECT} WHERE a.id = $1`, [input.applicationId])).rows[0];
        if (!found) throw errors.notFound('Application not found.');
        if (found.status === 'enrolled') return finish(200, (await enrolmentForApplication(tx, found.id))!);
        if (found.status !== 'approved') throw refusal.approval(found.status);
        const pctx = contextOf(found);

        // L1–L3: Finance authorization (locks the adapter's own rows). Pending never qualifies.
        const finance = await prerequisites.finance.authorize(tx, pctx);
        if (finance.status !== 'verified') {
          throw refusal.finance(
            finance.status === 'pending'
              ? 'The payment is pending verification. A pending payment does not authorize an enrolment.'
              : finance.reason,
          );
        }
        if (!finance.ref?.trim() || !finance.verifiedAt) throw refusal.finance('The Finance authorization is incomplete.');

        // L6: the application, re-checked.
        const a = (await tx.query<AppRow>(`${APP_SELECT} WHERE a.id = $1 FOR UPDATE OF a`, [input.applicationId])).rows[0]!;
        if (a.status === 'enrolled') return finish(200, (await enrolmentForApplication(tx, a.id))!);
        if (a.row_version !== found.row_version) {
          throw errors.domain(409, 'STALE_RESOURCE', 'The application changed during confirmation. Retry.');
        }

        // L6 child: the signed agreement, for this application's own terms version.
        const agreement = await prerequisites.agreement.verify(tx, pctx);
        if (agreement.status !== 'signed') throw refusal.agreement(agreement.reason);
        if (agreement.termsVersionId !== a.terms_version_id) {
          throw refusal.agreement('The signed agreement is for another terms version than the one governing this application.');
        }
        if (!agreement.ref?.trim()) throw refusal.agreement('The signed agreement has no reference.');

        // L7 (inside allocateSeat): batch eligibility and commencement under the batch lock, then the seat.
        const enrolmentId = randomUUID();
        let commencementBasis = '';
        const { allocation } = await allocateSeat(tx, actorCtx, {
          batchId: a.batch_id!,
          subject: { kind: 'learner', learnerUserId: a.learner_user_id },
          feeOptionId: a.fee_option_id,
          expectedProgrammeVersionId: a.programme_version_id,
          state: 'occupied',
          authority: { kind: 'enrolment_confirmation', ref: enrolmentId },
          eligibility: async (ltx: PoolClient) => {
            const facts = await loadBatchFacts(ltx, a.batch_id!);
            const elig = await evaluateWithPolicy(
              ltx,
              prerequisites.commencement,
              {
                programmeId: a.programme_id,
                programmeVersionId: a.programme_version_id,
                programmeStatus: a.programme_status,
                pricingModel: a.pricing_model,
                feeOptionId: a.fee_option_id,
                feeOptionActive: a.fee_option_id ? a.fo_status === 'active' : false,
                feeOptionMode: a.fo_mode,
                learnerCountry: a.country_code,
              },
              facts!,
              // PD-P3-09: the region rule applied when the learner chose; capacity is allocateSeat's (under this lock).
              { checkRegion: false, checkCapacity: false },
            );
            if (!elig.eligible) throw eligibilityError(elig.reasons);
            if (elig.commencement !== 'before_start_date') throw refusal.commencement();
            if (elig.deliveryMode !== a.delivery_mode) throw eligibilityError([{ code: 'DELIVERY_MODE_UNAVAILABLE', message: 'The delivery mode changed.' }]);
            commencementBasis = `${elig.commencementBasis}; local date ${elig.localDate}, start ${elig.startDate} ${elig.timeZone}`;
          },
        });

        const trust = evidenceTrust(prerequisites);
        const audit = await appendAudit(tx, {
          actor: input.actor,
          operation: 'enrolment.confirmed',
          entity: { type: 'enrolment', id: enrolmentId },
          before: { applicationStatus: 'approved' },
          after: {
            applicationId: a.id,
            batchId: a.batch_id,
            seatAllocationId: allocation.id,
            feeOptionId: a.fee_option_id,
            deliveryMode: a.delivery_mode,
            termsVersionId: a.terms_version_id,
            agreementRef: agreement.ref,
            financeAuthorization: { kind: finance.kind, ref: finance.ref, verifiedAt: finance.verifiedAt },
            commencementBasis,
            evidenceTrust: trust,
          },
          metadata: { learnerUserId: a.learner_user_id, batchId: a.batch_id },
          ...(input.request ? { request: input.request } : {}),
        });
        await tx.query(
          `INSERT INTO enrolment
             (id, application_id, learner_user_id, programme_id, programme_version_id, terms_version_id, batch_id, fee_option_id,
              delivery_mode, state, seat_allocation_id, agreement_ref, finance_authorization_kind, finance_authorization_ref,
              commencement_basis, evidence_trust, confirmed_by, confirmation_audit_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed', $10, $11, $12, $13, $14, $15, $16, $17)`,
          [
            enrolmentId,
            a.id,
            a.learner_user_id,
            a.programme_id,
            a.programme_version_id,
            a.terms_version_id,
            a.batch_id,
            a.fee_option_id,
            a.delivery_mode,
            allocation.id,
            agreement.ref,
            finance.kind,
            finance.ref,
            commencementBasis,
            trust,
            input.actor.principal.userId,
            audit.id,
          ],
        );
        await tx.query(`UPDATE learner_application SET status = 'enrolled', enrolled_at = now() WHERE id = $1`, [a.id]);
        await recordApplicationEvent(tx, actorCtx, {
          applicationId: a.id,
          learnerUserId: a.learner_user_id,
          action: 'enrolled',
          from: 'approved',
          to: 'enrolled',
          data: { enrolmentId, batchId: a.batch_id, seatAllocationId: allocation.id },
          auditOperation: 'application.enrolled',
        });
        await enqueueOutbox(tx, {
          topic: 'enrolment.confirmed',
          dedupeKey: enrolmentId,
          payload: { enrolmentId, applicationId: a.id, batchId: a.batch_id, seatAllocationId: allocation.id },
          ...(input.request ? { request: input.request } : {}),
        });
        return finish(201, (await getEnrolment(tx, enrolmentId))!);
      },
      { lockTimeoutMs: 5000 },
    );
  } catch (err) {
    if (err instanceof AppError && err.status >= 400 && err.status < 500) {
      // The refusal is recorded on its own: the confirmation itself rolled back completely.
      await appendAudit(pool, {
        actor: input.actor,
        operation: 'enrolment.confirm_refused',
        outcome: 'refused',
        entity: { type: 'learner_application', id: input.applicationId },
        reason: `${err.code}: ${err.message}`,
        ...(input.request ? { request: input.request } : {}),
      }).catch(() => {});
    }
    throw err;
  }
}
