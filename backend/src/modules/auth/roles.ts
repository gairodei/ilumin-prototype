/**
 * Application roles (prototype role list, PD-MR-G1 deny-by-default matrix of 11 identities).
 * Roles are stored server-side only (user_role, staff_scope, agency_user). Role or group claims in identity-provider
 * tokens are never read.
 */
export const STAFF_AND_LEARNER_ROLES = [
  'super_admin',
  'system_admin',
  'academic_admin',
  'finance_admin',
  'business_admin',
  'academic_coordinator',
  'assessor',
  'teacher',
  'iqa',
  'learner',
] as const;

/** "agency_user" is derived from an active agency_user membership in an active agency; it is never granted in user_role. */
export const ROLES = [...STAFF_AND_LEARNER_ROLES, 'agency_user'] as const;

export type GrantableRole = (typeof STAFF_AND_LEARNER_ROLES)[number];
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  super_admin: 'Super Administrator',
  system_admin: 'System Administrator',
  academic_admin: 'Academic Administrator',
  finance_admin: 'Finance Administrator',
  business_admin: 'Business Administrator',
  academic_coordinator: 'Academic Coordinator',
  assessor: 'Assessor',
  teacher: 'Teacher',
  iqa: 'IQA',
  learner: 'Learner',
  agency_user: 'Agency user',
};

/** Roles whose authority comes with batch (or learner) allocations in staff_scope. */
export const SCOPED_STAFF_ROLES = ['academic_coordinator', 'assessor', 'teacher', 'iqa'] as const;
export type ScopedStaffRole = (typeof SCOPED_STAFF_ROLES)[number];

export const isGrantableRole = (r: string): r is GrantableRole => (STAFF_AND_LEARNER_ROLES as readonly string[]).includes(r);
