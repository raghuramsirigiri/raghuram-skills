---
name: decisions-only
description: Extract only the decisions and commitments from a meeting transcript, recap or notes — what was chosen, who owns what, by when — and nothing else. Use when the user pastes or points at a transcript, Teams recap, call notes or minutes and wants to know what was actually agreed, what they are on the hook for, who owns an action, or what came out of a meeting. Not a summary: it deliberately discards everything that binds nobody.
---

# Decisions only

A meeting recap compresses the meeting. This does the opposite: it throws the meeting away
and keeps only the sentences that bind someone.

**The product is the omission.** Anyone can summarize a transcript. Returning six lines and
nothing else is the hard part, and it is the only reason someone uses this instead of
reading the recap. Protect it at every step.

## Workflow

### 1. Take the input as given

A pasted transcript, a Teams or Copilot recap, `.vtt` captions, or someone's raw notes.
A file path works too (`.txt`, `.md`, `.vtt`, `.docx`). Expect bad quality: missing speaker
labels, mangled names, crosstalk, decisions phrased as questions.

Note the meeting date if the transcript carries one — relative dates resolve against it.

**Ask nothing unless genuinely blocked.** At most two questions, and only these:
- No speaker attribution anywhere → *"There are no names in this transcript — list owners
  as unassigned, or do you want to tell me who was in the room?"*
- Transcript clearly truncated mid-sentence → say so, ask whether to proceed on the partial.

Never ask about format, tone, length or audience. Draft first.

### 2. Sort every exchange

Read `references/what-counts.md` and apply it. Two questions per exchange: did an option
get **closed** (decision), and did a named person go **on the hook** (commitment)? Anything
answering no to both is discussion — discard it.

The reference carries the refusal table and the rulings for reversals, decisions made by
silence, unowned actions and vague dates. Those cases are the skill; do not improvise them.

### 3. Write the tables and stop

Two tables, then the flag list. Nothing before, nothing after.

```markdown
## Decisions (4)

| # | Decision | Made by | Confidence |
|---|----------|---------|------------|
| 1 | Going with Northbeam for the migration, over Calyx, at ~11% higher cost | Sarah | explicit |
| 2 | Launch moved to January — reverses the earlier call to hold December | Sarah | explicit |
| 3 | Second analyst req frozen until Q1 | the room | inferred — nobody objected |

## Commitments (3)

| # | Who | What | By when |
|---|-----|------|---------|
| 1 | Priya | Revised cost model to Sarah | Thu 17 Sep |
| 2 | — unassigned | Book the Northbeam kickoff | before end of month |

## Needs chasing (2)
- Commitment 2 has no owner — someone has to claim it.
- Decision 3 rested on silence, not assent. Worth confirming in writing.
```

Counts in the headings are deliberate: `## Decisions (0)` is information, a blank section
looks like a bug.

Output lands in chat as copyable markdown. Write a file only if asked.

## Rules

- **No summary.** No overview paragraph, no attendee list, no "key themes", no agenda
  recap, no closing line. If it doesn't bind someone, it isn't in the output.
- **Nothing decided is a valid answer.** If the meeting bound nobody, say so in one line
  and stop: *"Nothing was decided and nobody committed to anything."* Do not pad it into a
  summary to look productive. Many meetings genuinely are this.
- **Precision beats recall.** Four real decisions plus one thing that wasn't a decision is
  worse than three real ones alone — a false positive destroys trust in the omission, which
  is the whole product. When an item is genuinely borderline, leave it out and mention it
  in one line under *Needs chasing*.
- **Never guess an owner.** `— unassigned` is the answer. A guessed name stops anyone
  chasing it.
- **Never invent a date.** Resolve against the meeting date, or keep the phrase verbatim.
- **Reversals collapse to their final state**, with a clause noting the change.
- **Quote on request.** Don't carry a quote column — it doubles the width and dilutes the
  brevity. If the user asks where an item came from, cite the line verbatim.

## Testing

`evals/transcript-quarterly-review.md` is a synthetic transcript with 4 decisions (one by
silence, one reversed mid-meeting), 3 commitments (one unowned, one vaguely dated), and 4
deliberate near-misses. `evals/transcript-quarterly-review.KEY.md` grades it — never feed
the key in with the transcript.
