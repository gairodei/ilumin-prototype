# P0: Batch, seat and enrolment decision freeze (11 Nov 2026)

**Status: provisional implementation baseline.** This records business decisions confirmed in the client policy discussions after the read-only Batch Intake, Seat Management and Enrolment Audit (sections A–H, 11 Nov 2026). It is documentation only. **No code, data, fixture or test has been changed**, and nothing described here as "missing" is built.

- Audit baseline: HEAD `b096bf8` plus the uncommitted CBR, CBC, CMA, PDS, L3, FB1 and FB2 work. FB2 gate: 131 suites, 10,252 passed, 0 failed.
- Audit report (outside the repo): session scratchpad `bsa/BATCH-INTAKE-SEAT-AUDIT.md`. The audit's item numbers (X1–X14, C1–C12, B3 items, H1–H4) are cited below.
- Register: `PROVISIONAL-DECISIONS.md`, section "P0: Batch, seat and enrolment decision freeze", points here. Earlier register entries are **not** edited or deleted. Section 3 below records which of them are superseded and in what scope.

How to read this document:
- **Confirmed** = a business decision confirmed in the policy discussions. Not to be reopened.
- **Built** = existing behaviour in the code today (audit section A).
- **Missing** = not built.
- **Contract** = needs client approval of contractual wording before it can be switched on.

Contents:
1. Confirmed decisions (PD-P0-01 … PD-P0-18)
2. Status matrix: confirmed vs built vs missing vs contract
3. Superseded legacy rules and their replacements
4. Architectural invariants
5. Data entities and ownership
6. Implementation plan P1–P10, in dependency order
7. Unresolved items (policy, operational and contractual)

---

## 1. Confirmed decisions

### PD-P0-01 Individual learner batch selection

- The learner chooses from **existing, eligible** batches. A batch is never created implicitly during enrolment.
- A learner is **never silently reassigned** to another batch.
- Each choice shows the batch start date, capacity (places left) and payment and deposit eligibility.
- Capacity is revalidated before the enrolment is confirmed.
- Only batches that **have not started** accept new enrolments.
- This applies to Self-Paced and Fully Assisted learners alike.
- A programme with one delivery mode never asks for a second-mode selection.
- The fee option chosen decides the delivery mode.
- Both modes may share one batch where the programme permits it (W1, DM, CR rules unchanged).

### PD-P0-02 Course duration and instalments (FB2 retained)

- The Course Duration is entered in Course Details. Payment schedules are spread across it (PD-FB2-01, PD-FB2-02).
- Each fee option sets its tuition fee and its permitted instalment counts.
- The first scheduled instalment is anchored to batch commencement (PD-CB-09, PD-FB2-05).
- Amounts are in whole pence, with the rounding reconciled on the last payment (PD-E1-15).
- Payment Schedule Duration is **not** reintroduced for new courses. Pre-FB2 programmes keep theirs (PD-FB2-06).
- Historical approved schedules and signed terms are preserved.

### PD-P0-03 Deposit cutoff (new enrolments under revised terms)

- Each batch has a configured **Academy time zone**.
- **Deposit cutoff date** = the batch start's calendar date (in the batch time zone) minus **28 calendar days**.
- The **last day to make a new deposit** is the day **before** the cutoff date.
- A learner who has paid a deposit must complete the required **first-instalment balance by the end of the cutoff day** (batch time zone).
- Worked example: batch starts 30 January. Last day for a new deposit: 1 January. First-instalment balance due by the end of 2 January.
- Calculations are calendar-aware in the batch time zone. `Math.ceil` of a UTC millisecond difference is not used (audit X3, H4).
- The deadline and its time zone are shown **before** the deposit is paid. After payment the exact deadline is shown at once, and the warning becomes more urgent as the deadline approaches.
- A deposit **reserves a seat. It never grants access.**
- The deposit is credited against the first instalment. It never increases total tuition (gross credit, PD-FC-01, PD-FC-12 unchanged).
- Three dates stay distinct on every first payment: the **scheduled instalment date** (batch start), the **deposit-route payment deadline** (end of the cutoff day), and the **actual receipt timestamp**.
- The payment-time 1–28-day hold is superseded **for new enrolments under revised terms only** (see PD-P0-09).

### PD-P0-04 Payment after a deposit

Both routes are supported:
- **Route A:** deposit, then the full remaining tuition balance. That payment is the learner's first-instalment requirement and is due by the cutoff.
- **Route B:** deposit, then the remaining first-instalment balance by the cutoff, then the later scheduled instalments on their dates.

The first-instalment requirement must be met by the cutoff on both routes. The whole outstanding course fee is **not** due at the cutoff when an approved instalment plan is used.

### PD-P0-05 Missed cutoff and forfeiture (new enrolments under approved revised terms only)

- If the required first-instalment balance is **not received** by the deadline, the deposit is **forfeited** and the seat reservation is **released**.
- The learner may choose another eligible future batch. A **new payment** is required.
- No automatic carry-forward, refund or credit of the forfeited deposit.
- Forfeiture and seat release are recorded in Finance and in the audit history.
- **Contract:** this is a new financial policy. It needs client and contractual approval, clear disclosure before payment, and updated offer-letter and payment wording **before it is activated**.
- It is never applied retroactively to older signed terms.

### PD-P0-06 Bank transfers

- Timeliness is decided by the **verified actual receipt date and time in the Academy bank account**.
- A transfer only initiated by the cutoff does not count as received.
- Finance verification may happen later. A payment received on time stays timely even when verified after the deadline.
- Course access stays blocked until Finance verifies the required payment.
- A transfer awaiting verification is in a **pending reconciliation** state.
- The deposit is not irreversibly forfeited, and the seat is not released, while a timely payment may still be awaiting verification.
- The cutoff is evaluated in the selected batch's configured time zone.
- No reconciliation timeout is defined. That is an open operational policy (section 7, U-02).

### PD-P0-07 Course access

**Individual learners**, all of:
1. a confirmed, eligible enrolment;
2. the required first-instalment payment **verified**;
3. the assigned batch **has commenced**;
4. the existing permission and academic restrictions satisfied (SEC-01 `lockFor` chain, withdrawals, pauses, archive).

**Agency-sponsored learners**, all of:
1. a confirmed, eligible enrolment;
2. the assigned batch has commenced;
3. the required agency payment verified, **or** an expressly Finance-approved payment arrangement in force;
4. the existing permission and academic restrictions satisfied.

A deposit, a pending bank transfer, an unconfirmed agency assignment or a purchased seat entitlement **never** grants course access on its own.

### PD-P0-08 Batch rescheduling

- Existing learners keep their signed first-instalment deadlines and payment schedules.
- New applicants use the rescheduled batch's new cutoff.
- Signed terms are never changed silently after a reschedule.
- Amending signed financial terms needs explicit approval, the learner's agreement, and versioned history.
- If a proposed earlier start conflicts with a learner's signed deadline, the change **fails safely** and must be resolved before it takes effect.
- Historical versions and audit entries are preserved.

### PD-P0-09 Existing historical enrolments

- Existing signed payment-time seat holds are preserved.
- Historical deposit and access conditions are preserved as contractually agreed.
- The new forfeiture and cutoff rules are never imposed retroactively.
- Revised policies apply only to new enrolments under approved updated terms.
- **Every learner is linked to the terms / policy version that governs them.**

### PD-P0-10 Agency purchasing and entitlements

- Both **flexible programme bundles** and **fixed-batch reservations** are supported.
- Every guaranteed fixed-batch reservation is backed by a **purchased bundle entitlement**. Standalone fixed-batch seat purchases are not supported.
- Bundle validity is configurable (for example 360 days). Unused entitlements expire at bundle expiry.
- Learner enrolment must be **confirmed before bundle expiry**. The batch may start later.
- Confirmed learners keep their course access whatever happens to the bundle afterwards.
- Expired entitlements are **never reactivated** by a direct assignment, a seat return or an extension.
- Five things stay distinct: purchased entitlement, batch reservation, named learner assignment, confirmed enrolment, course access.

### PD-P0-11 Agency fixed-batch reservations

- A reservation needs Finance-verified payment or an expressly approved payment arrangement.
- Unnamed confirmed reservations count against batch capacity.
- Unassigned reservations release **automatically 28 days before batch start**.
- A released reservation does not forfeit the underlying unexpired entitlement.
- An agency can **voluntarily release its own unnamed reservations at once, with no Academy approval**.
- Unnamed seats may move to another eligible existing batch **before the cutoff**, with **Academic Admin approval** and a destination capacity check.
- Confirmed learner seats cannot be released through unnamed-seat actions.
- Double counting, duplicate returns and overbooking are prevented.

### PD-P0-12 Agency learner operations

- Agencies choose from existing eligible batches when registering NVQ learners (resolves AG-1 open item (b)).
- The selected fee option decides the delivery mode where applicable.
- Programme, mode, batch readiness, capacity and entitlement eligibility are validated.
- One purchased entitlement is consumed **exactly once**, when the enrolment is **confirmed**.
- Substitution of an agency learner needs Academic Admin approval, before batch commencement.
- A named agency learner's batch transfer needs Academic Admin approval, before commencement.
- Signed financial terms are preserved. Unsupported changes are refused.
- An original learner's identity or academic record is never overwritten.
- Substitutions and transfers are recorded in the audit history.

### PD-P0-13 Agency bundle expiry and extensions

- The agency is notified **30, 14 and 7 days** before bundle expiry, and again at expiry.
- Purchased, consumed and remaining entitlements are shown.
- The **Business Admin** approves bundle extensions.
- Both the extension request and its approval must happen **before expiry**. A pending request does not pause expiry.
- Expired entitlements are never revived automatically.
- After an approved extension, future reminders are rescheduled to the new expiry.
- Previously confirmed learner enrolments are unaffected.

### PD-P0-14 Agency financial arrangements

- The Finance Admin may approve **(A)** a single deferred payment date, or **(B)** a structured agency instalment plan with approved amounts and due dates.
- The approval, the responsible Finance administrator and the full audit history are recorded.
- An approved arrangement can authorise guaranteed reservations and learner access, where every other condition is met.
- Overdue agency payments trigger notifications and a Finance review.
- Learners are **not** suspended automatically for an agency's overdue balance. Finance can make an audited access decision under the authorised process.
- Agency receivables stay separate from individual learner payment schedules.

### PD-P0-15 Short courses

- Once an agency-sponsored learner is validly enrolled on a short course, access follows **that short course's own configured validity period**.
- Bundle expiry only prevents further new enrolments from unused entitlements. It does not end a confirmed learner's short-course access.

### PD-P0-16 Approval authority

| Action | Approver |
|---|---|
| Learner batch transfer | Academic Admin |
| Agency learner substitution | Academic Admin |
| Unnamed reservation reallocation to another batch | Academic Admin |
| Agency bundle extension | Business Admin |
| Agency payment arrangement | Finance Admin |
| Voluntary release of an agency's own unnamed seats | Agency (self-service, no approval) |
| Override of any of the above | Super Admin, with a mandatory audited reason |

Segregation of responsibilities is preserved. Every approval and override is recorded.

### PD-P0-17 Superseded prototype decisions

Recorded in section 3. Earlier decisions are kept in the register with their history. Supersession has an explicit scope.

### PD-P0-18 Architectural invariants

Recorded in section 4.

---

## 2. Status matrix

Code references are from the audit (`js/`, line numbers at the audit tree).

| Area | Confirmed decision | Built today | Missing | Contract approval needed |
|---|---|---|---|---|
| Batch selection (P0-01) | Learner chooses an eligible existing batch; no silent reassignment | Automatic assignment `chNearest` (CH-42, ch-b7c.js:25–49); silent replacement when full or not ready (ch-b7c.js:62, nb1-integrity.js:103); filters for status, not-started, country, fee option, mode readiness, Coordinator, L3-C | Choice list with start date, places and deposit eligibility; stop-and-ask on change; refundable record when full at checkout | No |
| Duration and instalments (P0-02) | FB2 calculation | Built (FB2, local, not committed) | — | No (already-signed terms unchanged) |
| Deposit cutoff (P0-03) | start − 28 calendar days in batch tz; last deposit the day before; balance by end of cutoff day | Payment-time hold of 1–28 days (`S4().cfg.hold`, ch-b2.js:223); eligibility `Math.ceil(daysTo) >= 28` in UTC (ch-b2.js:37, core.js:38), offered until 3 Jan 09:00 UTC for a 30 Jan start | Batch time zone field; calendar cutoff function; pre-payment and post-payment deadline display; urgency warnings; three distinct first-payment dates | **Yes**: new `{{payment_terms}}` and letter wording |
| Routes after deposit (P0-04) | A: full balance by cutoff. B: first-instalment balance by cutoff, then schedule | "Deposit and balance" (whole balance within the hold, PD-E1-05) and "Deposit, then N payments" (payment 1 less deposit by the hold, PD-FC-11) | Re-anchor both deadlines to the cutoff for new terms | **Yes** |
| Forfeiture (P0-05) | Forfeit and release; new batch needs a new payment; no carry-forward | Release on hold expiry, deposit "held pending Academy decision" (PD-DP-16); re-sign-up instalments only (P-32) | Forfeiture record in Finance and audit; reselection of a future batch with a deposit where eligible | **Yes**: forfeiture disclosure, letter and payment wording |
| Bank transfers (P0-06) | Received-at timestamp decides; pending reconciliation blocks forfeit and access | Transfer "awaiting confirmation" opens access (cb-pin.js:75–76, ch-b2.js:222); no received-at field separate from the ledger date | Received-at timestamp; pending-reconciliation state protecting seat and deposit; access only after verification | Wording should state the receipt rule |
| Access (P0-07) | Verified instalment 1 + commenced batch (individual); verified payment or approved arrangement + commenced batch (agency) | Access at sign-up completion, before start, by deposit or unverified transfer (CH-10/11, core.js:257–268); sponsored demo sign-up opens access with no checks (ch-b2.js:310) | Access gate in the `lockFor` chain covering pages and SEC-01 actions; pre-start view; legacy learners keep their contractual access | **Yes**: letter text "You can start learning straight away" (ch-b2.js:43) must change for new terms |
| Rescheduling (P0-08) | Existing keep signed deadlines; new use new cutoff; fail safe on conflict | L3-C2 refuses moves that change signed terms; PD-FC-14 keeps holds on date change; PD-CB-64 recalculates unpaid dates | Conflict detection for earlier starts vs signed cutoffs; amendment approval and versioning | Amendment wording when used |
| Historical enrolments (P0-09) | Preserve; link every learner to a terms version | Pinned terms `w.signup.pin`, plan versions, signed letters | Explicit terms / policy version on every learner, with all existing learners tagged legacy | No |
| Entitlements (P0-10, P0-13) | Records with expiry; consume at confirmation; no revival; reminders; BA extension | Bundle `{seats, used, validity}` (agency.js:39); `used++` at assignment; expiry computed, `Math.ceil` off by up to 24 h (agency.js:17, :138); expired bundles usable by direct call and `agySeatReturn`; `agUnassign` double return; one 30-day banner | Entitlement records and stored status; exact expiry; reminder jobs; extension request and approval; consumption at confirmation; fixes for X13, X14, C10 | Agency terms, if bundle terms state validity |
| Reservations (P0-11) | Model A with auto-release, voluntary release, approved reallocation | None (B3 item 6) | Whole model | Agency terms |
| Agency learners (P0-12) | Agency picks batch and fee option; consume once; approved substitution and transfer | NVQ seat opens an admission with `mode: null, batch: null`, which can never be approved (ag1-agency.js:133, nb1-integrity.js:145) | Batch and fee-option selection; substitution; transfer; identity-preserving audit | No |
| Agency finance (P0-14) | Finance arrangements A/B; overdue review; no auto-suspension | Seats credited only on confirmed card or paid invoice; agency overdue never pauses learners (by omission, finance.js:49) | Arrangements, receivables, overdue notifications, Finance review, audited access decision | Agency contract terms for arrangements |
| Short courses (P0-15) | Access follows course validity | Access ends at bundle validity (agency.js:487, ag1-agency.js:121) | Course-validity access for confirmed agency learners | No |
| Approval authority (P0-16) | Table in P0-16 | `chCanMove` includes Business Admin; `l3cCanAssign` excludes them; no approval step for moves | Approval requests per action; Super Admin audited override | No |
| Capacity | Invariant I-1 | Mutable counter `b.enrolled`, at least 9 writers; cancellation and `chDoMove` can overbook (H3) | Seat ledger (P1) | No |

---

## 3. Superseded legacy rules

Scope values:
- **New terms**: applies only to enrolments under the approved revised terms version. Learners already on earlier terms keep the earlier rule.
- **All future operations**: applies to every action taken after the change ships, without altering any signed term.

The code still implements every legacy rule below until its phase is built.

| Legacy rule | What it said | Replacement | Scope | Replaced in |
|---|---|---|---|---|
| **CH-10** (immediate access part) | Deposit, first instalment or a bank transfer awaiting confirmation completes the sign-up and opens content at once ("you start straight away") | PD-P0-07 access gate | New terms. Historical access conditions are preserved (PD-P0-09) | P5 |
| **CH-10** (deposit eligibility part) | Deposit offered when the batch is 28 or more days away, measured with `daysTo` rounding up (M-7) | PD-P0-03 calendar cutoff in the batch time zone; last deposit the day before the cutoff | New terms | P4 |
| **CH-11** | Content may open before the batch starts; admission review independent of payment | Access needs commencement (PD-P0-07). The admission-independence part is not changed by P0 | New terms | P5 |
| **CH-42** | Batch assigned automatically, no learner choice | PD-P0-01 learner choice | All future enrolments | P3 |
| Silent reassignment when full / not ready (ch-b7c.js:62, nb1-integrity.js:103) | Replace with the next nearest batch, tell the learner afterwards | Stop and ask (PD-P0-01) | All future enrolments | P3 |
| **P-32** (instalments-only re-sign-up, `noDeposit`) | After a released seat, Sign up again offers instalments only | PD-P0-05: choose any eligible future batch; a deposit where that batch is deposit-eligible; a new payment | New terms. Legacy releases keep P-32 | P4 |
| **PD-E1-05**, **PD-E2-06** (Deposit and balance) | Deposit, then the **whole** balance within the 1–28-day seat hold | PD-P0-04 route A: full balance by the cutoff | New terms | P4 |
| **S4 seat-hold setting** (`S4().cfg.hold`, 1–28 days) | Hold runs from the payment time | PD-P0-03 cutoff. The setting stays only to honour existing holds | New terms | P4 |
| **PD-DP-10** (hold expiry against the agreed hold timestamp) | Release when the payment-time hold ends | Release at the end of the cutoff day, except while a timely transfer awaits verification (PD-P0-06) | New terms. Existing holds keep PD-DP-10 | P4 |
| **PD-DP-16** (released deposit "held pending Academy decision") | No refund, retention or transfer recorded | Forfeited and recorded (PD-P0-05) | New terms only. Legacy releases stay "held" (open question carried forward, U-12) | P4 |
| **PD-FC-11** (deadline part only) | Payment 1 less the deposit due by the seat-hold date | Due by the end of the cutoff day (PD-P0-04 route B). The route itself is kept | New terms | P4 |
| **PD-FC-14** | On a batch date change, the hold and instalment 1 due date stay as agreed; "impact review needed" logged | Kept for existing learners. New applicants use the new cutoff; an earlier start that conflicts with a signed deadline fails safely (PD-P0-08) | All future reschedules | P6 |
| **PD-CB-64** | Unpaid dates recalculated from a new start before the batch starts | Signed dates are never changed silently; amendments need approval, agreement and versioning (PD-P0-08). L3-C2 already refuses changes to signed wording | All future reschedules | P6 |
| **PD-CB-10 / PD-CB-61** (late-enrolment catch-up) | Payments due before enrolment fall due at enrolment | Not reachable for new enrolments: only batches that have not started accept them (PD-P0-01). Kept for existing records | New enrolments | P3 |
| Admin "Assign / change batch" with no approval (ch-b7c.js:138–160, `chCanMove` includes Business Admin) | Direct move with a reason | Academic Admin approval; Super Admin audited override (PD-P0-16) | All future transfers | P6 |
| **PD-AG1-04** (short-course seat runs to bundle validity) | Access ends when the bundle expires | Access follows the course's own validity (PD-P0-15) | All future agency enrolments. Existing confirmed learners are not cut off by expiry | P7 |
| Entitlement used at assignment (`agyDoAssign`, `b.used++`) | Seat consumed when assigned | Consumed exactly once at confirmed enrolment (PD-P0-12) | All future agency enrolments | P7/P8 |
| AG-1 open item (b) | Who chooses an agency NVQ learner's option and batch: undecided | The agency, from eligible existing batches (PD-P0-12) | All future agency NVQ registrations | P8 |
| Demo `ACT.chSponsoredSignup` (ch-b2.js:310) | Sponsored sign-up takes a place and opens access with no entitlement or Finance check | PD-P0-07 agency access conditions | All future operations | P9 |
| Audit questions E1–E11 and H4.1–7 | Open | Answered by PD-P0-01…16, except the items in section 7 | — | — |

---

## 4. Architectural invariants

Every phase must preserve these. Each needs at least one property or regression test.

| # | Invariant |
|---|---|
| I-1 | Confirmed / occupied learner seats plus active unnamed reservations never exceed batch capacity. |
| I-2 | No purchased entitlement is consumed twice. |
| I-3 | No confirmed learner is removed solely because an unrelated entitlement expires. |
| I-4 | Seat take, release, transfer and reservation operations are idempotent: repeating one changes nothing further. |
| I-5 | A successful payment never disappears: every payment has a reconcilable payment or Finance record, including one taken on a batch that filled during checkout. |
| I-6 | The financial terms offered, signed and charged agree. |
| I-7 | Signed payment dates are never changed silently. |
| I-8 | Expired entitlements are never revived (assignment, return or extension). |
| I-9 | A deposit, a pending transfer, an unconfirmed assignment or an entitlement never grants access on its own. |
| I-10 | Every learner is linked to exactly one governing terms / policy version; revised-terms rules never act on a legacy-terms learner. |
| I-11 | Capacity is derived from seat records; any cached count can be rebuilt from them. |
| I-12 | Capacity checks and financial authorisation must eventually be enforced server-side. Browser checks are advisory (audit C7). |
| I-13 | One authoritative clock in production, with an explicit time zone on every batch. The prototype's simulated clocks (`agNow`, `dpNow`, `CLOCK_SHIFT`) must collapse to one. |
| I-14 | Every approval and override records actor, role, time, reason and before/after state. |

---

## 5. Data entities and ownership

Proposed logical entities. Names are illustrative; P1 and later phases decide the stored shape.

| Entity | Purpose | Key fields | Created / owned by | Approves or changes |
|---|---|---|---|---|
| **Batch** | A scheduled intake | start (calendar date + time zone), capacity, status, modes / fee options accepted | Academic Admin (existing rights) | Reschedule fails safe against signed deadlines |
| **Batch cutoff** (derived) | Deposit cutoff and last deposit day | `cutoffDate = startDate − 28` in batch tz; `lastDepositDate = cutoffDate − 1` | Computed, never stored as truth | — |
| **Terms / policy version** | Which rules govern a learner | id, effective from, letter wording version, rules (hold model, forfeiture, access gate) | Super Admin activates after client approval | New version only after contractual approval |
| **Sign-up terms (pin)** | The frozen offer the learner signed | terms version, fee option, schedule, deposit, deadline(s) | System at sign-up | Never rewritten; amendment = new version with agreement |
| **Seat allocation** (ledger) | One record per place in a batch | batch, kind (direct / agency reserved / agency named), state, learner?, agency?, entitlement?, history | System through one seat API | Transfers: Academic Admin. Override: Super Admin |
| **Payment schedule row** | A contractual instalment | scheduled date, deposit-route deadline, amount | System from FB2 rules | Changes only by approved amendment |
| **Payment / transaction** | Money received | method, amount, **receivedAt** (bank), recordedAt, verifiedAt, verifier, state (pending reconciliation / verified / refunded) | Learner or Finance | Finance verifies |
| **Deposit** | Seat-reserving payment | amount, credited to instalment 1, state (held / credited / forfeited / refunded) | System | Forfeiture: system at deadline, recorded in Finance |
| **Forfeiture record** | Deposit forfeited and seat released | learner, batch, amount, terms version, time | System | Finance visibility; Super Admin override audited |
| **Enrolment** | Confirmed place on a programme / batch | learner, batch, fee option, mode, terms version, entitlement? | System on confirmation | — |
| **Access state** (derived) | Can the learner open content | from enrolment, verified payment or arrangement, commencement, existing locks | Computed | Finance audited access decision (agency overdue) |
| **Agency bundle purchase** | What the agency bought | product, quantity, validity, expiresAt, payment state | Agency buys; Business Admin publishes products | Extension: Business Admin |
| **Entitlement** | One purchased seat right | bundle, status (unused / reserved / consumed / lapsed), expiresAt | System on verified payment or approved arrangement | — |
| **Reservation** (model A) | Unnamed place in a fixed batch backed by an entitlement | batch, entitlement, state (reserved / released / reallocated / named) | Agency | Release: agency, no approval. Reallocation: Academic Admin |
| **Named assignment** | Agency learner placed on a reservation or entitlement | learner, reservation or entitlement, batch, fee option | Agency | Substitution and transfer: Academic Admin |
| **Approval request** | Transfer, substitution, reallocation, extension, arrangement | kind, requester, approver role, state, decision, reason, timestamps | Requester | Role per PD-P0-16 |
| **Payment arrangement** | Finance-approved agency deferral | type (single date / instalment plan), amounts, due dates, approver | Finance Admin | Finance Admin |
| **Agency receivable** | What the agency owes | invoice / arrangement, due dates, paid, overdue state | Finance | Finance review on overdue |
| **Reminder / scheduled job** | Bundle 30/14/7/expiry notices, cutoff releases, reconciliation checks | target, fire time, state | System | Rescheduled on approved extension |
| **Audit entry** | History of every state change, approval and override | actor, role, action, before/after, reason, time | System | Append-only |

---

## 6. Implementation plan, in dependency order

Each phase follows the usual workflow: build, self-check, report, stop. Nothing is committed or pushed until the user accepts it.

| Phase | Scope | Depends on | Gate |
|---|---|---|---|
| **P1 Seat ledger** | One seat record per place; capacity derived (I-1, I-11); one `seatTake / seatRelease / seatMove` API with one place check; route every current writer through it (chComplete, chDoMove and its wrappers, cancellation, admin add, waitlist offers, seat release); seeded counts migrated as legacy unattributed seats with no count change; refundable payment record when full at checkout (I-5) | — | Count before = count after for every fixture; overbooking property test |
| **P2 Terms versions, batch time zone and one clock** | Terms / policy version on every learner (all existing = legacy); batch time zone field (default per U-04); calendar-date helpers in a batch tz; collapse `agNow` and `dpNow` onto one simulated clock. No behaviour change | — (parallel with P1) | Every existing learner resolves to the legacy version; fixtures unchanged |
| **P3 Learner batch choice** | Replace CH-42 with a list of eligible existing batches (start, places, deposit eligibility, cutoff); keep the existing filters; stop and ask when the chosen batch fills or becomes ineligible; capacity rechecked at confirmation | P1 | No silent reassignment on any path |
| **P4 Deposit cutoff, routes and forfeiture** | Cutoff from P2; last-deposit-day rule; deadline and time zone shown before payment; exact deadline and rising urgency after; routes A and B anchored to the cutoff; three distinct first-payment dates; received-at on transfers and the pending-reconciliation state; forfeiture and release with Finance and audit records; reselect a future batch (replaces P-32); legacy holds untouched | P1, P2, P3 | **Built behind a revised-terms version that cannot be activated for real learners until the client approves the wording (U-01)** |
| **P5 Individual access gate** | Access = confirmed enrolment + verified instalment 1 + commenced batch + existing locks; in `lockFor` so SEC-01 covers actions; pre-start view (dashboard, admission, payments, documents); legacy-terms learners keep their contractual access | P2, P4 | Widest regression (audit F): restated checks citing PD-P0-07, never loosened; client demo needs commenced batches or legacy terms |
| **P6 Rescheduling and approved transfers** | Approval request workflow; Academic Admin approves transfers; Super Admin audited override; L3-C2 terms check and capacity check kept; earlier start that conflicts with a signed deadline fails safely; new applicants get the new cutoff | P1, P2, P4 | No signed date changes without an approved amendment |
| **P7 Agency entitlements (model B)** | Entitlement records with stored status and exact `now >= expiresAt`; consume once at confirmed enrolment; return after expiry lapses; fix the X13, X14 and C10 defects; reminders at 30/14/7 days and expiry; extension request and Business Admin approval, both before expiry; reminders rescheduled; short-course access follows the course validity | P1, P2 | Entitlement property tests (I-2, I-3, I-8) |
| **P8 Agency NVQ registration and reservations (model A)** | Agency chooses fee option and eligible batch; reservations backed by entitlements and counted in capacity; automatic release at the cutoff (entitlement kept if unexpired); voluntary release limited to unnamed reserved seats; reallocation with Academic Admin approval and destination check; substitution and named transfer with Academic Admin approval before commencement; original identity and record preserved | P1, P3, P6, P7 | No unnamed-seat action reaches a named or confirmed seat |
| **P9 Agency finance and agency access gate** | Payment arrangements (single date or instalment plan) approved by Finance Admin; receivables separate from learner schedules; overdue notifications and Finance review, never automatic suspension; audited Finance access decision; agency access gate per PD-P0-07; retire the unchecked sponsored demo route | P5, P8 | Arrangement-backed reservations and access tested |
| **P10 Server-enforcement inventory** | API contract for every browser-only check (audit C7) and idempotency keys; one-clock and time-zone specification | — (parallel; finalised after P9) | Documentation |

---

## 7. Unresolved items

Only items the confirmed policy leaves open. Nothing here reopens a confirmed decision.

### Contractual approvals (must be in place before activation)

| # | Item | Blocks |
|---|---|---|
| U-01 | Client approval of the **revised terms version**: offer-letter text (the current CH_LETTER_TEXT promises "You can start learning straight away"), `{{payment_terms}}` wording for the cutoff, routes A and B, the receipt-time rule for transfers, and the **forfeiture** disclosure shown before payment | Activation of P4 and P5 for real learners |
| U-14 | Agency contract wording for reservations, entitlement expiry, extensions and payment arrangements, if the agency terms are to state them | Activation of P7–P9 |

### Operational and policy parameters not set by the decisions

| # | Item | Needed by |
|---|---|---|
| U-02 | **Bank-transfer reconciliation timeout.** How long a seat and deposit stay protected while a transfer claimed as timely awaits verification, and what happens if it is never verified. Not invented here | P4 |
| U-03 | **Warning urgency thresholds**: at how many days before the deadline the warning escalates (the decision says "increase urgency" but sets no thresholds) | P4 |
| U-04 | **Default time zone** for existing batches, and the rule for online batches with UK and UAE learners (each batch has one configured Academy time zone; which one an online batch gets is not stated) | P2 |
| U-05 | **Commencement moment** for the access gate: the start of the batch's start date in its time zone, or the stored start time (audit H4.4) | P5 |
| U-06 | **Agency automatic release moment**: the same end-of-cutoff-day rule as individual learners, or another moment on the cutoff date. Also whether "before the cutoff" for reallocation means the source batch's cutoff, the destination's, or both | P8 |
| U-07 | **Bundle extension terms**: length, number of extensions, and any fee | P7 |
| U-08 | **Agency overdue cadence**: when overdue notices go out and when the Finance review is raised | P9 |
| U-09 | **Batch cancellation** with confirmed learners, now that learners must never be silently reassigned (today cancellation moves them) | P3 / P6 |
| U-10 | **Waitlist** behaviour under learner choice (`b.wait`, `b.w1wait`) | P3 |
| U-11 | **Activation date** of the revised terms version, and whether sign-ups already started but not completed at that moment finish under the old or new version | P4 |

### Earlier open questions not answered by P0 (carried forward unchanged)

| # | Item | Register |
|---|---|---|
| U-12 | Money held for a **legacy** released reservation: refund, retention or transfer | PD-DP-16, Open client decisions |
| U-13 | A deposit larger than payment 1 | PD-FC-13 |
| U-15 | NVQ bundle price per delivery mode | AG-1 open (a) |
| U-16 | Converting a self-funded learner to agency-sponsored | AG-1 open (c) |
| U-17 | Assigned seats when an agency bundle is refunded | AG-1 open (d) |
| U-18 | Whether a short course's validity starts at assignment, enrolment or activation | AG-1 open (e); PD-P0-15 fixes the period, not its start |
| U-19 | What each delivery mode includes | P-31 |
