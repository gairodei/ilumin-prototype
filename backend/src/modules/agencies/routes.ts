import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { defineRoute, type Services } from '../../app/route.js';
import { errors } from '../../shared/errors.js';
import { agencyAdministration, anyOf, memberOfAgency, param } from '../authz/policy.js';

/**
 * Tenant-isolation example (P10 S-05): an agency user sees only their own agency's members; the Business Admin and the
 * Super Administrator (agency administration owners) see any agency. The policy runs before the existence check, so a
 * user of agency A gets the same 403 for agency B whether or not B exists (no enumeration).
 */

const AgencyParams = z.object({ agencyId: z.string().uuid({ message: 'must be a UUID' }) });

export function registerAgencyRoutes(app: FastifyInstance, services: Services): void {
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/agencies/:agencyId/members',
    params: AgencyParams,
    access: anyOf(memberOfAgency(param('agencyId')), agencyAdministration),
    handler: async ({ db, params }) => {
      const a = await db.query<{ id: string; name: string; status: string }>(
        `SELECT id, name, status FROM agency WHERE id = $1`,
        [params.agencyId],
      );
      if (!a.rows[0]) throw errors.notFound('Agency not found.');
      const m = await db.query<{ user_id: string; display_name: string; agency_role: string }>(
        `SELECT m.user_id, u.display_name, m.agency_role
           FROM agency_user m JOIN app_user u ON u.id = m.user_id
          WHERE m.agency_id = $1 AND m.revoked_at IS NULL
          ORDER BY u.display_name, m.user_id`,
        [params.agencyId],
      );
      return {
        status: 200,
        body: {
          agency: a.rows[0],
          members: m.rows.map((r) => ({ userId: r.user_id, displayName: r.display_name, agencyRole: r.agency_role })),
        },
      };
    },
  });
}
