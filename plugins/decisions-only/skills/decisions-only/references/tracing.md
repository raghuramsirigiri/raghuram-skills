# Tracing a decision back to the room

How `decisions-only` answers *"where did that come from?"*. The tables are deliberately bare
— no quotes, no reasoning — so the reader's first doubt has to be answerable in one turn,
from the transcript, without re-reading the meeting.

People who question this output are almost always in one of three positions: **they were in
the meeting and remember it differently**, **they weren't and are about to act on it**, or
**they've been named as an owner and want to know why**. Every answer below is written for
one of them.

All examples use invented names and dates.

---

## Handles and the closing line

`D1, D2 …` decisions, `C1, C2 …` commitments, in table order. A *Needs chasing* line has no
handle of its own; it is traced through the row it names.

The output ends with exactly this line, and nothing follows it:

```
Ask "where did D2 come from?" or "why isn't X in here?" to see the transcript behind any line.
```

It names the two questions this skill gets most, so the reader learns both exist. It follows
the one-line *"Nothing was decided"* answer too — that is the answer most likely to be
disputed.

## The trace block

```markdown
### D3 — Contractor budget frozen until Q2  ·  inferred

**The lines**
> [00:41:12] **Amara:** Unless anyone objects, we hold the contractor budget till Q2.
> [00:41:15] *(4 s silence)*
> [00:41:19] **Jonah:** Okay — next item, the vendor list.

**The test**
- Option closed? **Yes** — "hold till Q2" shuts "spend this quarter".
- Assent given? **No** — nobody said yes; the meeting moved on.

**The ruling**
- *Decided by silence* → recorded, marked `inferred`, and flagged under *Needs chasing*.

**What would change it**
- Any "agreed" after 00:41:12 would make it `explicit` and drop the flag. There is none.
```

- **The lines** — every speaker turn that opened, closed, conditioned or reversed the item,
  verbatim, with timestamp or line position and the speaker exactly as the transcript labels
  them (including `Speaker 2` or a mangled name). Mark silence and cross-talk as the
  transcript shows them. Nothing is paraphrased here.
- **The test** — the two questions from `what-counts.md`, each answered yes or no with the
  words that settled it.
- **The ruling** — the rule that put it in (or kept it out), by its name in `what-counts.md`,
  and any *Needs chasing* trigger it fired, by number.
- **What would change it** — the one sentence that, had it been said, would move it. Say
  whether anything close to it *was* said.

---

## The questions to expect, and what each answer shows

| They ask | Answer with |
| --- | --- |
| **"Where did D2 come from?"** / "Show me C1" | The full block for that row. |
| **"We never agreed that."** | The block, leading with the closing turn. If re-reading shows no option actually closed, **retract the row** — say so first, plainly. A disputed decision is exactly what this is for. |
| **"We definitely decided X — why isn't it here?"** | A block for the near-miss: the turns, which row of the *What does not count* table it matches (opinion, proposal, deferral, alignment…), and the tell. If it turns out to be a real decision, **add it** and say the original output missed it. |
| **"Why is it inferred?"** | The silence or the absent assent, shown as lines, and what an explicit version would have needed. |
| **"Why am I down for C1?"** | The turn where that person took it on, in their own words. If the only link is that they raised the topic, that is a guessed owner — **correct it to `— unassigned`** and say so. |
| **"Why is C2 unassigned? Leo said he'd look at it."** | The turns that came closest to an owner, and why each one fails: *"I can look at it"* hedged, a name said by someone else with no acceptance, a task raised but not taken. |
| **"How did you get Fri 6 Mar?"** | Meeting date as the transcript states it + the phrase used → the date. E.g. *Tue 3 Mar* + *"by Friday"* → Fri 6 Mar. With no meeting date, show why the phrase was kept verbatim. |
| **"Didn't we change our minds on that?"** | Both turns — the original call and the reversal — with timestamps, and why only the final state is in the table. |
| **"Why is that flagged?" / "Why isn't that flagged?"** | The trigger number (1–4) and the fact that fired it — or, for an unflagged row, which of the four it was checked against. Anything else they're worried about is not a flag by design; say so in one line. |
| **"Is that conditional?"** | The condition, verbatim, and where it sits in the decision text. |
| **"Could she even make that call?"** | One line: authority is out of scope; the table records what was said. No trace block. |
| **"Show all of it"** | One block per row, in table order, then one per near-miss that was considered and rejected. |

## Rules

- **Re-read the transcript; don't recall your first pass.** The trace is a second reading and
  that is where its value is.
- **The trace corrects the table.** A row that doesn't survive its own trace is retracted,
  owner guesses revert to `— unassigned`, and a missed decision is added — each said in the
  first line of the answer, not buried in the block.
- **Quote, never paraphrase, in *The lines*.** A paraphrased quote is the one thing a
  disputing attendee will catch immediately.
- **No summary sneaks back in.** A trace answers about one row. It does not recap the
  surrounding discussion, the mood, or who argued what, unless those turns are the evidence.
- **If the transcript is the problem, say so.** Missing speaker labels, a garbled passage, a
  gap — show it as it appears and say it is why the row is `inferred` or unassigned.
