# Production transaction rules (corrections to P10 before Stage 2)

*Stage 1A, 12 Nov 2026. This amends `P10-PRODUCTION-ARCHITECTURE-AND-READINESS.md` §D (atomic transactions) for the server implementations of P1, P4, P6, P7, P8 and P9. Nothing here is built yet. These are binding design rules for Stage 2. The P10 document itself is unchanged; where the two disagree, this document wins.*

---

## 1. Deterministic lock ordering

### 1.1 Why a correction is needed

P10 §D gives each operation its own lock order, and two of them contradict each other:

| P10 §D operation | P10 order | Conflict |
|---|---|---|
| Reserve an unnamed agency seat | batch → bundle | — |
| Convert a reservation into enrolment | reservation → bundle → batch | **bundle before batch here, batch before bundle above** → a reserve and a conversion on the same bundle and batch can deadlock |
| Move a confirmed learner | both batches in id order | omits the enrolment row |
| Approve an agency arrangement | "the arrangement line and the invoice" | no order stated |

### 1.2 The global order

Every transaction acquires row locks **from the top of this list downwards, never upwards**. Within one level, rows are locked in ascending `id` (UUID byte order), using one statement with `ORDER BY id … FOR UPDATE`.

| Level | Rows | Notes |
|---|---|---|
| L0 | `idempotency_record` (the request's own claim) | Always the first statement of an idempotent operation (ADR 0007) |
| L1 | **Driver row** of the operation: `payment_provider_event` (inbox), `payment` / `receipt` being verified, `approval_request`, `job_run` | The row that says *why* the transaction runs. At most one per transaction |
| L2 | `invoice` (agency obligation) | |
| L3 | `arrangement` (governing line, then version rows) | |
| L4 | `bundle` (entitlement source) | |
| L5 | `reservation` | |
| L6 | `enrolment`, which also guards its children: `schedule_row`, `deposit`, `forfeiture`, `agreement` | Children are changed only while the enrolment row is held |
| L7 | `batch` (capacity authority) | Two batches (transfer, move): ascending `id` |
| L8 | `seat` rows | Existing seat rows only; new seats are inserted under the L7 lock |

Identity tables (`app_user`, `user_role`) are not part of domain transactions. Account administration locks the active Super Administrator grants and then the target user (`src/modules/users/routes.ts`).

### 1.3 Rules

1. **Discover, lock, re-check.** When the IDs to lock come from a row lower in the order (e.g. a reservation tells you its bundle and batch), proceed in three steps:
   1. Read it **without** locking.
   2. Lock in global order: bundle (L4) → reservation (L5) → batch (L7).
   3. Re-read the reservation under its lock. If its bundle, batch or state changed, release everything (rollback) and retry the operation from the start.
2. **Never acquire a higher-level lock after a lower one** in the same transaction. Code review rejects it; Stage 2 adds a test that runs each pair of operations concurrently on shared rows.
3. **No external call while holding a lock.** Payment provider, email, file storage and identity provider calls happen outside the transaction (§3).
4. **Bounded waiting.** Domain transactions set `lock_timeout` (start at 5 s). A timeout is a 503 with `Retry-After`, never a partial write.
5. **Deadlock retry is a safety net, not a design.** `withTransaction` retries 40P01/40001 up to 3 times. Every retry is logged with the operation name and treated as a defect to investigate.
6. **Jobs claim work with `FOR UPDATE SKIP LOCKED`** on their driver rows (L1) and then follow the same order.
7. **Capacity and counts are re-computed under the lock** (I-1, I-2). Values read before the lock are never trusted.

### 1.4 Operation-by-operation application

| Operation | Lock sequence | Change vs P10 |
|---|---|---|
| Allocate a batch seat (learner confirmation) | L0 → enrolment (L6) → batch (L7) | Enrolment added |
| Transfer a confirmed learner (P6) | L0 → `approval_request` (L1) → enrolment (L6) → source and destination batch, ascending id (L7) → old seat (L8) | Enrolment added |
| Reserve unnamed agency seats (P8) | L0 → bundle (L4) → batch (L7) | **Order reversed** (was batch → bundle) |
| Name a reservation (P8) | L0 → bundle (L4) → reservation (L5) | Bundle locked so that expiry cannot race the naming |
| Convert reservation → enrolment (P7 + P8 + P9) | L0 → [arrangement (L3) if arrangement-backed] → bundle (L4) → reservation (L5) → enrolment (L6) → batch (L7) | **Reservation moved after bundle**; arrangement added |
| Agency confirmation without reservation (P7) | L0 → bundle (L4) → enrolment (L6) → batch (L7) | — |
| Voluntary release of an unnamed reservation | L0 → bundle (L4) → reservation (L5) → batch (L7) | Bundle added (the entitlement returns to it) |
| Cutoff release job (§2) | `job_run` (L1) → bundle (L4) → reservation (L5) → batch (L7) | Bundle added |
| Bundle expiry job (§2) | `job_run` (L1) → bundle (L4) → its unconfirmed reservations, ascending (L5) → their batches, ascending (L7) | New |
| Bundle extension decision (P7) | L0 → `approval_request` (L1) → bundle (L4) | — |
| Approve agency arrangement (P9) | L0 → `approval_request` (L1) → invoice (L2) → arrangement (L3); bundle created (insert) | Order stated |
| Verify and allocate an agency receipt (P9) | L0 → `receipt` (L1) → invoice (L2) → arrangement (L3) | Order stated |
| Verify a learner payment (P4) | L0 → `payment` (L1) → enrolment (L6) | — |
| Forfeit a deposit and release its seat (P4) | `job_run` (L1) → enrolment (L6) → batch (L7) | — |
| Unnamed reservation move (P8, approved) | L0 → `approval_request` (L1) → bundle (L4) → reservation (L5) → both batches ascending (L7) | Order stated |

---

## 2. Unnamed-reservation cutoff release ≠ named-but-unconfirmed reservation expiry

P10 §D row "Release a reservation" says "cutoff job: unnamed only". §C row 12 says "named or confirmed never auto-released". Read alone, these suggest a named reservation lives forever. The prototype (PD-P8-06, PD-P8-09, PD-P8-14) has **two distinct automatic endings**. Stage 2 must implement them as separate operations:

| | **Cutoff release** (unnamed) | **Bundle-expiry end** (named or unnamed, unconfirmed) |
|---|---|---|
| Applies to | Reservation state `active` (no learner named) | Reservation state `active` **or** `named` (learner registered, enrolment not confirmed) |
| Never applies to | `named`, `confirmed`, `released`, `expired`, `invalidated` | `confirmed` (the learner keeps the place, I-3) |
| Trigger | The batch's cutoff instant: start of the batch-local day 28 calendar days before the batch's local start date, in the batch's IANA zone, exact across DST (PD-P8-06). The exact moment is still open (**U-06**) | The bundle's `expires_at` (a UTC instant); `now() >= expires_at` on the server clock |
| Recomputed when | The batch is rescheduled (PD-P8-10/15: release instant follows the current start; history kept) | A bundle extension is approved before expiry (PD-P0-13) |
| Seat | Released (P1) | Released (P1) |
| Entitlement | **Returned** to the bundle's unreserved balance if the bundle is still valid; lapses if the bundle has expired | **Lapses**. Never returned, never revived (I-8) |
| Resulting state | `released` (cause `cutoff`) | `expired` |
| Audit operation | `reservation.released_at_cutoff` | `reservation.expired_with_bundle` |
| Idempotency key | `(reservation_id, 'cutoff_release', cutoff_instant)` | `(reservation_id, 'bundle_expiry', bundle.expires_at)` |
| Job | `reservation.cutoff_release`, driven by batch cutoffs | `bundle.expiry`, driven by bundle expiry instants |
| Late approval / confirmation | n/a (unnamed) | An approval or confirmation arriving at or after `expires_at` confirms nothing, even in the same pass (PD-P8-14). The conversion checks `expires_at` under the bundle lock |

**Ordering when both apply.** An unnamed reservation whose bundle expires before the cutoff ends by **expiry**: the entitlement lapses. If the cutoff instant comes first, it is **released**, and the entitlement returns to the still-valid bundle and later lapses with it. Each job re-checks the reservation state under its lock, so whichever commits first wins and the other is a no-op.

**Still open (not invented here):**
- U-06: the exact release moment, and which batch's cutoff governs reallocation.
- What happens to a named learner whose batch is rescheduled earlier past the cutoff (PD-P8-15).
- What an agency is owed when a bundle expires with reservations (P8 open item).

---

## 3. External payment event boundary

A payment provider (PSP) and PostgreSQL are separate systems. **No operation may assume they commit together.** They are joined only through durable, idempotent records.

### 3.1 Inbound: provider → us (webhooks)

1. **Receive.** The webhook handler verifies the provider's signature over the **raw** request body with the provider's secret, and checks the event timestamp tolerance. On failure: 400, nothing stored except a security log entry.
2. **Record, then acknowledge.** In one short transaction, insert the event into `payment_provider_event`, with `UNIQUE (provider, provider_event_id)`, the raw payload, the signature result and the received-at time. Then return 2xx. A duplicate delivery hits the unique key: return 2xx, do nothing. **No business logic runs in the webhook request.**
3. **Process asynchronously.** A worker claims unprocessed events (`FOR UPDATE SKIP LOCKED`, L1). It applies the business effect in **one domain transaction** that follows §1. Examples:
   - payment row → verified;
   - allocation;
   - instalment and plan state;
   - audit and outbox;
   - marking the event `processed` with its outcome.
4. **Authoritative amounts.** Amounts, currency and the target obligation come from **our** records, matched by the provider object ID we stored when the payment was initiated. A mismatch (amount, currency, unknown object, wrong payer) creates a `finance_exception` and applies nothing (P10 §D, P9 rules).
5. **Out-of-order and replayed events.** Events are applied through a state machine that ignores transitions that are already applied or older. When in doubt, the worker fetches the object's current state from the provider API **outside** any transaction, and then applies it.
6. **I-5 (a payment never disappears).** A successful capture is recorded as a payment row **in its own committed transaction before** any capacity-dependent step. If the seat or entitlement step then fails (batch full, bundle expired), the payment stays recorded, and a Finance review row is created.

### 3.2 Outbound: us → provider (checkout, refunds)

1. **Intent first.** Commit a `payment_intent` / `refund_request` row (state `pending`, our idempotency key) with its audit row.
2. **Call the provider outside the transaction.** Pass the same key as the provider's idempotency key.
3. **Record the response** in a new transaction (provider object ID, state). If the process dies between steps 2 and 3, a reconciliation job queries the provider by our key and completes or fails the intent. A retry never creates a second charge or refund.

### 3.3 Never

- Treating a browser redirect, success page or client-reported "paid" signal as payment (P10 S-03).
- Holding database locks while calling the provider.
- Changing money state from the webhook request handler.
- Applying a provider event without a stored, unique event ID.

**Still open:** the provider choice and the bank-statement source (D-02), and the reconciliation timeout for pending bank transfers (U-02).

---

## 4. Idempotency records are a replay cache; financial uniqueness lives in domain constraints (Stage 1B)

ADR 0011 gives `idempotency_record` two retention classes. A `response_cache` record expires and may be purged; after that the same key executes again. Financial operations must use `permanent` records, and route registration refuses otherwise. **Neither class is the financial guarantee.** Every Stage 2 table that records money, seats or entitlements must also carry its own database constraint, so that no retry, purge, restore or duplicate delivery can repeat an effect:

| Effect | Required constraint (Stage 2) |
|---|---|
| Inbound provider event | `payment_provider_event UNIQUE (provider, provider_event_id)` (§3.1) |
| Payment / capture | `payment UNIQUE (provider, provider_payment_id)`; outbound `payment_intent UNIQUE (idempotency_key)` (§3.2) |
| Refund | `refund_request UNIQUE (idempotency_key)` and `UNIQUE (provider, provider_refund_id)` |
| Entitlement consumption | `UNIQUE (bundle_id, enrolment_id)` on the consumption row (one entitlement per confirmed learner) |
| Reservation | `reservation UNIQUE (key)` and `seat_id UNIQUE` (P10 §C row 12) |
| Seat | partial `UNIQUE (batch_id, learner_id) WHERE state = 'active'` (P10 §C row 5) |
| Forfeiture | `forfeiture UNIQUE (enrolment_id)` (P10 §C row 8) |
| Job-driven transitions | `job_run UNIQUE (job_name, run_key)`, with run keys from §2, e.g. `(reservation_id, 'cutoff_release', cutoff_instant)` |

A domain operation that hits one of these constraints treats it as "already done": it returns the existing result and never writes a second effect.

---

## 5. Stage 2A additions (programmes, batches, seat ledger)

*13 Nov 2026. Implemented in migration 0007 and `src/modules/{programmes,batches,seats}`; ADR 0012.*

1. **Configuration rows come before L7.** Creating a batch locks its `programme` and `programme_version` rows `FOR SHARE` before inserting the batch. Programme status changes and publication lock `programme` `FOR UPDATE` and never lock a batch. Nothing locks a programme after a batch.
2. **Seat writes:** the batch row (L7, `FOR UPDATE`) first, then existing seat rows (L8). A release or secure of a known allocation follows §1.3 rule 1: read the allocation's batch without a lock, lock the batch, then lock and re-read the allocation.
3. **Batch configuration** (capacity, dates, time zone, accepted fee options, staff allocations) locks the batch row (L7) and checks occupancy under that lock. Capacity below occupancy is refused (`CAPACITY_CONFLICT`); nothing is released to make room.
4. **Database backstop:** the `seat_allocation` insert trigger takes the same batch lock and refuses an insert at capacity (IL001), so even a path that skips the service cannot overbook.
5. **Staff allocation conflicts** (P-33, IQA independence) take a transaction-scoped advisory lock per (user, batch), so two concurrent conflicting grants cannot both pass.
6. **Lock timeout:** every Stage 2A write route sets `lock_timeout` to 5 s (§1.3 rule 4). A timeout answers 503 with `Retry-After`, after a full rollback.
7. **§4 constraint for seats is in place:** a partial unique index permits one active place per learner per batch (`seat_active_learner_uq`) and one per reservation (`seat_active_reservation_uq`). A repeated allocation with the same authority returns the existing place; a different authority is `ALLOCATION_ALREADY_EXISTS`.

---

## 6. Stage 2B additions (applications and the enrolment-confirmation boundary)

*13 Nov 2026. Implemented in migration 0008 and `src/modules/{learners,applications,enrolments}`; ADR 0013.*

1. **The application is the enrolment level (L6).** Within L6, the application row is locked before the enrolment row it creates. Application writes lock only the application (`FOR UPDATE OF a`); creating one first read-locks the programme and its published version (configuration, §5 rule 1). Choosing a batch never locks the batch: the choice is checked against an advisory reading, and confirmation re-checks it under L7.
2. **Confirmation lock sequence** (replaces the §1.4 row "Allocate a batch seat (learner confirmation)"; the change is the Finance step):
   1. L0: claim the idempotency record (permanent).
   2. Discover the application without a lock.
   3. L1–L3: Finance authorization. The adapter locks its own payment, receipt or arrangement rows, which rank above L6.
   4. L6: lock the application (`FOR UPDATE`) and re-check it against the discovered row.
      - If it is now `enrolled`, return its enrolment.
      - If its `row_version` changed, refuse with `STALE_RESOURCE` (retry).
   5. L6 child: verify the signed agreement.
   6. L7: lock the batch (inside `allocateSeat`) and re-check eligibility and commencement under that lock.
   7. Insert the seat, then the enrolment; update the application; write the history, audit and outbox rows.
   8. Complete the idempotency record and commit.
3. **Refusals roll back completely** and are audited in a separate transaction (`enrolment.confirm_refused`), like route-level authorization refusals.
4. **Lock timeout** is 5 s on every Stage 2B write route and on the confirmation transaction (§1.3 rule 4).
5. **§4 constraints for enrolment:**
   - `enrolment UNIQUE (application_id)`: no duplicate confirmation, whatever the idempotency key.
   - `UNIQUE (seat_allocation_id)`.
   - Partial `UNIQUE (learner_user_id) WHERE state = 'confirmed'`.
   - A repeat with another key returns the existing enrolment, and no second seat is taken.
