# ADR 0010: Transactional outbox and database-backed jobs

- Status: Accepted for Stage 1B

## Decision

- **No broker.** The outbox and jobs live in PostgreSQL (P10 §G), next to the data they change. A **worker** is a second entry point of the same codebase (`npm run worker`); it is not a separate service.
- **Outbox (`outbox_message`).**
  - `enqueueOutbox(tx, …)` runs in the **same transaction** as the state change and its audit row, so a rollback leaves neither.
  - `UNIQUE (topic, dedupe_key)` removes duplicates.
  - States: `pending → processing → delivered | failed (retry scheduled) | dead_letter`.
- **Jobs (`job_run`).**
  - Durable identity `UNIQUE (job_name, run_key)`.
  - Recurring jobs insert their current slot. The slot is `floor(now/every)·every`, computed with the **database clock** (UTC), and the ISO instant is the run key. Any number of schedulers can run; repeats are no-ops.
  - States: `pending → running → succeeded | failed (retry scheduled) | dead`.
- **Claiming** (both).
  - `FOR UPDATE SKIP LOCKED` plus a lease (`locked_by`, `locked_until`). Competing workers never take the same row, and an expired lease, from a crashed or hung worker, makes the row claimable again.
  - The external work happens **outside** any transaction and holds no locks (production-transaction-rules §1.3 rule 3).
  - Completion is **fenced** by the attempt number, so a late worker cannot overwrite a newer attempt.
- **Retries.**
  - Bounded exponential backoff with jitter: outbox 5 s → 30 min; jobs 10 s → 60 min.
  - `attempts`, `last_attempt_at` and `last_error` (sanitised: name and message only, ≤ 500 characters) are recorded.
  - After `max_attempts` (or a `PermanentDeliveryError`) the row is `dead_letter` / `dead`. It stays visible in `GET /v1/ops/status` until a Super Administrator requeues it (`POST /v1/ops/{outbox|jobs}/:id/requeue`, reason required, audited).
- **Delivery semantics: at-least-once, never exactly-once.** Consumers are idempotent:
  - inside this database: `consumeOnce(tx, consumer, message_id)` in the effect's transaction;
  - external providers: the dedupe key is passed as the provider's idempotency key.
- **Notifications.**
  - `notification.email` and `notification.sms` go through a `NotificationProvider` interface. No provider has been chosen.
  - With `NOTIFICATION_TRANSPORT=none` (the default), these messages simply wait in the outbox.
  - `capture` is a development/test transport and is refused in production configuration.
- **Domain job extension points** (`DOMAIN_JOB_EXTENSION_POINTS`): `deposit.deadline_check`, `reservation.cutoff_release`, `entitlement.expiry`, `finance.overdue_check`, `payment.reminder`.
  - The names are reserved. Registering one throws unless explicitly allowed (Stage 2).
  - **No business rule is implemented.**
- **Built-in maintenance jobs.**
  - idempotency purge (hourly), auth-record purge (hourly), rate-limit purge (every 10 minutes), outbox and job-run purge (daily);
  - each runs through a SECURITY DEFINER function (ADR 0011).

## Consequences

- A dedupe key protects only while its row is retained (default 30 days after delivery). "Sent once" guarantees for business reminders belong in domain tables (P7 sent-keys), not only in the outbox.
- Each worker pass is a few short queries. Scale by running more workers; the claims already handle competition.
- Monitoring and alerting on `dead`/`dead_letter` counts and the oldest-due age need a metrics or alerting tool (not chosen).
