# ADR 0003: PostgreSQL access, roles and forward-only SQL migrations

- Status: Accepted for Stage 1A

## Decision

- **Driver: `pg` (node-postgres), no ORM.** Domain transactions need explicit `SELECT … FOR UPDATE`, partial unique indexes and CHECK constraints (P10 §D). Plain SQL keeps those visible and reviewable.
- **Transactions**: `withTransaction()` runs one request in one transaction. It defaults to READ COMMITTED, with optional `lock_timeout`. It retries 40001 and 40P01 up to 3 times with jitter.
- **Migrations**: plain SQL files `migrations/NNNN_name.sql`, applied by a small runner (`src/database/migrate.ts`). The runner works as follows:
  - Each file runs in its own transaction.
  - The SHA-256 checksum of each applied file is recorded in `schema_migration`.
  - An applied file that was later edited, a missing file, or an out-of-order file stops the run.
  - A session advisory lock serialises concurrent runners.
  - Migrations are forward-only: corrections are new migrations.
  - A dedicated library would add little over these ~150 lines, and this way the rules are explicit.
- **Three database roles** (created by operations, not by migrations):

  | Role | Login | Used by | Privileges |
  |---|---|---|---|
  | `ilumin_app` | no | group role | `SELECT/INSERT/UPDATE` on foundation tables; `SELECT/INSERT` only on `audit_event`; no `DELETE`, `TRUNCATE` or DDL anywhere |
  | `ilumin_owner` (any name) | yes | `npm run migrate` only | owns the schema |
  | `ilumin_api` (any name) | yes | the API process (`DATABASE_URL`) | member of `ilumin_app` |

  Migration 0001 refuses to run if `ilumin_app` does not exist.
- **IDs and time**: `uuid` primary keys (`gen_random_uuid()`) and `timestamptz` columns. Human references stay separate `UNIQUE` columns (e.g. `agency.ref`).
- **TLS**: `DATABASE_SSL` defaults to `verify-full`. Production refuses `disable`.

## Consequences

- The API process cannot delete history, change audit rows or alter the schema, even if it is compromised.
- Stage 2 adds foreign keys from `staff_scope.scope_id` to `batch` and learner tables when those tables exist.
- Purging expired idempotency records needs a separate maintenance role. That role is not part of Stage 1A.
