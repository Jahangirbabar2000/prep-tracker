<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Project context

Prep Tracker — a local-first, spaced-repetition interview-prep tracker. See `README.md` for the product overview.

## Architecture (read before changing data flow)

- **Local-first.** The client reads from an in-memory store (`lib/store/store.ts`, via `useSyncExternalStore`) hydrated from IndexedDB (`lib/store/idb.ts`). Components read the store, not the network. Prefer optimistic writes: mutate the store first, sync in the background, roll back on error (see `lib/store/writeQueue.ts`).
- **Sync.** `GET /api/sync` returns the full dataset; the client persists it to IndexedDB. Server is libSQL/Turso (`lib/db.ts`, needs `TURSO_DATABASE_URL`).
- **Pure logic lives in `lib/`** and is unit-tested: `sr.ts` (scheduler), `streak.ts`, `cardTags.ts`, `store/queries.ts`, `useSwipeNav.ts`, `auth.ts`, `rateLimit.ts`. Keep new logic pure and testable there.
- **Theming is token-driven.** Colors are CSS variables in `app/globals.css` (`:root` light, `.dark` dark); components use semantic classes (`bg-surface`, `text-accent`, …). Change tokens, not per-component hex. Both light and dark must work.
- **Auth.** Middleware (`middleware.ts`) gates everything except `/login`, `/api/auth`, and static/PWA assets when `AUTH_SECRET` is set (fail-open otherwise).

## Conventions

- Dev server runs on **port 3007** (`npm run dev`).
- Verify changes: `npx tsc --noEmit`, `npm test` (Vitest), `npm run test:e2e` (Playwright). Add unit tests for new pure logic.
- Secrets (`.env.local`) and `*.db` files are git-ignored — never commit them.
