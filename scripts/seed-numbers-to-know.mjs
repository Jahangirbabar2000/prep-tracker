// One-off seed: adds the "Numbers to Know" System Design questions and moves
// the "Numbers to Know" Topic option to the top of the list.
//
//   node scripts/seed-numbers-to-know.mjs
//
// Safe to re-run: questions are matched by title and skipped if they already
// exist, so no duplicates. Reads Turso credentials from .env.local.
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
const TOPIC = 'Numbers to Know';
const LINK_URL = 'https://www.hellointerview.com/learn/system-design/core-concepts/numbers-to-know';
const LINK_LABEL = 'Numbers to Know · hellointerview';

// group → [ [question, answer], ... ]
const GROUPS = {
  'Caching': [
    ['What latency should I assume for a modern in-memory cache?',
     'Often under 1ms for reads and writes within the same availability zone. Actual latency depends on network hops and serialization overhead.'],
    ['How much data can a single cache instance realistically hold?',
     'Depends on cost, dataset size, and replication needs, not a fixed ceiling. Memory-optimized instances can reach ~1TB, but treat that as a reference point, not a hard limit.'],
    ['What throughput can a single cache instance handle?',
     "100k-200k+ ops/sec for standard configs; can reach ~1M ops/sec under favorable conditions (small values, optimized nodes), but don't anchor on that in an interview."],
    ['When do you scale/shard a cache?',
     'When dataset size, throughput, or latency requirements exceed what a single instance comfortably handles, e.g. approaching 1TB, sustained throughput above 100k ops/sec, or read latency needs below 0.5ms.'],
    ['When should you cache only part of a dataset instead of the whole thing?',
     "When the full dataset doesn't fit comfortably in cache, or when only a small portion is frequently accessed (hot/cold data split). Caching everything is simpler when it fits; partial caching is the normal choice when it doesn't."],
  ],
  'Databases': [
    ['How much data can a single database instance hold?',
     'Engine limits go up to 64 TiB (standard) or 256 TiB (Aurora), but these are not practical operating limits. The real question: when should you consider splitting data? When storage, write throughput, recovery time, or operational needs exceed what one database can handle.'],
    ['What read latency should you assume for indexed database lookups?',
     'Roughly 1-5ms cached, 5-30ms on disk, but this depends heavily on query complexity, index quality, load, and network. Use as a rough anchor, not a guarantee.'],
    ['What write throughput can a single-node database handle before scaling concerns?',
     '10-20k TPS for simple writes on a well-tuned instance.'],
    ['When do you actually need to shard a database?',
     'When a single write primary can’t meet workload or operational requirements after reasonable measures (indexing, vertical scaling, connection pooling). Not based on data size alone, e.g. 50 TiB is a rough signal, not a trigger by itself.'],
    ['Does having read replicas mean you have high availability?',
     'Not by itself. Replicas improve read scaling and can support failover, but true HA also requires replication monitoring, health checks, and promotion/failover handling.'],
  ],
  'Application Servers': [
    ['How many concurrent connections can one app server instance handle?',
     'Tens of thousands or more for lightweight, event-driven connections. Capacity drops significantly for long-lived or CPU-heavy connections. Don’t default to "100k+" without qualifying the connection type.'],
    ['What’s the first bottleneck on app servers, CPU or memory?',
     'Usually CPU for typical request handling, but memory can be first for large responses, in-process caches, or memory leaks. Don’t assume CPU is always the constraint.'],
    ['When do you horizontally scale app servers?',
     'When sustained CPU, memory, queue depth, or latency shows the instance is near safe capacity, roughly CPU/memory above 70-80% or response latency exceeding SLA.'],
  ],
  'Message Queues': [
    ['What throughput can a single Kafka broker handle?',
     'Roughly hundreds of MB/sec per broker, not a fixed messages/sec number. Actual throughput depends on message size, replication factor, disk speed, partition count, and consumer behavior.'],
    ['What latency should you assume for a message queue end-to-end?',
     'Treat it as milliseconds to seconds, not a fixed sub-5ms number. Backlog buildup and consumer processing time usually dominate actual end-to-end latency.'],
    ['Should message queues be used in synchronous request flows by default?',
     'No. A queue makes a flow asynchronous by design; waiting synchronously for a consumer response removes most of the benefit (decoupling, buffering, retry handling).'],
    ['When do you actually need a message queue?',
     'When you need to absorb traffic spikes, decouple producers from consumers, or process work asynchronously. Not triggered by a fixed write-per-second threshold. Guaranteed delivery also depends on producer/broker/consumer design, not just inserting a queue.'],
  ],
  'Common Interview Mistakes': [
    ['Candidate says 100GB of data needs sharding. Correct response?',
     'Usually unnecessary. A single database can typically handle 100GB comfortably, unless a specific workload or operational bottleneck (not size alone) says otherwise.'],
    ['Candidate adds a cache to speed up a simple indexed row lookup. Justified?',
     'Not by default, since indexed lookups are already fast (sub-ms to a few ms). But caching can still help if reads are extremely frequent or latency requirements are unusually tight.'],
    ['Candidate adds a message queue at 5k writes/sec. Justified?',
     'Not for throughput alone (a well-tuned Postgres instance handles 20k+ writes/sec). A queue may still be useful to absorb spikes or move noncritical work off the request path, independent of raw throughput.'],
  ],
};

// "YYYY-MM-DD HH:MM:SS" in Eastern time — matches the app's localNow().
function easternNow(offsetSeconds = 0) {
  const d = new Date(Date.now() + offsetSeconds * 1000);
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(d);
  const p = Object.fromEntries(parts.filter(x => x.type !== 'literal').map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Flatten in listed order.
const items = [];
for (const [group, qas] of Object.entries(GROUPS)) {
  for (const [q, a] of qas) items.push({ name: `${group} — ${q}`, answer: a });
}

// ── 1. Move the "Numbers to Know" Topic option to the top ──────────────────
const topicField = (await db.execute({
  sql: `SELECT id FROM domain_fields WHERE domain_id = ? AND key = 'sd_topic'`, args: [DOMAIN],
})).rows[0];
if (topicField) {
  const opts = (await db.execute({
    sql: `SELECT id, value, sort_order FROM domain_field_options WHERE field_id = ? AND archived_at IS NULL ORDER BY sort_order, id`,
    args: [topicField.id],
  })).rows;
  const reordered = [...opts.filter(o => o.value === TOPIC), ...opts.filter(o => o.value !== TOPIC)];
  await db.batch(reordered.map((o, i) => ({
    sql: `UPDATE domain_field_options SET sort_order = ? WHERE id = ?`, args: [i, o.id],
  })), 'write');
  console.log(`Reordered Topic options — "${TOPIC}" is now first.`);
} else {
  console.log('!! sd_topic field not found; skipped reorder.');
}

// ── 2. Insert the questions (skip any that already exist) ──────────────────
const existing = new Set((await db.execute({
  sql: `SELECT name FROM problems WHERE domain = ?`, args: [DOMAIN],
})).rows.map(r => r.name));

let inserted = 0, skipped = 0;
for (let i = 0; i < items.length; i++) {
  const { name, answer } = items[i];
  if (existing.has(name)) { skipped++; console.log(`  skip (exists): ${name}`); continue; }

  // First item newest so the group order reads top-to-bottom in the list.
  // Ascending with i, matching id order (insertion order below) — see
  // scripts/seed-deep-learning.mjs for why a negative offset here is wrong.
  const createdAt = easternNow(i * 60);
  const metadata = JSON.stringify({ sd_topic: TOPIC });
  const problem = (await db.execute({
    sql: `INSERT INTO problems (name, domain, sd_topic, notes_text, metadata_json, interval_level, next_due_date, created_at)
          VALUES (?, ?, ?, ?, ?, 0, NULL, ?) RETURNING id`,
    args: [name, DOMAIN, TOPIC, answer, metadata, createdAt],
  })).rows[0];

  await db.execute({
    sql: `INSERT INTO links (problem_id, url, label, created_at) VALUES (?, ?, ?, ?)`,
    args: [problem.id, LINK_URL, LINK_LABEL, createdAt],
  });
  inserted++;
  console.log(`  added: ${name}`);
}

console.log(`\nDone. Inserted ${inserted}, skipped ${skipped} (already present), of ${items.length} total.`);
