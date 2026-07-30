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

test('review card springs back below threshold and exits on a committed swipe', async ({ page }) => {
  await page.route('**/api/sync', route => route.fulfill({
    contentType: 'application/json',
    json: {
      domains: [{
        id: 'swipe_fixture',
        slug: 'swipe-fixture',
        name: 'Swipe Fixture',
        short_name: 'Swipe',
        study_mode: 'flashcard',
        icon: 'book',
        color: 'blue',
        sort_order: 0,
        item_label: 'Question',
        log_label: 'Log Question',
        log_title: 'Log Swipe Question',
        empty_message: 'Empty',
        answer_placeholder: 'Answer',
        default_link: '',
        archived_at: null,
      }],
      domain_fields: [],
      domain_field_options: [],
      config_options: [],
      problems: [
        {
          id: 9001,
          name: 'Swipe animation fixture one',
          domain: 'swipe_fixture',
          metadata: {},
          notes_text: 'First answer',
          interval_level: 1,
          next_due_date: '2000-01-01',
          created_at: '2000-01-01 00:00:00',
        },
        {
          id: 9002,
          name: 'Swipe animation fixture two',
          domain: 'swipe_fixture',
          metadata: {},
          notes_text: 'Second answer',
          interval_level: 1,
          next_due_date: '2000-01-01',
          created_at: '2000-01-01 00:00:00',
        },
      ],
      attempts: [
        { id: 9101, problem_id: 9001, attempted_at: '2000-01-01 00:00:00', time_taken_mins: 0, struggled: 0, practice_type: null },
        { id: 9102, problem_id: 9002, attempted_at: '2000-01-01 00:00:00', time_taken_mins: 0, struggled: 0, practice_type: null },
      ],
      notes: [],
      links: [],
    },
  }));
  await page.goto('/review/session');
  const card = page.getByTestId('swipe-review-card');
  await expect(card).toBeVisible();

  const box = await card.boundingBox();
  expect(box).not.toBeNull();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + 10;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 40, startY);
  await page.waitForTimeout(180);
  await page.mouse.move(startX + 41, startY);

  const draggedX = await card.evaluate(element => {
    const transform = getComputedStyle(element).transform;
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
  });
  expect(draggedX).toBeGreaterThan(20);

  await page.mouse.up();
  await expect.poll(async () => card.evaluate(element => {
    const transform = getComputedStyle(element).transform;
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
  })).toBeCloseTo(0, 0);

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 140, startY, { steps: 6 });
  await page.mouse.up();
  await expect(page.getByText('Swipe animation fixture two')).toBeVisible();
});
