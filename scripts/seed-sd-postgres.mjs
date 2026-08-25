// One-off seed: the "PostgreSQL" System Design cards (Key Technologies bucket),
// plus a reword of the index-cost card so two cards stop contradicting.
//
//   node scripts/seed-sd-postgres.mjs
//
// Source: hellointerview.com/learn/courses/system-design/lesson/scaling-reads/postgres
// Cross-referenced against the existing 194 System Design cards. Skipped as
// already covered: B-tree/multi-column indexes and covering indexes (Database
// Indexing), full-text search and when Elasticsearch wins (Search Optimization),
// PostGIS/geospatial (R-trees, Proximity-Based Services), "default to Postgres"
// (Data Modeling), joins+indexes+ACID (Relational Databases), read replicas and
// sync-vs-async replication (Scaling Reads), shard-by-access-pattern (Sharding),
// batching and write offloading (Numbers to Know, Message Queues),
// normalization/foreign keys/cardinalities (Data Modeling).
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
const TOPIC = 'PostgreSQL';
const LINK_URL = 'https://www.hellointerview.com/learn/courses/system-design/lesson/scaling-reads/postgres';
const LINK_LABEL = 'PostgreSQL · hellointerview';

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
  ['How does a JSONB column let Postgres cover a NoSQL-shaped requirement?',
`Store the variable attributes — location, mentions, hashtags, media — in one **JSONB** column instead of a column per possibility, then index it with **GIN** so containment queries stay fast:

\`WHERE metadata @> '{"type":"video"}'\`

Schema flexibility without adding MongoDB to the architecture.`],

  ['What is a partial index, and when is it the right call?',
`An index with a \`WHERE\` clause, so only a subset of rows is indexed:

\`CREATE INDEX idx_active ON users(email) WHERE status = 'active'\`

Smaller and cheaper to maintain than indexing everything. Right whenever most queries touch only a subset — active vs deleted records being the classic case.`],

  ['What per-core throughput should you assume for a single Postgres node?',
`- **Simple indexed reads:** 50k+/sec per core
- **Simple inserts:** ~5,000/sec per core
- **Updates touching indexes:** 1,000–2,000/sec per core
- **Complex multi-table transactions:** hundreds/sec
- **Bulk loads:** tens of thousands of rows/sec

Reads beat writes because they need no WAL entry and no index update.`],

  ['At what size does a single Postgres table start to hurt?',
`- Tables get unwieldy past **100M rows**
- Complex joins get hard above **10M rows** per table
- Full-text search holds up to **tens of millions** of documents
- Performance falls off once the **working set exceeds RAM**

Not hard limits — the point where partitioning or sharding enters the conversation.`],

  ["What actually bounds PostgreSQL's write throughput?",
`**The WAL flush at commit** — the one synchronous, disk-bound step before a transaction can be acknowledged.

Everything else is deferred: the page is dirtied in the **buffer cache**, and a **background writer** flushes dirty pages to the data files later, in batches. Each extra index adds its own WAL entries.`],

  ['Why does PostgreSQL need a connection pooler in front of it?',
`Postgres **forks an OS process per connection**, so a few hundred connections burn real memory and CPU on context switching.

Put **PgBouncer** in front to multiplex many application connections onto a small pool of database ones — essential once you're running many app instances.`],

  ['How does table partitioning help writes, not just reads?',
`\`PARTITION BY RANGE (created_at)\` with a partition per month means different sessions **write to different partitions concurrently**, index updates touch only the relevant partition, and bulk loads can run partition by partition.

Reads win too: recent-post queries skip years of history, and hot partitions can sit on NVMe.`],

  ["What's the catch with sharding PostgreSQL?",
`Unlike DynamoDB, **Postgres has no built-in sharding** — you implement it yourself, including cross-shard queries and keeping schemas consistent across nodes. **Citus** is the managed way out.

Shard on the column you query by most, so a user's data lives on one shard and reads avoid scatter-gather.`],

  ['"We\'ll use transactions" isn\'t enough — what should you say instead?',
`Name the locking. **\`SELECT … FOR UPDATE\`** takes a row-level lock, so another transaction reading that row with \`FOR UPDATE\` waits for your commit.

"Transactions **and row-level locking on the auction row**" is the answer that lands — a bare transaction at Read Committed still lets two bidders read the same max bid.`],

  ["What are PostgreSQL's isolation levels, and how many does it really have?",
`**Three distinct behaviours**, though it accepts all four SQL levels: **Read Committed** (the default), **Repeatable Read**, **Serializable**.

\`Read Uncommitted\` is treated as Read Committed — **MVCC prevents dirty reads at every level**, so there is nothing weaker to offer.`],

  ["How is PostgreSQL's Repeatable Read stronger than the SQL standard?",
`It prevents **phantom reads**, not just non-repeatable ones: a consistent snapshot as of transaction start, with no new rows appearing that match your predicate even if another transaction commits them.

Consequence: you may not need **Serializable** where another database would demand it.`],

  ['Serializable isolation or row-level locking — how do you choose?',
`- **Row-level locking** when you know exactly which rows need atomic updates (auction bids, inventory) — higher concurrency, less overhead, but you handle **deadlocks**
- **Serializable** when the transaction is too complex to reason about what to lock — simpler to write, but you must handle **serialization failures and retries**`],

  ['How do you implement optimistic concurrency control in Postgres?',
`There is no built-in syntax — add a **version column**. Read \`maxBid, version\`, then \`UPDATE … WHERE id = 123 AND version = 5\`. **Zero rows updated means someone beat you** — retry.

Good when conflicts are rare and you would rather not hold locks; bad when they are frequent, since you burn work on retries.`],

  ['How does "consistency" differ between ACID and CAP?',
`**ACID consistency** — the database never leaves a valid state; every constraint, foreign key and check holds.

**CAP consistency** — every read returns the most recent write, even at the cost of availability.

Same word, unrelated guarantees. Conflating the two is a common interview slip.`],

  ['What are the three legitimate reasons NOT to use PostgreSQL?',
`- **Millions of writes/sec** — every write needs a WAL entry and index updates → Cassandra, or Redis for counters
- **Active-active multi-region** — Postgres is single-primary → CockroachDB, DynamoDB global tables
- **Pure key-value access** — MVCC, WAL and the planner are overhead you don't need → Redis, DynamoDB

**Scale alone is not one of them.**`],
];

// Card 391 previously argued only one side (add indexes confidently). This
// lesson argues the other (don't index every column). Hold both.
const INDEX_CARD_ID = 391;
const INDEX_CARD_ANSWER = `- **Storage** — every index needs disk space, sometimes nearly as much as the data
- **Write performance** — an insert or update touches the table *and* every index on it
- **May go unused** — the planner can still pick a sequential scan

The balance: **index your actual query patterns confidently — under-indexing kills more applications than over-indexing — but don't index every column.** Skip it on write-heavy, rarely-read tables (a log) or tables small enough to scan.`;

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

// ── 1. Ensure the Topic option exists, promoted to the top ──────────────────
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

// ── 2. Insert the cards ─────────────────────────────────────────────────────
const existing = new Set((await db.execute({
  sql: `SELECT name FROM problems WHERE domain = ?`, args: [DOMAIN],
})).rows.map(r => r.name));

const dueDate = easternTomorrow();
let inserted = 0, skipped = 0;
for (const [name, answer] of CARDS) {
  if (existing.has(name)) { skipped++; console.log(`  skip (exists): ${name.slice(0, 58)}`); continue; }
  const createdAt = easternNow(inserted * 60); // ascending = article order under Oldest-first
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

// ── 3. Reword the index-cost card ───────────────────────────────────────────
const idx = (await db.execute({ sql: 'SELECT name, notes_text FROM problems WHERE id = ?', args: [INDEX_CARD_ID] })).rows[0];
if (!idx) throw new Error(`card ${INDEX_CARD_ID} not found`);
if (!idx.name.includes('two main costs of adding an index')) {
  throw new Error(`card ${INDEX_CARD_ID} is not the index-cost card ("${idx.name}") — inspect before rerunning`);
}
if (idx.notes_text === INDEX_CARD_ANSWER) {
  console.log('\n  index-cost card already reworded.');
} else {
  await db.execute({ sql: 'UPDATE problems SET notes_text = ? WHERE id = ?', args: [INDEX_CARD_ANSWER, INDEX_CARD_ID] });
  console.log(`\n  ~ Reworded index-cost card ${INDEX_CARD_ID} (${INDEX_CARD_ANSWER.length} chars).`);
}

console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}, of ${CARDS.length}. Due ${dueDate}.`);
