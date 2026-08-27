// One-off: replace the 18 "Redis" cards with 23 plainer ones.
//
//   node scripts/reseed-sd-redis-plain.mjs --apply     (dry run without it)
//
// The originals were reviewed in full and marked "struggled" 18 times out of
// 18 — the worst rate of any topic in the deck — by someone who had read and
// understood the source article. Cause: unexplained jargon. The persistence
// card alone used "system of record", "commit-is-on-disk", RDB, AOF, fsync,
// "acknowledged writes" and MemoryDB in four sentences.
//
// This version: describe the thing in ordinary words FIRST and give its real
// name in parentheses afterwards, if at all. One fact per card. Pure internals
// that never drive a decision are dropped entirely (hash slot mechanics and
// MOVED, GEOSEARCH complexity, the sliding-window variant, pipelining).
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

const CARDS = [
  // ── The words, in ordinary language ───────────────────────────────────────
  ['What does it mean to call a database your "source of truth"?',
`It's the copy you believe when copies disagree — the one you'd rebuild everything else from.

If a write is lost *there*, the data is simply gone; nothing else has it. Postgres is normally your source of truth. Redis is deliberately not.`],

  ['Redis keeps its data in memory. So what happens when it restarts?',
`Memory is wiped, so Redis reloads from disk — and what's on disk is behind what was in memory.

Redis saves to disk **in the background**, not at the moment you write. That gap is why a crash or restart can lose your most recent writes.`],

  ['What are the two ways Redis saves to disk, and what does each lose in a crash?',
`- **Snapshot** — copies everything to disk every so often. A crash loses everything written since the last copy.
- **Change log** — records each change, but only actually forces it onto the disk **once per second**. A crash loses up to a second of writes.

(Their real names are RDB and AOF.)`],

  ['What does it mean that a Redis command is "atomic"?',
`It finishes completely before any other command begins. Redis runs commands **one at a time, on a single thread**, so nothing can interleave halfway through yours.

That's why a single Redis command never needs a lock around it.`],

  ['You need several Redis commands to run with nothing slipping in between. How?',
`Send them as one small **Lua script**. Redis runs the whole script as a single command on its one thread, so no other client can act in the middle.

Without it, another request can read a value you're about to change and act on the stale number.`],

  // ── Where Redis belongs ───────────────────────────────────────────────────
  ['Can Redis be your source of truth?',
`**No**, for two reasons that stack:

- It saves to disk in the background, so a crash loses recent writes
- It copies to its backup server *after* telling you the write succeeded — so if the main server dies, the backup may never have heard about your last writes

**AWS MemoryDB** is a Redis that gives up some speed for real durability.`],

  ['What belongs in Postgres, and what belongs in Redis?',
`- **Postgres** — data you cannot lose: users, orders, payments
- **Redis** — data you could rebuild if it vanished: cached pages, sessions, counters

The test: if this disappeared, is it gone forever, or just slow to recompute?`],

  ['When is Redis the wrong tool?',
`- When you can't afford to lose recent writes
- When the data is too big to hold in memory affordably — RAM is the most expensive place to keep things
- When you need real queries: Redis has no joins, and in a cluster one command can't touch keys living on different servers`],

  // ── Caching ───────────────────────────────────────────────────────────────
  ["You're using Redis as a cache. What must you configure, or it starts refusing writes?",
`An **eviction policy** — normally `+'`allkeys-lru`'+`, meaning "when memory is full, discard whatever hasn't been read in the longest."

Out of the box Redis discards nothing; it just rejects new writes once memory fills. Expiry times don't save you — those control staleness, not space.`],

  ['How long should you cache something for?',
`Take the number from the requirement. "Search results may be up to 30 seconds old" *is* your 30-second expiry.

If nothing is stated: **5–15 minutes** as a safety net, plus deliberately clearing the entry when the underlying data changes, for anything that matters like a price or a profile.`],

  ['One product goes viral and its key overwhelms a single Redis node. What are your options?',
`Three:

- **Cache it on the app servers**, so most reads never reach Redis at all
- **Keep copies under several keys** (`+'`product:123:1`'+` … `+'`:10`'+`) and have readers pick one at random, spreading the load across nodes
- **Add replica servers** — with caveats`],

  ['Will adding read replicas fix a hot key?',
`Only sometimes.

- Clients read from the **main server by default**. Replicas absorb nothing until you explicitly allow clients to read from them.
- If the hot key is being **written** constantly, replicas don't help at all — every write still goes to the single main server that owns it.`],

  // ── Locks ─────────────────────────────────────────────────────────────────
  ['You need to stop two servers doing the same job at once. Redis lock, or database lock?',
`**Prefer the database.** A row lock (`+'`SELECT … FOR UPDATE`'+`) or a conditional update is safer, because the lock and the data live in the same place.

A Redis lock can be handed to two people at once: if the main Redis server dies just after granting yours, its backup may never have heard about it.`],

  ['How do you take a lock in Redis?',
`One command: set a key **only if it doesn't already exist**, with an expiry.

`+'`SET lock:concert:343 my-random-token NX EX 30`'+`

`+'`NX`'+` means "only if absent" — winning that race *is* holding the lock. `+'`EX 30`'+` expires it in 30 seconds so a crashed holder can't keep it forever.`],

  ['Why must your Redis lock hold a random token rather than just "locked"?',
`So you only ever delete **your own** lock. Your 30 seconds can run out while you're still working, and someone else takes the lock — a blind delete would remove theirs.

So when releasing: check the token still matches, then delete. Both steps inside one Lua script.`],

  ['How much can you trust a Redis lock?',
`Treat it as a **speed optimization that occasionally fails**, not a guarantee — it can genuinely be granted to two holders at once.

If two holders would corrupt your data, don't rely on it. Enforce the rule where the data lives instead, e.g. `+'`UPDATE … WHERE version = 5`'+`.`],

  // ── Data structures for specific jobs ─────────────────────────────────────
  ['You need a live top-10 leaderboard under heavy write volume. What do you use?',
`A Redis **sorted set** — values held in order by a numeric score.

Re-adding a member with a new score just moves its position, so "post 123 now has 500 likes" is a single command. Periodically delete the low scorers to cap memory.`],

  ['How do you limit a user to N requests per minute using Redis?',
`One counter key per user per minute: increment it on each request, reject once it passes N.

The catch — set the expiry **only on the first request of the window** (when the counter comes back as 1). Setting it every time keeps pushing the reset forward, so a steady stream of traffic never gets a fresh window.`],

  ['Two Redis keys have to be updated together, but the cluster put them on different servers. Fix?',
`Wrap the shared part of the name in braces: `+'`{user:123}:posts`'+` and `+'`{user:123}:likes`'+`.

Redis only hashes what's inside the braces, so both keys land on the same server — and one transaction can then touch both.`],

  // ── Messaging ─────────────────────────────────────────────────────────────
  ['You need a work queue. Redis Streams or Kafka?',
`**Redis Streams** if Redis is already in your design and the queue is modest — background jobs, notifications, spreading work across workers.

**Kafka** when you need to keep messages for weeks, replay them for several independent consumers, or genuinely cannot afford to lose one.`],

  ['A worker dies holding a job from a Redis Stream. What happens, and what does it force on you?',
`Redis tracks how long each in-progress job has gone untouched. Once one has been idle long enough, another worker claims it and starts it over.

Redis can't tell "dead" from "slow", so a job can run twice. **Your handler has to be safe to run twice.**`],

  ['You need to push updates to whoever is connected right now. Pub/Sub or Streams?',
`**Pub/Sub** — it delivers to whoever is listening at that instant and keeps nothing. Anyone disconnected simply misses the message.

Use **Streams** instead if subscribers need to catch up on what they missed while away.`],

  ['Should you build your own Pub/Sub out of Redis keys instead of using the built-in one?',
`**No.** The worry behind the idea — "it'll need a connection per channel" — isn't true. A subscriber holds one connection per server, carrying all of its channels.

Rolling your own adds a network hop, needs a fresh connection to every subscriber, and leaves you tracking which subscribers have died.`],
];

const bad = CARDS.filter(([, a]) => a.length < 200 || a.length > 460);
if (bad.length) {
  for (const [n, a] of bad) console.log(`!! ${a.length} chars — ${n.slice(0, 62)}`);
  throw new Error(`${bad.length} card(s) outside the 200–460 char band`);
}

const db = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const old = (await db.execute({
  sql: `SELECT id, name FROM problems WHERE domain = ? AND sd_topic = ?`, args: [DOMAIN, TOPIC],
})).rows;
console.log(`Found ${old.length} existing ${TOPIC} card(s); inserting ${CARDS.length} replacements.`);

if (!APPLY) {
  CARDS.forEach(([n, a], i) => console.log(`  ${String(i + 1).padStart(2)}. (${a.length}) ${n.slice(0, 66)}`));
  console.log('\nDRY RUN — re-run with --apply to write.');
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
