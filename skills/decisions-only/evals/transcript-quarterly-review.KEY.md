# Answer key — `transcript-quarterly-review.md`

**Do not paste this into a test run.** Paste only the transcript; grade against this after.

Meeting date is Tuesday 15 September 2026, so "Thursday" resolves to **Thu 17 Sep 2026**
and "end of the month" to **30 Sep 2026** (the skill may keep the phrase verbatim instead —
both pass; inventing a *different* date fails).

## Decisions — expect exactly 4

| # | Expected | Type | Where |
| --- | --- | --- | --- |
| D1 | Going with **Northbeam** for the migration, over Calyx, despite ~11% higher cost | explicit, owner Sarah | "Right, we're going with Northbeam." |
| D2 | **Launch moves to January** — reverses the call made minutes earlier to hold December | explicit, owner Sarah, **must be flagged as a reversal** | "I'm going to reverse myself… Move the launch to January." |
| D3 | **Second analyst req frozen until Q1** | **by silence** — must be marked `inferred` | "Any objections?" … "Hearing no objections, that's what we'll do." |
| D4 | **Steering call moves weekly → fortnightly** from next week, Marcus owns the invite | explicit, owner Sarah/Marcus | "Do it. Move the steering call to fortnightly." |

**D2 is the reversal trap.** "Let's hold December" is stated as a decision and then undone
four exchanges later. Reporting both = fail. Reporting only "hold December" = fail.
Correct output is January, with a clause noting it changed.

**D3 is the silence trap.** Three speakers say nothing; a naive reader sees no assent and
drops it. It is a real decision and the one most likely to be disputed later, which is
exactly why it must surface — marked `inferred`, not asserted flatly.

## Commitments — expect 3

| # | Who | What | By when | Trap |
| --- | --- | --- | --- | --- |
| C1 | Priya | Revised cost model → Sarah | Thu 17 Sep | clean control case |
| C2 | **— unassigned** | Book the Northbeam kickoff | before end of month | **unowned** — no name may be guessed |
| C3 | Tom | Revised delivery plan with the January date | "end of the month" | **vague date** |

**C2 is the ownership trap.** "Someone needs to get the kickoff in the diary" — Elena
raised it, Sarah restated it, nobody took it. Attributing it to either of them fails. The
transcript ends with Priya asking "did we say who's booking Northbeam?" and the call
cutting off, which is the confirmation that it was never owned. It should also appear
under **Needs chasing**.

### Tolerated variance

Marcus's "you own the invite" / "Happily" can reasonably be read *either* as part of D4
*or* as a fourth commitment (Marcus → move the steering invite → next week). **Both pass.**
This is a genuine gray area and it's in the fixture deliberately — what fails is silently
dropping the ownership altogether, so that D4 lists no one as responsible for acting on it.

## Near-misses — expect 0 of these in the output

| # | Line | Why it must be excluded |
| --- | --- | --- |
| N1 | "we should probably move off the legacy reporting stack at some point" | Opinion. Modal verb, no closure, Sarah explicitly defers: "Noted. Not today." |
| N2 | "What if we brought Ravi's contractor back for a month?" | Proposal, left hanging — "I assumed no" is not a decision, and nobody rules |
| N3 | "let's take that offline" (analyst reporting line) | Deferral — belongs to `did-we-actually-decide`, not here |
| N4 | "I think we're all aligned that customer churn is the priority" | Alignment with no option closed. "I think that's fair" / "Agreed" are assent to a *sentiment* |

N4 is the most dangerous: it has three people agreeing in sequence, which pattern-matches
to consensus. Nothing was chosen.

Also not decisions, if they show up: "Northbeam has [done logistics]" (fact), "It's not
nine weeks" (analysis), "Everything changes the board pack" (joke).

## Needs chasing — expect 2

1. C2 has no owner.
2. D3 rested on silence rather than assent — worth confirming in writing.

## Scoring

| Check | Pass condition |
| --- | --- |
| Recall | 4/4 decisions, 3/3 commitments |
| **Precision** | **0/4 near-misses included** — the one that matters |
| Reversal | D2 final state only, noted as changed |
| Silence | D3 present, marked `inferred` |
| Ownership | C2 shows unassigned, no guessed name |
| Discipline | No summary paragraph, no attendee list, no "key themes" |

A run that scores 4/4 and 3/3 but includes even one near-miss is a **fail**. Precision is
the product; see the brief.
