import type { LightMyRequestResponse } from 'fastify';
import type { IssueCodeInput } from './oidc-issuer.js';
import { APP_ORIGIN, type TestContext, type TestUser } from './context.js';

/**
 * Drives the real browser sign-in flow through the application (inject), with the local test issuer playing the
 * provider's authorization step. Nothing is shortcut: state, nonce, PKCE, code exchange and ID-token checks all run.
 */

export function cookieFrom(res: LightMyRequestResponse, name: string): string | undefined {
  const raw = res.headers['set-cookie'];
  const list = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  for (const c of list) {
    const pair = c.split(';')[0]!;
    const i = pair.indexOf('=');
    if (pair.slice(0, i) === name) return pair.slice(i + 1);
  }
  return undefined;
}

export function setCookieLine(res: LightMyRequestResponse, name: string): string | undefined {
  const raw = res.headers['set-cookie'];
  const list = raw === undefined ? [] : Array.isArray(raw) ? raw : [raw];
  return list.find((c) => c.startsWith(`${name}=`));
}

export interface LoginStart {
  res: LightMyRequestResponse;
  authorize: URL;
  state: string;
  nonce: string;
  codeChallenge: string;
  verifier: string;
}

export async function startLogin(
  ctx: TestContext,
  query = '',
  headers: Record<string, string> = {},
  remoteAddress?: string,
): Promise<LoginStart> {
  const res = await ctx.app.inject({ method: 'GET', url: `/v1/auth/login${query}`, headers, ...(remoteAddress ? { remoteAddress } : {}) });
  if (res.statusCode !== 302) throw new Error(`login start returned ${res.statusCode}: ${res.body}`);
  const authorize = new URL(res.headers.location as string);
  return {
    res,
    authorize,
    state: authorize.searchParams.get('state')!,
    nonce: authorize.searchParams.get('nonce')!,
    codeChallenge: authorize.searchParams.get('code_challenge')!,
    verifier: cookieFrom(res, ctx.config.auth.session!.cookie.loginName)!,
  };
}

export interface CallbackOptions {
  code?: string;
  state?: string;
  verifier?: string | null;
  extraCookie?: string;
  extraQuery?: string;
  issue?: Partial<IssueCodeInput>;
}

export async function callback(ctx: TestContext, start: LoginStart, user: TestUser, o: CallbackOptions = {}) {
  const code =
    o.code ??
    ctx.issuer.issueCode({
      sub: user.subject,
      nonce: start.nonce,
      codeChallenge: start.codeChallenge,
      redirectUri: ctx.config.auth.session!.redirectUri,
      ...o.issue,
    });
  const cookies: string[] = [];
  const verifier = o.verifier === undefined ? start.verifier : o.verifier;
  if (verifier !== null) cookies.push(`${ctx.config.auth.session!.cookie.loginName}=${verifier}`);
  if (o.extraCookie) cookies.push(o.extraCookie);
  const q = new URLSearchParams({ code, state: o.state ?? start.state });
  return ctx.app.inject({
    method: 'GET',
    url: `/v1/auth/callback?${q}${o.extraQuery ?? ''}`,
    headers: cookies.length ? { cookie: cookies.join('; ') } : {},
  });
}

export interface BrowserSession {
  secret: string;
  cookie: string;
  csrfToken: string;
}

export async function login(ctx: TestContext, user: TestUser): Promise<BrowserSession> {
  const start = await startLogin(ctx);
  const res = await callback(ctx, start, user);
  if (res.statusCode !== 303) throw new Error(`callback returned ${res.statusCode}: ${res.body}`);
  const name = ctx.config.auth.session!.cookie.sessionName;
  const secret = cookieFrom(res, name)!;
  const s = await ctx.app.inject({ method: 'GET', url: '/v1/auth/session', headers: { cookie: `${name}=${secret}` } });
  if (s.statusCode !== 200) throw new Error(`session returned ${s.statusCode}: ${s.body}`);
  return { secret, cookie: `${name}=${secret}`, csrfToken: s.json().csrfToken };
}

/** Headers for a cookie-authenticated, state-changing request from the trusted app origin. */
export const writeHeaders = (s: BrowserSession, extra: Record<string, string> = {}) => ({
  cookie: s.cookie,
  origin: APP_ORIGIN,
  'x-csrf-token': s.csrfToken,
  ...extra,
});
