import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},
  // The e2e server (e2e/server.mjs) builds into its own folder, so it can run
  // beside `npm run dev` without the two fighting over .next.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Analytics (lib/analytics.ts) posts to this site's /ingest, passed on to
  // PostHog, so ad blockers don't drop it.
  async rewrites() {
    return [
      { source: '/ingest/static/:path*', destination: 'https://us-assets.i.posthog.com/static/:path*' },
      { source: '/ingest/:path*', destination: 'https://us.i.posthog.com/:path*' },
    ];
  },
  // PostHog's API paths end in a slash; don't redirect them away from it.
  skipTrailingSlashRedirect: true,
};

export default nextConfig;
