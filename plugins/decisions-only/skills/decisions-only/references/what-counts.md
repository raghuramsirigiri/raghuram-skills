# What counts as binding

The judgment layer for `decisions-only`. Two questions, asked of every exchange in a
transcript:

1. Did an option get **closed**? → a decision.
2. Did a named person go **on the hook**? → a commitment.

Anything that answers "no" to both is discussion, and discussion is what the reader is
paying you to throw away.

---

## Decisions

A decision closes an option. Before it, two or more paths were live; after it, one is.

> "Right, we're going with vendor B." · "We're not doing the Q4 launch." · "Freeze the req."

The test is **elimination**, not enthusiasm. A decision can be unhappy, reluctant, or
delivered in four words between two jokes. What makes it a decision is that a path that
was open is now shut.

Record: what was decided · who decided it · `explicit` or `inferred`.

## Commitments

A commitment puts a named person on the hook for a specific action.

> "I'll get the numbers to Priya by Thursday."

Three parts: **who**, **what**, **by when**. Missing *who* or *when* does not disqualify
it — it makes it a commitment with a hole, which is worth more to the reader than silence.
Record the hole; never fill it.

Record: who · what · by when.

---

## What does not count

These are what make every naive version of this skill useless. They pattern-match to
agreement while binding nobody.

| Looks like a decision | Actually is | Tell |
| --- | --- | --- |
| "We should probably move to the new system" | **Opinion** | Modal verb, no closure, nobody assents |
| "What if we pushed the date?" | **Proposal** | Interrogative, left hanging |
| "Yeah, that makes sense" | **Assent to a point** | No option was closed |
| "Let's take that offline" | **Deferral** | Explicitly postpones the choice |
| "So we're aligned on the principle" | **Alignment** | Agreement in the abstract; no specific option eliminated |
| "Someone needs to own this" | **Unowned intent** | No name attaches |
| "Northbeam has done freight before" | **Fact** | Describes the world, chooses nothing |
| "It's not nine weeks" | **Analysis** | Corrects a claim, closes no path |

The dangerous case is a run of these in sequence. Three people agreeing with a sentiment —
"I think we're all aligned on X" / "that's fair" / "agreed" — reads exactly like consensus
and closes nothing. Ask what option died. If none did, it isn't a decision.

---

## Hard cases

**Reversed later in the meeting.** Report the *final* state only, with a one-clause note
that it changed. Listing both reads as two contradictory decisions and the reader can't
tell which holds. The reversal itself is worth a clause because someone who left early
will believe the old one.

**Decided by silence.** "Any objections? … Hearing none, that's what we'll do." Include it,
marked `inferred`. It is a real decision, and it is the single most disputed kind after the
fact, which is precisely why it must surface rather than being dropped for lack of assent.
Flag it under *Needs chasing*.

**Owner unnamed.** Record the item, set the owner to `— unassigned`. Never infer from who
spoke — the person who raised a task is usually not the one who takes it, and a guessed
name is worse than a blank because it stops anyone from chasing it.

**Asked by name is not an owner.** "Leo, can you send the vendor list?" names who was
*asked*. The commitment exists only when someone *accepts*, and the owner is whoever the
transcript shows accepting. If the acceptance has no speaker label — captions with no
attribution, a reply marked `Speaker 3` — the owner is `— unassigned`, however obvious the
guess. Say who was asked in the *Needs chasing* line (`asked of Leo; the reply accepting it
is unattributed`), never in the *Who* column. Never write `Leo (asked by name)` or
`Leo (probably)` as an owner — a qualified guess is still a guess.

**Date implied, not stated.** Resolve relative dates against the meeting date if the
transcript carries one — "Thursday" in a Tuesday 15 Sep meeting is Thu 17 Sep. With no
meeting date, keep the phrase verbatim. Never invent a specific date.

**Only a phrase naming a day resolves** — "Thursday", "tomorrow", "next Monday". A phrase
naming a *window* — "end of the month", "by Q3", "in the next couple of weeks" — stays verbatim
**even when the meeting date is known**, and fires *Needs chasing* trigger 2. Converting "end
of the month" to 30 Sep invents a deadline nobody set; the speaker may mean the last working
day, the month-end close, or roughly then.

**Figures as spoken.** "Forty K" is `40K`, not `$40K` or `£40,000`. Never add a currency,
unit or precision the transcript doesn't state — a symbol added to a spoken number is an
invented fact, and the wrong one will be repeated. If the currency matters to the decision
and nobody said it, leave it out; it is not a *Needs chasing* flag.

**Conditional decisions.** "If finance approves, we go with B." Record it with the
condition attached, in the decision text. Dropping the condition converts a contingency
into a commitment nobody made.

**Authority.** Whether the speaker *could* make the call is out of scope. Record what was
said; auditing governance is a different job.

**Decision phrased as a question.** "So we're doing B then?" followed by assent is a
decision. The grammar doesn't settle it; the closure does.

---

## Note for `did-we-actually-decide`

That skill is this one's complement and reads this same file. Its payload is the middle
table — the proposals left hanging, the deferrals, the alignments that closed nothing —
plus any topic that consumed real airtime and produced neither a decision nor a commitment.

The boundary: **this** skill reports flaws in what *was* decided (unowned, undated, decided
by silence). **That** skill reports what was never decided at all. An item belongs to
exactly one of them.

---

## What earns a "Needs chasing" flag

The tables have an admission rule; this section needs one too, or it drifts into
commentary. **Four triggers, and nothing else:**

1. **A commitment with no owner.** Nobody is going to do it.
2. **A commitment with no date**, or only a loose phrase ("soon", "end of the month").
3. **A decision made by silence** rather than assent.
4. **A decision that reversed an earlier one in the same meeting** — whoever dropped off
   early is still working to the old one.

### How to count and lay it out

**One line per flagged item — never one line per trigger.** Walk **Commitments first, then Decisions**,
row by row — commitments are what gets chased, so they lead. Any row hitting one or more triggers gets exactly one line, which names the
row by number and says what is wrong with it; a row hitting two triggers names both in
that same line. The number in the heading is the number of *rows* needing attention, which
is the number of things a reader has to chase.

Worked example. Commitments 2 and 3 and decisions 2 and 3 are flagged; commitment 2 is
both unowned and undated:

```
## Needs chasing (4)
- Commitment 2 has no owner and no fixed date — nobody is booking the kickoff and the
  held slot lapses at month end.
- Commitment 3's date is "end of the month" — never pinned to a day.
- Decision 3 rested on silence, not assent. Worth confirming in writing.
- Decision 2 reversed an earlier call in the same meeting; anyone who left early still
  believes December holds.
```

Write the lines first and count them last — the heading number is the number of lines you
actually wrote, not the number you expected to write.

Four flagged rows, four lines. Not five (commitment 2 split across its two triggers), and
not three (two rows merged into one line because they read well together).

If no row qualifies, omit the section entirely rather than printing an empty heading.

This is a closed list. Risks, concerns, disagreements, things that sounded expensive, and
anything you merely found interesting are **not** flags — they are the commentary this
skill exists to throw away. If it isn't one of the four triggers, it doesn't appear.
