import { createHash, timingSafeEqual } from 'node:crypto';
import { decodeProtectedHeader, errors as joseErrors, jwtVerify, type JWTPayload } from 'jose';
import type { Config, SessionAuthConfig } from '../../config/config.js';
import { IdentityProviderUnavailableError, type ProviderSource, type VerifiedIdentity } from './oidc.js';

/**
 * Browser sign-in against the configured OIDC provider (ADR 0008): authorization code flow with PKCE (S256), run by the
 * backend. The browser never receives provider tokens; the backend exchanges the code, verifies the ID token, and then
 * issues its own session cookie.
 *
 * ID-token checks: signature against the provider JWKS, allowed asymmetric algorithms only, iss = configured issuer,
 * aud contains our client id (and azp = client id when several audiences are present), exp / iat with bounded clock
 * tolerance, sub present, and the nonce equal to the one bound to this login attempt.
 */

export type LoginRejection =
  | 'provider_error'
  | 'issuer_mismatch'
  | 'code_rejected'
  | 'token_response_invalid'
  | 'id_token_invalid'
  | 'id_token_expired'
  | 'nonce_mismatch';

export class LoginRejectedError extends Error {
  constructor(public readonly reason: LoginRejection) {
    super(`login rejected: ${reason}`);
    this.name = 'LoginRejectedError';
  }
}

const sha256 = (s: string) => createHash('sha256').update(s).digest();

export class OidcLoginClient {
  constructor(
    private readonly oidc: Config['oidc'],
    private readonly session: SessionAuthConfig,
    private readonly source: ProviderSource,
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  /** The provider's authorization URL for this attempt. Fails closed (503) when the provider metadata is unusable. */
  async authorizationUrl(p: { state: string; nonce: string; codeChallenge: string }): Promise<string> {
    const { metadata } = await this.source.provider();
    if (!metadata.authorizationEndpoint || !metadata.tokenEndpoint) {
      throw new IdentityProviderUnavailableError('provider metadata has no authorization or token endpoint');
    }
    if (metadata.codeChallengeMethods && !metadata.codeChallengeMethods.includes('S256')) {
      throw new IdentityProviderUnavailableError('provider does not support PKCE S256');
    }
    const u = new URL(metadata.authorizationEndpoint);
    u.searchParams.set('response_type', 'code');
    u.searchParams.set('client_id', this.session.clientId);
    u.searchParams.set('redirect_uri', this.session.redirectUri);
    u.searchParams.set('scope', this.session.scopes.join(' '));
    u.searchParams.set('state', p.state);
    u.searchParams.set('nonce', p.nonce);
    u.searchParams.set('code_challenge', p.codeChallenge);
    u.searchParams.set('code_challenge_method', 'S256');
    return u.toString();
  }

  /** RFC 9207: when the provider returns "iss" on the callback, it must be our issuer (mix-up defence). */
  checkCallbackIssuer(iss: string | undefined): void {
    if (iss !== undefined && iss !== this.oidc.issuer) throw new LoginRejectedError('issuer_mismatch');
  }

  /** Exchanges the authorization code (with the PKCE verifier) for tokens. Only the ID token is used. */
  async exchangeCode(code: string, codeVerifier: string): Promise<string> {
    const { metadata } = await this.source.provider();
    if (!metadata.tokenEndpoint) throw new IdentityProviderUnavailableError('provider metadata has no token endpoint');
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: this.session.redirectUri,
      code_verifier: codeVerifier,
    });
    const headers: Record<string, string> = {
      'content-type': 'application/x-www-form-urlencoded',
      accept: 'application/json',
    };
    if (this.session.clientSecret) {
      // client_secret_basic (RFC 6749 §2.3.1): form-urlencode both parts before base64.
      const enc = (v: string) => encodeURIComponent(v).replace(/%20/g, '+');
      headers.authorization = `Basic ${Buffer.from(`${enc(this.session.clientId)}:${enc(this.session.clientSecret)}`).toString('base64')}`;
    } else {
      form.set('client_id', this.session.clientId);
    }
    let res: Response;
    try {
      res = await this.fetchImpl(metadata.tokenEndpoint, {
        method: 'POST',
        headers,
        body: form.toString(),
        redirect: 'error',
        signal: AbortSignal.timeout(this.session.tokenTimeoutMs),
      });
    } catch (err) {
      throw new IdentityProviderUnavailableError('token endpoint could not be reached', { cause: err });
    }
    if (res.status >= 500) throw new IdentityProviderUnavailableError(`token endpoint returned HTTP ${res.status}`);
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      throw new LoginRejectedError('token_response_invalid');
    }
    if (!res.ok) throw new LoginRejectedError('code_rejected'); // invalid_grant, invalid_client, PKCE mismatch …
    const idToken = (body as { id_token?: unknown }).id_token;
    if (typeof idToken !== 'string' || idToken.length > 16 * 1024) throw new LoginRejectedError('token_response_invalid');
    return idToken;
  }

  /** Verifies the ID token and returns the identity it asserts. `nonceHash` is SHA-256 of the attempt's nonce. */
  async verifyIdToken(idToken: string, nonceHash: Buffer): Promise<VerifiedIdentity> {
    let header: ReturnType<typeof decodeProtectedHeader>;
    try {
      header = decodeProtectedHeader(idToken);
    } catch {
      throw new LoginRejectedError('id_token_invalid');
    }
    if (typeof header.alg !== 'string' || !this.oidc.algorithms.includes(header.alg)) {
      throw new LoginRejectedError('id_token_invalid');
    }
    const { keys } = await this.source.provider();
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(idToken, keys, {
        issuer: this.oidc.issuer,
        audience: this.session.clientId,
        algorithms: this.oidc.algorithms,
        clockTolerance: this.oidc.clockToleranceSeconds,
        requiredClaims: ['exp', 'iat', 'sub', 'nonce'],
      }));
    } catch (err) {
      if (err instanceof joseErrors.JWTExpired) throw new LoginRejectedError('id_token_expired');
      if (
        err instanceof joseErrors.JWTClaimValidationFailed ||
        err instanceof joseErrors.JWSSignatureVerificationFailed ||
        err instanceof joseErrors.JWKSNoMatchingKey ||
        err instanceof joseErrors.JWKSMultipleMatchingKeys ||
        err instanceof joseErrors.JOSEAlgNotAllowed ||
        err instanceof joseErrors.JWTInvalid ||
        err instanceof joseErrors.JWSInvalid ||
        err instanceof joseErrors.JOSENotSupported
      ) {
        throw new LoginRejectedError('id_token_invalid');
      }
      throw new IdentityProviderUnavailableError('identity provider key set could not be used', { cause: err });
    }
    if (Array.isArray(payload.aud) && payload.aud.length > 1 && payload.azp !== this.session.clientId) {
      throw new LoginRejectedError('id_token_invalid');
    }
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 255) {
      throw new LoginRejectedError('id_token_invalid');
    }
    if (typeof payload.nonce !== 'string' || !timingSafeEqual(sha256(payload.nonce), nonceHash)) {
      throw new LoginRejectedError('nonce_mismatch');
    }
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : undefined;
    return {
      issuer: this.oidc.issuer,
      subject: payload.sub,
      ...(email ? { email } : {}),
      emailVerified: payload.email_verified === true,
    };
  }

  /** RP-initiated logout URL at the provider, when the provider publishes one. */
  async providerLogoutUrl(): Promise<string | undefined> {
    try {
      const { metadata } = await this.source.provider();
      if (!metadata.endSessionEndpoint) return undefined;
      const u = new URL(metadata.endSessionEndpoint);
      u.searchParams.set('client_id', this.session.clientId);
      u.searchParams.set('post_logout_redirect_uri', this.session.defaultRedirect);
      return u.toString();
    } catch {
      return undefined;
    }
  }
}
