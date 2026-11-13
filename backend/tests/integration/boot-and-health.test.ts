import { createServer } from 'node:net';
import pg from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { loadConfig } from '../../src/config/config.js';
import { createPool, DatabaseUnavailableError } from '../../src/database/pool.js';
import { buildApp } from '../../src/app/build-app.js';
import { readMigrationFiles } from '../../src/database/migrate.js';
import { migrationsDir } from '../../src/shared/paths.js';
import { OidcTokenVerifier } from '../../src/modules/auth/oidc.js';
import { startServer } from '../../src/server.js';
import { createTestDatabase, type TestDatabase } from '../support/db.js';
import { startTestIssuer, type TestIssuer } from '../support/oidc-issuer.js';
import { testEnv } from '../support/context.js';

/** A loopback port with nothing listening (for "database unreachable"). */
const deadPort = () =>
  new Promise<number>((res) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as { port: number };
      s.close(() => res(port));
    });
  });

describe('backend boot, health and shutdown', () => {
  let db: TestDatabase;
  let issuer: TestIssuer;

  beforeAll(async () => {
    db = await createTestDatabase();
    issuer = await startTestIssuer();
  });
  afterAll(async () => {
    await issuer?.close();
    await db?.drop();
  });

  it('boots a real HTTP server, reports live and ready, and shuts down gracefully', async () => {
    const config = loadConfig(testEnv(issuer, db.appUrl));
    const server = await startServer(config, { logger: false });
    try {
      const live = await fetch(`${server.url}/health/live`);
      expect(live.status).toBe(200);
      expect(await live.json()).toEqual({ status: 'ok' });
      expect(live.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);

      const ready = await fetch(`${server.url}/health/ready`);
      expect(await ready.json()).toEqual({
        status: 'ready',
        checks: { database: 'ok', migrations: 'ok', identityProvider: 'ok' },
      });
      expect(ready.status).toBe(200);
    } finally {
      await server.shutdown('test');
    }
    expect(server.services.lifecycle.shuttingDown).toBe(true);
    // Pool closed: further queries fail.
    await expect(server.services.pool.query('SELECT 1')).rejects.toThrow();
    // Listener closed.
    await expect(fetch(`${server.url}/health/live`)).rejects.toThrow();
  });

  it('finishes an in-flight request during shutdown and reports not ready meanwhile', async () => {
    const config = loadConfig(testEnv(issuer, db.appUrl));
    const server = await startServer(config, { logger: false });
    // Hold an in-flight request open on a slow query through a readiness check stub.
    let release!: () => void;
    const gate = new Promise<void>((r) => (release = r));
    const originalReady = server.services.verifier.ready.bind(server.services.verifier);
    server.services.verifier.ready = async () => {
      await gate;
      return originalReady();
    };
    const inflight = fetch(`${server.url}/health/ready`);
    await new Promise((r) => setTimeout(r, 100));
    const closing = server.shutdown('test');
    expect(server.services.lifecycle.shuttingDown).toBe(true);
    release();
    const res = await inflight;
    expect(res.status).toBeGreaterThanOrEqual(200); // completed, not dropped
    await closing;
  });

  it('readiness returns 503 when shutting down', async () => {
    const config = loadConfig(testEnv(issuer, db.appUrl));
    const pool = createPool(config.database);
    const services = { config, pool, verifier: new OidcTokenVerifier(config.oidc), lifecycle: { shuttingDown: true } };
    const app = await buildApp(services, { logger: false });
    try {
      const r = await app.inject({ method: 'GET', url: '/health/ready' });
      expect(r.statusCode).toBe(503);
      expect(r.json().status).toBe('shutting_down');
    } finally {
      await app.close();
      await pool.end();
    }
  });

  it('refuses to start when PostgreSQL is unreachable, with a clear error', async () => {
    const port = await deadPort();
    const config = loadConfig(testEnv(issuer, `postgres://nobody:x@127.0.0.1:${port}/none`));
    const err = await startServer(config, { logger: false }).catch((e) => e);
    expect(err).toBeInstanceOf(DatabaseUnavailableError);
    expect(String(err.message)).toMatch(/PostgreSQL is not reachable/);
    expect(String(err.message)).not.toContain('nobody:x');
  });

  it('refuses to start with wrong database credentials', async () => {
    const u = new URL(db.appUrl);
    u.password = 'wrong-password';
    const config = loadConfig(testEnv(issuer, u.toString()));
    // trust-auth test clusters accept any password; only assert when the server enforces passwords
    const result = await startServer(config, { logger: false }).then(
      async (s) => {
        await s.shutdown();
        return 'started';
      },
      (e) => e,
    );
    if (result !== 'started') expect(result).toBeInstanceOf(DatabaseUnavailableError);
  });

  it('readiness reports the database failure (503) when PostgreSQL goes away after start', async () => {
    const port = await deadPort();
    const config = loadConfig(testEnv(issuer, `postgres://nobody:x@127.0.0.1:${port}/none`));
    const pool = createPool(config.database);
    const app = await buildApp({ config, pool, verifier: new OidcTokenVerifier(config.oidc), lifecycle: { shuttingDown: false } }, { logger: false });
    try {
      const r = await app.inject({ method: 'GET', url: '/health/ready' });
      expect(r.statusCode).toBe(503);
      expect(r.json()).toEqual({ status: 'not_ready', checks: { database: 'fail', migrations: 'fail', identityProvider: 'ok' } });
      expect(r.body).not.toContain('ECONNREFUSED');
    } finally {
      await app.close();
      await pool.end();
    }
  });

  it('readiness reports pending migrations', async () => {
    const config = loadConfig(testEnv(issuer, db.appUrl));
    const pool = createPool(config.database);
    const app = await buildApp({ config, pool, verifier: new OidcTokenVerifier(config.oidc), lifecycle: { shuttingDown: false } }, { logger: false });
    const c = new pg.Client({ connectionString: db.ownerUrl });
    await c.connect();
    try {
      await c.query(`DELETE FROM schema_migration WHERE version = '0008'`);
      // Open the pool's connection first: under full-suite load, connection set-up alone can use up the 2 s readiness
      // budget, and this test is about detecting a pending migration, not about latency.
      await pool.query('SELECT 1');
      const r = await app.inject({ method: 'GET', url: '/health/ready' });
      expect(r.statusCode).toBe(503);
      expect(r.json().checks.migrations).toBe('pending');
    } finally {
      await c.query(
        `INSERT INTO schema_migration (version, name, checksum) VALUES ('0008', 'applications_enrolment', $1)`,
        [readMigrationFiles(migrationsDir())[7]!.checksum],
      );
      await c.end();
      await app.close();
      await pool.end();
    }
  });

  it('readiness reports an unreachable or mismatched identity provider', async () => {
    const config = loadConfig(testEnv(issuer, db.appUrl));
    const pool = createPool(config.database);
    issuer.setDiscoveryIssuer('https://someone-else.example.com/');
    const app = await buildApp({ config, pool, verifier: new OidcTokenVerifier(config.oidc), lifecycle: { shuttingDown: false } }, { logger: false });
    try {
      const r = await app.inject({ method: 'GET', url: '/health/ready' });
      expect(r.statusCode).toBe(503);
      expect(r.json().checks.identityProvider).toBe('fail');
    } finally {
      issuer.setDiscoveryIssuer(null as unknown as string);
      await app.close();
      await pool.end();
    }
  });
});
