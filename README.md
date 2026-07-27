# Prep Tracker

A personal, local-first interview-prep tracker built around three evidence-based learning pillars:

- **Pattern recognition** — every problem/concept is tagged by pattern or category.
- **Spaced repetition** — items are scheduled on fixed intervals by level: **3 → 7 → 14 → 30 days** (levels 0–3). A successful review promotes an item to the next level (longer interval); struggling drops it back a level (shorter interval). The Review Queue surfaces everything due, most overdue first.
- **Active recall** — answers stay hidden until you reveal them; you self-grade each attempt as "Got it" or "Struggled."

It is a **tracker**, not a study tool — studying happens externally. The app logs attempts, stores links to source material, schedules reviews, and quizzes you.

## Domains

Seven self-contained sections, each with its own filters and logging form:

**DSA** · **System Design** (with solo/mock practice tracking) · **LLD** · **Backend** · **Frontend** · **AI** · **Behavioral**

## Features

- **Review Queue** — everything due across all domains, grouped by due date, most overdue first. Filter by domain and proficiency (New / Struggling / Learning / Familiar / Confident); the progress ring and headline scope to the active filter.
- **Daily progress + streak** — a progress ring for today's workload and a running day streak.
- **7-day forecast** — a mini bar chart of upcoming review load per day, with per-domain totals.
- **Fast logging** — sub-15-second attempt logging with optional backdating, notes, classification, and links.
- **Review sessions** — reveal-then-grade flow with keyboard shortcuts (desktop) and swipe navigation (mobile). Horizontally-scrollable answer code blocks keep priority over swipe-to-navigate.
- **Ask AI to elaborate** — on a revealed answer, get a concise, example-led elaboration grounded in the question, your saved answer, and its domain/topic. Streamed, cached per device (works offline once fetched), and rate-limited.
- **Editable attempt history** — edit/delete attempts with optimistic UI (instant update, background sync).
- **Stats** and multiple links per problem.
- **Light / dark mode** with a persisted toggle ("Momentum" theme: deep indigo + electric green).

## Design

- "Momentum" visual identity — deep-indigo dark mode and an indigo-tinted light mode, electric-green accent, Space Grotesk display type, and a progress-ring + streak-flame signature.
- **Installable PWA** — service worker caches the app shell, hashed assets, and the last data sync so it runs fully offline; safe-area aware on iOS/iPadOS standalone.

## Architecture

- **Local-first client** — all reads come from an in-memory store hydrated from **IndexedDB**, so the UI is instant and offline-capable. Writes are optimistic.
- **Sync** — the client pulls the full dataset from `GET /api/sync` when online and persists it to IndexedDB; server writes go through the domain API routes.
- **Server** — Next.js route handlers backed by **libSQL / Turso** (`@libsql/client`).
- **Auth** (optional) — a single shared passcode gates the whole app via middleware: a signed, httpOnly cookie (HMAC over `AUTH_SECRET`), with a `/login` screen. Fail-open when unset, so it's off until you configure it.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- libSQL / Turso (`@libsql/client`)
- Tailwind CSS v4, Lucide icons, `react-markdown` + `remark-gfm`
- Vitest + Testing Library (unit) · Playwright (e2e)

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3007.

Create `.env.local` with at least a database URL:

```bash
# Database (libSQL / Turso) — required
TURSO_DATABASE_URL=libsql://...        # or a file: URL for a local libSQL db
TURSO_AUTH_TOKEN=...                    # for a remote Turso db

# Ask AI (optional) — enables the "Ask AI to elaborate" button
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-5-nano                 # optional, defaults to gpt-5-nano

# Passcode auth (optional) — set BOTH to turn the gate on
AUTH_SECRET=...                        # long random string, e.g. `openssl rand -hex 32`
APP_PASSWORD=your-passcode
```

`.env.local` and all local `*.db` files are git-ignored.

## Testing

```bash
npm test          # Vitest unit tests (run once)
npm run test:watch
npm run test:e2e  # Playwright (desktop + mobile projects)
```

Unit tests cover the spaced-repetition scheduler, card tagging, store queries, streak calculation, the swipe-decision helpers, session auth, and the rate limiter. The e2e smoke suite checks the queue renders, all domains appear in nav, domain navigation works, and the filter selects are accessible.

## Deployment

Deployed on Vercel. Set the same environment variables (`TURSO_*`, `OPENAI_API_KEY`, `AUTH_SECRET`, `APP_PASSWORD`) in the project's environment-variable settings, then redeploy — env changes only take effect on a fresh build.
