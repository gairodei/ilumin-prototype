import { randomUUID } from 'node:crypto';
import type { PoolClient, Queryable } from '../../database/pool.js';
import { pgCode, pgConstraint } from '../../shared/db-errors.js';
import { AppError, errors } from '../../shared/errors.js';
import { type AuditActor, type AuditRequestContext, appendAudit } from '../audit/audit.js';
import { enqueueOutbox } from '../outbox/outbox.js';

/**
 * The authoritative seat ledger (P1, ADR 0012). INTERNAL: no HTTP route calls allocateSeat / releaseSeat / secureSeat.
 * Later stages call them inside their own domain transaction:
 *   - learner enrolment confirmation (Stage 2B+): authority 'enrolment_confirmation'
 *   - approved transfer (P6):                     authority 'approved_transfer' (release + allocate, both batches locked
 *                                                  in ascending id order by the caller)
 *   - unnamed agency reservation (P8):            subject 'agency_reservation' (refused by the database until P8)
 *   - agency learner confirmation (P9):           authority 'agency_confirmation'
 *
 * Responsibilities are split (Stage 2A §11):
 *   - this service guarantees CAPACITY and ALLOCATION INTEGRITY: batch locked, capacity re-read under the lock, one
 *     active place per subject per batch, fee option accepted by the batch, audit + outbox in the same transaction;
 *   - the caller guarantees the SUBJECT'S BUSINESS ELIGIBILITY and the AUTHORITY: it passes `eligibility`, which runs
 *     inside the same transaction, after the batch lock, before anything is written. It throws an AppError to refuse.
 *
 * Lock order (docs/production-transaction-rules.md §1): the caller holds L0 (idempotency) and any L1–L6 rows (e.g. the
 * enrolment) BEFORE calling; this service then locks the batch (L7) and existing seat rows (L8). It never locks
 * upwards. Every function needs a transaction client; nothing here commits.
 */

export type SeatSubject =
  | { kind: 'learner'; learnerUserId: string; agencyId?: string | null }
  | { kind: 'agency_reservation'; reservationId: string; agencyId: string };

export type SeatAuthorityKind =
  | 'enrolment_confirmation'
  | 'approved_transfer'
  | 'agency_reservation'
  | 'agency_confirmation'
  | 'administrative_adjustment';

/** The confirmed domain record that authorises a seat change (e.g. the enrolment or approval_request id). */
export interface SeatAuthority {
  kind: SeatAuthorityKind;
  ref: string;
}

export interface SeatActorContext {
  actor: AuditActor;
  request?: AuditRequestContext;
}

export interface LockedBatch {
  id: string;
  code: string;
  programmeId: string;
  programmeVersionId: string;
  pricingModel: 'fee_options' | 'single_price';
  status: string;
  capacity: number;
  startDate: string;
  timeZone: string;
  deliveryMode: string | null;
}

export interface EligibilityContext {
  batch: LockedBatch;
  subject: SeatSubject;
  feeOptionId: string | null;
  authority: SeatAuthority;
  /** Active places in the batch, counted under the lock (before this allocation). */
  activeBefore: number;
}

/** The caller's subject-eligibility and authority check. Throw an AppError to refuse; return to allow. */
export type SubjectEligibility = (tx: PoolClient, ctx: EligibilityContext) => Promise<void>;

export interface AllocateSeatInput {
  batchId: string;
  subject: SeatSubject;
  feeOptionId?: string | null;
  /** When the caller decided against a specific programme version, the batch must still use it. */
  expectedProgrammeVersionId?: string;
  /** 'held': reserved by a deposit, not yet secured. 'occupied': secured. Both use a place. */
  state?: 'held' | 'occupied';
  authority: SeatAuthority;
  /** Required for 'administrative_adjustment'; recorded in the audit row. */
  reason?: string;
  eligibility: SubjectEligibility;
}

export interface SeatAllocation {
  id: string;
  batchId: string;
  subjectKind: 'learner' | 'agency_reservation' | 'unattributed';
  learnerUserId: string | null;
  reservationId: string | null;
  agencyId: string | null;
  feeOptionId: string | null;
  state: 'held' | 'occupied' | 'released' | 'transferred';
  authorityKind: string;
  authorityRef: string;
  transferredFrom: string | null;
  transferredTo: string | null;
  allocatedAt: string;
  allocatedBy: string | null;
  allocationAuditId: string;
  securedAt: string | null;
  endedAt: string | null;
  endedBy: string | null;
  endReason: string | null;
  endAuditId: string | null;
}

const ACTIVE = ['held', 'occupied'] as const;
const ACCEPTING = ['planned', 'open'];

const SEAT_COLUMNS = `id, batch_id, subject_kind, learner_user_id, reservation_id, agency_id, fee_option_id, state,
  authority_kind, authority_ref, transferred_from, transferred_to, allocated_at, allocated_by, allocation_audit_id,
  secured_at, ended_at, ended_by, end_reason, end_audit_id`;

interface SeatRow {
  id: string;
  batch_id: string;
  subject_kind: SeatAllocation['subjectKind'];
  learner_user_id: string | null;
  reservation_id: string | null;
  agency_id: string | null;
  fee_option_id: string | null;
  state: SeatAllocation['state'];
  authority_kind: string;
  authority_ref: string;
  transferred_from: string | null;
  transferred_to: string | null;
  allocated_at: Date;
  allocated_by: string | null;
  allocation_audit_id: string;
  secured_at: Date | null;
  ended_at: Date | null;
  ended_by: string | null;
  end_reason: string | null;
  end_audit_id: string | null;
}

const iso = (d: Date | null) => (d ? d.toISOString() : null);

export function toAllocation(r: SeatRow): SeatAllocation {
  return {
    id: r.id,
    batchId: r.batch_id,
    subjectKind: r.subject_kind,
    learnerUserId: r.learner_user_id,
    reservationId: r.reservation_id,
    agencyId: r.agency_id,
    feeOptionId: r.fee_option_id,
    state: r.state,
    authorityKind: r.authority_kind,
    authorityRef: r.authority_ref,
    transferredFrom: r.transferred_from,
    transferredTo: r.transferred_to,
    allocatedAt: r.allocated_at.toISOString(),
    allocatedBy: r.allocated_by,
    allocationAuditId: r.allocation_audit_id,
    securedAt: iso(r.secured_at),
    endedAt: iso(r.ended_at),
    endedBy: r.ended_by,
    endReason: r.end_reason,
    endAuditId: r.end_audit_id,
  };
}

const actorUserId = (a: AuditActor) => (a.kind === 'user' ? a.principal.userId : null);

const seatError = {
  batchNotFound: () => errors.notFound('Batch not found.'),
  full: () => errors.domain(409, 'BATCH_FULL', 'The batch has no place left.'),
  notEligible: (why: string) => errors.domain(409, 'BATCH_NOT_ELIGIBLE', why),
  exists: () => errors.domain(409, 'ALLOCATION_ALREADY_EXISTS', 'This subject already holds a place in the batch.'),
  notFound: () => errors.domain(404, 'ALLOCATION_NOT_FOUND', 'Seat allocation not found.'),
  versionMismatch: () =>
    errors.domain(409, 'PROGRAMME_VERSION_MISMATCH', 'The batch does not use the expected programme version.'),
};

/** Locks the batch row (L7) and returns it. Call only after every higher-level lock the operation needs. */
export async function lockBatch(tx: PoolClient, batchId: string): Promise<LockedBatch | null> {
  const r = await tx.query<{
    id: string;
    code: string;
    programme_id: string;
    programme_version_id: string;
    pricing_model: LockedBatch['pricingModel'];
    status: string;
    capacity: number;
    start_date: string;
    time_zone: string;
    delivery_mode: string | null;
  }>(
    `SELECT b.id, b.code, b.programme_id, b.programme_version_id, v.pricing_model, b.status, b.capacity,
            to_char(b.start_date, 'YYYY-MM-DD') AS start_date, b.time_zone, b.delivery_mode
       FROM batch b JOIN programme_version v ON v.id = b.programme_version_id
      WHERE b.id = $1
        FOR UPDATE OF b`,
    [batchId],
  );
  const b = r.rows[0];
  if (!b) return null;
  return {
    id: b.id,
    code: b.code,
    programmeId: b.programme_id,
    programmeVersionId: b.programme_version_id,
    pricingModel: b.pricing_model,
    status: b.status,
    capacity: b.capacity,
    startDate: b.start_date,
    timeZone: b.time_zone,
    deliveryMode: b.delivery_mode,
  };
}

async function countActive(db: Queryable, batchId: string): Promise<number> {
  const r = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM seat_allocation WHERE batch_id = $1 AND state IN ('held', 'occupied')`,
    [batchId],
  );
  return r.rows[0]!.n;
}

async function findActiveForSubject(tx: PoolClient, batchId: string, subject: SeatSubject): Promise<SeatRow | null> {
  const r =
    subject.kind === 'learner'
      ? await tx.query<SeatRow>(
          `SELECT ${SEAT_COLUMNS} FROM seat_allocation
            WHERE batch_id = $1 AND learner_user_id = $2 AND state IN ('held', 'occupied') FOR UPDATE`,
          [batchId, subject.learnerUserId],
        )
      : await tx.query<SeatRow>(
          `SELECT ${SEAT_COLUMNS} FROM seat_allocation WHERE reservation_id = $1 AND state IN ('held', 'occupied') FOR UPDATE`,
          [subject.reservationId],
        );
  return r.rows[0] ?? null;
}

function requireReason(authority: SeatAuthority, reason: string | undefined): string | null {
  const r = reason?.trim() || null;
  if (authority.kind === 'administrative_adjustment' && (!r || r.length < 3)) {
    throw errors.validation([{ path: 'reason', message: 'an administrative adjustment requires a reason' }]);
  }
  return r;
}

function checkAuthority(a: SeatAuthority): void {
  if (!a || typeof a.ref !== 'string' || a.ref.trim().length === 0 || a.ref.length > 200) {
    throw new Error('seat operations require a confirmed authority reference');
  }
}

/**
 * Allocates one place. Idempotent per (subject, batch, authority): repeating the same allocation returns the existing
 * place with created=false and writes nothing. A different authority for a subject that already holds a place is
 * ALLOCATION_ALREADY_EXISTS.
 */
export async function allocateSeat(
  tx: PoolClient,
  ctx: SeatActorContext,
  input: AllocateSeatInput,
): Promise<{ allocation: SeatAllocation; created: boolean }> {
  checkAuthority(input.authority);
  const reason = requireReason(input.authority, input.reason);
  const feeOptionId = input.feeOptionId ?? null;

  const batch = await lockBatch(tx, input.batchId);
  if (!batch) throw seatError.batchNotFound();
  if (input.expectedProgrammeVersionId && input.expectedProgrammeVersionId !== batch.programmeVersionId) {
    throw seatError.versionMismatch();
  }

  // Re-read everything under the lock (production-transaction-rules §1.3 rule 7).
  const existing = await findActiveForSubject(tx, batch.id, input.subject);
  if (existing) {
    if (existing.authority_kind === input.authority.kind && existing.authority_ref === input.authority.ref) {
      return { allocation: toAllocation(existing), created: false };
    }
    throw seatError.exists();
  }
  if (!ACCEPTING.includes(batch.status)) throw seatError.notEligible(`The batch is ${batch.status} and takes no new places.`);

  if (batch.pricingModel === 'fee_options') {
    if (!feeOptionId) throw seatError.notEligible('A fee option is required for this batch.');
    const ok = await tx.query(
      `SELECT 1 FROM batch_fee_option a JOIN fee_option o ON o.id = a.fee_option_id
        WHERE a.batch_id = $1 AND a.fee_option_id = $2 AND a.removed_at IS NULL AND o.status = 'active'`,
      [batch.id, feeOptionId],
    );
    if (ok.rowCount === 0) throw seatError.notEligible('The batch does not accept this fee option.');
  } else if (feeOptionId) {
    throw seatError.notEligible('This batch has a single programme price and takes no fee option.');
  }

  const activeBefore = await countActive(tx, batch.id);
  if (activeBefore >= batch.capacity) throw seatError.full();

  await input.eligibility(tx, { batch, subject: input.subject, feeOptionId, authority: input.authority, activeBefore });

  const id = randomUUID();
  const state = input.state ?? 'occupied';
  const subject = input.subject;
  const after = {
    batchId: batch.id,
    batchCode: batch.code,
    subjectKind: subject.kind,
    ...(subject.kind === 'learner' ? { learnerUserId: subject.learnerUserId } : { reservationId: subject.reservationId }),
    agencyId: subject.agencyId ?? null,
    feeOptionId,
    state,
    authority: input.authority,
    occupancyAfter: activeBefore + 1,
    capacity: batch.capacity,
  };
  const audit = await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'seat.allocated',
    entity: { type: 'seat_allocation', id },
    after,
    reason,
    reasonRequired: input.authority.kind === 'administrative_adjustment',
    metadata: { batchId: batch.id },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  let row: SeatRow;
  try {
    const r = await tx.query<SeatRow>(
      `INSERT INTO seat_allocation
         (id, batch_id, subject_kind, learner_user_id, reservation_id, agency_id, fee_option_id, state, authority_kind,
          authority_ref, allocated_by, allocation_audit_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       RETURNING ${SEAT_COLUMNS}`,
      [
        id,
        batch.id,
        subject.kind,
        subject.kind === 'learner' ? subject.learnerUserId : null,
        subject.kind === 'agency_reservation' ? subject.reservationId : null,
        subject.agencyId ?? null,
        feeOptionId,
        state,
        input.authority.kind,
        input.authority.ref,
        actorUserId(ctx.actor),
        audit.id,
      ],
    );
    row = r.rows[0]!;
  } catch (err) {
    // Backstops for paths that bypassed the checks above (they cannot fire after them under the batch lock).
    if (pgCode(err) === '23505' && /^seat_active_/.test(pgConstraint(err) ?? '')) throw seatError.exists();
    throw err;
  }
  await enqueueOutbox(tx, {
    topic: 'seat.allocated',
    dedupeKey: id,
    payload: { allocationId: id, batchId: batch.id, subjectKind: subject.kind, state },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return { allocation: toAllocation(row), created: true };
}

export interface ReleaseSeatInput {
  allocationId: string;
  reason: string;
  authority: SeatAuthority;
  /** When given, the allocation must belong to this batch (otherwise ALLOCATION_NOT_FOUND: no cross-batch probing). */
  batchId?: string;
}

/** Discover → lock (batch L7, then the seat L8) → re-check. Never locks the seat before its batch. */
async function lockAllocation(tx: PoolClient, allocationId: string, batchId?: string): Promise<{ batch: LockedBatch; row: SeatRow }> {
  const found = await tx.query<{ batch_id: string }>(`SELECT batch_id FROM seat_allocation WHERE id = $1`, [allocationId]);
  const batchOf = found.rows[0]?.batch_id;
  if (!batchOf || (batchId && batchOf !== batchId)) throw seatError.notFound();
  const batch = await lockBatch(tx, batchOf);
  if (!batch) throw seatError.notFound();
  const r = await tx.query<SeatRow>(`SELECT ${SEAT_COLUMNS} FROM seat_allocation WHERE id = $1 FOR UPDATE`, [allocationId]);
  const row = r.rows[0];
  if (!row || row.batch_id !== batch.id) throw seatError.notFound(); // batch_id is immutable; defensive re-check
  return { batch, row };
}

/**
 * Releases a place. Idempotent: releasing an allocation that has already ended returns it with released=false and
 * writes nothing (one effective release, capacity restored once).
 */
export async function releaseSeat(
  tx: PoolClient,
  ctx: SeatActorContext,
  input: ReleaseSeatInput,
): Promise<{ allocation: SeatAllocation; released: boolean }> {
  checkAuthority(input.authority);
  const reason = input.reason?.trim();
  if (!reason || reason.length < 3) throw errors.validation([{ path: 'reason', message: 'a release requires a reason' }]);
  const { batch, row } = await lockAllocation(tx, input.allocationId, input.batchId);
  if (!(ACTIVE as readonly string[]).includes(row.state)) return { allocation: toAllocation(row), released: false };

  const audit = await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'seat.released',
    entity: { type: 'seat_allocation', id: row.id },
    before: { state: row.state },
    after: { state: 'released', batchId: batch.id, authority: input.authority },
    reason,
    reasonRequired: true,
    metadata: { batchId: batch.id },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  const r = await tx.query<SeatRow>(
    `UPDATE seat_allocation
        SET state = 'released', ended_at = now(), ended_by = $2, end_reason = $3, end_audit_id = $4
      WHERE id = $1 AND state IN ('held', 'occupied')
      RETURNING ${SEAT_COLUMNS}`,
    [row.id, actorUserId(ctx.actor), reason, audit.id],
  );
  if (!r.rows[0]) throw new AppError(409, 'CONFLICT', 'The allocation changed while it was being released.'); // unreachable under the lock
  await enqueueOutbox(tx, {
    topic: 'seat.released',
    dedupeKey: row.id,
    payload: { allocationId: row.id, batchId: batch.id },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return { allocation: toAllocation(r.rows[0]), released: true };
}

/** Marks a held place as secured (held → occupied). Idempotent. Used by the payment stage (P4). */
export async function secureSeat(
  tx: PoolClient,
  ctx: SeatActorContext,
  input: { allocationId: string; authority: SeatAuthority; batchId?: string },
): Promise<{ allocation: SeatAllocation; secured: boolean }> {
  checkAuthority(input.authority);
  const { batch, row } = await lockAllocation(tx, input.allocationId, input.batchId);
  if (row.state === 'occupied') return { allocation: toAllocation(row), secured: false };
  if (row.state !== 'held') {
    throw errors.domain(409, 'INVALID_STATE_TRANSITION', 'Only a held place can be secured.');
  }
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'seat.secured',
    entity: { type: 'seat_allocation', id: row.id },
    before: { state: 'held' },
    after: { state: 'occupied', batchId: batch.id, authority: input.authority },
    metadata: { batchId: batch.id },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  const r = await tx.query<SeatRow>(
    `UPDATE seat_allocation SET state = 'occupied' WHERE id = $1 AND state = 'held' RETURNING ${SEAT_COLUMNS}`,
    [row.id],
  );
  return { allocation: toAllocation(r.rows[0]!), secured: true };
}

// ── Reads ────────────────────────────────────────────────────────────────────────────────────────────────────────────

export interface Occupancy {
  batchId: string;
  capacity: number;
  active: number;
  held: number;
  occupied: number;
  unattributed: number;
  available: number;
  acceptingAllocations: boolean;
}

/** Occupancy derived from the active seat records (I-11). Not locked: advisory; allocateSeat re-checks under lock. */
export async function readOccupancy(db: Queryable, batchId: string): Promise<Occupancy | null> {
  const r = await db.query<{
    batch_id: string;
    capacity: number;
    active: number;
    held: number;
    occupied: number;
    unattributed: number;
    available: number;
    status: string;
  }>(
    `SELECT o.*, b.status FROM batch_occupancy o JOIN batch b ON b.id = o.batch_id WHERE o.batch_id = $1`,
    [batchId],
  );
  const o = r.rows[0];
  if (!o) return null;
  return {
    batchId: o.batch_id,
    capacity: o.capacity,
    active: o.active,
    held: o.held,
    occupied: o.occupied,
    unattributed: o.unattributed,
    available: o.available,
    acceptingAllocations: ACCEPTING.includes(o.status) && o.available > 0,
  };
}

/** Capacity check for display or pre-validation. Authoritative only when called after lockBatch in the same tx. */
export async function hasCapacity(db: Queryable, batchId: string): Promise<boolean> {
  return (await readOccupancy(db, batchId))?.acceptingAllocations ?? false;
}

/** Allocations of a batch, newest first, keyset-paginated. `activeOnly` lists the current occupancy. */
export async function listAllocations(
  db: Queryable,
  batchId: string,
  opts: { activeOnly?: boolean; limit?: number; before?: { at: string; id: string } } = {},
): Promise<SeatAllocation[]> {
  const params: unknown[] = [batchId];
  const where = ['batch_id = $1'];
  if (opts.activeOnly) where.push(`state IN ('held', 'occupied')`);
  if (opts.before) {
    params.push(opts.before.at, opts.before.id);
    where.push(`(allocated_at, id) < ($${params.length - 1}::timestamptz, $${params.length}::uuid)`);
  }
  params.push(Math.min(Math.max(opts.limit ?? 100, 1), 500));
  const r = await db.query<SeatRow>(
    `SELECT ${SEAT_COLUMNS} FROM seat_allocation WHERE ${where.join(' AND ')}
      ORDER BY allocated_at DESC, id DESC LIMIT $${params.length}`,
    params,
  );
  return r.rows.map(toAllocation);
}

/** One allocation with its audit trail (allocation, securing, release), oldest first. */
export async function allocationHistory(
  db: Queryable,
  allocationId: string,
): Promise<{ allocation: SeatAllocation; events: Array<{ id: string; seq: string; operation: string; occurredAt: string; actorUserId: string | null; reason: string | null }> } | null> {
  const r = await db.query<SeatRow>(`SELECT ${SEAT_COLUMNS} FROM seat_allocation WHERE id = $1`, [allocationId]);
  if (!r.rows[0]) return null;
  const e = await db.query<{ id: string; seq: string; operation: string; occurred_at: Date; actor_user_id: string | null; reason: string | null }>(
    `SELECT id, seq::text AS seq, operation, occurred_at, actor_user_id, reason FROM audit_event
      WHERE entity_type = 'seat_allocation' AND entity_id = $1 AND outcome = 'succeeded' ORDER BY seq`,
    [allocationId],
  );
  return {
    allocation: toAllocation(r.rows[0]),
    events: e.rows.map((x) => ({
      id: x.id,
      seq: x.seq,
      operation: x.operation,
      occurredAt: x.occurred_at.toISOString(),
      actorUserId: x.actor_user_id,
      reason: x.reason,
    })),
  };
}

/**
 * Ledger invariants (P0 I-1, I-4, I-11 and the ledger's own rules). Returns the violations found; empty = healthy.
 * Run by tests after every concurrency scenario and available to an operations check.
 */
export async function checkSeatInvariants(db: Queryable, batchId?: string): Promise<string[]> {
  const scope = batchId ? 'AND b.id = $1' : '';
  const params = batchId ? [batchId] : [];
  const bad: string[] = [];
  const over = await db.query<{ id: string; capacity: number; active: number }>(
    `SELECT b.id, b.capacity, o.active FROM batch b JOIN batch_occupancy o ON o.batch_id = b.id
      WHERE o.active > b.capacity ${scope}`,
    params,
  );
  for (const x of over.rows) bad.push(`I-1 batch ${x.id}: ${x.active} active places for capacity ${x.capacity}`);
  const dup = await db.query<{ batch_id: string; learner_user_id: string; n: number }>(
    `SELECT s.batch_id, s.learner_user_id, count(*)::int AS n FROM seat_allocation s JOIN batch b ON b.id = s.batch_id
      WHERE s.state IN ('held', 'occupied') AND s.learner_user_id IS NOT NULL ${scope}
      GROUP BY s.batch_id, s.learner_user_id HAVING count(*) > 1`,
    params,
  );
  for (const x of dup.rows) bad.push(`duplicate active place: learner ${x.learner_user_id} in batch ${x.batch_id} (${x.n})`);
  const audit = await db.query<{ id: string }>(
    `SELECT s.id FROM seat_allocation s JOIN batch b ON b.id = s.batch_id
       LEFT JOIN audit_event a ON a.id = s.allocation_audit_id
      WHERE (a.id IS NULL OR a.entity_type <> 'seat_allocation' OR a.entity_id <> s.id::text OR a.operation <> 'seat.allocated') ${scope}`,
    params,
  );
  for (const x of audit.rows) bad.push(`allocation ${x.id} is not linked to its seat.allocated audit event`);
  const ended = await db.query<{ id: string }>(
    `SELECT s.id FROM seat_allocation s JOIN batch b ON b.id = s.batch_id
       LEFT JOIN audit_event a ON a.id = s.end_audit_id
      WHERE s.state IN ('released', 'transferred')
        AND (a.id IS NULL OR a.entity_id <> s.id::text OR a.operation NOT IN ('seat.released', 'seat.transferred')) ${scope}`,
    params,
  );
  for (const x of ended.rows) bad.push(`ended allocation ${x.id} is not linked to its ending audit event`);
  const transfers = await db.query<{ id: string }>(
    `SELECT s.id FROM seat_allocation s JOIN batch b ON b.id = s.batch_id
       LEFT JOIN seat_allocation t ON t.id = s.transferred_to
      WHERE s.state = 'transferred' AND (t.id IS NULL OR t.transferred_from IS DISTINCT FROM s.id) ${scope}`,
    params,
  );
  for (const x of transfers.rows) bad.push(`transferred allocation ${x.id} has no matching destination`);
  const options = await db.query<{ id: string }>(
    `SELECT s.id FROM seat_allocation s JOIN batch b ON b.id = s.batch_id
       JOIN programme_version v ON v.id = b.programme_version_id
      WHERE s.state IN ('held', 'occupied') AND s.subject_kind <> 'unattributed' AND (
              (v.pricing_model = 'fee_options' AND NOT EXISTS (
                 SELECT 1 FROM batch_fee_option f WHERE f.batch_id = s.batch_id AND f.fee_option_id = s.fee_option_id
                    AND f.removed_at IS NULL))
              OR (v.pricing_model = 'single_price' AND s.fee_option_id IS NOT NULL)) ${scope}`,
    params,
  );
  for (const x of options.rows) bad.push(`active allocation ${x.id} has a fee option the batch does not accept`);
  return bad;
}
