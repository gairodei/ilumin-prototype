import type { FastifyInstance } from 'fastify';
import { migrationStatus } from '../database/migrate.js';
import { migrationsDir } from '../shared/paths.js';
import { definePublicRoute, type Services } from './route.js';

/**
 * Liveness: the process can serve HTTP. Readiness: it should receive traffic — not shutting down, PostgreSQL answers,
 * the schema has every migration on disk and none edited, and the identity provider's metadata is loaded.
 * Responses name the checks only; failure details go to the log, not to the unauthenticated caller.
 */

type CheckResult = 'ok' | 'fail' | 'pending';

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<T>((_, rej) => {
    timer = setTimeout(() => rej(new Error(`timed out after ${ms} ms`)), ms);
    timer.unref();
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(timer));
}

export function registerHealthRoutes(app: FastifyInstance, services: Services): void {
  definePublicRoute(app, services, {
    method: 'GET',
    url: '/health/live',
    access: 'public',
    handler: async () => ({ status: 200, body: { status: 'ok' } }),
  });

  definePublicRoute(app, services, {
    method: 'GET',
    url: '/health/ready',
    access: 'public',
    handler: async ({ request }) => {
      if (services.lifecycle.shuttingDown) {
        return { status: 503, body: { status: 'shutting_down', checks: {} } };
      }
      const checks: Record<string, CheckResult> = { database: 'fail', migrations: 'fail', identityProvider: 'fail' };
      try {
        await withTimeout(services.pool.query('SELECT 1'), 2000);
        checks.database = 'ok';
        const s = await withTimeout(migrationStatus(services.pool, migrationsDir()), 2000);
        checks.migrations = s.problems.length ? 'fail' : s.pending.length ? 'pending' : 'ok';
        if (checks.migrations !== 'ok') request.log.warn({ pending: s.pending, problems: s.problems }, 'readiness: migrations');
      } catch (err) {
        request.log.warn({ err: { message: (err as Error).message } }, 'readiness: database check failed');
      }
      checks.identityProvider = (await withTimeout(services.verifier.ready(), 3000).catch(() => false)) ? 'ok' : 'fail';
      const ready = Object.values(checks).every((c) => c === 'ok');
      return { status: ready ? 200 : 503, body: { status: ready ? 'ready' : 'not_ready', checks } };
    },
  });
}
