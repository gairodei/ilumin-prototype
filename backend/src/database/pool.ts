import pg from 'pg';
import type { Config } from '../config/config.js';

export type Pool = pg.Pool;
export type PoolClient = pg.PoolClient;
/** Anything that can run a query: the pool or a client inside a transaction. */
export type Queryable = Pick<pg.Pool, 'query'> | Pick<pg.PoolClient, 'query'>;

export function sslOption(mode: Config['database']['ssl'], ca?: string): pg.PoolConfig['ssl'] {
  if (mode === 'disable') return false;
  if (mode === 'require') return { rejectUnauthorized: false };
  return { rejectUnauthorized: true, ...(ca ? { ca } : {}) };
}

/** Pool for the runtime API role. Every session gets a statement timeout and an application name. */
export function createPool(db: Config['database'], applicationName = 'ilumin-api'): Pool {
  const pool = new pg.Pool({
    connectionString: db.url,
    ssl: sslOption(db.ssl, db.sslCa),
    max: db.poolMax,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: db.statementTimeoutMs,
    application_name: applicationName,
  });
  // An idle client that errors (e.g. the server restarted) must not crash the process; the pool discards it.
  pool.on('error', () => {});
  return pool;
}

export class DatabaseUnavailableError extends Error {
  constructor(cause: unknown) {
    super('PostgreSQL is not reachable with DATABASE_URL (connection refused, authentication failed or timed out).', {
      cause,
    });
    this.name = 'DatabaseUnavailableError';
  }
}

/** Fails with DatabaseUnavailableError when the database cannot answer a trivial query. */
export async function verifyDatabase(pool: Pool): Promise<void> {
  try {
    await pool.query('SELECT 1');
  } catch (err) {
    throw new DatabaseUnavailableError(err);
  }
}
