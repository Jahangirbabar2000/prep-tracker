// Post-deploy smoke test, against a deployed stage. Wired to `npm run smoke`;
// the deploy workflow runs it after every deploy and rolls back on failure.
//
//   SMOKE_BASE_URL=https://… SMOKE_AUTH_SECRET=… \
//   SMOKE_DATABASE_URL=libsql://… SMOKE_DATABASE_TOKEN=… node scripts/smoke.mjs
//
// Signed-in checks run as `usr_smoke`, a dedicated account with one deck and
// nothing else: its session is minted with the stage's AUTH_SECRET, so the
// test never drives Cognito's sign-in page. The database credentials only
// make sure that account exists. Every card it makes, it deletes.
import { createClient } from '@libsql/client';
import { createSession } from '../lib/auth.ts';

const BASE = process.env.SMOKE_BASE_URL?.replace(/\/+$/, '');
const SECRET = process.env.SMOKE_AUTH_SECRET;
if (!BASE || !SECRET || !process.env.SMOKE_DATABASE_URL) {
  console.error('smoke: SMOKE_BASE_URL, SMOKE_AUTH_SECRET and SMOKE_DATABASE_URL are required');
  process.exit(2);
}
const SMOKE_USER = 'usr_smoke';
const SMOKE_DECK = 'dom_smoke';

const results = [];
async function check(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
  } catch (error) {
    results.push({ name, ok: false, ms: Date.now() - started, error: error.message });
  }
}
function expect(condition, message) {
  if (!condition) throw new Error(message);
}

const get = (path, init = {}) => fetch(`${BASE}${path}`, { redirect: 'manual', ...init });

// The smoke account: idempotent, so every run (and every stage) can ensure it.
const db = createClient({ url: process.env.SMOKE_DATABASE_URL, authToken: process.env.SMOKE_DATABASE_TOKEN });
await db.batch([
  { sql: `INSERT OR IGNORE INTO users (id, display_name) VALUES (?, 'Smoke test')`, args: [SMOKE_USER] },
  {
    sql: `INSERT OR IGNORE INTO study_domains (id, user_id, slug, name, short_name, study_mode, icon, color)
          VALUES (?, ?, 'smoke', 'Smoke', 'Smoke', 'flashcard', 'book', 'blue')`,
    args: [SMOKE_DECK, SMOKE_USER],
  },
], 'write');
db.close();

const session = `pt_auth=${await createSession(SECRET, Date.now(), SMOKE_USER)}`;
const signedIn = (path, init = {}) => get(path, { ...init, headers: { cookie: session, ...(init.headers ?? {}) } });
const json = (path, method, body) => signedIn(path, {
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

// ROLLBACK TEST — fails on purpose against the marked build (reverted right after).
await check('not the deliberately bad rollback-test build', async () => {
  expect(!(await get('/login')).headers.get('x-rollback-test'), 'x-rollback-test header present');
});

// Signed out.
await check('landing page at / for a signed-out visitor, never cached', async () => {
  const res = await get('/');
  expect(res.status === 200, `status ${res.status}`);
  expect(res.headers.get('x-prep-public') === '1', 'no x-prep-public marker');
  expect(/no-store|private/.test(res.headers.get('cache-control') ?? ''), `cache-control ${res.headers.get('cache-control')}`);
});
await check('other pages send a signed-out visitor to sign in', async () => {
  const res = await get('/stats');
  expect([302, 307].includes(res.status), `status ${res.status}`);
  expect(res.headers.get('location')?.includes('/?next=%2Fstats'), `location ${res.headers.get('location')}`);
});
await check('the API refuses a signed-out request', async () => {
  expect((await get('/api/sync')).status === 401, 'expected 401');
});
await check('sign-in goes to Cognito with PKCE', async () => {
  const res = await get('/api/auth/login');
  const location = res.headers.get('location') ?? '';
  expect([302, 307].includes(res.status), `status ${res.status}`);
  expect(/amazoncognito\.com\/oauth2\/authorize/.test(location), `location ${location.slice(0, 80)}`);
  expect(location.includes('code_challenge_method=S256'), 'no PKCE challenge');
});
await check('the passcode is off on a deployed stage', async () => {
  const res = await fetch(`${BASE}/api/auth`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{"password":"x"}' });
  expect(res.status === 503, `status ${res.status}`);
});
await check('the demo opens, and its cookie never reaches the API', async () => {
  const res = await get('/demo');
  expect([302, 307].includes(res.status), `status ${res.status}`);
  expect((res.headers.get('set-cookie') ?? '').includes('pt_demo=1'), 'no demo cookie');
  expect((await get('/api/sync', { headers: { cookie: 'pt_demo=1' } })).status === 401, 'demo cookie reached the API');
});
await check('service worker and hashed bundles are served', async () => {
  expect((await get('/sw.js')).status === 200, 'sw.js');
  const html = await (await get('/login')).text();
  const chunk = html.match(/\/_next\/static\/[^"]+\.js/)?.[0];
  expect(chunk, 'no bundle referenced from /login');
  const res = await get(chunk);
  expect(res.status === 200, `bundle status ${res.status}`);
  expect((res.headers.get('cache-control') ?? '').includes('immutable'), 'bundle not immutable');
});

// Signed in, as the smoke account.
let cardId = null;
await check('sync returns only this account’s data, privately, compressed', async () => {
  const res = await signedIn('/api/sync', { headers: { 'accept-encoding': 'br, gzip' } });
  expect(res.status === 200, `status ${res.status}`);
  expect(res.headers.get('cache-control') === 'private, no-store', `cache-control ${res.headers.get('cache-control')}`);
  const data = await res.json();
  const owners = new Set([...data.problems, ...data.domains].map(row => row.user_id));
  expect(owners.size === 1 && owners.has(SMOKE_USER), `rows of ${[...owners].join(', ')}`);
});
await check('a card can be created', async () => {
  const res = await json('/api/problems', 'POST', { name: `Smoke card ${new Date().toISOString()}`, domain: SMOKE_DECK, metadata: {} });
  expect(res.status === 201, `status ${res.status}`);
  cardId = (await res.json()).id;
});
await check('a retried review is recorded once', async () => {
  expect(cardId, 'no card');
  const body = { time_taken_mins: 1, struggled: false, client_id: `smoke-${Date.now()}` };
  const first = await json(`/api/problems/${cardId}/attempts`, 'POST', body);
  const retry = await json(`/api/problems/${cardId}/attempts`, 'POST', body);
  expect(first.status === 201 && retry.status === 200, `statuses ${first.status}, ${retry.status}`);
  const attempts = await (await signedIn(`/api/problems/${cardId}/attempts`)).json();
  expect(attempts.length === 1, `${attempts.length} attempts`);
});
await check("someone else's card is a 404", async () => {
  // An id the smoke account doesn't own: card 1 belongs to the owner on every
  // database migrated from the original; a missing id answers the same.
  expect((await signedIn('/api/problems/1')).status === 404, 'not a 404');
});
await check('the smoke card is deleted again', async () => {
  if (!cardId) return;
  expect((await signedIn(`/api/problems/${cardId}`, { method: 'DELETE' })).status === 200, 'delete failed');
  expect((await signedIn(`/api/problems/${cardId}`)).status === 404, 'card still there');
});

for (const r of results) console.log(`${r.ok ? 'PASS' : 'FAIL'}  ${String(r.ms).padStart(5)} ms  ${r.name}${r.ok ? '' : `\n        ${r.error}`}`);
const failed = results.filter(r => !r.ok).length;
console.log(failed ? `\nsmoke: ${failed} of ${results.length} checks failed against ${BASE}` : `\nsmoke: all ${results.length} checks passed against ${BASE}`);
process.exit(failed ? 1 : 0);
