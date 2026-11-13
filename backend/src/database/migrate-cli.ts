import pg from 'pg';
import { migrationsDir } from '../shared/paths.js';
import { MigrationError, migrateUp, migrationStatus } from './migrate.js';
import { sslOption } from './pool.js';

/**
 *   migrate-cli up       apply pending migrations (MIGRATION_DATABASE_URL = schema owner)
 *   migrate-cli status   list applied / pending / problems; exit 1 if anything is pending or wrong
 * DATABASE_SSL applies here too (default verify-full).
 */
async function main(): Promise<number> {
  const cmd = process.argv[2] ?? 'status';
  const url = process.env.MIGRATION_DATABASE_URL;
  if (!url) {
    console.error('MIGRATION_DATABASE_URL is not set (the schema-owner connection; never the API role).');
    return 2;
  }
  const mode = (process.env.DATABASE_SSL ?? 'verify-full') as 'disable' | 'require' | 'verify-full';
  if (!['disable', 'require', 'verify-full'].includes(mode)) {
    console.error('DATABASE_SSL must be disable, require or verify-full');
    return 2;
  }
  const ssl = sslOption(mode);
  const dir = migrationsDir();
  if (cmd === 'up') {
    const r = await migrateUp(url, dir, { ssl, log: (m) => console.log(m) });
    console.log(r.applied.length ? `applied ${r.applied.length} migration(s)` : 'database is up to date');
    return 0;
  }
  if (cmd === 'status') {
    const client = new pg.Client({ connectionString: url, ssl });
    await client.connect();
    try {
      const s = await migrationStatus(client, dir);
      console.log(`applied: ${s.applied.length}\npending: ${s.pending.join(', ') || 'none'}`);
      if (s.problems.length) console.log(`problems:\n  - ${s.problems.join('\n  - ')}`);
      return s.pending.length || s.problems.length ? 1 : 0;
    } finally {
      await client.end();
    }
  }
  console.error(`Unknown command "${cmd}". Use "up" or "status".`);
  return 2;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(err instanceof MigrationError ? err.message : `Migration failed: ${(err as Error).message}`);
    process.exit(1);
  },
);
