import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  turbopack: {},
  // The e2e server (e2e/server.mjs) builds into its own folder, so it can run
  // beside `npm run dev` without the two fighting over .next.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
};

export default nextConfig;
