import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { DrillError, restoreDatabase, runBackupRestoreDrill, splitPassword } from '../../src/ops/backup-drill.js';
import { migrationStatus } from '../../src/database/migrate.js';
import { migrationsDir } from '../../src/shared/paths.js';
import { TEST_ROLES } from '../support/urls.js';
import { createTestContext, type TestContext } from '../support/context.js';

/**
 * Logical backup → restore → verify against a disposable database on the ephemeral cluster, using pg_dump/pg_restore of
 * the same major version (PG_BIN, set by test:ephemeral). Data is created through the real application; nothing comes
 * from the prototype.
 */
describe('backup and restore drill', () => {
  let ctx: TestContext;

  beforeAll(async () => {
    ctx = await createTestContext();
    const admin = await ctx.createUser({ roles: ['system_admin'] });
    for (let i = 0; i < 3; i++) {
      const r = await ctx.app.inject({
        method: 'POST',
        url: '/v1/admin/users',
        headers: { ...(await ctx.auth(admin)), 'idempotency-key': `drill-key-000${i}` },
        payload: { email: `drill${i}@example.test`, displayName: `Drill ${i}` },
      });
      expect(r.statusCode).toBe(201);
    }
    await ctx.pool.query(`INSERT INTO outbox_message (topic, dedupe_key, payload) VALUES ('test.drill', 'd1', '{"n":1}')`);
    await ctx.pool.query(
      `INSERT INTO job_run (job_name, run_key, scheduled_for, available_at) VALUES ('test.drill', 'k', now(), now())`,
    );
  });
  afterAll(async () => ctx?.close());

  it('restores into a new database that matches the source and keeps every safety property', async () => {
    const report = await runBackupRestoreDrill({
      sourceUrl: ctx.db.ownerUrl,
      targetAdminUrl: ctx.db.adminUrl,
      targetDatabase: `ilumin_restore_drill_t${Date.now()}`,
      keepTarget: true,
    });
    try {
      expect(report.privilegeProblems).toEqual([]);
      expect(report.migrations).toEqual({ applied: 8, pending: [], problems: [] });
      expect(report.sequencesMatch).toBe(true);
      expect(report.tables.filter((t) => !t.matches)).toEqual([]);
      expect(report.tables.find((t) => t.table === 'audit_event')!.rows).toBeGreaterThanOrEqual(3);
      expect(report.triggers).toEqual(['audit_event_no_truncate', 'audit_event_no_update_delete', 'idempotency_record_guard']);
      expect(report.ok).toBe(true);
      expect(report.dumpBytes).toBeGreaterThan(0);

      // The restored database works for the runtime role, with the same limits.
      const apiUrl = new URL(ctx.db.appUrl);
      apiUrl.pathname = `/${report.targetDatabase}`;
      const c = new pg.Client({ connectionString: apiUrl.toString() });
      await c.connect();
      try {
        expect((await c.query(`SELECT count(*)::int AS n FROM app_user WHERE email LIKE 'drill%'`)).rows[0].n).toBe(3);
        await expect(c.query(`DELETE FROM audit_event`)).rejects.toMatchObject({ code: '42501' });
        const s = await migrationStatus(c, migrationsDir());
        expect(s.pending).toEqual([]);
        // New audit rows continue the sequence after the restored ones (identity restored correctly).
        const r = await c.query<{ seq: string }>(
          `INSERT INTO audit_event (actor_type, actor_label, operation, outcome, entity_type) VALUES ('system', 'drill', 'test.after_restore', 'succeeded', 'x') RETURNING seq::text`,
        );
        const max = (await c.query<{ m: string }>(`SELECT max(seq)::text AS m FROM audit_event WHERE operation <> 'test.after_restore'`)).rows[0]!.m;
        expect(BigInt(r.rows[0]!.seq)).toBeGreaterThan(BigInt(max));
      } finally {
        await c.end();
      }
    } finally {
      const a = new pg.Client({ connectionString: ctx.db.adminUrl });
      await a.connect();
      await a.query(`DROP DATABASE IF EXISTS ${report.targetDatabase} WITH (FORCE)`);
      await a.end();
    }
  });

  it('drops the target by default once verified', async () => {
    const target = `ilumin_restore_drill_d${Date.now()}`;
    const report = await runBackupRestoreDrill({ sourceUrl: ctx.db.ownerUrl, targetAdminUrl: ctx.db.adminUrl, targetDatabase: target });
    expect(report.ok).toBe(true);
    const a = new pg.Client({ connectionString: ctx.db.adminUrl });
    await a.connect();
    const n = (await a.query(`SELECT count(*)::int AS n FROM pg_database WHERE datname = $1`, [target])).rows[0].n;
    await a.end();
    expect(n).toBe(0);
  });

  it('a corrupt dump fails at "restore", and the half-built target database is removed', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'ilumin-drill-test-'));
    const file = join(dir, 'broken.dump');
    writeFileSync(file, 'PGDMP this is not a real archive');
    const target = `ilumin_restore_drill_x${Date.now()}`;
    try {
      const err = await restoreDatabase({ file, targetAdminUrl: ctx.db.adminUrl, targetDatabase: target, owner: TEST_ROLES.owner }).catch(
        (e) => e,
      );
      expect(err).toBeInstanceOf(DrillError);
      expect(err.stage).toBe('restore');
      const a = new pg.Client({ connectionString: ctx.db.adminUrl });
      await a.connect();
      const n = (await a.query(`SELECT count(*)::int AS n FROM pg_database WHERE datname = $1`, [target])).rows[0].n;
      await a.end();
      expect(n).toBe(0);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses target names outside the drill namespace, so a drill can never overwrite a real database', async () => {
    const err = await restoreDatabase({ file: 'x', targetAdminUrl: ctx.db.adminUrl, targetDatabase: 'ilumin', owner: TEST_ROLES.owner }).catch(
      (e) => e,
    );
    expect(err).toBeInstanceOf(DrillError);
    expect(err.stage).toBe('create');
  });

  it('passes passwords through the environment, never on the command line', () => {
    const s = splitPassword('postgres://owner:s3cr%40t@db.example:5432/ilumin'); // secret-scan: allow (deliberate fake) gitleaks:allow
    expect(s.password).toBe('s3cr@t');
    expect(s.url).not.toContain('s3cr');
    expect(s.url).toBe('postgres://owner@db.example:5432/ilumin');
  });
});
