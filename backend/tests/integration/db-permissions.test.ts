import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { migrationsDir } from '../../src/shared/paths.js';
import { migrateUp } from '../../src/database/migrate.js';
import { createTestDatabase, type TestDatabase } from '../support/db.js';

/**
 * The runtime role's privileges, checked on a real database (Stage 1A acceptance items 2 and 3, extended to every
 * Stage 1B table): no schema changes, no migrations, no way to switch the audit triggers off, no direct deletes.
 */
describe('runtime database role permissions', () => {
  let db: TestDatabase;
  let api: pg.Pool;
  let owner: pg.Pool;

  beforeAll(async () => {
    db = await createTestDatabase();
    api = new pg.Pool({ connectionString: db.appUrl, max: 2 });
    owner = new pg.Pool({ connectionString: db.ownerUrl, max: 2 });
    await owner.query(
      `INSERT INTO audit_event (actor_type, actor_label, operation, outcome, entity_type) VALUES ('system', 't', 'test.seed', 'succeeded', 'x')`,
    );
  });
  afterAll(async () => {
    await api?.end();
    await owner?.end();
    await db?.drop();
  });

  const refused = (sql: string) => expect(api.query(sql)).rejects.toMatchObject({ code: expect.stringMatching(/^(42501|42939)$/) });

  it('cannot modify or remove audit history', async () => {
    await refused(`UPDATE audit_event SET reason = 'x'`);
    await refused(`DELETE FROM audit_event`);
    await refused(`TRUNCATE audit_event`);
  });

  it('cannot disable audit triggers by any route', async () => {
    await refused(`ALTER TABLE audit_event DISABLE TRIGGER ALL`);
    await refused(`ALTER TABLE audit_event DISABLE TRIGGER audit_event_no_update_delete`);
    await refused(`DROP TRIGGER audit_event_no_update_delete ON audit_event`);
    await refused(`CREATE OR REPLACE FUNCTION audit_event_refuse_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$`);
    // session_replication_role = replica would skip ordinary triggers; it is reserved to superusers.
    await refused(`SET session_replication_role = replica`);
  });

  it('cannot change the schema or run migrations', async () => {
    await refused(`CREATE TABLE intruder (id int)`);
    await refused(`ALTER TABLE app_user ADD COLUMN x int`);
    await refused(`DROP TABLE outbox_message`);
    await refused(`CREATE INDEX ON job_run (state)`);
    await refused(`INSERT INTO schema_migration (version, name, checksum) VALUES ('9999', 'x', 'x')`);
    await expect(migrateUp(db.appUrl, migrationsDir())).rejects.toThrow();
  });

  it('cannot delete from any Stage 1B table; history is kept and purges go through definer functions only', async () => {
    for (const t of ['auth_session', 'auth_login_attempt', 'outbox_message', 'outbox_consumption', 'job_run', 'idempotency_record', 'rate_limit_counter']) {
      await refused(`DELETE FROM ${t}`);
      await refused(`TRUNCATE ${t}`);
    }
  });

  it('cannot redefine or take over the purge functions', async () => {
    await refused(`CREATE OR REPLACE FUNCTION purge_expired_idempotency_records(max_rows integer) RETURNS integer LANGUAGE sql AS $$ SELECT 0 $$`);
    await refused(`ALTER FUNCTION purge_expired_auth_records(integer, integer) OWNER TO CURRENT_USER`);
  });

  it('the purge functions are not executable by PUBLIC (a role outside ilumin_app)', async () => {
    const r = await owner.query<{ proname: string; public_exec: boolean }>(
      `SELECT p.proname,
              EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                       WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') AS public_exec
         FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname LIKE 'purge\\_%' ORDER BY 1`,
    );
    expect(r.rows.map((x) => x.proname)).toEqual([
      'purge_delivered_outbox_messages',
      'purge_expired_auth_records',
      'purge_expired_idempotency_records',
      'purge_expired_rate_limit_counters',
      'purge_finished_job_runs',
    ]);
    expect(r.rows.every((x) => !x.public_exec)).toBe(true);
  });

  it('the purge functions refuse retention below their minimums', async () => {
    await expect(api.query(`SELECT purge_expired_auth_records(0, 10)`)).rejects.toThrow(/retention_days/);
    await expect(api.query(`SELECT purge_finished_job_runs(0, 10)`)).rejects.toThrow(/retention_days/);
    await expect(api.query(`SELECT purge_expired_rate_limit_counters(0)`)).rejects.toThrow(/max_rows/);
  });
});
