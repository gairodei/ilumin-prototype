# ADR 0008: Browser sign-in with backend-managed sessions (BFF)

- Status: Accepted for Stage 1B. **The identity provider is not yet chosen; tested only against a local test issuer.**

## Decision

- **Flow.** The browser signs in with the OIDC authorization code flow and PKCE (S256), run by the backend. Provider tokens never reach the browser and are not stored: the backend uses the ID token once to identify the person, then issues its own session.
  - `GET /v1/auth/login?returnTo=` sends the browser to the provider with random `state`, `nonce` and a PKCE challenge. The database keeps `SHA-256(state)`, `SHA-256(nonce)` and the challenge. The **verifier** lives only in a short-lived `__Host-ilumin_login` cookie (HttpOnly, Secure, SameSite=Lax, 10 min).
  - `GET /v1/auth/callback` validates, in order:
    - the per-IP failure limit;
    - `state` and the login cookie, consumed atomically, so a replay finds the attempt used and a callback opened in another browser has no cookie;
    - attempt expiry (database clock);
    - the RFC 9207 `iss` parameter;
    - the code exchange (confidential client, `client_secret_basic`, with the verifier);
    - the ID token: signature against the provider JWKS, asymmetric algorithm allow-list, `iss`, `aud` = client id (`azp` when several audiences), `exp`/`iat`, `sub`, and the nonce hash.
  - The identity maps to an existing user exactly as for bearer tokens (ADR 0004); nothing is auto-provisioned.
  - Every failure returns the same `400 LOGIN_FAILED`. The reason is logged and audited (`auth.login_failed`), never shown.
- **Sessions** (`auth_session`).
  - The cookie `__Host-ilumin_session` holds a 256-bit random secret; the database stores only its SHA-256.
  - Cookie attributes: HttpOnly, Secure, SameSite=Lax by default, Path=/, no Domain.
  - Validity is decided by the **database clock**: not revoked, before the idle expiry (30 min, extended at most once a minute) and before the absolute expiry (12 h).
  - **Rotation.** After 15 minutes the next request gets a new secret through a compare-and-swap. The previous secret stays valid for 30 s so that parallel requests already in flight still succeed.
  - **Fixation.** Sessions are created only after a verified sign-in, and any session cookie presented at sign-in is revoked first.
- **Revocation.**
  - Logout (`POST /v1/auth/logout`, CSRF-protected) revokes the session server-side.
  - Suspension or deactivation revokes every session of the user in the same transaction.
  - Authentication re-checks the account status on every request and revokes sessions if a status change missed a path.
  - Roles and scopes are re-read on every request.
- **CSRF.** Every cookie-authenticated request with an unsafe method must pass two checks:
  - `Origin` is present and is one of the trusted origins (`CORS_ALLOWED_ORIGINS` plus the API's own origin);
  - `X-CSRF-Token` equals `HMAC-SHA256(session secret, "ilumin.csrf.v1")`.

  The token is derived, never stored. It is returned by `GET /v1/auth/session` and, after rotation, in an `X-CSRF-Token` response header. Refusals are audited (`auth.csrf_refused`).
- **CORS.** Exact origins only, and `credentials: true` only when sessions are enabled. Wildcards are refused by configuration.
- **Bearer tokens** remain available for non-browser clients, but only with `AUTH_BEARER_ENABLED=true`. They are exempt from CSRF because browsers never attach them automatically. With bearer disabled, an `Authorization` header is refused.
- **Production configuration refuses:**
  - a public client (no secret);
  - non-Secure cookies;
  - http redirect URIs or redirect origins;
  - wildcard redirect origins.

## Why

The P10 target (§C row 1, S-02, S-14) is server sessions in HttpOnly cookies with revocation, CSRF protection and MFA at the provider. A BFF keeps every token out of JavaScript, so nothing is kept in `localStorage`. A derived CSRF token needs no extra storage and dies with the session secret.

## Consequences

- Operational defaults (timeouts, rotation, retention) are configuration, **not Academy policy**. Staff may need a shorter idle timeout (P10 S-14).
- The provider's own session is not ended by our logout. The logout response includes the provider's `end_session_endpoint` URL when it is published, so the frontend can send the browser there.
- A second sign-in in another tab replaces the login cookie, and the first tab's callback then fails. This is acceptable and documented.
- **Real-provider sign-in is not verified.** It must be tested with the chosen provider, including MFA, before any claim that sign-in works.
