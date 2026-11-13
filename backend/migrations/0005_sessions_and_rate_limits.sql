-- 0005 Browser sessions (OIDC authorization code + PKCE, backend-managed) and rate-limit counters (Stage 1B; ADR 0008, 0009)
--
-- Only hashes of browser-held secrets are stored:
--   auth_login_attempt.state_hash      SHA-256 of the OAuth "state" sent to the provider
--   auth_login_attempt.code_challenge  the PKCE S256 challenge; the verifier lives only in the browser's login cookie
--   auth_login_attempt.nonce_hash      SHA-256 of the OIDC nonce
--   auth_session.secret_hash           SHA-256 of the session cookie value
-- No provider access, refresh or ID tokens are stored.

CREATE TABLE auth_login_attempt (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  state_hash      bytea NOT NULL CHECK (length(state_hash) = 32),
  code_challenge  text NOT NULL CHECK (code_challenge ~ '^[A-Za-z0-9_-]{43}$'),
  nonce_hash      bytea NOT NULL CHECK (length(nonce_hash) = 32),
  return_to       text NOT NULL CHECK (length(return_to) BETWEEN 1 AND 2048),
  client_ip       inet,
  created_at      timestamptz NOT NULL DEFAULT now(),
  expires_at      timestamptz NOT NULL,
  consumed_at     timestamptz,
  CONSTRAINT auth_login_attempt_state_uq UNIQUE (state_hash),
  CONSTRAINT auth_login_attempt_expiry CHECK (expires_at > created_at)
);
CREATE INDEX auth_login_attempt_expires_idx ON auth_login_attempt (expires_at);

CREATE TABLE auth_session (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES app_user (id) ON DELETE RESTRICT,
  issuer                text NOT NULL CHECK (length(issuer) BETWEEN 1 AND 500),
  subject               text NOT NULL CHECK (length(subject) BETWEEN 1 AND 255),
  secret_hash           bytea NOT NULL CHECK (length(secret_hash) = 32),
  -- After rotation the previous secret is accepted for a short grace period (parallel requests in flight).
  previous_secret_hash  bytea CHECK (previous_secret_hash IS NULL OR length(previous_secret_hash) = 32),
  previous_valid_until  timestamptz,
  created_at            timestamptz NOT NULL DEFAULT now(),
  rotated_at            timestamptz NOT NULL DEFAULT now(),
  last_seen_at          timestamptz NOT NULL DEFAULT now(),
  idle_expires_at       timestamptz NOT NULL,
  absolute_expires_at   timestamptz NOT NULL,
  revoked_at            timestamptz,
  revoked_reason        text CHECK (revoked_reason IN ('logout', 'account_inactive', 'replaced_at_login', 'administrator')),
  created_ip            inet,
  CONSTRAINT auth_session_secret_uq UNIQUE (secret_hash),
  CONSTRAINT auth_session_revocation CHECK ((revoked_at IS NULL) = (revoked_reason IS NULL)),
  CONSTRAINT auth_session_previous CHECK ((previous_secret_hash IS NULL) = (previous_valid_until IS NULL)),
  CONSTRAINT auth_session_window CHECK (absolute_expires_at > created_at AND idle_expires_at <= absolute_expires_at)
);
CREATE UNIQUE INDEX auth_session_previous_uq ON auth_session (previous_secret_hash) WHERE previous_secret_hash IS NOT NULL;
CREATE INDEX auth_session_user_active_idx ON auth_session (user_id) WHERE revoked_at IS NULL;
CREATE INDEX auth_session_expiry_idx ON auth_session (absolute_expires_at);

GRANT SELECT, INSERT, UPDATE ON auth_login_attempt, auth_session TO ilumin_app;

-- Removes login attempts that expired over a day ago, and sessions that ended (expired or revoked) more than
-- retention_days ago. Recent session history is kept for investigation; the minimum retention is one day.
CREATE FUNCTION purge_expired_auth_records(retention_days integer, max_rows integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  a integer;
  s integer;
BEGIN
  IF retention_days IS NULL OR retention_days < 1 OR retention_days > 3650 THEN
    RAISE EXCEPTION 'retention_days must be between 1 and 3650';
  END IF;
  IF max_rows IS NULL OR max_rows < 1 OR max_rows > 10000 THEN
    RAISE EXCEPTION 'max_rows must be between 1 and 10000';
  END IF;
  WITH doomed AS (
    SELECT id FROM public.auth_login_attempt WHERE expires_at < now() - interval '1 day'
     ORDER BY expires_at LIMIT max_rows FOR UPDATE SKIP LOCKED)
  DELETE FROM public.auth_login_attempt t USING doomed WHERE t.id = doomed.id;
  GET DIAGNOSTICS a = ROW_COUNT;
  WITH doomed AS (
    SELECT id FROM public.auth_session
     WHERE LEAST(COALESCE(revoked_at, 'infinity'::timestamptz), idle_expires_at, absolute_expires_at)
           < now() - make_interval(days => retention_days)
     LIMIT max_rows FOR UPDATE SKIP LOCKED)
  DELETE FROM public.auth_session t USING doomed WHERE t.id = doomed.id;
  GET DIAGNOSTICS s = ROW_COUNT;
  RETURN a + s;
END
$$;
REVOKE ALL ON FUNCTION purge_expired_auth_records(integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_expired_auth_records(integer, integer) TO ilumin_app;

-- Rate-limit counters (fixed windows, shared by every API instance). UNLOGGED: no WAL per hit, so the per-request cost
-- stays low; counters are lost after a crash or failover, which only resets the current windows (ADR 0009).
-- key_hash is SHA-256 of the limiter key, so client IP addresses are not stored in clear.
CREATE UNLOGGED TABLE rate_limit_counter (
  key_hash        bytea NOT NULL CHECK (length(key_hash) = 32),
  window_start    timestamptz NOT NULL,
  window_seconds  integer NOT NULL CHECK (window_seconds BETWEEN 1 AND 86400),
  hits            integer NOT NULL CHECK (hits >= 0),
  PRIMARY KEY (key_hash, window_start)
);
GRANT SELECT, INSERT, UPDATE ON rate_limit_counter TO ilumin_app;

CREATE FUNCTION purge_expired_rate_limit_counters(max_rows integer) RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public, pg_temp AS $$
DECLARE
  n integer;
BEGIN
  IF max_rows IS NULL OR max_rows < 1 OR max_rows > 100000 THEN
    RAISE EXCEPTION 'max_rows must be between 1 and 100000';
  END IF;
  WITH doomed AS (
    SELECT key_hash, window_start FROM public.rate_limit_counter
     WHERE window_start + make_interval(secs => window_seconds) < now() - interval '1 minute'
     LIMIT max_rows FOR UPDATE SKIP LOCKED)
  DELETE FROM public.rate_limit_counter c USING doomed
   WHERE c.key_hash = doomed.key_hash AND c.window_start = doomed.window_start;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END
$$;
REVOKE ALL ON FUNCTION purge_expired_rate_limit_counters(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION purge_expired_rate_limit_counters(integer) TO ilumin_app;
