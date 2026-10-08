// The demo deck. Written for the demo in the house style — one fact per card;
// flashcard answers 250–450 characters, answer first — and in original wording
// throughout, since it ships to anyone who opens the demo: no course material,
// nothing paraphrased from a paid source. Cards may *link* to sources — DSA to
// the LeetCode problem, System Design to the Hello Interview article on the
// topic — since a link reproduces nothing.

export type DemoDomainId = 'dsa' | 'system_design' | 'aws';

export interface DemoCard {
  domain: DemoDomainId;
  /** The problem title, or the question. */
  name: string;
  /** Flashcards: the answer (markdown). DSA: a one- or two-line approach note. */
  answer: string;
  metadata: Record<string, string>;
  /** DSA: the problem's page. */
  link?: string;
  /** How hard the simulated learner finds it — sets how often they struggle. */
  difficulty: 'easy' | 'medium' | 'hard';
  /**
   * Cards outside the simulated history: 'new' was added yesterday and never
   * reviewed (due today, so the queue shows a New card), 'today' was added
   * and first reviewed this morning (so History has an "added today" row).
   */
  stage?: 'new' | 'today';
}

const leetcode = (slug: string) => `https://leetcode.com/problems/${slug}/`;

const DSA: DemoCard[] = [
  {
    domain: 'dsa', name: 'Two Sum', difficulty: 'easy', link: leetcode('two-sum'),
    metadata: { difficulty: 'Easy', platform: 'LeetCode', question_list: 'NeetCode 150', pattern_tag: 'Hash Map' },
    answer: 'One pass with a map from value to index: for each number, check whether `target − n` is already in the map. O(n) time, O(n) space.',
  },
  {
    domain: 'dsa', name: 'Valid Parentheses', difficulty: 'easy', link: leetcode('valid-parentheses'),
    metadata: { difficulty: 'Easy', platform: 'LeetCode', question_list: 'NeetCode 150', pattern_tag: 'Stack' },
    answer: 'Push opening brackets; a closing bracket must match the top of the stack. Valid only if every bracket matched and the stack ends empty.',
  },
  {
    domain: 'dsa', name: 'Best Time to Buy and Sell Stock', difficulty: 'easy', link: leetcode('best-time-to-buy-and-sell-stock'),
    metadata: { difficulty: 'Easy', platform: 'LeetCode', question_list: 'LeetCode 75', pattern_tag: 'Sliding Window' },
    answer: 'Track the lowest price seen so far; the answer is the largest `price − lowest` at any step. One pass, O(1) space.',
  },
  {
    domain: 'dsa', name: 'Longest Substring Without Repeating Characters', difficulty: 'medium', link: leetcode('longest-substring-without-repeating-characters'),
    metadata: { difficulty: 'Medium', platform: 'LeetCode', question_list: 'NeetCode 150', pattern_tag: 'Sliding Window' },
    answer: "Grow the window to the right; on a repeat, jump the left edge past that character's last index (keep a map of last positions). Track the widest window.",
  },
  {
    domain: 'dsa', name: 'Product of Array Except Self', difficulty: 'medium', link: leetcode('product-of-array-except-self'),
    metadata: { difficulty: 'Medium', platform: 'LeetCode', question_list: 'LeetCode 75', pattern_tag: 'Prefix Sum' },
    answer: 'Write prefix products left to right into the output, then multiply each slot by a running suffix product right to left. No division needed.',
  },
  {
    domain: 'dsa', name: 'Top K Frequent Elements', difficulty: 'medium', link: leetcode('top-k-frequent-elements'),
    metadata: { difficulty: 'Medium', platform: 'LeetCode', question_list: 'NeetCode 150', pattern_tag: 'Bucket Sort' },
    answer: 'Count with a map, then bucket numbers by their count (index = frequency) and read the buckets from the top until you have k. O(n), no heap needed.',
  },
  {
    domain: 'dsa', name: 'Group Anagrams', difficulty: 'medium', link: leetcode('group-anagrams'),
    metadata: { difficulty: 'Medium', platform: 'LeetCode', question_list: 'NeetCode 150', pattern_tag: 'Hash Map' },
    answer: 'Key each word by its sorted letters (or a 26-slot letter count); words that share a key are anagrams of each other.',
  },
  {
    domain: 'dsa', name: 'Number of Islands', difficulty: 'medium', link: leetcode('number-of-islands'),
    metadata: { difficulty: 'Medium', platform: 'LeetCode', question_list: 'LeetCode 75', pattern_tag: 'Graph DFS' },
    answer: "Scan the grid; every unvisited land cell starts a DFS or BFS that marks its whole island visited. The number of starts is the answer.",
  },
  {
    domain: 'dsa', name: 'Course Schedule', difficulty: 'medium', link: leetcode('course-schedule'),
    metadata: { difficulty: 'Medium', platform: 'LeetCode', question_list: 'NeetCode 150', pattern_tag: 'Topological Sort' },
    answer: 'Prerequisites form a directed graph, and you can finish only if it has no cycle. Kahn’s algorithm: keep taking courses with no remaining prerequisites; if all get taken, there was no cycle.',
  },
  {
    domain: 'dsa', name: 'Coin Change', difficulty: 'hard', link: leetcode('coin-change'),
    metadata: { difficulty: 'Medium', platform: 'LeetCode', question_list: 'LeetCode 75', pattern_tag: 'Dynamic Programming' },
    answer: '`dp[a]` = fewest coins that make amount `a` = 1 + min over coins `c` of `dp[a − c]`, with `dp[0] = 0`. Fill bottom-up to the target; unreachable stays infinite.',
  },
  {
    domain: 'dsa', name: 'Merge Intervals', difficulty: 'medium', link: leetcode('merge-intervals'),
    metadata: { difficulty: 'Medium', platform: 'LeetCode', question_list: 'NeetCode 150', pattern_tag: 'Intervals' },
    answer: 'Sort by start. Extend the last merged interval while the next one starts before it ends; otherwise start a new interval.',
  },
  {
    domain: 'dsa', name: 'Median of Two Sorted Arrays', difficulty: 'hard', link: leetcode('median-of-two-sorted-arrays'), stage: 'new',
    metadata: { difficulty: 'Hard', platform: 'LeetCode', question_list: 'NeetCode 150', pattern_tag: 'Binary Search' },
    answer: 'Binary-search a cut in the shorter array so the two left halves hold half of all elements and every left value ≤ every right value. O(log(min(m, n))).',
  },
];

const sd = (bucket: string, topic: string) => ({ sd_category: bucket, sd_topic: topic });

// The Hello Interview article for each topic — pages the real deck already
// links to. Topics without their own article point at the overview page.
const HELLO_INTERVIEW = 'https://www.hellointerview.com/learn/system-design';
const ARTICLE: Record<string, string> = {
  'Caching': `${HELLO_INTERVIEW}/core-concepts/caching`,
  'Sharding': `${HELLO_INTERVIEW}/core-concepts/sharding`,
  'Consistent Hashing': `${HELLO_INTERVIEW}/core-concepts/consistent-hashing`,
  'CAP Theorem': `${HELLO_INTERVIEW}/core-concepts/cap-theorem`,
  'Database Indexing': `${HELLO_INTERVIEW}/core-concepts/db-indexing`,
  'Real-time Updates': `${HELLO_INTERVIEW}/patterns/realtime-updates`,
  'Load Balancing': `${HELLO_INTERVIEW}/core-concepts/networking-essentials`,
  'Rate Limiting': `${HELLO_INTERVIEW}/in-a-hurry/patterns`,
  'Idempotency': `${HELLO_INTERVIEW}/in-a-hurry/patterns`,
  'Message Queues': `${HELLO_INTERVIEW}/in-a-hurry/patterns`,
  'Redis': `${HELLO_INTERVIEW}/in-a-hurry/key-technologies`,
  'Kafka': `${HELLO_INTERVIEW}/in-a-hurry/key-technologies`,
};

const SYSTEM_DESIGN_CARDS: DemoCard[] = [
  {
    domain: 'system_design', difficulty: 'easy', metadata: sd('Core Concepts', 'Caching'),
    name: 'What is the cache-aside pattern, and what happens on a miss?',
    answer: 'The application manages the cache itself: it checks the cache first, and on a miss reads the database, stores the result in the cache, then returns it. Writes go to the database and delete the cached key. It’s simple and safe — losing the cache loses no data — but the first read after a miss is slow, and many simultaneous misses can flood the database.',
  },
  {
    domain: 'system_design', difficulty: 'medium', metadata: sd('Core Concepts', 'Caching'),
    name: 'What is a cache stampede, and how do you prevent one?',
    answer: 'Many requests miss the same hot key at once — typically right after it expires — and all hit the database together. Two fixes: **request coalescing**, where one request rebuilds the value while the others wait for it, and **early or jittered expiry**, refreshing a hot key shortly before its TTL so it never expires under load.',
  },
  {
    domain: 'system_design', difficulty: 'medium', metadata: sd('Core Concepts', 'Sharding'),
    name: 'How do you choose a shard key?',
    answer: 'Pick the field your main queries filter on, so a typical request touches one shard, with enough distinct values to spread load evenly — `user_id` is the classic choice. Avoid keys that funnel writes to one place, like a timestamp (every new row lands on the newest shard) or a low-cardinality field such as country.',
  },
  {
    domain: 'system_design', difficulty: 'hard', metadata: sd('Core Concepts', 'Consistent Hashing'),
    name: 'Why use consistent hashing instead of hash(key) mod N?',
    answer: 'With mod N, adding or removing one node changes the owner of almost every key, forcing a near-total reshuffle. Consistent hashing puts nodes and keys on a ring, and each key belongs to the next node clockwise, so a membership change moves only about 1/N of the keys. Virtual nodes — many ring positions per server — keep the load even.',
  },
  {
    domain: 'system_design', difficulty: 'hard', metadata: sd('Core Concepts', 'CAP Theorem'),
    name: 'What does the CAP theorem actually make you choose?',
    answer: 'During a network partition, a distributed store must either refuse some requests to stay consistent (CP) or keep answering with possibly stale data (AP); without a partition you get both. So the real question, feature by feature, is which is worse when nodes can’t talk: a wrong answer or no answer? Payments lean CP; a like counter leans AP.',
  },
  {
    domain: 'system_design', difficulty: 'medium', metadata: sd('Core Concepts', 'Database Indexing'),
    name: 'Why does column order matter in a composite index?',
    answer: 'A B-tree on (a, b) is sorted by `a` first, then by `b` within each `a`. It serves queries filtering on `a`, or on `a` and `b` — but not on `b` alone, whose values are scattered across the whole tree. Put the column you always filter on first; a range or sort column usually goes last, so it can be read in order.',
  },
  {
    domain: 'system_design', difficulty: 'easy', metadata: sd('Core Concepts', 'Database Indexing'),
    name: 'What does adding an index cost?',
    answer: 'Each index is another structure the database must update on every insert, update and delete, so writes slow down and storage grows — sometimes by nearly the size of the table. Indexes pay off on columns you often filter, join or sort by; on a write-heavy table that is rarely queried, every extra index is pure overhead.',
  },
  {
    domain: 'system_design', difficulty: 'medium', metadata: sd('Patterns', 'Rate Limiting'),
    name: 'How does a token bucket rate limiter work?',
    answer: 'Each client gets a bucket that refills at a fixed rate, up to a maximum size. A request spends one token; with none left it’s rejected with HTTP 429. The refill rate sets the sustained limit and the bucket size sets how large a burst is allowed. Keep the buckets in a shared store such as Redis so every server enforces the same limit.',
  },
  {
    domain: 'system_design', difficulty: 'easy', metadata: sd('Patterns', 'Idempotency'), stage: 'today',
    name: 'What is an idempotency key?',
    answer: 'A unique ID the client attaches to a request that must not happen twice, such as a payment. The server records each key with its result, so a retry carrying the same key gets the stored result back instead of being processed again. It makes retrying safe after a timeout, when the client can’t tell whether the first attempt went through.',
  },
  {
    domain: 'system_design', difficulty: 'medium', metadata: sd('Patterns', 'Real-time Updates'),
    name: 'When is polling a better choice than WebSockets?',
    answer: 'When updates aren’t latency-critical. Polling every few seconds is stateless, passes through any proxy or load balancer, and needs no connection management; WebSockets earn their extra complexity only for frequent, two-way, low-latency traffic like chat or multiplayer games. Server-Sent Events sit in between: one-way server push over plain HTTP.',
  },
  {
    domain: 'system_design', difficulty: 'easy', metadata: sd('Patterns', 'Message Queues'),
    name: 'Why put a message queue between two services?',
    answer: 'It decouples them: the producer hands off work and returns at once, and consumers process it at their own pace. That absorbs traffic spikes, stops a slow or failing consumer from blocking the producer, and lets you scale by adding consumers. The cost is that work becomes asynchronous, so consumers must tolerate retries and duplicate messages.',
  },
  {
    domain: 'system_design', difficulty: 'easy', metadata: sd('Key Technologies', 'Redis'),
    name: 'Why is Redis so fast?',
    answer: 'It keeps all data in memory and runs commands on a single thread, so most operations finish well under a millisecond with no locking. Built-in structures — hashes, sorted sets, streams — turn jobs like counters, leaderboards and rate limits into one atomic command. Disk persistence is optional, so treat it as a cache unless it’s configured for durability.',
  },
  {
    domain: 'system_design', difficulty: 'hard', metadata: sd('Key Technologies', 'Kafka'),
    name: 'What ordering does Kafka guarantee?',
    answer: 'Only within a partition. A topic is split into partitions, each an append-only log read by one consumer per group at a time, so events that must stay in order need the same key (say, `order_id`) to land in the same partition. Partitions are also the unit of parallelism: a group can’t usefully run more consumers than there are partitions.',
  },
  {
    domain: 'system_design', difficulty: 'medium', metadata: sd('Key Technologies', 'Load Balancing'), stage: 'new',
    name: 'What is the difference between an L4 and an L7 load balancer?',
    answer: 'An **L4** balancer routes by IP and port and forwards TCP connections without reading them — fast, protocol-agnostic, good for long-lived connections. An **L7** balancer understands HTTP, so it can route by path, header or cookie, terminate TLS and retry failed requests, at the cost of more work per request. Most web APIs sit behind an L7 balancer.',
  },
];

const SYSTEM_DESIGN = SYSTEM_DESIGN_CARDS.map(card => ({ ...card, link: ARTICLE[card.metadata.sd_topic] }));

const aws = (topic: string) => ({ aws_cert: 'Cloud Practitioner', topic });

const AWS: DemoCard[] = [
  {
    domain: 'aws', difficulty: 'medium', metadata: aws('Compute'),
    name: 'How do EC2 On-Demand, Reserved and Spot pricing differ?',
    answer: '- **On-Demand** — pay by the second, no commitment; for spiky or short-lived work.\n- **Reserved / Savings Plans** — commit to 1 or 3 years for up to ~72% off steady workloads.\n- **Spot** — spare capacity at up to ~90% off, but AWS can reclaim it with two minutes’ notice, so only for interruptible jobs like batch processing.',
  },
  {
    domain: 'aws', difficulty: 'easy', metadata: aws('Compute'),
    name: 'What does AWS Lambda charge for, and when does it fit?',
    answer: 'You pay per request and per millisecond of run time, scaled by the memory you allocate — nothing while it’s idle. It suits short, event-driven tasks (an upload triggers a thumbnail, an API call runs a function) of up to 15 minutes each. Long-running or constantly busy workloads are usually cheaper on EC2 or containers.',
  },
  {
    domain: 'aws', difficulty: 'medium', metadata: aws('Compute'),
    name: 'When would you run ECS on Fargate instead of on EC2?',
    answer: 'Fargate runs your containers without servers to manage: you set CPU and memory per task and AWS provides the capacity. Choose it to skip patching, scaling and right-sizing instances. ECS on EC2 gives you more control and can cost less at steady, high utilization, or when you need particular instance types such as GPUs.',
  },
  {
    domain: 'aws', difficulty: 'medium', metadata: aws('Storage'),
    name: 'How do S3 Standard, Standard-IA and Glacier differ?',
    answer: '- **Standard** — frequently read data, millisecond access, highest storage price.\n- **Standard-IA** — rarely read data: cheaper storage, but a per-GB retrieval fee and a 30-day minimum.\n- **Glacier** — archives: cheapest storage, retrieval from milliseconds to hours depending on tier.\n\nLifecycle rules move objects between them automatically.',
  },
  {
    domain: 'aws', difficulty: 'easy', metadata: aws('Storage'),
    name: 'EBS, EFS or S3 — which is which?',
    answer: '- **EBS** — a block volume attached to an EC2 instance in one Availability Zone, like a local disk.\n- **EFS** — a shared file system that many instances mount at once, across AZs.\n- **S3** — object storage over HTTP, effectively unlimited and cheapest per GB.\n\nChoose by access pattern: one server’s disk, shared files, or objects.',
  },
  {
    domain: 'aws', difficulty: 'medium', metadata: aws('Databases'),
    name: 'When do you pick RDS, and when DynamoDB?',
    answer: '**RDS** is managed relational databases (PostgreSQL, MySQL and others): SQL, joins and transactions, scaled mostly vertically plus read replicas. **DynamoDB** is a serverless key-value and document store that scales horizontally to huge throughput at single-digit-millisecond latency — but there are no joins, so you design tables around your access patterns.',
  },
  {
    domain: 'aws', difficulty: 'hard', metadata: aws('Databases'),
    name: 'What does Multi-AZ give an RDS database?',
    answer: 'A synchronous standby copy in a second Availability Zone. If the primary fails, RDS switches to the standby automatically, usually within a minute or two, keeping the same endpoint. It’s for availability, not scale: in the standard setup the standby serves no reads. To scale reads you add read replicas, which are updated asynchronously.',
  },
  {
    domain: 'aws', difficulty: 'easy', metadata: aws('Networking'),
    name: 'What makes a VPC subnet public or private?',
    answer: 'Its route table. A public subnet routes to an internet gateway, so resources with public IPs are reachable from the internet; a private subnet has no such route, which is where databases and internal services belong. Private resources can still reach out — for software updates, say — through a NAT gateway placed in a public subnet.',
  },
  {
    domain: 'aws', difficulty: 'hard', metadata: aws('Networking'),
    name: 'How does a security group differ from a network ACL?',
    answer: 'A **security group** is a stateful firewall on an instance or network interface: allow rules only, and reply traffic is let back in automatically. A **network ACL** is a stateless firewall for a whole subnet: allow and deny rules evaluated in order, and reply traffic needs its own rule. Security groups do the everyday work; NACLs add a coarse subnet-wide layer.',
  },
  {
    domain: 'aws', difficulty: 'easy', metadata: aws('Networking'),
    name: 'What does Amazon CloudFront do?',
    answer: 'It’s AWS’s content delivery network: it caches your content at edge locations around the world, so users are served from a nearby location instead of your origin. That cuts latency and the load on your servers for static files and cacheable API responses, and it adds DDoS protection and TLS termination at the edge.',
  },
  {
    domain: 'aws', difficulty: 'medium', metadata: aws('Security'),
    name: 'What is the AWS shared responsibility model?',
    answer: 'AWS secures the cloud itself — data centers, hardware, and the software that runs its managed services. You secure what you put in it — your data, IAM users and permissions, network rules, and OS patches on EC2. The line moves with the service: on EC2 you patch the operating system; on Lambda or S3, AWS does.',
  },
  {
    domain: 'aws', difficulty: 'medium', metadata: aws('Security'),
    name: 'What is the difference between an IAM user and an IAM role?',
    answer: 'An **IAM user** is an identity with long-term credentials — a password or access keys — for one person or application. An **IAM role** has no credentials of its own: a user, a service or an EC2 instance assumes it and receives short-lived credentials. Prefer roles for anything running inside AWS, so no long-lived keys sit on servers.',
  },
  {
    domain: 'aws', difficulty: 'easy', metadata: aws('Pricing and Support'),
    name: 'What does AWS mainly charge for?',
    answer: 'Three meters cover most bills: compute (how long resources run), storage (GB per month) and data transfer. Data coming into AWS is free; data going out to the internet, or between Regions, is charged. The Free Tier adds 12-month trials for new accounts plus some always-free allowances, such as a monthly quota of Lambda requests.',
  },
  {
    domain: 'aws', difficulty: 'easy', metadata: aws('Global Infrastructure'), stage: 'new',
    name: 'Region, Availability Zone, edge location — what is each?',
    answer: 'A **Region** is a geographic area, such as us-east-1, with its own isolated set of services. Each Region contains several **Availability Zones** — separate data centers with independent power and networking — so spreading across AZs survives a data-center failure. **Edge locations** are many smaller sites CloudFront and Route 53 use to serve users nearby.',
  },
];

export const DEMO_CARDS: readonly DemoCard[] = [...DSA, ...SYSTEM_DESIGN, ...AWS];
