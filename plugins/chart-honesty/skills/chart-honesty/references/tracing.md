# Tracing a verdict back to the chart

How `chart-honesty` answers *"why is that one flagged?"* and *"why is that one clean?"*. A
finding tells someone their chart misleads, usually a chart they built, often one they've
shown before. It is only worth acting on if they can open the file and find the setting
themselves. So every verdict has to be answerable in one turn, from the chart's own settings
and values, with the arithmetic shown.

People who question a verdict are in one of three positions:

- **The chart's builder**, often an analyst who set the axis on purpose. *"The growth
  disappears at zero."* *"That's our house style."*
- **The deck's owner or presenter.** They want to know how bad it is before they stand in
  front of it, and whether the clean ones really are.
- **A reviewer who knows the numbers.** *"Everyone knows those are in €k."* *"It
  obviously starts at 80, look at it."*

All examples use invented names and figures.

---

## Handles and the closing line

Handles are the slide numbers, `S1…Sn` in deck order, the same numbers PowerPoint shows.
Two charts on one slide are `S4a`, `S4b`. Described charts use the slide numbers the user
gave, or `C1…Cn` in the order described if they gave none.

The output ends with this line, and nothing follows it:

```
Ask "why is S2 flagged?" or "why is S3 clean?" to see the chart settings behind any verdict.
```

The **first `Fix` chart** goes in the first slot and the **first `Clean` chart** in the second.
These are the two questions this skill gets most: one about a chart it flagged, one about a
chart it let through. If no chart is `Clean`, the second half becomes *"why is S7 not
checkable?"* with the first `Not checkable` chart, and is dropped when there is none. If no
chart is `Fix`, the line starts at the second half: *Ask "why is S3 clean?" …*

Follow-up replies do **not** repeat it, except a trace that corrects the review and reprints
the full list, because that list is what the user acts on. A trace that changes nothing never
reprints the list.

## The trace block: for a flagged chart

```markdown
### S2 — column chart "Parcels Delivered" · Truncated axis

**Read from the file**
> S2 · chart · plot type `c:barChart`, `c:barDir` = col (column chart)
> S2 · chart · value axis `c:scaling/c:min` = 50 (set, not auto)
> S2 · chart series "Parcels" · Jan 2026 = 57 · Feb 2026 = 61 · Mar 2026 = 63
> S2 · chart · value axis title "Parcels (thousands)"

**Test**
- Test 4 · Truncated axis, Set: column chart (length-encoded), min 50 > 0, every value ≥ 0 → trips.

**Effect**
- Drawn ratio: (63 − 50) ÷ (57 − 50) = 13 ÷ 7 = 1.86 → **1.9×**.
- Actual difference: 63 ÷ 57 − 1 = 0.105 → **11%**.
- So Mar's bar is drawn nearly twice Jan's for an 11% rise.

**Fix**
- Format Axis → Bounds → Minimum → 0. If the month-to-month differences are the point, a line
  chart shows them without the distortion.

**What would clear it**
- A minimum of 0, or a line chart. Nothing else on the slide changes the test.
```

Use these five headings **exactly as written**, in this order. The builder learns them once
and reads every trace the same way. Name the test in *Test* as `Test <n> · <name>, <sub-rule>`
(e.g. `Test 4 · Truncated axis, Set`), with the names from `checks.md` §3, not paraphrases.

- **Read from the file**: every setting and value the test used, **as stored**, each with its
  locator. Say *set* or *auto* for every axis bound. Quote titles and text exactly.
- **Test**: the test number and sub-rule (`W1`, `P2`, *Set*, *Auto*…), and the condition it
  met.
- **Effect**: the arithmetic from §3 of `checks.md`, with the rounding named. For a truncated
  axis that is the drawn ratio and the actual difference, and nothing derived from them: no
  *"30 times bigger"* or *"exaggerated by 2.5×"*. For a title
  contradiction: the claim, the values it's checked against, the result. For units: every
  place a unit could be, and what each holds.
- **Fix**: the fixed fix, with where to click.
- **What would clear it**: the setting that, changed, clears the finding, and whether
  anything close is already there (including in the notes).

A chart with several findings gets one block per finding, in test order.

## The clean block: for a chart with no finding

```markdown
### S3 — line chart "Fuel cost per mile stayed under 60p all year" · Clean

| Test | Read from the file | Result |
| --- | --- | --- |
| 1 Wrong type | `c:lineChart`; categories Jan 2026 … Dec 2026 (ordered) | pass |
| 2 Pie misuse | not a pie | n/a |
| 3 3D | no 3D element | pass |
| 4 Truncated axis | line chart: exempt (position, not length). Axis min 40p (set) noted | n/a |
| 5 Dual axis | one value axis | pass |
| 6 Title vs data | threshold "under 60p all year": max = 58p (Aug 2026) < 60p | pass |
| 7 Units | axis title "Fuel cost per mile (p)" | pass |
```

Every test gets a row, including those that don't apply. That is what answers *"did you
actually check the axis?"*.

## The not-checkable block

```markdown
### S7 — picture "Depot Utilisation" · Not checkable

**What the slide carries**
> S7 · picture (a column chart, by appearance)
> S7 · text "Export from the planning tool."

**Why nothing was checked**
- A picture stores pixels, not values or axis settings. Its type, its axis range and its
  numbers would all be read off the image, which is estimating. None of the seven tests runs
  on an estimate.

**What would make it checkable**
- Paste the native chart (Paste Special → chart, not picture), or send the values and the
  axis range.
```

---

## The questions to expect, and what each answer shows

| They ask | Answer with |
| --- | --- |
| **"Why is S2 flagged?"** | The trace block. |
| **"Why is S3 clean?"** / *"its axis doesn't start at zero either!"* | The clean block. For a line chart, row 4 is the answer: a line encodes by position, so a non-zero axis doesn't stretch anything. Test 4 applies to column, bar and area only. If the re-read finds a test that should have tripped, **flag it now** and say so first. |
| **"How bad is it?"** | The *Effect* numbers, drawn against actual. No adjective (*"badly"*, *"hugely"*). The numbers are the severity. |
| **"The axis is deliberate. At zero the growth disappears."** (pushback) | Hold the finding: the bars' length *is* the claim, and a truncated axis makes it false. Show the drawn-vs-actual numbers. Then give the honest way to show small differences: a line chart or dot plot, or state the change in the title. A finding changes when the setting changes, not when the builder explains it. |
| **"Dual axis is our house style; everyone reads it fine."** (pushback) | Hold it. Show the two axes' ranges from the file and say that where the series cross is set by those two ranges, not by the data. Offer both fixes: two stacked charts, or both indexed to 100. Style doesn't change a test. |
| **"Everyone knows those are in €k."** (pushback on units) | Hold it: the test is what's **visible**. If the notes carry the unit, quote them and say the audience doesn't see notes. The fix uses that unit. If nothing in the file carries it, don't adopt the user's unit silently: say the fix is *"'Leasing cost (€k)', if €k is right. The file doesn't say."* |
| **"3D is just style."** | Hold it. Test 3 has no exceptions. Say what perspective does to *this* chart (bar tops float off the gridlines; near slices look bigger). |
| **"S7 obviously starts at 80, just read it off the picture."** / *"roughly what are the values?"* | **Don't.** No axis range, value, ratio or verdict from the picture, not even as *"it appears to"*. Say it's a picture, so the file has no values or settings to check. Give the route: paste the native chart, or send the values and axis range, and it gets the full seven tests. If the user states the values and the range themselves, review those as a described chart, labelled as the user's figures. |
| **"On auto it starts at zero on my screen."** | Test 4 *Auto* reads the file: every value is more than 5/6 of the largest, and PowerPoint's automatic minimum then leaves zero. If their app renders it from zero, setting the minimum to 0 explicitly costs nothing and removes the doubt. Hold the finding. |
| **"Why did late deliveries fall?"** / *"what caused it?"* | Not a chart-honesty question, and the chart doesn't say. Answer *"The chart doesn't say why."* If **that slide's** text or notes state a reason, quote it as theirs, with its own certainty. Never a cause of your own, however plausible, and don't look for hints on other slides. |
| **"Why didn't you flag S5's title? It claims the new routing did it."** | Test 6 checks direction, figures, ratio words, thresholds and rank against the values. A cause isn't something a chart's values can contradict, so it isn't this review's finding. Say that in one line, then show the checked claims passing. |
| **"Can you fix them in the file?"** | Out of scope: this review doesn't edit the deck. Give each fix as the click path, in one list. |
| **"Show all of it."** | One block per chart in deck order: trace blocks for `Fix` (one per finding), the clean block for `Clean`, the not-checkable block for the rest. |

## Rules

- **Re-read the file; don't recall your first pass.** The trace is a second reading, and
  that's where it catches things: a hidden secondary axis, a `max` below the data, a legend
  that shows a unit.
- **The trace corrects the review.** A drawn ratio that doesn't reproduce is fixed. A test
  that should have tripped is added. A finding that doesn't hold is removed. Say the
  correction in the first line, then reprint the full list with the closing line.
- **Quote, never paraphrase, in *Read from the file*.** The builder will open the Format Axis
  pane and compare.
- **Notes are evidence of what someone wrote, never of what's on the chart.** Quote them
  only in a fix, in *What would clear it*, and in answers to *why*, and only the traced
  slide's own notes.
- **One chart per answer.** Traces and replies to pushback use the chart in question and its
  own slide and notes. Don't point to another slide's chart as a comparison or an argument
  (*"S5 shows its unit, so…"*), unless the user brings it up.
- **Pushback alone moves nothing.** A finding clears when the file changes, or when the
  re-read shows the test didn't trip, never because the builder is sure.
