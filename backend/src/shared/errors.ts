/**
 * One error type for every refusal the API returns on purpose. The HTTP error handler renders it as
 *   { "error": { "code", "message", "requestId", "details"? } }
 * Anything that is not an AppError becomes a generic 500 with no internal detail.
 */

export type ErrorCode =
  | 'VALIDATION_FAILED'
  | 'MALFORMED_REQUEST'
  | 'UNAUTHENTICATED'
  | 'FORBIDDEN'
  | 'ACCOUNT_NOT_PROVISIONED'
  | 'ACCOUNT_INACTIVE'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'IDEMPOTENCY_KEY_REQUIRED'
  | 'IDEMPOTENCY_KEY_INVALID'
  | 'IDEMPOTENCY_KEY_REUSED'
  | 'PAYLOAD_TOO_LARGE'
  | 'UNSUPPORTED_MEDIA_TYPE'
  | 'SERVICE_UNAVAILABLE'
  | 'RATE_LIMITED'
  | 'CSRF_FAILED'
  | 'LOGIN_FAILED'
  // Stage 2A domain refusals (programmes, batches, seats). Stable: clients and later stages rely on them.
  | 'BATCH_FULL'
  | 'BATCH_NOT_ELIGIBLE'
  | 'ALLOCATION_ALREADY_EXISTS'
  | 'ALLOCATION_NOT_FOUND'
  | 'CAPACITY_CONFLICT'
  | 'PROGRAMME_VERSION_MISMATCH'
  | 'INVALID_STATE_TRANSITION'
  | 'STAFF_ALLOCATION_CONFLICT'
  | 'IMMUTABLE_RECORD'
  | 'STALE_RESOURCE'
  // Stage 2B: learner applications, batch selection and enrolment confirmation.
  | 'LEARNER_PROFILE_REQUIRED'
  | 'APPLICATION_ALREADY_OPEN'
  | 'APPLICATION_INCOMPLETE'
  | 'ACADEMIC_APPROVAL_REQUIRED'
  | 'COMMENCEMENT_UNRESOLVED'
  | 'ADMISSION_DOCUMENTS_REQUIRED'
  | 'SIGNED_AGREEMENT_REQUIRED'
  | 'FINANCE_AUTHORIZATION_REQUIRED'
  | 'INTERNAL';

export interface ErrorDetail {
  path?: string;
  message: string;
}

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: ErrorDetail[],
    public readonly headers?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export const errors = {
  validation: (details: ErrorDetail[], message = 'The request is not valid.') =>
    new AppError(400, 'VALIDATION_FAILED', message, details),
  unauthenticated: (message = 'Authentication is required.', wwwAuthenticate = 'Bearer') =>
    new AppError(401, 'UNAUTHENTICATED', message, undefined, { 'WWW-Authenticate': wwwAuthenticate }),
  forbidden: (message = 'You are not allowed to perform this action.') => new AppError(403, 'FORBIDDEN', message),
  notProvisioned: () =>
    new AppError(403, 'ACCOUNT_NOT_PROVISIONED', 'This sign-in is not linked to an Ilumin Academy account.'),
  inactive: () => new AppError(403, 'ACCOUNT_INACTIVE', 'This account is not active.'),
  notFound: (message = 'Not found.') => new AppError(404, 'NOT_FOUND', message),
  conflict: (message: string) => new AppError(409, 'CONFLICT', message),
  unavailable: (message = 'The service is temporarily unavailable.') =>
    new AppError(503, 'SERVICE_UNAVAILABLE', message, undefined, { 'Retry-After': '5' }),
  rateLimited: (retryAfterSeconds: number) =>
    new AppError(429, 'RATE_LIMITED', 'Too many requests. Try again later.', undefined, {
      'Retry-After': String(Math.max(1, Math.ceil(retryAfterSeconds))),
    }),
  csrf: () =>
    new AppError(403, 'CSRF_FAILED', 'This request was refused by cross-site request protection. Reload the page and try again.'),
  /** A domain refusal with a stable code (Stage 2A). */
  domain: (status: 404 | 409 | 422, code: ErrorCode, message: string, details?: ErrorDetail[]) =>
    new AppError(status, code, message, details),
  /** One message for every sign-in failure: it never says whether an account exists or why the provider refused. */
  loginFailed: () =>
    new AppError(400, 'LOGIN_FAILED', 'Sign-in could not be completed. Start again from the sign-in page.'),
};
