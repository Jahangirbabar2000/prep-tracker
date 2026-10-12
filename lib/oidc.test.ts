// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { authorizeUrl, callbackUrl, cognitoConfig, exchangeCode, logoutUrl, pkceChallenge, verifyIdToken } from './oidc';

const env = {
  COGNITO_DOMAIN: 'https://prep-dev.auth.us-east-1.amazoncognito.com/',
  COGNITO_USER_POOL_ID: 'us-east-1_abc',
  COGNITO_CLIENT_ID: 'client123',
  COGNITO_CLIENT_SECRET: 'shh',
  SITE_URL: 'https://prep.test/',
};
const config = cognitoConfig(env)!;

describe('cognitoConfig', () => {
  it('is null until every setting is present', () => {
    expect(cognitoConfig({})).toBeNull();
    expect(cognitoConfig({ ...env, COGNITO_CLIENT_SECRET: undefined })).toBeNull();
  });

  it('trims trailing slashes so URLs join cleanly', () => {
    expect(config.domain).toBe('https://prep-dev.auth.us-east-1.amazoncognito.com');
    expect(callbackUrl(config)).toBe('https://prep.test/api/auth/callback');
  });
});

describe('PKCE', () => {
  it('derives the S256 challenge: base64url(sha256(verifier)), unpadded', async () => {
    const verifier = 'a-verifier-of-at-least-43-characters-0123456789';
    expect(await pkceChallenge(verifier)).toBe(createHash('sha256').update(verifier).digest('base64url'));
  });
});

describe('authorizeUrl', () => {
  it('asks for a code with PKCE, state and nonce, back to this site', () => {
    const url = new URL(authorizeUrl(config, { state: 's1', nonce: 'n1', codeChallenge: 'c1' }));
    expect(url.origin + url.pathname).toBe('https://prep-dev.auth.us-east-1.amazoncognito.com/oauth2/authorize');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      response_type: 'code',
      client_id: 'client123',
      redirect_uri: 'https://prep.test/api/auth/callback',
      scope: 'openid email',
      state: 's1',
      nonce: 'n1',
      code_challenge: 'c1',
      code_challenge_method: 'S256',
    });
  });

  it('opens on the sign-up form when asked', () => {
    expect(new URL(authorizeUrl(config, { state: 's', nonce: 'n', codeChallenge: 'c', signUp: true })).pathname).toBe('/signup');
  });
});

it('logs out of Cognito and back to this site', () => {
  const url = new URL(logoutUrl(config));
  expect(url.pathname).toBe('/logout');
  expect(url.searchParams.get('logout_uri')).toBe('https://prep.test/');
});

describe('exchangeCode', () => {
  it('posts the code and verifier with the client secret, and returns the ID token', async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ id_token: 'idt', access_token: 'at' })));
    expect(await exchangeCode(config, 'code1', 'verifier1', fetchImpl as unknown as typeof fetch)).toBe('idt');
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://prep-dev.auth.us-east-1.amazoncognito.com/oauth2/token');
    expect((init.headers as Record<string, string>).Authorization).toBe(`Basic ${btoa('client123:shh')}`);
    expect(Object.fromEntries(init.body as URLSearchParams)).toEqual({
      grant_type: 'authorization_code',
      code: 'code1',
      redirect_uri: 'https://prep.test/api/auth/callback',
      code_verifier: 'verifier1',
    });
  });

  it('throws when Cognito refuses', async () => {
    const fetchImpl = vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 }));
    await expect(exchangeCode(config, 'c', 'v', fetchImpl as unknown as typeof fetch)).rejects.toThrow(/400/);
  });
});

describe('verifyIdToken', () => {
  const verifier = (claims: Record<string, unknown>) => ({ verify: vi.fn(async () => claims) });

  it('returns who the token names', async () => {
    const identity = await verifyIdToken(config, 't', 'n1', verifier({ sub: 'sub1', email: 'a@b.test', email_verified: true, nonce: 'n1' }));
    expect(identity).toEqual({ sub: 'sub1', email: 'a@b.test', emailVerified: true });
  });

  it('rejects a token issued for another sign-in', async () => {
    await expect(verifyIdToken(config, 't', 'n1', verifier({ sub: 'sub1', nonce: 'other' }))).rejects.toThrow(/nonce/);
  });

  it('treats an unverified or missing email as unverified', async () => {
    expect((await verifyIdToken(config, 't', 'n', verifier({ sub: 's', nonce: 'n', email: 'x@y.test' }))).emailVerified).toBe(false);
    expect((await verifyIdToken(config, 't', 'n', verifier({ sub: 's', nonce: 'n', email_verified: 'true' }))).emailVerified).toBe(true);
  });

  it('passes a bad signature or expiry straight through as a failure', async () => {
    const failing = { verify: vi.fn(async () => { throw new Error('Token expired'); }) };
    await expect(verifyIdToken(config, 't', 'n', failing)).rejects.toThrow(/expired/);
  });
});
