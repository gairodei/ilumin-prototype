# ADR 0012: Programmes, batches and the authoritative seat ledger (Stage 2A)

*Status: accepted for Stage 2A, 13 Nov 2026. Builds on ADR 0003 (PostgreSQL), 0005 (policies), 0006 (audit), 0007/0011 (idempotency), 0010 (outbox).*

## Context

P0 (PD-P0-01, I-1, I-11) and P1 require one authority for batch capacity. The prototype's `b.enrolled` counter had at least nine writers and could overbook. Stage 2A must give later stages (enrolment confirmation, P6 transfers, P8 reservations, P9 agency confirmation) a capacity service that is correct under concurrency. It must not implement those stages.

## Decisions

1. **Model** (migration 0007):
   - `programme` → `programme_version` (draft / published / superseded);
   - `fee_option` (stable per-programme identity, PD-R1-08) → `programme_version_fee_option` (the price in that version);
   - `batch` → `batch_fee_option` (accepted options, PD-W1-01/04);
   - `seat_allocation` (the ledger).

   Composite foreign keys (`(id, programme_id)`) make it impossible to attach a version, option or batch to the wrong programme.
2. **Pricing models.**
   - Level 3 versions must be `fee_options` (enforced by a database trigger).
   - Levels 2, 4 and 5 may be `single_price` or `fee_options` (PD-R1-12, PD-DM-04).
   - A single-price batch stores one `delivery_mode`. A fee-option batch stores none; the learner's option decides.
   - No fee option is ever invented for a single-price programme.
   - The legacy "Standard programme fee" option without a mode (PD-R1-02) is not representable yet. It belongs to the data-migration stage.
3. **Publication is internal and Finance-gated.**
   - `publishProgrammeVersion` requires an approval by an active Finance Admin or Super Administrator (PD-R1-05) plus an approval reference.
   - A CHECK constraint refuses any published version without the approval fields.
   - No HTTP route publishes. The Stage 2 Finance workflow will call the function.
   - A published version, its prices and its option rows are immutable (triggers). The only allowed change is published → superseded when a later version is published.
4. **Capacity is derived, never stored.**
   - Occupancy is `count(seat_allocation WHERE state IN ('held','occupied'))`, exposed through the `batch_occupancy` view.
   - No table has an enrolled counter.
5. **Seat operations are internal** (`src/modules/seats/seat-service.ts`):
   - `allocateSeat`, `releaseSeat`, `secureSeat`, plus reads and `checkSeatInvariants`;
   - no route calls them, and the route inventory test proves there is no seat-writing route.
6. **Responsibility split.**
   - The seat service guarantees capacity and allocation integrity.
   - The caller passes an `eligibility` callback. It verifies the subject's business eligibility and the authority record, and runs in the same transaction after the batch lock and before any write.
7. **Defence in depth.** The service checks everything under the batch row lock and returns precise errors. Database triggers enforce the same rules for any path that bypasses the service:
   - capacity (IL001);
   - state machine (IL002);
   - eligibility (IL006).

   A partial unique index forbids two active places for one subject in one batch. Trigger errors are mapped to the same stable codes (`src/shared/db-errors.ts`).
8. **Audit linkage is a foreign key.**
   - `seat_allocation.allocation_audit_id` is NOT NULL and references the `seat.allocated` audit row.
   - Ended rows must reference their ending audit row (`end_audit_id`).
   - An allocation without its audit event cannot exist.
9. **Subjects without tables yet are staged, not faked.**
   - Learner places reference `app_user`, and a trigger requires an active learner role.
   - Agency-reservation places are refused by the database until P8 adds the reservation table and its foreign key.
   - `unattributed` places are allowed only with authority `legacy_migration` (CHECK). They are for the P1 legacy-count import, which is not built.
   - Enrolment ids live in `authority_ref`, without a foreign key, until the enrolment table exists.
10. **Staff allocations reuse `staff_scope`.**
    - Assessors gain an `assessor_function` (assignment / PD / observation).
    - A trigger enforces P-33 / PD-MC-08 (no Coordinator is also an assessor of the batch) and PD-IQB-02 (IQA independence), in both directions, under a per-(user, batch) advisory lock.
    - `staff_scope.scope_id` still has no foreign key to `batch`, because Stage 1A authorization tests use synthetic batch ids. Existence is checked under the batch lock by the allocation service.
11. **Errors.** New stable codes: `BATCH_FULL`, `BATCH_NOT_ELIGIBLE`, `ALLOCATION_ALREADY_EXISTS`, `ALLOCATION_NOT_FOUND`, `CAPACITY_CONFLICT`, `PROGRAMME_VERSION_MISMATCH`, `INVALID_STATE_TRANSITION`, `STAFF_ALLOCATION_CONFLICT`, `IMMUTABLE_RECORD`, `STALE_RESOURCE`. Lock timeouts and exhausted serialization retries become 503 with `Retry-After`.

## Not decided here (left open, refused safely)

- **U-04:** no default batch time zone. A batch needs an explicit IANA zone.
- **U-05:** the commencement instant. `open → in_progress` is not offered.
- **U-09:** cancelling a batch with places. Refused.
- **P6 rescheduling:** start date, time zone and delivery mode change only while no place is in use.
- **Read rights:**
  - PD-2A-01: programme reads for the programme administrators and Finance;
  - PD-2A-02: batch reads for administrators and allocated staff, and seat lists for administrators and the batch's own Coordinators.

## Consequences

- Every seat write takes the batch row lock, so writes to one batch are serialised. This is intended: capacity is a per-batch critical section.
- `seat.allocated` and `seat.released` outbox messages stay `pending` until a later stage registers consumers. Ops status shows them.
