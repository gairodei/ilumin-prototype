import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { z } from 'zod';
import type { Config } from '../config/config.js';
import type { Pool, Queryable } from '../database/pool.js';
import { withTransaction } from '../database/transaction.js';
import { type AuditEventInput, appendAudit } from '../modules/audit/audit.js';
import { authenticate, requestAuditContext, verifyCsrf } from '../modules/auth/authenticate.js';
import type { TokenVerifier } from '../modules/auth/oidc.js';
import type { Principal } from '../modules/auth/principal.js';
import type { Policy } from '../modules/authz/policy.js';
import { AppError, errors } from '../shared/errors.js';
import {
  IDEMPOTENCY_HEADER,
  claimIdempotency,
  completeIdempotency,
  fingerprint,
  isFinancialOperation,
  type RetentionClass,
  validateIdempotencyKey,
} from '../shared/idempotency.js';
import { DbRateLimiter, MemoryRateLimiter, type RateLimiters } from '../shared/rate-limit.js';
import type { OidcLoginClient } from '../modules/auth/oidc-client.js';
import type { Prerequisites } from '../modules/enrolments/prerequisites.js';
import { parseInput } from '../shared/validation.js';

/**
 * The only way application routes are declared. Each route states its access rule:
 *   access: 'public'   — no authentication (health checks only)
 *   access: <Policy>   — authenticated principal + explicit authorization policy
 * buildApp() refuses to start if any route (including ones registered without this helper) has no access rule, and the
 * request pipeline denies such a route at runtime as well (fail closed twice).
 *
 * Pipeline for protected routes: authenticate (before body parsing) → rate limits (general per user; sensitive routes
 * also in PostgreSQL) → CSRF (cookie sessions, unsafe methods) → validate params/query → authorize (refusal audited) →
 * validate body → [transaction → idempotency claim] → handler → [idempotency completion → commit].
 *
 * Public routes may only use safe methods (GET/HEAD): there is no unauthenticated write endpoint.
 */

export type AccessRule = { kind: 'public' } | { kind: 'protected'; policy: Policy };

declare module 'fastify' {
  interface FastifyContextConfig {
    access?: AccessRule;
  }
  interface FastifyRequest {
    principal?: Principal;
    correlationId: string;
  }
}

export interface Services {
  config: Config;
  pool: Pool;
  verifier: TokenVerifier;
  lifecycle: { shuttingDown: boolean };
  /** Created by buildApp when absent. */
  rateLimits?: RateLimiters;
  /** Browser sign-in client; present when AUTH_SESSION_ENABLED=true (created by buildApp). */
  loginClient?: OidcLoginClient;
  /**
   * Enrolment prerequisite adapters (Stage 2B). Production start-up never sets this: the fail-closed production adapters
   * apply. Test-only adapters are refused outside the test environment (src/modules/enrolments/prerequisites.ts).
   */
  prerequisites?: Prerequisites;
}

export function rateLimitsFor(services: Services): RateLimiters {
  services.rateLimits ??= { db: new DbRateLimiter(services.pool), memory: new MemoryRateLimiter() };
  return services.rateLimits;
}

export interface HandlerResult {
  status: number;
  body: unknown;
}

export interface HandlerContext<P, Q, B, Auth extends boolean> {
  request: FastifyRequest;
  principal: Auth extends true ? Principal : undefined;
  params: P;
  query: Q;
  body: B;
  /** The transaction client for transactional routes, otherwise the pool. */
  db: Queryable;
  services: Services;
  /** Appends an audit event in this route's transaction, with the server-derived actor and request context. */
  audit: (e: Omit<AuditEventInput, 'actor' | 'request'>) => Promise<void>;
  /** Refuses with 403 and records the refusal in the audit log (committed separately from the rolled-back work). */
  refuse: (reason: string, entity: { type: string; id?: string | null }, operation?: string) => Promise<never>;
}

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

interface BaseSpec<P extends z.ZodType, Q extends z.ZodType, B extends z.ZodType> {
  method: Method;
  url: string;
  params?: P;
  query?: Q;
  body?: B;
}

interface PublicSpec<P extends z.ZodType, Q extends z.ZodType, B extends z.ZodType> extends BaseSpec<P, Q, B> {
  access: 'public';
  handler: (ctx: HandlerContext<z.output<P>, z.output<Q>, z.output<B>, false>, reply: FastifyReply) => Promise<HandlerResult>;
}

interface ProtectedSpec<P extends z.ZodType, Q extends z.ZodType, B extends z.ZodType> extends BaseSpec<P, Q, B> {
  access: Policy;
  /** Runs the handler in one database transaction (with retries on serialization failure / deadlock). */
  transactional?: boolean;
  /**
   * Requires an Idempotency-Key header; implies transactional. Financial operations must use retention 'permanent'
   * (registration refuses otherwise).
   */
  idempotent?: { operation: string; retention?: RetentionClass };
  /** 'sensitive': also counted by the shared PostgreSQL limiter (RATE_LIMIT_SENSITIVE, per user). */
  rateLimit?: 'sensitive';
  /**
   * SET LOCAL lock_timeout for the route's transaction (production-transaction-rules §1.3 rule 4). A timeout rolls the
   * whole transaction back and answers 503 with Retry-After.
   */
  lockTimeoutMs?: number;
  handler: (ctx: HandlerContext<z.output<P>, z.output<Q>, z.output<B>, true>, reply: FastifyReply) => Promise<HandlerResult>;
}

async function auditRefusal(
  services: Services,
  request: FastifyRequest,
  principal: Principal,
  operation: string,
  entity: { type: string; id?: string | null },
  reason: string,
  metadata?: Record<string, unknown>,
): Promise<void> {
  await appendAudit(services.pool, {
    actor: { kind: 'user', principal },
    operation,
    outcome: 'refused',
    entity,
    reason,
    ...(metadata ? { metadata } : {}),
    request: requestAuditContext(request),
  }).catch((err) => request.log.error({ err }, 'failed to write refusal audit event'));
}

/** A public route (health checks only). */
export function definePublicRoute<P extends z.ZodType, Q extends z.ZodType, B extends z.ZodType>(
  app: FastifyInstance,
  services: Services,
  spec: PublicSpec<P, Q, B>,
): void {
  register(app, services, spec);
}

/** A protected route: authenticated principal + explicit authorization policy. */
export function defineRoute<P extends z.ZodType, Q extends z.ZodType, B extends z.ZodType>(
  app: FastifyInstance,
  services: Services,
  spec: ProtectedSpec<P, Q, B>,
): void {
  register(app, services, spec);
}

function register<P extends z.ZodType, Q extends z.ZodType, B extends z.ZodType>(
  app: FastifyInstance,
  services: Services,
  spec: PublicSpec<P, Q, B> | ProtectedSpec<P, Q, B>,
): void {
  const isPublic = spec.access === 'public';
  if (isPublic && !['GET', 'HEAD'].includes(spec.method)) {
    throw new Error(`Public route ${spec.method} ${spec.url} refused: unauthenticated routes may only read.`);
  }
  const idem = isPublic ? undefined : (spec as ProtectedSpec<P, Q, B>).idempotent;
  if (idem && isFinancialOperation(idem.operation) && idem.retention !== 'permanent') {
    throw new Error(`Route ${spec.method} ${spec.url}: financial operation ${idem.operation} needs idempotent.retention 'permanent'.`);
  }
  const access: AccessRule = isPublic ? { kind: 'public' } : { kind: 'protected', policy: spec.access as Policy };
  const routeId = `${spec.method} ${spec.url}`;

  app.route({
    method: spec.method,
    url: spec.url,
    config: { access },
    ...(isPublic
      ? {}
      : {
          onRequest: async (request: FastifyRequest, reply: FastifyReply) => {
            const principal = await authenticate(request, reply, services);
            request.principal = principal;
            const limits = rateLimitsFor(services);
            limits.memory.enforce(`api:user:${principal.userId}`, services.config.rateLimits.api);
            if ((spec as ProtectedSpec<P, Q, B>).rateLimit === 'sensitive') {
              await limits.db.enforce(`sensitive:user:${principal.userId}`, services.config.rateLimits.sensitive);
            }
            await verifyCsrf(request, principal, services);
          },
        }),
    handler: async (request, reply) => {
      const params = spec.params ? parseInput(spec.params, request.params, 'params') : (request.params as never);
      const query = spec.query ? parseInput(spec.query, request.query, 'query') : (request.query as never);
      const principal = request.principal;

      if (!isPublic) {
        if (!principal) throw errors.unauthenticated();
        const pol = (spec as ProtectedSpec<P, Q, B>).access;
        const decision = await pol.evaluate({
          principal,
          params: (params ?? {}) as Record<string, unknown>,
          query: (query ?? {}) as Record<string, unknown>,
          db: services.pool,
        });
        if (!decision.allow) {
          await auditRefusal(services, request, principal, 'authz.denied', { type: 'route', id: routeId }, decision.reason, {
            policy: pol.name,
            params,
          });
          throw errors.forbidden();
        }
      }

      const body = spec.body ? parseInput(spec.body, request.body ?? {}, 'body') : (undefined as never);

      const makeCtx = (db: Queryable): HandlerContext<z.output<P>, z.output<Q>, z.output<B>, boolean> => ({
        request,
        principal: principal as never,
        params,
        query,
        body,
        db,
        services,
        audit: async (e) => {
          if (!principal) throw new Error('audit() requires an authenticated principal');
          await appendAudit(db, { ...e, actor: { kind: 'user', principal }, request: requestAuditContext(request) });
        },
        refuse: async (reason, entity, operation = 'authz.denied') => {
          if (principal) await auditRefusal(services, request, principal, operation, entity, reason, { route: routeId });
          throw errors.forbidden();
        },
      });

      const pSpec = spec as ProtectedSpec<P, Q, B>;
      const txOptions = !isPublic && pSpec.lockTimeoutMs !== undefined ? { lockTimeoutMs: pSpec.lockTimeoutMs } : {};
      let result: HandlerResult;
      if (!isPublic && pSpec.idempotent) {
        const key = validateIdempotencyKey(request.headers[IDEMPOTENCY_HEADER]);
        const fp = fingerprint({ route: routeId, params, query, body });
        let replayed = false;
        result = await withTransaction(services.pool, async (tx) => {
          replayed = false;
          const claim = await claimIdempotency(tx, {
            principalUserId: principal!.userId,
            operation: pSpec.idempotent!.operation,
            key,
            fingerprint: fp,
            retentionHours: services.config.idempotencyRetentionHours,
            retentionClass: pSpec.idempotent!.retention ?? 'response_cache',
          });
          if (claim.kind === 'replay') {
            replayed = true;
            return claim.response;
          }
          const r = await pSpec.handler(makeCtx(tx) as never, reply);
          await completeIdempotency(tx, claim.recordId, r);
          return r;
        }, txOptions);
        if (replayed) reply.header('Idempotent-Replayed', 'true');
      } else if (!isPublic && pSpec.transactional) {
        result = await withTransaction(services.pool, (tx) => pSpec.handler(makeCtx(tx) as never, reply), txOptions);
      } else {
        result = await (spec.handler as (c: unknown, r: FastifyReply) => Promise<HandlerResult>)(makeCtx(services.pool), reply);
      }
      return reply.code(result.status).send(result.body);
    },
  });
}

/** Thrown for a route that reached the pipeline without an access rule (should be impossible after the boot check). */
export const missingAccessRule = () => new AppError(403, 'FORBIDDEN', 'You are not allowed to perform this action.');
