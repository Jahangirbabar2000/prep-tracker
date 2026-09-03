// One-off seed: the "Scaling Writes" System Design cards (Patterns bucket).
//
//   node scripts/seed-sd-scaling-writes.mjs --apply     (dry run without it)
//
// Source: hellointerview.com/learn/courses/system-design/lesson/scaling-writes
// Cross-referenced against the existing 243 cards. Skipped as already covered:
// sharding to spread writes and partition-key selection (Sharding, 14 cards,
// plus the In a Hurry Scaling Writes card), the country-as-key example,
// vertical partitioning as a concept, consistent hashing and virtual nodes,
// queues as burst buffers and backpressure (Queue), Cassandra's append-only
// model (NoSQL Databases), cross-shard query cost, vertical scaling (Scaling
// Reads), and wide-column stores for time-series (Data Modeling).
//
// Cards are written to be readable cold: nothing assumes a term introduced in
// a sibling card, and the two framing cards come first so the rest hang off
// them. Zero attempts, next_due_date TOMORROW.
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

const APPLY = process.argv.includes('--apply');
const DOMAIN = 'system_design';
const CATEGORY = 'Patterns';
const TOPIC = 'Scaling Writes';
const LINK_URL = 'https://www.hellointerview.com/learn/courses/system-design/lesson/scaling-writes/scaling-writes';
const LINK_LABEL = 'Scaling Writes · hellointerview';

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

const CARDS = [
  // ── The frame, first, so everything below hangs off it ────────────────────
  ['What are the four strategies for scaling writes?',
`1. **Vertical Scaling and Database Choices** — better hardware, and a store built for appending
2. **Sharding and Partitioning** — split rows across machines, or columns by access pattern
3. **Handling Bursts with Queues and Load Shedding** — absorb the spike, or drop cheap writes
4. **Batching and Hierarchical Aggregation** — many writes into one, or reduce in stages

All four do one thing: **reduce the throughput any single component handles.**`],

  ['When should you NOT apply a write-scaling strategy?',
`When you haven't proved there is a bottleneck — do the back-of-the-envelope math first.

Each one costs you something: **queues** mean delay and eventual consistency, **partitioning** compromises the read path, **batching** adds latency and moving parts. Creating a problem where none existed is the worst outcome.`],

  // ── 1. Vertical scaling and database choices ─────────────────────────────
  ['How many writes per second does Cassandra handle versus a traditional relational database, and what explains the gap?',
`**~10,000+/sec for Cassandra vs ~1,000/sec for a relational database** on the same modest hardware.

The reason: Cassandra only ever **appends** to the end of a file, so the disk writes in one continuous sweep. A relational database updates rows **in place**, seeking to a different spot on disk for each write.`],

  ['Why does optimising for writes usually make reads worse?',
`The trick that makes writes fast — appending everything in arrival order instead of filing it in place — leaves the data scattered. A read then has to check several files and merge the results.

So you have to decide which side is actually your bottleneck. Different parts of one system can go different ways.`],

  ['Which database families are built for write-heavy work, and what is each one for?',
`- **Time-series** (InfluxDB, TimescaleDB) — streams of timestamped values; they also store just the *change* from the previous value to save space
- **Log-structured** (LevelDB) — appends new data instead of updating in place
- **Column stores** (ClickHouse) — analytics, where writes arrive in big batches`],

  ['What can you tune on an existing database to make writes faster?',
`- **Drop expensive extras** during heavy write periods — foreign key checks, triggers, full-text search indexing
- **Batch the log flushes** — Postgres can group several transactions before forcing them to disk
- **Remove indexes** — every index is extra work on every write, paid back only on reads`],

  // ── 3. Bursts ─────────────────────────────────────────────────────────────
  ["If your traffic 4x's at peak, what does that imply about your capacity the rest of the time?",
`That you're sitting at **25% utilisation** whenever it's quiet — you've bought four times the hardware you normally need.

Almost nobody provisions that way, which is why bursts get handled by absorbing them (a queue) or refusing some of them (load shedding), rather than by owning peak capacity year-round.`],

  ["Why isn't autoscaling the answer to a database write burst?",
`Because it isn't instant, and for databases the act of scaling often means **downtime or reduced throughput** — precisely when you can least afford it.

Autoscaling suits stateless app servers far better than the database sitting behind them.`],

  ['If you put a queue in front of your writes, what does the client now need?',
`**A way to check back later.** The server can only tell the client "your write is queued", not "your write is saved" — those are now two separate moments.

So the client polls, or gets notified when the write actually lands. Fine for plenty of features; fatal for anything needing immediate confirmation.`],

  ['Your location-tracking system is overloaded. Why is dropping writes a reasonable answer here?',
`Because a **fresher one is arriving in a few seconds anyway.** Drivers report position continuously, so a dropped update costs almost nothing — the next one supersedes it.

Queueing them would be worse: you'd build a backlog of positions that are already stale by the time you process them.`],

  // ── 4. Batching and hierarchical aggregation ──────────────────────────────
  ['What are the three places you can batch writes, and what does each cost you?',
`- **In the application** — cheapest, but if your app holds the only copy, a crash loses writes you already confirmed
- **In a service between app and database** — safe, but another moving piece to run
- **In the database itself** — just a config change (how often it flushes to disk), but the bluntest instrument`],

  ['How much can an intermediate batching service reduce write volume, concretely?',
`If a post gets **100 likes in one minute** and your batcher collects for a minute, you write the new total **once instead of 100 times** — a 100x reduction.

It works because you don't need each individual like stored, only the count.`],

  ['When does batching buy you nothing at all?',
`When the writes are already spread thin. If the average post gets **one like an hour**, a one-minute window almost always collects exactly one event — so you've added a service and some latency for no reduction whatsoever.

Batching pays off only where events genuinely pile up inside your window.`],

  ['A million viewers each comment and like on a live stream, and everyone must see everything. Why does a single processor fail?',
`Because every viewer is both a writer and a reader: **a million writes coming in, a million recipients going out** — a million-by-million problem for one machine.

The saving grace is that everyone wants the *same* view, and it only has to be roughly current.`],

  ['What is hierarchical aggregation, and what does it cost?',
`Reducing the data in **stages** rather than all at once. Middle-layer processors each own some comments, total up their likes over a short window, and pass a small summary to one root. On the way out, broadcast nodes fan each update to the viewers assigned to them.

The cost is **latency** — every stage adds delay.`],

  // ── Deep dives ────────────────────────────────────────────────────────────
  ['You need to go from 8 shards to 16 without downtime. How?',
`**Write to both places for a while.** During the migration every write goes to the old shard and the new one, while reads prefer the new. That lets you copy data across gradually with the system still serving traffic.

The alternative — stop, rehash everything, restart — means hours of downtime for a large dataset.`],

  ['If writers spread a hot key across sub-keys, how do readers know?',
`They have to agree, or readers miss data. Two ways:

- **Readers always check every sub-key** — simple, and what most production systems do; the extra reads cost little
- **Writers announce the split first** — more efficient, but every reader must get the message before the split takes effect`],

  ["What kind of data can you split across sub-keys, and what kind can't you?",
`**Splittable:** anything you can add back up — likes, views, counts, balances. Read all the parts and sum them.

**Not splittable:** a record that must stay whole, like a user profile. There's nothing to sum.

Conveniently, whole records rarely come under this kind of write pressure.`],
];

const bad = CARDS.filter(([, a]) => a.length < 200 || a.length > 460);
if (bad.length) {
  for (const [n, a] of bad) console.log(`!! ${a.length} chars — ${n.slice(0, 62)}`);
  throw new Error(`${bad.length} card(s) outside the 200–460 char band`);
}
console.log(`${CARDS.length} cards, ${Math.min(...CARDS.map(c=>c[1].length))}–${Math.max(...CARDS.map(c=>c[1].length))} chars.`);

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const existing = new Set((await db.execute({
  sql: `SELECT name FROM problems WHERE domain = ?`, args: [DOMAIN],
})).rows.map(r => r.name));
const dupes = CARDS.filter(([n]) => existing.has(n));
if (dupes.length) console.log(`(${dupes.length} already present, will skip)`);

if (!APPLY) { console.log('\nDRY RUN — re-run with --apply to write.'); process.exit(0); }

// Topic option, promoted to the top of the Topic filter.
const topicField = (await db.execute({
  sql: `SELECT id FROM domain_fields WHERE domain_id = ? AND key = 'sd_topic'`, args: [DOMAIN],
})).rows[0];
if (!topicField) throw new Error('sd_topic field not found');
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
await db.batch([...opts.filter(o => o.value === TOPIC), ...opts.filter(o => o.value !== TOPIC)]
  .map((o, i) => ({ sql: `UPDATE domain_field_options SET sort_order = ? WHERE id = ?`, args: [i, o.id] })), 'write');

const dueDate = easternTomorrow();
let inserted = 0, skipped = 0;
for (const [name, answer] of CARDS) {
  if (existing.has(name)) { skipped++; continue; }
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
}
console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}. Due ${dueDate}, zero attempts.`);
