import type { Queryable } from '../../database/pool.js';
import { type Principal, principalAuditView } from '../auth/principal.js';

/**
 * Append-only audit writer (ADR 0006). The only operation offered is append: this module exposes no update or delete,
 * and the database refuses them (privileges + triggers, migration 0002).
 *
 * The actor, roles and scope come from the server-authenticated principal; request id and client IP come from the
 * server's request context (the IP honours TRUST_PROXY only), never from the request body.
 * Call it with the transaction client of the state change so the audit row commits or rolls back with it (P10 §D).
 */

export type AuditActor = { kind: 'user'; principal: Principal } | { kind: 'system'; label: string };

export interface AuditRequestContext {
  requestId?: string;
  correlationId?: string;
  clientIp?: string;
}

export interface AuditEventInput {
  actor: AuditActor;
  operation: string;
  outcome?: 'succeeded' | 'refused';
  entity: { type: string; id?: string | null };
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  /** When true, a missing or blank reason is a programming error (throws before anything is written). */
  reasonRequired?: boolean;
  metadata?: Record<string, unknown>;
  request?: AuditRequestContext;
}

export class AuditReasonRequiredError extends Error {
  constructor(operation: string) {
    super(`audit operation ${operation} requires a reason`);
    this.name = 'AuditReasonRequiredError';
  }
}

const IP_RE = /^[0-9a-fA-F:.]{2,45}$/;

export async function appendAudit(db: Queryable, e: AuditEventInput): Promise<{ id: string; seq: string }> {
  const reason = e.reason?.trim() || null;
  if (e.reasonRequired && !reason) throw new AuditReasonRequiredError(e.operation);
  const user = e.actor.kind === 'user' ? e.actor.principal : null;
  const view = user ? principalAuditView(user) : { roles: [], scope: {} };
  const ip = e.request?.clientIp && IP_RE.test(e.request.clientIp) ? e.request.clientIp : null;
  const r = await db.query<{ id: string; seq: string }>(
    `INSERT INTO audit_event
       (actor_type, actor_user_id, actor_label, actor_roles, actor_scope, operation, outcome, entity_type, entity_id,
        request_id, correlation_id, client_ip, before_state, after_state, reason, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::inet, $13, $14, $15, $16)
     RETURNING id, seq::text`,
    [
      e.actor.kind,
      user?.userId ?? null,
      e.actor.kind === 'system' ? e.actor.label : null,
      view.roles,
      JSON.stringify(view.scope),
      e.operation,
      e.outcome ?? 'succeeded',
      e.entity.type,
      e.entity.id ?? null,
      e.request?.requestId ?? null,
      e.request?.correlationId ?? null,
      ip,
      e.before === undefined ? null : JSON.stringify(e.before),
      e.after === undefined ? null : JSON.stringify(e.after),
      reason,
      JSON.stringify(e.metadata ?? {}),
    ],
  );
  return r.rows[0]!;
}
