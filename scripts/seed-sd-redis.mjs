// One-off seed: the "Redis" System Design cards (Key Technologies bucket).
//
//   node scripts/seed-sd-redis.mjs
//
// Source: hellointerview.com/learn/courses/system-design/lesson/scaling-reads/redis
// Cross-referenced against the existing 209 System Design cards. Skipped as
// already covered: the data-structure list and sorted-set caching example
// (Distributed Cache), eviction policies (Caching), the hot-key concept plus
// local caching and key copies (hot key card + the Scaling Reads cache key
// fanout card), the distributed-lock concept/expiry/deadlocks (Distributed
// Lock), streams vs queues and event sourcing (Streams / Event Sourcing),
// geohash internals (Database Indexing), 100k ops/sec and single-threaded
// CPU-bound (Numbers to Know), rate limiting as a concept (API Design), and
// Pub/Sub as the real-time second hop (Real-time Updates).
//
// Cards go in with ZERO attempts, interval_level 0, next_due_date TOMORROW —
// reviewQueue() admits on the due date alone. See AGENTS.md.
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
const CATEGORY = 'Key Technologies';
const TOPIC = 'Redis';
const LINK_URL = 'https://www.hellointerview.com/learn/courses/system-design/lesson/scaling-reads/redis';
const LINK_LABEL = 'Redis · hellointerview';

function easternNow(offsetSeconds = 0) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date(Date.now() + offsetSeconds * 1000)).filter(x => x.type !== 'literal')
    .map(x => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}
function easternTomorrow() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York' })
    .format(new Date(Date.now() + 86_400_000));
}

// Article order: basics/durability → cluster → cache → locks → leaderboards →
// rate limiting → geo → streams → pub/sub → hot keys → boundaries.
const CARDS = [
  ["Why isn't Redis a system of record, on the persistence side?",
`Neither mode gives you commit-is-on-disk. **RDB** takes periodic snapshots — a crash loses everything since the last one. **AOF** logs every write but **fsyncs once per second** by default, so a crash loses up to a second of *acknowledged* writes.

You can fsync per write; few do, since it costs the speed they came for. **MemoryDB** trades some speed for real durability.`],

  ["What does Redis's asynchronous replication cost you on failover?",
`The primary acknowledges your write **before any replica has seen it**. So when it dies and a replica is promoted, the last moments of acknowledged writes simply vanish.

This is the deepest reason Redis isn't a system of record — and it is what breaks single-node locks.`],

  ['How does a Redis cluster shard data, and how does that differ from a hash ring?',
`Every key hashes to one of **16,384 fixed hash slots**, each slot assigned to a node — not positions on a ring.

Clients **cache the slot→node map** and connect straight to the owner. Ask the wrong node and you get a **\`MOVED\`** reply, not a forwarded request; nodes learn the full map by **gossip**.`],

  ['What does a Redis cluster refuse to do for you?',
`**Route or merge across nodes.** There is no query router — with few exceptions all data for a single command must live on **one node**, and if it doesn't you get an **error, not a slow query**.

Choosing how to structure your keys *is* how you scale Redis.`],

  ['How do you force two Redis keys onto the same node?',
`**Hash tags.** Only the part inside \`{braces}\` is hashed, so \`{user:123}:posts\` and \`{user:123}:likes\` always land in the same slot.

That co-location is what makes a \`MULTI\` transaction across both possible.`],

  ['What happens when a Redis cache fills up, out of the box?',
`**It rejects writes.** TTL handles *staleness*, not memory pressure — the two are unrelated.

For a cache you must configure an eviction policy such as **\`allkeys-lru\`**. Redis approximates LRU by **sampling** keys rather than tracking exact order, which is plenty for a cache.`],

  ["What's the actual Redis distributed-lock recipe?",
`\`SET lock:concert:343 my-token NX EX 30\` — **\`NX\`** succeeds only if the key is absent (that *is* the lock), **\`EX 30\`** stops a crashed holder keeping it forever, and \`my-token\` is random and yours.

Release with a **Lua script** that checks the token still matches before deleting; a blind \`DEL\` could remove someone else's lock after yours expired.`],

  ['How much should you trust a Redis lock?',
`Treat it as an **efficiency tool that occasionally fails, not a correctness guarantee** — async replication can hand the same lock to two holders. **Redlock** takes a majority of independent nodes but is contested; the real defence is a **fencing token** the storage layer checks, which Redis cannot provide.

If a stale holder would corrupt data, enforce it where the data lives: \`SELECT … FOR UPDATE\` or \`UPDATE … WHERE version = X\`.`],

  ['Is a Redis lock optimistic or pessimistic — and what is the other option?',
`Grabbing a lock before doing the work is **pessimistic**.

For optimistic control, **\`WATCH\` a key then run \`MULTI\`/\`EXEC\`** — the transaction aborts if the watched key changed underneath you.`],

  ['Leaderboards with sorted sets: what do ZADD and ZREMRANGEBYRANK actually do?',
`**\`ZADD\` replaces an existing member's score**, so re-adding a post with its new like count just moves its rank — no read-modify-write.

**\`ZREMRANGEBYRANK key 0 -6\`** trims to the top 5: negative indexes count from the highest rank, so this clears everything from the lowest score up to sixth-from-top.`],

  ["What's the subtle bug in a Redis fixed-window rate limiter?",
`Calling \`EXPIRE\` on every request keeps **pushing the reset forward**, so steady traffic never gets a fresh window. Set the expiry **only when \`INCR\` returns 1** — the first request of the window.

Run \`INCR\` and \`EXPIRE\` as one **Lua script**: a crash between them leaves a counter that never resets.`],

  ['How do you build a sliding-window rate limiter in Redis?',
`One **sorted set per user**, request timestamp as the score. Per request: **\`ZREMRANGEBYSCORE\`** to drop entries older than the window, **\`ZCARD\`** to count what's left, and **\`ZADD\`** the new request if the count is under the limit.

Run the sequence as a **Lua script** so it executes atomically.`],

  ['Why is GEOSEARCH O(N + log M), with two separate terms?',
`Redis encodes lat/long as **geohashes in a sorted set** — seeking into it is the **log** term.

Geohash boxes are grid-aligned and square, so imprecise: a first pass grabs the **N** candidates inside the boxes, then a second pass filters them to the **M** actually within the exact radius.`],

  ['How does a Redis Streams work queue recover from a dead worker, and what does that force on you?',
`A consumer group tracks pending entries per worker, each carrying an **idle time**. When a worker dies its entry's idle time climbs until another worker claims it with **\`XCLAIM\`/\`XAUTOCLAIM\`**.

Redis can't tell a slow worker from a dead one, so an item can be processed twice — **make processing idempotent**.`],

  ["What are Redis Pub/Sub's delivery guarantees, and which limitation is now obsolete?",
`**At-most-once, nothing persisted** — a subscriber that is offline misses the message entirely.

Obsolete: that cluster Pub/Sub can't scale. Classic mode broadcast every message to every node, but **since Redis 7 sharded Pub/Sub (\`SPUBLISH\`/\`SSUBSCRIBE\`)** routes each channel to the shard owning its slot, so capacity grows with the cluster.`],

  ['Why should you not roll your own Pub/Sub on top of Redis keys?',
`The objection it answers is wrong: Pub/Sub holds **one connection per node**, carrying every subscribed channel — not one per channel.

Homegrown costs **3 network hops instead of 2**, and the last one needs a fresh TCP connection per subscriber. You also inherit heartbeats or TTLs to evict dead servers from the map.`],

  ['Read replicas as a hot-key fix — what are the two caveats?',
`- **Cluster clients read from the primary by default**, so replicas absorb nothing unless clients opt in with \`READONLY\`
- Replicas do **nothing for a write-hot key**, since every write still lands on the single primary owning that slot

Either way you are accepting reads a replication lag behind.`],

  ['Where is the boundary — when should you not use Redis?',
`- **Not as a system of record** — async replication plus persistence windows mean acknowledged writes can vanish
- **Not when the working set can't economically fit in RAM** — memory is the priciest place to keep data
- **Not for query flexibility** — no joins, no cross-key queries, multi-key only within a slot
- **Not for durable replayable streams** with long retention for many consumers — that's Kafka`],
];

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

// ── 1. Topic option, promoted to the top ────────────────────────────────────
const topicField = (await db.execute({
  sql: `SELECT id FROM domain_fields WHERE domain_id = ? AND key = 'sd_topic'`, args: [DOMAIN],
})).rows[0];
if (!topicField) throw new Error('sd_topic field not found for system_design.');
const opts = (await db.execute({
  sql: `SELECT id, value FROM domain_field_options WHERE field_id = ? AND archived_at IS NULL ORDER BY sort_order, id`,
  args: [topicField.id],
})).rows;
if (!opts.some(o => o.value === TOPIC)) {
  const row = (await db.execute({
    sql: `INSERT INTO domain_field_options (field_id, value, sort_order) VALUES (?, ?, ?) RETURNING id`,
    args: [topicField.id, TOPIC, opts.length],
  })).rows[0];
  opts.push({ id: row.id, value: TOPIC });
  console.log(`  + sd_topic option: ${TOPIC}`);
}
const reordered = [...opts.filter(o => o.value === TOPIC), ...opts.filter(o => o.value !== TOPIC)];
await db.batch(reordered.map((o, i) => ({
  sql: `UPDATE domain_field_options SET sort_order = ? WHERE id = ?`, args: [i, o.id],
})), 'write');
console.log(`  Reordered sd_topic options — "${TOPIC}" first.`);

// ── 2. Insert ───────────────────────────────────────────────────────────────
const existing = new Set((await db.execute({
  sql: `SELECT name FROM problems WHERE domain = ?`, args: [DOMAIN],
})).rows.map(r => r.name));

const dueDate = easternTomorrow();
let inserted = 0, skipped = 0;
for (const [name, answer] of CARDS) {
  if (existing.has(name)) { skipped++; console.log(`  skip (exists): ${name.slice(0, 58)}`); continue; }
  const createdAt = easternNow(inserted * 60);
  const problem = (await db.execute({
    sql: `INSERT INTO problems (name, domain, sd_category, sd_topic, notes_text, metadata_json,
            interval_level, next_due_date, created_at)
          VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?) RETURNING id`,
    args: [name, DOMAIN, CATEGORY, TOPIC, answer,
      JSON.stringify({ sd_category: CATEGORY, sd_topic: TOPIC }), dueDate, createdAt],
  })).rows[0];
  await db.execute({
    sql: `INSERT INTO links (problem_id, url, label, created_at) VALUES (?, ?, ?, ?)`,
    args: [problem.id, LINK_URL, LINK_LABEL, createdAt],
  });
  inserted++;
  console.log(`  added (${answer.length} chars): ${name.slice(0, 58)}`);
}

console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}, of ${CARDS.length}. Due ${dueDate}.`);
