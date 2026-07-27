// Lightweight stateless session: an HMAC-signed, expiring cookie. No user
// table — a single shared passcode (APP_PASSWORD) mints a token signed with
// AUTH_SECRET. Uses Web Crypto so it runs in both the Edge middleware and the
// Node route handlers.

export const AUTH_COOKIE = 'pt_auth';
export const AUTH_MAX_AGE_S = 60 * 60 * 24 * 365; // 1 year — "persistent"

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

/** Mint a signed session token valid for AUTH_MAX_AGE_S. */
export async function createSession(secret: string, now: number = Date.now()): Promise<string> {
  const payload = b64urlEncode(encoder.encode(JSON.stringify({ iat: now, exp: now + AUTH_MAX_AGE_S * 1000 })));
  const sig = await hmac(payload, secret);
  return `${payload}.${sig}`;
}

/** Verify a session token: signature intact and not expired. */
export async function verifySession(
  token: string | undefined | null,
  secret: string | undefined,
  now: number = Date.now(),
): Promise<boolean> {
  if (!token || !secret) return false;
  const dot = token.indexOf('.');
  if (dot <= 0) return false;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);

  const expected = await hmac(payload, secret);
  if (!timingSafeEqual(sig, expected)) return false;

  try {
    const { exp } = JSON.parse(new TextDecoder().decode(b64urlDecode(payload)));
    return typeof exp === 'number' && exp > now;
  } catch {
    return false;
  }
}
