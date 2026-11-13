import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import pg from 'pg';
import type { Queryable } from './pool.js';

/**
 * Forward-only SQL migrations (ADR 0003).
 *  - Files: migrations/NNNN_description.sql, applied in version order, each in its own transaction.
 *  - schema_migration records version, name, SHA-256 checksum, time and database user.
 *  - An applied file that was edited afterwards, or an applied version missing on disk, stops the run (never "fixed" silently).
 *  - A session-level advisory lock serialises concurrent runners (two deploys starting at once).
 *  - Runs as the schema-owner role (MIGRATION_DATABASE_URL), never as the API role.
 */

export interface MigrationFile {
  version: string;
  name: string;
  file: string;
  sql: string;
  checksum: string;
}

export interface AppliedMigration {
  version: string;
  name: string;
  checksum: string;
}

export class MigrationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'MigrationError';
  }
}

const FILE_RE = /^(\d{4})_([a-z0-9_]+)\.sql$/;
// Arbitrary constant: "ilumin-migrate" as a 64-bit key.
const ADVISORY_LOCK_KEY = '7312093117712341';

export function readMigrationFiles(dir: string): MigrationFile[] {
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const seen = new Set<string>();
  return files.map((file) => {
    const m = FILE_RE.exec(file);
    if (!m) throw new MigrationError(`Migration file name "${file}" must match NNNN_lower_snake_case.sql`);
    const [, version, name] = m as unknown as [string, string, string];
    if (seen.has(version)) throw new MigrationError(`Duplicate migration version ${version}`);
    seen.add(version);
    const sql = readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');
    return { version, name, file, sql, checksum: createHash('sha256').update(sql).digest('hex') };
  });
}

const ENSURE_TABLE = `
CREATE TABLE IF NOT EXISTS schema_migration (
  version     text PRIMARY KEY CHECK (version ~ '^[0-9]{4}$'),
  name        text NOT NULL,
  checksum    char(64) NOT NULL,
  applied_at  timestamptz NOT NULL DEFAULT now(),
  applied_by  text NOT NULL DEFAULT current_user
)`;

export async function readApplied(db: Queryable): Promise<AppliedMigration[] | null> {
  const exists = await db.query<{ t: string | null }>(`SELECT to_regclass('schema_migration')::text AS t`);
  if (!exists.rows[0]?.t) return null;
  const r = await db.query<AppliedMigration>('SELECT version, name, checksum FROM schema_migration ORDER BY version');
  return r.rows;
}

export interface MigrationStatus {
  applied: string[];
  pending: string[];
  problems: string[];
}

/** Compares disk and database. `problems` lists edited or missing migrations (both block a run). */
export function compare(files: MigrationFile[], applied: AppliedMigration[]): MigrationStatus {
  const byVersion = new Map(files.map((f) => [f.version, f]));
  const problems: string[] = [];
  for (const a of applied) {
    const f = byVersion.get(a.version);
    if (!f) problems.push(`Applied migration ${a.version}_${a.name} is missing on disk`);
    else if (f.checksum !== a.checksum.trim()) problems.push(`Applied migration ${f.file} was modified after it was applied`);
  }
  const appliedSet = new Set(applied.map((a) => a.version));
  const pending = files.filter((f) => !appliedSet.has(f.version)).map((f) => f.file);
  const lastApplied = applied.at(-1)?.version;
  if (lastApplied) {
    for (const p of files.filter((f) => !appliedSet.has(f.version) && f.version < lastApplied)) {
      problems.push(`Migration ${p.file} is older than the last applied version ${lastApplied} (out-of-order file)`);
    }
  }
  return { applied: applied.map((a) => `${a.version}_${a.name}.sql`), pending, problems };
}

export async function migrationStatus(db: Queryable, dir: string): Promise<MigrationStatus> {
  return compare(readMigrationFiles(dir), (await readApplied(db)) ?? []);
}

export interface MigrateResult {
  applied: string[];
}

/** Applies every pending migration. `connectionString` must be the schema owner. */
export async function migrateUp(
  connectionString: string,
  dir: string,
  opts: { ssl?: pg.ClientConfig['ssl']; log?: (msg: string) => void } = {},
): Promise<MigrateResult> {
  const log = opts.log ?? (() => {});
  const files = readMigrationFiles(dir);
  const client = new pg.Client({ connectionString, ssl: opts.ssl, application_name: 'ilumin-migrate' });
  await client.connect();
  try {
    await client.query('SELECT pg_advisory_lock($1::bigint)', [ADVISORY_LOCK_KEY]);
    try {
      await client.query(ENSURE_TABLE);
      const status = compare(files, (await readApplied(client)) ?? []);
      if (status.problems.length) throw new MigrationError(`Refusing to migrate:\n  - ${status.problems.join('\n  - ')}`);
      const done: string[] = [];
      for (const f of files.filter((x) => status.pending.includes(x.file))) {
        log(`applying ${f.file}`);
        await client.query('BEGIN');
        try {
          await client.query(f.sql);
          await client.query('INSERT INTO schema_migration (version, name, checksum) VALUES ($1, $2, $3)', [
            f.version,
            f.name,
            f.checksum,
          ]);
          await client.query('COMMIT');
        } catch (err) {
          await client.query('ROLLBACK');
          throw new MigrationError(`Migration ${f.file} failed: ${(err as Error).message}`, { cause: err });
        }
        done.push(f.file);
      }
      return { applied: done };
    } finally {
      await client.query('SELECT pg_advisory_unlock($1::bigint)', [ADVISORY_LOCK_KEY]).catch(() => {});
    }
  } finally {
    await client.end();
  }
}
