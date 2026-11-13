-- 0006 Transactional outbox and database-backed jobs (Stage 1B; ADR 0010)
--
-- outbox_message: written in the same transaction as the state change that causes it. Workers claim rows with
-- FOR UPDATE SKIP LOCKED and a lease; delivery happens outside any transaction; completion is fenced by the attempt
-- number, so a worker whose lease expired cannot overwrite a newer attempt. Delivery is at-least-once: consumers must be
-- idempotent (outbox_consumption, or the provider's own idempotency key = dedupe_key).
--
-- job_run: one row per durable job execution, identified by (job_name, run_key). Re-scheduling the same run is a no-op.
-- Times are timestamptz (UTC instants) taken from the database clock, never from a client.
--
-- States:
--   outbox_message: pending → processing → delivered | failed (retry scheduled) | dead_letter (attempts exhausted)
--   job_run:        pending → running    → succeeded | failed (retry scheduled) | dead        (attempts exhausted)

CREATE TABLE outbox_message (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic             text NOT NULL CHECK (topic ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  dedupe_key        text NOT NULL CHECK (length(dedupe_key) BETWEEN 1 AND 300),
  payload           jsonb NOT NULL DEFAULT '{}'::jsonb,
  state             text NOT NULL DEFAULT 'pending'
                      CHECK (state IN ('pending', 'processing', 'delivered', 'failed', 'dead_letter')),
  attempts          integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts      integer NOT NULL DEFAULT 8 CHECK (max_attempts BETWEEN 1 AND 100),
  available_at      timestamptz NOT NULL DEFAULT now(),
  locked_by         text CHECK (length(locked_by) <= 200),
  locked_until      timestamptz,
  last_error        text CHECK (length(last_error) <= 2000),
  last_attempt_at   timestamptz,
  delivered_at      timestamptz,
  dead_lettered_at  timestamptz,
  request_id        text,
  correlation_id    text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT outbox_message_dedupe_uq UNIQUE (topic, dedupe_key),
  CONSTRAINT outbox_message_lease CHECK ((state = 'processing') = (locked_by IS NOT NULL AND locked_until IS NOT NULL)),
  CONSTRAINT outbox_message_delivered CHECK ((state = 'delivered') = (delivered_at IS NOT NULL)),
  CONSTRAINT outbox_message_dead CHECK ((state = 'dead_letter') = (dead_lettered_at IS NOT NULL))
);
CREATE INDEX outbox_message_ready_idx ON outbox_message (available_at, id) WHERE state IN ('pending', 'failed');
CREATE INDEX outbox_message_lease_idx ON outbox_message (locked_until) WHERE state = 'processing';
CREATE INDEX outbox_message_delivered_idx ON outbox_message (delivered_at) WHERE state = 'delivered';

-- Idempotent-consumer record: a consumer that applies an effect inside this database inserts (consumer, message_id) in
-- the same transaction as the effect. A second delivery of the same message hits the primary key and does nothing.
CREATE TABLE outbox_consumption (
  consumer     text NOT NULL CHECK (consumer ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$'),
  message_id   uuid NOT NULL REFERENCES outbox_message (id) ON DELETE CASCADE,
  consumed_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (consumer, message_id)
);

CREATE TABLE job_run (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name       text NOT NULL CHECK (job_name ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)+$'),
  run_key        text NOT NULL CHECK (length(run_key) BETWEEN 1 AND 300),
  payload        jsonb NOT NULL DEFAULT '{}'::jsonb,
  scheduled_for  timestamptz NOT NULL,
  state          text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'running', 'succeeded', 'failed', 'dead')),
  attempts       integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  max_attempts   integer NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 100),
  available_at   timestamptz NOT NULL,
  locked_by      text CHECK (length(locked_by) <= 200),
  locked_until   timestamptz,
  last_error     text CHECK (length(last_error) <= 2000),
  started_at     timestamptz,
  finished_at    timestamptz,
  result         jsonb,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT job_run_identity_uq UNIQUE (job_name, run_key),
  CONSTRAINT job_run_lease CHECK ((state = 'running') = (locked_by IS NOT NULL AND locked_until IS NOT NULL)),
  CONSTRAINT job_run_finished CHECK ((state IN ('succeeded', 'dead')) = (finished_at IS NOT NULL))
);
CREATE INDEX job_run_ready_idx ON job_run (available_at, id) WHERE state IN ('pending', 'failed');
CREATE INDEX job_run_lease_idx ON job_run (locked_until) WHERE state = 'running';
CREATE INDEX job_run_finished_idx ON job_run (finished_at) WHERE state = 'succeeded';

-- No DELETE for the API / worker role. Retention is applied by the definer functions below only.
GRANT SELECT, INSERT, UPDATE ON outbox_message, job_run TO ilumin_app;
GRANT SELECT, INSERT ON outbox_consumption TO ilumin_app;

-- Deletes delivered outbox messages older than retention_days (and their consumption rows). Dead letters, pending and
-- failed messages are never purged automatically. Note: a dedupe_key protects against duplicates only while its row
-- is retained; business-level "sent once" guarantees belong in domain tables.
CREATE FUNCTION purge_delivered_outbox_messages(retention_days integer, max_rows integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  n integer;
BEGIN
  IF retention_days IS NULL OR retention_days < 1 OR retention_days > 3650 THEN
    RAISE EXCEPTION 'retention_days must be between 1 and 3650';
  END IF;
  IF max_rows IS NULL OR max_rows < 1 OR max_rows > 10000 THEN
    RAISE EXCEPTION 'max_rows must be between 1 and 10000';
  END IF;
  WITH doomed AS (
    SELECT id FROM public.outbox_message
     WHERE state = 'delivered' AND delivered_at < now() - make_interval(days => retention_days)
     ORDER BY delivered_at LIMIT max_rows FOR UPDATE SKIP LOCKED)
  DELETE FROM public.outbox_message m USING doomed WHERE m.id = doomed.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$$;
REVOKE ALL ON FUNCTION purge_delivered_outbox_messages(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_delivered_outbox_messages(integer, integer) TO ilumin_app;

-- Deletes succeeded job runs older than retention_days. Failed and dead runs stay until an operator deals with them.
CREATE FUNCTION purge_finished_job_runs(retention_days integer, max_rows integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  n integer;
BEGIN
  IF retention_days IS NULL OR retention_days < 1 OR retention_days > 3650 THEN
    RAISE EXCEPTION 'retention_days must be between 1 and 3650';
  END IF;
  IF max_rows IS NULL OR max_rows < 1 OR max_rows > 10000 THEN
    RAISE EXCEPTION 'max_rows must be between 1 and 10000';
  END IF;
  WITH doomed AS (
    SELECT id FROM public.job_run
     WHERE state = 'succeeded' AND finished_at < now() - make_interval(days => retention_days)
     ORDER BY finished_at LIMIT max_rows FOR UPDATE SKIP LOCKED)
  DELETE FROM public.job_run j USING doomed WHERE j.id = doomed.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$$;
REVOKE ALL ON FUNCTION purge_finished_job_runs(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_finished_job_runs(integer, integer) TO ilumin_app;
