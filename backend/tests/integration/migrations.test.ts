import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MigrationError, migrateUp, migrationStatus, readMigrationFiles } from '../../src/database/migrate.js';
import { migrationsDir } from '../../src/shared/paths.js';
import { createEmptyDatabase, type TestDatabase } from '../support/db.js';

describe('migration runner (real PostgreSQL)', () => {
  let db: TestDatabase;
  let dir: string;

  beforeAll(async () => {
    db = await createEmptyDatabase();
    dir = mkdtempSync(join(tmpdir(), 'ilumin-mig-'));
    cpSync(migrationsDir(), dir, { recursive: true });
  });
  afterAll(async () => {
    await db?.drop();
    rmSync(dir, { recursive: true, force: true });
  });

  const tables = async () => {
    const c = new pg.Client({ connectionString: db.ownerUrl });
    await c.connect();
    try {
      const r = await c.query<{ tablename: string }>(`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`);
      return r.rows.map((x) => x.tablename);
    } finally {
      await c.end();
    }
  };

  it('applies every migration to an empty database, then is a no-op', async () => {
    const files = readMigrationFiles(dir);
    expect(files.map((f) => f.file)).toEqual([
      '0001_identity_and_access.sql',
      '0002_audit_event.sql',
      '0003_idempotency_record.sql',
      '0004_idempotency_lifecycle.sql',
      '0005_sessions_and_rate_limits.sql',
      '0006_outbox_and_jobs.sql',
      '0007_programmes_batches_seats.sql',
      '0008_applications_enrolment.sql',
    ]);
    const first = await migrateUp(db.ownerUrl, dir);
    expect(first.applied).toHaveLength(files.length);
    expect(await tables()).toEqual([
      'agency',
      'agency_user',
      'app_user',
      'application_event',
      'audit_event',
      'auth_login_attempt',
      'auth_session',
      'batch',
      'batch_fee_option',
      'enrolment',
      'fee_option',
      'idempotency_record',
      'job_run',
      'learner_application',
      'learner_profile',
      'outbox_consumption',
      'outbox_message',
      'programme',
      'programme_version',
      'programme_version_fee_option',
      'rate_limit_counter',
      'schema_migration',
      'seat_allocation',
      'staff_scope',
      'terms_version',
      'user_identity',
      'user_role',
    ]);
    const second = await migrateUp(db.ownerUrl, dir);
    expect(second.applied).toEqual([]);
  });

  // Stage 2A adds the programme, batch and seat-ledger tables; Stage 2B the learner profile, applications and the
  // enrolment record. Payment, agreement, entitlement and agency-commercial tables stay out.
  it('creates no financial, agreement or entitlement tables and inserts no data except the PD-P2-03 terms versions', async () => {
    const t = await tables();
    for (const forbidden of ['seat', 'payment', 'agreement', 'bundle', 'reservation', 'entitlement_use', 'invoice']) {
      expect(t).not.toContain(forbidden);
    }
    const c = new pg.Client({ connectionString: db.ownerUrl });
    await c.connect();
    try {
      for (const tbl of [
        'app_user', 'user_identity', 'user_role', 'staff_scope', 'agency', 'agency_user', 'audit_event',
        'auth_session', 'auth_login_attempt', 'outbox_message', 'job_run', 'idempotency_record',
        'programme', 'programme_version', 'fee_option', 'programme_version_fee_option', 'batch', 'batch_fee_option',
        'seat_allocation', 'learner_profile', 'learner_application', 'application_event', 'enrolment',
      ]) {
        expect((await c.query(`SELECT count(*)::int AS n FROM ${tbl}`)).rows[0].n).toBe(0);
      }
      // Reference data only: LEGACY-1 in force, REVISED-1 a frozen draft (PD-P2-03).
      expect((await c.query(`SELECT code, status FROM terms_version ORDER BY code`)).rows).toEqual([
        { code: 'LEGACY-1', status: 'in_force' },
        { code: 'REVISED-1', status: 'draft' },
      ]);
    } finally {
      await c.end();
    }
  });

  it('reports status to the API role (readiness reads it)', async () => {
    const c = new pg.Client({ connectionString: db.appUrl });
    await c.connect();
    try {
      const s = await migrationStatus(c, dir);
      expect(s.pending).toEqual([]);
      expect(s.problems).toEqual([]);
      expect(s.applied).toHaveLength(8);
    } finally {
      await c.end();
    }
  });

  it('detects a pending migration and applies only that one', async () => {
    writeFileSync(join(dir, '0904_test_extra.sql'), 'CREATE TABLE test_extra (id int);\n');
    const c = new pg.Client({ connectionString: db.ownerUrl });
    await c.connect();
    try {
      expect((await migrationStatus(c, dir)).pending).toEqual(['0904_test_extra.sql']);
    } finally {
      await c.end();
    }
    expect((await migrateUp(db.ownerUrl, dir)).applied).toEqual(['0904_test_extra.sql']);
  });

  it('refuses to run when an applied migration was edited', async () => {
    const f = join(dir, '0904_test_extra.sql');
    writeFileSync(f, `${readFileSync(f, 'utf8')}-- edited\n`);
    await expect(migrateUp(db.ownerUrl, dir)).rejects.toThrow(/was modified after it was applied/);
    writeFileSync(f, 'CREATE TABLE test_extra (id int);\n');
  });

  it('rolls back a failing migration completely and records nothing', async () => {
    writeFileSync(join(dir, '0905_broken.sql'), 'CREATE TABLE half_done (id int);\nSELECT * FROM no_such_table;\n');
    await expect(migrateUp(db.ownerUrl, dir)).rejects.toBeInstanceOf(MigrationError);
    expect(await tables()).not.toContain('half_done');
    const c = new pg.Client({ connectionString: db.ownerUrl });
    await c.connect();
    try {
      expect((await migrationStatus(c, dir)).pending).toEqual(['0905_broken.sql']);
    } finally {
      await c.end();
    }
    rmSync(join(dir, '0905_broken.sql'));
  });

  it('serialises concurrent runners (advisory lock): each migration is applied exactly once', async () => {
    writeFileSync(join(dir, '0906_slow.sql'), 'SELECT pg_sleep(0.3);\nCREATE TABLE slow_one (id int);\n');
    const results = await Promise.all([migrateUp(db.ownerUrl, dir), migrateUp(db.ownerUrl, dir), migrateUp(db.ownerUrl, dir)]);
    expect(results.flatMap((r) => r.applied)).toEqual(['0906_slow.sql']);
  });

  it('the API role cannot run migrations (no DDL rights)', async () => {
    const fresh = await createEmptyDatabase();
    try {
      await expect(migrateUp(fresh.appUrl, migrationsDir())).rejects.toThrow();
    } finally {
      await fresh.drop();
    }
  });
});
