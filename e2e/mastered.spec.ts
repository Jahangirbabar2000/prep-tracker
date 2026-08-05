import { test, expect, type Page } from '@playwright/test';

// Fixture-driven: every test stubs /api/sync, so none of this touches the real
// database. Covers the Mastered (level 5) tier end-to-end in the real UI.

const DOMAIN = {
  id: 'mastered_fixture',
  slug: 'mastered-fixture',
  name: 'Mastered Fixture',
  short_name: 'MF',
  study_mode: 'flashcard',
  icon: 'book',
  color: 'blue',
  sort_order: 0,
  item_label: 'Question',
  log_label: 'Log Question',
  log_title: 'Log Mastered Fixture',
  empty_message: 'Empty',
  answer_placeholder: 'Answer',
  default_link: '',
  archived_at: null,
};

/**
 * One problem per requested level. Since the SR level is replayed from the full
 * attempt history (lib/sr.ts replaySchedule), the fixture must be internally
 * consistent. The first attempt always lands at level 0 whatever its outcome,
 * so reaching level N takes N+1 attempts — a "level 4" problem needs five.
 */
function syncPayload(levels: Array<{ id: number; name: string; level: number; due: string | null }>) {
  const attempts = levels.flatMap(l =>
    Array.from({ length: l.level + 1 }, (_, k) => ({
      id: l.id * 10 + k,
      problem_id: l.id,
      attempted_at: `2000-01-${String(k + 1).padStart(2, '0')} 00:00:00`,
      time_taken_mins: 0,
      struggled: 0,
      practice_type: null,
    })),
  );
  return {
    domains: [DOMAIN],
    domain_fields: [],
    domain_field_options: [],
    config_options: [],
    problems: levels.map(l => ({
      id: l.id,
      name: l.name,
      domain: DOMAIN.id,
      metadata: {},
      notes_text: 'Answer body',
      interval_level: l.level,
      next_due_date: l.due,
      created_at: '2000-01-01 00:00:00',
    })),
    attempts,
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

test('a level-5 problem renders the Mastered badge with the ~60 day interval', async ({ page }) => {
  await stubSync(page, syncPayload([
    { id: 7001, name: 'A deeply retained question', level: 5, due: '2099-01-01' },
  ]));
  await page.goto(`/${DOMAIN.slug}/7001`);

  const badge = page.getByRole('button', { name: /Proficiency: Mastered/ });
  await expect(badge).toBeVisible();
  await expect(badge).toHaveText(/Mastered/);

  // Tooltip opens on hover and reports the real level + interval.
  await badge.hover();
  await expect(page.getByText('Level 5')).toBeVisible();
  await expect(page.getByText('Next review in ~60 days')).toBeVisible();
});

test('Mastered is the ceiling: success stays, struggle drops to Confident', async ({ page }) => {
  await stubSync(page, syncPayload([
    { id: 7002, name: 'A ceiling question', level: 5, due: '2099-01-01' },
  ]));
  await page.goto(`/${DOMAIN.slug}/7002`);

  await page.getByRole('button', { name: /Proficiency: Mastered/ }).hover();
  await expect(page.getByText('stays at Mastered')).toBeVisible();
  await expect(page.getByText('drops to Confident')).toBeVisible();
});

test('Confident now promises a promotion that the scheduler can actually deliver', async ({ page }) => {
  await stubSync(page, syncPayload([
    { id: 7003, name: 'A confident question', level: 4, due: '2099-01-01' },
  ]));
  await page.goto(`/${DOMAIN.slug}/7003`);

  const badge = page.getByRole('button', { name: /Proficiency: Confident/ });
  await expect(badge).toBeVisible();
  await badge.hover();
  await expect(page.getByText('Level 4')).toBeVisible();
  await expect(page.getByText('advances to Mastered')).toBeVisible();
});

test('logging a success on a Confident problem promotes it to Mastered', async ({ page }) => {
  // Regression: a success at Confident must actually reach Mastered.
  // Assert against the request the client sends and the state it renders.
  await stubSync(page, syncPayload([
    { id: 7004, name: 'A promotable question', level: 4, due: '2000-01-01' },
  ]));

  let postSeen = false;
  await page.route('**/api/problems/7004/attempts', async route => {
    postSeen = true;
    // Mirror the server: replay from history → Mastered, next due +60d.
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      json: {
        id: 9999, problem_id: 7004, attempted_at: '2030-01-01 09:00:00',
        time_taken_mins: 0, struggled: 0, practice_type: null,
      },
    });
  });

  await page.goto(`/${DOMAIN.slug}/7004`);
  await expect(page.getByRole('button', { name: /Proficiency: Confident/ })).toBeVisible();

  // Flashcards hide the log controls until the answer is revealed; then a
  // single "Got it" logs the success and the optimistic client path recomputes
  // the level locally by replaying the attempt history.
  await page.getByRole('button', { name: 'Reveal answer' }).click();
  await page.getByRole('button', { name: /Got it/ }).click();

  // The badge promotes immediately via the optimistic path; the POST is flushed
  // by the write queue afterwards, so poll rather than assert synchronously.
  await expect(page.getByRole('button', { name: /Proficiency: Mastered/ })).toBeVisible();
  await expect.poll(() => postSeen, { timeout: 10_000 }).toBe(true);
});

test('the review-queue level filter offers Mastered and it actually filters', async ({ page }) => {
  await stubSync(page, syncPayload([
    { id: 7010, name: 'Overdue confident item', level: 4, due: '2000-01-01' },
    { id: 7011, name: 'Overdue mastered item', level: 5, due: '2000-01-01' },
  ]));
  await page.goto('/');

  const levelFilter = page.getByRole('combobox', { name: 'Filter by level' });
  await expect(levelFilter).toBeVisible();
  await expect(levelFilter.locator('option', { hasText: 'Mastered' })).toHaveCount(1);

  // Selecting Mastered must show only the Mastered item — the pre-fix
  // matchesProficiency() had no 'Mastered' case and fell through to
  // `default: return true`, which would have matched everything.
  await levelFilter.selectOption('Mastered');
  await expect(page.getByText('Overdue mastered item')).toBeVisible();
  await expect(page.getByText('Overdue confident item')).toHaveCount(0);
});

test('Stats proficiency distribution includes a Mastered bucket', async ({ page }) => {
  await stubSync(page, syncPayload([
    { id: 7020, name: 'Mastered one', level: 5, due: '2099-01-01' },
    { id: 7021, name: 'Mastered two', level: 5, due: '2099-01-01' },
    { id: 7022, name: 'Confident one', level: 4, due: '2099-01-01' },
  ]));
  await page.goto('/stats');

  // Scope to the distribution section — the sidebar also contains the fixture
  // domain name "Mastered Fixture", which is hidden behind the mobile drawer.
  const section = page.locator('section', { has: page.getByRole('heading', { name: 'Proficiency Distribution' }) });
  await expect(section.getByText('Mastered', { exact: false }).first()).toBeVisible();
  // "Retained" KPI surfaces the mastered count alongside confident.
  await expect(page.getByText(/1 confident, 2 mastered/)).toBeVisible();
});
