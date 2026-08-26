// One-off: replace the 15 "PostgreSQL" cards with 26 plainer ones.
//
//   node scripts/reseed-sd-postgres-plain.mjs --apply     (dry run without it)
//
// Why: the first set was written too densely. Its questions were riddles
// ("what ACTUALLY bounds write throughput?"), it used WAL / MVCC / GIN / JSONB
// as though already known, and several cards carried four or five facts each.
// Reviewed in full on 2026-08-26: 15 of 15 marked "struggled".
//
// This version: a short glossary layer for the vocabulary FIRST, then concept
// cards that lean on it. Questions name the thing and ask one thing. Every
// abbreviation is expanded where it first appears. Multi-fact cards are split.
//
// Deletes the 15 old cards along with their links and attempts.
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
  // ── Glossary: the words, before anything reasons with them ────────────────
  ['What does WAL stand for in PostgreSQL, and what does it do?',
`**WAL = write-ahead log.**

Before Postgres changes the real data files, it appends a short note about the change to a log file on disk.

Appending to the end of a log is fast — the disk head stays in one place. Updating data files means writing all over the disk, which is slow. If the server crashes, Postgres replays the log to rebuild what was lost.`],

  ['What does MVCC mean in PostgreSQL?',
`**MVCC = multi-version concurrency control.**

Rather than locking a row while someone reads it, Postgres keeps several versions of that row. Each transaction sees the version that existed when it started.

The practical result: **readers never block writers, and writers never block readers.**`],

  ['What is a JSONB column in Postgres?',
`A column that holds a whole **JSON object** instead of one value — so one row can carry different fields than the next.

The "B" is for binary: Postgres parses the JSON once when you write it and stores it in a form it can search quickly, instead of re-reading text on every query.`],

  ['What is a GIN index, in plain terms?',
`**GIN = generalized inverted index.** It works like the index at the back of a book: a list of individual items, each pointing to every row that contains it.

That shape is what makes it right when **one row holds many values** — the words in a document, or the keys inside a JSON object.`],

  ['What are the three read anomalies that isolation levels are about?',
`All three are a transaction seeing something shift underneath it:

- **Dirty read** — you see another transaction's change before it commits, so it might still be undone
- **Non-repeatable read** — you run the same query twice and a row's value has changed
- **Phantom read** — you run the same query twice and **new rows** have appeared`],

  ['What does SELECT … FOR UPDATE do?',
`It reads rows **and locks them** until your transaction finishes.

Anyone else trying to read those same rows with \`FOR UPDATE\` has to wait for you. It's how you say "nobody else touch this row while I decide what to do with it."`],

  // ── Performance ───────────────────────────────────────────────────────────
  ['In PostgreSQL, which single step decides how fast writes can be?',
`**Writing the log to disk when you COMMIT.**

It's the only step that has to finish before Postgres can tell your app "saved", so your write speed is really your disk's speed at that one append.

Everything else waits: the real data files get updated later, in background batches.`],

  ['Roughly how many simple inserts can one CPU core of Postgres do per second?',
`**About 5,000 per second, per core.**

- If the insert also has to update indexes: **1,000–2,000**
- A big transaction touching several tables: only **hundreds**

Note it's per *core* — an 8-core machine scales up from there.`],

  ['Roughly how many reads can one Postgres core do per second, and why more than writes?',
`**50,000+ simple indexed lookups per second, per core** — around 10× the write number.

Reads are faster because they skip both of the expensive write steps: nothing to append to the log, and no indexes to update.`],

  ['How many rows before a single Postgres table gets uncomfortable?',
`**Around 100 million rows** for the table itself. Joins between large tables get awkward sooner — about **10 million rows** each.

Neither is a hard wall. They're the point where you start talking about splitting the table up.`],

  ['Why does Postgres slow down sharply once your data outgrows RAM?',
`Because it has to start reading from disk. Rows it can keep in memory come back in **1–5 ms**; rows it must fetch from disk take **5–30 ms**.

The data you touch often is your **working set**. Keep that in RAM and the database feels fast.`],

  ['Why does Postgres need a connection pooler like PgBouncer in front of it?',
`Because Postgres starts a **separate operating-system process for every connection**. A few hundred connections means a few hundred processes competing for memory and CPU.

A pooler sits in front and lets many application connections share a small number of real database connections.`],

  // ── Indexing and layout ───────────────────────────────────────────────────
  ['In Postgres, how do you store fields that differ from row to row without a column for each?',
`Put them in one **JSONB** column — a post's \`metadata\`, holding whatever that post happens to have: location, hashtags, mentions.

Add a **GIN index** on that column and you can still search inside it quickly. This is what often removes the need to run MongoDB alongside Postgres.`],

  ['What is a partial index, and when would you want one?',
`An index that covers only **some** of the rows — you attach a \`WHERE\` clause when creating it.

Example: index the email column **only for active users**. If nearly every query filters to active users anyway, that index is smaller, faster, and cheaper to maintain than one that also covers deleted accounts.`],

  ['What is table partitioning in Postgres?',
`Splitting one big logical table into several smaller physical ones by some rule — most often one partition per month, based on a date column.

Your queries still use the single table name; Postgres works out which piece to touch.`],

  ['Why does partitioning a table by month speed up writes, not just reads?',
`Two reasons:

- Writes for different months land in **different physical tables**, so they stop competing with each other
- An insert only updates **that month's** index, instead of one enormous index covering all history

Reads gain too: "show recent posts" only scans the newest partition.`],

  ['If you outgrow one Postgres server, what does Postgres not give you that DynamoDB does?',
`**Automatic sharding.** Spreading data across several servers is something you build yourself: deciding which server holds which rows, and handling any query that needs more than one of them.

**Citus** is an add-on that does it for you.`],

  // ── Concurrency ───────────────────────────────────────────────────────────
  ["Postgres defaults to Read Committed isolation — what can still go wrong under it?",
`Two transactions can **read the same value before either one writes**.

The classic case is an auction. Both bidders read "top bid = $90", both conclude their bid wins, and both write. Wrapping each in a transaction doesn't help — a transaction only guarantees *your own* steps happen together.`],

  ['In an interview, what should you say instead of just "we\'ll use a transaction"?',
`Say how you'll stop two people colliding. For the auction: **"a transaction, plus a row-level lock on the auction row"** — that is, \`SELECT … FOR UPDATE\`.

"We'll use transactions" on its own doesn't answer the question, because the default isolation level still lets two bidders read the same number.`],

  ['What are PostgreSQL\'s isolation levels, weakest to strongest?',
`Three:

- **Read Committed** (the default) — you only ever see committed data
- **Repeatable Read** — you see a frozen snapshot from when your transaction began
- **Serializable** — transactions behave as if they ran one at a time

SQL defines a fourth, Read Uncommitted, but Postgres treats it as Read Committed.`],

  ['Why does Postgres have no real Read Uncommitted level?',
`Because **MVCC** makes it meaningless. Every transaction reads a snapshot of *committed* data, so there is no mechanism by which Postgres could show you someone's uncommitted change.

It accepts the setting for compatibility and quietly treats it as Read Committed.`],

  ["How is Postgres's Repeatable Read stronger than the SQL standard asks for?",
`It also blocks **phantom reads** — new rows turning up in a repeated query — which the standard permits at this level.

So your query results stay completely stable, and you may not need Serializable in situations where another database would force you to it.`],

  ['Serializable isolation or a row-level lock — how do you pick?',
`- **Row lock** when you know exactly which row is contested (an auction row, an inventory count). Cheaper, and it leaves other rows alone. You handle deadlocks.
- **Serializable** when the transaction is too tangled to know what to lock. Easier to write, but Postgres aborts conflicting transactions, so you need retry logic.`],

  ['How do you do optimistic locking in Postgres?',
`Add a **version number column**. Read the row and its version, do your work, then include that version when you update:

\`UPDATE … SET version = 6 WHERE id = 123 AND version = 5\`

If that updates **0 rows**, somebody changed it first — start over. Best when collisions are rare.`],

  // ── Boundaries ────────────────────────────────────────────────────────────
  ['The word "consistency" means two different things — what are they?',
`- **In ACID:** the database never ends up in an invalid state. Your rules hold — foreign keys, unique constraints, "balance can't go negative".
- **In CAP:** every read returns the newest write, even if that means refusing to answer.

Unrelated guarantees, same word. Interviewers notice when the two get mixed up.`],

  ['What are the three good reasons to pick something other than Postgres?',
`- **Millions of writes per second** — each write needs a log entry and index updates → Cassandra
- **Two regions both accepting writes** — Postgres has a single primary → CockroachDB, DynamoDB
- **Pure key-value lookups** — you're paying for a query planner you never use → Redis, DynamoDB

"It won't scale" on its own is not one of them.`],
];

// Length guard: the house band is 250–450 characters.
const bad = CARDS.filter(([, a]) => a.length < 200 || a.length > 460);
if (bad.length) {
  for (const [n, a] of bad) console.log(`!! ${a.length} chars — ${n.slice(0, 60)}`);
  throw new Error(`${bad.length} card(s) outside the 200–460 char band`);
}

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const old = (await db.execute({
  sql: `SELECT id, name FROM problems WHERE domain = ? AND sd_topic = ?`, args: [DOMAIN, TOPIC],
})).rows;
console.log(`Found ${old.length} existing ${TOPIC} card(s); inserting ${CARDS.length} replacements.`);

if (!APPLY) {
  console.log('\nDRY RUN. Would delete:');
  for (const o of old) console.log(`  - [${o.id}] ${String(o.name).slice(0, 66)}`);
  console.log('\nWould add:');
  CARDS.forEach(([n, a], i) => console.log(`  ${String(i + 1).padStart(2)}. (${a.length}) ${n.slice(0, 62)}`));
  console.log('\nRe-run with --apply to write.');
  process.exit(0);
}

for (const o of old) {
  await db.execute({ sql: 'DELETE FROM attempts WHERE problem_id = ?', args: [o.id] });
  await db.execute({ sql: 'DELETE FROM links WHERE problem_id = ?', args: [o.id] });
  await db.execute({ sql: 'DELETE FROM problems WHERE id = ?', args: [o.id] });
}
console.log(`Deleted ${old.length} old card(s) with their links and attempts.`);

const dueDate = easternTomorrow();
let inserted = 0;
for (const [name, answer] of CARDS) {
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
console.log(`Inserted ${inserted} card(s), due ${dueDate}, zero attempts.`);
