import { createHash } from 'node:crypto';
import type { RateRule } from '../config/config.js';
import type { Queryable } from '../database/pool.js';
import { errors } from './errors.js';

/**
 * Rate limiting (ADR 0009). Two tiers, chosen for cost versus correctness:
 *
 *  - DbRateLimiter: fixed windows in PostgreSQL (UNLOGGED table, one UPSERT per counted event), shared by every API
 *    instance. Used where the limit is a security control: sign-in initiation, sign-in callback failures and sensitive
 *    account operations. Correct across instances and restarts (except after a database crash, which resets windows).
 *  - MemoryRateLimiter: per-process fixed windows for general authenticated API traffic. No database cost per request,
 *    but the effective limit is (limit × instances). It dampens abuse; it is not relied on for security.
 *
 * Keys are hashed before storage so client IP addresses are not kept in clear. The client IP comes from request.ip,
 * which honours X-Forwarded-For only from proxies listed in TRUST_PROXY.
 */

export interface RateDecision {
  allowed: boolean;
  hits: number;
  retryAfterSeconds: number;
}

const keyHash = (key: string) => createHash('sha256').update(key).digest();

export class DbRateLimiter {
  constructor(private readonly db: Queryable) {}

  /** Counts one event and reports whether it is within the limit. */
  async hit(key: string, rule: RateRule): Promise<RateDecision> {
    const r = await this.db.query<{ hits: number; reset_in: number }>(
      `INSERT INTO rate_limit_counter AS c (key_hash, window_start, window_seconds, hits)
       VALUES ($1, to_timestamp(floor(extract(epoch FROM now()) / $2) * $2), $2, 1)
       ON CONFLICT (key_hash, window_start) DO UPDATE SET hits = c.hits + 1
       RETURNING c.hits, ceil(extract(epoch FROM (c.window_start + make_interval(secs => c.window_seconds) - now())))::int AS reset_in`,
      [keyHash(key), rule.windowSeconds],
    );
    const row = r.rows[0]!;
    return { allowed: row.hits <= rule.limit, hits: row.hits, retryAfterSeconds: Math.max(1, row.reset_in) };
  }

  /** Reads the current window without counting (used to stop work once failures have reached the limit). */
  async peek(key: string, rule: RateRule): Promise<RateDecision> {
    const r = await this.db.query<{ hits: number; reset_in: number }>(
      `SELECT hits, ceil(extract(epoch FROM (window_start + make_interval(secs => window_seconds) - now())))::int AS reset_in
         FROM rate_limit_counter
        WHERE key_hash = $1 AND window_start = to_timestamp(floor(extract(epoch FROM now()) / $2) * $2)`,
      [keyHash(key), rule.windowSeconds],
    );
    const row = r.rows[0];
    if (!row) return { allowed: true, hits: 0, retryAfterSeconds: 0 };
    return { allowed: row.hits < rule.limit, hits: row.hits, retryAfterSeconds: Math.max(1, row.reset_in) };
  }

  async enforce(key: string, rule: RateRule): Promise<void> {
    const d = await this.hit(key, rule);
    if (!d.allowed) throw errors.rateLimited(d.retryAfterSeconds);
  }
}

export class MemoryRateLimiter {
  private readonly windows = new Map<string, { start: number; hits: number }>();

  constructor(
    private readonly maxKeys = 50_000,
    private readonly now: () => number = Date.now,
  ) {}

  hit(key: string, rule: RateRule): RateDecision {
    const t = this.now();
    const windowMs = rule.windowSeconds * 1000;
    const start = Math.floor(t / windowMs) * windowMs;
    let w = this.windows.get(key);
    if (!w || w.start !== start) {
      if (this.windows.size >= this.maxKeys) this.sweep(t, windowMs);
      w = { start, hits: 0 };
      this.windows.set(key, w);
    }
    w.hits++;
    return { allowed: w.hits <= rule.limit, hits: w.hits, retryAfterSeconds: Math.max(1, Math.ceil((start + windowMs - t) / 1000)) };
  }

  enforce(key: string, rule: RateRule): void {
    const d = this.hit(key, rule);
    if (!d.allowed) throw errors.rateLimited(d.retryAfterSeconds);
  }

  private sweep(t: number, windowMs: number): void {
    for (const [k, w] of this.windows) if (w.start + windowMs <= t) this.windows.delete(k);
    // Still full (a flood of distinct keys): drop the oldest entries rather than grow without bound.
    if (this.windows.size >= this.maxKeys) {
      let n = Math.ceil(this.maxKeys / 10);
      for (const k of this.windows.keys()) {
        if (n-- <= 0) break;
        this.windows.delete(k);
      }
    }
  }
}

export interface RateLimiters {
  db: DbRateLimiter;
  memory: MemoryRateLimiter;
}
