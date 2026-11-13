import type { Queryable } from '../../database/pool.js';
import type { Principal } from '../auth/principal.js';
import type { Role, ScopedStaffRole } from '../auth/roles.js';

/**
 * Server-side authorization primitives (ADR 0005).
 *
 * A Policy is a named, async predicate over the authenticated principal and the request's resource identifiers. Every
 * protected route must declare one (routes without an access declaration make the application refuse to start, and are
 * denied at runtime as a second layer). Policies deny by default: anything that is not explicitly allowed is refused.
 *
 * Roles alone are not enough: the primitives below also check agency ownership, learner ownership, batch assignments,
 * Coordinator assignments, Assessor allocations and approval authority. Domain-specific rules (seats, finance, etc.)
 * compose these in later stages.
 */

export interface PolicyContext {
  principal: Principal;
  params: Record<string, unknown>;
  query: Record<string, unknown>;
  db: Queryable;
}

export type Decision = { allow: true } | { allow: false; reason: string };

export interface Policy {
  readonly name: string;
  evaluate(ctx: PolicyContext): Promise<Decision>;
}

export const allow: Decision = Object.freeze({ allow: true });
export const deny = (reason: string): Decision => ({ allow: false, reason });

export function policy(name: string, evaluate: (ctx: PolicyContext) => Decision | Promise<Decision>): Policy {
  return { name, evaluate: async (ctx) => evaluate(ctx) };
}

type Getter<T> = (ctx: PolicyContext) => T | undefined | null | Promise<T | undefined | null>;

/** Reads a route parameter as a string (resource identifiers are validated before policies run). */
export const param =
  (name: string): Getter<string> =>
  (ctx) => {
    const v = ctx.params[name];
    return typeof v === 'string' && v.length > 0 ? v : undefined;
  };

// ── Combinators ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Allows when any policy allows. Evaluated in order; the first allow wins. */
export function anyOf(...policies: Policy[]): Policy {
  return policy(`anyOf(${policies.map((p) => p.name).join(', ')})`, async (ctx) => {
    const reasons: string[] = [];
    for (const p of policies) {
      const d = await p.evaluate(ctx);
      if (d.allow) return d;
      reasons.push(d.reason);
    }
    return deny(reasons.join('; ') || 'no policy allowed the request');
  });
}

/** Allows only when every policy allows. */
export function allOf(...policies: Policy[]): Policy {
  return policy(`allOf(${policies.map((p) => p.name).join(', ')})`, async (ctx) => {
    if (policies.length === 0) return deny('empty policy');
    for (const p of policies) {
      const d = await p.evaluate(ctx);
      if (!d.allow) return d;
    }
    return allow;
  });
}

// ── Role primitives ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Any active, authenticated principal. Use only for the caller's own, non-sensitive data (e.g. GET /me). */
export const authenticatedUser = policy('authenticatedUser', ({ principal }) =>
  principal.status === 'active' ? allow : deny('account not active'),
);

export function hasAnyRole(...roles: Role[]): Policy {
  return policy(`hasAnyRole(${roles.join('|')})`, ({ principal }) =>
    roles.some((r) => principal.roles.has(r)) ? allow : deny(`requires one of: ${roles.join(', ')}`),
  );
}

// ── Ownership primitives ────────────────────────────────────────────────────────────────────────────────────────────

/** The resource belongs to the principal's own user account (e.g. a learner's own record). */
export function isSelf(getUserId: Getter<string>): Policy {
  return policy('isSelf', async (ctx) => {
    const id = await getUserId(ctx);
    return id && id === ctx.principal.userId ? allow : deny('not the principal’s own record');
  });
}

/** The resource is NOT the principal's own account (nobody changes their own roles or status). */
export function notSelf(getUserId: Getter<string>): Policy {
  return policy('notSelf', async (ctx) => {
    const id = await getUserId(ctx);
    if (!id) return deny('target not identified');
    return id !== ctx.principal.userId ? allow : deny('cannot act on own account');
  });
}

/**
 * Learner ownership: the principal holds the learner role and the resource's owning learner is the principal.
 * `getLearnerUserId` must resolve the owner from the server's records (never from the request body).
 */
export function ownsLearnerRecord(getLearnerUserId: Getter<string>): Policy {
  return policy('ownsLearnerRecord', async (ctx) => {
    if (!ctx.principal.roles.has('learner')) return deny('not a learner');
    const owner = await getLearnerUserId(ctx);
    return owner && owner === ctx.principal.userId ? allow : deny('learner record belongs to someone else');
  });
}

/**
 * Agency ownership: the principal is an active member of the agency that owns the resource. `getAgencyId` must resolve
 * the owning agency from the server's records. `requireAdmin` limits it to agency administrators.
 */
export function memberOfAgency(getAgencyId: Getter<string>, opts: { requireAdmin?: boolean } = {}): Policy {
  return policy(opts.requireAdmin ? 'agencyAdminOf' : 'memberOfAgency', async (ctx) => {
    const m = ctx.principal.agency;
    if (!m) return deny('not an agency user');
    const owner = await getAgencyId(ctx);
    if (!owner || owner !== m.agencyId) return deny('resource belongs to another agency');
    if (opts.requireAdmin && m.agencyRole !== 'agency_admin') return deny('requires agency administrator');
    return allow;
  });
}

// ── Scope primitives (batch and learner allocations) ────────────────────────────────────────────────────────────────

export function hasBatchScope(p: Principal, batchId: string, roles: readonly ScopedStaffRole[]): boolean {
  return p.scopes.some((s) => s.scopeKind === 'batch' && s.scopeId === batchId && roles.includes(s.role));
}

/** The principal is allocated to the batch in one of the given roles (Coordinator, Teacher, Assessor, IQA). */
export function assignedToBatch(getBatchId: Getter<string>, roles: readonly ScopedStaffRole[]): Policy {
  return policy(`assignedToBatch(${roles.join('|')})`, async (ctx) => {
    const batchId = await getBatchId(ctx);
    if (!batchId) return deny('batch not identified');
    return hasBatchScope(ctx.principal, batchId, roles) ? allow : deny('not allocated to this batch');
  });
}

/** One of the batch's Academic Coordinators (a batch may have several, Batch MC). */
export const coordinatorOfBatch = (getBatchId: Getter<string>) => assignedToBatch(getBatchId, ['academic_coordinator']);

/**
 * Assessor allocation: the principal assesses the learner either through a learner-level allocation (override) or as an
 * Assessor allocated to the learner's batch. `getBatchId` resolves the learner's batch from the server's records.
 */
export function allocatedAssessor(getLearnerUserId: Getter<string>, getBatchId: Getter<string>): Policy {
  return policy('allocatedAssessor', async (ctx) => {
    if (!ctx.principal.roles.has('assessor')) return deny('not an assessor');
    const learner = await getLearnerUserId(ctx);
    if (!learner) return deny('learner not identified');
    const direct = ctx.principal.scopes.some(
      (s) => s.role === 'assessor' && s.scopeKind === 'learner' && s.scopeId === learner,
    );
    if (direct) return allow;
    const batchId = await getBatchId(ctx);
    return batchId && hasBatchScope(ctx.principal, batchId, ['assessor']) ? allow : deny('not the learner’s allocated assessor');
  });
}

/**
 * IQA independence (PD-IQB-02, G6.9 / CH-17): a user may act as IQA on a batch only if they are not its Teacher,
 * Assessor or Academic Coordinator. Reads the database so it also sees allocations of other principals' records.
 */
export async function isIndependentOfBatch(db: Queryable, userId: string, batchId: string): Promise<boolean> {
  const r = await db.query(
    `SELECT 1 FROM staff_scope
      WHERE user_id = $1 AND scope_kind = 'batch' AND scope_id = $2 AND revoked_at IS NULL
        AND role IN ('teacher', 'assessor', 'academic_coordinator')
      LIMIT 1`,
    [userId, batchId],
  );
  return r.rowCount === 0;
}

// ── Approval authority (PD-P0-16) ───────────────────────────────────────────────────────────────────────────────────

export type ApprovalKind =
  | 'learner_batch_transfer'
  | 'agency_learner_substitution'
  | 'unnamed_reservation_reallocation'
  | 'agency_bundle_extension'
  | 'agency_payment_arrangement';

export const APPROVER_ROLE: Record<ApprovalKind, Role> = {
  learner_batch_transfer: 'academic_admin',
  agency_learner_substitution: 'academic_admin',
  unnamed_reservation_reallocation: 'academic_admin',
  agency_bundle_extension: 'business_admin',
  agency_payment_arrangement: 'finance_admin',
};

export type ApprovalAuthority =
  | { allow: true; mode: 'approver' | 'override'; reasonRequired: boolean }
  | { allow: false; reason: string };

/**
 * Who may decide an approval request: the designated approver role, or the Super Administrator as an override with a
 * mandatory audited reason. Nobody decides their own request (S-16). Callers must record the decision with the returned
 * mode and enforce `reasonRequired` in the audit row.
 */
export function approvalAuthority(p: Principal, kind: ApprovalKind, requesterUserId: string | null): ApprovalAuthority {
  if (requesterUserId && requesterUserId === p.userId) return { allow: false, reason: 'cannot decide own request' };
  if (p.roles.has(APPROVER_ROLE[kind])) return { allow: true, mode: 'approver', reasonRequired: false };
  if (p.roles.has('super_admin')) return { allow: true, mode: 'override', reasonRequired: true };
  return { allow: false, reason: `requires ${APPROVER_ROLE[kind]} or a Super Administrator override` };
}

/** Policy form of approvalAuthority. `getRequesterUserId` resolves the requester from the stored request. */
export function canDecideApproval(kind: ApprovalKind, getRequesterUserId: Getter<string>): Policy {
  return policy(`canDecideApproval(${kind})`, async (ctx) => {
    const requester = (await getRequesterUserId(ctx)) ?? null;
    const a = approvalAuthority(ctx.principal, kind, requester);
    return a.allow ? allow : deny(a.reason);
  });
}

// ── Administrative rights already decided in the prototype ──────────────────────────────────────────────────────────

/** Staff accounts and role grants: Super Administrator or System Administrator (PD-MR-G1-01). */
export const staffAccountAdmin = hasAnyRole('super_admin', 'system_admin');
/** Batch staff and IQA allocation: Super Administrator, Academic Admin, System Administrator (PD-IQB-09). */
export const batchStaffAdmin = hasAnyRole('super_admin', 'academic_admin', 'system_admin');
/** Agency administration: Business Admin and Super Administrator (PD-MR-G1-08/09, S5b, G9.1). */
export const agencyAdministration = hasAnyRole('super_admin', 'business_admin');

// ── Programme and batch administration (Stage 2A) ───────────────────────────────────────────────────────────────────

/** Create programmes and their draft versions with initial fee options: Super Admin, System Admin, Academic Admin (PD-R1-10). */
export const programmeAdministration = hasAnyRole('super_admin', 'system_admin', 'academic_admin');
/**
 * Read programmes, versions and fee options. PROVISIONAL PD-2A-01: the programme administrators plus Finance Admin (who
 * manages fee options, PD-R1-05). Learners, agencies and batch staff have no catalogue API yet.
 */
export const programmeReader = hasAnyRole('super_admin', 'system_admin', 'academic_admin', 'finance_admin');
/** Create batches and change their configuration: the batch-edit right s4bCanBatch (PD-W1-04). */
export const batchAdministration = hasAnyRole('super_admin', 'academic_admin', 'system_admin');
/**
 * Read one batch: batch administrators, or staff allocated to that batch (Coordinator, Teacher, Assessor, IQA).
 * PROVISIONAL PD-2A-02. Agency users and learners have no batch-administration read.
 */
export const batchReader = (getBatchId: Getter<string>) =>
  anyOf(batchAdministration, assignedToBatch(getBatchId, ['academic_coordinator', 'teacher', 'assessor', 'iqa']));
/** List batches: administrators see all; allocated staff see only their own batches (filtered in the query). */
export const batchListReader = anyOf(
  batchAdministration,
  hasAnyRole('academic_coordinator', 'teacher', 'assessor', 'iqa'),
);
/** Seat allocations of one batch (learner identities): administrators and the batch's own Coordinators. PD-2A-02. */
export const batchSeatReader = (getBatchId: Getter<string>) => anyOf(batchAdministration, coordinatorOfBatch(getBatchId));

// ── Learner applications and enrolments (Stage 2B) ──────────────────────────────────────────────────────────────────

/** A learner acting on their own learner-portal data (the record is resolved from the principal, never from input). */
export const learnerSelf = policy('learnerSelf', ({ principal }) =>
  principal.status === 'active' && principal.roles.has('learner') ? allow : deny('requires the learner role'),
);
/**
 * Admission decisions and the admissions worklist: the prototype's Admissions & Documents capability `admCanDecide()`
 * — Super Administrator, Academic Admin, System Administrator (PD-CD-13, PD-AC2-02). The prototype's custom
 * "Admissions Officer" role has no production equivalent. Finance Admin, Business Admin, batch staff and agencies are
 * refused (PD-CD-13; PD-MC-11 keeps admissions out of the Coordinator and Teacher/Assessor portals).
 */
export const admissionsStaff = hasAnyRole('super_admin', 'academic_admin', 'system_admin');

/** Resolves an application's learner from the server's records (the request supplies only the application id). */
export const applicationOwner =
  (name: string): Getter<string> =>
  async (ctx) => {
    const id = param(name)(ctx);
    if (!id) return undefined;
    const r = await ctx.db.query<{ learner_user_id: string }>(`SELECT learner_user_id FROM learner_application WHERE id = $1`, [id]);
    return r.rows[0]?.learner_user_id;
  };

/** Read one application: its own learner, or admissions staff. */
export const applicationReader = (name: string) => anyOf(ownsLearnerRecord(applicationOwner(name)), admissionsStaff);
/** Learner-only actions (edit, choose a batch, submit, withdraw): the application's own learner only. */
export const applicationLearner = (name: string) => ownsLearnerRecord(applicationOwner(name));
/** Academic decisions: admissions staff, never on their own application (no self-approval; also enforced in SQL). */
export const applicationDecider = (name: string) => allOf(admissionsStaff, notSelf(applicationOwner(name)));

const enrolmentRow = async (ctx: PolicyContext, name: string) => {
  const id = param(name)(ctx);
  if (!id) return undefined;
  const r = await ctx.db.query<{ learner_user_id: string; batch_id: string }>(
    `SELECT learner_user_id, batch_id FROM enrolment WHERE id = $1`,
    [id],
  );
  return r.rows[0];
};
/**
 * Read one enrolment: its learner, admissions staff (who are also the batch administrators), or a Coordinator of the
 * enrolment's batch (PD-2A-02's seat-list readers).
 */
export const enrolmentReader = (name: string) =>
  anyOf(
    ownsLearnerRecord(async (ctx) => (await enrolmentRow(ctx, name))?.learner_user_id),
    admissionsStaff,
    batchAdministration,
    coordinatorOfBatch(async (ctx) => (await enrolmentRow(ctx, name))?.batch_id),
  );
