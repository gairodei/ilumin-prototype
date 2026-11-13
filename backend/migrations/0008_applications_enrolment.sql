-- 0008 Learner profiles, applications, explicit batch selection and the enrolment record (Stage 2B; ADR 0013)
--
-- Learner (one profile per user) → application (one open per learner; state machine) → explicit batch choice (P3)
-- → academic decision → enrolment (created ONLY by the confirmation boundary, which also takes the seat).
--
-- What the database enforces here, not only the services:
--   * one profile per user (primary key); one open application per learner (PD-NB1-02); one confirmed enrolment per
--     learner (PD-E-15) and per application (no duplicate confirmation);
--   * composite foreign keys tie every application and enrolment to ONE programme: its version, fee option and batch;
--   * the application state machine, including "never draft → enrolled": an application becomes 'enrolled' only from
--     'approved' and only when its enrolment row already exists;
--   * submitted details, fee option and delivery mode are frozen once submitted; the delivery mode is derived by the
--     database from the fee option (fee-option programmes) or from the batch (single-price programmes), never supplied;
--   * no self-decision: a staff decision on an application is never made by its own learner (IL008);
--   * the decision history is append-only;
--   * an enrolment matches its application exactly and points at an active, occupied seat of the same learner, batch and
--     fee option, allocated with the authority 'enrolment_confirmation' and the enrolment's own id; that seat cannot be
--     released while the enrolment is confirmed;
--   * evidence from test-only prerequisite adapters is refused unless the database is explicitly a test database (IL009).
--
-- New SQLSTATEs (src/shared/db-errors.ts): IL008 → FORBIDDEN (403). IL009 is deliberately unmapped (500): it can only
-- mean test code reached a non-test database.
--
-- Reference data: the two terms versions defined by PD-P2-03 (LEGACY-1 in force, REVISED-1 a frozen draft). No learner,
-- application, enrolment or other demo data.

-- ── Batch location (P3 region rule) ────────────────────────────────────────────────────────────────────────────────

-- PD-P3-01: a learner may choose a batch that is online or runs in the learner's country. The prototype inferred the
-- country from the batch label; production stores it. NULL = not configured yet: such a batch is not offered to learners.
ALTER TABLE batch ADD COLUMN location text
  CONSTRAINT batch_location_valid CHECK (location = 'online' OR location ~ '^[A-Z]{2}$');

-- ── Terms versions (PD-P2-03 / PD-P2-04) ───────────────────────────────────────────────────────────────────────────

CREATE TABLE terms_version (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL CONSTRAINT terms_version_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9-]{1,39}$'),
  status      text NOT NULL CONSTRAINT terms_version_status_valid CHECK (status IN ('in_force', 'draft')),
  summary     text NOT NULL CONSTRAINT terms_version_summary_len CHECK (length(btrim(summary)) BETWEEN 1 AND 1000),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT terms_version_code_uq UNIQUE (code)
);
CREATE UNIQUE INDEX terms_version_one_in_force_uq ON terms_version ((true)) WHERE status = 'in_force';

INSERT INTO terms_version (code, status, summary) VALUES
  ('LEGACY-1', 'in_force',
   'The rules in force before P0 (PD-P2-03). Every application links the version in force when it starts (PD-P2-04).'),
  ('REVISED-1', 'draft',
   'The P0 revised terms (deposit cutoff, routes A and B, forfeiture, access gate). Frozen draft: activation needs the '
   'client''s approval of the wording (U-01) and an activation rule (U-11). Not activatable.');

-- Activation is not available (REVISED-1 stays inactive): terms versions never change here.
CREATE FUNCTION terms_version_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'terms versions are not changed or activated here (U-01, U-11)' USING ERRCODE = 'IL005';
END
$$;
CREATE TRIGGER terms_version_guard BEFORE UPDATE OR DELETE ON terms_version
  FOR EACH ROW EXECUTE FUNCTION terms_version_guard();

-- ── Learner profile ────────────────────────────────────────────────────────────────────────────────────────────────

-- One canonical learner identity per user: the profile IS keyed by the user. Name and email stay on app_user (no second
-- identity model). Country of residence is set once ("set at registration" in the prototype) and drives the P3 region
-- rule; corrections need an administrative path that does not exist yet.
CREATE TABLE learner_profile (
  user_id       uuid PRIMARY KEY REFERENCES app_user (id) ON DELETE RESTRICT,
  country_code  text NOT NULL CONSTRAINT learner_profile_country_format CHECK (country_code ~ '^[A-Z]{2}$'),
  created_by    uuid NOT NULL REFERENCES app_user (id),
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE FUNCTION learner_profile_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'a learner profile is not changed here' USING ERRCODE = 'IL005';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM user_role WHERE user_id = NEW.user_id AND role = 'learner' AND revoked_at IS NULL) THEN
    RAISE EXCEPTION 'a learner profile needs an account holding the learner role' USING ERRCODE = 'IL008';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER learner_profile_guard BEFORE INSERT OR UPDATE ON learner_profile
  FOR EACH ROW EXECUTE FUNCTION learner_profile_guard();

-- ── Applications ───────────────────────────────────────────────────────────────────────────────────────────────────

-- States follow the prototype's admission lifecycle (PD-AC2-02), with the production confirmation step added:
--   draft                  "Sign-up in progress"            — the learner edits; not decidable
--   submitted              "Awaiting review"
--   under_review           "Under Review"                   — pending academic review
--   information_requested  "Pending — Documents Required"   — returned to the learner, who edits and resubmits
--   approved               "Approved"                       — for enrolment, subject to the remaining prerequisites
--   rejected               "Rejected"                       — final
--   withdrawn              "Withdrawn"                      — final
--   enrolled               confirmed enrolment              — final; only through the confirmation boundary
CREATE TABLE learner_application (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_user_id       uuid NOT NULL REFERENCES learner_profile (user_id) ON DELETE RESTRICT,
  programme_id          uuid NOT NULL REFERENCES programme (id) ON DELETE RESTRICT,
  -- Frozen at creation: the programme's published version at that moment (PD-P3-01 "fixed programme version").
  programme_version_id  uuid NOT NULL,
  -- Frozen at creation: the terms version in force when the application started (PD-P2-04).
  terms_version_id      uuid NOT NULL REFERENCES terms_version (id),
  fee_option_id         uuid,
  -- Derived by learner_application_guard; never written by the client.
  delivery_mode         text CONSTRAINT la_mode_valid CHECK (delivery_mode IN ('self_paced', 'fully_assisted')),
  batch_id              uuid,
  batch_selected_at     timestamptz,
  -- Submitted details (prototype sign-up step 1: date of birth, address, postcode). Personal data: returned only to the
  -- learner and admissions staff, never written to the audit log or the application log.
  date_of_birth         date CONSTRAINT la_dob_range CHECK (date_of_birth >= DATE '1900-01-01'),
  address               text CONSTRAINT la_address_len CHECK (length(btrim(address)) BETWEEN 1 AND 500),
  postcode              text CONSTRAINT la_postcode_len CHECK (length(btrim(postcode)) BETWEEN 1 AND 20),
  status                text NOT NULL DEFAULT 'draft' CONSTRAINT la_status_valid CHECK (status IN (
                          'draft', 'submitted', 'under_review', 'information_requested', 'approved', 'rejected',
                          'withdrawn', 'enrolled')),
  submitted_at          timestamptz,
  decided_at            timestamptz,
  decided_by            uuid REFERENCES app_user (id),
  enrolled_at           timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  row_version           integer NOT NULL DEFAULT 1,
  CONSTRAINT la_id_learner_uq UNIQUE (id, learner_user_id),
  CONSTRAINT la_version_fk FOREIGN KEY (programme_version_id, programme_id) REFERENCES programme_version (id, programme_id),
  CONSTRAINT la_fee_option_fk FOREIGN KEY (fee_option_id, programme_id) REFERENCES fee_option (id, programme_id),
  CONSTRAINT la_batch_fk FOREIGN KEY (batch_id, programme_id) REFERENCES batch (id, programme_id),
  CONSTRAINT la_no_self_decision CHECK (decided_by IS NULL OR decided_by <> learner_user_id),
  CONSTRAINT la_batch_selection_shape CHECK ((batch_id IS NULL) = (batch_selected_at IS NULL)),
  -- Everything submitted is complete: details, an explicitly chosen batch and the derived delivery mode.
  CONSTRAINT la_complete_once_submitted CHECK (status IN ('draft', 'withdrawn') OR (
    submitted_at IS NOT NULL AND batch_id IS NOT NULL AND date_of_birth IS NOT NULL AND address IS NOT NULL
    AND delivery_mode IS NOT NULL)),
  CONSTRAINT la_decision_recorded CHECK (status NOT IN ('approved', 'rejected', 'enrolled')
    OR (decided_at IS NOT NULL AND decided_by IS NOT NULL)),
  CONSTRAINT la_enrolled_shape CHECK ((status = 'enrolled') = (enrolled_at IS NOT NULL))
);
-- PD-NB1-02: one live application at a time.
CREATE UNIQUE INDEX la_one_open_per_learner_uq ON learner_application (learner_user_id)
  WHERE status IN ('draft', 'submitted', 'under_review', 'information_requested', 'approved');
CREATE INDEX la_learner_idx ON learner_application (learner_user_id, created_at DESC);
CREATE INDEX la_worklist_idx ON learner_application (status, submitted_at, id)
  WHERE status IN ('submitted', 'under_review', 'information_requested', 'approved');
CREATE INDEX la_batch_idx ON learner_application (batch_id) WHERE batch_id IS NOT NULL;
CREATE INDEX la_programme_idx ON learner_application (programme_id, status);

CREATE FUNCTION learner_application_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  prog record;
  ver record;
  opt record;
  b record;
BEGIN
  SELECT status, pricing_model INTO ver FROM programme_version WHERE id = NEW.programme_version_id;

  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'an application starts as a draft' USING ERRCODE = 'IL002';
    END IF;
    IF NEW.submitted_at IS NOT NULL OR NEW.decided_at IS NOT NULL OR NEW.decided_by IS NOT NULL OR NEW.enrolled_at IS NOT NULL THEN
      RAISE EXCEPTION 'a new application has no submission or decision' USING ERRCODE = 'IL002';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM user_role WHERE user_id = NEW.learner_user_id AND role = 'learner' AND revoked_at IS NULL) THEN
      RAISE EXCEPTION 'an application belongs to an account holding the learner role' USING ERRCODE = 'IL008';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM terms_version WHERE id = NEW.terms_version_id AND status = 'in_force') THEN
      RAISE EXCEPTION 'an application links the terms version in force (PD-P2-04)' USING ERRCODE = 'IL006';
    END IF;
    SELECT status INTO prog FROM programme WHERE id = NEW.programme_id;
    IF prog.status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'applications are made only to an active programme' USING ERRCODE = 'IL006';
    END IF;
    IF ver.status IS DISTINCT FROM 'published' THEN
      RAISE EXCEPTION 'an application uses the programme''s published version' USING ERRCODE = 'IL004';
    END IF;
  ELSE
    IF NEW.learner_user_id IS DISTINCT FROM OLD.learner_user_id OR NEW.programme_id IS DISTINCT FROM OLD.programme_id
       OR NEW.programme_version_id IS DISTINCT FROM OLD.programme_version_id
       OR NEW.terms_version_id IS DISTINCT FROM OLD.terms_version_id OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'application learner, programme, version and terms are immutable' USING ERRCODE = 'IL005';
    END IF;
    IF OLD.status IN ('rejected', 'withdrawn', 'enrolled') THEN
      RAISE EXCEPTION 'application % is % and final', OLD.id, OLD.status USING ERRCODE = 'IL002';
    END IF;
    IF NEW.status IS DISTINCT FROM OLD.status AND NOT ((OLD.status, NEW.status) IN (
         ('draft', 'submitted'), ('draft', 'withdrawn'),
         ('submitted', 'under_review'), ('submitted', 'information_requested'), ('submitted', 'approved'),
         ('submitted', 'rejected'), ('submitted', 'withdrawn'),
         ('under_review', 'information_requested'), ('under_review', 'approved'), ('under_review', 'rejected'),
         ('under_review', 'withdrawn'),
         ('information_requested', 'submitted'), ('information_requested', 'approved'),
         ('information_requested', 'rejected'), ('information_requested', 'withdrawn'),
         ('approved', 'enrolled'))) THEN
      RAISE EXCEPTION 'application status % → % is not allowed', OLD.status, NEW.status USING ERRCODE = 'IL002';
    END IF;
    -- Submitted details and the fee option are the learner's, editable only before submission or when returned.
    IF (NEW.fee_option_id IS DISTINCT FROM OLD.fee_option_id OR NEW.date_of_birth IS DISTINCT FROM OLD.date_of_birth
        OR NEW.address IS DISTINCT FROM OLD.address OR NEW.postcode IS DISTINCT FROM OLD.postcode)
       AND OLD.status NOT IN ('draft', 'information_requested') THEN
      RAISE EXCEPTION 'submitted details change only in a draft or a returned application' USING ERRCODE = 'IL005';
    END IF;
    IF NEW.batch_id IS DISTINCT FROM OLD.batch_id AND NEW.status = 'enrolled' THEN
      RAISE EXCEPTION 'the batch does not change at confirmation' USING ERRCODE = 'IL005';
    END IF;
    IF NEW.status = 'enrolled' AND NOT EXISTS (
         SELECT 1 FROM enrolment e WHERE e.application_id = NEW.id AND e.batch_id = NEW.batch_id AND e.state = 'confirmed') THEN
      -- Never draft → enrolled, and never enrolled without the enrolment and its seat (written first, same transaction).
      RAISE EXCEPTION 'an application is enrolled only through its confirmed enrolment' USING ERRCODE = 'IL002';
    END IF;
    NEW.updated_at := now();
    NEW.row_version := OLD.row_version + 1;
  END IF;

  -- Fee option: fee-option programmes only, an option of this version, active when (re)chosen.
  IF ver.pricing_model = 'single_price' AND NEW.fee_option_id IS NOT NULL THEN
    RAISE EXCEPTION 'a single-price programme has no fee option' USING ERRCODE = 'IL007';
  END IF;
  IF NEW.fee_option_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.fee_option_id IS DISTINCT FROM OLD.fee_option_id) THEN
    SELECT o.status INTO opt FROM programme_version_fee_option f JOIN fee_option o ON o.id = f.fee_option_id
     WHERE f.programme_version_id = NEW.programme_version_id AND f.fee_option_id = NEW.fee_option_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'the fee option is not part of the application''s programme version' USING ERRCODE = 'IL004';
    END IF;
    IF opt.status <> 'active' THEN
      RAISE EXCEPTION 'a retired fee option is not chosen' USING ERRCODE = 'IL006';
    END IF;
  END IF;
  -- Batch: of the same programme (composite FK) and the same programme version.
  IF NEW.batch_id IS NOT NULL AND (TG_OP = 'INSERT' OR NEW.batch_id IS DISTINCT FROM OLD.batch_id) THEN
    SELECT programme_version_id, delivery_mode INTO b FROM batch WHERE id = NEW.batch_id;
    IF b.programme_version_id IS DISTINCT FROM NEW.programme_version_id THEN
      RAISE EXCEPTION 'the batch runs another programme version' USING ERRCODE = 'IL004';
    END IF;
  END IF;
  -- Delivery mode: derived, never supplied (PD-P0-01: the fee option decides; single price: the batch's mode).
  IF ver.pricing_model = 'fee_options' THEN
    NEW.delivery_mode := (SELECT delivery_mode FROM fee_option WHERE id = NEW.fee_option_id);
  ELSE
    NEW.delivery_mode := (SELECT delivery_mode FROM batch WHERE id = NEW.batch_id);
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.status NOT IN ('draft', 'information_requested')
     AND NEW.delivery_mode IS DISTINCT FROM OLD.delivery_mode THEN
    RAISE EXCEPTION 'the delivery mode is frozen once the application is submitted' USING ERRCODE = 'IL005';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER learner_application_guard BEFORE INSERT OR UPDATE ON learner_application
  FOR EACH ROW EXECUTE FUNCTION learner_application_guard();

-- ── Application history (append-only) ──────────────────────────────────────────────────────────────────────────────

CREATE TABLE application_event (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq              bigint GENERATED ALWAYS AS IDENTITY,
  application_id   uuid NOT NULL,
  learner_user_id  uuid NOT NULL,
  action           text NOT NULL CONSTRAINT ae_action_valid CHECK (action IN (
                     'created', 'details_updated', 'batch_selected', 'batch_cleared', 'submitted', 'withdrawn_by_learner',
                     'review_started', 'information_requested', 'approved', 'rejected', 'withdrawn_by_staff',
                     'enrolled')),
  from_status      text,
  to_status        text NOT NULL,
  actor_user_id    uuid REFERENCES app_user (id),
  reason           text CONSTRAINT ae_reason_len CHECK (length(reason) <= 2000),
  -- Non-personal facts only (batch id and code, fee option id, changed field NAMES, prerequisite references).
  data             jsonb NOT NULL DEFAULT '{}',
  audit_event_id   uuid NOT NULL REFERENCES audit_event (id),
  occurred_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ae_application_fk FOREIGN KEY (application_id, learner_user_id)
    REFERENCES learner_application (id, learner_user_id),
  -- The learner's own actions are the learner's (no one acts as the learner).
  CONSTRAINT ae_learner_actions CHECK (action NOT IN (
    'created', 'details_updated', 'batch_selected', 'batch_cleared', 'submitted', 'withdrawn_by_learner')
    OR actor_user_id = learner_user_id),
  -- Academic decisions are staff decisions and never the learner's own (no self-approval).
  CONSTRAINT ae_staff_decisions CHECK (action NOT IN (
    'review_started', 'information_requested', 'approved', 'rejected', 'withdrawn_by_staff')
    OR (actor_user_id IS NOT NULL AND actor_user_id <> learner_user_id)),
  CONSTRAINT ae_reason_required CHECK (action NOT IN ('information_requested', 'rejected', 'withdrawn_by_staff')
    OR (reason IS NOT NULL AND length(btrim(reason)) >= 3))
);
CREATE INDEX ae_application_idx ON application_event (application_id, seq);

CREATE FUNCTION application_event_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'application history is append-only' USING ERRCODE = 'IL005';
END
$$;
CREATE TRIGGER application_event_guard BEFORE UPDATE OR DELETE ON application_event
  FOR EACH ROW EXECUTE FUNCTION application_event_guard();

-- ── Enrolment ──────────────────────────────────────────────────────────────────────────────────────────────────────

-- Created only by the confirmation boundary (src/modules/enrolments/confirmation.ts), in the same transaction as its
-- seat, its audit event, its outbox message and the application's move to 'enrolled'. Stage 2B defines one state;
-- later stages (withdrawal, transfer, completion) add states in their own migrations.
CREATE TABLE enrolment (
  id                          uuid PRIMARY KEY,
  application_id              uuid NOT NULL,
  learner_user_id             uuid NOT NULL,
  programme_id                uuid NOT NULL,
  programme_version_id        uuid NOT NULL,
  terms_version_id            uuid NOT NULL REFERENCES terms_version (id),
  batch_id                    uuid NOT NULL,
  fee_option_id               uuid,
  delivery_mode               text NOT NULL CONSTRAINT enrolment_mode_valid CHECK (delivery_mode IN ('self_paced', 'fully_assisted')),
  state                       text NOT NULL CONSTRAINT enrolment_state_valid CHECK (state IN ('confirmed')),
  seat_allocation_id          uuid NOT NULL REFERENCES seat_allocation (id),
  -- Prerequisite evidence references (Stage 2C supplies the real records; nothing here is a signature or a payment).
  agreement_ref               text NOT NULL CONSTRAINT enrolment_agreement_ref_len CHECK (length(btrim(agreement_ref)) BETWEEN 1 AND 200),
  finance_authorization_kind  text NOT NULL CONSTRAINT enrolment_finance_kind_valid CHECK (
                                finance_authorization_kind IN ('verified_payment', 'approved_arrangement')),
  finance_authorization_ref   text NOT NULL CONSTRAINT enrolment_finance_ref_len CHECK (length(btrim(finance_authorization_ref)) BETWEEN 1 AND 200),
  commencement_basis          text NOT NULL CONSTRAINT enrolment_commencement_len CHECK (length(btrim(commencement_basis)) BETWEEN 1 AND 300),
  evidence_trust              text NOT NULL CONSTRAINT enrolment_evidence_trust_valid CHECK (evidence_trust IN ('verified', 'test_only')),
  confirmed_at                timestamptz NOT NULL DEFAULT now(),
  confirmed_by                uuid REFERENCES app_user (id),
  confirmation_audit_id       uuid NOT NULL REFERENCES audit_event (id),
  CONSTRAINT enrolment_application_uq UNIQUE (application_id),
  CONSTRAINT enrolment_seat_uq UNIQUE (seat_allocation_id),
  CONSTRAINT enrolment_application_fk FOREIGN KEY (application_id, learner_user_id)
    REFERENCES learner_application (id, learner_user_id),
  CONSTRAINT enrolment_version_fk FOREIGN KEY (programme_version_id, programme_id) REFERENCES programme_version (id, programme_id),
  CONSTRAINT enrolment_batch_fk FOREIGN KEY (batch_id, programme_id) REFERENCES batch (id, programme_id),
  CONSTRAINT enrolment_fee_option_fk FOREIGN KEY (fee_option_id, programme_id) REFERENCES fee_option (id, programme_id)
);
-- PD-E-15: no second active enrolment for the same learner.
CREATE UNIQUE INDEX enrolment_one_active_per_learner_uq ON enrolment (learner_user_id) WHERE state = 'confirmed';
CREATE INDEX enrolment_batch_idx ON enrolment (batch_id, state);

CREATE FUNCTION enrolment_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  a record;
  s record;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'an enrolment does not change in this stage' USING ERRCODE = 'IL005';
  END IF;
  IF NEW.state <> 'confirmed' THEN
    RAISE EXCEPTION 'an enrolment is created confirmed' USING ERRCODE = 'IL002';
  END IF;
  IF NEW.evidence_trust = 'test_only'
     AND coalesce(current_setting('ilumin.test_evidence', true), '') IS DISTINCT FROM 'allowed' THEN
    -- Test-only prerequisite adapters can never confirm an enrolment in a non-test database.
    RAISE EXCEPTION 'test-only prerequisite evidence refused outside a test database' USING ERRCODE = 'IL009';
  END IF;
  SELECT * INTO a FROM learner_application WHERE id = NEW.application_id;
  IF a.status IS DISTINCT FROM 'approved' THEN
    RAISE EXCEPTION 'only an approved application is confirmed (it is %)', a.status USING ERRCODE = 'IL002';
  END IF;
  IF a.learner_user_id IS DISTINCT FROM NEW.learner_user_id OR a.programme_id IS DISTINCT FROM NEW.programme_id
     OR a.programme_version_id IS DISTINCT FROM NEW.programme_version_id OR a.terms_version_id IS DISTINCT FROM NEW.terms_version_id
     OR a.batch_id IS DISTINCT FROM NEW.batch_id OR a.fee_option_id IS DISTINCT FROM NEW.fee_option_id
     OR a.delivery_mode IS DISTINCT FROM NEW.delivery_mode THEN
    RAISE EXCEPTION 'the enrolment must match its application exactly' USING ERRCODE = 'IL004';
  END IF;
  SELECT * INTO s FROM seat_allocation WHERE id = NEW.seat_allocation_id;
  IF s.state IS DISTINCT FROM 'occupied' OR s.batch_id IS DISTINCT FROM NEW.batch_id
     OR s.learner_user_id IS DISTINCT FROM NEW.learner_user_id OR s.fee_option_id IS DISTINCT FROM NEW.fee_option_id
     OR s.authority_kind IS DISTINCT FROM 'enrolment_confirmation' OR s.authority_ref IS DISTINCT FROM NEW.id::text THEN
    RAISE EXCEPTION 'the enrolment''s seat must be its own occupied place in the batch' USING ERRCODE = 'IL006';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER enrolment_guard BEFORE INSERT OR UPDATE ON enrolment FOR EACH ROW EXECUTE FUNCTION enrolment_guard();

-- The seat of a confirmed enrolment is not released or transferred while the enrolment stays confirmed (the enrolment,
-- L6, changes first in a later stage's withdrawal or transfer; then its seat, L8).
CREATE FUNCTION seat_enrolment_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.state IN ('held', 'occupied') AND NEW.state IN ('released', 'transferred')
     AND EXISTS (SELECT 1 FROM enrolment WHERE seat_allocation_id = OLD.id AND state = 'confirmed') THEN
    RAISE EXCEPTION 'the seat of a confirmed enrolment is not released while the enrolment is confirmed' USING ERRCODE = 'IL002';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER seat_enrolment_guard BEFORE UPDATE ON seat_allocation FOR EACH ROW EXECUTE FUNCTION seat_enrolment_guard();

-- ── Privileges ─────────────────────────────────────────────────────────────────────────────────────────────────────

REVOKE ALL ON terms_version, learner_profile, learner_application, application_event, enrolment FROM PUBLIC;
GRANT SELECT ON terms_version TO ilumin_app;
GRANT SELECT, INSERT ON learner_profile, application_event, enrolment TO ilumin_app;
GRANT SELECT, INSERT, UPDATE ON learner_application TO ilumin_app;
