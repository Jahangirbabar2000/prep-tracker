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
      // Cloudflare: preptracker.org's DNS (registered there). The provider
      // checks its token when it starts, so it's loaded only when
      // CLOUDFLARE_API_TOKEN is set — a deploy of a stage with a domain takes
      // it from the stage's CloudflareApiToken secret; reading secrets or
      // deploying a domain-less stage needs no token. siteDomain() refuses
      // to deploy a domain stage without it rather than drop the domain.
      providers: {
        aws: { region: REGION },
        ...(process.env.CLOUDFLARE_API_TOKEN ? { cloudflare: { package: '@pulumi/cloudflare', version: '6.22.0' } } : {}),
      },
      // The CI role is account plumbing every other stage depends on: keep it.
      removal: input?.stage === 'production' || input?.stage === 'ci' ? 'retain' : 'remove',
      protect: input?.stage === 'production' || input?.stage === 'ci',
    };
  },
  async run() {
    // `sst deploy --stage ci`, once per account from a laptop: account-wide
    // plumbing — the role GitHub Actions deploys with, and the cost alerts.
    // Every other stage is the app.
    if ($app.stage === 'ci') {
      costAlerts();
      return githubDeployRole();
    }

    keepCloudFrontAddress();

    const tursoUrl = new sst.Secret('TursoDatabaseUrl');
    const tursoToken = new sst.Secret('TursoAuthToken');
    const authSecret = new sst.Secret('AuthSecret');
    // Optional: Ask AI stays off unless NEXT_PUBLIC_ASK_AI=on at build time.
    const openaiKey = new sst.Secret('OpenaiApiKey', 'unset');
    // The stage's public origin (its custom domain, or for now the CloudFront
    // URL). Cognito's callback URLs are built from it, so it has to be known
    // before the site exists — taking it from site.url would be a cycle.
    const siteUrl = new sst.Secret('SiteUrl');
    // The stage's CloudFront address, kept working beside its domain for
    // networks that block newly registered domains. 'none' when there's no
    // domain (the CloudFront address is then SiteUrl itself).
    const siteUrlFallback = new sst.Secret('SiteUrlFallback', 'none');
    // Tracing (instrumentation.ts) to Grafana Cloud's OTLP gateway: its URL and
    // "Authorization=Basic <base64 instance:token>" header. 'off' until set.
    const otelEndpoint = new sst.Secret('OtelEndpoint', 'off');
    const otelHeaders = new sst.Secret('OtelHeaders', 'off');

    const auth = cognito(siteUrl.value, siteUrlFallback.value);

    const site = new sst.aws.Nextjs('Web', {
      domain: siteDomain($app.stage),
      // Pinned OpenNext, and strip the .env files Next copies into the server
      // bundle: a local .env holds the production Turso token, which would
      // otherwise ship to every stage (and back-fill a secret a stage forgot).
      buildCommand:
        'npx --yes @opennextjs/aws@4.1.9 build && find .open-next -name ".env*" -type f -delete',
      // One instance pinged every few minutes, to cut cold starts.
      warm: 1,
      // DELETE /api/account removes the person's Cognito user too.
      permissions: [{ actions: ['cognito-idp:AdminDeleteUser'], resources: [auth.userPoolArn] }],
      // A ceiling on the server function, so a flood of traffic (a bot, an
      // attack) can't scale to the account's 1,000 and run up the bill.
      // Reserved concurrency also comes out of the account pool, so the other
      // stages get less: production far more than two people need, the rest
      // just enough to test with.
      transform: {
        server: { concurrency: { reserved: $app.stage === 'production' ? 50 : 10 } },
      },
      environment: {
        TURSO_DATABASE_URL: tursoUrl.value,
        TURSO_AUTH_TOKEN: tursoToken.value,
        AUTH_SECRET: authSecret.value,
        OPENAI_API_KEY: openaiKey.value,
        SITE_URL: siteUrl.value,
        SITE_URL_ALTERNATES: siteUrlFallback.value,
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

const GITHUB_REPO = 'Jahangirbabar2000/prep-tracker';
const ALERT_EMAIL = 'jahangirbabar2000@gmail.com';

/**
 * Email alerts on the whole account's spend. The account is on the Paid plan
 * with no credits, so anything past a free allowance is billed: expected
 * spend is about $0.55/month (the Route 53 zone, S3 pennies), so $1 actual
 * is the first sign of something new, and a $5 forecast catches a trend
 * before the month is out. AWS Budgets is free for the first two.
 */
function costAlerts() {
  new aws.budgets.Budget('MonthlySpend', {
    name: 'prep-tracker-monthly-actual',
    budgetType: 'COST',
    limitAmount: '1',
    limitUnit: 'USD',
    timeUnit: 'MONTHLY',
    notifications: [{
      comparisonOperator: 'GREATER_THAN',
      threshold: 100,
      thresholdType: 'PERCENTAGE',
      notificationType: 'ACTUAL',
      subscriberEmailAddresses: [ALERT_EMAIL],
    }],
  });
  new aws.budgets.Budget('MonthlyForecast', {
    name: 'prep-tracker-monthly-forecast',
    budgetType: 'COST',
    limitAmount: '5',
    limitUnit: 'USD',
    timeUnit: 'MONTHLY',
    notifications: [{
      comparisonOperator: 'GREATER_THAN',
      threshold: 100,
      thresholdType: 'PERCENTAGE',
      notificationType: 'FORECASTED',
      subscriberEmailAddresses: [ALERT_EMAIL],
    }],
  });
}
// GitHub environments the deploy workflow's jobs run in. Not Vercel's own
// "Preview"/"Production" (environment names are case-insensitive).
const DEPLOY_ENVIRONMENTS = ['aws-staging', 'aws-production'];

/**
 * GitHub Actions signs in to AWS with OIDC — no AWS keys stored in GitHub.
 * The role trusts only this repository's jobs running in one of the deploy
 * environments, so a pull request (from a fork or not) can't assume it.
 * It is administrator because `sst deploy` creates IAM roles, CloudFront,
 * Lambda, Cognito and SSM resources across the account; the trust policy is
 * what narrows it.
 */
function githubDeployRole() {
  const provider = new aws.iam.OpenIdConnectProvider('GithubOidc', {
    url: 'https://token.actions.githubusercontent.com',
    clientIdLists: ['sts.amazonaws.com'],
  });
  const role = new aws.iam.Role('GithubDeploy', {
    name: 'prep-tracker-github-deploy',
    maxSessionDuration: 3600,
    assumeRolePolicy: provider.arn.apply(arn => JSON.stringify({
      Version: '2012-10-17',
      Statement: [{
        Effect: 'Allow',
        Principal: { Federated: arn },
        Action: 'sts:AssumeRoleWithWebIdentity',
        Condition: {
          // sub is single-valued: a list under StringEquals means "any one of".
          StringEquals: {
            'token.actions.githubusercontent.com:aud': 'sts.amazonaws.com',
            'token.actions.githubusercontent.com:sub': DEPLOY_ENVIRONMENTS.map(env => `repo:${GITHUB_REPO}:environment:${env}`),
          },
        },
      }],
    })),
  });
  new aws.iam.RolePolicyAttachment('GithubDeployAdmin', {
    role: role.name,
    policyArn: 'arn:aws:iam::aws:policy/AdministratorAccess',
  });
  return { githubDeployRoleArn: role.arn };
}

/**
 * The user pool and its managed login. Email is the username; Cognito
 * verifies it before first sign-in, which is what lets lib/accounts.ts link
 * a waiting account by email. The app client is confidential (it has a
 * secret): the code exchange happens on the server, never in the browser.
 */
/**
 * Once a site has a custom domain, SST's CloudFront function answers its
 * *.cloudfront.net address with a 403 (so one site isn't served at two
 * addresses). We want that address kept: strict networks — campus wifi,
 * company filters — block newly registered domains for weeks, and the
 * CloudFront address is the fallback that still gets through. This strips
 * exactly that block from SST's function code. If an SST upgrade changes
 * the snippet the pattern stops matching, the fallback 403s again, and the
 * deploy's smoke test of SiteUrlFallback fails — so it can't break silently.
 */
function keepCloudFrontAddress() {
  const block = /if \(event\.request\.headers\.host\.value\.includes\('cloudfront\.net'\)\) \{[\s\S]*?\n\}/;
  $transform(aws.cloudfront.Function, (args) => {
    args.code = $output(args.code).apply(code => code.replace(block, '// cloudfront.net address kept (sst.config.ts keepCloudFrontAddress)'));
  });
}

const DOMAIN = 'preptracker.org';
const CLOUDFLARE_ZONE = '55b512410dc47a4a4513fe82be92c32e';

/**
 * The stage's custom domain: production at the apex (www redirects to it),
 * staging on a subdomain, any other stage on its CloudFront address alone.
 * DNS is Cloudflare's, DNS-only (not proxied — CloudFront is already the
 * CDN); SST issues the ACM certificate and validates it through those records.
 */
function siteDomain(stage: string) {
  const name = stage === 'production' ? DOMAIN : stage === 'staging' ? `staging.${DOMAIN}` : null;
  if (!name) return undefined;
  if (!process.env.CLOUDFLARE_API_TOKEN) {
    throw new Error(`Deploying ${stage} needs CLOUDFLARE_API_TOKEN (its CloudflareApiToken secret) to manage ${name}'s DNS.`);
  }
  const dns = sst.cloudflare.dns({ zone: CLOUDFLARE_ZONE });
  return stage === 'production' ? { name, redirects: [`www.${DOMAIN}`], dns } : { name, dns };
}

function cognito(siteUrl: $util.Output<string>, fallbackUrl: $util.Output<string>) {
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
    // Sign-in works on the domain and on the CloudFront fallback alike.
    callbackUrls: $util.all([siteUrl, fallbackUrl]).apply(([main, fallback]) =>
      [main, ...(fallback.startsWith('http') ? [fallback] : []), ...local].map(origin => `${origin}/api/auth/callback`)),
    logoutUrls: $util.all([siteUrl, fallbackUrl]).apply(([main, fallback]) =>
      [main, ...(fallback.startsWith('http') ? [fallback] : []), ...local].map(origin => `${origin}/`)),
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
