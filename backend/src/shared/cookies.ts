import type { FastifyReply } from 'fastify';

/**
 * Minimal RFC 6265 cookie handling (no framework plugin needed for two cookies).
 * Parsing keeps the FIRST occurrence of a name. "__Host-" cookies cannot be set by sibling sub-domains, so a tossed
 * duplicate cannot shadow them; without the prefix, first-wins matches what browsers send for the most specific path.
 */

export interface CookieOptions {
  maxAgeSeconds?: number;
  path?: string;
  domain?: string;
  secure: boolean;
  httpOnly: boolean;
  sameSite: 'Lax' | 'Strict' | 'None';
}

const NAME_RE = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/;
const VALUE_RE = /^[A-Za-z0-9._~-]*$/; // we only ever issue base64url values

export function parseCookies(header: string | undefined): Record<string, string> {
  const out: Record<string, string> = Object.create(null);
  if (!header || header.length > 8192) return out;
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i <= 0) continue;
    const name = part.slice(0, i).trim();
    const value = part.slice(i + 1).trim();
    if (!NAME_RE.test(name) || name in out) continue;
    out[name] = value;
  }
  return out;
}

export function serializeCookie(name: string, value: string, o: CookieOptions): string {
  if (!NAME_RE.test(name) || !VALUE_RE.test(value)) throw new Error('invalid cookie name or value');
  const parts = [`${name}=${value}`, `Path=${o.path ?? '/'}`, `SameSite=${o.sameSite}`];
  if (o.maxAgeSeconds !== undefined) parts.push(`Max-Age=${Math.max(0, Math.floor(o.maxAgeSeconds))}`);
  if (o.domain) parts.push(`Domain=${o.domain}`);
  if (o.secure) parts.push('Secure');
  if (o.httpOnly) parts.push('HttpOnly');
  return parts.join('; ');
}

/** Adds a Set-Cookie header. Fastify appends repeated set-cookie headers instead of replacing them. */
export function appendSetCookie(reply: FastifyReply, cookie: string): void {
  reply.header('set-cookie', cookie);
}
