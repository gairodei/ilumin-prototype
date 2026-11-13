import type { Queryable } from '../../database/pool.js';
import { isIanaZone } from '../../shared/time-zone.js';
import type { CommencementPolicy, CommencementState, CommencementStatus } from '../enrolments/prerequisites.js';

/**
 * Explicit batch selection (P3, PD-P3-01 / PD-P0-01): one eligibility rule, used for the learner's list, the choice
 * itself, submission, and again under the batch lock at confirmation.
 *
 * Every reason a batch can't be chosen is returned (never a silent substitute). Places left are ADVISORY: they are read
 * without the batch lock, and confirmation re-counts them under that lock (I-1, I-12).
 */

export type IneligibleCode =
  | 'PROGRAMME_MISMATCH'
  | 'PROGRAMME_VERSION_MISMATCH'
  | 'PROGRAMME_NOT_ACTIVE'
  | 'BATCH_STATUS'
  | 'BATCH_STARTED'
  | 'TIME_ZONE_INVALID'
  | 'LOCATION_NOT_CONFIGURED'
  | 'REGION_MISMATCH'
  | 'BATCH_FULL'
  | 'NO_COORDINATOR'
  | 'FEE_OPTION_REQUIRED'
  | 'FEE_OPTION_NOT_ACCEPTED'
  | 'DELIVERY_MODE_UNAVAILABLE';

export interface Ineligibility {
  code: IneligibleCode;
  message: string;
}

/** The application's side of the rule, read from the server's records. */
export interface ApplicantFacts {
  programmeId: string;
  programmeVersionId: string;
  programmeStatus: string;
  pricingModel: 'fee_options' | 'single_price';
  feeOptionId: string | null;
  feeOptionActive: boolean;
  /** Fee-option programmes: the option's mode. */
  feeOptionMode: string | null;
  learnerCountry: string | null;
}

export interface BatchFacts {
  id: string;
  code: string;
  programmeId: string;
  programmeVersionId: string;
  status: string;
  startDate: string;
  timeZone: string;
  location: string | null;
  deliveryMode: string | null;
  capacity: number;
  active: number;
  coordinators: number;
  /** Active accepted fee options (option not retired, acceptance not removed). */
  acceptedFeeOptionIds: string[];
}

export interface BatchEligibility {
  batchId: string;
  batchCode: string;
  eligible: boolean;
  reasons: Ineligibility[];
  /** 'unresolved' is a label, not a refusal for saving a choice (U-05); confirmation refuses it. */
  commencement: CommencementState;
  commencementBasis: string;
  localDate: string;
  startDate: string;
  timeZone: string;
  location: string | null;
  deliveryMode: string | null;
  placesLeft: number;
  placesLeftAdvisory: true;
}

export interface EvaluateOptions {
  /** PD-P3-09: the country rule applies when the learner picks a batch, not at later re-checks of the chosen batch. */
  checkRegion: boolean;
  /** The learner's list and their choice check places; confirmation re-counts them under the batch lock instead. */
  checkCapacity: boolean;
}

const ACCEPTING = ['planned', 'open'];

/** Pure: why `b` can't be chosen for this application (empty = it can). */
export function evaluateBatch(app: ApplicantFacts, b: BatchFacts, c: CommencementStatus, o: EvaluateOptions): BatchEligibility {
  const reasons: Ineligibility[] = [];
  const add = (code: IneligibleCode, message: string) => reasons.push({ code, message });

  if (b.programmeId !== app.programmeId) add('PROGRAMME_MISMATCH', 'A batch of another programme.');
  else if (b.programmeVersionId !== app.programmeVersionId) {
    add('PROGRAMME_VERSION_MISMATCH', 'The batch runs another version of the programme than the one you applied for.');
  }
  if (app.programmeStatus !== 'active') add('PROGRAMME_NOT_ACTIVE', `The programme is ${app.programmeStatus}.`);
  if (!ACCEPTING.includes(b.status)) add('BATCH_STATUS', `The batch is ${b.status.replace('_', ' ')}.`);
  if (!isIanaZone(b.timeZone)) add('TIME_ZONE_INVALID', 'The batch has no valid time zone, so its dates cannot be checked.');
  else if (c.state === 'commenced') add('BATCH_STARTED', `The batch started on ${b.startDate} (${b.timeZone}).`);
  if (o.checkRegion) {
    if (!b.location) add('LOCATION_NOT_CONFIGURED', 'The batch has no location configured yet (online or a country).');
    else if (b.location !== 'online' && b.location !== app.learnerCountry) {
      add('REGION_MISMATCH', `The batch runs in ${b.location}; it is not open to learners in ${app.learnerCountry ?? 'an unknown country'}.`);
    }
  }
  const placesLeft = Math.max(b.capacity - b.active, 0);
  if (o.checkCapacity && placesLeft <= 0) add('BATCH_FULL', 'The batch has no place left.');
  if (b.coordinators < 1) add('NO_COORDINATOR', 'The batch has no Academic Coordinator yet.');

  let deliveryMode: string | null;
  if (app.pricingModel === 'fee_options') {
    deliveryMode = app.feeOptionMode;
    if (!app.feeOptionId) add('FEE_OPTION_REQUIRED', 'Choose a fee option first: it decides your delivery mode.');
    else if (!app.feeOptionActive) add('FEE_OPTION_NOT_ACCEPTED', 'Your fee option has been retired.');
    else if (!b.acceptedFeeOptionIds.includes(app.feeOptionId)) add('FEE_OPTION_NOT_ACCEPTED', 'The batch does not take your fee option.');
  } else {
    deliveryMode = b.deliveryMode;
    if (!b.deliveryMode) add('DELIVERY_MODE_UNAVAILABLE', 'The batch has no delivery mode configured.');
  }

  return {
    batchId: b.id,
    batchCode: b.code,
    eligible: reasons.length === 0,
    reasons,
    commencement: c.state,
    commencementBasis: c.basis,
    localDate: c.localDate,
    startDate: b.startDate,
    timeZone: b.timeZone,
    location: b.location,
    deliveryMode,
    placesLeft,
    placesLeftAdvisory: true,
  };
}

const BATCH_FACTS = `
  SELECT b.id, b.code, b.programme_id, b.programme_version_id, b.status, to_char(b.start_date, 'YYYY-MM-DD') AS start_date,
         b.time_zone, b.location, b.delivery_mode, b.capacity, o.active,
         (SELECT count(*)::int FROM staff_scope s JOIN app_user u ON u.id = s.user_id AND u.status = 'active'
           WHERE s.scope_kind = 'batch' AND s.scope_id = b.id AND s.role = 'academic_coordinator' AND s.revoked_at IS NULL) AS coordinators,
         ARRAY(SELECT a.fee_option_id::text FROM batch_fee_option a JOIN fee_option f ON f.id = a.fee_option_id
                WHERE a.batch_id = b.id AND a.removed_at IS NULL AND f.status = 'active') AS accepted
    FROM batch b JOIN batch_occupancy o ON o.batch_id = b.id`;

interface BatchFactsRow {
  id: string;
  code: string;
  programme_id: string;
  programme_version_id: string;
  status: string;
  start_date: string;
  time_zone: string;
  location: string | null;
  delivery_mode: string | null;
  capacity: number;
  active: number;
  coordinators: number;
  accepted: string[];
}

const toFacts = (r: BatchFactsRow): BatchFacts => ({
  id: r.id,
  code: r.code,
  programmeId: r.programme_id,
  programmeVersionId: r.programme_version_id,
  status: r.status,
  startDate: r.start_date,
  timeZone: r.time_zone,
  location: r.location,
  deliveryMode: r.delivery_mode,
  capacity: r.capacity,
  active: r.active,
  coordinators: r.coordinators,
  acceptedFeeOptionIds: r.accepted,
});

export async function loadBatchFacts(db: Queryable, batchId: string): Promise<BatchFacts | null> {
  const r = await db.query<BatchFactsRow>(`${BATCH_FACTS} WHERE b.id = $1`, [batchId]);
  return r.rows[0] ? toFacts(r.rows[0]) : null;
}

/** Candidates for a programme: batches that are planned or open (others never take learners), earliest first. */
export async function loadCandidateBatches(db: Queryable, programmeId: string): Promise<BatchFacts[]> {
  const r = await db.query<BatchFactsRow>(
    `${BATCH_FACTS} WHERE b.programme_id = $1 AND b.status IN ('planned', 'open') ORDER BY b.start_date, b.code LIMIT 200`,
    [programmeId],
  );
  return r.rows.map(toFacts);
}

export async function evaluateWithPolicy(
  db: Queryable,
  policy: CommencementPolicy,
  app: ApplicantFacts,
  b: BatchFacts,
  o: EvaluateOptions,
): Promise<BatchEligibility> {
  const c: CommencementStatus = isIanaZone(b.timeZone)
    ? await policy.evaluate(db, { id: b.id, startDate: b.startDate, timeZone: b.timeZone })
    : { state: 'unresolved', localDate: '', startDate: b.startDate, timeZone: b.timeZone, basis: 'time zone not valid' };
  return evaluateBatch(app, b, c, o);
}
