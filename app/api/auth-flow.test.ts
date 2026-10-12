// @vitest-environment node
// The Cognito sign-in round trip: /api/auth/login sets the signed state
// cookie and sends the browser to Cognito; /api/auth/callback accepts only an
// answer to that request. Cognito itself (the token endpoint and its keys) is
// mocked; the state, cookie and session handling are real.
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { AUTH_COOKIE, readSession } from '@/lib/auth';

const cognito = vi.hoisted(() => ({
  exchangeCode: vi.fn(),
  verifyIdToken: vi.fn(),
  resolveUser: vi.fn(),
}));
vi.mock('@/lib/oidc', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/oidc')>()),
  exchangeCode: cognito.exchangeCode,
  verifyIdToken: cognito.verifyIdToken,
}));
vi.mock('@/lib/accounts', () => ({ resolveUser: cognito.resolveUser }));

import { GET as login } from './auth/login/route';
import { GET as callback } from './auth/callback/route';
import { GET as logout } from './auth/logout/route';

const SECRET = 'flow-secret';
const ENV = {
  AUTH_SECRET: SECRET,
  COGNITO_DOMAIN: 'https://prep-dev.auth.us-east-1.amazoncognito.com',
  COGNITO_USER_POOL_ID: 'us-east-1_abc',
  COGNITO_CLIENT_ID: 'client123',
  COGNITO_CLIENT_SECRET: 'shh',
  SITE_URL: 'https://prep.test',
};

beforeAll(() => Object.assign(process.env, ENV));
afterAll(() => { for (const key of Object.keys(ENV)) delete process.env[key]; });
beforeEach(() => {
  vi.clearAllMocks();
  cognito.exchangeCode.mockResolvedValue('id-token');
  cognito.verifyIdToken.mockResolvedValue({ sub: 'sub1', email: 'a@b.test', emailVerified: true });
  cognito.resolveUser.mockResolvedValue({ userId: 'usr_a', created: false });
});

/** Start a sign-in; return Cognito's URL and the state cookie the browser now holds. */
async function startSignIn(path = '/api/auth/login?next=/stats') {
  const res = await login(new NextRequest(`https://prep.test${path}`));
  const cookie = res.cookies.get('pt_oauth')!.value;
  return { location: new URL(res.headers.get('location')!), cookie };
}

function returnFromCognito(query: string, cookie?: string) {
  return callback(new NextRequest(`https://prep.test/api/auth/callback?${query}`, {
    headers: cookie ? { cookie: `pt_oauth=${cookie}` } : {},
  }));
}

describe('/api/auth/login', () => {
  it('sends the browser to Cognito with a PKCE challenge, never the verifier', async () => {
    const { location, cookie } = await startSignIn();
    expect(location.origin).toBe('https://prep-dev.auth.us-east-1.amazoncognito.com');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('state')).toBeTruthy();
    expect(location.searchParams.get('nonce')).toBeTruthy();
    expect(location.toString()).not.toContain('verifier');
    expect(cookie).toBeTruthy();
  });
});

describe('/api/auth/callback', () => {
  it('signs the user in and goes on to `next`', async () => {
    const { location, cookie } = await startSignIn();
    const res = await returnFromCognito(`code=abc&state=${location.searchParams.get('state')}`, cookie);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://prep.test/stats');
    expect(await readSession(res.cookies.get(AUTH_COOKIE)!.value, SECRET)).toBe('usr_a');
    // The verifier and nonce from the cookie are what reach Cognito.
    const [, , verifier] = cognito.exchangeCode.mock.calls[0];
    expect(typeof verifier).toBe('string');
    expect(cognito.verifyIdToken.mock.calls[0][2]).toBe(location.searchParams.get('nonce'));
  });

  it("refuses a state that isn't this browser's (CSRF)", async () => {
    const { cookie } = await startSignIn();
    const res = await returnFromCognito('code=abc&state=someone-elses', cookie);
    expect(res.headers.get('location')).toBe('https://prep.test/login?error=expired');
    expect(res.cookies.get(AUTH_COOKIE)).toBeUndefined();
    expect(cognito.exchangeCode).not.toHaveBeenCalled();
  });

  it('refuses a callback with no sign-in in progress', async () => {
    const res = await returnFromCognito('code=abc&state=x');
    expect(res.headers.get('location')).toBe('https://prep.test/login?error=expired');
    expect(cognito.exchangeCode).not.toHaveBeenCalled();
  });

  it('refuses a forged state cookie', async () => {
    const { location, cookie } = await startSignIn();
    const res = await returnFromCognito(`code=abc&state=${location.searchParams.get('state')}`, `${cookie}x`);
    expect(res.headers.get('location')).toBe('https://prep.test/login?error=expired');
  });

  it('does not sign in when the ID token fails verification', async () => {
    cognito.verifyIdToken.mockRejectedValue(new Error('bad signature'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const { location, cookie } = await startSignIn();
    const res = await returnFromCognito(`code=abc&state=${location.searchParams.get('state')}`, cookie);
    expect(res.headers.get('location')).toBe('https://prep.test/login?error=failed');
    expect(res.cookies.get(AUTH_COOKIE)).toBeUndefined();
  });

  it('reports an email another account owns', async () => {
    cognito.resolveUser.mockResolvedValue({ error: 'That email belongs to another account.' });
    const { location, cookie } = await startSignIn();
    const res = await returnFromCognito(`code=abc&state=${location.searchParams.get('state')}`, cookie);
    expect(res.headers.get('location')).toBe('https://prep.test/login?error=account');
  });

  it('only follows a same-site `next`', async () => {
    const { location, cookie } = await startSignIn('/api/auth/login?next=//evil.test');
    const res = await returnFromCognito(`code=abc&state=${location.searchParams.get('state')}`, cookie);
    expect(res.headers.get('location')).toBe('https://prep.test/');
  });

  it('treats a cancelled sign-in as cancelled', async () => {
    const res = await returnFromCognito('error=access_denied');
    expect(res.headers.get('location')).toBe('https://prep.test/login?error=cancelled');
  });
});

it('/api/auth/logout clears the session and ends the Cognito one', async () => {
  const res = await logout(new NextRequest('https://prep.test/api/auth/logout'));
  expect(new URL(res.headers.get('location')!).pathname).toBe('/logout');
  expect(res.cookies.get(AUTH_COOKIE)?.value).toBe('');
});
