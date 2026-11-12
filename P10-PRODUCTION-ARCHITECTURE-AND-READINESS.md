# P10: Production architecture and server-side enforcement audit

*Read-only audit, 12 Nov 2026. Baseline: HEAD `b096bf8` plus the uncommitted P1–P9 working tree. Last verified gate: 150 suites, 10,958 passed, 0 failed; UI check 1,146 passed; crawls clean; build passed; smoke 20 passed.*

This document reuses existing sources and does not repeat them:

- `P0-BATCH-SEAT-ENROLMENT-DECISIONS.md` ("P0"): decisions PD-P0-01…18, invariants I-1…I-14, entities in §5, open items U-01…U-19.
- `PROVISIONAL-DECISIONS.md` ("the register"): every PD-* entry.

No code, test or decision was changed for this audit, and no suite, crawl, build or smoke run was made.

---

## A. Executive assessment

| Question | Answer |
|---|---|
| Is the prototype production-ready? | **No.** It is a complete, regression-tested **behavioural specification** that runs entirely in one browser tab. Nothing is enforced by a server: there is no server. |
| What is solid and reusable? | The business rules. Seat ledger semantics (P1), terms versions (P2), cutoff and forfeiture (P4), the access decision (P5), the transfer workflow (P6), entitlements (P7), reservations (P8) and arrangements (P9). Each is isolated in one module with named operations, refusal reasons, idempotency keys and invariants, and 150 suites describe the expected outcomes. |
| What is simulated? | Authentication, sessions, role assignment, the card gateway, bank receipts, email and SMS, file storage, downloads, Zoom, the clock, the audit log's integrity and persistence. See B.2. |
| Biggest production risks | Re-implementing the rules without their invariants; concurrency on seats and entitlements; financial verification; tenant isolation between agencies; legal integrity of signed offer letters; migrating ambiguous legacy records. |
| What blocks activation for real learners? | Infrastructure (stages 1–2 of the roadmap) **and** client decisions. Above all: approval of the revised terms version (U-01), the commencement instant (U-05), the default batch time zone (U-04) and the bank-transfer reconciliation timeout (U-02). See I. |
| Recommended shape | One backend service (a modular monolith) with one transactional relational database (PostgreSQL), a managed identity provider, object storage with signed URLs, and a database-backed job queue. The browser holds no authority. See G. |

---

## B. Current architecture inventory

### B.1 Structure

| Aspect | What the code does | Evidence |
|---|---|---|
| Application | A single-page app: `index.html` loads **179 classic scripts** (~6.4 MB of JS) in a fixed order. No framework, bundler module graph or types. | `index.html`, `js/` |
| Module boundaries | Global functions and objects. Later batches **reassign** earlier functions ("wrapper chaining", e.g. `p5Decide = function…` in `p9-finance.js`). Behaviour depends on load order. | `js/p5-access.js`, `js/p9-finance.js`, `js/sec1-access.js` ("Loads last") |
| Rendering | String templates with `esc()` into `main`; actions dispatched through `ACT.*` and `data-act`. | `js/core.js`, `js/nav.js` |
| Runtime state | Global `S` (UI and session), `STORE` (learner worlds, seats, terms, agency data, finance), `ADMIN` (staff, queue, bundles, batches, audit, security log). | `js/core.js:193`, `js/admin-data.js:14` `initStore` |
| Persistence | Client demo only: the whole data set is saved as **one JSON snapshot in `localStorage`** (`illumin-demo:client-state`) after each change. Legacy fixture: none. Assignment drafts have their own `localStorage` store. | `js/fc-finance.js:376-398` (FCP), `js/ar-assign.js:12,135` |
| Build and tests | `tools/build.mjs` (static bundle); `tools/smoke.mjs`; harness: `suites.sh` (150 suites in headless Chrome against two fixtures), `crawl.sh`, `uicheck.sh`, `regress.sh`. | `tools/` |

### B.2 Domains: implemented logic versus simulation

| Domain | Implemented (rules exist and are tested) | Simulated or absent | Evidence |
|---|---|---|---|
| Authentication and sessions | Sign-in, reset and first-password screens; password policy UI; lockout message. | **Any email and password signs in** (`core.js:438`). Lockout is a string match on "locked"/"wrong" (`core.js:467-468`). Reset links are "simulated email" (`core.js:442`). No session token, expiry or revocation. | `js/core.js:411-468` |
| Roles and permissions | Role checks inside actions: e.g. `eDeny` (`e-sec.js`), SEC-01 `secRun` for learner writes (`sec1-access.js`), Finance-only and no-self-approval checks (P6, P7, P9), agency scoping (P8, P9). Refusals are logged. | Identity is **switched by demo controls**: `setAdminIdentity(av)` (`finance.js:14`), `bizEnter` (`business.js:559`), `agyEnter` (`agency.js:544`), `demoAuth` (`core.js:601`). The role is whatever the browser says. | as cited |
| Finance records | Ledger rows `STORE.fin.tx`; bank claims `STORE.chBank`; pending card `STORE.fin.pending`; plans and instalments per learner world; deposits, forfeiture (P4); refunds via `ADMIN.queue` type 'Refund'; agency invoices (queue type 'Agency invoice (offline) purchase'); P9 arrangements, receipts, exceptions and reviews (`STORE.agy.p9`). | **No payment provider.** "Payment successful" is local (`screens-a.js:29`). "Verify" and "record payment" are buttons. No bank feed or webhook. | `js/finance.js`, `js/fc-finance.js`, `js/dp-deposit.js`, `js/p4-cutoff.js`, `js/p9-finance.js` |
| Seat ledger (P1) | `STORE.seats`: one record per place; `seatTake / seatConfirm / seatRelease / seatMove / seatAdjust / seatConvert`; `seatInvariants()`; capacity derived; `b.enrolled` is a read mirror. | Atomicity holds only because a browser tab is single-threaded. The module itself says real concurrency needs a server (`p1-seats.js:24-25`). | `js/p1-seats.js` |
| Terms, time zones, clock (P2) | `TERMS()` links each learner to a terms version (LEGACY-1; REVISED-1 inactive); a batch has an IANA zone; `dayStart(ymd, tz)`; one `Clock`. | Clock modes are **demo**: `NOW + elapsed + CLOCK_SHIFT`, with per-scenario offsets (agency, finance, workplace) and freeze (`core.js:16-24`). | `js/p2-time.js`, `js/core.js:16` |
| Entitlements (P7) | `P7()` in `STORE.agy.p7`: purchase entries and consumption records; `p7Consume` once per confirmation; expiry; extensions; reminders (30/14/7/0). | Reminders are in-app records; there is no scheduler (they are reconciled on render). | `js/p7-entitlements.js` |
| Reservations (P8) | `P8()` in `STORE.agy.p7.resv`: unnamed reservations as P1 records; cutoff release; naming; confirmation; moves with approval; idempotency keys. | Release happens on render or reconcile, not on a timer. | `js/p8-reservations.js` |
| Arrangements (P9) | `P9()` in `STORE.agy.p9`: versioned arrangements, approvals, receipts, allocations, AX exceptions, FR reviews; `p9Access`. | Receipts are typed in by Finance (no bank statement import). Overdue runs on render. | `js/p9-finance.js` |
| Academic and assessment | Assignments, references and resubmission rounds (`Object.freeze` per round, `ar-assign.js:115`); marking; observations library; IQA sampling and conflicts (`e-sec.js`, `iqa.js`); competency map; certificates. | Staff identities are demo personas. | `js/ar-assign.js`, `js/cb-assess.js`, `js/d-obs.js`, `js/iqa.js` |
| Files and attachments | Assignment attachments keep a session blob and a SHA-256 (`setup-w0.js:231-235`). Other uploads (resources, offer letters, answer keys, evidence, certificate logos) record **file names and versions only**. | Downloads are **simulated** (`ACT.fakeDl`, `screens-a.js:160`). No storage, malware scan or content-type validation. The persisted snapshot holds file names only (`fc-finance.js:376` comment). | as cited |
| Signed offer letters | Signed terms are pinned per learner and frozen (`cb-pin.js:38`, `Object.freeze`); the issuer snapshot (L3-AB); letter versions per programme (`cbr-builder.js:802`). | No e-signature evidence (signer authentication, IP, consent text hash), no rendered PDF, no tamper-evident store. | `js/cb-pin.js`, `js/ch-b2.js:369` |
| Notifications and reminders | In-app notices (`notifyLearner`, `admin-data.js:295`; agency `STORE.agy.notifs`); workplace "emails" kept in a demo inbox (`STORE.wpc.emails`). | **No email, SMS or push sending.** No scheduler: time-based work (cutoffs, expiry, reminders, overdue) runs when a screen renders (`p4Reconcile`, `p7Reconcile`, `p8Reconcile`, `p9Reconcile`). | as cited |
| Scheduling and time zones | Batch IANA zone; `dayStart`; cutoff = start − 28 days in the batch zone (P4); overdue uses London day boundaries (P9); display uses the viewer's zone (`core.js:30-35`). | Commencement instant is unresolved (U-05). P5 fails closed unless the harness sets an instant (`p5HarnessCommence`). | `js/p2-time.js`, `js/p5-access.js` |
| Audit and event history | `logA(module, entity, action, before, after, reason)` (`admin-data.js:292`); per-record `hist` arrays (seats, reservations, arrangements); `ADMIN.security` for blocked attempts (`e-sec.js`). | **Mutable arrays in memory.** The actor is taken from `ADMIN.me`. The IP is a **hard-coded constant** `'81.2.69.142'` (`admin-data.js:293`). | as cited |
| Workplace permission links | Token-only `w-` routes for employer contacts. | The token is a **deterministic hash of a key** (`workplace.js:18`), so it is guessable. No expiry is enforced server-side. | `js/workplace.js:18,65,133` |
| External integrations | None real. Zoom join opens a modal (`screens-a.js:135`); Zoom links are hidden by P5 when access is closed (`p5-access.js:182-184`). SCORM is demo-only (AA-FOLLOWUP). CSV import is parsed in the browser (`admin-a.js:308`). | Payment gateway, bank, email, SMS, Zoom, awarding-body systems, e-signature. | as cited |
| Identifiers | Sequential per-store counters (`ARR-nnnn`, `AX-`, `FR-`, `RSV-`…); `Date.now()`/`Math.random()` for some IDs (`admin-data.js:296`, `cb-details.js:24`). | Not collision-safe across clients. | as cited |

---

## C. Server-side enforcement matrix

Abbreviations: **Txn** = must run in one database transaction; **IK** = client-supplied idempotency key, stored with a unique constraint; **Rec** = reconciliation job. Every row assumes the authenticated principal comes from the server session (never from the request body) and that every refusal is written to an append-only security log.

| # | Domain | A. Browser authority today | B. Server authority needed | C. API operations | D. Entities and constraints | E. Authorisation | F. Txn / idempotency | G. Failure and reconciliation | H. Reusable suites |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Authentication and sessions | `core.js:411-468` UI only; any credentials accepted | Identity provider (OIDC); server session (http-only, secure, SameSite cookie); MFA for staff and agency admins; lockout; reset tokens single-use and time-limited | `POST /auth/callback`, `POST /auth/logout`, `GET /me`, `POST /auth/reset` (delegated to the provider) | `user(id, idp_sub UNIQUE, email UNIQUE, status)`; `session` (if self-managed) | Public; rate-limited | Idempotent logout; nonce and state checks | Deactivated user: sessions revoked within one request | Auth screen suites (copy and flows only) |
| 2 | Roles and tenant isolation | `setAdminIdentity`, `agyEnter`, `bizEnter`; `eDeny`, `secRun`, per-module role checks | Role assignments stored server-side; every handler checks role **and** scope: agency_id for agency users, learner_id for learners, batch allocation for Coordinators, Assessors and IQA | Admin: `PUT /staff/{id}/roles`; every other API checks policy | `staff_role(staff_id, role, scope?)`; `agency_user(user_id, agency_id)`; `batch_staff(batch, staff, role)` | Super Admin assigns roles (audited); nobody edits their own roles | Role change and audit in one Txn | Role removal takes effect on the next request | ft-ea/eb (E-B access), ft-mr*, ft-sa*, SEC-01 suites, ft-p8/p9 cross-agency checks |
| 3 | Programme versions and signed agreements | `cbr-builder.js` versions (`Object.freeze`), `cb-pin.js:38` signed plan freeze, L3-AB issuer snapshot, L3-C2 "never rewrite" | Immutable programme version rows; immutable signed-agreement row with the rendered document's hash, terms version, fee option, schedule, deposit, deadlines, signer evidence; amendments are new rows | `POST /programmes/{id}/versions`, `POST /programmes/{id}/publish`, `POST /enrolments/{id}/agreement/sign`, `GET /agreements/{id}` (signed URL) | `programme_version(pid, v) UNIQUE`; `agreement(id, enrolment_id, terms_version, doc_sha256, signed_at, signer_user, evidence jsonb)`; no UPDATE grant | Academic Admin edits drafts; publication per existing rules; only the learner signs their own | Sign = agreement row + enrolment state + schedule rows in one Txn; IK per sign attempt | Document render failure: no signature recorded; signed rows never mutated (database trigger refuses) | ft-cb*, ft-cbx, ft-l3ab, ft-l3c2, ft-fb1/fb2 |
| 4 | Learner enrolment | sign-up worlds (`w.signup`), NB-1 locks, admission approval in the queue | Enrolment state machine on the server; one NVQ enrolment per learner per programme (NB-1) | `POST /applications`, `POST /applications/{id}/decision`, `POST /enrolments/{id}/confirm` | `enrolment(id, learner, programme_version, batch, fee_option, mode, terms_version, state)`; partial UNIQUE (learner, programme) where active | Learner applies; Academic Admin decides (no self-decision, G4) | Confirm = enrolment + seat (#5) + entitlement (#11) + schedule in one Txn; IK | Seat lost during checkout: payment kept as reconcilable (I-5), Finance review | ft-nb1, ft-ac2, ft-ch, ft-dm*, ft-p3 |
| 5 | P1 seats | `seatTake/Release/Move/Confirm/Adjust`, `seatInvariants` | Seat table is the **only** capacity authority; capacity checked under a lock | Internal service calls only (no public "take seat" endpoint); admin `POST /batches/{id}/seats/adjust` | `seat(id, batch_id, kind, state, learner?, agency?, entitlement?, reservation?)`; capacity on `batch`; partial UNIQUE (batch, learner) where state active; CHECK on states | Only via domain operations; Super Admin override audited | `SELECT … FOR UPDATE` on the batch row, then count and insert in one Txn; IK per operation | Over-capacity refused with no partial write; nightly invariant job (I-1, I-11) | ft-p1, ft-p1c, ft-p3, ft-p6, ft-p8 (invariant checks) |
| 6 | P2 terms and time zones | `TERMS()` links; `batchTz`; `dayStart`; demo `Clock` | Server clock in UTC only; batch `tz` NOT NULL (IANA); terms version on every learner; REVISED-1 activation is a Super Admin action requiring client approval | `POST /terms-versions/{id}/activate` (guarded); `PUT /batches/{id}` (tz validated) | `terms_version(id, effective_from, letter_version, rules jsonb, status)`; `learner_terms(learner, terms_version)` UNIQUE | Super Admin only, recorded with the client approval reference | Activation in one Txn with an audit row | No-tz batch: refused for cutoff-based operations (as P4/P8 already do) | ft-p2, ft-p2c |
| 7 | P3 batch selection | `p3Why`, `p3Record`; capacity rechecked at confirmation | Eligibility computed on the server at list time **and** re-checked at confirmation | `GET /programmes/{id}/eligible-batches`, `POST /applications/{id}/batch` | as #4, #5 | Learner for themselves | Re-check inside the confirm Txn (#4) | Batch filled or ineligible: 409 with reason; never silently reassigned | ft-p3, ft-p3c |
| 8 | P4 deposits and forfeiture | `p4Cut`, `p4Verify`, `p4Forfeit`, `p4Reconcile` on render | Scheduled job computes cutoffs in the batch tz; Finance verifies bank receipts (received-at versus recorded-at); forfeiture only under an **activated** revised version | `POST /payments/bank-claims`, `POST /payments/{id}/verify`, job `forfeiture.run` | `payment(id, method, amount_minor, received_at, recorded_at, verified_at, verifier, state)`; `deposit(...)`; `forfeiture(enrolment UNIQUE, …)` | Finance verifies (not their own entry); system forfeits; Super Admin override audited | Forfeit = deposit state + seat release + finance record + audit in one Txn; IK = (enrolment, cutoff) | Pending claim at cutoff: protected until U-02 is decided (currently undecided, so no forfeiture while pending) | ft-p4, ft-p4c, ft-dp, ft-fc*, ft-fp |
| 9 | P5 access | `p5Decide`, `lockFor`, SEC-01 `secRun`, item guards (resources, downloads, Zoom) | Access decision computed on the server **for every content request**; content never sent to a client that fails it | `GET /learning/{enrolment}/…` (all content), `GET /resources/{id}/download` → signed URL, `GET /events/{id}/join` → link | Derived; no stored "access granted" flag; inputs: enrolment, verified payment or arrangement, commencement, locks | Learner for their own enrolments; staff per allocation | Read-only; decision logged once per learner and outcome | Commencement unknown → closed (U-05) | ft-p5, ft-p5c, ft-sec1 / SEC-01 suites, ft-p9c (sponsored gate) |
| 10 | P6 transfers | `p6Request`, `p6Decide`, `p6Execute` | Request → Academic Admin approval / Super Admin override → execution, as a server workflow | `POST /transfers`, `POST /transfers/{id}/decision`, `POST /transfers/{id}/execute` | `approval_request(kind, subject, requester, state, decided_by, …)`; seat rows | No self-approval; tz and terms checks (L3-C2) | Execute = seat move + enrolment batch + audit in one Txn; IK = request id | Destination full at execution: refused, request stays approved-not-executed | ft-p6, ft-p6c |
| 11 | P7 entitlements | `p7Consume`, `p7Return`, `p7Reconcile`, `p7ExtDecide` | Entitlement rows; consumption exactly once; expiry by server time | `POST /bundles` (purchase), `POST /bundles/{id}/extension-requests`, decision endpoint | `bundle(id, agency, product, qty, expires_at)`; `entitlement_use(bundle, enrolment UNIQUE)`; count check under lock | Agency for its own bundles; Business Admin decides extensions | Consume inside the confirm Txn (#4) with `FOR UPDATE` on the bundle; IK | Expired bundle: refused; never revived (I-8) | ft-p7, ft-p7c, ft-ag1 |
| 12 | P8 reservations | `p8Reserve`, `p8Release`, `p8Name`, `p8Confirm`, `p8Reconcile` (cutoff) | Reservation = seat row (kind agencyReserved) plus bundle authorisation; cutoff release by a scheduled job | `POST /reservations`, `POST /reservations/{id}/release`, `/name`, `/confirm`, `/move-requests` | `reservation(id, agency, bundle, batch, seat_id UNIQUE, state, key UNIQUE)` | Agency for its own; Academic Admin approves moves | Reserve = seat insert + reservation in one Txn (lock batch and bundle); IK required | Cutoff job idempotent per reservation; named or confirmed never auto-released | ft-p8, ft-p8c, ft-p8r |
| 13 | P9 arrangements and receivables | `p9Request/Decide/Authorise/Pay/Overdue/ReviewDecide` | Finance workflow on the server; receipts only from verified sources (manual entry by Finance with evidence, later a bank-statement import) | `POST /invoices/{id}/arrangements`, `POST /arrangements/{id}/decision`, `POST /arrangements/{id}/receipts`, `POST /finance-exceptions/{id}/resolve`, `POST /finance-reviews/{id}/decision` | `arrangement(id, line_id, version, invoice, state, total_minor)`; `arrangement_instalment`; `receipt(ref UNIQUE per payer)`; `allocation`; `finance_exception`; `finance_review` | Finance Admin, not the requester; Super Admin override with reason | Approve = arrangement state + bundle authorisation + P7 entry + audit in one Txn; receipt = receipt + allocations + satisfaction in one Txn; IK = bank ref | Duplicate, mismatch or surplus → exception, never auto-applied | ft-p9, ft-p9c |
| 14 | Assignments, evidence, assessment | SEC-01 on learner writes; frozen resubmission rounds; Assessor/IQA checks (`e-sec.js`) | Server stores submissions immutably per round; marking only by the allocated Assessor; IQA conflict rule | `POST /assignments/{id}/drafts`, `/submit`, `/mark`, `/publish`; `POST /observations`; IQA endpoints | `submission(id, assignment, round, submitted_at, content_hash)` immutable; `attachment(object_key, sha256, size, type, scan_state)`; `mark(...)` | Learner (own, access open); Assessor (allocated); IQA (not allocated to the batch) | Submit = submission + attachments + state in one Txn; IK per submit | Upload incomplete or scan failed: submission not accepted | ft-ar, ft-cf, ft-d1*, ft-ta1, ft-iqb, ft-cma, ft-obs1 |
| 15 | Resources and protected downloads | Buttons hidden by P5 item guards; downloads simulated | Object storage, private bucket; short-lived signed URLs issued only after #9 passes; Zoom links fetched only after #9 | `GET /resources/{id}/download`, `GET /events/{id}/join` | `resource(id, programme_version, object_key, sha256, mime)` | As #9 | Read-only | Expired URL: re-request | ft-p5 item-guard checks |
| 16 | Notifications, reminders, audit | `notifyLearner`, in-app arrays; `logA` mutable; render-time reconcilers | Outbox table + worker for email/SMS; scheduled jobs for cutoffs, expiry, reminders, overdue; **append-only** audit with server actor, role, IP, request id | `GET /notifications`, `POST /notifications/{id}/read`; `GET /audit` (filtered by role) | `outbox(id, kind, dedupe_key UNIQUE, state, attempts)`; `job_run(name, key UNIQUE)`; `audit_event` (INSERT-only grant; optional hash chain) | Audit readers per role; nobody updates or deletes | Notification and audit written **in the same Txn** as the state change (outbox pattern) | Worker retries with backoff; dead-letter after N; reminders deduplicated (P7 `sent` keys) | ft-p7 (reminders), ft-p9 (notices), ft-sa* (audit screens) |

---

## D. Atomic transaction requirements

Common rules for every operation:

- **PostgreSQL**, isolation READ COMMITTED with explicit row locks (or SERIALIZABLE with retry).
- One request is one transaction.
- The audit event and the outbox notification are inserted in the same transaction.
- The idempotency key is stored with the result: a repeat returns the stored result with no further write.
- Retries happen only on serialization or deadlock errors, up to 3 times with jitter.
- Rollback means the database discards the whole transaction. **The browser never compensates.**

| Operation | Boundary (committed together) | Constraints | Idempotency key | Concurrency control | Rollback / retry |
|---|---|---|---|---|---|
| Allocate a batch seat | seat insert; enrolment state; audit; outbox | partial UNIQUE (batch, learner) active; CHECK state; capacity re-counted inside | client key per checkout / admin action | `SELECT … FROM batch WHERE id=$1 FOR UPDATE`, then count the active seats | Full → 409, nothing written. Payment already captured → payment row kept + Finance review row (I-5), committed separately **before** the seat attempt |
| Move a confirmed learner | approved request → executed; old seat 'transferred'; new seat active; enrolment.batch; terms check; audit | destination capacity; request state CHECK; terms snapshot unchanged (L3-C2) | transfer request id | lock both batch rows **in id order** (no deadlock); lock the request row | Any check fails: nothing moves; request stays Approved |
| Reserve an unnamed agency seat | seat (agencyReserved) + reservation + bundle authorisation check + audit | reservation.key UNIQUE; seat_id UNIQUE; bundle in force (paid, or arrangement Active/Overdue/Satisfied) | agency-supplied key (P8 `keys`) | lock the batch row then the bundle row (fixed order) | Refusal: nothing written |
| Release a reservation | reservation state; seat 'released'; audit; outbox | only unnamed reserved (voluntary); cutoff job: unnamed only | (reservation id, 'release', cause) | lock the reservation row | Repeat is a no-op |
| Convert a reservation into enrolment | reservation 'named' → confirmed; seat kind/state; enrolment; **entitlement consumption**; learner programme access (P9 `p9Enrol`); audit | one consumption per enrolment (UNIQUE); bundle not expired at that instant | (reservation id, learner id) | lock reservation, then bundle, then batch | Bundle expired or arrangement no longer in force → refused, reservation unchanged |
| Consume one entitlement | `entitlement_use` insert, inside the enrolment-confirm transaction | UNIQUE (enrolment); count(uses) ≤ qty checked under lock | enrolment id | `FOR UPDATE` on the bundle | Never consumed outside an enrolment transaction |
| Approve an agency arrangement | arrangement state; superseded version; bundle creation (first approval only); P7 purchase entry `backing='arrangement'`; agency ledger 'Authorised'; audit; outbox | one governing version per line (partial UNIQUE); decider ≠ requester (CHECK in code and DB); obligation snapshot equals current (else Invalidated) | (arrangement id, decision, dialog revision) | lock the arrangement line and the invoice | Stale obligation → Invalidated (committed); no bundle |
| Verify and allocate a payment | receipt; allocations; instalment paid amounts; arrangement or plan state; invoice 'paid' when satisfied; Finance ledger row; audit | receipt UNIQUE (payer, bank ref); allocation sum ≤ receipt; no over-allocation of an instalment (CHECK) | bank reference | lock the arrangement or plan row | Duplicate, wrong payer, wrong obligation or surplus → `finance_exception` row, **no allocation** |
| Forfeit a deposit and release its seat | deposit 'forfeited'; forfeiture row; seat 'released'; Finance record; audit; outbox | forfeiture UNIQUE (enrolment); only learners on an activated revised version; no pending verified-in-time claim | (enrolment id, cutoff date) | lock the enrolment, then the batch | Pending bank claim → skipped and retried by the next job run |

**Operations that must commit together (cross-phase):**

| Combined operation | Phases |
|---|---|
| Learner confirmation: enrolment + seat + signed agreement + schedule + deposit credit | P1 + P2 + P3 + P4 |
| Agency confirmation: reservation/assignment + seat + entitlement consumption + learner programme record | P1 + P7 + P8 + P9 |
| Arrangement approval: arrangement + bundle + entitlement authorisation | P7 + P9 |
| Transfer execution: two seats + enrolment + terms check | P1 + P2 + P6 |
| Forfeiture: deposit + seat + Finance record | P1 + P4 |
| Expiry or cutoff release of an unnamed reservation | P1 + P7 + P8 |

---

## E. Security findings (ranked)

None of these is mitigated by an existing browser check. A browser check is a UI convenience, not a control.

| ID | Severity | Finding | Evidence | Consequence | Control |
|---|---|---|---|---|---|
| S-01 | **CRITICAL** | All authority, data and rules run in the browser; there is no server | `sec1-access.js` header ("PRODUCTION MUST ENFORCE THIS ON THE SERVER"), `p1-seats.js:24`, P0 I-12 | Any user can edit `STORE`/`ADMIN` in devtools: seats, payments, marks, roles | Server-side API for every write (C); browser holds no authority |
| S-02 | **CRITICAL** | Authentication is simulated: any email and password signs in; roles are switched by demo controls | `core.js:438`, `core.js:601`, `finance.js:14`, `business.js:559`, `agency.js:544` | Impersonation of any role, including Super Admin | OIDC identity provider; server sessions; MFA for staff and agency admins; demo switchers removed from production builds |
| S-03 | **CRITICAL** | Payments are confirmed locally: card success is a modal; Finance verification is a button | `screens-a.js:29`; `p4Verify`, `p9Pay` | Fraudulent "paid" states unlock access, seats and entitlements | PSP with server-side webhook signature verification; amounts from the server; bank receipts entered by Finance with evidence, or a statement import; segregation (enterer ≠ verifier where possible) |
| S-04 | **CRITICAL** | Audit log is a mutable client array; actor from client state; IP hard-coded | `admin-data.js:292-293` | No forensic value; approvals deniable | Append-only `audit_event` (INSERT-only role, no UPDATE/DELETE); server-derived actor, role, IP, request id; optional hash chain; retention policy |
| S-05 | HIGH | Cross-agency isolation depends on in-function checks | `e-sec.js` (agency section), `p8Auth`, P9 own-agency checks | One agency reads or acts on another's learners, bundles or invoices | Row-level scoping by agency_id on every query (consider PostgreSQL RLS as defence in depth); cross-tenant tests (K) |
| S-06 | HIGH | Concurrency: capacity and entitlement counts are safe only in a single tab | `p1-seats.js:24-25` | Overbooking; double consumption (I-1, I-2) | Locks and constraints in D; concurrent tests |
| S-07 | HIGH | Workplace permission tokens are a deterministic hash of a key | `workplace.js:18` | Guessable links expose employer-contact pages | 128-bit random tokens stored hashed; expiry; single purpose; revocation; rate limits |
| S-08 | HIGH | Files: names only, no storage, no scanning; downloads simulated | `screens-a.js:160`, `setup-w0.js:231`, `fc-finance.js:376` | Production upload paths undefined; malware or evidence-tampering risk | Private object storage; signed upload and download URLs; size and type allow-lists; malware scan before acceptance; SHA-256 recorded; access via #9 |
| S-09 | HIGH | Signed offer letters are frozen in memory only; no signature evidence | `cb-pin.js:38`, `ch-b2.js:369` | Contract disputes; no proof of what was signed | Server-rendered PDF, SHA-256 stored, immutable row; signer authentication evidence; e-signature provider if the client requires one (decision) |
| S-10 | HIGH | Time is manipulable: demo clock, shift, scenario offsets, freeze | `core.js:16-24` | Deadlines, forfeiture, expiry and overdue can be forced | Server UTC clock only; test clocks only in test environments (I-13) |
| S-11 | MEDIUM | Whole dataset (including personal data) persisted in `localStorage`; secret filter is a name heuristic | `fc-finance.js:376-420` (`FCP_DROP`) | Personal data left on shared devices | No persistence of domain data in browser storage in production; drafts server-side or explicitly opt-in |
| S-12 | MEDIUM | Assignment drafts in `localStorage` | `ar-assign.js:12,135` | Draft answers readable on shared machines | Server-side drafts |
| S-13 | MEDIUM | Zoom and resource links are hidden, not withheld | `p5-access.js:182-184`, `screens-a.js:135` | A learner without access who obtains a link can join | Links issued by the server only after #9; per-meeting registration where Zoom allows (decision) |
| S-14 | MEDIUM | No session expiry, revocation or CSRF model | `core.js` (no session code) | Hijacked sessions persist | Short idle timeout for staff; revocation on role change or deactivation; SameSite cookies plus CSRF token |
| S-15 | MEDIUM | IDs generated client-side (`Date.now`, `Math.random`, per-store counters) | `admin-data.js:296`, `cb-details.js:24`, `P9().seq` | Collisions; enumeration of public references | Server-generated IDs (UUID or sequence); human references as separate unique columns |
| S-16 | MEDIUM | Approval segregation implemented only in client code | P6 `p6DecideWhy`, P7 `p7ExtDecide`, P9 `p9Decide` | Self-approval through a forged request | Server check plus DB CHECK (decided_by ≠ requested_by) where modelled |
| S-17 | LOW | CSV import parsed in the browser; exports may carry formula injection | `admin-a.js:308` | Spreadsheet formula injection | Server-side parsing; prefix `= + - @` cells on export |
| S-18 | LOW | Rendering by string templates relies on consistent `esc()` | `js/*` templates | XSS if any interpolation is missed (not exhaustively verified here) | Auto-escaping framework; Content-Security-Policy |
| S-19 | LOW | Display time zone taken from the browser | `core.js:30-35` | Confusion only (decisions use batch tz) | Keep display-only; server decides in batch tz |

---

## F. Production data model (minimal)

Conventions:

- IDs are server-generated UUIDs. Existing human references (e.g. `ARR-0001`, `BN-07`, `AQ-2007`) are kept as UNIQUE `ref` columns.
- Money is `bigint` minor units plus `currency char(3)`. GBP only today (CH-02).
- Times are `timestamptz` (UTC). Calendar dates are `date` plus the owning batch's `tz`.

| Table | Key columns | Constraints and keys | Immutable? | Sensitive |
|---|---|---|---|---|
| `user` | idp_sub, email, status | UNIQUE idp_sub, email | — | PII |
| `learner` | user_id, legal name, DOB, country, tz | FK user; UNIQUE user_id | — | PII (special-category data if any health or diversity fields: confirm) |
| `staff`, `staff_role` | user_id; role, scope | UNIQUE (staff, role, scope) | — | PII |
| `agency`, `agency_user` | name, tz, status; user_id, agency_id | UNIQUE (user_id) per agency | — | business |
| `programme`, `programme_version` | pid; version, title, level, durations, fee options, letter version | UNIQUE (programme, version) | version rows after publish | — |
| `fee_option` | programme_version, mode, price_minor, status | UNIQUE (programme_version, code) | after publish | — |
| `terms_version` | id (LEGACY-1, REVISED-1), status, effective_from, rules | — | rules after activation | — |
| `batch` | code, programme, start_date, start_time?, tz NOT NULL, capacity, status, modes | UNIQUE code; CHECK capacity ≥ 0 | — | — |
| `batch_staff` | batch, staff, role | UNIQUE (batch, staff, role) | — | — |
| `enrolment` | learner, programme_version, batch, fee_option, mode, terms_version, state, agency?, bundle? | partial UNIQUE (learner, programme) WHERE state active | — | — |
| `agreement` | enrolment, terms_version, doc object key, doc_sha256, signed_at, evidence | UNIQUE (enrolment, version) | **yes** (no UPDATE) | PII |
| `schedule_row` | enrolment, seq, due_date, amount_minor, kind (deposit / instalment) | UNIQUE (enrolment, seq) | amendments are new rows | — |
| `seat` | batch, kind, state, learner?, agency?, reservation?, origin | partial UNIQUE (batch, learner) active; CHECK states | history in `seat_event` | — |
| `bundle` | ref, agency, product, qty, expires_at, backing (paid / arrangement), invoice? | UNIQUE ref | qty/backing after creation | — |
| `entitlement_use` | bundle, enrolment, at | UNIQUE enrolment | **yes** | — |
| `bundle_extension` | bundle, requested_by, decided_by, new_expires_at, state | CHECK decided_by ≠ requested_by | decisions | — |
| `reservation` | ref, agency, bundle, batch, seat, state, key, named_learner? | UNIQUE seat; UNIQUE (agency, key) | history | — |
| `invoice` (obligation) | ref, agency, amount_minor, state, purchase payload | UNIQUE ref | amount after approval | business |
| `arrangement`, `arrangement_instalment` | line, version, invoice, type, total_minor, state, requested_by, decided_by; due_date, amount_minor, paid_minor | partial UNIQUE (line) WHERE governing; CHECK sum = total | versions | business |
| `payment` / `receipt` | method, payer (learner / agency), amount_minor, received_at, recorded_at, verified_at, verifier, bank_ref, psp_ref, state | UNIQUE (payer, bank_ref); UNIQUE psp_ref | after verification (reversal = new row) | financial |
| `allocation` | payment, target (schedule_row / instalment), amount_minor | CHECK > 0 | **yes** | — |
| `deposit`, `forfeiture`, `refund` | enrolment, amount, state; reason, actor | UNIQUE forfeiture (enrolment) | forfeiture/refund rows | financial |
| `finance_exception`, `finance_review` | kind, subject, state, decisions | — | decisions | financial |
| `approval_request` | kind (transfer, move, extension, arrangement…), subject, requester, decided_by, state, reason | CHECK decided_by ≠ requester (except audited override flag) | decisions | — |
| `assignment`, `submission`, `attachment`, `mark`, `observation`, `iqa_sample` | per existing records | UNIQUE (assignment, learner, round) | submissions, published marks | evidence may hold PII |
| `resource` | programme_version, object key, sha256 | — | versions | — |
| `notification`, `outbox` | recipient, kind, payload, dedupe_key, state | UNIQUE dedupe_key | — | PII in payload |
| `audit_event` | at, actor_user, role, ip, request_id, module, entity, action, before, after, reason | INSERT-only | **yes** | PII (access-controlled) |
| `idempotency_key` | key, principal, operation, response | UNIQUE (principal, operation, key) | yes | — |

**Ambiguous legacy records already known (do not fabricate, reconcile):**

| Record | Issue | Source |
|---|---|---|
| Unattributed seats | P1 migrated seeded counts as `unattributed` places with no learner | `p1-seats.js:17-20`, `seatUnmatched` |
| AQ-2007 / BN-07 | Paid invoice not linked to its bundle; P8 refuses reservations from BN-07 | PD-P9 open |
| Historical invoices that aren't portal purchases | Bundle can't be identified; not eligible for arrangements | PD-P9-13 |
| LEGACY-1 sponsored learners (e.g. Grace) | No agency-workflow record; access by legacy rules | PD-P9-13, P5 |
| Legacy released reservations with money held | Refund, retention or transfer undecided | U-12 |
| Learner worlds with conflicting programme records | Listed by `p9Enrol` for reconciliation, not changed | PD-P9-11 |
| Batches without a time zone | Refused by cutoff-based operations | P2, U-04 |
| Seeded demo data generally | Prototype fixtures (`data.js`, `admin-data.js`, `cd-demo.js`) are **not** production data | — |

---

## G. Recommended architecture and trade-offs

**Recommendation: one modular-monolith API plus one managed PostgreSQL**, hosted in a UK region, with:

- a managed OIDC identity provider;
- private object storage;
- a database-backed job queue and scheduler;
- an outbox for email and SMS;
- structured logging and error tracking;
- point-in-time recovery backups.

The frontend is a static SPA that calls the API and holds no authority.

| Component | Recommended | Why / trade-off |
|---|---|---|
| Backend runtime | One service in TypeScript on Node.js, organised by domain modules matching P1–P9 (seats, terms, enrolment, finance, agency, academic) | The team and the specification are JavaScript, and the rule modules translate directly. One deployable keeps transactions local; microservices would split the cross-phase transactions in D across network boundaries for no benefit. |
| Database | Managed PostgreSQL (row locks, partial unique indexes, CHECK constraints, SERIALIZABLE, PITR) | Every invariant in P0 §4 maps to a lock or constraint. A ledger needs multi-row transactions with real isolation. |
| Hosting (API) | A managed container or app platform in a UK region, close to the database | Simple operations; long-lived connections; no per-request CPU limits for PDF rendering or CSV import. |
| Frontend hosting | Static hosting with a CDN (Cloudflare Pages is suitable) | Cheap, fast and low-risk. |
| Authentication | Managed OIDC provider with MFA, password policy, lockout, reset | Removes the highest-risk custom code; roles stay in the app database. |
| Files | S3-compatible private bucket (e.g. S3 or Cloudflare R2), signed URLs, malware scanning on upload | R2 is a reasonable choice with any backend. |
| Jobs | Queue in PostgreSQL (e.g. a `pg-boss`-style library) plus a scheduler for cutoffs, expiry, reminders, overdue and reconciliation | Jobs share the same transactions and idempotency keys; no extra broker. |
| Email and SMS | Transactional provider through the outbox | Retries, deduplication, bounce handling. |
| Payments | A PSP with hosted checkout and signed webhooks; bank transfers recorded by Finance with evidence (statement import later) | The server never trusts a client "paid" signal. |
| Observability | Structured logs with a request id, error tracking, uptime checks, DB metrics, job dead-letter alerts | Needed to run reconciliation safely. |
| Backup and DR | PITR (at least 7 days; client to set RPO/RTO), daily snapshots copied off-region within UK/EU as the data-residency decision allows, object-storage versioning, restore drill before go-live | — |

**Cloudflare option (evaluated):**

| Option | Verdict |
|---|---|
| Pages (frontend) + R2 (files) | **Suitable.** |
| Workers + Hyperdrive → managed PostgreSQL | **Viable** for the API, if the team accepts the Workers runtime constraints: CPU-time limits, no long-running tasks, Node compatibility gaps for PDF and CSV libraries. Scheduled work fits Cron Triggers and Queues. Keeps one Postgres as the authority. |
| Workers + D1 as the system of record | **Not recommended** for the ledger: SQLite semantics (single writer per database, no `SELECT … FOR UPDATE`, transactions via batches), a per-database size cap, and a young tooling ecosystem for financial-grade migrations and PITR. Check current limits before deciding, but the transaction model in D is easiest to prove on PostgreSQL. |
| Durable Objects to serialise per-batch seat allocation | Possible, but it creates a second source of truth beside the database. Not needed if PostgreSQL row locks are used. |

**Material risks:**

- **Translating the rules.** The prototype's wrapper chain hides rule order. Each module's final behaviour, not its first definition, is the specification: read P5's `p5Decide` together with P9's override.
- **Data residency.** Learners are in the UK and UAE; the client must confirm UK GDPR hosting and any UAE requirements.
- **Frontend.** The prototype UI (string templates, globals, load-order wrappers) is not maintainable as a production client. Recommendation: rebuild screens in a component framework against the API, using the prototype as the visual and behavioural reference and its suites as the acceptance list. Porting the prototype code directly would carry the authority-in-browser design forward.

---

## H. Migration and reconciliation plan

| Step | Action | Rule |
|---|---|---|
| 1 | Decide the source of truth | The prototype holds **demo fixtures only**. Real migration sources are the client's existing systems and spreadsheets (unknown here). Confirm what exists before mapping anything. |
| 2 | Map identities | Learners, staff and agency users are imported with emails and then linked to IdP accounts at first sign-in. **No identity is invented**; unmatched rows go to a reconciliation list. |
| 3 | Programmes, versions, fee options, batches | Import as published versions. Batches without a time zone are blocked until U-04 is decided. |
| 4 | Enrolments and terms | Every existing learner → LEGACY-1 (I-10). Signed agreements: import the signed document and its hash if it exists; otherwise mark it as "legacy, no signed copy held". **Never generate a signature.** |
| 5 | Seats | Create a seat for each enrolment matched to a learner. Remaining counted places become `unattributed` (P1 rule), listed for review. Capacity never changes on import. |
| 6 | Payments | Import only payments with a verifiable source (PSP id, bank reference, receipt). Others go to `finance_exception`. **No bank receipt is invented.** |
| 7 | Agency bundles, invoices, entitlements | Link invoices to bundles where evidence exists. Unlinked ones (AQ-2007/BN-07 pattern) go to a reconciliation list, and reservations stay refused until resolved. |
| 8 | Academic records | Submissions, marks, observations and IQA records with their attachments. Recompute file hashes at import. |
| 9 | Verify | Run invariant queries (I-1…I-14) and count/total reconciliations against the sources; Finance and Academic Admin sign off. |
| 10 | Dry runs | At least two full rehearsal migrations into a staging copy, then a timed cut-over with a freeze window. |

---

## I. Open client-decision register

Statuses are taken from P0 §7 and the register. **Provisional choices are not confirmed decisions.**

### I.1 Must decide before production

| ID | Decision | Current prototype behaviour |
|---|---|---|
| U-04 | Default batch time zone; the rule for online batches with UK and UAE learners | Batches without a zone are refused for cutoff work |
| U-05 | Exact commencement instant (start of the start date in the batch zone, or the stored start time) | P5 fails closed when indeterminate |
| D-01 | Data residency and retention (UK GDPR, UAE learners), audit retention period | Not addressed |
| D-02 | Payment provider and bank-statement source; who may verify receipts | Simulated |
| D-03 | E-signature evidence required for offer letters | In-app signature only |
| D-04 | Legacy records requiring reconciliation: unattributed seats, AQ-2007/BN-07, non-portal invoices, legacy held money (U-12) | Listed, not changed |
| D-05 | RPO/RTO targets | — |

### I.2 Must decide before activating a specific workflow

| ID | Decision | Blocks |
|---|---|---|
| U-01 | **REVISED-1** offer-letter text, payment-terms wording, routes A/B, receipt-time rule, forfeiture disclosure | Any revised-terms enrolment; P4/P5 for real learners. REVISED-1 stays inactive. |
| U-11 | Activation date; which version governs in-flight sign-ups | Same |
| U-02 | Pending bank-transfer reconciliation timeout | Forfeiture (P4) |
| U-03 | Deposit-warning urgency thresholds | P4 warnings |
| U-09 | Batch cancellation with confirmed learners | Cancelling batches |
| U-10 | Waitlist under learner choice | Waitlist |
| U-14 | Agency contract wording (reservations, expiry, extensions, arrangements) | P7–P9 for real agencies |
| U-06 | Agency automatic release moment; which cutoff governs reallocation | P8 release job |
| U-07 | Bundle extension terms (length, count, fee) | P7 extensions |
| U-08 | Agency overdue notice cadence | P9 overdue job |
| P9-a | Suspension or reinstatement of sponsored learners for agency arrears | Access is preserved meanwhile |
| P9-b | Whether reservations and confirmations are held while an agency is overdue | Not held today |
| P9-c | Receipt allocation order (earliest instalment first is **provisional**) | P9 receipts |
| P9-d | Return or application of surplus and mismatched receipts | P9 exceptions |
| PD-P8-15 | Agency remedies when a batch is rescheduled | P8 |
| Refunds | Refund approval limits and financial-exception handling generally | Refunds |

### I.3 Can safely remain deferred

| ID | Decision |
|---|---|
| U-13 | A deposit larger than payment 1 |
| U-15 | NVQ bundle price per delivery mode |
| U-16 | Converting a self-funded learner to agency-sponsored |
| U-17 | Assigned seats when an agency bundle is refunded |
| U-18 | When short-course validity starts |
| U-19 | What each delivery mode includes |
| P9-e | Arrangements for card purchases (none today) |

---

## J. Implementation roadmap (dependency-ordered)

| Stage | Scope | Deliverables | Depends on | Acceptance | Main risks |
|---|---|---|---|---|---|
| **1. Backend foundation** | API service, PostgreSQL schema v1, IdP integration, sessions, role and scope model, audit (append-only), idempotency table, outbox, job runner, object storage, environments, CI/CD, logging, backups | Running staging stack; auth with MFA; `GET /me`; audit and idempotency middleware; migrations tooling | I.1 decisions D-01, D-05 | Cross-tenant and role-matrix API tests pass; audit cannot be updated (DB grant test); restore drill done | Under-specifying scope rules; skipping the restore test |
| **2. Core admission, Finance and seat transactions** | Programmes and versions, batches (tz required), enrolment and sign-up, agreements, seats (P1), terms (P2), batch choice (P3), schedules and deposits (P4, revised paths dormant), payments (PSP + bank verification), access decision (P5), transfers (P6), entitlements (P7), reservations (P8), arrangements (P9), scheduled jobs | Every operation in C rows 3–13 with the transactions in D | Stage 1; U-04, U-05, D-02, D-03 | Concurrency tests (K) green; invariant queries clean under load; P-suite expectations ported and green | Translating wrapper-chained rules; payment webhook edge cases |
| **3. Academic and learning operations** | Assignments, submissions, attachments, marking, observations, IQA, competency map, certificates, resources and protected downloads, Zoom link issue | C rows 14–15 | Stage 2 (access decision) | Protected-resource tests; immutable submission rounds; Assessor and IQA allocation tests | File scanning pipeline; large uploads |
| **4. Integrations and notifications** | Email/SMS via outbox; reminders (P7 30/14/7/0, P4 warnings once U-03 is decided, P9 overdue once U-08 is decided); Zoom; e-signature if required; bank statement import (optional); reporting exports | Provider adapters; templates; dead-letter handling | Stages 2–3; U-03, U-08, D-03 | Deduplication tests; failure and retry tests | Deliverability; template approval |
| **5. Migration, security testing and release** | Rehearsal migrations, reconciliation sign-off, penetration test, load test, DR test, production cut-over | Migration scripts and reports; pen-test report with fixes; runbooks | Stages 1–4; D-04 | Go-live checklist (L) fully met | Dirty source data; scope creep at cut-over |

Revised-terms workflows (P4 forfeiture, the P5 revised gate) ship **dormant** until U-01 and U-11 are approved and REVISED-1 is activated by an audited Super Admin action.

---

## K. Production test strategy

**What the 150 prototype suites give:**

- an executable list of business expectations (≈10,958 assertions);
- named refusal reasons;
- idempotency and invariant checks;
- cross-agency and role refusals.

They run against browser globals, so they **cannot** be reused as code. Use them as follows:

1. Port each P-suite case (ft-p1…ft-p9c) into an API-level test with the same name and expected outcome. This is the acceptance list for stage 2.
2. Keep the prototype and its suites as the reference oracle during the build. Freeze the baseline at the accepted commit.
3. Use the crawls and UI checks as a reference for the rebuilt UI (screens, copy, accessibility checks), not as gates.

**Missing tests:**

| Area | Required tests |
|---|---|
| API integration | Every endpoint: authn required, authz per role and scope, validation, error codes, idempotent repeat |
| Database transactions | Each D operation: commit-together, and rollback on injected failure at each step |
| Concurrent seat allocation | N parallel confirms on a batch with 1 place → exactly 1 succeeds; transfer and reserve racing the last place |
| Entitlement double-spend | Parallel confirmations against a bundle with 1 remaining entitlement; confirm racing expiry |
| Cross-tenant authorisation | Agency A against every agency-B resource and ID (read, write, list, search, export, file URL) |
| Payment reconciliation | Webhook replay, out-of-order, amount mismatch, duplicate bank ref, wrong payer, surplus, refund reversal |
| Protected resources | Signed-URL expiry; access closed → no URL; enumeration of object keys |
| Scheduled jobs | Cutoff, expiry, reminders and overdue: run twice → no duplicate; run late → correct outcome; DST boundaries in the batch tz |
| Backup and recovery | PITR restore to a timestamp; object-storage restore; runbook timed |
| Migration | Rehearsal imports; invariant queries; totals reconcile to source; no fabricated identity, receipt or signature |
| End-to-end | Production-like staging: real IdP, PSP sandbox, email sandbox, the 17-step P9 example and the P4/P5 individual journey |
| Security | External penetration test; dependency and secret scanning; CSP and XSS checks |

---

## L. Go-live acceptance checklist

The application qualifies for production only when **every** item is met. Passing the prototype suites is not sufficient.

- [ ] All I.1 decisions recorded and signed off by the client.
- [ ] No business write possible except through the server API; demo identity switchers, demo clock and `localStorage` persistence absent from the production build.
- [ ] IdP sign-in with MFA for staff and agency admins; session expiry and revocation verified.
- [ ] Role and tenant matrix tests green (100% of endpoints).
- [ ] Concurrency tests (seats, entitlements, receipts) green under parallel load.
- [ ] Invariant queries I-1…I-14 clean on staging after load and after migration rehearsal.
- [ ] PSP webhooks verified by signature; no client-reported payment accepted.
- [ ] Audit log append-only (DB grants tested) with server actor, role, IP and request id.
- [ ] Files: private storage, scanning, signed URLs; protected-resource tests green.
- [ ] Signed agreements stored immutably with hashes; legacy agreements labelled honestly.
- [ ] Scheduled jobs idempotent with monitoring and dead-letter alerts.
- [ ] Backups with PITR; restore drill passed within the agreed RTO/RPO.
- [ ] Migration rehearsed twice; reconciliation reports signed off by Finance and Academic Admin.
- [ ] Penetration test: no open Critical or High findings.
- [ ] Runbooks: incident, payment dispute, data subject request, restore.
- [ ] REVISED-1 still inactive unless U-01 and U-11 are approved; activation is a separate audited event.

---

## M. P0–P10 completion summary

| Phase | Outcome (prototype, browser-only) | Status |
|---|---|---|
| P0 | Decision freeze PD-P0-01…18, invariants I-1…I-14, entities, plan, unresolved U-01…U-19 | Documented |
| P1 | Seat ledger: one authority, capacity derived, legacy counts migrated without invention | Built and verified |
| P2 | Terms versions (LEGACY-1; REVISED-1 inactive), batch IANA tz, one Clock | Built and verified |
| P3 | Learner chooses an eligible batch; no silent reassignment | Built and verified |
| P4 | 28-day cutoff, routes A/B, bank received-at, forfeiture behind inactive REVISED-1 | Built and verified |
| P5 | Access gate (verified first payment + commenced batch; fails closed when indeterminate); SEC-01 enforcement points | Built and verified |
| P6 | Transfer request → approval / override → execution | Built and verified |
| P7 | Agency entitlement ledger, single consumption, expiry, extensions, reminders | Built and verified |
| P8 | Fixed-batch reservations, cutoff release, approved moves; single-price programmes (review closure) | Built and verified |
| P9 | Agency arrangements, receipts and exceptions, overdue reviews (no automatic suspension), sponsored access gate | Built and verified; accepted for the prototype |
| P10 | This document: server-enforcement matrix, transactions, security, data model, architecture, decisions, roadmap, tests, go-live | Delivered (read-only) |

**Final prototype gate (P9, reused):** 150 suites, 10,958 passed, 0 failed; UI check 1,146 passed; crawls clean (1,059 legacy and 736 client snapshots × 3 widths); build passed; smoke 20 passed (Chrome; headless Edge is broken locally).

**The system is not production-ready.** It is a verified specification for one.

---

## N. Git status and confirmation

- HEAD: `b096bf8`.
- All P1–P9 work and earlier local changes remain uncommitted and untouched.
- This phase added exactly one file: `P10-PRODUCTION-ARCHITECTURE-AND-READINESS.md` (untracked).
- No code, test, fixture or decision register was modified.
- No commit, push, deploy, stash, reset or revert was made.
- No suite, crawl, build or smoke run was made (efficiency rule 10); the P9 gate is the functional baseline.
