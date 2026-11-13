# ADR 0005: Fail-closed authorization policies with scope checks

- Status: Accepted for Stage 1A

## Decision

- **Roles (11)**:
  - `super_admin`, `system_admin`, `academic_admin`, `finance_admin`, `business_admin`;
  - `academic_coordinator`, `assessor`, `teacher`, `iqa`;
  - `learner`;
  - `agency_user`, which is **derived** from an active `agency_user` membership in an active agency and never granted in `user_role`.
- **Scopes**: `staff_scope` holds batch allocations (Coordinator, Teacher, Assessor, IQA) and learner-level Assessor overrides. A scope counts only while the matching role grant is active.
- **Policies** (`src/modules/authz/policy.ts`) are named async predicates, combined with `anyOf` / `allOf`. Anything not explicitly allowed is denied (empty `anyOf`/`allOf` deny). The primitives are:

  | Primitive | Checks |
  |---|---|
  | `hasAnyRole` | role |
  | `isSelf` / `notSelf` | own account |
  | `ownsLearnerRecord` | learner role + owner resolved from server records |
  | `memberOfAgency` (`requireAdmin`) | agency ownership; same 403 for a foreign or non-existent agency |
  | `assignedToBatch`, `coordinatorOfBatch` | batch allocation |
  | `allocatedAssessor` | learner override or batch Assessor allocation; a Teacher is never an Assessor (PD-MRG2-02) |
  | `isIndependentOfBatch` | IQA independence (PD-IQB-02) |
  | `approvalAuthority` / `canDecideApproval` | PD-P0-16 approver table; Super Administrator override with mandatory reason; nobody decides their own request |
  | `staffAccountAdmin`, `batchStaffAdmin`, `agencyAdministration` | PD-MR-G1-01, PD-IQB-09, PD-MR-G1-08/09 |

- **Fail closed, twice**: `buildApp()` refuses to start if any route lacks an access rule (an `onRoute` check). The request pipeline also denies a route with no rule. Only `GET/HEAD /health/live` and `/health/ready` are public (tested).
- **Refusals**: a refusal is `403 FORBIDDEN` and an `authz.denied` audit row with the policy name and reason. That row is committed separately, so a rolled-back operation still leaves the refusal on record.
- **Database backstops**: `CHECK` constraints prevent self-grants of roles, scopes and agency membership, and self status changes.

## Representative guarded endpoints (Stage 1A)

`GET /v1/me`, `GET /v1/users/:id` (self or admin), `GET|POST /v1/admin/users…` (role grants, revocation, status), and `GET /v1/agencies/:id/members` (cross-agency isolation).

The rules applied:
- System Administrators can't grant or change Super Administrator accounts.
- At least one active Super Administrator always remains. This is serialised by row locks and tested under concurrency.

## Open (not invented here)

- Whether a user may hold both staff roles and agency membership.
- Audit-log readers per role.
- Every domain rule of Stages 2–3.
