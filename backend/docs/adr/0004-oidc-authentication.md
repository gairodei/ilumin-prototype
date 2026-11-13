# ADR 0004: OIDC resource-server authentication

- Status: Accepted for Stage 1A. **The identity provider is not yet chosen.**

## Decision

- The API is an OAuth 2.0 resource server. Requests carry `Authorization: Bearer <access token>` issued by the configured OIDC provider for this API's audience.
- Verification (`src/modules/auth/oidc.ts`, using `jose`):
  - **Discovery.** Provider metadata comes from `{OIDC_ISSUER}/.well-known/openid-configuration`. Its `issuer` must equal `OIDC_ISSUER` exactly, and `jwks_uri` must be https.
  - **Signature.** The token is checked against the provider JWKS. Keys are cached, refreshed on an unknown `kid`, with a cooldown.
  - **Algorithms.** Only asymmetric algorithms from an allow-list are accepted. `none` and `HS*` are refused before verification and cannot be configured.
  - **Claims.** `iss`, `aud`, `exp`, `nbf` and `iat` are checked with tolerance ≤ 120 s (default 30 s). `sub` is required. `typ` is optional (`OIDC_REQUIRED_TOKEN_TYPE=at+jwt`).
  - **Provider down.** If discovery or the JWKS cannot be reached, the request gets **503**, not 401, and is never allowed.
- **Identity mapping**: the verified `(issuer, sub)` is looked up in `user_identity`. Nothing is auto-provisioned. An unknown identity gets `403 ACCOUNT_NOT_PROVISIONED`. Identities are linked in one of three ways:
  - an administrator provisions the user with the provider subject (`POST /v1/admin/users`, `identitySubject`);
  - optionally, a provider-verified email at first sign-in (`OIDC_LINK_BY_VERIFIED_EMAIL=true`, off by default). This works only for an active user with no identity from that issuer, and the link is audited;
  - the one-time CLI bootstrap of the first Super Administrator.
- **Authority**: roles, scopes and agency membership come only from the database, re-read on every request. Role or group claims in tokens are ignored (tested). Deactivation, suspension and role removal take effect on the next request.
- **No fallback**: there is no development bypass, header identity, mock provider or password table. Tests use a local issuer that the real verifier checks through the full discovery, JWKS and signature path. It exists only inside the test process.

## Not in Stage 1A

- **Browser sign-in.** The authorization-code flow with PKCE is not built. The recommended shape is a backend-for-frontend issuing an http-only, `SameSite` session cookie with CSRF protection (P10 S-14). Today the API accepts bearer tokens only.
- **Provider-side controls.** MFA, lockout and password policy are provider configuration (P10 §C row 1).
- **Token revocation and introspection.** Short access-token lifetimes are relied on.
