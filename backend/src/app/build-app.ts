import { randomUUID } from 'node:crypto';
import cors from '@fastify/cors';
import Fastify, { LogController, type FastifyError, type FastifyInstance, type FastifyServerOptions } from 'fastify';
import { registerAgencyRoutes } from '../modules/agencies/routes.js';
import { registerApplicationRoutes } from '../modules/applications/routes.js';
import { registerAuditRoutes } from '../modules/audit/routes.js';
import { OidcLoginClient } from '../modules/auth/oidc-client.js';
import type { OidcTokenVerifier } from '../modules/auth/oidc.js';
import { registerAuthRoutes } from '../modules/auth/routes.js';
import { registerBatchRoutes } from '../modules/batches/routes.js';
import { prerequisitesOf } from '../modules/enrolments/wiring.js';
import { registerOpsRoutes } from '../modules/ops/routes.js';
import { registerProgrammeRoutes } from '../modules/programmes/routes.js';
import { registerUserRoutes } from '../modules/users/routes.js';
import { mapDatabaseError } from '../shared/db-errors.js';
import { AppError } from '../shared/errors.js';
import { registerHealthRoutes } from './health.js';
import { missingAccessRule, rateLimitsFor, type Services } from './route.js';

/**
 * Builds the HTTP application. No listening, no process handlers: main.ts owns the lifecycle, tests inject services.
 */

export interface RouteInventoryEntry {
  method: string;
  url: string;
  /** "public" or the policy name. */
  access: string;
}

declare module 'fastify' {
  interface FastifyInstance {
    routeInventory: RouteInventoryEntry[];
  }
}

const CORRELATION_RE = /^[A-Za-z0-9._:-]{1,128}$/;

export function loggerOptions(level: string): FastifyServerOptions['logger'] {
  return {
    level,
    // Defence in depth: these never reach the log even if someone logs a raw request.
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'headers.authorization',
        'headers.cookie',
        '*.token',
        '*.password',
        '*.secret',
      ],
      censor: '[redacted]',
    },
    serializers: {
      req: (req: { method?: string; url?: string }) => ({ method: req.method, path: (req.url ?? '').split('?')[0] }),
      res: (res: { statusCode?: number }) => ({ statusCode: res.statusCode }),
    },
  };
}

export async function buildApp(services: Services, opts: { logger?: FastifyServerOptions['logger'] } = {}): Promise<FastifyInstance> {
  const { config } = services;
  // Fail closed at start-up: test-only enrolment prerequisite adapters are refused outside the test environment.
  prerequisitesOf(services);
  const app = Fastify({
    logger: opts.logger ?? loggerOptions(config.logLevel),
    // Server-generated request ids only; a client-supplied id is kept as the correlation id instead.
    genReqId: () => randomUUID(),
    requestIdHeader: false,
    // One structured "request completed" line per request is written by the onResponse hook below.
    logController: new LogController({ requestIdLogLabel: 'requestId', disableRequestLogging: true }),
    // A hop count is supported at runtime (proxy-addr) but missing from Fastify's typings.
    trustProxy: config.trustProxy as unknown as boolean | string[],
    bodyLimit: config.bodyLimitBytes,
    return503OnClosing: true,
    routerOptions: { ignoreTrailingSlash: false, caseSensitive: true },
  });

  // JSON only: text/plain would otherwise reach validators as a string.
  app.removeContentTypeParser('text/plain');

  // Fail closed at start-up: every route must declare its access rule. The inventory lets tests prove there is no
  // unauthenticated write endpoint.
  const inventory: RouteInventoryEntry[] = [];
  app.decorate('routeInventory', inventory);
  app.addHook('onRoute', (route) => {
    const methods = ([] as string[]).concat(route.method as string | string[]);
    if (methods.length === 1 && methods[0] === 'OPTIONS' && route.url === '*') {
      route.config = { ...(route.config ?? {}), access: { kind: 'public' } }; // CORS preflight carries no credentials
    }
    const access = route.config?.access;
    if (!access) {
      throw new Error(`Route ${methods.join(',')} ${route.url} has no access rule; refusing to start (fail closed).`);
    }
    if (access.kind === 'public' && methods.some((m) => !['GET', 'HEAD', 'OPTIONS'].includes(m))) {
      throw new Error(`Route ${methods.join(',')} ${route.url} is public but not read-only; refusing to start.`);
    }
    for (const m of methods) {
      inventory.push({ method: m, url: route.url, access: access.kind === 'public' ? 'public' : access.policy.name });
    }
  });

  app.decorateRequest('principal', undefined);
  app.decorateRequest('correlationId', '');

  app.addHook('onRequest', async (request, reply) => {
    const incoming = request.headers['x-correlation-id'];
    request.correlationId = typeof incoming === 'string' && CORRELATION_RE.test(incoming) ? incoming : request.id;
    request.log = request.log.child({ correlationId: request.correlationId });
    reply.header('X-Request-Id', request.id);
    reply.header('X-Correlation-Id', request.correlationId);
    if (!request.is404 && !request.routeOptions.config?.access) throw missingAccessRule();
  });

  app.addHook('onSend', async (_request, reply, payload) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('Referrer-Policy', 'no-referrer');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    return payload;
  });

  app.addHook('onResponse', async (request, reply) => {
    request.log.info(
      {
        method: request.method,
        route: request.routeOptions.url ?? null,
        path: request.url.split('?')[0],
        status: reply.statusCode,
        durationMs: Math.round(reply.elapsedTime),
        ...(request.principal ? { userId: request.principal.userId } : {}),
      },
      'request completed',
    );
  });

  app.setNotFoundHandler(async (request, reply) =>
    reply.code(404).send({ error: { code: 'NOT_FOUND', message: 'Not found.', requestId: request.id } }),
  );

  app.setErrorHandler(async (err: FastifyError | AppError | Error, request, reply) => {
    const mapped = err instanceof AppError ? null : mapDatabaseError(err);
    if (mapped) {
      // A database-enforced domain rule (migration 0007) or a lock / serialization timeout: the transaction rolled back.
      request.log.warn({ pgCode: (err as { code?: string }).code, mappedTo: mapped.code }, 'database refusal');
      err = mapped;
    }
    if (err instanceof AppError) {
      if (err.headers) reply.headers(err.headers);
      return reply.code(err.status).send({
        error: { code: err.code, message: err.message, requestId: request.id, ...(err.details ? { details: err.details } : {}) },
      });
    }
    const fe = err as FastifyError;
    const status = typeof fe.statusCode === 'number' ? fe.statusCode : 500;
    if (status === 413) {
      return reply.code(413).send({ error: { code: 'PAYLOAD_TOO_LARGE', message: 'The request body is too large.', requestId: request.id } });
    }
    if (status === 415) {
      return reply.code(415).send({
        error: { code: 'UNSUPPORTED_MEDIA_TYPE', message: 'Send the request body as application/json.', requestId: request.id },
      });
    }
    if (status === 503 && fe.code === 'FST_ERR_REP_ALREADY_SENT') {
      return reply;
    }
    if (status >= 400 && status < 500) {
      return reply.code(400).send({ error: { code: 'MALFORMED_REQUEST', message: 'The request could not be read.', requestId: request.id } });
    }
    request.log.error({ err }, 'unhandled error');
    return reply.code(500).send({ error: { code: 'INTERNAL', message: 'An unexpected error occurred.', requestId: request.id } });
  });

  if (config.cors.allowedOrigins.length) {
    await app.register(cors, {
      // Exact origins only (wildcards are refused by configuration). Credentials (the session cookie) are allowed only
      // when browser sessions are enabled.
      origin: config.cors.allowedOrigins,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Authorization', 'Content-Type', 'Idempotency-Key', 'X-Correlation-Id', 'X-CSRF-Token'],
      exposedHeaders: ['X-Request-Id', 'X-Correlation-Id', 'Idempotent-Replayed', 'Retry-After', 'X-CSRF-Token'],
      credentials: config.auth.session !== null,
      maxAge: 600,
    });
  }

  rateLimitsFor(services);
  registerHealthRoutes(app, services);
  if (config.auth.session) {
    services.loginClient ??= new OidcLoginClient(config.oidc, config.auth.session, services.verifier as OidcTokenVerifier);
    registerAuthRoutes(app, services, services.loginClient);
  }
  registerUserRoutes(app, services);
  registerAgencyRoutes(app, services);
  registerAuditRoutes(app, services);
  registerOpsRoutes(app, services);
  registerProgrammeRoutes(app, services);
  registerBatchRoutes(app, services);
  registerApplicationRoutes(app, services);

  return app;
}
