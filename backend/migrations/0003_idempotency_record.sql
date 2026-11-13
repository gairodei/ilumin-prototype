-- 0003 Idempotency records (Stage 1A; ADR 0007)
-- A record is inserted at the start of the operation's own transaction and completed with the response in that same
-- transaction, so the stored result commits atomically with the business writes, and a concurrent duplicate blocks on
-- the unique index until the first transaction commits (then replays) or rolls back (then executes).

CREATE TABLE idempotency_record (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  principal_user_id    uuid NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  operation            text NOT NULL CHECK (operation ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  idempotency_key      text NOT NULL CHECK (idempotency_key ~ '^[A-Za-z0-9_.:-]{8,255}$'),
  request_fingerprint  char(64) NOT NULL,
  response_status      integer CHECK (response_status BETWEEN 200 AND 599),
  response_body        jsonb,
  created_at           timestamptz NOT NULL DEFAULT now(),
  completed_at         timestamptz,
  expires_at           timestamptz NOT NULL,
  CONSTRAINT idempotency_record_scope_uq UNIQUE (principal_user_id, operation, idempotency_key),
  CONSTRAINT idempotency_record_completion CHECK (
    (completed_at IS NULL AND response_status IS NULL)
    OR (completed_at IS NOT NULL AND response_status IS NOT NULL)),
  CONSTRAINT idempotency_record_expiry CHECK (expires_at > created_at)
);
CREATE INDEX idempotency_record_expires_idx ON idempotency_record (expires_at);

-- A completed record never changes; scope and fingerprint never change.
CREATE FUNCTION idempotency_record_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'idempotency_record % is completed and immutable', OLD.id USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.principal_user_id <> OLD.principal_user_id OR NEW.operation <> OLD.operation
     OR NEW.idempotency_key <> OLD.idempotency_key OR NEW.request_fingerprint <> OLD.request_fingerprint
     OR NEW.created_at <> OLD.created_at OR NEW.expires_at <> OLD.expires_at THEN
    RAISE EXCEPTION 'idempotency_record scope is immutable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER idempotency_record_guard
  BEFORE UPDATE ON idempotency_record
  FOR EACH ROW EXECUTE FUNCTION idempotency_record_guard();

REVOKE ALL ON idempotency_record FROM PUBLIC;
-- No DELETE for the API role: expired records are purged by a maintenance job (later stage) under a separate role.
GRANT SELECT, INSERT, UPDATE ON idempotency_record TO ilumin_app;
