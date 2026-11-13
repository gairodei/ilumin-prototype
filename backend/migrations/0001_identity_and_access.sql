-- 0001 Identity and access foundation (Stage 1A)
-- Application users, identity-provider mappings, roles, staff scopes, agencies and agency membership.
-- No demo data. No financial, seat, enrolment or entitlement tables (those belong to Stage 2).
--
-- Privilege model (ADR 0003, 0006): the schema owner (this migration's role) owns every table. The API runs as a login
-- role that is a member of the NOLOGIN group role "ilumin_app", which receives only the grants below. The group role is
-- an operations prerequisite (see backend/README.md, "Database roles"); this migration refuses to run without it.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ilumin_app') THEN
    RAISE EXCEPTION 'Role "ilumin_app" does not exist. Create it first (NOLOGIN) — see backend/README.md, "Database roles".';
  END IF;
END
$$;

REVOKE CREATE ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO ilumin_app;
GRANT SELECT ON schema_migration TO ilumin_app;

-- Application users -----------------------------------------------------------------------------------------------
-- No password column: authentication is delegated to the OIDC provider.
CREATE TABLE app_user (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email              text NOT NULL,
  display_name       text NOT NULL,
  status             text NOT NULL DEFAULT 'active',
  status_changed_at  timestamptz,
  status_changed_by  uuid REFERENCES app_user (id),
  status_reason      text,
  created_by         uuid REFERENCES app_user (id),
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT app_user_email_format CHECK (email = lower(btrim(email)) AND length(email) BETWEEN 3 AND 320 AND email ~ '^[^@\s]+@[^@\s]+$'),
  CONSTRAINT app_user_display_name_len CHECK (length(btrim(display_name)) BETWEEN 1 AND 200),
  CONSTRAINT app_user_status_valid CHECK (status IN ('active', 'suspended', 'deactivated')),
  CONSTRAINT app_user_no_self_status CHECK (status_changed_by IS NULL OR status_changed_by <> id),
  CONSTRAINT app_user_status_reason CHECK (status = 'active' OR (status_reason IS NOT NULL AND length(btrim(status_reason)) > 0))
);
CREATE UNIQUE INDEX app_user_email_uq ON app_user (email);
CREATE INDEX app_user_status_idx ON app_user (status);

-- Identity-provider mappings ---------------------------------------------------------------------------------------
-- (issuer, subject) is the only identity the server trusts. Email is informational at link time.
CREATE TABLE user_identity (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  issuer         text NOT NULL CHECK (length(issuer) BETWEEN 1 AND 500),
  subject        text NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  email_at_link  text,
  link_method    text NOT NULL CHECK (link_method IN ('admin', 'verified_email', 'bootstrap')),
  linked_by      uuid REFERENCES app_user (id),
  linked_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT user_identity_issuer_subject_uq UNIQUE (issuer, subject),
  CONSTRAINT user_identity_user_issuer_uq UNIQUE (user_id, issuer)
);
CREATE INDEX user_identity_user_idx ON user_identity (user_id);

-- Roles ------------------------------------------------------------------------------------------------------------
-- A role is held globally; batch / learner scopes are in staff_scope. Agency users are identified by agency_user
-- membership, not by a row here. Grants are never deleted: revocation sets revoked_at (history is kept).
CREATE TABLE user_role (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  role           text NOT NULL,
  granted_by     uuid REFERENCES app_user (id),
  granted_at     timestamptz NOT NULL DEFAULT now(),
  grant_reason   text,
  revoked_at     timestamptz,
  revoked_by     uuid REFERENCES app_user (id),
  revoke_reason  text,
  CONSTRAINT user_role_valid CHECK (role IN (
    'super_admin', 'system_admin', 'academic_admin', 'finance_admin', 'business_admin',
    'academic_coordinator', 'assessor', 'teacher', 'iqa', 'learner')),
  -- Nobody grants or revokes their own roles (P10 §C row 2), enforced in the database as well as in code.
  CONSTRAINT user_role_no_self_grant CHECK (granted_by IS NULL OR granted_by <> user_id),
  CONSTRAINT user_role_no_self_revoke CHECK (revoked_by IS NULL OR revoked_by <> user_id),
  CONSTRAINT user_role_revocation_complete CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL AND revoke_reason IS NULL)
    OR (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL AND length(btrim(revoke_reason)) > 0))
);
CREATE UNIQUE INDEX user_role_active_uq ON user_role (user_id, role) WHERE revoked_at IS NULL;
CREATE INDEX user_role_role_active_idx ON user_role (role) WHERE revoked_at IS NULL;

-- Staff scopes -----------------------------------------------------------------------------------------------------
-- Batch allocations (Coordinator, Teacher, Assessor, IQA) and learner-level Assessor overrides.
-- scope_id has no foreign key yet: batch and learner tables arrive in Stage 2, which adds the FKs.
CREATE TABLE staff_scope (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  role           text NOT NULL CHECK (role IN ('academic_coordinator', 'assessor', 'teacher', 'iqa')),
  scope_kind     text NOT NULL CHECK (scope_kind IN ('batch', 'learner')),
  scope_id       uuid NOT NULL,
  granted_by     uuid REFERENCES app_user (id),
  granted_at     timestamptz NOT NULL DEFAULT now(),
  grant_reason   text,
  revoked_at     timestamptz,
  revoked_by     uuid REFERENCES app_user (id),
  revoke_reason  text,
  CONSTRAINT staff_scope_learner_is_assessor CHECK (scope_kind = 'batch' OR role = 'assessor'),
  CONSTRAINT staff_scope_no_self_grant CHECK (granted_by IS NULL OR granted_by <> user_id),
  CONSTRAINT staff_scope_revocation_complete CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL AND revoke_reason IS NULL)
    OR (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL AND length(btrim(revoke_reason)) > 0))
);
CREATE UNIQUE INDEX staff_scope_active_uq ON staff_scope (user_id, role, scope_kind, scope_id) WHERE revoked_at IS NULL;
CREATE INDEX staff_scope_target_idx ON staff_scope (scope_kind, scope_id, role) WHERE revoked_at IS NULL;
CREATE INDEX staff_scope_user_idx ON staff_scope (user_id) WHERE revoked_at IS NULL;

-- Agencies and agency users ----------------------------------------------------------------------------------------
-- Minimal tenant record so agency membership can be enforced. Commercial fields arrive with the agency stage.
CREATE TABLE agency (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ref         text NOT NULL CHECK (length(ref) BETWEEN 1 AND 50),
  name        text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 200),
  status      text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_by  uuid REFERENCES app_user (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_ref_uq UNIQUE (ref)
);

CREATE TABLE agency_user (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id      uuid NOT NULL REFERENCES agency (id) ON DELETE RESTRICT,
  user_id        uuid NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  agency_role    text NOT NULL CHECK (agency_role IN ('agency_admin', 'agency_member')),
  granted_by     uuid REFERENCES app_user (id),
  granted_at     timestamptz NOT NULL DEFAULT now(),
  revoked_at     timestamptz,
  revoked_by     uuid REFERENCES app_user (id),
  revoke_reason  text,
  CONSTRAINT agency_user_no_self_grant CHECK (granted_by IS NULL OR granted_by <> user_id),
  CONSTRAINT agency_user_revocation_complete CHECK (
    (revoked_at IS NULL AND revoked_by IS NULL AND revoke_reason IS NULL)
    OR (revoked_at IS NOT NULL AND revoke_reason IS NOT NULL AND length(btrim(revoke_reason)) > 0))
);
-- A user belongs to at most one agency at a time.
CREATE UNIQUE INDEX agency_user_active_uq ON agency_user (user_id) WHERE revoked_at IS NULL;
CREATE INDEX agency_user_agency_idx ON agency_user (agency_id) WHERE revoked_at IS NULL;

-- Grants for the API role: read, insert and update. No DELETE: history is revoked, never removed.
GRANT SELECT, INSERT, UPDATE ON app_user, user_identity, user_role, staff_scope, agency, agency_user TO ilumin_app;
