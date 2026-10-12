import { test as setup, expect } from '@playwright/test';
import { E2E_PASSCODE } from './env.mjs';

const STORAGE_STATE = 'e2e/.auth/state.json';

// Runs once before the test projects; saves the owner's signed-in session for
// them to reuse. The passcode is e2e/server.mjs's throwaway one — the suite
// runs against its own database, never the one in .env.local.
setup('authenticate', async ({ page }) => {
  const res = await page.request.post('/api/auth', { data: { password: E2E_PASSCODE } });
  expect(res.ok(), `sign-in failed: HTTP ${res.status()}`).toBe(true);
  await page.context().storageState({ path: STORAGE_STATE });
});
