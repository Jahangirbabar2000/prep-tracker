// The e2e suite's own server: a fresh database built by the real migration,
// seeded with two accounts, behind `next dev` on its own port and build
// folder. Hermetic on purpose — `npm run dev` reads .env.local, whose
// database is production, and the suite must never touch it.
import { createClient } from '@libsql/client';
import { execFileSync, spawn } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { E2E_AUTH_SECRET, E2E_PASSCODE, E2E_PORT, NEW_USER, OWNER, OWNER_CARD, SECOND_USER, SECOND_USER_CARD } from './env.mjs';

const dir = resolve('e2e/.tmp');
rmSync(dir, { recursive: true, force: true });
mkdirSync(dir, { recursive: true });
const url = `file:${resolve(dir, 'e2e.db')}`;

execFileSync(process.execPath, ['scripts/migrate-domains.mjs'], {
  env: { ...process.env, TURSO_DATABASE_URL: url, TURSO_AUTH_TOKEN: '' },
  stdio: 'inherit',
});

// The owner keeps the migration's starter decks; add one card due today. The
// second user gets a deck at the same slug (slugs are per user) and a card.
const db = createClient({ url });
const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' }).format(new Date());
await db.batch([
  { sql: `INSERT INTO problems (user_id, name, domain, next_due_date, created_at) VALUES (?, ?, 'dsa', ?, datetime('now'))`, args: [OWNER, OWNER_CARD, today] },
  { sql: `INSERT INTO users (id, display_name) VALUES (?, 'Bravo')`, args: [SECOND_USER] },
  { sql: `INSERT INTO users (id, display_name) VALUES (?, 'New')`, args: [NEW_USER] },
  {
    sql: `INSERT INTO study_domains (id, user_id, slug, name, short_name, study_mode, icon, color, sort_order)
          VALUES ('dom_e2e_bravo_dsa', ?, 'dsa', 'DSA', 'DSA', 'timed_problem', 'binary', 'blue', 0)`,
    args: [SECOND_USER],
  },
  { sql: `INSERT INTO problems (user_id, name, domain, next_due_date, created_at) VALUES (?, ?, 'dom_e2e_bravo_dsa', ?, datetime('now'))`, args: [SECOND_USER, SECOND_USER_CARD, today] },
], 'write');
db.close();

const child = spawn('npx', ['next', 'dev', '-p', String(E2E_PORT)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NEXT_DIST_DIR: '.next-e2e',
    TURSO_DATABASE_URL: url,
    TURSO_AUTH_TOKEN: '',
    AUTH_SECRET: E2E_AUTH_SECRET,
    APP_PASSWORD: E2E_PASSCODE,
    // Lets the passcode sign in as a chosen user (app/api/auth/route.ts) —
    // and only here: that route refuses it in any production build.
    ALLOW_SIGN_IN_AS: '1',
    // No Cognito: sign-in is the passcode form.
    COGNITO_DOMAIN: '', COGNITO_CLIENT_ID: '', COGNITO_CLIENT_SECRET: '', COGNITO_USER_POOL_ID: '', SITE_URL: '',
  },
});
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('exit', code => process.exit(code ?? 0));
