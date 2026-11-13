-- 0002 Append-only audit (Stage 1A; ADR 0006; P10 S-04)
-- Enforcement in two layers:
--   1. Privileges: the API role (ilumin_app) gets SELECT and INSERT only. UPDATE, DELETE and TRUNCATE are not granted.
--   2. Triggers: UPDATE, DELETE and TRUNCATE raise an exception for every role, including the owner. Removing the triggers
--      requires a reviewed migration (a deliberate, recorded act), never application code.

CREATE TABLE audit_event (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seq             bigint GENERATED ALWAYS AS IDENTITY,
  occurred_at     timestamptz NOT NULL DEFAULT clock_timestamp(),
  actor_type      text NOT NULL CHECK (actor_type IN ('user', 'system')),
  actor_user_id   uuid REFERENCES app_user (id) ON DELETE RESTRICT,
  actor_label     text,
  actor_roles     text[] NOT NULL DEFAULT '{}',
  actor_scope     jsonb NOT NULL DEFAULT '{}'::jsonb,
  operation       text NOT NULL CHECK (operation ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  outcome         text NOT NULL CHECK (outcome IN ('succeeded', 'refused')),
  entity_type     text NOT NULL CHECK (length(entity_type) BETWEEN 1 AND 100),
  entity_id       text,
  request_id      text,
  correlation_id  text,
  client_ip       inet,
  before_state    jsonb,
  after_state     jsonb,
  reason          text,
  metadata        jsonb NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT audit_event_seq_uq UNIQUE (seq),
  CONSTRAINT audit_event_actor_consistent CHECK (
    (actor_type = 'user' AND actor_user_id IS NOT NULL)
    OR (actor_type = 'system' AND actor_user_id IS NULL AND actor_label IS NOT NULL))
);
CREATE INDEX audit_event_entity_idx ON audit_event (entity_type, entity_id, occurred_at);
CREATE INDEX audit_event_actor_idx ON audit_event (actor_user_id, occurred_at);
CREATE INDEX audit_event_time_idx ON audit_event (occurred_at);
CREATE INDEX audit_event_request_idx ON audit_event (request_id);

CREATE FUNCTION audit_event_refuse_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'audit_event is append-only: % is not permitted', TG_OP
    USING ERRCODE = 'insufficient_privilege';
END
$$;

CREATE TRIGGER audit_event_no_update_delete
  BEFORE UPDATE OR DELETE ON audit_event
  FOR EACH ROW EXECUTE FUNCTION audit_event_refuse_change();

CREATE TRIGGER audit_event_no_truncate
  BEFORE TRUNCATE ON audit_event
  FOR EACH STATEMENT EXECUTE FUNCTION audit_event_refuse_change();

REVOKE ALL ON audit_event FROM PUBLIC;
GRANT SELECT, INSERT ON audit_event TO ilumin_app;
