# Tracing a brief back to its source

How `exec-brief` answers *"where did that come from?"* and, more often, *"why isn't that in
there?"*. The brief is forty words cut from four thousand, so nearly every doubt is about the
cut or the phrasing — and each has to be answerable in one turn, from the source, with the
source's own words.

People who question a brief are in one of three positions:

- **The sender, before forwarding.** Their name goes on it. They are worried something
  important was dropped, or that it now says more — or less — than the thread does.
- **The recipient, after reading.** They want the figure's origin, the thing they would have
  asked next, and very often a cause.
- **Someone named in the source.** *"That's not what I said"*, *"you've made it sound like
  my team's fault"*.

All examples use invented names, dates and figures.

---

## Handles and the closing line

`BLUF`, `P1`, `P2`, `P3`, `Ask`, `Check`. The BLUF and the ask are traced by those words; a
point by its number.

The output ends with exactly this line, and nothing follows it:

```
Ask "where does P2 come from?" or "why did you leave out X?" to see the source behind any line.
```

It names the two questions this skill gets most — one about what was kept, one about what was
cut — so the reader learns both exist. It follows a no-points brief and a *No ask* brief too.

Follow-up replies — the traces themselves — do **not** repeat it.

## The trace block — for a line that is in the brief

```markdown
### P1 — New date holds only if the load test passes on 3 Mar

**Source**
> M7 · Amir (supplier) · Thu 5 Feb — "We're confident in 16 Mar but can't commit until the second load test is through on the 3rd."

**Why it made the cut**
- Gate: without it Dana would treat 16 Mar as fixed. Rank 1 — a condition on the BLUF.

**Fidelity**
- "confident … can't commit until" → *holds only if*. Certainty kept; nothing firmed up.

**What would change it**
- A later message confirming the date unconditionally. There is none; M9 and M10 don't
  mention it.
```

- **Source** — every message or passage the line rests on, **verbatim**, with its locator
  (`M7 · sender · date` for threads; `§3 ¶2` or `p.4` for documents). Superseded versions
  appear too when the line reports a revised figure, so the reader sees which one won.
- **Why it made the cut** — the gate, and the rank from `what-to-keep.md` it passed at. For
  the BLUF, the BLUF-test step that chose its subject. For the ask, the rule that chose it.
- **Fidelity** — the source's words against the brief's, for every qualifier, figure and
  date. This is the part a disputing reader checks, so show it even when it's obvious.
- **What would change it** — the message that, had it existed, would move the line, and
  whether anything close was said.

## The omission block — for a line that isn't

```markdown
### Not in the brief — the weekend-overtime option

**Source**
> M4 · Lena · Mon 2 Feb — "Could we hold the date with weekend overtime?"
> M5 · Dana · Mon 2 Feb — "No — the safety rota won't cover it. Off the table."

**The cut**
- Rejected option → history (*Always cut*). Dana is the reader and rejected it herself, so
  she won't propose it.

**Would it change what the reader does?**
- No. It would if the reader were someone who hadn't seen M5 — then it earns one clause, as
  rejected, with the safety reason.
```

- **The cut** — the row of *Always cut* or the keep test it failed, by name.
- **Would it change what the reader does?** — the gate, answered for this reader. If the
  honest answer is *yes*, the cut was wrong: **add it** and say so first.

---

## The questions to expect, and what each answer shows

| They ask | Answer with |
| --- | --- |
| **"Where does P2 come from?"** / "Show me the BLUF" | The trace block for that line. |
| **"Why did you leave out X?"** | The omission block. If X passes the gate for this reader, **add it** — replacing the lowest-ranked point if three are already there — and say which one it displaced. |
| **"That's not what the thread says."** / "You made it sound worse / better than it is" | Lead with *Fidelity*: the source's exact words beside the brief's. If the brief shifted certainty, severity or tone, **correct it** and say so first. If it didn't, show the words and hold — pushback alone doesn't soften the news. |
| **"The thread said £15k, not £22k."** | Both messages, verbatim, and the link that made the later one a revision (*Step 0*). If there is no link — two figures that just differ — the brief was wrong not to fire `Check` trigger 1; **add the check**. |
| **"Why is that the BLUF and not Y?"** | The BLUF test, step by step: which of 1–4 existed, and that the first one wins. Y's step, and why it came later. |
| **"Why is the ask that?"** | The source line making the request, its date, and — if the source asked several things — why this one leads (earliest date, or the others depend on it). |
| **"Why is there no ask?"** | The source's closest lines — "thoughts welcome", "FYI" — and why an open invitation isn't a request. |
| **"Why did it slip?" / "What caused it?"** | **Only what the source states, quoted and attributed** — or *"The thread doesn't say why."* A guess in the thread is shown **as a guess**, with who guessed it: *"Lena suspects the old product codes (M6), but the supplier's root-cause work isn't back."* Never a cause of your own, however plausible. |
| **"You made it sound like it's my team's fault."** | The sentence in question and its source. The brief names no one for blame by design (*Always cut: settled argument*); if a line implies blame the source doesn't, **reword it** and say so. |
| **"Did they think about keeping the date?"** | The omission block for the rejected option, with the source's reason for rejecting it. |
| **"Can you add the background?"** | One line: the brief leaves background out on purpose; offer a two-line context paragraph **above** the brief if they want one. Not a trace. |
| **"Show all of it"** | One block per line in order (BLUF, P1–P3, Ask, Check), then one omission block for each candidate that passed the gate but lost on rank. |

## Rules

- **Re-read the source; don't recall your first pass.** The trace is a second reading and
  that's where it catches things.
- **The trace corrects the brief.** A point that fails its own trace is replaced; a
  firmed-up date gets its condition back; a missed contradiction adds the `Check` line; a
  missed ask is added. Say the correction in the first line of the answer, then show the
  corrected brief in full.
- **Quote, never paraphrase, in *Source*.** The person who wrote the message will read the
  trace.
- **No summary sneaks back in.** A trace answers about one line. It does not recap the thread
  or the mood unless those messages are the evidence.
- **If the source is the problem, say so.** A quoted reply that differs from its original, a
  missing attachment, a message with no date — show it, and say it's why the line is hedged.
