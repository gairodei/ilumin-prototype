# ADR 0011: Idempotency lifecycle and privilege-limited purging

- Status: Accepted for Stage 1B (extends ADR 0007)

## Decision

- **Two retention classes** on `idempotency_record`:
  - `response_cache`: a temporary HTTP replay cache. It expires after `IDEMPOTENCY_RETENTION_HOURS` (default 7 days, an operational default) and may then be purged. A key reused after the purge **executes again**.
  - `permanent`: `expires_at IS NULL`; it is never purged.
  - The class and expiry are fixed when the record is created; a trigger refuses changes.
- **Financial operations must be permanent.** Operation names starting with a financial prefix are refused at route registration and again at claim time unless their retention is `permanent`. The prefixes are `payment.`, `refund.`, `deposit.`, `invoice.`, `receipt.`, `arrangement.`, `entitlement.`, `bundle.`, `reservation.`, `seat.`, `enrolment.`, `forfeiture.` and `transfer.`, plus their plurals.
- **The idempotency record is not the financial guarantee.** Stage 2 domain tables carry their own database constraints, so a lost or purged record can never let a money, seat or entitlement effect happen twice. The constraints are in production-transaction-rules §4:
  - `UNIQUE (provider, provider_event_id)`;
  - `UNIQUE` provider payment and refund ids;
  - `UNIQUE (bundle, enrolment)` for entitlement consumption;
  - `UNIQUE` reservation keys and seat partial-uniques.
- **Purging without DELETE rights.** The API/worker role has no `DELETE` on any table. Retention is applied only by SECURITY DEFINER functions owned by the schema owner:
  - `purge_expired_idempotency_records`;
  - `purge_expired_auth_records`;
  - `purge_expired_rate_limit_counters`;
  - `purge_delivered_outbox_messages`;
  - `purge_finished_job_runs`.

  Each one:
  - deletes only what its rule allows (completed and expired, past retention);
  - enforces minimum retention and maximum batch sizes;
  - uses `SKIP LOCKED`, so it never waits on, or races with, a transaction that is using a row;
  - has a pinned `search_path`;
  - is executable only by `ilumin_app`, never by `PUBLIC`.
- **Concurrent claim and purge.** If a conflicting record disappears between the conflict and the read, the claim retries the insert once. A record held by a transaction is never purged.

## Consequences

- Retention values (idempotency 7 days, sessions 30 days after ending, delivered outbox 30 days, succeeded job runs 30 days) are **operational defaults**. They are not Academy record-retention policy, which is still open (D-01).
- Audit events are never purged; there is no purge function for them.
