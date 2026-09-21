# Tracing a movement back to the rows

How `whats-changed` answers *"how did you get that?"*. The output is a headline and a table
someone will repeat in a meeting. The first question they will be asked back is about one
number, and they need to answer it without opening two packs side by side.

The people asking are usually **the presenter, checking before they stand up**, **the
reviewer, who has the pack and a calculator**, or **the budget owner of a line**, who thinks
their line has been described wrongly. Every answer below is written for one of them.

All examples use invented numbers unrelated to the eval fixtures.

---

## Handles and the closing line

`headline` for the headline sentence · drivers by rank, `#1, #2 …` · `other` for
`all other movements` · `S1, S2 …` structural changes · `F1, F2 …` flags. Any figure in the
output can also be traced by quoting it ("the £41.2k").

The output ends with exactly this line, and nothing follows it:

```
Ask "how did you get £41.2k?" or "why is #2 a driver?" to see the rows and arithmetic behind any figure.
```

The figure in the line is the headline's own change figure, so the example is always one the
reader can see.

Follow-up replies — the traces themselves — do **not** repeat it. It is said once, under the
output, where the reader first needs it.

## The trace block

```markdown
### #2 — Support, outsourced  ·  +9.3

**Rows**
| | Prior | Current | Locator |
|---|---|---|---|
| Value (£k) | 96.0 | 105.3 | `sep.xlsx` Costs!D9 · `oct.pptx` slide 4, row 6 |
| Tickets | 1,200 | 1,198 | Costs!C9 · slide 4, row 6 |
Precision compared at: £0.1k (the deck's).

**Arithmetic**
1. Change = 105.3 − 96.0 = **+9.3**
2. Own move = 9.3 ÷ 96.0 = **+9.7%**
3. Share of total move = 9.3 ÷ 41.2 = **23%**
4. Unit value 96.0k ÷ 1,200 = £80.0 → 105.3k ÷ 1,198 = £87.9 → **rate +9.9%, volume −0.2%**

**Why it's here**
- Absolute gate: 9.3 ≥ 5% × 41.2 = 2.06 → **passes**. Ranked 2nd by absolute change.
- Note column quotes the source: *"new MSA rate from 1 Oct"* — slide 4 footnote.

**What would change it**
- At £1k rounding it would still pass; at £10k rounding it would round to zero movement.
```

- **Rows** — every source value the figure uses, prior and current, each with its locator in
  its own file, plus the precision the comparison was made at.
- **Arithmetic** — one operation per step, numbers substituted, in the order the output used
  them. A reviewer should be able to type each line into a calculator.
- **Why it's here** — the materiality gate it passed with the gate's numbers filled in, its
  rank, and any quoted cause with its source. For a flag, the trigger number.
- **What would change it** — the threshold, rounding step or missing disclosure that would
  move it in or out of the table, or change its rank.

---

## The questions to expect, and what each answer shows

| They ask | Answer with |
| --- | --- |
| **"How did you get the headline?"** | Row sums for both periods (listing the rows, or the range), change, percentage — and, if the source prints its own total, both figures and why the row sum was used. This is the question asked most. |
| **"Your total doesn't match the pack."** | The printed total, the row sum, the gap, and the cell or slide where they part. Point at the flag that already reports it. |
| **"Where's that number from?"** | The locator(s) and the value exactly as the source displays it, before any rounding you applied. |
| **"Why is #1 the biggest driver?"** | Its change against every other driver's, ranked by absolute change, and its share of the total move. |
| **"Why isn't Kiosks in there? It went up 200%."** | Both gates with its numbers — e.g. 2.2 < 5% × 80 = 4.0, and 0.1% of total < 1% — and that it sits inside `other`. Anticipate this one: large percentages on small lines are what readers notice first. |
| **"What's in all other movements?"** | Every member row with prior, current and change, summing to the `other` row, and the check that drivers + other = total move. |
| **"Is it price or volume?"** | The rate/volume arithmetic, or — when the source has no count — one line saying the split can't be made because there is nothing to divide by. Never derive a count. |
| **"Why did it go down?"** | Only what the source states, quoted and located. If the same note sits against the line in **both** periods, say so — it may describe a standing arrangement rather than this month's move. If it states nothing: *"Neither source gives a reason for this line."* Do not offer a plausible one. This is the question that most tempts invention. |
| **"Why no growth rate on the new line?"** | There is no prior value to divide by; the share of total move is shown instead, and it's what makes the table close. |
| **"Isn't North just North America renamed?"** | The evidence used to match or decline: position, value proximity, anything either source says. If it was reported as a rename, say how confident and why; if declined, what was missing. |
| **"Why didn't you mention the £16k difference?"** | The two precisions, and that the difference is inside the coarser one's rounding step — so it isn't a movement anyone can see. |
| **"Why is that flagged?"** | Trigger number and the values that fired it. If two flags share a cell, say that one defect fired two triggers. |
| **"Show all the working"** | `headline`, then each driver in rank order, `other`, structural changes, flags. |

## Rules

- **Recompute from the sources, not from the table.** Pull the values again by locator. If a
  figure in the output doesn't reproduce, **the trace corrects it** — first line, plainly:
  *"Correction: #2 is +9.3, not +9.8 — I read row 7 instead of row 6."* If a ranking or the
  headline changes as a result, restate it.
- **No new causes, ever.** A trace is where invented causes most want to appear, because the
  reader asked *why*. The only causal text allowed is what the source says, in quotes, with
  its locator.
- **Can't trace means it shouldn't have been said.** A figure that came off a chart image or
  a guess cannot be traced; say so and withdraw it.
- **Show the precision.** Every trace names the rounding step the comparison was made at,
  because half of all "that's wrong" disputes are two people reading different precisions.
