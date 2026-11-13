import type { Pool, Queryable } from '../../database/pool.js';

/**
 * Transactional outbox (ADR 0010).
 *
 * Producer: enqueueOutbox(tx, …) inside the SAME transaction as the state change. If that transaction rolls back, the
 * message never existed. (topic, dedupe_key) is UNIQUE: enqueueing the same logical message twice creates one row.
 *
 * Dispatcher: claims due messages with FOR UPDATE SKIP LOCKED and a lease (competing workers never claim the same row),
 * delivers OUTSIDE any transaction, then completes with a fenced UPDATE (state = 'processing' AND attempts = the claimed
 * attempt). A worker that dies mid-delivery leaves the row 'processing'; once its lease expires another worker reclaims
 * it. Delivery is therefore AT-LEAST-ONCE, never exactly-once: handlers must be idempotent (consumeOnce() for effects in
 * this database; the dedupe key as the provider idempotency key for external providers).
 */

export interface OutboxMessage {
  id: string;
  topic: string;
  dedupeKey: string;
  payload: Record<string, unknown>;
  attempt: number;
  maxAttempts: number;
  createdAt: Date;
}

/** Thrown by a handler for a message that can never succeed (malformed payload): dead-lettered at once, no retries. */
export class PermanentDeliveryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PermanentDeliveryError';
  }
}

export type OutboxHandler = (message: OutboxMessage) => Promise<void>;

export interface EnqueueInput {
  topic: string;
  dedupeKey: string;
  payload?: Record<string, unknown>;
  maxAttempts?: number;
  /** Earliest delivery time; default: now (database clock). */
  availableAt?: Date;
  request?: { requestId?: string; correlationId?: string };
}

export async function enqueueOutbox(tx: Queryable, m: EnqueueInput): Promise<{ id: string | null; created: boolean }> {
  const r = await tx.query<{ id: string }>(
    `INSERT INTO outbox_message (topic, dedupe_key, payload, max_attempts, available_at, request_id, correlation_id)
     VALUES ($1, $2, $3, $4, COALESCE($5, now()), $6, $7)
     ON CONFLICT ON CONSTRAINT outbox_message_dedupe_uq DO NOTHING
     RETURNING id`,
    [
      m.topic,
      m.dedupeKey,
      JSON.stringify(m.payload ?? {}),
      m.maxAttempts ?? 8,
      m.availableAt ?? null,
      m.request?.requestId ?? null,
      m.request?.correlationId ?? null,
    ],
  );
  return r.rows[0] ? { id: r.rows[0].id, created: true } : { id: null, created: false };
}

/**
 * Idempotent-consumer guard for effects inside this database. Call in the effect's transaction; returns false when this
 * consumer already processed the message (the effect must then be skipped).
 */
export async function consumeOnce(tx: Queryable, consumer: string, messageId: string): Promise<boolean> {
  const r = await tx.query(
    `INSERT INTO outbox_consumption (consumer, message_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [consumer, messageId],
  );
  return (r.rowCount ?? 0) === 1;
}

export interface BackoffPolicy {
  baseMs: number;
  maxMs: number;
}

/** Bounded exponential backoff with up to 20 % jitter: base·2^(attempt−1), capped at max. */
export function backoffMs(attempt: number, p: BackoffPolicy, random: () => number = Math.random): number {
  const raw = Math.min(p.maxMs, p.baseMs * 2 ** Math.max(0, attempt - 1));
  return Math.round(raw * (0.8 + 0.2 * random()));
}

/** Last-error text kept on the row: error name and message only, single line, bounded. Handlers must not put personal
 * data in error messages. */
export function sanitizeError(err: unknown): string {
  const e = err instanceof Error ? `${err.name}: ${err.message}` : String(err);
  return e.replace(/\s+/g, ' ').slice(0, 500);
}

export interface DispatchResult {
  claimed: number;
  delivered: number;
  retried: number;
  deadLettered: number;
  lostLease: number;
}

export interface DispatcherOptions {
  workerId: string;
  leaseSeconds: number;
  batchSize?: number;
  backoff?: BackoffPolicy;
}

export class OutboxDispatcher {
  private readonly batchSize: number;
  private readonly backoff: BackoffPolicy;

  constructor(
    private readonly pool: Pool,
    private readonly handlers: Readonly<Record<string, OutboxHandler>>,
    private readonly opts: DispatcherOptions,
  ) {
    this.batchSize = opts.batchSize ?? 20;
    this.backoff = opts.backoff ?? { baseMs: 5_000, maxMs: 30 * 60_000 };
  }

  /** Claims due messages for the topics this dispatcher handles. Unhandled topics stay pending. */
  async claim(): Promise<OutboxMessage[]> {
    const topics = Object.keys(this.handlers);
    if (topics.length === 0) return [];
    const r = await this.pool.query<{
      id: string;
      topic: string;
      dedupe_key: string;
      payload: Record<string, unknown>;
      attempts: number;
      max_attempts: number;
      created_at: Date;
    }>(
      `WITH c AS (
         SELECT id FROM outbox_message
          WHERE topic = ANY($1::text[])
            AND ((state IN ('pending', 'failed') AND available_at <= now())
                 OR (state = 'processing' AND locked_until < now()))
          ORDER BY available_at, id
          LIMIT $2
          FOR UPDATE SKIP LOCKED)
       UPDATE outbox_message m
          SET state = 'processing', locked_by = $3, locked_until = now() + make_interval(secs => $4),
              attempts = m.attempts + 1, last_attempt_at = now()
         FROM c WHERE m.id = c.id
       RETURNING m.id, m.topic, m.dedupe_key, m.payload, m.attempts, m.max_attempts, m.created_at`,
      [topics, this.batchSize, this.opts.workerId, this.opts.leaseSeconds],
    );
    return r.rows.map((x) => ({
      id: x.id,
      topic: x.topic,
      dedupeKey: x.dedupe_key,
      payload: x.payload,
      attempt: x.attempts,
      maxAttempts: x.max_attempts,
      createdAt: x.created_at,
    }));
  }

  /** One dispatch pass: claim, deliver each message, record the outcome. */
  async runOnce(): Promise<DispatchResult> {
    const res: DispatchResult = { claimed: 0, delivered: 0, retried: 0, deadLettered: 0, lostLease: 0 };
    const batch = await this.claim();
    res.claimed = batch.length;
    for (const m of batch) {
      const outcome = await this.deliver(m);
      res[outcome]++;
    }
    return res;
  }

  async deliver(m: OutboxMessage): Promise<'delivered' | 'retried' | 'deadLettered' | 'lostLease'> {
    if (m.attempt > m.maxAttempts) {
      // Reclaimed after expired leases more times than allowed (e.g. a handler that crashes the worker).
      return this.fail(m, new Error('attempts exhausted (lease expired repeatedly)'), true);
    }
    try {
      await this.handlers[m.topic]!(m);
    } catch (err) {
      return this.fail(m, err, err instanceof PermanentDeliveryError);
    }
    const r = await this.pool.query(
      `UPDATE outbox_message
          SET state = 'delivered', delivered_at = now(), locked_by = NULL, locked_until = NULL, last_error = NULL
        WHERE id = $1 AND state = 'processing' AND attempts = $2`,
      [m.id, m.attempt],
    );
    return (r.rowCount ?? 0) === 1 ? 'delivered' : 'lostLease';
  }

  private async fail(m: OutboxMessage, err: unknown, permanent: boolean): Promise<'retried' | 'deadLettered' | 'lostLease'> {
    const dead = permanent || m.attempt >= m.maxAttempts;
    const delay = backoffMs(m.attempt, this.backoff);
    const r = await this.pool.query<{ state: string }>(
      `UPDATE outbox_message
          SET state = CASE WHEN $3 THEN 'dead_letter' ELSE 'failed' END,
              dead_lettered_at = CASE WHEN $3 THEN now() ELSE NULL END,
              available_at = CASE WHEN $3 THEN available_at ELSE now() + make_interval(secs => $4::double precision / 1000) END,
              last_error = $5, locked_by = NULL, locked_until = NULL
        WHERE id = $1 AND state = 'processing' AND attempts = $2
        RETURNING state`,
      [m.id, m.attempt, dead, delay, sanitizeError(err)],
    );
    if (!r.rows[0]) return 'lostLease';
    return dead ? 'deadLettered' : 'retried';
  }
}

export interface OutboxHealth {
  counts: Record<string, number>;
  oldestDueSeconds: number | null;
  stuckProcessing: number;
}

export async function outboxHealth(db: Queryable): Promise<OutboxHealth> {
  const c = await db.query<{ state: string; n: number }>(`SELECT state, count(*)::int AS n FROM outbox_message GROUP BY state`);
  const o = await db.query<{ oldest: number | null; stuck: number }>(
    `SELECT extract(epoch FROM now() - min(available_at) FILTER (WHERE state IN ('pending', 'failed') AND available_at <= now()))::int AS oldest,
            count(*) FILTER (WHERE state = 'processing' AND locked_until < now())::int AS stuck
       FROM outbox_message`,
  );
  const counts: Record<string, number> = { pending: 0, processing: 0, delivered: 0, failed: 0, dead_letter: 0 };
  for (const row of c.rows) counts[row.state] = row.n;
  return { counts, oldestDueSeconds: o.rows[0]?.oldest ?? null, stuckProcessing: o.rows[0]?.stuck ?? 0 };
}
