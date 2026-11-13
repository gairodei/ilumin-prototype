import { createHash, randomBytes } from 'node:crypto';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { exportJWK, generateKeyPair, type CryptoKey, type JWTPayload, SignJWT } from 'jose';

/**
 * A minimal, standards-shaped OIDC issuer for tests: serves a discovery document, a JWKS and a token endpoint on
 * 127.0.0.1 and mints signed tokens. It lets the real verifier and the real login client run their full paths
 * (discovery, JWKS, signature, claims; authorization code exchange with PKCE S256 and client authentication).
 * It is NOT an authentication fallback: it exists only inside the test process.
 */

export interface TestIssuer {
  issuer: string;
  audience: string;
  clientId: string;
  clientSecret: string;
  /** A token signed by the issuer's published key, with sane defaults; `claims` and `opts` override them. */
  token(sub: string, claims?: JWTPayload, opts?: TokenOptions): Promise<string>;
  /** Signs with a key that is NOT in the JWKS (same kid) — a forged token. */
  forgedToken(sub: string, claims?: JWTPayload): Promise<string>;
  /**
   * Plays the provider's authorization step: registers a one-time code for the given authorization request. The token
   * endpoint later checks redirect_uri, client authentication and PKCE (S256(code_verifier) = code_challenge).
   */
  issueCode(c: IssueCodeInput): string;
  tokenRequests(): number;
  discoveryRequests(): number;
  setDiscoveryIssuer(value: string): void;
  close(): Promise<void>;
}

export interface TokenOptions {
  issuer?: string;
  audience?: string | string[];
  expiresIn?: string | number;
  notBefore?: string | number;
  issuedAt?: number;
  typ?: string;
  omit?: Array<'exp' | 'sub' | 'iat'>;
  forged?: boolean;
}

export interface IssueCodeInput {
  sub: string;
  /** From the authorization URL the backend produced. */
  nonce: string;
  codeChallenge: string;
  redirectUri: string;
  claims?: JWTPayload;
  /** Overrides for the ID token (wrong issuer / audience / expiry / forged signature). */
  idToken?: TokenOptions;
}

export async function startTestIssuer(audience = 'https://api.ilumin.test'): Promise<TestIssuer> {
  const { privateKey, publicKey } = await generateKeyPair('RS256', { extractable: true });
  const forged = await generateKeyPair('RS256', { extractable: true });
  const kid = 'test-key-1';
  const jwk = { ...(await exportJWK(publicKey)), kid, alg: 'RS256', use: 'sig' };
  const clientId = 'ilumin-bff-test';
  const clientSecret = randomBytes(24).toString('base64url');
  let discoveryCount = 0;
  let tokenCount = 0;
  let discoveryIssuerOverride: string | null = null;
  let issuer = '';
  const codes = new Map<string, IssueCodeInput & { used: boolean }>();

  const sign = async (key: CryptoKey, sub: string, claims: JWTPayload = {}, opts: TokenOptions = {}) => {
    const omit = new Set(opts.omit ?? []);
    let jwt = new SignJWT({ ...claims }).setProtectedHeader({ alg: 'RS256', kid, ...(opts.typ ? { typ: opts.typ } : {}) });
    jwt = jwt.setIssuer(opts.issuer ?? issuer).setAudience(opts.audience ?? audience);
    if (!omit.has('sub')) jwt = jwt.setSubject(sub);
    if (!omit.has('iat')) jwt = jwt.setIssuedAt(opts.issuedAt);
    if (!omit.has('exp')) jwt = jwt.setExpirationTime(opts.expiresIn ?? '5m');
    if (opts.notBefore !== undefined) jwt = jwt.setNotBefore(opts.notBefore);
    return jwt.sign(key);
  };

  const json = (res: import('node:http').ServerResponse, status: number, body: unknown) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(JSON.stringify(body));
  };

  const server: Server = createServer((req, res) => {
    if (req.url === '/realm/.well-known/openid-configuration') {
      discoveryCount++;
      json(res, 200, {
        issuer: discoveryIssuerOverride ?? issuer,
        jwks_uri: `${issuer}/jwks`,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        end_session_endpoint: `${issuer}/logout`,
        code_challenge_methods_supported: ['S256'],
      });
      return;
    }
    if (req.url === '/realm/jwks') {
      json(res, 200, { keys: [jwk] });
      return;
    }
    if (req.url === '/realm/token' && req.method === 'POST') {
      tokenCount++;
      let raw = '';
      req.on('data', (d) => (raw += d));
      req.on('end', async () => {
        const form = new URLSearchParams(raw);
        const basic = /^Basic (.+)$/.exec(req.headers.authorization ?? '');
        const [id, secret] = basic ? Buffer.from(basic[1]!, 'base64').toString().split(':').map(decodeURIComponent) : [];
        if (id !== clientId || secret !== clientSecret) return json(res, 401, { error: 'invalid_client' });
        if (form.get('grant_type') !== 'authorization_code') return json(res, 400, { error: 'unsupported_grant_type' });
        const c = codes.get(form.get('code') ?? '');
        if (!c || c.used) return json(res, 400, { error: 'invalid_grant' });
        c.used = true; // codes are single-use
        if (form.get('redirect_uri') !== c.redirectUri) return json(res, 400, { error: 'invalid_grant' });
        const verifier = form.get('code_verifier') ?? '';
        if (createHash('sha256').update(verifier).digest('base64url') !== c.codeChallenge) {
          return json(res, 400, { error: 'invalid_grant', error_description: 'PKCE verification failed' });
        }
        const o = c.idToken ?? {};
        const idToken = await sign(o.forged ? forged.privateKey : privateKey, c.sub, { nonce: c.nonce, ...c.claims }, {
          audience: clientId,
          ...o,
        });
        json(res, 200, { access_token: 'opaque-access-token', token_type: 'Bearer', expires_in: 300, id_token: idToken });
      });
      return;
    }
    res.writeHead(404).end();
  });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  const { port } = server.address() as AddressInfo;
  issuer = `http://127.0.0.1:${port}/realm`;

  return {
    issuer,
    audience,
    clientId,
    clientSecret,
    token: (sub, claims, opts) => sign(opts?.forged ? forged.privateKey : privateKey, sub, claims, opts),
    forgedToken: (sub, claims) => sign(forged.privateKey, sub, claims),
    issueCode: (c) => {
      const code = randomBytes(16).toString('base64url');
      codes.set(code, { ...c, used: false });
      return code;
    },
    tokenRequests: () => tokenCount,
    discoveryRequests: () => discoveryCount,
    setDiscoveryIssuer: (v) => {
      discoveryIssuerOverride = v;
    },
    close: () =>
      new Promise<void>((r) => {
        server.closeAllConnections?.();
        server.close(() => r());
      }),
  };
}

/** base64url without padding */
export const b64u = (s: string | Buffer) => Buffer.from(s).toString('base64url');
