-- 0007 Programmes, batches and the authoritative seat ledger (Stage 2A; ADR 0012)
--
-- Programme → immutable published versions → fee options (stable identity per programme) → batches → seat allocations.
-- Batch capacity is never a stored counter: occupancy is the number of active seat_allocation rows (P0 I-1, I-11).
--
-- Enforcement is in the database, not only in application code:
--   * composite foreign keys tie every version, fee option, accepted option and batch to ONE programme;
--   * triggers enforce lifecycle transitions, immutability of published versions, time-zone validity, fee-option
--     eligibility, P-33 / IQA independence on staff allocations, and the capacity limit itself (backstop: the seat
--     service checks first under the batch lock and returns BATCH_FULL; the trigger refuses any path that bypasses it);
--   * a partial unique index prevents two active allocations for the same subject in the same batch.
--
-- Domain refusals raised here use SQLSTATE class "IL" (application-defined), mapped to stable API error codes in
-- src/shared/db-errors.ts:
--   IL001 capacity exceeded                      → CAPACITY_CONFLICT
--   IL002 lifecycle transition not allowed       → INVALID_STATE_TRANSITION
--   IL003 staff allocation conflict (P-33, IQA)  → STAFF_ALLOCATION_CONFLICT
--   IL004 programme / version mismatch           → PROGRAMME_VERSION_MISMATCH
--   IL005 immutable record changed               → IMMUTABLE_RECORD
--   IL006 batch or option not eligible           → BATCH_NOT_ELIGIBLE
--   IL007 invalid configuration value            → VALIDATION_FAILED
--
-- No demo data. The API role gets SELECT, INSERT, UPDATE only (never DELETE): history is kept by state, not removal.

-- ── Programmes ─────────────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE programme (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text NOT NULL CONSTRAINT programme_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9-]{1,39}$'),
  title       text NOT NULL CONSTRAINT programme_title_len CHECK (length(btrim(title)) BETWEEN 1 AND 200),
  -- Qualification level of the prototype catalogue (Levels 2, 3, 4 and 5). Level 3 is fee-option priced (R1).
  level       smallint NOT NULL CONSTRAINT programme_level_valid CHECK (level IN (2, 3, 4, 5)),
  status      text NOT NULL DEFAULT 'draft'
                CONSTRAINT programme_status_valid CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  created_by  uuid NOT NULL REFERENCES app_user (id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  row_version integer NOT NULL DEFAULT 1,
  CONSTRAINT programme_code_uq UNIQUE (code)
);
CREATE INDEX programme_status_idx ON programme (status);

CREATE TABLE programme_version (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id          uuid NOT NULL REFERENCES programme (id) ON DELETE RESTRICT,
  version_number        integer NOT NULL CONSTRAINT programme_version_number_positive CHECK (version_number >= 1),
  status                text NOT NULL DEFAULT 'draft'
                          CONSTRAINT programme_version_status_valid CHECK (status IN ('draft', 'published', 'superseded')),
  -- 'fee_options': learners choose a fee option and the option decides their delivery mode (R1, PD-DM-01/04).
  -- 'single_price': one programme price; each batch has one delivery mode (PD-R1-12, PD-M-07).
  pricing_model         text NOT NULL CONSTRAINT programme_version_pricing_valid CHECK (pricing_model IN ('fee_options', 'single_price')),
  single_price_minor    bigint CONSTRAINT programme_version_price_positive CHECK (single_price_minor > 0),
  currency              text CONSTRAINT programme_version_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  -- Frozen at publication: the version as published, including its fee options and prices. Never changes afterwards.
  snapshot              jsonb,
  finance_approved_by   uuid REFERENCES app_user (id),
  finance_approved_at   timestamptz,
  finance_approval_ref  text CONSTRAINT programme_version_approval_ref_len CHECK (length(btrim(finance_approval_ref)) BETWEEN 1 AND 200),
  published_by          uuid REFERENCES app_user (id),
  published_at          timestamptz,
  created_by            uuid NOT NULL REFERENCES app_user (id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT programme_version_number_uq UNIQUE (programme_id, version_number),
  CONSTRAINT programme_version_id_programme_uq UNIQUE (id, programme_id),
  CONSTRAINT programme_version_pricing_shape CHECK (
    (pricing_model = 'single_price' AND single_price_minor IS NOT NULL AND currency IS NOT NULL)
    OR (pricing_model = 'fee_options' AND single_price_minor IS NULL AND currency IS NULL)),
  -- Publication is only possible with a recorded Finance approval (financially approved publication is never bypassed).
  CONSTRAINT programme_version_publication_complete CHECK (
    (status = 'draft' AND snapshot IS NULL AND published_by IS NULL AND published_at IS NULL
       AND finance_approved_by IS NULL AND finance_approved_at IS NULL AND finance_approval_ref IS NULL)
    OR (status IN ('published', 'superseded') AND snapshot IS NOT NULL AND published_by IS NOT NULL
       AND published_at IS NOT NULL AND finance_approved_by IS NOT NULL AND finance_approved_at IS NOT NULL
       AND finance_approval_ref IS NOT NULL))
);
CREATE UNIQUE INDEX programme_version_one_draft_uq ON programme_version (programme_id) WHERE status = 'draft';
CREATE UNIQUE INDEX programme_version_one_published_uq ON programme_version (programme_id) WHERE status = 'published';

-- Fee options have a stable identity per programme (PD-R1-08: numbered per programme, never reused). Their price lives
-- in each version (programme_version_fee_option), so a published price never changes.
CREATE TABLE fee_option (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id            uuid NOT NULL REFERENCES programme (id) ON DELETE RESTRICT,
  code                    text NOT NULL CONSTRAINT fee_option_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9-]{1,59}$'),
  label                   text NOT NULL CONSTRAINT fee_option_label_len CHECK (length(btrim(label)) BETWEEN 1 AND 200),
  -- Exactly one delivery mode per option (PD-DM-01). The legacy "Standard programme fee" without a mode (PD-R1-02) is
  -- a data-migration concern and is not representable here yet.
  delivery_mode           text NOT NULL CONSTRAINT fee_option_mode_valid CHECK (delivery_mode IN ('self_paced', 'fully_assisted')),
  status                  text NOT NULL DEFAULT 'active' CONSTRAINT fee_option_status_valid CHECK (status IN ('active', 'retired')),
  created_in_version_id   uuid NOT NULL,
  created_by              uuid NOT NULL REFERENCES app_user (id),
  created_at              timestamptz NOT NULL DEFAULT now(),
  retired_at              timestamptz,
  retired_by              uuid REFERENCES app_user (id),
  retire_reason           text,
  CONSTRAINT fee_option_code_uq UNIQUE (programme_id, code),
  CONSTRAINT fee_option_id_programme_uq UNIQUE (id, programme_id),
  CONSTRAINT fee_option_version_fk FOREIGN KEY (created_in_version_id, programme_id)
    REFERENCES programme_version (id, programme_id),
  CONSTRAINT fee_option_retirement_complete CHECK (
    (status = 'active' AND retired_at IS NULL AND retired_by IS NULL AND retire_reason IS NULL)
    OR (status = 'retired' AND retired_at IS NOT NULL AND retired_by IS NOT NULL
        AND retire_reason IS NOT NULL AND length(btrim(retire_reason)) > 0))
);

CREATE TABLE programme_version_fee_option (
  programme_version_id  uuid NOT NULL,
  programme_id          uuid NOT NULL,
  fee_option_id         uuid NOT NULL,
  price_minor           bigint NOT NULL CONSTRAINT pvfo_price_positive CHECK (price_minor > 0),
  currency              text NOT NULL CONSTRAINT pvfo_currency_format CHECK (currency ~ '^[A-Z]{3}$'),
  CONSTRAINT pvfo_pk PRIMARY KEY (programme_version_id, fee_option_id),
  CONSTRAINT pvfo_version_fk FOREIGN KEY (programme_version_id, programme_id) REFERENCES programme_version (id, programme_id),
  CONSTRAINT pvfo_option_fk FOREIGN KEY (fee_option_id, programme_id) REFERENCES fee_option (id, programme_id)
);
CREATE INDEX pvfo_option_idx ON programme_version_fee_option (fee_option_id);

-- ── Programme guards ───────────────────────────────────────────────────────────────────────────────────────────────

CREATE FUNCTION programme_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'a programme starts as draft' USING ERRCODE = 'IL002';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.code IS DISTINCT FROM OLD.code OR NEW.level IS DISTINCT FROM OLD.level
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'programme code, level and creation are immutable' USING ERRCODE = 'IL005';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT ((OLD.status, NEW.status) IN (('draft', 'active'), ('draft', 'archived'), ('active', 'closed'),
                                         ('closed', 'active'), ('closed', 'archived'))) THEN
      RAISE EXCEPTION 'programme status % → % is not allowed', OLD.status, NEW.status USING ERRCODE = 'IL002';
    END IF;
    IF NEW.status = 'active' AND NOT EXISTS (
         SELECT 1 FROM programme_version WHERE programme_id = NEW.id AND status = 'published') THEN
      RAISE EXCEPTION 'a programme becomes active only with a published version' USING ERRCODE = 'IL002';
    END IF;
  END IF;
  NEW.updated_at := now();
  NEW.row_version := OLD.row_version + 1;
  RETURN NEW;
END
$$;
CREATE TRIGGER programme_guard BEFORE INSERT OR UPDATE ON programme FOR EACH ROW EXECUTE FUNCTION programme_guard();

CREATE FUNCTION programme_version_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  lvl smallint;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'draft' THEN
      RAISE EXCEPTION 'a programme version starts as draft' USING ERRCODE = 'IL002';
    END IF;
    SELECT level INTO lvl FROM programme WHERE id = NEW.programme_id;
    -- R1 / PD-R1-08: every Level 3 programme is priced by fee options.
    IF lvl = 3 AND NEW.pricing_model <> 'fee_options' THEN
      RAISE EXCEPTION 'Level 3 programmes are priced by fee options' USING ERRCODE = 'IL007';
    END IF;
    RETURN NEW;
  END IF;
  IF OLD.status IN ('published', 'superseded') THEN
    -- The only change a published version accepts is being superseded by a later publication.
    IF NOT (OLD.status = 'published' AND NEW.status = 'superseded'
            AND (to_jsonb(NEW) - 'status' - 'updated_at') = (to_jsonb(OLD) - 'status' - 'updated_at')) THEN
      RAISE EXCEPTION 'programme version % is published and immutable', OLD.id USING ERRCODE = 'IL005';
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  -- Draft.
  IF NEW.programme_id IS DISTINCT FROM OLD.programme_id OR NEW.version_number IS DISTINCT FROM OLD.version_number
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'programme version identity is immutable' USING ERRCODE = 'IL005';
  END IF;
  IF NEW.status NOT IN ('draft', 'published') THEN
    RAISE EXCEPTION 'programme version status % → % is not allowed', OLD.status, NEW.status USING ERRCODE = 'IL002';
  END IF;
  IF NEW.status = 'published' AND NEW.pricing_model = 'fee_options' AND NOT EXISTS (
       SELECT 1 FROM programme_version_fee_option f JOIN fee_option o ON o.id = f.fee_option_id
        WHERE f.programme_version_id = NEW.id AND o.status = 'active') THEN
    RAISE EXCEPTION 'a fee-option version needs at least one active fee option to be published' USING ERRCODE = 'IL007';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END
$$;
CREATE TRIGGER programme_version_guard BEFORE INSERT OR UPDATE ON programme_version
  FOR EACH ROW EXECUTE FUNCTION programme_version_guard();

-- A version's fee-option rows change only while the version is a draft, and only for fee-option versions.
CREATE FUNCTION pvfo_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  v record;
  vid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    vid := OLD.programme_version_id;
  ELSE
    vid := NEW.programme_version_id;
  END IF;
  SELECT status, pricing_model INTO v FROM programme_version WHERE id = vid;
  IF v.status <> 'draft' THEN
    RAISE EXCEPTION 'the fee options of a published version are immutable' USING ERRCODE = 'IL005';
  END IF;
  IF TG_OP <> 'DELETE' AND v.pricing_model <> 'fee_options' THEN
    RAISE EXCEPTION 'a single-price version has no fee options' USING ERRCODE = 'IL007';
  END IF;
  IF TG_OP = 'UPDATE' AND (NEW.programme_version_id <> OLD.programme_version_id OR NEW.fee_option_id <> OLD.fee_option_id) THEN
    RAISE EXCEPTION 'fee option rows are re-created, not re-pointed' USING ERRCODE = 'IL005';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER pvfo_guard BEFORE INSERT OR UPDATE OR DELETE ON programme_version_fee_option
  FOR EACH ROW EXECUTE FUNCTION pvfo_guard();

CREATE FUNCTION fee_option_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'active' THEN
      RAISE EXCEPTION 'a fee option starts active' USING ERRCODE = 'IL002';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.programme_id IS DISTINCT FROM OLD.programme_id OR NEW.code IS DISTINCT FROM OLD.code
     OR NEW.delivery_mode IS DISTINCT FROM OLD.delivery_mode
     OR NEW.created_in_version_id IS DISTINCT FROM OLD.created_in_version_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'fee option identity and delivery mode are immutable' USING ERRCODE = 'IL005';
  END IF;
  IF OLD.status = 'retired' AND NEW IS DISTINCT FROM OLD THEN
    -- PD-R1-06: a retired option is never reactivated; a new option is added instead.
    RAISE EXCEPTION 'a retired fee option is not changed or reactivated' USING ERRCODE = 'IL002';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER fee_option_guard BEFORE INSERT OR UPDATE ON fee_option FOR EACH ROW EXECUTE FUNCTION fee_option_guard();

-- ── Batches ────────────────────────────────────────────────────────────────────────────────────────────────────────

CREATE TABLE batch (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                  text NOT NULL CONSTRAINT batch_code_format CHECK (code ~ '^[A-Z0-9][A-Z0-9-]{1,39}$'),
  programme_id          uuid NOT NULL REFERENCES programme (id) ON DELETE RESTRICT,
  programme_version_id  uuid NOT NULL,
  -- Calendar date in the batch's own zone. The commencement INSTANT is still open (U-05) and is not derived here.
  start_date            date NOT NULL,
  -- Explicit IANA zone, required: there is no Academy default (U-04 open). Validated by batch_guard.
  time_zone             text NOT NULL,
  capacity              integer NOT NULL CONSTRAINT batch_capacity_positive CHECK (capacity BETWEEN 1 AND 10000),
  -- Prototype batch lifecycle: Planned, Open, In Progress, Completed, Cancelled, Archived.
  status                text NOT NULL DEFAULT 'planned'
                          CONSTRAINT batch_status_valid CHECK (status IN ('planned', 'open', 'in_progress', 'completed', 'cancelled', 'archived')),
  -- Single-price programmes: the batch's one delivery mode (PD-M-07). Fee-option programmes: NULL (the learner's
  -- option decides; the accepted options are in batch_fee_option).
  delivery_mode         text CONSTRAINT batch_mode_valid CHECK (delivery_mode IN ('self_paced', 'fully_assisted')),
  created_by            uuid NOT NULL REFERENCES app_user (id),
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  row_version           integer NOT NULL DEFAULT 1,
  CONSTRAINT batch_code_uq UNIQUE (code),
  CONSTRAINT batch_id_programme_uq UNIQUE (id, programme_id),
  CONSTRAINT batch_version_fk FOREIGN KEY (programme_version_id, programme_id) REFERENCES programme_version (id, programme_id)
);
CREATE INDEX batch_programme_idx ON batch (programme_id, start_date);
CREATE INDEX batch_status_start_idx ON batch (status, start_date);

-- Accepted fee options (PD-W1-01 / PD-W1-04). Removal keeps the row (history).
CREATE TABLE batch_fee_option (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id       uuid NOT NULL,
  programme_id   uuid NOT NULL,
  fee_option_id  uuid NOT NULL,
  added_by       uuid NOT NULL REFERENCES app_user (id),
  added_at       timestamptz NOT NULL DEFAULT now(),
  removed_at     timestamptz,
  removed_by     uuid REFERENCES app_user (id),
  remove_reason  text,
  CONSTRAINT batch_fee_option_batch_fk FOREIGN KEY (batch_id, programme_id) REFERENCES batch (id, programme_id),
  CONSTRAINT batch_fee_option_option_fk FOREIGN KEY (fee_option_id, programme_id) REFERENCES fee_option (id, programme_id),
  CONSTRAINT batch_fee_option_removal_complete CHECK (
    (removed_at IS NULL AND removed_by IS NULL AND remove_reason IS NULL)
    OR (removed_at IS NOT NULL AND removed_by IS NOT NULL AND remove_reason IS NOT NULL AND length(btrim(remove_reason)) > 0))
);
CREATE UNIQUE INDEX batch_fee_option_active_uq ON batch_fee_option (batch_id, fee_option_id) WHERE removed_at IS NULL;

-- ── Seat ledger (P1) ───────────────────────────────────────────────────────────────────────────────────────────────

-- One row per place. Active = 'held' (reserved, not yet secured) or 'occupied'. 'released' and 'transferred' are
-- history and never count. Every row is linked to the audit event that created it, and released / transferred rows to
-- the audit event that ended them (database-enforced audit linkage).
CREATE TABLE seat_allocation (
  id                  uuid PRIMARY KEY,
  batch_id            uuid NOT NULL REFERENCES batch (id) ON DELETE RESTRICT,
  -- learner             : a named learner (app_user holding the learner role).
  -- agency_reservation  : an unnamed agency reservation (P8). Staged: refused until the P8 migration adds the
  --                       reservation table and its foreign key.
  -- unattributed        : a historical place with no identifiable learner (P1 legacy-count migration only).
  subject_kind        text NOT NULL CONSTRAINT seat_subject_kind_valid CHECK (subject_kind IN ('learner', 'agency_reservation', 'unattributed')),
  learner_user_id     uuid REFERENCES app_user (id),
  reservation_id      uuid,
  agency_id           uuid REFERENCES agency (id),
  fee_option_id       uuid REFERENCES fee_option (id),
  state               text NOT NULL CONSTRAINT seat_state_valid CHECK (state IN ('held', 'occupied', 'released', 'transferred')),
  -- What authorised the place: the confirmed domain record of a later stage (enrolment confirmation, approved transfer,
  -- reservation, agency confirmation) or a recorded administrative authority. Never client-supplied.
  authority_kind      text NOT NULL CONSTRAINT seat_authority_kind_valid CHECK (authority_kind IN (
                        'enrolment_confirmation', 'approved_transfer', 'agency_reservation', 'agency_confirmation',
                        'administrative_adjustment', 'legacy_migration')),
  authority_ref       text NOT NULL CONSTRAINT seat_authority_ref_len CHECK (length(btrim(authority_ref)) BETWEEN 1 AND 200),
  transferred_from    uuid REFERENCES seat_allocation (id),
  transferred_to      uuid REFERENCES seat_allocation (id),
  allocated_at        timestamptz NOT NULL DEFAULT now(),
  allocated_by        uuid REFERENCES app_user (id),
  allocation_audit_id uuid NOT NULL REFERENCES audit_event (id),
  secured_at          timestamptz,
  ended_at            timestamptz,
  ended_by            uuid REFERENCES app_user (id),
  end_reason          text,
  end_audit_id        uuid REFERENCES audit_event (id),
  CONSTRAINT seat_subject_shape CHECK (
    (subject_kind = 'learner' AND learner_user_id IS NOT NULL AND reservation_id IS NULL)
    OR (subject_kind = 'agency_reservation' AND learner_user_id IS NULL AND reservation_id IS NOT NULL AND agency_id IS NOT NULL)
    OR (subject_kind = 'unattributed' AND learner_user_id IS NULL AND reservation_id IS NULL
        AND authority_kind = 'legacy_migration')),
  CONSTRAINT seat_end_complete CHECK (
    (state IN ('held', 'occupied') AND ended_at IS NULL AND ended_by IS NULL AND end_reason IS NULL AND end_audit_id IS NULL
       AND transferred_to IS NULL)
    OR (state IN ('released', 'transferred') AND ended_at IS NOT NULL AND end_audit_id IS NOT NULL
       AND end_reason IS NOT NULL AND length(btrim(end_reason)) > 0)),
  CONSTRAINT seat_transfer_target CHECK ((state = 'transferred') = (transferred_to IS NOT NULL)),
  CONSTRAINT seat_not_self_transfer CHECK (transferred_to IS DISTINCT FROM id AND transferred_from IS DISTINCT FROM id)
);
-- One active place per subject per batch (P10 §C row 5; production-transaction-rules §4).
CREATE UNIQUE INDEX seat_active_learner_uq ON seat_allocation (batch_id, learner_user_id)
  WHERE state IN ('held', 'occupied') AND learner_user_id IS NOT NULL;
CREATE UNIQUE INDEX seat_active_reservation_uq ON seat_allocation (reservation_id)
  WHERE state IN ('held', 'occupied') AND reservation_id IS NOT NULL;
-- A source place is transferred at most once.
CREATE UNIQUE INDEX seat_transferred_from_uq ON seat_allocation (transferred_from) WHERE transferred_from IS NOT NULL;
CREATE INDEX seat_batch_active_idx ON seat_allocation (batch_id) WHERE state IN ('held', 'occupied');
CREATE INDEX seat_batch_history_idx ON seat_allocation (batch_id, allocated_at, id);
CREATE INDEX seat_learner_idx ON seat_allocation (learner_user_id) WHERE learner_user_id IS NOT NULL;

-- ── Batch guards ───────────────────────────────────────────────────────────────────────────────────────────────────

CREATE FUNCTION batch_active_seats(p_batch uuid) RETURNS integer
LANGUAGE sql STABLE AS $$
  SELECT count(*)::integer FROM seat_allocation WHERE batch_id = p_batch AND state IN ('held', 'occupied')
$$;

CREATE FUNCTION is_valid_batch_time_zone(tz text) RETURNS boolean
LANGUAGE sql STABLE AS $$
  -- IANA "Area/Location" names only (no abbreviations, POSIX strings or offsets), and known to this server.
  SELECT tz ~ '^(Africa|America|Antarctica|Arctic|Asia|Atlantic|Australia|Europe|Indian|Pacific|Etc)/[A-Za-z0-9_+-]+(/[A-Za-z0-9_+-]+)?$'
     AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = tz)
$$;

CREATE FUNCTION batch_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  prog record;
  ver record;
  occupied integer;
BEGIN
  IF NOT is_valid_batch_time_zone(NEW.time_zone) THEN
    RAISE EXCEPTION 'time zone "%" is not a valid IANA zone', NEW.time_zone USING ERRCODE = 'IL007';
  END IF;

  IF TG_OP = 'INSERT' THEN
    SELECT status INTO prog FROM programme WHERE id = NEW.programme_id;
    IF prog.status IS DISTINCT FROM 'active' THEN
      RAISE EXCEPTION 'batches are created only for an active programme' USING ERRCODE = 'IL006';
    END IF;
    SELECT status, pricing_model INTO ver FROM programme_version WHERE id = NEW.programme_version_id;
    IF ver.status IS DISTINCT FROM 'published' THEN
      RAISE EXCEPTION 'batches use the published programme version' USING ERRCODE = 'IL004';
    END IF;
    IF NEW.status NOT IN ('planned', 'open') THEN
      RAISE EXCEPTION 'a batch starts planned or open' USING ERRCODE = 'IL002';
    END IF;
    IF (ver.pricing_model = 'single_price') <> (NEW.delivery_mode IS NOT NULL) THEN
      RAISE EXCEPTION 'single-price batches have one delivery mode; fee-option batches take theirs from accepted options'
        USING ERRCODE = 'IL007';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.code IS DISTINCT FROM OLD.code OR NEW.programme_id IS DISTINCT FROM OLD.programme_id
     OR NEW.programme_version_id IS DISTINCT FROM OLD.programme_version_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'batch code, programme and programme version are immutable' USING ERRCODE = 'IL005';
  END IF;
  IF OLD.status IN ('cancelled', 'archived') AND NEW IS DISTINCT FROM OLD THEN
    RAISE EXCEPTION 'a % batch is not changed', OLD.status USING ERRCODE = 'IL002';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    -- 'open' → 'in_progress' depends on the commencement instant (U-05, open) and is not offered yet.
    IF NOT ((OLD.status, NEW.status) IN (('planned', 'open'), ('open', 'planned'), ('planned', 'cancelled'),
                                         ('open', 'cancelled'), ('in_progress', 'completed'), ('completed', 'archived'))) THEN
      RAISE EXCEPTION 'batch status % → % is not allowed', OLD.status, NEW.status USING ERRCODE = 'IL002';
    END IF;
  END IF;

  occupied := batch_active_seats(NEW.id);
  IF NEW.status = 'cancelled' AND OLD.status <> 'cancelled' AND occupied > 0 THEN
    -- U-09 (cancellation with learners) is open; learners are never silently moved (PD-P0-01). Fail safe.
    RAISE EXCEPTION 'a batch with active places cannot be cancelled' USING ERRCODE = 'IL002';
  END IF;
  IF NEW.capacity < occupied THEN
    RAISE EXCEPTION 'capacity % is below the % active places', NEW.capacity, occupied USING ERRCODE = 'IL001';
  END IF;
  IF (NEW.start_date IS DISTINCT FROM OLD.start_date OR NEW.time_zone IS DISTINCT FROM OLD.time_zone) AND occupied > 0 THEN
    -- Rescheduling with learners is P6 (PD-P0-08: fail safe against signed deadlines). Not available here.
    RAISE EXCEPTION 'start date and time zone change only while the batch has no active places' USING ERRCODE = 'IL002';
  END IF;
  IF NEW.delivery_mode IS DISTINCT FROM OLD.delivery_mode THEN
    IF OLD.delivery_mode IS NULL OR NEW.delivery_mode IS NULL THEN
      RAISE EXCEPTION 'only a single-price batch has a delivery mode' USING ERRCODE = 'IL007';
    END IF;
    IF occupied > 0 THEN
      -- N2 lock (PD-R2-02): the mode does not change once learners are enrolled.
      RAISE EXCEPTION 'the delivery mode changes only while the batch has no active places' USING ERRCODE = 'IL002';
    END IF;
  END IF;
  NEW.updated_at := now();
  NEW.row_version := OLD.row_version + 1;
  RETURN NEW;
END
$$;
CREATE TRIGGER batch_guard BEFORE INSERT OR UPDATE ON batch FOR EACH ROW EXECUTE FUNCTION batch_guard();

CREATE FUNCTION batch_fee_option_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  b record;
  opt record;
BEGIN
  SELECT status, programme_version_id INTO b FROM batch WHERE id = NEW.batch_id;
  IF b.status IN ('completed', 'cancelled', 'archived') THEN
    RAISE EXCEPTION 'the fee options of a % batch are not changed', b.status USING ERRCODE = 'IL006';
  END IF;
  IF TG_OP = 'INSERT' THEN
    SELECT status INTO opt FROM fee_option WHERE id = NEW.fee_option_id;
    IF opt.status <> 'active' THEN
      RAISE EXCEPTION 'a retired fee option is not accepted' USING ERRCODE = 'IL006';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM programme_version_fee_option
                    WHERE programme_version_id = b.programme_version_id AND fee_option_id = NEW.fee_option_id) THEN
      RAISE EXCEPTION 'the fee option is not part of the batch''s programme version' USING ERRCODE = 'IL004';
    END IF;
    IF NEW.removed_at IS NOT NULL THEN
      RAISE EXCEPTION 'an accepted option is added active' USING ERRCODE = 'IL002';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.batch_id IS DISTINCT FROM OLD.batch_id OR NEW.fee_option_id IS DISTINCT FROM OLD.fee_option_id
     OR NEW.added_by IS DISTINCT FROM OLD.added_by OR NEW.added_at IS DISTINCT FROM OLD.added_at
     OR OLD.removed_at IS NOT NULL THEN
    RAISE EXCEPTION 'accepted fee option rows are only removed, once' USING ERRCODE = 'IL005';
  END IF;
  IF NEW.removed_at IS NOT NULL AND EXISTS (
       SELECT 1 FROM seat_allocation WHERE batch_id = NEW.batch_id AND fee_option_id = NEW.fee_option_id
          AND state IN ('held', 'occupied')) THEN
    -- PD-W1-04: an option held by a learner in the batch can't be removed.
    RAISE EXCEPTION 'the fee option is held by an active place in this batch' USING ERRCODE = 'IL006';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER batch_fee_option_guard BEFORE INSERT OR UPDATE ON batch_fee_option
  FOR EACH ROW EXECUTE FUNCTION batch_fee_option_guard();

-- A fee-option batch always accepts at least one option (PD-W1-01/04), checked at commit so that a batch and its
-- options can be written in one transaction.
CREATE FUNCTION batch_requires_fee_option() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  bid uuid;
BEGIN
  IF TG_TABLE_NAME = 'batch' THEN
    bid := NEW.id;
  ELSE
    bid := NEW.batch_id;
  END IF;
  IF EXISTS (SELECT 1 FROM batch b JOIN programme_version v ON v.id = b.programme_version_id
              WHERE b.id = bid AND v.pricing_model = 'fee_options' AND b.status NOT IN ('cancelled', 'archived'))
     AND NOT EXISTS (SELECT 1 FROM batch_fee_option WHERE batch_id = bid AND removed_at IS NULL) THEN
    RAISE EXCEPTION 'a fee-option batch accepts at least one fee option' USING ERRCODE = 'IL007';
  END IF;
  RETURN NULL;
END
$$;
CREATE CONSTRAINT TRIGGER batch_requires_fee_option AFTER INSERT ON batch
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION batch_requires_fee_option();
CREATE CONSTRAINT TRIGGER batch_fee_option_keeps_one AFTER UPDATE ON batch_fee_option
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION batch_requires_fee_option();

-- ── Seat guards ────────────────────────────────────────────────────────────────────────────────────────────────────

CREATE FUNCTION seat_allocation_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  b record;
  occupied integer;
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.state NOT IN ('held', 'occupied') THEN
      RAISE EXCEPTION 'a place is created held or occupied' USING ERRCODE = 'IL002';
    END IF;
    IF NEW.subject_kind = 'agency_reservation' THEN
      -- Staged constraint: reservations exist from P8, which adds the table and the foreign key on reservation_id.
      RAISE EXCEPTION 'agency reservation places are not available before the reservation stage (P8)' USING ERRCODE = 'IL006';
    END IF;
    IF NEW.subject_kind = 'learner' AND NOT EXISTS (
         SELECT 1 FROM user_role WHERE user_id = NEW.learner_user_id AND role = 'learner' AND revoked_at IS NULL) THEN
      RAISE EXCEPTION 'a learner place needs an account holding the learner role' USING ERRCODE = 'IL006';
    END IF;
    -- Capacity backstop under the batch row lock (the seat service takes the same lock first, so this never waits).
    SELECT b2.capacity, b2.status, b2.programme_version_id, v.pricing_model INTO b
      FROM batch b2 JOIN programme_version v ON v.id = b2.programme_version_id
     WHERE b2.id = NEW.batch_id FOR UPDATE OF b2;
    IF b.status NOT IN ('planned', 'open') THEN
      RAISE EXCEPTION 'batch is % and takes no new places', b.status USING ERRCODE = 'IL006';
    END IF;
    IF b.pricing_model = 'fee_options' AND NEW.subject_kind <> 'unattributed' AND (NEW.fee_option_id IS NULL OR NOT EXISTS (
         SELECT 1 FROM batch_fee_option WHERE batch_id = NEW.batch_id AND fee_option_id = NEW.fee_option_id AND removed_at IS NULL)) THEN
      RAISE EXCEPTION 'the batch does not accept this fee option' USING ERRCODE = 'IL006';
    END IF;
    IF b.pricing_model = 'single_price' AND NEW.fee_option_id IS NOT NULL THEN
      RAISE EXCEPTION 'a single-price batch takes no fee option' USING ERRCODE = 'IL006';
    END IF;
    occupied := batch_active_seats(NEW.batch_id);
    IF occupied >= b.capacity THEN
      RAISE EXCEPTION 'batch % is full (% of %)', NEW.batch_id, occupied, b.capacity USING ERRCODE = 'IL001';
    END IF;
    IF NEW.state = 'occupied' THEN
      NEW.secured_at := COALESCE(NEW.secured_at, NEW.allocated_at);
    END IF;
    RETURN NEW;
  END IF;

  -- UPDATE: identity is immutable; the state machine is held → occupied, held/occupied → released/transferred.
  IF NEW.batch_id IS DISTINCT FROM OLD.batch_id OR NEW.subject_kind IS DISTINCT FROM OLD.subject_kind
     OR NEW.learner_user_id IS DISTINCT FROM OLD.learner_user_id OR NEW.reservation_id IS DISTINCT FROM OLD.reservation_id
     OR NEW.agency_id IS DISTINCT FROM OLD.agency_id OR NEW.fee_option_id IS DISTINCT FROM OLD.fee_option_id
     OR NEW.authority_kind IS DISTINCT FROM OLD.authority_kind OR NEW.authority_ref IS DISTINCT FROM OLD.authority_ref
     OR NEW.transferred_from IS DISTINCT FROM OLD.transferred_from OR NEW.allocated_at IS DISTINCT FROM OLD.allocated_at
     OR NEW.allocated_by IS DISTINCT FROM OLD.allocated_by OR NEW.allocation_audit_id IS DISTINCT FROM OLD.allocation_audit_id
     OR (OLD.secured_at IS NOT NULL AND NEW.secured_at IS DISTINCT FROM OLD.secured_at) THEN
    RAISE EXCEPTION 'seat allocation identity is immutable' USING ERRCODE = 'IL005';
  END IF;
  IF OLD.state IN ('released', 'transferred') THEN
    RAISE EXCEPTION 'seat allocation % has ended and is history', OLD.id USING ERRCODE = 'IL002';
  END IF;
  IF NOT ((OLD.state, NEW.state) IN (('held', 'occupied'), ('held', 'released'), ('occupied', 'released'),
                                     ('held', 'transferred'), ('occupied', 'transferred'))) THEN
    RAISE EXCEPTION 'seat state % → % is not allowed', OLD.state, NEW.state USING ERRCODE = 'IL002';
  END IF;
  IF NEW.state = 'occupied' THEN
    NEW.secured_at := COALESCE(NEW.secured_at, now());
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER seat_allocation_guard BEFORE INSERT OR UPDATE ON seat_allocation
  FOR EACH ROW EXECUTE FUNCTION seat_allocation_guard();

-- ── Staff allocations (existing staff_scope; no second staff model) ────────────────────────────────────────────────

-- Assessor function on a batch: assignment, PD or observation assessor (CH-17, PD-W0-04). Nullable: learner-level
-- overrides and Stage 1A rows have none.
ALTER TABLE staff_scope
  ADD COLUMN assessor_function text
    CONSTRAINT staff_scope_assessor_function_valid CHECK (assessor_function IN ('assignment', 'pd', 'observation')),
  ADD CONSTRAINT staff_scope_function_is_assessor CHECK (assessor_function IS NULL OR role = 'assessor');
DROP INDEX staff_scope_active_uq;
CREATE UNIQUE INDEX staff_scope_active_uq ON staff_scope (user_id, role, scope_kind, scope_id, COALESCE(assessor_function, ''))
  WHERE revoked_at IS NULL;

-- P-33 / PD-MC-08: no Coordinator of a batch is also its (assignment, PD or observation) assessor.
-- PD-IQB-02: the batch's IQA is not its Teacher, Assessor or Coordinator. Checked in both directions, under a
-- transaction-scoped advisory lock per (user, batch) so that two concurrent grants cannot both pass.
CREATE FUNCTION staff_scope_conflict_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
DECLARE
  conflicting text[];
BEGIN
  IF NEW.scope_kind <> 'batch' OR NEW.revoked_at IS NOT NULL THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.revoked_at IS NULL THEN
    RETURN NEW; -- not a new grant
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.user_id::text || ':' || NEW.scope_id::text, 7));
  conflicting := CASE NEW.role
    WHEN 'academic_coordinator' THEN ARRAY['assessor', 'iqa']
    WHEN 'assessor' THEN ARRAY['academic_coordinator', 'iqa']
    WHEN 'teacher' THEN ARRAY['iqa']
    WHEN 'iqa' THEN ARRAY['academic_coordinator', 'assessor', 'teacher']
  END;
  IF EXISTS (SELECT 1 FROM staff_scope
              WHERE user_id = NEW.user_id AND scope_kind = 'batch' AND scope_id = NEW.scope_id
                AND revoked_at IS NULL AND role = ANY (conflicting) AND id <> NEW.id) THEN
    RAISE EXCEPTION 'staff allocation conflict on batch % (P-33 / IQA independence)', NEW.scope_id USING ERRCODE = 'IL003';
  END IF;
  RETURN NEW;
END
$$;
CREATE TRIGGER staff_scope_conflict_guard BEFORE INSERT OR UPDATE ON staff_scope
  FOR EACH ROW EXECUTE FUNCTION staff_scope_conflict_guard();

-- ── Occupancy view (derived, never stored) ────────────────────────────────────────────────────────────────────────

CREATE VIEW batch_occupancy AS
SELECT b.id AS batch_id,
       b.capacity,
       count(s.id) FILTER (WHERE s.state IN ('held', 'occupied'))::integer AS active,
       count(s.id) FILTER (WHERE s.state = 'held')::integer AS held,
       count(s.id) FILTER (WHERE s.state = 'occupied')::integer AS occupied,
       count(s.id) FILTER (WHERE s.state IN ('held', 'occupied') AND s.subject_kind = 'unattributed')::integer AS unattributed,
       GREATEST(b.capacity - count(s.id) FILTER (WHERE s.state IN ('held', 'occupied')), 0)::integer AS available
  FROM batch b LEFT JOIN seat_allocation s ON s.batch_id = b.id
 GROUP BY b.id, b.capacity;

-- ── Privileges ─────────────────────────────────────────────────────────────────────────────────────────────────────

REVOKE ALL ON programme, programme_version, fee_option, programme_version_fee_option, batch, batch_fee_option,
  seat_allocation, batch_occupancy FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON programme, programme_version, fee_option, programme_version_fee_option, batch,
  batch_fee_option, seat_allocation TO ilumin_app;
GRANT SELECT ON batch_occupancy TO ilumin_app;
