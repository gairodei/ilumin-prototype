import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { defineRoute, type Services } from '../../app/route.js';
import { errors } from '../../shared/errors.js';
import { hasAnyRole } from '../authz/policy.js';
import { jobHealth } from '../jobs/jobs.js';
import { outboxHealth } from '../outbox/outbox.js';

/**
 * Operational monitoring and dead-letter handling (Stage 1B).
 * PROVISIONAL DEFAULT PD-1B-02: Super Administrator only, until the client decides whether System Administrators also
 * operate the background queues.
 *
 *   GET  /v1/ops/status                  outbox and job counts, stuck (expired lease) and dead runs, oldest due age
 *   POST /v1/ops/outbox/:id/requeue      a dead-lettered message back to pending (reason required, audited)
 *   POST /v1/ops/jobs/:id/requeue        a dead job run back to pending (reason required, audited)
 */

const opsOperator = hasAnyRole('super_admin');
const IdParams = z.object({ id: z.string().uuid({ message: 'must be a UUID' }) });
const ReasonBody = z.object({ reason: z.string().trim().min(3).max(1000) }).strict();

export function registerOpsRoutes(app: FastifyInstance, services: Services): void {
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/ops/status',
    access: opsOperator,
    handler: async ({ db }) => ({
      status: 200,
      body: { outbox: await outboxHealth(db), jobs: await jobHealth(db) },
    }),
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/ops/outbox/:id/requeue',
    params: IdParams,
    body: ReasonBody,
    access: opsOperator,
    rateLimit: 'sensitive',
    transactional: true,
    handler: async ({ db, params, body, audit }) => {
      const r = await db.query<{ topic: string; attempts: number }>(
        `UPDATE outbox_message SET state = 'pending', attempts = 0, available_at = now(), dead_lettered_at = NULL
          WHERE id = $1 AND state = 'dead_letter' RETURNING topic, attempts`,
        [params.id],
      );
      if (!r.rows[0]) throw errors.conflict('Only a dead-lettered message can be requeued.');
      await audit({
        operation: 'outbox.requeued',
        entity: { type: 'outbox_message', id: params.id },
        before: { state: 'dead_letter' },
        after: { state: 'pending' },
        reason: body.reason,
        reasonRequired: true,
        metadata: { topic: r.rows[0].topic },
      });
      return { status: 200, body: { id: params.id, state: 'pending' } };
    },
  });

  defineRoute(app, services, {
    method: 'POST',
    url: '/v1/ops/jobs/:id/requeue',
    params: IdParams,
    body: ReasonBody,
    access: opsOperator,
    rateLimit: 'sensitive',
    transactional: true,
    handler: async ({ db, params, body, audit }) => {
      const r = await db.query<{ job_name: string }>(
        `UPDATE job_run SET state = 'pending', attempts = 0, available_at = now(), finished_at = NULL
          WHERE id = $1 AND state = 'dead' RETURNING job_name`,
        [params.id],
      );
      if (!r.rows[0]) throw errors.conflict('Only a dead job run can be requeued.');
      await audit({
        operation: 'job_run.requeued',
        entity: { type: 'job_run', id: params.id },
        before: { state: 'dead' },
        after: { state: 'pending' },
        reason: body.reason,
        reasonRequired: true,
        metadata: { jobName: r.rows[0].job_name },
      });
      return { status: 200, body: { id: params.id, state: 'pending' } };
    },
  });
}
