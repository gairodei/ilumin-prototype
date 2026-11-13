import { hostname } from 'node:os';
import { randomBytes } from 'node:crypto';
import type { Config } from '../config/config.js';
import { createPool, type Pool, verifyDatabase } from '../database/pool.js';
import { JobRegistry, JobRunner, scheduleRecurring } from '../modules/jobs/jobs.js';
import { registerMaintenanceJobs } from '../modules/jobs/maintenance.js';
import { CapturingNotificationProvider, notificationHandlers } from '../modules/outbox/notifications.js';
import { OutboxDispatcher, type OutboxHandler } from '../modules/outbox/outbox.js';

/**
 * The background worker: the same codebase and database as the API, a separate process (`npm run worker`). One loop:
 * schedule due recurring jobs → run claimed jobs → dispatch claimed outbox messages → sleep WORKER_POLL_INTERVAL_MS.
 * Any number of workers may run; row claiming (SKIP LOCKED + leases) keeps them from doing the same work at once.
 * Stopping: the current pass finishes, then the pool closes. A killed worker loses nothing: its leased rows become
 * claimable again when the lease expires.
 */

export interface WorkerLogger {
  info(obj: object, msg: string): void;
  error(obj: object, msg: string): void;
}

export interface WorkerOptions {
  pool?: Pool;
  registry?: JobRegistry;
  outboxHandlers?: Record<string, OutboxHandler>;
  logger?: WorkerLogger;
  workerId?: string;
  /** Start the polling loop (default true). Tests drive passes with tick() instead. */
  autoStart?: boolean;
}

export interface RunningWorker {
  workerId: string;
  /** Runs one pass immediately (tests). */
  tick(): Promise<void>;
  stop(): Promise<void>;
}

const silent: WorkerLogger = { info: () => {}, error: () => {} };

export function defaultOutboxHandlers(config: Config): Record<string, OutboxHandler> {
  if (config.worker.notificationTransport === 'capture') return notificationHandlers(new CapturingNotificationProvider());
  return {}; // 'none': notification messages wait in the outbox until a provider is configured
}

export async function startWorker(config: Config, opts: WorkerOptions = {}): Promise<RunningWorker> {
  const ownPool = !opts.pool;
  const pool = opts.pool ?? createPool(config.database, 'ilumin-worker');
  if (ownPool) await verifyDatabase(pool);
  const log = opts.logger ?? silent;
  const workerId = opts.workerId ?? `${hostname()}:${process.pid}:${randomBytes(3).toString('hex')}`;
  const registry = opts.registry ?? registerMaintenanceJobs(new JobRegistry(), config);
  const runner = new JobRunner(pool, registry, { workerId, leaseSeconds: config.worker.leaseSeconds });
  const dispatcher = new OutboxDispatcher(pool, opts.outboxHandlers ?? defaultOutboxHandlers(config), {
    workerId,
    leaseSeconds: config.worker.leaseSeconds,
  });

  let stopping = false;
  let current: Promise<void> = Promise.resolve();
  let timer: NodeJS.Timeout | undefined;

  const pass = async () => {
    try {
      const scheduled = await scheduleRecurring(pool, registry);
      const jobs = await runner.runOnce();
      const outbox = await dispatcher.runOnce();
      if (scheduled || jobs.claimed || outbox.claimed) log.info({ workerId, scheduled, jobs, outbox }, 'worker pass');
    } catch (err) {
      log.error({ workerId, err: { message: (err as Error).message } }, 'worker pass failed');
    }
  };

  const loop = () => {
    if (stopping) return;
    current = pass().finally(() => {
      if (!stopping) {
        // Not unref'd: this timer is what keeps the worker process alive between passes.
        timer = setTimeout(loop, config.worker.pollIntervalMs);
      }
    });
  };

  log.info({ workerId, jobs: registry.names() }, 'worker started');
  if (opts.autoStart !== false) loop();

  return {
    workerId,
    tick: async () => {
      await current;
      current = pass();
      await current;
    },
    stop: async () => {
      stopping = true;
      if (timer) clearTimeout(timer);
      await current;
      if (ownPool) await pool.end().catch(() => {});
      log.info({ workerId }, 'worker stopped');
    },
  };
}
