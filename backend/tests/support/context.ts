import type { FastifyInstance } from 'fastify';
import pg from 'pg';
import { buildApp } from '../../src/app/build-app.js';
import type { Services } from '../../src/app/route.js';
import { type Config, loadConfig } from '../../src/config/config.js';
import { createPool, type Pool } from '../../src/database/pool.js';
import { OidcTokenVerifier } from '../../src/modules/auth/oidc.js';
import type { GrantableRole } from '../../src/modules/auth/roles.js';
import { createTestDatabase, type TestDatabase } from './db.js';
import { startTestIssuer, type TestIssuer } from './oidc-issuer.js';

/**
 * Full-stack test context: real PostgreSQL database (cloned from the migrated template), the real OIDC verifier against
 * a local issuer, and the real Fastify application (driven with inject()). Fixture rows are written with the owner
 * connection and represent only what each test states; nothing comes from the prototype's demo data.
 */

export function testEnv(issuer: TestIssuer, databaseUrl: string, extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: 'test',
    HOST: '127.0.0.1',
    PORT: '0',
    LOG_LEVEL: 'silent',
    DATABASE_URL: databaseUrl,
    DATABASE_SSL: 'disable',
    OIDC_ISSUER: issuer.issuer,
    OIDC_AUDIENCE: issuer.audience,
    OIDC_ALLOW_INSECURE_HTTP: 'true',
    AUTH_BEARER_ENABLED: 'true',
    // Every injected request comes from 127.0.0.1: functional suites use generous limits; the rate-limit suite sets
    // tight ones explicitly.
    RATE_LIMIT_LOGIN: '100000/60',
    RATE_LIMIT_CALLBACK_FAILURES: '100000/900',
    RATE_LIMIT_SENSITIVE: '100000/60',
    RATE_LIMIT_API: '100000/60',
    ...extra,
  };
}

export const APP_ORIGIN = 'https://app.ilumin.test';
export const API_ORIGIN = 'https://api.ilumin.test';

/** Settings for the browser-session (BFF) tests, against the local test issuer's confidential client. */
export function sessionEnv(issuer: TestIssuer, extra: Record<string, string> = {}): Record<string, string> {
  return {
    AUTH_SESSION_ENABLED: 'true',
    OIDC_CLIENT_ID: issuer.clientId,
    OIDC_CLIENT_SECRET: issuer.clientSecret,
    OIDC_REDIRECT_URI: `${API_ORIGIN}/v1/auth/callback`,
    AUTH_DEFAULT_REDIRECT: `${APP_ORIGIN}/`,
    AUTH_REDIRECT_ORIGINS: APP_ORIGIN,
    CORS_ALLOWED_ORIGINS: APP_ORIGIN,
    ...extra,
  };
}

export interface TestUser {
  id: string;
  email: string;
  subject: string;
  token: () => Promise<string>;
}

export interface TestContext {
  db: TestDatabase;
  issuer: TestIssuer;
  config: Config;
  pool: Pool;
  owner: pg.Pool;
  services: Services;
  app: FastifyInstance;
  createUser(opts?: {
    email?: string;
    roles?: GrantableRole[];
    status?: 'active' | 'suspended' | 'deactivated';
    agency?: { id: string; role?: 'agency_admin' | 'agency_member' };
    scopes?: Array<{ role: 'academic_coordinator' | 'assessor' | 'teacher' | 'iqa'; kind: 'batch' | 'learner'; id: string }>;
    linkIdentity?: boolean;
  }): Promise<TestUser>;
  createAgency(name?: string): Promise<string>;
  auth(user: TestUser): Promise<{ authorization: string }>;
  close(): Promise<void>;
}

let seq = 0;

export async function createTestContext(
  extraEnv: Record<string, string> | ((issuer: TestIssuer) => Record<string, string>) = {},
): Promise<TestContext> {
  const db = await createTestDatabase();
  const issuer = await startTestIssuer();
  const config = loadConfig(testEnv(issuer, db.appUrl, typeof extraEnv === 'function' ? extraEnv(issuer) : extraEnv));
  const pool = createPool(config.database);
  const owner = new pg.Pool({ connectionString: db.ownerUrl, max: 4 });
  const services: Services = { config, pool, verifier: new OidcTokenVerifier(config.oidc), lifecycle: { shuttingDown: false } };
  const app = await buildApp(services, { logger: false });
  await app.ready();

  const ctx: TestContext = {
    db,
    issuer,
    config,
    pool,
    owner,
    services,
    app,
    async createUser(opts = {}) {
      const n = ++seq;
      const email = opts.email ?? `user${n}.${Math.random().toString(36).slice(2, 8)}@example.test`;
      const subject = `sub-${n}-${Math.random().toString(36).slice(2, 10)}`;
      const u = await owner.query<{ id: string }>(
        `INSERT INTO app_user (email, display_name, status, status_reason) VALUES ($1, $2, $3, $4) RETURNING id`,
        [email, `Test User ${n}`, opts.status ?? 'active', (opts.status ?? 'active') === 'active' ? null : 'test fixture'],
      );
      const id = u.rows[0]!.id;
      if (opts.linkIdentity !== false) {
        await owner.query(
          `INSERT INTO user_identity (user_id, issuer, subject, link_method) VALUES ($1, $2, $3, 'admin')`,
          [id, issuer.issuer, subject],
        );
      }
      for (const r of opts.roles ?? []) {
        await owner.query(`INSERT INTO user_role (user_id, role, grant_reason) VALUES ($1, $2, 'test fixture')`, [id, r]);
      }
      if (opts.agency) {
        await owner.query(`INSERT INTO agency_user (agency_id, user_id, agency_role) VALUES ($1, $2, $3)`, [
          opts.agency.id,
          id,
          opts.agency.role ?? 'agency_member',
        ]);
      }
      for (const s of opts.scopes ?? []) {
        await owner.query(`INSERT INTO staff_scope (user_id, role, scope_kind, scope_id) VALUES ($1, $2, $3, $4)`, [
          id,
          s.role,
          s.kind,
          s.id,
        ]);
      }
      return { id, email, subject, token: () => issuer.token(subject) };
    },
    async createAgency(name = 'Agency') {
      const n = ++seq;
      const r = await owner.query<{ id: string }>(`INSERT INTO agency (ref, name) VALUES ($1, $2) RETURNING id`, [
        `AG-${n}-${Math.random().toString(36).slice(2, 6)}`,
        `${name} ${n}`,
      ]);
      return r.rows[0]!.id;
    },
    async auth(user) {
      return { authorization: `Bearer ${await user.token()}` };
    },
    async close() {
      await app.close();
      await pool.end();
      await owner.end();
      await issuer.close();
      await db.drop();
    },
  };
  return ctx;
}
