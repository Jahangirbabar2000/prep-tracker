import { test, expect, type Page } from '@playwright/test';
import { E2E_PASSCODE, NEW_USER, OWNER, OWNER_CARD, SECOND_USER, SECOND_USER_CARD } from './env.mjs';

// Two real accounts on e2e/server.mjs's seeded database, signed in through the
// test-only "sign in as" passcode. Each test starts as a stranger: no cookies,
// no storage.
test.use({ storageState: { cookies: [], origins: [] } });

async function signInAs(page: Page, userId: string) {
  const res = await page.request.post('/api/auth', { data: { password: E2E_PASSCODE, user_id: userId } });
  expect(res.ok(), `sign-in as ${userId}: HTTP ${res.status()}`).toBe(true);
}

/** The app's IndexedDB databases in this browser (the demo's aside). */
const accountDatabases = (page: Page) =>
  page.evaluate(async () => (await indexedDB.databases()).map(db => db.name ?? '').filter(name => name.startsWith('prep-store') && name !== 'prep-store-demo').sort());

async function openDeck(page: Page) {
  await page.goto('/dsa');
  // The store has hydrated and synced once the deck's own heading is up.
  await expect(page.getByRole('heading', { name: 'DSA' }).first()).toBeVisible();
}

test('each account sees only its own cards', async ({ browser }) => {
  const owner = await (await browser.newContext()).newPage();
  const bravo = await (await browser.newContext()).newPage();
  await signInAs(owner, OWNER);
  await signInAs(bravo, SECOND_USER);

  await openDeck(owner);
  await expect(owner.getByText(OWNER_CARD)).toBeVisible();
  await expect(owner.getByText(SECOND_USER_CARD)).toHaveCount(0);

  await openDeck(bravo);
  await expect(bravo.getByText(SECOND_USER_CARD)).toBeVisible();
  await expect(bravo.getByText(OWNER_CARD)).toHaveCount(0);

  // And straight at the API: the owner's card is a 404 to the second user.
  const sync = await (await owner.request.get('/api/sync')).json();
  const ownerCard = sync.problems.find((problem: { name: string }) => problem.name === OWNER_CARD);
  expect((await bravo.request.get(`/api/problems/${ownerCard.id}`)).status()).toBe(404);
});

test("a second account on the same browser finds nothing of the first's", async ({ page }) => {
  await signInAs(page, OWNER);
  await openDeck(page);
  await expect(page.getByText(OWNER_CARD)).toBeVisible();
  expect(await accountDatabases(page)).toEqual([`prep-store-${OWNER}`]);

  // The owner's session ends without a sign-out (it expired, or the account
  // was deleted elsewhere), and someone else signs in on this browser.
  await page.context().clearCookies();
  await signInAs(page, SECOND_USER);
  await openDeck(page);

  await expect(page.getByText(SECOND_USER_CARD)).toBeVisible();
  await expect(page.getByText(OWNER_CARD)).toHaveCount(0);
  expect(await accountDatabases(page)).toEqual([`prep-store-${SECOND_USER}`]);
});

test('signing out leaves no account data in the browser', async ({ page }) => {
  await signInAs(page, SECOND_USER);
  await openDeck(page);
  expect(await accountDatabases(page)).toEqual([`prep-store-${SECOND_USER}`]);

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Log out' }).click();
  await expect(page).toHaveURL(/\/login$/);

  expect(await accountDatabases(page)).toEqual([]);
  expect((await page.request.get('/api/sync')).status()).toBe(401);
});

test('a signed-out visitor gets the landing page, and the API refuses them', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /A study partner that remembers/ })).toBeVisible();
  await page.goto('/stats');
  await expect(page).toHaveURL(/\/\?next=%2Fstats$/);
  expect((await page.request.get('/api/sync')).status()).toBe(401);
});

test('a brand-new account has no decks and is asked to create its first', async ({ page }) => {
  await signInAs(page, NEW_USER);
  await page.goto('/');
  const create = page.getByRole('link', { name: 'Create your first deck' });
  await expect(create).toBeVisible();
  // None of the built-in interview decks stand in for the decks it doesn't have.
  for (const name of ['DSA', 'System Design', 'Behavioral']) {
    await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0);
  }
  await create.click();
  await expect(page).toHaveURL(/\/settings\?new=1$/);
  await expect(page.getByPlaceholder('Databases').first()).toBeVisible();
});
