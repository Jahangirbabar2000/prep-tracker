import { test, expect } from '@playwright/test';

// On mobile the nav lives behind a drawer; open it first.
async function openNav(page: import('@playwright/test').Page, isMobile: boolean) {
  if (isMobile) await page.getByRole('button', { name: 'Open menu' }).click();
}

test('review queue home renders', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Prep Tracker/i);
  await expect(page.getByRole('heading', { name: 'Review Queue' })).toBeVisible();
  await expect(page.getByText('Everything due across all domains')).toBeVisible();
});

test('all domains including Behavioral appear in navigation', async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === 'mobile';
  await page.goto('/');
  await openNav(page, isMobile);
  for (const href of ['/dsa', '/system-design', '/lld', '/backend', '/frontend', '/ai', '/behavioral']) {
    await expect(page.locator(`a[href="${href}"]:visible`).first()).toBeVisible();
  }
});

test('navigating to a domain updates the URL', async ({ page }, testInfo) => {
  const isMobile = testInfo.project.name === 'mobile';
  await page.goto('/');
  await openNav(page, isMobile);
  await page.locator('a[href="/dsa"]:visible').first().click();
  await expect(page).toHaveURL(/\/dsa$/);
});

test('review queue filter selects are accessible (have names)', async ({ page }) => {
  await page.goto('/');
  // These only render when there is more than one domain/level available.
  const domain = page.getByRole('combobox', { name: 'Filter by domain' });
  if (await domain.count()) {
    await expect(domain).toBeVisible();
    await expect(page.getByRole('combobox', { name: 'Filter by level' })).toBeVisible();
  }
});
