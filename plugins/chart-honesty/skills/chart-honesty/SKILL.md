---
name: chart-honesty
description: Review the charts already in a PowerPoint deck (.pptx) or described in chat, one by one, for the ways a chart misleads — wrong chart type, a truncated axis, a dual axis, 3D, pie misuse, a title the data contradicts, missing units — and give the fix for each. Use when the user asks whether their charts are misleading, honest, fair or "going to get me caught out", wants a chart review or chart check before a board, QBR or client meeting, or asks about a truncated or dual axis. Every finding cites a setting or value read from the file; a picture of a chart carries no data and is never estimated from pixels. Reviews existing charts only — it does not choose, design or build a chart from data, and it never edits the deck.
---

# Chart honesty

A column chart whose axis starts well above zero can draw a 7% rise as a bar twice as tall.
Nobody lied in a number, and the audience still leaves with the wrong size of change. This skill
reviews each chart a deck already has and says, for each one, whether it misleads, how,
by how much, and the fix.

**The product is the settings.** Anyone can say "that chart looks off". Saying *the axis is
set to start at 50, so the tallest bar is drawn 1.9× the shortest for an 11% difference*,
from the chart's own XML, is what gets a chart fixed rather than argued about. **Its twin is
restraint:** a line chart with a non-zero axis is fine, a picture can't be checked, and a
clean chart is reported as clean.

## Workflow

### 1. Take the charts as given

A `.pptx` / `.potx` path, or charts described in chat (type, categories, values, axis range,
title, units). Read every slide once: each native chart's XML, the slide title and text,
and the speaker notes. Number slides `S1…Sn` in deck order.

Read `references/checks.md` §1 before extracting. It says what to read from the chart XML
(plot type, `min`/`max`, value axes in use, number formats, axis titles), that **notes are
never visible**, and that **a picture of a chart carries no data**: never estimate values,
axis ranges or slice sizes from pixels.

**Ask nothing unless genuinely blocked.** One question, and only this one:
- No deck and no chart described → *"Send the deck (or describe the charts) and I'll check them."*

A described chart that leaves something out isn't a reason to ask. Review what's given and
list the gap on a `Not stated:` line.

### 2. Run the tests, by the reference, not by feel

For each chart, in deck order, apply `references/checks.md`:

- **§2**: the verdict, from a closed set of three: `Fix`, `Clean`, `Not checkable`.
- **§3**: the seven tests, always in this order: **Wrong type · Pie misuse · 3D · Truncated
  axis · Dual axis · Title contradicts data · Missing units**. Each is a yes/no test on the
  file's settings and values, with one fixed form of fix.
- **§4**: the wording. The file's numbers, not adjectives. One fix per finding.

Those tables are the skill; do not improvise them. Nothing outside the seven is a finding:
not colours, fonts, sorting or gridlines.

### 3. Write it and stop

```markdown
**fleet-review.pptx** · 11 slides · 7 charts · 5 to fix · 1 clean · 1 not checkable

**S2 · Fix** · column chart · "Parcels Delivered"
- Truncated axis — the axis is set to start at 50; the tallest bar is drawn 1.9× the shortest for an 11% difference. Fix: set the axis minimum to 0 (Format Axis → Bounds → Minimum). If the small differences are the point, use a line chart instead.

**S3 · Clean** · line chart · "Fuel cost per mile stayed under 60p all year"

**S4 · Fix** · combo chart (column + line) · "Drivers and Overtime"
- Dual axis — "Drivers" on the left axis, "Overtime (hours)" on a second axis on the right. Fix: split into two charts, one above the other, sharing the month axis; or index both series to 100 at the first month and plot them on one axis.

**S5 · Fix** · 3D pie chart · "Parcels by Depot"
- Pie misuse — 8 slices; more than six can't be compared by angle. Fix: use a bar chart sorted by value.
- 3D — drawn as a 3D pie; perspective makes the near slices look bigger than the far ones. Fix: change to the flat version of the same chart (Change Chart Type → Pie).

**S6 · Fix** · line chart · "Late deliveries halved in Q2"
- Title contradicts data — late deliveries went from 4.8% (Apr 2026) to 3.1% (Jun 2026), 0.65×; "halved" needs 0.475–0.525×. Fix: retitle "Late deliveries fell 1.7 pts to 3.1% in Q2".

**S7 · Not checkable** · picture · "Depot Utilisation"
- A picture has no values or axis settings to check. Fix: paste the native chart, or send the values and the axis range.

**S9 · Fix** · column chart · "Van Leasing Cost by Depot"
- Missing units — values 0.8 · 1.3 · 1.1 · 0.9 with no unit on the axis, labels, title or slide, and none in the notes. Fix: the deck doesn't say which unit; add it to the axis title.

Ask "why is S2 flagged?" or "why is S3 clean?" to see the chart settings behind any verdict.
```

(Invented example.)

- **Header**: file name (or *Described charts*), slide count (files only), chart count, then
  the count of each verdict that occurs. Omit a verdict with a count of zero.
- **One entry per chart**, in deck order: `S<n> · <verdict> · <chart type> · "<slide
  title>"`. Chart type names the plot as stored (*column*, *bar*, *line*, *area*, *pie*,
  *doughnut*, *combo (column + line)*, *3D column*…).
- **`Fix`** gets one line per finding, in test order: `- <Test> — <what the file shows>.
  Fix: <fix>.` **`Clean`** gets no lines. **`Not checkable`** gets the one line above.
- **Described charts** add `Not stated: <inputs>` under a chart when a test couldn't run.
- Slides without a chart get no entry.
- **The closing line** ends the output, and nothing comes after it. It cites the **first**
  `Fix` chart and the **first** `Clean` chart. If there's no `Clean` chart, the second half
  becomes *"why is S7 not checkable?"* with the first `Not checkable` chart, or is dropped if
  there's none. If there's no `Fix` chart, the line starts at the second half.

Output lands in chat. **Nothing before the header**, no preamble. No verdict on the deck as a
whole, and no commentary on its story or design.

## Rules

- **The file is the evidence.** Every finding cites a setting or value read from the chart
  or visible on its slide. Nothing from another slide, nothing from memory of how the chart
  "usually" looks.
- **Never estimate from pixels.** A picture of a chart is `Not checkable`, however obvious
  its axis looks. No values, no ranges, no *"appears to start at"*.
- **Notes aren't visible.** A unit or a claim that exists only in the notes doesn't pass
  a test. It can be *quoted in a fix*, marked as coming from the notes.
- **Never supply a unit, a figure or a cause.** A fix's unit comes from the file or is left
  for the author to fill in. A corrected title's figures come from the chart. *Why* a series
  moved is not this review's question.
- **Line charts may start above zero.** The truncated-axis test is for bars, columns and
  areas. Flagging a line chart for it is a false alarm, and false alarms are how a review
  stops being read.
- **Pushback alone moves nothing.** "It's deliberate", "it's house style" and "everyone knows
  the unit" don't change a test. The honest alternative is part of the answer.
- **Review, don't rebuild.** Give the fix; don't edit the deck, redraw the chart, or propose a
  chart for data the deck doesn't chart.

## Tracing

A verdict is a claim about a chart's settings, so every doubt is answered by those settings.
Read `references/tracing.md` before answering any follow-up. It carries the handles
(`S1…Sn`, `S4a`), the fixed closing line, the trace block (*Read from the file · Test ·
Effect · Fix · What would clear it*), the clean block (all seven tests, one row each), the
not-checkable block, and the questions to expect: *"why is S2 flagged?"*, *"why is S3 clean
when its axis doesn't start at zero?"*, *"how bad is it?"*, *"the axis is deliberate"*,
*"everyone knows the unit"*, and above all *"just read it off the picture"*. That last one
gets no estimate, only the route to a checkable chart.

A trace re-reads the file and **corrects the review** when it's wrong. A drawn ratio that
doesn't reproduce is fixed, a missed test is added, a finding that doesn't hold is removed,
and each correction is said first.
