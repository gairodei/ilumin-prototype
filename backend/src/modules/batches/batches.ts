import type { PoolClient, Queryable } from '../../database/pool.js';
import { pgCode } from '../../shared/db-errors.js';
import { errors } from '../../shared/errors.js';
import { type AuditActor, type AuditRequestContext, appendAudit } from '../audit/audit.js';
import { readOccupancy, type Occupancy } from '../seats/seat-service.js';

/**
 * Batches, their accepted fee options and their staff allocations (Stage 2A, ADR 0012).
 *
 * Lock order: programme (configuration, FOR SHARE) → batch (L7, FOR UPDATE) → seat rows (L8). Nothing here locks a
 * programme after a batch. Every rule below is also enforced by the database (migration 0007); the checks here give
 * precise error messages and run under the same locks.
 */

export interface ActorContext {
  actor: AuditActor;
  request?: AuditRequestContext;
}

export type BatchStatus = 'planned' | 'open' | 'in_progress' | 'completed' | 'cancelled' | 'archived';
export type ScopedRole = 'academic_coordinator' | 'assessor' | 'teacher' | 'iqa';
export type AssessorFunction = 'assignment' | 'pd' | 'observation';

export interface BatchView {
  id: string;
  code: string;
  programmeId: string;
  programmeVersionId: string;
  pricingModel: 'fee_options' | 'single_price';
  startDate: string;
  timeZone: string;
  capacity: number;
  status: BatchStatus;
  deliveryMode: string | null;
  /** 'online' or an ISO 3166-1 alpha-2 country (P3 region rule); null = not configured (not offered to learners). */
  location: string | null;
  acceptedFeeOptions: Array<{ id: string; code: string; label: string; deliveryMode: string; status: string }>;
  rowVersion: number;
  createdAt: string;
  updatedAt: string;
}

interface BatchRow {
  id: string;
  code: string;
  programme_id: string;
  programme_version_id: string;
  pricing_model: BatchView['pricingModel'];
  start_date: string;
  time_zone: string;
  capacity: number;
  status: BatchStatus;
  delivery_mode: string | null;
  location: string | null;
  row_version: number;
  created_at: Date;
  updated_at: Date;
}

const BATCH_SELECT = `
  SELECT b.id, b.code, b.programme_id, b.programme_version_id, v.pricing_model, to_char(b.start_date, 'YYYY-MM-DD') AS start_date,
         b.time_zone, b.capacity, b.status, b.delivery_mode, b.location, b.row_version, b.created_at, b.updated_at
    FROM batch b JOIN programme_version v ON v.id = b.programme_version_id`;

async function acceptedOptions(db: Queryable, batchId: string): Promise<BatchView['acceptedFeeOptions']> {
  const r = await db.query<{ id: string; code: string; label: string; delivery_mode: string; status: string }>(
    `SELECT o.id, o.code, o.label, o.delivery_mode, o.status
       FROM batch_fee_option a JOIN fee_option o ON o.id = a.fee_option_id
      WHERE a.batch_id = $1 AND a.removed_at IS NULL ORDER BY o.code`,
    [batchId],
  );
  return r.rows.map((o) => ({ id: o.id, code: o.code, label: o.label, deliveryMode: o.delivery_mode, status: o.status }));
}

async function toBatch(db: Queryable, r: BatchRow): Promise<BatchView> {
  return {
    id: r.id,
    code: r.code,
    programmeId: r.programme_id,
    programmeVersionId: r.programme_version_id,
    pricingModel: r.pricing_model,
    startDate: r.start_date,
    timeZone: r.time_zone,
    capacity: r.capacity,
    status: r.status,
    deliveryMode: r.delivery_mode,
    location: r.location,
    acceptedFeeOptions: r.pricing_model === 'fee_options' ? await acceptedOptions(db, r.id) : [],
    rowVersion: r.row_version,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}

export async function getBatch(db: Queryable, id: string): Promise<BatchView | null> {
  const r = await db.query<BatchRow>(`${BATCH_SELECT} WHERE b.id = $1`, [id]);
  return r.rows[0] ? toBatch(db, r.rows[0]) : null;
}

/** Locks the batch (L7) and returns it with its row version. */
async function lockBatchRow(tx: PoolClient, id: string): Promise<BatchView> {
  const r = await tx.query<BatchRow>(`${BATCH_SELECT} WHERE b.id = $1 FOR UPDATE OF b`, [id]);
  if (!r.rows[0]) throw errors.notFound('Batch not found.');
  return toBatch(tx, r.rows[0]);
}

export interface BatchFilter {
  programmeId?: string;
  status?: BatchStatus;
  startFrom?: string;
  startTo?: string;
  after?: string;
  limit: number;
  /** null = every batch (administrators); otherwise only these ids (allocated staff). */
  onlyIds: string[] | null;
}

export async function listBatches(db: Queryable, f: BatchFilter): Promise<BatchView[]> {
  const where: string[] = [];
  const params: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    params.push(v);
    where.push(sql.replaceAll('?', `$${params.length}`));
  };
  if (f.onlyIds) add('b.id = ANY(?::uuid[])', f.onlyIds);
  if (f.programmeId) add('b.programme_id = ?', f.programmeId);
  if (f.status) add('b.status = ?', f.status);
  if (f.startFrom) add('b.start_date >= ?::date', f.startFrom);
  if (f.startTo) add('b.start_date <= ?::date', f.startTo);
  if (f.after) add('b.code > ?', f.after);
  params.push(f.limit);
  const r = await db.query<BatchRow>(
    `${BATCH_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY b.code LIMIT $${params.length}`,
    params,
  );
  return Promise.all(r.rows.map((x) => toBatch(db, x)));
}

const userIdOf = (a: AuditActor) => (a.kind === 'user' ? a.principal.userId : null);
const mismatch = (m: string) => errors.domain(409, 'PROGRAMME_VERSION_MISMATCH', m);
const notEligible = (m: string) => errors.domain(409, 'BATCH_NOT_ELIGIBLE', m);
const stale = () => errors.domain(409, 'STALE_RESOURCE', 'The batch changed since it was read. Reload and try again.');

/**
 * Validates fee options for a batch of `programmeId` / `versionId`: each must be an option of that version (otherwise
 * PROGRAMME_VERSION_MISMATCH — this also covers ids of other programmes) and active (otherwise BATCH_NOT_ELIGIBLE).
 */
async function checkOptions(db: Queryable, programmeId: string, versionId: string, ids: string[]): Promise<void> {
  const r = await db.query<{ id: string; status: string }>(
    `SELECT o.id, o.status FROM programme_version_fee_option f JOIN fee_option o ON o.id = f.fee_option_id
      WHERE f.programme_version_id = $1 AND f.programme_id = $2 AND o.id = ANY($3::uuid[])`,
    [versionId, programmeId, ids],
  );
  if (r.rows.length !== ids.length) throw mismatch('A fee option is not part of this programme version.');
  if (r.rows.some((o) => o.status !== 'active')) throw notEligible('A retired fee option cannot be accepted.');
}

async function checkStaffUser(db: Queryable, userId: string, role: ScopedRole, path: string): Promise<void> {
  const r = await db.query(
    `SELECT 1 FROM app_user u JOIN user_role r ON r.user_id = u.id AND r.role = $2 AND r.revoked_at IS NULL
      WHERE u.id = $1 AND u.status = 'active'`,
    [userId, role],
  );
  if (r.rowCount === 0) throw errors.validation([{ path, message: `is not an active user holding the ${role} role` }]);
}

export interface CreateBatchInput {
  code: string;
  programmeId: string;
  programmeVersionId: string;
  startDate: string;
  timeZone: string;
  capacity: number;
  status: 'planned' | 'open';
  deliveryMode?: 'self_paced' | 'fully_assisted';
  acceptedFeeOptionIds?: string[];
  coordinatorUserIds: string[];
  location?: string | null | undefined;
}

export async function createBatch(tx: PoolClient, ctx: ActorContext, input: CreateBatchInput): Promise<BatchView> {
  const actorId = userIdOf(ctx.actor);
  if (!actorId) throw new Error('a batch is created by a user');
  const p = await tx.query<{ status: string }>(`SELECT status FROM programme WHERE id = $1 FOR SHARE`, [input.programmeId]);
  if (!p.rows[0]) throw errors.notFound('Programme not found.');
  if (p.rows[0].status !== 'active') {
    throw notEligible(`The programme is ${p.rows[0].status}; batches are created only for an active programme.`);
  }
  const v = await tx.query<{ programme_id: string; status: string; pricing_model: string }>(
    `SELECT programme_id, status, pricing_model FROM programme_version WHERE id = $1 FOR SHARE`,
    [input.programmeVersionId],
  );
  const ver = v.rows[0];
  if (!ver || ver.programme_id !== input.programmeId) throw mismatch('The version does not belong to this programme.');
  if (ver.status !== 'published') throw mismatch('Batches use the programme’s current published version.');

  const options = [...new Set(input.acceptedFeeOptionIds ?? [])];
  if (ver.pricing_model === 'single_price') {
    if (!input.deliveryMode) throw errors.validation([{ path: 'deliveryMode', message: 'a single-price programme’s batch has one delivery mode' }]);
    if (options.length) throw errors.validation([{ path: 'acceptedFeeOptionIds', message: 'a single-price programme has no fee options' }]);
  } else {
    if (input.deliveryMode) throw errors.validation([{ path: 'deliveryMode', message: 'the learner’s fee option decides the delivery mode' }]);
    if (!options.length) throw errors.validation([{ path: 'acceptedFeeOptionIds', message: 'choose at least one fee option' }]);
    await checkOptions(tx, input.programmeId, input.programmeVersionId, options);
  }
  const coordinators = [...new Set(input.coordinatorUserIds)];
  for (const [i, c] of coordinators.entries()) {
    if (c === actorId) throw errors.validation([{ path: `coordinatorUserIds.${i}`, message: 'you cannot allocate yourself' }]);
    await checkStaffUser(tx, c, 'academic_coordinator', `coordinatorUserIds.${i}`);
  }

  let id: string;
  try {
    const r = await tx.query<{ id: string }>(
      `INSERT INTO batch (code, programme_id, programme_version_id, start_date, time_zone, capacity, status, delivery_mode, created_by, location)
       VALUES ($1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10) RETURNING id`,
      [input.code, input.programmeId, input.programmeVersionId, input.startDate, input.timeZone, input.capacity, input.status,
        input.deliveryMode ?? null, actorId, input.location ?? null],
    );
    id = r.rows[0]!.id;
  } catch (err) {
    if (pgCode(err) === '23505') throw errors.conflict('A batch with this code already exists.');
    throw err;
  }
  for (const o of options) {
    await tx.query(`INSERT INTO batch_fee_option (batch_id, programme_id, fee_option_id, added_by) VALUES ($1, $2, $3, $4)`, [
      id, input.programmeId, o, actorId,
    ]);
  }
  for (const c of coordinators) {
    await tx.query(
      `INSERT INTO staff_scope (user_id, role, scope_kind, scope_id, granted_by, grant_reason)
       VALUES ($1, 'academic_coordinator', 'batch', $2, $3, 'Batch created')`,
      [c, id, actorId],
    );
  }
  const batch = (await getBatch(tx, id))!;
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'batch.created',
    entity: { type: 'batch', id },
    after: { ...batch, coordinatorUserIds: coordinators },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return batch;
}

export interface UpdateBatchInput {
  expectedRowVersion: number;
  reason: string;
  capacity?: number;
  startDate?: string;
  timeZone?: string;
  deliveryMode?: 'self_paced' | 'fully_assisted';
  location?: string;
}

export async function updateBatch(tx: PoolClient, ctx: ActorContext, batchId: string, input: UpdateBatchInput): Promise<BatchView> {
  const b = await lockBatchRow(tx, batchId);
  if (b.rowVersion !== input.expectedRowVersion) throw stale();
  if (['cancelled', 'archived'].includes(b.status)) throw notEligible(`A ${b.status} batch is not changed.`);
  const next = {
    capacity: input.capacity ?? b.capacity,
    startDate: input.startDate ?? b.startDate,
    timeZone: input.timeZone ?? b.timeZone,
    deliveryMode: input.deliveryMode ?? b.deliveryMode,
    location: input.location ?? b.location,
  };
  const changed = (Object.keys(next) as Array<keyof typeof next>).filter((k) => next[k] !== b[k]);
  if (!changed.length) throw errors.validation([{ message: 'nothing to change' }]);
  if (input.deliveryMode && b.pricingModel !== 'single_price') {
    throw errors.validation([{ path: 'deliveryMode', message: 'the learner’s fee option decides the delivery mode' }]);
  }
  const occ = (await readOccupancy(tx, b.id))!;
  if (next.capacity < occ.active) {
    // Refused, never a forced release (Stage 2A §10).
    throw errors.domain(409, 'CAPACITY_CONFLICT', `Capacity cannot go below the ${occ.active} places in use.`);
  }
  if (occ.active > 0 && (changed.includes('startDate') || changed.includes('timeZone') || changed.includes('deliveryMode'))) {
    throw errors.domain(
      409,
      'INVALID_STATE_TRANSITION',
      'Start date, time zone and delivery mode change only while the batch has no places in use (rescheduling is P6).',
    );
  }
  await tx.query(
    `UPDATE batch SET capacity = $2, start_date = $3::date, time_zone = $4, delivery_mode = $5, location = $6 WHERE id = $1`,
    [b.id, next.capacity, next.startDate, next.timeZone, next.deliveryMode, next.location],
  );
  const after = (await getBatch(tx, b.id))!;
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'batch.updated',
    entity: { type: 'batch', id: b.id },
    before: Object.fromEntries(changed.map((k) => [k, b[k]])),
    after: Object.fromEntries(changed.map((k) => [k, after[k]])),
    reason: input.reason,
    reasonRequired: true,
    metadata: { occupancy: occ.active },
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return after;
}

const TRANSITIONS: Record<BatchStatus, BatchStatus[]> = {
  planned: ['open', 'cancelled'],
  open: ['planned', 'cancelled'],
  in_progress: ['completed'],
  completed: ['archived'],
  cancelled: [],
  archived: [],
};

export async function changeBatchStatus(
  tx: PoolClient,
  ctx: ActorContext,
  batchId: string,
  input: { status: BatchStatus; reason: string; expectedRowVersion: number },
): Promise<BatchView> {
  const b = await lockBatchRow(tx, batchId);
  if (b.rowVersion !== input.expectedRowVersion) throw stale();
  if (!TRANSITIONS[b.status].includes(input.status)) {
    const why = b.status === 'open' && input.status === 'in_progress' ? ' (commencement is decided by U-05, still open)' : '';
    throw errors.domain(409, 'INVALID_STATE_TRANSITION', `A batch does not go from ${b.status} to ${input.status}${why}.`);
  }
  if (input.status === 'cancelled' && (await readOccupancy(tx, b.id))!.active > 0) {
    throw errors.domain(409, 'INVALID_STATE_TRANSITION', 'A batch with places in use is not cancelled (U-09 is open; no silent moves).');
  }
  await tx.query(`UPDATE batch SET status = $2 WHERE id = $1`, [b.id, input.status]);
  const after = (await getBatch(tx, b.id))!;
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'batch.status_changed',
    entity: { type: 'batch', id: b.id },
    before: { status: b.status },
    after: { status: after.status },
    reason: input.reason,
    reasonRequired: true,
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return after;
}

/** Replaces the accepted fee options (PD-W1-04): at least one stays; an option held by an active place is not removed. */
export async function setAcceptedFeeOptions(
  tx: PoolClient,
  ctx: ActorContext,
  batchId: string,
  input: { feeOptionIds: string[]; reason: string; expectedRowVersion: number },
): Promise<BatchView> {
  const actorId = userIdOf(ctx.actor);
  const b = await lockBatchRow(tx, batchId);
  if (b.rowVersion !== input.expectedRowVersion) throw stale();
  if (b.pricingModel !== 'fee_options') throw notEligible('A single-price batch has no fee options.');
  if (['completed', 'cancelled', 'archived'].includes(b.status)) throw notEligible(`A ${b.status} batch is not changed.`);
  const want = [...new Set(input.feeOptionIds)];
  const have = b.acceptedFeeOptions.map((o) => o.id);
  const add = want.filter((x) => !have.includes(x));
  const remove = have.filter((x) => !want.includes(x));
  if (!add.length && !remove.length) throw errors.validation([{ path: 'feeOptionIds', message: 'nothing to change' }]);
  if (add.length) await checkOptions(tx, b.programmeId, b.programmeVersionId, add);
  if (remove.length) {
    const held = await tx.query<{ fee_option_id: string }>(
      `SELECT DISTINCT fee_option_id FROM seat_allocation
        WHERE batch_id = $1 AND fee_option_id = ANY($2::uuid[]) AND state IN ('held', 'occupied')`,
      [b.id, remove],
    );
    if (held.rows.length) throw notEligible('A fee option held by a place in this batch cannot be removed.');
    await tx.query(
      `UPDATE batch_fee_option SET removed_at = now(), removed_by = $3, remove_reason = $4
        WHERE batch_id = $1 AND fee_option_id = ANY($2::uuid[]) AND removed_at IS NULL`,
      [b.id, remove, actorId, input.reason],
    );
  }
  for (const o of add) {
    await tx.query(`INSERT INTO batch_fee_option (batch_id, programme_id, fee_option_id, added_by) VALUES ($1, $2, $3, $4)`, [
      b.id, b.programmeId, o, actorId,
    ]);
  }
  await tx.query(`UPDATE batch SET updated_at = now() WHERE id = $1`, [b.id]); // new row version: stale readers are refused
  const after = (await getBatch(tx, b.id))!;
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'batch.fee_options_changed',
    entity: { type: 'batch', id: b.id },
    before: { feeOptionIds: have },
    after: { feeOptionIds: after.acceptedFeeOptions.map((o) => o.id) },
    reason: input.reason,
    reasonRequired: true,
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return after;
}

// ── Staff allocations (staff_scope, the existing allocation model) ──────────────────────────────────────────────────

export interface StaffAllocationView {
  id: string;
  userId: string;
  displayName: string;
  role: ScopedRole;
  assessorFunction: AssessorFunction | null;
  grantedAt: string;
  grantedBy: string | null;
}

export async function listBatchStaff(db: Queryable, batchId: string): Promise<StaffAllocationView[]> {
  const r = await db.query<{
    id: string;
    user_id: string;
    display_name: string;
    role: ScopedRole;
    assessor_function: AssessorFunction | null;
    granted_at: Date;
    granted_by: string | null;
  }>(
    `SELECT s.id, s.user_id, u.display_name, s.role, s.assessor_function, s.granted_at, s.granted_by
       FROM staff_scope s JOIN app_user u ON u.id = s.user_id
      WHERE s.scope_kind = 'batch' AND s.scope_id = $1 AND s.revoked_at IS NULL
      ORDER BY s.role, s.granted_at, s.id`,
    [batchId],
  );
  return r.rows.map((s) => ({
    id: s.id,
    userId: s.user_id,
    displayName: s.display_name,
    role: s.role,
    assessorFunction: s.assessor_function,
    grantedAt: s.granted_at.toISOString(),
    grantedBy: s.granted_by,
  }));
}

/** P-33 / PD-MC-08 and PD-IQB-02 (also enforced by the staff_scope_conflict_guard trigger). */
const CONFLICTS: Record<ScopedRole, ScopedRole[]> = {
  academic_coordinator: ['assessor', 'iqa'],
  assessor: ['academic_coordinator', 'iqa'],
  teacher: ['iqa'],
  iqa: ['academic_coordinator', 'assessor', 'teacher'],
};

export async function allocateStaff(
  tx: PoolClient,
  ctx: ActorContext,
  batchId: string,
  input: { userId: string; role: ScopedRole; assessorFunction?: AssessorFunction; reason: string },
): Promise<StaffAllocationView> {
  const actorId = userIdOf(ctx.actor);
  const b = await lockBatchRow(tx, batchId);
  if (['cancelled', 'archived'].includes(b.status)) throw notEligible(`A ${b.status} batch takes no staff changes.`);
  if ((input.role === 'assessor') !== (input.assessorFunction !== undefined)) {
    throw errors.validation([{ path: 'assessorFunction', message: 'required for an assessor, and only for an assessor' }]);
  }
  await checkStaffUser(tx, input.userId, input.role, 'userId');
  const current = await listBatchStaff(tx, b.id);
  const mine = current.filter((s) => s.userId === input.userId);
  if (mine.some((s) => s.role === input.role && s.assessorFunction === (input.assessorFunction ?? null))) {
    throw errors.conflict('This person already holds that allocation on the batch.');
  }
  const clash = mine.find((s) => CONFLICTS[input.role].includes(s.role));
  if (clash) {
    throw errors.domain(
      409,
      'STAFF_ALLOCATION_CONFLICT',
      `This person is the batch's ${clash.role.replace('_', ' ')} and cannot also be its ${input.role.replace('_', ' ')} (P-33 / IQA independence).`,
    );
  }
  const r = await tx.query<{ id: string }>(
    `INSERT INTO staff_scope (user_id, role, scope_kind, scope_id, granted_by, grant_reason, assessor_function)
     VALUES ($1, $2, 'batch', $3, $4, $5, $6) RETURNING id`,
    [input.userId, input.role, b.id, actorId, input.reason, input.assessorFunction ?? null],
  );
  const view = (await listBatchStaff(tx, b.id)).find((s) => s.id === r.rows[0]!.id)!;
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'batch.staff_allocated',
    entity: { type: 'batch', id: b.id },
    after: { allocationId: view.id, userId: view.userId, role: view.role, assessorFunction: view.assessorFunction },
    reason: input.reason,
    reasonRequired: true,
    ...(ctx.request ? { request: ctx.request } : {}),
  });
  return view;
}

export async function revokeStaff(
  tx: PoolClient,
  ctx: ActorContext,
  batchId: string,
  input: { allocationId: string; reason: string },
): Promise<void> {
  const actorId = userIdOf(ctx.actor);
  const b = await lockBatchRow(tx, batchId);
  const current = await listBatchStaff(tx, b.id);
  const target = current.find((s) => s.id === input.allocationId);
  if (!target) throw errors.notFound('Staff allocation not found on this batch.');
  if (target.role === 'academic_coordinator' && current.filter((s) => s.role === 'academic_coordinator').length === 1) {
    // PD-MC-17: a batch has at least one Academic Coordinator.
    throw errors.domain(409, 'INVALID_STATE_TRANSITION', 'A batch keeps at least one Academic Coordinator.');
  }
  await tx.query(
    `UPDATE staff_scope SET revoked_at = now(), revoked_by = $2, revoke_reason = $3 WHERE id = $1 AND revoked_at IS NULL`,
    [target.id, actorId, input.reason],
  );
  await appendAudit(tx, {
    actor: ctx.actor,
    operation: 'batch.staff_revoked',
    entity: { type: 'batch', id: b.id },
    before: { allocationId: target.id, userId: target.userId, role: target.role, assessorFunction: target.assessorFunction },
    reason: input.reason,
    reasonRequired: true,
    ...(ctx.request ? { request: ctx.request } : {}),
  });
}

export type { Occupancy };
