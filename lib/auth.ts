// Lightweight stateless session: an HMAC-signed, expiring cookie that names
// the signed-in user (`uid`). Signing in with Cognito (app/api/auth/callback)
// mints one per user; the local-only passcode (APP_PASSWORD) mints the
// owner's. Uses Web Crypto, so it runs anywhere: proxy.ts and the route
// handlers alike.

export const AUTH_COOKIE = 'pt_auth';
export const AUTH_MAX_AGE_S = 60 * 60 * 24 * 365; // 1 year — "persistent"

/** The user who owned every row before accounts existed (see the multi-user migration). */
export const OWNER_USER_ID = 'usr_owner';

const encoder = new TextEncoder();

function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(s: string): Uint8Array {
  const norm = s.replace(/-/g, '+').replace(/_/g, '/');
  const padded = norm + '='.repeat((4 - (norm.length % 4)) % 4);
  const str = atob(padded);
  const bytes = new Uint8Array(str.length);
  for (let i = 0; i < str.length; i++) bytes[i] = str.charCodeAt(i);
  return bytes;
}

async function hmac(data: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return b64urlEncode(new Uint8Array(sig));
}

/** Constant-time string comparison (avoids leaking length-position via early exit). */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

/**
 * Sign `payload` (plus an expiry `ttlMs` from `now`) into a `<payload>.<sig>`
 * token. The session cookie and the sign-in state cookie both use it.
 */
export async function signToken(
  payload: Record<string, unknown>,
  secret: string,
  ttlMs: number,
  now: number = Date.now(),
): Promise<string> {
  const body = b64urlEncode(encoder.encode(JSON.stringify({ ...payload, iat: now, exp: now + ttlMs })));
  return `${body}.${await hmac(body, secret)}`;
}

/** A token's payload if its signature holds and it hasn't expired, else null. */
export async function verifyToken(
  token: string | undefined | null,
  secret: string | undefined,
  now: number = Date.now(),
): Promise<Record<string, unknown> | null> {
  if (!token || !secret) return null;
  const dot = token.indexOf('.');
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  if (!timingSafeEqual(token.slice(dot + 1), await hmac(body, secret))) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
    if (!payload || typeof payload !== 'object' || typeof payload.exp !== 'number' || payload.exp <= now) return null;
    return payload;
  } catch {
    return null;
  }
}

/** Mint a signed session token for `userId`, valid for AUTH_MAX_AGE_S. */
export async function createSession(
  secret: string,
  now: number = Date.now(),
  userId: string = OWNER_USER_ID,
): Promise<string> {
  return signToken({ uid: userId }, secret, AUTH_MAX_AGE_S * 1000, now);
}

/**
 * The user a session token names, or null if it is forged, expired or
 * malformed. A token minted before tokens carried a `uid` is the owner's —
 * the passcode was the only way in — so existing sign-ins keep working.
 */
export async function readSession(
  token: string | undefined | null,
  secret: string | undefined,
  now: number = Date.now(),
): Promise<string | null> {
  const payload = await verifyToken(token, secret, now);
  if (!payload) return null;
  if (payload.uid === undefined) return OWNER_USER_ID;
  return typeof payload.uid === 'string' && payload.uid ? payload.uid : null;
}

/** Verify a session token: signature intact and not expired. */
export async function verifySession(
  token: string | undefined | null,
  secret: string | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  return (await readSession(token, secret, now)) !== null;
}
