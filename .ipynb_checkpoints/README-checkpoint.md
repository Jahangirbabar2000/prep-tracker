# Prep Tracker

A personal interview-prep tracker built around three evidence-based learning pillars:

- **Pattern recognition** — every problem/concept is tagged by pattern or category.
- **Spaced repetition** — struggled items resurface on fixed intervals (3 → 7 → 14 → 30 days); a struggled re-attempt resets to 3 days. The Review Queue surfaces everything due, most overdue first.
- **Active recall** — notes are strictly question/answer pairs; the answer stays hidden until you reveal it.

It is a **tracker**, not a study tool — all studying happens externally. The app logs attempts, stores links to source material, schedules reviews, and quizzes you.

## Domains

Four self-contained sections, each with its own filters: **DSA**, **System Design** (with solo/mock practice tracking), **Frontend**, and **Python** (language-knowledge).

## Features

- Sub-15-second attempt logging (with optional backdating and links)
- Unified review queue across all domains, colour-coded by domain
- Editable attempt history (date, time, struggled) with average solve time
- Multiple links per problem, addable at log time
- Light/dark mode with persisted toggle
- No gamification, no charts — speed-first

## Stack

- Next.js (App Router) + TypeScript
- SQLite via `better-sqlite3` (local `prep.db`, auto-created on first run)
- Tailwind CSS v4, Lucide icons

## Running locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. The database file is created automatically and is git-ignored.
