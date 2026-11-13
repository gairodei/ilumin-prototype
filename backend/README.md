# Ilumin Academy LMS — production backend (Stages 1A, 1B, 2A and 2B)

**Status: not production-ready.** Stage 2A adds the first domain layer: programmes, immutable programme versions, fee options, batches, batch staff allocations and the authoritative seat ledger (internal service only). Stage 2B adds learner profiles, applications with explicit batch choice (P3), academic review, and the enrolment-confirmation boundary — which **cannot confirm anything yet**: signed-agreement evidence and Finance authorization (Stage 2C) and admission-document review are fail-closed. There is no payment, agreement, entitlement, reservation, transfer or assessment logic yet.

This directory is separate from the browser prototype in the repository root. The prototype (`index.html`, `js/`, `tools/`) keeps its demo authentication, `STORE`, scripts and tests, and remains the behavioural reference. **Nothing here reads, imports or trusts prototype code, demo identities or role switchers.**

## What is here

| Area | Where | Decision record |
|---|---|---|
| Bootstrap, lifecycle, graceful shutdown | `src/main.ts`, `src/server.ts` | ADR 0001 |
| Validated configuration | `src/config/config.ts`, `.env.example` | — |
| HTTP pipeline, errors, validation, request IDs, logging, CORS | `src/app/` | ADR 0002 |
| PostgreSQL pool, transactions, migrations | `src/database/`, `migrations/` | ADR 0003 |
| Bearer-token verification (optional) | `src/modules/auth/oidc.ts` | ADR 0004 |
| **Browser sign-in (code + PKCE), sessions, CSRF** | `src/modules/auth/{routes,session,oidc-client,authenticate}.ts` | **ADR 0008** |
| Authorization primitives | `src/modules/authz/policy.ts` | ADR 0005 |
| Append-only audit + **read API** | `src/modules/audit/` | ADR 0006 |
| Idempotency + **retention classes and purging** | `src/shared/idempotency.ts`, migrations 0003–0004 | ADR 0007, **0011** |
| **Rate limiting** | `src/shared/rate-limit.ts` | **ADR 0009** |
| **Outbox, jobs, worker** | `src/modules/outbox/`, `src/modules/jobs/`, `src/worker/` | **ADR 0010** |
| **Ops monitoring** (queues, dead letters) | `src/modules/ops/routes.ts` | ADR 0010 |
| **Backup / restore drill** | `src/ops/backup-drill.ts`, `docs/backup-restore.md` | — |
| **Programmes, versions, fee options** (publication internal, Finance-gated) | `src/modules/programmes/`, migration 0007 | **ADR 0012** |
| **Batches, accepted fee options, staff allocations** | `src/modules/batches/`, migration 0007 | **ADR 0012** |
| **Seat ledger** (internal service: allocate / release / secure, occupancy, invariants) | `src/modules/seats/seat-service.ts` | **ADR 0012** |
| **Learner profile, applications, P3 batch choice, academic review** | `src/modules/learners/`, `src/modules/applications/`, migration 0008 | **ADR 0013** |
| **Enrolment confirmation boundary** (internal; prerequisite ports fail closed until Stage 2C) | `src/modules/enrolments/` | **ADR 0013** |
| Lock ordering, reservation release vs expiry, payment boundary, financial uniqueness | `docs/production-transaction-rules.md` | corrections to P10 |

### Endpoints

| Method and path | Access |
|---|---|
| `GET /health/live`, `GET /health/ready` | public (check names only) |
| `GET /v1/auth/login?returnTo=` | public; rate-limited per IP; `returnTo` must be on an allow-listed origin |
| `GET /v1/auth/callback` | public; failures rate-limited per IP; always `400 LOGIN_FAILED` on failure |
| `GET /v1/auth/session` | browser session: user, expiries, CSRF token |
| `POST /v1/auth/logout` | browser session + CSRF |
| `GET /v1/me` | any active authenticated user |
| `GET /v1/users/:userId` | self, or Super / System / Academic Admin |
| `GET /v1/admin/users/:userId` | Super / System Admin |
| `POST /v1/admin/users` | Super / System Admin; `Idempotency-Key`; sensitive rate limit |
| `POST /v1/admin/users/:userId/roles`, `…/roles/:role/revoke`, `…/status` | Super / System Admin, not self; reason; sensitive rate limit. Suspension or deactivation revokes all sessions |
| `GET /v1/agencies/:agencyId/members` | members of that agency, Business Admin, Super Admin |
| `GET /v1/audit/events` | **Super Admin only (provisional PD-1B-01)**; filters, ≤ 93-day range, ≤ 200 per page, cursor |
| `GET /v1/ops/status`, `POST /v1/ops/{outbox,jobs}/:id/requeue` | **Super Admin only (provisional PD-1B-02)**; requeue needs a reason |
| `GET /v1/programmes`, `GET /v1/programmes/:id`, `…/versions`, `…/versions/:versionId` | Super / System / Academic / Finance Admin (provisional PD-2A-01) |
| `POST /v1/programmes` (draft + version 1 + initial fee options) | Super / System / Academic Admin (PD-R1-10); `Idempotency-Key` |
| `POST /v1/programmes/:id/status` | same; reason; `expectedRowVersion`. **No publication route** (Finance workflow, Stage 2) |
| `GET /v1/batches` | batch administrators (all) or allocated staff (their batches only) |
| `GET /v1/batches/:id`, `GET /v1/batches/:id/occupancy` | batch administrators or staff allocated to that batch (provisional PD-2A-02) |
| `POST /v1/batches`, `PATCH /v1/batches/:id`, `POST …/status`, `PUT …/fee-options` | Super / Academic / System Admin (PD-W1-04); reason and `expectedRowVersion` on changes |
| `POST /v1/batches/:id/staff`, `POST …/staff/:allocationId/revoke` | Super / Academic / System Admin (PD-IQB-09); not self; P-33 and IQA independence |
| `GET /v1/batches/:id/seats`, `…/seats/:allocationId/history` | batch administrators and the batch's Coordinators; **read-only — no route writes seats** |
| `GET`, `POST /v1/learner/profile`; `GET /v1/learner/applications`, `GET /v1/learner/enrolments` | the learner themself (learner role); the profile is created once |
| `POST /v1/applications`; `PATCH /v1/applications/:id`; `PUT …/batch`; `POST …/submit`, `POST …/withdraw` | the application's own learner only; `Idempotency-Key`; `expectedRowVersion` |
| `GET /v1/applications/:id`, `…/history`, `…/eligible-batches`, `…/enrolment` | the application's learner, or admissions staff (Super / System / Academic Admin, PD-CD-13) |
| `GET /v1/applications` (worklist); `POST /v1/applications/:id/review`, `POST …/decision` | admissions staff, never on their own application; reasons for reject / return / withdraw. Approval needs document review (fails closed) |
| `GET /v1/enrolments/:id` | the learner, admissions staff, or a Coordinator of the enrolment's batch. **No route confirms an enrolment** |

Browser requests authenticate with the `__Host-ilumin_session` cookie. Every POST/PUT/PATCH/DELETE also needs an allowed `Origin` and the `X-CSRF-Token` from `GET /v1/auth/session`. Non-browser clients may use `Authorization: Bearer <provider access token>`, but only when `AUTH_BEARER_ENABLED=true`.

## Local setup

1. **PostgreSQL 16+** (tested with 18.3): `docker compose up -d` (set `POSTGRES_ADMIN_PASSWORD` in `.env`), or an existing local server.
2. **Roles and database:** set `LOCAL_DATABASE_ADMIN_URL`, `LOCAL_OWNER_PASSWORD` and `LOCAL_API_PASSWORD` in `.env`, then run `npm run db:setup-local`.
3. **Configuration:** copy `.env.example` to `.env` and fill it in. Every variable is validated at start-up, and all problems are listed at once (exit code 78).
4. **Migrate:** `npm run migrate`.
5. **Run:** `npm run dev` (API) and `npm run worker` (background worker), in two terminals.
6. **First Super Administrator:** `npm run admin:bootstrap -- --email … --name "…" --subject <provider sub> --reason "…"`.

The development database starts **empty**. Prototype fixtures are never loaded into it.

## Database prerequisites

Migrations do not create roles. Create them first (on a managed server with passwords from the secret store):

```sql
CREATE ROLE ilumin_app NOLOGIN;                                    -- receives the API/worker grants
CREATE ROLE ilumin_owner LOGIN PASSWORD '<from secret store>';     -- owns the schema; migrations only
CREATE ROLE ilumin_api LOGIN PASSWORD '<from secret store>' IN ROLE ilumin_app;  -- DATABASE_URL (API and worker)
CREATE DATABASE ilumin OWNER ilumin_owner;
```

`ilumin_api` has:
- no DDL rights;
- no `DELETE` on any table;
- only `SELECT`/`INSERT` on `audit_event`;
- `EXECUTE` on the five `purge_*` functions, which are the only way retention removes rows.

## Authentication setup (identity provider not yet chosen)

Any standards-compliant OIDC provider works. Register the backend as a **confidential client** for the authorization code flow with PKCE, then configure:

| Setting | What to provide |
|---|---|
| `OIDC_ISSUER` | The issuer exactly as in the provider's discovery document (trailing slashes matter) |
| `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET` | The backend's client registration; the secret comes from the secret store |
| `OIDC_REDIRECT_URI` | `https://<api-host>/v1/auth/callback`, registered exactly at the provider |
| `AUTH_REDIRECT_ORIGINS`, `AUTH_DEFAULT_REDIRECT` | The frontend origin(s), and the page the browser lands on after sign-in |
| `CORS_ALLOWED_ORIGINS` | The frontend origin(s). These are also the only `Origin`s accepted for state-changing requests |
| `OIDC_ALLOWED_ALGORITHMS` | The provider's signing algorithm, e.g. `RS256` |
| `AUTH_BEARER_ENABLED`, `OIDC_AUDIENCE` | Only if a non-browser client needs bearer tokens |

Provider-side requirements (P10):
- MFA for staff and agency administrators;
- password policy and lockout;
- a UK/EU data region (D-01).

Role or group claims are ignored: roles live in this database.

**Not verified against a real provider.** All sign-in tests run the real code against a local test issuer. Real-provider sign-in, MFA and logout must be tested once the provider is chosen.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` / `npm start` | API with reload / compiled API |
| `npm run worker` / `npm run worker:prod` | background worker: recurring jobs, job runner, outbox dispatcher. Run one or more; they coordinate through row claims |
| `npm run build`, `npm run typecheck` | compile to `dist/`; type-check sources and tests |
| `npm run migrate`, `npm run migrate:status`, `npm run migrate:prod` | apply / inspect migrations (owner role, `MIGRATION_DATABASE_URL`) |
| `npm run db:setup-local`, `npm run admin:bootstrap` | local roles and database; first Super Administrator |
| `npm run db:drill` | backup → restore → verify drill against a **disposable** server (`docs/backup-restore.md`) |
| `npm run test:ephemeral` | **all tests** on a throw-away PostgreSQL cluster (needs `initdb`/`pg_ctl`/`pg_dump`, or `PG_BIN`) |
| `npm test` | all tests against `TEST_DATABASE_ADMIN_URL` (a disposable server; set `PG_BIN` for the drill test) |
| `npm run ci:static`, `ci:secrets`, `ci:migrations`, `ci:audit` | static checks, secret scan, migration integrity, dependency audit |
| `npm run check` | typecheck + static + migrations + secrets + build + all tests |

On Windows, run the tests from a path with an upper-case drive letter (`C:\…`); `test:ephemeral` normalises this itself.

## CI

`.github/workflows/backend-ci.yml` runs on changes under `backend/`. It has read-only permissions, **no deployment** and no production credentials.

1. `npm ci` from the lockfile.
2. Typecheck, static checks, migration integrity (in pull requests, applied migrations must be unchanged versus the target branch), secret scan.
3. Production build.
4. Unit tests.
5. PostgreSQL 18 integration tests on a runner-local throw-away cluster, including migrations from empty, concurrency, sessions, outbox and jobs, and the backup/restore drill.
6. `npm audit --audit-level=high`.

A second job runs gitleaks over `backend/`. Actions are pinned to major versions (`@v4`) and gitleaks to an image tag; pinning to commit SHAs and digests is a follow-up.

## Background worker

- Each pass:
  1. inserts the current slot of each recurring job (database clock, UTC);
  2. runs claimed jobs;
  3. dispatches claimed outbox messages.
- Delivery is **at-least-once**: consumers must be idempotent.
- Built-in jobs are maintenance purges only. Domain jobs (deposit deadlines, reservation cutoff release, entitlement expiry, finance overdue checks, payment reminders) are **reserved names without implementations**.
- With no notification provider (`NOTIFICATION_TRANSPORT=none`), email and SMS messages wait in the outbox.
- Watch `GET /v1/ops/status` for `dead`/`dead_letter` counts, stuck runs (expired leases) and the oldest-due age.

## Current limitations

- **Identity provider not chosen:** real sign-in, MFA, provider logout and token lifetimes are unverified (ADR 0008).
- **Provisional authorization:** audit reads and ops monitoring are Super Admin only until the client decides who may read the audit log and operate the queues (PD-1B-01, PD-1B-02).
- **Rate limits:** the general API limit is per instance (in memory). The proxy or platform should add coarse per-IP limits. Rate-limit counters reset after a database failover (UNLOGGED table).
- **Retention defaults** (sessions, outbox, jobs, idempotency) are operational, not Academy policy (D-01). Audit retention is undecided, and audit events are never purged.
- **Missing operations pieces:** no metrics or alerting integration, no email or SMS provider, no object storage.
- **Backups:** PITR, off-region copies and a timed restore against RTO/RPO are not drilled (`docs/backup-restore.md`).
- **Database constraints:** `staff_scope.scope_id` still has no foreign key to `batch` (Stage 1A tests use synthetic batch ids); batch existence is checked by the allocation service under the batch lock. `seat_allocation.authority_ref` and `reservation_id` have no foreign keys until the enrolment (2B) and reservation (P8) tables exist; reservation places are refused by the database until then.
- **Stage 2B fail-closed items:** no admission can be approved in production (document review, PD-AC2-01) and no enrolment can be confirmed (signed agreement and Finance authorization, Stage 2C). The prerequisite adapters that make these work in tests live under `tests/` only and are refused outside the test environment, by the application and by the database (ADR 0013).
- **Stage 2B open items:** commencement on the start date is unresolved (U-05) and blocks confirmation; batches without a configured location are not offered to learners; a learner's country is set once (no correction path yet); approved applications cannot be withdrawn by the learner (not specified); no learner programme catalogue API; the reverse link "every `enrolment_confirmation` seat has an enrolment" is checked by the confirmation service, not yet by the database (Stage 2A tests use that authority with placeholder references).
- **Stage 2A open items:** no default batch time zone (U-04), no commencement instant (U-05, so `open → in_progress` is not offered), no cancellation of a batch with places (U-09), no rescheduling with places (P6). Seat outbox messages wait for consumers in later stages.
- **CI pinning:** actions are pinned to major versions, not SHAs. Docker images are pinned by tag, not digest; the compose image was not pulled locally (Docker daemon off).
