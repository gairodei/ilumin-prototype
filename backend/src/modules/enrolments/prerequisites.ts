import type { PoolClient, Queryable } from '../../database/pool.js';

/**
 * Prerequisite ports of the enrolment lifecycle (Stage 2B; ADR 0013). Stage 2C supplies the real implementations of
 * signed-agreement evidence and Finance authorization; a later stage supplies admission-document review.
 *
 * Until then the PRODUCTION adapters below fail closed: they never report a signature, a payment, an arrangement or an
 * approved document, so no production path can approve an admission (PD-AC2-01) or confirm an enrolment.
 *
 * Test adapters exist only under tests/support (excluded from the production build, and src/ may not import tests/ —
 * scripts/static-checks.mjs). They are marked trust 'test-only' and are refused:
 *   1. by assertPrerequisitesAllowed unless BOTH the loaded configuration and the process are in the test environment
 *      (checked when the app is built and again at every use);
 *   2. by the database: an enrolment carrying test-only evidence is refused unless the database itself is a test
 *      database (a database-level setting that only the test harness sets; migration 0008, IL009).
 * Nothing here reads the request body: browser claims never count as evidence.
 */

export type AdapterTrust = 'production' | 'test-only';

/** The frozen facts of the application a prerequisite is checked against (read by the server, under its lock). */
export interface PrerequisiteContext {
  applicationId: string;
  learnerUserId: string;
  programmeId: string;
  programmeVersionId: string;
  termsVersionId: string;
  batchId: string;
  feeOptionId: string | null;
  deliveryMode: string;
}

/** Signed offer letter / agreement for the application's terms version. Stage 2C. */
export type AgreementEvidence =
  | { status: 'signed'; ref: string; termsVersionId: string; signedAt: string }
  | { status: 'none'; reason: string };

export interface SignedAgreementPort {
  readonly trust: AdapterTrust;
  readonly name: string;
  /** Runs AFTER the application lock (L6): the agreement is a child record of the enrolment level. */
  verify(tx: PoolClient, ctx: PrerequisiteContext): Promise<AgreementEvidence>;
}

/**
 * Authoritative Finance authorization: a VERIFIED first payment (PD-P0-07), or an expressly Finance-approved arrangement.
 * 'pending' (a bank transfer awaiting reconciliation, a card payment not yet captured) never qualifies (I-9).
 */
export type FinanceAuthorization =
  | { status: 'verified'; kind: 'verified_payment' | 'approved_arrangement'; ref: string; verifiedAt: string }
  | { status: 'pending'; kind: 'verified_payment' | 'approved_arrangement'; ref: string }
  | { status: 'none'; reason: string };

export interface FinanceAuthorizationPort {
  readonly trust: AdapterTrust;
  readonly name: string;
  /**
   * Runs BEFORE the application lock: payment / receipt (L1) and arrangement (L3) rows rank above the enrolment level
   * (L6) in the global lock order, so the adapter locks its own rows first; the application is then locked and re-checked.
   */
  authorize(tx: PoolClient, ctx: PrerequisiteContext): Promise<FinanceAuthorization>;
}

/** Mandatory admission documents approved and current (PD-AC2-01). Checked when an admission is approved. */
export type DocumentsEvidence = { status: 'approved'; ref: string } | { status: 'none'; reason: string };

export interface AdmissionDocumentsPort {
  readonly trust: AdapterTrust;
  readonly name: string;
  verify(db: Queryable, ctx: Omit<PrerequisiteContext, 'batchId' | 'deliveryMode'> & { batchId: string | null }): Promise<DocumentsEvidence>;
}

/**
 * Commencement (U-05 open). 'before_start_date': the batch-local date is before the start date, so the batch has not
 * commenced under either candidate rule recorded for U-05 (the start of the start date in the batch zone, or a stored
 * start time on that date) — PD-P3-06's calendar rule. 'unresolved': the batch-local date IS the start date; whether
 * the batch has commenced depends on U-05, so nothing that needs "not commenced" proceeds. 'commenced': a later date.
 * No midnight is assumed and there is no 24-hour fallback.
 */
export type CommencementState = 'before_start_date' | 'unresolved' | 'commenced';

export interface CommencementStatus {
  state: CommencementState;
  /** Today's date in the batch's zone, by the authoritative (database) clock. */
  localDate: string;
  startDate: string;
  timeZone: string;
  basis: string;
}

export interface CommencementPolicy {
  readonly trust: AdapterTrust;
  readonly name: string;
  evaluate(db: Queryable, batch: { id: string; startDate: string; timeZone: string }): Promise<CommencementStatus>;
}

export interface Prerequisites {
  agreement: SignedAgreementPort;
  finance: FinanceAuthorizationPort;
  documents: AdmissionDocumentsPort;
  commencement: CommencementPolicy;
}

/** Pure calendar classification (dates as YYYY-MM-DD in the batch's zone). */
export function classifyCommencement(localDate: string, startDate: string): CommencementState {
  if (localDate < startDate) return 'before_start_date';
  if (localDate === startDate) return 'unresolved';
  return 'commenced';
}

const CALENDAR_BASIS = 'batch-local date before the start date (PD-P3-06; U-05 open)';

/** Production commencement policy: the database clock (I-13), the batch's own IANA zone, and the calendar rule. */
export const calendarCommencementPolicy: CommencementPolicy = Object.freeze({
  trust: 'production' as const,
  name: 'calendar (U-05 open)',
  async evaluate(db: Queryable, batch: { id: string; startDate: string; timeZone: string }): Promise<CommencementStatus> {
    const r = await db.query<{ d: string }>(`SELECT to_char((now() AT TIME ZONE $1)::date, 'YYYY-MM-DD') AS d`, [batch.timeZone]);
    const localDate = r.rows[0]!.d;
    return { state: classifyCommencement(localDate, batch.startDate), localDate, startDate: batch.startDate, timeZone: batch.timeZone, basis: CALENDAR_BASIS };
  },
});

/** Production adapters until Stage 2C (and the document stage) exist: always "not available", never a success. */
export const PRODUCTION_PREREQUISITES: Prerequisites = Object.freeze({
  agreement: Object.freeze({
    trust: 'production' as const,
    name: 'signed-agreement evidence (Stage 2C, not available)',
    verify: async (): Promise<AgreementEvidence> => ({
      status: 'none',
      reason: 'Signed-agreement evidence is not available yet (Stage 2C). No enrolment is confirmed without it.',
    }),
  }),
  finance: Object.freeze({
    trust: 'production' as const,
    name: 'Finance authorization (Stage 2C, not available)',
    authorize: async (): Promise<FinanceAuthorization> => ({
      status: 'none',
      reason: 'Finance authorization is not available yet (Stage 2C). No enrolment is confirmed without a verified payment or an approved arrangement.',
    }),
  }),
  documents: Object.freeze({
    trust: 'production' as const,
    name: 'admission document review (later stage, not available)',
    verify: async (): Promise<DocumentsEvidence> => ({
      status: 'none',
      reason: 'Admission document review is not available yet. An admission is approved only with its mandatory documents approved (PD-AC2-01).',
    }),
  }),
  commencement: calendarCommencementPolicy,
});

const PORTS = ['agreement', 'finance', 'documents', 'commencement'] as const;

export class TestOnlyAdapterRefused extends Error {
  constructor(port: string) {
    super(`Prerequisite adapter "${port}" is test-only and is refused outside the test environment.`);
    this.name = 'TestOnlyAdapterRefused';
  }
}

/**
 * Refuses any non-production adapter unless both the loaded configuration and the process are in the test environment.
 * Called when the application is built and again before every use (a swapped adapter is caught at the next request).
 */
export function assertPrerequisitesAllowed(p: Prerequisites, configEnv: string | undefined, processEnv = process.env.NODE_ENV): void {
  for (const key of PORTS) {
    const port = p[key] as { trust?: unknown; name?: unknown } | undefined;
    if (!port) throw new TestOnlyAdapterRefused(`${key}: missing`);
    if (port.trust === 'production') continue;
    if (port.trust === 'test-only' && configEnv === 'test' && processEnv === 'test') continue;
    throw new TestOnlyAdapterRefused(`${key}: ${String(port.name)}`);
  }
}

/** 'verified' only when every evidence-bearing port is a production adapter. */
export const evidenceTrust = (p: Prerequisites): 'verified' | 'test_only' =>
  p.agreement.trust === 'production' && p.finance.trust === 'production' && p.commencement.trust === 'production'
    ? 'verified'
    : 'test_only';
