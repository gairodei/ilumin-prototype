import pg from 'pg';
import { withTransaction } from '../../src/database/transaction.js';
import {
  createApplication,
  decideApplication,
  selectBatch,
  submitApplication,
  updateApplicationDetails,
  type ApplicationView,
} from '../../src/modules/applications/applications.js';
import type { Principal } from '../../src/modules/auth/principal.js';
import {
  type CommencementPolicy,
  type CommencementState,
  calendarCommencementPolicy,
  type Prerequisites,
  PRODUCTION_PREREQUISITES,
} from '../../src/modules/enrolments/prerequisites.js';
import { ensureLearnerProfile } from '../../src/modules/learners/learners.js';
import type { TestContext, TestUser } from './context.js';
import { principalOf } from './domain.js';

/**
 * TEST-ONLY prerequisite adapters and Stage 2B fixtures. This file lives under tests/, which the production build does
 * not compile and src/ may not import (scripts/static-checks.mjs). Every adapter here is trust 'test-only': the
 * application refuses it outside the test environment, and the database refuses the evidence it produces unless the
 * test database was marked with allowTestEvidence(). Nothing here is a real signature or a real payment.
 */

export type AgreementMode = 'signed' | 'none' | { signedForTermsVersionId: string };
export type FinanceMode = 'verified' | 'pending' | 'none' | 'arrangement';

export interface TestPrerequisiteOptions {
  agreement?: AgreementMode;
  finance?: FinanceMode;
  documents?: 'approved' | 'none';
  /** A fixed commencement state for every batch, or the production calendar policy (default). */
  commencement?: CommencementState | 'production';
}

export function fixedCommencement(state: CommencementState): CommencementPolicy {
  return {
    trust: 'test-only',
    name: `test: fixed commencement ${state}`,
    evaluate: async (_db, b) => ({ state, localDate: 'test', startDate: b.startDate, timeZone: b.timeZone, basis: `test fixture: ${state}` }),
  };
}

/** Call counters let tests prove which prerequisite ran (and that nothing ran after a refusal). */
export interface TestPrerequisites extends Prerequisites {
  calls: { agreement: number; finance: number; documents: number };
}

export function testPrerequisites(o: TestPrerequisiteOptions = {}): TestPrerequisites {
  const calls = { agreement: 0, finance: 0, documents: 0 };
  const agreement = o.agreement ?? 'signed';
  const finance = o.finance ?? 'verified';
  return {
    calls,
    agreement: {
      trust: 'test-only',
      name: `test: agreement ${typeof agreement === 'string' ? agreement : 'other terms'}`,
      verify: async (_tx, c) => {
        calls.agreement++;
        if (agreement === 'none') return { status: 'none', reason: 'TEST: no signed agreement on record.' };
        const terms = typeof agreement === 'string' ? c.termsVersionId : agreement.signedForTermsVersionId;
        return { status: 'signed', ref: `TEST-AGREEMENT-${c.applicationId}`, termsVersionId: terms, signedAt: new Date().toISOString() };
      },
    },
    finance: {
      trust: 'test-only',
      name: `test: finance ${finance}`,
      authorize: async (_tx, c) => {
        calls.finance++;
        if (finance === 'none') return { status: 'none', reason: 'TEST: no payment or arrangement on record.' };
        if (finance === 'pending') return { status: 'pending', kind: 'verified_payment', ref: `TEST-PAYMENT-${c.applicationId}` };
        return {
          status: 'verified',
          kind: finance === 'arrangement' ? 'approved_arrangement' : 'verified_payment',
          ref: `TEST-${finance === 'arrangement' ? 'ARRANGEMENT' : 'PAYMENT'}-${c.applicationId}`,
          verifiedAt: new Date().toISOString(),
        };
      },
    },
    documents: {
      trust: 'test-only',
      name: `test: documents ${o.documents ?? 'approved'}`,
      verify: async (_db, c) => {
        calls.documents++;
        return o.documents === 'none'
          ? { status: 'none', reason: 'TEST: mandatory documents not approved.' }
          : { status: 'approved', ref: `TEST-DOCS-${c.applicationId}` };
      },
    },
    commencement: !o.commencement || o.commencement === 'production' ? calendarCommencementPolicy : fixedCommencement(o.commencement),
  };
}

/**
 * Marks THIS test database as a test database for enrolment evidence. Must run before the API pool opens its first
 * connection (a database-level setting applies to new connections). Production databases never have it.
 */
export async function allowTestEvidence(ctx: TestContext): Promise<void> {
  // A custom database-level setting needs the cluster superuser (the disposable test cluster's admin role).
  const admin = new pg.Client({ connectionString: ctx.db.adminUrl });
  await admin.connect();
  try {
    await admin.query(`ALTER DATABASE ${ctx.db.name} SET ilumin.test_evidence = 'allowed'`);
  } finally {
    await admin.end();
  }
}

export { PRODUCTION_PREREQUISITES };

// ── Fixtures through the real services ──────────────────────────────────────────────────────────────────────────────

export interface LearnerFixture {
  user: TestUser;
  principal: Principal;
}

export async function learnerWithProfile(ctx: TestContext, countryCode = 'GB'): Promise<LearnerFixture> {
  const user = await ctx.createUser({ roles: ['learner'] });
  const principal = await principalOf(ctx, user);
  await withTransaction(ctx.pool, (tx) => ensureLearnerProfile(tx, { actor: { kind: 'user', principal } }, { countryCode }));
  return { user, principal };
}

const as = (p: Principal) => ({ actor: { kind: 'user' as const, principal: p } });

/** draft → details → explicit batch → submitted → approved (documents through the test adapter). */
export async function approvedApplication(
  ctx: TestContext,
  l: LearnerFixture,
  o: { programmeId: string; feeOptionId?: string; batchId: string; decider: Principal; prerequisites?: Prerequisites },
): Promise<ApplicationView> {
  const pre = o.prerequisites ?? testPrerequisites();
  let a = await withTransaction(ctx.pool, (tx) =>
    createApplication(tx, as(l.principal), { programmeId: o.programmeId, ...(o.feeOptionId ? { feeOptionId: o.feeOptionId } : {}) }),
  );
  a = await withTransaction(ctx.pool, (tx) =>
    updateApplicationDetails(tx, as(l.principal), a.id, { expectedRowVersion: a.rowVersion, dateOfBirth: '1990-05-17', address: '1 Test Street', postcode: 'TE1 1ST' }),
  );
  a = (await withTransaction(ctx.pool, (tx) => selectBatch(tx, as(l.principal), a.id, { expectedRowVersion: a.rowVersion, batchId: o.batchId }, pre.commencement))).application;
  a = (await withTransaction(ctx.pool, (tx) => submitApplication(tx, as(l.principal), a.id, { expectedRowVersion: a.rowVersion }, pre.commencement))).application;
  return withTransaction(ctx.pool, (tx) =>
    decideApplication(tx, as(o.decider), a.id, { decision: 'approve', expectedRowVersion: a.rowVersion }, pre.documents),
  );
}
