import { defineConfig, devices } from '@playwright/test';
import { E2E_PORT } from './e2e/env.mjs';

// Its own port, so a running `npm run dev` (whose .env.local database is
// production) is never mistaken for the e2e server and reused.
const PORT = E2E_PORT;
const BASE_URL = `http://localhost:${PORT}`;
const STORAGE_STATE = 'e2e/.auth/state.json';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    // Authenticates once (past the passcode gate) and saves the session.
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], storageState: STORAGE_STATE }, dependencies: ['setup'] },
    { name: 'mobile', use: { ...devices['Pixel 7'], storageState: STORAGE_STATE }, dependencies: ['setup'] },
  ],
  // e2e/server.mjs: a fresh migrated, seeded database and its own next dev.
  // Never reused, so every run starts from the same two accounts.
  webServer: {
    command: 'node e2e/server.mjs',
    url: `${BASE_URL}/login`,
    reuseExistingServer: false,
    timeout: 180_000,
  },
});
