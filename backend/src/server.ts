import type { FastifyInstance, FastifyServerOptions } from 'fastify';
import { buildApp } from './app/build-app.js';
import type { Services } from './app/route.js';
import type { Config } from './config/config.js';
import { createPool, verifyDatabase } from './database/pool.js';
import { OidcTokenVerifier, type TokenVerifier } from './modules/auth/oidc.js';

/**
 * Start-up and graceful shutdown, separated from main.ts so tests can boot the real server in-process.
 *
 * Start-up refuses to listen when PostgreSQL is unreachable (DatabaseUnavailableError). The identity provider is not a
 * start-up dependency (readiness reports it, and authentication fails closed with 503 while it is unreachable).
 *
 * Shutdown: readiness turns 503 at once, the listener stops accepting connections, in-flight requests finish (bounded
 * by SHUTDOWN_TIMEOUT_MS), then the database pool closes.
 */

export interface RunningServer {
  app: FastifyInstance;
  services: Services;
  url: string;
  shutdown: (signal?: string) => Promise<void>;
}

export async function startServer(
  config: Config,
  opts: { verifier?: TokenVerifier; logger?: FastifyServerOptions['logger'] } = {},
): Promise<RunningServer> {
  const pool = createPool(config.database);
  try {
    await verifyDatabase(pool);
  } catch (err) {
    await pool.end().catch(() => {});
    throw err;
  }
  const services: Services = {
    config,
    pool,
    verifier: opts.verifier ?? new OidcTokenVerifier(config.oidc),
    lifecycle: { shuttingDown: false },
  };
  const app = await buildApp(services, opts.logger === undefined ? {} : { logger: opts.logger });
  const address = await app.listen({ host: config.host, port: config.port });

  let closing: Promise<void> | null = null;
  const shutdown = (signal = 'shutdown') => {
    if (closing) return closing;
    services.lifecycle.shuttingDown = true;
    app.log.info({ signal }, 'shutting down: draining in-flight requests');
    closing = (async () => {
      const timer = setTimeout(() => {
        app.log.error('graceful shutdown timed out; closing remaining connections');
        app.server.closeAllConnections?.();
      }, config.shutdownTimeoutMs);
      timer.unref();
      try {
        await app.close();
      } finally {
        clearTimeout(timer);
        await pool.end().catch(() => {});
        app.log.info('shutdown complete');
      }
    })();
    return closing;
  };

  return { app, services, url: address, shutdown };
}
