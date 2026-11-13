# ADR 0007: Idempotency inside the operation's transaction

- Status: Accepted for Stage 1A

## Decision

- **Scope**: `(principal_user_id, operation, idempotency_key)` is UNIQUE. The key comes from the `Idempotency-Key` header: 8–255 characters of `[A-Za-z0-9_.:-]`. It is required on routes declared `idempotent`.
- **Fingerprint**: SHA-256 of the canonical JSON (sorted keys) of `{route, params, query, body}`.
- **Mechanism** (`src/shared/idempotency.ts`, wired in `route.ts`). Within the operation's own transaction:
  1. `INSERT … ON CONFLICT DO NOTHING` claims the key.
  2. The handler runs.
  3. The response status and body are stored on the record.
  4. Commit.
- **Concurrency**: a concurrent duplicate blocks on the unique index until the first transaction ends.
  - If the first committed, the duplicate replays the stored response (`Idempotent-Replayed: true`) and writes nothing.
  - If the first rolled back, the duplicate executes.
  - So exactly one execution commits, with no "in progress" polling (tested with 12 parallel requests and with a forced rollback).
- **Conflicts**: the same key with a different fingerprint returns `422 IDEMPOTENCY_KEY_REUSED` and changes nothing.
- **Failures**: a failed operation leaves no record, so a corrected retry executes.
- **Immutability**: a completed record cannot be changed (trigger, owner included).
- **Retention**: `expires_at` is set from `IDEMPOTENCY_RETENTION_HOURS` (default 168). Records stay authoritative until purged. Purging is a later maintenance job under a separate role.

## Consequences for later stages

- Each financial or enrolment operation chooses its operation name. Domain keys from P10 §D (e.g. bank reference, `(reservation id, learner id)`) are enforced by **domain UNIQUE constraints in addition** to this request-level key.
- An operation whose response must not be replayed to a different caller is safe: replay is per principal.
