import Logo from '@/components/Logo';
import { APP_NAME } from '@/lib/appName';
import { cognitoConfig } from '@/lib/oidc';
import { safeNextPath } from '@/lib/routing';
import PasscodeForm from './PasscodeForm';

// Why a Cognito sign-in came back here instead of into the app (the callback's ?error=).
const ERRORS: Record<string, string> = {
  cancelled: 'Sign-in was cancelled.',
  expired: 'That sign-in took too long or was opened in another browser. Try again.',
  account: 'That email belongs to another account. Contact the site owner.',
  failed: 'Couldn’t sign you in. Try again.',
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  // Deployed stages sign in with Cognito; local development keeps the passcode.
  if (!cognitoConfig() || !process.env.AUTH_SECRET) return <PasscodeForm />;

  const params = await searchParams;
  const next = safeNextPath(params.next);
  const query = next === '/' ? '' : `next=${encodeURIComponent(next)}`;
  const error = params.error ? ERRORS[params.error] ?? ERRORS.failed : null;
  const button = 'inline-flex min-h-11 items-center justify-center rounded-lg text-sm font-medium transition-colors';

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2.5 mb-6">
          <Logo className="w-9 h-9" />
          <span className="font-semibold text-fg">{APP_NAME}</span>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-6">
          <h1 className="text-lg font-semibold text-fg mb-1">Sign in</h1>
          <p className="text-sm text-muted mb-5">Your cards and reviews are private to your account.</p>

          {error && <p className="text-sm text-danger mb-4" role="alert">{error}</p>}

          <div className="flex flex-col gap-3">
            <a href={`/api/auth/login${query ? `?${query}` : ''}`} className={`${button} bg-accent text-accent-fg hover:bg-accent-hover`}>
              Continue to sign in
            </a>
            <a href={`/api/auth/login?signup=1${query ? `&${query}` : ''}`} className={`${button} border border-border bg-surface-2 text-fg hover:border-border-strong`}>
              Create an account
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
