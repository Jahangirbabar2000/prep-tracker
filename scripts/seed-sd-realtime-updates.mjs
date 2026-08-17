// One-off seed: adds the "Real-time Updates" System Design cards (Patterns
// bucket) and moves the new "Real-time Updates" Topic option to the top of the
// list.
//
//   node scripts/seed-sd-realtime-updates.mjs
//
// Source: hellointerview.com/learn/system-design/patterns/realtime-updates
// Only the material NOT already covered by the existing 158 System Design
// cards is here — the article's networking primer (OSI layers, TCP handshake,
// L4/L7, SSE/WebSocket/WebRTC basics, the consistent hash ring) is already in
// the Core Concepts and In a Hurry buckets.
//
// Safe to re-run: cards are matched by exact question text and skipped if they
// already exist, so no duplicates. Reads Turso credentials from .env.local.
import { createClient } from '@libsql/client';
import { existsSync, readFileSync } from 'node:fs';

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const i = line.indexOf('=');
    if (i < 1) continue;
    const key = line.slice(0, i).trim();
    let value = line.slice(i + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  }
}
loadEnvFile('.env.local');

const DOMAIN = 'system_design';
const CATEGORY = 'Patterns';
const TOPIC = 'Real-time Updates';
const LINK_URL = 'https://www.hellointerview.com/learn/system-design/patterns/realtime-updates';
const LINK_LABEL = 'Real-time Updates · hellointerview';

// [question, answer] in study order — the two hops first, then each hop's
// options, then the operational deep dives.
const CARDS = [
  ['Real-time updates split into two independent problems — what are they?',
`**Hop 1 — client↔server:** how the update reaches the client (polling, long polling, SSE, WebSockets, WebRTC). **Hop 2 — source→server:** how the server *holding that connection* learns the update happened (polling a DB, consistent hashing, pub/sub).

Choose each independently — they trade off separately.

> "Two hops: how the client hears about it, and how my server hears about it."`],

  ['How does long polling work, and why does it degrade for high-frequency updates?',
`The client requests, the server **holds the request open** until data exists, responds, and the client immediately re-requests.

The gap is the cost: at 100ms RTT, two updates 10ms apart land at 100ms and up to **290ms** — the client has to call back before it can receive the next one.`],

  ["What's the one infrastructure detail you must call out when proposing long polling?",
`Every hop must tolerate the hold time — a load balancer that times out at 30s will hang up on a client your server was happily holding for 60s. **15–30s is the safe interval.**

It also makes monitoring painful, since requests legitimately sit open for a long time.`],

  ['What HTTP mechanism makes SSE possible, and how does it differ from a normal response?',
`A normal response sends \`Content-Length\` and is one atomic body.

SSE sends **\`Transfer-Encoding: chunked\`** — the client is told to expect a series of chunks of unknown count and size, so the server can write one update, keep the request open, and write more later.`],

  ["What's the nastiest SSE failure mode in real infrastructure?",
`A proxy or load balancer that **doesn't support streaming will buffer the whole response** instead of forwarding chunks — your stream silently stops working until the request completes, with no error to point at.

Opaque and painful to debug; verify every hop supports streaming.`],

  ['Why do persistent WebSocket connections make deployments painful, and what is the standard architectural fix?',
`Redeploying a server severs every connection it holds, forcing mass reconnection — prefer that over migrating connections, it's simpler.

Fix: **terminate WebSockets in a dedicated WebSocket service** behind an L4 load balancer. It rarely deploys, so it rarely churns connections, and the rest of the system stays stateless.`],

  ["What's the common pattern that lets you avoid WebSockets even when clients need to write?",
`**SSE for the downstream updates, plain HTTP POST/PUT for the writes.** WebSockets only earn their complexity when writes are *high-frequency*; occasional writes can just be separate requests.

> "I'd default to SSE and do writes over POST unless write volume actually justifies a duplex connection."`],

  ['With a polling-based second hop, what load number do candidates forget to compute?',
`The read volume on the store. The update source writes to a DB and clients poll it — decoupled and dead simple, but **1M clients polling every 10s is 100K reads/sec**, entirely from clients asking "anything new?"

Do that math before calling polling cheap.`],

  ['To push a message to User C, how do you find which server holds their connection?',
`Make ownership deterministic — hash the user ID to a server, with **ZooKeeper or etcd** holding the server list so every node agrees. A client that connects elsewhere gets redirected to its owner, which keeps a map of user → open connection.

Use **consistent hashing**, not \`% N\`, so scaling doesn't move every connection.`],

  ['What has to happen during a scaling event for a consistent-hash connection layer?',
`Record **both old and new assignments**, drain clients off the old servers gradually so they reconnect to their new owner, then commit the new mapping.

In the interim, **send messages to both the old and new server** so nothing is lost mid-transition.`],

  ['How does a pub/sub second hop work, and why can a client connect to any server?',
`Because the routing state lives in the pub/sub service (Redis/Kafka), not in the servers.

A client connects to any **endpoint server**; that server subscribes to the client's topic — often one topic per user — and forwards published messages down the existing connection.`],

  ['How do you choose between consistent hashing and pub/sub for the second hop?',
`**How much state each connection carries.**

- **Heavy per-connection state** (a Google Docs document: pending ops, collaborator sync) → consistent hashing pins it to one server, and scaling only rebuilds a fraction of it.
- **Just forwarding small messages** → pub/sub; state lives in the broker and endpoint servers stay interchangeable.`],

  ['What do you lose by putting a pub/sub service in the second hop?',
`- **No connection visibility** — the broker doesn't know whether a subscriber is still connected, or when it drops.
- **Bottleneck and SPOF** — scaled by sharding subscriptions across a Redis cluster, which then creates **many-to-many** connections between brokers and endpoint servers.
- One extra hop of latency (<10ms).`],

  ['How do you detect a dead real-time connection and recover the updates missed while it was down?',
`A WebSocket can break without either side noticing — **heartbeats** catch these "zombie" connections.

For recovery, track what each client has received via **sequence numbers** or a per-user queue (Redis streams is the popular choice), and replay from the last acknowledged ID on reconnect.`],

  ['How do you keep message ordering consistent across distributed real-time servers, and what is the interview-appropriate answer?',
`**Funnel related messages through a single server or partition** — a local timestamp then gives you a total order for free, trading some scalability for consistency.

Vector clocks and logical timestamps exist, but they're deep-infra territory — don't reach for them on a product question like an online auction.`],
];

function easternNow(offsetSeconds = 0) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(Date.now() + offsetSeconds * 1000));
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ── 1. Ensure the Bucket / Topic options exist, Topic first ────────────────
async function ensureOption(key, value, promote) {
  const field = (await db.execute({
    sql: `SELECT id FROM domain_fields WHERE domain_id = ? AND key = ?`, args: [DOMAIN, key],
  })).rows[0];
  if (!field) { console.log(`!! ${key} field not found; skipped.`); return; }

  const opts = (await db.execute({
    sql: `SELECT id, value FROM domain_field_options WHERE field_id = ? AND archived_at IS NULL ORDER BY sort_order, id`,
    args: [field.id],
  })).rows;

  if (!opts.some(o => o.value === value)) {
    const row = (await db.execute({
      sql: `INSERT INTO domain_field_options (field_id, value, sort_order) VALUES (?, ?, ?) RETURNING id`,
      args: [field.id, value, opts.length],
    })).rows[0];
    opts.push({ id: row.id, value });
    console.log(`  + ${key} option: ${value}`);
  }

  if (!promote) return;
  const reordered = [...opts.filter(o => o.value === value), ...opts.filter(o => o.value !== value)];
  await db.batch(reordered.map((o, i) => ({
    sql: `UPDATE domain_field_options SET sort_order = ? WHERE id = ?`, args: [i, o.id],
  })), 'write');
  console.log(`  Reordered ${key} options — "${value}" is now first.`);
}

await ensureOption('sd_category', CATEGORY, false);
await ensureOption('sd_topic', TOPIC, true);

// ── 2. Insert the cards (skip any that already exist) ──────────────────────
// New cards land as "New" (interval_level 0, next_due_date NULL), matching the
// rest of the System Design deck.
const existing = new Set((await db.execute({
  sql: `SELECT name FROM problems WHERE domain = ?`, args: [DOMAIN],
})).rows.map(r => r.name));

let inserted = 0, skipped = 0;
for (let i = 0; i < CARDS.length; i++) {
  const [name, answer] = CARDS[i];
  if (existing.has(name)) { skipped++; console.log(`  skip (exists): ${name}`); continue; }

  // Ascending with i so the list order matches the study order above under the
  // domain page's default "Oldest" sort.
  const createdAt = easternNow(i * 60);
  const metadata = JSON.stringify({ sd_category: CATEGORY, sd_topic: TOPIC });
  const problem = (await db.execute({
    sql: `INSERT INTO problems (name, domain, sd_category, sd_topic, notes_text, metadata_json, interval_level, next_due_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, NULL, ?) RETURNING id`,
    args: [name, DOMAIN, CATEGORY, TOPIC, answer, metadata, createdAt],
  })).rows[0];

  await db.execute({
    sql: `INSERT INTO links (problem_id, url, label, created_at) VALUES (?, ?, ?, ?)`,
    args: [problem.id, LINK_URL, LINK_LABEL, createdAt],
  });
  inserted++;
  console.log(`  added: ${name}`);
}

console.log(`\nDone. Inserted ${inserted}, skipped ${skipped} (already present), of ${CARDS.length} total.`);
