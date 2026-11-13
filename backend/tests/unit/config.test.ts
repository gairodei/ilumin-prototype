import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../src/config/config.js';

const base = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgres://api:pw@127.0.0.1:5432/ilumin',
  DATABASE_SSL: 'disable',
  OIDC_ISSUER: 'https://idp.example.com/',
  OIDC_AUDIENCE: 'https://api.example.com',
  AUTH_BEARER_ENABLED: 'true',
} satisfies NodeJS.ProcessEnv;

const prod = { ...base, NODE_ENV: 'production', DATABASE_SSL: 'verify-full' };

function issues(env: NodeJS.ProcessEnv): string[] {
  try {
    loadConfig(env);
  } catch (err) {
    if (err instanceof ConfigError) return err.issues;
    throw err;
  }
  return [];
}

describe('configuration validation', () => {
  it('accepts a minimal valid configuration and applies safe defaults', () => {
    const c = loadConfig(base);
    expect(c.port).toBe(3000);
    expect(c.host).toBe('127.0.0.1');
    expect(c.oidc.algorithms).toEqual(['RS256', 'PS256', 'ES256']);
    expect(c.oidc.linkByVerifiedEmail).toBe(false);
    expect(c.oidc.allowInsecureHttp).toBe(false);
    expect(c.cors.allowedOrigins).toEqual([]);
    expect(c.trustProxy).toBe(false);
    expect(loadConfig({ ...base, DATABASE_SSL: undefined }).database.ssl).toBe('verify-full');
  });

  it('lists every missing required variable at once, without values', () => {
    const list = issues({ NODE_ENV: 'production', AUTH_BEARER_ENABLED: 'true' });
    expect(list.some((i) => i.startsWith('DATABASE_URL'))).toBe(true);
    expect(list.some((i) => i.startsWith('OIDC_ISSUER'))).toBe(true);
    expect(list.some((i) => i.startsWith('OIDC_AUDIENCE'))).toBe(true);
  });

  it('refuses an unknown NODE_ENV and malformed numbers', () => {
    expect(issues({ ...base, NODE_ENV: 'staging' })[0]).toMatch(/^NODE_ENV/);
    expect(issues({ ...base, PORT: 'eighty' })[0]).toMatch(/^PORT/);
    expect(issues({ ...base, PORT: '70000' })[0]).toMatch(/^PORT/);
    expect(issues({ ...base, DATABASE_URL: 'mysql://x' })[0]).toMatch(/^DATABASE_URL/);
  });

  it('does not echo secrets in error messages', () => {
    const list = issues({ ...base, DATABASE_URL: 'mysql://user:SuperSecret123@host/db' }); // secret-scan: allow (deliberate fake) gitleaks:allow
    expect(list.join(' ')).not.toContain('SuperSecret123');
  });

  it('never accepts symmetric or "none" token algorithms', () => {
    expect(issues({ ...base, OIDC_ALLOWED_ALGORITHMS: 'HS256' })[0]).toMatch(/^OIDC_ALLOWED_ALGORITHMS/);
    expect(issues({ ...base, OIDC_ALLOWED_ALGORITHMS: 'none' })[0]).toMatch(/^OIDC_ALLOWED_ALGORITHMS/);
    expect(issues({ ...base, OIDC_ALLOWED_ALGORITHMS: 'RS256,HS512' })[0]).toMatch(/^OIDC_ALLOWED_ALGORITHMS/);
  });

  it('requires an https issuer unless the local-test flag is set', () => {
    expect(issues({ ...base, OIDC_ISSUER: 'http://idp.local/' })[0]).toMatch(/^OIDC_ISSUER/);
    expect(issues({ ...base, OIDC_ISSUER: 'http://idp.local/', OIDC_ALLOW_INSECURE_HTTP: 'true' })).toEqual([]);
  });

  it('refuses wildcard and malformed CORS origins', () => {
    expect(issues({ ...base, CORS_ALLOWED_ORIGINS: '*' })[0]).toMatch(/wildcards are refused/);
    expect(issues({ ...base, CORS_ALLOWED_ORIGINS: 'https://*.example.com' })[0]).toMatch(/wildcards/);
    expect(issues({ ...base, CORS_ALLOWED_ORIGINS: 'https://app.example.com/path' })[0]).toMatch(/not an exact origin/);
    expect(loadConfig({ ...base, CORS_ALLOWED_ORIGINS: 'https://a.example.com, http://localhost:5173' }).cors.allowedOrigins).toEqual([
      'https://a.example.com',
      'http://localhost:5173',
    ]);
  });

  describe('production closes development conveniences', () => {
    it('accepts a correct production configuration', () => {
      expect(issues({ ...prod, CORS_ALLOWED_ORIGINS: 'https://lms.example.com', TRUST_PROXY: '1' })).toEqual([]);
    });
    it('refuses insecure OIDC, plaintext database connections, http CORS origins and trust-all proxies', () => {
      expect(issues({ ...prod, OIDC_ALLOW_INSECURE_HTTP: 'true' }).join()).toMatch(/OIDC_ALLOW_INSECURE_HTTP: must be false/);
      expect(issues({ ...prod, DATABASE_SSL: 'disable' }).join()).toMatch(/DATABASE_SSL/);
      expect(issues({ ...prod, CORS_ALLOWED_ORIGINS: 'http://lms.example.com' }).join()).toMatch(/must use https/);
      expect(issues({ ...prod, TRUST_PROXY: 'true' }).join()).toMatch(/TRUST_PROXY/);
    });
  });

  it('parses TRUST_PROXY forms', () => {
    expect(loadConfig({ ...base, TRUST_PROXY: '2' }).trustProxy).toBe(2);
    expect(loadConfig({ ...base, TRUST_PROXY: '10.0.0.0/8, 127.0.0.1' }).trustProxy).toEqual(['10.0.0.0/8', '127.0.0.1']);
    expect(issues({ ...base, TRUST_PROXY: 'everyone' })[0]).toMatch(/^TRUST_PROXY/);
  });
});
