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

**Date implied, not stated.** Resolve relative dates against the meeting date if the
transcript carries one — "Thursday" in a Tuesday 15 Sep meeting is Thu 17 Sep. With no
meeting date, keep the phrase verbatim ("end of the month"). Never invent a specific date.

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
