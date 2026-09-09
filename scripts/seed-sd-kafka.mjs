// One-off seed: the "Kafka" System Design cards (Key Technologies bucket).
//
//   node scripts/seed-sd-kafka.mjs --apply      (dry run without it)
//
// Source: hellointerview.com/learn/courses/system-design/lesson/scaling-writes/kafka
// Each card links to its own section anchor, taken from the article's own
// "On This Page" list (the reliable source per the anchor-slug rule).
//
// Voice: matched to the AWS deck, which reviews far better than the System
// Design cards written before it. Direct questions ("What is X?", "What's the
// difference between X and Y?"), the count stated when there is one, every
// acronym expanded inline, and `**Term** — explanation` bullets for anything
// with two or more parts. No scenario framing, no rhetorical setups.
//
// Kafka was almost absent from the deck — only named in passing inside the
// Queue, Streams / Event Sourcing and Numbers to Know cards.
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
const CATEGORY = 'Key Technologies';
const TOPIC = 'Kafka';
const BASE = 'https://www.hellointerview.com/learn/courses/system-design/lesson/scaling-writes/kafka';

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

// [question, answer, section label, anchor]
const CARDS = [
  ['What is a Kafka broker?',
`An individual server — physical or virtual — that stores data and serves clients.

A **Kafka cluster** is made up of multiple brokers. The more you have, the more data you can store and the more clients you can serve.`,
   'Basic Terminology', 'basic-terminology-and-architecture'],

  ['What is a Kafka partition?',
`An **ordered, immutable sequence of messages** that is continually appended to — think of a log file. Each broker holds a number of them.

Partitions are how Kafka scales: they let messages be consumed in parallel.`,
   'Basic Terminology', 'basic-terminology-and-architecture'],

  ["What's the difference between a Kafka topic and a partition?",
`- **Topic** — a *logical* grouping of messages; what you publish to and subscribe from. Always multi-producer.
- **Partition** — a *physical* grouping; one topic can have many, each on a different broker.

Topics organize your data; partitions scale it.`,
   'Basic Terminology', 'basic-terminology-and-architecture'],

  ['What are producers and consumers in Kafka?',
`- **Producer** — writes messages to a topic.
- **Consumer** — reads messages from a topic.

Kafka exposes a simple API for both, but creating and processing the messages is on you. Kafka doesn't care what the data is — it just stores and serves it.`,
   'Basic Terminology', 'basic-terminology-and-architecture'],

  ['What is a Kafka consumer group?',
`A set of consumers sharing the work of a topic. **Each partition is assigned to exactly one consumer in the group**, so under normal operation each message is delivered once.

In a failure a message may be reprocessed, but it is never split across two consumers.`,
   'Basic Terminology', 'basic-terminology-and-architecture'],

  ["What's the difference between using Kafka as a message queue and as a stream?",
`The consumption pattern — both track progress with offset commits.

- **Queue** — each message is processed by one consumer in a group, then effectively consumed.
- **Stream** — the log is retained and can be replayed, and multiple consumer groups read the same data independently.`,
   'Basic Terminology', 'basic-terminology-and-architecture'],

  ['What four fields make up a Kafka message?',
`All four are technically optional:

- **Value** — the payload.
- **Key** — determines which partition the message goes to.
- **Timestamp** — when the message was created or ingested.
- **Headers** — key-value metadata, like HTTP headers.`,
   'How Kafka Works', 'how-kafka-works'],

  ['What does the key on a Kafka message control?',
`**Which partition it lands on.** Messages sharing a key always go to the same partition, which is what preserves their order.

Without a key, modern clients use a **sticky partitioner** — batching to one partition then rotating — so you get an even spread but no ordering guarantee.`,
   'How Kafka Works', 'how-kafka-works'],

  ['How does Kafka decide which partition and broker a published message goes to?',
`Two steps:

- **Partition** — hash the key and take the modulo: \`partition = hash(key) % num_partitions\` (murmur2 by default).
- **Broker** — cluster metadata, maintained by the **controller**, maps that partition to a broker; the producer sends straight to it.`,
   'How Kafka Works', 'how-kafka-works'],

  ['Why is a Kafka partition append-only, and what three benefits does that give?',
`- **Immutability** — messages are never modified in place, only aged out by retention; this simplifies replication and recovery.
- **Efficiency** — appending to the end minimizes disk seeks.
- **Scalability** — partitions are easy to add across brokers and to replicate.`,
   'How Kafka Works', 'how-kafka-works'],

  ['What is an offset in Kafka?',
`A **sequential ID marking a message's position within a partition**.

Consumers track how far they have read and periodically **commit** their offset back to Kafka, so after a crash or restart they resume from where they left off.`,
   'How Kafka Works', 'how-kafka-works'],

  ['What delivery guarantee does Kafka give by default, and what does exactly-once require?',
`**At-least-once.** If a consumer crashes after processing a message but before committing its offset, that message is reprocessed on restart.

**Exactly-once** is possible but needs extra configuration: **idempotent producers plus the transactional APIs**.`,
   'How Kafka Works', 'how-kafka-works'],

  ['How does Kafka replicate a partition?',
`A **leader-follower** model:

- **Leader** — one replica on one broker; handles all writes and, by default, reads.
- **Followers** — replicas on other brokers that passively copy the leader and serve no clients.

If the leader fails, the **controller** promotes a fully in-sync follower.`,
   'How Kafka Works', 'how-kafka-works'],

  ['Why do Kafka consumers pull messages rather than have them pushed?',
`A deliberate design choice. Pulling lets each consumer **control its own consumption rate**, simplifies failure handling, stops slow consumers being overwhelmed, and allows efficient batching.`,
   'How Kafka Works', 'how-kafka-works'],

  ['What are the three reasons to use Kafka as a message queue?',
`- **Async processing** — YouTube serves the standard-definition video immediately and queues the file for transcoding.
- **Ordering** — a virtual waiting room admits users in the order they arrived.
- **Decoupling** — producer and consumer scale independently, so one service can't take down another.`,
   'When to use Kafka', 'when-to-use-kafka-in-your-interview'],

  ['What are the two reasons to use Kafka as a stream?',
`- **Continuous real-time processing** — an ad click aggregator totalling clicks as they arrive.
- **Multiple simultaneous consumers** — the same comments read by several independent consumer groups, as in live comments.`,
   'When to use Kafka', 'when-to-use-kafka-in-your-interview'],

  ['What can a single Kafka broker handle?',
`On good hardware, roughly **1TB of storage and up to 1M messages per second**.

It's a hand-wavy figure — it depends on message size and hardware — but if your design fits inside it, scaling isn't a conversation worth having.`,
   'Scalability', 'scalability'],

  ['How large should a Kafka message be, and what do you do with something bigger?',
`Keep messages **under 1MB**. There's no hard limit (it's set by \`message.max.bytes\`), but small messages mean less memory pressure and better network use.

Kafka is not a database. Store a video in **S3** and put only its **location** in the Kafka message — a pointer, not the payload.`,
   'Scalability', 'scalability'],

  ['What are the two ways to scale Kafka?',
`- **More brokers** — spreads load and adds fault tolerance, but only helps if your topics have **enough partitions** to use them; an under-partitioned topic can't exploit new brokers.
- **Partitioning strategy** — your choice of key, and the decision you actually make in an interview.`,
   'Scalability', 'scalability'],

  ['What are the four ways to handle a hot Kafka partition?',
`- **No key** — let the default partitioner spread messages; you lose ordering.
- **Random salting** — add a random number to the key; complicates aggregation later.
- **Compound key** — combine the ad ID with region or user segment.
- **Back pressure** — slow the producer when partition lag gets high.`,
   'Scalability', 'scalability'],

  ['What does the producer `acks` setting do, and what does `acks=all` guarantee?',
`It controls when a write counts as acknowledged.

**\`acks=all\`** means Kafka confirms the message only once **every in-sync replica (ISR)** has received it — the strongest durability guarantee available.`,
   'Fault Tolerance', 'fault-tolerance-and-durability'],

  ["What is a topic's replication factor, and what's the common value?",
`The number of copies kept of each partition.

**3 is common** — 1 leader plus 2 followers — so a broker can fail with the data still on two others, one of which is promoted to leader.`,
   'Fault Tolerance', 'fault-tolerance-and-durability'],

  ['What happens when a Kafka consumer goes down?',
`Two mechanisms cover it:

- **Offset management** — on restart it reads its last committed offset and resumes; nothing is missed, though some messages may be reprocessed.
- **Rebalancing** — Kafka redistributes that consumer's partitions among the others in the group.`,
   'Fault Tolerance', 'fault-tolerance-and-durability'],

  ['When should a Kafka consumer commit its offset, and why keep its work small?',
`**Only once the work is genuinely done** — in a web crawler, not until the raw HTML is safely in blob storage.

The more a consumer does before committing, the more has to be redone when it crashes. Splitting the work into small stages limits the loss.`,
   'Fault Tolerance', 'fault-tolerance-and-durability'],

  ['What does "Kafka is always available, sometimes consistent" mean for an interview?',
`That "what happens if Kafka goes down?" isn't a very realistic question — you can gently push back on it.

The failure actually worth designing for is a **consumer** going down, which Kafka handles through offset commits and rebalancing.`,
   'Fault Tolerance', 'fault-tolerance-and-durability'],

  ['How do you handle a failed write from a Kafka producer?',
`Producers support **automatic retries** — you configure how many and how long to wait between them.

Enable **idempotent producer mode** alongside, or retrying a message that actually did land the first time creates a duplicate.`,
   'Retries and Errors', 'handling-retries-and-errors'],

  ['Does Kafka support consumer retries, and what is the usual pattern?',
`**No — not out of the box** (AWS SQS does).

You build it yourself: move failed messages to a **separate retry topic** with its own consumer, so retries don't block the main flow. After too many attempts, move the message to a **dead letter queue (DLQ)** to investigate later.`,
   'Retries and Errors', 'handling-retries-and-errors'],

  ['What are the three ways to improve Kafka throughput?',
`- **Batching** — send several messages in one \`send()\` call; producers batch naturally to cut network overhead.
- **Compression** — GZIP, Snappy or LZ4 shrink messages so they travel faster.
- **Partition key choice** — much the biggest lever, because it's what maximizes parallelism.`,
   'Performance', 'performance-optimizations'],

  ['How long does Kafka keep messages by default, and how do you change it?',
`**7 days.** Two settings control it: \`retention.ms\` (by time) and \`retention.bytes\` (by size).

You can retain for far longer if a design calls for it — just account for the storage cost.`,
   'Retention Policies', 'retention-policies'],
];

const bad = CARDS.filter(([, a]) => a.length < 180 || a.length > 460);
if (bad.length) {
  for (const [n, a] of bad) console.log(`!! ${a.length} chars — ${n.slice(0, 62)}`);
  throw new Error(`${bad.length} card(s) outside the 180–460 char band`);
}
console.log(`${CARDS.length} cards, ${Math.min(...CARDS.map(c=>c[1].length))}–${Math.max(...CARDS.map(c=>c[1].length))} chars.`);
console.log(`${new Set(CARDS.map(c=>c[3])).size} distinct section anchors.`);

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const existing = new Set((await db.execute({
  sql: `SELECT name FROM problems WHERE domain = ?`, args: [DOMAIN],
})).rows.map(r => r.name));
const dupes = CARDS.filter(([n]) => existing.has(n));
if (dupes.length) console.log(`(${dupes.length} already present, will skip)`);

if (!APPLY) { console.log('\nDRY RUN — re-run with --apply to write.'); process.exit(0); }

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
for (const [name, answer, label, anchor] of CARDS) {
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
    args: [problem.id, `${BASE}#${anchor}`, `Kafka · ${label}`, createdAt],
  });
  inserted++;
}
console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}. Due ${dueDate}, zero attempts.`);
