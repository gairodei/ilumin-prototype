import { DrillError, runBackupRestoreDrill } from '../ops/backup-drill.js';

/**
 * `npm run db:drill` — logical backup and restore drill (docs/backup-restore.md).
 *   DRILL_SOURCE_URL        source database, schema-owner role (read-only use: pg_dump)
 *   DRILL_TARGET_ADMIN_URL  a DISPOSABLE server where this role may create databases; never the production server
 *   DRILL_KEEP_TARGET=true  keep the restored database for inspection
 *   PG_BIN                  directory of pg_dump / pg_restore matching the server's major version
 * Exit code 0 only when every verification passed.
 */
const source = process.env.DRILL_SOURCE_URL;
const target = process.env.DRILL_TARGET_ADMIN_URL;
if (!source || !target) {
  console.error('Set DRILL_SOURCE_URL and DRILL_TARGET_ADMIN_URL (see docs/backup-restore.md).');
  process.exit(78);
}
try {
  const report = await runBackupRestoreDrill({
    sourceUrl: source,
    targetAdminUrl: target,
    keepTarget: process.env.DRILL_KEEP_TARGET === 'true',
    log: (m) => console.log(m),
  });
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.ok ? 0 : 1);
} catch (err) {
  console.error(err instanceof DrillError ? err.message : `drill failed: ${(err as Error).message}`);
  process.exit(1);
}
