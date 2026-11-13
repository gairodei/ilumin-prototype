-- 0004 Idempotency lifecycle (Stage 1B; ADR 0011)
--
-- Two retention classes:
--   response_cache — a temporary HTTP replay cache. It expires (IDEMPOTENCY_RETENTION_HOURS) and may then be purged.
--   permanent      — never expires and is never purged. Required for financial operations (route.ts refuses to register
--                    a financial operation with any other class).
-- Neither class is the financial uniqueness guarantee on its own. Stage 2 domain tables carry their own UNIQUE business
-- keys (provider payment id, entitlement consumption, reservation key), so even a purged response cache can never let a
-- financial effect happen twice (docs/production-transaction-rules.md §4).
--
-- Purging: the API role has no DELETE privilege. It may only call purge_expired_idempotency_records(), a SECURITY
-- DEFINER function that deletes completed, expired response-cache rows and nothing else.

ALTER TABLE idempotency_record
  ADD COLUMN retention_class text NOT NULL DEFAULT 'response_cache'
    CONSTRAINT idempotency_record_retention_valid CHECK (retention_class IN ('response_cache', 'permanent')),
  ALTER COLUMN expires_at DROP NOT NULL,
  ADD CONSTRAINT idempotency_record_retention_expiry CHECK ((retention_class = 'permanent') = (expires_at IS NULL));

-- The guard now uses IS DISTINCT FROM (expires_at may be NULL) and also freezes the retention class.
CREATE OR REPLACE FUNCTION idempotency_record_guard() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.completed_at IS NOT NULL THEN
    RAISE EXCEPTION 'idempotency_record % is completed and immutable', OLD.id USING ERRCODE = 'insufficient_privilege';
  END IF;
  IF NEW.principal_user_id IS DISTINCT FROM OLD.principal_user_id OR NEW.operation IS DISTINCT FROM OLD.operation
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.request_fingerprint IS DISTINCT FROM OLD.request_fingerprint
     OR NEW.created_at IS DISTINCT FROM OLD.created_at OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.retention_class IS DISTINCT FROM OLD.retention_class THEN
    RAISE EXCEPTION 'idempotency_record scope is immutable' USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN NEW;
END
$$;

CREATE INDEX idempotency_record_purge_idx ON idempotency_record (expires_at)
  WHERE retention_class = 'response_cache' AND completed_at IS NOT NULL;

-- Deletes at most max_rows completed, expired response-cache records. Rows locked by another transaction are skipped
-- (SKIP LOCKED), so the purge never waits on, or races with, an operation that is using its record.
CREATE FUNCTION purge_expired_idempotency_records(max_rows integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  n integer;
BEGIN
  IF max_rows IS NULL OR max_rows < 1 OR max_rows > 10000 THEN
    RAISE EXCEPTION 'max_rows must be between 1 and 10000';
  END IF;
  WITH doomed AS (
    SELECT id FROM public.idempotency_record
     WHERE retention_class = 'response_cache' AND completed_at IS NOT NULL AND expires_at < now()
     ORDER BY expires_at
     LIMIT max_rows
     FOR UPDATE SKIP LOCKED)
  DELETE FROM public.idempotency_record r USING doomed WHERE r.id = doomed.id;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$$;

REVOKE ALL ON FUNCTION purge_expired_idempotency_records(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_expired_idempotency_records(integer) TO ilumin_app;
