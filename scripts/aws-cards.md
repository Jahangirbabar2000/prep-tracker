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
