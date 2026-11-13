import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { defineRoute, type Services } from '../../app/route.js';
import { errors } from '../../shared/errors.js';
import { requestAuditContext } from '../auth/authenticate.js';
import type { Principal } from '../auth/principal.js';
import {
  admissionsStaff,
  applicationDecider,
  applicationLearner,
  applicationReader,
  enrolmentReader,
  learnerSelf,
} from '../authz/policy.js';
import { enrolmentForApplication, getEnrolment, listLearnerEnrolments } from '../enrolments/confirmation.js';
import { prerequisitesOf } from '../enrolments/wiring.js';
import { ensureLearnerProfile, getLearnerProfile } from '../learners/learners.js';
import {
  applicationHistory,
  createApplication,
  decideApplication,
  eligibleBatches,
  getApplication,
  listApplications,
  listLearnerApplications,
  selectBatch,
  startReview,
  submitApplication,
  updateApplicationDetails,
  withdrawByLearner,
} from './applications.js';

/**
 * Learner profile, applications, explicit batch choice, academic review and enrolment reads (Stage 2B).
 *
 * There is NO route that confirms an enrolment, takes a seat or records a signature or a payment: confirmation is the
 * internal boundary in src/modules/enrolments/confirmation.ts, reached only by Stage 2C's verified Finance and
 * agreement workflow. Learner actions resolve the learner from the session; an application id is resolved to its
 * stored owner. Personal details (date of birth, address, postcode) are returned only to the learner and admissions
 * staff and are never logged or audited by value.
 */

const uuid = z.string().uuid({ message: 'must be a UUID' });
const rowVersion = z.number().int().positive();
const country = z.string().regex(/^[A-Z]{2}$/, 'must be a two-letter ISO 3166-1 country code such as GB');
const AppParams = z.object({ applicationId: uuid });
const EnrolmentParams = z.object({ enrolmentId: uuid });

const ProfileBody = z.object({ countryCode: country }).strict();
const CreateBody = z.object({ programmeId: uuid, feeOptionId: uuid.optional() }).strict();
const UpdateBody = z
  .object({
    expectedRowVersion: rowVersion,
    feeOptionId: uuid.optional(),
    dateOfBirth: z.iso.date({ message: 'must be a calendar date (YYYY-MM-DD)' }).optional(),
    address: z.string().trim().min(1).max(500).optional(),
    postcode: z.string().trim().min(1).max(20).nullable().optional(),
  })
  .strict();
const BatchBody = z.object({ expectedRowVersion: rowVersion, batchId: uuid.nullable() }).strict();
const VersionBody = z.object({ expectedRowVersion: rowVersion }).strict();
const WithdrawBody = z.object({ expectedRowVersion: rowVersion, reason: z.string().trim().min(3).max(1000).optional() }).strict();
const DecisionBody = z
  .object({
    decision: z.enum(['approve', 'reject', 'request_information', 'withdraw']),
    reason: z.string().trim().min(3, 'a reason of at least 3 characters is required').max(2000).optional(),
    expectedRowVersion: rowVersion,
  })
  .strict()
  .refine((b) => b.decision === 'approve' || !!b.reason, { path: ['reason'], message: 'a reason is required for this decision' });
const STATUSES = ['draft', 'submitted', 'under_review', 'information_requested', 'approved', 'rejected', 'withdrawn', 'enrolled'] as const;
const ListQuery = z
  .object({
    status: z.enum(STATUSES).optional(),
    programmeId: uuid.optional(),
    batchId: uuid.optional(),
    afterCreatedAt: z.iso.datetime({ offset: true }).optional(),
    afterId: uuid.optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
  })
  .strict()
  .refine((q) => !!q.afterCreatedAt === !!q.afterId, { message: 'afterCreatedAt and afterId go together' });

const ctxOf = (principal: Principal, request: FastifyRequest) => ({
  actor: { kind: 'user' as const, principal },
  request: requestAuditContext(request),
});

const defined = <T extends object>(o: T) => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as T;

export function registerApplicationRoutes(app: FastifyInstance, services: Services): void {
  const write = { rateLimit: 'sensitive' as const, lockTimeoutMs: 5000 };

  // ── Learner profile ─────────────────────────────────────────────────────────────────────────────────────────────
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/learner/profile',
    access: learnerSelf,
    handler: async ({ db, principal }) => {
      const profile = await getLearnerProfile(db, principal.userId);
      if (!profile) throw errors.notFound('No learner profile yet.');
      return { status: 200, body: { profile } };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/learner/profile',
    body: ProfileBody,
    access: learnerSelf,
    idempotent: { operation: 'learner_profile.create' },
    ...write,
    handler: async ({ db, body, principal, request }) => {
      const r = await ensureLearnerProfile(db as never, ctxOf(principal, request), body);
      return { status: r.created ? 201 : 200, body: { profile: r.profile } };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/learner/applications',
    access: learnerSelf,
    handler: async ({ db, principal }) => ({ status: 200, body: { applications: await listLearnerApplications(db, principal.userId) } }),
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/learner/enrolments',
    access: learnerSelf,
    handler: async ({ db, principal }) => ({ status: 200, body: { enrolments: await listLearnerEnrolments(db, principal.userId) } }),
  });

  // ── Applications: learner ───────────────────────────────────────────────────────────────────────────────────────
  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/applications',
    body: CreateBody,
    access: learnerSelf,
    idempotent: { operation: 'applications.create' },
    ...write,
    handler: async ({ db, body, principal, request }) => ({
      status: 201,
      body: { application: await createApplication(db as never, ctxOf(principal, request), defined(body)) },
    }),
  });

  defineRoute(app, services, {
    method: 'PATCH',
    url: '/v1/applications/:applicationId',
    params: AppParams,
    body: UpdateBody,
    access: applicationLearner('applicationId'),
    idempotent: { operation: 'applications.update' },
    ...write,
    handler: async ({ db, params, body, principal, request }) => ({
      status: 200,
      body: { application: await updateApplicationDetails(db as never, ctxOf(principal, request), params.applicationId, defined(body)) },
    }),
  });

  defineRoute(app, services, {
    method: 'PUT',
    url: '/v1/applications/:applicationId/batch',
    params: AppParams,
    body: BatchBody,
    access: applicationLearner('applicationId'),
    idempotent: { operation: 'applications.select_batch' },
    ...write,
    handler: async ({ db, params, body, principal, request, services: s }) => {
      const r = await selectBatch(db as never, ctxOf(principal, request), params.applicationId, body, prerequisitesOf(s).commencement);
      return { status: 200, body: r };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/applications/:applicationId/submit',
    params: AppParams,
    body: VersionBody,
    access: applicationLearner('applicationId'),
    idempotent: { operation: 'applications.submit' },
    ...write,
    handler: async ({ db, params, body, principal, request, services: s }) => {
      const r = await submitApplication(db as never, ctxOf(principal, request), params.applicationId, body, prerequisitesOf(s).commencement);
      return { status: 200, body: r };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/applications/:applicationId/withdraw',
    params: AppParams,
    body: WithdrawBody,
    access: applicationLearner('applicationId'),
    idempotent: { operation: 'applications.withdraw' },
    ...write,
    handler: async ({ db, params, body, principal, request }) => ({
      status: 200,
      body: { application: await withdrawByLearner(db as never, ctxOf(principal, request), params.applicationId, defined(body)) },
    }),
  });

  // ── Applications: shared reads ──────────────────────────────────────────────────────────────────────────────────
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/applications/:applicationId',
    params: AppParams,
    access: applicationReader('applicationId'),
    handler: async ({ db, params }) => {
      const application = await getApplication(db, params.applicationId);
      if (!application) throw errors.notFound('Application not found.');
      return { status: 200, body: { application } };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/applications/:applicationId/history',
    params: AppParams,
    access: applicationReader('applicationId'),
    handler: async ({ db, params }) => ({ status: 200, body: { events: await applicationHistory(db, params.applicationId) } }),
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/applications/:applicationId/eligible-batches',
    params: AppParams,
    access: applicationReader('applicationId'),
    handler: async ({ db, params, services: s }) => {
      const r = await eligibleBatches(db, prerequisitesOf(s).commencement, params.applicationId);
      return {
        status: 200,
        body: {
          applicationId: r.application.id,
          currentBatchId: r.application.batch?.id ?? null,
          note: 'Places left are read at this moment and are not reserved; they are checked again when the enrolment is confirmed.',
          batches: r.batches,
        },
      };
    },
  });

  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/applications/:applicationId/enrolment',
    params: AppParams,
    access: applicationReader('applicationId'),
    handler: async ({ db, params }) => {
      const enrolment = await enrolmentForApplication(db, params.applicationId);
      if (!enrolment) throw errors.notFound('This application has no enrolment.');
      return { status: 200, body: { enrolment } };
    },
  });

  // ── Applications: admissions staff ──────────────────────────────────────────────────────────────────────────────
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/applications',
    query: ListQuery,
    access: admissionsStaff,
    handler: async ({ db, query }) => {
      const applications = await listApplications(db, {
        status: query.status,
        programmeId: query.programmeId,
        batchId: query.batchId,
        limit: query.limit,
        before: query.afterCreatedAt && query.afterId ? { at: query.afterCreatedAt, id: query.afterId } : undefined,
      });
      return { status: 200, body: { applications } };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/applications/:applicationId/review',
    params: AppParams,
    body: VersionBody,
    access: applicationDecider('applicationId'),
    idempotent: { operation: 'applications.review' },
    ...write,
    handler: async ({ db, params, body, principal, request }) => ({
      status: 200,
      body: { application: await startReview(db as never, ctxOf(principal, request), params.applicationId, body) },
    }),
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/applications/:applicationId/decision',
    params: AppParams,
    body: DecisionBody,
    access: applicationDecider('applicationId'),
    idempotent: { operation: 'applications.decide' },
    ...write,
    handler: async ({ db, params, body, principal, request, services: s }) => ({
      status: 200,
      body: {
        application: await decideApplication(db as never, ctxOf(principal, request), params.applicationId, defined(body), prerequisitesOf(s).documents),
      },
    }),
  });

  // ── Enrolments (read-only) ──────────────────────────────────────────────────────────────────────────────────────
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/enrolments/:enrolmentId',
    params: EnrolmentParams,
    access: enrolmentReader('enrolmentId'),
    handler: async ({ db, params }) => {
      const enrolment = await getEnrolment(db, params.enrolmentId);
      if (!enrolment) throw errors.notFound('Enrolment not found.');
      return { status: 200, body: { enrolment } };
    },
  });
}
