// One-off seed: the "Scaling Reads" System Design cards (Patterns bucket), plus
// an amendment to the index-cost card whose default this article reverses.
//
//   node scripts/seed-sd-scaling-reads.mjs
//
// Source: hellointerview.com/learn/courses/system-design/lesson/scaling-reads
// Cross-referenced against the existing 178 System Design cards, so the
// article's already-covered ground (read/write ratios, the 3-step progression,
// index mechanics, normalization, cache-aside/write-through, stampede basics,
// hot keys, CDN latency, read replicas, functional/geographic sharding) is NOT
// duplicated here.
//
// Cards go in with ZERO attempts, interval_level 0, next_due_date TOMORROW —
// reviewQueue() admits on the due date alone, so they surface tomorrow without
// a synthetic "got it" attempt. See AGENTS.md.
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
const TOPIC = 'Scaling Reads';
const LINK_URL = 'https://www.hellointerview.com/learn/courses/system-design/lesson/scaling-reads/scaling-reads';
const LINK_LABEL = 'Scaling Reads · hellointerview';

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

// In article order: optimize in-DB → scale out → cache → CDN → deep dives.
const CARDS = [
  ['At what read volume do you stop tuning the database and add a cache or replicas?',
`Above roughly **50,000–100,000 read requests/sec**, assuming you already have proper indexing.

Rough, and it moves with read patterns, data model and hardware — but in an interview a rough number is what justifies the decision.`],

  ['What is a materialized view, and what does it buy you for read scaling?',
`A precomputed, stored result of an expensive aggregation, refreshed by a **background job** rather than recalculated per request.

Instead of averaging every review on each product page load, compute \`AVG(rating)\` once and read it. Strongest for analytics queries over large datasets.`],

  ['Why is sharding usually the wrong answer to a read-scaling problem?',
`Sharding is primarily a **write**-scaling technique. It does help reads — smaller datasets per query, load spread across servers — but it buys that with major operational complexity.

For read load, **caching and read replicas are both more effective and far easier** to implement.`],

  ['What is the tradeoff between synchronous and asynchronous replication?',
`**Synchronous** waits for replicas to confirm — consistent, but every write pays the latency. **Asynchronous** acknowledges immediately — fast, but replicas trail, so a user may not see their own write.

Either way replicas double as redundancy: promote one to primary when the primary fails.`],

  ['How much does vertical scaling actually buy you, and how should you raise it in an interview?',
`SSDs over spinning disks give **10–100× faster random I/O**; more RAM keeps more of the dataset out of disk reads; more cores serve more concurrent queries.

Worth one sentence — it is often the fastest breathing room — but it sidesteps the question, so don't dwell there.`],

  ['What should actually determine your cache TTL?',
`The **non-functional staleness requirement**. "Search results no more than 30 seconds stale" *is* your TTL.

In practice: short TTLs (**5–15 min**) as a safety net, plus active invalidation for anything critical like profiles or inventory. Low-stakes data like recommendation scores can ride on TTL alone.`],

  ['How does cache versioning work?',
`The record carries a **version column, incremented in the same DB transaction as the write**. Reads take two hops: fetch the current version from a small version key, then read \`event:123:v42\`.

A write commits \`v43\` and readers move there on their own. Old entries are never deleted — they just become unreachable.`],

  ['What problem does cache versioning solve that delete-on-write does not?',
`The **repopulation race**. After a delete, a reader that missed can fetch stale data — often from a lagging replica — and write it back into the live key, poisoning it for everyone.

With versioning a stale reader can only touch \`v42\`, never the current \`v43\`. No invalidation broadcast, no guessing which layer to purge.`],

  ['What are the tradeoffs of cache versioning?',
`- **Two cache lookups per request** — version, then data
- **Old versions accumulate**, since nothing is deleted; you still need TTLs to reclaim them
- **Only helps single-entity caches** (user profiles, product details) — no use for feeds or search results, where invalidation is inherently harder`],

  ['What is a deleted items cache, and when do you reach for one?',
`A **small, fast cache of recently deleted or hidden IDs**. Serve the cached feed as-is, then filter the results against that set.

It lets you keep serving mostly-correct cached feeds immediately while proper invalidation of the big structures happens in the background — ideal for moderation and privacy changes.`],

  ['What should you never put in a CDN cache, and why?',
`**User-specific data** — preferences, private messages, account settings. Only one user ever requests them, so the hit rate is zero and you gain nothing.

CDNs pay off on naturally shared content (public posts, catalogs, search results), where they can cut origin load by **90%+**.`],

  ['How much backend load does request coalescing actually save?',
`It bounds it at **exactly N, where N is your number of application servers** — one rebuild each — whether 1,000 or 10 million users want the key at once.

That hard bound is the reason to reach for coalescing before anything more exotic.`],

  ['What is cache key fanout, and what does it fix?',
`Store the same hot value under **N distinct keys** (\`feed:taylor-swift:1\` … \`:10\`) and have clients pick one at random.

500k req/sec against a single key becomes **50k across ten** — survivable. Cost: N× the memory, and invalidation now has to clear every copy.`],

  ['What is probabilistic early refresh, and why does it beat a distributed lock?',
`Each read carries a **rising chance of triggering a background refresh** as the entry ages — ~1% at minute 50, 5% at 55, 20% at 59 of a 60-minute TTL — so rebuilds spread across the last 10–15 minutes instead of landing at once.

A lock serializes rebuilds but leaves thousands of requests waiting on one slow rebuild.`],

  ['When should you NOT reach for read-scaling patterns?',
`- **Write-heavy systems** — Uber's location tracking is nearer 1:1 or 2:1; scale writes first
- **Explicitly small scale** — "design for 1000 users" needs one well-indexed database
- **Strongly consistent systems** — finance, inventory
- **Real-time collaborative apps** — caching actively *hurts* Google Docs, where every keystroke must be visible`],

  ['Read scaling and latency reduction are different problems — why does the distinction matter?',
`These patterns exist to reduce **database load**. If the database is handling the load fine and you simply want lower latency, that is a different problem with different tools — edge compute, service-mesh tuning.

Diagnose which one you actually have before proposing replicas or a cache.`],
];

// The index-cost card teaches the opposite default from this article, which says
// under-indexing kills more applications than over-indexing ever will. Keep the
// mechanism, flip the default.
const INDEX_CARD_ID = 391;
const INDEX_CARD_ANSWER = `- **Storage** — every index needs disk space, sometimes nearly as much as the data
- **Write performance** — an insert or update touches the table *and* every index on it

But **don't over-weight this: under-indexing kills far more applications than over-indexing ever has.** Modern engines handle well-designed indexes efficiently. Skip an index only on a write-heavy, rarely-read table (a log) or a table small enough to scan.`;

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

// ── 3. Amend the index-cost card ────────────────────────────────────────────
const idx = (await db.execute({ sql: 'SELECT name, notes_text FROM problems WHERE id = ?', args: [INDEX_CARD_ID] })).rows[0];
if (!idx) throw new Error(`card ${INDEX_CARD_ID} not found`);
if (!idx.name.includes('two main costs of adding an index')) {
  throw new Error(`card ${INDEX_CARD_ID} is not the index-cost card ("${idx.name}") — inspect before rerunning`);
}
if (idx.notes_text === INDEX_CARD_ANSWER) {
  console.log('\n  index-cost card already amended.');
} else {
  await db.execute({ sql: 'UPDATE problems SET notes_text = ? WHERE id = ?', args: [INDEX_CARD_ANSWER, INDEX_CARD_ID] });
  console.log(`\n  ~ Amended index-cost card ${INDEX_CARD_ID} (${INDEX_CARD_ANSWER.length} chars).`);
}

console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}, of ${CARDS.length}. Due ${dueDate}.`);
