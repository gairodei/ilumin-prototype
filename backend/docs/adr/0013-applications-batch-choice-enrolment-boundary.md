# ADR 0013: Learner applications, explicit batch choice and the enrolment-confirmation boundary (Stage 2B)

*Status: accepted for Stage 2B, 13 Nov 2026. Builds on ADR 0005 (policies), 0006 (audit), 0007/0011 (idempotency), 0010 (outbox) and 0012 (seat ledger).*

## Context

P0 confirmed that a learner chooses an existing, eligible batch and is never silently reassigned (PD-P0-01, P3). Every learner is linked to the terms version that governs them (PD-P0-09, I-10). A confirmed enrolment must eventually require a signed agreement and authoritative Finance authorization, and a seat taken under the batch lock.

Stage 2C (agreements and Finance) does not exist yet. Stage 2B must build the lifecycle and the confirmation transaction without creating any production path that confirms an enrolment, approves an admission without its documents, or treats a browser claim as money.

## Decisions

1. **One learner identity per user.** `learner_profile` is keyed by `app_user.id`; name and email stay on `app_user`. It holds only the country of residence, which the P3 region rule needs ("set at registration" in the prototype). The country is set once. The learner is always the authenticated principal; request bodies never carry a learner id (strict schemas).

2. **Application state machine** (prototype names, PD-AC2-02):
   - draft (Sign-up in progress) → submitted (Awaiting review) → under_review → information_requested (Pending — Documents Required) → approved → **enrolled**;
   - rejected and withdrawn are final.

   Migration 0008 enforces every transition in a trigger:
   - `approved → enrolled` is the only way into `enrolled`, and only when the confirmed enrolment row already exists. So draft → enrolled is impossible.
   - Submitted details and the fee option are frozen after submission, unless the application is returned for information.
   - The delivery mode is derived by the database (from the fee option, or from a single-price batch) and frozen after submission.
   - The history (`application_event`) is append-only.
   - Staff decisions can never be made by the application's own learner (CHECKs on both tables).
   - One open application per learner (PD-NB1-02); one confirmed enrolment per learner (PD-E-15) and per application.

3. **Decision authority is the prototype's `admCanDecide()`.** Super Administrator, Academic Admin and System Administrator decide (PD-CD-13, PD-AC2-02); the custom Admissions Officer role has no production equivalent.
   - Finance, Business Admin, batch staff (including the batch's Coordinators, PD-MC-11) and agencies have no access to applications.
   - Nobody decides their own application, enforced in the policy, the service and the database.
   - **Approval requires the mandatory documents (PD-AC2-01).** Document review is not built, so the production adapter refuses (`ADMISSION_DOCUMENTS_REQUIRED`). Approval is not enrolment.

4. **Explicit batch choice (P3, PD-P3-01).** One pure rule (`evaluateBatch`) is used for the learner's list, for the choice, at submission, and under the batch lock at confirmation. It checks:
   - programme and version;
   - programme active;
   - batch planned or open;
   - valid IANA zone;
   - not commenced;
   - region (online, or the learner's country — a new `batch.location` column; null = not offered);
   - places;
   - an active Coordinator;
   - fee option accepted (fee-option programmes), or a batch delivery mode (single price).

   Every reason is returned. Nothing is preselected, and a learner is never moved. After submission, the learner may re-choose only when the chosen batch can no longer take them (PD-P3-05). The region rule applies only when the learner chooses (PD-P3-09). Places shown are advisory.

5. **Commencement (U-05 open).** Calendar only, by the database clock in the batch's zone. Before the start date, the batch has not commenced under either candidate U-05 rule (PD-P3-06). On the start date the state is **unresolved**. After it, the batch has commenced.
   - An unresolved state is a label when a choice is saved; confirmation refuses it with `COMMENCEMENT_UNRESOLVED`.
   - No midnight is assumed and there is no 24-hour fallback.
   - Tests may use a fixed, test-only commencement adapter.

6. **Terms versions (PD-P2-03/04).** `terms_version` holds LEGACY-1 (in force) and REVISED-1 (a frozen draft). These are reference data, not demo data. Every application links the version in force when it starts, and the enrolment copies it. No path activates REVISED-1; the table refuses all changes.

7. **The confirmation boundary is internal** (`confirmEnrolment`). No route calls it. It is one transaction in the global lock order (production-transaction-rules §6):
   1. L0 idempotency (permanent);
   2. discover the application without a lock;
   3. Finance authorization (its own L1–L3 rows; only `verified` qualifies, `pending` never does);
   4. the application (L6) locked and re-checked;
   5. the signed agreement for the application's own terms version;
   6. the batch (L7) inside `allocateSeat`, with eligibility and commencement re-checked under that lock;
   7. the seat;
   8. the enrolment row;
   9. the application moved to `enrolled`, with its history, audit and outbox (`enrolment.confirmed`);
   10. commit.

   Any refusal rolls back everything and is audited on its own (`enrolment.confirm_refused`). A full batch ends with `BATCH_FULL` and no automatic transfer. A repeat returns the existing enrolment, so no second seat is taken.

8. **Prerequisite ports** (`src/modules/enrolments/prerequisites.ts`): `SignedAgreementPort`, `FinanceAuthorizationPort`, `AdmissionDocumentsPort`, `CommencementPolicy`. The production adapters never report success. Test adapters live only under `tests/` and are barred from production in three ways:
   - **Build:** `tsconfig.build.json` compiles `src/` only, and `scripts/static-checks.mjs` forbids `src/` from importing `tests/`, declaring a `test-only` adapter or touching the test-evidence setting.
   - **Application:** `assertPrerequisitesAllowed` refuses a non-production adapter unless both the loaded configuration and the process are `test`. It runs when the app is built and at every use. `startServer` never sets adapters, and no configuration key selects them.
   - **Database:** an enrolment carrying `evidence_trust = 'test_only'` is refused (IL009) unless the database has `ilumin.test_evidence = 'allowed'`. That setting needs a superuser and is set only by the disposable test harness.

9. **Seat ↔ enrolment consistency.**
   - The enrolment references its seat (unique). Its insert trigger requires that seat to be occupied, in the same batch, for the same learner and fee option, with authority `enrolment_confirmation` and `authority_ref` equal to the enrolment's id.
   - The enrolment must match its approved application exactly.
   - A seat cannot be released or transferred while its enrolment is confirmed.
   - There is no circular foreign key, and capacity is still only the seat ledger.

## Consequences

- No production path can approve an admission or confirm an enrolment until document review and Stage 2C provide real adapters. That is intended.
- Stage 2C supplies `FinanceAuthorizationPort` (locking its payment, receipt and arrangement rows before L6) and `SignedAgreementPort` (an agreement child of the enrolment level). It decides which principal or system actor calls `confirmEnrolment` and with which idempotency key.
- The database does not yet require every `enrolment_confirmation` seat to have an enrolment. Stage 2A ledger tests use that authority with placeholder references, and rewriting them is out of scope. A later migration can add a deferred check once those placeholders are retired.

## Provisional decisions (to confirm with the client)

- **PD-2B-01** Admissions authority = Super / System / Academic Admin (`admCanDecide`). The task statement named Academic Admin and Super Admin; the prototype also includes System Admin.
- **PD-2B-02** On the batch's start date, a choice is saved and labelled `unresolved` (task §5). The prototype instead refuses the choice on that day (PD-P3-06). Confirmation refuses in both.
- **PD-2B-03** Confirmation requires academic approval (task §7). The prototype keeps admission independent of payment and seat security (CH-11; PD-DP open question 7, not answered).
- **PD-2B-04** The learner may withdraw draft, submitted, under-review and returned applications, but not approved ones (not specified). Staff withdraw open applications with a reason.
- **PD-2B-05** `batch.location` = `online` or an ISO country code. It replaces the prototype's label inference. Batches without one are not offered.
