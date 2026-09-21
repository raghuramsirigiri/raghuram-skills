# The twelve checks, and how hard each one bites

The judgment half of `sanity-check`. Walk it in order.

Every example here uses invented numbers unrelated to the eval fixtures.

---

## Arithmetic

### 1. Totals don't reconcile

Sum the rows yourself and compare with what the artifact prints. Then **cross-foot**: where a
table has both row totals and column totals, the grand total must agree both ways.

```
          Q1    Q2   Total
North     40    55     95
South     30    25     55
Total     70    80    155   <- row totals give 150, column totals give 150; 155 is neither
```

Report the gap, both figures, and the cell. **The rows are the truth**; a printed total is a
claim. Where two disclosures disagree, prefer the one whose parts you can add.

**A total covering a population the table doesn't show is this check too**, and it is usually
the biggest finding on the page. A deck table listing five lines under a heading like
`Total (all lines)` is claiming a total its own rows cannot produce: the shown rows sum to one
figure, the total asserts another, and the difference is undisclosed. Report the gap in cash,
not just as "the table is partial" — a six-figure sum sitting unexplained under a printed total
outranks a four-figure disagreement elsewhere, and ranking them the other way round buries the
thing that matters.

### 2. Shares don't sum

A `%` column of parts should total 100%. `97%` or `103%` means a part is missing, doubled, or
individually wrong. Distinguish this from **displayed** rounding (check 12) — three parts shown
as 33% each summing to 99% is rounding, not an error.

### 3. Impossible percentages

A share above 100%. A negative headcount. A utilisation, completion or attach rate above 100%
where the measure cannot exceed its base. Growth rates are *not* covered here: +340% is
possible, just unhelpful on a tiny base.

### 4. Duplicates and double counting

Two scopes only, and **say this is the limit**:

- **Same-tab duplicate keys** — the same identifier appearing twice, which double counts in
  every total below it.
- **A subtotal included in its own total** — the classic, and it makes the total exactly one
  subtotal too big, which is the tell.

Do **not** attempt to reconcile business keys across tabs or files; that needs knowledge the
artifact doesn't carry, and a false duplicate accusation is expensive.

## Cell-level defects

### 5. Error values

`#REF!`, `#DIV/0!`, `#N/A`, `#VALUE!`, `#NAME?`, `#NULL!`, `#NUM!`. Always a **Blocker**.

Say **what the error feeds** — an error in a helper column that nothing references is a
nuisance; one feeding a printed column means those printed cells are blank or wrong, which is
what the reader actually needs to know.

### 6. Hardcoded value in a formula column

A typed number where its neighbours are formulas. **This is the one genuinely computable
severity distinction in the skill:**

- compute what the formula pattern would have produced in that cell;
- **it disagrees → Blocker.** The printed number is wrong.
- **it agrees → Hygiene.** Nothing is wrong today; it will silently stop being right when the
  inputs change.

Getting both cases right is the test of whether the tier rule was applied or guessed.

### 7. Sign errors

A value contradicting its column's convention — a negative in a positive cost column, a
positive in a column of deductions — or a subtotal whose sign flips against its parts. If the
convention itself is unclear and the answer changes the verdict, that is one of the two
questions worth asking.

## Provenance

### 8. Stale dates

An as-of date older than the period the artifact reports, or identical to the prior pack's
when the numbers are supposed to have moved. A tab dated two months back inside a current pack
is the single most common embarrassment in this whole list.

### 9. Placeholders left in

`TBC`, `TBD`, `TODO`, `xxx`, `???`, `#`, a suspicious `999` or `0.00` sitting in a live column,
a header naming last month or last year. Note whether the placeholder also **breaks the
arithmetic** — text in a numeric column is silently skipped by `SUM`, so the total is quietly
short. That escalation is worth stating.

## Consistency across the artifact

### 10. Units or currency mixed

A `£000s` column beside a `£` one. `FTE` beside headcount. A deck stating `£m` on the title
slide and `£k` in an appendix table. Read units from wherever they are stated — headers, merged
title rows, axis labels, slide titles — and compare, rather than assuming one scale.

A magnitude that only makes sense under a different unit is evidence too: a "recharge" of
42,000 beside a cost of 1,184 is not a 35× recharge, it is two different scales.

### 11. The same figure differs between places

Summary tab against detail tab. Slide 1's headline against the appendix table. A number in
prose against the table above it. Report both figures, both locators, and — where you can tell
— **which one is right**, because that is the actionable part. Where you can't tell, say so
rather than picking.

### 12. Displayed rounding doesn't sum

Parts shown to 0 d.p. adding to one more or less than the displayed total. Real but minor, and
**disarmed entirely by a stated convention**: if the artifact says components may not sum, this
check does not fire.

---

## Severity, and the rule that keeps it stable

| Check | Tier |
| --- | --- |
| 1 totals don't reconcile | Blocker |
| 2 shares don't sum | Blocker |
| 3 impossible percentage | Blocker |
| 4 duplicate / double count | Blocker |
| 5 error value | Blocker |
| 6 hardcoded, **disagreeing** | Blocker |
| 7 sign error | Blocker |
| 10 units mixed | Blocker |
| 11 same figure differs | Blocker |
| 8 stale date | Embarrassment |
| 9 placeholder left in | Embarrassment |
| 12 displayed rounding | Embarrassment |
| 6 hardcoded, **agreeing** | Hygiene |

**The tier is a property of the check, not of your impression of it.** Read it off this table;
do not promote a finding because it feels serious or demote one because the file is otherwise
good. Two documented exceptions, both mechanical:

- **Check 6 splits on the arithmetic**, as above.
- **A placeholder that breaks a `SUM`** may be argued up to Blocker, because the printed total
  is then wrong — but state the reasoning in the finding when you do.

### Enumerating findings

**One finding per defect, one line each — and a defect that trips several checks is still one
finding.** Name every check it trips inside that line. The unit is *the thing someone has to
go and fix*, because this output is a worklist.

Worked, because this is where counting drifts:

> A total cell is typed as `912` where its own rows sum to `847`, and a summary tab elsewhere
> prints `847` for the same population. That single cell trips check 6 (typed into a formula
> column), check 1 (total doesn't reconcile) and check 11 (two places disagree). **One
> finding**, one line, naming all three — because fixing that one cell resolves all three.

> A cell holds `TBD`, which also makes the share cell beside it return `#VALUE!`. Checks 9 and
> 5. **One finding** — the placeholder is the defect, the error cell is its symptom. Say both.

The mirror, so neither reading drifts:

> Two *different* typed-over cells are **two findings**, even in the same column, because each
> needs its own fix.
> One defect spanning a range — four rows sharing one stale date — is **one finding** naming
> the range.

So: count **defects to fix**, not cells, not checks, not symptoms.

**This differs deliberately from `whats-changed`, which counts triggers rather than defects.**
That is not an inconsistency to reconcile: there, flags annotate a movement report and the
reader wants to know how many distinct things are suspect; here, the output *is* the fix list
and the reader wants to know how many cells to open. If you have both skills in mind, do not
carry one's counting rule into the other.

## What is never a finding

| Tempting | Why not |
| --- | --- |
| "Revenue looks low for Q3" | A claim about the world. The artifact cannot support it. |
| "Consider highlighting the variance on slide 2" | Presentation advice. |
| "Column widths and fonts are inconsistent" | Formatting taste. |
| "This should be escalated to Finance" | A business action, and not yours to recommend. |
| "No unit counts, so margin can't be verified" | A limitation of your analysis, not a defect in the artifact. |
| "No share columns exist, so that check found nothing" | Checked and clean. The scope line already says it was checked; a caveat is only for what was *impossible* to check. |
| "The total cell has no cached value, so it may display blank" | An artifact of how you opened the file, not of the file. |
| "The rounding note means the £182k gap is fine" | **Wrong, and the worst failure available**: a convention excuses only what it covers. A rounding note covers pence, not three orders of magnitude. |
| Rewriting the workbook, or offering to | Report, don't repair. |
| "Looks good overall, nice clear layout" | Reassurance is not information. |

## When there is nothing to report

Say it in one line, add the scope line, stop.

> **Safe to send — nothing found.**
>
> Checked: totals and cross-footing · share columns · impossible percentages · duplicates ·
> error cells · formula overrides · signs · as-of dates · placeholders · units · cross-tab
> agreement · displayed rounding.

A clean artifact is a common and useful result. Do not go looking for a Hygiene item to justify
the effort — manufacturing a finding to appear thorough is the same failure as missing one, in
the opposite direction.
