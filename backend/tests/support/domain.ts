import { randomUUID } from 'node:crypto';
import { withTransaction } from '../../src/database/transaction.js';
import { createBatch, type CreateBatchInput } from '../../src/modules/batches/batches.js';
import { loadPrincipal, type Principal } from '../../src/modules/auth/principal.js';
import {
  createProgrammeDraft,
  type NewPricing,
  publishProgrammeVersion,
  type ProgrammeView,
  type VersionView,
} from '../../src/modules/programmes/programmes.js';
import type { TestContext, TestUser } from './context.js';

/**
 * Stage 2A fixtures, built through the real domain services with the API role (never with owner SQL), so every row a
 * test relies on passed the same checks, triggers and audit as production writes. Nothing here is demo data: each
 * test creates exactly the programmes, batches and learners it states.
 */

let n = 0;
const uniq = () => `${++n}${randomUUID().slice(0, 6).toUpperCase()}`;

export async function principalOf(ctx: TestContext, u: TestUser): Promise<Principal> {
  const row = (await ctx.pool.query(`SELECT id, email, display_name, status FROM app_user WHERE id = $1`, [u.id])).rows[0];
  return loadPrincipal(ctx.pool, row, { issuer: ctx.issuer.issuer, subject: u.subject });
}

export interface DomainFixture {
  admin: TestUser;
  finance: TestUser;
  coordinator: TestUser;
  adminPrincipal: Principal;
}

export async function domainFixture(ctx: TestContext): Promise<DomainFixture> {
  const admin = await ctx.createUser({ roles: ['academic_admin'] });
  const finance = await ctx.createUser({ roles: ['finance_admin'] });
  const coordinator = await ctx.createUser({ roles: ['academic_coordinator'] });
  return { admin, finance, coordinator, adminPrincipal: await principalOf(ctx, admin) };
}

export const feeOptionPricing = (modes: Array<'self_paced' | 'fully_assisted'> = ['self_paced', 'fully_assisted']): NewPricing => ({
  model: 'fee_options',
  options: modes.map((m, i) => ({ label: `${m} option ${i + 1}`, deliveryMode: m, priceMinor: 150_000 + i * 50_000, currency: 'GBP' })),
});

export const singlePricing: NewPricing = { model: 'single_price', priceMinor: 99_900, currency: 'GBP' };

/** A programme with a Finance-approved, published version 1, activated. */
export async function publishedProgramme(
  ctx: TestContext,
  f: DomainFixture,
  opts: { level?: 2 | 3 | 4 | 5; pricing?: NewPricing; activate?: boolean } = {},
): Promise<{ programme: ProgrammeView; version: VersionView }> {
  const level = opts.level ?? 3;
  const pricing = opts.pricing ?? (level === 3 ? feeOptionPricing() : singlePricing);
  const actor = { kind: 'user' as const, principal: f.adminPrincipal };
  return withTransaction(ctx.pool, async (tx) => {
    const { programme } = await createProgrammeDraft(tx, { actor }, { code: `P-${uniq()}`, title: 'Test programme', level, pricing });
    const version = await publishProgrammeVersion(tx, { actor }, {
      programmeId: programme.id,
      versionId: programme.draftVersionId!,
      approval: { approvedByUserId: f.finance.id, reference: `FIN-${uniq()}` },
    });
    if (opts.activate !== false) await tx.query(`UPDATE programme SET status = 'active' WHERE id = $1`, [programme.id]);
    const p = await tx.query(`SELECT status, row_version FROM programme WHERE id = $1`, [programme.id]);
    return { programme: { ...programme, status: p.rows[0].status, rowVersion: p.rows[0].row_version, currentPublishedVersionId: version.id, draftVersionId: null }, version };
  });
}

export async function batchFor(
  ctx: TestContext,
  f: DomainFixture,
  prog: { programme: ProgrammeView; version: VersionView },
  opts: Partial<CreateBatchInput> = {},
) {
  const actor = { kind: 'user' as const, principal: f.adminPrincipal };
  return withTransaction(ctx.pool, (tx) =>
    createBatch(tx, { actor }, {
      code: `B-${uniq()}`,
      programmeId: prog.programme.id,
      programmeVersionId: prog.version.id,
      startDate: '2027-03-01',
      timeZone: 'Europe/London',
      capacity: 10,
      status: 'open',
      coordinatorUserIds: [f.coordinator.id],
      ...(prog.version.pricingModel === 'fee_options'
        ? { acceptedFeeOptionIds: prog.version.feeOptions.map((o) => o.id) }
        : { deliveryMode: 'fully_assisted' as const }),
      ...opts,
    }),
  );
}

export const learner = (ctx: TestContext) => ctx.createUser({ roles: ['learner'] });

/** A stand-in for the future enrolment service's eligibility + authority check: allows, and counts its calls. */
export function allowEligibility() {
  const calls: unknown[] = [];
  const fn = async (_tx: unknown, c: unknown) => {
    calls.push(c);
  };
  return Object.assign(fn, { calls });
}
