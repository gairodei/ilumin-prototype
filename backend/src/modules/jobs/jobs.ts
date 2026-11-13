import type { Pool, Queryable } from '../../database/pool.js';
import { backoffMs, type BackoffPolicy, sanitizeError } from '../outbox/outbox.js';

/**
 * Database-backed job runner (ADR 0010).
 *
 *  - Durable identity: a job execution is the row (job_name, run_key), UNIQUE. Scheduling the same run again is a no-op,
 *    so any number of schedulers may run.
 *  - Recurring jobs: every `everySeconds`, the slot instant floor(now / every) · every is computed with the DATABASE
 *    clock (UTC). run_key is that instant in ISO-8601 UTC. A client clock is never consulted.
 *  - Competing runners claim due rows with FOR UPDATE SKIP LOCKED and a lease; completion is fenced by the attempt
 *    number; an expired lease (crashed runner) makes the run claimable again ("stuck" until then — see jobHealth).
 *  - Failures retry with bounded exponential backoff; after max_attempts the run is 'dead' and stays visible.
 *  - Handlers must be idempotent: a run can execute more than once (lease expiry after a crash). Domain jobs (Stage 2)
 *    use their own idempotency keys, e.g. (reservation id, 'cutoff_release', cutoff instant).
 */

export interface JobRun {
  id: string;
  jobName: string;
  runKey: string;
  scheduledFor: Date;
  attempt: number;
  maxAttempts: number;
  payload: Record<string, unknown>;
}

export interface JobContext {
  run: JobRun;
  pool: Pool;
}

export interface JobDefinition {
  name: string;
  /** Recurring interval in seconds (slot-aligned to the Unix epoch, UTC). Omit for on-demand jobs. */
  everySeconds?: number;
  maxAttempts?: number;
  handler: (ctx: JobContext) => Promise<Record<string, unknown> | void>;
}

/**
 * Extension points for Stage 2 domain jobs. Names are reserved here; NO business rule is implemented and none of these
 * is registered or scheduled in Stage 1B. Each needs the client decisions noted.
 */
export const DOMAIN_JOB_EXTENSION_POINTS = {
  /** P4 deposit deadlines and forfeiture (28-day batch-local cutoff; REVISED-1 inactive; U-02 pending claims). */
  depositDeadlines: 'deposit.deadline_check',
  /** P8 unnamed-reservation release at the batch cutoff (production-transaction-rules §2; U-06). */
  reservationCutoffRelease: 'reservation.cutoff_release',
  /** P7 agency entitlement / bundle expiry (named-but-unconfirmed reservations end with the bundle). */
  entitlementExpiry: 'entitlement.expiry',
  /** P9 finance overdue reviews (U-08 notice cadence). */
  financeOverdueChecks: 'finance.overdue_check',
  /** P7 30/14/7/0 reminders and P4 payment warnings (U-03). */
  paymentReminders: 'payment.reminder',
} as const;

const NAME_RE = /^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/;
const RESERVED = new Set<string>(Object.values(DOMAIN_JOB_EXTENSION_POINTS));

export class JobRegistry {
  private readonly defs = new Map<string, JobDefinition>();

  /** `allowReserved` is for Stage 2, when a domain job is actually implemented. */
  register(def: JobDefinition, opts: { allowReserved?: boolean } = {}): this {
    if (!NAME_RE.test(def.name)) throw new Error(`invalid job name ${def.name}`);
    if (RESERVED.has(def.name) && !opts.allowReserved) {
      throw new Error(`job ${def.name} is a reserved Stage 2 extension point; its business rules are not implemented`);
    }
    if (this.defs.has(def.name)) throw new Error(`job ${def.name} registered twice`);
    if (def.everySeconds !== undefined && (!Number.isInteger(def.everySeconds) || def.everySeconds < 10 || def.everySeconds > 86400 * 31)) {
      throw new Error(`job ${def.name}: everySeconds must be an integer between 10 and 2678400`);
    }
    this.defs.set(def.name, def);
    return this;
  }

  get(name: string): JobDefinition | undefined {
    return this.defs.get(name);
  }

  names(): string[] {
    return [...this.defs.keys()];
  }

  recurring(): JobDefinition[] {
    return [...this.defs.values()].filter((d) => d.everySeconds !== undefined);
  }
}

export interface ScheduleInput {
  jobName: string;
  runKey: string;
  /** A UTC instant computed by server code from server records. Omit for "now" (database clock). */
  runAt?: Date;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
}

/** Schedules one durable run. Returns created=false when (job_name, run_key) already exists (idempotent). */
export async function scheduleJob(db: Queryable, s: ScheduleInput): Promise<{ id: string | null; created: boolean }> {
  const r = await db.query<{ id: string }>(
    `INSERT INTO job_run (job_name, run_key, payload, scheduled_for, available_at, max_attempts)
     VALUES ($1, $2, $3, COALESCE($4, now()), COALESCE($4, now()), $5)
     ON CONFLICT ON CONSTRAINT job_run_identity_uq DO NOTHING
     RETURNING id`,
    [s.jobName, s.runKey, JSON.stringify(s.payload ?? {}), s.runAt ?? null, s.maxAttempts ?? 5],
  );
  return r.rows[0] ? { id: r.rows[0].id, created: true } : { id: null, created: false };
}

/** Inserts the current slot of every recurring job (database clock). Safe to call from any number of workers. */
export async function scheduleRecurring(db: Queryable, registry: JobRegistry): Promise<number> {
  let created = 0;
  for (const def of registry.recurring()) {
    const r = await db.query(
      `WITH slot AS (SELECT to_timestamp(floor(extract(epoch FROM now()) / $2) * $2) AS at)
       INSERT INTO job_run (job_name, run_key, scheduled_for, available_at, max_attempts)
       SELECT $1, to_char(at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), at, at, $3 FROM slot
       ON CONFLICT ON CONSTRAINT job_run_identity_uq DO NOTHING`,
      [def.name, def.everySeconds, def.maxAttempts ?? 3],
    );
    created += r.rowCount ?? 0;
  }
  return created;
}

export interface RunnerOptions {
  workerId: string;
  leaseSeconds: number;
  batchSize?: number;
  backoff?: BackoffPolicy;
}

export interface RunResult {
  claimed: number;
  succeeded: number;
  retried: number;
  dead: number;
  lostLease: number;
}

export class JobRunner {
  private readonly backoff: BackoffPolicy;

  constructor(
    private readonly pool: Pool,
    private readonly registry: JobRegistry,
    private readonly opts: RunnerOptions,
  ) {
    this.backoff = opts.backoff ?? { baseMs: 10_000, maxMs: 60 * 60_000 };
  }

  async claim(): Promise<JobRun[]> {
    const names = this.registry.names();
    if (names.length === 0) return [];
    const r = await this.pool.query<{
      id: string;
      job_name: string;
      run_key: string;
      scheduled_for: Date;
      attempts: number;
      max_attempts: number;
      payload: Record<string, unknown>;
    }>(
      `WITH c AS (
         SELECT id FROM job_run
          WHERE job_name = ANY($1::text[])
            AND ((state IN ('pending', 'failed') AND available_at <= now())
                 OR (state = 'running' AND locked_until < now()))
          ORDER BY available_at, id
          LIMIT $2
          FOR UPDATE SKIP LOCKED)
       UPDATE job_run j
          SET state = 'running', locked_by = $3, locked_until = now() + make_interval(secs => $4),
              attempts = j.attempts + 1, started_at = now()
         FROM c WHERE j.id = c.id
       RETURNING j.id, j.job_name, j.run_key, j.scheduled_for, j.attempts, j.max_attempts, j.payload`,
      [names, this.opts.batchSize ?? 5, this.opts.workerId, this.opts.leaseSeconds],
    );
    return r.rows.map((x) => ({
      id: x.id,
      jobName: x.job_name,
      runKey: x.run_key,
      scheduledFor: x.scheduled_for,
      attempt: x.attempts,
      maxAttempts: x.max_attempts,
      payload: x.payload,
    }));
  }

  async runOnce(): Promise<RunResult> {
    const res: RunResult = { claimed: 0, succeeded: 0, retried: 0, dead: 0, lostLease: 0 };
    const runs = await this.claim();
    res.claimed = runs.length;
    for (const run of runs) res[await this.execute(run)]++;
    return res;
  }

  private async execute(run: JobRun): Promise<'succeeded' | 'retried' | 'dead' | 'lostLease'> {
    let result: Record<string, unknown> | void;
    try {
      if (run.attempt > run.maxAttempts) throw new Error('attempts exhausted (lease expired repeatedly)');
      result = await this.registry.get(run.jobName)!.handler({ run, pool: this.pool });
    } catch (err) {
      const dead = run.attempt >= run.maxAttempts;
      const r = await this.pool.query(
        `UPDATE job_run
            SET state = CASE WHEN $3 THEN 'dead' ELSE 'failed' END,
                finished_at = CASE WHEN $3 THEN now() ELSE NULL END,
                available_at = CASE WHEN $3 THEN available_at ELSE now() + make_interval(secs => $4::double precision / 1000) END,
                last_error = $5, locked_by = NULL, locked_until = NULL
          WHERE id = $1 AND state = 'running' AND attempts = $2`,
        [run.id, run.attempt, dead, backoffMs(run.attempt, this.backoff), sanitizeError(err)],
      );
      if ((r.rowCount ?? 0) === 0) return 'lostLease';
      return dead ? 'dead' : 'retried';
    }
    const r = await this.pool.query(
      `UPDATE job_run SET state = 'succeeded', finished_at = now(), result = $3, last_error = NULL,
              locked_by = NULL, locked_until = NULL
        WHERE id = $1 AND state = 'running' AND attempts = $2`,
      [run.id, run.attempt, JSON.stringify(result ?? {})],
    );
    return (r.rowCount ?? 0) === 1 ? 'succeeded' : 'lostLease';
  }
}

export interface JobHealth {
  counts: Record<string, number>;
  /** Running with an expired lease: the runner died or hung. Reclaimed automatically on the next pass. */
  stuck: Array<{ id: string; jobName: string; runKey: string; lockedBy: string; lockedUntil: string }>;
  dead: Array<{ id: string; jobName: string; runKey: string; attempts: number; lastError: string | null }>;
  oldestDueSeconds: number | null;
}

export async function jobHealth(db: Queryable, limit = 20): Promise<JobHealth> {
  const c = await db.query<{ state: string; n: number }>(`SELECT state, count(*)::int AS n FROM job_run GROUP BY state`);
  const stuck = await db.query<{ id: string; job_name: string; run_key: string; locked_by: string; locked_until: Date }>(
    `SELECT id, job_name, run_key, locked_by, locked_until FROM job_run
      WHERE state = 'running' AND locked_until < now() ORDER BY locked_until LIMIT $1`,
    [limit],
  );
  const dead = await db.query<{ id: string; job_name: string; run_key: string; attempts: number; last_error: string | null }>(
    `SELECT id, job_name, run_key, attempts, last_error FROM job_run WHERE state = 'dead' ORDER BY finished_at DESC LIMIT $1`,
    [limit],
  );
  const oldest = await db.query<{ s: number | null }>(
    `SELECT extract(epoch FROM now() - min(available_at))::int AS s FROM job_run
      WHERE state IN ('pending', 'failed') AND available_at <= now()`,
  );
  const counts: Record<string, number> = { pending: 0, running: 0, succeeded: 0, failed: 0, dead: 0 };
  for (const row of c.rows) counts[row.state] = row.n;
  return {
    counts,
    stuck: stuck.rows.map((x) => ({
      id: x.id,
      jobName: x.job_name,
      runKey: x.run_key,
      lockedBy: x.locked_by,
      lockedUntil: x.locked_until.toISOString(),
    })),
    dead: dead.rows.map((x) => ({ id: x.id, jobName: x.job_name, runKey: x.run_key, attempts: x.attempts, lastError: x.last_error })),
    oldestDueSeconds: oldest.rows[0]?.s ?? null,
  };
}
