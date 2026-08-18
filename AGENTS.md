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
- **Seeded cards need a first attempt or they never surface.** A card inserted with `interval_level 0` / `next_due_date NULL` is "New" and invisible to the Review Queue until studied by hand. Give each new card one "got it" attempt: per `lib/sr.ts`, a first attempt always lands at level 0 due +1 day however it went, so the card keeps its "New" label but actually shows up tomorrow. Scope that step to cards with zero attempts so a re-run never resets real progress.
- Scripts read Turso credentials from `.env.local`; they are plain `node` (no build step).

## Conventions

- Dev server runs on **port 3007** (`npm run dev`).
- Verify changes: `npx tsc --noEmit`, `npm test` (Vitest), `npm run test:e2e` (Playwright). Add unit tests for new pure logic.
- Secrets (`.env.local`) and `*.db` files are git-ignored — never commit them.
