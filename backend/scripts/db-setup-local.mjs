#!/usr/bin/env node
// Local development database setup (never production). Idempotent.
// Creates, on a PostgreSQL server you control:
//   ilumin_app    NOLOGIN group role that receives the API grants (migrations require it)
//   ilumin_owner  LOGIN schema owner, used only by `npm run migrate`
//   ilumin_api    LOGIN API role, member of ilumin_app
//   <database>    owned by ilumin_owner
// Inputs (environment, e.g. backend/.env):
//   LOCAL_DATABASE_ADMIN_URL   superuser connection, e.g. postgres://postgres:<pw>@127.0.0.1:5432/postgres
//   LOCAL_DATABASE_NAME        default ilumin_dev
//   LOCAL_OWNER_PASSWORD       password to set for ilumin_owner (required)
//   LOCAL_API_PASSWORD         password to set for ilumin_api (required)
// Prints the DATABASE_URL / MIGRATION_DATABASE_URL to use (passwords masked). Inserts no data.
import pg from 'pg';

const adminUrl = process.env.LOCAL_DATABASE_ADMIN_URL;
const dbName = process.env.LOCAL_DATABASE_NAME || 'ilumin_dev';
const ownerPw = process.env.LOCAL_OWNER_PASSWORD;
const apiPw = process.env.LOCAL_API_PASSWORD;

const missing = [!adminUrl && 'LOCAL_DATABASE_ADMIN_URL', !ownerPw && 'LOCAL_OWNER_PASSWORD', !apiPw && 'LOCAL_API_PASSWORD'].filter(Boolean);
if (missing.length) {
  console.error(`Missing: ${missing.join(', ')}. See the header of scripts/db-setup-local.mjs.`);
  process.exit(2);
}
if (!/^[a-z_][a-z0-9_]{0,62}$/.test(dbName)) {
  console.error('LOCAL_DATABASE_NAME must be a lower-case identifier');
  process.exit(2);
}
const host = new URL(adminUrl).hostname;
if (!['127.0.0.1', 'localhost', '::1'].includes(host) && process.env.LOCAL_ALLOW_REMOTE !== 'true') {
  console.error(`Refusing to configure non-local host "${host}" (set LOCAL_ALLOW_REMOTE=true for a disposable remote dev server).`);
  process.exit(2);
}

const c = new pg.Client({ connectionString: adminUrl });
await c.connect();
try {
  const lit = (s) => `'${String(s).replace(/'/g, "''")}'`;
  await c.query(`DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ilumin_app') THEN CREATE ROLE ilumin_app NOLOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ilumin_owner') THEN CREATE ROLE ilumin_owner LOGIN; END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ilumin_api') THEN CREATE ROLE ilumin_api LOGIN; END IF;
  END $$`);
  await c.query(`ALTER ROLE ilumin_owner PASSWORD ${lit(ownerPw)} NOSUPERUSER NOCREATEROLE NOCREATEDB`);
  await c.query(`ALTER ROLE ilumin_api PASSWORD ${lit(apiPw)} NOSUPERUSER NOCREATEROLE NOCREATEDB`);
  await c.query(`GRANT ilumin_app TO ilumin_api`);
  const exists = await c.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
  if (!exists.rowCount) await c.query(`CREATE DATABASE ${dbName} OWNER ilumin_owner`);
  const u = new URL(adminUrl);
  const url = (user) => `postgres://${user}:<password>@${u.host}/${dbName}`;
  console.log(`Ready. Put these in backend/.env (with the passwords you chose):
  DATABASE_URL=${url('ilumin_api')}
  MIGRATION_DATABASE_URL=${url('ilumin_owner')}
Then run: npm run migrate`);
} finally {
  await c.end();
}
