import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { defineRoute, type Services } from '../../app/route.js';
import { errors } from '../../shared/errors.js';
import { requestAuditContext } from '../auth/authenticate.js';
import { programmeAdministration, programmeReader } from '../authz/policy.js';
import { createProgrammeDraft, getProgramme, getVersion, listProgrammes, listVersions, programmeFeeOptions } from './programmes.js';

/**
 * Programme APIs (Stage 2A). Draft creation and reads, plus programme lifecycle changes. There is deliberately NO
 * publication route: publication needs the Stage 2 Finance approval workflow (programmes.ts, publishProgrammeVersion).
 */

const uuid = z.string().uuid({ message: 'must be a UUID' });
const reason = z.string().trim().min(3, 'a reason of at least 3 characters is required').max(1000);
const currency = z.string().regex(/^[A-Z]{3}$/, 'must be an ISO 4217 code such as GBP');
const priceMinor = z.number().int().positive().max(100_000_000);
const deliveryMode = z.enum(['self_paced', 'fully_assisted']);

const FeeOptionInput = z
  .object({ label: z.string().trim().min(1).max(200), deliveryMode, priceMinor, currency })
  .strict();

const CreateProgrammeBody = z
  .object({
    code: z.string().trim().regex(/^[A-Z0-9][A-Z0-9-]{1,39}$/, 'must be 2–40 upper-case letters, digits or hyphens'),
    title: z.string().trim().min(1).max(200),
    level: z.union([z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
    pricing: z.discriminatedUnion('model', [
      z.object({ model: z.literal('single_price'), priceMinor, currency }).strict(),
      // A Level 3 programme may start with no options; it cannot be published until one exists (PD-R1-11).
      z.object({ model: z.literal('fee_options'), options: z.array(FeeOptionInput).max(50) }).strict(),
    ]),
  })
  .strict()
  .superRefine((b, c) => {
    if (b.level === 3 && b.pricing.model !== 'fee_options') {
      c.addIssue({ code: 'custom', path: ['pricing', 'model'], message: 'Level 3 programmes are priced by fee options (R1)' });
    }
  });

const ProgrammeParams = z.object({ programmeId: uuid });
const VersionParams = z.object({ programmeId: uuid, versionId: uuid });
const ListQuery = z
  .object({
    status: z.enum(['draft', 'active', 'closed', 'archived']).optional(),
    level: z.coerce.number().int().min(2).max(5).optional(),
    after: z.string().regex(/^[A-Z0-9][A-Z0-9-]{1,39}$/).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict();
const StatusBody = z
  .object({ status: z.enum(['active', 'closed', 'archived']), reason, expectedRowVersion: z.number().int().positive() })
  .strict();

export function registerProgrammeRoutes(app: FastifyInstance, services: Services): void {
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/programmes',
    query: ListQuery,
    access: programmeReader,
    handler: async ({ db, query }) => {
      const rows = await listProgrammes(db, { ...query, ...(query.after ? { after: query.after } : {}) });
      return { status: 200, body: { programmes: rows, next: rows.length === query.limit ? rows[rows.length - 1]!.code : null } };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/programmes',
    body: CreateProgrammeBody,
    access: programmeAdministration,
    idempotent: { operation: 'programmes.create' },
    rateLimit: 'sensitive',
    lockTimeoutMs: 5000,
    handler: async ({ db, body, principal, request }) => {
      const r = await createProgrammeDraft(
        db as never,
        { actor: { kind: 'user', principal }, request: requestAuditContext(request) },
        body,
      );
      return { status: 201, body: { programme: r.programme, draftVersion: r.version } };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/programmes/:programmeId',
    params: ProgrammeParams,
    access: programmeReader,
    handler: async ({ db, params }) => {
      const p = await getProgramme(db, params.programmeId);
      if (!p) throw errors.notFound('Programme not found.');
      return { status: 200, body: { programme: p, feeOptions: await programmeFeeOptions(db, p.id) } };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/programmes/:programmeId/versions',
    params: ProgrammeParams,
    access: programmeReader,
    handler: async ({ db, params }) => {
      if (!(await getProgramme(db, params.programmeId))) throw errors.notFound('Programme not found.');
      return { status: 200, body: { versions: await listVersions(db, params.programmeId) } };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/programmes/:programmeId/versions/:versionId',
    params: VersionParams,
    access: programmeReader,
    handler: async ({ db, params }) => {
      const v = await getVersion(db, params.programmeId, params.versionId);
      if (!v) throw errors.notFound('Programme version not found.');
      return { status: 200, body: { version: v } };
    },
  });

  // Lifecycle: draft → active (needs a published version), active ⇄ closed, draft/closed → archived (database-enforced).
  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/programmes/:programmeId/status',
    params: ProgrammeParams,
    body: StatusBody,
    access: programmeAdministration,
    idempotent: { operation: 'programmes.status' },
    rateLimit: 'sensitive',
    lockTimeoutMs: 5000,
    handler: async ({ db, params, body, audit }) => {
      const p = await getProgramme(db, params.programmeId, { forUpdate: true });
      if (!p) throw errors.notFound('Programme not found.');
      if (p.rowVersion !== body.expectedRowVersion) {
        throw errors.domain(409, 'STALE_RESOURCE', 'The programme changed since it was read. Reload and try again.');
      }
      if (p.status === body.status) throw errors.domain(409, 'INVALID_STATE_TRANSITION', `The programme is already ${p.status}.`);
      await db.query(`UPDATE programme SET status = $2 WHERE id = $1`, [p.id, body.status]);
      const after = (await getProgramme(db, p.id))!;
      await audit({
        operation: 'programme.status_changed',
        entity: { type: 'programme', id: p.id },
        before: { status: p.status },
        after: { status: after.status },
        reason: body.reason,
        reasonRequired: true,
      });
      return { status: 200, body: { programme: after } };
    },
  });
}
