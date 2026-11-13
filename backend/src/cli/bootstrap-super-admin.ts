import { parseArgs } from 'node:util';
import { z } from 'zod';
import { loadConfig } from '../config/config.js';
import { createPool } from '../database/pool.js';
import { withTransaction } from '../database/transaction.js';
import { appendAudit } from '../modules/audit/audit.js';

/**
 * One-time creation of the first Super Administrator, run by an operator with real values:
 *
 *   npm run admin:bootstrap -- --email <email> --name "<display name>" --subject <IdP subject> --reason "<why>"
 *
 * The subject is the person's "sub" at the configured identity provider (OIDC_ISSUER). Refuses if any active Super
 * Administrator already exists (further admins are granted through the API). No password is created or stored.
 * Runs as the API role (DATABASE_URL). Audited as a system action.
 */

const Args = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(200),
  subject: z.string().trim().min(1).max(255),
  reason: z.string().trim().min(3).max(1000),
});

async function main(): Promise<number> {
  const { values } = parseArgs({
    options: { email: { type: 'string' }, name: { type: 'string' }, subject: { type: 'string' }, reason: { type: 'string' } },
  });
  const parsed = Args.safeParse(values);
  if (!parsed.success) {
    console.error('Usage: admin:bootstrap -- --email <email> --name "<name>" --subject <idp-sub> --reason "<reason>"');
    for (const i of parsed.error.issues) console.error(`  --${i.path.join('.')}: ${i.message}`);
    return 2;
  }
  const a = parsed.data;
  const config = loadConfig(process.env);
  const pool = createPool(config.database, 'ilumin-bootstrap');
  try {
    const userId = await withTransaction(pool, async (tx) => {
      // Serialise concurrent bootstrap runs.
      await tx.query(`SELECT pg_advisory_xact_lock(hashtext('ilumin.bootstrap-super-admin'))`);
      const existing = await tx.query(
        `SELECT 1 FROM user_role r JOIN app_user u ON u.id = r.user_id
          WHERE r.role = 'super_admin' AND r.revoked_at IS NULL AND u.status = 'active' LIMIT 1`,
      );
      if (existing.rowCount) throw new Error('An active Super Administrator already exists; grant further roles through the API.');
      const u = await tx.query<{ id: string }>(`INSERT INTO app_user (email, display_name) VALUES ($1, $2) RETURNING id`, [
        a.email,
        a.name,
      ]);
      const id = u.rows[0]!.id;
      await tx.query(
        `INSERT INTO user_identity (user_id, issuer, subject, email_at_link, link_method) VALUES ($1, $2, $3, $4, 'bootstrap')`,
        [id, config.oidc.issuer, a.subject, a.email],
      );
      await tx.query(`INSERT INTO user_role (user_id, role, grant_reason) VALUES ($1, 'super_admin', $2)`, [id, a.reason]);
      await appendAudit(tx, {
        actor: { kind: 'system', label: 'cli.bootstrap_super_admin' },
        operation: 'user.bootstrap_super_admin',
        entity: { type: 'app_user', id },
        after: { email: a.email, displayName: a.name, roles: ['super_admin'], issuer: config.oidc.issuer },
        reason: a.reason,
        reasonRequired: true,
      });
      return id;
    });
    console.log(`Super Administrator created: ${userId}`);
    return 0;
  } finally {
    await pool.end();
  }
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error(`Bootstrap refused: ${(err as Error).message}`);
    process.exit(1);
  },
);
