import { NextResponse } from 'next/server';
import { AdminDeleteUserCommand, CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import { clearSessionCookies } from '@/lib/sessionCookies';
import { deleteAccount, exportAccount } from '@/lib/accountData';
import { withUser } from '@/lib/currentUser';
import { cognitoConfig } from '@/lib/oidc';

export const runtime = 'nodejs';

// GET /api/account — "Download my data": everything this account holds, as JSON.
export const GET = withUser(async (_req, userId) => {
  const data = await exportAccount(userId);
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="prep-tracker-export-${data.exported_at.slice(0, 10)}.json"`,
      'Cache-Control': 'private, no-store',
    },
  });
});

// DELETE /api/account — delete this account: its rows, then its Cognito user.
// The data goes first; if Cognito can't be reached, the rows are still gone
// and a later sign-in with that Cognito account just starts a new, empty one.
export const DELETE = withUser(async (_req, userId) => {
  const { cognitoSub } = await deleteAccount(userId);
  const config = cognitoConfig();
  if (config && cognitoSub) {
    try {
      await new CognitoIdentityProviderClient({}).send(
        new AdminDeleteUserCommand({ UserPoolId: config.userPoolId, Username: cognitoSub }),
      );
    } catch (error) {
      console.error('Account deleted, but its Cognito user was not:', error);
    }
  }
  const res = NextResponse.json({ ok: true });
  clearSessionCookies(res);
  return res;
});
