<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project context

Prep Tracker — a local-first, spaced-repetition interview-prep tracker. See `README.md` for the product overview.

## Architecture (read before changing data flow)

- **Local-first.** The client reads from an in-memory store (`lib/store/store.ts`, via `useSyncExternalStore`) hydrated from IndexedDB (`lib/store/idb.ts`). Components read the store, not the network. Prefer optimistic writes: mutate the store first, sync in the background, roll back on error (see `lib/store/writeQueue.ts`).
- **Sync.** `GET /api/sync` returns the full dataset; the client persists it to IndexedDB. Server is libSQL/Turso (`lib/db.ts`, needs `TURSO_DATABASE_URL`).
- **Pure logic lives in `lib/`** and is unit-tested: `sr.ts` (scheduler), `practice.ts`, `streak.ts`, `cardTags.ts`, `store/queries.ts`, `useSwipeNav.ts`, `auth.ts`, `rateLimit.ts`. Keep new logic pure and testable there.
- **A practice set is a spec, not a mode** (`lib/practice.ts`). A `PracticeSpec` is data on three independent axes — scope (`due` / `weak` / `all` / `unattempted`), order, size — plus domain/proficiency/field filters, so the global review queue and a per-domain session (`/{domain}/review`) run through one code path. A new way to practice is a new spec, not a fork of the session page. The invariant that keeps existing `?order=` links working is asserted in `practice.test.ts`: for any `scope: 'due'` spec, `buildPracticeSet` returns exactly `reviewQueue(...)` filtered by domain and proficiency.
- **Archiving a domain hides it everywhere but Settings, without touching the data.** `archivedDomainIds()` (`lib/domains.ts`) is the one rule. Two things apply it:
  - **Rotation** — `reviewQueue()` and `forecast()` (`lib/store/queries.ts`) and `buildPracticeSet()` (`lib/practice.ts`) skip those cards, so an archived domain leaves the queue, the badges, the forecast and every practice set, including its own launcher. Both admission points must apply the rule, or the `scope: 'due'` equivalence above breaks.
  - **Aggregates** — `activeCards()` (`lib/store/queries.ts`) is the same rule as a card/attempt filter, and `historyBuckets()`, `todayStats()` and `computeMetrics()` (`lib/store/metrics.ts`) all read it instead of `data.problems`/`data.attempts`. So an archived deck contributes no row, chip, percentage or study day to Today's History or Stats either — recall rate, streak, heatmap, proficiency split and leeches included. Components list `activeDomains()`, never `allDomains()` (which is Settings-only), so an empty archived domain can't sit in a domain-ordered list as a "0 added" placeholder.

  Nothing is deleted: cards, due dates and attempt history are untouched and every number comes straight back on restore. `/{slug}` still renders an archived domain's cards read-only for anyone who has the URL — it just isn't linked from anywhere.
- **Theming is token-driven.** Colors are CSS variables in `app/globals.css` (`:root` light, `.dark` dark); components use semantic classes (`bg-surface`, `text-accent`, …). Change tokens, not per-component hex. Both light and dark must work.
- **Auth.** Middleware (`middleware.ts`) gates everything except `/login`, `/api/auth`, and static/PWA assets when `AUTH_SECRET` is set (fail-open otherwise).

## Scripts (`scripts/`)

Deliberately small — it is not an archive. Everything in it is either live or
wired to an npm script:

- **`seed-aws.mjs` + `aws-cards.md`** — the live card-authoring workflow. `aws-cards.md` is the source of truth for the AWS deck's questions and answers: edit there, not in the app, or the next run overwrites the edit. The script is incremental and idempotent (domain/fields/options reused, cards matched on exact question text). Its header also codifies the **house card style** — one card one fact, 250–450 character answers, answer first — which applies to every deck, not just AWS.
- **`seed-behavioral.mjs` + `behavioral-cards.md`** — the same live workflow for the **Behavioral** deck, one section per Hello Interview course article. Differences from the AWS pair: it never creates the domain or its fields (`behavioral` already has them, so a missing one is an error), each `## Category` section declares its source article with a `Link:` line that becomes a per-card `links` row labelled with the card's own question, and `--dry` parses and prints without writing — use it to review a batch before it lands. `behavioral-cards.md` currently covers only the `Practice` section; the older 74 cards predate the file and live only in the DB, so the orphan check is scoped to the categories the file actually covers.
- **`migrate-domains.mjs`** (+ `migrate-domains.test.ts`) — domain-schema migration, wired to `npm run db:migrate`.
- **`geticon.mjs`** — icon helper.

Conventions for anything you add here:

- **A one-off seed or repair script is deleted once it has been applied.** These write straight to Turso, so a spent script does nothing useful on a re-run and a stale one is a hazard. The card text lives in the DB, and a deleted script stays recoverable from git history — so run it, then delete it. Don't grow a graveyard of past seeds.
- **Seed a new card due tomorrow, with zero attempts — never fake a first attempt.** Insert with `interval_level 0` and `next_due_date` = the day after it was added (level 0's interval, `dueDateFor(0)` in `lib/sr.ts`) and stop there. That is what makes a card you add today appear in the Review Queue tomorrow: `reviewQueue()` in `lib/store/queries.ts` admits on the due date alone — a prior attempt is *not* required — and `matchesScope`'s `'due'` branch in `lib/practice.ts` restates the same rule. Writing a synthetic "got it" attempt to force a card into the queue backfires twice: `computeStreak` counts the seed run as a study day, and the **Resume** preset (`scope: 'unattempted'`, `order: 'oldest'`, see `app/[domainSlug]/review/page.tsx`) means *strictly* zero attempts, so it then skips the exact cards it exists to surface. A card left with `next_due_date NULL` is never scheduled and reachable only through Resume — that is the right state for a bulk import you don't want dropped into the queue at once.
- Scripts read Turso credentials from `.env.local`; they are plain `node` (no build step).

## Conventions

- Dev server runs on **port 3007** (`npm run dev`).
- Verify changes: `npx tsc --noEmit`, `npm test` (Vitest), `npm run test:e2e` (Playwright). Add unit tests for new pure logic.
- Secrets (`.env.local`) and `*.db` files are git-ignored — never commit them.
