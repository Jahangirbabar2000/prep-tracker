import { test, expect, type Page } from '@playwright/test';

// The first review of any card lands one day out, and a card you keep missing
// walks back down to that 1-day step and repeats until it sticks.
// Fixture-driven: every test stubs /api/sync, so nothing touches the real DB.

const DOMAIN = {
  id: 'first_review_fixture',
  slug: 'first-review-fixture',
  name: 'First Review Fixture',
  short_name: 'FR',
  study_mode: 'flashcard',
  icon: 'book',
  color: 'blue',
  sort_order: 0,
  item_label: 'Question',
  log_label: 'Log Question',
  log_title: 'Log First Review Fixture',
  empty_message: 'Empty',
  answer_placeholder: 'Answer',
  default_link: '',
  archived_at: null,
};

interface Card {
  id: number;
  name: string;
  level: number;
  due: string | null;
  /** Outcome per attempt, oldest first. Length must replay to `level`. */
  struggles: number[];
}

function syncPayload(cards: Card[]) {
  return {
    domains: [DOMAIN],
    domain_fields: [],
    domain_field_options: [],
    config_options: [],
    problems: cards.map(c => ({
      id: c.id,
      name: c.name,
      domain: DOMAIN.id,
      metadata: {},
      notes_text: 'Answer body',
      interval_level: c.level,
      next_due_date: c.due,
      created_at: '2000-01-01 00:00:00',
    })),
    attempts: cards.flatMap(c => c.struggles.map((s, k) => ({
      id: c.id * 10 + k,
      problem_id: c.id,
      attempted_at: `2000-01-${String(k + 1).padStart(2, '0')} 00:00:00`,
      time_taken_mins: 0,
      struggled: s,
      practice_type: null,
    }))),
    notes: [],
    links: [],
  };
}

async function stubSync(page: Page, payload: unknown) {
  await page.route('**/api/sync', route => route.fulfill({
    contentType: 'application/json',
    json: payload as Record<string, unknown>,
  }));
}

test('a card logged once reads New — not Struggling — and is due tomorrow', async ({ page }) => {
  // Every first log now sets a due date, so "has a due date" can no longer mean
  // Struggling; that label waits for a second miss.
  await stubSync(page, syncPayload([
    { id: 8001, name: 'A freshly logged question', level: 0, due: '2099-01-01', struggles: [0] },
  ]));
  await page.goto(`/${DOMAIN.slug}/8001`);

  const badge = page.getByRole('button', { name: /Proficiency: New/ });
  await expect(badge).toBeVisible();
  await badge.hover();
  await expect(page.getByText('Level 0')).toBeVisible();
  await expect(page.getByText('Next review tomorrow')).toBeVisible();
});

test('a card missed twice reads Struggling and still comes back tomorrow', async ({ page }) => {
  await stubSync(page, syncPayload([
    { id: 8002, name: 'A question that is not sticking', level: 0, due: '2000-01-01', struggles: [1, 1] },
  ]));
  await page.goto(`/${DOMAIN.slug}/8002`);

  const badge = page.getByRole('button', { name: /Proficiency: Struggling/ });
  await expect(badge).toBeVisible();
  await badge.hover();
  await expect(page.getByText('Next review tomorrow')).toBeVisible();
  // Floored at the bottom: another miss keeps it daily rather than going lower.
  await expect(page.getByText('stays at Struggling')).toBeVisible();
});

test('the ladder reads 1 → 3 → 7 days on the way up', async ({ page }) => {
  await stubSync(page, syncPayload([
    { id: 8010, name: 'Learning card', level: 1, due: '2099-01-01', struggles: [0, 0] },
    { id: 8011, name: 'Familiar card', level: 2, due: '2099-01-01', struggles: [0, 0, 0] },
  ]));

  await page.goto(`/${DOMAIN.slug}/8010`);
  await page.getByRole('button', { name: /Proficiency: Learning/ }).hover();
  await expect(page.getByText('Next review in ~3 days')).toBeVisible();

  await page.goto(`/${DOMAIN.slug}/8011`);
  await page.getByRole('button', { name: /Proficiency: Familiar/ }).hover();
  await expect(page.getByText('Next review in ~7 days')).toBeVisible();
});

test('the new Proficient tier sits between Familiar and Confident', async ({ page }) => {
  await stubSync(page, syncPayload([
    { id: 8020, name: 'Proficient card', level: 3, due: '2099-01-01', struggles: [0, 0, 0, 0] },
  ]));
  await page.goto(`/${DOMAIN.slug}/8020`);

  const badge = page.getByRole('button', { name: /Proficiency: Proficient/ });
  await expect(badge).toBeVisible();
  await badge.hover();
  await expect(page.getByText('Level 3')).toBeVisible();
  await expect(page.getByText('Next review in ~14 days')).toBeVisible();
  await expect(page.getByText('advances to Confident')).toBeVisible();
  await expect(page.getByText('drops to Familiar')).toBeVisible();
});

test('struggling a mid-ladder card walks it back down toward the daily step', async ({ page }) => {
  // Familiar (3 successes) then two misses → back to the 1-day step.
  await stubSync(page, syncPayload([
    { id: 8030, name: 'A card sliding back', level: 0, due: '2000-01-01', struggles: [0, 0, 0, 1, 1] },
  ]));
  await page.goto(`/${DOMAIN.slug}/8030`);

  await expect(page.getByRole('button', { name: /Proficiency: Struggling/ })).toBeVisible();
  await page.getByRole('button', { name: /Proficiency: Struggling/ }).hover();
  await expect(page.getByText('Next review tomorrow')).toBeVisible();
});
