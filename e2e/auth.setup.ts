import { test as setup } from '@playwright/test';
import { readFileSync } from 'node:fs';

const STORAGE_STATE = 'e2e/.auth/state.json';

/** Passcode for the app gate: E2E_PASSWORD env, else APP_PASSWORD from .env.local. */
function resolvePasscode(): string | undefined {
  if (process.env.E2E_PASSWORD) return process.env.E2E_PASSWORD;
  try {
    const m = readFileSync('.env.local', 'utf8').match(/^APP_PASSWORD=(.*)$/m);
    if (m) return m[1].trim().replace(/^["']|["']$/g, '');
  } catch { /* no .env.local — auth is likely off */ }
  return undefined;
}

// Runs once before the test projects; saves a signed-in session for them to reuse.
// When auth is disabled (no AUTH_SECRET, middleware fail-open) there's simply no
// passcode and we persist an empty state, so the suite still runs.
setup('authenticate', async ({ page }) => {
  const passcode = resolvePasscode();
  if (passcode) {
    // POST through the page's context so the pt_auth cookie is stored here.
    await page.request.post('/api/auth', { data: { password: passcode } });
  }
  await page.context().storageState({ path: STORAGE_STATE });
});
