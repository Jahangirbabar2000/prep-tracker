# Prep Tracker

A local-first, spaced-repetition study partner — for interview prep, exam vocabulary, or anything else you want to remember — built around three evidence-based learning pillars:

- **Pattern recognition** — every problem/concept is tagged by pattern or category.
- **Spaced repetition** — items are scheduled on fixed intervals by level: **1 → 3 → 7 → 14 → 30 → 60 days** (levels 0–5). A card's first review always lands the next day, while the material is still fresh; from there a successful review promotes it to the next level (longer interval) and struggling drops it back a level (shorter interval), so a card you keep missing walks back down to the 1-day step and repeats daily until it sticks. The Review Queue surfaces everything due, most overdue first.
- **Active recall** — answers stay hidden until you reveal them; you self-grade each attempt as "Got it" or "Struggled."

It is a **tracker**, not a study tool — studying happens externally. The app logs attempts, stores links to source material, schedules reviews, and quizzes you.

## Landing page and demo

A signed-out visitor to `/` sees a landing page (`app/(public)/welcome`): what the app
does, three screenshots, how it works, an "under the hood" section, and **Try the demo**.
The demo (`/demo`) runs the real app on 40 generated sample cards, entirely in the
visitor's browser — nothing it does reaches a server, and it never touches a real
account's data, even in the owner's own browser. Adding/editing cards and Settings are
outside the demo.

The screenshots are captured from the demo itself: run a production build, then
`BASE_URL=http://localhost:3007 npm run screenshots` to refresh `public/screenshots/`.

## Domains

Domains are runtime-configurable from **Settings → Study domains**. A domain defines
its stable URL, appearance, study workflow, custom text/select fields, filters, and
card tags. Creating or editing a normal domain does not require a code change.

The initial registry contains **DSA** · **System Design** (with solo/mock practice
tracking) · **LLD** · **Backend** · **Frontend** · **AI** · **Behavioral**.
Archived domains disappear from navigation and new-item logging while their existing
records remain available in details, history, reviews, and statistics.

Three study-mode templates are built in:

- `timed_problem` — timing and direct result logging.
- `flashcard` — reveal the answer, then grade recall.
- `flashcard_practice` — flashcard behavior with Solo/Mock attempt type.

## Features

- **Review Queue** — everything due across all domains, grouped by due date, most overdue first. Filter by domain and proficiency (New / Struggling / Learning / Familiar / Proficient / Confident / Mastered); the progress ring and headline scope to the active filter. The sidebar badges each domain's due count alongside what you added today.
- **Per-domain practice** — revise a domain on demand, off-schedule, from `/{domain}/review`: due now, weak spots (struggling or missed last time), a seeded shuffle, or walk the domain oldest-/newest-first. Scope, order and size are independent, so "weak spots in Two Pointers, oldest first, 20 of them" is one link you can bookmark. Practice reaches cards the queue structurally cannot — ones not yet due, and ones never attempted — and grading still writes a real attempt, so there is only ever one record.
- **Daily progress + streak** — a progress ring for today's workload and a running day streak.
- **7-day forecast** — a mini bar chart of upcoming review load per day, with per-domain totals.
- **Fast logging** — sub-15-second attempt logging with optional backdating, notes, classification, and links.
- **Review sessions** — reveal-then-grade flow with keyboard shortcuts (desktop) and swipe navigation (mobile). Horizontally-scrollable answer code blocks keep priority over swipe-to-navigate.
- **Ask AI to elaborate** — on a revealed answer, get a concise, example-led elaboration grounded in the question, your saved answer, and its domain/topic. Streamed, cached per device (works offline once fetched), and rate-limited. **Switched off by default** — set `NEXT_PUBLIC_ASK_AI=on` to enable it.
- **Editable attempt history** — edit/delete attempts with optimistic UI (instant update, background sync).
- **Stats** and multiple links per problem.
- **Light / dark mode** with a persisted toggle ("Momentum" theme: deep indigo + electric green).

## Design

- "Momentum" visual identity — deep-indigo dark mode and an indigo-tinted light mode, electric-green accent, Space Grotesk display type, and a progress-ring + streak-flame signature.
- **Installable PWA** — service worker caches the app shell, hashed assets, and the last data sync so it runs fully offline; safe-area aware on iOS/iPadOS standalone.

## Architecture

- **Local-first client** — all reads come from an in-memory store hydrated from **IndexedDB**, so the UI is instant and offline-capable. Writes are optimistic.
- **Sync** — the client pulls problems, attempts, and the domain/field/option registry from `GET /api/sync` when online and persists them to IndexedDB; server writes go through validated API routes.
- **Server** — Next.js route handlers backed by **libSQL / Turso** (`@libsql/client`).
- **Auth** (optional) — a single shared passcode gates the whole app via `proxy.ts`: a signed, httpOnly cookie (HMAC over `AUTH_SECRET`), with a `/login` screen. Fail-open when unset, so it's off until you configure it.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- libSQL / Turso (`@libsql/client`)
- Tailwind CSS v4, Lucide icons, `react-markdown` + `remark-gfm`
- Vitest + Testing Library (unit) · Playwright (e2e)

## Running locally

```bash
npm install
npm run db:migrate
npm run dev
```

Open http://localhost:3007.

Create `.env.local` with at least a database URL. Point it at a **development**
database (a local `file:` one, or a Turso copy) — never at production:
`npm run dev` and the database scripts both read it.

```bash
# Database (libSQL / Turso) — required
TURSO_DATABASE_URL=libsql://...        # or a file: URL for a local libSQL db
TURSO_AUTH_TOKEN=...                    # for a remote Turso db

# Local sign-in (optional) — set BOTH for a passcode gate that signs you in as the owner.
# Deployed stages sign in with Cognito instead and never set APP_PASSWORD.
AUTH_SECRET=...                        # long random string, e.g. `openssl rand -hex 32`
APP_PASSWORD=your-passcode

# Ask AI (optional, off by default) — the "Ask AI to elaborate" button
NEXT_PUBLIC_ASK_AI=on                   # without this the button is hidden and /api/ask returns 404
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-nano                 # optional, defaults to gpt-5-nano

# Landing page (optional) — the byline and link previews
NEXT_PUBLIC_AUTHOR_NAME="Your Name"     # "Built by …"; hidden when unset
NEXT_PUBLIC_AUTHOR_GITHUB=https://github.com/you
NEXT_PUBLIC_AUTHOR_LINKEDIN=https://www.linkedin.com/in/you

# Name (optional) — shown in the sidebar, on the login screen and in the tab
NEXT_PUBLIC_APP_NAME="Jahangir's Prep"  # defaults to "Prep Tracker"
```

`.env.local` and all local `*.db` files are git-ignored.

`npm run db:migrate` builds the whole schema, so it is the one setup step for a new
database: the core tables, the runtime domain registry, the offline queue's
idempotency key, and accounts (`users`, and a `user_id` on every per-user table).
Each migration runs once and is recorded in `schema_migrations`, so re-running it
is safe.

## Testing

```bash
npm test          # Vitest unit and integration tests
npm run test:watch
npm run test:e2e  # Playwright (desktop + mobile), on its own throwaway database
npm run smoke     # post-deploy smoke test against a deployed stage (see scripts/smoke.mjs)
```

The unit suite covers the scheduler, the sync queue, migrations, the sign-in flow,
and an access table that calls every API route as one user against another's
data. The e2e suite starts its own server (`e2e/server.mjs`) on a fresh, migrated,
seeded database — it never touches the one in `.env.local`.

## Deployment

AWS, all as code in `sst.config.ts` ([SST](https://sst.dev) on
[OpenNext](https://opennext.js.org)): CloudFront in front, Lambda for pages and
the API, S3 for static files, and a Cognito user pool for sign-in. Turso stays the
database.

- **Stages:** `staging` and `production` (plus any personal `dev` stage), each with
  its own Turso database, Cognito pool and secrets. Secrets live in SSM:
  `npx sst secret set <Name> <value> --stage <stage>` — `TursoDatabaseUrl`,
  `TursoAuthToken`, `AuthSecret`, `SiteUrl` (the stage's public URL; set it before
  the first real deploy, since Cognito's callback URLs are built from it), and
  optionally `OtelEndpoint` / `OtelHeaders` for tracing.
- **CI/CD:** GitHub Actions. Every push runs types, unit and e2e tests; a merge to
  `main` then deploys staging and production in turn — migrate, deploy, smoke test,
  and roll back to the last good commit if the smoke test fails. AWS access is OIDC
  to a deploy role (the `ci` stage of `sst.config.ts`), so no AWS keys live in GitHub.

If the app can't reach or read its database it says why on screen (and in the
sidebar's sync status) rather than loading forever — a missing `TURSO_DATABASE_URL`
and an unmigrated database each name their fix.
