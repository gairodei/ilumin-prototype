import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { migrationStatus } from '../database/migrate.js';
import { migrationsDir } from '../shared/paths.js';

/**
 * Logical backup and restore drill (docs/backup-restore.md).
 *
 *   1. dump    pg_dump --format=custom of the source database
 *   2. create  an empty target database on a DISPOSABLE server, owned by the same owner role as the source
 *   3. restore pg_restore --exit-on-error --single-transaction (all or nothing)
 *   4. verify  migrations (no pending / edited / missing), per-table row counts and content checksums, sequence
 *              positions, append-only triggers present and enabled, API-role privileges (no DELETE, audit SELECT/INSERT
 *              only), purge functions executable by the API group role only
 *
 * Credentials: passwords are taken out of the connection URLs and handed to pg_dump / pg_restore through PGPASSWORD in
 * the child environment, never on the command line. The dump is written to a private temporary directory and deleted
 * at the end, success or failure. A failed restore drops the half-built target database.
 *
 * This proves a LOGICAL backup restores into a working schema. It does not prove managed point-in-time recovery, which
 * must be drilled on the chosen provider.
 */

export class DrillError extends Error {
  constructor(
    public readonly stage: 'dump' | 'create' | 'restore' | 'verify',
    message: string,
  ) {
    super(`backup/restore drill failed at "${stage}": ${message}`);
    this.name = 'DrillError';
  }
}

export interface DrillOptions {
  /** Source database (a role that can read every table, normally the schema owner). */
  sourceUrl: string;
  /** A role on the DISPOSABLE target server that can create databases and restore ownership (e.g. its superuser). */
  targetAdminUrl: string;
  /** Default: ilumin_restore_drill_<timestamp>. Must start with "ilumin_restore_drill_". */
  targetDatabase?: string;
  /** Directory with pg_dump / pg_restore (default: PG_BIN, then PATH). */
  pgBin?: string;
  /** Keep the restored database for inspection (default: drop it after verification). */
  keepTarget?: boolean;
  log?: (msg: string) => void;
}

export interface TableCheck {
  table: string;
  rows: number;
  matches: boolean;
}

export interface DrillReport {
  targetDatabase: string;
  dumpBytes: number;
  tables: TableCheck[];
  sequencesMatch: boolean;
  migrations: { applied: number; pending: string[]; problems: string[] };
  triggers: string[];
  privilegeProblems: string[];
  ok: boolean;
}

const exe = (n: string) => (process.platform === 'win32' ? `${n}.exe` : n);

function tool(name: string, pgBin?: string): string {
  const dir = pgBin ?? process.env.PG_BIN;
  if (dir) {
    const p = join(dir, exe(name));
    if (!existsSync(p)) throw new DrillError('dump', `${name} not found in ${dir}`);
    return p;
  }
  return exe(name);
}

/** Splits a connection URL into a password-free URL and the password. */
export function splitPassword(url: string): { url: string; password: string | undefined } {
  const u = new URL(url);
  const password = u.password ? decodeURIComponent(u.password) : undefined;
  u.password = '';
  return { url: u.toString(), password };
}

function withDatabase(url: string, database: string): string {
  const u = new URL(url);
  u.pathname = `/${database}`;
  return u.toString();
}

function run(cmd: string, args: string[], password: string | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    const env: NodeJS.ProcessEnv = { ...process.env, PGCONNECT_TIMEOUT: '10' };
    if (password) env.PGPASSWORD = password;
    else delete env.PGPASSWORD;
    const child = spawn(cmd, args, { env, stdio: ['ignore', 'ignore', 'pipe'] });
    let stderr = '';
    child.stderr.on('data', (d) => (stderr = (stderr + String(d)).slice(-4000)));
    child.on('error', (err) => reject(err));
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited with ${code}: ${stderr.trim()}`))));
  });
}

export async function dumpDatabase(sourceUrl: string, file: string, pgBin?: string): Promise<number> {
  const { url, password } = splitPassword(sourceUrl);
  try {
    await run(tool('pg_dump', pgBin), ['--format=custom', '--no-password', `--file=${file}`, `--dbname=${url}`], password);
  } catch (err) {
    throw new DrillError('dump', (err as Error).message);
  }
  return statSync(file).size;
}

async function adminQuery(adminUrl: string, sql: string): Promise<void> {
  const c = new pg.Client({ connectionString: adminUrl });
  await c.connect();
  try {
    await c.query(sql);
  } finally {
    await c.end();
  }
}

const DRILL_DB_RE = /^ilumin_restore_drill_[a-z0-9_]{1,40}$/;

export async function restoreDatabase(o: {
  file: string;
  targetAdminUrl: string;
  targetDatabase: string;
  owner: string;
  pgBin?: string;
}): Promise<void> {
  if (!DRILL_DB_RE.test(o.targetDatabase)) throw new DrillError('create', 'target database name must start with ilumin_restore_drill_');
  if (!/^[a-z_][a-z0-9_]{0,62}$/.test(o.owner)) throw new DrillError('create', 'unexpected owner role name');
  try {
    await adminQuery(o.targetAdminUrl, `CREATE DATABASE ${o.targetDatabase} OWNER ${o.owner}`);
  } catch (err) {
    throw new DrillError('create', (err as Error).message);
  }
  const { url, password } = splitPassword(withDatabase(o.targetAdminUrl, o.targetDatabase));
  try {
    await run(
      tool('pg_restore', o.pgBin),
      ['--exit-on-error', '--single-transaction', '--no-password', `--dbname=${url}`, o.file],
      password,
    );
  } catch (err) {
    await adminQuery(o.targetAdminUrl, `DROP DATABASE IF EXISTS ${o.targetDatabase} WITH (FORCE)`).catch(() => {});
    throw new DrillError('restore', (err as Error).message);
  }
}

async function tableChecks(c: pg.Client): Promise<Map<string, { rows: number; digest: string }>> {
  const tables = await c.query<{ t: string }>(`SELECT tablename AS t FROM pg_tables WHERE schemaname = 'public' ORDER BY 1`);
  const out = new Map<string, { rows: number; digest: string }>();
  for (const { t } of tables.rows) {
    const r = await c.query<{ n: number; d: string | null }>(
      `SELECT count(*)::int AS n, md5(string_agg(x::text, E'\\n' ORDER BY x::text)) AS d FROM public."${t}" x`,
    );
    out.set(t, { rows: r.rows[0]!.n, digest: r.rows[0]!.d ?? '' });
  }
  return out;
}

async function sequences(c: pg.Client): Promise<string> {
  const r = await c.query<{ s: string }>(
    `SELECT string_agg(sequencename || '=' || coalesce(last_value::text, 'null'), ',' ORDER BY sequencename) AS s
       FROM pg_sequences WHERE schemaname = 'public'`,
  );
  return r.rows[0]?.s ?? '';
}

/** The safety properties a restore must keep (ADR 0003 / 0006 / 0011). Returns a list of problems (empty = good). */
async function privilegeProblems(c: pg.Client): Promise<{ problems: string[]; triggers: string[] }> {
  const problems: string[] = [];
  const trig = await c.query<{ tgname: string; tgenabled: string }>(
    `SELECT tgname, tgenabled FROM pg_trigger
      WHERE NOT tgisinternal AND tgrelid IN ('public.audit_event'::regclass, 'public.idempotency_record'::regclass)
      ORDER BY tgname`,
  );
  const triggers = trig.rows.map((t) => t.tgname);
  for (const name of ['audit_event_no_truncate', 'audit_event_no_update_delete', 'idempotency_record_guard']) {
    const t = trig.rows.find((x) => x.tgname === name);
    if (!t) problems.push(`trigger ${name} missing`);
    else if (t.tgenabled !== 'O') problems.push(`trigger ${name} not enabled`);
  }
  const priv = async (table: string, p: string) =>
    (await c.query<{ ok: boolean }>(`SELECT has_table_privilege('ilumin_app', $1, $2) AS ok`, [`public.${table}`, p])).rows[0]!.ok;
  if (!(await priv('audit_event', 'INSERT'))) problems.push('ilumin_app lost INSERT on audit_event');
  for (const p of ['UPDATE', 'DELETE', 'TRUNCATE']) if (await priv('audit_event', p)) problems.push(`ilumin_app has ${p} on audit_event`);
  for (const t of ['app_user', 'user_role', 'auth_session', 'outbox_message', 'job_run', 'idempotency_record']) {
    if (await priv(t, 'DELETE')) problems.push(`ilumin_app has DELETE on ${t}`);
  }
  const fns = await c.query<{ proname: string; app: boolean; pub: boolean }>(
    `SELECT p.proname,
            has_function_privilege('ilumin_app', p.oid, 'EXECUTE') AS app,
            EXISTS (SELECT 1 FROM aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                     WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE') AS pub
       FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname LIKE 'purge\\_%'`,
  );
  if (fns.rows.length < 5) problems.push(`expected 5 purge functions, found ${fns.rows.length}`);
  for (const f of fns.rows) {
    if (!f.app) problems.push(`ilumin_app cannot execute ${f.proname}`);
    if (f.pub) problems.push(`PUBLIC can execute ${f.proname}`);
  }
  return { problems, triggers };
}

export async function verifyRestore(sourceUrl: string, targetUrl: string): Promise<Omit<DrillReport, 'targetDatabase' | 'dumpBytes'>> {
  const src = new pg.Client({ connectionString: sourceUrl });
  const dst = new pg.Client({ connectionString: targetUrl });
  await src.connect();
  await dst.connect();
  try {
    const [a, b] = [await tableChecks(src), await tableChecks(dst)];
    const tables: TableCheck[] = [...a.entries()].map(([t, v]) => ({
      table: t,
      rows: v.rows,
      matches: b.get(t)?.rows === v.rows && b.get(t)?.digest === v.digest,
    }));
    for (const t of b.keys()) if (!a.has(t)) tables.push({ table: t, rows: b.get(t)!.rows, matches: false });
    const sequencesMatch = (await sequences(src)) === (await sequences(dst));
    const m = await migrationStatus(dst, migrationsDir());
    const { problems, triggers } = await privilegeProblems(dst);
    const migrations = { applied: m.applied.length, pending: m.pending, problems: m.problems };
    const ok = tables.every((t) => t.matches) && sequencesMatch && !m.pending.length && !m.problems.length && !problems.length;
    return { tables, sequencesMatch, migrations, triggers, privilegeProblems: problems, ok };
  } finally {
    await src.end();
    await dst.end();
  }
}

export async function runBackupRestoreDrill(o: DrillOptions): Promise<DrillReport> {
  const log = o.log ?? (() => {});
  const target = o.targetDatabase ?? `ilumin_restore_drill_${new Date().toISOString().replace(/\D/g, '').slice(0, 14)}`;
  const dir = mkdtempSync(join(tmpdir(), 'ilumin-drill-'));
  const file = join(dir, 'ilumin.dump');
  try {
    const owner = await (async () => {
      const c = new pg.Client({ connectionString: o.sourceUrl });
      await c.connect();
      try {
        return (await c.query<{ o: string }>(`SELECT pg_get_userbyid(datdba) AS o FROM pg_database WHERE datname = current_database()`))
          .rows[0]!.o;
      } finally {
        await c.end();
      }
    })();
    log(`dump: source database (owner ${owner})`);
    const dumpBytes = await dumpDatabase(o.sourceUrl, file, o.pgBin);
    log(`restore: into ${target}`);
    await restoreDatabase({ file, targetAdminUrl: o.targetAdminUrl, targetDatabase: target, owner, ...(o.pgBin ? { pgBin: o.pgBin } : {}) });
    log('verify: migrations, data, sequences, triggers, privileges');
    let report: DrillReport;
    try {
      report = { targetDatabase: target, dumpBytes, ...(await verifyRestore(o.sourceUrl, withDatabase(o.targetAdminUrl, target))) };
    } catch (err) {
      throw new DrillError('verify', (err as Error).message);
    }
    if (!o.keepTarget) await adminQuery(o.targetAdminUrl, `DROP DATABASE IF EXISTS ${target} WITH (FORCE)`);
    return report;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
