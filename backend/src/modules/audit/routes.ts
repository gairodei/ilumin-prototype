import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { defineRoute, type Services } from '../../app/route.js';
import { errors } from '../../shared/errors.js';
import { hasAnyRole } from '../authz/policy.js';

/**
 * Read-only audit API (Stage 1B). There is no update or delete endpoint, and the database refuses both anyway.
 *
 * Authorization — PROVISIONAL DEFAULT PD-1B-01, requires client approval: no decision in PROVISIONAL-DECISIONS.md or P0
 * says which roles may read the audit trail, or with what scope. Until one does, only the Super Administrator reads it,
 * across all entities. Agency users, learners and every other role are refused (403, audited), so no cross-agency audit
 * information can reach an agency. Scoped readers (e.g. Finance for finance entities) can be added as policies once
 * decided.
 *
 * Bounds: a time range of at most 93 days (default: the last 7 days), at most 200 events per page, keyset pagination
 * by sequence number (stable under concurrent inserts). Every read is itself audited ('audit.read').
 *
 * Redaction: credential-like keys are always replaced; email and phone values are masked. The client IP is shown
 * (security investigations need it) — revisit with the data-protection decision D-01.
 */

export const auditReader = hasAnyRole('super_admin');

const MAX_RANGE_MS = 93 * 24 * 3600 * 1000;
const DEFAULT_RANGE_MS = 7 * 24 * 3600 * 1000;

const isoInstant = z.iso.datetime({ offset: true, message: 'must be an ISO-8601 date-time with a time zone' });

const AuditQuery = z
  .object({
    from: isoInstant.optional(),
    to: isoInstant.optional(),
    entityType: z.string().min(1).max(100).optional(),
    entityId: z.string().min(1).max(200).optional(),
    actorUserId: z.string().uuid({ message: 'must be a UUID' }).optional(),
    operation: z.string().regex(/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$/, 'is not an operation name').optional(),
    outcome: z.enum(['succeeded', 'refused']).optional(),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    cursor: z.string().regex(/^[0-9A-Za-z_-]{1,40}$/, 'is not a valid cursor').optional(),
  })
  .strict();

const CREDENTIAL_KEY = /(pass(word)?|secret|token|authori[sz]ation|cookie|csrf|verifier|api[_-]?key|private[_-]?key|otp|code_challenge)/i;
const CONTACT_KEY = /(e-?mail|phone|mobile|msisdn)/i;

function maskContact(v: string): string {
  const at = v.indexOf('@');
  if (at > 0) return `${v[0]}***${v.slice(at)}`;
  return v.length > 4 ? `${'*'.repeat(v.length - 4)}${v.slice(-4)}` : '****';
}

/** Recursively redacts an audit JSON value for display. */
export function redactAuditValue(value: unknown, key = '', depth = 0): unknown {
  if (depth > 20) return '[truncated]';
  if (key && CREDENTIAL_KEY.test(key)) return '[redacted]';
  if (typeof value === 'string') return key && CONTACT_KEY.test(key) ? maskContact(value) : value;
  if (Array.isArray(value)) return value.map((v) => redactAuditValue(v, key, depth + 1));
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value)) out[k] = redactAuditValue(v, k, depth + 1);
    return out;
  }
  return value;
}

const encodeCursor = (seq: string) => Buffer.from(seq).toString('base64url');
function decodeCursor(c: string): string {
  const s = Buffer.from(c, 'base64url').toString();
  if (!/^\d{1,19}$/.test(s)) throw errors.validation([{ path: 'cursor', message: 'is not a valid cursor' }]);
  return s;
}

interface Row {
  id: string;
  seq: string;
  occurred_at: Date;
  actor_type: string;
  actor_user_id: string | null;
  actor_label: string | null;
  actor_roles: string[];
  actor_scope: unknown;
  operation: string;
  outcome: string;
  entity_type: string;
  entity_id: string | null;
  request_id: string | null;
  correlation_id: string | null;
  client_ip: string | null;
  before_state: unknown;
  after_state: unknown;
  reason: string | null;
  metadata: unknown;
}

export function registerAuditRoutes(app: FastifyInstance, services: Services): void {
  defineRoute(app, services, {
    method: 'GET',
    url: '/v1/audit/events',
    query: AuditQuery,
    access: auditReader,
    handler: async ({ db, query, audit }) => {
      const to = query.to ? new Date(query.to) : new Date();
      const from = query.from ? new Date(query.from) : new Date(to.getTime() - DEFAULT_RANGE_MS);
      if (from >= to) throw errors.validation([{ path: 'from', message: 'must be before "to"' }]);
      if (to.getTime() - from.getTime() > MAX_RANGE_MS) {
        throw errors.validation([{ path: 'from', message: 'the time range may not exceed 93 days' }]);
      }

      const where = ['occurred_at >= $1', 'occurred_at < $2'];
      const params: unknown[] = [from, to];
      const add = (sql: string, v: unknown) => {
        params.push(v);
        where.push(sql.replace('?', `$${params.length}`));
      };
      if (query.entityType) add('entity_type = ?', query.entityType);
      if (query.entityId) add('entity_id = ?', query.entityId);
      if (query.actorUserId) add('actor_user_id = ?', query.actorUserId);
      if (query.operation) add('operation = ?', query.operation);
      if (query.outcome) add('outcome = ?', query.outcome);
      if (query.cursor) add('seq < ?::bigint', decodeCursor(query.cursor));
      params.push(query.limit + 1);

      const r = await db.query<Row>(
        `SELECT id, seq::text AS seq, occurred_at, actor_type, actor_user_id, actor_label, actor_roles, actor_scope,
                operation, outcome, entity_type, entity_id, request_id, correlation_id, host(client_ip) AS client_ip,
                before_state, after_state, reason, metadata
           FROM audit_event
          WHERE ${where.join(' AND ')}
          ORDER BY seq DESC
          LIMIT $${params.length}`,
        params,
      );
      const page = r.rows.slice(0, query.limit);
      const next = r.rows.length > query.limit ? encodeCursor(page[page.length - 1]!.seq) : null;

      const filters = { ...query, from: from.toISOString(), to: to.toISOString(), cursor: undefined };
      await audit({
        operation: 'audit.read',
        entity: { type: 'audit_event' },
        metadata: { filters, returned: page.length },
      });

      return {
        status: 200,
        body: {
          events: page.map((e) => ({
            id: e.id,
            seq: e.seq,
            occurredAt: e.occurred_at.toISOString(),
            actor: { type: e.actor_type, userId: e.actor_user_id, label: e.actor_label, roles: e.actor_roles, scope: e.actor_scope },
            operation: e.operation,
            outcome: e.outcome,
            entity: { type: e.entity_type, id: e.entity_id },
            requestId: e.request_id,
            correlationId: e.correlation_id,
            clientIp: e.client_ip,
            before: redactAuditValue(e.before_state),
            after: redactAuditValue(e.after_state),
            reason: e.reason,
            metadata: redactAuditValue(e.metadata),
          })),
          range: { from: from.toISOString(), to: to.toISOString() },
          nextCursor: next,
        },
      };
    },
  });
}
