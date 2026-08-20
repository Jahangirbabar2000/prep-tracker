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

// The swipe fixture: two flashcards due, so the card can be dragged to the next.
async function mockSwipeDeck(page: import('@playwright/test').Page) {
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
}

test('review card springs back below threshold and exits on a committed swipe', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'card swipe is a phone-only gesture');
  await mockSwipeDeck(page);
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
  await expect(card.getByText('Swipe animation fixture two')).toBeVisible();
});

test('review card does not drag outside phone viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop/tablet contract');
  await mockSwipeDeck(page);
  await page.goto('/review/session');
  const card = page.getByTestId('swipe-review-card');
  await expect(card).toBeVisible();

  const box = await card.boundingBox();
  const startX = box!.x + box!.width / 2;
  const startY = box!.y + 10;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 140, startY, { steps: 6 });

  const draggedX = await card.evaluate(element => {
    const transform = getComputedStyle(element).transform;
    return transform === 'none' ? 0 : new DOMMatrixReadOnly(transform).m41;
  });
  expect(draggedX).toBe(0);

  await page.mouse.up();
  // Still on the first card — and nothing advertises a grab cursor.
  await expect(card.getByText('Swipe animation fixture one')).toBeVisible();
  const grabCursors = await page.locator('[data-swipe-handle="true"]').evaluateAll(
    els => els.map(el => getComputedStyle(el).cursor).filter(cursor => cursor === 'grab'),
  );
  expect(grabCursors).toEqual([]);
});

test('Ask AI leaves the mobile dock and scrolls into normal page flow', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'mobile layout contract');

  await page.route('**/api/sync', route => route.fulfill({
    contentType: 'application/json',
    json: {
      domains: [{
        id: 'ai_fixture',
        slug: 'ai-fixture',
        name: 'AI Fixture',
        short_name: 'AI',
        study_mode: 'flashcard',
        icon: 'book',
        color: 'blue',
        sort_order: 0,
        item_label: 'Question',
        log_label: 'Log Question',
        log_title: 'Log AI Fixture',
        empty_message: 'Empty',
        answer_placeholder: 'Answer',
        default_link: '',
        archived_at: null,
      }],
      domain_fields: [],
      domain_field_options: [],
      config_options: [],
      problems: [{
        id: 9201,
        name: 'Why should an AI explanation stay in document flow?',
        domain: 'ai_fixture',
        metadata: {},
        notes_text: 'So long content remains readable.',
        interval_level: 1,
        next_due_date: '2000-01-01',
        created_at: '2000-01-01 00:00:00',
      }],
      attempts: [
        { id: 9301, problem_id: 9201, attempted_at: '2000-01-01 00:00:00', time_taken_mins: 0, struggled: 0, practice_type: null },
      ],
      notes: [],
      links: [],
    },
  }));
  await page.route('**/api/ask', route => route.fulfill({
    contentType: 'text/plain; charset=utf-8',
    body: 'A mocked explanation that belongs below the review card.',
  }));

  await page.goto('/review/session');
  const aiCard = page.getByTestId('ai-elaboration-card');
  const navDock = page.getByTestId('review-nav-dock');
  const reviewCard = page.getByTestId('swipe-review-card');
  await expect(aiCard).toBeVisible();
  await expect(aiCard).toHaveCSS('position', 'fixed');
  await expect(navDock).toHaveCSS('position', 'fixed');

  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await expect(aiCard).toHaveCSS('position', 'relative');
  await expect(navDock).toHaveCSS('position', 'relative');
  const revealedOverlap = await page.evaluate(() => {
    const card = document.querySelector('[data-testid="swipe-review-card"]')!.getBoundingClientRect();
    const nav = document.querySelector('[data-testid="review-nav-dock"]')!.getBoundingClientRect();
    return Math.max(0, Math.min(card.bottom, nav.bottom) - Math.max(card.top, nav.top));
  });
  expect(revealedOverlap).toBe(0);

  await page.getByRole('button', { name: 'Ask AI to elaborate' }).click();

  await expect(page.getByTestId('ai-elaboration-content')).toBeVisible();
  await expect(page.getByText('A mocked explanation that belongs below the review card.')).toBeVisible();
  await expect(aiCard).toHaveCSS('position', 'relative');
  await expect(navDock).toHaveCSS('position', 'relative');
  await expect(reviewCard).toBeVisible();

  const overlap = await page.evaluate(() => {
    const ai = document.querySelector('[data-testid="ai-elaboration-card"]')!.getBoundingClientRect();
    const nav = document.querySelector('[data-testid="review-nav-dock"]')!.getBoundingClientRect();
    return Math.max(0, Math.min(ai.bottom, nav.bottom) - Math.max(ai.top, nav.top));
  });
  expect(overlap).toBe(0);
});

// Two cards due in different weeks, so the Upcoming forecast has a pager.
async function mockTwoWeekForecast(page: import('@playwright/test').Page) {
  const dayKey = (offset: number) =>
    new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);

  await page.route('**/api/sync', route => route.fulfill({
    contentType: 'application/json',
    json: {
      domains: [{
        id: 'forecast_fixture',
        slug: 'forecast-fixture',
        name: 'Forecast Fixture',
        short_name: 'Forecast',
        study_mode: 'flashcard',
        icon: 'book',
        color: 'blue',
        sort_order: 0,
        item_label: 'Question',
        log_label: 'Log Question',
        log_title: 'Log Forecast Question',
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
          id: 9401,
          name: 'Forecast fixture due this week',
          domain: 'forecast_fixture',
          metadata: {},
          notes_text: 'Answer',
          interval_level: 1,
          next_due_date: dayKey(2),
          created_at: '2000-01-01 00:00:00',
        },
        {
          id: 9402,
          name: 'Forecast fixture due next week',
          domain: 'forecast_fixture',
          metadata: {},
          notes_text: 'Answer',
          interval_level: 1,
          next_due_date: dayKey(10),
          created_at: '2000-01-01 00:00:00',
        },
      ],
      attempts: [],
      notes: [],
      links: [],
    },
  }));
}

test('forecast pager swipes to the next week on a phone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'pager swipe is a phone-only gesture');
  await mockTwoWeekForecast(page);
  await page.goto('/');

  const pager = page.getByTestId('forecast-pager');
  await expect(pager).toBeVisible();
  await expect(page.getByRole('button', { name: 'Next 7 days' })).toHaveAttribute('aria-current', 'true');

  const box = await pager.boundingBox();
  const startX = box!.x + box!.width - 20;
  const startY = box!.y + box!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 140, startY, { steps: 6 });
  await page.mouse.up();

  await expect(page.getByRole('button', { name: 'Next 7 days' })).not.toHaveAttribute('aria-current', 'true');
});

test('forecast pager does not swipe outside phone viewports', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'desktop/tablet contract');
  await mockTwoWeekForecast(page);
  await page.goto('/');

  const pager = page.getByTestId('forecast-pager');
  await expect(pager).toBeVisible();
  const thisWeek = page.getByRole('button', { name: 'Next 7 days' });
  await expect(thisWeek).toHaveAttribute('aria-current', 'true');

  const box = await pager.boundingBox();
  const startX = box!.x + box!.width - 20;
  const startY = box!.y + box!.height / 2;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX - 140, startY, { steps: 6 });
  await page.mouse.up();

  // Still on the first week; the chevrons remain the way forward.
  await expect(thisWeek).toHaveAttribute('aria-current', 'true');
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(thisWeek).not.toHaveAttribute('aria-current', 'true');
});
