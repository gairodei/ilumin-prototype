import { randomBytes } from 'node:crypto';
import pg from 'pg';
import type { TestProject } from 'vitest/node';
import { migrateUp } from '../../src/database/migrate.js';
import { migrationsDir } from '../../src/shared/paths.js';
import { TEST_ROLES, roleUrl } from './urls.js';

/**
 * Creates a migrated template database once per run (as the schema-owner role, exactly as production migrations run).
 * Each integration test file clones it into its own database (tests/support/db.ts). Requires TEST_DATABASE_ADMIN_URL:
 * a role that can create roles and databases on a disposable server. `npm run test:ephemeral` provides one.
 */

declare module 'vitest' {
  export interface ProvidedContext {
    testDb: { adminUrl: string; template: string; ownerPassword: string; apiPassword: string } | null;
  }
}

export default async function setup(project: TestProject) {
  const adminUrl = process.env.TEST_DATABASE_ADMIN_URL;
  if (!adminUrl) {
    project.provide('testDb', null);
    return;
  }
  const ownerPassword = randomBytes(18).toString('base64url');
  const apiPassword = randomBytes(18).toString('base64url');
  const template = `ilumin_tpl_${randomBytes(4).toString('hex')}`;

  const admin = new pg.Client({ connectionString: adminUrl });
  await admin.connect();
  try {
    await admin.query(`DO $$ BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ilumin_app') THEN CREATE ROLE ilumin_app NOLOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${TEST_ROLES.owner}') THEN CREATE ROLE ${TEST_ROLES.owner} LOGIN; END IF;
      IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = '${TEST_ROLES.api}') THEN CREATE ROLE ${TEST_ROLES.api} LOGIN; END IF;
    END $$`);
    await admin.query(`ALTER ROLE ${TEST_ROLES.owner} PASSWORD '${ownerPassword}' NOSUPERUSER NOCREATEROLE NOCREATEDB`);
    await admin.query(`ALTER ROLE ${TEST_ROLES.api} PASSWORD '${apiPassword}' NOSUPERUSER NOCREATEROLE NOCREATEDB`);
    await admin.query(`GRANT ilumin_app TO ${TEST_ROLES.api}`);
    await admin.query(`CREATE DATABASE ${template} OWNER ${TEST_ROLES.owner}`);
  } finally {
    await admin.end();
  }

  await migrateUp(roleUrl(adminUrl, TEST_ROLES.owner, ownerPassword, template), migrationsDir());
  project.provide('testDb', { adminUrl, template, ownerPassword, apiPassword });

  return async () => {
    const c = new pg.Client({ connectionString: adminUrl });
    await c.connect();
    try {
      const dbs = await c.query<{ datname: string }>(
        `SELECT datname FROM pg_database WHERE datname = $1 OR datname LIKE $2`,
        [template, `${template}_%`],
      );
      for (const d of dbs.rows) await c.query(`DROP DATABASE IF EXISTS "${d.datname}" WITH (FORCE)`);
    } finally {
      await c.end();
    }
  };
}
