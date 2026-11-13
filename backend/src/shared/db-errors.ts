import { AppError, errors } from './errors.js';

/**
 * Maps PostgreSQL errors that carry a domain meaning to stable API errors. Everything else stays an internal error.
 *
 * Domain triggers (migration 0007) raise SQLSTATE class "IL"; the message text is never shown to the client (it may name
 * internal identifiers), only the stable code and a fixed message.
 */

const DOMAIN: Record<string, { status: 400 | 403 | 404 | 409 | 422; code: ConstructorParameters<typeof AppError>[1]; message: string }> = {
  IL001: { status: 409, code: 'CAPACITY_CONFLICT', message: 'The change conflicts with the batch capacity.' },
  IL002: { status: 409, code: 'INVALID_STATE_TRANSITION', message: 'This change is not allowed in the current state.' },
  IL003: {
    status: 409,
    code: 'STAFF_ALLOCATION_CONFLICT',
    message: 'This person cannot hold that role on the batch (Coordinator / Assessor / IQA separation).',
  },
  IL004: { status: 409, code: 'PROGRAMME_VERSION_MISMATCH', message: 'The programme version does not match.' },
  IL005: { status: 409, code: 'IMMUTABLE_RECORD', message: 'This record can no longer be changed.' },
  IL006: { status: 409, code: 'BATCH_NOT_ELIGIBLE', message: 'The batch or fee option is not eligible for this change.' },
  IL007: { status: 400, code: 'VALIDATION_FAILED', message: 'The request is not valid.' },
  // Stage 2B (migration 0008): ownership / self-decision refused by the database. IL009 (test-only evidence outside a
  // test database) is deliberately not mapped: it can only be a defect, and stays a generic 500.
  IL008: { status: 403, code: 'FORBIDDEN', message: 'You are not allowed to perform this action.' },
};

export const pgCode = (err: unknown): string | undefined =>
  typeof err === 'object' && err !== null && typeof (err as { code?: unknown }).code === 'string'
    ? (err as { code: string }).code
    : undefined;

/** The constraint a unique / FK / check violation names, if any. */
export const pgConstraint = (err: unknown): string | undefined =>
  typeof err === 'object' && err !== null ? ((err as { constraint?: string }).constraint ?? undefined) : undefined;

export function mapDatabaseError(err: unknown): AppError | null {
  const code = pgCode(err);
  if (!code) return null;
  const d = DOMAIN[code];
  if (d) return new AppError(d.status, d.code, d.message);
  // Lock wait exceeded (production-transaction-rules §1.3 rule 4), or serialization / deadlock retries exhausted: the
  // transaction was rolled back completely; the client may retry.
  if (code === '55P03' || code === '40001' || code === '40P01') {
    return errors.unavailable('The resource is busy. Retry shortly.');
  }
  return null;
}
