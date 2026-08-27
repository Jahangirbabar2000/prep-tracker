# AWS — Certification Deck

Source of truth for the **AWS** domain. Add a question, then run:

```
node scripts/seed-aws.mjs
```

Re-running is safe: the domain, fields and options are reused, cards already in
the DB are matched on the exact question text, and an answer edited here is
pushed to the existing card. This file is the source of truth for answers —
edit here, not in the app, or the next run will overwrite it.

Format:

- `## <Certification>` — one of the three buckets below.
- `### <Topic>` — sub-topic within that certification.
- `**Q:** …` / `**A:** …` — one card. Answers may span multiple lines.

Certifications: `Cloud Practitioner`, `AI Practitioner`, `Developer Associate`.

**One question, one card.** A transcript pasted alongside a question is source
material for *that* answer — it does not become extra cards.

## Card style — match the newest Low-Level Design cards

That deck is the house standard. Measured against it:

- **One card, one fact.** A source with five ideas becomes five cards, never
  one long card. Recallable in one breath.
- **250–450 characters** of answer — two to four sentences. Over ~550 is a
  split, not a card.
- **Lead with the answer**, then at most one clause of *why* or of contrast
  with the neighbouring concept.
- **Bold** only the one or two phrases that must be recalled; `code` for
  identifiers and service names where it reads naturally.
- A card with 2+ distinct parts (a definition split, a tradeoff, a tiered
  model) is a short **bulleted list with a bold lead-in label** per bullet
  (`**Region:**`, `**Downside:**`) — not one run-on sentence stitched with
  semicolons. This is the System Design deck's convention; match it.
- Optional: a single `>` blockquote holding the exam-voice one-liner, or one
  short fenced block. Never both.
- **No headings** inside an answer; numbered lists only when order/count is
  itself the fact (e.g. "the six benefits").

---

## Cloud Practitioner

### Introduction to the Cloud

**Q:** What is cloud computing?
**A:** The **on-demand delivery of IT resources over the internet** with **pay-as-you-go pricing**. Nothing is bought upfront: you provision what you need the moment you need it, and stop paying the moment you deprovision it.

> "On-demand, over the internet, pay-as-you-go — that's the whole definition."

**Q:** What are the six key benefits of the AWS Cloud?
**A:**

- **Cost:** trade fixed expense for variable expense · economies of scale · stop paying to run/maintain data centers
- **Speed:** stop guessing capacity · increase speed and agility · go global in minutes

**Q:** What are AWS Regions and Availability Zones, and why spread resources across AZs?
**A:**

- **Region** — a physical location in the world holding a group of data centers.
- **Availability Zone (AZ)** — one isolated data center (or cluster) inside a Region, with its own **independent power, networking and connectivity**.

Spread resources across multiple AZs and one AZ's outage leaves your app running — that redundancy plus isolation *is* **high availability and fault tolerance**.

**Q:** What is the core split in the AWS Shared Responsibility Model?
**A:** Three tiers, not two:

- **Customer responsibility** (data, client-side encryption) → security **IN** the cloud.
- **Varies by service** (server-side encryption, network traffic protection, OS/firewall config).
- **AWS responsibility** (compute/storage/database/network software, hardware, global infra) → security **OF** the cloud.

> The middle tier is the trap — it's neither purely yours nor purely AWS's.

**Q:** Why would a company deploy to a specific AWS Region rather than one central location?
**A:** To minimize **latency** — the farther infrastructure sits from customers, the longer requests take. A company with users in Europe and Asia deploys to Regions like `eu-west-1` (Ireland) and `ap-southeast-1` (Singapore) instead of serving both from one distant Region.

### Compute in the Cloud

**Q:** What is multi-tenancy in EC2, and what keeps it safe?
**A:** Each EC2 instance is a **VM sharing one physical host** with other customers' instances. A **hypervisor** running on that host handles the resource-sharing and isolation between VMs — AWS manages the hypervisor and host entirely; you never touch that layer.

**Q:** What are the five EC2 instance-type families, and what's each one built for?
**A:**

- **General purpose** — balanced CPU/memory/network; web servers, dev environments.
- **Compute optimized** — high-performance CPU; batch processing, gaming, ML inference.
- **Memory optimized** — fast access to large in-memory datasets; real-time analytics.
- **Storage optimized** — high, consistent disk throughput; data warehousing, local caching.
- **Accelerated computing** — GPUs/FPGAs; ML training, graphics workloads.

**Q:** Why is Amazon EC2 called an "unmanaged" service, and what does that put on the customer?
**A:**

- **Unmanaged** — AWS hands you the compute; you configure and run everything above it: the guest **OS**, patching, **security groups** (firewall rules), and whatever software you install.
- **Managed** services (covered later) shift more of that operational burden onto AWS.

**Q:** What are the three ways to call AWS APIs, and who is each one good for?
**A:**

- **Console** — visual, browser-based; best for users who want an easy-to-use interface.
- **AWS CLI** — command-line, scriptable across OSes; best for advanced users automating tasks.
- **AWS SDK** — language-specific APIs inside your code; best for developers integrating AWS into applications.

**Q:** What is an AMI, and why does it matter for launching EC2 instances?
**A:** An **Amazon Machine Image** is a template — OS, storage setup, permissions, pre-installed software — used to launch an EC2 instance. One AMI can launch **many identical instances**, so every new instance starts from the same consistent, repeatable setup.

**Q:** What are the EC2 pricing options, and what's each best for?
**A:**

- **On-Demand** — pay per use, no commitment; getting started, unpredictable usage.
- **Savings Plans** — up to 72% off for a $/hr commitment (1–3yr); flexible across instance families/services.
- **Reserved Instances** — up to 75% off; steady-state, predictable workloads (1–3yr).
- **Spot** — up to 90% off spare capacity; interruptible workloads only (2-min warning).
- **Dedicated Hosts** — full physical server, you control placement; compliance/licensing needs.

**Q:** Dedicated Hosts vs. Dedicated Instances — what's the actual difference?
**A:** Both give you physical isolation from other AWS accounts.

- **Dedicated Hosts** — an entire physical server for exclusive use; you control instance placement and resource allocation.
- **Dedicated Instances** — isolation too, but **you don't pick which physical server** they run on.

**Q:** Scalability vs. elasticity — what's the actual difference?
**A:** **Scalability** is long-term capacity planning — adding resources (up or out) so a system can grow to handle more load. **Elasticity** is real-time — automatically scaling resources up *and down* to match demand right now, so you're not paying for idle capacity.

**Q:** What does Elastic Load Balancing (ELB) do, and how does it relate to EC2 Auto Scaling?
**A:** ELB is the **single point of contact** for incoming traffic, distributing it across EC2 instances. They're distinct services: **Auto Scaling** grows/shrinks the instance count; **ELB** routes traffic across however many instances currently exist.

**Q:** SQS vs. SNS — what's the actual difference?
**A:** Both decouple components, but differently.

- **SQS** — a queue; messages sit there until a consumer is ready to process them (pull).
- **SNS** — publish-subscribe; messages push out to subscribers immediately, no holding for later pickup.

### Exploring Compute Services

**Q:** Unmanaged vs. managed vs. fully-managed (serverless) — what's the control spectrum?
**A:**

- **Unmanaged** (EC2) — you configure the OS, network, and apps; AWS only handles the physical infrastructure.
- **Managed** — AWS takes on most operational overhead; you may still provision or configure some pieces.
- **Fully managed / serverless** (e.g. Lambda) — no servers to provision at all; you just write and deploy code, still responsible for securing it.

**Q:** What is AWS Lambda, and how does it run your code?
**A:** A **serverless compute service** — you write a **function**, attach a **trigger** (e.g. a new S3 upload), and Lambda runs the code only when that trigger fires. AWS handles all scaling and infrastructure; you're billed only for **compute time down to the millisecond**, never for idle capacity.

**Q:** What are ECS, EKS, ECR, and Fargate, and how do they fit together?
**A:**

- **ECR** (Elastic Container Registry) — registry; stores your container images.
- **ECS** (Elastic Container Service) — AWS's own container orchestration service (start/stop/scale containers).
- **EKS** (Elastic Kubernetes Service) — managed Kubernetes orchestration; same job as ECS, open-source Kubernetes instead.
- **Fargate** — serverless compute engine that *runs* containers for either ECS or EKS — no servers to manage.

**Q:** What are Elastic Beanstalk, AWS Batch, Lightsail, and Outposts each for?
**A:**

- **Elastic Beanstalk** — deploy code, it provisions and auto-scales the infrastructure; web apps/APIs.
- **AWS Batch** — runs large-scale batch/parallel jobs, manages the compute fleet for you.
- **Lightsail** — simplified VPS + storage + networking at a flat price; small sites, dev/test.
- **Outposts** — extends AWS into your **on-premises** data center; low latency, data residency, compliance.

### Going Global

**Q:** What is an AWS edge location, and what's it for?
**A:** A smaller-footprint facility, separate from Regions and AZs, part of AWS's global edge network. **Amazon CloudFront** (AWS's CDN) uses edge locations to cache content (images, videos, etc.) closer to users, cutting latency versus round-tripping to a central Region.

**Q:** What four factors decide which AWS Region to deploy in?
**A:**

- **Compliance** — data-residency/regulatory laws (e.g. GDPR) can dictate the Region outright, before anything else matters.
- **Proximity** — closer to your users means lower latency.
- **Feature availability** — not every service/feature is in every Region.
- **Pricing** — cost varies by Region (local tax, energy costs).

**Q:** What do high availability, agility, and elasticity each mean for AWS infrastructure?
**A:**

- **High availability** — the system keeps running through individual component failures, no significant downtime.
- **Agility** — you can adapt and deploy changes quickly.
- **Elasticity** — resources scale up/down automatically with demand.

**Q:** What is infrastructure as code, and what does CloudFormation do with it?
**A:** IaC means defining your infrastructure in a **file** instead of clicking through the console by hand. **CloudFormation** takes a declarative template (what you want, not how to build it) and provisions everything for you — deploy the same template again and you get an **identical environment**, in any account or Region.

### Networking

**Q:** What is a VPC, and what's the difference between a public and private subnet?
**A:** An **Amazon VPC** (Virtual Private Cloud) lets you provision a logically isolated section of the AWS Cloud where you can launch AWS resources in a virtual network that you define.

- **Public subnet** — internet-accessible; e.g. a customer-facing website.
- **Private subnet** — not internet-accessible; e.g. a database storing customer or transactional information.

**Q:** Internet gateway vs. virtual private gateway — what's the difference?
**A:**

- **Internet gateway** — a connection between a VPC and the internet; lets public traffic in.
- **Virtual private gateway** — lets you establish a VPN connection between your VPC and a private network, such as an on-premises data center or internal corporate network; allows traffic into the VPC only if it is coming from an approved network.

**Q:** What are AWS Client VPN, Site-to-Site VPN, PrivateLink, and Direct Connect each for?
**A:**

- **Client VPN** — connects individual remote workers/on-premises networks to AWS; fully managed, scales with demand.
- **Site-to-Site VPN** — a secure connection between your data center or branch offices and your AWS VPC.
- **PrivateLink** — privately connects your VPC to other services/VPCs without gateways, NAT, or public IPs.
- **Direct Connect** — a dedicated private connection between your network and your VPC, for consistent high bandwidth.

**Q:** Security groups vs. network ACLs — what's the difference?
**A:**

- **Security groups** — instance level, **stateful** (return traffic is automatically allowed), only-allow rules.
- **Network ACLs** — subnet level, **stateless** (every packet is checked both ways, remembers nothing), allow *and* deny rules.

**Q:** What are Route 53, CloudFront, and Global Accelerator each for?
**A:**

- **Route 53** — DNS; translates domain names to IP addresses, routes users to your app, and can register/manage domain names.
- **CloudFront** — CDN; caches content at edge locations closer to users for faster delivery.
- **Global Accelerator** — routes traffic over AWS's private global network instead of the public internet, for faster, more reliable performance and fast failover.

**Q:** When do you use VPN vs. Direct Connect, and can they work together?
**A:**

- **VPN** — secure, flexible remote access; fine for smaller transfers, no dedicated line needed.
- **Direct Connect** — a dedicated physical line, high bandwidth; for large data transfers or compliance-sensitive workloads.
- Often **both**: VPN serves as automatic failover if the Direct Connect line physically goes down.

### Storage

**Q:** Block, object, and file storage — what's each one for, and which AWS service backs it?
**A:**

- **Block storage** — data split into blocks, updated piece by piece; `EC2 instance store` (unmanaged, temporary) or `EBS` (managed, persistent). Good for **databases and apps needing frequent updates**.
- **Object storage** — self-contained objects (data + ID + metadata) in flat buckets, rewrite the whole object to change it; `Amazon S3`. Good for **files that don't change constantly** — videos, backups, logs.
- **File storage** — hierarchical, shared file system; `Amazon EFS` or `FSx`. Good for **apps needing shared access**, like content management systems.

**Q:** EC2 instance store vs. EBS — what's the key difference?
**A:**

- **Instance store** — physically attached to the host; data is **deleted** if you stop or terminate the instance. Good for temporary data (scratch space, caches, buffers).
- **EBS** — a separate virtual volume, not tied to the host; data **persists** across stop/start. Good for databases and anything needing retention.

**Q:** What are EBS snapshots, and what does Data Lifecycle Manager automate?
**A:**

- **EBS snapshot** — a point-in-time, **incremental** backup of a volume (only changed blocks are saved since the last one); can create new, identical volumes from it.
- **Data Lifecycle Manager** — automates snapshot creation, retention, and deletion on a schedule, so you're not clicking through the console manually.

**Q:** What is Amazon S3's durability guarantee, and what does "private by default" mean for access?
**A:** Objects get **99.999999999% durability** ("11 nines") — redundantly stored across multiple facilities. Access is **private by default**; you explicitly grant it via bucket policies, IAM, or a time-limited presigned URL for temporary sharing.

**Q:** What are S3's general-access storage classes (not archive)?
**A:**

- **S3 Standard** — frequent access, fastest retrieval, the default class.
- **Intelligent-Tiering** — auto-moves objects between tiers by access pattern; use when access patterns are unpredictable.
- **Standard-IA** — infrequent access, same speed, lower storage cost.
- **One Zone-IA** — like Standard-IA but single AZ; cheaper, less resilient.
- **Express One Zone** — single AZ, optimized for the lowest latency.

**Q:** What are S3's archive storage classes, and what does S3 on Outposts do?
**A:**

- **Glacier Instant Retrieval** — archive tier, still instant access.
- **Glacier Flexible Retrieval** — archive, retrieval takes minutes to hours.
- **Glacier Deep Archive** — cheapest, retrieval within ~12 hours.
- **S3 on Outposts** — runs S3 on-premises, for data-residency/local-latency needs.

**Q:** What does an S3 Lifecycle policy do?
**A:** Automates two kinds of rules so you don't manage storage tiers by hand: **transition actions** move objects to a cheaper class after N days, and **expiration actions** permanently delete objects after N days.
