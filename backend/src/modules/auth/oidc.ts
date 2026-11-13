import {
  createRemoteJWKSet,
  decodeProtectedHeader,
  errors as joseErrors,
  jwtVerify,
  type JWTPayload,
  type JWTVerifyGetKey,
} from 'jose';
import type { Config } from '../../config/config.js';

/**
 * OIDC resource-server token verification (ADR 0004).
 *  - Provider metadata from {issuer}/.well-known/openid-configuration; its "issuer" must equal the configured issuer
 *    exactly, and jwks_uri must be https (unless the local-test flag is on, which production config refuses).
 *  - Signature against the provider JWKS (cached, refreshed on unknown kid, with jose's cooldown).
 *  - Asymmetric algorithms from an allow-list only; "none" and HS* are refused before verification.
 *  - iss, aud, exp, nbf and iat are checked with a bounded clock tolerance; "sub" is required.
 *  - Only the verified (issuer, subject) and the email / email_verified claims are used. Role claims are ignored.
 */

export interface VerifiedIdentity {
  issuer: string;
  subject: string;
  email?: string;
  emailVerified: boolean;
}

export type TokenRejection =
  | 'malformed'
  | 'algorithm_not_allowed'
  | 'invalid_signature'
  | 'unknown_key'
  | 'expired'
  | 'not_yet_valid'
  | 'invalid_claims'
  | 'missing_subject';

export class TokenRejectedError extends Error {
  constructor(public readonly reason: TokenRejection) {
    super(`token rejected: ${reason}`);
    this.name = 'TokenRejectedError';
  }
}

/** The identity provider (discovery or JWKS) could not be reached: verification is impossible, so the request fails closed. */
export class IdentityProviderUnavailableError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'IdentityProviderUnavailableError';
  }
}

export interface TokenVerifier {
  verify(token: string): Promise<VerifiedIdentity>;
  /** Readiness: true once provider metadata has been loaded successfully. Tries to load it if not. */
  ready(): Promise<boolean>;
}

/** Provider metadata used by the browser sign-in flow (authorization code + PKCE). */
export interface ProviderMetadata {
  issuer: string;
  jwksUri: string;
  authorizationEndpoint?: string;
  tokenEndpoint?: string;
  endSessionEndpoint?: string;
  codeChallengeMethods?: string[];
}

/** The loaded provider: metadata plus its key set. Shared by access-token and ID-token verification. */
export interface ProviderSource {
  provider(): Promise<{ metadata: ProviderMetadata; keys: JWTVerifyGetKey }>;
}

interface DiscoveryDocument {
  issuer: string;
  jwks_uri: string;
  authorization_endpoint?: unknown;
  token_endpoint?: unknown;
  end_session_endpoint?: unknown;
  code_challenge_methods_supported?: unknown;
}

const MAX_TOKEN_LENGTH = 16 * 1024;
const DISCOVERY_RETRY_MS = 10_000;

export class OidcTokenVerifier implements TokenVerifier, ProviderSource {
  private keys: JWTVerifyGetKey | null = null;
  private metadata: ProviderMetadata | null = null;
  private loading: Promise<JWTVerifyGetKey> | null = null;
  private lastFailureAt = 0;

  constructor(
    private readonly cfg: Config['oidc'],
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  private discoveryUrl(): string {
    return `${this.cfg.issuer.replace(/\/+$/, '')}/.well-known/openid-configuration`;
  }

  private assertSecureUrl(u: URL, what: string): void {
    if (u.protocol !== 'https:' && !(this.cfg.allowInsecureHttp && u.protocol === 'http:')) {
      throw new IdentityProviderUnavailableError(`${what} must use https`);
    }
  }

  private async load(): Promise<JWTVerifyGetKey> {
    if (this.keys) return this.keys;
    if (this.loading) return this.loading;
    if (Date.now() - this.lastFailureAt < DISCOVERY_RETRY_MS && this.lastFailureAt !== 0) {
      throw new IdentityProviderUnavailableError('identity provider discovery failed recently; retrying shortly');
    }
    this.loading = (async () => {
      const url = new URL(this.discoveryUrl());
      this.assertSecureUrl(url, 'OIDC discovery URL');
      let doc: DiscoveryDocument;
      try {
        const res = await this.fetchImpl(url, {
          signal: AbortSignal.timeout(this.cfg.discoveryTimeoutMs),
          headers: { accept: 'application/json' },
          redirect: 'error',
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        doc = (await res.json()) as DiscoveryDocument;
      } catch (err) {
        throw new IdentityProviderUnavailableError('OIDC discovery document could not be fetched', { cause: err });
      }
      if (typeof doc?.issuer !== 'string' || doc.issuer !== this.cfg.issuer) {
        throw new IdentityProviderUnavailableError(
          'OIDC discovery "issuer" does not exactly match OIDC_ISSUER (check trailing slashes)',
        );
      }
      if (typeof doc.jwks_uri !== 'string') throw new IdentityProviderUnavailableError('OIDC discovery has no jwks_uri');
      const jwksUrl = new URL(doc.jwks_uri);
      this.assertSecureUrl(jwksUrl, 'OIDC jwks_uri');
      const endpoint = (v: unknown, what: string): string | undefined => {
        if (typeof v !== 'string') return undefined;
        let u: URL;
        try {
          u = new URL(v);
        } catch {
          throw new IdentityProviderUnavailableError(`${what} is not a valid URL`);
        }
        this.assertSecureUrl(u, what);
        return u.toString();
      };
      const authorizationEndpoint = endpoint(doc.authorization_endpoint, 'OIDC authorization_endpoint');
      const tokenEndpoint = endpoint(doc.token_endpoint, 'OIDC token_endpoint');
      const endSessionEndpoint = endpoint(doc.end_session_endpoint, 'OIDC end_session_endpoint');
      this.metadata = {
        issuer: doc.issuer,
        jwksUri: jwksUrl.toString(),
        ...(authorizationEndpoint ? { authorizationEndpoint } : {}),
        ...(tokenEndpoint ? { tokenEndpoint } : {}),
        ...(endSessionEndpoint ? { endSessionEndpoint } : {}),
        ...(Array.isArray(doc.code_challenge_methods_supported)
          ? { codeChallengeMethods: doc.code_challenge_methods_supported.filter((m): m is string => typeof m === 'string') }
          : {}),
      };
      const keys = createRemoteJWKSet(jwksUrl, {
        timeoutDuration: this.cfg.discoveryTimeoutMs,
        cooldownDuration: 30_000,
        cacheMaxAge: 10 * 60_000,
      });
      this.keys = keys;
      return keys;
    })();
    try {
      return await this.loading;
    } catch (err) {
      this.lastFailureAt = Date.now();
      throw err;
    } finally {
      this.loading = null;
    }
  }

  async provider(): Promise<{ metadata: ProviderMetadata; keys: JWTVerifyGetKey }> {
    const keys = await this.load();
    return { metadata: this.metadata!, keys };
  }

  async ready(): Promise<boolean> {
    try {
      await this.load();
      return true;
    } catch {
      return false;
    }
  }

  async verify(token: string): Promise<VerifiedIdentity> {
    if (!token || token.length > MAX_TOKEN_LENGTH || token.split('.').length !== 3) {
      throw new TokenRejectedError('malformed');
    }
    let header: ReturnType<typeof decodeProtectedHeader>;
    try {
      header = decodeProtectedHeader(token);
    } catch {
      throw new TokenRejectedError('malformed');
    }
    if (typeof header.alg !== 'string' || !this.cfg.algorithms.includes(header.alg)) {
      throw new TokenRejectedError('algorithm_not_allowed');
    }
    if (this.cfg.audiences.length === 0) throw new TokenRejectedError('invalid_claims'); // bearer mode not configured
    const keys = await this.load();
    let payload: JWTPayload;
    try {
      ({ payload } = await jwtVerify(token, keys, {
        issuer: this.cfg.issuer,
        audience: this.cfg.audiences,
        algorithms: this.cfg.algorithms,
        clockTolerance: this.cfg.clockToleranceSeconds,
        requiredClaims: ['exp', 'iat', 'sub'],
        ...(this.cfg.requiredTokenType ? { typ: this.cfg.requiredTokenType } : {}),
      }));
    } catch (err) {
      throw this.mapError(err);
    }
    if (typeof payload.sub !== 'string' || payload.sub.length === 0 || payload.sub.length > 255) {
      throw new TokenRejectedError('missing_subject');
    }
    const email = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : undefined;
    return {
      issuer: this.cfg.issuer,
      subject: payload.sub,
      ...(email ? { email } : {}),
      emailVerified: payload.email_verified === true,
    };
  }

  mapError(err: unknown): Error {
    if (err instanceof joseErrors.JWTExpired) return new TokenRejectedError('expired');
    if (err instanceof joseErrors.JWTClaimValidationFailed) {
      return new TokenRejectedError(err.claim === 'nbf' ? 'not_yet_valid' : err.claim === 'sub' ? 'missing_subject' : 'invalid_claims');
    }
    if (err instanceof joseErrors.JWSSignatureVerificationFailed) return new TokenRejectedError('invalid_signature');
    if (err instanceof joseErrors.JWKSNoMatchingKey || err instanceof joseErrors.JWKSMultipleMatchingKeys) {
      return new TokenRejectedError('unknown_key');
    }
    if (err instanceof joseErrors.JOSEAlgNotAllowed) return new TokenRejectedError('algorithm_not_allowed');
    if (err instanceof joseErrors.JWKSTimeout) {
      return new IdentityProviderUnavailableError('identity provider key set timed out', { cause: err });
    }
    if (err instanceof joseErrors.JWTInvalid || err instanceof joseErrors.JWSInvalid || err instanceof joseErrors.JOSENotSupported) {
      return new TokenRejectedError('malformed');
    }
    if (err instanceof joseErrors.JWKSInvalid) {
      return new IdentityProviderUnavailableError('identity provider key set is invalid', { cause: err });
    }
    // Network errors fetching the JWKS surface as generic errors: verification is impossible, fail closed (503).
    return new IdentityProviderUnavailableError('identity provider key set could not be fetched', { cause: err });
  }
}
