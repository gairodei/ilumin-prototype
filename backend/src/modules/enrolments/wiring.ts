import type { Services } from '../../app/route.js';
import { assertPrerequisitesAllowed, PRODUCTION_PREREQUISITES, type Prerequisites } from './prerequisites.js';

/**
 * The prerequisite adapters the application uses. Production start-up (src/server.ts) never sets them, so the
 * fail-closed production adapters apply; there is no configuration key or environment variable that selects others.
 * Tests may place test-only adapters on their own Services object; they are re-checked at every use.
 */
export function prerequisitesOf(services: Services): Prerequisites {
  const p = services.prerequisites ?? PRODUCTION_PREREQUISITES;
  assertPrerequisitesAllowed(p, services.config.env);
  return p;
}
