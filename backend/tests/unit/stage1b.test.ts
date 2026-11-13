import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../../src/config/config.js';
import { redactAuditValue } from '../../src/modules/audit/routes.js';
import { safeReturnTo } from '../../src/modules/auth/routes.js';
import { csrfMatches, csrfTokenFor, newSecret, SECRET_RE } from '../../src/modules/auth/session.js';
import { parseCookies, serializeCookie } from '../../src/shared/cookies.js';
import { MemoryRateLimiter } from '../../src/shared/rate-limit.js';

const base = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgres://api:pw@127.0.0.1:5432/ilumin',
  DATABASE_SSL: 'disable',
  OIDC_ISSUER: 'https://idp.example.com/',
  AUTH_SESSION_ENABLED: 'true',
  OIDC_CLIENT_ID: 'ilumin-bff',
  OIDC_CLIENT_SECRET: 'placeholder',
  OIDC_REDIRECT_URI: 'https://api.example.com/v1/auth/callback',
  AUTH_DEFAULT_REDIRECT: 'https://app.example.com/',
  AUTH_REDIRECT_ORIGINS: 'https://app.example.com',
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

describe('session configuration', () => {
  it('applies secure defaults: __Host- cookies, SameSite=Lax, 30 min idle, 12 h absolute, 15 min rotation', () => {
    const s = loadConfig(base).auth.session!;
    expect(s.cookie).toEqual({ sessionName: '__Host-ilumin_session', loginName: '__Host-ilumin_login', secure: true, sameSite: 'Lax' });
    expect([s.idleMinutes, s.absoluteHours, s.rotationMinutes, s.rotationGraceSeconds]).toEqual([30, 12, 15, 30]);
    expect(s.trustedOrigins).toEqual(['https://api.example.com']);
    expect(loadConfig(base).auth.bearerEnabled).toBe(false);
  });

  it('requires at least one authentication mode, and an audience for bearer', () => {
    expect(issues({ ...base, AUTH_SESSION_ENABLED: 'false' }).join()).toMatch(/enable at least one authentication mode/);
    expect(issues({ ...base, AUTH_BEARER_ENABLED: 'true' }).join()).toMatch(/OIDC_AUDIENCE: is required when AUTH_BEARER_ENABLED/);
  });

  it('lists every missing session setting', () => {
    const list = issues({ ...base, OIDC_CLIENT_ID: '', OIDC_REDIRECT_URI: '', AUTH_DEFAULT_REDIRECT: '', AUTH_REDIRECT_ORIGINS: '' });
    for (const k of ['OIDC_CLIENT_ID', 'OIDC_REDIRECT_URI', 'AUTH_DEFAULT_REDIRECT', 'AUTH_REDIRECT_ORIGINS']) {
      expect(list.some((i) => i.startsWith(k))).toBe(true);
    }
  });

  it('refuses wildcard / malformed redirect origins and a default redirect outside the allow-list', () => {
    expect(issues({ ...base, AUTH_REDIRECT_ORIGINS: 'https://*.example.com' }).join()).toMatch(/wildcards are refused/);
    expect(issues({ ...base, AUTH_REDIRECT_ORIGINS: 'https://app.example.com/path' }).join()).toMatch(/not an exact origin/);
    expect(issues({ ...base, AUTH_DEFAULT_REDIRECT: 'https://other.example.com/' }).join()).toMatch(/must be listed in AUTH_REDIRECT_ORIGINS/);
    expect(issues({ ...base, OIDC_SCOPES: 'email profile' }).join()).toMatch(/must include "openid"/);
  });

  it('production refuses insecure cookies, a public client, http redirects and the capture transport', () => {
    expect(issues(prod)).toEqual([]);
    expect(issues({ ...prod, SESSION_COOKIE_SECURE: 'false' }).join()).toMatch(/SESSION_COOKIE_SECURE: must be true/);
    expect(issues({ ...prod, OIDC_CLIENT_SECRET: '' }).join()).toMatch(/OIDC_CLIENT_SECRET: is required in production/);
    expect(issues({ ...prod, OIDC_REDIRECT_URI: 'http://api.example.com/cb' }).join()).toMatch(/must use https in production/);
    expect(issues({ ...prod, AUTH_REDIRECT_ORIGINS: 'http://app.example.com', AUTH_DEFAULT_REDIRECT: 'http://app.example.com/' }).join()).toMatch(
      /must use https in production/,
    );
    expect(issues({ ...prod, NOTIFICATION_TRANSPORT: 'capture' }).join()).toMatch(/refused in production/);
  });

  it('SameSite=None needs Secure; a cookie Domain drops the __Host- prefix', () => {
    expect(issues({ ...base, SESSION_COOKIE_SAMESITE: 'none', SESSION_COOKIE_SECURE: 'false' }).join()).toMatch(/requires SESSION_COOKIE_SECURE/);
    expect(loadConfig({ ...base, SESSION_COOKIE_DOMAIN: 'example.com' }).auth.session!.cookie.sessionName).toBe('ilumin_session');
  });

  it('parses rate rules and refuses malformed ones', () => {
    expect(loadConfig({ ...base, RATE_LIMIT_LOGIN: '5/30' }).rateLimits.login).toEqual({ limit: 5, windowSeconds: 30 });
    expect(issues({ ...base, RATE_LIMIT_API: 'lots' })[0]).toMatch(/^RATE_LIMIT_API/);
    expect(issues({ ...base, RATE_LIMIT_API: '0/60' })[0]).toMatch(/^RATE_LIMIT_API/);
  });
});

describe('redirect allow-list', () => {
  const cfg = loadConfig(base).auth.session!;
  it('accepts allow-listed absolute URLs and strips fragments', () => {
    expect(safeReturnTo(undefined, cfg, true)).toBe('https://app.example.com/');
    expect(safeReturnTo('https://app.example.com/a/b?c=1#x', cfg, true)).toBe('https://app.example.com/a/b?c=1');
  });
  it.each([
    'https://evil.example.com/',
    '//evil.example.com',
    '/relative',
    'javascript:alert(1)',
    'data:text/html,hi',
    'https://user:pw@app.example.com/',
    'https://app.example.com.evil.com/',
    'https://app.example.com:8443/',
    'http://app.example.com/',
    `https://app.example.com/${'x'.repeat(2100)}`,
  ])('refuses %s', (u) => {
    expect(safeReturnTo(u, cfg, true)).toBeNull();
  });
});

describe('cookies', () => {
  it('parses the first occurrence and ignores malformed pairs', () => {
    expect(parseCookies('a=1; b=2; a=3; =x; bad')).toEqual({ a: '1', b: '2' });
    expect(parseCookies(undefined)).toEqual({});
  });
  it('serializes with the security attributes and refuses unsafe values', () => {
    expect(serializeCookie('__Host-s', 'abc', { secure: true, httpOnly: true, sameSite: 'Lax', maxAgeSeconds: 60 })).toBe(
      '__Host-s=abc; Path=/; SameSite=Lax; Max-Age=60; Secure; HttpOnly',
    );
    expect(() => serializeCookie('s', 'a;b', { secure: true, httpOnly: true, sameSite: 'Lax' })).toThrow();
  });
});

describe('session secrets and CSRF tokens', () => {
  it('secrets are 256-bit base64url and unique', () => {
    const a = newSecret();
    expect(a).toMatch(SECRET_RE);
    expect(new Set(Array.from({ length: 1000 }, newSecret)).size).toBe(1000);
  });
  it('the CSRF token is bound to the session secret', () => {
    const s = newSecret();
    expect(csrfMatches(s, csrfTokenFor(s))).toBe(true);
    expect(csrfMatches(s, csrfTokenFor(newSecret()))).toBe(false);
    expect(csrfMatches(s, undefined)).toBe(false);
    expect(csrfMatches(s, 'short')).toBe(false);
  });
});

describe('audit redaction', () => {
  it('replaces credentials and masks contact data at any depth', () => {
    expect(
      redactAuditValue({ a: { access_token: 'x', list: [{ email: 'ann@x.test' }] }, mobile: '07700900123', ok: 1 }),
    ).toEqual({ a: { access_token: '[redacted]', list: [{ email: 'a***@x.test' }] }, mobile: '*******0123', ok: 1 });
  });
});

describe('in-memory rate limiter', () => {
  it('counts per key in fixed windows and reports the retry delay', () => {
    let t = 1_000_000;
    const m = new MemoryRateLimiter(100, () => t);
    const rule = { limit: 2, windowSeconds: 10 };
    expect([m.hit('k', rule).allowed, m.hit('k', rule).allowed, m.hit('k', rule).allowed]).toEqual([true, true, false]);
    expect(m.hit('other', rule).allowed).toBe(true);
    t += 10_000;
    expect(m.hit('k', rule).allowed).toBe(true);
  });
  it('stays bounded under a flood of distinct keys', () => {
    const m = new MemoryRateLimiter(50);
    for (let i = 0; i < 1000; i++) m.hit(`k${i}`, { limit: 1, windowSeconds: 60 });
    expect((m as unknown as { windows: Map<string, unknown> }).windows.size).toBeLessThanOrEqual(50);
  });
});
