# Behavioral — Hello Interview Course Deck

Source of truth for the **Behavioral** domain. Add a question, then run:

```
node scripts/seed-behavioral.mjs
```

Re-running is safe: the domain and its fields are reused, cards already in the
DB are matched on the exact question text, and an answer edited here is pushed
to the existing card. This file is the source of truth for answers — edit here,
not in the app, or the next run will overwrite it.

Format:

- `## <Category>` — becomes the card's `beh_category`. New values are appended
  to the field's options in file order.
- `Link: <url>` — the article every card in that section came from. Attached to
  each card as a `links` row, labelled with the card's own question text.
- `**Q:** …` / `**A:** …` — one card. Answers may span multiple lines.

Every card gets `question_list: Hello Interview Course`.

**Partial back-fill.** This file holds the `Practice` and `Common Pitfalls`
sections. The 74 older cards (Why the Behavioral Matters, Decode, Select,
Deliver, The Big Three) were seeded before this file existed and still live only
in the DB — so the orphan check is scoped to the categories present here, and
won't flag them. Back-fill those sections when convenient.

## Card style — match the existing behavioral cards

- **One card, one fact.** A source with five ideas becomes five cards.
- **250–450 characters** of answer. Over ~550 is a split, not a card.
- **Lead with the answer.** Never restate the question.
- **Second person** ("you", "your"), matching the majority of the deck.
- A card with 2+ distinct parts is a bulleted list with a **bold lead-in term**
  and an em-dash (`**Solo** — muscle memory`), not a run-on sentence.
- **Bold** only the phrase that must be recalled — not for mid-sentence
  emphasis. `*Italics*` for lines you would say aloud verbatim.
- Close with a single standalone line carrying the *judgment*, not the fact
  ("Skipping stages wastes both time and money.").
- Curly quotes and apostrophes, not straight ones. No headings inside answers.

---

## Practice
Link: https://www.hellointerview.com/learn/behavioral/course/practicing

**Q:** Won't drilling your stories make you sound robotic?
**A:** Not if you drill the key points you need to get across rather than the exact words you'll say.

Scripting sentences is what sounds rehearsed. Drilling takeaways lets you rebuild the story fresh each time and still hit everything that matters.

Done this way, practice doesn't cost you naturalness — it buys you confidence.

**Q:** What are the four stages of progressive practice, and what does each buy you?
**A:**

- **Solo** — muscle memory and fluency
- **AI** — unpredictability and follow-ups
- **Peer mock** — human pressure and accountability
- **Professional mock** — expert calibration

Start in controlled, low-pressure settings where you can focus purely on content and structure, then add the complexity and pressure of real conditions.

Skipping stages wastes both time and money.

**Q:** When reviewing a solo recording, how should your story time be split?
**A:** Roughly **10% Context / 60% Actions / 30% Results and Learnings**.

Most candidates invert this — over-building the situation, under-delivering on what they actually did.

The diagnostic: if you're three minutes into a story and haven't described a single action you took, that's a problem.

**Q:** What five things should you watch for when reviewing a solo recording?
**A:**

- **Pacing** — 10% Context, 60% Actions, 30% Results
- **Clarity of ownership** — count your “I” vs. “we”; interviewers need what you did, not what the team accomplished
- **Verbal fillers** — um, like, you know, basically
- **Energy** — do you sound interested in your own story?
- **Organization** — can you follow your own narrative?

Record 2–3 video takes per story, applying each review to the next.

**Q:** What deserves special attention when practicing the Big Three?
**A:**

- **TMAY opening** — the first 20 seconds set the tone for the whole interview; confident, not “So, um, I've been an engineer for about, like, seven years…”
- **Project story transitions** — clearly call out your most important contributions; consider a Table of Contents if it's complex
- **Conflict story tone** — professional, with the real emotion left in

Practice these until you can deliver them conversationally without notes.

**Q:** How do you drill Decode → Select → Deliver?
**A:** Pull up a list of behavioral questions and, for each one:

- **Decode** — which signal area is this testing?
- **Select** — which catalog story fits best? Go with your gut, evaluate afterward.
- **Deliver** — give the full CARL response out loud.

You're building the reflex of mapping a question to a story you already have. Where nothing fits, that's not a delivery problem — it's a hole in your catalog to fill before the interview.

**Q:** What are the three highest-value uses of AI in behavioral practice?
**A:**

- **Unfamiliar questions** — prompt for questions built around your target company's values, past the standard banks
- **Follow-ups** — share a story and ask what follow-ups it invites; follow-ups are where most candidates get tripped up
- **Company roleplay** — *“Act as a Meta behavioral interviewer focused on Leadership. Ask me questions and follow up based on my responses.”*

Use AI after solo practice, not instead of it.

**Q:** What can't AI practice give you?
**A:**

- Nonverbal feedback — facial expressions, body language
- Real conversational flow, with interruptions and tangents
- Genuine pressure
- Any read on how you're coming across emotionally

These four gaps are why AI is a stage rather than a substitute. You still need mock interviews with a human.

**Q:** What does a peer mock give you that solo and AI practice can't?
**A:**

- **Pressure** — a real human waiting on your answer
- **Follow-ups** — they'll push on whatever seems weak or unclear
- **Coaching** — specific observations, not “that was good”
- **Accountability** — a scheduled next session forces you to actually revise
- **Encouragement** — prep is a slog, and support matters

Behavioral interviews are fundamentally subjective, so human feedback isn't optional.

**Q:** How do you prepare a peer interviewer to be useful?
**A:**

- **Span the signal areas** — questions across areas, not clustered on one type
- **Hand them a rubric** — 1–5 on structure, story choice, story depth, delivery
- **Tell them to ask follow-ups** — “Why that decision?” “What would you do differently?”
- **Demand honesty** — explicitly give them permission to be critical

“That was great” teaches you nothing. “I got lost in the architecture” does.

**Q:** What does a professional mock interviewer add over a peer?
**A:**

- **Calibration** — they know a strong Senior story from a weak one, and what flies at Amazon vs. Google
- **Expert follow-ups** — they probe where other managers will probe, which is where you're weakest
- **Pattern recognition** — hundreds of sessions means they've seen your mistake, and the fix
- **Confidence** — someone who's made real hiring calls telling you you're ready

## Common Pitfalls
Link: https://www.hellointerview.com/learn/behavioral/course/common-pitfalls

**Q:** What's the first thing to do after hearing a behavioral question?
**A:** Pause for a few seconds and identify the signal area being tested — then pick your story.

“Tell me about a challenging project” isn't asking for architecture; **challenging** means Perseverance. Answer the technical question instead and the interviewer leaves without the signal they came for.

Taking a few seconds to think is fine.

**Q:** What is the 30-second rule?
**A:** If you've talked for thirty seconds without sharing an action that moves the story forward, you're over-detailing something that isn't the point.

Actions are where the signal lives and what goes into the interviewer's notes. Context, Results and Learnings are supporting material.

Interviewers care less about what happened than about what you did to make it happen.

**Q:** What passive phrases should you strip out of your stories?
**A:**

- “I was assigned this project”
- “My manager asked me to…”
- “The ticket came to me”

These make work sound like something that happens to you rather than something you drive.

Even when you *were* handed the work, tell it from what you chose to do once you had it.

**Q:** Which context details earn their place in a story?
**A:** Only two kinds:

- Details that **establish the stakes** — why this mattered to the organization and its customers
- Details that **make your actions understandable**

Cut everything else: your org chart, sprint process, team history, your manager's background.

Preventing customer churn and shipping a nice-to-have are different stories, and that distinction is what the interviewer needs.

**Q:** How do you cure the “we” disease?
**A:** Replace each **we** with the specific thing you did:

- “We decided to use Redis” → “I proposed Redis because our read-to-write ratio was 100:1”
- “We built a service” → “I designed the architecture, implemented the core endpoints, and wrote the integration tests”

You aren't claiming you worked alone — the interviewer knows you had a team. Being specific isn't arrogance.

**Q:** What are the three most common story-selection mistakes?
**A:**

- **Scope mismatch** — a bug-fixing story for a senior role, unless the bug was genuinely hard
- **Too old** — five-year-old stories make the interviewer wonder what you've done since; stay within 0–3 years
- **Not your project** — if your real contribution was attending meetings and giving input, they'll see through it

The interviewer only hears the stories you choose to tell.

**Q:** Why do fairy tale endings backfire?
**A:** “We shipped on time, metrics improved, stakeholders loved it” reads as a problem, not a win.

The interviewer concludes one of three things: you weren't close enough to the work to see the problems, you're hiding something, or you aren't self-aware enough to spot the weaknesses.

A story with genuine trouble in it carries more signal than a smooth one.

**Q:** How do you put credible trouble back into a story?
**A:**

- **Obstacles** — “we hit a performance regression in staging that took a week to debug”
- **Mistakes and recoveries** — “I underestimated the cross-team dependencies and lost two weeks, then set up daily syncs to catch issues earlier”
- **Imperfections** — “we shipped on time, but test coverage wasn't where I wanted it, so I added those tests the next sprint”

Pick mistakes that show skill growth, not character flaws.

**Q:** What are the pitfalls specific to a conflict story?
**A:**

- **Sideline conflict** — it has to be one you were directly involved in resolving, not one you watched
- **Level mismatch** — disagreeing with a peer is a smaller conflict than disagreeing with a partner team
- **No empathy** — make the other person look bad and the interviewer marks *you* as uncharitable
- **No aftermath** — show the repaired trust, and frame the resolution as win-win

**Q:** What do senior candidates most often leave out?
**A:** The framework — *how* they decided, not just what they decided.

- “I prioritized the work” → by what criteria?
- “I made the technical decision” → against what tradeoffs?
- “I mentored a junior engineer” → using what approach?

At Staff and above your process matters as much as your outcomes, because the interviewer is judging whether your decision-making will transfer to their org.

**Q:** What does it mean to think defensively about your story?
**A:** Interviewers hiring senior people are risk-averse, so they fill any gap in your narrative with an unflattering assumption:

- “My manager assigned me this” → *don't you seek out work yourself?*
- “It took me three months” → *was that reasonable?*
- “The codebase had no test coverage” → *why didn't you fix it?*

Either cut the phrase or pre-frame it, so the gap never opens.

**Q:** How do you steer the interview toward your best material?
**A:**

- **Seed it in TMAY** — name a complex project and the interviewer will likely ask about it next
- **Drop breadcrumbs** — “I also had to navigate some stakeholder concerns, but the key technical challenge was…” signals a conflict story is available
- **Offer a menu** — two options, and let them pick the signal they need

It's your job to guide the interviewer, not just follow their questions.
