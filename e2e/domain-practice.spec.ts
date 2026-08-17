import { test, expect, type Page } from '@playwright/test';

// Per-domain practice sets: revising a domain off-schedule. The point of the
// feature is reaching cards the review queue structurally cannot show — ones
// that aren't due, and ones that have never been attempted at all.
// Fixture-driven: every test stubs /api/sync, so nothing touches the real DB.

const DOMAIN = {
  id: 'practice_fixture',
  slug: 'practice-fixture',
  name: 'Practice Fixture',
  short_name: 'PF',
  study_mode: 'flashcard',
  icon: 'book',
  color: 'blue',
  sort_order: 0,
  item_label: 'Question',
  log_label: 'Log Question',
  log_title: 'Log Practice Fixture',
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
  created: string;
  /** Outcome per attempt, oldest first. Empty means the card was never attempted. */
  struggles: number[];
}

/** A due, twice-reviewed card and a newer one that has never been touched. */
const DUE_CARD: Card = {
  id: 9001, name: 'A card that is due today', level: 1,
  due: '2000-01-01', created: '2000-01-01 00:00:00', struggles: [0, 0],
};
const UNTOUCHED_CARD: Card = {
  id: 9002, name: 'A card that has never been attempted', level: 0,
  due: null, created: '2000-06-01 00:00:00', struggles: [],
};

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
      created_at: c.created,
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

async function stubSync(page: Page, cards: Card[]) {
  await page.route('**/api/sync', route => route.fulfill({
    contentType: 'application/json',
    json: syncPayload(cards) as unknown as Record<string, unknown>,
  }));
}

/** Keep graded attempts off the real database. */
async function stubAttempts(page: Page) {
  await page.route('**/api/problems/*/attempts', route => route.fulfill({
    status: 201,
    contentType: 'application/json',
    json: {
      id: Math.floor(Math.random() * 1e6), problem_id: 0,
      attempted_at: '2030-01-01 09:00:00', time_taken_mins: 0,
      struggled: 0, practice_type: null,
    },
  }));
}

test('the launcher counts only genuinely due cards under "Due now"', async ({ page }) => {
  await stubSync(page, [DUE_CARD, UNTOUCHED_CARD]);
  await page.goto(`/${DOMAIN.slug}/review`);

  // One of the two is due; the other has no due date and no attempts.
  await expect(page.getByTestId('practice-count-due')).toHaveText('1');
  await expect(page.getByTestId('practice-count-newest')).toHaveText('2');
});

test('"Last added" reaches a card the review queue can never show, and grading it completes the session', async ({ page }) => {
  await stubSync(page, [DUE_CARD, UNTOUCHED_CARD]);
  await stubAttempts(page);

  // The queue is due-only, so the untouched card is invisible there.
  await page.goto('/');
  await expect(page.getByText(UNTOUCHED_CARD.name)).toHaveCount(0);

  await page.goto(`/${DOMAIN.slug}/review`);
  await page.getByTestId('practice-preset-newest').click();

  // Newest-first, so the never-attempted card leads — impossible in the queue.
  await expect(page.getByText(UNTOUCHED_CARD.name)).toBeVisible();
  await expect(page.getByText('2 remaining')).toBeVisible();

  // Grade both. The first is a card's very first attempt, which exercises the
  // scheduler's first-log path through a practice session.
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: 'Reveal answer' }).click();
    await page.getByRole('button', { name: /Got it/ }).click();
  }

  await expect(page.getByText('Session complete')).toBeVisible();
  // And it offers the domain's launcher, not the global queue it never came from.
  await expect(page.getByRole('link', { name: new RegExp(`Back to ${DOMAIN.name} practice`) })).toBeVisible();
});

test('an empty preset is inert rather than a link into an empty session', async ({ page }) => {
  // Nothing is due, so "Due now" has nothing to offer.
  await stubSync(page, [UNTOUCHED_CARD]);
  await page.goto(`/${DOMAIN.slug}/review`);

  const due = page.getByTestId('practice-preset-due');
  await expect(due).toHaveAttribute('aria-disabled', 'true');
  await expect(due).not.toHaveAttribute('href', /./);
  await expect(page.getByTestId('practice-count-newest')).toHaveText('1');
});

test('a shuffled set keeps its order across a reload', async ({ page }) => {
  const cards = Array.from({ length: 12 }, (_, i): Card => ({
    id: 9100 + i, name: `Shuffle card ${i}`, level: 0, due: null,
    created: `2000-01-${String(i + 1).padStart(2, '0')} 00:00:00`, struggles: [],
  }));
  await stubSync(page, cards);

  await page.goto(`/${DOMAIN.slug}/review`);
  await page.getByTestId('practice-preset-shuffle').click();

  const heading = page.locator('p.text-lg').first();
  const first = await heading.textContent();
  await page.reload();
  // The seed rides in the URL, so the same deck replays rather than reshuffling.
  await expect(heading).toHaveText(first ?? '');
});

test('the domain page links to practice at phone width too', async ({ page }) => {
  // The log button beside it is desktop-only; this one must not be.
  await page.setViewportSize({ width: 390, height: 780 });
  await stubSync(page, [DUE_CARD, UNTOUCHED_CARD]);
  await page.goto(`/${DOMAIN.slug}`);

  const practice = page.getByRole('link', { name: /Practice/ });
  await expect(practice).toBeVisible();
  await practice.click();
  await expect(page).toHaveURL(new RegExp(`/${DOMAIN.slug}/review$`));
});
