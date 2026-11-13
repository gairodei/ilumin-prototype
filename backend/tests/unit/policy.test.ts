import { describe, expect, it } from 'vitest';
import type { Principal } from '../../src/modules/auth/principal.js';
import type { Role } from '../../src/modules/auth/roles.js';
import {
  allOf,
  allocatedAssessor,
  anyOf,
  approvalAuthority,
  assignedToBatch,
  coordinatorOfBatch,
  hasAnyRole,
  isSelf,
  memberOfAgency,
  notSelf,
  ownsLearnerRecord,
  param,
  type Policy,
} from '../../src/modules/authz/policy.js';

const BATCH_A = '00000000-0000-4000-8000-00000000000a';
const BATCH_B = '00000000-0000-4000-8000-00000000000b';
const AGENCY_A = '00000000-0000-4000-8000-0000000000a1';
const AGENCY_B = '00000000-0000-4000-8000-0000000000b1';

function principal(p: Partial<Omit<Principal, 'roles'>> & { roles?: Role[] } = {}): Principal {
  return {
    userId: p.userId ?? 'u-1',
    email: 'x@example.test',
    displayName: 'X',
    status: p.status ?? 'active',
    roles: new Set(p.roles ?? []),
    scopes: p.scopes ?? [],
    agency: p.agency ?? null,
    identity: { issuer: 'i', subject: 's' },
  };
}

const run = (pol: Policy, pr: Principal, params: Record<string, unknown> = {}) =>
  pol.evaluate({ principal: pr, params, query: {}, db: undefined as never }).then((d) => d.allow);

describe('authorization primitives (deny by default)', () => {
  it('role checks', async () => {
    const pol = hasAnyRole('finance_admin', 'super_admin');
    expect(await run(pol, principal({ roles: ['finance_admin'] }))).toBe(true);
    expect(await run(pol, principal({ roles: ['academic_admin', 'teacher'] }))).toBe(false);
    expect(await run(pol, principal())).toBe(false);
  });

  it('combinators: anyOf needs one, allOf needs all, empty allOf denies', async () => {
    const admin = principal({ roles: ['system_admin'] });
    expect(await run(anyOf(hasAnyRole('learner'), hasAnyRole('system_admin')), admin)).toBe(true);
    expect(await run(allOf(hasAnyRole('learner'), hasAnyRole('system_admin')), admin)).toBe(false);
    expect(await run(allOf(), admin)).toBe(false);
    expect(await run(anyOf(), admin)).toBe(false);
  });

  it('self and not-self', async () => {
    const me = principal({ userId: 'u-me' });
    expect(await run(isSelf(param('id')), me, { id: 'u-me' })).toBe(true);
    expect(await run(isSelf(param('id')), me, { id: 'u-other' })).toBe(false);
    expect(await run(isSelf(param('id')), me, {})).toBe(false);
    expect(await run(notSelf(param('id')), me, { id: 'u-me' })).toBe(false);
    expect(await run(notSelf(param('id')), me, { id: 'u-other' })).toBe(true);
    expect(await run(notSelf(param('id')), me, {})).toBe(false);
  });

  it('learner ownership requires the learner role and the server-resolved owner', async () => {
    const learner = principal({ userId: 'L1', roles: ['learner'] });
    const owner = (id: string) => () => id;
    expect(await run(ownsLearnerRecord(owner('L1')), learner)).toBe(true);
    expect(await run(ownsLearnerRecord(owner('L2')), learner)).toBe(false);
    expect(await run(ownsLearnerRecord(owner('L1')), principal({ userId: 'L1', roles: ['teacher'] }))).toBe(false);
  });

  it('agency ownership: own agency only; admin-only variant', async () => {
    const member = principal({ roles: ['agency_user'], agency: { agencyId: AGENCY_A, agencyRole: 'agency_member' } });
    const admin = principal({ roles: ['agency_user'], agency: { agencyId: AGENCY_A, agencyRole: 'agency_admin' } });
    expect(await run(memberOfAgency(param('a')), member, { a: AGENCY_A })).toBe(true);
    expect(await run(memberOfAgency(param('a')), member, { a: AGENCY_B })).toBe(false);
    expect(await run(memberOfAgency(param('a')), principal({ roles: ['super_admin'] }), { a: AGENCY_A })).toBe(false);
    expect(await run(memberOfAgency(param('a'), { requireAdmin: true }), member, { a: AGENCY_A })).toBe(false);
    expect(await run(memberOfAgency(param('a'), { requireAdmin: true }), admin, { a: AGENCY_A })).toBe(true);
  });

  it('batch assignment and Coordinator assignment', async () => {
    const coord = principal({ roles: ['academic_coordinator'], scopes: [{ role: 'academic_coordinator', scopeKind: 'batch', scopeId: BATCH_A }] });
    const teacher = principal({ roles: ['teacher'], scopes: [{ role: 'teacher', scopeKind: 'batch', scopeId: BATCH_A }] });
    expect(await run(coordinatorOfBatch(param('b')), coord, { b: BATCH_A })).toBe(true);
    expect(await run(coordinatorOfBatch(param('b')), coord, { b: BATCH_B })).toBe(false);
    expect(await run(coordinatorOfBatch(param('b')), teacher, { b: BATCH_A })).toBe(false);
    expect(await run(assignedToBatch(param('b'), ['teacher', 'academic_coordinator']), teacher, { b: BATCH_A })).toBe(true);
  });

  it('Assessor allocation: learner override or batch allocation, Assessor role required', async () => {
    const byBatch = principal({ roles: ['assessor'], scopes: [{ role: 'assessor', scopeKind: 'batch', scopeId: BATCH_A }] });
    const byOverride = principal({ roles: ['assessor'], scopes: [{ role: 'assessor', scopeKind: 'learner', scopeId: 'L9' }] });
    const pol = allocatedAssessor(param('learner'), param('batch'));
    expect(await run(pol, byBatch, { learner: 'L1', batch: BATCH_A })).toBe(true);
    expect(await run(pol, byBatch, { learner: 'L1', batch: BATCH_B })).toBe(false);
    expect(await run(pol, byOverride, { learner: 'L9', batch: BATCH_B })).toBe(true);
    expect(await run(pol, byOverride, { learner: 'L1', batch: BATCH_B })).toBe(false);
    // A Teacher with a batch scope is not an Assessor (PD-MRG2-02)
    const teacher = principal({ roles: ['teacher'], scopes: [{ role: 'teacher', scopeKind: 'batch', scopeId: BATCH_A }] });
    expect(await run(pol, teacher, { learner: 'L1', batch: BATCH_A })).toBe(false);
  });

  describe('approval authority (PD-P0-16)', () => {
    const cases: Array<[Parameters<typeof approvalAuthority>[1], Role]> = [
      ['learner_batch_transfer', 'academic_admin'],
      ['agency_learner_substitution', 'academic_admin'],
      ['unnamed_reservation_reallocation', 'academic_admin'],
      ['agency_bundle_extension', 'business_admin'],
      ['agency_payment_arrangement', 'finance_admin'],
    ];
    it.each(cases)('%s is decided by %s; others refused', (kind, approver) => {
      expect(approvalAuthority(principal({ userId: 'a', roles: [approver] }), kind, 'req')).toEqual({
        allow: true,
        mode: 'approver',
        reasonRequired: false,
      });
      for (const other of ['finance_admin', 'business_admin', 'academic_admin', 'system_admin', 'academic_coordinator'] as Role[]) {
        if (other === approver) continue;
        expect(approvalAuthority(principal({ userId: 'a', roles: [other] }), kind, 'req').allow).toBe(false);
      }
    });
    it('Super Administrator may override, with a mandatory reason', () => {
      expect(approvalAuthority(principal({ userId: 'a', roles: ['super_admin'] }), 'agency_payment_arrangement', 'req')).toEqual({
        allow: true,
        mode: 'override',
        reasonRequired: true,
      });
    });
    it('nobody decides their own request, not even a Super Administrator', () => {
      expect(approvalAuthority(principal({ userId: 'me', roles: ['finance_admin', 'super_admin'] }), 'agency_payment_arrangement', 'me').allow).toBe(false);
    });
  });
});
