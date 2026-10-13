// Signing in with Cognito's managed login: the authorization code flow with
// PKCE, plus `state` (CSRF) and `nonce` (replay). The browser only ever sees
// the authorize and logout redirects; the code is exchanged here, on the
// server, with the client secret, and the ID token is verified against the
// user pool's keys. After that the app mints its own session (lib/auth.ts) —
// Cognito's tokens are not kept.
import { CognitoJwtVerifier } from 'aws-jwt-verify';

export interface CognitoConfig {
  /** The managed login domain, e.g. https://prep-dev.auth.us-east-1.amazoncognito.com */
  domain: string;
  userPoolId: string;
  clientId: string;
  clientSecret: string;
  /** This site's own origin: the redirect URIs are built from it, never from the request. */
  siteUrl: string;
  /**
   * Every origin this stage answers on, the primary first — its domain, then
   * its CloudFront address, kept as a fallback for networks that block new
   * domains. A request on one of these signs in and out on that same origin.
   */
  siteUrls: string[];
}

/** Cognito's settings from the environment, or null when sign-in isn't configured (local dev). */
export function cognitoConfig(env: Record<string, string | undefined> = process.env): CognitoConfig | null {
  const domain = env.COGNITO_DOMAIN;
  const userPoolId = env.COGNITO_USER_POOL_ID;
  const clientId = env.COGNITO_CLIENT_ID;
  const clientSecret = env.COGNITO_CLIENT_SECRET;
  const siteUrl = env.SITE_URL;
  if (!domain || !userPoolId || !clientId || !clientSecret || !siteUrl) return null;
  const trim = (url: string) => url.trim().replace(/\/+$/, '');
  const alternates = (env.SITE_URL_ALTERNATES ?? '').split(',').map(trim).filter(url => /^https?:\/\//.test(url));
  const primary = trim(siteUrl);
  return {
    domain: domain.replace(/\/+$/, ''),
    userPoolId,
    clientId,
    clientSecret,
    siteUrl: primary,
    siteUrls: [primary, ...alternates.filter(url => url !== primary)],
  };
}

/**
 * The config for the origin a request arrived on, if it's one of this stage's
 * own (CloudFront passes the visitor's host as x-forwarded-host; the Lambda's
 * own Host is its function URL). Anything else gets the primary origin — the
 * request never chooses a redirect target outside the list.
 */
export function configForHost(config: CognitoConfig, host: string | null | undefined): CognitoConfig {
  const match = host ? config.siteUrls.find(url => new URL(url).host === host.trim().toLowerCase()) : undefined;
  return match ? { ...config, siteUrl: match } : config;
}

/** The visitor-facing host of a request behind CloudFront. */
export function requestHost(headers: Headers): string | null {
  return headers.get('x-forwarded-host')?.split(',')[0] ?? headers.get('host');
}

export const callbackUrl = (config: CognitoConfig) => `${config.siteUrl}/api/auth/callback`;

function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** A random URL-safe string: `bytes` of entropy. */
export function randomToken(bytes = 32): string {
  return b64url(crypto.getRandomValues(new Uint8Array(bytes)));
}

/** PKCE: the verifier stays on the server side (in the signed state cookie), the S256 challenge goes to Cognito. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))));
}

export function authorizeUrl(
  config: CognitoConfig,
  { state, nonce, codeChallenge, signUp = false }: { state: string; nonce: string; codeChallenge: string; signUp?: boolean },
): string {
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.clientId,
    redirect_uri: callbackUrl(config),
    scope: 'openid email',
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    // Always show the sign-in form, never reuse a Cognito session that's
    // still around: otherwise "sign in" right after signing out (or from a
    // tab that only followed another tab's sign-out) can hand back the
    // previous account without asking — the wrong person on a shared device.
    // Costs little: the app's own session lasts a year, so the form is rare.
    prompt: 'login',
  });
  // /signup opens managed login on its sign-up form; it carries on to the same callback.
  return `${config.domain}/${signUp ? 'signup' : 'oauth2/authorize'}?${params}`;
}

/** Ends the Cognito session too, so the next sign-in asks again; Cognito then sends the browser home. */
export function logoutUrl(config: CognitoConfig): string {
  const params = new URLSearchParams({ client_id: config.clientId, logout_uri: `${config.siteUrl}/` });
  return `${config.domain}/logout?${params}`;
}

/** Trade the one-time code for tokens. Returns the ID token, or throws. */
export async function exchangeCode(
  config: CognitoConfig,
  code: string,
  codeVerifier: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const res = await fetchImpl(`${config.domain}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${btoa(`${config.clientId}:${config.clientSecret}`)}`,
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: callbackUrl(config),
      code_verifier: codeVerifier,
    }),
  });
  if (!res.ok) throw new Error(`token endpoint answered ${res.status}`);
  const body = await res.json() as { id_token?: unknown };
  if (typeof body.id_token !== 'string') throw new Error('token endpoint returned no id_token');
  return body.id_token;
}

export interface Identity {
  sub: string;
  email: string | null;
  emailVerified: boolean;
}

type IdTokenVerifier = { verify(token: string): Promise<Record<string, unknown>> };
const verifiers = new Map<string, IdTokenVerifier>();

function verifierFor(config: CognitoConfig): IdTokenVerifier {
  const key = `${config.userPoolId}/${config.clientId}`;
  let verifier = verifiers.get(key);
  if (!verifier) {
    // Checks the signature against the pool's JWKS (cached), iss, aud, token_use and exp.
    verifier = CognitoJwtVerifier.create({ userPoolId: config.userPoolId, clientId: config.clientId, tokenUse: 'id' });
    verifiers.set(key, verifier);
  }
  return verifier;
}

/** Verify the ID token and that it answers *this* sign-in (`nonce`); return who it names. */
export async function verifyIdToken(
  config: CognitoConfig,
  idToken: string,
  nonce: string,
  verifier: IdTokenVerifier = verifierFor(config),
): Promise<Identity> {
  const claims = await verifier.verify(idToken);
  if (claims.nonce !== nonce) throw new Error('ID token nonce does not match this sign-in');
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('ID token has no subject');
  return {
    sub: claims.sub,
    email: typeof claims.email === 'string' ? claims.email : null,
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
  };
}
