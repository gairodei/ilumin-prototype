import { readFileSync } from 'node:fs';
import { z } from 'zod';

/**
 * Environment-based configuration. Every value is validated once at start-up; the process refuses to start with a list of
 * every problem (never the offending secret values). Production-only rules close the development conveniences.
 */

export class ConfigError extends Error {
  constructor(public readonly issues: string[]) {
    super(`Invalid configuration:\n  - ${issues.join('\n  - ')}`);
    this.name = 'ConfigError';
  }
}

const SAFE_ALGORITHMS = ['RS256', 'RS384', 'RS512', 'PS256', 'PS384', 'PS512', 'ES256', 'ES384', 'ES512', 'EdDSA'] as const;

const bool = (def: boolean) =>
  z
    .enum(['true', 'false', '1', '0', ''])
    .optional()
    .transform((v) => (v === undefined || v === '' ? def : v === 'true' || v === '1'));

const int = (def: number, min: number, max: number) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      if (v === undefined || v.trim() === '') return def;
      if (!/^\d+$/.test(v.trim())) {
        ctx.addIssue({ code: 'custom', message: `must be a whole number between ${min} and ${max}` });
        return z.NEVER;
      }
      const n = Number(v);
      if (n < min || n > max) {
        ctx.addIssue({ code: 'custom', message: `must be between ${min} and ${max}` });
        return z.NEVER;
      }
      return n;
    });

const list = z
  .string()
  .optional()
  .transform((v) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean));

/** "N/S": at most N requests per S-second window. */
const rateRule = (def: string) =>
  z
    .string()
    .optional()
    .transform((v, ctx) => {
      const raw = v && v.trim() ? v.trim() : def;
      const m = /^(\d{1,6})\/(\d{1,5})$/.exec(raw);
      const limit = m ? Number(m[1]) : 0;
      const windowSeconds = m ? Number(m[2]) : 0;
      if (!m || limit < 1 || windowSeconds < 1 || windowSeconds > 86400) {
        ctx.addIssue({ code: 'custom', message: 'must be "<requests>/<window seconds>", e.g. 20/60 (window 1–86400 s)' });
        return z.NEVER;
      }
      return { limit, windowSeconds };
    });

const optionalText = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const postgresUrl = z
  .string({ error: 'is required' })
  .min(1, 'is required')
  .refine((v) => /^postgres(ql)?:\/\//.test(v), 'must be a postgres:// or postgresql:// URL');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production'], { error: 'must be development, test or production' }),
  HOST: z.string().optional().default('127.0.0.1'),
  PORT: int(3000, 0, 65535),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional().default('info'),

  DATABASE_URL: postgresUrl,
  DATABASE_SSL: z.enum(['disable', 'require', 'verify-full']).optional().default('verify-full'),
  DATABASE_SSL_CA_FILE: z.string().optional(),
  DATABASE_POOL_MAX: int(10, 1, 200),
  DATABASE_STATEMENT_TIMEOUT_MS: int(15000, 100, 600000),

  OIDC_ISSUER: z.string({ error: 'is required' }).url('must be an absolute URL'),
  OIDC_AUDIENCE: list,
  OIDC_ALLOWED_ALGORITHMS: z
    .string()
    .optional()
    .transform((v) => (v ?? 'RS256,PS256,ES256').split(',').map((s) => s.trim()).filter(Boolean))
    .refine(
      (algs) => algs.length > 0 && algs.every((a) => (SAFE_ALGORITHMS as readonly string[]).includes(a)),
      `must be a comma-separated subset of ${SAFE_ALGORITHMS.join(', ')} (symmetric HS* and "none" are never accepted)`,
    ),
  OIDC_CLOCK_TOLERANCE_SECONDS: int(30, 0, 120),
  OIDC_REQUIRED_TOKEN_TYPE: z.string().optional().transform((v) => (v && v.trim() ? v.trim() : undefined)),
  OIDC_LINK_BY_VERIFIED_EMAIL: bool(false),
  OIDC_ALLOW_INSECURE_HTTP: bool(false),
  OIDC_DISCOVERY_TIMEOUT_MS: int(5000, 500, 60000),

  // Authentication modes (Stage 1B). Neither is on by default: the operator enables what the deployment uses.
  AUTH_SESSION_ENABLED: bool(false),
  AUTH_BEARER_ENABLED: bool(false),
  OIDC_CLIENT_ID: optionalText,
  OIDC_CLIENT_SECRET: z.string().optional().transform((v) => (v ? v : undefined)),
  OIDC_REDIRECT_URI: optionalText,
  OIDC_SCOPES: z.string().optional().default('openid email profile'),
  OIDC_TOKEN_TIMEOUT_MS: int(10000, 500, 60000),
  AUTH_DEFAULT_REDIRECT: optionalText,
  AUTH_REDIRECT_ORIGINS: list,
  AUTH_LOGIN_TTL_SECONDS: int(600, 60, 1800),
  SESSION_COOKIE_SECURE: bool(true),
  SESSION_COOKIE_SAMESITE: z.enum(['lax', 'strict', 'none']).optional().default('lax'),
  SESSION_COOKIE_DOMAIN: optionalText,
  SESSION_IDLE_TIMEOUT_MINUTES: int(30, 5, 1440),
  SESSION_ABSOLUTE_TIMEOUT_HOURS: int(12, 1, 720),
  SESSION_ROTATION_MINUTES: int(15, 1, 1440),
  SESSION_ROTATION_GRACE_SECONDS: int(30, 0, 300),
  SESSION_RETENTION_DAYS: int(30, 1, 3650),

  RATE_LIMIT_LOGIN: rateRule('20/60'),
  RATE_LIMIT_CALLBACK_FAILURES: rateRule('10/900'),
  RATE_LIMIT_SENSITIVE: rateRule('30/60'),
  RATE_LIMIT_API: rateRule('600/60'),

  WORKER_POLL_INTERVAL_MS: int(2000, 100, 60000),
  WORKER_LEASE_SECONDS: int(120, 5, 3600),
  OUTBOX_RETENTION_DAYS: int(30, 1, 3650),
  JOB_RETENTION_DAYS: int(30, 1, 3650),
  NOTIFICATION_TRANSPORT: z.enum(['none', 'capture']).optional().default('none'),

  CORS_ALLOWED_ORIGINS: list,
  TRUST_PROXY: z.string().optional().default('false'),
  SHUTDOWN_TIMEOUT_MS: int(10000, 1000, 120000),
  BODY_LIMIT_BYTES: int(1048576, 1024, 10485760),
  IDEMPOTENCY_RETENTION_HOURS: int(168, 1, 24 * 365),
});

export type TrustProxy = false | number | string[];

export interface RateRule {
  limit: number;
  windowSeconds: number;
}

export interface SessionAuthConfig {
  clientId: string;
  /** Absent = public client (PKCE only). Production requires a confidential client. */
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  tokenTimeoutMs: number;
  defaultRedirect: string;
  redirectOrigins: string[];
  /** Origins allowed to send cookie-authenticated state-changing requests (CORS origins + the API's own origin). */
  trustedOrigins: string[];
  loginTtlSeconds: number;
  cookie: {
    sessionName: string;
    loginName: string;
    secure: boolean;
    sameSite: 'Lax' | 'Strict' | 'None';
    domain?: string;
  };
  idleMinutes: number;
  absoluteHours: number;
  rotationMinutes: number;
  rotationGraceSeconds: number;
  retentionDays: number;
}

export interface Config {
  env: 'development' | 'test' | 'production';
  host: string;
  port: number;
  logLevel: string;
  database: {
    url: string;
    ssl: 'disable' | 'require' | 'verify-full';
    sslCa?: string;
    poolMax: number;
    statementTimeoutMs: number;
  };
  oidc: {
    issuer: string;
    audiences: string[];
    algorithms: string[];
    clockToleranceSeconds: number;
    requiredTokenType?: string;
    linkByVerifiedEmail: boolean;
    allowInsecureHttp: boolean;
    discoveryTimeoutMs: number;
  };
  auth: {
    bearerEnabled: boolean;
    session: SessionAuthConfig | null;
  };
  rateLimits: { login: RateRule; callbackFailures: RateRule; sensitive: RateRule; api: RateRule };
  worker: {
    pollIntervalMs: number;
    leaseSeconds: number;
    outboxRetentionDays: number;
    jobRetentionDays: number;
    notificationTransport: 'none' | 'capture';
  };
  cors: { allowedOrigins: string[] };
  trustProxy: TrustProxy;
  shutdownTimeoutMs: number;
  bodyLimitBytes: number;
  idempotencyRetentionHours: number;
}

function parseTrustProxy(raw: string, issues: string[]): TrustProxy {
  const v = raw.trim();
  if (v === '' || v === 'false') return false;
  if (v === 'true') return ['__TRUE__'];
  if (/^\d+$/.test(v)) return Number(v);
  const parts = v.split(',').map((s) => s.trim()).filter(Boolean);
  const ipish = /^[0-9a-fA-F:.]+(\/\d{1,3})?$/;
  if (parts.length === 0 || !parts.every((p) => ipish.test(p))) {
    issues.push('TRUST_PROXY: must be false, a hop count, or comma-separated proxy IP addresses / CIDR ranges');
    return false;
  }
  return parts;
}

function originValid(o: string): boolean {
  try {
    const u = new URL(o);
    return u.origin === o && (u.protocol === 'https:' || u.protocol === 'http:');
  } catch {
    return false;
  }
}

/** Builds the validated configuration from an environment map. Throws ConfigError listing every problem. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const parsed = EnvSchema.safeParse(env);
  const issues: string[] = [];
  if (!parsed.success) {
    for (const i of parsed.error.issues) issues.push(`${i.path.join('.') || '(root)'}: ${i.message}`);
    // Conditional requirements are normally checked after parsing; report them here too so every problem is listed.
    const on = (v: string | undefined) => v === 'true' || v === '1';
    if (on(env.AUTH_BEARER_ENABLED) && !(env.OIDC_AUDIENCE ?? '').trim()) {
      issues.push('OIDC_AUDIENCE: is required when AUTH_BEARER_ENABLED=true (at least one audience)');
    }
    if (!on(env.AUTH_BEARER_ENABLED) && !on(env.AUTH_SESSION_ENABLED)) {
      issues.push('AUTH_SESSION_ENABLED / AUTH_BEARER_ENABLED: enable at least one authentication mode');
    }
    throw new ConfigError(issues);
  }
  const e = parsed.data;
  const prod = e.NODE_ENV === 'production';

  let trustProxy = parseTrustProxy(e.TRUST_PROXY, issues);
  if (Array.isArray(trustProxy) && trustProxy[0] === '__TRUE__') {
    if (prod) issues.push('TRUST_PROXY: "true" (trust every proxy) is refused in production; give a hop count or the proxy addresses');
    trustProxy = 1;
  }

  for (const o of e.CORS_ALLOWED_ORIGINS) {
    if (o === '*' || o.includes('*')) issues.push('CORS_ALLOWED_ORIGINS: wildcards are refused; list exact origins');
    else if (!originValid(o)) issues.push(`CORS_ALLOWED_ORIGINS: "${o}" is not an exact origin (scheme://host[:port], no path)`);
    else if (prod && !o.startsWith('https://')) issues.push(`CORS_ALLOWED_ORIGINS: "${o}" must use https in production`);
  }

  const issuerUrl = new URL(e.OIDC_ISSUER);
  if (issuerUrl.protocol !== 'https:' && !e.OIDC_ALLOW_INSECURE_HTTP) {
    issues.push('OIDC_ISSUER: must use https (OIDC_ALLOW_INSECURE_HTTP is only for local test issuers)');
  }
  if (prod) {
    if (e.OIDC_ALLOW_INSECURE_HTTP) issues.push('OIDC_ALLOW_INSECURE_HTTP: must be false in production');
    if (e.DATABASE_SSL === 'disable') issues.push('DATABASE_SSL: "disable" is refused in production; use require or verify-full');
  }

  if (!e.AUTH_SESSION_ENABLED && !e.AUTH_BEARER_ENABLED) {
    issues.push('AUTH_SESSION_ENABLED / AUTH_BEARER_ENABLED: enable at least one authentication mode');
  }
  if (e.AUTH_BEARER_ENABLED && e.OIDC_AUDIENCE.length === 0) {
    issues.push('OIDC_AUDIENCE: is required when AUTH_BEARER_ENABLED=true (at least one audience)');
  }
  if (prod && e.NOTIFICATION_TRANSPORT === 'capture') {
    issues.push('NOTIFICATION_TRANSPORT: "capture" is a development/test transport and is refused in production');
  }
  const session = e.AUTH_SESSION_ENABLED ? sessionConfig(e, prod, issues) : null;

  let sslCa: string | undefined;
  if (e.DATABASE_SSL_CA_FILE) {
    try {
      sslCa = readFileSync(e.DATABASE_SSL_CA_FILE, 'utf8');
    } catch {
      issues.push('DATABASE_SSL_CA_FILE: file cannot be read');
    }
  }

  if (issues.length) throw new ConfigError(issues);

  return {
    env: e.NODE_ENV,
    host: e.HOST,
    port: e.PORT,
    logLevel: e.LOG_LEVEL,
    database: {
      url: e.DATABASE_URL,
      ssl: e.DATABASE_SSL,
      ...(sslCa ? { sslCa } : {}),
      poolMax: e.DATABASE_POOL_MAX,
      statementTimeoutMs: e.DATABASE_STATEMENT_TIMEOUT_MS,
    },
    oidc: {
      issuer: e.OIDC_ISSUER,
      audiences: e.OIDC_AUDIENCE,
      algorithms: e.OIDC_ALLOWED_ALGORITHMS,
      clockToleranceSeconds: e.OIDC_CLOCK_TOLERANCE_SECONDS,
      ...(e.OIDC_REQUIRED_TOKEN_TYPE ? { requiredTokenType: e.OIDC_REQUIRED_TOKEN_TYPE } : {}),
      linkByVerifiedEmail: e.OIDC_LINK_BY_VERIFIED_EMAIL,
      allowInsecureHttp: e.OIDC_ALLOW_INSECURE_HTTP,
      discoveryTimeoutMs: e.OIDC_DISCOVERY_TIMEOUT_MS,
    },
    auth: { bearerEnabled: e.AUTH_BEARER_ENABLED, session },
    rateLimits: {
      login: e.RATE_LIMIT_LOGIN,
      callbackFailures: e.RATE_LIMIT_CALLBACK_FAILURES,
      sensitive: e.RATE_LIMIT_SENSITIVE,
      api: e.RATE_LIMIT_API,
    },
    worker: {
      pollIntervalMs: e.WORKER_POLL_INTERVAL_MS,
      leaseSeconds: e.WORKER_LEASE_SECONDS,
      outboxRetentionDays: e.OUTBOX_RETENTION_DAYS,
      jobRetentionDays: e.JOB_RETENTION_DAYS,
      notificationTransport: e.NOTIFICATION_TRANSPORT,
    },
    cors: { allowedOrigins: e.CORS_ALLOWED_ORIGINS },
    trustProxy,
    shutdownTimeoutMs: e.SHUTDOWN_TIMEOUT_MS,
    bodyLimitBytes: e.BODY_LIMIT_BYTES,
    idempotencyRetentionHours: e.IDEMPOTENCY_RETENTION_HOURS,
  };
}

type Env = z.output<typeof EnvSchema>;

function absoluteUrl(raw: string | undefined, name: string, prod: boolean, issues: string[]): URL | null {
  if (!raw) {
    issues.push(`${name}: is required when AUTH_SESSION_ENABLED=true`);
    return null;
  }
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    issues.push(`${name}: must be an absolute URL`);
    return null;
  }
  if (u.username || u.password || u.hash) {
    issues.push(`${name}: must not contain credentials or a fragment`);
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') issues.push(`${name}: must be http(s)`);
  if (prod && u.protocol !== 'https:') issues.push(`${name}: must use https in production`);
  return u;
}

/** Validates the browser-session (BFF) settings. Every problem is added to `issues`. */
function sessionConfig(e: Env, prod: boolean, issues: string[]): SessionAuthConfig | null {
  const before = issues.length;
  if (!e.OIDC_CLIENT_ID) issues.push('OIDC_CLIENT_ID: is required when AUTH_SESSION_ENABLED=true');
  if (prod && !e.OIDC_CLIENT_SECRET) {
    issues.push('OIDC_CLIENT_SECRET: is required in production (register the backend as a confidential client)');
  }
  const redirect = absoluteUrl(e.OIDC_REDIRECT_URI, 'OIDC_REDIRECT_URI', prod, issues);
  if (redirect && redirect.search) issues.push('OIDC_REDIRECT_URI: must not contain a query string');
  const def = absoluteUrl(e.AUTH_DEFAULT_REDIRECT, 'AUTH_DEFAULT_REDIRECT', prod, issues);
  const scopes = e.OIDC_SCOPES.split(/\s+/).filter(Boolean);
  if (!scopes.includes('openid')) issues.push('OIDC_SCOPES: must include "openid"');

  if (e.AUTH_REDIRECT_ORIGINS.length === 0) issues.push('AUTH_REDIRECT_ORIGINS: is required when AUTH_SESSION_ENABLED=true');
  for (const o of e.AUTH_REDIRECT_ORIGINS) {
    if (o.includes('*')) issues.push('AUTH_REDIRECT_ORIGINS: wildcards are refused; list exact origins');
    else if (!originValid(o)) issues.push(`AUTH_REDIRECT_ORIGINS: "${o}" is not an exact origin (scheme://host[:port], no path)`);
    else if (prod && !o.startsWith('https://')) issues.push(`AUTH_REDIRECT_ORIGINS: "${o}" must use https in production`);
  }
  if (def && !e.AUTH_REDIRECT_ORIGINS.includes(def.origin)) {
    issues.push('AUTH_DEFAULT_REDIRECT: its origin must be listed in AUTH_REDIRECT_ORIGINS');
  }

  const secure = e.SESSION_COOKIE_SECURE;
  if (prod && !secure) issues.push('SESSION_COOKIE_SECURE: must be true in production');
  if (e.SESSION_COOKIE_SAMESITE === 'none' && !secure) issues.push('SESSION_COOKIE_SAMESITE: "none" requires SESSION_COOKIE_SECURE=true');
  if (e.SESSION_COOKIE_DOMAIN && !/^[a-z0-9.-]+$/i.test(e.SESSION_COOKIE_DOMAIN)) {
    issues.push('SESSION_COOKIE_DOMAIN: must be a host name');
  }
  if (e.SESSION_IDLE_TIMEOUT_MINUTES > e.SESSION_ABSOLUTE_TIMEOUT_HOURS * 60) {
    issues.push('SESSION_IDLE_TIMEOUT_MINUTES: must not exceed the absolute timeout');
  }
  if (issues.length > before || !redirect || !def || !e.OIDC_CLIENT_ID) return null;

  // "__Host-" cookies are bound to this exact host, https only, path "/" and no Domain attribute: the strongest choice.
  const prefix = secure && !e.SESSION_COOKIE_DOMAIN ? '__Host-' : '';
  const sameSite = ({ lax: 'Lax', strict: 'Strict', none: 'None' } as const)[e.SESSION_COOKIE_SAMESITE];
  return {
    clientId: e.OIDC_CLIENT_ID,
    ...(e.OIDC_CLIENT_SECRET ? { clientSecret: e.OIDC_CLIENT_SECRET } : {}),
    redirectUri: redirect.toString(),
    scopes,
    tokenTimeoutMs: e.OIDC_TOKEN_TIMEOUT_MS,
    defaultRedirect: def.toString(),
    redirectOrigins: e.AUTH_REDIRECT_ORIGINS,
    trustedOrigins: [...new Set([...e.CORS_ALLOWED_ORIGINS, redirect.origin])],
    loginTtlSeconds: e.AUTH_LOGIN_TTL_SECONDS,
    cookie: {
      sessionName: `${prefix}ilumin_session`,
      loginName: `${prefix}ilumin_login`,
      secure,
      sameSite,
      ...(e.SESSION_COOKIE_DOMAIN ? { domain: e.SESSION_COOKIE_DOMAIN } : {}),
    },
    idleMinutes: e.SESSION_IDLE_TIMEOUT_MINUTES,
    absoluteHours: e.SESSION_ABSOLUTE_TIMEOUT_HOURS,
    rotationMinutes: e.SESSION_ROTATION_MINUTES,
    rotationGraceSeconds: e.SESSION_ROTATION_GRACE_SECONDS,
    retentionDays: e.SESSION_RETENTION_DAYS,
  };
}
