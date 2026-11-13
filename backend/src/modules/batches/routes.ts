import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { defineRoute, type Services } from '../../app/route.js';
import { errors } from '../../shared/errors.js';
import { isIanaZone } from '../../shared/time-zone.js';
import { requestAuditContext } from '../auth/authenticate.js';
import type { Principal } from '../auth/principal.js';
import {
  batchAdministration,
  batchListReader,
  batchReader,
  batchSeatReader,
  batchStaffAdmin,
  param,
} from '../authz/policy.js';
import { allocationHistory, listAllocations, readOccupancy } from '../seats/seat-service.js';
import {
  allocateStaff,
  changeBatchStatus,
  createBatch,
  getBatch,
  listBatches,
  listBatchStaff,
  revokeStaff,
  setAcceptedFeeOptions,
  updateBatch,
} from './batches.js';

/**
 * Batch APIs (Stage 2A). There is NO route that takes, releases or moves a seat: those primitives are internal
 * (src/modules/seats/seat-service.ts) and are reached only through later domain operations (enrolment confirmation,
 * approved transfer, agency reservation / confirmation). Occupancy and allocation history are read-only here.
 */

const uuid = z.string().uuid({ message: 'must be a UUID' });
const reason = z.string().trim().min(3, 'a reason of at least 3 characters is required').max(1000);
const code = z.string().trim().regex(/^[A-Z0-9][A-Z0-9-]{1,39}$/, 'must be 2–40 upper-case letters, digits or hyphens');
const deliveryMode = z.enum(['self_paced', 'fully_assisted']);
const capacity = z.number().int().min(1).max(10_000);
const date = z.iso.date({ message: 'must be a calendar date (YYYY-MM-DD)' });

/** An explicit IANA zone (no default: U-04 is open). Re-exported for existing callers. */
export { isIanaZone };
const timeZone = z.string().refine(isIanaZone, 'must be an IANA time zone such as Europe/London');
/** Where the batch runs (PD-P3-01): 'online', or the ISO 3166-1 alpha-2 code of its country. */
const location = z.string().regex(/^(online|[A-Z]{2})$/, "must be 'online' or a two-letter ISO country code such as GB");

const BatchParams = z.object({ batchId: uuid });
const StaffParams = z.object({ batchId: uuid, allocationId: uuid });
const SeatParams = z.object({ batchId: uuid, allocationId: uuid });

const CreateBody = z
  .object({
    code,
    programmeId: uuid,
    programmeVersionId: uuid,
    startDate: date,
    timeZone,
    capacity,
    status: z.enum(['planned', 'open']).default('planned'),
    deliveryMode: deliveryMode.optional(),
    acceptedFeeOptionIds: z.array(uuid).max(50).optional(),
    coordinatorUserIds: z.array(uuid).min(1, 'at least one Academic Coordinator is required').max(20),
    location: location.optional(),
  })
  .strict();

const UpdateBody = z
  .object({
    expectedRowVersion: z.number().int().positive(),
    reason,
    capacity: capacity.optional(),
    startDate: date.optional(),
    timeZone: timeZone.optional(),
    deliveryMode: deliveryMode.optional(),
    location: location.optional(),
  })
  .strict();

const StatusBody = z
  .object({
    status: z.enum(['planned', 'open', 'in_progress', 'completed', 'cancelled', 'archived']),
    reason,
    expectedRowVersion: z.number().int().positive(),
  })
  .strict();

const FeeOptionsBody = z
  .object({ feeOptionIds: z.array(uuid).min(1, 'at least one fee option stays accepted').max(50), reason, expectedRowVersion: z.number().int().positive() })
  .strict();

const StaffBody = z
  .object({
    userId: uuid,
    role: z.enum(['academic_coordinator', 'assessor', 'teacher', 'iqa']),
    assessorFunction: z.enum(['assignment', 'pd', 'observation']).optional(),
    reason,
  })
  .strict();

const ListQuery = z
  .object({
    programmeId: uuid.optional(),
    status: z.enum(['planned', 'open', 'in_progress', 'completed', 'cancelled', 'archived']).optional(),
    startFrom: date.optional(),
    startTo: date.optional(),
    after: code.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();

const SeatQuery = z
  .object({
    active: z.enum(['true', 'false']).default('false'),
    limit: z.coerce.number().int().min(1).max(500).default(100),
  })
  .strict();

const isBatchAdmin = (p: Principal) => ['super_admin', 'academic_admin', 'system_admin'].some((r) => p.roles.has(r as never));
const batchId = param('batchId');
const ctxOf = (principal: Principal, request: Parameters<typeof requestAuditContext>[0]) => ({
  actor: { kind: 'user' as const, principal },
  request: requestAuditContext(request),
});

export function registerBatchRoutes(app: FastifyInstance, services: Services): void {
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/batches',
    query: ListQuery,
    access: batchListReader,
    handler: async ({ db, query, principal }) => {
      // Allocated staff see only their own batches; administrators see all.
      const onlyIds = isBatchAdmin(principal)
        ? null
        : [...new Set(principal.scopes.filter((s) => s.scopeKind === 'batch').map((s) => s.scopeId))];
      const rows = await listBatches(db, { ...query, onlyIds });
      return { status: 200, body: { batches: rows, next: rows.length === query.limit ? rows[rows.length - 1]!.code : null } };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/batches',
    body: CreateBody,
    access: batchAdministration,
    idempotent: { operation: 'batches.create' },
    rateLimit: 'sensitive',
    lockTimeoutMs: 5000,
    handler: async ({ db, body, principal, request }) => {
      const { deliveryMode: dm, acceptedFeeOptionIds: opts, ...rest } = body;
      const batch = await createBatch(db as never, ctxOf(principal, request), {
        ...rest,
        ...(dm ? { deliveryMode: dm } : {}),
        ...(opts ? { acceptedFeeOptionIds: opts } : {}),
      });
      return { status: 201, body: { batch, staff: await listBatchStaff(db, batch.id), occupancy: await readOccupancy(db, batch.id) } };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/batches/:batchId',
    params: BatchParams,
    access: batchReader(batchId),
    handler: async ({ db, params }) => {
      const batch = await getBatch(db, params.batchId);
      if (!batch) throw errors.notFound('Batch not found.');
      return {
        status: 200,
        body: { batch, staff: await listBatchStaff(db, batch.id), occupancy: await readOccupancy(db, batch.id) },
      };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/batches/:batchId/occupancy',
    params: BatchParams,
    access: batchReader(batchId),
    handler: async ({ db, params }) => {
      const occupancy = await readOccupancy(db, params.batchId);
      if (!occupancy) throw errors.notFound('Batch not found.');
      return { status: 200, body: { occupancy } };
    },
  });

  defineRoute(app, services, {
    method: 'PATCH',
    url: '/v1/batches/:batchId',
    params: BatchParams,
    body: UpdateBody,
    access: batchAdministration,
    idempotent: { operation: 'batches.update' },
    rateLimit: 'sensitive',
    lockTimeoutMs: 5000,
    handler: async ({ db, params, body, principal, request }) => {
      const { expectedRowVersion, reason: why, ...changes } = body;
      const batch = await updateBatch(db as never, ctxOf(principal, request), params.batchId, {
        expectedRowVersion,
        reason: why,
        ...Object.fromEntries(Object.entries(changes).filter(([, v]) => v !== undefined)),
      });
      return { status: 200, body: { batch, occupancy: await readOccupancy(db, batch.id) } };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/batches/:batchId/status',
    params: BatchParams,
    body: StatusBody,
    access: batchAdministration,
    idempotent: { operation: 'batches.status' },
    rateLimit: 'sensitive',
    lockTimeoutMs: 5000,
    handler: async ({ db, params, body, principal, request }) => {
      const batch = await changeBatchStatus(db as never, ctxOf(principal, request), params.batchId, body);
      return { status: 200, body: { batch } };
    },
  });

  defineRoute(app, services, {
    method: 'PUT',
    url: '/v1/batches/:batchId/fee-options',
    params: BatchParams,
    body: FeeOptionsBody,
    access: batchAdministration,
    idempotent: { operation: 'batches.fee_options' },
    rateLimit: 'sensitive',
    lockTimeoutMs: 5000,
    handler: async ({ db, params, body, principal, request }) => {
      const batch = await setAcceptedFeeOptions(db as never, ctxOf(principal, request), params.batchId, body);
      return { status: 200, body: { batch } };
    },
  });

  // Staff allocations: Super Admin, Academic Admin, System Admin (PD-IQB-09). Nobody allocates or revokes themselves.
  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/batches/:batchId/staff',
    params: BatchParams,
    body: StaffBody,
    access: batchStaffAdmin,
    idempotent: { operation: 'batches.staff_allocate' },
    rateLimit: 'sensitive',
    lockTimeoutMs: 5000,
    handler: async ({ db, params, body, principal, request, refuse }) => {
      if (body.userId === principal.userId) {
        await refuse('cannot change own staff allocations', { type: 'batch', id: params.batchId }, 'batch.staff_allocate_refused');
      }
      const { assessorFunction: fn, ...rest } = body;
      const allocation = await allocateStaff(db as never, ctxOf(principal, request), params.batchId, {
        ...rest,
        ...(fn ? { assessorFunction: fn } : {}),
      });
      return { status: 201, body: { allocation } };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/batches/:batchId/staff/:allocationId/revoke',
    params: StaffParams,
    body: z.object({ reason }).strict(),
    access: batchStaffAdmin,
    idempotent: { operation: 'batches.staff_revoke' },
    rateLimit: 'sensitive',
    lockTimeoutMs: 5000,
    handler: async ({ db, params, body, principal, request, refuse }) => {
      const own = await db.query(`SELECT 1 FROM staff_scope WHERE id = $1 AND user_id = $2`, [params.allocationId, principal.userId]);
      if (own.rowCount) await refuse('cannot change own staff allocations', { type: 'batch', id: params.batchId }, 'batch.staff_revoke_refused');
      await revokeStaff(db as never, ctxOf(principal, request), params.batchId, { allocationId: params.allocationId, reason: body.reason });
      return { status: 200, body: { staff: await listBatchStaff(db, params.batchId) } };
    },
  });

  // Seat ledger: read-only (learner identities: administrators and the batch's own Coordinators).
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/batches/:batchId/seats',
    params: BatchParams,
    query: SeatQuery,
    access: batchSeatReader(batchId),
    handler: async ({ db, params, query }) => {
      if (!(await getBatch(db, params.batchId))) throw errors.notFound('Batch not found.');
      const allocations = await listAllocations(db, params.batchId, { activeOnly: query.active === 'true', limit: query.limit });
      return { status: 200, body: { allocations, occupancy: await readOccupancy(db, params.batchId) } };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/batches/:batchId/seats/:allocationId/history',
    params: SeatParams,
    access: batchSeatReader(batchId),
    handler: async ({ db, params }) => {
      const h = await allocationHistory(db, params.allocationId);
      if (!h || h.allocation.batchId !== params.batchId) throw errors.domain(404, 'ALLOCATION_NOT_FOUND', 'Seat allocation not found.');
      return { status: 200, body: h };
    },
  });
}
