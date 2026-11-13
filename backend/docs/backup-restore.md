# Backup and restore

*Stage 1B. This proves that a **logical** backup restores into a working, correctly-privileged database. It does **not** prove managed point-in-time recovery (PITR), which must be drilled separately on the chosen PostgreSQL provider (P10 §G: PITR ≥ 7 days; the client sets the RPO and RTO).*

## What is tested

`tests/integration/backup-restore.test.ts` runs the drill on every CI run and every `npm run check`, on a disposable PostgreSQL 18 cluster with `pg_dump`/`pg_restore` 18. The source database is populated through the real API (users, roles, audit events, idempotency records, outbox, jobs). The tests check that:

- the restored database matches the source and keeps every safety property (below);
- a corrupt archive fails at the `restore` stage and leaves no half-built database;
- the drill refuses target names outside `ilumin_restore_drill_*`;
- passwords never appear on a command line.

## Procedure

### 1. Backup (logical)

```sh
# Run with the schema-owner role. The password comes from the secret store via PGPASSWORD, never on the command line.
PGPASSWORD="$OWNER_PASSWORD" pg_dump --format=custom --no-password \
  --file=ilumin-$(date -u +%Y%m%dT%H%M%SZ).dump \
  --dbname="postgres://ilumin_owner@<host>:5432/ilumin?sslmode=verify-full"
```

- Use a `pg_dump` whose major version is **≥ the server's**.
- Store the archive encrypted, in the agreed UK/EU region (D-01). It contains personal data and the audit trail.
- Unlogged tables (`rate_limit_counter`) are included but are disposable.

### 2. Restore (into a new, empty database)

Prerequisites on the target server are the same as for a fresh install (README, "Database roles"): `ilumin_app` (NOLOGIN), the owner role, and the API role as a member of `ilumin_app`.

```sh
psql "$TARGET_ADMIN_URL" -c "CREATE DATABASE ilumin_restored OWNER ilumin_owner"
PGPASSWORD="$TARGET_ADMIN_PASSWORD" pg_restore --exit-on-error --single-transaction --no-password \
  --dbname="postgres://<admin>@<target-host>:5432/ilumin_restored" ilumin-<timestamp>.dump
```

`--single-transaction` with `--exit-on-error` makes the restore all-or-nothing.

### 3. Migration compatibility

- The archive carries `schema_migration` (versions and checksums).
- After a restore, run `npm run migrate:status` with the release you will deploy. It must report no edited or missing migrations.
- Then run `npm run migrate` to apply any newer migrations. Never edit an applied migration to "fit" a restore.

### 4. Verification (automated)

`npm run db:drill` runs steps 1–3 and the verification. Set:
- `DRILL_SOURCE_URL`: the schema-owner role on the source;
- `DRILL_TARGET_ADMIN_URL`: a **disposable** server, never production;
- `PG_BIN`;
- `DRILL_KEEP_TARGET=true` to inspect the result.

It exits 0 only if all of these hold:

| Check | Query (summary) |
|---|---|
| Same data | per table: `count(*)` and `md5(string_agg(row::text ORDER BY row::text))` equal |
| Same sequence positions | `pg_sequences.last_value` equal (audit `seq` continues after the restored rows) |
| Schema current | `migrationStatus`: no pending, edited or missing migrations |
| Append-only audit intact | triggers `audit_event_no_update_delete`, `audit_event_no_truncate` and `idempotency_record_guard` present and enabled |
| Privileges intact | `ilumin_app`: INSERT on `audit_event`, no UPDATE, DELETE or TRUNCATE; no DELETE on any Stage 1B table |
| Purge functions locked down | the five `purge_*` functions are executable by `ilumin_app`, not by `PUBLIC` |

Manual spot check after any real restore:

```sql
SELECT version, name, applied_at FROM schema_migration ORDER BY version;
SELECT count(*), max(seq), max(occurred_at) FROM audit_event;
SELECT count(*) FILTER (WHERE status = 'active') AS active_users FROM app_user;
SELECT state, count(*) FROM outbox_message GROUP BY state;
```

## Failure handling

| Failure | What happens / what to do |
|---|---|
| `pg_dump` fails (auth, network, version) | Drill stage `dump`; no archive is kept. Check the role, TLS and the client version. |
| Target database exists or cannot be created | Stage `create`. The drill only creates `ilumin_restore_drill_*` names, so it cannot overwrite a real database. |
| `pg_restore` error (corrupt archive, missing role, version) | Stage `restore`. The single transaction rolls back, and the drill drops the half-built database. Create missing roles and retry. |
| Verification mismatch | Stage `verify` / `ok=false`. Keep the target (`DRILL_KEEP_TARGET=true`), compare the failing table, and do **not** use the backup until it is explained. |

## Credentials

- Passwords come from the secret store into `PGPASSWORD` in the child process environment only. URLs passed to `pg_dump` and `pg_restore` have the password removed.
- The archive is written to a private temporary directory and deleted after the drill, whether it succeeded or failed.
- Use separate credentials for backup (read) and restore (target admin). Never use production credentials against a drill target.

## Recovery runbook (outline; to be completed with the provider)

1. Declare the incident. Stop writes: scale the API and workers to zero, or put the site in maintenance mode.
2. Choose the recovery point: PITR timestamp (managed provider) or a logical archive.
3. Restore into a **new** database; never over the damaged one.
4. Run the verification above, then `npm run migrate:status`.
5. Point `DATABASE_URL` at the restored database. Start the API, then the workers.
   - Outbox messages and job runs resume from their stored state.
   - Leases held at the time of the backup expire and are reclaimed.
   - Delivery is at-least-once, so consumers must stay idempotent.
6. Reconcile with external systems (payment provider events after the recovery point) once Stage 2 exists. See production-transaction-rules §3.

**Not yet done:** PITR drill, off-region copy, object-storage restore, and a timed run against the agreed RTO/RPO (P10 §K).
