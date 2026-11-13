import type { Pool, PoolClient } from './pool.js';

/**
 * One request = one transaction (P10 §D). The callback receives a dedicated client; COMMIT on success, ROLLBACK on any
 * error. Serialization failures (40001) and deadlocks (40P01) are retried up to `retries` times with jitter. Deadlocks are a
 * symptom of breaking the lock-ordering rule in docs/production-transaction-rules.md; retrying is a safety net only.
 */

export type IsolationLevel = 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';

export interface TransactionOptions {
  isolation?: IsolationLevel;
  retries?: number;
  /** SET LOCAL lock_timeout for this transaction (ms). */
  lockTimeoutMs?: number;
}

const RETRYABLE = new Set(['40001', '40P01']);

export function isRetryable(err: unknown): boolean {
  return typeof err === 'object' && err !== null && RETRYABLE.has((err as { code?: string }).code ?? '');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withTransaction<T>(
  pool: Pool,
  fn: (client: PoolClient) => Promise<T>,
  opts: TransactionOptions = {},
): Promise<T> {
  const isolation = opts.isolation ?? 'READ COMMITTED';
  const retries = opts.retries ?? 3;
  for (let attempt = 0; ; attempt++) {
    const client = await pool.connect();
    let broken = false;
    try {
      await client.query(`BEGIN ISOLATION LEVEL ${isolation}`);
      if (opts.lockTimeoutMs !== undefined) {
        await client.query(`SET LOCAL lock_timeout = ${Math.max(0, Math.floor(opts.lockTimeoutMs))}`);
      }
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      try {
        await client.query('ROLLBACK');
      } catch {
        broken = true; // connection unusable; destroy it instead of returning it to the pool
      }
      if (attempt < retries && isRetryable(err)) {
        await sleep(20 * 2 ** attempt + Math.floor(Math.random() * 25));
        continue;
      }
      throw err;
    } finally {
      client.release(broken);
    }
  }
}
