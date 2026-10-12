// eslint-disable-next-line @typescript-eslint/triple-slash-reference -- SST's generated globals ($config, sst.*) are only exposed this way
/// <reference path="./.sst/platform/config.d.ts" />

// AWS hosting: CloudFront in front, Lambda for pages, the proxy and /api/*,
// S3 for static assets — built by OpenNext. Turso stays the database.
//
// Secrets live in SSM via `sst secret set <Name> <value> --stage <stage>` and
// reach the app as plain env vars, so app code keeps reading process.env and
// stays deployable anywhere.

export default $config({
  app(input) {
    return {
      name: 'prep-tracker',
      home: 'aws',
      // Turso is in aws-us-east-1; keep Lambda next to it.
      providers: { aws: { region: 'us-east-1' } },
      removal: input?.stage === 'production' ? 'retain' : 'remove',
      protect: input?.stage === 'production',
    };
  },
  async run() {
    const tursoUrl = new sst.Secret('TursoDatabaseUrl');
    const tursoToken = new sst.Secret('TursoAuthToken');
    const authSecret = new sst.Secret('AuthSecret');
    const appPassword = new sst.Secret('AppPassword');
    // Optional: Ask AI stays off unless NEXT_PUBLIC_ASK_AI=on at build time.
    const openaiKey = new sst.Secret('OpenaiApiKey', 'unset');

    const site = new sst.aws.Nextjs('Web', {
      // Pinned OpenNext, and strip the .env files Next copies into the server
      // bundle: a local .env holds the production Turso token, which would
      // otherwise ship to every stage (and back-fill a secret a stage forgot).
      buildCommand:
        'npx --yes @opennextjs/aws@4.1.9 build && find .open-next -name ".env*" -type f -delete',
      // One instance pinged every few minutes, to cut cold starts.
      warm: 1,
      environment: {
        TURSO_DATABASE_URL: tursoUrl.value,
        TURSO_AUTH_TOKEN: tursoToken.value,
        AUTH_SECRET: authSecret.value,
        APP_PASSWORD: appPassword.value,
        OPENAI_API_KEY: openaiKey.value,
        // The server computes "today" in this zone.
        TZ: 'America/New_York',
        // Build-time public config, read from the deploying shell (CI sets them).
        ...publicEnv([
          'NEXT_PUBLIC_APP_NAME',
          'NEXT_PUBLIC_ASK_AI',
          'NEXT_PUBLIC_AUTHOR_NAME',
          'NEXT_PUBLIC_AUTHOR_GITHUB',
          'NEXT_PUBLIC_AUTHOR_LINKEDIN',
          'NEXT_PUBLIC_REPO_URL',
          'NEXT_PUBLIC_SITE_URL',
        ]),
      },
    });

    return { url: site.url };
  },
});

function publicEnv(keys: string[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of keys) {
    const value = process.env[key];
    if (value) out[key] = value;
  }
  return out;
}
