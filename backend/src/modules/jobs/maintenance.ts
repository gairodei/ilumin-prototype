import type { Config } from '../../config/config.js';
import type { Queryable } from '../../database/pool.js';
import { purgeExpiredIdempotency } from '../../shared/idempotency.js';
import type { JobRegistry } from './jobs.js';

/**
 * Built-in maintenance jobs (Stage 1B). Each calls a SECURITY DEFINER purge function: the worker's database role cannot
 * DELETE from these tables directly, only remove what the function's own rules allow (expired, completed, past
 * retention). Retention values are operational defaults (configurable), not Academy record-retention policy.
 */

async function batched(db: Queryable, sql: string, params: unknown[], batchSize: number, maxBatches = 50): Promise<number> {
  let total = 0;
  for (let i = 0; i < maxBatches; i++) {
    const r = await db.query<{ n: number }>(sql, [...params, batchSize]);
    const n = r.rows[0]?.n ?? 0;
    total += n;
    if (n < batchSize) break;
  }
  return total;
}

export function registerMaintenanceJobs(registry: JobRegistry, config: Config): JobRegistry {
  return registry
    .register({
      name: 'maintenance.idempotency_purge',
      everySeconds: 3600,
      handler: async ({ pool }) => ({ purged: await purgeExpiredIdempotency(pool) }),
    })
    .register({
      name: 'maintenance.auth_purge',
      everySeconds: 3600,
      handler: async ({ pool }) => ({
        purged: await batched(
          pool,
          `SELECT purge_expired_auth_records($1, $2) AS n`,
          [config.auth.session?.retentionDays ?? 30],
          1000,
        ),
      }),
    })
    .register({
      name: 'maintenance.rate_limit_purge',
      everySeconds: 600,
      handler: async ({ pool }) => ({ purged: await batched(pool, `SELECT purge_expired_rate_limit_counters($1) AS n`, [], 10000) }),
    })
    .register({
      name: 'maintenance.outbox_purge',
      everySeconds: 86400,
      handler: async ({ pool }) => ({
        purged: await batched(pool, `SELECT purge_delivered_outbox_messages($1, $2) AS n`, [config.worker.outboxRetentionDays], 1000),
      }),
    })
    .register({
      name: 'maintenance.job_run_purge',
      everySeconds: 86400,
      handler: async ({ pool }) => ({
        purged: await batched(pool, `SELECT purge_finished_job_runs($1, $2) AS n`, [config.worker.jobRetentionDays], 1000),
      }),
    });
}
