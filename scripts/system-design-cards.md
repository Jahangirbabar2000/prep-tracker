# System Design — Hello Interview Deck

Source of truth for the **System Design** domain. Add a question, then run:

```
node scripts/seed-system-design.mjs
```

Re-running is safe: the domain and its fields are reused, cards already in the
DB are matched on the exact question text, and an answer edited here is pushed
to the existing card. This file is the source of truth for answers — edit here,
not in the app, or the next run will overwrite it.

Format:

- `## <Topic>` — becomes the card's `sd_topic`. One section per source article.
  **Section order is the dropdown order:** the seed rewrites each option's
  `sort_order` to match this file, and the app renders the Topic and Bucket
  filters by `sort_order`. That is why the sections follow the course rather
  than the order cards happened to be added. Reordering in Settings instead
  will be overwritten by the next run.
- `Bucket: <name>` — the `sd_category` every card in that section belongs to.
  Buckets are many-to-one over topics (Core Concepts holds nine), which is why
  this is a line inside the section rather than a second heading level.
- `Link: <url>` — the article every card in that section came from. Attached to
  each card as a `links` row, labelled with the card's own question text.
- `Anchor: <slug>` — optional, one line between a card's `**Q:**` and `**A:**`.
  Deep-links that card into the section's article, so the link lands on the
  paragraph the card came from instead of the top of a long page. The slugs are
  the article's own "On This Page" entries. Adding or changing one moves the
  card's existing link rather than adding a second.
- `**Q:** …` / `**A:** …` — one card. Answers may span multiple lines and may
  contain `---` horizontal rules: unlike the behavioral deck, `---` is answer
  content here, not a card separator.

**Complete.** This file holds the whole deck, one section per article, so the
orphan check covers every card. The cards predate this file and were recovered
verbatim from the DB, which is why re-running the seed reports them unchanged
rather than inserting duplicates.

## Card style — match the existing system design cards

One card, one fact. Answer first, then the supporting detail. Target 250–450
characters; the seed warns past 550. Bold the term being defined, keep lists
short, and never restate the question in the answer.

## Core Concepts
Bucket: In a Hurry
Link: https://www.hellointerview.com/learn/system-design/in-a-hurry/core-concepts

**Q:** Networking Essentials: When do you need WebSockets over Server-Sent Events?
Anchor: networking-essentials
**A:** WebSockets are necessary when you need true bidirectional communication where both client and server send messages frequently (chat, live collaboration). SSE is unidirectional—the server pushes data after an initial HTTP request from the client, but the client can't send data back over the same connection. SSE is simpler to implement and works better with standard HTTP infrastructure. Use SSE for notifications, live scores, or one-way feeds. Use WebSockets only when clients need to push data back frequently. A common mistake is choosing WebSockets for "real-time" problems where SSE or HTTP long polling would work fine, because WebSockets add significant complexity for maintaining stateful connections at scale.

**Q:** API Design: How much time should you spend on API design in a system design interview?
Anchor: api-design
**A:** Spend 2-3 minutes sketching 4-5 key endpoints and move on. REST is your default for 90% of interviews—map resources to URLs, use HTTP methods (GET /users/{id}, POST /events/{id}/bookings). Most interviewers don't care about perfect API design; they want to see you can create reasonable endpoints quickly and then focus on the harder architectural problems. If you're still designing API details 10 minutes in, you're going too deep. Sloppy design signals inexperience, but perfectionism wastes time that should go toward database decisions, caching strategies, and scalability.

**Q:** Data Modeling: When should you denormalize a relational schema?
Anchor: data-modeling
**A:** Start with normalization—split data across tables to avoid duplication and maintain consistency. **Denormalize only when you've identified read performance bottlenecks in a read-heavy system where data rarely changes**. Denormalization duplicates data to eliminate joins (store username directly in order records instead of joining to users table), making reads faster but updates expensive—you now have to update multiple tables. A safe pattern is normalized schema first, then denormalize specific hot paths when you have real evidence that joins are the problem. Denormalization is a performance optimization, not a default strategy.

**Q:** Database Indexing: How do you choose what to index?
Anchor: database-indexing
**A:** Index the columns you query frequently. If you look up users by email for authentication, index email. If you fetch a user's orders, index user_id on the orders table. For composite queries like "find events in San Francisco on December 25th," use a compound index on both city and date. B-tree indexes (the default) support both exact lookups and range queries. For specialized needs your primary database can't handle—like full-text search or geospatial queries—use external systems (Elasticsearch, PostGIS). These external indexes sync from your primary database and will lag slightly, but the performance tradeoff is worth it.

**Q:** Caching: What is a cache stampede and how do you prevent it?
Anchor: caching
**A:** A cache stampede happens when a popular cache entry expires and many concurrent requests all miss simultaneously, creating a thundering herd that hammers your database trying to regenerate the same entry. This spike can take down your system. Prevent it with three strategies: locking (only one request regenerates the entry while others wait), early recomputation (refresh entries before they expire), or staggering TTLs so entries don't all expire at once. The broader principle is don't cache everything—cache only data that's read frequently and doesn't change often. If you're caching data that changes on every request, you're just adding latency.

**Q:** Sharding: When should you shard your database?
Anchor: sharding
**A:** Shard when you've justified the need with capacity math. A well-tuned single database with read replicas handles way more traffic than most candidates think—tens of thousands of queries per second, terabytes of storage. Bring up sharding when you hit real limits: storage (approaching TB limits), write throughput (over 10K transactions per second you can't handle), or read load that replicas can't absorb. If you're at 10K writes/sec and 100GB of data, you don't need sharding yet. The biggest mistake is proposing sharding too early as a default scaling strategy. Sharding creates major problems: cross-shard transactions become nearly impossible, hot spots emerge when one shard gets disproportionate traffic, and resharding is painful.

**Q:** Consistent Hashing: Why does consistent hashing matter for distributed systems?
Anchor: consistent-hashing
**A:** Consistent hashing solves a specific problem with simple hash-based distribution. When you use hash(key) % N to pick which server stores data, adding or removing a server changes N and forces you to move most of your data. With consistent hashing, servers and keys sit on a virtual ring; when you add a new server, only about 10% of keys (those in the affected range) need to move instead of 90%. This makes it practical to add and remove cache nodes or database shards dynamically without massive data migration. You rarely need to explain how it works in interviews—just mention it when discussing elastic scaling or distributed caches: "we'll use consistent hashing to distribute data across cache nodes."

**Q:** CAP Theorem: When should you choose consistency over availability?
Anchor: cap-theorem
**A:** Network partitions are unavoidable in distributed systems, so you're really choosing between consistency (all nodes see the same data) and availability (every request gets a response). For most systems, availability is the right default—users tolerate slightly stale data (Instagram feed being 2 seconds old) but can't tolerate the app being down. Strong consistency matters only when stale data causes real business problems: inventory systems need accurate stock counts or you'll oversell, banking systems need correct balances or you enable fraud, booking systems must prevent double-booking. You don't pick one model for your entire system—product reviews can be eventually consistent while inventory counts need strong consistency.

**Q:** Capacity Math: How do you use numbers to justify architectural decisions?
Anchor: numbers-to-know
**A:** Modern hardware is far more powerful than candidates realize. A well-tuned database handles tens of thousands of queries per second. A single Redis instance handles hundreds of thousands of operations per second. Do math when you need to make a decision: "We're expecting 50K requests per second, each server handles 5K, so we need 10 servers plus headroom." Walk through it to show thinking, not memorized facts. Storage capacity matters for sharding—a single Postgres instance handles a few terabytes comfortably; you don't need sharding until tens or hundreds of terabytes. Latency numbers drive almost every design decision: memory access is nanoseconds, SSD reads are microseconds, datacenter calls are 1-10ms, cross-continent is tens to hundreds of milliseconds.

**Q:** Consistency Models: How does the CAP tradeoff differ between product reviews and order processing?
Anchor: cap-theorem
**A:** Product reviews can be eventually consistent—users accept a 5-second delay before a new review appears. Order processing needs strong consistency—reading stale inventory counts could cause overselling, losing money. The same system can have different consistency requirements for different parts. E-commerce needs eventual consistency for product descriptions and reviews, but strong consistency for inventory counts and order processing. The PACELC theorem captures the broader picture: during a network partition, you choose availability or consistency; when the network is healthy, you still choose between latency and consistency. Strong consistency adds latency because nodes need to coordinate before responding.

## Key Technologies
Bucket: In a Hurry
Link: https://www.hellointerview.com/learn/system-design/in-a-hurry/key-technologies

**Q:** Core Database Choice: When should you pick a relational database vs NoSQL in an interview?
Anchor: core-database
**A:** - Product design interviews → relational (Postgres/MySQL)
- Infrastructure design interviews → NoSQL (DynamoDB/Cassandra)
- Avoid explicit comparisons. They signal inexperience.

The overlap is real. Both can handle relationships. Both scale horizontally with proper architecture. Don't claim "I need relational because I have relationships" or "I need NoSQL for scale"—these are yellow flags. Instead, talk about the specific database you chose and how it solves your problem. A strong answer is "I'm using Postgres because its ACID properties maintain data integrity" rather than making broad category claims about relational databases being better for structured data. Specificity signals you understand the actual features.

**Q:** Relational Databases: What features make Postgres/MySQL critical for system design?
Anchor: relational-databases
**A:** **SQL Joins**

- Combine data from multiple tables efficiently
- Can be performance bottlenecks, so minimize them where possible

**Indexes**

- Make queries on frequently accessed columns fast
- B-tree supports both exact lookups and range queries
- Hash indexes are faster for exact matches only
- Multi-column and specialized indexes (geospatial, full-text) available

**ACID Transactions**

- Group multiple operations into atomic units
- Both succeed or both fail—prevents invalid data like orphaned posts
- If you create a user and post in a transaction, consistency is guaranteed

These three features give relational databases the flexibility to solve complex data problems while maintaining consistency. They're why relational databases remain the default for most interview problems despite the rise of NoSQL.

**Q:** NoSQL Databases: What are the actual strengths of DynamoDB/Cassandra that matter in design?
Anchor: nosql-databases
**A:** **When NoSQL excels:**

- Flexible, evolving data models (schema-less storage)
- Need horizontal scaling across many servers
- Processing large volumes of real-time, unstructured data

Don't overstate the difference. Relational databases can do all of these with proper architecture. The real tradeoff is that NoSQL trades some consistency guarantees and query flexibility for easier horizontal scalability. DynamoDB uses consistent hashing and sharding to distribute data, but you must design your partition key around your access patterns upfront—if your most common query is "get all posts for user X," use user_id as the partition key for fast lookups. Cassandra's append-only storage model makes it strong for write-heavy workloads, but comes with functionality tradeoffs you need to understand.

When discussing NoSQL in interviews, focus on specific features of the database you chose and how they solve your problem, not broad "NoSQL scales better" claims. That's the signal of depth.

**Q:** Blob Storage: How do you structure a system that stores large files?
Anchor: blob-storage
**A:** Never use S3 as your primary database. The correct architecture separates concerns:

- **Core database** (Postgres/DynamoDB) stores metadata and pointers (just URLs)
- **Blob storage** (S3/GCS) stores the actual files
- **CDN** caches and serves files from edge locations

**Upload flow:**

1. Client requests presigned URL from your server
2. Server records it in database
3. Client uploads directly to S3 with that presigned URL
4. S3 notifies server when upload completes and status updates

**Download flow:**

1. Client requests file from server
2. Server returns presigned URL
3. Client downloads via CDN, which proxies to underlying blob storage

This separation gives you fast metadata queries with database indexes and cheap, infinitely scalable file storage. For large files, use chunking/multipart uploads so you can resume on failure and parallelize the upload process.

**Q:** Blob Storage Scaling: Why is blob storage considered infinitely scalable in interviews?
Anchor: blob-storage
**A:** Blob services like S3 use replication and erasure coding for durability, handle unlimited data and requests within account limits, and cost pennies per GB per month—$0.023/GB for S3 versus $1.25/GB for DynamoDB. Because of this economic and architectural reality, you treat blob storage scaling as a given in interviews. Don't worry about it.

Your actual design burden shifts to questions that matter: Can the metadata database handle the query load? Can the CDN cache and serve files fast enough? Does chunking and resumable upload work correctly? The pattern succeeds because concerns are cleanly separated—infinitely scalable blob storage + well-designed metadata layer. This is why storing videos in S3 and metadata in Postgres works for YouTube-scale systems without special blob storage logic.

**Q:** Search Optimization: Why can't you use a traditional database for full-text search?
Anchor: search-optimized-database
**A:** A query like `SELECT * FROM documents WHERE document_text LIKE '%search_term%'` requires a full table scan—the database checks every single record. This doesn't scale. With millions of documents, you're checking millions of records on every search.

Search-optimized databases like Elasticsearch use inverted indexes, a data structure that maps words to the documents containing them. Instead of scanning all documents, you look up the word and instantly get matching documents. This is 1000x faster. Elasticsearch also handles tokenization (breaking text into individual words), stemming (matching "running" and "runs" both to "run"), and fuzzy search (tolerating misspellings via edit distance calculations).

Use search-optimized databases for tweet search, event search, document search—anything requiring full-text queries. If you want to reduce your technology footprint, Postgres GIN indexes support full-text search, though they're less powerful than Elasticsearch. The tradeoff is acceptable for smaller systems where Elasticsearch would be overkill.

**Q:** Search Database Architecture: How does a search index stay synchronized with your primary database?
Anchor: search-optimized-database
**A:** Search indexes like Elasticsearch typically sync from your primary database via change data capture (CDC)—the search system pulls updates from your main database and rebuilds indexes continuously. This means the search index lags slightly behind the primary database. For search use cases, this staleness is acceptable and even expected—users don't expect perfect real-time consistency in search results.

The architecture becomes: Postgres or DynamoDB as source of truth, Elasticsearch as a read-only search layer that trails slightly behind. When a document is updated in Postgres, it takes seconds (or milliseconds in fast CDC systems) to appear in search results. This tradeoff is worth it because it lets you search in ways your main database can't handle efficiently. The separation of concerns—transactional consistency in your primary database, eventual consistency in search—allows both systems to optimize for their specific use case.

**Q:** Database Selection Anti-Pattern: What statements reveal inexperience about database choice?
Anchor: core-database
**A:** Red flags that reveal inexperience:

- "I need relational because my data has relationships" (NoSQL handles relationships fine)
- "I need NoSQL for scale and performance" (relational databases scale well with proper architecture)
- Inserting a random SQL vs NoSQL comparison into your answer

These broad category statements signal you don't understand the specific features of the databases you're choosing. They're the interview equivalent of template answers.

Instead, give feature-focused answers: "I'm using Postgres because transactions will keep my order data consistent when processing payments and inventory simultaneously" or "I'm using DynamoDB because it scales horizontally for our write-heavy timeline and I've designed my partition key around our access patterns—user_id for fast per-user queries, with a tradeoff that global trending queries require scanning all shards." Specificity signals depth and shows you've thought through real tradeoffs, not just picked a database category.

**Q:** API Gateway: When and how should you include an API gateway in your system design?
Anchor: api-gateway
**A:** An API gateway sits in front of your system as the first point of contact for clients. It routes incoming requests to the appropriate backend service—GET /users/123 goes to the users service, POST /events/{id}/bookings goes to the bookings service. Beyond routing, it handles cross-cutting concerns: authentication (verifying user identity), rate limiting (preventing abuse), and logging (tracking requests).

Include an API gateway in nearly all product design interviews. It's a best practice that shows architectural maturity. Common implementations are AWS API Gateway, Kong, and Apigee, though NGINX or Apache webservers work fine too. Interviewers rarely dig deep into API gateway specifics—they usually want to discuss problems more specific to your design. Mention it as an abstraction layer and move on unless asked for details.

**Q:** Load Balancer: What's the difference between L4 and L7 load balancers and when does it matter?
Anchor: load-balancer
**A:** A load balancer distributes traffic across multiple machines to avoid overloading any single server. When you have horizontal scaling (multiple servers handling the same request), you need a load balancer.

**L4 (Layer 4) vs L7 (Layer 7):**

- **L4:** Works at TCP level. Dumb but fast. Just distributes connections without reading HTTP content. Necessary for persistent connections like WebSockets because you need to maintain the stateful connection to a single server.
- **L7:** Works at application level. Can read HTTP request content and route based on it. Sends API calls to one service, web page requests to another. More flexible, less connection load downstream.

**Simple decision rule:** If you have persistent connections (WebSockets), use L4. Otherwise, L7 offers great flexibility with minimal downside. You don't need to draw a load balancer in front of every service in your design—either omit it and mention services are horizontally scaled, or add one at the front as an abstraction. Common implementations: AWS Elastic Load Balancer, NGINX, HAProxy.

**Q:** Queue: How do queues smooth out traffic spikes and when should you avoid them?
Anchor: queue
**A:** A queue acts as a buffer between producers and consumers. A compute resource sends messages to a queue and forgets about them. Workers on the other end process messages at their own pace. The queue's function is to smooth load spikes—if you get 1,000 requests but can only handle 200/second, 800 requests wait in the queue instead of being dropped.

Queues decouple producers and consumers, letting you scale them independently. Bring down a service behind a queue with minimal impact.

**A queue in a synchronous flow is fine — until there's a backlog.** Modern brokers run 1–5ms end-to-end, so a < 500ms budget has room. What breaks the budget is consumer lag, not the hop, so only put a queue in the request path if you can keep the queue drained.

**Common use cases:**

- **Bursty traffic:** Uber buffering ride requests during surge pricing or special events
- **Distribute work:** Photo processing service distributing image tasks across worker nodes

**Key concepts:**

- **FIFO ordering:** Most queues process messages in order received (Kafka allows priority/time-based ordering)
- **Retry mechanisms:** Automatic redelivery with configurable delays and max attempts
- **Dead letter queues:** Store failed messages for debugging
- **Partitioning:** Scale queues by partitioning across servers; specify partition key to keep related messages together
- **Backpressure:** The critical problem. If you receive 300 requests/second but handle 200, you'll never finish. A queue obscures the real problem—lack of capacity. Solution: reject new messages or slow down acceptance when queue is full.

**Common technologies:** Kafka (distributed streaming platform) and SQS (fully managed AWS queue).

**Q:** Streams / Event Sourcing: When do you use streams instead of queues?
Anchor: streams-event-sourcing
**A:** Streams retain data for a configurable time period, allowing consumers to read and re-read from the same position or from the past. Queues typically delete messages after processing. Use streams when you need:

**Real-time processing of vast data:** A social media analytics system ingests millions of engagement events (likes, comments, shares) in real-time. A stream processing system (Flink, Spark Streaming) processes these events to update dashboards as they happen.

**Event sourcing:** Every state change is stored as an event that can be replayed. Banking system: each transaction (deposit, withdrawal, transfer) is an event. You can replay all events to reconstruct any account's state at any point in time, enabling audits, rollbacks, and forensics.

**Multiple independent consumers:** A real-time chat application publishes user messages to a stream. All chat participants subscribe and receive messages simultaneously. This publish-subscribe pattern allows different consumers to process the same data independently.

**Key concepts:**

- **Partitioning:** Scale streams across servers; each partition has different consumers. Specify partition key so related events stay together.
- **Multiple consumer groups:** Different consumers read from the same stream independently. One group updates a dashboard, another stores events in a database for historical analysis.
- **Replication:** Data replicates across servers for fault tolerance.
- **Windowing:** Group events by time or count. Calculate hourly delivery time aggregates or daily metrics.

**Common technologies:** Kafka, Flink, Kinesis.

**Q:** Distributed Lock: What problem do distributed locks solve and when do you need them?
Anchor: distributed-lock
**A:** Distributed locks lock a resource across different systems for a reasonable period (unlike database transaction locks, which are short-term). They're implemented using distributed key-value stores like Redis or ZooKeeper.

Basic idea: Set a key (ticket-123) to "locked" atomically. If another process tries to set the same key, it fails. First process finishes and sets it to "unlocked." Locks expire after a time period to handle process crashes.

**Use cases:**

- **E-commerce checkout:** Lock limited-edition sneakers in a user's cart for 10 minutes during checkout so they can't be sold to someone else
- **Ride-sharing matchmaking:** Lock a nearby driver when matched with a rider, preventing multiple simultaneous matches
- **Distributed cron jobs:** Ensure a daily aggregation job runs on only one server, not all of them
- **Online auction bidding:** Lock an item during final seconds of bidding to process bids atomically

**Important details:**

- **Lock expiry:** Prevents locks from getting stuck if a process crashes
- **Locking granularity:** Lock single resources (one ticket) or groups (all tickets in a stadium section)
- **Deadlocks:** Can occur when processes wait for each other. Process A locks resource 1, tries to lock 2. Process B locks 2, tries to lock 1. Both wait forever. Prevent by organizing lock acquisition order consistently across your codebase.

**Q:** Distributed Cache: What data should you store in a cache and how do you keep it fresh?
Anchor: distributed-cache
**A:** A distributed cache (Redis, Memcached cluster) stores expensive or frequently accessed data in memory for fast retrieval.

**When to use:**

- **Save aggregated metrics:** Compute metrics hourly and cache results instead of recomputing on every request
- **Reduce DB queries:** Store user sessions in cache to avoid hitting the database on every request
- **Speed expensive queries:** Complex social media queries (posts from followed accounts) take too long in Postgres. Run once, cache results, serve from cache.

**Critical design details:**

**Eviction policies** determine what gets removed when cache is full:

- LRU (Least Recently Used): Evict least accessed items
- FIFO: Evict oldest items
- LFU (Least Frequently Used): Evict least frequently accessed

**Cache invalidation strategy:** Keep cached data fresh. If you cache popular events and an event's venue changes in the database, invalidate that cache entry so the next read gets fresh data.

**Cache write strategies:**

- **Write-through:** Write to cache and datastore simultaneously. Slower but consistent.
- **Write-around:** Write directly to datastore, bypass cache. Faster writes, slower reads when cache misses.
- **Write-back:** Write to cache first, asynchronously write to datastore. Fastest but risks data loss if cache fails.

**Be explicit about what you're caching.** Don't just say "I'll cache the events." Specify: "I'll use a sorted set in Redis to cache the top 1000 events by engagement, sorted by score descending, so I can retrieve popular events in O(log N)." This shows depth and prevents follow-up questions.

**Common technologies:** Redis (supports strings, hashes, lists, sets, sorted sets, bitmaps, hyperloglogs) and Memcached (simple key-value for strings and binary objects).

**Q:** CDN: Why use a CDN for static assets and what else can it cache?
Anchor: cdn
**A:** A CDN distributes servers geographically and caches content close to users. When a user requests content, the CDN routes to the nearest server. If cached, return it instantly. If not, fetch from origin, cache it, return it.

**Most common use:** Cache static media assets. Instagram caches user profile pictures on a CDN so users worldwide get fast downloads.

**Less obvious uses:**

- **Cache dynamic content:** Blog posts updated once daily can be cached by CDN. Cache doesn't mean immutable.
- **Cache API responses:** Frequently accessed APIs can have responses cached. Reduces origin server load and improves performance.

**Key details:**

- **Eviction and TTL:** Set time-to-live for cached content or invalidate when content changes
- **Geographic distribution:** Global edge locations mean low-latency delivery everywhere

**Popular CDNs:** Cloudflare, Akamai, Amazon CloudFront. They also offer DDoS protection and web application firewalls as add-ons.

## Common Patterns
Bucket: In a Hurry
Link: https://www.hellointerview.com/learn/system-design/in-a-hurry/patterns

**Q:** Realtime Updates: When should you use HTTP polling vs SSE vs WebSockets?
Anchor: pushing-realtime-updates
**A:** Start with HTTP polling—the simplest option. Clients periodically request updates from the server. It's inefficient (wasted requests when nothing changed) but requires no special infrastructure.

Upgrade to Server-Sent Events (SSE) when polling becomes wasteful. SSE is unidirectional: client makes an initial HTTP request, server pushes data down that connection. Works great for notifications, live scores, dashboards. Simpler infrastructure than WebSockets, works with standard HTTP load balancers.

Use WebSockets only when you need true bidirectional communication where clients push data frequently (chat, live collaboration). WebSockets add significant complexity—stateful connections don't work behind standard load balancers, connection persistence is tricky at scale, and server failures require reconnection logic.

For the server side, you have options. Pub/Sub services decouple publishers and subscribers—one service publishes events, many services subscribe and push to their connected clients. For heavier processing (like Google Docs real-time collaboration), use stateful servers in a consistent hash ring so a user's edits always route to the same server maintaining their document state.

**Q:** Long-Running Tasks: When should you queue a task instead of processing it synchronously?
Anchor: managing-long-running-tasks
**A:** Split long operations (video encoding, report generation, bulk operations taking > few seconds) into two steps: immediate acknowledgment and background processing.

User submits task → web server validates request, pushes job to queue (Redis/Kafka), returns job ID in milliseconds. Separate worker processes pull jobs from queue and execute the actual work. Benefits: fast user response, independent scaling of web servers and workers, fault isolation.

**But be careful.** Many candidates queue everything, which is frequently wrong. Short-running jobs (< 1 second) should return status synchronously with the request. This simplifies architecture dramatically, provides clearer back-pressure (users see immediate feedback when system is overloaded), and improves user experience.

Only queue when the work genuinely takes too long. Key technologies: message queues for job coordination, worker pools for processing, job status tracking, retries, and dead letter queues for poison messages that keep failing.

**Q:** Dealing with Contention: How do you prevent race conditions when multiple users access the same resource?
Anchor: dealing-with-contention
**A:** When multiple users try to book the last concert ticket or bid on an auction item simultaneously, you need mechanisms to prevent race conditions and ensure only one user succeeds.

Solutions range from database-level to distributed:

- **Single database:** Pessimistic locking (lock the row during update) or optimistic concurrency control (check version numbers before updating, abort if changed)
- **Distributed systems:** Distributed locks (Redis), two-phase commit protocols, or queue-based serialization (put all bids in a queue, process sequentially)

Key tradeoff: performance versus consistency. A simple database transaction is slow but guarantees correctness. Distributed locks are faster but more complex.

**Critical insight:** Databases were built to solve contention problems. When you shard your data across multiple databases, you take on all those problems the database originally solved for you. Interviewers dig deep here—they want to see if you understand what you're giving up by breaking data apart. Start with single-database solutions before scaling to distributed approaches.

**Q:** Scaling Reads: What's the progression from a bottlenecked database to serving millions of read requests?
Anchor: scaling-reads
**A:** Read traffic becomes your first bottleneck as you grow. Most applications hit read-to-write ratios of 100:1 or higher. Instagram: opening the app triggers hundreds of queries for photos, metadata, user info, engagement. Posting once daily is a single write.

**Progression:**

1. **Optimize within your database:** Add indexes on frequently queried columns. Denormalize hot paths to avoid expensive joins.
2. **Scale horizontally with read replicas:** Main database handles writes. Read replicas handle reads. Reads scale linearly with each replica you add. Tradeoff: replication lag—read replicas trail behind the main database, so recent writes might not be visible immediately.
3. **Add external caching layers:** Redis caches hot data. CDNs cache static assets from edge locations worldwide. Cache-aside pattern: check cache first, miss hits database, result cached with TTL.

Key challenges: cache invalidation (keeping cached data fresh), replication lag (accepting staleness), hot keys (millions requesting the same popular content simultaneously—your cache becomes a bottleneck).

**Q:** Scaling Writes: How do you handle millions of writes per second when a single database can't keep up?
Anchor: scaling-writes
**A:** Individual database servers hit hard storage and write throughput limits. Solutions: horizontal sharding, vertical partitioning, and load management.

**Horizontal sharding:** Distribute data across multiple independent servers using a partition key. User ID as partition key means all posts by one user live on one shard. Fast per-user queries, slow global queries (require hitting every shard). Choose partition keys that distribute load evenly while keeping related data together.

**Vertical partitioning:** Separate different data types into different databases. Orders in one database, user profiles in another.

**Handle write bursts:** Use write queues to buffer temporary spikes. Batching reduces per-operation overhead by grouping multiple writes. Load shedding prioritizes important writes during overload.

**Critical detail:** Bad partition keys create hot shards. A celebrity's shard gets hammered while others sit idle. Good partition keys distribute evenly.

**Q:** Handling Large Blobs: How do you avoid routing gigabytes through your application servers?
Anchor: handling-large-blobs
**A:** Never route large files through your web servers. Use presigned URLs for direct client-to-storage transfers.

**Upload flow:**

1. Client requests presigned URL from application server
2. Server generates temporary, scoped credentials
3. Client uploads directly to S3 with presigned URL
4. S3 notifies application when complete

**Download flow:**

1. Server returns presigned URL to client
2. Client downloads from CDN, which proxies to blob storage
3. CDN caches content globally for fast distribution

Your servers are eliminated as bottlenecks. Clients get resumable uploads, progress tracking, and global distribution.

**Key challenges:** Synchronizing database metadata with actual blob storage (use event notifications from storage services), handling upload failures (retry logic, cleanup orphaned blobs), managing file lifecycle (expiration policies).

**Q:** Multi-Step Processes: How do you coordinate complex workflows that must survive failures?
Anchor: multi-step-processes
**A:** Complex business processes (order fulfillment, user onboarding, payment processing) involve multiple services and long-running operations. Need reliable coordination that survives failures, retries, and external dependency failures.

**Options:**

- **Simple orchestration:** Single service manages the workflow, calls other services in sequence. Easy but fragile—failures require manual recovery.
- **Event sourcing:** Each step emits events that trigger subsequent steps. Distributed, resilient, full audit trail of what happened.
- **Workflow engines:** Temporal, AWS Step Functions. Handle state management, failure recovery, retries, and exactly-once execution automatically.

Key insight: Move from scattered state management and manual error handling to declarative workflow definitions. The system guarantees exactly-once execution and maintains complete audit trails.

**Q:** Proximity-Based Services: When do you need geospatial indexes for location-based queries?
Anchor: proximity-based-services
**A:** Systems like Uber or Gopuff need to search for nearby entities (drivers, stores) by location. Geospatial indexes (Postgres PostGIS, Redis geospatial, Elasticsearch geo-queries) let you query efficiently.

Architecture: Divide geographical area into regions, index entities within regions. System quickly excludes vast irrelevant areas, reducing search space dramatically.

**But be careful:** Geospatial indexes have overhead. Only use them when indexing hundreds of thousands or millions of items. If you're searching a map of 1,000 items, just scan all of them—the index overhead isn't worth it.

Most systems don't require global queries. When proximity is involved, users search locally—nearby drivers, nearby restaurants. This naturally bounds the search space.

**Q:** Pattern Combinations: How do patterns work together to solve complex systems?
Anchor: pattern-selection
**A:** Patterns are not mutually exclusive. A video platform combines multiple patterns:

- **Large Blobs:** Upload videos to S3 directly via presigned URLs
- **Long-Running Tasks:** Queue video transcoding jobs to worker pool
- **Realtime Updates:** Push transcoding progress to users via SSE or WebSockets
- **Multi-Step Processes:** Orchestrate entire workflow—receive upload → validate → transcode → generate thumbnails → publish → notify user

**Pattern selection discipline:** Recognize which patterns apply to your problem. Start with simplicity (polling, single-server orchestration) and only add complexity when specific requirements demand it. Proactively identifying patterns demonstrates architectural maturity and saves time by following proven solutions instead of inventing new problems.

## Networking
Bucket: Core Concepts
Link: https://www.hellointerview.com/learn/system-design/core-concepts/networking-essentials

**Q:** What are the three networking layers most relevant to system design interviews?
Anchor: networking-layers
**A:** Network Layer (Layer 3), Transport Layer (Layer 4), and Application Layer (Layer 7).

- Network Layer: IP, handles routing and addressing, breaking data into packets
- Transport Layer: TCP, QUIC, UDP, providing end-to-end communication, reliability, ordering, flow control
- Application Layer: DNS, HTTP, WebSockets, WebRTC, providing abstractions for web application data

**Q:** What are the four key stages of a simple web request over HTTP/TCP?
Anchor: example-a-simple-web-request
**A:** DNS resolution, TCP three-way handshake, HTTP request/response, TCP four-way teardown.

- *DNS Resolution* — domain name resolved to an IP address
- *TCP Handshake* — SYN, SYN-ACK, ACK establishes the connection
- *HTTP Exchange* — client sends GET, server processes and responds
- *TCP Teardown* — four-way FIN/ACK exchange closes the connection

**Q:** Why does TCP connection setup matter for system design, specifically for persistent connections?
Anchor: example-a-simple-web-request
**A:** Without features like HTTP keep-alive or HTTP/2 multiplexing, the handshake process repeats for every request, adding significant overhead. This becomes especially relevant when designing systems needing persistent connections, like real-time update systems.

**Q:** What are the key characteristics of UDP, and when should you choose it?
Anchor: udp-fast-but-unreliable
**A:** UDP is *connectionless*, has *no delivery guarantee*, *no ordering guarantee*, and *lower latency* due to less overhead.

Choose UDP when:

- Low latency is critical, such as real-time applications or gaming
- Some data loss is acceptable, such as media streaming
- You're handling high-volume telemetry or logs where occasional loss is tolerable
- You don't need to support web browsers, or have an alternative for that client

**Q:** What are the key characteristics of TCP, and when is it the default choice?
Anchor: tcp-reliable-but-with-overhead
**A:** TCP is *connection-oriented*, guarantees *reliable and ordered delivery*, and includes *flow control* and *congestion control*.

TCP is the default expectation in most system design interviews and is ideal for essentially everything where UDP isn't a good fit, since data integrity matters more than raw speed in most applications.

**Q:** What are the three main API paradigms covered for system design interviews, and which is the recommended default?
Anchor: rest-simple-and-flexible
**A:** REST, GraphQL, and gRPC. **REST is the recommended default**, since it's well understood and a good baseline for building scalable systems.

- REST: models resources and operations using HTTP verbs and conventions
- GraphQL: lets clients request exactly the data they need, avoiding over-fetching and under-fetching
- gRPC: a binary, high-performance RPC framework using Protocol Buffers, better suited to internal service-to-service communication

**Q:** What are under-fetching and over-fetching, and how does GraphQL address them?
Anchor: graphql-flexible-data-fetching
**A:** Under-fetching means a page requires many separate API calls to render, adding latency from multiple round trips. Over-fetching means an API returns far more data than needed to guard against future use-cases, slowing load times.

GraphQL solves both by letting the frontend specify exactly which fields and nested objects it needs in a single query, so the backend returns data shaped to that specific request.

**Q:** When does gRPC make sense, and when should you avoid it?
Anchor: grpc-efficient-service-communication
**A:** gRPC is ideal for **internal service-to-service communication**, especially in microservices architectures, where performance is critical and strong typing catches errors at compile time. Its binary protocol can be roughly **10x more efficient** in throughput than JSON over HTTP.

Avoid gRPC for public-facing APIs, since browsers don't support it natively and the tooling for external clients is less mature than plain JSON over HTTP. A common pattern is gRPC internally and REST externally.

**Q:** What is Server-Sent Events (SSE) and what is its main limitation?
Anchor: server-sent-events-sse-real-time-push-communication
**A:** SSE is a spec built on top of HTTP that lets a server push many messages to a client over a single, long-lived HTTP connection, useful for one-directional real-time notifications like live auction prices.

Main limitation: connections can't stay open indefinitely, since servers, load balancers, or proxies will eventually close them. The spec handles this by having the client automatically reconnect and resume from the last received message ID.

**Q:** What are WebSockets and when should you avoid reaching for them?
Anchor: websockets-real-time-bidirectional-communication
**A:** WebSockets provide a persistent, TCP-style connection enabling real-time, bidirectional communication between client and server, initiated by upgrading an existing HTTP connection.

Avoid WebSockets when a simple request-response model or SSE's one-directional push would suffice.

> Launching into a WebSocket implementation without justifying why they are needed is a great way to get a "thumbs down" from your interviewer.

The required infrastructure is expensive and stateful connections add significant complexity at scale, so hold off unless truly needed.

**Q:** What is WebRTC and what two mechanisms does it use to work around NAT restrictions?
Anchor: webrtc-peer-to-peer-communication
**A:** WebRTC enables direct peer-to-peer communication between browsers without an intermediary server for the actual data exchange, and is the only application-layer protocol covered here that runs over UDP.

- **STUN** — lets peers discover their public IP address and port to attempt direct connections
- **TURN** — a relay service that bounces traffic through a central server when a direct connection can't be established

Best used for audio/video calling and conferencing; most other collaborative use-cases still need a central server anyway.

**Q:** What is the difference between client-side and dedicated load balancing?
Anchor: types-of-load-balancing
**A:** *Client-side* load balancing has the client itself decide which server to contact, typically by querying a service registry, and works well for a small number of controlled clients or use-cases tolerant of slow updates, like DNS-based rotation.

*Dedicated* load balancing places a server or hardware device between clients and backend servers to make routing decisions, adding a network hop in exchange for fast updates to the server list and fine-grained routing control.

**Q:** What is the difference between Layer 4 and Layer 7 load balancers?
Anchor: types-of-load-balancing
**A:** **Layer 4** load balancers operate at the transport layer, routing based on IP and port without inspecting packet content, making them fast and well-suited for persistent connections like WebSockets.

**Layer 7** load balancers operate at the application layer, inspecting request content such as URLs, headers, and cookies to make more intelligent routing decisions, making them better suited for general HTTP-based traffic.

**Q:** What are the five common load balancing algorithms?
Anchor: types-of-load-balancing
**A:** - **Round Robin** — sequential distribution across servers
- **Random** — random distribution across servers
- **Least Connections** — routes to the server with fewest active connections, ideal for persistent-connection services like SSE or WebSockets
- **Least Response Time** — routes to the fastest-responding server
- **IP Hash** — client IP determines the server, useful for session persistence

**Q:** What two strategies help reduce latency caused by geographic distribution?
Anchor: regionalization-and-latency
**A:** - **CDNs** — cache highly cacheable data, such as static assets or search results, at edge locations close to users
- **Regional Partitioning** — splits data and services by geography, such as bundling nearby cities into a region with its own local database, so regional queries stay fast

**Q:** What is "retry with exponential backoff and jitter," and why does jitter matter?
Anchor: handling-failures-and-fault-modes
**A:** A strategy for handling transient failures where a failed request is retried after a wait period that increases with each subsequent failure, giving the system time to recover.

*Jitter* (randomness added to the backoff interval) matters because without it, all failing clients could retry simultaneously in a synchronized pattern, worsening the load spike instead of relieving it.

**Q:** Why does idempotency matter for retryable APIs, and how is it implemented for writes?
Anchor: handling-failures-and-fault-modes
**A:** If a retried request has side effects, such as a payment charge, retrying without idempotency could cause duplicate charges. GET requests are naturally idempotent since they don't change system state.

For writes, an **idempotency key** — a unique identifier for a specific request — lets the server detect and skip reprocessing a request it has already handled or is currently handling.

**Q:** What is a circuit breaker and what are its four states/transitions?
Anchor: handling-failures-and-fault-modes
**A:** A pattern that protects a system from cascading failures when calls to a dependency repeatedly fail.

---

1. The breaker monitors for failures on calls to an external service
2. When failures exceed a threshold, the circuit **trips to open**, immediately failing requests without attempting the real call
3. After a timeout, it moves to a **half-open** state and sends a single test request
4. Based on that test's result, the circuit either **closes** again or **reopens**

---

This prevents overwhelming an already-struggling service and gives it time to recover, avoiding "thundering herd" scenarios where a firehose of retries prevents a recovering service from ever fully coming back online.

## API Design
Bucket: Core Concepts
Link: https://www.hellointerview.com/learn/system-design/core-concepts/api-design

**Q:** What are the three main API protocols to choose between in a system design interview, and which should you default to?
Anchor: api-types
**A:** **REST**, **GraphQL**, and **RPC**. Default to **REST** unless you have a specific reason not to — it's well-understood, has great tooling, and works for 90% of use cases.

- REST: standard HTTP methods on resources, best for standard CRUD in web/mobile apps
- GraphQL: single endpoint with a query language, best when different clients need different data shapes
- RPC (e.g. gRPC): binary, action-oriented calls, best for internal service-to-service communication where performance matters

> If you're unsure, just say "I'll use REST APIs" and move on.

**Q:** What are the five main HTTP methods and which are idempotent?
Anchor: rest
**A:** - **GET** — retrieves data, changes nothing. *Idempotent.*
- **POST** — creates a new resource. *Not safe, not idempotent* — repeated calls create multiple resources.
- **PUT** — replaces an entire resource, or creates it if missing. *Idempotent* — same data sent repeatedly yields the same final state.
- **PATCH** — updates part of a resource. *Not guaranteed idempotent* — depends on implementation ("set email to X" is idempotent, "append to list" is not).
- **DELETE** — removes a resource. *Idempotent* — repeated calls leave the server in the same deleted state, even if response codes differ.

*Note:* idempotency matters most when networks fail and clients retry requests — you don't want duplicate bookings from a retry.

**Q:** What are the three ways to pass data into a REST API, and what role does each serve?
Anchor: rest
**A:** - **Path parameters** — structural, identify which specific resource you're working with (required)
- **Query parameters** — modifiers, filter/sort/paginate (optional)
- **Request body** — payload, the actual data being created or updated

Example combining all three for a booking request:

```plaintext
POST /events/123/bookings?notify=true
{
  "tickets": [
    {"section": "VIP", "quantity": 2}
  ],
  "payment_method": "credit_card"
}
```

**Q:** What is the core principle of REST resource modeling?
Anchor: rest
**A:** Resources should represent *things* that exist in your system, not *actions* users can take. Think events, venues, bookings, not "book" or "purchase." Resources should also always be plural nouns.

Example resource mapping for a Ticketmaster-style system:

```plaintext
GET /events                    # Get all events
GET /events/{id}               # Get a specific event
GET /venues/{id}               # Get a specific venue
GET /events/{id}/tickets       # Get available tickets for an event
POST /events/{id}/bookings     # Create a new booking for an event
```

**Q:** When should you nest a resource under a path vs. use a query parameter for filtering?
Anchor: rest
**A:** Use a **path parameter** (or nested resource) when the value is *required* to identify what's being requested, such as `/events/{id}/tickets`. Use a **query parameter** when the filter is *optional*, such as `/tickets?event_id=123&section=VIP`.

- Path parameters are *structural* — they determine which endpoint you're hitting
- Query parameters are *modifiers* — they change how the endpoint behaves

**Q:** What problem does GraphQL solve, and what phrase from an interviewer signals you should bring it up?
Anchor: graphql
**A:** GraphQL solves the tension between under-fetching (needing multiple REST endpoints or round trips) and over-fetching (returning more data than a client needs) by letting clients specify exactly the shape of data they want from a single endpoint.

Signal phrases: *"the mobile app needs different data than the web app"* or *"avoiding over-fetching and under-fetching."*

**Q:** What is the N+1 problem in GraphQL, and how is it solved?
Anchor: graphql
**A:** When a client queries a list of items along with a related sub-object, GraphQL may execute one query for the list, then a separate query for each related object individually. Querying 100 events with venues could mean 101 database queries instead of 2.

Solved with **batching/dataloader patterns** that group related queries together — though this adds complexity you don't have with plain REST.

**Q:** How does GraphQL handle authorization differently from REST?
Anchor: graphql
**A:** REST typically secures entire *endpoints*. GraphQL secures individual *fields* — a user might be allowed to see an event's name and date but not its venue data, controlled at the schema resolver level.

**Q:** When should you reach for RPC (e.g. gRPC) instead of REST?
Anchor: rpc
**A:** When performance is critical, type safety matters, communication is service-to-service (not public-facing), or streaming is needed.

- Uses **Protocol Buffers** for binary serialization and **HTTP/2** for transport — significantly faster than JSON over HTTP
- Generates client/server code across languages from one `.proto` definition, giving compile-time type safety across a polyglot system

*Note:* unless explicitly asked, only outline user-facing APIs during the API step of an interview — internal RPC communication is usually just mentioned in passing during the high-level design.

**Q:** What are the two main pagination strategies, and when should you use each?
Anchor: pagination
**A:** **Offset-based** and **cursor-based** pagination.

- *Offset-based* — `/events?offset=20&limit=10`. Simple and intuitive, but can produce duplicates or skipped records if data changes while paginating.
- *Cursor-based* — uses a pointer (an encoded ID or timestamp) to the last seen record instead of counting from the start. More stable under concurrent writes, but harder to implement "jump to page 5."

For interviews, offset-based pagination is usually fine unless the problem involves real-time data or the interviewer specifically asks about high-volume scenarios.

**Q:** What are the two common API versioning strategies, and which is preferred in interviews?
Anchor: versioning-strategies
**A:** **URL versioning** (`/v1/events`) and **header versioning** (`Accept-Version: v2`).

**URL versioning** is the safer default for interviews — it's explicit, widely understood, and easy to explain and test. Header versioning keeps URLs cleaner but is less obvious and harder to test in a browser.

**Q:** What is the difference between authentication and authorization?
Anchor: authentication-and-authorization
**A:** **Authentication** verifies *identity* — proving the user is who they claim to be. 
---
**Authorization** verifies *permissions* — checking if that authenticated user is allowed to perform the specific action requested.

**Q:** When should you use API keys vs. JWT tokens?
Anchor: authentication-and-authorization
**A:** **API keys** — for server-to-server communication and third-party developer access, where you control both sides or are exposing programmatic access. They act like a password for an application, not a person.

**JWT tokens** — for user-facing sessions in web and mobile apps. A JWT encodes user ID, permissions, and expiration directly into a signed token, so any service holding the verification key can validate it independently, without a database lookup.

```plaintext
// JWT payload
{
"user_id": "123",
"role": "customer",
"exp": 1640995200
}
```

**Q:** What is Role-Based Access Control (RBAC)?
Anchor: authentication-and-authorization
**A:** A model that assigns *roles* to users and *permissions* to roles, rather than managing permissions per individual user.

*Example:* a `customer` role can book tickets and view their own bookings; a `venue_manager` can create events and view sales for their venues; an `admin` can access everything.

In an interview, checking a request typically means answering two questions: is the user authenticated (valid token), and is the user authorized (owns the resource, or holds the right role)?

**Q:** What is rate limiting and what are three common strategies for it?
Anchor: rate-limiting-and-throttling
**A:** Rate limiting restricts how many requests a client can make in a given time period, protecting the system from abuse and accidental overuse. Exceeded limits typically return a **429 Too Many Requests** status code.

- **Per-user limits** — e.g. 1000 requests/hour per authenticated user
- **Per-IP limits** — e.g. 100 requests/hour for unauthenticated requests
- **Endpoint-specific limits** — e.g. 10 booking attempts/minute, to prevent scalping

> A simple "we'll implement rate limiting to prevent abuse" is usually sufficient in an interview — don't spend time designing the specific algorithm unless asked.

**Q:** How much interview time should API design typically take, and what's the most common mistake candidates make with it?
Anchor: conclusion
**A:** Aim for **no more than 5 minutes** outlining APIs. The most common mistake is *overinvesting* in this step rather than underinvesting — candidates get bogged down perfecting endpoint structure when there are bigger architectural challenges still to solve.

## Data Modeling
Bucket: Core Concepts
Link: https://www.hellointerview.com/learn/system-design/core-concepts/data-modeling

**Q:** What database type should you default to in system design interviews, and why?
Anchor: relational-databases-sql
**A:** **Relational databases (SQL)**, with **PostgreSQL** as the safe default. Most system design problems map naturally onto entities with clear relationships (users, posts, orders), and the scalability concerns often raised against SQL are exaggerated — modern SQL scales via read replicas, sharding, connection pooling, and caching.

> Some of the largest companies in the world (Facebook, Airbnb) rely on relational foundations.

**Q:** When should you consider a document database instead of SQL, and what's the catch for interviews specifically?
Anchor: document-databases
**A:** Consider document databases (MongoDB, Firestore) when your schema changes frequently, data is deeply nested, or different records have wildly different structures.

The catch: system design interviews intentionally scope requirements to a clear, concise set, so you're unlikely to actually have "evolving schemas" in the first place — the main reason to pick document databases rarely applies. Only reach for one if the interviewer explicitly signals rapidly changing data structures.

**Q:** What is the data modeling tradeoff of a document database, using the embedded-posts example?
Anchor: document-databases
**A:** Embedding related data (like a user's posts) directly inside a parent document eliminates joins, but means updating a single post requires finding and rewriting the *entire* parent document.

This trades storage space and update complexity for read performance — heavier denormalization than SQL would typically use.

**Q:** When should you consider a key-value store, and what's the real-world usage pattern?
Anchor: key-value-stores
**A:** For caching, session storage, feature flags, or any scenario needing lookup by a single identifier with maximum write throughput.

In practice, you'll typically use *both together*: SQL as your source of truth, with a key-value cache (like Redis) in front for hot data — giving fast access without sacrificing durability or complex queries.

*Data modeling impact:* schema becomes very flat, with heavy duplication across keys to support different access patterns, since joins/queries across relationships aren't possible.

**Q:** When should you consider a wide-column database, and what makes its writes fast?
Anchor: wide-column-databases
**A:** For massive write-heavy workloads and time-series data — telemetry, event logging, IoT sensor data.

Writes are fast because rows sharing a partition key (e.g. `user_id`) are stored together — a new post is just an append to that user's partition, and reads become an efficient scan of a contiguous range.

*Data modeling impact:* you design around query patterns even more aggressively than SQL, often duplicating data across column families, with time as a first-class dimension.

**Q:** When should you consider a graph database, according to the guide?
Anchor: graph-databases
**A:** **Almost never in interviews.** Even "graph-heavy" companies like Facebook, LinkedIn, and Twitter model their core social graph relationships using SQL rather than a dedicated graph database.

> Graph databases are a common mistake in interviews. They sound sophisticated but add unnecessary complexity.

**Q:** What three factors should drive every schema design decision, and how does each shape the schema?
Anchor: start-with-requirements
**A:** - **Data volume** — determines whether data must be physically split across multiple stores, which forces distinct schemas with careful cross-referencing
- **Access patterns** — the most important factor; how data will be queried drives whether you denormalize, which indexes you add, and how tables are structured
- **Consistency requirements** — determines how tightly coupled data can be; strong consistency (e.g. financial transactions) needs ACID guarantees in one database, while eventual consistency (e.g. activity feeds) allows distributing data across separate, differently-optimized systems

*In interviews:* explicitly tie schema choices back to these factors — e.g. "Since feeds need to load quickly and likes can be eventually consistent, I'll denormalize like counts into the posts table."

**Q:** What convention should primary keys follow, and why?
Anchor: entities-keys-relationships
**A:** Use **system-generated IDs** (like `user_id`, `post_id`) rather than business data (like email addresses) as primary keys. System-generated keys stay stable even when business rules change — an email address can change, but an internal ID never should.

**Q:** What are the three relationship cardinalities, and which one is a design smell?
Anchor: entities-keys-relationships
**A:** - **One-to-many (1:N)** — a user has many posts, a post has many comments
- **Many-to-many (N:M)** — users like many posts, posts are liked by many users
- **One-to-one (1:1)** — rare in practice, often a sign that the two tables should just be merged

**Q:** What do foreign keys enforce, and what's the tradeoff of using them at scale?
Anchor: entities-keys-relationships
**A:** Foreign keys enforce **referential integrity** — preventing orphaned records like a post referencing a nonexistent user, or a comment pointing to a deleted post.

Tradeoff: the database validates every insert/update against them, adding write overhead. At very large scale, some companies drop foreign keys entirely for write performance and enforce integrity at the application layer instead. Mentioning this tradeoff signals awareness in an interview.

**Q:** How should you decide what to index, and how should you justify it in an interview?
Anchor: indexing-for-access-patterns
**A:** Indexes should directly support your **most important queries** — the ones driven by your actual API endpoints.

*Example for a social feed:*

- Index on `posts.user_id` — find all posts by a user
- Index on `posts.created_at` — load recent posts chronologically
- Composite index on `(user_id, created_at)` — efficiently load a user's recent posts

> Connect your indexes directly to your API endpoints: "The `GET /users/{id}/posts` endpoint needs an index on `posts.user_id`."

**Q:** What is normalization vs. denormalization, and what's the recommended default in interviews?
Anchor: normalization-vs-denormalization
**A:** **Normalization** stores each piece of data in exactly one place, preventing update anomalies (e.g. a username living only in the `users` table, not duplicated onto every post).

**Denormalization** duplicates data for read performance, but risks inconsistency — e.g. if `username` is copied onto every post row, changing it means updating every single post, and missing even one leaves inconsistent data.

*Default:* start with a clean normalized model, and only denormalize when there's a clear, justified need.

**Q:** What are the three legitimate exceptions where denormalization makes sense?
Anchor: normalization-vs-denormalization
**A:** - **Analytics/reporting systems** aggregating data that changes infrequently
- **Event logs and audit trails** capturing a snapshot at a point in time
- **Heavily read-optimized systems** like search engines, where consistency matters less than speed

*Alternative:* even when fast denormalized access is needed, you can keep your source of truth clean and normalized while putting a **cache** in front containing the denormalized/pre-computed view.

**Q:** What sharding strategy is recommended, and what is the specific anti-pattern to avoid?
Anchor: scaling-and-sharding
**A:** **Shard by the primary access pattern.** If you mostly query "posts by user," shard by `user_id`, keeping a user's posts together on one shard and avoiding expensive cross-shard queries.

**Anti-pattern: time-range sharding.** While tempting for "recent posts" queries, it means all current writes land on the same shard (the latest time range), creating a hot shard. This is only appropriate for archival/analytics workloads where recent data is read-heavy but writes are naturally spread out over time, not for write-heavy systems.

**Q:** What should you avoid whenever possible when choosing a shard key, and why?
Anchor: scaling-and-sharding
**A:** **Cross-shard queries.** If a timeline feature needs posts from multiple followed users, and data is sharded by `user_id`, that query has to hit multiple shards and merge results client-side or at the query layer — expensive and complex.

Your shard key choice is often effectively permanent and affects every subsequent query, so it deserves careful upfront thought based on the dominant access pattern.

## Database Indexing
Bucket: Core Concepts
Link: https://www.hellointerview.com/learn/system-design/core-concepts/db-indexing

**Q:** What fundamental problem do indexes solve, and why does it matter even with modern SSDs?
**A:** Without an index, a query must scan through every page of data sequentially, loading each into memory to check for a match — painfully slow at scale, like flipping through every page of a book to find one word.

Even on SSDs, **random access is still significantly slower than sequential access**. This gap is smaller than with HDDs, but it's still very real, which is why proper indexing remains critical even on modern storage.

**Q:** What are the two main costs of adding an index, and when might an index hurt more than it helps?
**A:** - **Storage** — every index needs disk space, sometimes nearly as much as the data
- **Write performance** — an insert or update touches the table *and* every index on it

But **don't over-weight this: under-indexing kills far more applications than over-indexing ever has.** Modern engines handle well-designed indexes efficiently. Skip an index only on a write-heavy, rarely-read table (a log) or a table small enough to scan.

**Q:** What is a B-tree, and what four structural rules define it?
**A:** A self-balancing tree that maintains sorted data with efficient insertions, deletions, and searches. Unlike binary trees, each node can have many children (often hundreds).

- All leaf nodes must be at the same depth
- Each node can contain between *m/2* and *m* keys (*m* = order of the tree)
- A node with *k* keys must have exactly *k+1* children
- Keys within a node are kept in sorted order

Each node is sized to fit a single disk page (~8KB), so finding a record often requires reading only 2-3 pages from disk.

**Q:** Why are B-trees the default choice for most database indexes?
**A:** They handle both equality searches and range searches equally well, maintain sorted order (great for range queries and `ORDER BY`), stay balanced even under random inserts/deletes, and minimize disk I/O by matching their structure to how databases physically store data.

> If you find yourself in an interview and you need to decide which index to use, B-trees are a safe bet.

*Real-world note:* PostgreSQL uses B-trees for primary keys and unique constraints; MongoDB uses B+ trees for its indexes.

**Q:** What problem do LSM trees solve that B-trees struggle with?
**A:** **Extremely high write throughput.** With B-trees, each write means finding the right leaf page, reading it into memory, updating it, and writing it back — fine at a few thousand writes/sec, but random disk seeks become a bottleneck at 100,000+ writes/sec.

LSM trees batch writes in memory and flush them to disk sequentially, converting many small random writes into fewer large sequential ones.

**Q:** What are the four steps of the LSM tree write path?
**A:** 1. **Memtable** — new writes go into an in-memory sorted structure (e.g. red-black tree or skip list), extremely fast since it's all RAM
2. **Write-Ahead Log (WAL)** — every write is also appended to a durability log on disk, a fast sequential append
3. **Flush to SSTable** — once the memtable fills, it's frozen and flushed to disk as an immutable Sorted String Table in one large sequential write
4. **Compaction** — a background process periodically merges SSTables, removing duplicates and deleted entries to keep read performance manageable

**Q:** Why do LSM trees make reads more complex, and what three techniques mitigate this?
**A:** A single point query may need to check the memtable, any pending immutable memtables, and *every* SSTable on disk (newest to oldest) — potentially dozens of files in the worst case.

Mitigations:

- **Bloom filters** — a probabilistic structure per SSTable that can quickly rule out "definitely not here," letting you skip most files
- **Sparse indexes** — since SSTables are sorted, a sparse index tells you the key range in each block, letting you skip files outside your target range
- **Compaction strategies** — size-tiered minimizes write amplification but leaves more files to check; leveled compaction keeps fewer files but requires more frequent rewrites

*Rule of thumb:* if a system writes far more than it reads (metrics, audit logs, IoT data), LSM trees are likely right. For user-facing apps with frequent reads per page load, B-trees usually perform better.

**Q:** What is a hash index, and why is it rarely the right interview answer despite being O(1)?
**A:** A hash index is essentially a persistent hashmap: it hashes an indexed value to determine which bucket holds a pointer to the row. This gives extremely fast exact-match lookups, but the structure is useless for range queries or sorting, since similar values are deliberately scattered across buckets.

It's rarely the right answer because **B-trees handle equality comparisons almost as efficiently as hash indexes**, while also supporting range queries and sorting — so hash indexes trade away flexibility for a speed advantage that barely exists in disk-based systems.

> In the words of database expert Bruce Momjian: "Hash indexes solve a problem we rarely have."

*Where they do shine:* in-memory databases like Redis, where all data already lives in RAM and disk I/O patterns don't matter.

**Q:** Why do standard B-tree indexes on latitude and longitude fail for proximity search?
**A:** A B-tree on latitude and a separate one on longitude each treat their dimension independently — a 2D "find points within a circle" problem being solved with two unrelated 1D indexes.

- Using the latitude index alone returns a strip spanning the entire globe at that latitude
- Combining both indexes via intersection still produces a rectangular search area much larger than the actual circular radius, requiring extra filtering

This is why spatial data needs an index that actually understands 2D proximity relationships.

**Q:** What is a geohash, and why is it the recommended default for geospatial indexing in interviews?
**A:** Geohash recursively divides the world into smaller and smaller squares, encoding a 2D location into a single 1D string (base32) where **locations close together usually share similar string prefixes**.

- Longer strings encode more precision (e.g. `"9q8y"` ≈ all of San Francisco, `"9q8yyk"` ≈ a specific city block)
- Once encoded, geohash strings can be indexed with a **regular B-tree**, and proximity search becomes a simple prefix range scan, no specialized spatial structure needed

*Limitation:* locations that are physically close but fall on opposite sides of a major grid division may not share a prefix — an edge case usually not significant enough to matter.

*Real-world use:* Redis's `GEOADD`/`GEOSEARCH` commands use geohash internally.

**Q:** How do quadtrees organize spatial data, and why have they fallen out of favor in production databases?
**A:** Quadtrees recursively subdivide a 2D region into four equal quadrants whenever a quadrant exceeds a point threshold (typically 4-8 points), mapping this subdivision directly onto a tree structure.

Their advantage is *adaptive resolution* — dense areas subdivide finely, sparse areas stay coarse. But unlike geohash, quadtrees require a specialized tree structure rather than reusing existing B-tree implementations, which is why most modern databases prefer geohash or R-trees instead. Quadtree concepts do underpin R-trees and are still used in systems like Google Maps' tile organization.

**Q:** What makes R-trees different from quadtrees, and why are they the modern production default for spatial indexing?
**A:** R-trees use flexible, **overlapping rectangles** that adapt to the actual distribution of the data, rather than quadtrees' rigid, fixed-size quadrant subdivisions.

- This lets a single R-tree efficiently index both points *and* larger shapes (delivery zones, road networks) in the same structure
- The tradeoff: overlapping rectangles sometimes force searching multiple branches of the tree, but modern implementations tune this overlap against tree depth for disk efficiency

R-trees are the default spatial index in PostgreSQL/PostGIS and MySQL today.

**Q:** Why can't a B-tree efficiently support a LIKE '%database%' style text search?
**A:** B-tree indexes can only help with **prefix matches** (`'database%'`) or, with a reversed column, suffix matches. When the search pattern could match *anywhere* within the text, the database has no choice but to scan every character of every row — the index provides no help at all.

**Q:** What is an inverted index, and how does it flip the document/word relationship?
**A:** Instead of storing documents with their words, an inverted index stores **words mapped to the documents containing them** — like the index at the back of a textbook.

*Example mapping:*

```plaintext
b-trees  -> [doc1, doc3]
fast     -> [doc1, doc2]
hash     -> [doc2]
```
Production systems like Elasticsearch enrich this with an analysis pipeline: tokenizing text, lowercasing, removing stop words, and stemming, so a search for "Databases" also matches "database" or "database's."

**Q:** What is a composite index, and why does column order matter?
**A:** A single index combining multiple columns in a specific order, letting one B-tree traversal satisfy both a filter and a sort in one shot, instead of intersecting two separate indexes and then sorting.

*Example:* `CREATE INDEX idx_user_time ON posts(user_id, created_at)` lets a query filtering on `user_id` and ordering by `created_at` get both from one sorted traversal.

**Column order matters** because a composite index can only be used efficiently for *prefixes* of its column list — an index on `(user_id, created_at)` doesn't help a query that filters only on `created_at`.

> Order columns from most selective to least selective — though query patterns can override strict selectivity if sorting by a specific column is common.

**Q:** What is a covering index, and what is the current guidance on when to use one?
**A:** An index that includes every column a query needs, not just the filter/sort columns, letting the database return results straight from the index without a separate lookup into the main table page.

*Example:*
```plaintext
CREATE INDEX idx_user_time_likes ON posts(user_id, created_at) INCLUDE (likes);
```

Tradeoff: larger index size for storing extra columns. The current guidance treats this as more of a niche optimization than a default — modern query optimizers already execute regular indexes efficiently, so covering indexes should only be reached for with a clear, specific justification, and it's often better to err toward simplicity if unsure.

## Caching
Bucket: Core Concepts
Link: https://www.hellointerview.com/learn/system-design/core-concepts/caching

**Q:** Why is caching so effective, and what's the rough latency difference between a database and an in-memory cache?
**A:** Databases store data on disk, and every query pays the cost of disk access. Memory sits much closer to the CPU and avoids that entirely.

*Example:* reading a user profile from Postgres might take **50ms**, while reading the same data from Redis takes **~1ms** — roughly a **50x** improvement.

**Q:** What are the four layers where caching can occur, and which is the default answer in interviews?
**A:** - **External caching** (Redis, Memcached) — the **default answer** for any high-traffic system; shared across all app servers, supports eviction/TTL
- **CDN** — geographically distributed edge servers caching content close to users, best introduced when the system serves static media at scale
- **Client-side caching** — browser HTTP cache, localStorage, mobile app local storage; limited backend control, harder to invalidate
- **In-process caching** — data cached inside the application's own memory (config, feature flags, hot keys); mention only as an *optimization layer* after external caching is already established

**Q:** How much latency does a CDN typically save for a geographically distant user, using the Virginia/India example?
**A:** Without a CDN, a request from India to a server in Virginia adds **250-300ms** of latency. With a CDN, the same content is served from a nearby edge server in **20-40ms** — a massive difference.

> The most common and most impactful use of a CDN is still media delivery, even though modern CDNs can also cache API responses and dynamic content.

**Q:** What is in-process caching best suited for, and what is its core limitation?
**A:** Small, frequently-requested pieces of data that rarely change — configuration values, feature flags, small reference datasets, hot keys, rate-limiting counters, precomputed values.

*Limitation:* each application instance has its **own separate cache**. Data isn't shared across servers, and if one instance updates or invalidates a value, the others have no way of knowing.

**Q:** What is cache-aside (lazy loading), and why should it be your default caching pattern in interviews?
**A:** The application checks the cache first; on a miss, it fetches from the database, stores the result in the cache, then returns it.

- Keeps the cache lean since only requested data gets cached
- Downside: a cache miss adds extra latency for that request

> If you only remember one caching pattern for interviews, make it cache-aside.

**Q:** What is write-through caching, and what problem does it still have despite writing to both cache and database?
**A:** The application writes only to the cache; the cache synchronously writes to the database before acknowledging the write back to the application.

- Tradeoff: slower writes, since both the cache and database update must complete
- Still suffers from the **dual-write problem** — if the cache update succeeds but the database write fails (or vice versa), the two systems end up inconsistent, and there's no clean fix without distributed transactions

*Use when:* reads must always return fresh data and slightly slower writes are acceptable.

**Q:** What is write-behind (write-back) caching, and what's the risk?
**A:** The application writes only to the cache; the cache batches and asynchronously flushes those writes to the database in the background.

*Risk:* if the cache crashes before flushing, **data is lost**. Best suited for workloads where occasional data loss is tolerable and eventual consistency is fine, like analytics or metrics pipelines.

**Q:** What is read-through caching, and when is it actually worth proposing?
**A:** The cache itself acts as a smart proxy — the application never talks to the database directly. On a miss, the cache fetches from the database, stores it, and returns it. This is the read-side counterpart to write-through.

*When to propose it:* rarely, in interviews — mostly relevant when discussing **CDNs**, which are effectively a form of read-through cache. For application-level Redis caching, cache-aside is far more common.

**Q:** What are the four cache eviction policies, and which is the safe default?
**A:** - **LRU** (Least Recently Used) — evicts the item unused for longest; the **default** in most systems, adapts well to most workloads
- **LFU** (Least Frequently Used) — evicts the item accessed least often; good for consistently popular items like trending videos
- **FIFO** — evicts by insertion order only, ignoring usage; rarely used since it can evict still-hot items
- **TTL** — not an eviction policy on its own, but an expiration timer, often combined with LRU/LFU; essential when data must eventually refresh (API responses, session tokens)

**Q:** What is a cache stampede (thundering herd), and what's the most effective fix?
**A:** A popular cache entry expires, and many requests simultaneously miss the cache and hit the database at once — turning one query into hundreds or thousands in a brief window.

*Example:* a homepage feed cached with a 60-second TTL expires at exactly `12:01:00`; every request at that instant misses and queries the database simultaneously.

- **Request coalescing (single-flight)** — the **most effective fix**: only one request rebuilds the cache while others wait for that result
- **Cache warming** — proactively refresh popular keys before they expire; only helps with TTL-based expiration, not write-based invalidation

**Q:** What is cache inconsistency, and why does it happen in the first place?
**A:** The cache and database returning different values for the same data, because most systems write to the database first and only later refresh the cache — creating a window where the cache holds stale data.

*Example:* a user updates their profile picture; the database has the new value, but other users may still see the stale cached image until it refreshes.

Three approaches, chosen based on how fresh data must be:

- **Invalidation on writes** — delete the cache entry after updating the database, so the next read repopulates it fresh
- **Short TTLs** — tolerate some staleness temporarily
- **Accept eventual consistency** — appropriate for feeds, metrics, and analytics where a short delay doesn't matter

**Q:** What is a hot key, and how does it create a bottleneck even in a working, high-hit-rate cache?
**A:** A single cache entry that receives disproportionately massive traffic compared to everything else. Even with a high overall cache hit rate, one hot key can overload a single cache node or Redis shard.

*Example:* if everyone is viewing a celebrity's profile on a Twitter-like app, `user:taylorswift` might receive millions of requests per second, overwhelming one node even though the system is technically "working correctly."

Fixes:

- **Replicate the hot key** across multiple cache nodes and load-balance reads across them
- **Add a local fallback cache** — keep extremely hot values in-process to avoid pounding Redis directly
- **Apply rate limiting** on abusive traffic patterns targeting the specific key

**Q:** What four signals should prompt you to bring up caching in an interview, and what's the pattern for justifying it?
**A:** - **Read-heavy workload** — e.g. "200M reads/day hitting the database, even with indexes we're at 20-50ms per query"
- **Expensive queries** — e.g. a personalized feed requiring multiple joins takes 200ms, but can be cached and served in 1ms
- **High database CPU** — the same queries running repeatedly are pushing CPU to 80% at peak
- **Latency requirements** — needing sub-10ms responses when the database alone takes 30-50ms

*Pattern:* identify the performance problem, quantify it with rough numbers, then explain how caching solves it — don't jump straight to "we'll use a cache" without establishing why.

**Q:** What are the five steps for systematically introducing a caching strategy in an interview?
**A:** 1. **Identify the bottleneck** — name the specific slow thing and quantify it (e.g. "profile queries hit the DB 500 times/sec, each taking 30ms")
2. **Decide what to cache** — data that's read frequently, changes rarely, and is expensive to fetch or compute; also define the cache key structure (e.g. `user:123:profile`)
3. **Choose your cache architecture** — usually cache-aside; mention CDN for static content or in-process caching for extremely hot keys if relevant
4. **Set an eviction policy** — LRU as the safe default, paired with a TTL to prevent staleness
5. **Address the downsides** — invalidation strategy, what happens if the cache goes down (fallback to database + circuit breakers), and how you'd handle a thundering herd on popular keys

> Don't list every possible problem. Pick one or two that are relevant to the system you're designing and explain how you'd handle them.

## Sharding
Bucket: Core Concepts
Link: https://www.hellointerview.com/learn/system-design/core-concepts/sharding

**Q:** What is the technical difference between partitioning and sharding, even though the terms are often used loosely?
**A:** **Partitioning** splits a large table into smaller pieces *within a single database instance* — the data never leaves the machine. **Sharding** splits data *across multiple machines* — each shard is a standalone database.

> In practice most engineers use the terms loosely, so don't get hung up on the wording. Just be clear about whether your data lives on one machine or many.

**Q:** What are the two types of partitioning?
**A:** - **Horizontal partitioning** — splits rows across partitions (same columns, fewer rows per partition), e.g. one partition per year of orders
- **Vertical partitioning** — splits columns across partitions (same rows, fewer columns per partition), e.g. keeping frequently accessed columns separate from large or rarely used ones

**Q:** What two decisions must you make together when sharding, and what does each define?
**A:** - **What to shard by** — the field/column used to split the data, defining how data is *grouped*
- **How to distribute it** — the rule for assigning those groups to shards, defining how data is *spread across machines*

**Q:** What are the three properties of a good shard key?
**A:** - **High cardinality** — many unique values; a boolean shard key caps you at two shards, which defeats the purpose
- **Even distribution** — values spread evenly; sharding by country when 90% of users are in the US just creates one massive shard
- **Aligns with queries** — the most common queries should ideally hit just one shard

*Good examples:* `user_id` for a user-centric app, `order_id` for an e-commerce orders table — both high-cardinality, evenly distributed, and naturally scoped to single-shard queries.

*Bad examples:* `is_premium` (boolean, only two possible shards), `created_at` on a growing table (all new writes pile onto the newest shard).

**Q:** What is range-based sharding, and when does it actually work well?
**A:** Records are grouped by continuous ranges of the shard key value (e.g. user IDs 1-1M on shard 1, 1M-2M on shard 2).

- **Advantage:** simplicity, and efficient range scans since a query bounded within one range only hits one shard
- **Common failure mode:** if sharding by `created_at`, almost all traffic hits the newest shard since users care about recent data, leaving old shards mostly idle

**Works well for:** multi-tenant systems where each company/client naturally owns a distinct ID range — Company A's users only ever query Company A's range.

**Q:** What is hash-based sharding, and why is it the default assumed strategy in interviews?
**A:** A hash function is applied to the shard key, and the result determines which shard a record lands on — e.g. `shard = hash(user_id) % 4`.

- **Advantage:** even distribution, since the hash scrambles input values across all shards regardless of any natural skew
- **Downside:** adding or removing shards changes the modulo (`% 4` → `% 5`), remapping almost every record and requiring massive data movement — solved in practice with **consistent hashing**

> This is the default and most common sharding strategy. It's also what your interviewer will likely assume you're using unless you explicitly state otherwise.

**Q:** What is directory-based sharding, and why is it rarely the right interview answer?
**A:** A lookup table (directory/mapping service) explicitly stores which shard each record lives on, rather than computing it via a formula.

- **Advantage:** maximum flexibility — a hot user can be manually moved to a dedicated shard, rebalancing is just a mapping update
- **Downside:** every request requires an extra lookup first, adding latency, and the directory service itself becomes a **single point of failure** — if it goes down, the entire system stops even if all shards are healthy

*Rarely used in interviews* because it introduces a critical dependency and invites follow-up questions that can derail the conversation.

**Q:** What is the "celebrity problem," and what three techniques help mitigate hot spots?
**A:** A hot spot where a small number of extremely popular keys (e.g. a celebrity's user profile) receive massively disproportionate traffic compared to normal keys — hash-based distribution doesn't help here, since the issue is inherent key popularity, not distribution strategy.

- **Isolate hot keys to dedicated shards** — move an extremely hot account to its own shard that can be scaled independently
- **Compound shard keys** — e.g. `hash(user_id + date)` spreads one user's data across multiple shards over time, useful when the hot spot spans both high volume *and* time
- **Dynamic shard splitting** — some databases (e.g. MongoDB's balancer) automatically split and migrate overloaded chunks to rebalance load

**Q:** Why do cross-shard queries become expensive, and what three techniques minimize them?
**A:** A query aligned with the shard key (e.g. "get user 12345's profile") hits one shard and is fast. A query that doesn't align (e.g. "top 10 most popular posts globally") has to query *every* shard, wait for all responses, and merge results — turning one query into potentially dozens of network calls.

- **Cache the results** — especially effective for queries tolerant of eventual consistency, like trending content or leaderboards; the first query is expensive, subsequent ones hit the cache
- **Denormalize to keep related data together** — duplicate some data onto the shard where it's most commonly queried alongside, trading update complexity for single-shard reads
- **Accept the hit for genuinely rare queries** — an admin dashboard loaded a few times a day can tolerate being slow

> If you find yourself saying "we'll query all shards and aggregate the results" for a common use case, pause and consider whether you can denormalize, cache, or precompute it instead.

**Q:** Why does sharding break simple database transactions, and what's the standard textbook fix (and why is it usually avoided)?
**A:** When related data lives on a single database, a transaction guarantees atomicity for free. Once data is split across shards (e.g. account on shard 1, transaction record on shard 2), you're coordinating writes across independent databases that don't know about each other.

**Two-phase commit (2PC)** is the textbook fix — a coordinator asks all shards to prepare, waits for confirmation, then tells everyone to commit. It's avoided in most production systems because it's **slow and fragile**: if any shard or the coordinator fails mid-transaction, the whole system can get stuck.

**Q:** What are the three preferred alternatives to 2PC for handling multi-shard consistency?
**A:** - **Design to avoid cross-shard transactions entirely** — the best solution; keep all of a user's related data (balance, history, profile) on the same shard so every transaction is naturally single-shard
- **Sagas** — break a multi-shard operation into a sequence of steps, each with a compensating action to undo it if a later step fails (e.g. deduct from account A, credit account B, refund A if the credit fails)
- **Accept eventual consistency** — appropriate when a brief mismatch is tolerable, like a denormalized follower count that converges across shards within a few seconds

> If you find yourself constantly needing distributed transactions, you probably chose the wrong shard key or the wrong shard boundaries.

**Q:** What three concrete, quantified signals should prompt bringing up sharding in an interview?
**A:** - **Storage** — e.g. "500M users × 5KB each = 2.5TB; fine on a single Postgres instance today, but 10x growth would require sharding"
- **Write throughput** — e.g. "50K writes/sec at peak will overwhelm a single database"
- **Read throughput** — e.g. "100M daily active users making multiple queries each will exceed what read replicas alone can handle"

*Formula:* identify the bottleneck → explain why a single database won't scale → propose sharding.

> By far the number one sharding mistake in interviews is introducing sharding before proving it's necessary. Slow down, do the math, and make sure sharding is actually needed.

**Q:** What are the four steps for walking through a sharding strategy out loud in an interview?
**A:** 1. **Propose a shard key based on access patterns** — e.g. "most queries are user-centric, so I'd shard by `user_id`"
2. **Choose the distribution strategy** — e.g. "hash-based sharding with consistent hashing, to distribute users evenly"
3. **Call out the trade-offs** — e.g. "global queries like 'trending posts across all users' become expensive; I'd cache and precompute that instead of querying live"
4. **Address how you'll handle growth** — e.g. "start with 64 shards; consistent hashing means adding more later only moves a fraction of the data"

**Q:** How do real distributed databases (Cassandra, DynamoDB, MongoDB) differ in how they actually implement sharding under the hood?
**A:** - **Cassandra** — uses a partitioner (e.g. Murmur3Partitioner) with virtual nodes, a form of consistent hashing mapping keys to token ranges
- **DynamoDB** — hashes the partition key to route items internally, splitting/merging partitions as they grow; not classic ring-based consistent hashing exposed to users
- **MongoDB** — shards into range-based chunks on the shard key (or ranges over the hash space if using a hashed key), with a background balancer automatically splitting/migrating chunks

*Interview takeaway:* you generally don't need to implement sharding internals — it's enough to say "We'll use DynamoDB with `user_id` as the partition key" unless specifically asked to go deeper.

## Consistent Hashing
Bucket: Core Concepts
Link: https://www.hellointerview.com/learn/system-design/core-concepts/consistent-hashing

**Q:** Why does simple modulo hashing (hash(key) % N) break down when nodes are added or removed?
**A:** Changing `N` changes the modulo result for almost every key, not just the ones that should move. Adding a 4th database or losing one causes massive unnecessary data movement across the entire cluster, spiking load everywhere at once.

**Q:** How does the hash ring solve this, and how much data actually moves when a node is added or removed?
**A:** Servers and keys are placed on a circular hash space; a key belongs to the first server found moving **clockwise** from its hash position.

- **Adding a node** — only keys between the new node and its counter-clockwise neighbor move; everything else stays put
- **Removing a node** — only that node's keys move, to its next clockwise neighbor; everything else is untouched

This bounds data movement to a small fraction of the dataset, instead of nearly all of it.

**Q:** What are virtual nodes, and what problem do they solve?
**A:** Each physical server is hashed multiple times under different name variants (e.g. `"DB1-vn1"`, `"DB1-vn2"`), giving it many scattered positions on the ring instead of one.

This fixes the **uneven failover load** problem: without virtual nodes, a failed server's entire load dumps onto one lucky neighbor; with them, the load scatters across many neighbors at once. It also helps new nodes absorb load from multiple existing servers immediately, rather than just one.

**Q:** What is a hot spot, and why doesn't consistent hashing solve it on its own?
**A:** A node getting disproportionate **traffic** because some keys are simply more popular than others (e.g. a celebrity's data). Consistent hashing only distributes *keys* evenly — it has no concept of which keys will be hit more often.

Fixes: **read replicas** for popular keys (most common), **key-space salting** (append a random suffix so one hot key spreads across several nodes), or **adaptive rebalancing** (some systems, like DynamoDB, do this automatically).

**Q:** Does consistent hashing itself move data when a node fails?
**A:** No — it only defines where data *should* live. Real systems pair it with **replication** to avoid data movement on failure entirely: DynamoDB replicates each partition across availability zones and promotes a replica via consensus (e.g. Raft) when a primary dies. Data movement only happens on *planned* changes, like adding capacity, and even then only a bounded fraction of keys are affected.

**Q:** When should you go deep on consistent hashing in an interview vs. just naming it?
**A:** For most interviews using a managed system (DynamoDB, Cassandra), it's enough to say it uses consistent hashing under the hood. Go deep only in **infrastructure-focused interviews** asking you to design a distributed database, cache, or message broker from scratch — where you should be ready to explain the ring, virtual nodes, failure handling, and hot spot mitigation.

## CAP Theorem
Bucket: Core Concepts
Link: https://www.hellointerview.com/learn/system-design/core-concepts/cap-theorem

**Q:** What does CAP theorem state, and why does it really boil down to a single choice in practice?
**A:** In a distributed system you can only guarantee two of three properties: **Consistency** (all nodes see the same data at the same time), **Availability** (every request to a non-failing node gets a response), and **Partition Tolerance** (the system keeps working despite network failures between nodes).

Since partition tolerance is non-negotiable in any real distributed system, the practical choice always comes down to: **when a partition happens, do you prioritize consistency or availability?**

**Q:** What is the single diagnostic question for choosing between consistency and availability?
**A:** "Would it be catastrophic if users briefly saw inconsistent data?" If yes, choose **consistency**. If not, choose **availability**.

- *Choose consistency:* ticket booking (prevents double-booking a seat), inventory (prevents overselling the last unit), financial/trading systems (stale prices cause bad trades)
- *Choose availability:* social media profile updates, content descriptions, review site info — a few seconds/minutes of staleness is harmless

**Q:** What design choices typically accompany each priority?
**A:** - **Consistency-first** — distributed transactions (e.g. two-phase commit) or a single-node database; both trade scalability/latency for a guaranteed single source of truth. *Technologies:* PostgreSQL/MySQL, Google Spanner, DynamoDB in strong consistency mode.
- **Availability-first** — asynchronous read replicas and Change Data Capture (CDC) to propagate updates in the background while staying responsive. *Technologies:* Cassandra, DynamoDB multi-AZ, Redis clusters.

**Q:** Can consistency requirements vary within a single system, and what's an example?
**A:** Yes — real systems often need different consistency models per feature. **Ticketmaster** needs strong consistency for booking a seat (prevents double-booking) but can prioritize availability for browsing event details (a stale description is fine). Same logic applies to **Tinder**: matching needs consistency, viewing a profile doesn't.

> "I'll prioritize consistency for booking transactions but optimize for availability when users are just browsing."

**Q:** What's the difference between strong consistency and eventual consistency, and where do the in-between models fit?
**A:** **Strong consistency** — every read reflects the most recent write; needed for things like bank balances. **Eventual consistency** — the system converges over time but may be briefly inconsistent; this is the default in most distributed databases and what you're implicitly accepting whenever you choose availability.

In between: **causal consistency** (dependent events, like a comment and its post, stay in order) and **read-your-own-writes** (you always see your own updates immediately, even if others see a slightly older version) — both useful nuances for senior-level discussions, but rarely need to be named explicitly in most interviews.

## Numbers to Know
Bucket: Core Concepts
Link: https://www.hellointerview.com/learn/system-design/core-concepts/numbers-to-know

**Q:** Modern Hardware — How much memory and CPU does one modern instance have?
**A:** **512 GiB and 128 vCPUs** on a general-purpose M6i.32xlarge.

Memory-optimized goes far past that: **4TB** on an X1e.32xlarge, **24TB** on a U-24tb1.metal. Many workloads that once demanded a distributed system now fit on a single machine.

**Q:** Modern Hardware — How much storage can one instance hold?
**A:** **60TB of local SSD** (i3en.24xlarge), or **336TB of HDD** (D3en.12xlarge) for data-heavy workloads. Object storage like S3 is effectively unlimited — petabyte-scale is standard practice.

Storage as a primary design constraint is largely behind us.

**Q:** Modern Hardware — What is the network latency ladder within and across regions?
**A:** - **Same AZ:** sub-1ms
- **Cross-AZ, same region:** 1–2ms
- **Cross-region:** 50–150ms

Bandwidth is **25 Gbps** standard, **50–100 Gbps** on high-performance instances; cross-AZ bandwidth inside a region is capped only by instance capacity.

**Q:** Caching — What latency should I assume for a modern in-memory cache?
**A:** **Reads: <1ms** within the same region. **Writes: <1ms same-AZ**, **1–2ms cross-AZ** in the same region.

Use ~1ms as your working figure for a cache round trip — set against **1–5ms** for a cached DB read and **5–30ms** from disk.

**Q:** Caching — How much data can a single cache instance realistically hold?
**A:** **Up to 1TB** on memory-optimized instances.

That is enough to hold an entire mid-sized dataset in memory, which is why "cache everything" is usually the right call. Past ~1TB the pain is operational — backup, replication, recovery — not capacity.

**Q:** Caching — What throughput can a single cache instance handle?
**A:** **100k–200k+ ops/sec per instance** (ElastiCache Redis on Graviton; reads and writes roughly equal for simple ops).

~1M ops/sec is reachable with small values on tuned nodes, but quote the **100k order of magnitude**. Redis is single-threaded, so you go **CPU**-bound before memory-bound.

**Q:** Caching — When do you scale/shard a cache?
**A:** Any one of:

- Dataset approaching **1TB**
- Sustained **100k+ ops/sec**
- Read latency needs consistently below **0.5ms**
- Hit rate under **80%**, or memory above **80%**

The binding constraint is usually ops/sec or network bandwidth — **not** memory size.

**Q:** Caching — When should you cache only part of a dataset instead of the whole thing?
**A:** **Cache everything, whenever it fits.** With up to **1TB** of memory, datasets of hundreds of GB fit whole — and brute force costs less than the engineering time selective caching logic takes.

Go partial only when the dataset genuinely exceeds that, or when only a small hot slice is ever read.

**Q:** Databases — How much data can a single database instance hold?
**A:** **64 TiB** for most engines, **256 TiB** on Aurora.

The sharding signal sits near **50 TiB**, but raw volume is rarely what forces it — backup windows stretching into hours, or a need for geographic distribution, usually bite first.

**Q:** Databases — What read latency should you assume for indexed database lookups?
**A:** **1–5ms for cached data, 5–30ms from disk** on indexed lookups. Write commit latency is **5–15ms** single-node.

Candidates badly overestimate SSD latency. An indexed row lookup is already fast, which is why fronting one with a cache buys nothing — cache *expensive* queries instead.

**Q:** Databases — What write throughput can a single-node database handle before scaling concerns?
**A:** **Writes: 10–20k TPS. Reads: up to 50k TPS.** Single-node Aurora/RDS. Plus **5–20k concurrent connections**, depending on engine and instance type.

Consistently exceeding **10k write TPS** is the signal to start considering how you'll scale.

**Q:** Databases — When do you actually need to shard a database?
**A:** Five signals, only one of which is size:

- Dataset approaching **50 TiB**
- Write throughput consistently over **10k TPS**
- Uncached read latency needed below **5ms**
- Cross-region replication or geographic distribution
- Backup windows stretching into hours

Premature sharding is the single most common interview mistake — do the math first.

**Q:** Databases — Does having read replicas mean you have high availability?
**A:** No — and a "single instance" isn't a single point of failure either. You still run a **primary with read replicas** and multi-AZ failover (e.g. Aurora).

The distinction that matters: **replication for availability is a separate concern from horizontal partitioning for scale.** Needing HA is not a reason to shard.

**Q:** Application Servers — How many concurrent connections can one app server instance handle?
**A:** **100k+ concurrent connections per instance** for optimized configurations.

Connection limits are rarely the first bottleneck — **CPU** hits its ceiling first. Long-lived or CPU-heavy connections push the number well below 100k, so qualify the connection type rather than quoting it blind.

**Q:** Application Servers — What’s the first bottleneck on app servers, CPU or memory?
**A:** **CPU, almost always.** A modern instance carries 8–64 cores and 64–512GB of memory (up to 2TB), so memory and connection limits rarely bind first.

So don't shy away from memory-hungry optimizations — local caching, in-memory computation, session handling. Memory leads only for very large responses or a leak.

**Q:** Application Servers — When do you horizontally scale app servers?
**A:** Four signals:

- **CPU utilization** consistently above **70–80%**
- **Response latency** exceeding SLA or critical thresholds
- **Memory usage** trending above **70–80%**
- **Network bandwidth** approaching instance limits (25 Gbps standard)

Containerized apps start in **30–60s**, so aggressive auto-scaling beats over-provisioning.

**Q:** Message Queues — What throughput can a single Kafka broker handle?
**A:** **Up to 1 million messages/sec per broker** in modern configurations, with **up to 50TB storage per broker** and retention of weeks to months.

Scale when throughput nears **800k msgs/sec** per broker, partitions approach **~200k per cluster**, or consumer lag grows consistently.

**Q:** Message Queues — What latency should you assume for a message queue end-to-end?
**A:** **1–5ms end-to-end** within a region for optimized setups, handling **1KB–10MB** messages efficiently.

Sub-5ms is the number that changes the design: it is fast enough to sit inside a *synchronous* request flow — as long as there is no backlog.

**Q:** Message Queues — Should message queues be used in synchronous request flows by default?
**A:** **Yes — modern queues are fast enough.** At **1–5ms end-to-end** a queue can sit inside a synchronous request flow, giving you reliable delivery and decoupling without forcing the API to be async.

The caveat is backlog: once consumer lag grows, that latency guarantee is gone.

**Q:** Message Queues — When do you actually need a message queue?
**A:** Above **20k+ WPS** for a single Postgres instance, or when you need guaranteed delivery through downstream failure, event sourcing, spike absorption, or producer/consumer decoupling.

**Not at 5k WPS.** Try batch writes, better indexes, connection pooling or async commits first.

**Q:** Common Interview Mistakes — Candidate says 100GB of data needs sharding. Correct response?
**A:** **No.** Design Yelp: 10M businesses × 1KB = **10GB**; 10× that for reviews is still only **100GB**. One instance handles it comfortably — the shard signal is nearer **50 TiB**.

Candidates introduce a data model and immediately name a shard column. Do the arithmetic first.

**Q:** Common Interview Mistakes — LeetCode leaderboard, 100k competitions × 100k users. Shard the cache?
**A:** **No.** 100k × 100k × (36B ID + 4B float rating) = **400GB**.

That is more than Yelp keeps on disk, and it still fits on one large cache instance (up to **1TB**). Do the multiplication before proposing to shard a cache.

**Q:** Common Interview Mistakes — Candidate adds a cache to speed up a simple indexed row lookup. Justified?
**A:** **No.** An indexed row lookup on SSD is already **sub-millisecond to a few ms** — the cache saves nothing and adds infrastructure to justify.

Cache **expensive queries**, not simple indexed lookups. Overestimating SSD latency is one of the most common interview errors.

**Q:** Common Interview Mistakes — Candidate adds a message queue at 5k writes/sec. Justified?
**A:** **No.** A well-tuned Postgres instance handles **20k+ simple writes/sec**, so 5k is not high throughput.

What actually caps writes: multi-table transactions, write amplification from excess indexes, cascading updates, heavy concurrent reads. Reach for a queue above **~20k WPS**.

**Q:** Costs — How much should you optimize for cost in a system design interview?
**A:** **Don't memorize pricing tables.** Interviewers aren't sensitive to exact dollars, and real pricing needs estimates you only have to an order of magnitude anyway.

Do keep the abstract sense: 100 machines where 1 would do, or in-memory caches when hundreds of ms is fine, draws a flag.

## Real-time Updates
Bucket: Patterns
Link: https://www.hellointerview.com/learn/system-design/patterns/realtime-updates

**Q:** Real-time updates split into two independent problems — what are they?
**A:** **Hop 1 — client↔server:** how the update reaches the client (polling, long polling, SSE, WebSockets, WebRTC). **Hop 2 — source→server:** how the server *holding that connection* learns the update happened (polling a DB, consistent hashing, pub/sub).

Choose each independently — they trade off separately.

> "Two hops: how the client hears about it, and how my server hears about it."

**Q:** How does long polling work, and why does it degrade for high-frequency updates?
**A:** The client requests, the server **holds the request open** until data exists, responds, and the client immediately re-requests.

The gap is the cost: at 100ms RTT, two updates 10ms apart land at 100ms and up to **290ms** — the client has to call back before it can receive the next one.

**Q:** What's the one infrastructure detail you must call out when proposing long polling?
**A:** Every hop must tolerate the hold time — a load balancer that times out at 30s will hang up on a client your server was happily holding for 60s. **15–30s is the safe interval.**

It also makes monitoring painful, since requests legitimately sit open for a long time.

**Q:** What HTTP mechanism makes SSE possible, and how does it differ from a normal response?
**A:** A normal response sends `Content-Length` and is one atomic body.

SSE sends **`Transfer-Encoding: chunked`** — the client is told to expect a series of chunks of unknown count and size, so the server can write one update, keep the request open, and write more later.

**Q:** What's the nastiest SSE failure mode in real infrastructure?
**A:** A proxy or load balancer that **doesn't support streaming will buffer the whole response** instead of forwarding chunks — your stream silently stops working until the request completes, with no error to point at.

Opaque and painful to debug; verify every hop supports streaming.

**Q:** Why do persistent WebSocket connections make deployments painful, and what is the standard architectural fix?
**A:** Redeploying a server severs every connection it holds, forcing mass reconnection — prefer that over migrating connections, it's simpler.

Fix: **terminate WebSockets in a dedicated WebSocket service** behind an L4 load balancer. It rarely deploys, so it rarely churns connections, and the rest of the system stays stateless.

**Q:** What's the common pattern that lets you avoid WebSockets even when clients need to write?
**A:** **SSE for the downstream updates, plain HTTP POST/PUT for the writes.** WebSockets only earn their complexity when writes are *high-frequency*; occasional writes can just be separate requests.

> "I'd default to SSE and do writes over POST unless write volume actually justifies a duplex connection."

**Q:** With a polling-based second hop, what load number do candidates forget to compute?
**A:** The read volume on the store. The update source writes to a DB and clients poll it — decoupled and dead simple, but **1M clients polling every 10s is 100K reads/sec**, entirely from clients asking "anything new?"

Do that math before calling polling cheap.

**Q:** To push a message to User C, how do you find which server holds their connection?
**A:** Make ownership deterministic — hash the user ID to a server, with **ZooKeeper or etcd** holding the server list so every node agrees. A client that connects elsewhere gets redirected to its owner, which keeps a map of user → open connection.

Use **consistent hashing**, not `% N`, so scaling doesn't move every connection.

**Q:** What has to happen during a scaling event for a consistent-hash connection layer?
**A:** Record **both old and new assignments**, drain clients off the old servers gradually so they reconnect to their new owner, then commit the new mapping.

In the interim, **send messages to both the old and new server** so nothing is lost mid-transition.

**Q:** How does a pub/sub second hop work, and why can a client connect to any server?
**A:** Because the routing state lives in the pub/sub service (Redis/Kafka), not in the servers.

A client connects to any **endpoint server**; that server subscribes to the client's topic — often one topic per user — and forwards published messages down the existing connection.

**Q:** How do you choose between consistent hashing and pub/sub for the second hop?
**A:** **How much state each connection carries.**

- **Heavy per-connection state** (a Google Docs document: pending ops, collaborator sync) → consistent hashing pins it to one server, and scaling only rebuilds a fraction of it.
- **Just forwarding small messages** → pub/sub; state lives in the broker and endpoint servers stay interchangeable.

**Q:** What do you lose by putting a pub/sub service in the second hop?
**A:** - **No connection visibility** — the broker doesn't know whether a subscriber is still connected, or when it drops.
- **Bottleneck and SPOF** — scaled by sharding subscriptions across a Redis cluster, which then creates **many-to-many** connections between brokers and endpoint servers.
- One extra hop of latency (<10ms).

**Q:** How do you detect a dead real-time connection and recover the updates missed while it was down?
**A:** A WebSocket can break without either side noticing — **heartbeats** catch these "zombie" connections.

For recovery, track what each client has received via **sequence numbers** or a per-user queue (Redis streams is the popular choice), and replay from the last acknowledged ID on reconnect.

**Q:** How do you keep message ordering consistent across distributed real-time servers, and what is the interview-appropriate answer?
**A:** **Funnel related messages through a single server or partition** — a local timestamp then gives you a total order for free, trading some scalability for consistency.

Vector clocks and logical timestamps exist, but they're deep-infra territory — don't reach for them on a product question like an online auction.

## Scaling Reads
Bucket: Patterns
Link: https://www.hellointerview.com/learn/courses/system-design/lesson/scaling-reads/scaling-reads

**Q:** At what read volume do you stop tuning the database and add a cache or replicas?
**A:** Above roughly **50,000–100,000 read requests/sec**, assuming you already have proper indexing.

Rough, and it moves with read patterns, data model and hardware — but in an interview a rough number is what justifies the decision.

**Q:** What is a materialized view, and what does it buy you for read scaling?
**A:** A precomputed, stored result of an expensive aggregation, refreshed by a **background job** rather than recalculated per request.

Instead of averaging every review on each product page load, compute `AVG(rating)` once and read it. Strongest for analytics queries over large datasets.

**Q:** Why is sharding usually the wrong answer to a read-scaling problem?
**A:** Sharding is primarily a **write**-scaling technique. It does help reads — smaller datasets per query, load spread across servers — but it buys that with major operational complexity.

For read load, **caching and read replicas are both more effective and far easier** to implement.

**Q:** What is the tradeoff between synchronous and asynchronous replication?
**A:** **Synchronous** waits for replicas to confirm — consistent, but every write pays the latency. **Asynchronous** acknowledges immediately — fast, but replicas trail, so a user may not see their own write.

Either way replicas double as redundancy: promote one to primary when the primary fails.

**Q:** How much does vertical scaling actually buy you, and how should you raise it in an interview?
**A:** SSDs over spinning disks give **10–100× faster random I/O**; more RAM keeps more of the dataset out of disk reads; more cores serve more concurrent queries.

Worth one sentence — it is often the fastest breathing room — but it sidesteps the question, so don't dwell there.

**Q:** What should actually determine your cache TTL?
**A:** The **non-functional staleness requirement**. "Search results no more than 30 seconds stale" *is* your TTL.

In practice: short TTLs (**5–15 min**) as a safety net, plus active invalidation for anything critical like profiles or inventory. Low-stakes data like recommendation scores can ride on TTL alone.

**Q:** How does cache versioning work?
**A:** The record carries a **version column, incremented in the same DB transaction as the write**. Reads take two hops: fetch the current version from a small version key, then read `event:123:v42`.

A write commits `v43` and readers move there on their own. Old entries are never deleted — they just become unreachable.

**Q:** What problem does cache versioning solve that delete-on-write does not?
**A:** The **repopulation race**. After a delete, a reader that missed can fetch stale data — often from a lagging replica — and write it back into the live key, poisoning it for everyone.

With versioning a stale reader can only touch `v42`, never the current `v43`. No invalidation broadcast, no guessing which layer to purge.

**Q:** What are the tradeoffs of cache versioning?
**A:** - **Two cache lookups per request** — version, then data
- **Old versions accumulate**, since nothing is deleted; you still need TTLs to reclaim them
- **Only helps single-entity caches** (user profiles, product details) — no use for feeds or search results, where invalidation is inherently harder

**Q:** What is a deleted items cache, and when do you reach for one?
**A:** A **small, fast cache of recently deleted or hidden IDs**. Serve the cached feed as-is, then filter the results against that set.

It lets you keep serving mostly-correct cached feeds immediately while proper invalidation of the big structures happens in the background — ideal for moderation and privacy changes.

**Q:** What should you never put in a CDN cache, and why?
**A:** **User-specific data** — preferences, private messages, account settings. Only one user ever requests them, so the hit rate is zero and you gain nothing.

CDNs pay off on naturally shared content (public posts, catalogs, search results), where they can cut origin load by **90%+**.

**Q:** How much backend load does request coalescing actually save?
**A:** It bounds it at **exactly N, where N is your number of application servers** — one rebuild each — whether 1,000 or 10 million users want the key at once.

That hard bound is the reason to reach for coalescing before anything more exotic.

**Q:** What is cache key fanout, and what does it fix?
**A:** Store the same hot value under **N distinct keys** (`feed:taylor-swift:1` … `:10`) and have clients pick one at random.

500k req/sec against a single key becomes **50k across ten** — survivable. Cost: N× the memory, and invalidation now has to clear every copy.

**Q:** What is probabilistic early refresh, and why does it beat a distributed lock?
**A:** Each read carries a **rising chance of triggering a background refresh** as the entry ages — ~1% at minute 50, 5% at 55, 20% at 59 of a 60-minute TTL — so rebuilds spread across the last 10–15 minutes instead of landing at once.

A lock serializes rebuilds but leaves thousands of requests waiting on one slow rebuild.

**Q:** When should you NOT reach for read-scaling patterns?
**A:** - **Write-heavy systems** — Uber's location tracking is nearer 1:1 or 2:1; scale writes first
- **Explicitly small scale** — "design for 1000 users" needs one well-indexed database
- **Strongly consistent systems** — finance, inventory
- **Real-time collaborative apps** — caching actively *hurts* Google Docs, where every keystroke must be visible

**Q:** Read scaling and latency reduction are different problems — why does the distinction matter?
**A:** These patterns exist to reduce **database load**. If the database is handling the load fine and you simply want lower latency, that is a different problem with different tools — edge compute, service-mesh tuning.

Diagnose which one you actually have before proposing replicas or a cache.
