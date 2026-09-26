# What earns a line, and what must never be said

The judgment half of `whats-changed`. Read it before ranking anything.

Every example here uses invented numbers unrelated to the eval fixtures.

---

## 1. The two gates

A row is **reportable** if it clears *either* gate. Both are numeric, because a section
without a mechanical admission rule drifts from run to run while the arithmetic stays
identical.

- **Absolute gate** — its change is **≥ 5% of the total change** in its measure.
- **Relative gate** — its own value moved **≥ 20%**, **and** it is **≥ 1% of the measure's
  total**.

The relative gate's `and` is load-bearing. Without it, a £40 line going to £120 leads the
report on a 200% move. With it, that line is correctly invisible.

**Worked example.** Total revenue falls £80k. The 5% absolute gate is therefore £4k.

| Line | Prior | Current | Change | % of move | Own move | Share of total | Gate |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Wholesale | 900 | 820 | −80 | 100% | −8.9% | 24% | **yes** — absolute |
| Retail | 60 | 44 | −16 | 20% | −26.7% | 1.3% | **yes** — both |
| Trials | 2 | 7 | +5 | −6% | +250% | 0.2% | **yes** — absolute only |
| Kiosks | 1.0 | 3.2 | +2.2 | −3% | +220% | 0.1% | **no** — fails both |
| Direct | 400 | 397 | −3 | 4% | −0.8% | 12% | **no** — fails both |

`Trials` clears the absolute gate on £5k against a £4k bar, so it is reportable despite
being tiny — report it with the rate in words (`+250% on a £2k base`), never as a bare
percentage that implies significance. `Kiosks` moved more in percentage terms and is
correctly excluded: 0.1% of the total is not a driver of anything.

### When the total is flat

The absolute gate is a share of the total's movement, so it shrinks with it. When the total
barely moves, 5% of almost nothing is a bar that ordinary noise clears — and a line that
drifted £2k in a flat month would lead the report as a driver.

**So: if the total moved by less than 1% of its prior value, the absolute gate changes.** A
line is then reportable on the absolute gate only if its change is **≥ 1% of the prior
total** — big enough that it alone would have moved the total by 1%. The relative gate is
unchanged. Decide which mode applies **before** testing any line, and say which in the
trace.

**Worked example.** Prior total £2,500k, current £2,492k: −£8k, −0.3%. Flat mode; the bar is
£25k.

| Line | Prior | Current | Change | Normal bar (5% × 8 = 0.4) | Flat bar (25) | Reportable |
| --- | --- | --- | --- | --- | --- | --- |
| Payroll | 1,610 | 1,604 | −6 | clears | fails | **no** |
| Premises | 240 | 241 | +1 | clears | fails | **no** |
| Freight | 310 | 344 | +34 | clears | clears | **yes** |
| Fuel | 190 | 157 | −33 | clears | clears | **yes** |
| all other movements (6 rows) | 150 | 146 | −4 | — | fails | no |

Rows sum: −6 +1 +34 −33 −4 = −8 ✓.

Payroll and Premises are noise and the report says so. Freight and Fuel are real movements
that happened to cancel — exactly what a flat headline would otherwise hide.

- **Nothing clears in flat mode** → the one-line flat answer (§5), naming the largest movement.
- **Something clears** → a normal report under a flat headline: *"Total costs are flat
  (−£8k, −0.3%), but Freight (+£34k) and Fuel (−£33k) moved in opposite directions."* In flat
  mode, replace the `% of total move` column with `% of prior total` — shares of a near-zero
  movement run into the thousands of percent and mean nothing.

## 2. `all other movements`

Every row failing both gates is aggregated into **one** row at the foot of the drivers
table, with its row count: `all other movements (7 rows)`. Sum their prior, current and
change.

Never silently drop a row. The test of a correct table is that **the drivers' changes plus
`all other movements` equal the stated total movement.** If they don't, something was lost.

## 3. Rate versus volume

Where a source carries both a count and a value for a line, decompose it. This is the most
useful thing the skill can say and it needs no domain knowledge:

```
unit value = value / count
```

- count moved, unit value flat → **volume-driven**: `units −11%, price flat`
- count flat, unit value moved → **rate-driven**: `price −16%, units flat`
- both moved → say both, larger contributor first

Report the split in the `Note` column in words. Do **not** add a raw `% change` column —
that is the column that prints `340%` on a small base and makes the table lie.

If the source carries no count, say nothing about rate or volume. Deriving units from a
value is invention.

## 4. What must never be said

These are what make every naive version of this untrustworthy.

| Tempting output | Why it's wrong |
| --- | --- |
| "Revenue fell on seasonal softness in EMEA" | A cause the source does not contain. Invented. |
| "Margin improved" when only cost moved | A derived claim about a metric the source never states. |
| "North grew 340%" | New row — absent before, not small. Not a growth rate. |
| "12 lines changed, here they are" | A diff, not an explanation. Unranked means unread. |
| "Total variance −£82k" when the rows sum to −£79k | Repeats a broken printed total. Reconcile first. |
| "UK was about £550k" read off a bar chart image | A measurement of a picture. Fabrication with a decimal point on it. |
| "Revenue fell £16.8k" from `£1.8m` vs `£1,783.2k` | Pure rounding artefact. Nothing moved. |
| "EMEA is gone" when the deck showed only its top 5 | Not disclosed ≠ not there. |

**The one permitted cause.** If the source itself states a reason — a note column, a
footnote, a variance-reason field, a deck's commentary bullet — quote it and attribute it:
`"new MSA rate from 1 Oct" per slide 4's note`. Quote it; never paraphrase it into your own
finding, and never extend it to a line it wasn't written about.

## 5. Hard cases, and the ruling for each

- **Row appears** → `Structural changes`, described as `new`. Its value still counts toward
  the total movement, and it may also appear in the drivers table.
- **Row disappears** → same, as `gone`. Naming where it might have gone is allowed only as a
  possibility, explicitly unsourced.
- **Which percentages a new or gone row may carry.** Not a blanket ban — the two kinds of
  percentage behave differently:
  - **`% of total move` is fine, and belongs there.** It is the line's change divided by the
    *total* change, which is perfectly well defined for a row that appeared or vanished. It
    is also what makes the table's arithmetic close: leave it out and the drivers no longer
    sum to the total.
  - **A growth rate is not.** `current/prior − 1` has no denominator for a new row. Write
    `new` or `gone` in the `Note`, never `340%`, never `∞`, never `n/a%`.
- **An explicit zero is not an absent row.** A source printing `0.0` has disclosed that line;
  a source with no such row has not. Treat `0.0 → 6.8` as a line that *grew from zero* — it
  belongs in the drivers table, it goes in `Structural changes` only if you say "started
  this month from nil" rather than "no prior comparative", and it still gets no growth rate.
  And in a rounded source, `0.0` may not even be zero — see `extraction.md` on precision.
- **Row renamed** (`North` → `North America`) → match on position and value proximity,
  report **as a rename** under `Structural changes`. Reporting one gone plus one new
  invents movement equal to twice the line's value. If confidence is low, say so **and raise
  flag trigger 5**.

  **Confidence is mechanical, not a feeling.** A rename is **confident — no flag** when the
  row sits in the same position **and** either its count is identical or, with no count, its
  value moved by less than the materiality gates would notice. Reworded or narrower-sounding
  names (`North` → `Northern England`) do not lower confidence on their own; the figures
  decide. It is **low-confidence — trigger 5** only when position matches but the figures
  don't pin it (count differs, or no count and the value moved materially). `extraction.md`'s
  qualifier rule is about an **explicit scope qualifier** — `(excl. NL)`, `ex-`, `only`,
  `incl.` — which states a different population and is never matched at all.
- **A rename you suspect but won't assert** — the labels differ, one side gives no figure to
  match on, or a source is truncated so the counterpart simply isn't shown. Say in
  `Structural changes` that the two may be related and that nothing in either source
  establishes it. **This is not a flag**: trigger 5 covers a hedged claim, not a declined one.
  Both are correct outcomes; what matters is that the flag count follows the choice.
- **Sign flip** (+£4k → −£1k) → report the absolute movement and describe the flip in words.
  A percentage across zero is meaningless.
- **From zero, or divide by zero** → `new` or `n/a`. Never `∞`, never `—%`.
- **Printed total doesn't reconcile** → the rows are the truth. Flag the gap, and in a
  spreadsheet name the offending cell.
- **No complete set of rows to sum** — a truncated deck table, a PDF showing only the top
  few lines — so "the rows are the truth" has nothing to bite on. **Rank the candidate
  totals by how checkable they are, and take the most checkable one:**
  1. a complete set of line rows you summed yourself;
  2. a **derived** total you can cross-check from a second disclosure in the same source —
     most often a segment or subtotal chart whose parts you can add;
  3. a printed total, which is a claim and nothing more.

  A printed total is the **last** resort, never the default just because it is the most
  prominent number on the slide. When (2) and (3) disagree, use (2), state the figure you
  used, and raise trigger 1 — do not split the difference and do not decline to choose. "I
  preferred neither" leaves the reader holding two totals, which is the problem they came
  with.
- **Units or currency differ between sources** (`£000s` → `£`, `£` → `€`) → **stop.** Flag
  it and do not produce a numeric report. Every figure would be wrong by a factor. This is
  the only case worth refusing outright.
- **The two sources disagree on the same period beyond rounding** → report both, name both
  locators, pick neither. Which of the company's own numbers is right is not this skill's
  call.
- **A number appears only in prose** ("closed just under £1.8m") → quote the sentence; do
  not parse it into the table.
- **Nothing clears a gate** → say so in one line and stop. *"Revenue is flat within 1%; no
  line moved more than £3k."* When the total moved less than 1%, test the lines against the
  flat-mode bar in §1 first — the normal absolute gate always finds something in a flat
  month.

## 6. Flags — a closed list of ten

One line per flag, count in the heading, section omitted entirely when nothing qualifies.
**Only these ten trigger a flag:**

1. **Non-reconciling total** — printed total ≠ sum of rows.
2. **Stale date** — a tab, page or slide carrying the same as-of date in both periods.
3. **Unit or currency mismatch** between the two sources.
4. **Hardcoded cell in a formula column** — spreadsheets only.
5. **Low-confidence rename** — you **did** report a rename, but aren't certain of it. If you
   considered two lines and **declined** to match them, no flag fires: say so in
   `Structural changes` instead. The trigger is a claim you've made and hedged, never a
   claim you decided not to make.
6. **Figures present only as a chart image.**
7. **OCR was needed** — digits unverified.
8. **Precision mismatch** hiding movements below the coarser source's rounding step.
9. **Undisclosed lines** — a source showed a subset, so part of the total is unexplained.
10. **A stated variance disagrees with the arithmetic** — a `Variance`, `Δ` or `MoM` column,
    or a printed movement, that doesn't equal current minus prior.

Risks, opinions, business concerns, "worth watching", and anything that merely seemed
notable are **commentary, not flags.** They do not appear. Neither does an observation about
what you *couldn't* compute — "no unit counts, so no rate/volume split" belongs in a `Note`
or nowhere, not in `Flags`.

### Enumerating them

Walk the closed list **in order**, emit one line for each trigger that fired, count them,
stop.

**One line per trigger — even when two triggers share a single root cause.** This is the rule
that decides the common ambiguity, so it has no exception:

> A typed-over total cell fires **trigger 1** (the total doesn't reconcile) *and* **trigger
> 4** (a hardcoded cell in a formula column). That is **two lines**, not one, even though one
> mistake in one cell caused both — because a reader who only cares about the £2.6k needs the
> first, and a reader who has to fix the workbook needs the second.

The mirror case, so neither reading drifts:

> **One trigger spanning several rows is one line**, naming them together. Three lines each
> carrying a stale July date is one stale-date flag listing all three, not three flags.

So: count triggers, not defects, and not rows.

Worked example of the section done right:

```markdown
## Flags (4)
- The Costs tab totals £650.5k; the rows sum to £647.9k. £2.6k unaccounted.       ← trigger 1
- `E22` is a typed-in number, not part of the column formula.                     ← trigger 4
- `Depreciation` and `Amortisation` are both dated 30-Jun in both packs. Likely   ← trigger 2
  stale, not unchanged.
- The September deck shows 5 of 12 lines, so £389.7k of the total is undisclosed  ← trigger 9
  and the ranking below only explains what was shown.
```

(The trigger annotations are there to show the mapping; don't print them.)

Both rules are visible in that example. The £2.6k gap and `E22` are **one defect, two
triggers, two lines.** The two stale rows are **one trigger, two rows, one line.**

Wrong, for contrast:

- *"Hosting costs are growing fast and may need attention"* — an opinion, not a trigger.
- *"August gives no unit counts, so no rate/volume split is possible"* — a limitation of the
  analysis. It belongs in a `Note` or in the fidelity line, never in `Flags`.
- *"The file was last edited by Finance"* — not a trigger.
- Merging the £2.6k gap and `E22` into a single line — right facts, wrong count.
