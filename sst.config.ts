// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- SST's generated globals ($config, sst.*) are only exposed this way
/// <reference path="./.sst/platform/config.d.ts" />

// AWS hosting: CloudFront in front, Lambda for pages, the proxy and /api/*,
// S3 for static assets — built by OpenNext. Turso stays the database.
//
// Secrets live in SSM via `sst secret set <Name> <value> --stage <stage>` and
// reach the app as plain env vars, so app code keeps reading process.env and
// stays deployable anywhere.
//
// Sign-in is Cognito managed login (lib/oidc.ts). The passcode is local-only:
// no stage sets APP_PASSWORD.

const REGION = 'us-east-1';

export default $config({
  app(input) {
    return {
      name: 'prep-tracker',
      home: 'aws',
      // Turso is in aws-us-east-1; keep Lambda next to it.
      providers: { aws: { region: REGION } },
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: input?.stage === 'production',
    };
  },
  async run() {
    const tursoUrl = new sst.Secret('TursoDatabaseUrl');
    const tursoToken = new sst.Secret('TursoAuthToken');
    const authSecret = new sst.Secret('AuthSecret');
    // Optional: Ask AI stays off unless NEXT_PUBLIC_ASK_AI=on at build time.
    const openaiKey = new sst.Secret('OpenaiApiKey', 'unset');
    // The stage's public origin (its custom domain, or for now the CloudFront
    // URL). Cognito's callback URLs are built from it, so it has to be known
    // before the site exists — taking it from site.url would be a cycle.
    const siteUrl = new sst.Secret('SiteUrl');
    // Tracing (instrumentation.ts) to Grafana Cloud's OTLP gateway: its URL and
    // "Authorization=Basic <base64 instance:token>" header. 'off' until set.
    const otelEndpoint = new sst.Secret('OtelEndpoint', 'off');
    const otelHeaders = new sst.Secret('OtelHeaders', 'off');

    const auth = cognito(siteUrl.value);

    const site = new sst.aws.Nextjs('Web', {
      // Pinned OpenNext, and strip the .env files Next copies into the server
      // bundle: a local .env holds the production Turso token, which would
      // otherwise ship to every stage (and back-fill a secret a stage forgot).
      buildCommand:
        'npx --yes @opennextjs/aws@4.1.9 build && find .open-next -name ".env*" -type f -delete',
      // One instance pinged every few minutes, to cut cold starts.
      warm: 1,
      // DELETE /api/account removes the person's Cognito user too.
      permissions: [{ actions: ['cognito-idp:AdminDeleteUser'], resources: [auth.userPoolArn] }],
      environment: {
        TURSO_DATABASE_URL: tursoUrl.value,
        TURSO_AUTH_TOKEN: tursoToken.value,
        AUTH_SECRET: authSecret.value,
        OPENAI_API_KEY: openaiKey.value,
        SITE_URL: siteUrl.value,
        NEXT_PUBLIC_SITE_URL: siteUrl.value,
        COGNITO_DOMAIN: auth.domain,
        COGNITO_USER_POOL_ID: auth.userPoolId,
        COGNITO_CLIENT_ID: auth.clientId,
        COGNITO_CLIENT_SECRET: auth.clientSecret,
        // The server computes "today" in this zone.
        TZ: 'America/New_York',
        // Brotli effort for the compressed wrapper (open-next.config.ts): fast
        // enough for a multi-MB /api/sync, still far smaller than the raw JSON.
        BROTLI_QUALITY: '4',
        OTEL_EXPORTER_OTLP_ENDPOINT: otelEndpoint.value,
        OTEL_EXPORTER_OTLP_HEADERS: otelHeaders.value,
        OTEL_SERVICE_NAME: 'prep-tracker',
        DEPLOY_STAGE: $app.stage,
        // The commit being deployed (CI sets it), so a trace names its release.
        SERVICE_VERSION: process.env.GITHUB_SHA?.slice(0, 7) ?? 'local',
        // Build-time public config, read from the deploying shell (CI sets them).
        ...publicEnv([
          'NEXT_PUBLIC_APP_NAME',
          'NEXT_PUBLIC_ASK_AI',
          'NEXT_PUBLIC_AUTHOR_NAME',
          'NEXT_PUBLIC_AUTHOR_GITHUB',
          'NEXT_PUBLIC_AUTHOR_LINKEDIN',
          'NEXT_PUBLIC_REPO_URL',
          // PostHog project key (public by design); analytics is off without it.
          'NEXT_PUBLIC_POSTHOG_KEY',
        ]),
      },
    });

    return { url: site.url, signIn: auth.domain };
  },
});

/**
 * The user pool and its managed login. Email is the username; Cognito
 * verifies it before first sign-in, which is what lets lib/accounts.ts link
 * a waiting account by email. The app client is confidential (it has a
 * secret): the code exchange happens on the server, never in the browser.
 */
function cognito(siteUrl: $util.Output<string>) {
  const stage = $app.stage;
  const production = stage === 'production';
  // Prefix domains are global per region, so the account id keeps ours unique.
  const account = aws.getCallerIdentityOutput().accountId;

  const pool = new aws.cognito.UserPool('Users', {
    name: `${$app.name}-${stage}`,
    // Essentials: managed login v2; free up to 10,000 monthly active users.
    userPoolTier: 'ESSENTIALS',
    usernameAttributes: ['email'],
    autoVerifiedAttributes: ['email'],
    usernameConfiguration: { caseSensitive: false },
    passwordPolicy: {
      minimumLength: 10,
      requireLowercase: false,
      requireUppercase: false,
      requireNumbers: false,
      requireSymbols: false,
      temporaryPasswordValidityDays: 7,
    },
    accountRecoverySetting: { recoveryMechanisms: [{ name: 'verified_email', priority: 1 }] },
    // Cognito's own sender: no SES to set up, and its daily cap is far above this app's sign-ups.
    emailConfiguration: { emailSendingAccount: 'COGNITO_DEFAULT' },
    verificationMessageTemplate: { defaultEmailOption: 'CONFIRM_WITH_CODE' },
    deletionProtection: production ? 'ACTIVE' : 'INACTIVE',
  });

  const domain = new aws.cognito.UserPoolDomain('UsersDomain', {
    userPoolId: pool.id,
    domain: $interpolate`${$app.name}-${stage}-${account.apply(id => id.slice(-6))}`,
    managedLoginVersion: 2,
  });

  // localhost only outside production, for `npm run dev` against this stage's pool.
  const local = production ? [] : ['http://localhost:3007'];
  const client = new aws.cognito.UserPoolClient('WebClient', {
    name: 'web',
    userPoolId: pool.id,
    generateSecret: true,
    allowedOauthFlowsUserPoolClient: true,
    allowedOauthFlows: ['code'],
    allowedOauthScopes: ['openid', 'email'],
    supportedIdentityProviders: ['COGNITO'],
    callbackUrls: [$interpolate`${siteUrl}/api/auth/callback`, ...local.map(origin => `${origin}/api/auth/callback`)],
    logoutUrls: [$interpolate`${siteUrl}/`, ...local.map(origin => `${origin}/`)],
    explicitAuthFlows: ['ALLOW_REFRESH_TOKEN_AUTH', 'ALLOW_USER_SRP_AUTH'],
    preventUserExistenceErrors: 'ENABLED',
    enableTokenRevocation: true,
    // The app keeps its own session; Cognito's tokens are used once, at sign-in.
    idTokenValidity: 60,
    accessTokenValidity: 60,
    refreshTokenValidity: 1,
    tokenValidityUnits: { idToken: 'minutes', accessToken: 'minutes', refreshToken: 'days' },
  });

  // Managed login v2 is unavailable to a client until it has a branding style.
  new aws.cognito.ManagedLoginBranding('WebClientBranding', {
    userPoolId: pool.id,
    clientId: client.id,
    useCognitoProvidedValues: true,
  });

  return {
    domain: $interpolate`https://${domain.domain}.auth.${REGION}.amazoncognito.com`,
    userPoolId: pool.id,
    userPoolArn: pool.arn,
    clientId: client.id,
    clientSecret: client.clientSecret,
  };
}

function publicEnv(keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = process.env[key];
    if (value) out[key] = value;
  }
  return out;
}
