import { randomBytes } from 'node:crypto';
import pg from 'pg';
import { inject } from 'vitest';
import { TEST_ROLES, roleUrl } from './urls.js';

/**
 * A fresh database per test file, cloned from the migrated template. Two connection strings:
 *   appUrl   — the API role (member of ilumin_app): what the application uses at runtime
 *   ownerUrl — the schema owner: used by tests for fixtures and to prove owner-level guards (triggers)
 */
export interface TestDatabase {
  name: string;
  appUrl: string;
  ownerUrl: string;
  adminUrl: string;
  drop(): Promise<void>;
}

export function requireTestDb() {
  const t = inject('testDb');
  if (!t) {
    throw new Error(
      'Integration tests need a real PostgreSQL server: run `npm run test:ephemeral`, or set TEST_DATABASE_ADMIN_URL ' +
        '(a disposable server where the role can create roles and databases).',
    );
  }
  return t;
}

export async function createTestDatabase(): Promise<TestDatabase> {
  const t = requireTestDb();
  const name = `${t.template}_${randomBytes(4).toString('hex')}`;
  const admin = new pg.Client({ connectionString: t.adminUrl });
  await admin.connect();
  try {
    for (let attempt = 0; ; attempt++) {
      try {
        await admin.query(`CREATE DATABASE ${name} TEMPLATE ${t.template} OWNER ${TEST_ROLES.owner}`);
        break;
      } catch (err) {
        // Another clone of the same template in progress ("source database is being accessed by other users").
        if ((err as { code?: string }).code === '55006' && attempt < 20) {
          await new Promise((r) => setTimeout(r, 100 + Math.random() * 200));
          continue;
        }
        throw err;
      }
    }
  } finally {
    await admin.end();
  }
  return {
    name,
    appUrl: roleUrl(t.adminUrl, TEST_ROLES.api, t.apiPassword, name),
    ownerUrl: roleUrl(t.adminUrl, TEST_ROLES.owner, t.ownerPassword, name),
    adminUrl: t.adminUrl,
    drop: async () => {
      const c = new pg.Client({ connectionString: t.adminUrl });
      await c.connect();
      try {
        await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      } finally {
        await c.end();
      }
    },
  };
}

/** An empty database (no migrations) for migration-runner tests. */
export async function createEmptyDatabase(): Promise<TestDatabase> {
  const t = requireTestDb();
  const name = `${t.template}_${randomBytes(4).toString('hex')}`;
  const admin = new pg.Client({ connectionString: t.adminUrl });
  await admin.connect();
  try {
    await admin.query(`CREATE DATABASE ${name} OWNER ${TEST_ROLES.owner}`);
  } finally {
    await admin.end();
  }
  return {
    name,
    appUrl: roleUrl(t.adminUrl, TEST_ROLES.api, t.apiPassword, name),
    ownerUrl: roleUrl(t.adminUrl, TEST_ROLES.owner, t.ownerPassword, name),
    adminUrl: t.adminUrl,
    drop: async () => {
      const c = new pg.Client({ connectionString: t.adminUrl });
      await c.connect();
      try {
        await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
      } finally {
        await c.end();
      }
    },
  };
}
