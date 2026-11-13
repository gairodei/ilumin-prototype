import { createHash } from 'node:crypto';
import type { PoolClient, Queryable } from '../database/pool.js';
import { AppError } from './errors.js';

/**
 * Idempotency foundation (ADR 0007) for future financial and enrolment operations.
 *
 * Scope: (authenticated principal, operation, Idempotency-Key). The request fingerprint is a SHA-256 of the canonical
 * JSON of the operation's input. Usage, inside the operation's own transaction:
 *
 *   const claim = await claimIdempotency(tx, {...});
 *   if (claim.kind === 'replay') return claim.response;      // same request seen before: stored result, no writes
 *   ...business writes + audit...
 *   await completeIdempotency(tx, claim.recordId, response); // stored in the same transaction
 *
 * Concurrency: the INSERT … ON CONFLICT DO NOTHING waits on the unique index while another transaction holds an
 * uncommitted row with the same scope. If that transaction commits, this one sees the completed record and replays it;
 * if it rolls back, this one inserts and executes. So exactly one execution commits, with no "in progress" polling.
 * A failed operation leaves no record (its transaction rolled back), so a retry executes again.
 */

export const IDEMPOTENCY_HEADER = 'idempotency-key';

/**
 * Lifecycle (ADR 0011):
 *  - 'response_cache': a temporary replay cache. Expires after IDEMPOTENCY_RETENTION_HOURS and may then be purged; a key
 *    reused after the purge executes again. Acceptable only where re-execution is harmless or caught by a domain
 *    constraint.
 *  - 'permanent': never expires, never purged. Mandatory for financial operations (FINANCIAL_OPERATION_PREFIXES).
 * In both cases the financial guarantee itself is a UNIQUE business key in the domain table (Stage 2), not this record.
 */
export type RetentionClass = 'response_cache' | 'permanent';

/** Operation-name prefixes that move money, seats or entitlements. Their idempotency records are permanent. */
export const FINANCIAL_OPERATION_PREFIXES = [
  'payment.',
  'payments.',
  'refund.',
  'refunds.',
  'deposit.',
  'deposits.',
  'invoice.',
  'invoices.',
  'receipt.',
  'receipts.',
  'arrangement.',
  'arrangements.',
  'entitlement.',
  'entitlements.',
  'bundle.',
  'bundles.',
  'reservation.',
  'reservations.',
  'seat.',
  'seats.',
  'enrolment.',
  'enrolments.',
  'forfeiture.',
  'transfer.',
  'transfers.',
] as const;

export const isFinancialOperation = (operation: string): boolean =>
  FINANCIAL_OPERATION_PREFIXES.some((p) => operation.startsWith(p));
const KEY_RE = /^[A-Za-z0-9_.:-]{8,255}$/;

export interface StoredResponse {
  status: number;
  body: unknown;
}

export type Claim = { kind: 'new'; recordId: string } | { kind: 'replay'; response: StoredResponse };

export function validateIdempotencyKey(raw: unknown): string {
  if (raw === undefined || raw === null || raw === '') {
    throw new AppError(400, 'IDEMPOTENCY_KEY_REQUIRED', 'This operation requires an Idempotency-Key header.');
  }
  if (typeof raw !== 'string' || !KEY_RE.test(raw)) {
    throw new AppError(
      400,
      'IDEMPOTENCY_KEY_INVALID',
      'Idempotency-Key must be 8–255 characters of letters, digits, "_", "-", "." or ":".',
    );
  }
  return raw;
}

/** Canonical JSON: object keys sorted recursively, so semantically equal inputs share a fingerprint. */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value ?? null);
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${canonicalJson(v)}`).join(',')}}`;
}

export function fingerprint(input: unknown): string {
  return createHash('sha256').update(canonicalJson(input)).digest('hex');
}

export interface ClaimInput {
  principalUserId: string;
  operation: string;
  key: string;
  fingerprint: string;
  retentionHours: number;
  retentionClass?: RetentionClass;
}

export async function claimIdempotency(tx: PoolClient, input: ClaimInput): Promise<Claim> {
  const retention = input.retentionClass ?? 'response_cache';
  if (isFinancialOperation(input.operation) && retention !== 'permanent') {
    throw new Error(`idempotency for financial operation ${input.operation} must use retention class "permanent"`);
  }
  // Two passes: if the conflicting record is purged between the INSERT and the SELECT (an expired response cache), the
  // key is free again and the second INSERT claims it.
  for (let pass = 0; pass < 2; pass++) {
    const inserted = await tx.query<{ id: string }>(
      `INSERT INTO idempotency_record
         (principal_user_id, operation, idempotency_key, request_fingerprint, retention_class, expires_at)
       VALUES ($1, $2, $3, $4, $5, CASE WHEN $5 = 'permanent' THEN NULL ELSE now() + make_interval(hours => $6) END)
       ON CONFLICT ON CONSTRAINT idempotency_record_scope_uq DO NOTHING
       RETURNING id`,
      [input.principalUserId, input.operation, input.key, input.fingerprint, retention, input.retentionHours],
    );
    if (inserted.rows[0]) return { kind: 'new', recordId: inserted.rows[0].id };
    const found = await readExisting(tx, input);
    if (found) return found;
  }
  throw new AppError(409, 'CONFLICT', 'A request with this Idempotency-Key is still being processed. Retry later.');
}

async function readExisting(tx: PoolClient, input: ClaimInput): Promise<Claim | null> {
  const existing = await tx.query<{
    request_fingerprint: string;
    response_status: number | null;
    response_body: unknown;
  }>(
    `SELECT request_fingerprint, response_status, response_body FROM idempotency_record
      WHERE principal_user_id = $1 AND operation = $2 AND idempotency_key = $3`,
    [input.principalUserId, input.operation, input.key],
  );
  const row = existing.rows[0];
  if (!row) return null; // purged after the conflict was seen
  if (row.response_status === null) {
    // Cannot happen with single-transaction claims (an uncommitted row is never visible); fail safe if it does.
    throw new AppError(409, 'CONFLICT', 'A request with this Idempotency-Key is still being processed. Retry later.');
  }
  if (row.request_fingerprint.trim() !== input.fingerprint) {
    throw new AppError(
      422,
      'IDEMPOTENCY_KEY_REUSED',
      'This Idempotency-Key was already used for a different request. Use a new key for a new request.',
    );
  }
  return { kind: 'replay', response: { status: row.response_status, body: row.response_body } };
}

/** Purges expired response-cache records in batches (maintenance job). Never touches permanent records. */
export async function purgeExpiredIdempotency(db: Queryable, batchSize = 1000, maxBatches = 50): Promise<number> {
  let total = 0;
  for (let i = 0; i < maxBatches; i++) {
    const r = await db.query<{ n: number }>(`SELECT purge_expired_idempotency_records($1) AS n`, [batchSize]);
    const n = r.rows[0]?.n ?? 0;
    total += n;
    if (n < batchSize) break;
  }
  return total;
}

export async function completeIdempotency(tx: PoolClient, recordId: string, response: StoredResponse): Promise<void> {
  await tx.query(
    `UPDATE idempotency_record SET response_status = $2, response_body = $3, completed_at = now() WHERE id = $1`,
    [recordId, response.status, JSON.stringify(response.body ?? null)],
  );
}
