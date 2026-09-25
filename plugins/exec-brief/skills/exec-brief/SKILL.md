---
name: exec-brief
description: Boil a long email thread, chat, status report or document down to what a senior reader needs — one bottom-line sentence, at most three points, and the one thing you need from them — ready to paste into Outlook or Teams. Use when the user has to brief a manager, director or exec, asks for "the short version", a BLUF, a TL;DR for their boss, or wants to know what to send upward from a thread they've been copied on. Not a summary: it cuts everything that doesn't change what the reader does, and it never firms up a date, a figure or a cause the source leaves open.
---

# Exec brief

A long thread already contains the news. It is buried under chronology, who-said-what, an
argument that got settled, and a cheerful last message. This digs it out and writes it the way
a director reads: one sentence, three points, one ask.

**The product is the cut.** Anyone can summarise. Returning forty words and leaving out thirty
true things is the hard part, and the only reason someone uses this instead of forwarding the
thread. **Its twin is fidelity:** the brief goes upward with the sender's name on it, so a
"likely" that becomes "will" is a promise they never made.

## Workflow

### 1. Take the source as given

A pasted email thread, Teams chat, status report, memo or document — or a file (`.txt`,
`.md`, `.eml`, `.docx`, `.pdf`). Threads arrive reverse-chronological, with quoted replies
repeating earlier messages and signatures in between. Read them oldest first, once each.

Number the messages or sections as you read them (`M1…`, `§2 ¶3`) — the trace needs the
locator.

**Ask nothing unless genuinely blocked.** At most two questions, and only these:
- Several unrelated subjects, none dominant → *"This covers X, Y and Z — which one is the
  brief about?"*
- The source is clearly truncated → say so, ask whether to proceed on the partial.

Never ask about audience, tone or length. The reader is one level up by default. Draft first.

### 2. Find the latest true state

Read `references/what-to-keep.md` and apply it. Before choosing anything, establish **the
state as of the last message**: a later figure supersedes an earlier estimate, a reversed
decision is gone, a settled argument is settled. The brief reports where things stand, never
how they got there.

### 3. Choose the BLUF, the ask, then the points — in that order

The reference carries the BLUF test, the ranked keep tests, the always-cut table, the
refuse-to-say table and the closed list of `Check before sending` triggers. Those are the
skill; do not improvise them.

- **BLUF** — the one sentence the reader needs if they read nothing else. Bad news leads.
- **Ask** — what the reader must do, with the date the source gives. If the source asks them
  nothing, the answer is *No ask — for information.* Never manufacture one.
- **Points** — at most three, each earning its place by changing what the reader would do or
  say. A point that restates the BLUF or the ask is cut.

### 4. Write it and stop

```markdown
**The Leeds switchover is likely to slip three weeks to 16 Mar, and releasing £22k from contingency needs your sign-off by Wed 11 Feb.**

- P1 The supplier is "confident" in 16 Mar but can't commit to it until the second load test passes on 3 Mar.
- P2 £22k covers 11 extra supplier days at £2,000/day; no other budget line moves.
- P3 Without sign-off by 11 Feb the supplier releases our March slot; the next one is May.

**Ask:** Approve the £22k contingency release by Wed 11 Feb.

**Check before sending:** M9 puts the switchover weekend on 21–22 Mar, which doesn't fit a 16 Mar date — confirm with Amir.

Ask "where does P2 come from?" or "why did you leave out X?" to see the source behind any line.
```

(Invented example. The source's reasons, history and side topics are all absent — that is the
product, not an omission to apologise for.)

- **BLUF** in bold, ≤ 30 words. **Points** `P1–P3`, ≤ 25 words each. **Ask** one action.
- `Check before sending` appears **only** when a trigger in the reference fires; otherwise the
  line is omitted entirely.
- The fixed trace line ends the output, and nothing follows it. When the brief has no points,
  the line reads *"where does the BLUF come from?"* in place of *"where does P2 come from?"*.

Output lands in chat as copyable markdown. Write a file only if asked. **Nothing before the
BLUF** — no "Here's the short version", no divider. No subject line, no greeting, no sign-off
unless asked — the user pastes this into their own message.

**When asked to revise** ("more urgent", "shorter", "softer"): one line saying what changed,
then the full revised brief, then the trace line — nothing after it. The revision obeys every
rule below; a request for urgency is met with the source's own deadline and consequence, not
adjectives and not an earlier date.

## Rules

- **The cut is the product.** No background paragraph, no chronology, no "context", no list
  of who was involved, no closing offer. If it doesn't change what the reader does, it isn't
  in the brief.
- **Three points is a ceiling, not a target.** Two true points beat three with padding. A
  source with one piece of news gets a BLUF, an ask and no points.
- **Never firm anything up.** Keep the source's certainty word-for-word in spirit: *likely*,
  *if*, *subject to*, *estimate*, *target* survive into the brief. **Every sentence that states
  an uncertain date carries its qualifier — the BLUF included.** A condition spelled out in P1
  does not excuse a bare "moved to 16 Mar" in the BLUF; the BLUF is the line that gets repeated.
  Don't strengthen the qualifier either: *"can't commit until"* is not *"holds only if"*, nor *"won't commit until"* — can't is a limit, won't is a choice.
- **Never soften or bury bad news.** If the thread's news is a slip, an overspend or a
  failure, the BLUF says so first — however upbeat the last message is.
- **Never supply a cause.** Causes come from the source, attributed. A cause someone
  *guessed* in the thread is not a cause; leave it out or call it a guess. *"Root cause not
  yet known"* is a legitimate point when the reader will ask.
- **Figures as the source states them** — its latest version, its precision, its unit. No
  rounding that changes what a reader would repeat. No figure the source doesn't contain.
- **Never invent an ask, an owner or a deadline.** *No ask — for information.* is a complete
  answer. A request that needs a date the source doesn't give keeps "no date given". Never
  bring the source's deadline forward — not even flagged as a suggestion. If the user wants
  an earlier internal date, they add it themselves.
- **Don't take sides in a settled argument.** Resolved blame, disagreements and rejected
  options are history. A rejected option returns only if the reader would otherwise propose
  it — then as a clause on an existing point, rejected, with the source's reason. It ranks at
  most 4 and **never displaces a rank 1–3 point.**
- **Short source, short brief.** If the source is already under about 80 words, return a
  BLUF and the ask, no points. The brief must never be longer than the source.

## Tracing

A brief is short by construction, so every doubt is about what it left out or how it phrased
what it kept. Read `references/tracing.md` before answering any follow-up: it carries the
handles (`BLUF`, `P1–P3`, `Ask`, `Check`), the fixed closing line, the trace block (*Source ·
Why it made the cut · Fidelity · What would change it*), the omission block, and the questions
to expect — *"why did you leave out X?"*, *"you made it sound worse than it is"*, *"the thread
said £15k"*, *"why is that the ask?"*, and above all *"why did it slip?"* — which gets only
what the source states, quoted, or *"the thread doesn't say."*

A trace re-reads the source and **corrects the brief**: a point that doesn't survive is
replaced, a firmed-up date gets its condition back, a missed ask is added — each said first.
